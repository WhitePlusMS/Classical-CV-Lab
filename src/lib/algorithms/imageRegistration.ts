import { GrayscaleImage } from './types';
import { clamp, create2DArray } from '../utils/imageProcessing';

export type RegistrationModel = 'affine' | 'perspective';
export type RegistrationEstimationMode = 'all-matches' | 'robust';

export interface RegistrationPoint {
  x: number;
  y: number;
}

export interface RegistrationFeature {
  id: string;
  label: string;
  point: RegistrationPoint;
}

export interface RegistrationMatchBase {
  id: string;
  label: string;
  source: RegistrationPoint;
  expectedTarget: RegistrationPoint;
  observedTarget: RegistrationPoint;
  descriptorDistance: number;
  isOutlier: boolean;
}

export interface RegistrationMatchEvaluation extends RegistrationMatchBase {
  predictedTarget: RegistrationPoint;
  residual: number;
  inlier: boolean;
}

export interface RegistrationEstimateSummary {
  mode: RegistrationEstimationMode;
  label: string;
  matrix: number[][];
  matches: RegistrationMatchEvaluation[];
  inlierCount: number;
  meanResidual: number;
  maxResidual: number;
  meanIntensityError: number;
  alignedImage: GrayscaleImage;
  overlayImage: GrayscaleImage;
}

export interface RegistrationModelInfo {
  key: RegistrationModel;
  label: string;
  minimumPairs: number;
  degreesOfFreedom: number;
  matrixNote: string;
  propertyNote: string;
}

export interface RegistrationScenario {
  width: number;
  height: number;
  model: RegistrationModel;
  modelInfo: RegistrationModelInfo;
  referenceImage: GrayscaleImage;
  targetImage: GrayscaleImage;
  trueMatrix: number[][];
  referenceFeatures: RegistrationFeature[];
  matches: RegistrationMatchBase[];
  directEstimate: RegistrationEstimateSummary;
  robustEstimate: RegistrationEstimateSummary;
  activeEstimate: RegistrationEstimateSummary;
}

const IMAGE_SIZE = 88;
const INLIER_THRESHOLD = {
  affine: 2.6,
  perspective: 3.2,
} as const;

const MODEL_INFO: Record<RegistrationModel, RegistrationModelInfo> = {
  affine: {
    key: 'affine',
    label: '仿射模型',
    minimumPairs: 3,
    degreesOfFreedom: 6,
    matrixNote: '2×3 仿射矩阵可描述旋转、缩放、平移与剪切。',
    propertyNote: '仿射变换保持直线性与平行性，适合视角变化较小的配准任务。',
  },
  perspective: {
    key: 'perspective',
    label: '透视模型',
    minimumPairs: 4,
    degreesOfFreedom: 8,
    matrixNote: '3×3 单应矩阵可额外描述透视失真。',
    propertyNote: '透视变换仍保持直线性，但平行线在变换后不必继续平行。',
  },
};

const TRUE_TRANSFORMS: Record<RegistrationModel, number[][]> = {
  affine: [
    [0.952, -0.168, 9.2],
    [0.132, 1.038, -5.8],
    [0, 0, 1],
  ],
  perspective: [
    [0.905, -0.118, 8.4],
    [0.092, 0.986, -4.6],
    [0.00115, -0.00092, 1],
  ],
};

const FEATURE_POINTS: RegistrationFeature[] = [
  { id: 'f1', label: '左上外角', point: { x: 19, y: 19 } },
  { id: 'f2', label: '右上外角', point: { x: 69, y: 19 } },
  { id: 'f3', label: '左孔中心', point: { x: 29, y: 42 } },
  { id: 'f4', label: '右孔中心', point: { x: 59, y: 42 } },
  { id: 'f5', label: '左下外角', point: { x: 23, y: 63 } },
  { id: 'f6', label: '右下外角', point: { x: 64, y: 63 } },
  { id: 'f7', label: '槽上端点', point: { x: 44, y: 28 } },
  { id: 'f8', label: '槽下端点', point: { x: 44, y: 56 } },
];

