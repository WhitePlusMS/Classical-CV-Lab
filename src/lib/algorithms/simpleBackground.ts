import { GrayscaleImage } from './types';
import { clamp, create2DArray, normalizeImage } from '../utils/imageProcessing';
import { createHumanMotionSequence } from '../utils/motionTeachingSequence';

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

export interface FrameDifferenceTeachingResult extends FrameDifferenceResult {
  frames: GrayscaleImage[];
  width: number;
  height: number;
  frameIndex: number;
  previousIndex: number;
  nextIndex: number;
  previous: GrayscaleImage;
  current: GrayscaleImage;
  next: GrayscaleImage;
  motionPixelCount: number;
  cleanedPixelCount: number;
  pixelTimeline: FrameDifferencePixelTimelinePoint[];
}

export interface FrameDifferencePixelTimelinePoint {
  frameIndex: number;
  current: number;
  previous: number;
  next: number;
  previousDifference: number;
  nextDifference: number;
  previousMask: number;
  nextMask: number;
  finalMask: number;
}

export interface BackgroundModelResult {
  current: GrayscaleImage;
  previousFrame: GrayscaleImage;
  background: GrayscaleImage;
  difference: GrayscaleImage;
  mask: GrayscaleImage;
  mean: GrayscaleImage;
  deviation: GrayscaleImage;
  mixtureComponents: GaussianComponent[];
  frames: GrayscaleImage[];
  frameIndex: number;
  backgroundHistory: GrayscaleImage[];
  maskHistory: GrayscaleImage[];
  foregroundCounts: number[];
  pixelTimeline: BackgroundPixelTimelinePoint[];
}

export interface GaussianComponent {
  weight: number;
  mean: number;
  sigma: number;
  background: boolean;
}

export interface BackgroundPixelTimelinePoint {
  frameIndex: number;
  current: number;
  background: number;
  difference: number;
  mask: number;
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
  const sequence = createHumanMotionSequence({
    width: 96,
    height: 64,
    frameCount: 3,
    speed: Math.max(0.45, speed / 6),
    noiseStrength: noiseStrength / 255,
  });

