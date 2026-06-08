'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AnchoredOverlay,
  type AnchoredOverlayPath,
  ConceptLayout,
  CodeViewer,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  MathText,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  sobelEdgeDetection,
  robertsEdgeDetection,
  prewittEdgeDetection,
  laplaceEdgeDetection,
  cannyEdgeDetection,
  type EdgeResult,
} from '@/lib/algorithms/edgeDetection';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { normalizeImage } from '@/lib/utils/imageProcessing';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';
import { GrayscaleImage } from '@/lib/algorithms/types';

// ---- 算子类型定义 ----

type EdgeOperator = 'roberts' | 'sobel' | 'prewitt' | 'laplace' | 'canny';
type LaplaceVariant = '4-neighbor' | '8-neighbor';
type CannyStage = 'blur' | 'gradient' | 'nms' | 'threshold' | 'tracking';

const CANNY_STAGES: { key: CannyStage; label: string; description: string }[] = [
  { key: 'blur', label: '高斯去噪', description: '5×5 高斯平滑，抑制噪声' },
  { key: 'gradient', label: '梯度计算', description: 'Sobel 算子计算梯度幅值与方向' },
  { key: 'nms', label: '非极大值抑制', description: '细化边缘，保留局部最大值' },
  { key: 'threshold', label: '双阈值分类', description: '区分强边缘、弱边缘和非边缘' },
  { key: 'tracking', label: '边缘连接', description: '保留与强边缘连通的弱边缘' },
];

// ---- 算子核定义 ----

const ROBERTS_GX = [[1, 0], [0, -1]];
const ROBERTS_GY = [[0, 1], [-1, 0]];
const SOBEL_GX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
const SOBEL_GY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
const PREWITT_GX = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
const PREWITT_GY = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];
const LAPLACE_4 = [[0, -1, 0], [-1, 4, -1], [0, -1, 0]];
const LAPLACE_8 = [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];

// ---- 代码片段 ----

const SOBEL_CODE = `function sobelEdgeDetection(image: number[][]): {
  magnitude: number[][]; direction: number[][]; gx: number[][]; gy: number[][]
} {
  const gxKernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const gyKernel = [[-1,-2,-1], [ 0, 0, 0], [ 1, 2, 1]];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sumX = 0, sumY = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const p = image[y+ky]?.[x+kx] ?? 0;
          sumX += p * gxKernel[ky+1][kx+1];
          sumY += p * gyKernel[ky+1][kx+1];
        }
      }
      gx[y][x] = sumX;
      gy[y][x] = sumY;
      magnitude[y][x] = Math.sqrt(sumX*sumX + sumY*sumY);
      direction[y][x] = Math.atan2(sumY, sumX);
    }
  }
  return { magnitude, direction, gx, gy };
}`;

const ROBERTS_CODE = `function robertsEdgeDetection(image: number[][]): EdgeResult {
  const Gx = [[1, 0], [0, -1]];  // 2×2 对角差分 — 主对角线
  const Gy = [[0, 1], [-1, 0]];  // 2×2 对角差分 — 副对角线

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 取 2×2 邻域
      const p00 = image[y][x];
      const p10 = image[y][x+1] ?? 0;
      const p01 = image[y+1]?.[x] ?? 0;
      const p11 = image[y+1]?.[x+1] ?? 0;

      const sumX = p00*Gx[0][0] + p10*Gx[0][1] + p01*Gx[1][0] + p11*Gx[1][1];
      const sumY = p00*Gy[0][0] + p10*Gy[0][1] + p01*Gy[1][0] + p11*Gy[1][1];

      gx[y][x] = sumX;
      gy[y][x] = sumY;
      magnitude[y][x] = Math.sqrt(sumX*sumX + sumY*sumY);
      direction[y][x] = Math.atan2(sumY, sumX);
    }
  }
  return { magnitude, direction, gx, gy };
}`;

const PREWITT_CODE = `function prewittEdgeDetection(image: number[][]): EdgeResult {
  const gxKernel = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
  const gyKernel = [[-1,-1,-1], [ 0, 0, 0], [ 1, 1, 1]];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sumX = 0, sumY = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const p = image[y+ky]?.[x+kx] ?? 0;
          sumX += p * gxKernel[ky+1][kx+1];
          sumY += p * gyKernel[ky+1][kx+1];
        }
      }
      // ...计算幅值与方向（同 Sobel）
    }
  }
}`;

const LAPLACE_CODE = `function laplaceEdgeDetection(
  image: number[][], use8Neighbor?: boolean
): { magnitude: number[][] } {
  const k4 = [[ 0,-1, 0], [-1, 4,-1], [ 0,-1, 0]]; // 4-邻域
  const k8 = [[-1,-1,-1], [-1, 8,-1], [-1,-1,-1]]; // 8-邻域
  const kernel = use8Neighbor ? k8 : k4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const p = image[y+ky]?.[x+kx] ?? 0;
          sum += p * kernel[ky+1][kx+1];
        }
      }
      magnitude[y][x] = Math.abs(sum); // 取绝对值表示边缘强度
    }
  }
  return { magnitude };
}`;

const CANNY_CODE = `function cannyEdgeDetection(
  image: number[][], lowThreshold: number, highThreshold: number
): CannyResult {
  // 1. 高斯去噪 — 5×5 高斯滤波，降低噪声干扰
  const blurred = gaussianBlur(image, 5, 1.0);

  // 2. 梯度计算 — Sobel 算子计算梯度幅值 & 方向
  const { magnitude, direction } = sobelEdgeDetection(blurred);

  // 3. 非极大值抑制 — 沿梯度方向只保留局部最大值
  const nms = nonMaximumSuppression(magnitude, direction);

  // 4. 双阈值分类 — 强边缘 / 弱边缘候选 / 非边缘
  // 5. 边缘跟踪 — 用栈追溯弱边缘是否与强边缘连通
  const edges = hysteresisThreshold(nms, lowThreshold, highThreshold);

  return { image: edges, stages: { ... } };
}`;

// ---- 通用步骤类型 ----

interface EdgeStep {
  x: number;
  y: number;
  /** 输入邻域 */
  inputRegion: number[][];
  /** 邻域大小 */
  kernelSize: number;
  /** Gx 核矩阵 (Laplace 无此字段) */
  gxKernel: number[][] | null;
  /** Gy 核矩阵 */
  gyKernel: number[][] | null;
  /** 水平梯度 */
  gxValue: number;
  /** 垂直梯度 */
  gyValue: number;
  /** 梯度幅值 */
  magnitude: number;
  /** 梯度方向(度) */
  direction: number;
  /** Canny 阶段标记 */
  cannyStage?: CannyStage;
  /** Canny 模糊前原始值 */
  originalValue?: number;
  /** Canny 模糊后值 */
  blurredValue?: number;
  /** Canny NMS 是否被抑制 */
  nmsSuppressed?: boolean;
  /** Canny 阈值阶段: 0=非边缘, 1=弱边缘, 2=强边缘 */
  edgeClass?: number;
  /** Canny 边缘连接后是否保留 */
  edgeConnected?: boolean;
}

// ---- 工具函数 ----

/** 归一化图像到 [0,1] */
function normImage(image: GrayscaleImage): GrayscaleImage {
  return normalizeImage(image);
}

