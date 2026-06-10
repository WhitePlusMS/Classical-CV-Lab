import type { GrayscaleImage } from './types';
import { clamp, create2DArray, normalizeImage } from '../utils/imageProcessing';

export type HistogramCompareMethod = 'correlation' | 'chi-square' | 'intersection' | 'bhattacharyya';
export type TemplateMatchMethod = 'ssd' | 'sad';

export interface MatchWindow {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HistogramBinContribution {
  bin: number;
  template: number;
  candidate: number;
  contribution: number;
}

export interface HistogramMatchingResult {
  templateWindow: MatchWindow;
  candidateWindow: MatchWindow;
  templatePatch: GrayscaleImage;
  candidatePatch: GrayscaleImage;
  templateHistogram: number[];
  candidateHistogram: number[];
  score: number;
  sampleContributions: HistogramBinContribution[];
}

export interface TemplateMatchingResult {
  templateWindow: MatchWindow;
  currentWindow: MatchWindow;
  bestWindow: MatchWindow;
  excludedWindow: MatchWindow;
  templatePatch: GrayscaleImage;
  currentPatch: GrayscaleImage;
  rawResponse: GrayscaleImage;
  heatmap: GrayscaleImage;
  currentScore: number;
  bestScore: number;
  scoreDelta: number;
}

const EPSILON = 1e-9;

export function clampMatchWindow(image: GrayscaleImage, window: MatchWindow): MatchWindow {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const safeWidth = Math.max(1, Math.min(Math.round(window.width), Math.max(1, width)));
  const safeHeight = Math.max(1, Math.min(Math.round(window.height), Math.max(1, height)));
  const maxX = Math.max(0, width - safeWidth);
  const maxY = Math.max(0, height - safeHeight);

  return {
    x: Math.round(clamp(window.x, 0, maxX)),
    y: Math.round(clamp(window.y, 0, maxY)),
    width: safeWidth,
    height: safeHeight,
  };
}

export function cropGrayscaleWindow(image: GrayscaleImage, window: MatchWindow): GrayscaleImage {
  const safeWindow = clampMatchWindow(image, window);
  return Array.from({ length: safeWindow.height }, (_, y) =>
    Array.from({ length: safeWindow.width }, (_, x) =>
      image[safeWindow.y + y]?.[safeWindow.x + x] ?? 0
    )
  );
}

export function computeGrayHistogram(image: GrayscaleImage, binCount: number): number[] {
  const safeBinCount = Math.max(2, Math.round(binCount));
  const bins = new Array<number>(safeBinCount).fill(0);
  let total = 0;

  for (const row of image) {
    for (const pixel of row) {
      const index = Math.min(safeBinCount - 1, Math.floor(clamp(pixel, 0, 1) * safeBinCount));
      bins[index] += 1;
      total += 1;
    }
  }

  if (total === 0) return bins;
  return bins.map(value => value / total);
}

export function compareHistograms(
  templateHistogram: number[],
  candidateHistogram: number[],
  method: HistogramCompareMethod
): number {
  const length = Math.min(templateHistogram.length, candidateHistogram.length);

  if (method === 'correlation') {
    const meanA = mean(templateHistogram);
    const meanB = mean(candidateHistogram);
    let numerator = 0;
    let denominatorA = 0;
    let denominatorB = 0;

    for (let i = 0; i < length; i++) {
      const a = templateHistogram[i] - meanA;
      const b = candidateHistogram[i] - meanB;
      numerator += a * b;
      denominatorA += a * a;
      denominatorB += b * b;
    }

    return numerator / Math.sqrt(Math.max(EPSILON, denominatorA * denominatorB));
  }

  if (method === 'chi-square') {
    let score = 0;
    for (let i = 0; i < length; i++) {
      const a = templateHistogram[i];
      const b = candidateHistogram[i];
      score += (a - b) ** 2 / Math.max(EPSILON, a + b);
    }
    return score;
  }

  if (method === 'intersection') {
    let score = 0;
    for (let i = 0; i < length; i++) {
      score += Math.min(templateHistogram[i], candidateHistogram[i]);
    }
    return score;
  }

  let coefficient = 0;
  for (let i = 0; i < length; i++) {
    coefficient += Math.sqrt(templateHistogram[i] * candidateHistogram[i]);
  }
  return Math.sqrt(Math.max(0, 1 - coefficient));
}

export function createHistogramMatchingResult(
  image: GrayscaleImage,
  templateWindow: MatchWindow,
  candidateWindow: MatchWindow,
  method: HistogramCompareMethod,
  binCount: number
): HistogramMatchingResult {
  const safeTemplateWindow = clampMatchWindow(image, templateWindow);
  const safeCandidateWindow = clampMatchWindow(image, candidateWindow);
  const templatePatch = cropGrayscaleWindow(image, safeTemplateWindow);
  const candidatePatch = cropGrayscaleWindow(image, safeCandidateWindow);
  const templateHistogram = computeGrayHistogram(templatePatch, binCount);
  const candidateHistogram = computeGrayHistogram(candidatePatch, binCount);

  return {
    templateWindow: safeTemplateWindow,
    candidateWindow: safeCandidateWindow,
    templatePatch,
    candidatePatch,
    templateHistogram,
    candidateHistogram,
    score: compareHistograms(templateHistogram, candidateHistogram, method),
    sampleContributions: createHistogramContributions(templateHistogram, candidateHistogram, method, 5),
  };
}

export function createTemplateMatchingResult(
  image: GrayscaleImage,
  templateWindow: MatchWindow,
  currentWindow: MatchWindow,
  method: TemplateMatchMethod
): TemplateMatchingResult {
  const safeTemplateWindow = clampMatchWindow(image, templateWindow);
  const safeCurrentWindow = clampMatchWindow(image, {
    ...currentWindow,
    width: safeTemplateWindow.width,
    height: safeTemplateWindow.height,
  });
  const templatePatch = cropGrayscaleWindow(image, safeTemplateWindow);
  const currentPatch = cropGrayscaleWindow(image, safeCurrentWindow);
  const responseHeight = Math.max(1, image.length - safeTemplateWindow.height + 1);
  const responseWidth = Math.max(1, (image[0]?.length ?? 0) - safeTemplateWindow.width + 1);
  const rawResponse = create2DArray(responseHeight, responseWidth, 0);
  const displayResponse = create2DArray(responseHeight, responseWidth, 0);
  const excludedWindow = createExcludedSearchWindow(
    safeTemplateWindow,
    responseWidth,
    responseHeight
  );

  let bestScore = Infinity;
  let bestX = 0;
  let bestY = 0;
  let maxScore = -Infinity;

  for (let y = 0; y < responseHeight; y++) {
    for (let x = 0; x < responseWidth; x++) {
      const score = computeTemplateScoreAt(image, templatePatch, x, y, method);
      rawResponse[y][x] = score;
      displayResponse[y][x] = score;
      maxScore = Math.max(maxScore, score);
      if (!isInsideWindow(x, y, excludedWindow) && score < bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  if (!Number.isFinite(bestScore)) {
    bestScore = rawResponse[safeTemplateWindow.y]?.[safeTemplateWindow.x] ?? 0;
    bestX = safeTemplateWindow.x;
    bestY = safeTemplateWindow.y;
  }

  for (let y = excludedWindow.y; y < excludedWindow.y + excludedWindow.height; y++) {
    for (let x = excludedWindow.x; x < excludedWindow.x + excludedWindow.width; x++) {
      if (displayResponse[y]?.[x] !== undefined) {
        displayResponse[y][x] = maxScore;
      }
    }
  }

  const currentScore = rawResponse[safeCurrentWindow.y]?.[safeCurrentWindow.x] ?? 0;
  const normalized = normalizeImage(displayResponse);

  return {
    templateWindow: safeTemplateWindow,
    currentWindow: safeCurrentWindow,
    bestWindow: {
      x: bestX,
      y: bestY,
      width: safeTemplateWindow.width,
      height: safeTemplateWindow.height,
    },
    excludedWindow,
    templatePatch,
    currentPatch,
    rawResponse,
    heatmap: normalized.map(row => row.map(value => 1 - value)),
    currentScore,
    bestScore,
    scoreDelta: currentScore - bestScore,
  };
}

function createExcludedSearchWindow(
  templateWindow: MatchWindow,
  responseWidth: number,
  responseHeight: number
): MatchWindow {
  const radiusX = Math.max(2, Math.round(templateWindow.width * 0.6));
  const radiusY = Math.max(2, Math.round(templateWindow.height * 0.6));
  const x = Math.max(0, templateWindow.x - radiusX);
  const y = Math.max(0, templateWindow.y - radiusY);
  const right = Math.min(responseWidth, templateWindow.x + radiusX + 1);
  const bottom = Math.min(responseHeight, templateWindow.y + radiusY + 1);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function isInsideWindow(x: number, y: number, window: MatchWindow): boolean {
  return x >= window.x &&
    x < window.x + window.width &&
    y >= window.y &&
    y < window.y + window.height;
}

export function computeTemplateScoreAt(
  image: GrayscaleImage,
  templatePatch: GrayscaleImage,
  x: number,
  y: number,
  method: TemplateMatchMethod
): number {
  const templateHeight = templatePatch.length;
  const templateWidth = templatePatch[0]?.length ?? 0;
  let score = 0;

  for (let py = 0; py < templateHeight; py++) {
    for (let px = 0; px < templateWidth; px++) {
      const diff = templatePatch[py][px] - (image[y + py]?.[x + px] ?? 0);
      score += method === 'ssd' ? diff * diff : Math.abs(diff);
    }
  }

  return score;
}

function createHistogramContributions(
  templateHistogram: number[],
  candidateHistogram: number[],
  method: HistogramCompareMethod,
  limit: number
): HistogramBinContribution[] {
  const length = Math.min(templateHistogram.length, candidateHistogram.length);
  const contributions: HistogramBinContribution[] = [];

  for (let i = 0; i < Math.min(length, limit); i++) {
    const template = templateHistogram[i];
    const candidate = candidateHistogram[i];
    let contribution = 0;

    if (method === 'correlation') {
      contribution = template * candidate;
    } else if (method === 'chi-square') {
      contribution = (template - candidate) ** 2 / Math.max(EPSILON, template + candidate);
    } else if (method === 'intersection') {
      contribution = Math.min(template, candidate);
    } else {
      contribution = Math.sqrt(template * candidate);
    }

    contributions.push({
      bin: i,
      template,
      candidate,
      contribution,
    });
  }

  return contributions;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
