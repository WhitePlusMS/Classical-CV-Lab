'use client';

import { GrayscaleImage } from './types';
import { create2DArray } from '../utils/imageProcessing';

// ========================================
// LBP (Local Binary Pattern) — 局部二值模式
// ========================================

/** 3×3 窗口的 LBP 中间结果 */
export interface LBPWindowResult {
  /** 3×3 灰度值矩阵（归一化 0-1） */
  values: number[][];
  /** 中心像素灰度值（归一化 0-1） */
  center: number;
  /** 8-bit 二进制模式，顺序从 p=1 到 p=8 */
  binaryPattern: number[];
  /** 十进制 LBP 值 */
  decimalValue: number;
}

/** 3×3 窗口的像素编号顺序：1=左上, 2=上, 3=右上, 4=右, 5=右下, 6=下, 7=左下, 8=左 */
const LBP_INDICES = [
  { dy: -1, dx: -1 }, // p=1 左上
  { dy: -1, dx:  0 }, // p=2 上
  { dy: -1, dx:  1 }, // p=3 右上
  { dy:  0, dx:  1 }, // p=4 右
  { dy:  1, dx:  1 }, // p=5 右下
  { dy:  1, dx:  0 }, // p=6 下
  { dy:  1, dx: -1 }, // p=7 左下
  { dy:  0, dx: -1 }, // p=8 左
];

/**
 * 获取图像中 (x, y) 位置的 3×3 LBP 窗口计算结果。
 * @param image 归一化灰度图像 (0~1)
 * @param x 列坐标
 * @param y 行坐标
 */
export function getLBPWindow(image: GrayscaleImage, x: number, y: number): LBPWindowResult {
  const height = image.length;
  const width = image[0]?.length || 0;
  const values: number[][] = [];
  const binaryPattern: number[] = [];
  const center = image[y]?.[x] ?? 0;

  // 构建 3×3 邻域
  for (let dy = -1; dy <= 1; dy++) {
    const row: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      const px = x + dx;
      const py = y + dy;
      row.push(image[py]?.[px] ?? 0);
    }
    values.push(row);
  }

  // 按 LBP 编号顺序比较：p=1 到 p=8
  for (const idx of LBP_INDICES) {
    const px = x + idx.dx;
    const py = y + idx.dy;
    const neighbor = image[py]?.[px] ?? 0;
    binaryPattern.push(neighbor >= center ? 1 : 0);
  }

  // 计算十进制 LBP 值：LBP = Σ s(I(p)-I(c)) · 2^(p-1)
  let decimalValue = 0;
  for (let p = 0; p < 8; p++) {
    decimalValue += binaryPattern[p] * Math.pow(2, p);
  }

  return { values, center, binaryPattern, decimalValue };
}

/**
 * 对整幅图像计算标准 LBP。
 * 边界像素（第 0 行/列、最后 1 行/列）置为 0。
 */
export function computeLBPImage(image: GrayscaleImage): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  // LBP 值范围 0~255，归一化到 0~1
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const window = getLBPWindow(image, x, y);
      result[y][x] = window.decimalValue / 255;
    }
  }

  return result;
}

/**
 * 对整幅图像计算旋转不变 LBP。
 * 旋转不变 LBP 取所有循环移位所得十进制值的最小值。
 * 边界像素置为 0。
 */
export function computeRotationInvariantLBP(image: GrayscaleImage): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const window = getLBPWindow(image, x, y);
      let minValue = window.decimalValue;

      // 循环移位，取最小值
      for (let shift = 1; shift < 8; shift++) {
        const rotated = [
          ...window.binaryPattern.slice(shift),
          ...window.binaryPattern.slice(0, shift),
        ];
        let value = 0;
        for (let p = 0; p < 8; p++) {
          value += rotated[p] * Math.pow(2, p);
        }
        minValue = Math.min(minValue, value);
      }

      result[y][x] = minValue / 255;
    }
  }

  return result;
}

// ========================================
// Gabor 滤波器
// ========================================

/** Gabor 内核参数 */
export interface GaborParams {
  /** 波长 λ — 正弦波的周期 */
  wavelength: number;
  /** 方向 θ — 平行条纹的法线角度（度） */
  orientation: number;
  /** 相位偏移 ψ（度） */
  phase: number;
  /** 高斯方差 σ */
  sigma: number;
  /** 空间纵横比 γ */
  gamma: number;
  /** 内核尺寸（边长，奇数） */
  kernelSize: number;
}

