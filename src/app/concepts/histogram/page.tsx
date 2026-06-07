'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ConceptLayout, CodeViewer, SelectParam } from '@/components';
import { computeHistogram } from '@/lib/algorithms/threshold';
import {
  generateExampleImage,
  histogramSteps,
  HistogramStep,
} from '@/lib/algorithms/histogram';

type ExampleType = 'dark' | 'bright' | 'lowContrast' | 'bimodal' | 'standard';

const EXAMPLE_LABELS: Record<ExampleType, string> = {
  dark: '偏暗图',
  bright: '偏亮图',
  lowContrast: '低对比图',
  bimodal: '双峰图',
  standard: '标准图',
};

const HISTOGRAM_CODE_TS = `function computeHistogram(image: number[][]): number[] {
  const bins = new Array(256).fill(0);

  for (let y = 0; y < image.length; y++) {
    for (let x = 0; x < image[0].length; x++) {
      const gray = Math.round(image[y][x] * 255);
      bins[gray]++;
    }
  }
  return bins;
}

// P(s_k) = n_k / n
function probability(bins: number[], total: number): number[] {
  return bins.map(n => n / total);
}`;

function HistogramSVG({
  histogram,
  totalPixels,
  highlightedGray,
  onBarHover,
  onBarLeave,
}: {
  histogram: number[];
  totalPixels: number;
  highlightedGray: number | null;
  onBarHover: (gray: number) => void;
  onBarLeave: () => void;
}) {
  const svgWidth = 520;
  const svgHeight = 220;
  const barWidth = svgWidth / 256;
  const maxCount = Math.max(...histogram, 1);

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="font-mono"
    >
      <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#f8fafc" rx={4} />

      <text x={14} y={14} textAnchor="end" fontSize={8} fill="#64748b">
        {maxCount}
      </text>
      <text x={14} y={svgHeight - 6} textAnchor="end" fontSize={8} fill="#64748b">
        0
      </text>

      <line
        x1={20}
        y1={svgHeight - 10}
        x2={svgWidth}
        y2={svgHeight - 10}
        stroke="#cbd5e1"
        strokeWidth={1}
      />

      {histogram.map((count, gray) => {
        const barH = (count / maxCount) * (svgHeight - 24);
        const isHighlighted = highlightedGray === gray;
        return (
          <rect
            key={gray}
            x={20 + gray * barWidth}
            y={svgHeight - 10 - barH}
            width={Math.max(1, barWidth - 0.5)}
            height={barH}
            fill={isHighlighted ? '#ef4444' : '#3b82f6'}
            fillOpacity={isHighlighted ? 1 : count > 0 ? 0.6 : 0.15}
            onMouseEnter={() => onBarHover(gray)}
            onMouseLeave={onBarLeave}
            style={{ cursor: 'pointer', transition: 'fill-opacity 0.1s' }}
          />
        );
      })}

      {highlightedGray !== null && (
        <line
          x1={20 + highlightedGray * barWidth + barWidth / 2}
          y1={svgHeight - 10}
          x2={20 + highlightedGray * barWidth + barWidth / 2}
          y2={4}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
      )}

      {[0, 64, 128, 192, 255].map(v => (
        <g key={v}>
          <line
            x1={20 + v * barWidth}
            y1={svgHeight - 10}
            x2={20 + v * barWidth}
            y2={svgHeight - 6}
            stroke="#94a3b8"
            strokeWidth={1}
          />
          <text
            x={20 + v * barWidth}
            y={svgHeight + 2}
            textAnchor="middle"
            fontSize={8}
            fill="#64748b"
          >
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function HistogramPage() {
  const [exampleType, setExampleType] = useState<ExampleType>('standard');
  const [highlightedGray, setHighlightedGray] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const originalImage = useMemo(() => generateExampleImage(exampleType), [exampleType]);

  const histogramData = useMemo(() => computeHistogram(originalImage), [originalImage]);
  const { bins, totalPixels } = histogramData;

  const steps = useMemo(() => {
    return Array.from(histogramSteps(originalImage));
  }, [originalImage]);

  const currentStep: HistogramStep | null = steps[currentStepIndex] ?? null;

  const probabilityText = useMemo(() => {
    if (highlightedGray === null && !currentStep) return null;
    const gray = highlightedGray ?? currentStep?.currentGray ?? 0;
    const count = bins[gray] || 0;
    const prob = totalPixels > 0 ? count / totalPixels : 0;
    return { gray, count, prob };
  }, [bins, totalPixels, highlightedGray, currentStep]);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (steps.length === 0) return;
    const curIdx = currentStepIndex;
    let newIdx = curIdx;

    switch (direction) {
      case 'left':
        newIdx = Math.max(0, curIdx - 12);
        break;
      case 'right':
        newIdx = Math.min(steps.length - 1, curIdx + 12);
        break;
      case 'up':
        newIdx = Math.max(0, curIdx - 1);
        break;
      case 'down':
        newIdx = Math.min(steps.length - 1, curIdx + 1);
        break;
    }

    if (newIdx !== curIdx) {
      setCurrentStepIndex(newIdx);
      setHighlightedGray(steps[newIdx].currentGray);
    }
  }, [currentStepIndex, steps]);

  const handleInputRegionSelect = useCallback((x: number, y: number) => {
    const idx = y * 12 + x;
    if (idx < steps.length) {
      setCurrentStepIndex(idx);
      setHighlightedGray(steps[idx].currentGray);
    }
  }, [steps]);

  const handleExampleChange = useCallback((value: string) => {
    setExampleType(value as ExampleType);
    setCurrentStepIndex(0);
    setHighlightedGray(null);
  }, []);

  const handleBarHover = useCallback((gray: number) => {
    setHighlightedGray(gray);
  }, []);

  const handleBarLeave = useCallback(() => {
    setHighlightedGray(null);
  }, []);

  const analysisPreview = useMemo(() => {
    const gray = highlightedGray ?? currentStep?.currentGray ?? null;

    return (
      <div className="conv-process-rail overflow-x-auto py-2">
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs font-semibold text-slate-500 tracking-wide">
            灰度直方图
          </div>

          <HistogramSVG
            histogram={bins}
            totalPixels={totalPixels}
            highlightedGray={gray}
            onBarHover={handleBarHover}
            onBarLeave={handleBarLeave}
          />

          {probabilityText && (
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span>
                灰度值:
                <span className="font-bold text-red-500 ml-1">{probabilityText.gray}</span>
              </span>
              <span>
                像素数 n<sub>k</sub>:
                <span className="font-bold text-blue-600 ml-1">{probabilityText.count}</span>
              </span>
              <span>
                概率 P(s<sub>k</sub>):
                <span className="font-bold text-blue-600 ml-1">
                  {(probabilityText.prob * 100).toFixed(2)}%
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }, [bins, totalPixels, probabilityText, highlightedGray, currentStep, handleBarHover, handleBarLeave]);

  const stepDetails = useMemo(() => {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="text-sm font-semibold text-blue-800 mb-2">
            直方图公式
          </div>
          <div className="mb-1">
            <code className="text-sm text-blue-800 font-mono bg-white px-2 py-0.5 rounded">
              P(s<sub>k</sub>) = n<sub>k</sub> / n
            </code>
          </div>
          <div className="text-xs text-slate-600 space-y-1 mt-2">
            <p>
              <code className="bg-slate-100 px-1 rounded">s<sub>k</sub></code>: 第 k 个灰度级（0-255）
            </p>
            <p>
              <code className="bg-slate-100 px-1 rounded">n<sub>k</sub></code>: 灰度级 s<sub>k</sub> 的像素个数
            </p>
            <p>
              <code className="bg-slate-100 px-1 rounded">n</code>: 图像总像素数（= {totalPixels}）
            </p>
            <p>
              <code className="bg-slate-100 px-1 rounded">P(s<sub>k</sub>)</code>: 灰度级 s<sub>k</sub> 出现的概率
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            直方图能告诉我们什么？
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <p>
              <span className="font-medium text-slate-700">整体亮度：</span>
              分布偏左 → 图像偏暗；分布偏右 → 图像偏亮。
            </p>
            <p>
              <span className="font-medium text-slate-700">对比度：</span>
              分布集中 → 对比度低；分布均匀或分散 → 对比度高。
            </p>
            <p>
              <span className="font-medium text-slate-700">双峰特征：</span>
              若直方图存在两个明显峰值，说明图像可能包含两类不同的区域（如前景与背景），适合用阈值分割。
            </p>
            <p className="mt-2 text-slate-500 italic">
              * 直方图不保留空间结构：两张空间排列完全不同的图像可能具有完全相同的直方图。直方图只告诉我们有多少个像素取某个灰度值，而不告诉我们这些像素分别位于哪里。
            </p>
          </div>
        </div>

        <div className="border border-amber-200 bg-amber-50/40 rounded-lg px-4 py-3">
          <div className="text-sm font-semibold text-amber-700 mb-2">
            当前示例：{EXAMPLE_LABELS[exampleType]}
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            {exampleType === 'dark' && (
              <p>所有像素的灰度值 {'<'} 64，直方图集中在左侧暗区。图像整体很暗，细节难以辨认。</p>
            )}
            {exampleType === 'bright' && (
              <p>所有像素的灰度值 {'>'} 192，直方图集中在右侧亮区。图像整体很亮，可能过曝。</p>
            )}
            {exampleType === 'lowContrast' && (
              <p>像素值集中在 80-120 的窄范围内，直方图呈陡峭的峰形。图像对比度低、看起来灰蒙蒙的。</p>
            )}
            {exampleType === 'bimodal' && (
              <p>上半部分偏暗（&lt;64）、下半部分偏亮（&gt;192），直方图出现两个明显峰值。这种双峰分布适合用阈值（如 OTSU）分割为前景和背景。</p>
            )}
            {exampleType === 'standard' && (
              <p>像素值在 0-255 之间近似均匀分布，直方图覆盖整个灰度范围。图像具有正常的亮度和对比度。</p>
            )}
          </div>
        </div>
      </div>
    );
  }, [exampleType, totalPixels]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="示例图"
        value={exampleType}
        onChange={handleExampleChange}
        options={[
          { value: 'standard', label: '标准图' },
          { value: 'dark', label: '偏暗图' },
          { value: 'bright', label: '偏亮图' },
          { value: 'lowContrast', label: '低对比图' },
          { value: 'bimodal', label: '双峰图' },
        ]}
      />
    </div>
  );

  return (
    <ConceptLayout
      title="灰度直方图"
      subtitle="Histogram - 图像的灰度分布统计"
      originalImage={originalImage}
      resultImage={null}
      parameters={parameters}
      stepDetails={stepDetails}
      analysisPreview={analysisPreview}
      codeTab={
        <CodeViewer
          languages={[{ name: 'TypeScript', code: HISTOGRAM_CODE_TS }]}
        />
      }
      currentStep={currentStep ? { x: currentStep.x, y: currentStep.y, kernelSize: 1 } : null}
      stepInfo={steps.length > 0 ? { current: currentStepIndex, total: steps.length } : null}
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      imageHints={{ input: '点击选择像素', output: undefined }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
    />
  );
}
