'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
  buildInlineMathML,
} from '@/components';
import {
  FrameDifferenceMode,
  createFrameDifferenceTeachingSequence,
} from '@/lib/algorithms/simpleBackground';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { useGridNavigation } from '@/hooks/useGridNavigation';

const FRAME_CODE_TS = `function frameDifference(frames, t, threshold) {
  const previous = frames[t - 1];
  const current = frames[t];
  const next = frames[t + 1];

  const dPrev = abs(current - previous);
  const dNext = abs(next - current);
  const bPrev = dPrev > threshold ? 1 : 0;
  const bNext = dNext > threshold ? 1 : 0;

  // 时间差分只看前一帧；对称差分要求前后两次差分同时成立
  const motion = mode === 'twoFrame' ? bPrev : (bPrev & bNext);
  return close(motion);
}`;

const METHOD_OPTIONS = [
  { value: 'twoFrame', label: '时间差分法' },
  { value: 'symmetric', label: '对称差分法' },
] as const;

const TIME_DIFF_EXAMPLES = [
  {
    src: '/assets/simple-background/frame-course-current.jpg',
    label: '当前帧1',
  },
  {
    src: '/assets/simple-background/frame-course-previous.jpg',
    label: '当前帧的前一帧 H',
  },
  {
    src: '/assets/simple-background/frame-course-motion-target.jpg',
    label: '运动目标 D(x,y)',
  },
] as const;

const SYMMETRIC_EXPERIMENT_STEPS = [
  {
    title: '1. 三帧图像序列',
    description: '输入第一帧、第二帧和第三帧。',
    images: [
      { src: '/assets/simple-background/symmetric-a-frame1.jpg', label: '(a) 第一帧' },
      { src: '/assets/simple-background/symmetric-b-frame2.jpg', label: '(b) 第二帧' },
      { src: '/assets/simple-background/symmetric-c-frame3.jpg', label: '(c) 第三帧' },
    ],
  },
  {
    title: '2. 两次帧间差',
    description: '分别计算第一帧与第二帧、第三帧与第二帧的绝对差。',
    images: [
      { src: '/assets/simple-background/symmetric-d-diff12.jpg', label: '(d) |f1 - f2|' },
      { src: '/assets/simple-background/symmetric-e-diff32.jpg', label: '(e) |f3 - f2|' },
    ],
  },
  {
    title: '3. 二值化结果',
    description: '对差分图做阈值化，得到候选运动区域。',
    images: [
      { src: '/assets/simple-background/symmetric-f-binary.jpg', label: '(f) 二值化结果' },
    ],
  },
  {
    title: '4. 形态学处理',
    description: '填充内部空洞，清除小噪声，平滑物体边缘。',
    images: [
      { src: '/assets/simple-background/symmetric-g-morphology.jpg', label: '(g) 形态学处理结果' },
    ],
  },
  {
    title: '5. 目标提取',
    description: '连通标注后提取运动目标及外轮廓。',
    images: [
      { src: '/assets/simple-background/symmetric-h-target.jpg', label: '(h) 目标提取结果' },
    ],
  },
] as const;

function grayAt(image: GrayscaleImage, x: number, y: number): number {
  return Math.round((image[y]?.[x] ?? 0) * 255);
}

function grayValue(value: number): number {
  return Math.round(value * 255);
}

function formatPercent(count: number, total: number): string {
  if (total <= 0) return '0.0%';
  return ((count / total) * 100).toFixed(1) + '%';
}

