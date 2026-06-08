'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  FormulaCard,
  SelectParam,
  TeachingCard,
  ProcessRail,
  buildInlineMathML,
} from '@/components';
import { computeHistogram } from '@/lib/algorithms/threshold';
import { generateExampleImage } from '@/lib/algorithms/histogram';
import {
  equalizeHistogram,
  generateCourseExample,
} from '@/lib/algorithms/equalization';
import type { GrayscaleImage } from '@/lib/algorithms/types';

type ExampleType = 'dark' | 'bright' | 'lowContrast' | 'bimodal' | 'standard' | 'courseExample';

const EQUALIZATION_CODE_TS = `// 1. 计算直方图
function computeHistogram(image) {
  const bins = new Array(256).fill(0);
  for (let y = 0; y < image.length; y++)
    for (let x = 0; x < image[0].length; x++)
      bins[Math.round(image[y][x] * 255)]++;
  return bins;
}

// 2. 计算 CDF 与映射表
function computeMapping(bins, totalPixels) {
  const mapping = [];
  let sum = 0;
  for (let k = 0; k < 256; k++) {
    sum += bins[k];
    mapping.push(Math.floor(255 * sum / totalPixels));
  }
  return mapping;
}

// 3. 均衡化：逐像素映射
function equalize(image) {
  const bins = computeHistogram(image);
  const totalPixels = image.length * image[0].length;
  const mapping = computeMapping(bins, totalPixels);
  return image.map(row =>
    row.map(pixel => mapping[Math.round(pixel * 255)] / 255)
  );
}`;

const EQUALIZATION_FORMULA_MATHML = buildInlineMathML(`
  <mrow>
    <msub><mi>S</mi><mi>k</mi></msub>
    <mo>=</mo>
    <mrow>
      <mo>⌊</mo>
      <mn>255</mn>
      <mo>⋅</mo>
      <munderover>
        <mo>∑</mo>
        <mrow><mi>i</mi><mo>=</mo><mn>0</mn></mrow>
        <mi>k</mi>
      </munderover>
      <mfrac><msub><mi>n</mi><mi>i</mi></msub><mi>n</mi></mfrac>
      <mo>⌋</mo>
    </mrow>
  </mrow>
`);

