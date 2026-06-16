import { GrayscaleImage } from './types';
import { computeHogGradients } from './hog';
import {
  type HaarFeatureStep,
  type HaarTemplateType,
  type LBPVectorStep,
  getHaarFeatureStep,
  getLBPVectorStep,
} from './haarLbpFeatureVector';
import { create2DArray } from '../utils/imageProcessing';

export type DetectionPipelineMode = 'hog-svm' | 'haar-cascade' | 'lbp-svm';

export interface TeachingSvmWeights {
  meanIntensity: number;
  contrast: number;
  gradientEnergy: number;
  verticalGradient: number;
  horizontalGradient: number;
  centerBrightness: number;
  textureDensity: number;
  bias: number;
}

export interface DetectionPipelineConfig {
  mode: DetectionPipelineMode;
  windowSize: number;
  haarTemplateType?: HaarTemplateType;
  lbpCellSize?: number;
  svmWeights?: TeachingSvmWeights;
  cascadeThresholds?: number[];
}

export interface DetectionFeatureSummary {
  meanIntensity: number;
  contrast: number;
  gradientEnergy: number;
  verticalGradient: number;
  horizontalGradient: number;
  centerBrightness: number;
  textureDensity: number;
  haarFeatureValue: number;
  haarAbsoluteValue: number;
  lbpTopBin: number;
  lbpNonZeroBins: number;
}

export interface SvmScoreTerm {
  key: keyof Omit<TeachingSvmWeights, 'bias'>;
  label: string;
  value: number;
  weight: number;
  product: number;
}

export interface SvmScoreBreakdown {
  terms: SvmScoreTerm[];
  bias: number;
  score: number;
  passed: boolean;
  decisionLabel: string;
}

export interface CascadeStageResult {
  stage: number;
  weakClassifierCount: number;
  threshold: number;
  inputValue: number;
  entered: boolean;
  passed: boolean;
}

export interface DetectionWindowStep {
  mode: DetectionPipelineMode;
  x: number;
  y: number;
  windowSize: number;
  inputRegion: GrayscaleImage;
  featureSummary: DetectionFeatureSummary;
  svmScore: SvmScoreBreakdown | null;
  cascadeStages: CascadeStageResult[];
  detected: boolean;
  decisionLabel: string;
  responseValue: number;
  featureVectorLength: number;
  haarStep: HaarFeatureStep | null;
  lbpStep: LBPVectorStep | null;
}

export type DetectionScanStatus = 'rejected' | 'candidate';

export interface DetectionScanStep {
  index: number;
  x: number;
  y: number;
  status: DetectionScanStatus;
  rejectedAtStage: number | null;
  responseValue: number;
  windowStep: DetectionWindowStep;
}

export interface CandidateWindow {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  sourceIndex: number;
}

export interface TeachingDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  sourceCount: number;
}

export interface DetectionScanProgress {
  total: number;
  scannedCount: number;
  rejectedCount: number;
  candidateCount: number;
  steps: DetectionScanStep[];
  scannedSteps: DetectionScanStep[];
  currentStep: DetectionScanStep | null;
  candidateWindows: CandidateWindow[];
  detections: TeachingDetectionBox[];
}

const DEFAULT_SVM_WEIGHTS: Record<Exclude<DetectionPipelineMode, 'haar-cascade'>, TeachingSvmWeights> = {
  'hog-svm': {
    meanIntensity: 0.1,
    contrast: 0.45,
    gradientEnergy: 2.8,
    verticalGradient: 0.9,
    horizontalGradient: 0.45,
    centerBrightness: 0.2,
    textureDensity: 0,
    bias: -1.2,
  },
  'lbp-svm': {
    meanIntensity: 0.15,
    contrast: 0.35,
    gradientEnergy: 0.65,
    verticalGradient: 0.2,
    horizontalGradient: 0.2,
    centerBrightness: 0.1,
    textureDensity: 2.3,
    bias: -1.05,
  },
};

const FEATURE_LABELS: Record<keyof Omit<TeachingSvmWeights, 'bias'>, string> = {
  meanIntensity: '平均亮度',
  contrast: '灰度对比',
  gradientEnergy: '梯度能量',
  verticalGradient: '竖直边缘',
  horizontalGradient: '水平边缘',
  centerBrightness: '中心亮度',
  textureDensity: '纹理密度',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cropImage(image: GrayscaleImage, x: number, y: number, size: number): GrayscaleImage {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => image[y + row]?.[x + col] ?? 0)
  );
}

