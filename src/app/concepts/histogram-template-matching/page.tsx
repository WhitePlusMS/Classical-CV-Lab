'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { GrayscaleImage } from '@/lib/algorithms/types';
import {
  HistogramCompareMethod,
  MatchWindow,
  TemplateMatchMethod,
  clampMatchWindow,
  createHistogramMatchingResult,
  createTemplateMatchingResult,
} from '@/lib/algorithms/histogramTemplateMatching';
import {
  centerCropGrayscaleImage,
  clamp,
  imageToCanvas,
  loadImageAsGrayscale,
  resizeGrayscaleImage,
} from '@/lib/utils/imageProcessing';

type TeachingSection = 'template' | 'histogram';
type ControlTarget = 'template' | 'current' | 'candidate';

interface DisplayRegion {
  window: MatchWindow;
  color: string;
  label: string;
  fill?: string;
}

const COMPARE_HIST_CODE = `function compareHist(templateHist, candidateHist, method) {
  if (method === 'correlation') return correlation(templateHist, candidateHist);
  if (method === 'chi-square') return chiSquare(templateHist, candidateHist);
  if (method === 'intersection') return sumMin(templateHist, candidateHist);
  return bhattacharyya(templateHist, candidateHist);
}`;

const MATCH_TEMPLATE_CODE = `function matchTemplate(image, template, method) {
  for (let y = 0; y <= image.height - template.height; y++) {
    for (let x = 0; x <= image.width - template.width; x++) {
      response[y][x] = method === 'SSD'
        ? sum((template - imageWindow(x, y)) ** 2)
        : sum(abs(template - imageWindow(x, y)));
    }
  }
  return argMin(response);
}`;

const HIST_METHOD_OPTIONS = [
  { value: 'correlation', label: '相关法' },
  { value: 'chi-square', label: '卡方距离' },
  { value: 'intersection', label: '直方图相交法' },
  { value: 'bhattacharyya', label: '巴氏距离' },
] as const;

const TEMPLATE_METHOD_OPTIONS = [
  { value: 'ssd', label: 'SSD 平方差' },
  { value: 'sad', label: 'SAD 绝对差' },
] as const;

const TEXTBOOK_IMAGES = [
  { src: '/assets/histogram-template-matching/templ-sliding-window.jpg', label: '模板匹配滑动窗口原理' },
  { src: '/assets/histogram-template-matching/templ-concept-1.jpg', label: '模板匹配过程示意' },
  { src: '/assets/histogram-template-matching/templ-concept-2.jpg', label: '子图与模板比较' },
  { src: '/assets/histogram-template-matching/original-image.jpg', label: '实验原图' },
  { src: '/assets/histogram-template-matching/template-image.jpg', label: '模板图像' },
  { src: '/assets/histogram-template-matching/matching-result.jpg', label: '匹配结果' },
  { src: '/assets/histogram-template-matching/matching-process.jpg', label: '匹配过程图' },
  { src: '/assets/histogram-template-matching/matching-final-result.jpg', label: '最终定位图' },
] as const;

function createFallbackImage(size: number): GrayscaleImage {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const face = Math.exp(-(((x - size * 0.52) / 32) ** 2 + ((y - size * 0.5) / 38) ** 2));
      const diagonal = Math.abs(x - y) < 6 ? 0.2 : 0;
      const stripe = Math.sin((x + y) * 0.18) * 0.05;
      return clamp(0.22 + face * 0.45 + diagonal + stripe, 0, 1);
    })
  );
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(4);
}

function scoreDirectionText(method: HistogramCompareMethod): string {
  return method === 'chi-square' || method === 'bhattacharyya'
    ? '越小越相似'
    : '越大越相似';
}

function windowCenterClick(x: number, y: number, size: number): MatchWindow {
  return {
    x: Math.round(x - size / 2),
    y: Math.round(y - size / 2),
    width: size,
    height: size,
  };
}