/** 获取图像中像素值(安全访问) */
function safeGet(image: GrayscaleImage, x: number, y: number): number {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  if (x >= 0 && x < width && y >= 0 && y < height) return image[y][x];
  return 0;
}

/** 格式化像素值显示 */
function fmtPx(val: number): string {
  return val.toFixed(2);
}

/** 格式化核权重显示 */
function fmtK(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

// ---- 公式 MathML 构建 ----

function buildGradientMagMathML(x: number, y: number, gx: number, gy: number, mag: number): string {
  return buildInlineMathML(`
    <mrow>
      <mo>|</mo><mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo><mo>|</mo>
      <mo>=</mo>
      <msqrt>
        <mrow>
          <msubsup><mi>G</mi><mi>x</mi><mn>2</mn></msubsup>
          <mo>+</mo>
          <msubsup><mi>G</mi><mi>y</mi><mn>2</mn></msubsup>
        </mrow>
      </msqrt>
      <mo>=</mo>
      <msqrt>
        <mrow>
          <msup><mn>${gx.toFixed(2)}</mn><mn>2</mn></msup>
          <mo>+</mo>
          <msup><mn>${gy.toFixed(2)}</mn><mn>2</mn></msup>
        </mrow>
      </msqrt>
      <mo>=</mo>
      <mn>${mag.toFixed(2)}</mn>
    </mrow>
  `);
}

function buildGradientDirMathML(x: number, y: number, gy: number, gx: number, angle: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>&#x3B8;</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>=</mo>
      <msup><mi>tan</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup>
      <mrow><mo>(</mo><mfrac><msub><mi>G</mi><mi>y</mi></msub><msub><mi>G</mi><mi>x</mi></msub></mfrac><mo>)</mo></mrow>
      <mo>=</mo>
      <msup><mi>tan</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup>
      <mrow><mo>(</mo><mfrac><mn>${gy.toFixed(2)}</mn><mn>${gx.toFixed(2)}</mn></mfrac><mo>)</mo></mrow>
      <mo>=</mo>
      <mn>${angle.toFixed(0)}</mn><mo>&#xB0;</mo>
    </mrow>
  `);
}

function buildLaplaceMathML(x: number, y: number, val: number): string {
  return buildInlineMathML(`
    <mrow>
      <msup><mo>&#x2207;</mo><mn>2</mn></msup>
      <mi>f</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>=</mo>
      <mfrac><mrow><msup><mo>&#x2202;</mo><mn>2</mn></msup><mi>f</mi></mrow><mrow><mo>&#x2202;</mo><msup><mi>x</mi><mn>2</mn></msup></mrow></mfrac>
      <mo>+</mo>
      <mfrac><mrow><msup><mo>&#x2202;</mo><mn>2</mn></msup><mi>f</mi></mrow><mrow><mo>&#x2202;</mo><msup><mi>y</mi><mn>2</mn></msup></mrow></mfrac>
      <mo>=</mo>
      <mn>${val.toFixed(2)}</mn>
    </mrow>
  `);
}

function buildCannyBlurMathML(x: number, y: number, orig: number, blurred: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>B</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>=</mo>
      <munderover><mo>&#x2211;</mo><mrow><mi>i</mi><mo>=</mo><mo>-</mo><mn>2</mn></mrow><mn>2</mn></munderover>
      <munderover><mo>&#x2211;</mo><mrow><mi>j</mi><mo>=</mo><mo>-</mo><mn>2</mn></mrow><mn>2</mn></munderover>
      <mi>f</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>i</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>j</mi><mo>)</mo>
      <mo>&#x22C5;</mo>
      <mi>G</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      <mo>=</mo>
      <msub><mi>f</mi><mtext>原始</mtext></msub><mo>=</mo><mn>${orig.toFixed(2)}</mn>
      <mo>&#x2192;</mo>
      <msub><mi>f</mi><mtext>模糊</mtext></msub><mo>=</mo><mn>${blurred.toFixed(2)}</mn>
    </mrow>
  `);
}

