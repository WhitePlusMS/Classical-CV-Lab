'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AnchoredOverlay,
  type AnchoredOverlayPath,
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ImageCanvas,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  TeachingTerm,
  buildInlineMathML,
} from '@/components';
import {
  GABOR_PRESETS,
  type GaborParams,
  applyGaborFilter,
  computeLBPImage,
  computeRotationInvariantLBP,
  generateGaborKernel,
  generateTextureTestImage,
  getGaborFilterStep,
  getLBPWindow,
  getRotationInvariantLBPStep,
} from '@/lib/algorithms';
import type { GrayscaleImage } from '@/lib/algorithms/types';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';

type TextureMode = 'lbp' | 'lbp-rotation' | 'gabor';
type TextureImageType = 'texture' | 'lenaOriginal';

const LBP_WINDOW_SIZE = 3;
const CUSTOM_GABOR_PRESET = 'custom';

const MODE_OPTIONS: { value: TextureMode; label: string }[] = [
  { value: 'lbp', label: 'LBP 基础' },
  { value: 'lbp-rotation', label: 'LBP 旋转不变' },
  { value: 'gabor', label: 'Gabor 滤波' },
];

const IMAGE_OPTIONS: { value: TextureImageType; label: string }[] = [
  { value: 'texture', label: '纹理测试图' },
  { value: 'lenaOriginal', label: 'Lena 灰度图' },
];

const GABOR_PRESET_OPTIONS = [
  ...GABOR_PRESETS.map(preset => ({ value: preset.label, label: preset.label })),
  { value: CUSTOM_GABOR_PRESET, label: '自定义参数' },
];

const LBP_NEIGHBOR_POSITIONS = [
  { row: 0, col: 0, label: '左上' },
  { row: 0, col: 1, label: '上' },
  { row: 0, col: 2, label: '右上' },
  { row: 1, col: 2, label: '右' },
  { row: 2, col: 2, label: '右下' },
  { row: 2, col: 1, label: '下' },
  { row: 2, col: 0, label: '左下' },
  { row: 1, col: 0, label: '左' },
];

const LBP_CODE_TS = `export function getLBPWindow(image: number[][], x: number, y: number) {
  const center = image[y][x];
  const offsets = [
    [-1, -1], [0, -1], [1, -1], [1, 0],
    [1, 1], [0, 1], [-1, 1], [-1, 0],
  ];
  const bits = offsets.map(([dx, dy]) =>
    image[y + dy][x + dx] >= center ? 1 : 0
  );
  const decimalValue = bits.reduce(
    (sum, bit, index) => sum + bit * 2 ** index,
    0
  );
  return { center, bits, decimalValue };
}

export function getRotationInvariantLBPStep(bits: number[]) {
  const rotations = Array.from({ length: 8 }, (_, shift) => {
    const pattern = [...bits.slice(shift), ...bits.slice(0, shift)];
    const decimalValue = pattern.reduce(
      (sum, bit, index) => sum + bit * 2 ** index,
      0
    );
    return { shift, pattern, decimalValue };
  });
  return rotations.reduce((best, item) =>
    item.decimalValue < best.decimalValue ? item : best
  );
}`;

const GABOR_CODE_TS = `export function getGaborFilterStep(
  image: number[][],
  kernel: number[][],
  x: number,
  y: number
) {
  const half = Math.floor(kernel.length / 2);
  let rawSum = 0;
  let kernelAbsSum = 0;

  for (let ky = 0; ky < kernel.length; ky++) {
    for (let kx = 0; kx < kernel.length; kx++) {
      const pixel = image[y - half + ky][x - half + kx];
      const weight = kernel[ky][kx];
      rawSum += pixel * weight;
      kernelAbsSum += Math.abs(weight);
    }
  }

  const normalizedResponse = kernelAbsSum > 0
    ? rawSum / kernelAbsSum
    : 0;
  const outputValue = Math.max(0, Math.min(1,
    (normalizedResponse + 1) / 2
  ));
  return { rawSum, kernelAbsSum, normalizedResponse, outputValue };
}`;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function grayByte(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

function formatFloat(value: number, digits = 3): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(digits);
}

function normalizeKernelImage(kernel: number[][]): GrayscaleImage {
  return kernel.map(row => row.map(value => (value + 1) / 2));
}