/** 默认 Gabor 参数预设 */
export const GABOR_PRESETS: { label: string; wavelength: number; orientation: number; phase: number; sigma: number; gamma: number; kernelSize: number }[] = [
  { label: '0° 水平', wavelength: 8, orientation: 0, phase: 0, sigma: 4, gamma: 0.5, kernelSize: 21 },
  { label: '45° 斜向', wavelength: 8, orientation: 45, phase: 0, sigma: 4, gamma: 0.5, kernelSize: 21 },
  { label: '90° 垂直', wavelength: 8, orientation: 90, phase: 0, sigma: 4, gamma: 0.5, kernelSize: 21 },
  { label: '135° 斜向', wavelength: 8, orientation: 135, phase: 0, sigma: 4, gamma: 0.5, kernelSize: 21 },
  { label: '宽条纹 λ=16', wavelength: 16, orientation: 0, phase: 0, sigma: 6, gamma: 0.5, kernelSize: 31 },
  { label: '细条纹 λ=4', wavelength: 4, orientation: 0, phase: 0, sigma: 3, gamma: 0.5, kernelSize: 15 },
];

/**
 * 生成二维 Gabor 滤波器核的实部。
 *
 * 空间域公式：
 *   h(x,y) = exp(-½·(x'² + γ²·y'²)/σ²) · cos(2π·x'/λ + ψ)
 * 其中：
 *   x' = x·cosθ + y·sinθ
 *   y' = -x·sinθ + y·cosθ
 *
 * 返回归一化至 [-1, 1] 的内核。
 */
export function generateGaborKernel(params: GaborParams): number[][] {
  const { wavelength, orientation, phase, sigma, gamma, kernelSize } = params;
  const theta = (orientation * Math.PI) / 180;
  const psi = (phase * Math.PI) / 180;
  const half = Math.floor(kernelSize / 2);

  const kernel = create2DArray(kernelSize, kernelSize, 0);
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const xPrime = x * Math.cos(theta) + y * Math.sin(theta);
      const yPrime = -x * Math.sin(theta) + y * Math.cos(theta);

      const gaussian = Math.exp(-0.5 * (xPrime * xPrime + gamma * gamma * yPrime * yPrime) / (sigma * sigma));
      const sinusoid = Math.cos(2 * Math.PI * xPrime / wavelength + psi);

      const value = gaussian * sinusoid;
      const ky = y + half;
      const kx = x + half;
      kernel[ky][kx] = value;
      minVal = Math.min(minVal, value);
      maxVal = Math.max(maxVal, value);
    }
  }

  // 归一化到 [-1, 1]
  const range = maxVal - minVal || 1;
  for (let y = 0; y < kernelSize; y++) {
    for (let x = 0; x < kernelSize; x++) {
      kernel[y][x] = ((kernel[y][x] - minVal) / range) * 2 - 1;
    }
  }

  return kernel;
}

/**
 * 用 Gabor 核对图像做卷积。
 * 对边界做零填充，输出尺寸与输入相同。
 * 结果用核绝对值之和归一化，最终裁剪到 [0, 1]。
 */
export function applyGaborFilter(image: GrayscaleImage, kernel: number[][]): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const kSize = kernel.length;
  const half = Math.floor(kSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let kSum = 0;

      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = x + kx - half;
          const py = y + ky - half;
          const imgVal = (px >= 0 && px < width && py >= 0 && py < height) ? image[py][px] : 0;
          sum += imgVal * kernel[ky][kx];
          kSum += Math.abs(kernel[ky][kx]);
        }
      }

      // 用核绝对值之和归一化，映射回 [0, 1]
      result[y][x] = kSum > 0 ? (sum / kSum + 1) / 2 : 0;
    }
  }

  // 最终裁剪到 [0, 1]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = Math.max(0, Math.min(1, result[y][x]));
    }
  }

  return result;
}

/**
 * 生成合成的纹理测试图像 (64×64)。
 * 四个象限分别包含不同纹理模式：竖条纹、横条纹、棋盘格、渐变。
 */
export function generateTextureTestImage(): GrayscaleImage {
  const SIZE = 64;
  const half = SIZE / 2;
  const image = create2DArray(SIZE, SIZE, 0);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let value = 0;

      if (y < half && x < half) {
        // 左上：竖条纹
        value = (Math.floor(x / 4) % 2 === 0) ? 0.9 : 0.2;
      } else if (y < half && x >= half) {
        // 右上：横条纹
        value = (Math.floor(y / 4) % 2 === 0) ? 0.9 : 0.2;
      } else if (y >= half && x < half) {
        // 左下：棋盘格
        const checkX = Math.floor(x / 4);
        const checkY = Math.floor(y / 4);
        value = ((checkX + checkY) % 2 === 0) ? 0.85 : 0.15;
      } else {
        // 右下：渐变
        value = ((x - half) / half + (y - half) / half) / 2;
        value = Math.max(0.1, Math.min(0.9, value));
      }

      image[y][x] = value;
    }
  }

  return image;
}