/** 简版直方图 SVG（仅展示，含高亮功能） */
function HistogramBarChart({
  bins,
  maxCount,
  highlightedGray,
  pinnedGray = null,
  highlightColor = '#ef4444',
  onHoverGrayChange,
  onPinGray,
}: {
  bins: number[];
  maxCount: number;
  highlightedGray: number | null;
  pinnedGray?: number | null;
  highlightColor?: string;
  onHoverGrayChange?: (gray: number | null) => void;
  onPinGray?: (gray: number) => void;
}) {
  const svgWidth = 300;
  const svgHeight = 120;
  const plotLeft = 4;
  const plotWidth = svgWidth - plotLeft * 2;
  const barWidth = plotWidth / 256;
  const activeGray = highlightedGray ?? pinnedGray;
  const isInteractive = Boolean(onHoverGrayChange || onPinGray);

  const readGrayFromMouse = (event: React.MouseEvent<SVGSVGElement>): number | null => {
    if (!isInteractive) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * svgWidth;
    const gray = Math.floor(((svgX - plotLeft) / plotWidth) * 256);
    return Math.max(0, Math.min(255, gray));
  };

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="font-mono"
      onMouseMove={onHoverGrayChange ? (event) => {
        const g = readGrayFromMouse(event);
        if (g !== null) onHoverGrayChange(g);
      } : undefined}
      onMouseLeave={onHoverGrayChange ? () => onHoverGrayChange(null) : undefined}
      onClick={onPinGray ? (event) => {
        const g = readGrayFromMouse(event);
        if (g !== null) onPinGray(g);
      } : undefined}
      style={isInteractive ? { cursor: 'crosshair' } : undefined}
    >
      <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#f8fafc" rx={4} />

      {bins.map((count, gray) => {
        const barH = maxCount > 0 ? (count / maxCount) * (svgHeight - 10) : 0;
        const hl = activeGray === gray;
        return (
          <rect
            key={gray}
            x={plotLeft + gray * barWidth}
            y={svgHeight - 6 - barH}
            width={Math.max(1, barWidth - 0.3)}
            height={barH}
            fill={hl ? highlightColor : '#3b82f6'}
            fillOpacity={hl ? 1 : count > 0 ? 0.55 : 0.08}
          />
        );
      })}

      {activeGray !== null && (
        <line
          x1={plotLeft + activeGray * barWidth + barWidth / 2}
          y1={svgHeight - 6}
          x2={plotLeft + activeGray * barWidth + barWidth / 2}
          y2={4}
          stroke={highlightColor}
          strokeWidth={highlightedGray !== null ? 1 : 2}
          strokeDasharray={highlightedGray !== null ? '3 2' : undefined}
        />
      )}

      {[0, 64, 128, 192, 255].map((v) => (
        <g key={v}>
          <line
            x1={plotLeft + v * barWidth}
            y1={svgHeight - 6}
            x2={plotLeft + v * barWidth}
            y2={svgHeight - 2}
            stroke="#94a3b8"
            strokeWidth={0.5}
          />
          <text
            x={plotLeft + v * barWidth}
            y={svgHeight}
            textAnchor="middle"
            fontSize={6}
            fill="#64748b"
          >
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function HistogramEqualizationPage() {
  const [exampleType, setExampleType] = useState<ExampleType>('standard');
  const [hoveredGray, setHoveredGray] = useState<number | null>(null);
  const [pinnedGray, setPinnedGray] = useState<number | null>(null);

  // 原图（根据类型生成）
  const originalImage: GrayscaleImage = useMemo(() => {
    if (exampleType === 'courseExample') return generateCourseExample();
    return generateExampleImage(exampleType as Exclude<ExampleType, 'courseExample'>);
  }, [exampleType]);

  // 原始直方图
  const originalHistogram = useMemo(() => computeHistogram(originalImage), [originalImage]);
  const { bins: originalBins, totalPixels } = originalHistogram;
  const originalMaxCount = useMemo(() => Math.max(...originalBins, 1), [originalBins]);

  // 均衡化结果
  const eqResult = useMemo(() => equalizeHistogram(originalImage), [originalImage]);
  const { result: eqImage, mapping, cdf } = eqResult;
  const eqMaxCount = useMemo(() => Math.max(...eqResult.equalizedBins, 1), [eqResult]);

  // 悬停用于快速预览，点击后锁定；方向键只移动锁定位置。
  const activeGray = hoveredGray ?? pinnedGray;

  // 当前高亮的映射值
  const mappedGray = useMemo(() => {
    if (activeGray === null) return null;
    return mapping[activeGray];
  }, [activeGray, mapping]);

  // 公式代入（课程示例专用）
  const currentFormulaML = useMemo(() => {
    if (activeGray === null) return null;
    const cdfVal = cdf[activeGray];
    const mapped = mapping[activeGray];
    return buildInlineMathML(`
      <mrow>
        <msub><mi>S</mi><mn>${activeGray}</mn></msub>
        <mo>=</mo>
        <mrow>
          <mo>⌊</mo>
          <mn>255</mn>
          <mo>⋅</mo>
          <mfrac>
            <mn>${Math.round(cdfVal * totalPixels)}</mn>
            <mn>${totalPixels}</mn>
          </mfrac>
          <mo>⌋</mo>
          <mo>=</mo>
          <mo>⌊</mo>
          <mn>${(255 * cdfVal).toFixed(1)}</mn>
          <mo>⌋</mo>
          <mo>=</mo>
          <mn>${mapped}</mn>
        </mrow>
      </mrow>
    `);
  }, [activeGray, cdf, mapping, totalPixels]);

  // —— 事件处理 ——

  const handleExampleChange = useCallback((value: string) => {
    setExampleType(value as ExampleType);
    setHoveredGray(null);
    setPinnedGray(null);
  }, []);

  const handleDirectionMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (direction !== 'left' && direction !== 'right') return;
      setPinnedGray((prev) => {
        const base = hoveredGray ?? prev ?? 128;
        return direction === 'left'
          ? Math.max(0, base - 1)
          : Math.min(255, base + 1);
      });
      setHoveredGray(null);
    },
    [hoveredGray],
  );

  const handleHoverGrayChange = useCallback((gray: number | null) => {
    setHoveredGray(gray);
  }, []);

  const handlePinGray = useCallback((gray: number) => {
    setPinnedGray(gray);
    setHoveredGray(null);
  }, []);

  // —— 分析预览：原图 vs 均衡化直方图 ——

  const analysisPreview = useMemo(() => {
    const originalNonZero = originalBins.some((b) => b > 0);
    const eqNonZero = eqResult.equalizedBins.some((b) => b > 0);

    return (
      <ProcessRail className="overflow-x-auto py-2">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-semibold tracking-wide text-slate-500">
              直方图对比
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-500">
              悬停预览，点击锁定；左右方向键移动锁定位置
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  原图直方图
                </span>
                {activeGray !== null && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                    k={activeGray} (n<sub>k</sub>={originalBins[activeGray]})
                  </span>
                )}
              </div>
              {originalNonZero && (
                <HistogramBarChart
                  bins={originalBins}
                  maxCount={originalMaxCount}
                  highlightedGray={hoveredGray}
                  pinnedGray={pinnedGray}
                  onHoverGrayChange={handleHoverGrayChange}
                  onPinGray={handlePinGray}
                />
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  均衡后直方图
                </span>
                {mappedGray !== null && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                    S<sub>{activeGray}</sub>={mappedGray}
                  </span>
                )}
              </div>
              {eqNonZero && (
                <HistogramBarChart
                  bins={eqResult.equalizedBins}
                  maxCount={eqMaxCount}
                  highlightedGray={null}
                  pinnedGray={mappedGray}
                  highlightColor="#10b981"
                />
              )}
            </div>
          </div>

          {activeGray !== null && mappedGray !== null && (
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
              灰度级 <span className="font-bold text-red-500">{activeGray}</span>
              &nbsp;→&nbsp;
              映射为 <span className="font-bold text-emerald-600">{mappedGray}</span>
              &nbsp;（CDF: {(cdf[activeGray] * 100).toFixed(1)}%）
            </div>
          )}
        </div>
      </ProcessRail>
    );
  }, [
    originalBins,
    originalMaxCount,
    eqResult,
    eqMaxCount,
    activeGray,
    hoveredGray,
    pinnedGray,
    mappedGray,
    cdf,
    handleHoverGrayChange,
    handlePinGray,
  ]);

  // —— stepDetails ——

  const stepDetails = useMemo(() => {
    return (
      <div className="space-y-4">
        {/* 公式卡片 */}
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-3">直方图均衡化公式</div>
          <FormulaCard
            mathML={EQUALIZATION_FORMULA_MATHML}
            mathClassName="[&_math]:text-lg"
          />
          <div className="mt-3 text-xs leading-6 text-slate-600 space-y-1">
            <p><code className="bg-slate-100 px-1 rounded">S_k</code>: 均衡化后灰度级 k 的映射值</p>
            <p><code className="bg-slate-100 px-1 rounded">n_i</code>: 原图中灰度级 i 的像素个数</p>
            <p><code className="bg-slate-100 px-1 rounded">n</code>: 图像总像素数（= {totalPixels}）</p>
            <p><code className="bg-slate-100 px-1 rounded">∑ n_i / n</code>: 累积分布函数（CDF）</p>
            <p className="mt-1 text-slate-500 italic">
              * 映射函数是单调递增的，保证输出图像保持灰度级的相对顺序。
            </p>
          </div>
        </TeachingCard>

        {/* 当前灰度映射（有选择时显示） */}
        {activeGray !== null && currentFormulaML && (
          <TeachingCard tone="amber">
            <div className="text-sm font-semibold text-amber-700 mb-3">
              灰度级 {activeGray} 的映射过程
            </div>
            <FormulaCard
              mathML={currentFormulaML}
              mathClassName="[&_math]:text-lg"
            />
            <div className="mt-3 text-xs leading-6 text-slate-600 space-y-1">
              <p>
                原图灰度级 <span className="font-bold text-slate-800">k = {activeGray}</span>
                &nbsp;共有 <span className="font-bold text-slate-800">{originalBins[activeGray]}</span> 个像素
                （占总像素的 <span className="font-bold">{(originalBins[activeGray] / totalPixels * 100).toFixed(1)}%</span>）
              </p>
              <p>
                CDF 累积值：<span className="font-bold">{(cdf[activeGray] * 100).toFixed(1)}%</span>
                &nbsp;→ 映射到灰度 <span className="font-bold text-emerald-600">{mapping[activeGray]}</span>
              </p>
            </div>
          </TeachingCard>
        )}

        {/* CDF 说明 */}
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-3">
            累积分布函数（Cumulative Distribution Function）
          </div>
          <div className="text-xs leading-6 text-slate-600 space-y-1">
            <p>
              CDF 从灰度 0 开始累加每个灰度级的像素占比：
            </p>
            <p className="mt-1 bg-slate-50 rounded-lg px-3 py-2 font-mono text-slate-700">
              CDF[k] = (n₀ + n₁ + ... + n_k) / n
            </p>
            <p className="mt-2">
              均衡化将 CDF 值线性放大到 0-255 范围，使输出图像的直方图尽可能平坦，
              从而增强图像的全局对比度。
            </p>
          </div>
        </TeachingCard>

        {/* 课程示例映射表 */}
        {exampleType === 'courseExample' && (
          <TeachingCard tone="amber">
            <div className="text-sm font-semibold text-amber-700 mb-3">
              课程示例 3×3 图像均衡化映射表
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-amber-200">
                    <th className="py-2 pr-3 text-left font-semibold text-amber-800">原灰度 s_k</th>
                    <th className="py-2 px-3 text-left font-semibold text-amber-800">出现次数 n_k</th>
                    <th className="py-2 px-3 text-left font-semibold text-amber-800">概率 P(s_k)</th>
                    <th className="py-2 px-3 text-left font-semibold text-amber-800">CDF 累积</th>
                    <th className="py-2 pl-3 text-left font-semibold text-amber-800">映射值 S_k</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { s: 50, n: 3, prob: '3/9', cdf: '3/9 ≈ 0.333', Sk: 85 },
                    { s: 100, n: 4, prob: '4/9', cdf: '7/9 ≈ 0.778', Sk: 198 },
                    { s: 200, n: 2, prob: '2/9', cdf: '9/9 = 1.000', Sk: 255 },
                  ].map((row) => (
                    <tr
                      key={row.s}
                      className={`border-b border-amber-100 transition-colors ${
                        activeGray === row.s ? 'bg-amber-100 font-medium' : 'hover:bg-amber-50'
                      }`}
                    >
                      <td className="py-2 pr-3 text-amber-900">{row.s}</td>
                      <td className="py-2 px-3 text-amber-900">{row.n}</td>
                      <td className="py-2 px-3 text-amber-700">{row.prob}</td>
                      <td className="py-2 px-3 text-amber-700">{row.cdf}</td>
                      <td className="py-2 pl-3 font-bold text-emerald-700">{row.Sk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs leading-5 text-amber-800/80 space-y-1">
              <p>
                S₅₀ = ⌊255 × 3/9⌋ = ⌊85⌋ = <strong>85</strong>
              </p>
              <p>
                S₁₀₀ = ⌊255 × 7/9⌋ = ⌊198.3⌋ = <strong>198</strong>
              </p>
              <p>
                S₂₀₀ = ⌊255 × 9/9⌋ = ⌊255⌋ = <strong>255</strong>
              </p>
            </div>
          </TeachingCard>
        )}

        {/* 效果说明 */}
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-3">均衡化的效果</div>
          <div className="text-xs text-slate-600 space-y-1.5">
            <p>
              <span className="font-medium text-slate-700">增强对比度：</span>
              原直方图集中的区域被“拉伸”到更宽的灰度范围。
            </p>
            <p>
              <span className="font-medium text-slate-700">直方图趋平：</span>
              均衡化后的直方图尽可能接近均匀分布，但受限于离散灰度级和像素数量，
              实际输出不会完全平坦。
            </p>
            <p>
              <span className="font-medium text-slate-700">全局操作：</span>
              均衡化使用整张图像的全局直方图，不依赖局部邻域信息。
              这意味着相同灰度级的所有像素会被映射到同一输出值。
            </p>
            <p className="mt-2">
              调整参数面板中的“示例图”类型，观察不同图像均衡化前后的直方图变化。
            </p>
          </div>
        </TeachingCard>
      </div>
    );
  }, [exampleType, activeGray, currentFormulaML, originalBins, cdf, mapping, totalPixels]);

  // —— 图像提示 ——

  const imageHints = useMemo(() => {
    const h = originalImage.length;
    const w = originalImage[0]?.length || 0;
    const sizeStr = `${w}×${h}`;
    return {
      input: `${sizeStr} 原图`,
      output: `${sizeStr} 均衡化`,
    };
  }, [originalImage]);

  const shouldShowGrid = useMemo(() => {
    const h = originalImage.length;
    const w = originalImage[0]?.length || 0;
    return w <= 16 && h <= 16;
  }, [originalImage]);

  // —— 参数面板 ——

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="示例图"
        value={exampleType}
        onChange={handleExampleChange}
        options={[
          { value: 'courseExample', label: '课程示例 3×3' },
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
      title="直方图均衡化"
      subtitle="Histogram Equalization — 基于 CDF 的灰度级重新分布"
      operationLabel="均衡化"
      parameterIntro="左侧切换不同示例图，观察直方图均衡化的效果对比。悬停或点击原图直方图，查看具体灰度映射关系。"
      originalImage={originalImage}
      resultImage={eqImage}
      parameters={parameters}
      stepDetails={stepDetails}
      analysisPreview={analysisPreview}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: EQUALIZATION_CODE_TS }]} />}
      imageHints={imageHints}
      showOriginalGrid={shouldShowGrid}
      singlePageScroll
      onDirectionMove={handleDirectionMove}
    />
  );
}