function buildNmsMathML(x: number, y: number, suppressed: boolean, mag: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>NMS</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>=</mo>
      <mrow><mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>${mag.toFixed(2)}</mn></mtd>
            <mtd><mtext>若当前像素为梯度方向上的局部最大值</mtext></mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mtext>否则(被抑制)</mtext></mtd>
          </mtr>
        </mtable>
      <mo>)</mo></mrow>
    </mrow>
  `);
}

// ---- 页面组件 ----

export default function EdgeDetectionPage() {
  // ---- 状态 ----
  const [imageType, setImageType] = useState<SampleImageType>('lena');
  const [operator, setOperator] = useState<EdgeOperator>('sobel');
  const [laplaceVariant, setLaplaceVariant] = useState<LaplaceVariant>('4-neighbor');
  const [cannyStage, setCannyStage] = useState<CannyStage>('gradient');
  const [lowThreshold, setLowThreshold] = useState(30);
  const [highThreshold, setHighThreshold] = useState(100);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const lenaImage = useLenaGrayscaleImage(96);

  const originalImage = useMemo(() => {
    if (imageType === 'lena' && lenaImage) return lenaImage;
    return sampleImages[imageType].image;
  }, [imageType, lenaImage]);
  const imgHeight = originalImage.length;
  const imgWidth = originalImage[0]?.length ?? 0;

  // ---- 算子结果 ----
  const robertsResult = useMemo(
    () => (operator === 'roberts' ? robertsEdgeDetection(originalImage) : null),
    [operator, originalImage]
  );

  const sobelResult = useMemo(
    () => (operator === 'sobel' ? sobelEdgeDetection(originalImage) : null),
    [operator, originalImage]
  );

  const prewittResult = useMemo(
    () => (operator === 'prewitt' ? prewittEdgeDetection(originalImage) : null),
    [operator, originalImage]
  );

  const laplaceResult = useMemo(
    () => (operator === 'laplace' ? laplaceEdgeDetection(originalImage, laplaceVariant === '8-neighbor') : null),
    [operator, originalImage, laplaceVariant]
  );

  const cannyResult = useMemo(
    () => (operator === 'canny' ? cannyEdgeDetection(originalImage, lowThreshold / 255, highThreshold / 255) : null),
    [operator, originalImage, lowThreshold, highThreshold]
  );

  // ---- 梯度数据(非 Laplace/Canny 的第一步用) ----
  const activeGradientResult = useMemo((): EdgeResult | null => {
    switch (operator) {
      case 'roberts': return robertsResult;
      case 'sobel': return sobelResult;
      case 'prewitt': return prewittResult;
      default: return null;
    }
  }, [operator, robertsResult, sobelResult, prewittResult]);

  // ---- 当前激活的图像数据(归一化后的幅值或 Laplace/Canny 输出) ----
  const activeEdgeData = useMemo((): GrayscaleImage | null => {
    if (operator === 'laplace') {
      return laplaceResult ? normImage(laplaceResult.magnitude) : null;
    }
    if (operator === 'canny') {
      // 根据 Canny 阶段返回对应图像
      if (!cannyResult) return null;
      switch (cannyStage) {
        case 'blur': return cannyResult.stages.blurred;
        case 'gradient': return normImage(cannyResult.stages.gradientMagnitude);
        case 'nms': return normImage(cannyResult.stages.nms);
        case 'threshold': return cannyResult.stages.doubleThreshold;
        case 'tracking': return cannyResult.stages.thresholded;
      }
    }
    // Roberts / Sobel / Prewitt: 返回归一化幅值
    return activeGradientResult ? normImage(activeGradientResult.magnitude) : null;
  }, [operator, laplaceResult, cannyResult, cannyStage, activeGradientResult]);

  // ---- 结果图像 ----
  const resultImage = activeEdgeData;

  // ---- 当前算子核信息 ----
  const kernelInfo = useMemo(() => {
    switch (operator) {
      case 'roberts':
        return { size: 2, gx: ROBERTS_GX, gy: ROBERTS_GY, label: 'Roberts' };
      case 'sobel':
        return { size: 3, gx: SOBEL_GX, gy: SOBEL_GY, label: 'Sobel' };
      case 'prewitt':
        return { size: 3, gx: PREWITT_GX, gy: PREWITT_GY, label: 'Prewitt' };
      case 'laplace':
        return {
          size: 3,
          gx: laplaceVariant === '8-neighbor' ? LAPLACE_8 : LAPLACE_4,
          gy: null,
          label: laplaceVariant === '8-neighbor' ? 'Laplace 8-邻域' : 'Laplace 4-邻域',
        };
      case 'canny':
        return { size: cannyStage === 'blur' ? 5 : 3, gx: SOBEL_GX, gy: SOBEL_GY, label: 'Canny' };
    }
  }, [operator, laplaceVariant, cannyStage]);

  // ---- 生成步骤 ----
  const steps = useMemo((): EdgeStep[] => {
    const stepList: EdgeStep[] = [];
    if (!originalImage || imgWidth === 0 || imgHeight === 0) return stepList;

    // Canny: 为当前阶段生成步骤
    if (operator === 'canny' && cannyResult) {
      const {
        stages: { grayscale, blurred, gradientMagnitude, gradientDirection, nms, doubleThreshold, thresholded },
      } = cannyResult;

      for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
          const step: EdgeStep = {
            x, y,
            inputRegion: [],
            kernelSize: 3,
            gxKernel: SOBEL_GX,
            gyKernel: SOBEL_GY,
            gxValue: 0, gyValue: 0,
            magnitude: 0,
            direction: 0,
            cannyStage,
          };

          switch (cannyStage) {
            case 'blur':
              step.inputRegion = extractInputRegion(grayscale, x, y, 5);
              step.kernelSize = 5;
              step.gxKernel = null;
              step.gyKernel = null;
              step.magnitude = blurred[y][x];
              step.originalValue = grayscale[y][x];
              step.blurredValue = blurred[y][x];
              break;
            case 'gradient':
              step.inputRegion = extractInputRegion(blurred, x, y, 3);
              step.kernelSize = 3;
              step.magnitude = gradientMagnitude[y][x];
              step.direction = gradientDirection[y][x];
              // Canny 的梯度计算在高斯去噪后的图像上执行，必须和算法中间结果同源。
              {
                let sumX = 0, sumY = 0;
                for (let ky = -1; ky <= 1; ky++) {
                  for (let kx = -1; kx <= 1; kx++) {
                    const p = safeGet(blurred, x + kx, y + ky);
                    sumX += p * SOBEL_GX[ky + 1][kx + 1];
                    sumY += p * SOBEL_GY[ky + 1][kx + 1];
                  }
                }
                step.gxValue = sumX;
                step.gyValue = sumY;
              }
              break;
            case 'nms':
              step.inputRegion = [[nms[y][x]]];
              step.kernelSize = 0;
              step.gxKernel = null;
              step.gyKernel = null;
              step.magnitude = gradientMagnitude[y][x];
              step.direction = gradientDirection[y][x];
              step.nmsSuppressed = nms[y][x] === 0;
              break;
            case 'threshold':
              step.inputRegion = [[doubleThreshold[y][x]]];
              step.kernelSize = 0;
              step.gxKernel = null;
              step.gyKernel = null;
              step.magnitude = nms[y][x];
              step.edgeClass = nms[y][x] >= highThreshold / 255 ? 2 : nms[y][x] >= lowThreshold / 255 ? 1 : 0;
              break;
            case 'tracking':
              step.inputRegion = [[thresholded[y][x]]];
              step.kernelSize = 0;
              step.gxKernel = null;
              step.gyKernel = null;
              step.magnitude = nms[y][x];
              step.edgeClass = nms[y][x] >= highThreshold / 255 ? 2 : nms[y][x] >= lowThreshold / 255 ? 1 : 0;
              step.edgeConnected = thresholded[y][x] > 0;
              break;
          }

          stepList.push(step);
        }
      }
      return stepList;
    }

    // Laplace: 生成 3×3 邻域步骤
    if (operator === 'laplace') {
      const kernel = laplaceVariant === '8-neighbor' ? LAPLACE_8 : LAPLACE_4;
      for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
          const inputRegion = extractInputRegion(originalImage, x, y, 3);
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              sum += (inputRegion[ky + 1]?.[kx + 1] ?? 0) * kernel[ky + 1][kx + 1];
            }
          }
          stepList.push({
            x, y, inputRegion,
            kernelSize: 3,
            gxKernel: kernel,
            gyKernel: null,
            gxValue: sum, gyValue: 0,
            magnitude: Math.abs(sum),
            direction: 0,
          });
        }
      }
      return stepList;
    }

    // Roberts: 2×2 邻域步骤
    if (operator === 'roberts') {
      for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
          const p00 = safeGet(originalImage, x, y);
          const p10 = safeGet(originalImage, x + 1, y);
          const p01 = safeGet(originalImage, x, y + 1);
          const p11 = safeGet(originalImage, x + 1, y + 1);
          const inputRegion = [[p00, p10], [p01, p11]];

          const sumX = p00 * ROBERTS_GX[0][0] + p10 * ROBERTS_GX[0][1] +
                       p01 * ROBERTS_GX[1][0] + p11 * ROBERTS_GX[1][1];
          const sumY = p00 * ROBERTS_GY[0][0] + p10 * ROBERTS_GY[0][1] +
                       p01 * ROBERTS_GY[1][0] + p11 * ROBERTS_GY[1][1];

          stepList.push({
            x, y, inputRegion,
            kernelSize: 2,
            gxKernel: ROBERTS_GX,
            gyKernel: ROBERTS_GY,
            gxValue: sumX, gyValue: sumY,
            magnitude: Math.sqrt(sumX * sumX + sumY * sumY),
            direction: Math.atan2(sumY, sumX) * (180 / Math.PI),
          });
        }
      }
      return stepList;
    }

    // Sobel / Prewitt: 3×3 邻域步骤
    const gxK = operator === 'prewitt' ? PREWITT_GX : SOBEL_GX;
    const gyK = operator === 'prewitt' ? PREWITT_GY : SOBEL_GY;
    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        const inputRegion = extractInputRegion(originalImage, x, y, 3);
        let sumX = 0, sumY = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sumX += (inputRegion[ky + 1]?.[kx + 1] ?? 0) * gxK[ky + 1][kx + 1];
            sumY += (inputRegion[ky + 1]?.[kx + 1] ?? 0) * gyK[ky + 1][kx + 1];
          }
        }
        stepList.push({
          x, y, inputRegion,
          kernelSize: 3,
          gxKernel: gxK,
          gyKernel: gyK,
          gxValue: sumX, gyValue: sumY,
          magnitude: Math.sqrt(sumX * sumX + sumY * sumY),
          direction: Math.atan2(sumY, sumX) * (180 / Math.PI),
        });
      }
    }
    return stepList;
  }, [originalImage, operator, laplaceVariant, cannyStage, cannyResult, imgWidth, imgHeight]);

  const totalSteps = steps.length;
  const currentStepIndex = currentPosition.y * imgWidth + currentPosition.x;
  const safeStepIndex = totalSteps > 0 ? Math.min(currentStepIndex, totalSteps - 1) : 0;

  // 算子、阶段或图像尺寸变化后回到左上角，避免旧坐标映射到新图像的错误位置。
  useEffect(() => {
    setCurrentPosition({ x: 0, y: 0 });
  }, [operator, cannyStage, laplaceVariant, imageType, imgWidth, imgHeight]);

  const currentStep = steps.length > 0 ? steps[safeStepIndex] ?? null : null;

  // ---- 方向移动处理 ----
  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.x, y: currentStep.y } : null,
    bounds: { width: imgWidth, height: imgHeight },
    onMove: setCurrentPosition,
    disabled: totalSteps === 0,
  });

  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      if (imgWidth === 0 || imgHeight === 0) return;
      setCurrentPosition({
        x: Math.max(0, Math.min(x, imgWidth - 1)),
        y: Math.max(0, Math.min(y, imgHeight - 1)),
      });
    },
    [imgWidth, imgHeight]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      if (imgWidth === 0 || imgHeight === 0) return;
      setCurrentPosition({
        x: Math.max(0, Math.min(x, imgWidth - 1)),
        y: Math.max(0, Math.min(y, imgHeight - 1)),
      });
    },
    [imgWidth, imgHeight]
  );

  // ---- 代码显示 ----
  const activeCode = useMemo(() => {
    switch (operator) {
      case 'roberts': return ROBERTS_CODE;
      case 'sobel': return SOBEL_CODE;
      case 'prewitt': return PREWITT_CODE;
      case 'laplace': return LAPLACE_CODE;
      case 'canny': return CANNY_CODE;
    }
  }, [operator]);

  // ---- analysisPreview: ProcessRail / FlowColumns / FlowNode ----
  const analysisPreview = useMemo(() => {
    if (!currentStep) return null;
    const { x, y, inputRegion, kernelSize, gxKernel, gyKernel, gxValue, gyValue, magnitude, direction, cannyStage: cs } = currentStep;

    // Canny 高斯去噪阶段
    if (cs === 'blur') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-red-700">输入像素</span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-600">原始中心灰度值</div>
                    <div className="font-mono text-lg font-bold text-red-700">
                      {fmtPx(currentStep.originalValue ?? magnitude)}
                    </div>
                  </div>
                  {currentStep.blurredValue !== undefined && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                      <div className="text-[10px] text-red-600">位置</div>
                      <div className="font-mono text-sm text-red-700">({x}, {y})</div>
                    </div>
                  )}
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-amber-800">
                    高斯滤波 (5×5)
                  </span>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  第一步: 5×5 高斯滤波去噪。邻域像素加权平均，抑制随机噪声对边缘检测的干扰。
                </div>
                {currentStep.blurredValue !== undefined && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-amber-600">去噪后值</div>
                    <div className="font-mono text-lg font-bold text-amber-800">
                      {fmtPx(currentStep.blurredValue)}
                    </div>
                  </div>
                )}
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="blue">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-blue-600">Canny 流程</span>
                </div>
                <div className="space-y-1.5">
                  {CANNY_STAGES.map((stage, idx) => (
                    <div
                      key={stage.key}
                      className={`rounded-lg border px-2 py-1.5 text-xs ${
                        cs === stage.key
                          ? 'border-blue-400 bg-blue-100 text-blue-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      <span className="font-mono text-[10px] mr-1">{(idx + 1)}</span>
                      {stage.label}
                    </div>
                  ))}
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // Canny NMS 阶段
    if (cs === 'nms') {
      const dirDeg = direction.toFixed(0);
      const suppressed = currentStep.nmsSuppressed ?? false;
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-red-700">当前像素</span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-600">位置</div>
                    <div className="font-mono text-sm text-red-700">({x}, {y})</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-600">梯度幅值</div>
                    <div className="font-mono font-bold text-red-700">{fmtPx(magnitude)}</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-600">梯度方向</div>
                    <div className="font-mono text-sm text-red-700">{dirDeg}&deg;</div>
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-amber-800">非极大值抑制</span>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  沿梯度方向比较相邻像素。若当前像素并非局部最大值，则抑制（置零）。
                </div>
                <div className="mt-2 rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-amber-600">比较结果</div>
                  <div className={`font-mono text-lg font-bold ${suppressed ? 'text-slate-400' : 'text-amber-800'}`}>
                    {suppressed ? '被抑制' : '保留'}
                  </div>
                </div>
              </FlowNode>

              <FlowNode tone="slate">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-slate-600">Canny 第三步</span>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  非极大值抑制将宽边缘细化为单像素宽，是 Canny 产生细边缘的关键步骤。
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="blue">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-blue-600">Canny 流程</span>
                </div>
                <div className="space-y-1.5">
                  {CANNY_STAGES.map((stage, idx) => (
                    <div
                      key={stage.key}
                      className={`rounded-lg border px-2 py-1.5 text-xs ${
                        cs === stage.key
                          ? 'border-blue-400 bg-blue-100 text-blue-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      <span className="font-mono text-[10px] mr-1">{(idx + 1)}</span>
                      {stage.label}
                    </div>
                  ))}
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // Canny 双阈值阶段
    if (cs === 'threshold') {
      const ec = currentStep.edgeClass ?? 0;
      const edgeLabel = ec === 2 ? '强边缘' : ec === 1 ? '弱边缘' : '非边缘';
      const edgeTone = ec === 2 ? 'text-emerald-700' : ec === 1 ? 'text-amber-700' : 'text-slate-400';
      const edgeBg = ec === 2 ? 'bg-emerald-50 border-emerald-200' : ec === 1 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-red-700">当前像素</span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-600">位置</div>
                    <div className="font-mono text-sm text-red-700">({x}, {y})</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-600">NMS 后值</div>
                    <div className="font-mono font-bold text-red-700">{fmtPx(magnitude)}</div>
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-amber-800">双阈值检测</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-slate-500">高阈值: </span>
                    <span className="font-mono font-semibold text-slate-700">{highThreshold}/255</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-slate-500">低阈值: </span>
                    <span className="font-mono font-semibold text-slate-700">{lowThreshold}/255</span>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                    先只做分类：强边缘、弱边缘候选和非边缘。弱边缘是否保留交给下一步判断。
                  </div>
                </div>
              </FlowNode>

              <FlowNode tone="slate">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-slate-600">Canny 第四步</span>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  双阈值分类本身还不是最终边缘图；弱边缘候选需要继续做连通性判断。
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-emerald-700">分类结果</span>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${edgeBg}`}>
                  <div className="text-[10px] text-slate-500">边缘类别</div>
                  <div className={`font-mono text-lg font-bold ${edgeTone}`}>{edgeLabel}</div>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // Canny 边缘连接阶段
    if (cs === 'tracking') {
      const ec = currentStep.edgeClass ?? 0;
      const connected = currentStep.edgeConnected ?? false;
      const sourceLabel = ec === 2 ? '强边缘' : ec === 1 ? '弱边缘候选' : '非边缘';
      const resultLabel = connected ? '最终保留' : '最终丢弃';
      const resultTone = connected ? 'text-emerald-700' : 'text-slate-400';
      const resultBg = connected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200';

      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-red-700">双阈值分类</span>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <div className="text-[10px] text-red-600">当前像素</div>
                  <div className="font-mono text-sm font-bold text-red-700">
                    {sourceLabel} / NMS {fmtPx(magnitude)}
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-amber-800">边缘连接</span>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  强边缘直接保留；弱边缘只有与强边缘连通时才保留，用于补全断裂边缘并抑制孤立噪声。
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-emerald-700">最终输出</span>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${resultBg}`}>
                  <div className="text-[10px] text-slate-500">边缘连接后</div>
                  <div className={`font-mono text-lg font-bold ${resultTone}`}>{resultLabel}</div>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // 通用梯度分析视图 (Roberts / Sobel / Prewitt / Laplace / Canny gradient)
    const showKernel = gxKernel !== null;
    const dirDeg = direction.toFixed(0);

    return (
      <ProcessRail>
        <FlowColumns>
          {/* 第1列: 输入邻域 (红色) */}
          <FlowColumn align="start">
            <FlowNode tone="red">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-red-700">输入邻域</span>
                <span className="font-mono text-[11px] text-red-700">
                  {kernelSize}×{kernelSize}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {inputRegion.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`input-${ry}-${rx}`}
                        className={`flex h-10 w-10 items-center justify-center rounded border font-mono text-xs ${
                          (kernelSize === 3 && rx === 1 && ry === 1) || (kernelSize === 2 && rx === 0 && ry === 0)
                            ? 'border-red-400 bg-white text-red-700 font-bold'
                            : 'border-red-200 bg-white/90 text-slate-600'
                        }`}
                      >
                        {fmtPx(val)}
                      </div>
                    ))
                  )}
                </div>
                <div className="max-w-[12rem] rounded-xl bg-red-50 px-3 py-2 text-center text-xs leading-5 text-red-700">
                  原图第 {y + 1}-{y + kernelSize} 行 / 第 {x + 1}-{x + kernelSize} 列
                </div>
              </div>
            </FlowNode>

            <FlowNode tone="slate">
              <div className="mb-2">
                <span className="text-[11px] font-semibold uppercase text-slate-600">算子类型</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold">{kernelInfo.label}</span>
                {operator === 'laplace'
                  ? ' — 二阶微分，检测亮度突变位置'
                  : operator === 'roberts'
                  ? ' — 2×2 对角差分，计算量最小'
                  : ' — 一阶差分梯度算子'}
              </div>
            </FlowNode>
          </FlowColumn>

          {/* 第2列: 核矩阵与乘积 (琥珀色/天蓝色) */}
          <FlowColumn align="center">
            {showKernel && (
              <FlowNode tone="amber">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-amber-800">
                    {operator === 'laplace' ? 'Laplace 核' : 'Gx 核'}
                  </span>
                  <span className="font-mono text-[11px] text-amber-700">
                    {kernelSize}×{kernelSize}
                  </span>
                </div>
                <div
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {gxKernel!.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`gx-${ry}-${rx}`}
                        className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-xs ${
                          (kernelSize === 3 && rx === 1 && ry === 1) || (kernelSize === 2 && rx === 0 && ry === 0)
                            ? 'border-amber-400 bg-white text-amber-800 font-bold'
                            : 'border-amber-200 bg-white/80 text-slate-700'
                        }`}
                      >
                        {fmtK(val)}
                      </div>
                    ))
                  )}
                </div>
                {operator !== 'laplace' && (
                  <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span>水平方向梯度: </span>
                    <MathText
                      className="[&_math]:inline-block"
                      mathML={buildInlineMathML(`
                        <mrow>
                          <msub><mi>G</mi><mi>x</mi></msub>
                          <mo>=</mo>
                          <mn>${fmtPx(gxValue)}</mn>
                        </mrow>
                      `)}
                    />
                  </div>
                )}
              </FlowNode>
            )}

            {gyKernel !== null && (
              <FlowNode tone="amber">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-amber-800">Gy 核</span>
                  <span className="font-mono text-[11px] text-amber-700">
                    {kernelSize}×{kernelSize}
                  </span>
                </div>
                <div
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {gyKernel.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`gy-${ry}-${rx}`}
                        className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-xs ${
                          (kernelSize === 3 && rx === 1 && ry === 1) || (kernelSize === 2 && rx === 0 && ry === 0)
                            ? 'border-amber-400 bg-white text-amber-800 font-bold'
                            : 'border-amber-200 bg-white/80 text-slate-700'
                        }`}
                      >
                        {fmtK(val)}
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span>垂直方向梯度: </span>
                  <MathText
                    className="[&_math]:inline-block"
                    mathML={buildInlineMathML(`
                      <mrow>
                        <msub><mi>G</mi><mi>y</mi></msub>
                        <mo>=</mo>
                        <mn>${fmtPx(gyValue)}</mn>
                      </mrow>
                    `)}
                  />
                </div>
              </FlowNode>
            )}

            {operator === 'laplace' && (
              <FlowNode tone="sky">
                <div className="mb-2">
                  <span className="text-[11px] font-semibold uppercase text-sky-700">二阶微分结果</span>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">
                  <MathText
                    className="[&_math]:inline-block"
                    mathML={buildInlineMathML(`
                      <mrow>
                        <msup><mo>&#x2207;</mo><mn>2</mn></msup>
                        <mi>f</mi>
                        <mo>=</mo>
                        <mn>${fmtPx(gxValue)}</mn>
                      </mrow>
                    `)}
                  />
                </div>
                <div className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-700">
                  <span>取绝对值 </span>
                  <MathText
                    className="[&_math]:inline-block"
                    mathML={buildInlineMathML(`
                      <mrow>
                        <mo>|</mo>
                        <msup><mo>&#x2207;</mo><mn>2</mn></msup>
                        <mi>f</mi>
                        <mo>|</mo>
                        <mo>=</mo>
                        <mn>${fmtPx(Math.abs(gxValue))}</mn>
                      </mrow>
                    `)}
                  />
                  <span> 作为边缘强度。</span>
                  平坦区域接近 0，亮度突变处响应强烈。
                </div>
              </FlowNode>
            )}
          </FlowColumn>

          {/* 第3列: 输出 (翠绿色) */}
          <FlowColumn align="end">
            <FlowNode tone="emerald" className="min-w-[12rem]">
              <div className="mb-2">
                <span className="text-[11px] font-semibold uppercase text-emerald-700">梯度输出</span>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-emerald-600">梯度幅值</div>
                  <div className="font-mono text-lg font-bold text-emerald-700">{fmtPx(magnitude)}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    <MathText
                      className="[&_math]:inline-block"
                      mathML={buildInlineMathML(`
                        <mrow>
                          <msqrt>
                            <mrow>
                              <msubsup><mi>G</mi><mi>x</mi><mn>2</mn></msubsup>
                              <mo>+</mo>
                              <msubsup><mi>G</mi><mi>y</mi><mn>2</mn></msubsup>
                            </mrow>
                          </msqrt>
                        </mrow>
                      `)}
                    />
                  </div>
                </div>
                {operator !== 'laplace' && (
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-emerald-600">梯度方向</div>
                    <div className="font-mono text-sm font-bold text-emerald-700">{dirDeg}&deg;</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      <MathText
                        className="[&_math]:inline-block"
                        mathML={buildInlineMathML(`
                          <mrow>
                            <mi>atan2</mi>
                            <mo>(</mo>
                            <msub><mi>G</mi><mi>y</mi></msub>
                            <mo>,</mo>
                            <msub><mi>G</mi><mi>x</mi></msub>
                            <mo>)</mo>
                          </mrow>
                        `)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [currentStep, operator, kernelInfo, highThreshold, lowThreshold]);

  // ---- stepDetails: TeachingCard + FormulaCard + MathText ----
  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return (
        <div className="py-8 text-center text-slate-400">
          请选择算子并导航像素来查看边缘检测计算过程。
        </div>
      );
    }

    const { x, y, kernelSize, gxKernel, gyKernel, gxValue, gyValue, magnitude, direction, inputRegion, cannyStage: cs } = currentStep;
    const showKernel = gxKernel !== null;
    const dirDeg = direction.toFixed(0);

    // ---- Canny 各阶段详情 ----

    if (cs === 'blur') {
      const orig = currentStep.originalValue ?? 0;
      const blur = currentStep.blurredValue ?? 0;
      return (
        <div className="space-y-4">
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Canny 第 1 步: 高斯去噪</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  对图像进行 5×5 高斯滤波(sigma=1.0)，抑制噪声对后续梯度计算的干扰。
                </p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                去噪后: {fmtPx(blur)}
              </div>
            </div>
            <FormulaCard
              mathML={buildCannyBlurMathML(x, y, orig, blur)}
              className="mt-4"
              note="高斯核中心权重最大，边缘权重小，平滑同时尽量保留结构。"
            />
          </TeachingCard>
        </div>
      );
    }

    if (cs === 'nms') {
      const suppressed = currentStep.nmsSuppressed ?? false;
      return (
        <div className="space-y-4">
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Canny 第 3 步: 非极大值抑制 (NMS)</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  沿梯度方向比较相邻像素的梯度幅值，仅保留局部最大值，将宽边缘细化为单像素宽。
                </p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-medium ${
                suppressed ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                {suppressed ? '已抑制' : '已保留'}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">当前像素</div>
                <div className="mt-1 font-mono text-sm text-slate-800">
                  幅值 {fmtPx(magnitude)}，方向 {dirDeg}&deg;
                </div>
              </div>
              <div className={`rounded-xl border p-3 ${
                suppressed ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50'
              }`}>
                <div className="text-xs font-semibold text-slate-600">判断结果</div>
                <div className={`mt-1 font-mono text-sm font-bold ${suppressed ? 'text-slate-500' : 'text-emerald-700'}`}>
                  {suppressed ? '非最大值 -> 0' : '局部最大 -> 保留'}
                </div>
              </div>
            </div>
            <FormulaCard
              mathML={buildNmsMathML(x, y, suppressed, magnitude)}
              className="mt-4"
              note="梯度方向被量化为 0°/45°/90°/135° 四个方向，沿对应方向比较相邻像素。"
            />
          </TeachingCard>
        </div>
      );
    }

    if (cs === 'threshold') {
      const ec = currentStep.edgeClass ?? 0;
      const edgeLabel = ec === 2 ? '强边缘 (直接保留)' : ec === 1 ? '弱边缘 (需连通)' : '非边缘 (丢弃)';
      const edgeIconColor = ec === 2 ? 'text-emerald-600' : ec === 1 ? 'text-amber-600' : 'text-slate-400';
      return (
        <div className="space-y-4">
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Canny 第 4 步: 双阈值分类</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  双阈值只负责把 NMS 后的像素分为强边缘、弱边缘候选和非边缘；弱边缘是否保留由下一步连通性判断决定。
                </p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-medium ${edgeIconColor.replace('text-', 'border-').replace('600', '200')} ${edgeIconColor.replace('text-', 'bg-').replace('600', '50')} ${edgeIconColor}`}>
                {edgeLabel}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs font-semibold text-emerald-600">强边缘</div>
                <div className="mt-1 font-mono text-sm text-emerald-800">
                  {'>'} {highThreshold}/255
                </div>
                <div className="mt-1 text-[10px] text-emerald-600">直接保留</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-600">弱边缘</div>
                <div className="mt-1 font-mono text-sm text-amber-800">
                  {lowThreshold}/255 ~ {highThreshold}/255
                </div>
                <div className="mt-1 text-[10px] text-amber-600">进入下一步判断</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">非边缘</div>
                <div className="mt-1 font-mono text-sm text-slate-800">
                  {'<'} {lowThreshold}/255
                </div>
                <div className="mt-1 text-[10px] text-slate-500">直接丢弃</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              当前分类结果尚不是最终边缘图；第 5 步会从强边缘出发追踪 8-邻域内连通的弱边缘。
            </p>
          </TeachingCard>
        </div>
      );
    }

    if (cs === 'tracking') {
      const ec = currentStep.edgeClass ?? 0;
      const connected = currentStep.edgeConnected ?? false;
      const sourceLabel = ec === 2 ? '强边缘' : ec === 1 ? '弱边缘候选' : '非边缘';
      const resultLabel = connected ? '最终保留为边缘' : '最终丢弃';

      return (
        <div className="space-y-4">
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Canny 第 5 步: 边缘连接</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  从强边缘出发追踪 8-邻域内连通的弱边缘候选。连通的弱边缘被补入最终边缘图，孤立弱响应被视为噪声并丢弃。
                </p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-medium ${
                connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                {resultLabel}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">双阈值分类</div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-800">{sourceLabel}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-700">连接规则</div>
                <div className="mt-1 text-xs leading-5 text-amber-800">
                  强边缘直接保留；弱边缘需要与强边缘连通。
                </div>
              </div>
              <div className={`rounded-xl border p-3 ${
                connected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="text-xs font-semibold text-slate-600">最终输出</div>
                <div className={`mt-1 font-mono text-sm font-bold ${
                  connected ? 'text-emerald-700' : 'text-slate-500'
                }`}>
                  {connected ? '1 / 边缘' : '0 / 非边缘'}
                </div>
              </div>
            </div>
          </TeachingCard>
        </div>
      );
    }

    // ---- 通用梯度算子详情 (Roberts / Sobel / Prewitt / Laplace / Canny gradient) ----

    const mainFormulaMathML = operator === 'laplace'
      ? buildLaplaceMathML(x, y, gxValue)
      : buildGradientMagMathML(x, y, gxValue, gyValue, magnitude);
    const directionFormulaMathML = operator === 'laplace'
      ? null
      : buildGradientDirMathML(x, y, gyValue, gxValue, direction);

    return (
      <div className="space-y-4">
        {/* 步骤说明卡片 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {operator === 'laplace'
                  ? 'Laplace 二阶边缘检测'
                  : `${kernelInfo.label} 梯度计算`}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                当前位置 ({x}, {y}) 的 {kernelSize}×{kernelSize} 邻域内进行
                {operator === 'laplace' ? '二阶微分' : '一阶梯度'}计算。
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              幅值 {fmtPx(magnitude)}
            </div>
          </div>

          <FormulaCard
            mathML={mainFormulaMathML}
            className="mx-auto mt-4 max-w-4xl"
            mathClassName="[&_math]:text-lg sm:[&_math]:text-xl"
          />
          {directionFormulaMathML && (
            <FormulaCard
              mathML={directionFormulaMathML}
              className="mx-auto mt-3 max-w-4xl"
              mathClassName="[&_math]:text-base sm:[&_math]:text-lg"
            />
          )}
          <p className="mt-2 text-xs leading-6 text-slate-600">
            {operator === 'laplace'
              ? `当前窗口与 Laplace 核逐项相乘后求和，得到二阶微分响应 ${fmtPx(gxValue)}；结果图用其绝对值 ${fmtPx(magnitude)} 表示边缘强度。`
              : `当前窗口中，将输入邻域与 Gx / Gy 核分别卷积，得到水平梯度 ${fmtPx(gxValue)} 和垂直梯度 ${fmtPx(gyValue)}；最终幅值为两者平方和的平方根。`}
          </p>
        </TeachingCard>

        {/* 核矩阵与计算展开 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">邻域与核矩阵展开</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                下面对应左侧流程的三列：输入邻域（红色）、核矩阵（琥珀色）、梯度输出（翠绿色）。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {operator !== 'laplace' ? 'Gx + Gy' : 'Laplace'} 展开
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,0.8fr)]">
            {/* 输入邻域 */}
            <div className="rounded-2xl border border-red-200 bg-red-50/55 p-3">
              <div className="text-sm font-semibold text-red-700">
                输入邻域 ({kernelSize}×{kernelSize})
              </div>
              <div className="mt-1 text-[11px] text-red-600">
                第 {y + 1}-{y + kernelSize} 行 / 第 {x + 1}-{x + kernelSize} 列
              </div>
              <div
                className="mt-3 inline-grid gap-1"
                style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
              >
                {inputRegion.map((row, ry) =>
                  row.map((val, rx) => (
                    <div
                      key={`detail-input-${ry}-${rx}`}
                      className={`flex h-9 w-9 items-center justify-center rounded border font-mono text-xs ${
                        (kernelSize === 3 && rx === 1 && ry === 1) || (kernelSize === 2 && rx === 0 && ry === 0)
                          ? 'border-red-400 bg-white text-red-700 font-bold'
                          : 'border-red-200 bg-white/90 text-slate-700'
                      }`}
                    >
                      {fmtPx(val)}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 核矩阵 */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-3">
              <div className="text-sm font-semibold text-amber-800">
                {operator === 'laplace' ? 'Laplace 核' : `${kernelInfo.label} 核`}
              </div>
              <div className="mt-1 text-[11px] text-amber-700">与输入逐项对应相乘</div>
              {showKernel && (
                <div className="mt-3 space-y-3">
                  {operator !== 'laplace' ? (
                    <>
                      <div>
                        <div className="text-[10px] font-medium text-amber-700 mb-1">Gx 核</div>
                        <div
                          className="inline-grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                        >
                          {gxKernel!.map((row, ry) =>
                            row.map((val, rx) => (
                              <div
                                key={`detail-gx-${ry}-${rx}`}
                                className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-xs ${
                                  (kernelSize === 3 && rx === 1 && ry === 1) || (kernelSize === 2 && rx === 0 && ry === 0)
                                    ? 'border-amber-400 bg-white text-amber-800 font-bold'
                                    : 'border-amber-200 bg-white/90 text-slate-700'
                                }`}
                              >
                                {fmtK(val)}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-amber-700 mb-1">Gy 核</div>
                        <div
                          className="inline-grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                        >
                          {gyKernel!.map((row, ry) =>
                            row.map((val, rx) => (
                              <div
                                key={`detail-gy-${ry}-${rx}`}
                                className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-xs ${
                                  (kernelSize === 3 && rx === 1 && ry === 1) || (kernelSize === 2 && rx === 0 && ry === 0)
                                    ? 'border-amber-400 bg-white text-amber-800 font-bold'
                                    : 'border-amber-200 bg-white/90 text-slate-700'
                                }`}
                              >
                                {fmtK(val)}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className="inline-grid gap-1"
                      style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                    >
                      {gxKernel!.map((row, ry) =>
                        row.map((val, rx) => (
                          <div
                            key={`detail-k-${ry}-${rx}`}
                            className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-xs ${
                              rx === 1 && ry === 1
                                ? 'border-amber-400 bg-white text-amber-800 font-bold'
                                : 'border-amber-200 bg-white/90 text-slate-700'
                            }`}
                          >
                            {fmtK(val)}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 逐项乘积 (天蓝色) - 仅 3x3 且非 Laplace 时展示 */}
            {kernelSize === 3 && operator !== 'laplace' && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/55 p-3">
                <div className="text-sm font-semibold text-sky-800">逐项乘积 (Gx)</div>
                <div className="mt-1 text-[11px] text-sky-700">每格: pixel × weight</div>
                <div
                  className="mt-3 inline-grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(3, minmax(0, 1fr))` }}
                >
                  {inputRegion.map((row, ry) =>
                    row.map((val, rx) => {
                      const weight = gxKernel![ry][rx];
                      const product = val * weight;
                      return (
                        <div
                          key={`detail-prod-${ry}-${rx}`}
                          title={`${fmtPx(val)} × ${weight} = ${fmtPx(product)}`}
                          className={`flex flex-col items-center justify-center rounded-xl border px-1 py-1 text-center font-mono ${
                            rx === 1 && ry === 1
                              ? 'border-sky-400 bg-white text-sky-800'
                              : 'border-sky-200 bg-white/90 text-slate-700'
                          }`}
                        >
                          <span className="text-[9px] leading-none text-slate-500">
                            {fmtPx(val)}×{weight}
                          </span>
                          <span className="mt-0.5 text-[10px] font-semibold leading-none text-sky-800">
                            ={fmtPx(product)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 输出结果 (翠绿色) */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3">
              <div className="text-sm font-semibold text-emerald-800">梯度输出</div>
              <div className="mt-3 space-y-3">
                {operator !== 'laplace' && (
                  <>
                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                      <div className="text-[10px] text-emerald-600">水平梯度 Gx</div>
                      <div className="font-mono text-lg font-bold text-emerald-700">{fmtPx(gxValue)}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                      <div className="text-[10px] text-emerald-600">垂直梯度 Gy</div>
                      <div className="font-mono text-lg font-bold text-emerald-700">{fmtPx(gyValue)}</div>
                    </div>
                  </>
                )}
                <div className="rounded-xl border-2 border-emerald-400 bg-white px-3 py-2">
                  <div className="text-[10px] text-emerald-600 font-semibold">梯度幅值</div>
                  <div className="font-mono text-2xl font-bold text-emerald-700">{fmtPx(magnitude)}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {operator === 'laplace' ? '|∇²f|' : '√(Gx² + Gy²)'}
                  </div>
                </div>
                {operator !== 'laplace' && (
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-emerald-600">梯度方向</div>
                    <div className="font-mono text-sm font-bold text-emerald-700">{dirDeg}&deg;</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TeachingCard>

        {/* 算子对比卡片 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">各算子对比</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                切换左侧算子下拉框，对比不同边缘检测方法的特点。
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {([
              { key: 'roberts', name: 'Roberts', size: '2×2', desc: '对角差分', pros: '计算最快', cons: '对噪声敏感' },
              { key: 'sobel', name: 'Sobel', size: '3×3', desc: '加权差分', pros: '抗噪较好', cons: '边缘较粗' },
              { key: 'prewitt', name: 'Prewitt', size: '3×3', desc: '简单差分', pros: '实现简单', cons: '权重均等' },
              { key: 'laplace', name: 'Laplace', size: '3×3', desc: '二阶微分', pros: '方向无关', cons: '噪声敏感' },
              { key: 'canny', name: 'Canny', size: '多阶段', desc: '最优检测', pros: '细/连续', cons: '计算复杂' },
            ] as const).map(op => (
              <div
                key={op.key}
                className={`rounded-xl border px-2.5 py-2 text-xs ${
                  operator === op.key
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`font-semibold ${operator === op.key ? 'text-blue-700' : 'text-slate-700'}`}>
                  {op.name}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {op.size} / {op.desc}
                </div>
                <div className="mt-1 flex gap-2 text-[10px]">
                  <span className="text-emerald-600">+{op.pros}</span>
                  <span className="text-red-500">-{op.cons}</span>
                </div>
              </div>
            ))}
          </div>
        </TeachingCard>
      </div>
    );
  }, [currentStep, operator, kernelInfo, highThreshold, lowThreshold]);

  // ---- AnchoredOverlay ----
  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (!currentStep) return [];
    return [
      {
        id: 'input-region',
        tone: 'red',
        from: {
          kind: 'region',
          selector: '.conv-anchor-input-main',
          x: currentStep.x,
          y: currentStep.y,
          size: currentStep.kernelSize || 3,
          imageWidth: imgWidth,
          imageHeight: imgHeight,
        },
        to: { kind: 'element', selector: '.conv-anchor-window-zoom' },
      },
      {
        id: 'operator-to-output',
        tone: 'amber',
        from: { kind: 'element', selector: '.conv-anchor-main-operator' },
        to: { kind: 'element', selector: '.conv-anchor-kernel-node' },
      },
      {
        id: 'output-write',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: currentStep.x,
          y: currentStep.y,
          imageWidth: resultImage?.[0]?.length ?? imgWidth,
          imageHeight: resultImage?.length ?? imgHeight,
        },
        to: { kind: 'element', selector: '.conv-anchor-output-node' },
      },
    ];
  }, [currentStep, imgWidth, imgHeight, resultImage]);

  const visualOverlay = visualOverlayPaths.length > 0 ? (
    <AnchoredOverlay paths={visualOverlayPaths} />
  ) : null;

  // ---- 参数面板 ----
  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="示例图像"
        value={imageType}
        onChange={v => setImageType(v as SampleImageType)}
        options={Object.entries(sampleImages).map(([key, { name }]) => ({
          value: key,
          label: name,
        }))}
      />

      <SelectParam
        label="边缘检测算子"
        value={operator}
        onChange={v => setOperator(v as EdgeOperator)}
        options={[
          { value: 'roberts', label: 'Roberts 算子' },
          { value: 'sobel', label: 'Sobel 算子' },
          { value: 'prewitt', label: 'Prewitt 算子' },
          { value: 'laplace', label: 'Laplace 算子' },
          { value: 'canny', label: 'Canny 边缘检测' },
        ]}
      />

      {operator === 'laplace' && (
        <SelectParam
          label="Laplace 邻域类型"
          value={laplaceVariant}
          onChange={v => setLaplaceVariant(v as LaplaceVariant)}
          options={[
            { value: '4-neighbor', label: '4-邻域 Laplace' },
            { value: '8-neighbor', label: '8-邻域 Laplace' },
          ]}
        />
      )}

      {operator === 'canny' && (
        <>
          <SelectParam
            label="Canny 阶段"
            value={cannyStage}
            onChange={v => setCannyStage(v as CannyStage)}
            options={CANNY_STAGES.map(s => ({
              value: s.key,
              label: `${s.label} — ${s.description}`,
            }))}
          />

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3">
            <div className="text-xs font-semibold text-amber-800">Canny 阶段流程</div>
            <div className="mt-2 space-y-1.5">
              {CANNY_STAGES.map((stage, idx) => (
                <div
                  key={stage.key}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                    cannyStage === stage.key
                      ? 'border border-amber-300 bg-white text-amber-800 font-semibold'
                      : 'border border-transparent text-slate-500 hover:bg-white/50'
                  }`}
                  onClick={() => setCannyStage(stage.key)}
                >
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                    cannyStage === stage.key
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>
          </div>

          <SliderParam
            label="低阈值"
            value={lowThreshold}
            onChange={setLowThreshold}
            min={10}
            max={100}
            step={5}
          />

          <SliderParam
            label="高阈值"
            value={highThreshold}
            onChange={setHighThreshold}
            min={50}
            max={200}
            step={5}
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
            <p>高阈值确定强边缘（直接保留）；低阈值用于弱边缘筛选。</p>
            <p className="mt-1">梯度幅值 &gt; 高阈值 = 强边缘；介于两者之间 = 弱边缘（需连通强边缘才保留）；&lt; 低阈值 = 丢弃。</p>
          </div>
        </>
      )}
    </div>
  );

  // ---- 算子操作标签 ----
  const operationLabel = operator === 'laplace'
    ? '二阶微分'
    : operator === 'canny'
    ? 'Canny 流程'
    : '梯度计算';

  return (
    <ConceptLayout
      title="边缘检测"
      subtitle="Edge Detection - 梯度算子与 Canny 边缘检测算法"
      operationLabel={operationLabel}
      parameterIntro="切换边缘检测算子，观察不同方法的效果。Canny 支持分阶段可视化每一步输出。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      visualOverlay={visualOverlay}
      analysisPreview={analysisPreview}
      showOriginalGrid={imageType !== 'lena'}
      originalRegionMarker={imageType === 'lena' ? 'dot' : 'frame'}
      imageHints={{
        input: imageType === 'lena'
          ? `红点定位当前中心像素；下方展开实际参与计算的 ${currentStep?.kernelSize ?? 3}×${currentStep?.kernelSize ?? 3} 邻域。`
          : `红框定位当前参与计算的 ${currentStep?.kernelSize ?? 3}×${currentStep?.kernelSize ?? 3} 输入窗口，可点击原图调整位置`,
        output: '绿框对应结果图中的当前像素，可点击结果图直接定位',
      }}
      navigationHintText="方向键移动 / 点击原图或结果图跳转"
      singlePageScroll
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: activeCode }]} />}
      currentStep={
        currentStep
          ? { x: currentStep.x, y: currentStep.y, kernelSize: currentStep.kernelSize || 3 }
          : null
      }
      stepInfo={totalSteps > 0 ? { current: safeStepIndex, total: totalSteps } : null}
      onDirectionMove={handleDirectionMove}
    />
  );
}

// ---- 提取输入邻域 ----

function extractInputRegion(
  image: GrayscaleImage,
  cx: number,
  cy: number,
  size: number
): number[][] {
  const half = Math.floor(size / 2);
  const region: number[][] = [];
  for (let ky = -half; ky <= half; ky++) {
    const row: number[] = [];
    for (let kx = -half; kx <= half; kx++) {
      row.push(safeGet(image, cx + kx, cy + ky));
    }
    region.push(row);
  }
  return region;
}
