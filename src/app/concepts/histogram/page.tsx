'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  FormulaCard,
  InlineMath,
  ProcessRail,
  SelectParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import { computeHistogram } from '@/lib/algorithms/histogram';
import { generateExampleImage } from '@/lib/algorithms/histogram';
import { centerCropGrayscaleImage, loadImageAsGrayscale } from '@/lib/utils/imageProcessing';
import { GrayscaleImage } from '@/lib/algorithms/types';

type ExampleType = 'dark' | 'bright' | 'lowContrast' | 'bimodal' | 'standard' | 'lena';

const EXAMPLE_LABELS: Record<ExampleType, string> = {
  dark: '偏暗图',
  bright: '偏亮图',
  lowContrast: '低对比图',
  bimodal: '双峰图',
  standard: '标准图',
  lena: 'Lena 图',
};

const HISTOGRAM_CODE_TS = `interface Histogram {
  bins: number[];      // 256 个灰度级的像素计数
  totalPixels: number; // 图像总像素数
}

// 与页面真实实现一致：先 clamp 到 [0,1] 再量化，并做空数组保护
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeHistogram(image: number[][]): Histogram {
  const height = image.length;
  const width = image[0]?.length || 0;
  const bins = new Array(256).fill(0);
  let totalPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gray = Math.round(clamp(image[y][x], 0, 1) * 255);
      bins[gray]++;
      totalPixels++;
    }
  }
  return { bins, totalPixels };
}

// P(s_k) = n_k / n  — 页面实时计算展示概率，下为示意实现
function probability(bins: number[], total: number): number[] {
  return bins.map(n => n / total);
}`;

const HISTOGRAM_FORMULA_MATHML = buildInlineMathML(`
  <mrow>
    <mi>P</mi><mo>(</mo><msub><mi>s</mi><mi>k</mi></msub><mo>)</mo>
    <mo>=</mo>
    <mfrac><msub><mi>n</mi><mi>k</mi></msub><mi>n</mi></mfrac>
  </mrow>
`);

function inlineMath(body: string): string {
  return buildInlineMathML(`<mrow>${body}</mrow>`);
}

function HistogramSVG({
  histogram,
  highlightedGray,
  pinnedGray,
  onHoverGrayChange,
  onPinGray,
}: {
  histogram: number[];
  highlightedGray: number | null;
  pinnedGray: number | null;
  onHoverGrayChange: (gray: number | null) => void;
  onPinGray: (gray: number) => void;
}) {
  const svgWidth = 520;
  const svgHeight = 220;
  const plotLeft = 20;
  const plotWidth = svgWidth - plotLeft;
  const barWidth = plotWidth / 256;
  const maxCount = Math.max(...histogram, 1);
  const activeGray = highlightedGray ?? pinnedGray;

  const readGrayFromMouse = (event: React.MouseEvent<SVGSVGElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * svgWidth;
    const gray = Math.floor(((svgX - plotLeft) / plotWidth) * 256);
    return Math.max(0, Math.min(255, gray));
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    // 方向键由 ConceptLayout 的全局 keydown 处理，此处只处理 Enter/Space 锁定
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const currentGray = activeGray ?? 128;
      onPinGray(currentGray);
      onHoverGrayChange(null);
    }
  };

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="font-mono"
      role="img"
      tabIndex={0}
      aria-label="灰度直方图，左右方向键移动锁定灰度，回车或空格锁定当前灰度"
      onMouseMove={event => onHoverGrayChange(readGrayFromMouse(event))}
      onMouseLeave={() => onHoverGrayChange(null)}
      onClick={event => onPinGray(readGrayFromMouse(event))}
      onKeyDown={handleKeyDown}
    >
      <title>灰度直方图</title>
      <desc>显示 0 到 255 灰度级的像素数量分布，可用鼠标或键盘锁定灰度级。</desc>
      <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#f8fafc" rx={4} />

      <text x={14} y={14} textAnchor="end" fontSize={8} fill="#64748b">
        {maxCount}
      </text>
      <text x={14} y={svgHeight - 6} textAnchor="end" fontSize={8} fill="#64748b">
        0
      </text>

      <line
        x1={plotLeft} y1={svgHeight - 10} x2={svgWidth} y2={svgHeight - 10}
        stroke="#cbd5e1" strokeWidth={1}
      />

      {histogram.map((count, gray) => {
        const barH = (count / maxCount) * (svgHeight - 24);
        const isHighlighted = activeGray === gray;
        return (
          <rect
            key={gray}
            x={plotLeft + gray * barWidth}
            y={svgHeight - 10 - barH}
            width={Math.max(1, barWidth - 0.5)}
            height={barH}
            fill={isHighlighted ? '#ef4444' : '#3b82f6'}
            fillOpacity={isHighlighted ? 1 : count > 0 ? 0.6 : 0.15}
            style={{ cursor: 'crosshair', transition: 'fill-opacity 0.1s' }}
          />
        );
      })}

      {activeGray !== null && (
        <line
          x1={plotLeft + activeGray * barWidth + barWidth / 2}
          y1={svgHeight - 10}
          x2={plotLeft + activeGray * barWidth + barWidth / 2}
          y2={4}
          stroke={highlightedGray !== null ? '#ef4444' : '#0f766e'}
          strokeWidth={highlightedGray !== null ? 1 : 2}
          strokeDasharray={highlightedGray !== null ? '3 2' : undefined}
        />
      )}

      {[0, 64, 128, 192, 255].map(v => (
        <g key={v}>
          <line x1={plotLeft + v * barWidth} y1={svgHeight - 10} x2={plotLeft + v * barWidth} y2={svgHeight - 6} stroke="#94a3b8" strokeWidth={1} />
          <text x={plotLeft + v * barWidth} y={svgHeight + 2} textAnchor="middle" fontSize={8} fill="#64748b">{v}</text>
        </g>
      ))}
    </svg>
  );
}