const OUTLIER_REMAPS = [
  { sourceIndex: 1, targetIndex: 5, offset: { x: 2.4, y: 1.4 } },
  { sourceIndex: 6, targetIndex: 2, offset: { x: -2.1, y: 2.9 } },
  { sourceIndex: 4, targetIndex: 0, offset: { x: 1.8, y: -2.6 } },
] as const;

function createIdentityMatrix(): number[][] {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function cloneMatrix(matrix: number[][]): number[][] {
  return matrix.map(row => [...row]);
}

function applyTransform(matrix: number[][], point: RegistrationPoint): RegistrationPoint {
  const denominator = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
  const safeDenominator = Math.abs(denominator) < 1e-9 ? 1e-9 : denominator;

  return {
    x: (matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2]) / safeDenominator,
    y: (matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2]) / safeDenominator,
  };
}

function invertMatrix3(matrix: number[][]): number[][] | null {
  const [
    [a, b, c],
    [d, e, f],
    [g, h, i],
  ] = matrix;

  const cofactor00 = e * i - f * h;
  const cofactor01 = -(d * i - f * g);
  const cofactor02 = d * h - e * g;
  const cofactor10 = -(b * i - c * h);
  const cofactor11 = a * i - c * g;
  const cofactor12 = -(a * h - b * g);
  const cofactor20 = b * f - c * e;
  const cofactor21 = -(a * f - c * d);
  const cofactor22 = a * e - b * d;

  const determinant = a * cofactor00 + b * cofactor01 + c * cofactor02;
  if (Math.abs(determinant) < 1e-9) {
    return null;
  }

  const scale = 1 / determinant;
  return [
    [cofactor00 * scale, cofactor10 * scale, cofactor20 * scale],
    [cofactor01 * scale, cofactor11 * scale, cofactor21 * scale],
    [cofactor02 * scale, cofactor12 * scale, cofactor22 * scale],
  ];
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex++) {
    let bestRow = pivotIndex;
    let bestValue = Math.abs(augmented[pivotIndex][pivotIndex]);

    for (let row = pivotIndex + 1; row < size; row++) {
      const value = Math.abs(augmented[row][pivotIndex]);
      if (value > bestValue) {
        bestValue = value;
        bestRow = row;
      }
    }

    if (bestValue < 1e-9) {
      return null;
    }

    if (bestRow !== pivotIndex) {
      [augmented[pivotIndex], augmented[bestRow]] = [augmented[bestRow], augmented[pivotIndex]];
    }

    const pivot = augmented[pivotIndex][pivotIndex];
    for (let column = pivotIndex; column <= size; column++) {
      augmented[pivotIndex][column] /= pivot;
    }

    for (let row = 0; row < size; row++) {
      if (row === pivotIndex) continue;
      const factor = augmented[row][pivotIndex];
      if (Math.abs(factor) < 1e-12) continue;

      for (let column = pivotIndex; column <= size; column++) {
        augmented[row][column] -= factor * augmented[pivotIndex][column];
      }
    }
  }

  return augmented.map(row => row[size]);
}

function accumulateNormalEquation(normalMatrix: number[][], normalVector: number[], row: number[], value: number): void {
  for (let y = 0; y < row.length; y++) {
    normalVector[y] += row[y] * value;
    for (let x = 0; x < row.length; x++) {
      normalMatrix[y][x] += row[y] * row[x];
    }
  }
}

function estimateAffineMatrix(matches: RegistrationMatchBase[]): number[][] | null {
  if (matches.length < MODEL_INFO.affine.minimumPairs) {
    return null;
  }

  const normalMatrix = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0));
  const normalVector = Array.from({ length: 6 }, () => 0);

  matches.forEach(match => {
    const { x, y } = match.source;
    const u = match.observedTarget.x;
    const v = match.observedTarget.y;

    accumulateNormalEquation(normalMatrix, normalVector, [x, y, 1, 0, 0, 0], u);
    accumulateNormalEquation(normalMatrix, normalVector, [0, 0, 0, x, y, 1], v);
  });

  const solution = solveLinearSystem(normalMatrix, normalVector);
  if (!solution) {
    return null;
  }

  return [
    [solution[0], solution[1], solution[2]],
    [solution[3], solution[4], solution[5]],
    [0, 0, 1],
  ];
}

