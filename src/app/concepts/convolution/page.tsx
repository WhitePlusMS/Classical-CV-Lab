'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  SliderParam,
  KernelEditor,
  ImageCanvas,
} from '@/components';
import { convolve2D, createKernel, getConvolutionStepAt } from '@/lib/algorithms/convolution';
import { Kernel } from '@/lib/algorithms/types';
import {
  convolutionTeachingImages,
  ConvolutionTeachingImageType,
} from '@/lib/utils/convolutionTeachingImages';
import { loadImageAsGrayscale, normalizeImage } from '@/lib/utils/imageProcessing';

const CONVOLUTION_CODE_TS = `function convolve2D(
  image: number[][],
  kernel: number[][]
): number[][] {
  const height = image.length;
  const width = image[0].length;
  const kSize = kernel.length;
  const resultHeight = height - kSize + 1;
  const resultWidth = width - kSize + 1;
  const result = create2DArray(resultHeight, resultWidth, 0);

  // 不补零，窗口只在图像内部滑动
  for (let y = 0; y < resultHeight; y++) {
    for (let x = 0; x < resultWidth; x++) {
      let sum = 0;

      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          sum += image[y + ky][x + kx] * kernel[ky][kx];
        }
      }

      result[y][x] = sum;
    }
  }

  return result;
}`;

type KernelPresetFamilyKey = 'identity' | 'box' | 'gaussian' | 'laplacian' | 'sobelx' | 'sobely';

interface KernelPresetFamily {
  key: KernelPresetFamilyKey;
  label: string;
  supportedSizes: number[];
  createKernel: (size: number) => number[][];
  summary: string;
  principle: string;
  origin: string;
  formulaMathML: string;
  formulaNote: string;
  visualTitle: string;
  visualLabels: string[];
}

const PRESET_SMOOTHING_SIZES = [3, 5, 7, 9, 11];
const PRESET_DERIVATIVE_SIZES = [3, 5, 7];

function buildInlineMathML(texLikeBody: string): string {
  return `<math xmlns="http://www.w3.org/1998/Math/MathML">${texLikeBody}</math>`;
}

function buildPascalRow(order: number): number[] {
  const row = [1];
  for (let i = 0; i < order; i++) {
    row.unshift(0);
    for (let j = 0; j < row.length - 1; j++) {
      row[j] = row[j] + row[j + 1];
    }
  }
  return row;
}

function convolve1D(signal: number[], kernel: number[]): number[] {
  const result = Array.from({ length: signal.length + kernel.length - 1 }, () => 0);
  for (let i = 0; i < signal.length; i++) {
    for (let j = 0; j < kernel.length; j++) {
      result[i + j] += signal[i] * kernel[j];
    }
  }
  return result;
}

function outerProduct(row: number[], column: number[]): number[][] {
  return column.map(columnValue => row.map(rowValue => rowValue * columnValue));
}

function sumMatrices(a: number[][], b: number[][]): number[][] {
  return a.map((row, y) => row.map((value, x) => value + b[y][x]));
}

function createIdentityKernel(size: number): number[][] {
  const kernel = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  kernel[Math.floor(size / 2)][Math.floor(size / 2)] = 1;
  return kernel;
}

function createBoxKernel(size: number): number[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 1));
}

function createGaussianKernel(size: number): number[][] {
  const row = buildPascalRow(size - 1);
  return outerProduct(row, row);
}

function createSobelDerivativeRow(size: number): number[] {
  if (size === 3) return [-1, 0, 1];
  return convolve1D(buildPascalRow(size - 3), [-1, 0, 1]);
}

function createSobelXKernel(size: number): number[][] {
  const smoothingRow = buildPascalRow(size - 1);
  const derivativeRow = createSobelDerivativeRow(size);
  return outerProduct(derivativeRow, smoothingRow);
}

function createSobelYKernel(size: number): number[][] {
  const smoothingRow = buildPascalRow(size - 1);
  const derivativeRow = createSobelDerivativeRow(size);
  return outerProduct(smoothingRow, derivativeRow);
}

function createLaplacianKernel(size: number): number[][] {
  if (size === 3) {
    return [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0],
    ];
  }

  const smoothingRow = buildPascalRow(size - 1);
  const secondDerivativeRow = convolve1D(buildPascalRow(size - 3), [1, -2, 1]);
  return sumMatrices(
    outerProduct(secondDerivativeRow, smoothingRow),
    outerProduct(smoothingRow, secondDerivativeRow)
  );
}

function findNearestSupportedSize(targetSize: number, supportedSizes: number[]): number {
  return supportedSizes.reduce((best, size) => {
    const currentDistance = Math.abs(size - targetSize);
    const bestDistance = Math.abs(best - targetSize);
    if (currentDistance < bestDistance) return size;
    if (currentDistance === bestDistance && size > best) return size;
    return best;
  }, supportedSizes[0]);
}

function formatKernelValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, '');
  if (Math.abs(value) >= 1) return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