export default function HistogramPage() {
  const [exampleType, setExampleType] = useState<ExampleType>('standard');
  const [hoveredGray, setHoveredGray] = useState<number | null>(null);
  const [pinnedGray, setPinnedGray] = useState<number | null>(null);
  const [lenaImage, setLenaImage] = useState<GrayscaleImage | null>(null);
  const [lenaLoading, setLenaLoading] = useState(true);

  // 加载 Lena 真实图像
  useEffect(() => {
    let cancelled = false;
    loadImageAsGrayscale('/assets/lena-original.jpg').then(img => {
      if (!cancelled) {
        setLenaImage(centerCropGrayscaleImage(img));
        // 图像切换后重置灰度级锁定状态
        setHoveredGray(null);
        setPinnedGray(null);
      }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLenaLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // 根据类型获取图像：Lena 用真实图，其他用生成图
  const originalImage = useMemo(() => {
    if (exampleType === 'lena' && lenaImage) return lenaImage;
    // Lena 尚未加载完成或加载失败时，用标准图占位并给出提示
    if (exampleType === 'lena') return generateExampleImage('standard');
    return generateExampleImage(exampleType as Exclude<ExampleType, 'lena'>);
  }, [exampleType, lenaImage]);

  const histogramData = useMemo(() => computeHistogram(originalImage), [originalImage]);
  const { bins, totalPixels } = histogramData;

  const probabilityText = useMemo(() => {
    const gray = hoveredGray ?? pinnedGray;
    if (gray === null) return null;
    const count = bins[gray] || 0;
    const prob = totalPixels > 0 ? count / totalPixels : 0;
    return { gray, count, prob };
  }, [bins, totalPixels, hoveredGray, pinnedGray]);

  const handleExampleChange = useCallback((value: string) => {
    setExampleType(value as ExampleType);
    setHoveredGray(null);
    setPinnedGray(null);
  }, []);

  const handleHoverGrayChange = useCallback((gray: number | null) => {
    setHoveredGray(gray);
  }, []);

  const handlePinGray = useCallback((gray: number) => {
    setPinnedGray(gray);
    setHoveredGray(null);
  }, []);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (direction !== 'left' && direction !== 'right') return;
    setPinnedGray(prev => {
      const base = hoveredGray ?? prev ?? 128;
      return direction === 'left'
        ? Math.max(0, base - 1)
        : Math.min(255, base + 1);
    });
    setHoveredGray(null);
  }, [hoveredGray]);

  const analysisPreview = useMemo(() => {
    return (
      <ProcessRail className="overflow-x-auto py-2">
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-semibold tracking-wide text-slate-500">灰度直方图</span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-500">
              悬停预览，点击锁定；左右方向键移动锁定位置
            </span>
          </div>
          <HistogramSVG
            histogram={bins}
            highlightedGray={hoveredGray}
            pinnedGray={pinnedGray}
            onHoverGrayChange={handleHoverGrayChange}
            onPinGray={handlePinGray}
          />
          {probabilityText && (
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span>灰度值:<span className="font-bold text-red-500 ml-1">{probabilityText.gray}</span></span>
              <span>像素数 <InlineMath mathML={inlineMath('<msub><mi>n</mi><mi>k</mi></msub>')} />:<span className="ml-1 font-bold text-blue-600">{probabilityText.count}</span></span>
              <span>概率 <InlineMath mathML={inlineMath('<mi>P</mi><mo>(</mo><msub><mi>s</mi><mi>k</mi></msub><mo>)</mo>')} />:<span className="ml-1 font-bold text-blue-600">{(probabilityText.prob * 100).toFixed(2)}%</span></span>
            </div>
          )}
        </div>
      </ProcessRail>
    );
  }, [bins, probabilityText, hoveredGray, pinnedGray, handleHoverGrayChange, handlePinGray]);

  const stepDetails = useMemo(() => {
    return (
      <div className="space-y-4">
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-3">直方图公式</div>
          <FormulaCard
            mathML={HISTOGRAM_FORMULA_MATHML}
            mathClassName="[&_math]:text-lg"
          />
          <div className="mt-3 text-xs leading-6 text-slate-600 space-y-1">
            <p><InlineMath mathML={inlineMath('<msub><mi>s</mi><mi>k</mi></msub>')} />: 第 k 个灰度级（0-255）</p>
            <p><InlineMath mathML={inlineMath('<msub><mi>n</mi><mi>k</mi></msub>')} />: 灰度级 <InlineMath mathML={inlineMath('<msub><mi>s</mi><mi>k</mi></msub>')} /> 的像素个数</p>
            <p><InlineMath mathML={inlineMath('<mi>n</mi>')} />: 图像总像素数（= {totalPixels}）</p>
            <p><InlineMath mathML={inlineMath('<mi>P</mi><mo>(</mo><msub><mi>s</mi><mi>k</mi></msub><mo>)</mo>')} />: 灰度级 <InlineMath mathML={inlineMath('<msub><mi>s</mi><mi>k</mi></msub>')} /> 出现的概率</p>
          </div>
        </TeachingCard>

        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-3">直方图能告诉我们什么？</div>
          <div className="text-xs text-slate-600 space-y-1.5">
            <p><span className="font-medium text-slate-700">整体亮度：</span>分布偏左 → 图像偏暗；分布偏右 → 图像偏亮。</p>
            <p><span className="font-medium text-slate-700">对比度：</span>分布集中 → 对比度低；分布均匀或分散 → 对比度高。</p>
            <p><span className="font-medium text-slate-700">双峰特征：</span>若直方图存在两个明显峰值，说明图像可能包含两类不同的区域（如前景与背景），适合用阈值分割。</p>
            <p className="mt-2 text-slate-500 italic">* 直方图不保留空间结构：两张空间排列完全不同的图像可能具有完全相同的直方图。</p>
          </div>
        </TeachingCard>

        <TeachingCard tone="amber">
          <div className="text-sm font-semibold text-amber-700 mb-2">图像类型：{EXAMPLE_LABELS[exampleType]}</div>
          <div className="text-xs text-slate-600 space-y-1">
            {exampleType === 'dark' && (
              <p>所有像素的灰度值 {'<'} 64，直方图集中在左侧暗区。图像整体很暗，细节难以辨认。</p>
            )}
            {exampleType === 'bright' && (
              <p>所有像素的灰度值 ≥ 192，直方图集中在右侧亮区。图像整体很亮，可能过曝。</p>
            )}
            {exampleType === 'lowContrast' && (
              <p>像素值集中在 80–119 的窄范围内，直方图呈陡峭的峰形。图像对比度低、看起来灰蒙蒙的。</p>
            )}
            {exampleType === 'bimodal' && (
              <p>上半部分偏暗（&lt;64）、下半部分偏亮（≥192），直方图出现两个明显峰值。适合用阈值分割为前景和背景。</p>
            )}
            {exampleType === 'standard' && (
              <p>像素值在 0-255 之间近似均匀分布，直方图覆盖整个灰度范围。</p>
            )}
            {exampleType === 'lena' && (
              <>
                <p>Lena 图是一张真实照片，其直方图覆盖较宽的灰度范围，呈现多个峰值。与标准图的均匀分布不同，真实照片的直方图反映了自然场景中的灰度分布特征。</p>
                {lenaLoading && !lenaImage && (
                  <p className="mt-1 text-amber-600">Lena 图正在加载，当前暂用标准图占位。</p>
                )}
              </>
            )}
          </div>
        </TeachingCard>
      </div>
    );
  }, [exampleType, totalPixels, lenaLoading, lenaImage]);

  // 原图尺寸信息（用于 imageHints）
  const imageInfo = useMemo(() => {
    const h = originalImage.length;
    const w = originalImage[0]?.length || 0;
    return `${w}×${h}`;
  }, [originalImage]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="示例图"
        value={exampleType}
        onChange={handleExampleChange}
        options={[
          { value: 'lena', label: 'Lena 图' },
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
      operationLabel="灰度统计"
      parameterIntro="切换直方图示例后，在直方图中聚焦当前灰度柱，查看该灰度级的像素数量、概率和它在整幅图分布中的位置。"
      originalImage={originalImage}
      resultImage={originalImage}
      parameters={parameters}
      stepDetails={stepDetails}
      analysisPreview={analysisPreview}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: HISTOGRAM_CODE_TS }]} />}
      imageHints={{ input: imageInfo + ' 示例图像', output: '原图副本（直方图统计不改变图像本身）' }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      onDirectionMove={handleDirectionMove}
    />
  );
}
