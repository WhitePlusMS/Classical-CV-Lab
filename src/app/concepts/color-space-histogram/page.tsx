'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnchoredOverlay,
  type AnchoredOverlayPath,
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  PixelColorSwatch,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  ColorDisplayMode,
  ColorHistogram,
  ColorHistogramChannel,
  ColorSpaceStep,
  RgbPixel,
  computeColorHistogram,
  createHueMask,
  extractColorChannel,
  getColorSpaceStepAt,
} from '@/lib/algorithms/colorSpaceHistogram';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import {
  centerCropRgbImage,
  clamp,
  loadImageAsRgb,
  resizeRgbImage,
} from '@/lib/utils/imageProcessing';

const BIN_COUNT = 18;
const DEFAULT_THRESHOLD = 35;

const DISPLAY_MODE_OPTIONS = [
  { value: 'rgb', label: 'RGB 彩图' },
  { value: 'r', label: 'R 通道' },
  { value: 'g', label: 'G 通道' },
  { value: 'b', label: 'B 通道' },
  { value: 'h', label: 'H 色调' },
  { value: 's', label: 'S 饱和度' },
  { value: 'v', label: 'V 明度' },
  { value: 'mask', label: 'HSV 颜色提取' },
] as const;

const CORE_CODE_TS = `function rgbToHsv(r, g, b) {
  const cmax = Math.max(r, g, b);
  const cmin = Math.min(r, g, b);
  const delta = cmax - cmin;

  let h = 0;
  if (delta === 0) h = 0;
  else if (cmax === r) h = 60 * (((g - b) / delta) % 6);
  else if (cmax === g) h = 60 * ((b - r) / delta + 2);
  else h = 60 * ((r - g) / delta + 4);
  if (h < 0) h += 360;

  return {
    h,
    s: cmax === 0 ? 0 : delta / cmax,
    v: cmax,
  };
}

function computeColorHistogram(rgbImage, channel, binCount) {
  const bins = new Array(binCount).fill(0);
  for (const row of rgbImage) {
    for (const [r, g, b] of row) {
      const hsv = rgbToHsv(r, g, b);
      const value = channel === 'h' ? hsv.h / 360 :
        channel === 's' ? hsv.s :
        channel === 'v' ? hsv.v :
        channel === 'r' ? r :
        channel === 'g' ? g : b;
      bins[Math.min(binCount - 1, Math.floor(value * binCount))] += 1;
    }
  }
  return bins;
}

function createHueMask(rgbImage, targetHue, thresholdDegrees) {
  return rgbImage.map(row => row.map(([r, g, b]) => {
    const hue = rgbToHsv(r, g, b).h;
    const diff = Math.min(Math.abs(hue - targetHue), 360 - Math.abs(hue - targetHue));
    return diff <= thresholdDegrees ? 1 : 0;
  }));
}`;

function toRgbPixels(image: number[][][]): RgbPixel[][] {
  return image.map(row =>
    row.map(pixel => [
      clamp(pixel[0] ?? 0, 0, 1),
      clamp(pixel[1] ?? 0, 0, 1),
      clamp(pixel[2] ?? 0, 0, 1),
    ])
  );
}

function createFallbackRgbImage(size = 96): RgbPixel[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const nx = x / Math.max(1, size - 1);
      const ny = y / Math.max(1, size - 1);
      const redObject = Math.exp(-(((nx - 0.36) / 0.18) ** 2 + ((ny - 0.46) / 0.2) ** 2));
      const greenObject = Math.exp(-(((nx - 0.68) / 0.16) ** 2 + ((ny - 0.58) / 0.18) ** 2));
      const r = clamp(0.22 + redObject * 0.68 + nx * 0.18, 0, 1);
      const g = clamp(0.24 + greenObject * 0.62 + (1 - ny) * 0.18, 0, 1);
      const b = clamp(0.34 + (1 - redObject) * 0.18 + ny * 0.28, 0, 1);
      return [r, g, b] as RgbPixel;
    })
  );
}

function rgbToLumaImage(rgbImage: RgbPixel[][]): GrayscaleImage {
  return rgbImage.map(row =>
    row.map(([r, g, b]) => clamp(0.299 * r + 0.587 * g + 0.114 * b, 0, 1))
  );
}

function countMaskPixels(mask: GrayscaleImage): number {
  return mask.reduce(
    (total, row) => total + row.reduce((rowTotal, value) => rowTotal + (value > 0 ? 1 : 0), 0),
    0
  );
}

function hueDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

function channelLabel(channel: ColorHistogramChannel): string {
  const labels: Record<ColorHistogramChannel, string> = {
    r: 'R 通道',
    g: 'G 通道',
    b: 'B 通道',
    h: 'H 色调',
    s: 'S 饱和度',
    v: 'V 明度',
  };
  return labels[channel];
}

function modeLabel(mode: ColorDisplayMode): string {
  if (mode === 'rgb') return 'RGB 彩图';
  if (mode === 'mask') return 'HSV 颜色提取';
  return channelLabel(mode);
}

function operationLabel(mode: ColorDisplayMode): string {
  if (mode === 'mask') return '颜色范围提取';
  if (mode === 'rgb') return 'RGB → HSV';
  return '通道提取';
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function buildRgbNormalizeFormula(step: ColorSpaceStep): string {
  const [r, g, b] = step.rgb255;
  return buildInlineMathML(`
    <mrow>
      <msup><mi>R</mi><mo>&#8242;</mo></msup><mo>=</mo><mfrac><mn>${r}</mn><mn>255</mn></mfrac><mo>=</mo><mn>${step.rgb[0].toFixed(3)}</mn>
      <mo>,</mo>
      <msup><mi>G</mi><mo>&#8242;</mo></msup><mo>=</mo><mfrac><mn>${g}</mn><mn>255</mn></mfrac><mo>=</mo><mn>${step.rgb[1].toFixed(3)}</mn>
      <mo>,</mo>
      <msup><mi>B</mi><mo>&#8242;</mo></msup><mo>=</mo><mfrac><mn>${b}</mn><mn>255</mn></mfrac><mo>=</mo><mn>${step.rgb[2].toFixed(3)}</mn>
    </mrow>
  `);
}

function buildHsvExtremaFormula(step: ColorSpaceStep): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>C</mi><mi>max</mi></msub><mo>=</mo><mo>max</mo><mo>(</mo><mn>${step.rgb[0].toFixed(3)}</mn><mo>,</mo><mn>${step.rgb[1].toFixed(3)}</mn><mo>,</mo><mn>${step.rgb[2].toFixed(3)}</mn><mo>)</mo><mo>=</mo><mn>${step.cmax.toFixed(3)}</mn>
      <mo>,</mo>
      <msub><mi>C</mi><mi>min</mi></msub><mo>=</mo><mn>${step.cmin.toFixed(3)}</mn>
      <mo>,</mo>
      <mi>&#916;</mi><mo>=</mo><mn>${step.delta.toFixed(3)}</mn>
    </mrow>
  `);
}

function buildHsvResultFormula(step: ColorSpaceStep): string {
  return buildInlineMathML(`
    <mrow>
      <mi>HSV</mi><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo>
      <mo>=</mo>
      <mo>(</mo><mn>${step.hsv.h.toFixed(1)}</mn><mo>&#176;</mo><mo>,</mo><mn>${step.hsv.s.toFixed(3)}</mn><mo>,</mo><mn>${step.hsv.v.toFixed(3)}</mn><mo>)</mo>
    </mrow>
  `);
}

function buildHistogramFormula(step: ColorSpaceStep, histogram: ColorHistogram): string {
  const count = histogram.counts[step.histogramBin] ?? 0;
  const probability = histogram.bins[step.histogramBin] ?? 0;
  return buildInlineMathML(`
    <mrow>
      <mi>H</mi><mo>(</mo><mn>${step.histogramBin}</mn><mo>)</mo>
      <mo>=</mo>
      <mfrac><mrow><mi>count</mi><mo>(</mo><mn>${step.histogramBin}</mn><mo>)</mo></mrow><mi>N</mi></mfrac>
      <mo>=</mo>
      <mfrac><mn>${count}</mn><mn>${histogram.totalPixels}</mn></mfrac>
      <mo>=</mo>
      <mn>${probability.toFixed(4)}</mn>
    </mrow>
  `);
}

function buildMaskFormula(step: ColorSpaceStep, targetHue: number, threshold: number): string {
  const distance = hueDistance(step.hsv.h, targetHue);
  return buildInlineMathML(`
    <mrow>
      <mo>|</mo><mi>H</mi><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo><mo>-</mo><msub><mi>H</mi><mn>0</mn></msub><mo>|</mo>
      <mo>=</mo>
      <mn>${distance.toFixed(1)}</mn><mo>&#176;</mo>
      <mo>&#8804;</mo>
      <mn>${threshold}</mn><mo>&#176;</mo>
      <mo>=</mo>
      <mn>${distance <= threshold ? 1 : 0}</mn>
    </mrow>
  `);
}

function HistogramBars({
  histogram,
  highlightedBin,
}: {
  histogram: ColorHistogram;
  highlightedBin: number;
}) {
  const maxValue = Math.max(0.001, ...histogram.bins);

  return (
    <div className="h-28 rounded-xl border border-sky-200 bg-sky-50/60 px-2 py-2">
      <div className="flex h-full items-end gap-1">
        {histogram.bins.map((value, index) => (
          <div key={`${histogram.channel}-${index}`} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className={`w-full rounded-t-sm ${
                index === highlightedBin ? 'bg-amber-500' : 'bg-sky-500'
              }`}
              style={{ height: `${Math.max(4, (value / maxValue) * 76)}px` }}
              title={`bin ${index}: ${histogram.counts[index]} pixels`}
            />
            {index % 3 === 0 ? (
              <span className="font-mono text-[8px] text-slate-400">{index}</span>
            ) : (
              <span className="h-[10px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ColorSpaceHistogramPage() {
  const [displayMode, setDisplayMode] = useState<ColorDisplayMode>('mask');
  const [currentPosition, setCurrentPosition] = useState({ x: 38, y: 44 });
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [loadedRgbImage, setLoadedRgbImage] = useState<RgbPixel[][] | null>(null);
  const fallbackRgbImage = useMemo(() => createFallbackRgbImage(), []);

  useEffect(() => {
    let cancelled = false;

    loadImageAsRgb('/assets/lena-original.jpg')
      .then(image => {
        if (!cancelled) {
          setLoadedRgbImage(toRgbPixels(resizeRgbImage(centerCropRgbImage(image), 96)));
        }
      })
      .catch(error => {
        console.error('加载颜色空间教学图失败:', error);
        if (!cancelled) setLoadedRgbImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rgbImage = loadedRgbImage ?? fallbackRgbImage;
  const width = rgbImage[0]?.length ?? 0;
  const height = rgbImage.length;
  const baseImage = useMemo(() => rgbToLumaImage(rgbImage), [rgbImage]);

  const safePosition = {
    x: width > 0 ? Math.min(currentPosition.x, width - 1) : 0,
    y: height > 0 ? Math.min(currentPosition.y, height - 1) : 0,
  };

  const currentStep = useMemo(
    () => getColorSpaceStepAt(rgbImage, safePosition.x, safePosition.y, displayMode, threshold, BIN_COUNT),
    [displayMode, rgbImage, safePosition.x, safePosition.y, threshold]
  );

  const histogram = useMemo(
    () => computeColorHistogram(rgbImage, displayMode, BIN_COUNT),
    [displayMode, rgbImage]
  );

  const maskImage = useMemo(() => {
    if (!currentStep) return baseImage;
    return createHueMask(rgbImage, currentStep.hsv.h, threshold);
  }, [baseImage, currentStep, rgbImage, threshold]);

  const resultImage = useMemo<GrayscaleImage>(() => {
    if (displayMode === 'rgb') return baseImage;
    if (displayMode === 'mask') return maskImage;
    return extractColorChannel(rgbImage, displayMode) ?? baseImage;
  }, [baseImage, displayMode, maskImage, rgbImage]);

  const resultRgbImage = displayMode === 'rgb' ? rgbImage : null;
  const currentStepIndex = safePosition.y * width + safePosition.x;
  const totalSteps = width * height;
  const maskPixelCount = useMemo(() => countMaskPixels(maskImage), [maskImage]);

  const handlePixelSelect = useCallback((x: number, y: number) => {
    if (width === 0 || height === 0) return;
    setCurrentPosition({
      x: Math.max(0, Math.min(x, width - 1)),
      y: Math.max(0, Math.min(y, height - 1)),
    });
  }, [height, width]);

  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.x, y: currentStep.y } : null,
    bounds: { width, height },
    onMove: setCurrentPosition,
    disabled: totalSteps === 0,
  });

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (!currentStep || width === 0 || height === 0) return [];

    return [
      {
        id: 'color-input-pixel',
        tone: 'red',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-input-main',
          x: currentStep.x,
          y: currentStep.y,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.color-anchor-rgb-node' },
      },
      {
        id: 'color-output-pixel',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: currentStep.x,
          y: currentStep.y,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.color-anchor-mask-node' },
      },
    ];
  }, [currentStep, height, width]);

  const visualOverlay = visualOverlayPaths.length > 0 ? (
    <AnchoredOverlay paths={visualOverlayPaths} />
  ) : null;

  const analysisPreview = useMemo(() => {
    if (!currentStep) return null;
    const [r, g, b] = currentStep.rgb255;
    const currentCount = histogram.counts[currentStep.histogramBin] ?? 0;
    const currentProbability = histogram.bins[currentStep.histogramBin] ?? 0;

    return (
      <ProcessRail>
        <FlowColumns>
          <FlowColumn align="start">
            <FlowNode tone="red" className="color-anchor-rgb-node">
              <div className="mb-2 text-xs font-semibold text-red-700">当前像素 RGB</div>
              <div className="flex items-center gap-3">
                <PixelColorSwatch
                  color={{ r: currentStep.rgb[0], g: currentStep.rgb[1], b: currentStep.rgb[2] }}
                  className="h-14 w-14"
                  title={`RGB(${r}, ${g}, ${b})`}
                />
                <div className="font-mono text-sm leading-6 text-slate-700">
                  <div>R = {r}</div>
                  <div>G = {g}</div>
                  <div>B = {b}</div>
                </div>
              </div>
              <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                坐标 ({currentStep.x}, {currentStep.y}) 的真实像素值进入后续 HSV 和直方图计算。
              </div>
            </FlowNode>
          </FlowColumn>

          <FlowColumn align="center">
            <FlowNode tone="amber">
              <div className="mb-2 text-xs font-semibold text-amber-700">RGB → HSV</div>
              <div className="grid gap-2 text-xs text-amber-800">
                <div className="rounded-xl bg-amber-50 px-3 py-2">
                  Cmax = {currentStep.cmax.toFixed(3)}，Cmin = {currentStep.cmin.toFixed(3)}，Δ = {currentStep.delta.toFixed(3)}
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono">
                  H = {currentStep.hsv.h.toFixed(1)}°<br />
                  S = {formatPercent(currentStep.hsv.s)}<br />
                  V = {formatPercent(currentStep.hsv.v)}
                </div>
              </div>
            </FlowNode>

            <FlowNode tone="sky">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-sky-700">{channelLabel(histogram.channel)}直方图</span>
                <span className="font-mono text-[11px] text-sky-700">bin {currentStep.histogramBin}</span>
              </div>
              <HistogramBars histogram={histogram} highlightedBin={currentStep.histogramBin} />
              <div className="mt-2 text-xs leading-5 text-slate-600">
                当前 bin 有 {currentCount} 个像素，比例为 {formatPercent(currentProbability)}。
              </div>
            </FlowNode>
          </FlowColumn>

          <FlowColumn align="end">
            <FlowNode tone="emerald" className="color-anchor-mask-node">
              <div className="mb-2 text-xs font-semibold text-emerald-700">颜色范围提取</div>
              <div className="grid gap-2 text-xs leading-5 text-emerald-800">
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  目标色调 H0 = {currentStep.hsv.h.toFixed(1)}°，阈值 T = {threshold}°
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2">
                  当前 mask 共选中 {maskPixelCount} / {totalSteps} 个像素。
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 font-semibold">
                  当前像素：{currentStep.thresholdHit ? '命中目标色范围' : '未命中'}
                </div>
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [currentStep, histogram, maskPixelCount, threshold, totalSteps]);

  const stepDetails = useMemo(() => {
    if (!currentStep) return null;

    return (
      <div className="space-y-4">
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">当前像素的 RGB → HSV 代入</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                HSV 先把 RGB 归一化，再用最大值、最小值和差值决定色调、饱和度与明度。
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              ({currentStep.x}, {currentStep.y})
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <FormulaCard label="归一化" mathML={buildRgbNormalizeFormula(currentStep)} />
            <FormulaCard label="极值与差值" mathML={buildHsvExtremaFormula(currentStep)} />
            <FormulaCard label="HSV 结果" mathML={buildHsvResultFormula(currentStep)} />
          </div>
        </TeachingCard>

        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">当前直方图 bin</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            直方图不关心颜色出现在哪里，只统计当前通道数值落入每个区间的像素比例。
          </p>
          <div className="mt-4">
            <HistogramBars histogram={histogram} highlightedBin={currentStep.histogramBin} />
          </div>
          <FormulaCard
            className="mt-4"
            label={`${channelLabel(histogram.channel)} 的归一化直方图`}
            mathML={buildHistogramFormula(currentStep, histogram)}
          />
        </TeachingCard>

        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">HSV 颜色范围提取</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            以当前像素的 H 作为目标色调 H0，在色调环上选择距离不超过阈值 T 的像素，得到右侧 mask。
          </p>
          <FormulaCard
            className="mt-4"
            label="Hue 阈值判定"
            mathML={buildMaskFormula(currentStep, currentStep.hsv.h, threshold)}
            note={`当前阈值选中 ${maskPixelCount} 个像素，占整幅图 ${formatPercent(maskPixelCount / Math.max(1, totalSteps))}。`}
          />
        </TeachingCard>

        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">概念补充</div>
          <p className="mt-1 text-xs leading-6 text-slate-600">
            RGB 适合描述显示设备中的三基色强度，HSV 把颜色拆成色调、饱和度和明度。目标颜色与背景差异明显时，
            H 分量和颜色直方图可以作为简单、直观的目标检测特征。
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <figure>
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <img src="/assets/color-space-histogram/rgb-cube.jpg" alt="RGB 颜色立方体" className="h-full w-full object-contain" />
              </div>
              <figcaption className="mt-2 text-center text-xs font-medium text-slate-500">RGB 颜色立方体</figcaption>
            </figure>
            <figure>
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <img src="/assets/color-space-histogram/hsv-cone.jpg" alt="HSV 圆锥空间模型" className="h-full w-full object-contain" />
              </div>
              <figcaption className="mt-2 text-center text-xs font-medium text-slate-500">HSV 圆锥空间模型</figcaption>
            </figure>
          </div>
        </TeachingCard>
      </div>
    );
  }, [currentStep, histogram, maskPixelCount, threshold, totalSteps]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="显示模式"
        value={displayMode}
        onChange={value => setDisplayMode(value as ColorDisplayMode)}
        options={DISPLAY_MODE_OPTIONS}
      />

      <SliderParam
        label="Hue 阈值 T"
        value={threshold}
        onChange={setThreshold}
        min={5}
        max={90}
        step={5}
      />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
        <div className="text-xs font-semibold text-emerald-800">阈值含义</div>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          在 HSV 色调环上，以当前像素 H0 为中心，选择 H0 ± {threshold}° 范围内的像素作为目标颜色。
        </p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">当前图像</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          尺寸 {width}×{height}，共 {totalSteps} 个像素。点击图像或使用方向键会同步刷新公式、直方图和 mask。
        </p>
      </div>

      {currentStep && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3">
          <div className="text-xs font-semibold text-amber-800">当前像素</div>
          <div className="mt-2 flex items-center gap-3">
            <PixelColorSwatch
              color={{ r: currentStep.rgb[0], g: currentStep.rgb[1], b: currentStep.rgb[2] }}
              className="h-10 w-10"
            />
            <div className="space-y-1 font-mono text-[11px] text-amber-800">
              <div>坐标 ({currentStep.x}, {currentStep.y})</div>
              <div>RGB ({currentStep.rgb255.join(', ')})</div>
              <div>HSV ({currentStep.hsv.h.toFixed(1)}°, {formatPercent(currentStep.hsv.s)}, {formatPercent(currentStep.hsv.v)})</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ConceptLayout
      title="颜色空间与颜色直方图"
      subtitle="Color Space & Histogram - 基于颜色特征的目标检测"
      operationLabel={operationLabel(displayMode)}
      parameterIntro="切换颜色通道或 HSV mask，观察当前像素如何驱动公式代入、直方图 bin 和颜色范围提取。"
      originalImage={baseImage}
      originalRgbImage={rgbImage}
      resultImage={resultImage}
      resultRgbImage={resultRgbImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={visualOverlay}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: CORE_CODE_TS }]} />}
      currentStep={
        currentStep
          ? { x: currentStep.x, y: currentStep.y, kernelSize: 1 }
          : null
      }
      stepInfo={totalSteps > 0 ? { current: currentStepIndex, total: totalSteps } : null}
      imageLabels={{
        input: '真实 RGB 原图',
        output: modeLabel(displayMode),
      }}
      imageHints={{
        input: '点击像素选择目标颜色并刷新 HSV 计算',
        output: displayMode === 'mask' ? '白色表示 Hue 阈值命中区域' : '点击结果图同步定位像素',
      }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      navigationHintText="方向键移动 / 点击原图或结果图定位像素"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handlePixelSelect}
      onOutputPixelSelect={handlePixelSelect}
    />
  );
}