const KERNEL_PRESET_FAMILIES: KernelPresetFamily[] = [
  {
    key: 'identity',
    label: '恒等',
    supportedSizes: PRESET_SMOOTHING_SIZES,
    createKernel: createIdentityKernel,
    summary: '只保留中心像素，输出基本等于输入，用来说明“卷积核就是一组局部权重”。',
    principle: '无论核大小是多少，只有中心位置权重为 1，其余位置全为 0，因此邻域像素不会参与输出。',
    origin: '它对应离散情形下的单位冲激思想：只保留中心项时，卷积结果尽量保持原信号本身。',
    formulaMathML: buildInlineMathML('<mrow><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>'),
    formulaNote: '扩大到 5×5、7×7 或 11×11 时，本质仍然不变：只有中心项真正生效。',
    visualTitle: '响应图示',
    visualLabels: ['邻域忽略', '中心保留', '原样输出'],
  },
  {
    key: 'box',
    label: '均值',
    supportedSizes: PRESET_SMOOTHING_SIZES,
    createKernel: createBoxKernel,
    summary: '窗口内所有位置同权参与，适合讲清楚“局部平均/等权平滑”这一类卷积思路。',
    principle: '每个像素都以相同权重参与求和；若再除以全部权重之和，就得到标准的均值滤波。',
    origin: '它来自局部平均的统计思想：不再只看中心点，而是把周围像素一起纳入估计，用整体趋势抑制随机波动。',
    formulaMathML: buildInlineMathML('<mrow><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mi>Z</mi></mfrac><munderover><mo>&#8721;</mo><mi>i</mi><mi></mi></munderover><munderover><mo>&#8721;</mo><mi>j</mi><mi></mi></munderover><mi>f</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>i</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>j</mi><mo>)</mo></mrow>'),
    formulaNote: '页面中的核矩阵保留“等权结构”便于观察；若除以全部权重和，就对应标准均值核。',
    visualTitle: '响应图示',
    visualLabels: ['周围像素', '同权汇总', '平滑输出'],
  },
  {
    key: 'gaussian',
    label: '高斯',
    supportedSizes: PRESET_SMOOTHING_SIZES,
    createKernel: createGaussianKernel,
    summary: '中心权重大、边缘权重小，适合说明“平滑但尽量保留结构”的思路。',
    principle: '越靠近中心的像素权重越大，越远的像素权重越小，因此比等权平均更温和，也更符合局部邻域的自然衰减。',
    origin: '它来自高斯分布和尺度空间思想，是图像平滑里最经典、最标准的一类卷积核。',
    formulaMathML: buildInlineMathML('<mrow><mi>g</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>&#8733;</mo><msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>i</mi><mn>2</mn></msup><mo>+</mo><msup><mi>j</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><msup><mi>&#963;</mi><mn>2</mn></msup></mrow></mfrac></mrow></msup></mrow>'),
    formulaNote: '离中心越近，权重越高；核越大，平滑尺度也越大。',
    visualTitle: '响应图示',
    visualLabels: ['中心更重', '周边更轻', '柔和平滑'],
  },
  {
    key: 'laplacian',
    label: '拉普拉斯',
    supportedSizes: PRESET_DERIVATIVE_SIZES,
    createKernel: createLaplacianKernel,
    summary: '强调像素突变的位置，常用来检测边缘或轮廓，对亮度突变特别敏感。',
    principle: '它本质上是二阶差分。3×3 使用经典模板，更大的 5×5、7×7 版本则在二阶差分周围加入了更宽的平滑支撑。',
    origin: '它来源于离散形式的二阶导数；在图像处理中，二阶差分常用来突出“变化率本身是否突然改变”。',
    formulaMathML: buildInlineMathML('<mrow><msup><mo>&#8711;</mo><mn>2</mn></msup><mi>f</mi><mo>=</mo><mfrac><mrow><msup><mi>&#8706;</mi><mn>2</mn></msup><mi>f</mi></mrow><mrow><mi>&#8706;</mi><msup><mi>x</mi><mn>2</mn></msup></mrow></mfrac><mo>+</mo><mfrac><mrow><msup><mi>&#8706;</mi><mn>2</mn></msup><mi>f</mi></mrow><mrow><mi>&#8706;</mi><msup><mi>y</mi><mn>2</mn></msup></mrow></mfrac></mrow>'),
    formulaNote: '页面中的大尺寸拉普拉斯采用“二阶差分 + 更宽平滑支撑”的教学型模板，用来帮助理解大核二阶导数的概念。',
    visualTitle: '响应图示',
    visualLabels: ['平坦区≈0', '亮度突变', '边缘增强'],
  },
  {
    key: 'sobelx',
    label: 'Sobel X',
    supportedSizes: PRESET_DERIVATIVE_SIZES,
    createKernel: createSobelXKernel,
    summary: '突出左右方向的亮度变化，因此更容易检测竖直边缘。',
    principle: '它把“水平方向一阶差分”和“垂直方向平滑”结合在一起；核越大，参与比较的邻域越宽。',
    origin: '它是经典的一阶导数卷积核族。3×3 最常见，5×5 和 7×7 则表示更大尺度的方向导数。',
    formulaMathML: buildInlineMathML('<mrow><msub><mi>G</mi><mi>x</mi></msub><mo>=</mo><mfrac><mrow><mi>&#8706;</mi><mi>f</mi></mrow><mrow><mi>&#8706;</mi><mi>x</mi></mrow></mfrac></mrow>'),
    formulaNote: '如果右侧更亮，响应通常偏正；如果左侧更亮，响应通常偏负。',
    visualTitle: '方向图示',
    visualLabels: ['左暗右亮'],
  },
  {
    key: 'sobely',
    label: 'Sobel Y',
    supportedSizes: PRESET_DERIVATIVE_SIZES,
    createKernel: createSobelYKernel,
    summary: '突出上下方向的亮度变化，因此更容易检测水平边缘。',
    principle: '它把“垂直方向一阶差分”和“水平方向平滑”结合在一起；核越大，参与比较的邻域越宽。',
    origin: '它是经典的一阶导数卷积核族。3×3 最常见，5×5 和 7×7 则表示更大尺度的方向导数。',
    formulaMathML: buildInlineMathML('<mrow><msub><mi>G</mi><mi>y</mi></msub><mo>=</mo><mfrac><mrow><mi>&#8706;</mi><mi>f</mi></mrow><mrow><mi>&#8706;</mi><mi>y</mi></mrow></mfrac></mrow>'),
    formulaNote: '如果下侧更亮，响应通常偏正；如果上侧更亮，响应通常偏负。',
    visualTitle: '方向图示',
    visualLabels: ['上暗下亮'],
  },
];

