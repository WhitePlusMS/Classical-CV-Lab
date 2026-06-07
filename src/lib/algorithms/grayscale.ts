import { GrayscaleImage } from './types';
import { create2DArray, clamp } from '../utils/imageProcessing';

/**
 * 三维 RGB 图像类型：height × width × [R, G, B]，每个通道值在 [0,1] 范围
 */
export type RgbImage = number[][][];

/**
 * 从灰度图生成模拟 RGB 图像。
 * 通过对灰度值施加不同的颜色偏移，生成视觉上可辨识的彩色图像，
 * 方便教学展示 RGB 三通道的分离效果。
 */
export function generateRgbImage(grayscale: GrayscaleImage): RgbImage {
  const height = grayscale.length;
  const width = grayscale[0]?.length || 0;
  const rgb: RgbImage = [];

  for (let y = 0; y < height; y++) {
    const row: number[][] = [];
    for (let x = 0; x < width; x++) {
      const gray = grayscale[y][x];
      const nx = width > 1 ? x / (width - 1) : 0;
      const ny = height > 1 ? y / (height - 1) : 0;
      // 教学合成图必须让 RGB 三个通道有明显差异，否则彩色模式仍会近似灰度图。
      const r = clamp(gray * 0.58 + nx * 0.36 + 0.12 * Math.sin(y * 0.22), 0, 1);
      const g = clamp(gray * 0.52 + (1 - ny) * 0.38 + 0.10 * Math.cos(x * 0.18), 0, 1);
      const b = clamp(gray * 0.48 + (1 - nx) * 0.22 + ny * 0.32 + 0.10 * Math.sin((x + y) * 0.16), 0, 1);
      row.push([r, g, b]);
    }
    rgb.push(row);
  }

  return rgb;
}

/**
 * 加权法灰度化：V_gray = 0.299R + 0.587G + 0.114B
 * 权重基于人眼对不同颜色光的敏感度（绿色最敏感）
 */
export function rgbToGrayscaleWeighted(rgbImage: RgbImage): GrayscaleImage {
  const height = rgbImage.length;
  const width = rgbImage[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbImage[y][x];
      result[y][x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  return result;
}

/**
 * 平均法灰度化：V_gray = (R + G + B) / 3
 * 将三个通道值等权重平均
 */
export function rgbToGrayscaleAverage(rgbImage: RgbImage): GrayscaleImage {
  const height = rgbImage.length;
  const width = rgbImage[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbImage[y][x];
      result[y][x] = (r + g + b) / 3;
    }
  }

  return result;
}

/**
 * 从 RGB 图像提取单个通道
 */
export function extractChannel(rgbImage: RgbImage, channel: 0 | 1 | 2): GrayscaleImage {
  const height = rgbImage.length;
  const width = rgbImage[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = rgbImage[y][x][channel];
    }
  }

  return result;
}

/**
 * 显示模式枚举
 */
export type DisplayMode = 'color' | 'red' | 'green' | 'blue' | 'grayWeighted' | 'grayAverage';

/**
 * 单步灰度化信息
 */
export interface GrayscaleStep {
  x: number;
  y: number;
  r: number;           // 原始 R 通道值
  g: number;           // 原始 G 通道值
  b: number;           // 原始 B 通道值
  weightedGray: number; // 加权法灰度值
  averageGray: number;  // 平均法灰度值
  method: 'weighted' | 'average';
  outputValue: number;  // 当前方法对应的输出值
}

/**
 * 分步骤生成灰度化信息，每步对应一个像素。
 * 返回每个像素的 R/G/B 值和两种方法的灰度计算结果。
 */
export function* grayscaleSteps(
  rgbImage: RgbImage,
  method: 'weighted' | 'average'
): Generator<GrayscaleStep> {
  if (!rgbImage || rgbImage.length === 0 || !rgbImage[0]) return;
  const height = rgbImage.length;
  const width = rgbImage[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbImage[y][x];
      const weightedGray = 0.299 * r + 0.587 * g + 0.114 * b;
      const averageGray = (r + g + b) / 3;
      const outputValue = method === 'weighted' ? weightedGray : averageGray;

      yield {
        x,
        y,
        r,
        g,
        b,
        weightedGray: clamp(weightedGray, 0, 1),
        averageGray: clamp(averageGray, 0, 1),
        method,
        outputValue: clamp(outputValue, 0, 1),
      };
    }
  }
}

/**
 * 根据 displayMode 从 RGB 图像生成对应的灰度显示图像
 */
export function getDisplayImage(
  rgbImage: RgbImage | null,
  displayMode: DisplayMode,
  weightedResult: GrayscaleImage | null,
  averageResult: GrayscaleImage | null
): GrayscaleImage | null {
  if (!rgbImage) return null;

  switch (displayMode) {
    case 'color':
      // 彩色模式无法用单通道灰度表示，返回 null 让页面特殊处理
      return null;
    case 'red':
      return extractChannel(rgbImage, 0);
    case 'green':
      return extractChannel(rgbImage, 1);
    case 'blue':
      return extractChannel(rgbImage, 2);
    case 'grayWeighted':
      return weightedResult;
    case 'grayAverage':
      return averageResult;
    default:
      return null;
  }
}