function getWindowSize(mode: TextureMode, gaborParams: GaborParams): number {
  return mode === 'gabor' ? gaborParams.kernelSize : LBP_WINDOW_SIZE;
}

function getOutputCenter(position: { x: number; y: number }, windowSize: number) {
  const half = Math.floor(windowSize / 2);
  return {
    x: position.x + half,
    y: position.y + half,
  };
}

function buildLBPFormula(cx: number, cy: number, bits: number[], value: number): string {
  const terms = bits
    .map((bit, index) => ({ bit, value: bit * 2 ** index }))
    .filter(term => term.bit === 1)
    .map(term => `<mn>${term.value}</mn>`);

  return buildInlineMathML(`
    <mrow>
      <mi>LBP</mi><mo>(</mo><mn>${cx}</mn><mo>,</mo><mn>${cy}</mn><mo>)</mo>
      <mo>=</mo>
      <munderover><mo>&#8721;</mo><mrow><mi>p</mi><mo>=</mo><mn>1</mn></mrow><mn>8</mn></munderover>
      <msub><mi>b</mi><mi>p</mi></msub>
      <msup><mn>2</mn><mrow><mi>p</mi><mo>-</mo><mn>1</mn></mrow></msup>
      <mo>=</mo>${terms.length > 0 ? terms.join('<mo>+</mo>') : '<mn>0</mn>'}
      <mo>=</mo><mn>${value}</mn>
    </mrow>
  `);
}

function buildRotationInvariantFormula(values: number[], minValue: number, minShift: number): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>LBP</mi><mtext>ri</mtext></msub>
      <mo>=</mo><mi>min</mi><mo>(</mo><mtext>循环移位值</mtext><mo>)</mo>
      <mo>=</mo><mi>min</mi><mo>(</mo><mtext>${values.join(', ')}</mtext><mo>)</mo>
      <mo>=</mo><mn>${minValue}</mn>
      <mtext>，shift=</mtext><mn>${minShift}</mn>
    </mrow>
  `);
}

function buildGaborKernelFormula(params: GaborParams): string {
  return buildInlineMathML(`
    <mrow>
      <mi>h</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
      <mo>=</mo>
      <msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>x</mi><mo>&#8242;</mo></msup><mn>2</mn><mo>+</mo><msup><mn>${params.gamma}</mn><mn>2</mn></msup><msup><mi>y</mi><mo>&#8242;</mo></msup><mn>2</mn></mrow><mrow><mn>2</mn><mo>&#x22C5;</mo><msup><mn>${params.sigma}</mn><mn>2</mn></msup></mrow></mfrac></mrow></msup>
      <mo>&#x22C5;</mo>
      <mi>cos</mi><mo>(</mo><mfrac><mrow><mn>2</mn><mi>&#960;</mi><mi>x</mi><mo>&#8242;</mo></mrow><mn>${params.wavelength}</mn></mfrac><mo>+</mo><mn>${params.phase}</mn><mo>&#176;</mo><mo>)</mo>
    </mrow>
  `);
}

function buildGaborResponseFormula(rawSum: number, kernelAbsSum: number, normalized: number, output: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>R</mi><mo>=</mo>
      <mfrac><mrow><mo>&#8721;</mo><mi>I</mi><mo>&#x22C5;</mo><mi>h</mi></mrow><mrow><mo>&#8721;</mo><mo>|</mo><mi>h</mi><mo>|</mo></mrow></mfrac>
      <mo>=</mo><mfrac><mn>${formatFloat(rawSum)}</mn><mn>${formatFloat(kernelAbsSum)}</mn></mfrac>
      <mo>=</mo><mn>${formatFloat(normalized)}</mn>
      <mo>,</mo>
      <mi>O</mi><mo>=</mo><mfrac><mrow><mi>R</mi><mo>+</mo><mn>1</mn></mrow><mn>2</mn></mfrac>
      <mo>=</mo><mn>${formatFloat(output)}</mn>
    </mrow>
  `);
}

