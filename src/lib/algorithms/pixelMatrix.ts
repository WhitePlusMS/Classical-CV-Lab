import { GrayscaleImage } from './types';
import { clamp } from '../utils/imageProcessing';
import { create2DArray } from '../utils/imageProcessing';

/**
 * 像素邻域颜色接口 - 支持灰度与彩色像素表示
 */
export interface PixelColor {
  r: number; // 红色通道 [0, 1]
  g: number; // 绿色通道 [0, 1]
  b: number; // 蓝色通道 [0, 1]
  gray?: number; // 灰度值 [0, 1]（灰度图专用）
}

/**
 * 彩色图像类型 - 三维数组 [row][col][channel]
 */
export type ColorImage = PixelColor[][];

export function rgbArrayToColorImage(rgbImage: number[][][]): ColorImage {
  return rgbImage.map(row =>
    row.map(([r, g, b]) => ({
      r: clamp(r, 0, 1),
      g: clamp(g, 0, 1),
      b: clamp(b, 0, 1),
      gray: clamp(0.299 * r + 0.587 * g + 0.114 * b, 0, 1),
    }))
  );
}

/**
 * 像素矩阵步进结果
 */
export interface PixelMatrixStep {
  x: number;  // 数学坐标系中的 x 坐标（列索引）
  y: number;  // 数学坐标系中的 y 坐标（行索引）
  row: number; // 数组访问中的行索引
  col: number; // 数组访问中的列索引
  color: PixelColor; // 当前像素颜色值
  neighborhood: PixelColor[][]; // 邻域像素
  description: string;
}

/**
 * 将 GrayscaleImage 转换为 ColorImage（灰度值复制到 RGB）
 */
export function grayscaleToColorImage(image: GrayscaleImage): ColorImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result: ColorImage = [];

  for (let y = 0; y < height; y++) {
    const row: PixelColor[] = [];
    for (let x = 0; x < width; x++) {
      const gray = clamp(image[y][x], 0, 1);
      row.push({ r: gray, g: gray, b: gray, gray });
    }
    result.push(row);
  }

  return result;
}

export function grayscaleToTeachingColorImage(image: GrayscaleImage): ColorImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result: ColorImage = [];

  for (let y = 0; y < height; y++) {
    const row: PixelColor[] = [];
    for (let x = 0; x < width; x++) {
      const gray = clamp(image[y][x], 0, 1);
      const nx = width > 1 ? x / (width - 1) : 0;
      const ny = height > 1 ? y / (height - 1) : 0;
      const r = clamp(gray * 0.58 + nx * 0.35 + 0.10 * Math.sin(y * 0.25), 0, 1);
      const g = clamp(gray * 0.52 + (1 - ny) * 0.38 + 0.08 * Math.cos(x * 0.2), 0, 1);
      const b = clamp(gray * 0.46 + (1 - nx) * 0.24 + ny * 0.32, 0, 1);
      row.push({ r, g, b, gray: clamp(0.299 * r + 0.587 * g + 0.114 * b, 0, 1) });
    }
    result.push(row);
  }

  return result;
}

/**
 * 创建棋盘格彩色图像（用于展示彩色三通道）
 */
export function createColorCheckerboard(): ColorImage {
  const size = 8; // 8x8 棋盘
  const cellSize = 8;
  const height = size * cellSize;
  const width = size * cellSize;
  const image: ColorImage = [];

  for (let y = 0; y < height; y++) {
    const row: PixelColor[] = [];
    for (let x = 0; x < width; x++) {
      const patternX = Math.floor(x / cellSize) % 2;
      const patternY = Math.floor(y / cellSize) % 2;
      const isWhite = (patternX + patternY) % 2 === 0;

      if (isWhite) {
        // 红色通道的高亮格子
        row.push({ r: 1.0, g: 0.2, b: 0.2, gray: 0.53 });
      } else {
        // 暗色格子
        row.push({ r: 0.1, g: 0.1, b: 0.1, gray: 0.1 });
      }
    }
    image.push(row);
  }

  return image;
}

/**
 * 创建简单彩色渐变图像（展示 RGB 三通道）
 */
export function createColorGradient(): ColorImage {
  const height = 48;
  const width = 64;
  const image: ColorImage = [];

  for (let y = 0; y < height; y++) {
    const row: PixelColor[] = [];
    for (let x = 0; x < width; x++) {
      const r = x / width;
      const g = y / height;
      const b = 0.5 + 0.5 * Math.sin((x + y) * 0.1);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      row.push({ r: clamp(r, 0, 1), g: clamp(g, 0, 1), b: clamp(b, 0, 1), gray: clamp(gray, 0, 1) });
    }
    image.push(row);
  }

  return image;
}