function grayByte(value: number): number {
  return Math.round(clamp(value, 0, 1) * 255);
}

function normalizeScore(score: number): number {
  return 1 / (1 + Math.exp(-score));
}

function getWindowBounds(image: GrayscaleImage, windowSize: number): { width: number; height: number } {
  const imageWidth = image[0]?.length ?? 0;
  const imageHeight = image.length;

  return {
    width: Math.max(0, imageWidth - windowSize + 1),
    height: Math.max(0, imageHeight - windowSize + 1),
  };
}

function computeBaseFeatureSummary(
  image: GrayscaleImage,
  x: number,
  y: number,
  windowSize: number,
  haarStep: HaarFeatureStep | null,
  lbpStep: LBPVectorStep | null
): DetectionFeatureSummary {
  const region = cropImage(image, x, y, windowSize);
  const pixels = region.flat();
  const pixelCount = Math.max(1, pixels.length);
  const meanIntensity = pixels.reduce((sum, value) => sum + value, 0) / pixelCount;
  const minValue = Math.min(...pixels);
  const maxValue = Math.max(...pixels);
  const contrast = maxValue - minValue;
  const gradient = computeHogGradients(image);
  let gradientSum = 0;
  let verticalGradientSum = 0;
  let horizontalGradientSum = 0;

  for (let row = 0; row < windowSize; row++) {
    for (let col = 0; col < windowSize; col++) {
      const px = x + col;
      const py = y + row;
      const gx = gradient.gx[py]?.[px] ?? 0;
      const gy = gradient.gy[py]?.[px] ?? 0;

      gradientSum += gradient.magnitude[py]?.[px] ?? 0;
      verticalGradientSum += Math.abs(gx);
      horizontalGradientSum += Math.abs(gy);
    }
  }

  const gradientNormalizer = pixelCount * 4;
  const centerStart = Math.floor(windowSize * 0.3);
  const centerEnd = Math.ceil(windowSize * 0.7);
  let centerSum = 0;
  let centerCount = 0;

  for (let row = centerStart; row < centerEnd; row++) {
    for (let col = centerStart; col < centerEnd; col++) {
      centerSum += region[row]?.[col] ?? 0;
      centerCount += 1;
    }
  }

  const topLbpBin = lbpStep?.selectedCell.nonZeroBins[0];

  return {
    meanIntensity,
    contrast,
    gradientEnergy: clamp(gradientSum / gradientNormalizer, 0, 1),
    verticalGradient: clamp(verticalGradientSum / gradientNormalizer, 0, 1),
    horizontalGradient: clamp(horizontalGradientSum / gradientNormalizer, 0, 1),
    centerBrightness: centerCount > 0 ? centerSum / centerCount : meanIntensity,
    textureDensity: lbpStep
      ? clamp(lbpStep.selectedCell.nonZeroBins.length / 16, 0, 1)
      : 0,
    haarFeatureValue: haarStep?.featureValue ?? 0,
    haarAbsoluteValue: haarStep ? clamp(haarStep.absoluteFeatureValue / (windowSize * windowSize * 255), 0, 1) : 0,
    lbpTopBin: topLbpBin?.bin ?? 0,
    lbpNonZeroBins: lbpStep?.selectedCell.nonZeroBins.length ?? 0,
  };
}

export function buildTeachingSvmScore(
  featureSummary: DetectionFeatureSummary,
  weights: TeachingSvmWeights
): SvmScoreBreakdown {
  const keys: Array<keyof Omit<TeachingSvmWeights, 'bias'>> = [
    'meanIntensity',
    'contrast',
    'gradientEnergy',
    'verticalGradient',
    'horizontalGradient',
    'centerBrightness',
    'textureDensity',
  ];
  const terms = keys.map(key => {
    const value = featureSummary[key];
    const weight = weights[key];

    return {
      key,
      label: FEATURE_LABELS[key],
      value,
      weight,
      product: value * weight,
    };
  });
  const score = terms.reduce((sum, term) => sum + term.product, weights.bias);
  const passed = score > 0;

  return {
    terms,
    bias: weights.bias,
    score,
    passed,
    decisionLabel: passed ? '目标窗口' : '背景窗口',
  };
}