  return {
    previous: sequence.frames[0],
    current: sequence.frames[1],
    next: sequence.frames[2],
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

export function createFrameDifferenceTeachingSequence(
  mode: FrameDifferenceMode,
  threshold: number,
  frameIndex: number,
  speed: number,
  noiseStrength: number,
  pixel: { x: number; y: number } = { x: 48, y: 42 }
): FrameDifferenceTeachingResult {
  const sequence = createHumanMotionSequence({
    width: 96,
    height: 64,
    frameCount: 24,
    speed: Math.max(0.45, speed / 6),
    noiseStrength: noiseStrength / 255,
    lightVariation: 0.03,
    dynamicBackgroundStrength: 0.022,
  });
  const lastInteriorFrame = Math.max(1, sequence.frames.length - 2);
  const safeFrameIndex = Math.max(1, Math.min(frameIndex, lastInteriorFrame));
  const previousIndex = safeFrameIndex - 1;
  const nextIndex = safeFrameIndex + 1;
  const motionSequence: MotionSequence = {
    previous: sequence.frames[previousIndex],
    current: sequence.frames[safeFrameIndex],
    next: sequence.frames[nextIndex],
  };
  const result = computeFrameDifference(motionSequence, threshold, mode);

  return {
    ...result,
    frames: sequence.frames,
    width: sequence.width,
    height: sequence.height,
    frameIndex: safeFrameIndex,
    previousIndex,
    nextIndex,
    previous: motionSequence.previous,
    current: motionSequence.current,
    next: motionSequence.next,
    motionPixelCount: countForegroundPixels(result.binary),
    cleanedPixelCount: countForegroundPixels(result.cleaned),
    pixelTimeline: createFrameDifferencePixelTimeline(
      sequence.frames,
      mode,
      threshold,
      pixel.x,
      pixel.y
    ),
  };
}

export function createBackgroundModel(
  method: BackgroundModelType,
  threshold: number,
  learningRate: number
): BackgroundModelResult {
  return createBackgroundTeachingSequence(method, threshold, learningRate, 12);
}

// ============================
// 混合高斯：逐像素真实 GMM 迭代
// （与页面同源：教学在连续帧上执行匹配/更新/替换/背景选择/前景判定）
// ============================

const GMM_K = 5;      // 高斯分量个数
const GMM_D = 2.5;    // 匹配阈值倍数（|I-μ| ≤ D·σ）
const GMM_T_BG = 0.7; // 背景权重累计阈值

interface GmmCompState {
  weight: number; // ω
  mean: number;   // μ
  sigma: number;  // σ
}

function gmmWeightSigma(a: GmmCompState, b: GmmCompState): number {
  return b.weight / Math.max(0.001, b.sigma) - a.weight / Math.max(0.001, a.sigma);
}

/**
 * 单个像素的单步 GMM：匹配 → 更新/替换 → 权值归一化 → 背景选择 → 前景判定。
 * 返回更新后的分量、背景值（背景分量的加权均值）与是否前景。
 */
function gmmPixelStep(
  pixel: number,
  comps: GmmCompState[],
  alpha: number
): { comps: GmmCompState[]; bg: number; isForeground: boolean; bgCount: number } {
  // ① 按 ω/σ 降序
  const sorted = [...comps].sort(gmmWeightSigma);
  let matched = false;
  const updated = sorted.map((c) => {
    if (!matched && Math.abs(pixel - c.mean) <= GMM_D * c.sigma) {
      matched = true;
      const rho = Math.min(1, alpha / Math.max(c.weight, 0.01));
      return {
        weight: (1 - alpha) * c.weight + alpha,
        mean: (1 - rho) * c.mean + rho * pixel,
        sigma: Math.max(0.0001, Math.sqrt(Math.max(0.0009, (1 - rho) * c.sigma * c.sigma + rho * (pixel - c.mean) ** 2))),
      };
    }
    return { ...c, weight: (1 - alpha) * c.weight };
  });
  // ② 无匹配 → 替换权重最小的分量
  if (!matched) {
    const minIdx = updated.reduce((idx, c, i, arr) => (c.weight < arr[idx].weight ? i : idx), 0);
    updated[minIdx] = { weight: 0.05, mean: pixel, sigma: 0.2 };
  }
  // ③ 权值归一化后按 ω/σ 重排
  const total = updated.reduce((s, c) => s + c.weight, 0) || 1;
  const norm = updated.map((c) => ({ ...c, weight: c.weight / total })).sort(gmmWeightSigma);
  // ④ 背景选择：累计权重达 T_BG 的前置分量视为背景
  let cum = 0;
  let bgCount = 0;
  for (const c of norm) {
    if (cum >= GMM_T_BG) break;
    cum += c.weight;
    bgCount++;
  }
  bgCount = Math.max(1, bgCount);
  const bgComps = norm.slice(0, bgCount);
  const bgWeight = bgComps.reduce((s, c) => s + c.weight, 0) || 1;
  const bg = bgComps.reduce((s, c) => s + c.weight * c.mean, 0) / bgWeight;
  // ⑤ 前景判定：当前像素不匹配任一背景分量
  const isForeground = !norm.slice(0, bgCount).some((c) => Math.abs(pixel - c.mean) <= GMM_D * c.sigma);
  return { comps: norm, bg, isForeground, bgCount };
}

/** 用前 8 帧训练统计初始化单个像素的 K 个分量（数据驱动的起点） */
function initPixelGmm(mean: number, std: number): GmmCompState[] {
  const sigma = Math.max(0.03, std);
  const offsets = [0, 0.6, -0.6, 1.2, -1.2];
  const weights = [0.5, 0.22, 0.18, 0.06, 0.04];
  return Array.from({ length: GMM_K }, (_, i) => ({
    weight: weights[i],
    mean: clamp(mean + offsets[i] * sigma, 0, 1),
    sigma,
  }));
}

/** 对整个序列跑逐像素 GMM，得到每帧背景图与前景掩膜 */
function runGmmOverSequence(
  frames: GrayscaleImage[],
  mean: GrayscaleImage,
  deviation: GrayscaleImage,
  alpha: number
): { backgroundHistory: GrayscaleImage[]; maskHistory: GrayscaleImage[] } {
  const height = frames[0]?.length || 0;
  const width = frames[0]?.[0]?.length || 0;
  let state: GmmCompState[][][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => initPixelGmm(mean[y][x], deviation[y][x]))
  );
  const backgroundHistory: GrayscaleImage[] = [];
  const maskHistory: GrayscaleImage[] = [];
  for (const frame of frames) {
    const bgImg = create2DArray(height, width, 0);
    const maskImg = create2DArray(height, width, 0);
    const next: GmmCompState[][][] = Array.from({ length: height }, () => Array.from({ length: width }, () => []));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const r = gmmPixelStep(frame[y][x], state[y][x], alpha);
        next[y][x] = r.comps;
        bgImg[y][x] = r.bg;
        maskImg[y][x] = r.isForeground ? 1 : 0;
      }
    }
    backgroundHistory.push(bgImg);
    maskHistory.push(maskImg);
    state = next;
  }
  return { backgroundHistory, maskHistory };
}

