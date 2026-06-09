/**
 * SIFT / SURF 尺度特征教学演示算法
 *
 * 为教学目的提供简化的 SIFT/SURF 特征检测与描述模拟。
 * 核心流程包括：
 *   - 高斯尺度空间构建
 *   - DoG 尺度空间构建
 *   - 空间极值点检测（26 邻域）
 *   - 方向分配（梯度直方图）
 *   - 描述子生成（SIFT 128D / SURF 64D）
 *   - 最近邻比值匹配
 */

import { GrayscaleImage } from './types';
import { create2DArray } from '../utils/imageProcessing';

// ==================== 类型定义 ====================

/** 一个简易关键点 */
export interface SiftKeypoint {
  x: number;
  y: number;
  octave: number;
  scale: number;
  /** 主方向（弧度） */
  orientation: number;
  /** 幅值 */
  magnitude: number;
  /** SIFT 128 维描述子 */
  siftDescriptor: number[];
  /** SURF 64 维描述子 */
  surfDescriptor: number[];
}

/** SIFT 当前步骤的上下文数据 */
export interface SiftStepData {
  gaussianValues: number[][];
  dogValues: number[][];
  currentKeypoint: SiftKeypoint | null;
  gradientMagnitudes: number[][] | null;
  gradientOrientations: number[][] | null;
  orientationHistogram: number[] | null;
  siftDescriptorGrid: number[][] | null;
  surfDescriptorGrid: number[][] | null;
  matches: Array<{ queryIdx: number; trainIdx: number; distance: number }> | null;
}

// ==================== 尺度空间辅助 ====================

function gaussianBlur(image: GrayscaleImage, sigma: number): GrayscaleImage {
  const h = image.length;
  const w = image[0]?.length ?? 0;
  if (h === 0 || w === 0) return image;

  const radius = Math.ceil(2 * sigma);
  const size = 2 * radius + 1;
  const kernel = new Array<number>(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  const temp = create2DArray(h, w, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let k = 0; k < size; k++) {
        const sx = x + k - radius;
        if (sx >= 0 && sx < w) val += image[y][sx] * kernel[k];
      }
      temp[y][x] = val;
    }
  }

  const result = create2DArray(h, w, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let k = 0; k < size; k++) {
        const sy = y + k - radius;
        if (sy >= 0 && sy < h) val += temp[sy][x] * kernel[k];
      }
      result[y][x] = val;
    }
  }

  return result;
}

function computeGaussianScale(image: GrayscaleImage, sigma: number): GrayscaleImage {
  return gaussianBlur(image, sigma);
}

function computeDoG(l1: GrayscaleImage, l2: GrayscaleImage): GrayscaleImage {
  const h = l1.length;
  const w = l1[0]?.length ?? 0;
  const result = create2DArray(h, w, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      result[y][x] = l2[y][x] - l1[y][x];
    }
  }
  return result;
}

// ==================== 关键点检测 ====================

function detectExtrema(dogImage: GrayscaleImage, octave: number, scale: number): SiftKeypoint[] {
  const h = dogImage.length;
  const w = dogImage[0]?.length ?? 0;
  const keypoints: SiftKeypoint[] = [];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const value = dogImage[y][x];
      const isMax = (
        value > dogImage[y - 1][x - 1] && value > dogImage[y - 1][x] && value > dogImage[y - 1][x + 1] &&
        value > dogImage[y][x - 1] && value > dogImage[y][x + 1] &&
        value > dogImage[y + 1][x - 1] && value > dogImage[y + 1][x] && value > dogImage[y + 1][x + 1]
      );
      if (isMax) {
        keypoints.push({
          x, y, octave, scale,
          orientation: 0, magnitude: value,
          siftDescriptor: [], surfDescriptor: [],
        });
      }
    }
  }
  return keypoints;
}

// ==================== 梯度与方向 ====================

function computeGradients(
  image: GrayscaleImage, cx: number, cy: number, radius: number
): { magnitudes: number[][]; orientations: number[][] } {
  const size = 2 * radius + 1;
  const magnitudes = create2DArray(size, size, 0);
  const orientations = create2DArray(size, size, 0);
  const w = image[0]?.length ?? 0;
  const h = image.length;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = cx + dx, py = cy + dy;
      const ri = dy + radius, ci = dx + radius;
      if (px <= 0 || px >= w - 1 || py <= 0 || py >= h - 1) continue;
      const gx = image[py][px + 1] - image[py][px - 1];
      const gy = image[py + 1][px] - image[py - 1][px];
      magnitudes[ri][ci] = Math.sqrt(gx * gx + gy * gy);
      orientations[ri][ci] = Math.atan2(gy, gx);
    }
  }
  return { magnitudes, orientations };
}