/**
 * 为彩色棋盘格创建对应的灰度版本（用于原图显示）
 */
export function colorToGrayscaleImage(image: ColorImage): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 获取像素的灰度版本用于渲染（以 red 通道为主以突出彩色格子）
      result[y][x] = image[y][x].gray ?? (0.299 * image[y][x].r + 0.587 * image[y][x].g + 0.114 * image[y][x].b);
    }
  }

  return result;
}

/**
 * 获取像素邻域（获取以 (x,y) 为中心的 size×size 邻域）
 * @param image 彩色图像
 * @param x 数学坐标系 x（列）
 * @param y 数学坐标系 y（行）
 * @param size 邻域尺寸
 * @returns 邻域像素颜色矩阵
 */
export function getPixelNeighborhood(
  image: ColorImage | GrayscaleImage,
  x: number,
  y: number,
  size: number
): PixelColor[][] {
  const isGrayscale = Array.isArray(image[0]) && typeof image[0][0] === 'number';

  if (isGrayscale) {
    const grayImg = image as GrayscaleImage;
    return convertGrayscaleNeighborhood(grayImg, x, y, size);
  }

  const colorImg = image as ColorImage;
  return convertColorNeighborhood(colorImg, x, y, size);
}

function convertColorNeighborhood(
  image: ColorImage,
  x: number,
  y: number,
  size: number
): PixelColor[][] {
  const height = image.length;
  const width = image[0]?.length || 0;
  const half = Math.floor(size / 2);
  const neighborhood: PixelColor[][] = [];

  for (let dy = -half; dy <= half; dy++) {
    const row: PixelColor[] = [];
    for (let dx = -half; dx <= half; dx++) {
      const py = clamp(y + dy, 0, height - 1);
      const px = clamp(x + dx, 0, width - 1);
      row.push({ ...image[py][px] });
    }
    neighborhood.push(row);
  }

  return neighborhood;
}

function convertGrayscaleNeighborhood(
  image: GrayscaleImage,
  x: number,
  y: number,
  size: number
): PixelColor[][] {
  const height = image.length;
  const width = image[0]?.length || 0;
  const half = Math.floor(size / 2);
  const neighborhood: PixelColor[][] = [];

  for (let dy = -half; dy <= half; dy++) {
    const row: PixelColor[] = [];
    for (let dx = -half; dx <= half; dx++) {
      const py = clamp(y + dy, 0, height - 1);
      const px = clamp(x + dx, 0, width - 1);
      const gray = clamp(image[py][px], 0, 1);
      row.push({ r: gray, g: gray, b: gray, gray });
    }
    neighborhood.push(row);
  }

  return neighborhood;
}

/**
 * 像素矩阵遍历步进 - 逐像素遍历图像并生成步骤
 * @param image 灰度图像或彩色图像
 * @param useColor 是否使用彩色模式
 * @returns 步进生成器
 */
export function* pixelMatrixSteps(
  image: GrayscaleImage | ColorImage
): Generator<PixelMatrixStep> {
  const isGrayscale = Array.isArray(image[0]) && typeof image[0][0] === 'number';
  let colorImg: ColorImage;

  if (isGrayscale) {
    colorImg = grayscaleToColorImage(image as GrayscaleImage);
  } else {
    colorImg = image as ColorImage;
  }

  if (!colorImg || colorImg.length === 0 || !colorImg[0]) return;

  const height = colorImg.length;
  const width = colorImg[0].length;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const pixel = colorImg[row][col];
      const neighborSize = 3;

      yield {
        x: col,             // 数学坐标系 x = 列索引
        y: row,             // 数学坐标系 y = 行索引（注意：图像的行在数学中通常向下递增）
        row,                // 数组访问行索引
        col,                // 数组访问列索引
        color: { ...pixel },
        neighborhood: getPixelNeighborhood(colorImg, col, row, neighborSize),
        description: `image[${row}][${col}] = ${isGrayscale
            ? (pixel.gray ?? 0).toFixed(3)
            : `(R:${(pixel.r * 255).toFixed(0)}, G:${(pixel.g * 255).toFixed(0)}, B:${(pixel.b * 255).toFixed(0)})`
          }`,
      };
    }
  }
}