function frameDifferenceFormulaMathML(
  previousGray: number,
  currentGray: number,
  diffGray: number,
  threshold: number,
  resultValue: number
): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>D</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
      <mo>=</mo>
      <mo>[</mo>
      <mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo>
      <msub><mi>I</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>|</mo>
      <mo>&gt;</mo><mi>T</mi>
      <mo>]</mo>
      <mo>=</mo>
      <mo>[</mo><mo>|</mo><mn>${currentGray}</mn><mo>-</mo><mn>${previousGray}</mn><mo>|</mo><mo>&gt;</mo><mn>${threshold}</mn><mo>]</mo>
      <mo>=</mo>
      <mo>[</mo><mn>${diffGray}</mn><mo>&gt;</mo><mn>${threshold}</mn><mo>]</mo>
      <mo>=</mo><mn>${resultValue}</mn>
    </mrow>
  `);
}

function symmetricDifferenceFormulaMathML(
  previousGray: number,
  currentGray: number,
  nextGray: number,
  previousDiffGray: number,
  nextDiffGray: number,
  threshold: number,
  previousMask: number,
  nextMask: number,
  finalMask: number
): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>B</mi><mn>12</mn></msub>
      <mo>=</mo><mo>[</mo><mo>|</mo><mn>${currentGray}</mn><mo>-</mo><mn>${previousGray}</mn><mo>|</mo><mo>&gt;</mo><mn>${threshold}</mn><mo>]</mo>
      <mo>=</mo><mo>[</mo><mn>${previousDiffGray}</mn><mo>&gt;</mo><mn>${threshold}</mn><mo>]</mo>
      <mo>=</mo><mn>${previousMask}</mn>
      <mo>,</mo>
      <msub><mi>B</mi><mn>32</mn></msub>
      <mo>=</mo><mo>[</mo><mo>|</mo><mn>${nextGray}</mn><mo>-</mo><mn>${currentGray}</mn><mo>|</mo><mo>&gt;</mo><mn>${threshold}</mn><mo>]</mo>
      <mo>=</mo><mo>[</mo><mn>${nextDiffGray}</mn><mo>&gt;</mo><mn>${threshold}</mn><mo>]</mo>
      <mo>=</mo><mn>${nextMask}</mn>
      <mo>,</mo>
      <mi>B</mi><mo>=</mo><msub><mi>B</mi><mn>12</mn></msub><mo>∧</mo><msub><mi>B</mi><mn>32</mn></msub>
      <mo>=</mo><mn>${previousMask}</mn><mo>∧</mo><mn>${nextMask}</mn>
      <mo>=</mo><mn>${finalMask}</mn>
    </mrow>
  `);
}

function morphologyFormulaMathML(): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>B</mi><mi>clean</mi></msub>
      <mo>=</mo><mi>Close</mi><mo>(</mo><mi>B</mi><mo>)</mo>
      <mo>=</mo><mi>Erode</mi><mo>(</mo><mi>Dilate</mi><mo>(</mo><mi>B</mi><mo>)</mo><mo>)</mo>
      <mo>→</mo><mtext>连通区域</mtext>
      <mo>→</mo><mtext>运动目标</mtext>
    </mrow>
  `);
}

function CourseImage({
  src,
  label,
  className = 'h-44',
}: {
  src: string;
  label: string;
  className?: string;
}) {
  return (
    <figure className="space-y-2">
      <div className={`flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950 ${className}`}>
        <img src={src} alt={label} className="h-full w-full object-contain" />
      </div>
      <figcaption className="text-center text-xs font-semibold text-slate-700">{label}</figcaption>
    </figure>
  );
}

function FrameImageCard({
  title,
  note,
  image,
  tone,
  selectedRegion,
  onSelect,
}: {
  title: string;
  note: string;
  image: GrayscaleImage;
  tone: 'slate' | 'red' | 'amber' | 'emerald' | 'sky';
  selectedRegion: { x: number; y: number; size: number };
  onSelect: (x: number, y: number) => void;
}) {
  const toneClass = {
    slate: 'border-slate-200 text-slate-700 bg-slate-50',
    red: 'border-red-200 text-red-700 bg-red-50',
    amber: 'border-amber-200 text-amber-700 bg-amber-50',
    emerald: 'border-emerald-200 text-emerald-700 bg-emerald-50',
    sky: 'border-sky-200 text-sky-700 bg-sky-50',
  }[tone];

  return (
    <div className={`rounded-2xl border bg-white px-3 py-3 shadow-sm ${toneClass}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{title}</span>
        <span className="font-mono text-[11px] text-slate-400">96×64</span>
      </div>
      <div className="flex justify-center">
        <ImageCanvas
          image={image}
          maxDisplaySize={176}
          showGrid={false}
          interactive
          onRegionSelect={onSelect}
          selectedRegion={selectedRegion}
          selectedRegionMarker="dot"
        />
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{note}</div>
    </div>
  );
}

