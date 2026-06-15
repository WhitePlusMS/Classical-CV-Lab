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
  ImageCanvas,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  TeachingTerm,
  buildInlineMathML,
} from '@/components';
import {
  computeSiftSurf,
  computeSiftSurfMatching,
  type NeighborComparisonsData,
  type SiftKeypoint,
} from '@/lib/algorithms/siftSurf';
import {
  createCircleImage,
  createRectangleImage,
  createReferenceImage,
} from '@/lib/utils/sampleImages';
import { moveGridPoint } from '@/hooks/useGridNavigation';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';

// ==================== 类型与步骤常量 ====================

type TeachingStepKey = 'overview' | 'scale-space' | 'dog-detection' | 'orientation' | 'descriptor' | 'matching';
type TabKey = 'sift' | 'surf' | 'compare';
type ScaleFeatureImageType = 'rectangle' | 'circle' | 'lenaOriginal';
type RefImageMode = 'auto' | 'rectangle' | 'circle' | 'lenaRotated';

interface StageItem {
  key: TeachingStepKey;
  label: string;
  summary: string;
}

const TASK_STAGES: StageItem[] = [
  { key: 'overview', label: '概览', summary: 'SIFT 四步流程' },
  { key: 'scale-space', label: '尺度空间', summary: '不同σ看结构' },
  { key: 'dog-detection', label: 'DoG检测', summary: '26邻域极值' },
  { key: 'orientation', label: '方向分配', summary: '梯度投票→主方向' },
  { key: 'descriptor', label: '描述子', summary: '128维特征向量' },
  { key: 'matching', label: '特征匹配', summary: '跨图比值检验' },
];

const IMAGE_OPTIONS: { value: ScaleFeatureImageType; label: string }[] = [
  { value: 'rectangle', label: '矩形' },
  { value: 'circle', label: '圆形' },
  { value: 'lenaOriginal', label: 'Lena 灰度图' },
];

const REF_IMAGE_OPTIONS: { value: RefImageMode; label: string }[] = [
  { value: 'auto', label: '自动匹配' },
  { value: 'rectangle', label: '矩形参考图' },
  { value: 'circle', label: '圆形参考图' },
  { value: 'lenaRotated', label: '旋转缩放(Lena)' },
];

// ==================== 公式常量 ====================
const GAUSSIAN_SCALE_FORMULA = buildInlineMathML(
  '<mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>*</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>'
);
const GAUSSIAN_FUNC = buildInlineMathML(
  '<mrow><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac><msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac></mrow></msup></mrow>'
);
const DOG_FORMULA = buildInlineMathML(
  '<mrow><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>k</mi><mi>σ</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mrow>'
);
const GRADIENT_MAG_FORMULA = buildInlineMathML(
  '<mrow><mi>m</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><msqrt><msup><mrow><mo>(</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>-</mo><mn>1</mn><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow>'
);
const GRADIENT_ORIENT_FORMULA = buildInlineMathML(
  '<mrow><mi>θ</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><msup><mi>tan</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mo>(</mo><mfrac><mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>-</mo><mn>1</mn><mo>)</mo></mrow><mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo></mrow></mfrac><mo>)</mo></mrow>'
);
const ROTATION_FORMULA = buildInlineMathML(
  '<mrow><mrow><mo>[</mo><mtable><mtr><mtd><msup><mi>x</mi><mo>′</mo></msup></mtd></mtr><mtr><mtd><msup><mi>y</mi><mo>′</mo></msup></mtd></mtr></mtable><mo>]</mo></mrow><mo>=</mo><mrow><mo>[</mo><mtable><mtr><mtd><mi>cos</mi><mi>θ</mi></mtd><mtd><mo>-</mo><mi>sin</mi><mi>θ</mi></mtd></mtr><mtr><mtd><mi>sin</mi><mi>θ</mi></mtd><mtd><mi>cos</mi><mi>θ</mi></mtd></mtr></mtable><mo>]</mo></mrow><mrow><mo>[</mo><mtable><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable><mo>]</mo></mrow></mrow>'
);
const DESCRIPTOR_NORM = buildInlineMathML(
  '<mrow><msub><mi>l</mi><mi>j</mi></msub><mo>=</mo><mfrac><msub><mi>w</mi><mi>j</mi></msub><mrow><msqrt><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mn>128</mn></munderover><msub><mi>w</mi><mi>i</mi></msub></msqrt></mrow></mfrac><mo>,</mo><mi>j</mi><mo>=</mo><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mo>⋯</mo><mo>,</mo><mn>128</mn></mrow>'
);
const SURF_HESSIAN = buildInlineMathML(
  '<mrow><mi>H</mi><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mrow><mo>[</mo><mtable><mtr><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd></mtr><mtr><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd><mtd><msub><mi>L</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd></mtr></mtable><mo>]</mo></mrow></mrow>'
);
const SURF_DET_HESSIAN = buildInlineMathML(
  '<mrow><mi>det</mi><mo>(</mo><msub><mi>H</mi><mrow><mi>approx</mi></mrow></msub><mo>)</mo><mo>=</mo><msub><mi>D</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><msub><mi>D</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>-</mo><mo>(</mo><mi>w</mi><msub><mi>D</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><msup><mo>)</mo><mn>2</mn></msup></mrow>'
);
const INTEGRAL_IMAGE = buildInlineMathML(
  '<mrow><mi>II</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><munderover><mo>∑</mo><mrow><msup><mi>x</mi><mo>′</mo></msup><mo>≤</mo><mi>x</mi></mrow><mrow></mrow></munderover><munderover><mo>∑</mo><mrow><msup><mi>y</mi><mo>′</mo></msup><mo>≤</mo><mi>y</mi></mrow><mrow></mrow></munderover><mi>I</mi><mo>(</mo><msup><mi>x</mi><mo>′</mo></msup><mo>,</mo><msup><mi>y</mi><mo>′</mo></msup><mo>)</mo></mrow>'
);
const EUCLIDEAN_DIST = buildInlineMathML(
  '<mrow><mi>D</mi><mo>(</mo><msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><msub><mi>X</mi><mi>j</mi></msub><mo>)</mo><mo>=</mo><msqrt><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>n</mi></munderover><msup><mrow><mo>(</mo><msub><mi>X</mi><mrow><mi>i</mi><mi>k</mi></mrow></msub><mo>-</mo><msub><mi>X</mi><mrow><mi>j</mi><mi>k</mi></mrow></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow>'
);
const DOG_EXTREMUM_FORMULA = buildInlineMathML(
  '<mrow>' +
  '<mtable>' +
  '<mtr><mtd><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mtext> 为局部极值 </mtext><mo>⟺</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>同层 8 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo><mo>,</mo><mtext> </mtext><mo>(</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>)</mo><mo>≠</mo><mo>(</mo><mn>0</mn><mo>,</mo><mn>0</mn><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>上层 9 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>k</mi><mi>σ</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>下层 9 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>σ</mi><mo>/</mo><mi>k</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>（或全部 </mtext><mo>&lt;</mo><mtext>，为局部极小值）</mtext></mtd></mtr>' +
  '</mtable>' +
  '</mrow>'
);
const SCALE_CHAIN_FORMULA = buildInlineMathML(
  '<mrow>' +
  '<mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo>' +
  '<mo>=</mo>' +
  '<mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo>' +
  '<mo>*</mo>' +
  '<mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>' +
  '<mo>=</mo>' +
  '<mrow><mo>[</mo>' +
  '<mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac>' +
  '<msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac></mrow></msup>' +
  '<mo>]</mo></mrow>' +
  '<mo>*</mo>' +
  '<mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>' +
  '</mrow>'
);
const HAAR_WAVELET_RESPONSE = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mi>x</mi></msub><mo>=</mo><munder><mo>∑</mo><mrow></mrow></munder><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>·</mo><msub><mi>W</mi><mi>x</mi></msub><mo>,</mo><mtext> </mtext><msub><mi>d</mi><mi>y</mi></msub><mo>=</mo><munder><mo>∑</mo><mrow></mrow></munder><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>·</mo><msub><mi>W</mi><mi>y</mi></msub></mrow>'
);
const SIFT_SURF_SCALE_COMPARE = buildInlineMathML(
  '<mrow><mtable><mtr><mtd><mtext>SIFT</mtext></mtd><mtd><mo>:</mo></mtd><mtd><mtext>改变图像大小，固定高斯核</mtext></mtd></mtr><mtr><mtd><mtext>SURF</mtext></mtd><mtd><mo>:</mo></mtd><mtd><mtext>固定图像大小，改变滤波器</mtext></mtd></mtr></mtable></mrow>'
);

// ==================== 辅助组件 ====================

/** 8 柱方向直方图 */
function OrientationHistogramGraph({ hist, highlightBin }: { hist: number[]; highlightBin?: number }) {
  const max = Math.max(...hist, 0.01);
  return (
    <div className="grid grid-cols-8 gap-1">
      {hist.map((v, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="flex h-20 w-full items-end justify-center">
            <div
              className={'w-full rounded-t ' + (highlightBin === i ? 'bg-amber-500' : 'bg-amber-400')}
              style={{ height: Math.max((v / max) * 100, 5) + '%' }}
            />
          </div>
          <span className="mt-1 text-[9px] text-slate-500">{i * 45}°</span>
        </div>
      ))}
    </div>
  );
}

