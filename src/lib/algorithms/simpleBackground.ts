import { GrayscaleImage } from './types';
import { clamp, create2DArray, normalizeImage } from '../utils/imageProcessing';

export type ThresholdSceneType = 'bimodal' | 'spotlight' | 'noisyObject';
export type ThresholdOutputMode = 'binary' | 'binaryInv' | 'trunc' | 'tozero' | 'tozeroInv';
export type FrameDifferenceMode = 'twoFrame' | 'symmetric';
export type BackgroundModelType = 'mean' | 'adaptive' | 'singleGaussian' | 'mixtureGaussian';

export interface KittlerGradientThresholdResult {
  threshold: number;
  gradientImage: GrayscaleImage;
  weightedGraySum: number;
  gradientSum: number;
}

export interface OtsuThresholdProfilePoint {
  threshold: number;
  variance: number;
}

export interface MotionSequence {
  previous: GrayscaleImage;
  current: GrayscaleImage;
  next: GrayscaleImage;
}

export interface FrameDifferenceResult {
  difference: GrayscaleImage;
  previousDifference: GrayscaleImage;
  nextDifference: GrayscaleImage;
  binary: GrayscaleImage;
  cleaned: GrayscaleImage;
}

export interface BackgroundModelResult {
  current: GrayscaleImage;
  background: GrayscaleImage;
  difference: GrayscaleImage;
  mask: GrayscaleImage;
  mean: GrayscaleImage;
  deviation: GrayscaleImage;
  mixtureComponents: GaussianComponent[];
}

export interface GaussianComponent {
  weight: number;
  mean: number;
  sigma: number;
  background: boolean;
}

function deterministicNoise(x: number, y: number, seed: number): number {
  const value = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function createBaseBackground(width: number, height: number, time = 0): GrayscaleImage {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const gradient = 0.18 + 0.2 * (x / Math.max(1, width - 1));
      const band = ((x + y + time) % 9 === 0) ? 0.04 : 0;
      return clamp(gradient + band, 0, 1);
    })
  );
}

function drawRectangle(image: GrayscaleImage, x0: number, y0: number, width: number, height: number, value: number): GrayscaleImage {
  return image.map((row, y) =>
    row.map((pixel, x) => (
      x >= x0 && x < x0 + width && y >= y0 && y < y0 + height ? value : pixel
    ))
  );
}

function addNoise(image: GrayscaleImage, strength: number, seed: number): GrayscaleImage {
  if (strength <= 0) return image;
  return image.map((row, y) =>
    row.map((pixel, x) => {
      const noise = (deterministicNoise(x, y, seed) - 0.5) * strength;
      return clamp(pixel + noise, 0, 1);
    })
  );
}

export function createThresholdScene(type: ThresholdSceneType): GrayscaleImage {
  const width = 48;
  const height = 32;

  if (type === 'spotlight') {
    return Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        const dx = (x - width * 0.55) / width;
        const dy = (y - height * 0.45) / height;
        const spot = Math.max(0, 0.78 - Math.sqrt(dx * dx + dy * dy) * 2.1);
        return clamp(0.12 + spot + 0.08 * (x / width), 0, 1);
      })
    );
  }

  const base = createBaseBackground(width, height);
  const object = drawRectangle(base, 28, 9, 12, 15, 0.82);
  const withSmallDetail = drawRectangle(object, 31, 13, 4, 4, type === 'noisyObject' ? 0.38 : 0.92);

  if (type === 'noisyObject') {
    return addNoise(withSmallDetail, 0.18, 5);
  }

  return withSmallDetail;
}

export function applyThresholdMode(
  image: GrayscaleImage,
  threshold: number,
  mode: ThresholdOutputMode
): GrayscaleImage {
  const normalizedThreshold = clamp(threshold / 255, 0, 1);

  return image.map(row =>
    row.map(pixel => {
      const over = pixel >= normalizedThreshold;
      switch (mode) {
        case 'binary':
          return over ? 1 : 0;
        case 'binaryInv':
          return over ? 0 : 1;
        case 'trunc':
          return over ? normalizedThreshold : pixel;
        case 'tozero':
          return over ? pixel : 0;
        case 'tozeroInv':
          return over ? 0 : pixel;
      }
    })
  );
}