function computeOrientationHistogram(magnitudes: number[][], orientations: number[][], radius: number): number[] {
  const hist = new Array<number>(8).fill(0);
  const binSize = (2 * Math.PI) / 8;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const ri = dy + radius, ci = dx + radius;
      const bin = Math.floor((orientations[ri][ci] + Math.PI) / binSize) % 8;
      const weight = Math.exp(-(dx * dx + dy * dy) / (2 * (radius * 0.5) ** 2));
      hist[bin] += magnitudes[ri][ci] * weight;
    }
  }
  const hSum = hist.reduce((a, b) => a + b, 0);
  if (hSum > 0) { for (let i = 0; i < 8; i++) hist[i] /= hSum; }
  return hist;
}

function findDominantOrientation(hist: number[]): number {
  const binSize = (2 * Math.PI) / 8;
  let maxBin = 0;
  for (let i = 1; i < 8; i++) { if (hist[i] > hist[maxBin]) maxBin = i; }
  return maxBin * binSize - Math.PI;
}

// ==================== 描述子生成 ====================

function computeSiftDescriptor(
  magnitudes: number[][], orientations: number[][],
  kpX: number, kpY: number, orientation: number
): { descriptor: number[]; grid: number[][] } {
  const descriptor: number[] = [];
  const grid: number[][] = [];
  const subSize = 4;

  for (let sr = 0; sr < 4; sr++) {
    for (let sc = 0; sc < 4; sc++) {
      const hist = new Array<number>(8).fill(0);
      const cR = kpY + (sr - 1.5) * subSize;
      const cC = kpX + (sc - 1.5) * subSize;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const py = Math.round(cR + dy), px = Math.round(cC + dx);
          const ri = py - (kpY - 8), ci = px - (kpX - 8);
          if (ri < 0 || ri >= orientations.length || ci < 0 || ci >= (orientations[0]?.length ?? 0)) continue;
          const mag = magnitudes[ri][ci], orient = orientations[ri][ci];
          const bin = Math.floor((orient - orientation + Math.PI) / (Math.PI / 4)) % 8;
          const dist = Math.sqrt((sr - 1.5 + dy / subSize) ** 2 + (sc - 1.5 + dx / subSize) ** 2);
          hist[bin] += mag * Math.exp(-dist * dist / 2);
        }
      }
      const hSum = hist.reduce((a, b) => a + b, 0);
      if (hSum > 0) { for (let i = 0; i < 8; i++) hist[i] /= hSum; }
      descriptor.push(...hist);
      grid.push(hist);
    }
  }
  return { descriptor, grid };
}

function computeSurfDescriptor(image: GrayscaleImage, kpX: number, kpY: number, scale: number): { descriptor: number[]; grid: number[][] } {
  const descriptor: number[] = [];
  const grid: number[][] = [];
  const sz = 20 * scale, step = sz / 4;
  const w = image[0]?.length ?? 0, h = image.length;

  for (let sr = 0; sr < 4; sr++) {
    for (let sc = 0; sc < 4; sc++) {
      const cx = kpX + (sc - 1.5) * step, cy = kpY + (sr - 1.5) * step;
      let dxSum = 0, dySum = 0, dxAbs = 0, dyAbs = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = Math.round(cx + dx), py = Math.round(cy + dy);
          if (px <= 0 || px >= w - 1 || py <= 0 || py >= h - 1) continue;
          const gx = image[py][px + 1] - image[py][px - 1];
          const gy = image[py + 1][px] - image[py - 1][px];
          dxSum += gx; dySum += gy; dxAbs += Math.abs(gx); dyAbs += Math.abs(gy);
        }
      }
      descriptor.push(dxSum, dySum, dxAbs, dyAbs);
      grid.push([dxSum, dySum, dxAbs, dyAbs]);
    }
  }
  const norm = Math.sqrt(descriptor.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < descriptor.length; i++) descriptor[i] /= norm;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 4; c++) grid[r][c] /= norm;
  }
  return { descriptor, grid };
}

