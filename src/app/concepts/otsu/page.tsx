'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  OtsuFormula,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
} from '@/components';
import { computeHistogram, fixedThreshold, otsuSteps, otsuThreshold } from '@/lib/algorithms/threshold';
import { sampleImages, type SampleImageType } from '@/lib/utils/sampleImages';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';

const OTSU_CODE_TS = `const histogram = computeHistogram(image);
let bestThreshold = 0;
let bestVariance = -1;

for (let t = 0; t < 256; t++) {
  const { wB, wF, mB, mF } = splitByThreshold(histogram, t);
  const variance = (wB / totalPixels) * (wF / totalPixels) * (mB - mF) ** 2;

  if (variance > bestVariance) {
    bestVariance = variance;
    bestThreshold = t;
  }
}

const binary = applyThreshold(image, bestThreshold);`;

const IMAGE_OPTIONS = Object.entries(sampleImages).map(([key, value]) => ({
  value: key,
  label: value.name,
}));

const MODE_OPTIONS = [
  { value: 'scan', label: '候选 T 扫描' },
  { value: 'best', label: '直接查看最佳 T' },
] as const;

type OtsuMode = (typeof MODE_OPTIONS)[number]['value'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function OtsuPage() {
  const [imageType, setImageType] = useState<SampleImageType>('lena');
  const [mode, setMode] = useState<OtsuMode>('scan');
  const [candidateThreshold, setCandidateThreshold] = useState(96);
  const lenaImage = useLenaGrayscaleImage(96);

  const originalImage = useMemo(() => {
    if (imageType === 'lena' && lenaImage) return lenaImage;
    return sampleImages[imageType].image;
  }, [imageType, lenaImage]);

  const histogram = useMemo(() => computeHistogram(originalImage).bins, [originalImage]);
  const otsuResult = useMemo(() => otsuThreshold(originalImage), [originalImage]);
  const bestThreshold = useMemo(() => Math.round(otsuResult.threshold * 255), [otsuResult.threshold]);
  const steps = useMemo(() => Array.from(otsuSteps(originalImage)), [originalImage]);
  const safeThreshold = clamp(candidateThreshold, 0, 255);
  const currentStep = steps.find(step => step.currentThreshold === safeThreshold) ?? steps[steps.length - 1] ?? null;

  const activeThreshold = mode === 'best' ? bestThreshold : safeThreshold;
  const resultImage = useMemo(() => fixedThreshold(originalImage, activeThreshold / 255).image, [activeThreshold, originalImage]);

  const bestVariance = useMemo(
    () => steps.reduce((max, step) => Math.max(max, step.variance), 0),
    [steps]
  );

  const currentVariance = currentStep?.variance ?? 0;
  const previousBestStep = useMemo(() => {
    let best = steps[0] ?? null;
    for (const step of steps) {
      if (step.currentThreshold > activeThreshold) break;
      if (!best || step.variance >= best.variance) {
        best = step;
      }
    }
    return best;
  }, [activeThreshold, steps]);

  const currentBinaryWhiteCount = useMemo(
    () => resultImage.reduce((sum, row) => sum + row.reduce((rowSum, pixel) => rowSum + (pixel > 0 ? 1 : 0), 0), 0),
    [resultImage]
  );
  const totalPixels = (originalImage.length || 0) * (originalImage[0]?.length || 0);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const delta = direction === 'left' ? -1 : direction === 'right' ? 1 : direction === 'up' ? -10 : 10;
    setCandidateThreshold(value => clamp(value + delta, 0, 255));
  }, []);

  const contentHeader = (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-800">Otsu 的核心不是“神奇自动阈值”，而是逐个测试候选 T</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          页面主线固定为：给一个候选阈值 T，把灰度分成两类，计算这两类被拉开的程度，再记录当前扫描到的历史最大值。学生看到的不是最后答案先出现，而是 T 如何一步步被筛出来。
        </p>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        最佳 T = {bestThreshold}
      </div>
    </div>
  );

  const analysisPreview = currentStep ? (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. 当前对象：候选阈值 T</div>
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-red-800">
              <div className="text-[10px] text-red-600">正在测试</div>
              <div className="mt-1 text-2xl font-bold">T = {activeThreshold}</div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              当前只看这一个候选 T，它会把灰度直方图切成左侧背景类和右侧前景类。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. 当前证据：两类统计量</div>
            <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-[10px] text-slate-500">背景类灰度 ≤ T</div>
                <div className="mt-1 font-mono text-slate-700">ω0={(currentStep.wB / Math.max(1, currentStep.wB + currentStep.wF)).toFixed(3)}</div>
                <div className="font-mono text-slate-700">μ0={currentStep.mB.toFixed(1)}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <div className="text-[10px] text-blue-500">前景类灰度 &gt; T</div>
                <div className="mt-1 font-mono text-blue-700">ω1={(currentStep.wF / Math.max(1, currentStep.wB + currentStep.wF)).toFixed(3)}</div>
                <div className="font-mono text-blue-700">μ1={currentStep.mF.toFixed(1)}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              证据不是“看起来像不像分开了”，而是看这两类的均值差和各自像素占比共同决定的类间方差。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. 当前结果：类间方差与历史最大值</div>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                当前 σ² = {currentVariance.toFixed(2)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                历史最大 T = {previousBestStep?.currentThreshold ?? bestThreshold}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                历史最大 σ² = {(previousBestStep?.variance ?? bestVariance).toFixed(2)}
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              扫描结束后，历史最大值对应的 T 就是 Otsu 阈值。
            </p>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  ) : null;

  const stepDetails = currentStep ? (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前候选 T 的一条代入链</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <FormulaCard
            label="先按 T 分成两类"
            note={`当前 T=${activeThreshold}，背景类共有 ${currentStep.wB} 个像素，前景类共有 ${currentStep.wF} 个像素。`}
            mathML="<math xmlns='http://www.w3.org/1998/Math/MathML'><mrow><msub><mi>C</mi><mn>0</mn></msub><mo>:</mo><mi>g</mi><mo>≤</mo><mi>T</mi><mo>,</mo><msub><mi>C</mi><mn>1</mn></msub><mo>:</mo><mi>g</mi><mo>&gt;</mo><mi>T</mi></mrow></math>"
          />
          <FormulaCard
            label="再计算类间方差"
            note="这里的 σ² 越大，说明两类被分得越开。ω0 = wB / total，ω1 = wF / total，为标准 Otsu 概率权重形式。"
            mathML="<math xmlns='http://www.w3.org/1998/Math/MathML'><mrow><msubsup><mi>σ</mi><mi>b</mi><mn>2</mn></msubsup><mo>=</mo><msub><mi>ω</mi><mn>0</mn></msub><msub><mi>ω</mi><mn>1</mn></msub><msup><mrow><mo>(</mo><msub><mi>μ</mi><mn>0</mn></msub><mo>-</mo><msub><mi>μ</mi><mn>1</mn></msub><mo>)</mo></mrow><mn>2</mn></msup></mrow></math>"
          />
          <FormulaCard
            label="当前结果"
            note={currentStep.isMax ? '当前候选 T 刚刚刷新了历史最大值。' : '当前候选 T 还没有超过前面的最佳值。'}
            mathML={`<math xmlns='http://www.w3.org/1998/Math/MathML'><mrow><msubsup><mi>σ</mi><mi>b</mi><mn>2</mn></msubsup><mo>=</mo><mn>${currentVariance.toFixed(2)}</mn></mrow></math>`}
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前候选 T 在结果图里写回了什么</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            当前候选阈值 T={activeThreshold} 把灰度大于 T 的像素写成白色，其余写成黑色。当前结果图中白色像素约 {currentBinaryWhiteCount} 个，占 {(currentBinaryWhiteCount / Math.max(1, totalPixels) * 100).toFixed(1)}%。
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            如果切到“直接查看最佳 T”，结果图会改用 Otsu 最终选出的最佳阈值 T={bestThreshold}，用于和当前候选 T 做直观对比。
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">公式代入</div>
        <div className="mt-4">
          <OtsuFormula
            threshold={activeThreshold}
            variance={currentVariance}
            w0={currentStep.wB / Math.max(1, currentStep.wB + currentStep.wF)}
            w1={currentStep.wF / Math.max(1, currentStep.wB + currentStep.wF)}
            m0={currentStep.mB}
            m1={currentStep.mF}
          />
        </div>
      </TeachingCard>

      <TeachingCard tone="amber">
        <div className="text-sm font-semibold text-amber-900">怎么读直方图</div>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          红线表示当前候选 T，绿色提示表示扫描到当前位置为止的历史最大 T。Otsu 不是直接找“最高的灰度柱”，而是找“让两类分开程度最大”的分界线。
        </p>
      </TeachingCard>
    </div>
  ) : null;

  const histogramPreview = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">灰度直方图与阈值扫描</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              红线是当前候选 T，绿线是扫描到当前为止的历史最佳 T。
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            当前 T={activeThreshold}
          </span>
        </div>
        <div className="relative flex h-40 items-end gap-px rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
          {histogram.map((count, index) => {
            const height = Math.min(100, Math.log(count + 1) * 10);
            const isCurrent = index === activeThreshold;
            const isBestSoFar = index === (previousBestStep?.currentThreshold ?? bestThreshold);
            return (
              <div
                key={`hist-${index}`}
                className={`flex-1 rounded-t ${
                  isCurrent ? 'bg-red-500' : isBestSoFar ? 'bg-emerald-500' : index <= activeThreshold ? 'bg-slate-300' : 'bg-blue-400'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="示例图像"
        value={imageType}
        onChange={value => setImageType(value as SampleImageType)}
        options={IMAGE_OPTIONS}
      />
      <SelectParam
        label="查看方式"
        value={mode}
        onChange={value => setMode(value as OtsuMode)}
        options={MODE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
      />
      <SliderParam
        label="候选阈值 T"
        value={candidateThreshold}
        onChange={setCandidateThreshold}
        min={0}
        max={255}
        step={1}
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前候选 T={activeThreshold}，历史最佳 T={previousBestStep?.currentThreshold ?? bestThreshold}，最终 Otsu 最佳 T={bestThreshold}。
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="Otsu 阈值分割"
      subtitle="Otsu Thresholding"
      contentHeader={contentHeader}
      operationLabel="候选阈值扫描"
      parameterIntro="拖动候选阈值 T，观察它如何把灰度分成两类，以及类间方差何时达到最大。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      mainVisual={histogramPreview}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: OTSU_CODE_TS }]} />}
      imageLabels={{ input: '原始灰度图', output: '当前候选 T 的二值结果' }}
      imageHints={{
        input: '切换图像时重新观察直方图双峰是否明显',
        output: mode === 'best' ? `当前显示最终最佳 T=${bestThreshold}` : `当前显示候选 T=${activeThreshold}`,
      }}
      stepInfo={{ current: activeThreshold, total: 256 }}
      onDirectionMove={handleDirectionMove}
      singlePageScroll
      navigationHintText="左右方向键调 T，向上/向下每次跨 10 个灰度级"
    />
  );
}
