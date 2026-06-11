'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FormulaCard,
  ImageCanvas,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import { computeHistogram, otsuThreshold } from '@/lib/algorithms/threshold';
import {
  ThresholdOutputMode,
  ThresholdSceneType,
  applyThresholdMode,
  computeKittlerGradientThreshold,
  createOtsuVarianceProfile,
  createThresholdScene,
} from '@/lib/algorithms/simpleBackground';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';

type ThresholdMethod = 'manual' | 'otsu' | 'kittler';
type ThresholdInputType = ThresholdSceneType | 'lenaOriginal';

const METHOD_OPTIONS = [
  { value: 'manual', label: '固定阈值 T' },
  { value: 'otsu', label: 'OTSU 自动阈值' },
  { value: 'kittler', label: 'Kittler 梯度阈值' },
] as const;

const SCENE_OPTIONS = [
  { value: 'bimodal', label: '双峰前景' },
  { value: 'spotlight', label: '光斑目标' },
  { value: 'noisyObject', label: '含噪目标' },
  { value: 'lenaOriginal', label: 'Lena 灰度图' },
] as const;

const OUTPUT_OPTIONS = [
  { value: 'binary', label: 'BINARY（二值）' },
  { value: 'binaryInv', label: 'BINARY_INV（反二值）' },
  { value: 'trunc', label: 'TRUNC（截断）' },
  { value: 'tozero', label: 'TOZERO（低值清零）' },
  { value: 'tozeroInv', label: 'TOZERO_INV（高值清零）' },
] as const;

 const OUTPUT_MODE_TEXT: Record<ThresholdOutputMode, {
   name: string;
   description: string;
 }> = {
   binary: {
     name: 'BINARY',
     description: '大于等于阈值的像素输出最大值，其他像素输出 0。适合生成前景掩膜。',
   },
   binaryInv: {
     name: 'BINARY_INV',
     description: '大于等于阈值的像素输出 0，其他像素输出最大值。适合目标比背景更暗的情形。',
   },
   trunc: {
     name: 'TRUNC',
     description: '大于阈值的像素被截断为阈值，其他像素保留原灰度。该模式不是二值掩膜。',
   },
   tozero: {
     name: 'TOZERO',
     description: '大于等于阈值的像素保留原灰度，其他像素置 0。该模式保留亮目标的灰度细节。',
   },
   tozeroInv: {
     name: 'TOZERO_INV',
     description: '小于阈值的像素保留原灰度，其他像素置 0。该模式保留暗目标的灰度细节。',
   },
 };
 
const THRESHOLD_CODE_TS = `function fixedThreshold(image: number[][], threshold: number): number[][] {
  return image.map(row =>
    row.map(gray => (gray * 255 >= threshold ? 1 : 0))
  );
}

function otsuThreshold(histogram: number[], total: number): number {
  let totalGray = 0;
  for (let i = 0; i < 256; i++) totalGray += i * histogram[i];

  let backgroundCount = 0;
  let backgroundGray = 0;
  let bestThreshold = 0;
  let maxVariance = 0;

  for (let t = 0; t < 256; t++) {
    backgroundCount += histogram[t];
    backgroundGray += t * histogram[t];
    const foregroundCount = total - backgroundCount;
    if (backgroundCount === 0 || foregroundCount === 0) continue;

    const mu0 = backgroundGray / backgroundCount;
    const mu1 = (totalGray - backgroundGray) / foregroundCount;
    const w0 = backgroundCount / total;
    const w1 = foregroundCount / total;
     const variance = w0 * w1 * (mu0 - mu1) ** 2; // σ²_B = ω₀ ω₁ (μ₀ - μ₁)²，标准 OTSU 类间方差（w0,w1 已含 ÷total 归一化）

    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }
  return bestThreshold;
}

function kittlerCourseThreshold(image: number[][]): number {
  let weightedGraySum = 0;
  let gradientSum = 0;

  for (let y = 1; y < image.length - 1; y++) {
    for (let x = 1; x < image[0].length - 1; x++) {
      const fi = image[y + 1][x] - image[y - 1][x];
      const fj = image[y][x + 1] - image[y][x - 1];
      const grad = Math.max(Math.abs(fi), Math.abs(fj));
      weightedGraySum += grad * image[y][x] * 255;
      gradientSum += grad;
    }
  }

  return Math.round(weightedGraySum / gradientSum);
}`;

