'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  AnchoredOverlay,
  type AnchoredOverlayPath,
  ConceptLayout,
  CodeViewer,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ImageCanvas,
  MathText,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  boxBlur,
  gaussianBlur,
  medianFilter,
  sideWindowFilter,
  boxBlurSteps,
  gaussianBlurSteps,
  medianFilterSteps,
  sideWindowFilterSteps,
  addSaltPepperNoise,
  addGaussianNoise,
} from '@/lib/algorithms/blur';
import type { BlurStep, SideWindowStep } from '@/lib/algorithms/blur';
import type { GrayscaleImage } from '@/lib/algorithms/types';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';

// ========== 类型定义 ==========

type FilterMethod = 'box' | 'gaussian' | 'median' | 'sidewindow';
type NoiseType = 'none' | 'saltpepper' | 'gaussian';
type TeachingImageType = SampleImageType | 'stepEdge' | 'rampEdge' | 'roofEdge';

const EDGE_EXAMPLE_LABELS: Record<Exclude<TeachingImageType, SampleImageType>, string> = {
  stepEdge: '阶跃边缘',
  rampEdge: '斜坡边缘',
  roofEdge: '屋顶边缘',
};

// ========== 示例代码 ==========

const BOX_BLUR_CODE_TS = `function boxBlur(image: number[][], kernelSize: number): number[][] {
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          sum += image[py][px];
          count++;
        }
      }
      result[y][x] = sum / count;
    }
  }
  return result;
}`;

const GAUSSIAN_BLUR_CODE_TS = `function gaussianBlur(image: number[][], kernelSize: number, sigma: number): number[][] {
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);

  // 创建高斯核
  const kernel: number[][] = [];
  let sum = 0;
  for (let y = -half; y <= half; y++) {
    const row: number[] = [];
    for (let x = -half; x <= half; x++) {
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(val);
      sum += val;
    }
    kernel.push(row);
  }
  // 归一化
  for (let y = 0; y < kernel.length; y++)
    for (let x = 0; x < kernel[y].length; x++)
      kernel[y][x] /= sum;

  // 卷积
  const result = create2DArray(height, width, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let ky = -half; ky <= half; ky++)
        for (let kx = -half; kx <= half; kx++)
          val += image[clamp(y + ky, 0, height - 1)][clamp(x + kx, 0, width - 1)] * kernel[ky + half][kx + half];
      result[y][x] = val;
    }
  }
  return result;
}`;

const MEDIAN_CODE_TS = `function medianFilter(image: number[][], kernelSize: number): number[][] {
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values: number[] = [];
      for (let ky = -half; ky <= half; ky++)
        for (let kx = -half; kx <= half; kx++)
          values.push(image[clamp(y + ky, 0, height - 1)][clamp(x + kx, 0, width - 1)]);

      // 排序后取中位数
      values.sort((a, b) => a - b);
      result[y][x] = values[Math.floor(values.length / 2)];
    }
  }
  return result;
}`;

const SIDEWINDOW_CODE_TS = `function sideWindowFilter(image: number[][], kernelSize: number): number[][] {
  const h = image.length, w = image[0].length;
  const half = Math.floor(kernelSize / 2);
  // 创建8个方向侧窗核 (NW/NE/SW/SE/U/D/L/R)
  const sideWindows = createSideWindowKernels(kernelSize);
  const result = create2DArray(h, w, 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 收集 kernelSize × kernelSize 邻域
      const nb: number[][] = [];
      for (let ky = -half; ky <= half; ky++) {
        const row: number[] = [];
        for (let kx = -half; kx <= half; kx++)
          row.push(image[clamp(y+ky,0,h-1)][clamp(x+kx,0,w-1)]);
        nb.push(row);
      }

      // 8个方向分别计算均值，选择最接近原值的候选
      const center = image[y][x];
      let bestVal = center, bestDiff = Infinity;
      for (const sw of sideWindows) {
        let sum = 0;
        for (let ky = 0; ky < kernelSize; ky++)
          for (let kx = 0; kx < kernelSize; kx++)
            sum += nb[ky][kx] * sw.kernel[ky][kx];
        const diff = (sum - center) ** 2;
        if (diff < bestDiff) { bestDiff = diff; bestVal = sum; }
      }
      result[y][x] = bestVal;
    }
  }
  return result;
}`;

// ========== 格式辅助函数 ==========

function formatPixelValue(value: number): string {
  return value < 0.01 ? value.toExponential(1) : value.toFixed(2);
}

function createEdgeTeachingImage(type: Exclude<TeachingImageType, SampleImageType>): GrayscaleImage {
  const size = 64;
  return Array.from({ length: size }, () => {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      if (type === 'stepEdge') {
        row.push(x < size / 2 ? 0.18 : 0.82);
        continue;
      }

      if (type === 'rampEdge') {
        const t = Math.max(0, Math.min(1, (x - 18) / 28));
        row.push(0.18 + t * 0.64);
        continue;
      }

      const center = size / 2;
      const distance = Math.abs(x - center) / center;
      row.push(0.18 + (1 - distance) * 0.64);
    }
    return row;
  });
}

function getTeachingImage(type: TeachingImageType): GrayscaleImage {
  if (type === 'stepEdge' || type === 'rampEdge' || type === 'roofEdge') {
    return createEdgeTeachingImage(type);
  }

  return sampleImages[type].image;
}

function getTeachingImageOptions() {
  return [
    ...Object.entries(sampleImages).map(([key, item]) => ({
      value: key,
      label: item.name,
    })),
    ...Object.entries(EDGE_EXAMPLE_LABELS).map(([value, label]) => ({ value, label })),
  ];
}

