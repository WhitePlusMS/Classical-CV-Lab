import { GrayscaleImage } from './types';
import { create2DArray, clamp } from '../utils/imageProcessing';

// ============================================================
// 梯度边缘强度
// ============================================================

/** 梯度合成方式 */
export type GradientMethod = 'max' | 'sum';

/**
 * 梯度边缘强度——用一阶差分近似梯度幅值
 * f_x' = f(x+1,y) - f(x,y)  水平（列、x 方向）差分
 * f_y' = f(x,y+1) - f(x,y)  垂直（行、y 方向）差分
 * max 模式：grad = max(|f_x'|, |f_y'|)
 * sum 模式：grad = |f_x'| + |f_y'|
 */
export function gradientSharpen(
  image: GrayscaleImage,
  method: GradientMethod = 'max'
): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 右邻域差分（水平方向 f_x'）
      const rightX = clamp(x + 1, 0, width - 1);
      const fxDiff = image[y][rightX] - image[y][x];

      // 下邻域差分（垂直方向 f_y'）
      const bottomY = clamp(y + 1, 0, height - 1);
      const fyDiff = image[bottomY][x] - image[y][x];

      const absFx = Math.abs(fxDiff);
      const absFy = Math.abs(fyDiff);

      const grad = method === 'max' ? Math.max(absFx, absFy) : absFx + absFy;

      result[y][x] = clamp(grad, 0, 1);
    }
  }

  return result;
}

// ============================================================
// Laplace 增强
// ============================================================

/**
 * Laplace 增强算子
 * ∇²f = f(i+1,j) + f(i-1,j) + f(i,j+1) + f(i,j-1) - 4f(i,j)
 * g(i,j) = f(i,j) - ∇²f(i,j)
 *        = 5f(i,j) - f(i+1,j) - f(i-1,j) - f(i,j+1) - f(i,j-1)
 */
export function laplaceEnhance(image: GrayscaleImage): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const top = clamp(y - 1, 0, height - 1);
      const bottom = clamp(y + 1, 0, height - 1);
      const left = clamp(x - 1, 0, width - 1);
      const right = clamp(x + 1, 0, width - 1);

      const laplacian =
        image[bottom][x] +
        image[top][x] +
        image[y][right] +
        image[y][left] -
        4 * image[y][x];

      // g = f - ∇²f，截断到 [0, 1]
      const enhanced = image[y][x] - laplacian;
      result[y][x] = clamp(enhanced, 0, 1);
    }
  }

  return result;
}

// ============================================================
// Laplace 核（仅用于显示）
// ============================================================

/** Laplace 3×3 显示核：中心 5，四邻域 -1 */
export const LAPLACE_ENHANCE_KERNEL: number[][] = [
  [0, -1, 0],
  [-1, 5, -1],
  [0, -1, 0],
];

/** 纯 Laplace 3×3 检测核：中心 -4，四邻域 1 */
export const LAPLACE_DETECT_KERNEL: number[][] = [
  [0, 1, 0],
  [1, -4, 1],
  [0, 1, 0],
];

// ============================================================
// 步骤生成器
// ============================================================

export interface GradientSharpenStep {
  x: number;
  y: number;
  /** 3×3 邻域（取当前像素为中心） */
  inputRegion: number[][];
  /** 水平差分 f_x' */
  fxDiff: number;
  /** 垂直差分 f_y' */
  fyDiff: number;
  /** 梯度幅值 */
  gradientMag: number;
  /** 输出像素值（归一化到 [0,1]） */
  outputValue: number;
  /** 合成方式 */
  method: GradientMethod;
}

export function* gradientSharpenSteps(
  image: GrayscaleImage,
  method: GradientMethod = 'max'
): Generator<GradientSharpenStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 提取 3×3 邻域
      const inputRegion: number[][] = [];
      for (let dy = -1; dy <= 1; dy++) {
        const row: number[] = [];
        for (let dx = -1; dx <= 1; dx++) {
          const py = clamp(y + dy, 0, height - 1);
          const px = clamp(x + dx, 0, width - 1);
          row.push(image[py][px]);
        }
        inputRegion.push(row);
      }

      // 计算一阶差分
      const rightX = clamp(x + 1, 0, width - 1);
      const bottomY = clamp(y + 1, 0, height - 1);
      const fxDiff = image[y][rightX] - image[y][x];
      const fyDiff = image[bottomY][x] - image[y][x];

      const absFx = Math.abs(fxDiff);
      const absFy = Math.abs(fyDiff);
      const grad = method === 'max' ? Math.max(absFx, absFy) : absFx + absFy;

      yield {
        x,
        y,
        inputRegion,
        fxDiff,
        fyDiff,
        gradientMag: grad,
        outputValue: clamp(grad, 0, 1),
        method,
      };
    }
  }
}

export interface LaplaceEnhanceStep {
  x: number;
  y: number;
  /** 3×3 邻域 */
  inputRegion: number[][];
  /** 中心像素原始值 */
  centerValue: number;
  /** Laplace 值 ∇²f */
  laplacian: number;
  /** 四邻域像素值：上、下、左、右 */
  neighbors: { top: number; bottom: number; left: number; right: number };
  /** Laplace 增强结果 g = f - ∇²f */
  outputValue: number;
}

export function* laplaceEnhanceSteps(
  image: GrayscaleImage
): Generator<LaplaceEnhanceStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 提取 3×3 邻域
      const inputRegion: number[][] = [];
      for (let dy = -1; dy <= 1; dy++) {
        const row: number[] = [];
        for (let dx = -1; dx <= 1; dx++) {
          const py = clamp(y + dy, 0, height - 1);
          const px = clamp(x + dx, 0, width - 1);
          row.push(image[py][px]);
        }
        inputRegion.push(row);
      }

      const top = clamp(y - 1, 0, height - 1);
      const bottom = clamp(y + 1, 0, height - 1);
      const left = clamp(x - 1, 0, width - 1);
      const right = clamp(x + 1, 0, width - 1);

      const topVal = image[top][x];
      const bottomVal = image[bottom][x];
      const leftVal = image[y][left];
      const rightVal = image[y][right];
      const center = image[y][x];

      const laplacian =
        bottomVal + topVal + rightVal + leftVal - 4 * center;

      const enhanced = center - laplacian;

      yield {
        x,
        y,
        inputRegion,
        centerValue: center,
        laplacian,
        neighbors: { top: topVal, bottom: bottomVal, left: leftVal, right: rightVal },
        outputValue: clamp(enhanced, 0, 1),
      };
    }
  }
}