function templateFormulaMathML(
  method: TemplateMatchMethod,
  templatePatch: GrayscaleImage,
  currentPatch: GrayscaleImage,
  score: number,
  window: MatchWindow
): string {
  const terms = [0, 1, 2, 3].map(index => {
    const x = index % 2;
    const y = Math.floor(index / 2);
    const template = Math.round((templatePatch[y]?.[x] ?? 0) * 255);
    const current = Math.round((currentPatch[y]?.[x] ?? 0) * 255);
    const diff = Math.abs(template - current);
    return method === 'ssd'
      ? `<msup><mrow><mo>(</mo><mn>${template}</mn><mo>-</mo><mn>${current}</mn><mo>)</mo></mrow><mn>2</mn></msup>`
      : `<mo>|</mo><mn>${template}</mn><mo>-</mo><mn>${current}</mn><mo>|</mo>`;
  }).join('<mo>+</mo>');

  const name = method === 'ssd' ? 'SSD' : 'SAD';
  const operator = method === 'ssd'
    ? '<msup><mrow><mo>[</mo><mi>T</mi><mo>-</mo><mi>S</mi><mo>]</mo></mrow><mn>2</mn></msup>'
    : '<mo>|</mo><mi>T</mi><mo>-</mo><mi>S</mi><mo>|</mo>';

  return buildInlineMathML(`
    <mrow>
      <mi>${name}</mi><mo>(</mo><mn>${window.x}</mn><mo>,</mo><mn>${window.y}</mn><mo>)</mo>
      <mo>=</mo><msub><mo>∑</mo><mrow><mi>u</mi><mo>,</mo><mi>v</mi></mrow></msub>${operator}
      <mo>≈</mo>${terms}<mo>+</mo><mo>⋯</mo>
      <mo>=</mo><mn>${formatScore(score)}</mn>
    </mrow>
  `);
}

function histogramFormulaMathML(
  method: HistogramCompareMethod,
  score: number,
  contributions: { bin: number; template: number; candidate: number; contribution: number }[]
): string {
  const name = {
    correlation: 'Correl',
    'chi-square': 'Chi',
    intersection: 'Inter',
    bhattacharyya: 'Bhatta',
  }[method];
  const terms = contributions.map(item => {
    const template = item.template.toFixed(3);
    const candidate = item.candidate.toFixed(3);
    if (method === 'chi-square') {
      return `<mfrac><msup><mrow><mo>(</mo><mn>${template}</mn><mo>-</mo><mn>${candidate}</mn><mo>)</mo></mrow><mn>2</mn></msup><mrow><mn>${template}</mn><mo>+</mo><mn>${candidate}</mn></mrow></mfrac>`;
    }
    if (method === 'intersection') {
      return `<mo>min</mo><mo>(</mo><mn>${template}</mn><mo>,</mo><mn>${candidate}</mn><mo>)</mo>`;
    }
    if (method === 'bhattacharyya') {
      return `<msqrt><mrow><mn>${template}</mn><mo>·</mo><mn>${candidate}</mn></mrow></msqrt>`;
    }
    return `<mn>${template}</mn><mo>·</mo><mn>${candidate}</mn>`;
  }).join('<mo>+</mo>');

  return buildInlineMathML(`
    <mrow>
      <mi>${name}</mi><mo>(</mo><msub><mi>H</mi><mi>T</mi></msub><mo>,</mo><msub><mi>H</mi><mi>C</mi></msub><mo>)</mo>
      <mo>≈</mo>${terms}<mo>+</mo><mo>⋯</mo>
      <mo>=</mo><mn>${formatScore(score)}</mn>
    </mrow>
  `);
}

