import { GrayscaleImage, ThresholdResult } from './types';
import { clamp, create2DArray } from '../utils/imageProcessing';

// computeHistogram 已迁移至 ./histogram，此处为内部使用 + 向后兼容导出
import { computeHistogram } from './histogram';
export { computeHistogram };

export function fixedThreshold(image: GrayscaleImage, threshold: number): ThresholdResult {
  const height = image.length;
  const width = image[0]?.length || 0;
  const normalizedThreshold = clamp(threshold, 0, 1);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = image[y][x] > normalizedThreshold ? 1 : 0;
    }
  }

  return { image: result, threshold: normalizedThreshold };
}

export function otsuThreshold(image: GrayscaleImage): ThresholdResult {
  const histogram = computeHistogram(image);
  const { bins, totalPixels } = histogram;

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * bins[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += bins[t];
    if (wB === 0) continue;

    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * bins[t];

    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = (wB / totalPixels) * (wF / totalPixels) * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  const normalizedThreshold = threshold / 255;

  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = Math.round(clamp(image[y][x], 0, 1) * 255);
      result[y][x] = value > threshold ? 1 : 0;
    }
  }

  return { image: result, threshold: normalizedThreshold };
}

export interface OtsuStep {
  currentThreshold: number;
  wB: number;
  wF: number;
  mB: number;
  mF: number;
  variance: number;
  isMax: boolean;
}

export function* otsuSteps(image: GrayscaleImage): Generator<OtsuStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const histogram = computeHistogram(image);
  const { bins, totalPixels } = histogram;

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * bins[i];
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;

  for (let t = 0; t < 256; t++) {
    wB += bins[t];
    if (wB === 0) {
      yield {
        currentThreshold: t,
        wB: 0,
        wF: totalPixels,
        mB: 0,
        mF: sum / totalPixels,
        variance: 0,
        isMax: false,
      };
      continue;
    }

    const wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * bins[t];

    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = (wB / totalPixels) * (wF / totalPixels) * (mB - mF) * (mB - mF);

    const isMax = variance > maxVariance;
    if (isMax) {
      maxVariance = variance;
    }

    yield {
      currentThreshold: t,
      wB,
      wF,
      mB,
      mF,
      variance,
      isMax,
    };
  }
}