function createDefaultKernel(size: number): number[][] {
  const nextKernel = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
  const center = Math.floor(size / 2);
  nextKernel[center][center] = 1;
  return nextKernel;
}

function getMatrixCellClass(size: number): string {
  if (size >= 11) return 'w-4 h-4 rounded-[0.2rem] text-[7px]';
  if (size >= 9) return 'w-5 h-5 text-[8px]';
  if (size >= 7) return 'w-7 h-7 text-[9px]';
  if (size >= 5) return 'w-8 h-8 text-[10px]';
  return 'w-9 h-9 text-[11px]';
}

function getProductCellClass(size: number): string {
  if (size >= 11) return 'w-[3rem] h-10 text-[7px]';
  if (size >= 9) return 'w-[3.35rem] h-11 text-[8px]';
  if (size >= 7) return 'w-[3.6rem] h-11 text-[8px]';
  if (size >= 5) return 'w-16 h-[3.1rem] text-[9px]';
  return 'w-[4.1rem] h-14 text-[10px]';
}

function getProductPreviewCount(size: number): number {
  if (size >= 11) return 8;
  if (size >= 9) return 10;
  if (size >= 7) return 12;
  return size * size;
}

function getFlowCellClass(size: number): string {
  if (size >= 9) return 'h-6 min-w-6 text-[8px]';
  if (size >= 7) return 'h-7 min-w-7 text-[9px]';
  if (size >= 5) return 'h-8 min-w-8 text-[10px]';
  return 'h-9 min-w-9 text-[11px]';
}

function getFlowProductCellClass(size: number): string {
  if (size >= 7) return 'h-8 min-w-12 text-[8px]';
  if (size >= 5) return 'h-9 min-w-14 text-[8px]';
  return 'h-10 min-w-16 text-[9px]';
}

function getTermMatrixCellClass(size: number): string {
  if (size >= 11) return 'w-7 h-7 text-[6px]';
  if (size >= 9) return 'w-8 h-8 text-[7px]';
  if (size >= 7) return 'w-9 h-9 text-[8px]';
  if (size >= 5) return 'w-10 h-10 text-[8px]';
  return 'w-[3.4rem] h-[3.4rem] text-[9px]';
}

function formatPixelValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

interface MathTextProps {
  mathML: string;
  className?: string;
}

function MathText({ mathML, className }: MathTextProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: mathML }} />;
}

function buildMainFormulaMathML(x: number, y: number, outputValue: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>=</mo>
      <munderover><mo>&#8721;</mo><mi>i</mi><mi></mi></munderover>
      <munderover><mo>&#8721;</mo><mi>j</mi><mi></mi></munderover>
      <mi>f</mi><mo>(</mo><mn>${x}</mn><mo>+</mo><mi>i</mi><mo>,</mo><mn>${y}</mn><mo>+</mo><mi>j</mi><mo>)</mo>
      <mo>&#x22C5;</mo>
      <mi>g</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      <mo>=</mo>
      <mn>${outputValue.toFixed(2)}</mn>
    </mrow>
  `);
}

function buildInputFormulaMathML(x: number, y: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>f</mi><mo>(</mo><mn>${x}</mn><mo>+</mo><mi>i</mi><mo>,</mo><mn>${y}</mn><mo>+</mo><mi>j</mi><mo>)</mo>
    </mrow>
  `);
}

function buildKernelFormulaMathML(): string {
  return buildInlineMathML(`
    <mrow>
      <mi>g</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
    </mrow>
  `);
}

function buildProductFormulaMathML(x: number, y: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>f</mi><mo>(</mo><mn>${x}</mn><mo>+</mo><mi>i</mi><mo>,</mo><mn>${y}</mn><mo>+</mo><mi>j</mi><mo>)</mo>
      <mo>&#x22C5;</mo>
      <mi>g</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
    </mrow>
  `);
}

function buildOutputFormulaMathML(x: number, y: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
    </mrow>
  `);
}

interface OverlayPoint {
  x: number;
  y: number;
}

interface OverlayPath {
  id: string;
  tone: 'red' | 'amber' | 'emerald';
  from: OverlayPoint;
  to: OverlayPoint;
}

interface ConvolutionVisualOverlayProps {
  x: number;
  y: number;
  kernelSize: number;
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
}

function getElementCenter(selector: string): OverlayPoint | null {
  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getRegionCenter(
  selector: string,
  regionX: number,
  regionY: number,
  regionSize: number,
  imageWidth: number,
  imageHeight: number
): OverlayPoint | null {
  const element = document.querySelector(selector);
  if (!element || imageWidth === 0 || imageHeight === 0) return null;

  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + ((regionX + regionSize / 2) / imageWidth) * rect.width,
    y: rect.top + ((regionY + regionSize / 2) / imageHeight) * rect.height,
  };
}

function getPixelCenter(
  selector: string,
  pixelX: number,
  pixelY: number,
  imageWidth: number,
  imageHeight: number
): OverlayPoint | null {
  return getRegionCenter(selector, pixelX, pixelY, 1, imageWidth, imageHeight);
}

