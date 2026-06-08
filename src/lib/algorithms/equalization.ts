import { GrayscaleImage } from './types';
import { computeHistogram } from './threshold';
import { clamp } from '../utils/imageProcessing';

/** 直方图均衡化教学步骤 —— 按灰度级遍历 CDF 计算过程 */
export interface EqualizationStep {
  grayLevel: number;   // 当前灰度级 k
  count: number;       // n_k
  cdfValue: number;    // 累积值 sum_{i=0}^{k} n_i
  cdfNormalized: number;
  mappedValue: number; // S_k = floor(255 * cdf[k])
  totalPixels: number;
}

/** 生成课程示例 3×3 图像 */
export function generateCourseExample(): GrayscaleImage {
  // 课程中的 3×3 矩阵：值 50, 100, 200
  const raw = [
    [100, 200, 100],
    [200, 50, 100],
    [50, 100, 50],
  ];
  return raw.map(row => row.map(v => v / 255));
}

/** 计算 CDF 与映射表 */
export function computeCDF(
  bins: number[],
  totalPixels: number,
): { cdf: number[]; mapping: number[] } {
  const cdf: number[] = [];
  const mapping: number[] = [];
  let sum = 0;

  for (let k = 0; k < 256; k++) {
    sum += bins[k];
    const cdfVal = totalPixels > 0 ? sum / totalPixels : 0;
    cdf.push(cdfVal);
    mapping.push(Math.floor(255 * cdfVal));
  }

  return { cdf, mapping };
}

/** 直方图均衡化完整结果 */
export interface EqualizeResult {
  result: GrayscaleImage;
  mapping: number[];
  cdf: number[];
  equalizedBins: number[];
  equalizedTotal: number;
}

/**
 * 对图像执行直方图均衡化
 * 1. 计算原始直方图
 * 2. 计算 CDF 与映射表
 * 3. 逐像素映射得到均衡化图像
 */
export function equalizeHistogram(image: GrayscaleImage): EqualizeResult {
  const height = image.length;
  const width = image[0]?.length || 0;

  // 复用统一直方图统计，避免各页面/算法重复实现 bins 逻辑。
  const { bins, totalPixels } = computeHistogram(image);

  // CDF + 映射
  const { cdf, mapping } = computeCDF(bins, totalPixels);

  // 逐像素映射
  const result: GrayscaleImage = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(mapping[Math.round(clamp(image[y][x], 0, 1) * 255)] / 255);
    }
    result.push(row);
  }

  // 均衡后直方图
  const equalizedBins = new Array(256).fill(0);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      equalizedBins[Math.round(result[y][x] * 255)]++;
    }

  return { result, mapping, cdf, equalizedBins, equalizedTotal: totalPixels };
}

/**
 * 直方图均衡化教学步骤生成器
 * 按灰度级 k=0..255 逐一展示 CDF 累积过程
 */
export function* equalizationSteps(
  bins: number[],
  totalPixels: number,
): Generator<EqualizationStep> {
  let sum = 0;
  for (let k = 0; k < 256; k++) {
    sum += bins[k];
    const cdfVal = totalPixels > 0 ? sum / totalPixels : 0;
    yield {
      grayLevel: k,
      count: bins[k],
      cdfValue: sum,
      cdfNormalized: cdfVal,
      mappedValue: Math.floor(255 * cdfVal),
      totalPixels,
    };
  }
}