/** 教学简化：级联各阶段使用同一归一化特征值 |V|。真实 Cascade 各阶段的特征组合和数量均不同，此处用递增阈值模拟"前级宽松、后级严格"的教学意图。 */
export function evaluateCascadeStages(
  haarFeatureValue: number,
  stageThresholds: number[]
): CascadeStageResult[] {
  const normalizedValue = Math.abs(haarFeatureValue);
  let stillEntered = true;

  return stageThresholds.map((threshold, index) => {
    const entered = stillEntered;
    const passed = entered && normalizedValue >= threshold;

    if (!passed) {
      stillEntered = false;
    }

    return {
      stage: index + 1,
      weakClassifierCount: 2 + index * 3,
      threshold,
      inputValue: normalizedValue,
      entered,
      passed,
    };
  });
}

export function getDetectionWindowStep(
  image: GrayscaleImage,
  config: DetectionPipelineConfig,
  x: number,
  y: number
): DetectionWindowStep | null {
  const bounds = getWindowBounds(image, config.windowSize);
  if (bounds.width === 0 || bounds.height === 0) return null;

  const safeX = clamp(x, 0, bounds.width - 1);
  const safeY = clamp(y, 0, bounds.height - 1);
  const haarStep = config.mode === 'haar-cascade'
    ? getHaarFeatureStep(
      image,
      safeX,
      safeY,
      config.haarTemplateType ?? 'edge',
      config.windowSize
    )
    : null;
  const lbpStep = config.mode === 'lbp-svm'
    ? getLBPVectorStep(
      image,
      safeX,
      safeY,
      config.windowSize,
      config.lbpCellSize ?? 4
    )
    : null;
  const featureSummary = computeBaseFeatureSummary(image, safeX, safeY, config.windowSize, haarStep, lbpStep);
  const svmScore = config.mode === 'hog-svm' || config.mode === 'lbp-svm'
    ? buildTeachingSvmScore(
      featureSummary,
      config.svmWeights ?? DEFAULT_SVM_WEIGHTS[config.mode]
    )
    : null;
  const cascadeStages = config.mode === 'haar-cascade'
    ? evaluateCascadeStages(
      featureSummary.haarAbsoluteValue,
      config.cascadeThresholds ?? [0.12, 0.2, 0.3]
    )
    : [];
  const detected = svmScore ? svmScore.passed : cascadeStages.length > 0 && cascadeStages.every(stage => stage.passed);
  const responseValue = svmScore
    ? normalizeScore(svmScore.score)
    : clamp(featureSummary.haarAbsoluteValue, 0, 1);

  return {
    mode: config.mode,
    x: safeX,
    y: safeY,
    windowSize: config.windowSize,
    inputRegion: cropImage(image, safeX, safeY, config.windowSize),
    featureSummary,
    svmScore,
    cascadeStages,
    detected,
    decisionLabel: detected ? '检测为目标' : '判为背景',
    responseValue,
    featureVectorLength: config.mode === 'lbp-svm'
      ? lbpStep?.vectorLength ?? 0
      : config.mode === 'hog-svm'
        ? 4 * 9
        : cascadeStages.length,
    haarStep,
    lbpStep,
  };
}

export function computeDetectionScoreMap(
  image: GrayscaleImage,
  config: DetectionPipelineConfig
): GrayscaleImage {
  const bounds = getWindowBounds(image, config.windowSize);
  const result = create2DArray(bounds.height, bounds.width, 0);

  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const step = getDetectionWindowStep(image, config, x, y);
      result[y][x] = step?.responseValue ?? 0;
    }
  }

  return result;
}

export function buildDetectionScanSteps(
  image: GrayscaleImage,
  config: DetectionPipelineConfig
): DetectionScanStep[] {
  const bounds = getWindowBounds(image, config.windowSize);
  const steps: DetectionScanStep[] = [];

  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const windowStep = getDetectionWindowStep(image, config, x, y);
      if (!windowStep) continue;

      const rejectedStage = windowStep.cascadeStages.find(stage => stage.entered && !stage.passed);

      steps.push({
        index: steps.length,
        x,
        y,
        status: windowStep.detected ? 'candidate' : 'rejected',
        rejectedAtStage: rejectedStage?.stage ?? null,
        responseValue: windowStep.responseValue,
        windowStep,
      });
    }
  }

  return steps;
}