function MatrixPreview({
  image,
  center,
  className = '',
}: {
  image: GrayscaleImage;
  center?: { row: number; col: number };
  className?: string;
}) {
  return (
    <div
      className={`grid gap-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${image[0]?.length ?? 0}, minmax(0, 1fr))` }}
    >
      {image.flatMap((row, rowIndex) =>
        row.map((value, colIndex) => {
          const isCenter = center?.row === rowIndex && center?.col === colIndex;
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`flex h-9 min-w-9 items-center justify-center rounded border font-mono text-[10px] ${
                isCenter
                  ? 'border-red-400 bg-red-50 font-semibold text-red-700'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {grayByte(value)}
            </div>
          );
        })
      )}
    </div>
  );
}

function KernelPreview({ kernel }: { kernel: number[][] }) {
  const size = kernel.length;
  const center = Math.floor(size / 2);
  const cellClass = size >= 31 ? 'text-[6px]' : size >= 21 ? 'text-[7px]' : 'text-[8px]';
  const cellSize = size >= 31 ? 12 : size >= 21 ? 14 : 16;
  const gridWidth = size * cellSize + (size - 1) * 2 + 16;

  return (
    <div className="space-y-3">
      <div
        className="mx-auto grid gap-0.5 rounded-xl border border-slate-200 bg-slate-900/5 p-2"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          width: `min(100%, ${gridWidth}px)`,
        }}
      >
        {kernel.flatMap((row, rowIndex) =>
          row.map((value, colIndex) => {
            const magnitude = Math.min(1, Math.abs(value));
            const alpha = 0.16 + magnitude * 0.78;
            const isPositive = value >= 0;
            const isCenter = rowIndex === center && colIndex === center;
            const color = isPositive ? '37, 99, 235' : '220, 38, 38';
            const textColor = magnitude > 0.52 ? '#ffffff' : isPositive ? '#1e3a8a' : '#991b1b';

            return (
              <div
                key={`kernel-${rowIndex}-${colIndex}`}
                className={`${cellClass} aspect-square w-full min-w-0 flex items-center justify-center rounded border font-mono font-semibold shadow-sm`}
                style={{
                  backgroundColor: `rgba(${color}, ${alpha})`,
                  borderColor: isCenter
                    ? 'rgb(245 158 11)'
                    : isPositive
                      ? 'rgba(29, 78, 216, 0.55)'
                      : 'rgba(185, 28, 28, 0.55)',
                  boxShadow: isCenter
                    ? '0 0 0 2px rgba(245, 158, 11, 0.85), 0 0 0 4px rgba(255, 255, 255, 0.9)'
                    : undefined,
                  color: textColor,
                }}
                title={formatFloat(value, 4)}
              >
                {size >= 21 ? '' : formatFloat(value, 1)}
              </div>
            );
          })
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-blue-700 bg-blue-600" />
          正权重
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-red-700 bg-red-600" />
          负权重
        </span>
        <span className="text-slate-500">颜色越深，权重绝对值越大；橙色描边为核中心。</span>
      </div>
    </div>
  );
}

export default function LBPGaborTexturePage() {
  const [mode, setMode] = useState<TextureMode>('lbp');
  const [imageType, setImageType] = useState<TextureImageType>('texture');
  const [currentPosition, setCurrentPosition] = useState({ x: 9, y: 9 });
  const [gaborPreset, setGaborPreset] = useState(GABOR_PRESETS[0].label);
  const [gaborParams, setGaborParams] = useState<GaborParams>(GABOR_PRESETS[0]);

  const lenaImage = useLenaGrayscaleImage(64);
  const textureImage = useMemo(() => generateTextureTestImage(), []);
  const originalImage = imageType === 'lenaOriginal' ? lenaImage ?? textureImage : textureImage;
  const inputWidth = originalImage[0]?.length ?? 0;
  const inputHeight = originalImage.length;
  const windowSize = getWindowSize(mode, gaborParams);
  const halfWindow = Math.floor(windowSize / 2);
  const validWidth = Math.max(0, inputWidth - windowSize + 1);
  const validHeight = Math.max(0, inputHeight - windowSize + 1);
  const safePosition = {
    x: validWidth > 0 ? clamp(currentPosition.x, 0, validWidth - 1) : 0,
    y: validHeight > 0 ? clamp(currentPosition.y, 0, validHeight - 1) : 0,
  };
  const outputCenter = getOutputCenter(safePosition, windowSize);

  const lbpImage = useMemo(() => computeLBPImage(originalImage), [originalImage]);
  const rotationInvariantImage = useMemo(() => computeRotationInvariantLBP(originalImage), [originalImage]);
  const gaborKernel = useMemo(() => generateGaborKernel(gaborParams), [gaborParams]);
  const gaborKernelDisplay = useMemo(() => normalizeKernelImage(gaborKernel), [gaborKernel]);
  const gaborImage = useMemo(() => applyGaborFilter(originalImage, gaborKernel), [gaborKernel, originalImage]);
  const resultImage = mode === 'lbp'
    ? lbpImage
    : mode === 'lbp-rotation'
      ? rotationInvariantImage
      : gaborImage;

  const lbpStep = useMemo(() => {
    if (mode === 'gabor' || validWidth === 0 || validHeight === 0) return null;
    return getLBPWindow(originalImage, outputCenter.x, outputCenter.y);
  }, [mode, originalImage, outputCenter.x, outputCenter.y, validHeight, validWidth]);

  const rotationStep = useMemo(() => {
    if (!lbpStep) return null;
    return getRotationInvariantLBPStep(lbpStep.binaryPattern);
  }, [lbpStep]);

  const gaborStep = useMemo(() => {
    if (mode !== 'gabor' || validWidth === 0 || validHeight === 0) return null;
    return getGaborFilterStep(originalImage, gaborKernel, outputCenter.x, outputCenter.y);
  }, [gaborKernel, mode, originalImage, outputCenter.x, outputCenter.y, validHeight, validWidth]);

  const currentStepIndex = validWidth > 0 ? safePosition.y * validWidth + safePosition.x : 0;
  const totalSteps = validWidth * validHeight;

  const resetPosition = useCallback((nextMode: TextureMode = mode, nextParams: GaborParams = gaborParams) => {
    const nextWindowSize = getWindowSize(nextMode, nextParams);
    const nextValidWidth = Math.max(0, inputWidth - nextWindowSize + 1);
    const nextValidHeight = Math.max(0, inputHeight - nextWindowSize + 1);
    setCurrentPosition({
      x: nextValidWidth > 0 ? Math.floor((nextValidWidth - 1) / 2) : 0,
      y: nextValidHeight > 0 ? Math.floor((nextValidHeight - 1) / 2) : 0,
    });
  }, [gaborParams, inputHeight, inputWidth, mode]);

  const handleDirectionMove = useGridNavigation({
    current: safePosition,
    bounds: { width: validWidth, height: validHeight },
    onMove: setCurrentPosition,
    disabled: validWidth === 0 || validHeight === 0,
  });

  const handleModeChange = useCallback((value: string) => {
    const nextMode = value as TextureMode;
    setMode(nextMode);
    resetPosition(nextMode, gaborParams);
  }, [gaborParams, resetPosition]);

  const handleImageTypeChange = useCallback((value: string) => {
    setImageType(value as TextureImageType);
    resetPosition();
  }, [resetPosition]);

  const handleGaborPresetChange = useCallback((value: string) => {
    setGaborPreset(value);
    const preset = GABOR_PRESETS.find(item => item.label === value);
    if (preset) {
      setGaborParams(preset);
      resetPosition('gabor', preset);
    }
  }, [resetPosition]);

  const updateGaborParam = useCallback((key: keyof GaborParams, value: number) => {
    setGaborPreset(CUSTOM_GABOR_PRESET);
    setGaborParams(prev => {
      const next = { ...prev, [key]: value };
      resetPosition('gabor', next);
      return next;
    });
  }, [resetPosition]);

  const handleInputRegionSelect = useCallback((x: number, y: number) => {
    if (validWidth === 0 || validHeight === 0) return;
    setCurrentPosition({
      x: clamp(x - halfWindow, 0, validWidth - 1),
      y: clamp(y - halfWindow, 0, validHeight - 1),
    });
  }, [halfWindow, validHeight, validWidth]);

  const handleOutputPixelSelect = useCallback((x: number, y: number) => {
    if (validWidth === 0 || validHeight === 0) return;
    setCurrentPosition({
      x: clamp(x - halfWindow, 0, validWidth - 1),
      y: clamp(y - halfWindow, 0, validHeight - 1),
    });
  }, [halfWindow, validHeight, validWidth]);

  const displayCurrentStep = {
    x: outputCenter.x,
    y: outputCenter.y,
    kernelSize: windowSize,
    regionX: safePosition.x,
    regionY: safePosition.y,
    regionWidth: windowSize,
    regionHeight: windowSize,
    outputX: outputCenter.x,
    outputY: outputCenter.y,
  };

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (validWidth === 0 || validHeight === 0) return [];

    return [
      {
        id: 'texture-input-window',
        tone: 'red',
        from: {
          kind: 'region',
          selector: '.conv-anchor-input-main',
          x: safePosition.x,
          y: safePosition.y,
          size: windowSize,
          imageWidth: inputWidth,
          imageHeight: inputHeight,
        },
        to: { kind: 'element', selector: '.texture-anchor-input-step' },
      },
      {
        id: 'texture-output-pixel',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: outputCenter.x,
          y: outputCenter.y,
          imageWidth: inputWidth,
          imageHeight: inputHeight,
        },
        to: { kind: 'element', selector: '.texture-anchor-output-step' },
      },
    ];
  }, [inputHeight, inputWidth, outputCenter.x, outputCenter.y, safePosition.x, safePosition.y, validHeight, validWidth, windowSize]);

  const analysisPreview = useMemo(() => {
    if (mode !== 'gabor' && lbpStep) {
      const displayedValue = mode === 'lbp-rotation' && rotationStep ? rotationStep.minValue : lbpStep.decimalValue;
      const outputTitle = mode === 'lbp-rotation' ? '写回旋转不变 LBP 图' : '写回 LBP 码图';

      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red" className="texture-anchor-input-step">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-red-700">当前 3x3 输入窗口</span>
                  <span className="font-mono text-[11px] text-red-600">
                    中心 ({outputCenter.x}, {outputCenter.y})
                  </span>
                </div>
                <MatrixPreview image={lbpStep.values} center={{ row: 1, col: 1 }} />
                <p className="mt-2 text-xs leading-5 text-red-700">
                  红色格是中心像素 I(c)={grayByte(lbpStep.center)}，周围 8 格逐个与它比较。
                </p>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-[11px] font-semibold uppercase text-amber-800">
                  阶跃比较与位权重
                </div>
                <div className="grid gap-2">
                  {lbpStep.binaryPattern.map((bit, index) => {
                    const position = LBP_NEIGHBOR_POSITIONS[index];
                    const pixelValue = lbpStep.values[position.row][position.col];
                    return (
                      <div
                        key={`flow-lbp-bit-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="text-amber-800">p{index + 1} {position.label}</span>
                        <span className="font-mono text-slate-700">
                          {grayByte(pixelValue)} {grayByte(pixelValue) >= grayByte(lbpStep.center) ? '>=' : '<'} {grayByte(lbpStep.center)}
                        </span>
                        <span className="font-mono font-semibold text-amber-800">
                          b={bit}, 2^{index}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald" className="texture-anchor-output-step">
                <div className="mb-2 text-[11px] font-semibold uppercase text-emerald-700">
                  {outputTitle}
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-3">
                  <div className="text-xs text-emerald-700">结果图当前像素</div>
                  <div className="mt-1 font-mono text-lg font-bold text-emerald-800">
                    ({outputCenter.x}, {outputCenter.y}) = {displayedValue}
                  </div>
                </div>
                {mode === 'lbp-rotation' && rotationStep && (
                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    8 种循环移位取最小值，当前最小 shift={rotationStep.minShift}。
                  </p>
                )}
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (mode === 'gabor' && gaborStep) {
      const centerTerm = gaborStep.products.find(term =>
        term.kernelX === halfWindow && term.kernelY === halfWindow
      );

      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red" className="texture-anchor-input-step">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-red-700">当前输入窗口</span>
                  <span className="font-mono text-[11px] text-red-600">{windowSize}x{windowSize}</span>
                </div>
                <ImageCanvas
                  image={gaborStep.inputRegion}
                  maxDisplaySize={150}
                  showGrid={windowSize <= 21}
                  selectedRegionMarker="dot"
                  selectedRegion={{ x: halfWindow, y: halfWindow, size: 1 }}
                />
                <p className="mt-2 text-xs leading-5 text-red-700">
                  核中心对准原图像素 ({gaborStep.x}, {gaborStep.y})，窗口完整覆盖原图。
                </p>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="sky">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-sky-700">Gabor 核与乘积</span>
                  <span className="font-mono text-[11px] text-sky-700">θ={gaborParams.orientation}°</span>
                </div>
                <ImageCanvas image={gaborKernelDisplay} maxDisplaySize={120} showGrid={windowSize <= 21} />
                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
                  中心项：{centerTerm ? `${formatFloat(centerTerm.pixelValue)} x ${formatFloat(centerTerm.kernelValue)} = ${formatFloat(centerTerm.product)}` : '无'}
                </div>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald" className="texture-anchor-output-step">
                <div className="mb-2 text-[11px] font-semibold uppercase text-emerald-700">写回滤波结果</div>
                <div className="grid gap-2 text-xs">
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-emerald-700">原始响应</div>
                    <div className="font-mono text-base font-bold text-emerald-800">{formatFloat(gaborStep.rawSum)}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-emerald-700">输出像素</div>
                    <div className="font-mono text-base font-bold text-emerald-800">
                      ({gaborStep.x}, {gaborStep.y}) = {formatFloat(gaborStep.outputValue)}
                    </div>
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    return null;
  }, [gaborKernelDisplay, gaborParams.orientation, gaborStep, halfWindow, lbpStep, mode, outputCenter.x, outputCenter.y, rotationStep, windowSize]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam label="处理模式" value={mode} onChange={handleModeChange} options={MODE_OPTIONS} />
      <SelectParam label="输入图像" value={imageType} onChange={handleImageTypeChange} options={IMAGE_OPTIONS} />

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">当前窗口</div>
        <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 font-mono text-sm font-semibold text-blue-800">
          ({safePosition.x}, {safePosition.y}) / {windowSize}x{windowSize}
        </div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          当前输出像素是窗口中心 ({outputCenter.x}, {outputCenter.y})。
        </p>
      </div>

      {mode === 'gabor' && (
        <>
          <SelectParam label="Gabor 预设" value={gaborPreset} onChange={handleGaborPresetChange} options={GABOR_PRESET_OPTIONS} />
          <SliderParam label="方向 θ" value={gaborParams.orientation} onChange={value => updateGaborParam('orientation', value)} min={0} max={180} step={15} unit="°" />
          <SliderParam label="波长 λ" value={gaborParams.wavelength} onChange={value => updateGaborParam('wavelength', value)} min={4} max={16} step={1} />
          <SliderParam label="方差 σ" value={gaborParams.sigma} onChange={value => updateGaborParam('sigma', value)} min={2} max={8} step={1} />
          <SliderParam label="纵横比 γ" value={gaborParams.gamma} onChange={value => updateGaborParam('gamma', value)} min={0.3} max={1} step={0.1} />
          <SliderParam label="核大小" value={gaborParams.kernelSize} onChange={value => updateGaborParam('kernelSize', value % 2 === 0 ? value + 1 : value)} min={15} max={31} step={2} />
        </>
      )}
    </div>
  );

  const stepDetails = (
    <div className="space-y-5">
      {mode !== 'gabor' && lbpStep && (
        <>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">LBP 当前窗口计算</h2>
            <p className="text-xs leading-6 text-slate-600">
              <TeachingTerm term="LBP" explanation="Local Binary Pattern，用中心像素阈值化周围 8 个邻域像素，得到 0~255 的局部纹理编码。" className="mr-1" />
              用中心像素作为阈值，把 3x3 邻域中的 8 个相邻像素编码为二进制模式。当前页面所有矩阵、位权重和结果值都来自主图红框中的真实像素。
            </p>
          </TeachingCard>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <TeachingCard>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">当前 3x3 灰度矩阵</h3>
              <MatrixPreview image={lbpStep.values} center={{ row: 1, col: 1 }} />
              <p className="mt-3 text-xs leading-5 text-slate-600">
                中心像素 I(c)={grayByte(lbpStep.center)}。每个邻域值大于等于中心值时记为 1，否则记为 0。
              </p>
            </TeachingCard>

            <FormulaCard
              label="当前 LBP 编码代入"
              mathML={buildLBPFormula(outputCenter.x, outputCenter.y, lbpStep.binaryPattern, lbpStep.decimalValue)}
              note="权重从 p1 到 p8 依次为 2^0 到 2^7，得到 0~255 的单像素纹理编码。"
            />
          </div>

          <TeachingCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">逐邻域比较</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2">邻域</th>
                    <th className="px-3 py-2">位置</th>
                    <th className="px-3 py-2">I(p)</th>
                    <th className="px-3 py-2">I(c)</th>
                    <th className="px-3 py-2">比较</th>
                    <th className="px-3 py-2">bit</th>
                    <th className="px-3 py-2">贡献</th>
                  </tr>
                </thead>
                <tbody>
                  {lbpStep.binaryPattern.map((bit, index) => {
                    const position = LBP_NEIGHBOR_POSITIONS[index];
                    const pixelValue = lbpStep.values[position.row][position.col];
                    const contribution = bit * 2 ** index;
                    return (
                      <tr key={`lbp-table-${index}`} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-mono text-slate-700">p{index + 1}</td>
                        <td className="px-3 py-2 text-slate-600">{position.label}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{grayByte(pixelValue)}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{grayByte(lbpStep.center)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">
                          {grayByte(pixelValue)} - {grayByte(lbpStep.center)} = {grayByte(pixelValue) - grayByte(lbpStep.center)}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-amber-700">{bit}</td>
                        <td className="px-3 py-2 font-mono text-emerald-700">{bit} x 2^{index} = {contribution}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TeachingCard>

          {mode === 'lbp-rotation' && rotationStep && (
            <>
              <FormulaCard
                label="旋转不变 LBP 代入"
                mathML={buildRotationInvariantFormula(rotationStep.rotations.map(item => item.decimalValue), rotationStep.minValue, rotationStep.minShift)}
                note="旋转不变 LBP 把同一二进制环的 8 种起点都算一遍，取最小值作为该邻域的编码。"
              />
              <TeachingCard>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">8 种循环移位</h3>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {rotationStep.rotations.map(item => (
                    <div
                      key={`rotation-${item.shift}`}
                      className={`rounded-xl border px-3 py-2 ${
                        item.shift === rotationStep.minShift
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-semibold">shift={item.shift}</div>
                      <div className="mt-1 font-mono text-xs">{item.binaryPattern.join('')}</div>
                      <div className="mt-1 font-mono text-xs">value={item.decimalValue}</div>
                    </div>
                  ))}
                </div>
              </TeachingCard>
            </>
          )}
        </>
      )}

      {mode === 'gabor' && gaborStep && (
        <>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Gabor 当前窗口计算</h2>
            <p className="text-xs leading-6 text-slate-600">
              <TeachingTerm term="Gabor 预设" explanation="预设把方向、波长、方差等参数组合成一类纹理探测器；切到自定义后只看当前参数的响应。" className="mr-1" />
              滤波器用带方向和频率的核与局部窗口逐项相乘。当前演示只选核完整覆盖原图的位置，所以公式里的每一项都来自真实图像像素，不使用边界补零。
            </p>
          </TeachingCard>

          <FormulaCard
            label="当前 Gabor 核参数代入"
            mathML={buildGaborKernelFormula(gaborParams)}
            note={`当前参数：λ=${gaborParams.wavelength} 控制条纹间隔，θ=${gaborParams.orientation}° 控制响应方向，σ=${gaborParams.sigma} 控制核覆盖范围，γ=${formatFloat(gaborParams.gamma, 1)}，核大小=${gaborParams.kernelSize}x${gaborParams.kernelSize}。`}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <TeachingCard>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">当前输入窗口</h3>
              <ImageCanvas
                image={gaborStep.inputRegion}
                maxDisplaySize={220}
                showGrid={windowSize <= 21}
                selectedRegionMarker="dot"
                selectedRegion={{ x: halfWindow, y: halfWindow, size: 1 }}
              />
              <p className="mt-3 text-xs leading-5 text-slate-600">
                红点对应输出像素 ({gaborStep.x}, {gaborStep.y})，核围绕该中心与窗口逐项对齐。
              </p>
            </TeachingCard>

            <TeachingCard>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Gabor 核矩阵预览</h3>
              <KernelPreview kernel={gaborStep.kernel} />
              <p className="mt-3 text-xs leading-5 text-slate-600">
                蓝色格表示正权重，红色格表示负权重。核的条纹方向、正负交替和密度会随参数实时改变。
              </p>
            </TeachingCard>
          </div>

          <FormulaCard
            label="当前 Gabor 响应代入"
            mathML={buildGaborResponseFormula(gaborStep.rawSum, gaborStep.kernelAbsSum, gaborStep.normalizedResponse, gaborStep.outputValue)}
            note="先对窗口与核逐项相乘求和，再除以核绝对值和做归一化，最后映射回 [0,1] 作为结果图灰度。"
          />

          <TeachingCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">逐项乘积摘要</h3>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {gaborStep.products
                .filter((_, index) => index % Math.max(1, Math.floor(gaborStep.products.length / 12)) === 0)
                .slice(0, 12)
                .map(term => (
                  <div key={`product-${term.kernelX}-${term.kernelY}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                    <div className="font-mono text-slate-500">k({term.kernelX},{term.kernelY})</div>
                    <div className="mt-1 font-mono text-slate-700">
                      {formatFloat(term.pixelValue)} x {formatFloat(term.kernelValue)} = {formatFloat(term.product)}
                    </div>
                  </div>
                ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              摘要只抽样展示部分乘积；当前响应值由全部 {gaborStep.products.length} 项共同求和得到。
            </p>
          </TeachingCard>
        </>
      )}

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">LBP 与 Gabor 的教学对比</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-6 text-amber-800">
            LBP 关注局部灰度相对大小。整体光照同增同减时，比较关系通常不变，因此编码相对稳定。
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-6 text-sky-800">
            Gabor 关注特定
            <TeachingTerm term="方向 θ" explanation="θ 决定 Gabor 核的朝向，只有与纹理方向匹配时响应才会明显。" className="mx-1" />
            和
            <TeachingTerm term="波长 λ" explanation="λ 决定条纹周期，越大越偏向较宽的纹理结构。" className="mx-1" />
            的纹理响应。
            <TeachingTerm term="方差 σ" explanation="σ 决定核的空间覆盖范围，越大参考的邻域越宽。" className="mx-1" />
            改变时，会直接改变核对条纹、棋盘和渐变区域的响应强度。
          </div>
        </div>
      </TeachingCard>
    </div>
  );

  const resultLabel = mode === 'lbp'
    ? 'LBP 码图像'
    : mode === 'lbp-rotation'
      ? '旋转不变 LBP'
      : 'Gabor 滤波结果';

  return (
    <ConceptLayout
      title="LBP 与 Gabor 纹理特征"
      subtitle="Local Binary Pattern & Gabor Filter - 纹理的局部编码与频率选择性滤波"
      operationLabel={mode === 'gabor' ? 'Gabor 滤波' : 'LBP 编码'}
      parameterIntro="选择输入图和纹理特征模式后，点击图像或使用方向键移动当前窗口，观察公式、编码和滤波响应实时刷新。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={visualOverlayPaths.length > 0 ? <AnchoredOverlay paths={visualOverlayPaths} /> : null}
      codeTab={
        <CodeViewer
          languages={[
            { name: 'LBP', code: LBP_CODE_TS },
            { name: 'Gabor', code: GABOR_CODE_TS },
          ]}
        />
      }
      currentStep={totalSteps > 0 ? displayCurrentStep : null}
      currentStepLabel={mode === 'gabor' ? '当前滤波中心' : '当前 LBP 中心'}
      stepInfo={totalSteps > 0 ? { current: currentStepIndex, total: totalSteps } : null}
      imageLabels={{ input: imageType === 'lenaOriginal' ? 'Lena 灰度图' : '纹理测试图', output: resultLabel }}
      imageHints={{
        input: `红框为当前 ${windowSize}x${windowSize} 输入窗口，点击可重新定位`,
        output: '绿框为当前输出像素，点击结果图可反向定位窗口中心',
      }}
      showOriginalGrid={imageType === 'texture'}
      originalRegionMarker="frame"
      singlePageScroll
      navigationHintText="方向键移动 / 点击原图或结果图定位纹理窗口"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
    />
  );
}