export default function FrameDifferenceMotionPage() {
  const [method, setMethod] = useState<FrameDifferenceMode>('twoFrame');
  const [threshold, setThreshold] = useState(52);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(8);
  const [isPlaying, setIsPlaying] = useState(true);
  const [motionSpeed, setMotionSpeed] = useState(6);
  const [noiseStrength, setNoiseStrength] = useState(10);
  const [currentPosition, setCurrentPosition] = useState({ x: 48, y: 42 });

  const result = useMemo(
    () => createFrameDifferenceTeachingSequence(
      method,
      threshold,
      currentFrameIndex,
      motionSpeed,
      noiseStrength,
      currentPosition
    ),
    [currentFrameIndex, currentPosition, method, motionSpeed, noiseStrength, threshold]
  );
  const width = result.width;
  const height = result.height;
  const frameCount = result.frames.length;
  const minFrameIndex = 1;
  const maxFrameIndex = Math.max(minFrameIndex, frameCount - 2);
  const totalPixels = width * height;
  const currentStepIndex = currentPosition.y * width + currentPosition.x;
  const selectedPixelRegion = { x: currentPosition.x, y: currentPosition.y, size: 1 };
  const currentTimeline = result.pixelTimeline[result.frameIndex];
  const previousGray = grayAt(result.previous, currentPosition.x, currentPosition.y);
  const currentGray = grayAt(result.current, currentPosition.x, currentPosition.y);
  const nextGray = grayAt(result.next, currentPosition.x, currentPosition.y);
  const previousDiffGray = grayAt(result.previousDifference, currentPosition.x, currentPosition.y);
  const nextDiffGray = grayAt(result.nextDifference, currentPosition.x, currentPosition.y);
  const finalMaskValue = result.cleaned[currentPosition.y]?.[currentPosition.x] ?? 0;
  const rawMaskValue = result.binary[currentPosition.y]?.[currentPosition.x] ?? 0;
  const decisionText = finalMaskValue > 0 ? '运动候选像素' : '静止/背景像素';
  const decisionClassName = finalMaskValue > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600';

  useEffect(() => {
    if (!isPlaying || frameCount === 0) return;

    const timer = window.setInterval(() => {
      setCurrentFrameIndex(prev => (prev >= maxFrameIndex ? minFrameIndex : prev + 1));
    }, 600);

    return () => window.clearInterval(timer);
  }, [frameCount, isPlaying, maxFrameIndex]);

  const handleMethodChange = useCallback((value: string) => {
    setMethod(value as FrameDifferenceMode);
  }, []);

  const handleFrameChange = useCallback((value: number) => {
    setIsPlaying(false);
    setCurrentFrameIndex(Math.max(minFrameIndex, Math.min(value, maxFrameIndex)));
  }, [maxFrameIndex]);

  const handlePixelSelect = useCallback((x: number, y: number) => {
    setCurrentPosition({ x, y });
  }, []);

  const handleDirectionMove = useGridNavigation({
    current: currentPosition,
    bounds: { width, height },
    onMove: setCurrentPosition,
    disabled: width === 0 || height === 0,
  });

  const activeFormula = method === 'twoFrame'
    ? frameDifferenceFormulaMathML(previousGray, currentGray, previousDiffGray, threshold, rawMaskValue)
    : symmetricDifferenceFormulaMathML(
      previousGray,
      currentGray,
      nextGray,
      previousDiffGray,
      nextDiffGray,
      threshold,
      currentTimeline.previousMask,
      currentTimeline.nextMask,
      rawMaskValue
    );

  const mainVisual = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">连续帧小人运动序列</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              公共序列生成器输出 {width}×{height}、{frameCount} 帧；当前计算第 {result.frameIndex + 1} 帧。
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPlaying(prev => !prev)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {result.frames.map((frame, index) => {
            const active = index === result.frameIndex;
            const endpoint = index === 0 || index === frameCount - 1;
            return (
              <button
                key={`film-${index}`}
                type="button"
                onClick={() => handleFrameChange(index)}
                className={`shrink-0 rounded-xl border px-1.5 py-1.5 transition ${
                  active
                    ? 'border-red-300 bg-red-50 shadow-sm'
                    : endpoint
                      ? 'border-slate-100 bg-slate-50 opacity-70'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <ImageCanvas image={frame} maxDisplaySize={48} showGrid={false} />
                <div className="mt-1 text-center font-mono text-[10px] text-slate-500">t={index + 1}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <FrameImageCard
          title={`前一帧 I(t-1) / t=${result.previousIndex + 1}`}
          note={`I(t-1)(${currentPosition.x},${currentPosition.y}) = ${previousGray}`}
          image={result.previous}
          tone="slate"
          selectedRegion={selectedPixelRegion}
          onSelect={handlePixelSelect}
        />
        <FrameImageCard
          title={`当前帧 I(t) / t=${result.frameIndex + 1}`}
          note={`I(t)(${currentPosition.x},${currentPosition.y}) = ${currentGray}`}
          image={result.current}
          tone="red"
          selectedRegion={selectedPixelRegion}
          onSelect={handlePixelSelect}
        />
        <FrameImageCard
          title={`后一帧 I(t+1) / t=${result.nextIndex + 1}`}
          note={`I(t+1)(${currentPosition.x},${currentPosition.y}) = ${nextGray}`}
          image={result.next}
          tone="slate"
          selectedRegion={selectedPixelRegion}
          onSelect={handlePixelSelect}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <FrameImageCard
          title="前向差分 |I(t)-I(t-1)|"
          note={`差值 = |${currentGray} - ${previousGray}| = ${previousDiffGray}`}
          image={result.previousDifference}
          tone="amber"
          selectedRegion={selectedPixelRegion}
          onSelect={handlePixelSelect}
        />
        <FrameImageCard
          title="后向差分 |I(t+1)-I(t)|"
          note={`差值 = |${nextGray} - ${currentGray}| = ${nextDiffGray}`}
          image={result.nextDifference}
          tone="amber"
          selectedRegion={selectedPixelRegion}
          onSelect={handlePixelSelect}
        />
        <FrameImageCard
          title={method === 'twoFrame' ? '二值运动掩膜' : '两次差分交集'}
          note={`原始判定 D = ${rawMaskValue}，T = ${threshold}`}
          image={result.binary}
          tone="sky"
          selectedRegion={selectedPixelRegion}
          onSelect={handlePixelSelect}
        />
        <FrameImageCard
          title="形态学清理结果"
          note={`清理后判定：${decisionText}`}
          image={result.cleaned}
          tone="emerald"
          selectedRegion={selectedPixelRegion}
          onSelect={handlePixelSelect}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">当前位置</div>
          <div className="mt-1 font-mono text-lg font-semibold text-slate-800">({currentPosition.x}, {currentPosition.y})</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs text-amber-700">当前差值</div>
          <div className="mt-1 font-mono text-lg font-semibold text-amber-800">{previousDiffGray} / {nextDiffGray}</div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="text-xs text-sky-700">运动像素数量</div>
          <div className="mt-1 font-mono text-lg font-semibold text-sky-800">
            {result.cleanedPixelCount}
            <span className="ml-2 text-xs font-normal">({formatPercent(result.cleanedPixelCount, totalPixels)})</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">阈值比较</div>
          <div className="mt-1 text-sm text-slate-700">
            <span className={decisionClassName}>{decisionText}</span>
          </div>
        </div>
      </div>

      <TeachingCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-800">当前像素时间线</div>
            <div className="mt-1 text-xs text-slate-500">
              每个柱表示选中像素在连续帧中的灰度值；红色表示该帧被判为运动。
            </div>
          </div>
          <span className="font-mono text-xs text-slate-500">I = {currentGray}, D = {finalMaskValue}</span>
        </div>
        <div className="flex h-24 items-end gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          {result.pixelTimeline.map(point => {
            const active = point.frameIndex === result.frameIndex;
            const barHeight = Math.max(8, grayValue(point.current) / 255 * 72);
            return (
              <button
                key={`pixel-timeline-${point.frameIndex}`}
                type="button"
                onClick={() => handleFrameChange(point.frameIndex)}
                className={`flex w-6 shrink-0 flex-col items-center justify-end gap-1 rounded-md px-0.5 py-1 ${
                  active ? 'bg-white shadow-sm ring-1 ring-red-200' : 'hover:bg-white'
                }`}
                title={`t=${point.frameIndex + 1}, I=${grayValue(point.current)}`}
              >
                <span
                  className={`w-3 rounded-t-sm ${point.finalMask > 0 ? 'bg-red-500' : 'bg-slate-400'}`}
                  style={{ height: barHeight }}
                />
                <span className="font-mono text-[9px] text-slate-500">{point.frameIndex + 1}</span>
              </button>
            );
          })}
        </div>
      </TeachingCard>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-xs font-semibold text-red-700">选中像素</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              当前查看 ({currentPosition.x}, {currentPosition.y})，三帧灰度为 {previousGray} / {currentGray} / {nextGray}。
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-xs font-semibold text-amber-700">差分与阈值</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              前向差分 {previousDiffGray}，后向差分 {nextDiffGray}，当前阈值 T = {threshold}。
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-xs font-semibold text-emerald-700">运动判定</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {method === 'twoFrame' ? '时间差分只要求前向差分超过阈值。' : '对称差分要求前后两次差分同时超过阈值。'}
              当前结果：{decisionText}。
            </p>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const stepDetails = (
    <div className="space-y-6">
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">动态像素代入</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          点击任意图像都会更新同一个像素坐标，下面公式直接使用当前像素的真实灰度值。
        </p>
        <FormulaCard
          label={method === 'twoFrame' ? '时间差分判定' : '对称差分判定'}
          mathML={activeFormula}
          note={method === 'twoFrame'
            ? `当前位置前向差分为 ${previousDiffGray}，阈值 T = ${threshold}。`
            : `当前位置前向差分为 ${previousDiffGray}，后向差分为 ${nextDiffGray}，两者同时超过 T 才保留。`}
        />
        <FormulaCard
          label="形态学清理"
          mathML={morphologyFormulaMathML()}
          note={`原始运动像素 ${result.motionPixelCount} 个，清理后 ${result.cleanedPixelCount} 个。`}
        />
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">算法特点</h2>
        <div className="grid gap-3 text-xs leading-6 text-slate-600 md:grid-cols-2">
          <p><span className="font-semibold text-emerald-700">优点：</span>只需要相邻帧作差，计算量小，能快速找出画面变化区域。</p>
          <p><span className="font-semibold text-rose-700">限制：</span>对噪声和光照闪动敏感，运动目标内部可能出现空洞，因此常接形态学处理。</p>
        </div>
      </TeachingCard>

      <section className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">教材补充：时间差分法示例</h2>
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
          {TIME_DIFF_EXAMPLES.map(item => (
            <CourseImage key={item.src} src={item.src} label={item.label} className="h-56" />
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">教材补充：对称差分法实验效果</h2>
        <div className="space-y-5">
          {SYMMETRIC_EXPERIMENT_STEPS.map(step => (
            <div key={step.title} className="border-t border-slate-200/80 pt-4 first:border-t-0 first:pt-0">
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-slate-800">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
              </div>
              <div className={`grid gap-3 ${step.images.length === 3 ? 'md:grid-cols-3' : step.images.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                {step.images.map(image => (
                  <CourseImage key={image.src} src={image.src} label={image.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="算法选择"
        value={method}
        onChange={handleMethodChange}
        options={METHOD_OPTIONS}
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">连续帧播放</span>
          <button
            type="button"
            onClick={() => setIsPlaying(prev => !prev)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
        </div>
        <SliderParam
          label="当前帧 t"
          value={result.frameIndex + 1}
          onChange={value => handleFrameChange(value - 1)}
          min={2}
          max={Math.max(2, frameCount - 1)}
          step={1}
        />
      </div>
      <SliderParam label="运动阈值 T" value={threshold} onChange={setThreshold} min={5} max={120} step={1} />
      <SliderParam label="小人速度" value={motionSpeed} onChange={setMotionSpeed} min={3} max={12} step={1} />
      <SliderParam label="噪声强度" value={noiseStrength} onChange={setNoiseStrength} min={0} max={35} step={1} />
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-800">
        {method === 'twoFrame'
          ? '时间差分只比较 I(t) 与 I(t-1)，阈值越低，变化区域越容易被标为运动。'
          : '对称差分同时比较前后两次变化，能减少单侧残影，但快速运动时目标区域会更窄。'}
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="帧差法与运动检测"
      subtitle="Frame Difference & Motion - 相邻帧变化检测"
      operationLabel="帧间差分"
      parameterIntro="播放连续帧运动序列，点击像素后只追踪当前像素的前后帧差分、阈值判定和运动掩膜结果。"
      originalImage={result.current}
      resultImage={result.cleaned}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'Pseudo Code', code: FRAME_CODE_TS }]} />}
      mainVisual={mainVisual}
      currentStep={{ x: currentPosition.x, y: currentPosition.y, kernelSize: 1 }}
      stepInfo={{ current: currentStepIndex, total: totalPixels }}
      imageLabels={{ input: '当前帧', output: '运动掩膜' }}
      imageHints={{ input: '点击像素查看三帧灰度变化', output: '阈值化与形态学清理后的运动区域' }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handlePixelSelect}
      onOutputPixelSelect={handlePixelSelect}
      navigationHintText="方向键移动 / 点击任意帧、差分图或掩膜定位像素"
    />
  );
}