function FormulaLine({
  mathML,
  className = '',
  mathClassName = '[&_math]:text-[0.92rem]',
}: {
  mathML: string;
  className?: string;
  mathClassName?: string;
}) {
  return (
    <div className={`leading-7 ${className}`}>
      <MathText mathML={mathML} className={`[&_math]:inline-block ${mathClassName}`} />
    </div>
  );
}

function InlineFormula({ mathML, className = '' }: { mathML: string; className?: string }) {
  return (
    <MathText
      mathML={mathML}
      className={`align-middle [&_math]:inline-block [&_math]:text-[0.82rem] ${className}`}
    />
  );
}

function gAt(x: number, y: number): string {
  return `<mi>g</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>`;
}

function numberNode(value: number | string): string {
  return `<mn>${value}</mn>`;
}

function coordinateMathML(x: number, y: number): string {
  return buildInlineMathML(`
    <mrow><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo></mrow>
  `);
}

function productMathML(value: number, weight: number, product: number): string {
  return buildInlineMathML(`
    <mrow>
      ${numberNode(formatPixelValue(value))}
      <mo>×</mo>
      ${numberNode(formatPixelValue(weight))}
      <mo>=</mo>
      ${numberNode(product.toFixed(2))}
    </mrow>
  `);
}

function medianIndexMathML(index: number, value: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>median</mi>
      <mo>=</mo>
      <mi>values</mi><mo>[</mo><mn>${index}</mn><mo>]</mo>
      <mo>=</mo>
      ${numberNode(value.toFixed(2))}
    </mrow>
  `);
}

function getCellClass(size: number): string {
  if (size >= 7) return 'w-7 h-7 text-[9px]';
  if (size >= 5) return 'w-8 h-8 text-[10px]';
  return 'w-9 h-9 text-[11px]';
}

function getSwCellClass(size: number): string {
  if (size >= 7) return 'w-4 h-4 text-[6px]';
  if (size >= 5) return 'w-5 h-5 text-[7px]';
  return 'w-6 h-6 text-[8px]';
}

function buildBoxFormulaMathML(x: number, y: number, outputValue: number): string {
  return buildInlineMathML(`
    <mrow>
      ${gAt(x, y)}
      <mo>=</mo>
      <mfrac><mn>1</mn><mi>M</mi></mfrac>
      <munder><mo>&#8721;</mo><mrow><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>&#x2208;</mo><mi>S</mi></mrow></munder>
      <mi>f</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>i</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>j</mi><mo>)</mo>
      <mo>=</mo>
      ${numberNode(outputValue.toFixed(2))}
    </mrow>
  `);
}

function buildGaussianFormulaMathML(x: number, y: number, outputValue: number): string {
  return buildInlineMathML(`
    <mrow>
      ${gAt(x, y)}
      <mo>=</mo>
      <munder><mo>&#8721;</mo><mi>i</mi></munder>
      <munder><mo>&#8721;</mo><mi>j</mi></munder>
      <mi>f</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>i</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>j</mi><mo>)</mo>
      <mo>&#x22C5;</mo>
      <mi>h</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>;</mo><mi>&#963;</mi><mo>)</mo>
      <mo>=</mo>
      ${numberNode(outputValue.toFixed(2))}
    </mrow>
  `);
}

function buildMedianFormulaMathML(x: number, y: number, outputValue: number): string {
  return buildInlineMathML(`
    <mrow>
      ${gAt(x, y)}
      <mo>=</mo>
      <mi>med</mi>
      <mo>{</mo>
      <msub><mi>S</mi><mi>f</mi></msub>
      <mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>}</mo>
      <mo>=</mo>
      ${numberNode(outputValue.toFixed(2))}
    </mrow>
  `);
}

function buildSideWindowFormulaMathML(x: number, y: number, outputValue: number): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>I</mi><mi>m</mi></msub>
      <mo>=</mo>
      <msub><mi>I</mi><mrow><mi>&#952;</mi><mo>*</mo></mrow></msub>
      <mo>,</mo>
      <mrow>
        <mi>&#952;</mi><mo>*</mo>
        <mo>=</mo>
        <munder><mi>argmin</mi><mi>&#952;</mi></munder>
        <msup>
          <mrow><mo>(</mo><msub><mi>q</mi><mi>ij</mi></msub><mo>-</mo><msub><mi>I</mi><mi>&#952;</mi></msub><mo>)</mo></mrow>
          <mn>2</mn>
        </msup>
      </mrow>
      <mo>=</mo>
      ${numberNode(outputValue.toFixed(2))}
    </mrow>
  `);
}

function buildGaussianTemplateMathML(): string {
  return buildInlineMathML(`
    <mrow>
      <mi>H</mi>
      <mo>=</mo>
      <mfrac><mn>1</mn><mn>16</mn></mfrac>
      <mo>[</mo>
      <mtable>
        <mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd><mtd><mn>1</mn></mtd></mtr>
        <mtr><mtd><mn>2</mn></mtd><mtd><mn>4</mn></mtd><mtd><mn>2</mn></mtd></mtr>
        <mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
      <mo>]</mo>
    </mrow>
  `);
}

// ========== 页面组件 ==========