function MultiRegionImage({
  image,
  regions,
  maxDisplaySize,
  onSelect,
}: {
  image: GrayscaleImage;
  regions: DisplayRegion[];
  maxDisplaySize: number;
  onSelect: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const scale = width > 0 && height > 0 ? Math.min(maxDisplaySize / width, maxDisplaySize / height) : 1;
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || image.length === 0) return;
    imageToCanvas(image, canvas);
  }, [image]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || width === 0 || height === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (height / rect.height));
    onSelect(
      Math.max(0, Math.min(width - 1, x)),
      Math.max(0, Math.min(height - 1, y))
    );
  }, [height, onSelect, width]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      style={{ width: displayWidth, height: displayHeight, cursor: 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: displayWidth, height: displayHeight, imageRendering: 'pixelated' }}
      />
      {regions.map(region => (
        <div
          key={`${region.label}-${region.window.x}-${region.window.y}`}
          className="pointer-events-none absolute box-border rounded-[3px] border-2"
          style={{
            left: region.window.x * scale,
            top: region.window.y * scale,
            width: region.window.width * scale,
            height: region.window.height * scale,
            borderColor: region.color,
            backgroundColor: region.fill ?? 'transparent',
            boxShadow: `0 0 0 1px rgba(255,255,255,0.9), 0 8px 20px rgba(15,23,42,0.18)`,
          }}
        >
          <span
            className="absolute left-0 top-0 -translate-y-full rounded-t-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: region.color }}
          >
            {region.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function HistogramChart({
  histogram,
  colorClassName,
}: {
  histogram: number[];
  colorClassName: string;
}) {
  const maxValue = Math.max(0.001, ...histogram);
  return (
    <div className="flex h-24 items-end gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
      {histogram.map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div
            className={`w-full rounded-t-sm ${colorClassName}`}
            style={{ height: `${Math.max(4, (value / maxValue) * 72)}px` }}
            title={`bin ${index}: ${value.toFixed(3)}`}
          />
          {index % 4 === 0 ? <span className="font-mono text-[8px] text-slate-400">{index}</span> : <span className="h-[10px]" />}
        </div>
      ))}
    </div>
  );
}

function CourseImage({ src, label }: { src: string; label: string }) {
  return (
    <figure>
      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
        <img src={src} alt={label} className="h-full w-full object-contain" />
      </div>
      <figcaption className="mt-2 text-center text-xs font-semibold text-slate-600">{label}</figcaption>
    </figure>
  );
}

export default function HistogramTemplateMatchingPage() {
  const [section, setSection] = useState<TeachingSection>('template');
  const [histMethod, setHistMethod] = useState<HistogramCompareMethod>('correlation');
  const [templateMethod, setTemplateMethod] = useState<TemplateMatchMethod>('ssd');
  const [templateSize, setTemplateSize] = useState(24);
  const [activeControl, setActiveControl] = useState<ControlTarget>('current');
  const [templateWindow, setTemplateWindow] = useState<MatchWindow>({ x: 42, y: 34, width: 24, height: 24 });
  const [currentWindow, setCurrentWindow] = useState<MatchWindow>({ x: 72, y: 34, width: 24, height: 24 });
  const [candidateWindow, setCandidateWindow] = useState<MatchWindow>({ x: 20, y: 72, width: 24, height: 24 });
  const [lenaImage, setLenaImage] = useState<GrayscaleImage>([]);
  const [courseImage, setCourseImage] = useState<GrayscaleImage>([]);
  const fallbackImage = useMemo(() => createFallbackImage(128), []);

  useEffect(() => {
    let cancelled = false;

    loadImageAsGrayscale('/assets/lena-original.jpg')
      .then(image => {
        if (!cancelled) {
          setLenaImage(resizeGrayscaleImage(centerCropGrayscaleImage(image), 128));
        }
      })
      .catch(() => {
        if (!cancelled) setLenaImage([]);
      });

    loadImageAsGrayscale('/assets/histogram-template-matching/original-image.jpg')
      .then(image => {
        if (!cancelled) {
          setCourseImage(resizeGrayscaleImage(centerCropGrayscaleImage(image), 128));
        }
      })
      .catch(() => {
        if (!cancelled) setCourseImage([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTemplateWindow(prev => ({ ...prev, width: templateSize, height: templateSize }));
    setCurrentWindow(prev => ({ ...prev, width: templateSize, height: templateSize }));
    setCandidateWindow(prev => ({ ...prev, width: templateSize, height: templateSize }));
  }, [templateSize]);

  useEffect(() => {
    if (section === 'template' && activeControl === 'candidate') setActiveControl('current');
    if (section === 'histogram' && activeControl === 'current') setActiveControl('candidate');
  }, [activeControl, section]);

  const sourceImage = useMemo(() => {
    if (lenaImage.length > 0) return lenaImage;
    if (courseImage.length > 0) return courseImage;
    return fallbackImage;
  }, [courseImage, fallbackImage, lenaImage]);

  const templateResult = useMemo(
    () => createTemplateMatchingResult(sourceImage, templateWindow, currentWindow, templateMethod),
    [currentWindow, sourceImage, templateMethod, templateWindow]
  );
  const histogramResult = useMemo(
    () => createHistogramMatchingResult(sourceImage, templateWindow, candidateWindow, histMethod, 16),
    [candidateWindow, histMethod, sourceImage, templateWindow]
  );

  const width = sourceImage[0]?.length ?? 0;
  const height = sourceImage.length;
  const maxWindowX = Math.max(0, width - templateSize);
  const maxWindowY = Math.max(0, height - templateSize);
  const controlledWindow = activeControl === 'template'
    ? templateResult.templateWindow
    : activeControl === 'current'
      ? templateResult.currentWindow
      : histogramResult.candidateWindow;

  const setControlledWindow = useCallback((nextWindow: MatchWindow) => {
    const safeWindow = clampMatchWindow(sourceImage, { ...nextWindow, width: templateSize, height: templateSize });
    if (activeControl === 'template') {
      setTemplateWindow(safeWindow);
    } else if (activeControl === 'current') {
      setCurrentWindow(safeWindow);
    } else {
      setCandidateWindow(safeWindow);
    }
  }, [activeControl, sourceImage, templateSize]);

  const handleSourceSelect = useCallback((x: number, y: number) => {
    setControlledWindow(windowCenterClick(x, y, templateSize));
  }, [setControlledWindow, templateSize]);

  const handleResponseSelect = useCallback((x: number, y: number) => {
    setCurrentWindow(clampMatchWindow(sourceImage, { x, y, width: templateSize, height: templateSize }));
    setActiveControl('current');
  }, [sourceImage, templateSize]);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const delta = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    }[direction];

    setControlledWindow({
      ...controlledWindow,
      x: controlledWindow.x + delta.x,
      y: controlledWindow.y + delta.y,
    });
  }, [controlledWindow, setControlledWindow]);

  const handleSectionChange = useCallback((value: string) => {
    const nextSection = value as TeachingSection;
    setSection(nextSection);
    setActiveControl(nextSection === 'template' ? 'current' : 'candidate');
  }, []);

  const sourceRegions: DisplayRegion[] = section === 'template'
    ? [
        { window: templateResult.templateWindow, color: '#dc2626', label: '模板 T', fill: 'rgba(220,38,38,0.08)' },
        { window: templateResult.currentWindow, color: '#2563eb', label: '当前 Sxy', fill: 'rgba(37,99,235,0.08)' },
      ]
    : [
        { window: histogramResult.templateWindow, color: '#dc2626', label: '模板区域', fill: 'rgba(220,38,38,0.08)' },
        { window: histogramResult.candidateWindow, color: '#2563eb', label: '候选区域', fill: 'rgba(37,99,235,0.08)' },
      ];

  const templateFormula = templateFormulaMathML(
    templateMethod,
    templateResult.templatePatch,
    templateResult.currentPatch,
    templateResult.currentScore,
    templateResult.currentWindow
  );
  const histFormula = histogramFormulaMathML(
    histMethod,
    histogramResult.score,
    histogramResult.sampleContributions
  );

  const templateMainVisual = (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">源图与滑动窗口</div>
              <div className="mt-1 text-xs text-slate-500">红框是目标模板 T，蓝框是当前搜索窗口 Sxy；公式只比较这两个窗口。</div>
            </div>
            <span className="font-mono text-xs text-slate-400">{width}×{height}</span>
          </div>
          <div className="flex justify-center">
            <MultiRegionImage image={sourceImage} regions={sourceRegions} maxDisplaySize={360} onSelect={handleSourceSelect} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-red-200 bg-white px-4 py-4 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-red-700">模板 T</div>
            <div className="flex justify-center">
              <ImageCanvas image={templateResult.templatePatch} maxDisplaySize={150} showGrid={false} />
            </div>
            <div className="mt-2 font-mono text-xs text-slate-500">
              ({templateResult.templateWindow.x}, {templateResult.templateWindow.y}) / {templateSize}×{templateSize}
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-4 py-4 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-blue-700">当前窗口 Sxy</div>
            <div className="flex justify-center">
              <ImageCanvas image={templateResult.currentPatch} maxDisplaySize={150} showGrid={false} />
            </div>
            <div className="mt-2 font-mono text-xs text-slate-500">
              ({templateResult.currentWindow.x}, {templateResult.currentWindow.y})
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-emerald-700">响应热力图</div>
              <div className="mt-1 text-xs text-slate-500">红点表示当前窗口响应位置；绿框只在热力图中辅助标出非自身最佳响应。</div>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {templateResult.heatmap[0]?.length ?? 0}×{templateResult.heatmap.length}
            </span>
          </div>
          <div className="flex justify-center">
            <ImageCanvas
              image={templateResult.heatmap}
              maxDisplaySize={260}
              showGrid={false}
              interactive
              onRegionSelect={handleResponseSelect}
              selectedRegion={{ x: templateResult.currentWindow.x, y: templateResult.currentWindow.y, size: 1 }}
              selectedRegionMarker="dot"
              highlightPixel={{ x: templateResult.bestWindow.x, y: templateResult.bestWindow.y }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="text-xs text-blue-700">当前窗口分数</div>
          <div className="mt-1 font-mono text-lg font-semibold text-blue-800">{formatScore(templateResult.currentScore)}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs text-emerald-700">热力图最优参考</div>
          <div className="mt-1 font-mono text-lg font-semibold text-emerald-800">{formatScore(templateResult.bestScore)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">参考坐标</div>
          <div className="mt-1 font-mono text-lg font-semibold text-slate-800">
            ({templateResult.bestWindow.x}, {templateResult.bestWindow.y})
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs text-amber-700">当前与参考差距</div>
          <div className="mt-1 font-mono text-lg font-semibold text-amber-800">{formatScore(templateResult.scoreDelta)}</div>
        </div>
      </div>
    </div>
  );

  const histogramMainVisual = (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.9fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-800">源图区域选择</div>
            <div className="mt-1 text-xs text-slate-500">红框为模板区域，蓝框为候选区域；直方图只比较灰度分布。</div>
          </div>
          <div className="flex justify-center">
            <MultiRegionImage image={sourceImage} regions={sourceRegions} maxDisplaySize={360} onSelect={handleSourceSelect} />
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white px-4 py-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-red-700">模板区域 H_T</div>
          <div className="flex justify-center">
            <ImageCanvas image={histogramResult.templatePatch} maxDisplaySize={150} showGrid={false} />
          </div>
          <div className="mt-3">
            <HistogramChart histogram={histogramResult.templateHistogram} colorClassName="bg-red-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white px-4 py-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-blue-700">候选区域 H_C</div>
          <div className="flex justify-center">
            <ImageCanvas image={histogramResult.candidatePatch} maxDisplaySize={150} showGrid={false} />
          </div>
          <div className="mt-3">
            <HistogramChart histogram={histogramResult.candidateHistogram} colorClassName="bg-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="text-xs text-violet-700">当前方法</div>
          <div className="mt-1 text-base font-semibold text-violet-800">
            {HIST_METHOD_OPTIONS.find(item => item.value === histMethod)?.label}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">相似度分数</div>
          <div className="mt-1 font-mono text-lg font-semibold text-slate-800">{formatScore(histogramResult.score)}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs text-amber-700">判定方向</div>
          <div className="mt-1 text-base font-semibold text-amber-800">{scoreDirectionText(histMethod)}</div>
        </div>
      </div>

      <TeachingCard tone="amber">
        <div className="text-sm font-semibold text-slate-800">直方图匹配的局限</div>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          直方图只统计灰度值出现的比例，不记录这些灰度在区域内的空间排列。因此两个区域即使纹理结构不同，只要灰度分布接近，也可能得到较高相似度。
        </p>
      </TeachingCard>
    </div>
  );

  const mainVisual = section === 'template' ? templateMainVisual : histogramMainVisual;

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-xs font-semibold text-red-700">
              {section === 'template' ? '模板窗口' : '模板直方图'}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {section === 'template'
                ? `模板来自 (${templateResult.templateWindow.x}, ${templateResult.templateWindow.y})，大小 ${templateSize}×${templateSize}。`
                : `模板区域生成 ${histogramResult.templateHistogram.length} 个归一化灰度 bin。`}
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-xs font-semibold text-amber-700">实时计算</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {section === 'template'
                ? `公式只比较模板 T 与当前窗口 Sxy，当前分数 ${formatScore(templateResult.currentScore)}。`
                : `当前 ${HIST_METHOD_OPTIONS.find(item => item.value === histMethod)?.label} 分数为 ${formatScore(histogramResult.score)}。`}
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-xs font-semibold text-emerald-700">判定结果</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {section === 'template'
                ? `最佳分数和坐标只作为响应图辅助参考，不作为第三个参与计算的窗口。`
                : `当前方法规则：${scoreDirectionText(histMethod)}。`}
            </p>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const stepDetails = (
    <div className="space-y-6">
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">当前公式代入</h2>
        {section === 'template' ? (
          <FormulaCard
            label={templateMethod === 'ssd' ? 'SSD 平方差匹配' : 'SAD 绝对差匹配'}
            mathML={templateFormula}
            note={`当前公式只代入模板 T 与当前窗口 Sxy：当前窗口 (${templateResult.currentWindow.x}, ${templateResult.currentWindow.y}) 的分数为 ${formatScore(templateResult.currentScore)}。热力图最优参考分数为 ${formatScore(templateResult.bestScore)}。`}
          />
        ) : (
          <FormulaCard
            label={`${HIST_METHOD_OPTIONS.find(item => item.value === histMethod)?.label} 代表 bin 代入`}
            mathML={histFormula}
            note={`上式只展开前 ${histogramResult.sampleContributions.length} 个 bin，完整分数使用 16 个 bin 汇总；该方法${scoreDirectionText(histMethod)}。`}
          />
        )}
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">概念对比</h2>
        <div className="grid gap-3 text-xs leading-6 text-slate-600 md:grid-cols-2">
          <p><span className="font-semibold text-red-700">直方图匹配：</span>比较灰度分布，忽略空间布局，适合颜色/灰度统计稳定的目标。</p>
          <p><span className="font-semibold text-blue-700">模板匹配：</span>逐像素比较局部排列，对形状和纹理位置敏感，旋转或尺度变化会明显影响结果。</p>
        </div>
      </TeachingCard>

      <section className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">教材补充</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TEXTBOOK_IMAGES.map(image => (
            <CourseImage key={image.src} src={image.src} label={image.label} />
          ))}
        </div>
      </section>
    </div>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="教学模式"
        value={section}
        onChange={handleSectionChange}
        options={[
          { value: 'template', label: '模板匹配' },
          { value: 'histogram', label: '直方图匹配' },
        ]}
      />
      <SliderParam
        label="模板大小"
        value={templateSize}
        onChange={setTemplateSize}
        min={16}
        max={32}
        step={8}
      />
      {section === 'template' ? (
        <>
          <SelectParam
            label="匹配准则"
            value={templateMethod}
            onChange={value => setTemplateMethod(value as TemplateMatchMethod)}
            options={TEMPLATE_METHOD_OPTIONS}
          />
          <SelectParam
            label="当前控制对象"
            value={activeControl}
            onChange={value => setActiveControl(value as ControlTarget)}
            options={[
              { value: 'current', label: '当前搜索窗口' },
              { value: 'template', label: '模板区域' },
            ]}
          />
        </>
      ) : (
        <>
          <SelectParam
            label="直方图方法"
            value={histMethod}
            onChange={value => setHistMethod(value as HistogramCompareMethod)}
            options={HIST_METHOD_OPTIONS}
          />
          <SelectParam
            label="当前控制对象"
            value={activeControl}
            onChange={value => setActiveControl(value as ControlTarget)}
            options={[
              { value: 'candidate', label: '候选区域' },
              { value: 'template', label: '模板区域' },
            ]}
          />
        </>
      )}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        点击源图会移动当前控制对象；方向键每次移动 1 个像素。当前窗口范围：x 0-{maxWindowX}，y 0-{maxWindowY}。
      </div>
    </div>
  );

  const codeSections = section === 'template'
    ? [
        { name: 'matchTemplate', code: MATCH_TEMPLATE_CODE },
        { name: 'compareHist', code: COMPARE_HIST_CODE },
      ]
    : [
        { name: 'compareHist', code: COMPARE_HIST_CODE },
        { name: 'matchTemplate', code: MATCH_TEMPLATE_CODE },
      ];

  return (
    <ConceptLayout
      title="直方图匹配与模板匹配"
      subtitle="Histogram Matching & Template Matching - 基于特征匹配的目标检测"
      operationLabel={section === 'template' ? '模板响应' : '直方图比较'}
      parameterIntro="调整模板大小和当前控制对象，观察窗口移动时响应图、直方图和公式代入如何同步变化。"
      originalImage={sourceImage}
      resultImage={section === 'template' ? templateResult.heatmap : histogramResult.candidatePatch}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={codeSections} />}
      mainVisual={mainVisual}
      currentStep={{
        x: controlledWindow.x,
        y: controlledWindow.y,
        kernelSize: templateSize,
        regionWidth: templateSize,
        regionHeight: templateSize,
      }}
      stepInfo={{
        current: controlledWindow.y * (maxWindowX + 1) + controlledWindow.x,
        total: (maxWindowX + 1) * (maxWindowY + 1),
      }}
      imageLabels={{
        input: '源图',
        output: section === 'template' ? '响应热力图' : '候选区域',
      }}
      imageHints={{
        input: '点击源图移动当前控制对象',
        output: section === 'template' ? '点击热力图移动搜索窗口' : '直方图候选区域',
      }}
      showOriginalGrid={false}
      originalRegionMarker="frame"
      singlePageScroll
      onDirectionMove={handleDirectionMove}
      navigationHintText="方向键移动当前控制对象 / 点击源图移动选中窗口"
    />
  );
}