function estimatePerspectiveMatrix(matches: RegistrationMatchBase[]): number[][] | null {
  if (matches.length < MODEL_INFO.perspective.minimumPairs) {
    return null;
  }

  const normalMatrix = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 0));
  const normalVector = Array.from({ length: 8 }, () => 0);

  matches.forEach(match => {
    const { x, y } = match.source;
    const u = match.observedTarget.x;
    const v = match.observedTarget.y;

    accumulateNormalEquation(normalMatrix, normalVector, [x, y, 1, 0, 0, 0, -u * x, -u * y], u);
    accumulateNormalEquation(normalMatrix, normalVector, [0, 0, 0, x, y, 1, -v * x, -v * y], v);
  });

  const solution = solveLinearSystem(normalMatrix, normalVector);
  if (!solution) {
    return null;
  }

  return [
    [solution[0], solution[1], solution[2]],
    [solution[3], solution[4], solution[5]],
    [solution[6], solution[7], 1],
  ];
}

function estimateMatrix(model: RegistrationModel, matches: RegistrationMatchBase[]): number[][] | null {
  return model === 'affine' ? estimateAffineMatrix(matches) : estimatePerspectiveMatrix(matches);
}

function computeResidual(matrix: number[][], match: RegistrationMatchBase): number {
  const predicted = applyTransform(matrix, match.source);
  return Math.hypot(predicted.x - match.observedTarget.x, predicted.y - match.observedTarget.y);
}

function evaluateMatches(
  model: RegistrationModel,
  matrix: number[][],
  matches: RegistrationMatchBase[]
): RegistrationMatchEvaluation[] {
  const threshold = INLIER_THRESHOLD[model];

  return matches.map(match => {
    const predictedTarget = applyTransform(matrix, match.source);
    const residual = Math.hypot(predictedTarget.x - match.observedTarget.x, predictedTarget.y - match.observedTarget.y);

    return {
      ...match,
      predictedTarget,
      residual,
      inlier: residual <= threshold,
    };
  });
}

function createCombinations<T>(items: T[], choose: number): T[][] {
  if (choose <= 0) return [[]];
  if (items.length < choose) return [];

  const result: T[][] = [];

  function visit(start: number, bucket: T[]): void {
    if (bucket.length === choose) {
      result.push([...bucket]);
      return;
    }

    for (let index = start; index <= items.length - (choose - bucket.length); index++) {
      bucket.push(items[index]);
      visit(index + 1, bucket);
      bucket.pop();
    }
  }

  visit(0, []);
  return result;
}

function estimateRobustMatrix(model: RegistrationModel, matches: RegistrationMatchBase[]): number[][] | null {
  const minimumPairs = MODEL_INFO[model].minimumPairs;
  if (matches.length < minimumPairs) {
    return null;
  }

  const threshold = INLIER_THRESHOLD[model];
  const subsets = createCombinations(matches, minimumPairs);

  let bestMatrix: number[][] | null = null;
  let bestInliers: RegistrationMatchBase[] = [];
  let bestMeanResidual = Number.POSITIVE_INFINITY;

  subsets.forEach(subset => {
    const candidate = estimateMatrix(model, subset);
    if (!candidate) return;

    const inliers = matches.filter(match => computeResidual(candidate, match) <= threshold);
    if (inliers.length < minimumPairs) return;

    const refined = estimateMatrix(model, inliers) ?? candidate;
    const meanResidual =
      inliers.reduce((sum, match) => sum + computeResidual(refined, match), 0) / inliers.length;

    const isBetter =
      inliers.length > bestInliers.length ||
      (inliers.length === bestInliers.length && meanResidual < bestMeanResidual);

    if (isBetter) {
      bestMatrix = refined;
      bestInliers = inliers;
      bestMeanResidual = meanResidual;
    }
  });

  return bestMatrix ?? estimateMatrix(model, matches);
}

function bilinearSample(image: GrayscaleImage, x: number, y: number): number {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  if (!height || !width) return 1;

  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) {
    return 1;
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);

  const dx = x - x0;
  const dy = y - y0;

  const top = image[y0][x0] * (1 - dx) + image[y0][x1] * dx;
  const bottom = image[y1][x0] * (1 - dx) + image[y1][x1] * dx;

  return top * (1 - dy) + bottom * dy;
}

