import { GrayscaleImage } from '../algorithms/types';
import { create2DArray } from './imageProcessing';

/** 基于位置的确定性伪随机值 [0, 1) */
function posNoise(x: number, y: number, seed: number = 0): number {
  let h = (seed * 31 + x * 17 + y * 53) % 2147483647;
  h = (h * 16807) % 2147483647;
  h = (h * 16807) % 2147483647;
  return (h >>> 0) / 4294967296;
}

export function createLenaImage(): GrayscaleImage {
  const size = 64;
  const image = create2DArray(size, size, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      const centerX = 0.5;
      const centerY = 0.5;
      const dist = Math.sqrt((nx - centerX) ** 2 + (ny - centerY) ** 2);

      let value = 0.5 + 0.3 * Math.sin(nx * Math.PI * 4) * Math.cos(ny * Math.PI * 4);

      if (dist < 0.15) {
        value = 0.2 + 0.1 * posNoise(x, y, 1);
      } else if (dist < 0.25) {
        value = 0.8;
      } else if (dist < 0.35) {
        const angle = Math.atan2(ny - centerY, nx - centerX);
        value = 0.3 + 0.4 * (Math.sin(angle * 3) * 0.5 + 0.5);
      }

      image[y][x] = Math.max(0, Math.min(1, value + (posNoise(x, y, 2) - 0.5) * 0.1));
    }
  }

  return image;
}

export function createGradientImage(): GrayscaleImage {
  const height = 64;
  const width = 64;
  const image = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      image[y][x] = (x + y) / (width + height);
    }
  }

  return image;
}

export function createCheckerboardImage(size: number = 8, cellSize: number = 8): GrayscaleImage {
  const height = size * cellSize;
  const width = size * cellSize;
  const image = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const patternX = Math.floor(x / cellSize) % 2;
      const patternY = Math.floor(y / cellSize) % 2;
      image[y][x] = (patternX + patternY) % 2 === 0 ? 0.2 : 0.8;
    }
  }

  return image;
}

export function createCircleImage(
  radius: number = 25,
  centerX: number = 32,
  centerY: number = 32
): GrayscaleImage {
  const size = 64;
  const image = create2DArray(size, size, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (dist < radius) {
        image[y][x] = 0.9;
      } else if (dist < radius + 3) {
        image[y][x] = 0.3;
      } else {
        image[y][x] = 0.1;
      }
    }
  }

  return image;
}

export function createRectangleImage(
  x1: number = 15,
  y1: number = 15,
  x2: number = 45,
  y2: number = 45
): GrayscaleImage {
  const size = 64;
  const image = create2DArray(size, size, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
        if (x < x1 + 3 || x > x2 - 3 || y < y1 + 3 || y > y2 - 3) {
          image[y][x] = 0.3;
        } else {
          image[y][x] = 0.85;
        }
      } else {
        image[y][x] = 0.15;
      }
    }
  }

  return image;
}

export function createBinaryImage(): GrayscaleImage {
  const size = 64;
  const image = create2DArray(size, size, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      image[y][x] = 0;

      const dist = Math.sqrt((x - 20) ** 2 + (y - 20) ** 2);
      if (dist < 10) {
        image[y][x] = 1;
      }

      const dist2 = Math.sqrt((x - 45) ** 2 + (y - 45) ** 2);
      if (dist2 < 8) {
        image[y][x] = 1;
      }

      if (x > 30 && x < 50 && y > 10 && y < 25) {
        image[y][x] = 1;
      }

      // 确定性噪声（基于位置的伪随机）
      if (posNoise(x, y, 3) < 0.02) {
        image[y][x] = posNoise(x, y, 4) > 0.5 ? 1 : 0;
      }
    }
  }

  return image;
}

export type SampleImageType =
  | 'lena'
  | 'gradient'
  | 'checkerboard'
  | 'circle'
  | 'rectangle'
  | 'binary';

export const sampleImages: Record<SampleImageType, { name: string; image: GrayscaleImage }> = {
  lena: { name: 'Lena', image: createLenaImage() },
  gradient: { name: '渐变', image: createGradientImage() },
  checkerboard: { name: '棋盘', image: createCheckerboardImage() },
  circle: { name: '圆形', image: createCircleImage() },
  rectangle: { name: '矩形', image: createRectangleImage() },
  binary: { name: '二值图', image: createBinaryImage() },
};