export default function BlurPage() {
  const [imageType, setImageType] = useState<TeachingImageType>('lena');
  const [method, setMethod] = useState<FilterMethod>('box');
  const [kernelSize, setKernelSize] = useState(3);
  const [sigma, setSigma] = useState(1.0);
  const [noiseType, setNoiseType] = useState<NoiseType>('none');
  const lenaImage = useLenaGrayscaleImage(96);

  const cleanImage = useMemo(() => {
    if (imageType === 'lena' && lenaImage) return lenaImage;
    return getTeachingImage(imageType);
  }, [imageType, lenaImage]);
  const imageWidth = cleanImage[0]?.length ?? 0;
  const imageHeight = cleanImage.length;
  const totalSteps = imageWidth * imageHeight;

  // 添加噪声后的原始图像
  const originalImage = useMemo(() => {
    switch (noiseType) {
      case 'saltpepper':
        return addSaltPepperNoise(cleanImage, 0.05);
      case 'gaussian':
        return addGaussianNoise(cleanImage, 0.08);
      default:
        return cleanImage;
    }
  }, [cleanImage, noiseType]);

  // 滤波结果
  const resultImage = useMemo(() => {
    switch (method) {
      case 'box':
        return boxBlur(originalImage, kernelSize);
      case 'gaussian':
        return gaussianBlur(originalImage, kernelSize, sigma);
      case 'median':
        return medianFilter(originalImage, kernelSize);
      case 'sidewindow':
        return sideWindowFilter(originalImage, kernelSize);
      default:
        return originalImage;
    }
  }, [originalImage, method, kernelSize, sigma]);

  // 预生成所有步骤
  const steps = useMemo(() => {
    switch (method) {
      case 'box':
        return Array.from(boxBlurSteps(originalImage, kernelSize));
      case 'gaussian':
        return Array.from(gaussianBlurSteps(originalImage, kernelSize, sigma));
      case 'median':
        return Array.from(medianFilterSteps(originalImage, kernelSize));
      default:
        return [];
    }
  }, [originalImage, method, kernelSize, sigma]);

  // 边窗滤波步骤（单独存储，结构不同）
  const swSteps = useMemo(() => {
    if (method !== 'sidewindow') return [];
    return Array.from(sideWindowFilterSteps(originalImage, kernelSize));
  }, [originalImage, method, kernelSize]);

  // 当前像素位置
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const currentStepIndex = currentPosition.y * imageWidth + currentPosition.x;

  // 当前步骤数据
  const currentStep = useMemo<BlurStep | null>(() => {
    if (method === 'sidewindow' || steps.length === 0) return null;
    return steps[currentStepIndex] ?? null;
  }, [method, steps, currentStepIndex]);

  const currentSwStep = useMemo<SideWindowStep | null>(() => {
    if (method !== 'sidewindow' || swSteps.length === 0) return null;
    return swSteps[currentStepIndex] ?? null;
  }, [method, swSteps, currentStepIndex]);

  // 网格导航
  const handleDirectionMove = useGridNavigation({
    current: currentPosition,
    bounds: { width: imageWidth, height: imageHeight },
    onMove: setCurrentPosition,
    disabled: totalSteps === 0,
  });

  // 点击图像跳转
  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      setCurrentPosition({
        x: Math.max(0, Math.min(x, imageWidth - 1)),
        y: Math.max(0, Math.min(y, imageHeight - 1)),
      });
    },
    [imageWidth, imageHeight]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      setCurrentPosition({
        x: Math.max(0, Math.min(x, imageWidth - 1)),
        y: Math.max(0, Math.min(y, imageHeight - 1)),
      });
    },
    [imageWidth, imageHeight]
  );

  // 参数变更时重置位置
  const handleMethodChange = useCallback((value: string) => {
    setMethod(value as FilterMethod);
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handleKernelSizeChange = useCallback((value: number) => {
    setKernelSize(value);
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handleSigmaChange = useCallback((value: number) => {
    setSigma(value);
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handleImageTypeChange = useCallback((value: string) => {
    setImageType(value as TeachingImageType);
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handleNoiseTypeChange = useCallback((value: string) => {
    setNoiseType(value as NoiseType);
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  // ========== stepDetails ==========

  const stepDetails = useMemo(() => {
    // 边窗滤波的渲染
    if (method === 'sidewindow') {
      if (!currentSwStep) {
        return <div className="py-8 text-center text-slate-400">请选择一个像素位置...</div>;
      }

      const { x, y, inputRegion, centerValue, candidates, selectedIndex, outputValue } = currentSwStep;
      const swCellClass = getSwCellClass(kernelSize);
      const half = Math.floor(kernelSize / 2);

      return (
        <div className="space-y-4">
          {/* 边窗滤波公式 */}
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">边窗滤波</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  边窗滤波不是一种独立的滤波器，而是一种窗口选择思想——它改变窗口位置，避免跨边缘混合。
                </p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                输出值 {outputValue.toFixed(2)}
              </div>
            </div>

            <FormulaCard
              mathML={buildSideWindowFormulaMathML(x, y, outputValue)}
              className="mx-auto mt-4 max-w-2xl"
              mathClassName="[&_math]:text-lg sm:[&_math]:text-xl"
              note="从8个方向候选值中选择与当前像素差异最小的作为输出，从而保留边缘方向。"
            />

            <div className="mt-3 space-y-2 text-xs leading-6 text-slate-600">
              <p>
                当前位置 <InlineFormula mathML={coordinateMathML(x, y)} />，
                中心像素值 <strong>{centerValue.toFixed(2)}</strong>。
                传统全窗口可能跨越边缘求均值导致边缘模糊；边窗滤波通过8个方向侧窗各自计算候选值，
                再选择与原始值最接近的候选作为输出。
              </p>
            </div>
          </TeachingCard>

          {/* 输入邻域 + 8个侧窗 */}
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">当前输入邻域与8方向侧窗</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  绿色高亮为被选中的最优方向侧窗。
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                选中方向: {candidates[selectedIndex]?.name ?? '-'}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
              {/* 输入邻域 */}
              <div className="rounded-2xl border border-red-200 bg-red-50/55 p-3">
                <div className="text-sm font-semibold text-red-700">输入邻域</div>
                <div className="mt-1 text-[11px] text-red-600">
                  第 {y + 1}-{y + kernelSize} 行 / 第 {x + 1}-{x + kernelSize} 列
                </div>
                <div className="mt-3">
                  <div
                    className="inline-grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                  >
                    {inputRegion.map((row, ry) =>
                      row.map((val, rx) => (
                        <div
                          key={`sw-input-${ry}-${rx}`}
                          className={`${getCellClass(kernelSize)} flex items-center justify-center rounded border font-mono ${
                            rx === half && ry === half
                              ? 'border-red-400 bg-white text-red-700 font-semibold'
                              : 'border-red-200 bg-white/90 text-slate-700'
                          }`}
                        >
                          {formatPixelValue(val)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 8个候选侧窗 */}
              <div className="grid grid-cols-4 gap-2">
                {candidates.map((candidate, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={candidate.name}
                      className={`rounded-xl border p-2 ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50/80 ring-1 ring-emerald-300'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className={`text-xs font-bold mb-1.5 text-center ${
                        isSelected ? 'text-emerald-700' : 'text-slate-600'
                      }`}>
                        {candidate.name}
                      </div>
                      {/* 权重矩阵 */}
                      <div
                        className="inline-grid gap-[2px] mx-auto"
                        style={{
                          gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))`,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {candidate.kernel.map((row, ry) =>
                          row.map((w, rx) => (
                            <div
                              key={`sw-${candidate.name}-${ry}-${rx}`}
                              className={`${swCellClass} flex items-center justify-center rounded border font-mono ${
                                w > 0
                                  ? isSelected
                                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-slate-100 bg-slate-50 text-slate-300'
                              }`}
                            >
                              {w > 0 ? formatPixelValue(w) : '0'}
                            </div>
                          ))
                        )}
                      </div>
                      {/* 候选值 */}
                      <div className={`mt-1.5 text-center font-mono text-xs font-semibold ${
                        isSelected ? 'text-emerald-700' : 'text-slate-600'
                      }`}>
                        {candidate.value.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TeachingCard>

          {/* 边窗滤波原理 */}
          <TeachingCard tone="amber">
            <div className="text-sm font-semibold text-slate-800">为什么边窗滤波能保边？</div>
            <div className="mt-3 grid gap-3 text-xs leading-6 text-slate-600 sm:grid-cols-3">
              <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                <div className="font-semibold text-amber-800">传统全窗口</div>
                <p className="mt-1 text-amber-700">
                  窗口围绕中心像素，可能同时包含边缘两侧的像素，求均值时混合了不同区域，导致边缘模糊。
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                <div className="font-semibold text-amber-800">侧窗策略</div>
                <p className="mt-1 text-amber-700">
                  8个侧窗各自只覆盖中心像素的一侧。如果当前像素恰好位于边缘上，
                  至少有一个侧窗完全落在同侧区域，避免跨边缘混合。
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="font-semibold text-emerald-700">选择规则</div>
                <p className="mt-1 text-emerald-600">
                  对8个候选值与原始像素值做差，选择差异最小的方向。
                  该方向最可能不含跨边缘像素，输出值保留边缘特征。
                </p>
              </div>
            </div>
          </TeachingCard>
        </div>
      );
    }

    // 线性滤波和中值滤波的渲染
    if (!currentStep) {
      return <div className="py-8 text-center text-slate-400">请选择一个像素位置...</div>;
    }

    const { x, y, inputRegion, kernel, outputValue, operation } = currentStep;
    const cellClass = getCellClass(kernelSize);
    const half = Math.floor(kernelSize / 2);
    const isMedian = operation === 'median';
    const isBox = operation === 'box';
    const sortedValues = isMedian ? [...inputRegion.flat()].sort((a, b) => a - b) : [];
    const medianIdx = Math.floor(sortedValues.length / 2);

    return (
      <div className="space-y-4">
        {/* 公式卡片 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {isBox ? '均值滤波' : isMedian ? '中值滤波' : '高斯滤波'} - 当前输出像素表达式
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                位置 <InlineFormula mathML={coordinateMathML(x, y)} /> 的滤波输出值
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              当前输出值 {outputValue.toFixed(2)}
            </div>
          </div>

          <FormulaCard
            mathML={
              isBox
                ? buildBoxFormulaMathML(x, y, outputValue)
                : isMedian
                  ? buildMedianFormulaMathML(x, y, outputValue)
                  : buildGaussianFormulaMathML(x, y, outputValue)
            }
            className="mx-auto mt-4 max-w-3xl"
            mathClassName="[&_math]:text-lg sm:[&_math]:text-xl"
          />

          {!isBox && !isMedian && kernelSize === 3 && (
            <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-amber-800">
                课程中的 3×3 高斯模板
              </div>
              <FormulaLine
                mathML={buildGaussianTemplateMathML()}
                className="text-amber-800"
                mathClassName="[&_math]:text-base sm:[&_math]:text-lg"
              />
            </div>
          )}

          <div className="mt-3 text-xs leading-6 text-slate-600">
            {isBox ? (
              <p>均值滤波对邻域内所有像素取等权平均，能抑制噪声但会削弱边缘和细节。</p>
            ) : isMedian ? (
              <p>中值滤波不进行加权求和，而是排序后取中位数，对椒盐噪声特别有效。</p>
            ) : (
              <p>高斯滤波中心权重大、远处权重小，比均值滤波更柔和地平滑图像。</p>
            )}
          </div>
        </TeachingCard>

        {/* 计算展开 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">公式在当前步骤中的具体代入</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                下面展示输入邻域、{isMedian ? '排序过程' : '权重矩阵与加权计算'}和输出结果。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              共 {kernelSize * kernelSize} 个邻域像素
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,0.8fr)]">
            {/* 输入邻域 */}
            <div className="rounded-2xl border border-red-200 bg-red-50/55 p-3">
              <div className="text-sm font-semibold text-red-700">输入邻域</div>
              <div className="mt-1 text-[11px] text-red-600">
                原图第 {y + 1}-{y + kernelSize} 行 / 第 {x + 1}-{x + kernelSize} 列
              </div>
              <div className="mt-3">
                <div
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {inputRegion.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`input-expanded-${ry}-${rx}`}
                        className={`${cellClass} flex flex-col items-center justify-center rounded border font-mono ${
                          rx === half && ry === half
                            ? 'border-red-400 bg-white text-red-700'
                            : 'border-red-200 bg-white/90 text-slate-700'
                        }${isMedian && val === sortedValues[medianIdx] ? ' ring-2 ring-amber-400' : ''}`}
                      >
                        {formatPixelValue(val)}
                      </div>
                    ))
                  )}
                </div>
              </div>
              {isMedian && (
                <div className="mt-1 text-[10px] text-amber-600 text-center">
                  黄色边框 = 中位数位置
                </div>
              )}
            </div>

            {/* 权重矩阵 / 排序结果 */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-3">
              <div className="text-sm font-semibold text-amber-800">
                {isBox ? '均值权重' : isMedian ? '排序结果' : '高斯权重'}
              </div>
              <div className="mt-1 text-[11px] text-amber-700">
                {isMedian ? '从小到大排列' : '与输入邻域逐格对齐'}
              </div>
              <div className="mt-3">
                {isMedian ? (
                  <div className="flex flex-wrap gap-1">
                    {sortedValues.map((v, i) => (
                      <span
                        key={i}
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                          i === medianIdx
                            ? 'bg-amber-200 text-amber-800 font-bold ring-2 ring-amber-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {formatPixelValue(v)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div
                    className="inline-grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                  >
                    {kernel.map((row, ry) =>
                      row.map((val, rx) => (
                        <div
                          key={`kernel-expanded-${ry}-${rx}`}
                          className={`${cellClass} flex items-center justify-center rounded border font-mono ${
                            rx === half && ry === half
                              ? 'border-amber-400 bg-white text-amber-800'
                              : 'border-amber-200 bg-white/90 text-slate-700'
                          }`}
                        >
                          {val < 0.01 ? val.toExponential(1) : val.toFixed(2)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {isMedian && (
                <div className="mt-1 text-[10px] text-amber-600">
                  <FormulaLine
                    mathML={medianIndexMathML(medianIdx, sortedValues[medianIdx])}
                    mathClassName="[&_math]:text-[0.72rem]"
                  />
                </div>
              )}
            </div>

            {/* 加权结果 / 跳过(中值) */}
            {!isMedian && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/55 p-3">
                <div className="text-sm font-semibold text-sky-800">加权结果</div>
                <div className="mt-1 text-[11px] text-sky-700">
                  逐格乘积
                </div>
                <div className="mt-3">
                  <div
                    className="inline-grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                  >
                    {inputRegion.map((row, ry) =>
                      row.map((val, rx) => {
                        const product = val * kernel[ry][rx];
                        return (
                          <div
                            key={`product-${ry}-${rx}`}
                            className={`${cellClass} flex flex-col items-center justify-center rounded border border-sky-200 bg-white/90 font-mono`}
                          >
                            <InlineFormula
                              mathML={productMathML(val, kernel[ry][rx], product)}
                              className="scale-75 text-slate-500"
                            />
                            <span className="font-semibold text-sky-700">{product.toFixed(2)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 输出结果 */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3">
              <div className="text-sm font-semibold text-emerald-800">输出结果</div>
              <div className="mt-1 text-[11px] text-emerald-700">
                位置 <InlineFormula mathML={coordinateMathML(x, y)} />
              </div>
              <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-3">
                <div className="text-[11px] text-emerald-600">
                  {isMedian ? '中位数输出' : isBox ? '均值输出' : '加权求和结果'}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                  {outputValue.toFixed(2)}
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  {isMedian
                    ? '排序后取中间位置的像素值直接写入'
                    : isBox
                      ? '全部邻域像素求平均值后写入'
                      : '全部加权乘积求和后写入'}
                  结果图第 {y + 1} 行、第 {x + 1} 列。
                </div>
              </div>
            </div>
          </div>
        </TeachingCard>

        {/* 对比说明 */}
        <TeachingCard tone="amber">
          <div className="text-sm font-semibold text-slate-800">
            {isBox ? '均值滤波特点' : isMedian ? '中值滤波 vs 均值滤波' : '高斯滤波特点'}
          </div>
          <div className="mt-3 grid gap-3 text-xs leading-6 text-slate-600 sm:grid-cols-2">
            {isBox ? (
              <>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="font-semibold text-amber-800">优点</div>
                  <p className="mt-1 text-amber-700">实现简单，计算速度快，能有效抑制高斯噪声。</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <div className="font-semibold text-red-600">缺点</div>
                  <p className="mt-1 text-red-500">所有像素等权参与，会削弱边缘和细节，窗口越大越明显。</p>
                </div>
              </>
            ) : isMedian ? (
              <>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="font-semibold text-amber-800">中值滤波</div>
                  <p className="mt-1 text-amber-700">
                    排序取中间值，椒盐噪声（极端值）会被排到两端从而被忽略，
                    对椒盐噪声效果远优于均值滤波。
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="font-semibold text-slate-700">均值滤波</div>
                  <p className="mt-1 text-slate-600">
                    取邻域平均值，椒盐噪声的极端值会参与平均并拉偏结果，
                    对高斯噪声效果更好。
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="font-semibold text-amber-800">中心加权</div>
                  <p className="mt-1 text-amber-700">
                    离中心越近权重越大，比均值滤波更自然地保留图像结构，
                    是图像处理中最常用的平滑方法。
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                  <div className="font-semibold text-blue-700">Sigma参数</div>
                  <p className="mt-1 text-blue-600">
                    sigma 控制权重的集中程度：sigma 越小，中心权重越大，平滑效果越弱；
                    sigma 越大，权重越均匀，越接近均值滤波。
                  </p>
                </div>
              </>
            )}
          </div>
        </TeachingCard>
      </div>
    );
  }, [currentStep, currentSwStep, method, kernelSize]);

  // ========== analysisPreview ==========

  const analysisPreview = useMemo(() => {
    if (method === 'sidewindow') {
      if (!currentSwStep) return null;

      const { x, y, inputRegion, candidates, selectedIndex, outputValue } = currentSwStep;
      const zoomDisplaySize = kernelSize >= 5 ? 112 : 140;

      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-red-700">输入窗口放大</span>
                  <span className="text-[11px] text-red-700">
                    第 {y + 1}-{y + kernelSize} 行 / 第 {x + 1}-{x + kernelSize} 列
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div>
                    <ImageCanvas
                      image={inputRegion}
                      maxDisplaySize={zoomDisplaySize}
                      showGrid
                      containerClassName="blur-anchor-window-zoom"
                    />
                    <div className="mt-1 text-center text-[10px] font-medium text-red-600">
                      放大后仍是 {kernelSize}×{kernelSize}
                    </div>
                  </div>
                </div>
              </FlowNode>

              <FlowNode tone="slate">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-slate-600">窗口摘要</span>
                  <span className="font-mono text-[11px] text-slate-500">{kernelSize}×{kernelSize}</span>
                </div>
                <div className="grid gap-2 text-xs text-slate-600">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    当前位置中心像素将参与8个方向侧窗的候选计算。
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[10px] text-slate-400">中心位置</div>
                      <div className="font-semibold text-slate-700">
                        第 {y + 1} 行，第 {x + 1} 列
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[10px] text-slate-400">窗口大小</div>
                      <div className="font-mono font-semibold text-slate-700">
                        {kernelSize}×{kernelSize}
                      </div>
                    </div>
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber" className="blur-anchor-compute-node">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-amber-800">8方向侧窗候选</span>
                  <span className="text-[11px] text-amber-700">选最近原值</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {candidates.map((c, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={c.name}
                        className={`rounded-lg border px-2 py-1.5 text-center ${
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold'
                            : 'border-amber-200 bg-white text-amber-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold">{c.name}</div>
                        <div className="mt-0.5 font-mono text-[11px]">{c.value.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              </FlowNode>

              <FlowNode tone="sky">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-sky-700">选择逻辑</span>
                  <InlineFormula
                    mathML={buildInlineMathML(`
                      <mrow>
                        <munder><mi>min</mi><mi>&#952;</mi></munder>
                        <msup>
                          <mrow><mo>(</mo><msub><mi>q</mi><mi>ij</mi></msub><mo>-</mo><msub><mi>I</mi><mi>&#952;</mi></msub><mo>)</mo></mrow>
                          <mn>2</mn>
                        </msup>
                      </mrow>
                    `)}
                    className="text-sky-700"
                  />
                </div>
                <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
                  对8个候选值各自计算与原像素值的平方差，取最小差异方向。
                  该方向最可能不含跨边缘像素。
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald" className="blur-anchor-output-node min-w-[12.75rem]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-emerald-700">写回结果图</span>
                  <span className="text-[11px] text-emerald-700">第 {y + 1} 行 / 第 {x + 1} 列</span>
                </div>
                <div className="grid gap-2">
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-emerald-600">对应右侧大图绿框</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-800">
                      结果图第 {y + 1} 行，第 {x + 1} 列
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600">
                      坐标 <InlineFormula mathML={coordinateMathML(x, y)} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">选中的候选值</div>
                    <div className="font-mono text-lg font-bold text-emerald-700">
                      {outputValue.toFixed(2)}
                    </div>
                    <div className="mt-1 text-[10px] leading-4 text-slate-500">
                      选中方向: {candidates[selectedIndex]?.name ?? '-'}，
                      该候选最接近原始像素值。
                    </div>
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // 线性滤波和中值滤波
    if (!currentStep) return null;

    const { x, y, inputRegion, kernel, outputValue, operation } = currentStep;
    const isMedian = operation === 'median';
    const half = Math.floor(kernelSize / 2);
    const centerPixel = inputRegion[half]?.[half] ?? 0;
    const sortedValues = isMedian ? [...inputRegion.flat()].sort((a, b) => a - b) : [];
    const medianIdx = Math.floor(sortedValues.length / 2);
    const zoomDisplaySize = kernelSize >= 5 ? 126 : Math.min(150, Math.max(112, kernelSize * 30));

    return (
      <ProcessRail>
        <FlowColumns>
          <FlowColumn align="start">
            <FlowNode tone="red">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-red-700">输入窗口放大</span>
                <span className="text-[11px] text-red-700">
                  第 {y + 1}-{y + kernelSize} 行 / 第 {x + 1}-{x + kernelSize} 列
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div>
                  <ImageCanvas
                    image={inputRegion}
                    maxDisplaySize={zoomDisplaySize}
                    showGrid
                    containerClassName="blur-anchor-window-zoom"
                  />
                  <div className="mt-1 text-center text-[10px] font-medium text-red-600">
                    放大 {kernelSize}×{kernelSize} 邻域
                  </div>
                </div>
              </div>
            </FlowNode>

            <FlowNode tone="slate">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-slate-600">窗口摘要</span>
                <span className="font-mono text-[11px] text-slate-500">{kernelSize}×{kernelSize}</span>
              </div>
              <div className="grid gap-2 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  当前窗口共 {kernelSize * kernelSize} 个像素，完整数值在下方矩阵区查看。
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-slate-400">中心位置</div>
                    <div className="font-semibold text-slate-700">
                      第 {y + 1} 行，第 {x + 1} 列
                    </div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-500">中心像素</div>
                    <div className="font-mono font-semibold text-red-700">
                      {formatPixelValue(centerPixel)}
                    </div>
                  </div>
                </div>
              </div>
            </FlowNode>
          </FlowColumn>

          <FlowColumn align="center">
            <FlowNode tone="amber" className="blur-anchor-compute-node">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-amber-800">
                  {isMedian ? '排序取中位数' : '权重矩阵'}
                </span>
                <span className="text-[11px] text-amber-700">
                  {isMedian ? '从小到大排列' : '逐格对齐'}
                </span>
              </div>
              {isMedian ? (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {sortedValues.map((v, i) => (
                    <span
                      key={i}
                      className={`text-[11px] font-mono px-2 py-1 rounded ${
                        i === medianIdx
                          ? 'bg-amber-200 text-amber-800 font-bold ring-2 ring-amber-400'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {formatPixelValue(v)}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {kernel.map((row, ry) =>
                    row.map((value, rx) => (
                      <div
                        key={`flow-kernel-${ry}-${rx}`}
                        className={`${getCellClass(kernelSize)} flex items-center justify-center rounded border font-mono ${
                          rx === half && ry === half
                            ? 'border-amber-400 bg-white text-amber-800 font-semibold'
                            : 'border-amber-200 bg-white/80 text-slate-700'
                        }`}
                      >
                        {value < 0.01 ? value.toExponential(1) : value.toFixed(2)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </FlowNode>

            {!isMedian && (
              <FlowNode tone="sky">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-sky-700">加权计算</span>
                  <span className="font-mono text-[11px] text-sky-700">
                    共 {kernelSize * kernelSize} 项
                  </span>
                </div>
                <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
                  输入与权重逐项相乘，再对全部乘积求和得到输出值。
                  <FormulaLine
                    mathML={productMathML(
                      centerPixel,
                      kernel[half]?.[half] ?? 0,
                      centerPixel * (kernel[half]?.[half] ?? 0)
                    )}
                    className="mt-1 text-sky-800"
                    mathClassName="[&_math]:text-[0.78rem]"
                  />
                </div>
              </FlowNode>
            )}
          </FlowColumn>

          <FlowColumn align="end">
            <FlowNode tone="emerald" className="blur-anchor-output-node min-w-[12.75rem]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-emerald-700">写回结果图</span>
                <span className="text-[11px] text-emerald-700">第 {y + 1} 行 / 第 {x + 1} 列</span>
              </div>
              <div className="grid gap-2">
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-emerald-600">对应右侧大图绿框</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-800">
                    结果图第 {y + 1} 行，第 {x + 1} 列
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-600">
                    坐标 <InlineFormula mathML={coordinateMathML(x, y)} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    {isMedian ? '中位数结果' : '求和/平均结果'}
                  </div>
                  <div className="font-mono text-lg font-bold text-emerald-700">
                    {outputValue.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">
                    {isMedian
                      ? '从排序序列中取出中间值写入此位置。'
                      : `全部 ${kernelSize * kernelSize} 项乘积的和写到这个位置。`}
                  </div>
                </div>
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [currentStep, currentSwStep, method, kernelSize]);

  // ========== visualOverlay (跨层连接线) ==========

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (method === 'sidewindow') {
      if (!currentSwStep) return [];
      const inputAnchor: AnchoredOverlayPath['from'] = imageType === 'lena'
        ? {
            kind: 'pixel',
            selector: '.conv-anchor-input-main',
            x: currentSwStep.x,
            y: currentSwStep.y,
            imageWidth,
            imageHeight,
          }
        : {
            kind: 'region',
            selector: '.conv-anchor-input-main',
            x: currentSwStep.x,
            y: currentSwStep.y,
            size: kernelSize,
            imageWidth,
            imageHeight,
          };

      return [
        {
          id: 'input-window',
          tone: 'red',
          from: inputAnchor,
          to: { kind: 'element', selector: '.blur-anchor-window-zoom' },
        },
        {
          id: 'computation',
          tone: 'amber',
          from: { kind: 'element', selector: '.conv-anchor-main-operator' },
          to: { kind: 'element', selector: '.blur-anchor-compute-node' },
        },
        {
          id: 'output-write',
          tone: 'emerald',
          from: {
            kind: 'pixel',
            selector: '.conv-anchor-output-main',
            x: currentSwStep.x,
            y: currentSwStep.y,
            imageWidth: imageWidth,
            imageHeight: imageHeight,
          },
          to: { kind: 'element', selector: '.blur-anchor-output-node' },
        },
      ];
    }

    if (!currentStep) return [];
    const inputAnchor: AnchoredOverlayPath['from'] = imageType === 'lena'
      ? {
          kind: 'pixel',
          selector: '.conv-anchor-input-main',
          x: currentStep.x,
          y: currentStep.y,
          imageWidth,
          imageHeight,
        }
      : {
          kind: 'region',
          selector: '.conv-anchor-input-main',
          x: currentStep.x,
          y: currentStep.y,
          size: kernelSize,
          imageWidth,
          imageHeight,
        };

    return [
      {
        id: 'input-window',
        tone: 'red',
        from: inputAnchor,
        to: { kind: 'element', selector: '.blur-anchor-window-zoom' },
      },
      {
        id: 'computation',
        tone: 'amber',
        from: { kind: 'element', selector: '.conv-anchor-main-operator' },
        to: { kind: 'element', selector: '.blur-anchor-compute-node' },
      },
      {
        id: 'output-write',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: currentStep.x,
          y: currentStep.y,
          size: 1,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
        },
        to: { kind: 'element', selector: '.blur-anchor-output-node' },
      },
    ];
  }, [currentStep, currentSwStep, method, imageType, kernelSize, imageWidth, imageHeight]);

  const visualOverlay = visualOverlayPaths.length > 0 ? (
    <AnchoredOverlay paths={visualOverlayPaths} />
  ) : null;

  // ========== 代码切换 ==========

  const getCode = useCallback(() => {
    switch (method) {
      case 'box': return BOX_BLUR_CODE_TS;
      case 'gaussian': return GAUSSIAN_BLUR_CODE_TS;
      case 'median': return MEDIAN_CODE_TS;
      case 'sidewindow': return SIDEWINDOW_CODE_TS;
      default: return '';
    }
  }, [method]);

  // ========== 参数面板 ==========

  const parameters = (
    <div className="space-y-4">
      {/* 方法说明 */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">空域滤波</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          空间域滤波利用像素邻域重新估计当前像素值，用于抑制噪声和平滑图像。
          不同滤波方法的差异在于窗口如何取值和合成输出。
        </p>
        <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-blue-800">
          窗口大小: {kernelSize}×{kernelSize} = {kernelSize * kernelSize} 个邻域像素
        </div>
      </div>

      <SelectParam
        label="示例图像"
        value={imageType}
        onChange={handleImageTypeChange}
        options={getTeachingImageOptions()}
      />

      <SelectParam
        label="噪声类型"
        value={noiseType}
        onChange={handleNoiseTypeChange}
        options={[
          { value: 'none', label: '无噪声' },
          { value: 'saltpepper', label: '椒盐噪声 (5%)' },
          { value: 'gaussian', label: '高斯噪声 (σ=0.08)' },
        ]}
      />

      <SelectParam
        label="滤波方法"
        value={method}
        onChange={handleMethodChange}
        options={[
          { value: 'box', label: '均值滤波' },
          { value: 'gaussian', label: '高斯滤波' },
          { value: 'median', label: '中值滤波' },
          { value: 'sidewindow', label: '边窗滤波' },
        ]}
      />

      <SliderParam
        label="窗口大小"
        value={kernelSize}
        onChange={handleKernelSizeChange}
        min={3}
        max={7}
        step={2}
      />

      {method === 'gaussian' && (
        <SliderParam
          label="Sigma (σ)"
          value={sigma}
          onChange={handleSigmaChange}
          min={0.5}
          max={3}
          step={0.1}
        />
      )}

      {(method === 'box' || method === 'gaussian') && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-xs leading-5 text-amber-800">
          <div className="font-semibold">线性平滑</div>
          <p className="mt-1">
            {method === 'box'
              ? '均值滤波对所有邻域像素等权平均。窗口越大，噪声抑制越强，但边缘和细节损失也越大。'
              : '高斯滤波中心权重大、远处权重小。sigma越大权越均匀（趋近均值），sigma越小中心越突出。'}
          </p>
        </div>
      )}

      {method === 'median' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-xs leading-5 text-amber-800">
          <div className="font-semibold">非线性排序</div>
          <p className="mt-1">
            中值滤波排序后取中位数，极端值（如椒盐噪声）会被排到两端从而被舍弃。
            窗口越大，排序舍弃的极端值越多，但细节也越容易丢失。
          </p>
        </div>
      )}

      {method === 'sidewindow' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-xs leading-5 text-amber-800">
          <div className="font-semibold">保边思想</div>
          <p className="mt-1">
            边窗滤波改变窗口位置而非改变权重：8个侧窗各自避开跨边缘方向，
            最终选择与原像素值最接近的候选输出，因此能保留边缘结构。
          </p>
        </div>
      )}
    </div>
  );

  // ========== 渲染 ==========

  return (
    <ConceptLayout
      title="图像滤波"
      subtitle="Image Filtering - 均值、高斯、中值与边窗滤波的统一入口"
      operationLabel="滤波处理"
      parameterIntro="选择滤波方法、噪声类型和参数，观察不同滤波策略的效果差异。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      analysisPreview={analysisPreview}
      visualOverlay={visualOverlay}
      imageHints={{
        input: imageType === 'lena'
          ? `红点=当前中心像素；下方展开 ${kernelSize}×${kernelSize} 窗口`
          : `红框=${kernelSize}×${kernelSize} 输入窗口`,
        output: `绿框=当前输出像素`,
      }}
      showOriginalGrid={imageType !== 'lena'}
      originalRegionMarker={imageType === 'lena' ? 'dot' : 'frame'}
      singlePageScroll
      navigationHintText="方向键移动 / 点击原图或结果图跳转"
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      onDirectionMove={handleDirectionMove}
      codeTab={
        <CodeViewer languages={[{ name: 'TypeScript', code: getCode() }]} />
      }
      currentStep={
        method === 'sidewindow'
          ? currentSwStep
            ? { x: currentSwStep.x, y: currentSwStep.y, kernelSize }
            : null
          : currentStep
            ? { x: currentStep.x, y: currentStep.y, kernelSize }
            : null
      }
      stepInfo={
        totalSteps > 0
          ? { current: currentStepIndex, total: totalSteps }
          : null
      }
    />
  );
}