export function collectCandidateWindows(steps: DetectionScanStep[]): CandidateWindow[] {
  return steps
    .filter(step => step.status === 'candidate')
    .map(step => ({
      x: step.x,
      y: step.y,
      width: step.windowStep.windowSize,
      height: step.windowStep.windowSize,
      score: step.responseValue,
      sourceIndex: step.index,
    }));
}

function getIntersectionArea(a: CandidateWindow | TeachingDetectionBox, b: CandidateWindow | TeachingDetectionBox): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function getUnionArea(a: CandidateWindow | TeachingDetectionBox, b: CandidateWindow | TeachingDetectionBox): number {
  return a.width * a.height + b.width * b.height - getIntersectionArea(a, b);
}

function getIoU(a: CandidateWindow | TeachingDetectionBox, b: CandidateWindow | TeachingDetectionBox): number {
  const union = getUnionArea(a, b);
  return union > 0 ? getIntersectionArea(a, b) / union : 0;
}

export function mergeTeachingDetections(candidates: CandidateWindow[]): TeachingDetectionBox[] {
  const sortedCandidates = [...candidates].sort((a, b) => b.score - a.score);
  const detections: TeachingDetectionBox[] = [];

  sortedCandidates.forEach(candidate => {
    const matchedDetection = detections.find(detection => getIoU(detection, candidate) > 0.22);

    if (matchedDetection) {
      const nextCount = matchedDetection.sourceCount + 1;
      const right = Math.max(matchedDetection.x + matchedDetection.width, candidate.x + candidate.width);
      const bottom = Math.max(matchedDetection.y + matchedDetection.height, candidate.y + candidate.height);

      matchedDetection.x = Math.min(matchedDetection.x, candidate.x);
      matchedDetection.y = Math.min(matchedDetection.y, candidate.y);
      matchedDetection.width = right - matchedDetection.x;
      matchedDetection.height = bottom - matchedDetection.y;
      matchedDetection.score = Math.max(matchedDetection.score, candidate.score);
      matchedDetection.sourceCount = nextCount;
      return;
    }

    detections.push({
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
      score: candidate.score,
      sourceCount: 1,
    });
  });

  return detections
    .filter(detection => detection.sourceCount >= 2 || detection.score > 0.42)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function getScanProgressAt(
  image: GrayscaleImage,
  config: DetectionPipelineConfig,
  scanIndex: number
): DetectionScanProgress {
  const steps = buildDetectionScanSteps(image, config);
  const total = steps.length;
  const clampedScanIndex = total > 0 ? clamp(scanIndex, 0, total - 1) : 0;
  const scannedSteps = total > 0 ? steps.slice(0, clampedScanIndex + 1) : [];
  const candidateWindows = collectCandidateWindows(scannedSteps);
  const rejectedCount = scannedSteps.filter(step => step.status === 'rejected').length;

  return {
    total,
    scannedCount: scannedSteps.length,
    rejectedCount,
    candidateCount: candidateWindows.length,
    steps,
    scannedSteps,
    currentStep: scannedSteps[scannedSteps.length - 1] ?? null,
    candidateWindows,
    detections: mergeTeachingDetections(candidateWindows),
  };
}

export function createClassifierTeachingImage(): GrayscaleImage {
  const size = 32;
  const image = create2DArray(size, size, 0.12);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - 16;
      const dy = y - 15;
      const faceDist = Math.sqrt(dx * dx + dy * dy);
      const inWeakTexture = (x >= 4 && x <= 8 && y >= 22 && y <= 25) || (x >= 24 && x <= 27 && y >= 5 && y <= 8);

      if (faceDist <= 7.2) {
        image[y][x] = 0.76;
      }

      if ((x === 13 || x === 19) && y >= 13 && y <= 15) {
        image[y][x] = 0.2;
      }

      if (x >= 13 && x <= 19 && y === 19) {
        image[y][x] = 0.22;
      }

      if (inWeakTexture) {
        image[y][x] = 0.24;
      }

      image[y][x] = clamp(image[y][x] + ((x * 17 + y * 31) % 7) / 255, 0, 1);
    }
  }

  return image;
}

export function formatFeatureValue(value: number, digits = 3): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.000';
}

export function formatGrayByte(value: number): string {
  return String(grayByte(value));
}
