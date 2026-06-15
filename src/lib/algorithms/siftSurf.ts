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

/** 单个邻居点的比较结果：relation 描述当前像素与该邻居的 DoG 值关系 */
export interface NeighborComparison {
  dx: number;
  dy: number;
  value: number;
  relation: 'greater' | 'less' | 'equal';
}

/** 26 邻域跨尺度比较明细 */
export interface NeighborComparisonsData {
  prevDogPatch: number[][];       // 上层 DoG 3×3 patch
  currentDogPatch: number[][];    // 当前层 DoG 3×3 patch
  nextDogPatch: number[][];       // 下层 DoG 3×3 patch
  currentValue: number;
  prevComparisons: NeighborComparison[];   // 上层 9 个邻居
  sameComparisons: NeighborComparison[];   // 同层 8 个邻居
  nextComparisons: NeighborComparison[];   // 下层 9 个邻居
  isExtremum: boolean;
  extremumType: 'max' | 'min' | 'none';
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
  /** 选中关键点的 26 邻域跨尺度比较明细，用于教学可视化 */
  neighborComparisons: NeighborComparisonsData | null;
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

/**
 * 真正的 26 邻域跨尺度极值检测
 *
 * 对 currDog 中的每个像素，与以下邻居比较：
 *   - 同层 8 邻域（3×3 去中心）
 *   - 上层 prevDog 的 9 邻域
 *   - 下层 nextDog 的 9 邻域
 * 总共 26 个比较。只有当前值严格大于（或严格小于）全部 26 个邻居时，
 * 才被判定为候选关键点。
 *
 * @param prevDog 上层（更模糊）DoG 图像
 * @param currDog 当前层 DoG 图像
 * @param nextDog 下层（更清晰）DoG 图像
 * @param octave  所在八度（多八度场景用，当前教学固定为 0）
 * @param scaleIndex DoG 尺度序号（用于记录关键点来源）
 * @returns 检测到的关键点列表 + 每个关键点的比较明细 Map
 */
function detectExtremaCrossScale(
  prevDog: GrayscaleImage,
  currDog: GrayscaleImage,
  nextDog: GrayscaleImage,
  octave: number,
  scaleIndex: number
): { keypoints: SiftKeypoint[]; comparisons: Map<number, NeighborComparisonsData> } {
  const h = currDog.length;
  const w = currDog[0]?.length ?? 0;
  const keypoints: SiftKeypoint[] = [];
  const comparisons = new Map<number, NeighborComparisonsData>();

  // 最小 DoG 绝对值阈值：过滤纯噪声区域
  const DOG_THRESHOLD = 0.005;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const currentValue = currDog[y][x];

      // Task 3: 绝对值过小的点视为噪声，跳过
      if (Math.abs(currentValue) < DOG_THRESHOLD) continue;

      const sameComparisons: NeighborComparison[] = [];
      const prevComparisons: NeighborComparison[] = [];
      const nextComparisons: NeighborComparison[] = [];

      let allGreater = true;  // 当前值 > 全部 26 个邻居 → 极大值
      let allLess = true;     // 当前值 < 全部 26 个邻居 → 极小值

      // ---- 同层 8 邻域比较 ----
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nv = currDog[y + dy][x + dx];
          let relation: 'greater' | 'less' | 'equal';
          if (currentValue > nv) { relation = 'greater'; }
          else if (currentValue < nv) { relation = 'less'; allGreater = false; }
          else { relation = 'equal'; allGreater = false; allLess = false; }
          // 仅当 nv >= currentValue 时才非极大值
          if (nv >= currentValue) allGreater = false;
          // 仅当 nv <= currentValue 时才非极小值
          if (nv <= currentValue) allLess = false;
          sameComparisons.push({ dx, dy, value: nv, relation });
        }
      }

      // 同层已无法判定极值 → 跳过
      if (!allGreater && !allLess) continue;

      // ---- 上层 9 邻域比较 ----
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nv = prevDog[y + dy][x + dx];
          let relation: 'greater' | 'less' | 'equal';
          if (currentValue > nv) { relation = 'greater'; }
          else if (currentValue < nv) { relation = 'less'; allGreater = false; }
          else { relation = 'equal'; allGreater = false; allLess = false; }
          if (nv >= currentValue) allGreater = false;
          if (nv <= currentValue) allLess = false;
          prevComparisons.push({ dx, dy, value: nv, relation });
        }
      }

      if (!allGreater && !allLess) continue;

      // ---- 下层 9 邻域比较 ----
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nv = nextDog[y + dy][x + dx];
          let relation: 'greater' | 'less' | 'equal';
          if (currentValue > nv) { relation = 'greater'; }
          else if (currentValue < nv) { relation = 'less'; allGreater = false; }
          else { relation = 'equal'; allGreater = false; allLess = false; }
          if (nv >= currentValue) allGreater = false;
          if (nv <= currentValue) allLess = false;
          nextComparisons.push({ dx, dy, value: nv, relation });
        }
      }

      if (!allGreater && !allLess) continue;

      // ---- 通过全部 26 邻域比较，确定为极值点 ----
      const extremumType: 'max' | 'min' | 'none' = allGreater ? 'max' : 'min';

      // 提取三层 DoG 的 3×3 patch
      const extract3x3 = (img: GrayscaleImage, cx: number, cy: number): number[][] => {
        const patch: number[][] = [];
        for (let dy = -1; dy <= 1; dy++) {
          const row: number[] = [];
          for (let dx = -1; dx <= 1; dx++) {
            row.push(img[cy + dy][cx + dx]);
          }
          patch.push(row);
        }
        return patch;
      };

      const comparisonsData: NeighborComparisonsData = {
        prevDogPatch: extract3x3(prevDog, x, y),
        currentDogPatch: extract3x3(currDog, x, y),
        nextDogPatch: extract3x3(nextDog, x, y),
        currentValue,
        prevComparisons,
        sameComparisons,
        nextComparisons,
        isExtremum: true,
        extremumType,
      };

      // 用 y * w + x 作为局部 key
      const localKey = y * w + x;
      comparisons.set(localKey, comparisonsData);

      keypoints.push({
        x, y, octave, scale: scaleIndex,
        orientation: 0, magnitude: Math.abs(currentValue),
        siftDescriptor: [], surfDescriptor: [],
      });
    }
  }

  return { keypoints, comparisons };
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
          const rawBin = Math.floor((orient - orientation + Math.PI) / (Math.PI / 4));
          const bin = ((rawBin % 8) + 8) % 8;  // JS % 是余数，负数需修正
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
  // 最终 L2 归一化：标准 SIFT 对 128 维向量整体归一化
  const norm = Math.sqrt(descriptor.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < descriptor.length; i++) descriptor[i] /= norm;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) grid[r][c] /= norm;
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

  // ---- 使用 detectExtremaCrossScale 进行 26 邻域跨尺度极值检测 ----
  const allComparisons = new Map<number, NeighborComparisonsData>();
  const allKeypoints: SiftKeypoint[] = [];
  const dogH = dogScales[0]?.length ?? image.length;
  const dogW = dogScales[0]?.[0]?.length ?? image[0]?.length ?? 64;
  for (let s = 1; s < dogScales.length - 1; s++) {
    const result = detectExtremaCrossScale(
      dogScales[s - 1], dogScales[s], dogScales[s + 1], 0, s
    );
    // 将关键点 scale 从索引修正为实际高斯 σ 值
    const actualSigma = sigma * (kFactor ** s);
    for (const kp of result.keypoints) {
      kp.scale = actualSigma;
    }
    // 使用复合 key：scale * h * w + y * w + x，支持跨尺度查找
    const scaleOffset = s * dogH * dogW;
    for (const [localKey, data] of result.comparisons) {
      allComparisons.set(scaleOffset + localKey, data);
    }
    allKeypoints.push(...result.keypoints);
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
    neighborComparisons: null,
  };

  if (topKeypoints.length > 0) {
    const idx = Math.min(selectedKp, topKeypoints.length - 1);
    const kp = topKeypoints[idx];
    const radius = 8;
    const { magnitudes, orientations } = computeGradients(image, kp.x, kp.y, radius);
    const hist = computeOrientationHistogram(magnitudes, orientations, radius);
    const { grid: siftGrid } = computeSiftDescriptor(magnitudes, orientations, kp.x, kp.y, kp.orientation);
    const { grid: surfGrid } = computeSurfDescriptor(image, kp.x, kp.y, Math.max(kp.scale, 1));
    // 跨图匹配由 computeSiftSurfMatching 负责，基础函数不生成自匹配结果
    const matches: Array<{ queryIdx: number; trainIdx: number; distance: number }> = [];

    // 查找选中关键点的 26 邻域比较明细
    // kp.scale 已存为实际 σ 值，需反推尺度索引来查表
    const kpScaleIndex = Math.round(Math.log(kp.scale / sigma) / Math.log(kFactor));
    const cmpKey = kpScaleIndex * dogH * dogW + kp.y * dogW + kp.x;
    const neighborComparisons = allComparisons.get(cmpKey) ?? null;

    stepData = {
      gaussianValues: gaussianScales[0], dogValues: dogScales[0],
      currentKeypoint: kp, gradientMagnitudes: magnitudes, gradientOrientations: orientations,
      orientationHistogram: hist, siftDescriptorGrid: siftGrid, surfDescriptorGrid: surfGrid, matches,
      neighborComparisons,
    };
  }

  return {
    keypoints: topKeypoints, gaussianScales, dogScales, stepData,
    allSiftDescriptors: topKeypoints.map(k => k.siftDescriptor),
    allSurfDescriptors: topKeypoints.map(k => k.surfDescriptor),
  };
}