function numberNode(value: number | string): string {
  return `<mn>${value}</mn>`;
}

function byteValue(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

function modeFormulaMathML(mode: ThresholdOutputMode, src: number, threshold: number, dst: number): string {
  // 每个输出模式的 MathML 分段函数定义 + 代入链
  const substitution = `
    <mspace width="0.8em"/>
    <mi>f</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
    <mo>=</mo>${numberNode(src)}
    <mo>,</mo>
    <mi>T</mi><mo>=</mo>${numberNode(threshold)}
    <mo>→</mo>
    <mi>F</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
    <mo>=</mo>${numberNode(dst)}
  `;

  let piecewise: string;

  switch (mode) {
    case 'binary':
      piecewise = `<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>255</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`;
      break;
    case 'binaryInv':
      piecewise = `<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>255</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`;
      break;
    case 'trunc':
      piecewise = `<mi>min</mi><mo>(</mo><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>,</mo><mi>T</mi><mo>)</mo>`;
      break;
    case 'tozero':
      piecewise = `<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`;
      break;
    case 'tozeroInv':
      piecewise = `<mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>`;
      break;
  }

  return buildInlineMathML(`
    <mrow>
      <mi>F</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
      <mo>=</mo>
      <mrow>
        ${piecewise}
      </mrow>
      <mo>,</mo>
      ${substitution}
    </mrow>
  `);
}

function fixedThresholdFormulaMathML(threshold: number, src: number, dst: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>F</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
      <mo>=</mo>
      <mrow>
        <mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>≥</mo><mi>T</mi></mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mi>f</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>&lt;</mo><mi>T</mi></mtd>
          </mtr>
        </mtable>
      </mrow>
      <mo>,</mo>
      <mi>T</mi><mo>=</mo>${numberNode(threshold)}
      <mo>,</mo>
      <mi>f</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
      <mo>=</mo>${numberNode(src)}
      <mo>⇒</mo>
      <mi>F</mi><mo>(</mo><msub><mi>x</mi><mn>0</mn></msub><mo>,</mo><msub><mi>y</mi><mn>0</mn></msub><mo>)</mo>
      <mo>=</mo>${numberNode(dst)}
    </mrow>
  `);
}

function otsuFormulaMathML(threshold: number, bestVariance: number): string {
  return buildInlineMathML(`
    <mrow>
      <msup><mi>T</mi><mo>*</mo></msup>
      <mo>=</mo>
      <munder>
        <mrow><mi>argmax</mi></mrow>
        <mrow><mn>0</mn><mo>≤</mo><mi>t</mi><mo>≤</mo><mn>255</mn></mrow>
      </munder>
      <msubsup><mi>σ</mi><mi>B</mi><mn>2</mn></msubsup><mo>(</mo><mi>t</mi><mo>)</mo>
      <mspace width="1em"/>
      <msubsup><mi>σ</mi><mi>B</mi><mn>2</mn></msubsup><mo>(</mo><mi>t</mi><mo>)</mo>
      <mo>=</mo>
      <msub><mi>ω</mi><mn>0</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo>
      <msub><mi>ω</mi><mn>1</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo>
      <msup>
        <mrow><mo>(</mo><msub><mi>μ</mi><mn>0</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo><mo>-</mo><msub><mi>μ</mi><mn>1</mn></msub><mo>(</mo><mi>t</mi><mo>)</mo><mo>)</mo></mrow>
        <mn>2</mn>
      </msup>
      <mspace width="1em"/>
      <msup><mi>T</mi><mo>*</mo></msup>
      <mo>=</mo>${numberNode(threshold)}
      <mo>,</mo><mspace width="0.5em"/>
      <msubsup><mi>σ</mi><mi>B</mi><mn>2</mn></msubsup><mo>(</mo><msup><mi>T</mi><mo>*</mo></msup><mo>)</mo>
      <mo>=</mo>${numberNode(bestVariance.toFixed(2))}
    </mrow>
  `);
}

function kittlerFormulaMathML(threshold: number, weightedGraySum: number, gradientSum: number): string {
  return buildInlineMathML(`
    <mrow>
      <mi>K</mi><mi>T</mi>
      <mo>=</mo>
      <mfrac>
        <mrow>
          <mo>∑</mo><mi>g</mi><mi>r</mi><mi>a</mi><mi>d</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
          <mo>·</mo>
          <mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        </mrow>
        <mrow>
          <mo>∑</mo><mi>g</mi><mi>r</mi><mi>a</mi><mi>d</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        </mrow>
      </mfrac>
      <mspace width="0.8em"/>
      <mo>=</mo>
      <mfrac>
        ${numberNode(weightedGraySum.toFixed(1))}
        ${numberNode(gradientSum.toFixed(1))}
      </mfrac>
      <mspace width="0.8em"/>
      <mo>=</mo>
      ${numberNode(threshold)}
    </mrow>
  `);
}

function ThresholdCurvePanel({
  image,
  threshold,
  profile,
  method,
}: {
  image: GrayscaleImage;
  threshold: number;
  profile: ReturnType<typeof createOtsuVarianceProfile>;
  method: ThresholdMethod;
}) {
  const histogram = computeHistogram(image).bins;
  const maxCount = Math.max(...histogram, 1);
  const maxVariance = Math.max(...profile.map(point => point.variance), 1);
  const width = 920;
  const height = 270;
  const plotLeft = 48;
  const plotRight = 24;
  const plotTop = 24;
  const plotBottom = 42;
  const plotWidth = width - plotLeft - plotRight;
  const plotHeight = height - plotTop - plotBottom;
  const xFor = (gray: number) => plotLeft + (gray / 255) * plotWidth;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-800">阈值选择曲线</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            蓝色柱表示灰度直方图，橙色曲线表示 OTSU 在每个候选阈值处的类间方差。红线为当前方法得到的阈值。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
            T = {threshold}
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
            {method === 'manual' ? '人工指定' : method === 'otsu' ? 'OTSU 最大类间方差' : 'Kittler 梯度加权'}
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <rect x="0" y="0" width={width} height={height} rx="16" fill="#f8fafc" />
        <line x1={plotLeft} y1={height - plotBottom} x2={width - plotRight} y2={height - plotBottom} stroke="#cbd5e1" />
        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={height - plotBottom} stroke="#cbd5e1" />

        {histogram.map((count, gray) => {
          const barHeight = (count / maxCount) * plotHeight;
          const x = xFor(gray);
          return (
            <rect
              key={gray}
              x={x}
              y={height - plotBottom - barHeight}
              width={Math.max(1.4, plotWidth / 256 - 0.8)}
              height={barHeight}
              fill={gray <= threshold ? '#94a3b8' : '#3b82f6'}
              opacity={count > 0 ? 0.78 : 0.14}
            />
          );
        })}

        <polyline
          points={profile.map(point => {
            const x = xFor(point.threshold);
            const y = height - plotBottom - (point.variance / maxVariance) * (plotHeight * 0.88);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
          opacity="0.92"
        />

        <line x1={xFor(threshold)} y1={plotTop} x2={xFor(threshold)} y2={height - plotBottom} stroke="#ef4444" strokeWidth="3" />
        <text x={xFor(threshold) + 8} y={plotTop + 16} fontSize="13" fill="#dc2626">T = {threshold}</text>

        {[0, 64, 128, 192, 255].map(value => (
          <g key={value}>
            <line x1={xFor(value)} y1={height - plotBottom} x2={xFor(value)} y2={height - plotBottom + 5} stroke="#94a3b8" />
            <text x={xFor(value)} y={height - 16} textAnchor="middle" fontSize="11" fill="#64748b">{value}</text>
          </g>
        ))}
        <text x={plotLeft} y={16} fontSize="11" fill="#64748b">像素数 / 类间方差归一化显示</text>
        <text x={width - plotRight} y={height - 16} textAnchor="end" fontSize="11" fill="#64748b">灰度级</text>
      </svg>
    </div>
  );
}

function countNonZero(image: GrayscaleImage): number {
  return image.reduce((sum, row) => sum + row.filter(pixel => pixel > 0).length, 0);
}

export default function ThresholdAutoThresholdPage() {
  const [sceneType, setSceneType] = useState<ThresholdInputType>('bimodal');
  const [method, setMethod] = useState<ThresholdMethod>('otsu');
  const [manualThreshold, setManualThreshold] = useState(128);
  const [outputMode, setOutputMode] = useState<ThresholdOutputMode>('binary');
  const lenaImage = useLenaGrayscaleImage(96);
  const originalImage = useMemo(() => {
    if (sceneType === 'lenaOriginal') return lenaImage ?? createThresholdScene('bimodal');
    return createThresholdScene(sceneType);
  }, [lenaImage, sceneType]);

  const otsuResult = useMemo(() => otsuThreshold(originalImage), [originalImage]);
  const kittlerResult = useMemo(() => computeKittlerGradientThreshold(originalImage), [originalImage]);
  const otsuProfile = useMemo(() => createOtsuVarianceProfile(originalImage), [originalImage]);

  const otsuThresholdValue = Math.round(otsuResult.threshold * 255);
  const threshold = useMemo(() => {
    if (method === 'manual') return manualThreshold;
    if (method === 'otsu') return otsuThresholdValue;
    return kittlerResult.threshold;
  }, [kittlerResult.threshold, manualThreshold, method, otsuThresholdValue]);

  const resultImage = useMemo(
    () => applyThresholdMode(originalImage, threshold, outputMode),
    [originalImage, outputMode, threshold]
  );

  const manualBinary = useMemo(
    () => applyThresholdMode(originalImage, manualThreshold, 'binary'),
    [manualThreshold, originalImage]
  );
  const otsuBinary = useMemo(
    () => applyThresholdMode(originalImage, otsuThresholdValue, 'binary'),
    [originalImage, otsuThresholdValue]
  );
  const kittlerBinary = useMemo(
    () => applyThresholdMode(originalImage, kittlerResult.threshold, 'binary'),
    [kittlerResult.threshold, originalImage]
  );

  const nonZeroPixels = useMemo(() => countNonZero(resultImage), [resultImage]);
  const totalPixels = originalImage.length * (originalImage[0]?.length || 0);

  const samplePoint = useMemo(() => {
    const y = Math.floor(originalImage.length * 0.48);
    const x = Math.floor((originalImage[0]?.length || 1) * 0.58);
    return { x, y };
  }, [originalImage]);

  const sampleSrc = byteValue(originalImage[samplePoint.y]?.[samplePoint.x] ?? 0);
  const sampleDst = byteValue(resultImage[samplePoint.y]?.[samplePoint.x] ?? 0);
  const sampleFixedDst = sampleSrc >= threshold ? sampleSrc : 0;
  const bestOtsuVariance = Math.max(...otsuProfile.map(point => point.variance), 0);

  const handleMethodChange = useCallback((value: string) => {
    setMethod(value as ThresholdMethod);
  }, []);

  const handleSceneChange = useCallback((value: string) => {
    setSceneType(value as ThresholdInputType);
  }, []);

  const handleOutputModeChange = useCallback((value: string) => {
    setOutputMode(value as ThresholdOutputMode);
  }, []);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (method !== 'manual') return;
    const step = direction === 'up' || direction === 'down' ? 10 : 1;
    setManualThreshold(prev => {
      if (direction === 'left' || direction === 'up') return Math.max(0, prev - step);
      return Math.min(255, prev + step);
    });
  }, [method]);

  const mainVisual = (
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-6 xl:gap-8">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">灰度图</span>
          <span className="font-mono text-xs text-slate-400">
            {originalImage[0]?.length}×{originalImage.length}
          </span>
        </div>
        <ImageCanvas image={originalImage} maxDisplaySize={360} showGrid={false} selectedRegionMarker="dot" />
        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
          示例场景：{SCENE_OPTIONS.find(option => option.value === sceneType)?.label}
        </span>
      </div>

      <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-[0_10px_24px_rgba(245,158,11,0.12)]">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-amber-700">阈值判定</div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-amber-800">T = {threshold}</div>
        <div className="mt-1 text-[11px] text-amber-700">
          {method === 'manual' ? '固定阈值' : method === 'otsu' ? 'OTSU 自动阈值' : 'Kittler 梯度阈值'}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
            阈值结果
          </span>
          <span className="font-mono text-xs text-slate-400">
            {resultImage[0]?.length}×{resultImage.length}
          </span>
        </div>
        <ImageCanvas image={resultImage} maxDisplaySize={360} showGrid={false} />
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
          {OUTPUT_MODE_TEXT[outputMode].name}，非零输出 {nonZeroPixels} / {totalPixels}
        </span>
      </div>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <ThresholdCurvePanel
        image={originalImage}
        threshold={threshold}
        profile={otsuProfile}
        method={method}
      />
    </ProcessRail>
  );

  const stepDetails = (
    <div className="space-y-5">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">阈值来源：决定 T 从哪里来</h2>
        <div className="space-y-4">
          <FormulaCard
            label="固定阈值分割"
            mathML={fixedThresholdFormulaMathML(threshold, sampleSrc, sampleFixedDst)}
            note="固定阈值由人工给定，适合光照稳定、目标与背景灰度差异明确的场景。"
          />
          <FormulaCard
            label="OTSU 最大类间方差"
            mathML={otsuFormulaMathML(otsuThresholdValue, bestOtsuVariance)}
            note="OTSU 遍历全部候选阈值，选择背景类与目标类之间类间方差最大的阈值。"
          />
          <FormulaCard
            label="Kittler 梯度加权阈值"
            mathML={kittlerFormulaMathML(kittlerResult.threshold, kittlerResult.weightedGraySum, kittlerResult.gradientSum)}
            note="课件版 Kittler 使用梯度作为权重，使边缘附近的灰度对全局阈值贡献更大。"
          />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-4">
        <h2 className="text-sm font-semibold text-slate-800">输出类型：决定得到 T 后如何生成 dst 图像</h2>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          OpenCV 的 `threshold_type` 包含两类信息：一类是输出规则，例如 BINARY、TRUNC、TOZERO；另一类是自动选阈值标志，例如 OTSU。
          “阈值方法”表示 T 的来源，“输出类型”表示同一个 T 代入后每个像素如何写入结果图。
        </p>
        <div className="mt-3 grid gap-3 text-xs leading-6 text-slate-600 md:grid-cols-2">
          <div className="border-l-2 border-amber-300 pl-3">
            <div className="font-semibold text-amber-700">阈值来源</div>
            <p>固定阈值由滑杆给定；OTSU 由直方图类间方差最大化得到；Kittler 由梯度加权灰度平均得到。</p>
          </div>
          <div className="border-l-2 border-emerald-300 pl-3">
            <div className="font-semibold text-emerald-700">输出规则</div>
            <p>输出类型不重新计算阈值，只规定 `src(x,y)` 与 T 比较后写入 0、最大值、阈值或原灰度。</p>
          </div>
        </div>
        <FormulaCard
          className="mt-4"
          label={`当前输出类型：${OUTPUT_MODE_TEXT[outputMode].name}`}
          mathML={modeFormulaMathML(outputMode, sampleSrc, threshold, sampleDst)}
          note={OUTPUT_MODE_TEXT[outputMode].description}
        />
      </section>

      <section className="border-t border-slate-200 pt-4">
        <h2 className="text-sm font-semibold text-slate-800">同一输入下的预设结果对照</h2>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          下列结果均来自当前灰度图。三种阈值来源使用相同的 BINARY 输出规则，因此差异只来自阈值 T 的选择方式。
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: '原始灰度图', image: originalImage, hint: '输入' },
            { label: `固定阈值 T=${manualThreshold}`, image: manualBinary, hint: '人工指定' },
            { label: `OTSU T=${otsuThresholdValue}`, image: otsuBinary, hint: '类间方差最大' },
            { label: `Kittler T=${kittlerResult.threshold}`, image: kittlerBinary, hint: '梯度加权' },
          ].map(item => (
            <figure key={item.label} className="space-y-2">
              <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <ImageCanvas image={item.image} maxDisplaySize={210} showGrid={false} />
              </div>
              <figcaption className="text-center">
                <div className="text-xs font-semibold text-slate-700">{item.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{item.hint}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">课堂观察要点</div>
        <div className="mt-2 space-y-1.5 text-xs leading-6 text-slate-600">
          <p>固定阈值适合验证阈值线移动对分割结果的直接影响，但对光照和场景变化敏感。</p>
          <p>OTSU 适合直方图具有较明显双峰的图像；当真实图像灰度分布复杂时，阈值仍可能只得到粗分割。</p>
          <p>Kittler 使用梯度信息强调边界附近灰度，对边缘清晰的目标更敏感，但对噪声和纹理同样敏感。</p>
        </div>
      </TeachingCard>
    </div>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam label="示例场景" value={sceneType} onChange={handleSceneChange} options={SCENE_OPTIONS} />
      <SelectParam label="阈值方法" value={method} onChange={handleMethodChange} options={METHOD_OPTIONS} />
      {method === 'manual' ? (
        <SliderParam label="固定阈值 T" value={manualThreshold} onChange={setManualThreshold} min={0} max={255} step={1} />
      ) : (
        <div className="border-l-2 border-emerald-300 bg-emerald-50/70 px-3 py-3">
          <div className="text-xs font-medium text-emerald-700">自动计算阈值</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">{threshold}</div>
          <p className="mt-1 text-[11px] leading-5 text-emerald-700">
            {method === 'otsu' ? '由直方图类间方差最大化得到。' : '由梯度加权灰度平均得到。'}
          </p>
        </div>
      )}
      <SelectParam label="输出类型" value={outputMode} onChange={handleOutputModeChange} options={OUTPUT_OPTIONS} />
      <div className="border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
        “阈值方法”决定 T 的来源；“输出类型”决定每个像素与 T 比较后的写入规则。
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="阈值分割与自动阈值"
      subtitle="Threshold & Auto Threshold - 从固定阈值到自动阈值选择"
      operationLabel="阈值判定"
      parameterIntro="切换示例场景、阈值来源和输出类型，观察阈值线与分割结果之间的关系。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: THRESHOLD_CODE_TS }]} />}
      mainVisual={mainVisual}
      imageLabels={{ input: '灰度图', output: '阈值结果' }}
      imageHints={{ input: '目标与背景灰度差异', output: `T=${threshold}` }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      stepInfo={method === 'manual' ? { current: manualThreshold, total: 256 } : null}
      onDirectionMove={handleDirectionMove}
      showNavigationControls={method === 'manual'}
    />
  );
}