function findMatches(descriptors1: number[][], descriptors2: number[][], ratio: number): Array<{ queryIdx: number; trainIdx: number; distance: number }> {
  const matches: Array<{ queryIdx: number; trainIdx: number; distance: number }> = [];
  for (let i = 0; i < descriptors1.length; i++) {
    const d1 = descriptors1[i];
    const dists = descriptors2.map((d2, j) => {
      const d = d1.reduce((s, v, k) => s + (v - d2[k]) ** 2, 0);
      return { idx: j, dist: d };
    }).sort((a, b) => a.dist - b.dist);
    if (dists.length >= 2 && dists[0].dist / Math.max(dists[1].dist, 1e-10) < ratio) {
      matches.push({ queryIdx: i, trainIdx: dists[0].idx, distance: Math.sqrt(dists[0].dist) });
    }
  }
  return matches;
}

// ==================== 主生成函数 ====================

export interface SiftSurfResult {
  keypoints: SiftKeypoint[];
  gaussianScales: GrayscaleImage[];
  dogScales: GrayscaleImage[];
  stepData: SiftStepData;
  allSiftDescriptors: number[][];
  allSurfDescriptors: number[][];
}

export function computeSiftSurf(
  image: GrayscaleImage, sigma: number, numScales: number, selectedKp: number
): SiftSurfResult {
  const kFactor = 2 ** (1 / Math.max(numScales, 1));

  const gaussianScales: GrayscaleImage[] = [];
  for (let s = 0; s < numScales + 1; s++) {
    gaussianScales.push(computeGaussianScale(image, sigma * (kFactor ** s)));
  }

  const dogScales: GrayscaleImage[] = [];
  for (let s = 0; s < numScales; s++) {
    dogScales.push(computeDoG(gaussianScales[s], gaussianScales[s + 1]));
  }

  const allKeypoints: SiftKeypoint[] = [];
  for (let s = 1; s < dogScales.length - 1; s++) {
    allKeypoints.push(...detectExtrema(dogScales[s], 0, s));
  }

  const keypoints: SiftKeypoint[] = [];
  for (const kp of allKeypoints) {
    const radius = 8;
    const { magnitudes, orientations } = computeGradients(image, kp.x, kp.y, radius);
    const hist = computeOrientationHistogram(magnitudes, orientations, radius);
    const mainOrient = findDominantOrientation(hist);
    const { descriptor: siftDesc } = computeSiftDescriptor(magnitudes, orientations, kp.x, kp.y, mainOrient);
    const { descriptor: surfDesc } = computeSurfDescriptor(image, kp.x, kp.y, Math.max(kp.scale, 1));
    keypoints.push({ ...kp, orientation: mainOrient, magnitude: kp.magnitude, siftDescriptor: siftDesc, surfDescriptor: surfDesc });
  }

  keypoints.sort((a, b) => b.magnitude - a.magnitude);
  const topKeypoints = keypoints.slice(0, 20);

  let stepData: SiftStepData = {
    gaussianValues: gaussianScales[0], dogValues: dogScales[0],
    currentKeypoint: null, gradientMagnitudes: null, gradientOrientations: null,
    orientationHistogram: null, siftDescriptorGrid: null, surfDescriptorGrid: null, matches: null,
  };

  if (topKeypoints.length > 0) {
    const idx = Math.min(selectedKp, topKeypoints.length - 1);
    const kp = topKeypoints[idx];
    const radius = 8;
    const { magnitudes, orientations } = computeGradients(image, kp.x, kp.y, radius);
    const hist = computeOrientationHistogram(magnitudes, orientations, radius);
    const { grid: siftGrid } = computeSiftDescriptor(magnitudes, orientations, kp.x, kp.y, kp.orientation);
    const { grid: surfGrid } = computeSurfDescriptor(image, kp.x, kp.y, Math.max(kp.scale, 1));
    const matches = findMatches(topKeypoints.map(k => k.siftDescriptor), topKeypoints.map(k => k.siftDescriptor), 0.8);

    stepData = {
      gaussianValues: gaussianScales[0], dogValues: dogScales[0],
      currentKeypoint: kp, gradientMagnitudes: magnitudes, gradientOrientations: orientations,
      orientationHistogram: hist, siftDescriptorGrid: siftGrid, surfDescriptorGrid: surfGrid, matches,
    };
  }

  return {
    keypoints: topKeypoints, gaussianScales, dogScales, stepData,
    allSiftDescriptors: topKeypoints.map(k => k.siftDescriptor),
    allSurfDescriptors: topKeypoints.map(k => k.surfDescriptor),
  };
}
