import { GrayscaleImage } from './types';
import { clamp } from '../utils/imageProcessing';
/**
 * 生成示例小图 (12x12)
 * type: 'dark' | 'bright' | 'lowContrast' | 'bimodal' | 'standard'
 */
export function generateExampleImage(type: 'dark' | 'bright' | 'lowContrast' | 'bimodal' | 'standard'): GrayscaleImage {
  const size = 12;
  const image: GrayscaleImage = [];

  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      let value: number;
      switch (type) {
        case 'dark':
          // 所有像素值 < 64
          value = Math.floor(Math.random() * 64);
          break;
        case 'bright':
          // 所有像素值 > 192
          value = 192 + Math.floor(Math.random() * 64);
          break;
        case 'lowContrast':
          // 80-120 窄范围
          value = 80 + Math.floor(Math.random() * 40);
          break;
        case 'bimodal':
          // 一半暗 (<64) + 一半亮 (>192)
          value = (y < size / 2)
            ? Math.floor(Math.random() * 64)
            : 192 + Math.floor(Math.random() * 64);
          break;
        case 'standard':
        default:
          // 均匀分布 0-255
          value = Math.floor(Math.random() * 256);
          break;
      }
      // 存储为归一化值 [0,1]
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