export function computeKittlerGradientThreshold(image: GrayscaleImage): KittlerGradientThresholdResult {
  const height = image.length;
  const width = image[0]?.length || 0;
  const gradient = create2DArray(height, width, 0);
  let weightedGraySum = 0;
  let gradientSum = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const fi = image[y + 1][x] - image[y - 1][x];
      const fj = image[y][x + 1] - image[y][x - 1];
      const grad = Math.max(Math.abs(fi), Math.abs(fj));
      gradient[y][x] = grad;
      weightedGraySum += grad * image[y][x] * 255;
      gradientSum += grad;
    }
  }

  const fallbackMean = meanOfImage(image) * 255;
  const threshold = Math.round(gradientSum > 0 ? weightedGraySum / gradientSum : fallbackMean);

  return {
    threshold: clamp(threshold, 0, 255),
    gradientImage: normalizeImage(gradient),
    weightedGraySum,
    gradientSum,
  };
}

export function createOtsuVarianceProfile(image: GrayscaleImage): OtsuThresholdProfilePoint[] {
  const bins = new Array<number>(256).fill(0);
  let total = 0;
  let sum = 0;

  for (const row of image) {
    for (const pixel of row) {
      const gray = Math.round(clamp(pixel, 0, 1) * 255);
      bins[gray]++;
      total++;
      sum += gray;
    }
  }

  const profile: OtsuThresholdProfilePoint[] = [];
  let backgroundWeight = 0;
  let backgroundSum = 0;

  for (let threshold = 0; threshold < 256; threshold++) {
    backgroundWeight += bins[threshold];
    backgroundSum += threshold * bins[threshold];

    const foregroundWeight = total - backgroundWeight;
    if (backgroundWeight === 0 || foregroundWeight === 0) {
      profile.push({ threshold, variance: 0 });
      continue;
    }

    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const w0 = backgroundWeight / total;
    const w1 = foregroundWeight / total;

    profile.push({
      threshold,
      variance: w0 * w1 * (backgroundMean - foregroundMean) ** 2,
    });
  }

  return profile;
}

export function createMotionSequence(speed: number, noiseStrength: number): MotionSequence {
  const width = 48;
  const height = 32;
  const baseY = 13;
  const previousX = 15;
  const currentX = clamp(previousX + speed, 6, 34);
  const nextX = clamp(currentX + speed, 6, 40);

  const createFrame = (objectX: number, seed: number) => {
    const background = createBaseBackground(width, height, seed);
    const body = drawRectangle(background, objectX, baseY, 8, 10, 0.82);
    const head = drawRectangle(body, objectX + 2, baseY - 4, 4, 4, 0.88);
    return addNoise(head, noiseStrength / 255, seed);
  };

  return {
    previous: createFrame(previousX, 0),
    current: createFrame(currentX, 1),
    next: createFrame(nextX, 2),
  };
}

export function computeFrameDifference(
  sequence: MotionSequence,
  threshold: number,
  mode: FrameDifferenceMode
): FrameDifferenceResult {
  const previousDifference = absoluteDifference(sequence.current, sequence.previous);
  const nextDifference = absoluteDifference(sequence.next, sequence.current);
  const thresholdValue = clamp(threshold / 255, 0, 1);

  const binaryPrevious = binarize(previousDifference, thresholdValue);
  const binaryNext = binarize(nextDifference, thresholdValue);
  const binary = mode === 'twoFrame'
    ? binaryPrevious
    : intersectBinaryMasks(binaryPrevious, binaryNext);

  return {
    difference: mode === 'twoFrame' ? previousDifference : normalizeImage(addImages(previousDifference, nextDifference)),
    previousDifference,
    nextDifference,
    binary,
    cleaned: morphologicalClose(binary),
  };
}

export function createBackgroundModel(
  method: BackgroundModelType,
  threshold: number,
  learningRate: number
): BackgroundModelResult {
  const width = 48;
  const height = 32;
  const cleanFrames = Array.from({ length: 8 }, (_, time) => createBaseBackground(width, height, time));
  const current = drawRectangle(createBaseBackground(width, height, 9), 28, 10, 10, 12, 0.84);
  const mean = meanImage(cleanFrames);
  const deviation = stdImage(cleanFrames, mean);
  const normalizedThreshold = clamp(threshold / 255, 0, 1);
  const alpha = clamp(learningRate / 100, 0.01, 0.8);

  let background: GrayscaleImage;
  let mixtureComponents: GaussianComponent[] = [];

  switch (method) {
    case 'mean':
      background = mean;
      break;
    case 'adaptive':
      background = cleanFrames.slice(1).reduce(
        (previous, frame) => blendImages(frame, previous, alpha),
        cleanFrames[0]
      );
      break;
    case 'singleGaussian':
      background = mean;
      break;
    case 'mixtureGaussian':
      background = createMixtureBackground(width, height);
      mixtureComponents = [
        { weight: 0.54, mean: 0.24, sigma: 0.05, background: true },
        { weight: 0.32, mean: 0.36, sigma: 0.08, background: true },
        { weight: 0.14, mean: 0.82, sigma: 0.06, background: false },
      ];
      break;
  }

  const difference = absoluteDifference(current, background);
  const mask = method === 'singleGaussian'
    ? gaussianForegroundMask(current, mean, deviation, 2.5)
    : binarize(difference, normalizedThreshold);

  return {
    current,
    background,
    difference,
    mask,
    mean,
    deviation,
    mixtureComponents,
  };
}