function warpReferenceToTarget(referenceImage: GrayscaleImage, matrix: number[][]): GrayscaleImage {
  const inverse = invertMatrix3(matrix);
  if (!inverse) {
    return referenceImage.map(row => [...row]);
  }

  const height = referenceImage.length;
  const width = referenceImage[0]?.length ?? 0;
  const warped = create2DArray(height, width, 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourcePoint = applyTransform(inverse, { x, y });
      warped[y][x] = bilinearSample(referenceImage, sourcePoint.x, sourcePoint.y);
    }
  }

  return warped;
}

function alignTargetToReference(targetImage: GrayscaleImage, matrix: number[][]): GrayscaleImage {
  const height = targetImage.length;
  const width = targetImage[0]?.length ?? 0;
  const aligned = create2DArray(height, width, 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const targetPoint = applyTransform(matrix, { x, y });
      aligned[y][x] = bilinearSample(targetImage, targetPoint.x, targetPoint.y);
    }
  }

  return aligned;
}

function blendImages(referenceImage: GrayscaleImage, alignedImage: GrayscaleImage): GrayscaleImage {
  const height = referenceImage.length;
  const width = referenceImage[0]?.length ?? 0;
  const blended = create2DArray(height, width, 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      blended[y][x] = clamp(referenceImage[y][x] * 0.55 + alignedImage[y][x] * 0.45, 0, 1);
    }
  }

  return blended;
}

function computeMeanIntensityError(referenceImage: GrayscaleImage, alignedImage: GrayscaleImage): number {
  const height = referenceImage.length;
  const width = referenceImage[0]?.length ?? 0;
  let totalDifference = 0;
  let effectivePixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 只对零件区域周围的像素统计误差，避免大片背景掩盖错位。
      if (referenceImage[y][x] > 0.98 && alignedImage[y][x] > 0.98) continue;
      totalDifference += Math.abs(referenceImage[y][x] - alignedImage[y][x]);
      effectivePixels++;
    }
  }

  return effectivePixels > 0 ? totalDifference / effectivePixels : 0;
}

function fillRect(image: GrayscaleImage, x0: number, y0: number, width: number, height: number, value: number): void {
  const maxY = image.length;
  const maxX = image[0]?.length ?? 0;

  for (let y = Math.max(0, y0); y < Math.min(maxY, y0 + height); y++) {
    for (let x = Math.max(0, x0); x < Math.min(maxX, x0 + width); x++) {
      image[y][x] = value;
    }
  }
}

function fillCircle(image: GrayscaleImage, centerX: number, centerY: number, radius: number, value: number): void {
  const maxY = image.length;
  const maxX = image[0]?.length ?? 0;

  for (let y = Math.max(0, Math.floor(centerY - radius)); y <= Math.min(maxY - 1, Math.ceil(centerY + radius)); y++) {
    for (let x = Math.max(0, Math.floor(centerX - radius)); x <= Math.min(maxX - 1, Math.ceil(centerX + radius)); x++) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) {
        image[y][x] = value;
      }
    }
  }
}

function drawLine(image: GrayscaleImage, from: RegistrationPoint, to: RegistrationPoint, value: number, thickness: number): void {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    fillCircle(image, x, y, thickness, value);
  }
}

function createReferencePartImage(): GrayscaleImage {
  const image = create2DArray(IMAGE_SIZE, IMAGE_SIZE, 0.98);

  fillRect(image, 14, 16, 58, 52, 0.22);
  fillRect(image, 14, 16, 15, 13, 0.98);
  fillRect(image, 39, 24, 8, 34, 0.94);
  fillCircle(image, 29, 42, 7, 0.94);
  fillCircle(image, 59, 42, 7, 0.94);
  fillRect(image, 20, 58, 18, 7, 0.34);
  fillRect(image, 49, 20, 18, 6, 0.34);
  drawLine(image, { x: 24, y: 30 }, { x: 60, y: 55 }, 0.45, 1.6);
  drawLine(image, { x: 26, y: 54 }, { x: 36, y: 60 }, 0.52, 1.1);

  FEATURE_POINTS.forEach(feature => {
    fillCircle(image, feature.point.x, feature.point.y, 1.3, 0.08);
  });

  return image;
}

