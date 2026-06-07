import { GrayscaleImage } from './types';
import { clamp } from '../utils/imageProcessing';

/** 基于位置的确定性伪随机值 [0, 1) */
function posNoise(x: number, y: number): number {
  let h = (x * 17 + y * 53 + 7) % 2147483647;
  h = (h * 16807) % 2147483647;
  h = (h * 16807) % 2147483647;
  return (h >>> 0) / 4294967296;
}

/**
 * 生成示例小图 (12x12)，所有值均为确定性生成，避免 SSR hydration 错误。
 * type: 'dark' | 'bright' | 'lowContrast' | 'bimodal' | 'standard'
 */
export function generateExampleImage(type: 'dark' | 'bright' | 'lowContrast' | 'bimodal' | 'standard'): GrayscaleImage {
  const size = 12;
  const image: GrayscaleImage = [];

  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const r = posNoise(x, y); // 确定性伪随机 [0, 1)
      let value: number;
      switch (type) {
        case 'dark':
          value = Math.floor(r * 64);
          break;
        case 'bright':
          value = 192 + Math.floor(r * 64);
          break;
        case 'lowContrast':
          value = 80 + Math.floor(r * 40);
          break;
        case 'bimodal':
          value = (y < size / 2)
            ? Math.floor(r * 64)
            : 192 + Math.floor(r * 64);
          break;
        case 'standard':
        default:
          value = Math.floor(r * 256);
          break;
      }
      row.push(clamp(value / 255, 0, 1));
    }
    image.push(row);
  }

  return image;
}

/**
 * 生成直方图计算的教学步骤
 * 遍历所有像素，累计直方图
 */
export function* histogramSteps(image: GrayscaleImage): Generator<HistogramStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;
  const bins = new Array(256).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gray = Math.round(clamp(image[y][x], 0, 1) * 255);
      bins[gray]++;

      yield {
        x,
        y,
        currentGray: gray,
        bins: [...bins],
        totalPixels: height * width,
      } as HistogramStep;
    }
  }
}

export interface HistogramStep {
  x: number;
  y: number;
  currentGray: number;
  bins: number[];
  totalPixels: number;
}