export function absoluteDifference(a: GrayscaleImage, b: GrayscaleImage): GrayscaleImage {
  const height = Math.min(a.length, b.length);
  const width = Math.min(a[0]?.length || 0, b[0]?.length || 0);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = Math.abs(a[y][x] - b[y][x]);
    }
  }

  return result;
}

function binarize(image: GrayscaleImage, threshold: number): GrayscaleImage {
  return image.map(row => row.map(pixel => (pixel > threshold ? 1 : 0)));
}

function addImages(a: GrayscaleImage, b: GrayscaleImage): GrayscaleImage {
  return a.map((row, y) => row.map((pixel, x) => pixel + (b[y]?.[x] ?? 0)));
}

function intersectBinaryMasks(a: GrayscaleImage, b: GrayscaleImage): GrayscaleImage {
  return a.map((row, y) => row.map((pixel, x) => (pixel > 0 && (b[y]?.[x] ?? 0) > 0 ? 1 : 0)));
}

function morphologicalClose(mask: GrayscaleImage): GrayscaleImage {
  return erode(dilate(mask));
}

function dilate(mask: GrayscaleImage): GrayscaleImage {
  const height = mask.length;
  const width = mask[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let active = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          active = active || (mask[y + dy]?.[x + dx] ?? 0) > 0;
        }
      }
      result[y][x] = active ? 1 : 0;
    }
  }

  return result;
}

function erode(mask: GrayscaleImage): GrayscaleImage {
  const height = mask.length;
  const width = mask[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let active = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          active = active && (mask[y + dy]?.[x + dx] ?? 0) > 0;
        }
      }
      result[y][x] = active ? 1 : 0;
    }
  }

  return result;
}

function meanImage(frames: GrayscaleImage[]): GrayscaleImage {
  const height = frames[0]?.length || 0;
  const width = frames[0]?.[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (const frame of frames) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        result[y][x] += frame[y][x] / frames.length;
      }
    }
  }

  return result;
}

function stdImage(frames: GrayscaleImage[], mean: GrayscaleImage): GrayscaleImage {
  const height = mean.length;
  const width = mean[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (const frame of frames) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        result[y][x] += (frame[y][x] - mean[y][x]) ** 2 / frames.length;
      }
    }
  }

  return result.map(row => row.map(value => Math.sqrt(value)));
}

function blendImages(current: GrayscaleImage, previous: GrayscaleImage, alpha: number): GrayscaleImage {
  return previous.map((row, y) =>
    row.map((pixel, x) => clamp(alpha * current[y][x] + (1 - alpha) * pixel, 0, 1))
  );
}

function gaussianForegroundMask(
  current: GrayscaleImage,
  mean: GrayscaleImage,
  deviation: GrayscaleImage,
  lambda: number
): GrayscaleImage {
  return current.map((row, y) =>
    row.map((pixel, x) => {
      const sigma = Math.max(0.03, deviation[y][x]);
      return Math.abs(pixel - mean[y][x]) > lambda * sigma ? 1 : 0;
    })
  );
}

function createMixtureBackground(width: number, height: number): GrayscaleImage {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const slowMode = 0.24 + 0.06 * Math.sin((x + y) / 7);
      const dynamicMode = 0.36 + 0.08 * Math.sin(x / 4);
      return clamp((slowMode * 0.54 + dynamicMode * 0.32) / 0.86, 0, 1);
    })
  );
}

function meanOfImage(image: GrayscaleImage): number {
  let sum = 0;
  let count = 0;
  for (const row of image) {
    for (const pixel of row) {
      sum += pixel;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}