function createObservedMatches(model: RegistrationModel, mismatchCount: number): RegistrationMatchBase[] {
  const trueMatrix = TRUE_TRANSFORMS[model];
  const expectedTargets = FEATURE_POINTS.map(feature => applyTransform(trueMatrix, feature.point));
  const outlierMap = new Map<number, { targetIndex: number; offset: RegistrationPoint }>();

  OUTLIER_REMAPS.slice(0, clamp(mismatchCount, 0, OUTLIER_REMAPS.length)).forEach(item => {
    outlierMap.set(item.sourceIndex, { targetIndex: item.targetIndex, offset: item.offset });
  });

  return FEATURE_POINTS.map((feature, index) => {
    const outlier = outlierMap.get(index);
    const expectedTarget = expectedTargets[index];
    const observedTarget = outlier
      ? {
          x: expectedTargets[outlier.targetIndex].x + outlier.offset.x,
          y: expectedTargets[outlier.targetIndex].y + outlier.offset.y,
        }
      : expectedTarget;

    return {
      id: feature.id,
      label: feature.label,
      source: feature.point,
      expectedTarget,
      observedTarget,
      descriptorDistance: outlier ? 48 + index * 4 : 12 + index * 2.6,
      isOutlier: Boolean(outlier),
    };
  });
}

function buildEstimateSummary(
  model: RegistrationModel,
  mode: RegistrationEstimationMode,
  label: string,
  referenceImage: GrayscaleImage,
  targetImage: GrayscaleImage,
  matches: RegistrationMatchBase[],
  matrix: number[][]
): RegistrationEstimateSummary {
  const evaluatedMatches = evaluateMatches(model, matrix, matches);
  const alignedImage = alignTargetToReference(targetImage, matrix);
  const overlayImage = blendImages(referenceImage, alignedImage);
  const residualPool = evaluatedMatches.filter(match => match.inlier);
  const residualMatches = residualPool.length > 0 ? residualPool : evaluatedMatches;
  const meanResidual =
    residualMatches.reduce((sum, match) => sum + match.residual, 0) / residualMatches.length;
  const maxResidual = evaluatedMatches.reduce((max, match) => Math.max(max, match.residual), 0);

  return {
    mode,
    label,
    matrix,
    matches: evaluatedMatches,
    inlierCount: evaluatedMatches.filter(match => match.inlier).length,
    meanResidual,
    maxResidual,
    meanIntensityError: computeMeanIntensityError(referenceImage, alignedImage),
    alignedImage,
    overlayImage,
  };
}

export function createImageRegistrationScenario(
  model: RegistrationModel,
  mismatchCount: number,
  estimationMode: RegistrationEstimationMode
): RegistrationScenario {
  const referenceImage = createReferencePartImage();
  const targetImage = warpReferenceToTarget(referenceImage, TRUE_TRANSFORMS[model]);
  const matches = createObservedMatches(model, mismatchCount);

  const directMatrix = estimateMatrix(model, matches) ?? createIdentityMatrix();
  const robustMatrix = estimateRobustMatrix(model, matches) ?? directMatrix;

  const directEstimate = buildEstimateSummary(
    model,
    'all-matches',
    '直接用全部匹配估计',
    referenceImage,
    targetImage,
    matches,
    directMatrix
  );

  const robustEstimate = buildEstimateSummary(
    model,
    'robust',
    '先做几何一致性筛选',
    referenceImage,
    targetImage,
    matches,
    robustMatrix
  );

  return {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    model,
    modelInfo: MODEL_INFO[model],
    referenceImage,
    targetImage,
    trueMatrix: cloneMatrix(TRUE_TRANSFORMS[model]),
    referenceFeatures: FEATURE_POINTS,
    matches,
    directEstimate,
    robustEstimate,
    activeEstimate: estimationMode === 'robust' ? robustEstimate : directEstimate,
  };
}

export function formatRegistrationValue(value: number, digits: number = 3): string {
  if (!Number.isFinite(value)) return '0';
  const safeValue = Math.abs(value) < 1e-9 ? 0 : value;
  return safeValue.toFixed(digits);
}