/** 4x4 子区域网格（描述子可视化） */
function DescriptorGrid({ grid, label }: { grid: number[][]; label: string }) {
  if (grid.length === 0) return null;
  const allVals = grid.flat();
  const maxVal = Math.max(...allVals, 0.01);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
      <div className="grid grid-cols-4 gap-1">
        {grid.map((sub, i) => (
          <div key={i} className="rounded border border-slate-200 bg-white p-1">
            <div className="text-[8px] text-slate-400">R{i}</div>
            <div className="mt-0.5 grid grid-cols-1 gap-0.5">
              {sub.map((v, j) => (
                <div key={j} className="flex items-center gap-0.5">
                  <div
                    className="h-1.5 flex-1 rounded"
                    style={{
                      backgroundColor: 'rgba(251, 146, 60, ' + Math.max(v / maxVal, 0.05) + ')',
                    }}
                  />
                  <span className="w-5 text-right text-[7px] font-mono text-slate-500">
                    {v.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** DoG 26 邻域跨尺度比较 — 三张 3×3 数值表 */
function DoGNeighborTables({ data }: { data: NeighborComparisonsData }) {
  const renderTable = (
    patch: number[][],
    label: string,
    comparisons: Array<{ relation: 'greater' | 'less' | 'equal' }>,
    highlightCenter: boolean,
  ) => {
    const greaterCount = comparisons.filter(c => c.relation === 'greater').length;
    const maxAbs = Math.max(...patch.flat().map(Math.abs), 0.001);
    return (
      <div className="flex flex-col items-center">
        <div className="mb-1 text-[10px] font-semibold text-slate-500">{label}</div>
        <div className="grid grid-cols-3 gap-0.5">
          {patch.map((row, ri) =>
            row.map((val, ci) => {
              const isCenter = ri === 1 && ci === 1;
              // 颜色热力图：正→绿，负→红，中心格加粗边框
              const intensity = Math.min(Math.abs(val) / maxAbs, 1);
              const bg = val > 0
                ? `rgba(16,185,129,${0.08 + intensity * 0.55})`
                : val < 0
                  ? `rgba(239,68,68,${0.08 + intensity * 0.55})`
                  : 'white';
              const border = highlightCenter && isCenter
                ? '2px solid rgb(239,68,68)'
                : '1px solid rgb(226,232,240)';
              return (
                <div
                  key={`${ri}-${ci}`}
                  className="flex h-7 w-14 items-center justify-center text-[10px] font-mono font-semibold"
                  style={{ backgroundColor: bg, border, borderRadius: highlightCenter && isCenter ? '3px' : '0' }}
                >
                  {val > 0 ? '+' : ''}{val.toFixed(2)}
                </div>
              );
            })
          )}
        </div>
        <div className="mt-1 text-[10px] text-slate-500">
          {greaterCount}/{comparisons.length} 当前值更大
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-3">
        {renderTable(data.prevDogPatch, '上层 DoG (kσ)', data.prevComparisons, false)}
        {renderTable(data.currentDogPatch, '当前层 DoG (σ)', data.sameComparisons, true)}
        {renderTable(data.nextDogPatch, '下层 DoG (σ/k)', data.nextComparisons, false)}
      </div>
      <div
        className={
          'rounded-xl border px-4 py-2 text-center text-xs font-semibold ' +
          (data.isExtremum
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700')
        }
      >
        {data.isExtremum
          ? `✓ 局部${data.extremumType === 'max' ? '极大' : '极小'}值 — 全部 26 邻域比较通过，当前点为候选关键点`
          : '✗ 非极值 — 未通过 26 邻域比较，当前点被排除'}
      </div>
    </div>
  );
}

/** 垂直步骤导航 */
function StageStepper({
  activeStage,
  onStageChange,
  stageIndex,
}: {
  activeStage: TeachingStepKey;
  onStageChange: (stage: TeachingStepKey) => void;
  stageIndex: number;
}) {
  return (
    <div className="space-y-1.5">
      {TASK_STAGES.map((stage, index) => {
        const active = stage.key === activeStage;
        const completed = index < stageIndex;
        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onStageChange(stage.key)}
            className={
              'w-full rounded-xl border px-3 py-2 text-left transition ' +
              (active
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : completed
                  ? 'border-slate-200 bg-white text-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500')
            }
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ' +
                  (active
                    ? 'bg-amber-600 text-white'
                    : completed
                      ? 'bg-slate-700 text-white'
                      : 'border border-slate-300 bg-white text-slate-500')
                }
              >
                {completed ? '✓' : index + 1}
              </span>
              <span className="text-sm font-semibold">{stage.label}</span>
            </div>
            <div className="mt-1 pl-8 text-xs leading-5">{stage.summary}</div>
          </button>
        );
      })}
    </div>
  );
}

/** SIFT / SURF / 对比 标签切换器 */
function TabSwitcher({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'sift', label: 'SIFT 视角' },
    { key: 'surf', label: 'SURF 视角' },
    { key: 'compare', label: '对比表' },
  ];

  return (
    <div className="flex items-center">
      <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
              (activeTab === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700')
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'sift' && (
        <span className="ml-3 text-[11px] text-amber-600">
          &#x1F4A1; SURF 用积分图加速 &rarr; 点击 SURF 标签查看
        </span>
      )}
    </div>
  );
}

/** SIFT vs SURF 全流程对比表 */
function SiftSurfCompareTable() {
  const rows = [
    { feature: '尺度空间', sift: '改变图像大小，不同σ高斯核', surf: '固定图像大小，不同尺度 box filter' },
    { feature: '特征点检测', sift: 'DoG 非极大抑制 + 25 邻域', surf: 'Hessian 行列式 + 非极大抑制' },
    { feature: '方向', sift: '正方形区域梯度直方图（36柱）', surf: '圆形区域 Haar 小波，扇形滑动' },
    { feature: '描述子邻域', sift: '16x16', surf: '20s x 20s' },
    { feature: '描述子维数', sift: '128', surf: '64' },
    { feature: '描述方法', sift: '8方向梯度直方图', surf: '&Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy|' },
    { feature: '不变性', sift: '尺度+旋转+光照', surf: '尺度+旋转+光照' },
    { feature: '速度', sift: '较慢', surf: '较快（积分图加速）' },
  ];

  return (
    <TeachingCard>
      <div className="text-sm font-semibold text-slate-800">SIFT vs SURF 全流程对比</div>
      <div className="mt-3 w-full overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">特性</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">SIFT</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">SURF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="px-3 py-1.5 font-medium text-slate-600">{row.feature}</td>
                <td className="px-3 py-1.5 text-slate-700" dangerouslySetInnerHTML={{ __html: row.sift }} />
                <td className="px-3 py-1.5 text-slate-700" dangerouslySetInnerHTML={{ __html: row.surf }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TeachingCard>
  );
}

// ==================== 代码 ====================

const SIFT_SURF_CODE = '// 简化 SIFT 关键点检测\n' +
  'function detectSIFTKeypoints(image, sigma) {\n' +
  '  // 1. 构建高斯尺度空间\n' +
  '  const gaussianScales = buildGaussianPyramid(image, sigma);\n' +
  '  // 2. 构建 DoG 尺度空间\n' +
  '  const dogScales = [];\n' +
  '  for (let i = 0; i < gaussianScales.length - 1; i++) {\n' +
  '    dogScales.push(subtract(gaussianScales[i + 1], gaussianScales[i]));\n' +
  '  }\n' +
  '  // 3. 极值检测（26 邻域）\n' +
  '  const keypoints = [];\n' +
  '  for (const dog of dogScales) {\n' +
  '    for (let y = 1; y < h - 1; y++) {\n' +
  '      for (let x = 1; x < w - 1; x++) {\n' +
  '        if (isLocalExtremum(dog, x, y)) {\n' +
  '          keypoints.push({ x, y, scale: currentScale });\n' +
  '        }\n' +
  '      }\n' +
  '    }\n' +
  '  }\n' +
  '  // 4. 方向分配\n' +
  '  for (const kp of keypoints) {\n' +
  '    const hist = computeOrientationHistogram(image, kp);\n' +
  '    kp.orientation = findPeak(hist);\n' +
  '  }\n' +
  '  // 5. 描述子生成（4x4x8 = 128 维）\n' +
  '  for (const kp of keypoints) {\n' +
  '    kp.descriptor = computeSIFTDescriptor(image, kp);\n' +
  '  }\n' +
  '  return keypoints;\n' +
  '}';

// ==================== 辅助函数 ====================

/** 在图像上画关键点标记 */
function renderKeypointOverlay(
  image: number[][], keypoints: SiftKeypoint[], selectedIdx: number
): number[][] {
  const h = image.length;
  const w = image[0]?.length ?? 0;
  const overlay = image.map(row => [...row]);

  for (let i = 0; i < keypoints.length; i++) {
    const kp = keypoints[i];
    const isSelected = i === selectedIdx;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = kp.x + dx;
        const py = kp.y + dy;
        if (px >= 0 && px < w && py >= 0 && py < h) {
          overlay[py][px] = isSelected ? 1.0 : 0.7;
        }
      }
    }
  }

  return overlay;
}

function findNearestKeypointIndex(
  point: { x: number; y: number },
  keypoints: SiftKeypoint[]
): number {
  if (keypoints.length === 0) return 0;

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < keypoints.length; i++) {
    const kp = keypoints[i];
    const dx = kp.x - point.x;
    const dy = kp.y - point.y;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

function getRefSourceType(
  refImageMode: RefImageMode,
  imageType: ScaleFeatureImageType
): 'rectangle' | 'circle' | 'lenaOriginal' {
  if (refImageMode === 'auto') return imageType;
  if (refImageMode === 'lenaRotated') return 'lenaOriginal';
  return refImageMode;
}

function stepTermHints(step: TeachingStepKey): Array<{ term: string; explanation: string }> {
  switch (step) {
    case 'scale-space':
      return [{ term: '尺度空间', explanation: '尺度空间就是同一张图在不同模糊尺度下的表示，用来观察不同大小结构。' }];
    case 'dog-detection':
      return [
        { term: 'DoG', explanation: 'DoG 是相邻两层高斯模糊图相减后的响应图，用来突出局部结构变化。' },
        { term: '26 邻域', explanation: '26 邻域表示同一点在上、中、下三层周围一共 26 个邻居，要同时比较它们。' },
      ];
    case 'orientation':
      return [{ term: '主方向', explanation: '主方向是当前关键点邻域中梯度投票最多的方向，用来消除旋转影响。' }];
    default:
      return [];
  }
}

function getStepEvidenceText(
  step: TeachingStepKey,
  kp: SiftKeypoint | null,
  neighborData: NeighborComparisonsData | null,
): string {
  if (!kp && step !== 'overview') return '当前没有可用关键点，请先切换图像或调整参数。';

  switch (step) {
    case 'scale-space':
      return `关键点 (${kp!.x}, ${kp!.y}) 在 σ=${kp!.scale.toFixed(2)} 处被检出。不同 σ 下的高斯响应揭示该局部结构的尺度稳定性：若同一结构跨 3 层以上仍保持相似的 DoG 响应轮廓，则被判定为稳定候选点。`;
    case 'dog-detection': {
      if (neighborData) {
        const upG = neighborData.prevComparisons.filter(c => c.relation === 'greater').length;
        const sameG = neighborData.sameComparisons.filter(c => c.relation === 'greater').length;
        const dnG = neighborData.nextComparisons.filter(c => c.relation === 'greater').length;
        const total = neighborData.prevComparisons.length + neighborData.sameComparisons.length + neighborData.nextComparisons.length;
        const allG = upG + sameG + dnG;
        const allType = allG === total ? '极大值（全部大于）' : allG === 0 ? '极小值（全部小于）' : '非极值';
        return `26 邻域比较：DoG 值 ${neighborData.currentValue.toFixed(4)} vs 上层 ${upG}/9 邻居 + 同层 ${sameG}/8 邻居 + 下层 ${dnG}/9 邻居 → ${allType}`;
      }
      return `DoG 极值检测通过 26 邻域跨尺度比较：同一点在上/中/下三层 DoG 中必须同时大于（或同时小于）全部 26 个邻居。`;
    }
    case 'orientation':
      return `以关键点 (${kp!.x}, ${kp!.y}) 为中心计算 17×17 邻域梯度，按 8 方向加权投票。主方向 ${(kp!.orientation * 180 / Math.PI).toFixed(0)}° 是梯度投票最多的方向。`;
    case 'descriptor':
      return `16×16 邻域划分为 4×4=16 个子区域，每个子区域统计 8 方向梯度累加 → 128 维向量。L2 归一化消除光照影响，坐标旋转到主方向消除旋转影响。`;
    case 'matching':
      return `对查询图中的每个关键点描述子，在参考图中找欧氏距离最近和次近的两个候选。若最近/次近 < 0.8 则为可靠匹配，否则该匹配被舍弃。`;
    default:
      return '从概览进入任一步骤，检查关键点如何一路从候选点变成可匹配特征。每一步的证据都基于具体数值和判定结果。';
  }
}

function getStepResultText(
  step: TeachingStepKey,
  currentKeypoint: SiftKeypoint | null,
  matchCount: number,
  neighborData: NeighborComparisonsData | null,
  matches: Array<{ distance: number }>,
): string {
  if (!currentKeypoint) {
    return '当前没有可用关键点，请先切换图像或调整参数。';
  }

  switch (step) {
    case 'scale-space':
      return `当前锁定的关键点位于 (${currentKeypoint.x}, ${currentKeypoint.y})，σ = ${currentKeypoint.scale.toFixed(2)}。它之所以值得继续分析，是因为该局部结构在当前尺度链里仍能保持稳定。`;
    case 'dog-detection': {
      if (neighborData) {
        const upG = neighborData.prevComparisons.filter(c => c.relation === 'greater').length;
        const sameG = neighborData.sameComparisons.filter(c => c.relation === 'greater').length;
        const dnG = neighborData.nextComparisons.filter(c => c.relation === 'greater').length;
        const allG = neighborData.prevComparisons.length + neighborData.sameComparisons.length + neighborData.nextComparisons.length;
        const totalG = upG + sameG + dnG;
        const allType = totalG === allG ? '全部大于' : '全部小于';
        return `DoG 值 ${neighborData.currentValue.toFixed(4)}，26 邻域 上层${upG}/9 同层${sameG}/8 下层${dnG}/9 ${allType}邻居，被判定为${neighborData.isExtremum ? '候选关键点' : '非极值点'}。`;
      }
      return `当前关键点 DoG 值 ${currentKeypoint.magnitude.toFixed(4)}。26 邻域跨尺度比较需查看具体比较明细表。`;
    }
    case 'orientation':
      return `当前关键点主方向为 ${(currentKeypoint.orientation * 180 / Math.PI).toFixed(0)}°。后续描述子都会围绕这个方向对齐，因此旋转后仍有机会匹配上。`;
    case 'descriptor':
      return '16×16→4×4→8方向→128维，L2归一化。当前关键点已被编码成 SIFT 128 维 / SURF 64 维局部特征。';
    case 'matching': {
      if (matches.length > 0) {
        const sorted = [...matches].sort((a, b) => a.distance - b.distance);
        const bestDist = sorted[0]?.distance ?? 0;
        const worstDist = sorted[sorted.length - 1]?.distance ?? 0;
        const avgDist = sorted.reduce((s, m) => s + m.distance, 0) / sorted.length;
        return `${matches.length} 对匹配通过比值检验（< 0.8）。最近距离 ${bestDist.toFixed(3)}，平均 ${avgDist.toFixed(3)}，最远 ${worstDist.toFixed(3)}。`;
      }
      return `当前教学演示没有通过比值检验的匹配。阈值 0.8 过滤掉了模棱两可的匹配对。可尝试调整参数或切换图像。`;
    }
    default:
      return '现在可以从概览进入任一步骤，检查这个关键点是如何一路从候选点变成可匹配特征的。';
  }
}

// ==================== 页面组件 ====================

export default function SiftSurfScaleFeaturesPage() {
  // ---------- 状态 ----------
  const [step, setStep] = useState<TeachingStepKey>('overview');
  const [activeTab, setActiveTab] = useState<TabKey>('sift');
  const [imageType, setImageType] = useState<ScaleFeatureImageType>('rectangle');
  const [sigma, setSigma] = useState(1.0);
  const [numScales, setNumScales] = useState(3);
  const [selectedKpIdx, setSelectedKpIdx] = useState(0);
  const [currentPosition, setCurrentPosition] = useState({ x: 16, y: 16 });
  const [refImageMode, setRefImageMode] = useState<RefImageMode>('auto');
  const [userManuallySelectedRef, setUserManuallySelectedRef] = useState(false);
  const lenaImage = useLenaGrayscaleImage(96);

  // ---------- 副作用 ----------
  // 步骤切换时重置标签到 SIFT
  useEffect(() => {
    setActiveTab('sift');
  }, [step]);

  // 图像类型变化且用户未手动选择参考图时，自动重置 refImageMode
  useEffect(() => {
    if (!userManuallySelectedRef) {
      setRefImageMode('auto');
    }
  }, [imageType, userManuallySelectedRef]);

  // ---------- 源图像 ----------
  const sourceImage: number[][] = useMemo(() => {
    switch (imageType) {
      case 'rectangle': return createRectangleImage();
      case 'circle': return createCircleImage();
      case 'lenaOriginal': return lenaImage ?? createRectangleImage();
      default: return createRectangleImage();
    }
  }, [imageType, lenaImage]);

  // 同步 currentPosition 到选定关键点
  const { keypoints, gaussianScales, dogScales, stepData } = useMemo(
    () => computeSiftSurf(sourceImage, sigma, numScales, selectedKpIdx),
    [sourceImage, sigma, numScales, selectedKpIdx]
  );

  useEffect(() => {
    if (!stepData.currentKeypoint) return;
    setCurrentPosition({ x: stepData.currentKeypoint.x, y: stepData.currentKeypoint.y });
  }, [stepData.currentKeypoint]);

  // ---------- 参考图像与跨图像匹配（步骤 6 专属） ----------
  const resolvedRefImage = useMemo<{ image: number[][]; label: string } | null>(() => {
    if (step !== 'matching') return null;
    const refSourceType = getRefSourceType(refImageMode, imageType);
    return createReferenceImage(sourceImage, refSourceType);
  }, [sourceImage, imageType, step, refImageMode]);

  const matchingResult = useMemo(() => {
    if (step !== 'matching' || !resolvedRefImage) return null;
    return computeSiftSurfMatching(sourceImage, resolvedRefImage.image, sigma, numScales, selectedKpIdx);
  }, [sourceImage, resolvedRefImage, sigma, numScales, selectedKpIdx, step]);

  // ---------- 关键点覆盖图 ----------
  const keypointImage = useMemo(
    () => renderKeypointOverlay(sourceImage, keypoints, selectedKpIdx),
    [sourceImage, keypoints, selectedKpIdx]
  );

  const refKeypointImage = useMemo(() => {
    if (!matchingResult || !resolvedRefImage) return null;
    return renderKeypointOverlay(resolvedRefImage.image, matchingResult.referenceKeypoints, -1);
  }, [matchingResult, resolvedRefImage]);

  // ---------- 派生数据 ----------
  const currentKeypoint = stepData.currentKeypoint;
  const matches = matchingResult?.stepData.matches ?? stepData.matches ?? [];
  const matchCount = matches.length;
  const neighborData = stepData.neighborComparisons;
  const currentTermHints = stepTermHints(step);
  const currentEvidenceText = getStepEvidenceText(step, currentKeypoint, stepData.neighborComparisons);
  const currentResultText = getStepResultText(step, currentKeypoint, matchCount, neighborData, matches);
  const currentStageIndex = TASK_STAGES.findIndex(s => s.key === step);

  // ---------- 导航处理 ----------
  const syncSelectionToNearestKeypoint = useCallback((point: { x: number; y: number }) => {
    const nearestIndex = findNearestKeypointIndex(point, keypoints);
    const nearestKeypoint = keypoints[nearestIndex];
    setCurrentPosition(
      nearestKeypoint
        ? { x: nearestKeypoint.x, y: nearestKeypoint.y }
        : point
    );
    setSelectedKpIdx(nearestIndex);
  }, [keypoints]);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (sourceImage.length === 0 || (sourceImage[0]?.length ?? 0) <= 0) return;

    const nextPoint = moveGridPoint(
      currentPosition,
      {
        width: sourceImage[0]?.length ?? 0,
        height: sourceImage.length,
      },
      direction
    );

    syncSelectionToNearestKeypoint(nextPoint);
  }, [currentPosition, sourceImage, syncSelectionToNearestKeypoint]);

  const handleInputRegionSelect = useCallback((x: number, y: number) => {
    syncSelectionToNearestKeypoint({ x, y });
  }, [syncSelectionToNearestKeypoint]);

  const handleImageChange = useCallback((value: string) => {
    setImageType(value as ScaleFeatureImageType);
    setSelectedKpIdx(0);
    setCurrentPosition({ x: 16, y: 16 });
  }, []);

  const handleSigmaChange = useCallback((value: number) => {
    setSigma(value);
    setSelectedKpIdx(0);
    setCurrentPosition({ x: 16, y: 16 });
  }, []);

  const handleRefImageModeChange = useCallback((value: string) => {
    const mode = value as RefImageMode;
    setRefImageMode(mode);
    setUserManuallySelectedRef(mode !== 'auto');
  }, []);

  const goPrevious = useCallback(() => {
    const nextIndex = Math.max(0, currentStageIndex - 1);
    setStep(TASK_STAGES[nextIndex].key);
  }, [currentStageIndex]);

  const goNext = useCallback(() => {
    const nextIndex = Math.min(TASK_STAGES.length - 1, currentStageIndex + 1);
    setStep(TASK_STAGES[nextIndex].key);
  }, [currentStageIndex]);

  // ---------- 骨架卡片 ----------
  const currentKeypointRail = currentKeypoint ? (
    <TeachingCard>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.9fr)]">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">当前关键点</div>
          <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
            ({currentKeypoint.x}, {currentKeypoint.y}) / octave {currentKeypoint.octave} / &sigma;={currentKeypoint.scale.toFixed(2)}
            {neighborData && (
              <span className="ml-2 text-[10px] text-red-600">
                DoG={neighborData.currentValue.toFixed(4)}
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">当前证据</div>
          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {currentEvidenceText}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">当前结果</div>
          <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            {currentResultText}
          </div>
        </div>
      </div>
      {currentTermHints.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {currentTermHints.map(item => (
            <TeachingTerm key={item.term} term={item.term} explanation={item.explanation} />
          ))}
        </div>
      ) : null}
    </TeachingCard>
  ) : null;

  // ---------- 参数面板 ----------
  const parameters = (
    <div className="space-y-4">
      {/* 课堂任务卡片 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
        <div className="text-xs font-semibold text-amber-800">课堂任务</div>
        <p className="mt-2 text-xs leading-5 text-amber-800">
          沿着 6 个步骤观察 SIFT/SURF 关键点如何被检测、定向、描述和匹配。
          SURF 是 SIFT 的加速版本，可以在每步切换标签对比差异。
        </p>
      </div>

      {/* 步骤导航 */}
      <StageStepper activeStage={step} onStageChange={setStep} stageIndex={currentStageIndex} />

      {/* 上一步/下一步 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={goPrevious}
          disabled={currentStageIndex <= 0}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={currentStageIndex >= TASK_STAGES.length - 1}
          className="rounded-xl border border-amber-200 bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一步
        </button>
      </div>

      {/* 精简参数 */}
      <SelectParam
        label="测试图像"
        value={imageType}
        onChange={handleImageChange}
        options={IMAGE_OPTIONS}
      />

      <SliderParam
        label="初始尺度 &sigma;"
        value={sigma}
        onChange={handleSigmaChange}
        min={0.5}
        max={2.0}
        step={0.1}
      />

      <SliderParam
        label="每组层数"
        value={numScales}
        onChange={(v) => { setNumScales(v); setSelectedKpIdx(0); }}
        min={2}
        max={5}
        step={1}
      />

      {/* 步骤 6 专属：参考图像选择 */}
      {step === 'matching' && (
        <SelectParam
          label="参考图像"
          value={refImageMode}
          onChange={handleRefImageModeChange}
          options={REF_IMAGE_OPTIONS}
        />
      )}

      {/* 关键点列表（显示 top 10） */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
        <div className="text-[11px] font-semibold text-amber-800">检测到的关键点</div>
        <div className="mt-1 text-[10px] text-amber-700">
          共 {keypoints.length} 个（按响应值排序，显示前 10 个）。
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {keypoints.slice(0, 10).map((kp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelectedKpIdx(i);
                setCurrentPosition({ x: kp.x, y: kp.y });
              }}
              className={
                'min-h-7 rounded px-1.5 py-1 text-[9px] font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ' +
                (selectedKpIdx === i
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-amber-100')
              }
              aria-pressed={selectedKpIdx === i}
              aria-label={`选择第 ${i} 个关键点`}
            >
              #{i}
            </button>
          ))}
        </div>
        {currentKeypoint && (
          <div className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] text-slate-700">
            Kp #{selectedKpIdx}: ({currentKeypoint.x},{currentKeypoint.y})
            &sigma;={currentKeypoint.scale.toFixed(1)}
            &theta;={(currentKeypoint.orientation * 180 / Math.PI).toFixed(0)}&deg;
          </div>
        )}
      </div>
    </div>
  );

  // ---------- 匹配连线覆层 ----------
  const matchOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (step !== 'matching' || activeTab !== 'sift') return [];
    const matchList = matchingResult?.stepData.matches ?? [];
    const refKps = matchingResult?.referenceKeypoints ?? [];
    const srcW = sourceImage[0]?.length ?? 1;
    const srcH = sourceImage.length || 1;
    const refW = resolvedRefImage?.image[0]?.length ?? srcW;
    const refH = resolvedRefImage?.image.length ?? srcH;

    return matchList.slice(0, 12).map((m, i) => {
      const qKp = keypoints[m.queryIdx];
      const rKp = refKps[m.trainIdx];
      if (!qKp || !rKp) return null;
      return {
        id: `match-${i}`,
        tone: 'amber' as const,
        straight: true,
        from: { kind: 'pixel' as const, selector: '.sift-match-query-image', x: qKp.x, y: qKp.y, imageWidth: srcW, imageHeight: srcH },
        to: { kind: 'pixel' as const, selector: '.sift-match-reference-image', x: rKp.x, y: rKp.y, imageWidth: refW, imageHeight: refH },
      };
    }).filter(Boolean) as AnchoredOverlayPath[];
  }, [step, activeTab, matchingResult, keypoints, sourceImage, resolvedRefImage]);

  // ---------- 分析预览 ----------
  const analysisPreview = useMemo(() => {
    switch (step) {
      case 'matching': {
        const crossMatches = matchingResult?.stepData.matches ?? [];
        return (
          <div className="space-y-4">
            {currentKeypointRail}
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'sift' && (
              <div className="grid gap-4 lg:grid-cols-2">
                <TeachingCard>
                  <div className="mb-2 text-[11px] font-semibold text-red-700">待匹配图像</div>
                  <div className="sift-match-query-image">
                    <ImageCanvas image={keypointImage} maxDisplaySize={180} showGrid={false} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{keypoints.length} 个关键点</p>
                </TeachingCard>
                <TeachingCard>
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">
                    参考图像{resolvedRefImage ? `（${resolvedRefImage.label}）` : ''}
                  </div>
                  <div className="sift-match-reference-image">
                    {refKeypointImage && (
                      <ImageCanvas image={refKeypointImage} maxDisplaySize={180} showGrid={false} />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{matchingResult?.referenceKeypoints.length ?? 0} 个关键点</p>
                </TeachingCard>
              </div>
            )}
            {activeTab === 'surf' && (
              <TeachingCard>
                <div className="mb-2 text-[11px] font-semibold text-amber-700">SURF 64D 描述子匹配</div>
                <p className="text-xs leading-6 text-slate-600">
                  SURF 使用 64 维描述子进行匹配，相比 SIFT 的 128 维减少了一半的存储和计算量。
                  相同的比值检验策略用于判断匹配可靠性。
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                    <div className="text-2xl font-bold text-amber-700">{crossMatches.length}</div>
                    <div className="text-xs text-amber-600">匹配对数</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">64 维 / 128 维</div>
                    <div className="text-xs text-slate-500">SURF 描述子更短</div>
                  </div>
                </div>
              </TeachingCard>
            )}
            {activeTab === 'compare' && (
              <SiftSurfCompareTable />
            )}
            {(activeTab === 'sift' || activeTab === 'surf') && crossMatches.length > 0 && (
              <TeachingCard>
                <div className="mb-2 text-xs font-semibold text-slate-700">
                  {activeTab === 'sift' ? 'SIFT' : 'SURF'} 匹配距离列表（{crossMatches.length} 对通过比值检验）
                </div>
                <div className="space-y-1">
                  {crossMatches.slice(0, 10).map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded bg-slate-50 px-3 py-1.5 text-xs">
                      <span className="w-6 text-right text-[9px] text-slate-400">#{i + 1}</span>
                      <span className="font-mono text-slate-600">Kp {m.queryIdx} &harr; Kp {m.trainIdx}</span>
                      <div className="h-2.5 flex-1 rounded bg-slate-100">
                        <div
                          className="h-full rounded bg-amber-500"
                          style={{ width: Math.min(Math.max(100 - m.distance * 50, 5), 100) + '%' }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-slate-500">{m.distance.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-slate-500">比值检验阈值 0.8：d&lt;sub&gt;1&lt;/sub&gt; / d&lt;sub&gt;2&lt;/sub&gt; &lt; 0.8</div>
              </TeachingCard>
            )}
            {(activeTab === 'sift' || activeTab === 'surf') && crossMatches.length === 0 && (
              <TeachingCard tone="amber">
                <div className="text-xs text-slate-600">当前没有通过比值检验的匹配，可尝试调整参数或切换图像。</div>
              </TeachingCard>
            )}
          </div>
        );
      }

      case 'dog-detection': {
        const neighborDataInner = stepData.neighborComparisons;
        return (
          <div className="space-y-4">
            {currentKeypointRail}
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'sift' && (
              <div className="space-y-4">
                {neighborDataInner ? (
                  <DoGNeighborTables data={neighborDataInner} />
                ) : (
                  <TeachingCard tone="amber">
                    <div className="text-xs text-slate-600">当前选中关键点没有跨尺度 26 邻域比较数据。</div>
                  </TeachingCard>
                )}
                <ProcessRail>
                  <FlowColumns>
                    <FlowColumn align="start">
                      <FlowNode tone="red">
                        <div className="mb-2 text-[11px] font-semibold text-red-700">原图（关键点标记）</div>
                        <ImageCanvas image={keypointImage} maxDisplaySize={130} showGrid={false} />
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          跨尺度仍然突出的候选关键点被保留。
                        </p>
                      </FlowNode>
                    </FlowColumn>
                    <FlowColumn align="center">
                      <FlowNode tone="amber">
                        <div className="mb-2 text-[11px] font-semibold text-amber-700">DoG 响应图</div>
                        {dogScales.length > 0 && (
                          <ImageCanvas image={dogScales[0]} maxDisplaySize={130} showGrid={false} />
                        )}
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          DoG 把"局部结构变化最明显"的位置凸显出来。
                        </p>
                      </FlowNode>
                    </FlowColumn>
                    <FlowColumn align="end">
                      <FlowNode tone="emerald">
                        <div className="mb-2 text-[11px] font-semibold text-emerald-700">选中关键点</div>
                        <ImageCanvas
                          image={keypointImage}
                          maxDisplaySize={130}
                          showGrid={false}
                          highlightPixel={{
                            x: stepData.currentKeypoint?.x ?? 0,
                            y: stepData.currentKeypoint?.y ?? 0,
                          }}
                        />
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          当前高亮点就是后续要继续分配方向、生成描述子的局部结构。
                        </p>
                      </FlowNode>
                    </FlowColumn>
                  </FlowColumns>
                </ProcessRail>
              </div>
            )}
            {activeTab === 'surf' && (
              <div className="space-y-4">
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SURF Hessian 行列式检测</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    SURF 使用近似的 Hessian 矩阵行列式定位兴趣点。与 DoG 在相邻高斯层之间做差不同，
                    Hessian 行列式直接在单层响应图上评估二阶变化强度。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormulaCard label="Hessian 矩阵" mathML={SURF_HESSIAN} tone="embedded" />
                    <FormulaCard label="近似行列式" mathML={SURF_DET_HESSIAN} tone="embedded" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">w 取 0.9，补偿近似误差。</p>
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/surf-hessian-filters.jpg"
                    alt="SURF 滤波器"
                    width={387}
                    height={384}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    盒子滤波器对高斯二阶导数的近似（9x9 模板）。
                  </div>
                </TeachingCard>
              </div>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">DoG vs Hessian 检测对比</div>
                <div className="mt-3 w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">特性</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">DoG（SIFT）</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Hessian（SURF）</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">基本原理</td>
                        <td className="px-3 py-1.5 text-slate-700">相邻高斯层相减</td>
                        <td className="px-3 py-1.5 text-slate-700">二阶偏导矩阵行列式</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">响应含义</td>
                        <td className="px-3 py-1.5 text-slate-700">跨尺度灰度变化</td>
                        <td className="px-3 py-1.5 text-slate-700">局部二阶结构强度</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">邻域抑制</td>
                        <td className="px-3 py-1.5 text-slate-700">26 邻域（跨 3 层）</td>
                        <td className="px-3 py-1.5 text-slate-700">3x3x3 非极大抑制</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">计算速度</td>
                        <td className="px-3 py-1.5 text-slate-700">较慢</td>
                        <td className="px-3 py-1.5 text-slate-700">快（积分图）</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TeachingCard>
            )}
          </div>
        );
      }

      case 'scale-space':
        return (
          <div className="space-y-4">
            {currentKeypointRail}
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'sift' && (
              <ProcessRail>
                <FlowColumns>
                  <FlowColumn align="start">
                    <FlowNode tone="red">
                      <div className="mb-2 text-[11px] font-semibold text-red-700">原图 I(x,y)</div>
                      <ImageCanvas image={sourceImage} maxDisplaySize={120} showGrid={false} />
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="center">
                    <FlowNode tone="amber">
                      <div className="mb-2 text-[11px] font-semibold text-amber-700">高斯卷积</div>
                      <div className="rounded bg-amber-50 px-3 py-3 text-center text-xs text-amber-800">
                        G(x,y,&sigma;) * I(x,y)
                      </div>
                      {gaussianScales.length > 1 && (
                        <div className="mt-3">
                          <div className="mb-1 text-[10px] text-amber-700">尺度层</div>
                          <div className="grid grid-cols-4 gap-1">
                            {gaussianScales.slice(0, 4).map((g, i) => (
                              <div key={i} className="flex flex-col items-center">
                                <ImageCanvas image={g} maxDisplaySize={50} showGrid={false} />
                                <span className="mt-0.5 text-[8px] text-slate-500">s={i}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="end">
                    <FlowNode tone="emerald">
                      <div className="mb-2 text-[11px] font-semibold text-emerald-700">模糊结果</div>
                      <ImageCanvas image={gaussianScales[1] ?? sourceImage} maxDisplaySize={120} showGrid={false} />
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        尺度 &sigma; 越大，图像越模糊。
                      </p>
                    </FlowNode>
                  </FlowColumn>
                </FlowColumns>
              </ProcessRail>
            )}
            {activeTab === 'surf' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">SURF 尺度空间：固定尺寸，变化滤波器</div>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  SURF 不改变图像大小，而是保持原图尺寸不变，通过增大盒子滤波器（box filter）的模板
                  来模拟不同尺度的卷积效果。结合积分图，使得任意尺寸的矩形区域卷积都只需常数时间。
                </p>
              </TeachingCard>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">尺度空间策略对比</div>
                <div className="mt-3 w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">维度</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SIFT</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SURF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">图像策略</td>
                        <td className="px-3 py-1.5 text-slate-700">降采样改变大小</td>
                        <td className="px-3 py-1.5 text-slate-700">固定图像大小</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">卷积核</td>
                        <td className="px-3 py-1.5 text-slate-700">高斯核（Gaussian kernel）</td>
                        <td className="px-3 py-1.5 text-slate-700">盒子滤波器（Box filter）</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">加速手段</td>
                        <td className="px-3 py-1.5 text-slate-700">降采样减少数据量</td>
                        <td className="px-3 py-1.5 text-slate-700">积分图常数时间查表</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">精度</td>
                        <td className="px-3 py-1.5 text-slate-700">更高（精确高斯）</td>
                        <td className="px-3 py-1.5 text-slate-700">较低（近似）</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TeachingCard>
            )}
          </div>
        );

      case 'orientation':
        return (
          <div className="space-y-4">
            {currentKeypointRail}
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'sift' && (
              <ProcessRail>
                <FlowColumns>
                  <FlowColumn align="start">
                    <FlowNode tone="red">
                      <div className="mb-2 text-[11px] font-semibold text-red-700">关键点邻域梯度</div>
                      {stepData.gradientMagnitudes && (
                        <ImageCanvas image={stepData.gradientMagnitudes} maxDisplaySize={120} showGrid={false} />
                      )}
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        以关键点为中心，计算 17x17 邻域的梯度幅值。
                      </p>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="center">
                    <FlowNode tone="sky">
                      <div className="mb-2 text-[11px] font-semibold text-sky-700">方向直方图</div>
                      {stepData.orientationHistogram ? (
                        <div>
                          <div className="mb-2 text-[10px] text-sky-700">教学简化：8 柱直方图（标准 SIFT 使用 36 柱，每柱 10°）</div>
                          <OrientationHistogramGraph
                            hist={stepData.orientationHistogram}
                            highlightBin={(() => {
                              const h = stepData.orientationHistogram ?? [];
                              let mb = 0;
                              for (let i = 1; i < h.length; i++) if (h[i] > h[mb]) mb = i;
                              return mb;
                            })()}
                          />
                          {stepData.currentKeypoint && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              <TeachingTerm
                                term="8 柱直方图"
                                explanation="标准 SIFT 使用 36 柱（每柱 10°），本教学实现为便于可视化简化为 8 柱（每柱 45°）。"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">无数据</div>
                      )}
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="end">
                    <FlowNode tone="emerald">
                      <div className="mb-2 text-[11px] font-semibold text-emerald-700">方向分配结果</div>
                      {stepData.currentKeypoint && (
                        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center">
                          <div className="text-lg font-bold text-emerald-700">
                            {(stepData.currentKeypoint.orientation * 180 / Math.PI).toFixed(0)}&deg;
                          </div>
                          <div className="mt-1 text-xs text-slate-500">关键点主方向</div>
                        </div>
                      )}
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        直方图峰值方向为关键点主方向，使描述子具有旋转不变性。
                      </p>
                    </FlowNode>
                  </FlowColumn>
                </FlowColumns>
              </ProcessRail>
            )}
            {activeTab === 'surf' && (
              <ProcessRail>
                <FlowColumns>
                  <FlowColumn align="start">
                    <FlowNode tone="amber">
                      <div className="mb-2 text-[11px] font-semibold text-amber-700">圆形邻域</div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">
                        SURF 在关键点周围圆形邻域内计算 Haar 小波响应
                      </div>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="center">
                    <FlowNode tone="sky">
                      <div className="mb-2 text-[11px] font-semibold text-sky-700">扇形滑动窗口</div>
                      <p className="text-xs leading-5 text-slate-600">
                        以一个 π/3 的扇形窗口扫描 360°，窗口内 x 和 y 方向 Haar 小波响应的
                        矢量累加和最大的方向即为主方向。
                      </p>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="end">
                    <FlowNode tone="emerald">
                      <div className="mb-2 text-[11px] font-semibold text-emerald-700">主方向</div>
                      {stepData.currentKeypoint && (
                        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center">
                          <div className="text-lg font-bold text-emerald-700">
                            {(stepData.currentKeypoint.orientation * 180 / Math.PI).toFixed(0)}&deg;
                          </div>
                          <div className="mt-1 text-xs text-slate-500">与 SIFT 共享的关键点方向</div>
                        </div>
                      )}
                    </FlowNode>
                  </FlowColumn>
                </FlowColumns>
              </ProcessRail>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">方向分配对比</div>
                <div className="mt-3 w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">维度</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SIFT</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SURF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">邻域形状</td>
                        <td className="px-3 py-1.5 text-slate-700">正方形</td>
                        <td className="px-3 py-1.5 text-slate-700">圆形</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">特征计算</td>
                        <td className="px-3 py-1.5 text-slate-700">梯度幅值和方向</td>
                        <td className="px-3 py-1.5 text-slate-700">Haar 小波响应 dx, dy</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">统计方式</td>
                        <td className="px-3 py-1.5 text-slate-700">36 柱直方图投票</td>
                        <td className="px-3 py-1.5 text-slate-700">&pi;/3 扇形滑动求和</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">加速</td>
                        <td className="px-3 py-1.5 text-slate-700">无特殊加速</td>
                        <td className="px-3 py-1.5 text-slate-700">积分图快速 Haar 响应</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TeachingCard>
            )}
          </div>
        );

      case 'descriptor':
        return (
          <div className="space-y-4">
            {currentKeypointRail}
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'sift' && (
              <ProcessRail>
                <FlowColumns>
                  <FlowColumn align="start">
                    <FlowNode tone="red">
                      <div className="mb-2 text-[11px] font-semibold text-red-700">关键点邻域</div>
                      {stepData.gradientMagnitudes && (
                        <ImageCanvas image={stepData.gradientMagnitudes} maxDisplaySize={120} showGrid />
                      )}
                      <p className="mt-2 text-xs text-slate-600">16x16 邻域划分为 4x4 子区域。</p>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="center">
                    <FlowNode tone="sky">
                      <div className="mb-2 text-[11px] font-semibold text-sky-700">4x4x8 = 128 维</div>
                      {stepData.siftDescriptorGrid && (
                        <DescriptorGrid grid={stepData.siftDescriptorGrid} label="每个子区域 8 方向" />
                      )}
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="end">
                    <FlowNode tone="emerald">
                      <div className="mb-2 text-[11px] font-semibold text-emerald-700">L2 归一化</div>
                      <FormulaCard label="描述子归一化" mathML={DESCRIPTOR_NORM} tone="embedded" />
                      <p className="mt-2 text-xs text-slate-500">消除光照线性变化的影响。</p>
                    </FlowNode>
                  </FlowColumn>
                </FlowColumns>
              </ProcessRail>
            )}
            {activeTab === 'surf' && (
              <ProcessRail>
                <FlowColumns>
                  <FlowColumn align="start">
                    <FlowNode tone="amber">
                      <div className="mb-2 text-[11px] font-semibold text-amber-700">20s x 20s 区域</div>
                      {stepData.gradientMagnitudes && (
                        <ImageCanvas image={stepData.gradientMagnitudes} maxDisplaySize={120} showGrid />
                      )}
                      <p className="mt-2 text-xs text-slate-600">SURF 描述子区域为 20s x 20s（s 为尺度）。</p>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="center">
                    <FlowNode tone="sky">
                      <div className="mb-2 text-[11px] font-semibold text-sky-700">4x4x4 = 64 维</div>
                      {stepData.surfDescriptorGrid && (
                        <DescriptorGrid
                          grid={stepData.surfDescriptorGrid}
                          label="&Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy|"
                        />
                      )}
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="end">
                    <FlowNode tone="emerald">
                      <div className="mb-2 text-[11px] font-semibold text-emerald-700">Haar 小波响应</div>
                      <FormulaCard label="Haar 小波响应" mathML={HAAR_WAVELET_RESPONSE} tone="embedded" />
                      <p className="mt-2 text-xs text-slate-500">每个子块只记录 4 个值，维数减半。</p>
                    </FlowNode>
                  </FlowColumn>
                </FlowColumns>
              </ProcessRail>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">描述子对比</div>
                <div className="mt-3 w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">维度</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SIFT</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SURF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">邻域大小</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">16x16</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">20s x 20s</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">子区域</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">4x4</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">4x4</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">描述方法</td>
                        <td className="px-3 py-1.5 text-slate-700">8 方向梯度直方图</td>
                        <td className="px-3 py-1.5 text-slate-700">Haar 小波 &Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy|</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">维数</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">128</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">64</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">归一化</td>
                        <td className="px-3 py-1.5 text-slate-700">L2 归一化</td>
                        <td className="px-3 py-1.5 text-slate-700">L2 归一化</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  {stepData.siftDescriptorGrid && (
                    <DescriptorGrid grid={stepData.siftDescriptorGrid} label="SIFT 各子区域 8 方向直方图" />
                  )}
                </div>
                <div className="mt-3">
                  {stepData.surfDescriptorGrid && (
                    <DescriptorGrid grid={stepData.surfDescriptorGrid} label="SURF 各子区域 4 维响应" />
                  )}
                </div>
              </TeachingCard>
            )}
          </div>
        );

      default: // overview
        return (
          <div className="space-y-4">
            {currentKeypointRail}
            <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'sift' && (
              <ProcessRail>
                <FlowColumns>
                  <FlowColumn align="start">
                    <FlowNode tone="red">
                      <div className="mb-2 text-[11px] font-semibold text-red-700">待检测图像</div>
                      <ImageCanvas image={sourceImage} maxDisplaySize={110} showGrid={false} />
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="center">
                    <FlowNode tone="amber">
                      <div className="mb-2 text-[11px] font-semibold text-amber-700">SIFT 四步流程</div>
                      <div className="space-y-2">
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                          1. 尺度空间极值检测
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                          2. 关键点定位
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                          3. 方向分配
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                          4. 描述子生成
                        </div>
                      </div>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="end">
                    <FlowNode tone="emerald">
                      <div className="mb-2 text-[11px] font-semibold text-emerald-700">检测结果</div>
                      <ImageCanvas image={keypointImage} maxDisplaySize={110} showGrid={false} />
                      <p className="mt-2 text-[10px] text-slate-500">共 {keypoints.length} 个关键点</p>
                    </FlowNode>
                  </FlowColumn>
                </FlowColumns>
              </ProcessRail>
            )}
            {activeTab === 'surf' && (
              <ProcessRail>
                <FlowColumns>
                  <FlowColumn align="start">
                    <FlowNode tone="red">
                      <div className="mb-2 text-[11px] font-semibold text-red-700">SURF 算法</div>
                      <p className="text-xs leading-5 text-slate-600">
                        SURF 在 SIFT 基础上引入积分图、近似 Hessian 矩阵和 Haar 小波响应，
                        大幅提高计算速度，同时保持较好的鲁棒性。
                      </p>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="center">
                    <FlowNode tone="amber">
                      <div className="mb-2 text-[11px] font-semibold text-amber-700">关键创新</div>
                      <div className="space-y-2">
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                          积分图加速任意尺寸卷积
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                          Hessian 行列式代替 DoG
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                          64 维描述子代替 128 维
                        </div>
                      </div>
                    </FlowNode>
                  </FlowColumn>
                  <FlowColumn align="end">
                    <FlowNode tone="emerald">
                      <div className="mb-2 text-[11px] font-semibold text-emerald-700">检测结果</div>
                      <ImageCanvas image={keypointImage} maxDisplaySize={110} showGrid={false} />
                      <p className="mt-2 text-[10px] text-slate-500">相同图像，与 SIFT 相同的 {keypoints.length} 个关键点</p>
                    </FlowNode>
                  </FlowColumn>
                </FlowColumns>
              </ProcessRail>
            )}
            {activeTab === 'compare' && (
              <SiftSurfCompareTable />
            )}
          </div>
        );
    }
  }, [
    step, activeTab, currentKeypointRail, keypointImage, sourceImage,
    keypoints, gaussianScales, dogScales, stepData,
    matchingResult, resolvedRefImage, refKeypointImage,
  ]);

  // ---------- 步骤详情 ----------
  const stepDetails = useMemo(() => {
    switch (step) {
      case 'matching':
        return (
          <div className="space-y-4">
            {activeTab === 'sift' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SIFT 特征匹配</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    特征匹配通过计算两个 SIFT 128 维描述子的欧氏距离来实现。
                    距离越近，特征越相似。到这一步，算法已经不再直接看像素，
                    而是比较描述子向量之间的距离。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="欧氏距离" mathML={EUCLIDEAN_DIST} tone="embedded" />
                </TeachingCard>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">最近邻比值检验</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    对于待配准图上的特征点，计算它到参考图像上所有特征点的欧氏距离，
                    得到最小距离 d_min 和次小距离 d_2nd。如果：
                  </p>
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center font-mono text-sm font-bold text-amber-800">
                    d_min / d_2nd &lt; 0.8
                  </div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    则该匹配被认为是可靠的。阈值越小，匹配越稳定，但数目越少。
                  </p>
                </TeachingCard>
                {matches.length > 0 && (
                  <TeachingCard>
                    <div className="text-xs font-semibold text-slate-700">
                      当前匹配详情（{matches.length} 对）
                    </div>
                    <div className="mt-2 space-y-1">
                      {matches.slice(0, 10).map((m, i) => (
                        <div key={i} className="flex items-center gap-2 rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">#{i + 1}</span>
                          <span>Kp {m.queryIdx} &harr; Kp {m.trainIdx}</span>
                          <span className="ml-auto font-mono text-amber-700">
                            d = {m.distance.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TeachingCard>
                )}
              </>
            )}
            {activeTab === 'surf' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SURF 64D 描述子匹配</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    SURF 描述子只有 64 维，匹配速度是 SIFT 的两倍左右。
                    虽然维数减半，但 Haar 小波响应保留了足够的局部纹理信息，
                    在实际应用中与 SIFT 的匹配召回率差异不大。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">匹配策略对比</div>
                  <table className="mt-2 w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-2 py-1.5 text-left font-semibold text-slate-700">特性</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-slate-700">SIFT</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-slate-700">SURF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-2 py-1.5 text-slate-600">描述子维数</td>
                        <td className="px-2 py-1.5 font-mono text-slate-700">128</td>
                        <td className="px-2 py-1.5 font-mono text-slate-700">64</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-2 py-1.5 text-slate-600">匹配距离</td>
                        <td className="px-2 py-1.5 text-slate-700" colSpan={2}>欧氏距离</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-2 py-1.5 text-slate-600">检验策略</td>
                        <td className="px-2 py-1.5 text-slate-700" colSpan={2}>最近邻比值检验（d₁/d₂ &lt; 阈值）</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-2 py-1.5 text-slate-600">匹配速度</td>
                        <td className="px-2 py-1.5 text-slate-700">较慢（128 维计算开销大）</td>
                        <td className="px-2 py-1.5 text-slate-700">较快（64 维，快约 2×）</td>
                      </tr>
                    </tbody>
                  </table>
                </TeachingCard>
              </>
            )}
            {activeTab === 'compare' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">匹配算法对比</div>
                  <div className="mt-3 w-full overflow-x-auto">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-300">
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">维度</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">Brute-Force</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">FLANN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1.5 font-medium text-slate-600">原理</td>
                          <td className="px-3 py-1.5 text-slate-700">逐个比较，找最小距离</td>
                          <td className="px-3 py-1.5 text-slate-700">基于 KD-Tree / K-Means 树</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1.5 font-medium text-slate-600">精度</td>
                          <td className="px-3 py-1.5 text-slate-700">最高（穷举）</td>
                          <td className="px-3 py-1.5 text-slate-700">近似，通常足够</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1.5 font-medium text-slate-600">速度</td>
                          <td className="px-3 py-1.5 text-slate-700">慢（O(n²)）</td>
                          <td className="px-3 py-1.5 text-slate-700">快（O(n log n)）</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1.5 font-medium text-slate-600">适用</td>
                          <td className="px-3 py-1.5 text-slate-700">小数据集，需要精确匹配</td>
                          <td className="px-3 py-1.5 text-slate-700">大数据集，实时应用</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    概念对比，不做交互实现。OpenCV 中两者均通过 cv::BFMatcher 和 cv::FlannBasedMatcher 提供。
                  </p>
                </TeachingCard>
                <TeachingCard tone="amber">
                  <div className="text-sm font-semibold text-slate-800">延伸：汉明距离与二进制描述子</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    ORB、BRIEF 等二进制描述子不使用浮点向量，而是用 0/1 比特串表示特征。
                    匹配时使用汉明距离（不同比特位的数量），计算速度远快于欧氏距离。
                    汉明距离可以通过 CPU 的 POPCNT 指令在单周期内完成，非常适合移动端和实时场景。
                  </p>
                  <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-600">
                    二进制描述子的距离计算代价远低于浮点描述子，但区分能力也相对较弱。
                    实际选型需要在速度和区分力之间权衡。
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-slate-500">
                    延伸阅读：BRIEF（2010）、ORB（2011）、BRISK（2011）、FREAK（2012）。
                  </p>
                </TeachingCard>
              </>
            )}
          </div>
        );

      case 'scale-space':
        return (
          <div className="space-y-4">
            {activeTab === 'sift' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">高斯尺度空间</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    尺度空间的核心思想是：通过高斯卷积核在不同尺度下对图像进行平滑，
                    模拟人眼或相机在不同距离观察目标的效果。尺度越大，图像越模糊，细节被抑制。
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    同一个目标在远近变化时，会以不同大小落在图像上，
                    尺度空间正是为不同大小的局部结构提供对应的观察层。
                  </p>
                  {currentTermHints.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {currentTermHints.map(item => (
                        <TeachingTerm key={item.term} term={item.term} explanation={item.explanation} />
                      ))}
                    </div>
                  ) : null}
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="高斯函数" mathML={GAUSSIAN_FUNC} tone="embedded" />
                  <p className="mt-2 text-xs text-slate-500">&sigma; 控制平滑程度；&sigma; 越大，图像越模糊。</p>
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="高斯尺度空间" mathML={GAUSSIAN_SCALE_FORMULA} tone="embedded" />
                  <p className="mt-2 text-xs text-slate-500">
                    对原图 I(x,y) 与不同尺度 &sigma; 的高斯核 G 做卷积，得到一组尺度空间图像 L。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <div className="flex flex-wrap gap-3">
                    {gaussianScales.slice(0, 5).map((g, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <ImageCanvas image={g} maxDisplaySize={80} showGrid={false} />
                        <div className="mt-1 text-[9px] text-slate-500">
                          &sigma; = {(sigma * (2 ** (i / Math.max(numScales, 1)))).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    从左到右：&sigma; 逐渐增大，图像逐渐模糊。相邻层尺度因子比例 k。
                  </div>
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/gaussian-pyramid.jpg"
                    alt="高斯金字塔"
                    width={620}
                    height={548}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-2 text-[10px] text-slate-500">
                    高斯金字塔：同一阶相邻两层的尺度因子比例系数为 k，下一阶由上一阶中间层降采样获得。
                  </div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'surf' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SURF 积分图像</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    积分图像中每个点存储其左上方向所有像素的灰度值之和。
                    任意矩形区域的像素和只需 4 次查表即可计算，与矩形大小无关。
                    这是 SURF 加速的核心基础。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="积分图像定义" mathML={INTEGRAL_IMAGE} tone="embedded" />
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/integral-image.jpg"
                    alt="积分图像"
                    width={1029}
                    height={320}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/sift-surf-scale-comparison.jpg"
                    alt="SIFT 与 SURF 尺度空间对比"
                    width={1259}
                    height={640}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    SIFT 改变图像大小，SURF 保持图像大小不变、改变滤波器大小。
                  </div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">尺度空间全对比</div>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  SIFT 通过降采样构建高斯金字塔，不同八度（octave）的图像尺寸不同。
                  SURF 则保持原图尺寸不变，仅通过增大盒子滤波器模板来模拟更大尺度的卷积。
                  两者都实现了"从精细到粗糙"的多尺度分析，只是实现路径不同。
                </p>
              </TeachingCard>
            )}
          </div>
        );

      case 'dog-detection':
        return (
          <div className="space-y-4">
            {activeTab === 'sift' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">DoG 尺度空间与极值检测</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    DoG（Difference of Gaussian）是尺度归一化高斯拉普拉斯的近似，
                    通过相邻高斯尺度空间的图像相减得到。
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    DoG 不是简单重复模糊，而是在衡量某个位置在相邻尺度之间的变化是否足够明显。
                    只有这种跨尺度都突出的点，才值得拿去做后续方向和描述子。
                  </p>
                  {currentTermHints.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {currentTermHints.map(item => (
                        <TeachingTerm key={item.term} term={item.term} explanation={item.explanation} />
                      ))}
                    </div>
                  ) : null}
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="DoG 尺度空间" mathML={DOG_FORMULA} tone="embedded" />
                  <p className="mt-2 text-xs text-slate-500">
                    D(x,y,&sigma;) 为相邻高斯尺度空间之差，k 为相邻尺度的比例因子。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <div className="flex flex-wrap gap-3">
                    {dogScales.slice(0, 4).map((d, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <ImageCanvas image={d} maxDisplaySize={80} showGrid={false} />
                        <div className="mt-1 text-[9px] text-slate-500">DoG {i}</div>
                      </div>
                    ))}
                  </div>
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/dog-pyramid.jpg"
                    alt="DoG 金字塔"
                    width={1464}
                    height={976}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                </TeachingCard>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">26 邻域极值检测</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    在 DoG 尺度空间中，中间层的每个像素需要与同层相邻的 8 个像素、
                    上下层各 9 个像素（共 26 个邻域点）进行比较。
                    若该点的 DoG 值比所有 26 个邻域点都大或都小，则记为候选极值点。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="26 邻域极值判定条件" mathML={DOG_EXTREMUM_FORMULA} tone="embedded" />
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/dog-extreme-detection.jpg"
                    alt="DOG 极值检测 26 邻域"
                    width={618}
                    height={512}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-2 text-[10px] text-slate-500">
                    标记叉号的像素与 26 个相邻像素比较，确定局部极值。
                  </div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'surf' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">Hessian 矩阵检测</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    SURF 使用近似的 Hessian 矩阵行列式定位兴趣点。
                    用盒子滤波器近似高斯二阶偏导，结合积分图实现快速卷积。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormulaCard label="Hessian 矩阵" mathML={SURF_HESSIAN} tone="embedded" />
                    <FormulaCard label="近似行列式" mathML={SURF_DET_HESSIAN} tone="embedded" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">w 取 0.9，补偿近似误差。</p>
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/surf-hessian-filters.jpg"
                    alt="SURF 滤波器"
                    width={387}
                    height={384}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">盒子滤波器对高斯二阶导数的近似（9x9 模板）。</div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">检测阶段总对比</div>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  SIFT 的 DoG 检测本质上是"跨尺度的灰度变化"检测器；SURF 的 Hessian 行列式则是
                  "同尺度的二阶结构强度"检测器。两者目标都是寻找稳定、可重复的兴趣点，但数学工具不同。
                </p>
              </TeachingCard>
            )}
          </div>
        );

      case 'orientation':
        return (
          <div className="space-y-4">
            {activeTab === 'sift' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">关键点方向分配</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    为使描述子具有旋转不变性，需要为每个关键点分配基准方向。
                    基于关键点邻域像素的梯度方向直方图确定主方向。
                  </p>
                  {currentTermHints.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {currentTermHints.map(item => (
                        <TeachingTerm key={item.term} term={item.term} explanation={item.explanation} />
                      ))}
                    </div>
                  ) : null}
                </TeachingCard>
                <TeachingCard>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormulaCard label="梯度幅值" mathML={GRADIENT_MAG_FORMULA} tone="embedded" />
                    <FormulaCard label="梯度方向" mathML={GRADIENT_ORIENT_FORMULA} tone="embedded" />
                  </div>
                </TeachingCard>
                <TeachingCard>
                  {stepData.orientationHistogram && (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-700">
                        当前关键点方向直方图（8 柱，每柱 45&deg;）
                      </div>
                      <TeachingTerm
                        term="8 柱教学简化"
                        explanation="标准 SIFT 使用 36 柱（每柱 10°），本教学实现为便于可视化简化为 8 柱（每柱 45°）。"
                      />
                      <div className="mt-2">
                        <OrientationHistogramGraph
                          hist={stepData.orientationHistogram}
                          highlightBin={(() => {
                            const h = stepData.orientationHistogram ?? [];
                            let mb = 0;
                            for (let i = 1; i < h.length; i++) if (h[i] > h[mb]) mb = i;
                            return mb;
                          })()}
                        />
                      </div>
                      {stepData.currentKeypoint && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          主方向: {(stepData.currentKeypoint.orientation * 180 / Math.PI).toFixed(1)}&deg;
                        </div>
                      )}
                    </div>
                  )}
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/orientation-histogram.jpg"
                    alt="方向直方图"
                    width={751}
                    height={318}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">直方图的峰值方向即为关键点主方向。</div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'surf' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SURF 方向分配</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    SURF 在关键点周围的圆形邻域内，使用 Haar 小波在 x 和 y 方向上的响应
                    来确定主方向。一个 &pi;/3 的扇形滑动窗口扫描 360°，
                    窗口内所有响应的矢量累加和最大的方向即为主方向。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/surf-descriptor.jpg"
                    alt="SURF 描述子"
                    width={1765}
                    height={579}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    SURF 圆形邻域与扇形滑动窗口。
                  </div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">方向分配全对比</div>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  SIFT 使用正方形邻域的梯度直方图投票，SURF 使用圆形邻域的 Haar 小波响应累加。
                  两者都为正交方向（尺度→方向）提供旋转不变性。
                </p>
              </TeachingCard>
            )}
          </div>
        );

      case 'descriptor':
        return (
          <div className="space-y-4">
            {activeTab === 'sift' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SIFT 描述子</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    在关键点周围取 16x16 邻域，划分为 4x4 个子区域。
                    每个子区域计算 8 个方向的梯度累加值，共 4x4x8 = 128 维向量。
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    这一步的重点不是死记 128 维，而是理解每一维都在回答一个问题：
                    某个局部小块里，哪一个方向的边缘更强。把 16 个小块都记录下来，局部纹理就被编码进描述子了。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/sift-descriptor-grid.jpg"
                    alt="SIFT 描述子网格"
                    width={1426}
                    height={739}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    左：关键点 16x16 邻域梯度；右：4x4 子区域 8 方向直方图叠加。
                  </div>
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/coordinate-rotation.jpg"
                    alt="坐标旋转"
                    width={1484}
                    height={634}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    将坐标轴旋转到关键点主方向，确保旋转不变性。
                  </div>
                </TeachingCard>
                <TeachingCard>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormulaCard label="坐标旋转" mathML={ROTATION_FORMULA} tone="embedded" />
                    <FormulaCard label="描述子归一化" mathML={DESCRIPTOR_NORM} tone="embedded" />
                  </div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'surf' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SURF 描述子</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    SURF 描述子区域为 20s x 20s（s 为尺度），同样划分为 4x4 子块。
                    每个子块计算 Haar 小波在 x 和 y 方向上的响应，并记录
                    &Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy| 四个值，
                    共 4x4x4 = 64 维。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="Haar 小波响应" mathML={HAAR_WAVELET_RESPONSE} tone="embedded" />
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/surf-descriptor.jpg"
                    alt="SURF 描述子"
                    width={1765}
                    height={579}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    SURF 描述子：20s x 20s 区域划分为 4x4 子块，计算 Haar 小波响应。
                  </div>
                </TeachingCard>
              </>
            )}
            {activeTab === 'compare' && (
              <TeachingCard>
                <div className="text-sm font-semibold text-slate-800">描述子总对比</div>
                <div className="mt-3 w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">维度</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SIFT</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">SURF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">邻域大小</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">16x16</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">20s x 20s</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">子区域</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">4x4</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">4x4</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">描述方法</td>
                        <td className="px-3 py-1.5 text-slate-700">8 方向梯度直方图</td>
                        <td className="px-3 py-1.5 text-slate-700">Haar 小波 &Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy|</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">维数</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">128</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">64</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-3 py-1.5 font-medium text-slate-600">归一化</td>
                        <td className="px-3 py-1.5 text-slate-700" colSpan={2}>L2 归一化</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {stepData.siftDescriptorGrid && (
                  <div className="mt-4">
                    <DescriptorGrid grid={stepData.siftDescriptorGrid} label="SIFT 各子区域 8 方向直方图" />
                  </div>
                )}
                {stepData.surfDescriptorGrid && (
                  <div className="mt-3">
                    <DescriptorGrid grid={stepData.surfDescriptorGrid} label="SURF 各子区域 4 维响应" />
                  </div>
                )}
              </TeachingCard>
            )}
          </div>
        );

      default: // overview
        return (
          <div className="space-y-4">
            {activeTab === 'sift' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SIFT 算法概述</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    SIFT（Scale Invariant Feature Transform）是一种经典的局部特征检测算法。
                    它将一幅图像映射为局部特征向量集，特征向量具有平移、缩放、旋转不变性，
                    同时对光照变化、仿射变换也有一定不变性。
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    总共包括四步：（1）检测尺度空间极值点；（2）精确确定关键点位置和尺度；
                    （3）为关键点分配方向；（4）生成关键点描述子。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="尺度空间链式代入" mathML={SCALE_CHAIN_FORMULA} tone="embedded" />
                </TeachingCard>
              </>
            )}
            {activeTab === 'surf' && (
              <>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">SURF 算法简介</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    SURF（Speeded Up Robust Features）在 SIFT 基础上引入积分图、
                    近似 Hessian 矩阵和 Haar 小波变换来提高时间效率。
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    可以把 SURF 理解成对 SIFT 思想的"加速实现"：目标仍然是找到稳定、可匹配的局部结构，
                    只是把尺度检测和描述子统计做得更快、更短。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <div className="text-sm font-semibold text-slate-800">积分图像</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    积分图像中每个点存储其左上方向所有像素的灰度值之和。
                    任意矩形区域的像素和只需 4 次查表即可计算，与矩形大小无关。
                  </p>
                </TeachingCard>
                <TeachingCard>
                  <FormulaCard label="积分图像定义" mathML={INTEGRAL_IMAGE} tone="embedded" />
                </TeachingCard>
                <TeachingCard>
                  <img
                    src="/assets/sift-surf/integral-image.jpg"
                    alt="积分图像"
                    width={1029}
                    height={320}
                    loading="lazy"
                    className="h-auto max-w-full rounded-lg"
                  />
                </TeachingCard>
              </>
            )}
            {activeTab === 'compare' && (
              <SiftSurfCompareTable />
            )}
            {keypoints.length > 0 && (
              <TeachingCard>
                <div className="text-xs font-semibold text-slate-700">当前图像检测结果</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">关键点总数</div>
                    <div className="text-lg font-bold text-slate-800">{keypoints.length}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">当前 &sigma;</div>
                    <div className="text-lg font-bold text-slate-800">{sigma.toFixed(1)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">每组层数</div>
                    <div className="text-lg font-bold text-slate-800">{numScales}</div>
                  </div>
                </div>
              </TeachingCard>
            )}
          </div>
        );
    }
  }, [
    step, activeTab, gaussianScales, dogScales, sigma, numScales,
    keypoints, stepData, currentTermHints, matches, sourceImage,
  ]);

  // ==================== Main Render ====================
  return (
    <ConceptLayout
      title="SIFT / SURF 尺度特征"
      subtitle="Scale Invariant Features - 尺度不变的局部特征检测"
      operationLabel={
        step === 'overview' ? 'SIFT 四步流程' :
        step === 'scale-space' ? '尺度空间构建' :
        step === 'dog-detection' ? 'DoG 极值检测' :
        step === 'orientation' ? '方向分配' :
        step === 'descriptor' ? '描述子生成' : '特征匹配'
      }
      parameterIntro="按 6 个步骤推进，观察 SIFT/SURF 关键点如何被检测、定向、描述和匹配。可在每步切换 SIFT/SURF/对比 标签。"
      originalImage={sourceImage}
      resultImage={keypointImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      currentStep={{
        x: currentPosition.x,
        y: currentPosition.y,
        kernelSize: 1,
      }}
      imageHints={{
        input: '点击原图选择关键点',
        output: '结果图高亮当前选中的关键点',
      }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      navigationHintText="方向键移动 / 点击图像选择关键点"
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleInputRegionSelect}
      visualOverlay={matchOverlayPaths.length > 0 ? <AnchoredOverlay paths={matchOverlayPaths} /> : null}
      codeTab={
        <CodeViewer languages={[{ name: 'TypeScript', code: SIFT_SURF_CODE }]} />
      }
      onDirectionMove={handleDirectionMove}
    />
  );
}