function ConvolutionVisualOverlay({
  x,
  y,
  kernelSize,
  inputWidth,
  inputHeight,
  outputWidth,
  outputHeight,
}: ConvolutionVisualOverlayProps) {
  const [paths, setPaths] = useState<OverlayPath[]>([]);

  useEffect(() => {
    const updatePaths = () => {
      const inputFrom = getRegionCenter(
        '.conv-anchor-input-main',
        x,
        y,
        kernelSize,
        inputWidth,
        inputHeight
      );
      const inputTo = getElementCenter('.conv-anchor-window-zoom');
      const kernelFrom = getElementCenter('.conv-anchor-main-operator');
      const kernelTo = getElementCenter('.conv-anchor-kernel-node');
      const outputFrom = getPixelCenter(
        '.conv-anchor-output-main',
        x,
        y,
        outputWidth,
        outputHeight
      );
      const outputTo = getElementCenter('.conv-anchor-output-node');

      const nextPaths: OverlayPath[] = [];
      if (inputFrom && inputTo) {
        nextPaths.push({ id: 'input-window', tone: 'red', from: inputFrom, to: inputTo });
      }
      if (kernelFrom && kernelTo) {
        nextPaths.push({ id: 'kernel-weight', tone: 'amber', from: kernelFrom, to: kernelTo });
      }
      if (outputFrom && outputTo) {
        nextPaths.push({ id: 'output-write', tone: 'emerald', from: outputFrom, to: outputTo });
      }
      setPaths(nextPaths);
    };

    const frame = requestAnimationFrame(updatePaths);
    window.addEventListener('resize', updatePaths);
    window.addEventListener('scroll', updatePaths, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePaths);
      window.removeEventListener('scroll', updatePaths);
    };
  }, [inputHeight, inputWidth, kernelSize, outputHeight, outputWidth, x, y]);

  if (paths.length === 0) return null;

  const strokeClass = {
    red: 'text-red-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
  };

  return (
    <svg className="conv-visual-overlay" aria-hidden>
      <defs>
        <filter id="conv-overlay-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="rgb(15 23 42)" floodOpacity="0.16" />
        </filter>
      </defs>
      {paths.map(path => {
        const controlY = Math.min(path.to.y - 48, path.from.y + 150);
        const d = `M ${path.from.x} ${path.from.y} C ${path.from.x} ${controlY}, ${path.to.x} ${controlY}, ${path.to.x} ${path.to.y}`;

        return (
          <g key={path.id} className={strokeClass[path.tone]} filter="url(#conv-overlay-glow)">
            <path
              className="conv-overlay-path"
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={path.from.x} cy={path.from.y} r="5" fill="white" stroke="currentColor" strokeWidth="3" />
            <path
              d={`M ${path.to.x - 7} ${path.to.y - 10} L ${path.to.x} ${path.to.y} L ${path.to.x + 7} ${path.to.y - 10}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function ConvolutionPage() {
  const [imageType, setImageType] = useState<ConvolutionTeachingImageType>('edge12');
  const [kernelSize, setKernelSize] = useState(3);
  const [kernel, setKernel] = useState<number[][]>([
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0],
  ]);
  const [selectedPresetKey, setSelectedPresetKey] = useState<KernelPresetFamilyKey | null>('laplacian');
  const [assetImage, setAssetImage] = useState<number[][] | null>(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const imageConfig = convolutionTeachingImages[imageType];
  const selectedPresetFamily = useMemo(
    () => KERNEL_PRESET_FAMILIES.find(family => family.key === selectedPresetKey) ?? null,
    [selectedPresetKey]
  );

  useEffect(() => {
    let cancelled = false;

    if (!imageConfig.assetPath) {
      setAssetImage(null);
      return;
    }

    setAssetImage(null);
    loadImageAsGrayscale(imageConfig.assetPath)
      .then(image => {
        if (!cancelled) {
          setAssetImage(image);
        }
      })
      .catch(error => {
        console.error('加载教学示例图失败:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [imageConfig]);

  const originalImage = imageConfig.image ?? assetImage;
  const inputWidth = originalImage?.[0]?.length ?? 0;
  const inputHeight = originalImage?.length ?? 0;

  const kernelObj = useMemo<Kernel>(() => {
    const anchor = Math.floor(kernelSize / 2);
    const newKernel = createKernel(kernelSize, anchor, anchor);
    newKernel.values = kernel;
    return newKernel;
  }, [kernelSize, kernel]);

  const resultImage = useMemo(() => {
    if (!originalImage || originalImage.length === 0 || !originalImage[0]) return [];
    const result = convolve2D(originalImage, kernelObj, { padding: 0 });
    return normalizeImage(result);
  }, [originalImage, kernelObj]);

  const outputWidth = resultImage[0]?.length ?? 0;
  const outputHeight = resultImage.length;
  const totalSteps = outputWidth * outputHeight;

  useEffect(() => {
    if (outputWidth === 0 || outputHeight === 0) {
      setCurrentPosition({ x: 0, y: 0 });
      return;
    }

    setCurrentPosition(prev => ({
      x: Math.min(prev.x, outputWidth - 1),
      y: Math.min(prev.y, outputHeight - 1),
    }));
  }, [outputHeight, outputWidth]);

  const currentStep = useMemo(() => {
    if (!originalImage || outputWidth === 0 || outputHeight === 0) return null;
    return getConvolutionStepAt(originalImage, kernelObj, currentPosition.x, currentPosition.y, {
      padding: 0,
    });
  }, [currentPosition.x, currentPosition.y, kernelObj, originalImage, outputHeight, outputWidth]);
  const currentStepIndex = currentStep ? currentStep.y * outputWidth + currentStep.x : 0;
  const inputMarkerWindowLabel =
    imageConfig.regionMarker === 'dot' ? '红点定位的输入窗口' : '红色输入窗口';
  const inputMarkerExpandHint =
    imageConfig.regionMarker === 'dot'
      ? `上方大图中的红点只负责定位；这里展示的是该位置对应的 ${kernelSize}×${kernelSize} 输入窗口。`
      : '上方大图的红框直接展开到这里；每一格仍对应原图中的同一位置。';

  const handleDirectionMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!currentStep || totalSteps === 0 || outputWidth === 0 || outputHeight === 0) return;

      let newX = currentStep.x;
      let newY = currentStep.y;

      switch (direction) {
        case 'up':
          newY = Math.max(0, currentStep.y - 1);
          break;
        case 'down':
          newY = Math.min(outputHeight - 1, currentStep.y + 1);
          break;
        case 'left':
          newX = Math.max(0, currentStep.x - 1);
          break;
        case 'right':
          newX = Math.min(outputWidth - 1, currentStep.x + 1);
          break;
      }

      setCurrentPosition({ x: newX, y: newY });
    },
    [currentStep, outputHeight, outputWidth, totalSteps]
  );

  const handleStepSelect = useCallback(
    (x: number, y: number) => {
      if (totalSteps === 0) return;
      setCurrentPosition({ x, y });
    },
    [totalSteps]
  );

  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      if (outputWidth === 0 || outputHeight === 0) return;
      handleStepSelect(
        Math.max(0, Math.min(x, outputWidth - 1)),
        Math.max(0, Math.min(y, outputHeight - 1))
      );
    },
    [handleStepSelect, outputHeight, outputWidth]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      if (outputWidth === 0 || outputHeight === 0) return;
      handleStepSelect(
        Math.max(0, Math.min(x, outputWidth - 1)),
        Math.max(0, Math.min(y, outputHeight - 1))
      );
    },
    [handleStepSelect, outputHeight, outputWidth]
  );

  const applyPresetFamilySize = useCallback((presetKey: KernelPresetFamilyKey, size: number) => {
    const presetFamily = KERNEL_PRESET_FAMILIES.find(item => item.key === presetKey);
    if (!presetFamily || !presetFamily.supportedSizes.includes(size)) return;

    setSelectedPresetKey(presetKey);
    setKernelSize(size);
    setKernel(presetFamily.createKernel(size));
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handlePresetSelect = useCallback(
    (presetKey: KernelPresetFamilyKey) => {
      const presetFamily = KERNEL_PRESET_FAMILIES.find(item => item.key === presetKey);
      if (!presetFamily) return;

      const targetSize = findNearestSupportedSize(kernelSize, presetFamily.supportedSizes);
      applyPresetFamilySize(presetKey, targetSize);
    },
    [applyPresetFamilySize, kernelSize]
  );

  const handleImageTypeChange = useCallback((value: ConvolutionTeachingImageType) => {
    setImageType(value);
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handleKernelSizeChange = useCallback(
    (value: number) => {
      setKernelSize(value);

      if (selectedPresetFamily && selectedPresetFamily.supportedSizes.includes(value)) {
        setKernel(selectedPresetFamily.createKernel(value));
      } else {
        setSelectedPresetKey(null);
        setKernel(createDefaultKernel(value));
      }

      setCurrentPosition({ x: 0, y: 0 });
    },
    [selectedPresetFamily]
  );

  const handleKernelChange = useCallback((value: number[][]) => {
    setSelectedPresetKey(null);
    setKernel(value);
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handleKernelCenterChange = useCallback(
    (value: number) => {
      const center = Math.floor(kernelSize / 2);
      setKernel(prevKernel => {
        const nextKernel = prevKernel.map(row => [...row]);
        nextKernel[center][center] = value;
        return nextKernel;
      });
      setSelectedPresetKey(null);
      setCurrentPosition({ x: 0, y: 0 });
    },
    [kernelSize]
  );

  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return <div className="py-8 text-center text-slate-400">加载中...</div>;
    }

    const { x, y, inputRegion, kernel: stepKernel, outputValue } = currentStep;
    const matrixCellClass = getMatrixCellClass(kernelSize);
    const termMatrixCellClass = getTermMatrixCellClass(kernelSize);
    const center = Math.floor(kernelSize / 2);
    const showCompactTerms = kernelSize >= 7;
    const termMatrixRows = inputRegion.map((row, ry) =>
      row.map((pixel, rx) => ({
        pixel,
        weight: stepKernel[ry][rx],
        product: pixel * stepKernel[ry][rx],
        isCenter: rx === center && ry === center,
      }))
    );
    const productSum = termMatrixRows.flat().reduce((total, term) => total + term.product, 0);
    const mainFormulaMathML = buildMainFormulaMathML(x, y, outputValue);
    const inputFormulaMathML = buildInputFormulaMathML(x, y);
    const kernelFormulaMathML = buildKernelFormulaMathML();
    const productFormulaMathML = buildProductFormulaMathML(x, y);
    const outputFormulaMathML = buildOutputFormulaMathML(x, y);

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">当前输出像素的卷积表达式</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                下方内容只保留一个公式，并把上方当前计算步骤如何代入该公式明确展开。
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              当前输出值 {outputValue.toFixed(2)}
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-4xl rounded-2xl border border-slate-200 bg-[#f8f7f3] px-5 py-5 text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="text-center text-lg leading-relaxed sm:text-xl">
              <MathText mathML={mainFormulaMathML} className="[&_math]:mx-auto [&_math]:inline-block" />
            </div>
          </div>

          <div className="mt-3 space-y-2 text-xs leading-6 text-slate-600">
            <p>
              当前步中，{inputMarkerWindowLabel}覆盖原图第 {y + 1} 到 {y + kernelSize} 行、第 {x + 1} 到 {x + kernelSize} 列；
              该区域对应公式中的输入项
              {' '}
              <MathText mathML={inputFormulaMathML} className="align-middle [&_math]:inline-block" />
              。
            </p>
            <p>
              黄色卷积核提供
              {' '}
              <MathText mathML={kernelFormulaMathML} className="align-middle [&_math]:inline-block" />
              ；蓝色乘积矩阵给出
              {' '}
              <MathText mathML={productFormulaMathML} className="align-middle [&_math]:inline-block" />
              的逐项结果，对全部 {kernelSize * kernelSize} 项求和后，得到当前输出值 {outputValue.toFixed(2)}，
              并写入结果图第 {y + 1} 行、第 {x + 1} 列。
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">公式在当前步骤中的具体代入</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                下面四个对象与上方当前流程一一对应：输入窗口、卷积核、逐项乘积以及输出结果。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              共 {kernelSize * kernelSize} 项乘积
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.85fr)]">
            <div className="rounded-2xl border border-red-200 bg-red-50/55 p-3">
              <div className="text-sm font-semibold text-red-700">
                输入窗口 <MathText mathML={inputFormulaMathML} className="align-middle [&_math]:inline-block" />
              </div>
              <div className="mt-1 text-[11px] text-red-600">
                原图第 {y + 1}-{y + kernelSize} 行 / 第 {x + 1}-{x + kernelSize} 列
              </div>
              <div className="mt-2 text-xs leading-5 text-red-700">
                该矩阵由上方{inputMarkerWindowLabel}直接展开得到。
              </div>
              <div
                className="mt-3 inline-grid gap-1"
                style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
              >
                {inputRegion.map((row, ry) =>
                  row.map((val, rx) => (
                    <div
                      key={`input-expanded-${ry}-${rx}`}
                      className={`${matrixCellClass} flex flex-col items-center justify-center rounded border font-mono ${
                        rx === center && ry === center
                          ? 'border-red-400 bg-white text-red-700'
                          : 'border-red-200 bg-white/90 text-slate-700'
                      }`}
                    >
                      <span className="leading-none">{formatPixelValue(val)}</span>
                      {kernelSize <= 5 && (
                        <span className="mt-0.5 text-[8px] leading-none text-slate-400">
                          第{ry + 1}行
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-3">
              <div className="text-sm font-semibold text-amber-800">
                卷积核 <MathText mathML={kernelFormulaMathML} className="align-middle [&_math]:inline-block" />
              </div>
              <div className="mt-1 text-[11px] text-amber-700">与左侧逐项对应</div>
              <div className="mt-2 text-xs leading-5 text-amber-800">
                第 `(i, j)` 个权重与输入窗口中同一位置的像素相乘。
              </div>
              <div
                className="mt-3 inline-grid gap-1"
                style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
              >
                {stepKernel.map((row, ry) =>
                  row.map((val, rx) => (
                    <div
                      key={`kernel-expanded-${ry}-${rx}`}
                      className={`${matrixCellClass} flex items-center justify-center rounded border font-mono ${
                        rx === center && ry === center
                          ? 'border-amber-400 bg-white text-amber-800'
                          : 'border-amber-200 bg-white/90 text-slate-700'
                      }`}
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/55 p-3">
              <div className="text-sm font-semibold text-sky-800">
                逐项乘积 <MathText mathML={productFormulaMathML} className="align-middle [&_math]:inline-block" />
              </div>
              <div className="mt-1 text-[11px] text-sky-700">
                {showCompactTerms ? '大核仅显示乘积值' : '每格显示乘法与结果'}
              </div>
              <div className="mt-2 text-xs leading-5 text-sky-700">
                该矩阵对应公式中的每一项乘积；对其全部元素求和，即得到当前输出像素的卷积值。
              </div>
              <div
                className="mt-3 inline-grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
              >
                {termMatrixRows.map((row, ry) =>
                  row.map((term, rx) => (
                    <div
                      key={`term-matrix-${ry}-${rx}`}
                      title={`${formatPixelValue(term.pixel)} × ${term.weight} = ${term.product.toFixed(2)}`}
                      className={`${termMatrixCellClass} flex flex-col items-center justify-center rounded-xl border px-1 text-center font-mono ${
                        term.isCenter
                          ? 'border-sky-400 bg-white text-sky-800'
                          : 'border-sky-200 bg-white/90 text-slate-700'
                      }`}
                    >
                      {showCompactTerms ? (
                        <span className="leading-none">{term.product.toFixed(2)}</span>
                      ) : (
                        <>
                          <span className="leading-none text-slate-500">
                            {formatPixelValue(term.pixel)}×{term.weight}
                          </span>
                          <span className="mt-1 font-semibold leading-none text-sky-800">
                            ={term.product.toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3">
              <div className="text-sm font-semibold text-emerald-800">
                输出结果 <MathText mathML={outputFormulaMathML} className="align-middle [&_math]:inline-block" />
              </div>
              <div className="mt-2 rounded-xl border border-emerald-200 bg-white px-3 py-3">
                <div className="text-[11px] text-emerald-600">求和结果</div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                  {productSum.toFixed(2)}
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  这一数值由乘积矩阵的全部元素求和得到，并写入结果图第 {y + 1} 行、第 {x + 1} 列。
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">卷积核的作用</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                卷积核可以理解成一张局部权重表：窗口里的每个像素都先乘上对应权重，再把全部乘积求和。
              </p>
            </div>
            {selectedPresetFamily && (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                当前预设：{selectedPresetFamily.label} {kernelSize}×{kernelSize}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4">
            {KERNEL_PRESET_FAMILIES.map(preset => {
              const isActivePreset = selectedPresetKey === preset.key;
              const previewSize = isActivePreset
                ? kernelSize
                : findNearestSupportedSize(5, preset.supportedSizes);
              const previewKernel = preset.createKernel(previewSize);
              const previewCellClass = getMatrixCellClass(previewSize);
              const previewCenter = Math.floor(previewSize / 2);

              return (
                <div
                  key={preset.key}
                  className={`rounded-2xl border px-3 py-3 ${
                    isActivePreset
                      ? 'border-amber-300 bg-amber-50/70'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{preset.label}</div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{preset.summary}</p>
                    </div>
                    {isActivePreset && (
                      <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        当前使用
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {preset.supportedSizes.map(size => (
                      <span
                        key={`${preset.key}-size-${size}`}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                          isActivePreset && kernelSize === size
                            ? 'border-amber-300 bg-white text-amber-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        {size}×{size}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[auto,minmax(0,1fr)] lg:items-start">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        核矩阵可视化
                      </div>
                      <div
                        className="mt-2 inline-grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${previewSize}, minmax(0, 1fr))` }}
                      >
                        {previewKernel.flatMap((row, rowIndex) =>
                          row.map((value, colIndex) => (
                            <div
                              key={`${preset.key}-${previewSize}-${rowIndex}-${colIndex}`}
                              className={`${previewCellClass} flex items-center justify-center rounded border font-mono ${
                                rowIndex === previewCenter && colIndex === previewCenter
                                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                              title={String(value)}
                            >
                              {formatKernelValue(value)}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        原理与作用来源
                      </div>
                      <p className="mt-2 text-xs leading-6 text-slate-600">{preset.principle}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-500">{preset.origin}</p>

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          公式
                        </div>
                        <div className="kernel-formula-block mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-[#f8f7f3] px-4 py-4 text-slate-800">
                          <MathText mathML={preset.formulaMathML} className="[&_math]:inline-block" />
                        </div>
                        <p className="mt-2 text-xs leading-6 text-slate-600">{preset.formulaNote}</p>
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {preset.visualTitle}
                        </div>
                        {preset.visualLabels.length === 1 ? (
                          <div className="mt-2 inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                            {preset.visualLabels[0]}
                          </div>
                        ) : (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {preset.visualLabels.map((label, index) => (
                              <div
                                key={`${preset.key}-visual-${index}`}
                                className={`rounded-lg px-2 py-2 text-center text-[11px] font-medium ${
                                  index === 1
                                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border border-slate-200 bg-white text-slate-600'
                                }`}
                              >
                                {label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }, [
    currentStep,
    kernelSize,
    selectedPresetFamily,
    selectedPresetKey,
  ]);

  const visualOverlay = currentStep ? (
    <ConvolutionVisualOverlay
      x={currentStep.x}
      y={currentStep.y}
      kernelSize={kernelSize}
      inputWidth={inputWidth}
      inputHeight={inputHeight}
      outputWidth={outputWidth}
      outputHeight={outputHeight}
    />
  ) : null;

  const analysisPreview = useMemo(() => {
    if (!currentStep) return null;
    const { x, y, inputRegion, kernel: stepKernel, outputValue } = currentStep;
    const flowCellClass = getFlowCellClass(kernelSize);
    const center = Math.floor(kernelSize / 2);
    const centerPixel = inputRegion[center]?.[center] ?? 0;
    const centerWeight = stepKernel[center]?.[center] ?? 0;
    const activeProduct = centerPixel * centerWeight;
    const zoomDisplaySize = kernelSize >= 5 ? 126 : Math.min(150, Math.max(112, kernelSize * 30));
    const productCellClass = getFlowProductCellClass(kernelSize);
    const flowProducts = inputRegion.flatMap((row, ry) =>
      row.map((pixel, rx) => ({
        pixel,
        weight: stepKernel[ry][rx],
        product: pixel * stepKernel[ry][rx],
      }))
    );
    const showProductGrid = kernelSize <= 3;

    return (
      <div className="conv-process-rail">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
          <div className="flex flex-col items-center gap-3 xl:justify-self-start">
            <div className="conv-flow-node border-red-200 bg-white">
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
                    containerClassName="conv-window-zoom conv-anchor-window-zoom"
                  />
                  <div className="mt-1 text-center text-[10px] font-medium text-red-600">
                    放大后仍是 {kernelSize}×{kernelSize}
                  </div>
                </div>
                <div className="max-w-[12rem] rounded-xl bg-red-50 px-3 py-2 text-center text-xs leading-5 text-red-700">
                  {inputMarkerExpandHint}
                </div>
              </div>
            </div>

            <div className="conv-flow-node border-slate-200 bg-white">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-slate-600">窗口数值摘要</span>
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
                      第 {y + center + 1} 行，第 {x + center + 1} 列
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
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 xl:justify-self-center">
            <div className="conv-flow-node conv-anchor-kernel-node border-amber-200 bg-white">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-amber-800">卷积核计算</span>
                <span className="font-mono text-[11px] text-amber-700">逐格对齐</span>
              </div>
              {kernelSize >= 7 ? (
                <div className="grid gap-2 text-xs">
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                    这里先用中心格帮助定位。真正参与计算的是整张 {kernelSize}×{kernelSize}
                    卷积核，完整权重见下方矩阵区。
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-700">
                    计算顺序：对齐位置 → 逐格相乘 → 把全部乘积求和。
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2">
                    <span className="text-amber-700">当前中心权重</span>
                    <span className="font-mono text-sm font-semibold text-amber-800">
                      {centerWeight}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {stepKernel.map((row, ry) =>
                    row.map((value, rx) => (
                      <div
                        key={`flow-kernel-${ry}-${rx}`}
                        className={`${flowCellClass} flex items-center justify-center rounded border font-mono font-semibold ${
                          rx === center && ry === center
                            ? 'border-amber-500 bg-white text-amber-800'
                            : 'border-amber-200 bg-white/80 text-slate-700'
                        }`}
                      >
                        {value}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="conv-flow-node border-sky-200 bg-white">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-sky-700">逐格乘积</span>
                <span className="font-mono text-[11px] text-sky-700">
                  共 {kernelSize * kernelSize} 项
                </span>
              </div>
              {showProductGrid ? (
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {flowProducts.map((item, index) => (
                    <div
                      key={`flow-product-${index}`}
                      className={`${productCellClass} flex flex-col items-center justify-center rounded border border-sky-200 bg-sky-50 px-1 font-mono text-sky-800`}
                    >
                      <span className="leading-none">
                        {formatPixelValue(item.pixel)}×{item.weight}
                      </span>
                      <span className="mt-0.5 font-semibold leading-none">
                        {item.product.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="font-mono text-sm font-semibold text-slate-800">
                    中心项：{formatPixelValue(centerPixel)} × {centerWeight} = {activeProduct.toFixed(2)}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    这里只摘出中心项做流程提示；当前输出值仍由全部 {kernelSize * kernelSize}
                    项乘积共同决定，详细乘积在下方展开区查看。
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 xl:justify-self-end">
            <div className="conv-flow-node conv-anchor-output-node min-w-[12.75rem] border-emerald-200 bg-emerald-50/70">
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
                  <div className="mt-1 font-mono text-[11px] text-emerald-600">坐标 ({x}, {y})</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">写入的卷积和</div>
                  <div className="font-mono text-lg font-bold text-emerald-700">
                    {outputValue.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">
                    这一步把全部 {kernelSize * kernelSize} 项乘积的总和写到这个位置。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    currentStep,
    kernelSize,
  ]);

  const parameters = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">尺寸关系</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          当前页面使用小尺寸示例图，并默认采用不补零卷积。输出边长 = 输入边长 - 核大小 + 1。
        </p>
        <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-blue-800">
          {inputWidth} - {kernelSize} + 1 = {outputWidth}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">教学示例</label>
        <select
          value={imageType}
          onChange={e => handleImageTypeChange(e.target.value as ConvolutionTeachingImageType)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {Object.entries(convolutionTeachingImages).map(([key, { name }]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">预设类别</label>
        <div className="grid grid-cols-2 gap-1.5">
          {KERNEL_PRESET_FAMILIES.map(preset => (
            <button
              key={preset.key}
              onClick={() => handlePresetSelect(preset.key)}
              className={`rounded-lg border px-2 py-1.5 text-xs hover:bg-slate-50 ${
                selectedPresetKey === preset.key
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {selectedPresetFamily && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-amber-800">预设尺寸</span>
            <span className="text-[11px] text-amber-700">{selectedPresetFamily.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedPresetFamily.supportedSizes.map(size => (
              <button
                key={`${selectedPresetFamily.key}-${size}`}
                type="button"
                onClick={() => applyPresetFamilySize(selectedPresetFamily.key, size)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  kernelSize === size
                    ? 'border-amber-300 bg-white text-amber-800'
                    : 'border-amber-200 bg-white/80 text-amber-700'
                }`}
              >
                {size}×{size}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-amber-800">
            先选预设类别，再选支持的核大小。导数类预设通常只提供到 7×7；11×11 主要保留恒等、均值和高斯这类大核平滑模板。
          </p>
        </div>
      )}

      <SliderParam
        label="核大小"
        value={kernelSize}
        onChange={handleKernelSizeChange}
        min={3}
        max={11}
        step={2}
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前核大小是 {kernelSize}×{kernelSize}，所以下方会展开对应大小的输入窗口，
        结果图会缩成 {outputWidth}×{outputHeight}。
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">卷积核数值</label>
        {kernelSize >= 7 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-800">大核紧凑编辑</span>
              <span className="font-mono text-xs text-amber-700">{kernelSize}×{kernelSize}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              侧栏只保留中心权重，避免大核矩阵占满课堂视野；完整窗口和权重矩阵在右侧分析区查看。
            </p>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2">
              <span className="text-xs font-medium text-amber-700">中心权重</span>
              <input
                type="number"
                step="0.1"
                value={kernel[Math.floor(kernelSize / 2)]?.[Math.floor(kernelSize / 2)] ?? 0}
                onChange={e => handleKernelCenterChange(parseFloat(e.target.value) || 0)}
                className="h-9 w-20 rounded-lg border border-amber-200 bg-white text-center font-mono text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </label>
          </div>
        ) : (
          <KernelEditor label="" kernel={kernel} onChange={handleKernelChange} size={kernelSize} />
        )}
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="卷积运算"
      subtitle="Convolution - 图像处理的核心操作"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      visualOverlay={visualOverlay}
      analysisPreview={analysisPreview}
      imageHints={{
        input:
          imageConfig.regionMarker === 'dot'
            ? `红点定位当前参与计算的 ${kernelSize}×${kernelSize} 输入窗口，可点击原图调整位置`
            : `红框对应当前参与计算的 ${kernelSize}×${kernelSize} 输入窗口，可点击原图调整位置`,
        output: `绿框对应结果图中的当前输出像素（共 ${outputWidth}×${outputHeight}），可点击结果图直接定位`,
      }}
      showOriginalGrid={imageConfig.showGrid}
      originalRegionMarker={imageConfig.regionMarker}
      singlePageScroll
      navigationHintText="方向键移动 / 点击原图或结果图跳转"
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      codeTab={
        <CodeViewer languages={[{ name: 'TypeScript', code: CONVOLUTION_CODE_TS }]} />
      }
      currentStep={
        currentStep
          ? {
              x: currentStep.x,
              y: currentStep.y,
              kernelSize,
            }
          : null
      }
      stepInfo={
        totalSteps > 0
          ? { current: currentStepIndex, total: totalSteps }
          : null
      }
      onDirectionMove={handleDirectionMove}
    />
  );
}