/** 对选中像素跑 GMM 到指定帧，返回带背景标记的分量，用于页面展示 */
function runGmmAtPixel(
  frames: GrayscaleImage[],
  x: number,
  y: number,
  mean: GrayscaleImage,
  deviation: GrayscaleImage,
  alpha: number,
  frameIndex: number
): GaussianComponent[] {
  const height = frames[0]?.length || 0;
  const width = frames[0]?.[0]?.length || 0;
  const safeY = Math.max(0, Math.min(y, height - 1));
  const safeX = Math.max(0, Math.min(x, Math.max(0, width - 1)));
  let comps = initPixelGmm(mean[safeY][safeX], deviation[safeY][safeX]);
  let lastBgCount = 1;
  const end = Math.max(0, Math.min(frameIndex, frames.length - 1));
  for (let t = 0; t <= end; t++) {
    const r = gmmPixelStep(frames[t][safeY][safeX], comps, alpha);
    comps = r.comps;
    lastBgCount = r.bgCount;
  }
  return comps.map((c, i) => ({
    weight: c.weight,
    mean: c.mean,
    sigma: c.sigma,
    background: i < lastBgCount,
  }));
}

export function createBackgroundTeachingSequence(
  method: BackgroundModelType,
  threshold: number,
  learningRate: number,
  frameIndex: number,
  pixel: { x: number; y: number } = { x: 48, y: 32 }
): BackgroundModelResult {
  const sequence = createHumanMotionSequence({
    width: 96,
    height: 64,
    frameCount: 24,
    speed: 1,
    noiseStrength: 0.012,
    lightVariation: 0.03,
    dynamicBackgroundStrength: method === 'mixtureGaussian' ? 0.045 : 0.022,
  });
  const safeFrameIndex = Math.max(0, Math.min(frameIndex, sequence.frames.length - 1));
  const normalizedThreshold = clamp(threshold / 255, 0, 1);
  const alpha = clamp(learningRate / 100, 0.01, 0.8);
  const trainingFrames = sequence.frames.slice(0, 8);
  const mean = meanImage(trainingFrames);
  const deviation = stdImage(trainingFrames, mean);

  let backgroundHistory: GrayscaleImage[];
  let deviationHistory: GrayscaleImage[];
  let maskHistory: GrayscaleImage[];
  let mixtureComponents: GaussianComponent[];

  if (method === 'mixtureGaussian') {
    // 混合高斯：对连续帧做真实逐像素 GMM 迭代，得到背景历史与前景掩膜
    const gmm = runGmmOverSequence(sequence.frames, mean, deviation, alpha);
    backgroundHistory = gmm.backgroundHistory;
    maskHistory = gmm.maskHistory;
    deviationHistory = createDeviationHistory(method, sequence.frames, mean, deviation, alpha);
    // 选中像素在指定帧的分量：与整图 GMM 同一初始化/迭代，逐像素独立故结果一致
    mixtureComponents = runGmmAtPixel(sequence.frames, pixel.x, pixel.y, mean, deviation, alpha, safeFrameIndex);
  } else {
    backgroundHistory = createBackgroundHistory(method, sequence.frames, sequence.backgroundFrames, mean, alpha);
    deviationHistory = createDeviationHistory(method, sequence.frames, mean, deviation, alpha);
    maskHistory = sequence.frames.map((frame, index) => {
      if (method === 'singleGaussian') {
        return gaussianForegroundMask(frame, backgroundHistory[index], deviationHistory[index], 2.5);
      }
      return binarize(absoluteDifference(frame, backgroundHistory[index]), normalizedThreshold);
    });
    mixtureComponents = [];
  }

  const foregroundCounts = maskHistory.map(countForegroundPixels);
  const current = sequence.frames[safeFrameIndex];
  const background = backgroundHistory[safeFrameIndex];
  const difference = absoluteDifference(current, background);
  const mask = maskHistory[safeFrameIndex];

  return {
    current,
    previousFrame: sequence.frames[Math.max(0, safeFrameIndex - 1)],
    background,
    difference,
    mask,
    mean,
    deviation: deviationHistory[safeFrameIndex],
    mixtureComponents,
    frames: sequence.frames,
    frameIndex: safeFrameIndex,
    backgroundHistory,
    maskHistory,
    foregroundCounts,
    pixelTimeline: createPixelTimeline(
      sequence.frames,
      backgroundHistory,
      maskHistory,
      pixel.x,
      pixel.y
    ),
  };
}

function cloneImage(image: GrayscaleImage): GrayscaleImage {
  return image.map(row => [...row]);
}

function createBackgroundHistory(
  method: BackgroundModelType,
  frames: GrayscaleImage[],
  backgroundFrames: GrayscaleImage[],
  mean: GrayscaleImage,
  alpha: number
): GrayscaleImage[] {
  if (method === 'mean') {
    return frames.map(() => cloneImage(mean));
  }

  if (method === 'singleGaussian') {
    const history: GrayscaleImage[] = [];
    let runningMean = cloneImage(backgroundFrames[0]);
    for (const frame of frames) {
      history.push(cloneImage(runningMean));
      runningMean = blendImages(frame, runningMean, alpha);
    }
    return history;
  }

  // 自适应背景：B_t = α·I_t + (1-α)·B_{t-1}
  const history: GrayscaleImage[] = [];
  let background = cloneImage(backgroundFrames[0]);

  for (const frame of frames) {
    history.push(cloneImage(background));
    background = blendImages(frame, background, alpha);
  }

  return history;
}

