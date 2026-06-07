'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  SliderParam,
  KernelEditor,
  ImageCanvas,
} from '@/components';
import { convolve2D, convolve2DSteps, createKernel } from '@/lib/algorithms/convolution';
import { Kernel } from '@/lib/algorithms/types';
import {
  convolutionTeachingImages,
  ConvolutionTeachingImageType,
} from '@/lib/utils/convolutionTeachingImages';
import { normalizeImage } from '@/lib/utils/imageProcessing';

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

interface ConvStep {
  x: number;
  y: number;
  inputRegion: number[][];
  kernel: number[][];
  outputValue: number;
}

function createDefaultKernel(size: number): number[][] {
  const nextKernel = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
  const center = Math.floor(size / 2);
  nextKernel[center][center] = 1;
  return nextKernel;
}

function getMatrixCellClass(size: number): string {
  if (size >= 11) return 'w-5 h-5 rounded-[0.2rem] text-[7px]';
  if (size >= 9) return 'w-6 h-6 text-[8px]';
  if (size >= 7) return 'w-8 h-8 text-[9px]';
  if (size >= 5) return 'w-9 h-9 text-[10px]';
  return 'w-10 h-10 text-[11px]';
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
  if (size >= 11) return 'w-8 h-8 text-[6px]';
  if (size >= 9) return 'w-9 h-9 text-[7px]';
  if (size >= 7) return 'w-10 h-10 text-[8px]';
  if (size >= 5) return 'w-12 h-12 text-[8px]';
  return 'w-[4.2rem] h-[4.2rem] text-[9px]';
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

function buildInlineMathML(texLikeBody: string): string {
  return `<math xmlns="http://www.w3.org/1998/Math/MathML">${texLikeBody}</math>`;
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const originalImage = convolutionTeachingImages[imageType].image;
  const inputWidth = originalImage[0]?.length ?? 0;
  const inputHeight = originalImage.length;

  const kernelObj = useMemo<Kernel>(() => {
    const anchor = Math.floor(kernelSize / 2);
    const newKernel = createKernel(kernelSize, anchor, anchor);
    newKernel.values = kernel;
    return newKernel;
  }, [kernelSize, kernel]);

  const resultImage = useMemo(() => {
    const result = convolve2D(originalImage, kernelObj, { padding: 0 });
    return normalizeImage(result);
  }, [originalImage, kernelObj]);

  const outputWidth = resultImage[0]?.length ?? 0;
  const outputHeight = resultImage.length;

  const steps = useMemo(() => {
    const generator = convolve2DSteps(originalImage, kernelObj, { padding: 0 });
    return Array.from(generator as Generator<ConvStep>);
  }, [originalImage, kernelObj]);

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const handleDirectionMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!currentStep || steps.length === 0 || outputWidth === 0 || outputHeight === 0) return;

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

      const newIndex = steps.findIndex(step => step.x === newX && step.y === newY);
      if (newIndex !== -1) {
        setCurrentStepIndex(newIndex);
      }
    },
    [currentStep, outputHeight, outputWidth, steps]
  );

  const handleStepSelect = useCallback(
    (x: number, y: number) => {
      if (steps.length === 0) return;

      const newIndex = steps.findIndex(step => step.x === x && step.y === y);
      if (newIndex !== -1) {
        setCurrentStepIndex(newIndex);
        setIsPlaying(false);
      }
    },
    [steps]
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

  const handlePresetSelect = useCallback((preset: string) => {
    switch (preset) {
      case 'identity':
        setKernel([[0, 0, 0], [0, 1, 0], [0, 0, 0]]);
        setKernelSize(3);
        break;
      case 'box':
        setKernel([[1, 1, 1], [1, 1, 1], [1, 1, 1]]);
        setKernelSize(3);
        break;
      case 'laplacian':
        setKernel([[0, 1, 0], [1, -4, 1], [0, 1, 0]]);
        setKernelSize(3);
        break;
      case 'sobelx':
        setKernel([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]);
        setKernelSize(3);
        break;
      case 'sobely':
        setKernel([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]);
        setKernelSize(3);
        break;
    }
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const handleImageTypeChange = useCallback((value: ConvolutionTeachingImageType) => {
    setImageType(value);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const handleKernelSizeChange = useCallback((value: number) => {
    setKernelSize(value);
    setKernel(createDefaultKernel(value));
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const handleKernelChange = useCallback((value: number[][]) => {
    setKernel(value);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const handleKernelCenterChange = useCallback(
    (value: number) => {
      const center = Math.floor(kernelSize / 2);
      setKernel(prevKernel => {
        const nextKernel = prevKernel.map(row => [...row]);
        nextKernel[center][center] = value;
        return nextKernel;
      });
      setCurrentStepIndex(0);
      setIsPlaying(false);
    },
    [kernelSize]
  );

  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return <div className="py-8 text-center text-slate-400">加载中...</div>;
    }

    const { x, y, inputRegion, kernel: stepKernel, outputValue } = currentStep;
    const normalizedValue = resultImage[y]?.[x] ?? 0;
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

          <div className="mt-3 grid gap-2 text-xs leading-6 text-slate-600 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              当前步中，红色输入窗口覆盖原图第 {y + 1} 到 {y + kernelSize} 行、第 {x + 1} 到 {x + kernelSize} 列；
              该区域对应公式中的输入项
              {' '}
              <MathText mathML={inputFormulaMathML} className="align-middle [&_math]:inline-block" />
              。
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              黄色卷积核提供
              {' '}
              <MathText mathML={kernelFormulaMathML} className="align-middle [&_math]:inline-block" />
              ；蓝色乘积矩阵给出
              {' '}
              <MathText mathML={productFormulaMathML} className="align-middle [&_math]:inline-block" />
              的逐项结果，对全部 {kernelSize * kernelSize} 项求和后，得到当前输出值 {outputValue.toFixed(2)}，
              并写入结果图第 {y + 1} 行、第 {x + 1} 列。
            </div>
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
                该矩阵由上方红框窗口直接展开得到。
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
              <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
                <div className="text-[11px] text-sky-600">灰度显示值</div>
                <div className="mt-1 font-mono text-lg font-semibold text-sky-700">
                  {normalizedValue.toFixed(2)}
                </div>
                <div className="mt-1 text-[11px] leading-5 text-sky-700">
                  仅用于结果图渲染，不参与卷积计算。
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
    resultImage,
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
    const normalizedValue = resultImage[y]?.[x] ?? 0;
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
                  上方大图的红框直接展开到这里；每一格仍对应原图中的同一位置。
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
                  <div className="mt-2 text-xs text-slate-500">右侧灰度显示值</div>
                  <div className="font-mono text-sm font-semibold text-sky-700">
                    {normalizedValue.toFixed(2)}
                  </div>
                  <div className="mt-1 max-w-[10rem] text-[10px] leading-4 text-slate-500">
                    仅用于把结果矩阵画成灰度图，不参与卷积计算。
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
    resultImage,
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
        <label className="mb-1.5 block text-xs font-medium text-slate-500">卷积核预设</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { key: 'identity', label: '恒等' },
            { key: 'box', label: '均值' },
            { key: 'laplacian', label: '拉普拉斯' },
            { key: 'sobelx', label: 'Sobel X' },
            { key: 'sobely', label: 'Sobel Y' },
          ].map(preset => (
            <button
              key={preset.key}
              onClick={() => handlePresetSelect(preset.key)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <SliderParam
        label="核大小"
        value={kernelSize}
        onChange={handleKernelSizeChange}
        min={3}
        max={11}
        step={2}
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前核大小是 {kernelSize}×{kernelSize}，所以红框会直接显示成 {kernelSize}×{kernelSize}，
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
        input: `红框对应当前参与计算的 ${kernelSize}×${kernelSize} 输入窗口，可点击原图调整位置`,
        output: `绿框对应结果图中的当前输出像素（共 ${outputWidth}×${outputHeight}），可点击结果图直接定位`,
      }}
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
        steps.length > 0
          ? { current: currentStepIndex, total: steps.length }
          : null
      }
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
    />
  );
}