// ==================== 跨图像匹配 ====================

/** 跨图像匹配的完整结果，SiftSurfResult 的超集 */
export interface SiftSurfMatchingResult extends SiftSurfResult {
  referenceKeypoints: SiftKeypoint[];
  referenceDescriptors: number[][];
}

/**
 * 对 queryImage 和 referenceImage 分别执行 SIFT 检测，然后进行跨图像描述子匹配。
 *
 * @param queryImage      待匹配图像
 * @param referenceImage  参考图像
 * @param sigma           初始尺度
 * @param numScales       每组层数
 * @param selectedKp      查询图中选中的关键点序号
 * @returns               包含双方关键点、描述子和匹配结果的 SiftSurfMatchingResult
 */
export function computeSiftSurfMatching(
  queryImage: GrayscaleImage,
  referenceImage: GrayscaleImage,
  sigma: number,
  numScales: number,
  selectedKp: number
): SiftSurfMatchingResult {
  const queryResult = computeSiftSurf(queryImage, sigma, numScales, selectedKp);
  const refResult = computeSiftSurf(referenceImage, sigma, numScales, 0);

  // 跨图像匹配：查询图描述子 vs 参考图描述子
  const matches = findMatches(
    queryResult.allSiftDescriptors,
    refResult.allSiftDescriptors,
    0.8
  );

  // 覆盖 stepData 中的 matches（原为自匹配结果）
  const stepData: SiftStepData = {
    ...queryResult.stepData,
    matches,
  };

  return {
    ...queryResult,
    stepData,
    referenceKeypoints: refResult.keypoints,
    referenceDescriptors: refResult.allSiftDescriptors,
  };
}