function createDeviationHistory(
  method: BackgroundModelType,
  frames: GrayscaleImage[],
  mean: GrayscaleImage,
  deviation: GrayscaleImage,
  alpha: number
): GrayscaleImage[] {
  if (method !== 'singleGaussian') {
    return frames.map(() => cloneImage(deviation));
  }

  const history: GrayscaleImage[] = [];
  let runningMean = cloneImage(mean);
  let runningVariance = deviation.map(row =>
    row.map(value => Math.max(0.03, value) ** 2)
  );

  for (const frame of frames) {
    history.push(runningVariance.map(row => row.map(value => Math.sqrt(Math.max(0.0009, value)))));
    const nextMean = blendImages(frame, runningMean, alpha);
    runningVariance = runningVariance.map((row, y) =>
      row.map((value, x) => {
        const diff = frame[y][x] - runningMean[y][x];
        return clamp((1 - alpha) * value + alpha * diff * diff, 0.0009, 0.25);
      })
    );
    runningMean = nextMean;
  }

  return history;
}

function countForegroundPixels(mask: GrayscaleImage): number {
  return mask.reduce(
    (total, row) => total + row.reduce((rowTotal, pixel) => rowTotal + (pixel > 0 ? 1 : 0), 0),
    0
  );
}

function createPixelTimeline(
  frames: GrayscaleImage[],
  backgroundHistory: GrayscaleImage[],
  maskHistory: GrayscaleImage[],
  x: number,
  y: number
): BackgroundPixelTimelinePoint[] {
  return frames.map((frame, frameIndex) => {
    const safeY = Math.max(0, Math.min(y, frame.length - 1));
    const safeX = Math.max(0, Math.min(x, (frame[0]?.length ?? 1) - 1));
    const current = frame[safeY]?.[safeX] ?? 0;
    const background = backgroundHistory[frameIndex]?.[safeY]?.[safeX] ?? 0;
    const mask = maskHistory[frameIndex]?.[safeY]?.[safeX] ?? 0;

    return {
      frameIndex,
      current,
      background,
      difference: Math.abs(current - background),
      mask,
    };
  });
}

function createFrameDifferencePixelTimeline(
  frames: GrayscaleImage[],
  mode: FrameDifferenceMode,
  threshold: number,
  x: number,
  y: number
): FrameDifferencePixelTimelinePoint[] {
  const normalizedThreshold = clamp(threshold / 255, 0, 1);

  return frames.map((frame, frameIndex) => {
    const safeY = Math.max(0, Math.min(y, frame.length - 1));
    const safeX = Math.max(0, Math.min(x, (frame[0]?.length ?? 1) - 1));
    const previousFrame = frames[Math.max(0, frameIndex - 1)];
    const nextFrame = frames[Math.min(frames.length - 1, frameIndex + 1)];
    const current = frame[safeY]?.[safeX] ?? 0;
    const previous = previousFrame?.[safeY]?.[safeX] ?? current;
    const next = nextFrame?.[safeY]?.[safeX] ?? current;
    const previousDifference = Math.abs(current - previous);
    const nextDifference = Math.abs(next - current);
    const previousMask = previousDifference > normalizedThreshold ? 1 : 0;
    const nextMask = nextDifference > normalizedThreshold ? 1 : 0;

    return {
      frameIndex,
      current,
      previous,
      next,
      previousDifference,
      nextDifference,
      previousMask,
      nextMask,
      finalMask: mode === 'twoFrame'
        ? previousMask
        : previousMask > 0 && nextMask > 0 ? 1 : 0,
    };
  });
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
  // 约定：采用严格大于（pixel > T），差分等于阈值时判为背景
  return image.map(row => row.map(pixel => (pixel > threshold ? 1 : 0)));
}

function addImages(a: GrayscaleImage, b: GrayscaleImage): GrayscaleImage {
  return a.map((row, y) => row.map((pixel, x) => pixel + (b[y]?.[x] ?? 0)));
}

function intersectBinaryMasks(a: GrayscaleImage, b: GrayscaleImage): GrayscaleImage {
  return a.map((row, y) => row.map((pixel, x) => (pixel > 0 && (b[y]?.[x] ?? 0) > 0 ? 1 : 0)));
}

function morphologicalClose(mask: GrayscaleImage): GrayscaleImage {
  // 教学简化：闭运算 = 先膨胀后腐蚀；边界越界按背景 0 处理（?? 0），
  // 未做标准形态学的边界填充/对称镜像
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
