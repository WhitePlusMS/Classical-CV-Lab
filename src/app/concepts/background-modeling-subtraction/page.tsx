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
  buildInlineMathML,
} from '@/components';
import {
  BackgroundModelType,
  createBackgroundModel,
} from '@/lib/algorithms/simpleBackground';
import { useGridNavigation } from '@/hooks/useGridNavigation';

const BACKGROUND_CODE_TS = `/**
 * 背景建模与背景减除算法 — 教学简化实现
 *
 * 四种经典背景建模方法：
 *   1. 均值模型     — 前 N 帧像素均值作为背景
 *   2. 自适应背景   — 学习率 α 控制的递归更新
 *   3. 单高斯模型   — 每个像素用高斯分布 N(μ, δ²) 建模
 *   4. 混合高斯模型 — 多模态背景用 K 个加权高斯分布描述
 */

// ============================
// 1. 均值模型
// ============================

/** 均值背景：B(x,y) = (1/N)·Σ_{i=1}^{N} I_i(x,y) */
function meanBackgroundModel(frames: number[][]): number[] {
  const N = frames.length;
  return frames[0].map((_, i) =>
    frames.reduce((sum, f) => sum + f[i], 0) / N
  );
}

/** 均值模型前景判定：|I_t - B| > T → 前景 */
function meanForegroundDetect(
  pixel: number,
  bg: number,
  threshold: number
): boolean {
  return Math.abs(pixel - bg) > threshold;
}

// ============================
// 2. 自适应背景模型
// ============================

/**
 * B_t = α·I_t + (1 - α)·B_{t-1}
 * @param alpha 学习率（0 < α < 1），越大背景更新越快
 */
function updateAdaptiveBackground(
  currentPixel: number,
  prevBackground: number,
  alpha: number
): number {
  return alpha * currentPixel + (1 - alpha) * prevBackground;
}

// ============================
// 3. 单高斯模型
// ============================

/** 单高斯分布参数 */
interface SingleGaussianParams {
  mean: number;     // μ
  variance: number; // δ²
  sigma: number;    // δ（标准差）
}

/** 初始化：μ₀ = I₀, δ₀ = 20（δ² = 400） */
function initSingleGaussian(pixel: number): SingleGaussianParams {
  return { mean: pixel, variance: 400, sigma: 20 };
}

/** 前景判定：|I_t - μ| > λ·δ */
function singleGaussianDetect(
  pixel: number,
  params: SingleGaussianParams,
  lambda: number
): boolean {
  return Math.abs(pixel - params.mean) > lambda * params.sigma;
}

/** 模型更新：μ 与 δ² */
function updateSingleGaussian(
  pixel: number,
  params: SingleGaussianParams,
  alpha: number
): SingleGaussianParams {
  const mean = (1 - alpha) * params.mean + alpha * pixel;
  const variance =
    (1 - alpha) * params.variance +
    alpha * (pixel - params.mean) ** 2;
  return { mean, variance, sigma: Math.sqrt(variance) };
}

// ============================
// 4. 混合高斯模型
// ============================

const K = 5;       // 高斯分量个数
const T_BG = 0.7;  // 背景权重累计阈值
const D = 2.5;     // 标准差倍数（统一阈值参数）

interface GaussianComponent {
  weight: number;  // ω_i
  mean: number;    // μ_i
  sigma: number;   // δ_i
}

/**
 * 混合高斯单像素处理流程
 *
 * ① 匹配：按 ω/δ 降序，检查 |I_t - μ_i| ≤ D·δ_i
 * ② 更新：匹配分布更新 μ、δ²、ω；不匹配分布 ω 按 (1-α) 衰减
 * ③ 背景选择：B = argmin_B ( Σ_{k=1}^{B} ω_k ≥ T_BG )
 * ④ 前景判定：若当前像素与前 B 个背景分布均不匹配 → 前景
 */
function mixtureGaussianProcess(
  pixel: number,
  components: GaussianComponent[],
  alpha: number
): { isForeground: boolean; components: GaussianComponent[] } {
  // 按 ω/δ 降序排列
  const sorted = [...components].sort(
    (a, b) => b.weight / b.sigma - a.weight / a.sigma
  );
  let matched = false;
  const rho = alpha / Math.max(components[0]?.weight ?? 0.05, 0.01);

  const updated = sorted.map((comp) => {
    if (!matched && Math.abs(pixel - comp.mean) <= D * comp.sigma) {
      matched = true;
      return {
        weight: (1 - alpha) * comp.weight + alpha,
        mean: (1 - rho) * comp.mean + rho * pixel,
        sigma: Math.sqrt(
          (1 - rho) * comp.sigma ** 2 +
          rho * (pixel - comp.mean) ** 2
        ),
      };
    }
    return { ...comp, weight: (1 - alpha) * comp.weight };
  });

  if (!matched) {
    // 全不匹配 → 替换最不重要分量
    const minIdx = updated.reduce(
      (idx, c, i, arr) => (c.weight < arr[idx].weight ? i : idx), 0
    );
    updated[minIdx] = { weight: 0.05, mean: pixel, sigma: 20 / 255 };
  }

  // 权值归一化
  const totalW = updated.reduce((s, c) => s + c.weight, 0);
  const normalized = updated.map((c) => ({
    ...c,
    weight: c.weight / totalW,
  }));

  // 背景选择：按 ω/δ 排序后累计权重达阈值
  normalized.sort((a, b) => b.weight / b.sigma - a.weight / a.sigma);
  let cumWeight = 0;
  const bgCount =
    normalized.findIndex((c) => {
      cumWeight += c.weight;
      return cumWeight >= T_BG;
    }) + 1;

  // 前景检测
  const isForeground = !normalized
    .slice(0, bgCount)
    .some((c) => Math.abs(pixel - c.mean) <= D * c.sigma);

  return { isForeground, components: normalized };
}
`;

const MODEL_OPTIONS = [
  { value: 'mean', label: '均值模型' },
  { value: 'adaptive', label: '自适应背景' },
  { value: 'singleGaussian', label: '单高斯模型' },
  { value: 'mixtureGaussian', label: '混合高斯模型' },
] as const;

// ========================================
// 公式常量（链式标准格式）
// ========================================

/* 背景减除通用判定：D_t(x,y) = { 1 当 |I_t - B_t| > T; 0 其他 } */
const SUBTRACTION_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>D</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mrow><mo>{</mo><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>B</mi><mi>t</mi></msub><mo>|</mo><mo>&gt;</mo><mi>T</mi></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr></mtable></mrow></mrow>'
);

/* 自适应背景更新：B_t(x,y) = α·I_t(x,y) + (1-α)·B_{t-1}(x,y) */
const ADAPTIVE_BG_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>B</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mi>α</mi><msub><mi>I</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>+</mo>' +
  '<mo>(</mo><mn>1</mn><mo>-</mo><mi>α</mi><mo>)</mo><msub><mi>B</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>'
);

/* 单高斯概率密度函数 */
const GAUSSIAN_PDF = buildInlineMathML(
  '<mrow><mi>P</mi><mo>(</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>t</mi><mo>)</mo><mo>)</mo><mo>=</mo>' +
  '<mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><msub><mi>μ</mi><mi>t</mi></msub><mo>,</mo><msub><mi>δ</mi><mi>t</mi></msub><mo>)</mo><mo>=</mo>' +
  '<mfrac><mn>1</mn><mrow><msub><mi>δ</mi><mi>t</mi></msub><msqrt><mn>2</mn><mi>π</mi></msqrt></mrow></mfrac>' +
  '<msup><mi>e</mi><mrow><mo>-</mo><mfrac><msup><mrow><mo>(</mo><mi>x</mi><mo>-</mo><msub><mi>μ</mi><mi>t</mi></msub><mo>)</mo></mrow><mn>2</mn></msup><mrow><mn>2</mn><msubsup><mi>δ</mi><mi>t</mi><mn>2</mn></msubsup></mrow></mfrac></mrow></msup></mrow>'
);

/* 单高斯前景判定 */
const GAUSSIAN_DETECT = buildInlineMathML(
  '<mrow><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mrow><mo>{</mo><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mi>t</mi></msub><mo>|</mo><mo>&gt;</mo><mi>λ</mi><msub><mi>δ</mi><mi>t</mi></msub></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr></mtable></mrow></mrow>'
);

/* 单高斯初始化：μ_0 = I_0, δ_0 = 20 */
const GAUSSIAN_INIT = buildInlineMathML(
  '<mrow><msub><mi>μ</mi><mn>0</mn></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mn>0</mn><mo>)</mo><mo>,</mo>' +
  '<msub><mi>δ</mi><mn>0</mn></msub><mo>=</mo><mn>20</mn></mrow>'
);

/* 单高斯模型更新 */
const GAUSSIAN_UPDATE = buildInlineMathML(
  '<mrow><mtable><mtr><mtd><msub><mi>μ</mi><mi>t</mi></msub><mo>=</mo><mi>α</mi><msub><mi>μ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>+</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>α</mi><mo>)</mo><msub><mi>I</mi><mi>t</mi></msub></mtd></mtr>' +
  '<mtr><mtd><msubsup><mi>δ</mi><mi>t</mi><mn>2</mn></msubsup><mo>=</mo><mi>α</mi><msubsup><mi>δ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow><mn>2</mn></msubsup><mo>+</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>α</mi><mo>)</mo><msup><mrow><mo>(</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mi>t</mi></msub><mo>)</mo></mrow><mn>2</mn></msup></mtd></mtr></mtable></mrow>'
);

/* 混合高斯概率：P(X_t) = Σ w_i·G_i */
const MIXTURE_FORMULA = buildInlineMathML(
  '<mrow><mi>P</mi><mo>(</mo><msub><mi>X</mi><mi>t</mi></msub><mo>)</mo><mo>=</mo>' +
  '<munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>K</mi></munderover>' +
  '<msub><mi>w</mi><mrow><mi>i</mi><mo>,</mo><mi>t</mi></mrow></msub>' +
  '<mi>G</mi><mo>(</mo><msub><mi>X</mi><mi>t</mi></msub><mo>,</mo><msub><mi>μ</mi><mrow><mi>i</mi><mo>,</mo><mi>t</mi></mrow></msub><mo>,</mo><msub><mi>δ</mi><mrow><mi>i</mi><mo>,</mo><mi>t</mi></mrow></msub><mo>)</mo></mrow>'
);

/* 混合高斯匹配条件：|I_t - μ_{i,t-1}| ≤ D_1·δ_{i,t-1} */
const MIXTURE_MATCH = buildInlineMathML(
 '<mrow><mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mrow><mi>i</mi><mo>,</mo><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>|</mo>' +
 '<mo>≤</mo><mi>D</mi><msub><mi>δ</mi><mrow><mi>i</mi><mo>,</mo><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub></mrow>'
);



/* 混合高斯参数更新（权值 + 均值 + 方差）合并卡片 */
const MIXTURE_UPDATE = buildInlineMathML(
  '<mrow><mtable><mtr><mtd><mi>ω</mi><mo>=</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>α</mi><mo>)</mo><msub><mi>ω</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>+</mo><mi>α</mi></mtd></mtr>' +
  '<mtr><mtd><mi>μ</mi><mo>=</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>ρ</mi><mo>)</mo><msub><mi>μ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>+</mo><mi>ρ</mi><msub><mi>I</mi><mi>t</mi></msub></mtd></mtr>' +
  '<mtr><mtd><msup><mi>δ</mi><mn>2</mn></msup><mo>=</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>ρ</mi><mo>)</mo><msubsup><mi>δ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow><mn>2</mn></msubsup><mo>+</mo><mi>ρ</mi><msup><mrow><mo>(</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><mi>μ</mi><mo>)</mo></mrow><mn>2</mn></msup></mtd></mtr></mtable></mrow>'
);

/* 混合高斯判定与背景选择合并 */
const MIXTURE_DETECT_ALL = buildInlineMathML(
  '<mrow><mtable><mtr><mtd><mtext>背景:</mtext><mi>B</mi><mo>=</mo><munder><mrow><mo>argmin</mo></mrow><mi>B</mi></munder><mo>(</mo><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow><mi>B</mi></munderover><msub><mi>ω</mi><mi>k</mi></msub><mo>≥</mo><mi>T</mi><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>前景:</mtext><mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mi>i</mi></msub><mo>|</mo><mo>&gt;</mo><mi>D</mi><msub><mi>δ</mi><mi>i</mi></msub><mo>,</mo><mi>i</mi><mo>=</mo><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mo>⋯</mo><mo>,</mo><mi>B</mi></mtd></mtr></mtable></mrow>'
);


function grayAt(image: number[][], x: number, y: number): number {
  return Math.round((image[y]?.[x] ?? 0) * 255);
}

function countForegroundPixels(mask: number[][]): number {
  return mask.reduce(
    (total, row) => total + row.reduce((rowTotal, pixel) => rowTotal + (pixel > 0 ? 1 : 0), 0),
    0
  );
}

function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

function modelDescription(model: BackgroundModelType): string {
  switch (model) {
    case 'mean':
      return '用前 K 帧平均值近似背景，适合背景稳定且目标偶尔出现的场景。';
    case 'adaptive':
      return '用学习率 α 持续更新背景，能适应缓慢光照变化。';
    case 'singleGaussian':
      return '每个像素用一个高斯分布描述背景，依据均值和标准差 δ 判定异常像素。';
    case 'mixtureGaussian':
      return '每个像素用 K 个加权高斯分布表示多模态背景，按 ω/δ 排序后通过累计权重选择背景分布，适合树叶、水面、风扇等动态背景。';
  }
}

export default function BackgroundModelingSubtractionPage() {
  const [model, setModel] = useState<BackgroundModelType>('mean');
  const [threshold, setThreshold] = useState(58);
  const [learningRate, setLearningRate] = useState(12);
  const [currentPosition, setCurrentPosition] = useState({ x: 30, y: 14 });

  const result = useMemo(
    () => createBackgroundModel(model, threshold, learningRate),
    [learningRate, model, threshold]
  );
  const width = result.current[0]?.length || 0;
  const height = result.current.length;
  const currentStepIndex = currentPosition.y * width + currentPosition.x;

  const handleModelChange = useCallback((value: string) => {
    setModel(value as BackgroundModelType);
  }, []);

  const handleDirectionMove = useGridNavigation({
    current: currentPosition,
    bounds: { width, height },
    onMove: setCurrentPosition,
    disabled: width === 0 || height === 0,
  });

  const handlePixelSelect = useCallback((x: number, y: number) => {
    setCurrentPosition({ x, y });
  }, []);

  const currentGray = grayAt(result.current, currentPosition.x, currentPosition.y);
  const backgroundGray = grayAt(result.background, currentPosition.x, currentPosition.y);
  const diffGray = grayAt(result.difference, currentPosition.x, currentPosition.y);
  const deviationGray = grayAt(result.deviation, currentPosition.x, currentPosition.y);
  const maskValue = result.mask[currentPosition.y]?.[currentPosition.x] ?? 0;
  const selectedPixelRegion = { x: currentPosition.x, y: currentPosition.y, size: 1 };
  const foregroundCount = countForegroundPixels(result.mask);
  const totalPixels = width * height;
  const foregroundPercent = totalPixels > 0 ? (foregroundCount / totalPixels) * 100 : 0;
  const alphaValue = learningRate / 100;
  const gaussianLimit = Math.round(2.5 * deviationGray);
  const activeLimit = model === 'singleGaussian' ? gaussianLimit : threshold;
  const activeRuleText = model === 'singleGaussian'
    ? '|I-μ| > 2.5·δ'
    : '|I-B| > T';
  const activeComparisonText = model === 'singleGaussian'
    ? `|${currentGray} - ${backgroundGray}| = ${diffGray}，2.5·δ = ${gaussianLimit}`
    : `|${currentGray} - ${backgroundGray}| = ${diffGray}，T = ${threshold}`;
  const decisionText = maskValue > 0 ? '前景运动目标（D=1）' : '背景（D=0）';
  const decisionClassName = maskValue > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600';
  const mainVisual = (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-red-200 bg-white px-3 py-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-red-700">当前帧 I(t)</span>
            <span className="font-mono text-[11px] text-slate-400">{width}×{height}</span>
          </div>
          <div className="flex justify-center">
            <ImageCanvas
              image={result.current}
              maxDisplaySize={190}
              showGrid={false}
              interactive
              onRegionSelect={handlePixelSelect}
              selectedRegion={selectedPixelRegion}
              selectedRegionMarker="dot"
              containerClassName="bg-anchor-current-main"
            />
          </div>
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            I({currentPosition.x}, {currentPosition.y}) = {currentGray}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white px-3 py-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-700">背景模型 B(t)</span>
            <span className="text-[11px] text-amber-700">{MODEL_OPTIONS.find(item => item.value === model)?.label}</span>
          </div>
          <div className="flex justify-center">
            <ImageCanvas
              image={result.background}
              maxDisplaySize={190}
              showGrid={false}
              interactive
              onRegionSelect={handlePixelSelect}
              selectedRegion={selectedPixelRegion}
              selectedRegionMarker="dot"
              containerClassName="bg-anchor-background-main"
            />
          </div>
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            B({currentPosition.x}, {currentPosition.y}) = {backgroundGray}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-white px-3 py-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-sky-700">差分 |I-B|</span>
            <span className="font-mono text-[11px] text-sky-700">{diffGray}</span>
          </div>
          <div className="flex justify-center">
            <ImageCanvas
              image={result.difference}
              maxDisplaySize={190}
              showGrid={false}
              interactive
              onRegionSelect={handlePixelSelect}
              selectedRegion={selectedPixelRegion}
              selectedRegionMarker="dot"
              containerClassName="bg-anchor-difference-main"
            />
          </div>
          <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-700">
            |{currentGray} - {backgroundGray}| = {diffGray}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white px-3 py-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-700">前景掩膜 D(t)</span>
            <span className="font-mono text-[11px] text-emerald-700">{formatPercent(foregroundPercent)}</span>
          </div>
          <div className="flex justify-center">
            <ImageCanvas
              image={result.mask}
              maxDisplaySize={190}
              showGrid={false}
              interactive
              onRegionSelect={handlePixelSelect}
              highlightPixel={currentPosition}
              containerClassName="bg-anchor-mask-main"
            />
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700">
            前景 {foregroundCount} / {totalPixels} 像素，当前为 <span className={decisionClassName}>{decisionText}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:grid-cols-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">当前规则</div>
          <div className="mt-1 font-mono text-sm font-semibold text-slate-800">{activeRuleText}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">代入比较</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">{activeComparisonText}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">当前结论</div>
          <div className={`mt-1 text-sm ${decisionClassName}`}>{decisionText}</div>
        </div>
      </div>
    </div>
  );
  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red" className="max-w-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase text-red-700">读取当前像素</span>
              <span className="font-mono text-[11px] text-red-600">({currentPosition.x}, {currentPosition.y})</span>
            </div>
            <div className="rounded-xl border border-red-200 bg-white px-3 py-2">
              <div className="text-[10px] text-red-500">当前帧灰度</div>
              <div className="mt-1 font-mono text-lg font-bold text-red-700">{currentGray}</div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              当前帧只提供观测值，是否是前景要看它与长期背景模型的距离。
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="center">
          <FlowNode tone="amber" className="max-w-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase text-amber-800">读取背景模型</span>
              <span className="text-[11px] text-amber-700">{MODEL_OPTIONS.find(item => item.value === model)?.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                <div className="text-[10px] text-amber-600">背景估计</div>
                <div className="mt-1 font-mono text-lg font-bold text-amber-800">{backgroundGray}</div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                <div className="text-[10px] text-sky-600">差分</div>
                <div className="mt-1 font-mono text-lg font-bold text-sky-700">{diffGray}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">{modelDescription(model)}</p>
          </FlowNode>

          <FlowNode tone="sky" className="bg-anchor-calculation-node max-w-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase text-sky-700">差分与阈值比较</span>
              <span className="font-mono text-[11px] text-sky-700">{activeRuleText}</span>
            </div>
            <div className="rounded-xl border border-sky-200 bg-white px-3 py-3">
              <div className="font-mono text-sm font-semibold text-slate-800">
                |{currentGray} - {backgroundGray}| = {diffGray}
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-600">
                判定阈值 = {activeLimit}；{maskValue > 0 ? '差分超过阈值，写入前景。' : '差分未超过阈值，保留为背景。'}
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="end">
          <FlowNode tone="emerald" className="max-w-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase text-emerald-700">写入前景掩膜</span>
              <span className="font-mono text-[11px] text-emerald-700">D = {maskValue > 0 ? 1 : 0}</span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-3">
              <div className={`text-base ${decisionClassName}`}>{decisionText}</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">
                当前整张掩膜中共有 {foregroundCount} 个前景像素，占 {formatPercent(foregroundPercent)}。
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );
  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (width === 0 || height === 0) return [];

    return [
      {
        id: 'background-current-to-calc',
        tone: 'red',
        from: {
          kind: 'pixel',
          selector: '.bg-anchor-current-main',
          x: currentPosition.x,
          y: currentPosition.y,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.bg-anchor-calculation-node' },
      },
      {
        id: 'background-model-to-calc',
        tone: 'amber',
        from: {
          kind: 'pixel',
          selector: '.bg-anchor-background-main',
          x: currentPosition.x,
          y: currentPosition.y,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.bg-anchor-calculation-node' },
      },
      {
        id: 'background-calc-to-mask',
        tone: 'emerald',
        from: { kind: 'element', selector: '.bg-anchor-calculation-node' },
        to: {
          kind: 'pixel',
          selector: '.bg-anchor-mask-main',
          x: currentPosition.x,
          y: currentPosition.y,
          imageWidth: width,
          imageHeight: height,
        },
      },
    ];
  }, [currentPosition.x, currentPosition.y, height, width]);
  const visualOverlay = visualOverlayPaths.length > 0 ? (
    <AnchoredOverlay paths={visualOverlayPaths} />
  ) : null;
  // ========================================
  // stepDetails - 按课件顺序组织
  // ========================================
  const stepDetails = (
    <div className="space-y-6">

      {/* ----- 1. 背景减除概述 ----- */}
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">背景减除法</h2>
        <p className="text-xs leading-6 text-slate-600">
          适用于摄像机静止情形，其关键是背景建模。典型方法包括均值模型、自适应背景模型、单高斯模型和混合高斯模型。
        </p>
      </TeachingCard>

      {/* ----- 2. 均值模型 ----- */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（1）均值模型</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          前提：在前 K 帧图像中，某像素点在超过一半的时间里呈现场景背景像素值。用前 K 帧的平均值作为背景估计。
        </p>
        <figure className="mb-4">
          <img
            src="/assets/simple-background/course-mean-model.jpg"
            alt="均值模型示意图"
            className="w-full max-w-lg rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">均值模型：用前 K 帧平均值近似背景</figcaption>
        </figure>
        <FormulaCard
          label="背景减除判定"
          mathML={SUBTRACTION_FORMULA}
          note={'当前阈值 T = ' + threshold + '，当前位置差值 |I-B| = ' + diffGray + '。差值超过 T 则判为前景。'}
        />
      </div>

      {/* ----- 3. 自适应背景模型 ----- */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（2）自适应背景模型</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          用第一帧初始化背景 B₁(x,y) = I₁(x,y)，之后按学习率 α 持续更新，适应缓慢光照变化。默认 α = 0.03，T = 60。
        </p>
        <div className="mb-4 flex gap-4">
          <figure className="flex-1">
            <img
              src="/assets/simple-background/course-adaptive-current.jpg"
              alt="当前帧 k"
              className="w-full max-w-xs rounded-xl object-cover"
            />
            <figcaption className="mt-2 text-xs text-slate-500">当前帧 I<sub>k</sub></figcaption>
          </figure>
          <figure className="flex-1">
            <img
              src="/assets/simple-background/course-adaptive-previous.jpg"
              alt="前一帧背景 k-1"
              className="w-full max-w-xs rounded-xl object-cover"
            />
            <figcaption className="mt-2 text-xs text-slate-500">前一帧背景 B<sub>k-1</sub></figcaption>
          </figure>
        </div>
        <FormulaCard
          label="初始化 B₁(x,y) = I₁(x,y)，之后逐帧更新："
          mathML={ADAPTIVE_BG_FORMULA}
          note={'当前学习率 α ≈ ' + (learningRate / 100).toFixed(2) + '，α 越大则背景更新越快。'}
        />
      </div>

      {/* ----- 4. 单高斯模型 ----- */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（3）单高斯模型</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          图像中每一个像素点的颜色值作为一个随机过程，假设该点的像素值出现的概率服从高斯分布。
        </p>
        <div className="mb-4 space-y-3">
          <FormulaCard
            label="单高斯概率密度"
            mathML={GAUSSIAN_PDF}
            note={'μ_t 和 δ_t 分别为 t 时刻像素高斯分布的期望和标准差。'}
          />
          <FormulaCard
            label="前景判定"
            mathML={GAUSSIAN_DETECT}
            note={'当前位置 |I-μ| = ' + diffGray + '，若超过 λ·δ 则判为前景。λ 通常取 2.5～3。'}
          />
          <FormulaCard
            label="模型初始化"
            mathML={GAUSSIAN_INIT}
            note="第一帧初始化均值，std_init 通常设置为 20。"
          />
          <FormulaCard
            label="模型更新"
            mathML={GAUSSIAN_UPDATE}
            note="背景像素匹配后，按学习率 α 更新均值与方差。"
          />
        </div>
        <figure className="mb-4">
          <img
            src="/assets/simple-background/course-single-gaussian.jpg"
            alt="单高斯模型效果"
            className="w-full max-w-md rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">单高斯模型：像素灰度值在时间域上的高斯分布</figcaption>
        </figure>
        <TeachingCard>
          <p className="text-xs leading-6 text-slate-700">
            <span className="font-semibold text-emerald-700">优点：</span>在室内或不是很复杂的室外环境中，能达到很好的检测效果，处理速度快，分割对象比较完整。{'<br />'}
            <span className="font-semibold text-red-600">缺点：</span>对于复杂变化的背景（如树枝摇晃），噪声增多，背景模型不稳定，容易误判。
          </p>
        </TeachingCard>
      </div>
      {/* ----- 5. 混合高斯模型 ----- */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（4）混合高斯模型</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          针对复杂背景（特别是有微小重复运动的场合，如摇动的树叶、灌木丛、旋转的风扇、海面波涛等），
          采用多个单高斯函数描述场景背景，利用在线估计更新模型。
        </p>
        <TeachingCard>
          <div className="space-y-1 text-xs leading-5 text-slate-700">
            <p><span className="font-semibold">算法流程：</span></p>
            <ol className="list-inside list-decimal space-y-1 pl-2">
              <li>模型初始化 — 取第一帧像素值初始化各高斯分布的均值、权值和方差</li>
              <li>模型匹配与参数更新 — 新像素按 ω<sub>i</sub>/δ<sub>i</sub> 降序依次匹配，更新参数</li>
              <li>生成背景分布 — 按 ω/δ 排序，累计权重大于阈值的前 M 个分布作为背景</li>
              <li>检测前景 — 若当前像素与 B 个背景分布均不匹配，则判为前景</li>
            </ol>
          </div>
        </TeachingCard>
        <figure className="mb-4">
          <img
            src="/assets/simple-background/course-mixture-gaussian.jpg"
            alt="混合高斯模型流程"
            className="w-full max-w-2xl rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">混合高斯模型算法流程图</figcaption>
        </figure>
        <div className="mb-4 space-y-3">
          <FormulaCard
            label="混合高斯概率"
            mathML={MIXTURE_FORMULA}
            note={'K 个高斯分布的加权和，w_i,t 为第 i 个高斯分布的权值。'}
          />
          <FormulaCard
            label="匹配条件"
            mathML={MIXTURE_MATCH}
            note="将新像素与模型中的高斯分布依序匹配，D 为自定义参数（通常取 2.5）。"
          />
          <FormulaCard
            label="匹配时参数更新"
            mathML={MIXTURE_UPDATE}
            note={'α = ' + (learningRate / 100).toFixed(2) + ' 为学习率，ρ ≈ α/ω_i 为参数学习率。匹配分布更新 μ、δ² 与 ω；不匹配分布仅 ω 按 (1-α) 衰减。'}
          />
          <FormulaCard
            label="背景选择与前景检测"
            mathML={MIXTURE_DETECT_ALL}
            note="按 ω/δ 排序后选择累计权重大于 T 的前 B 个分布作为背景；前景检测条件 D 通常取 2.5。"
          />

      </div>
      </div>

      {/* ----- 6. 当前像素链式代入 ----- */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">当前像素代入</h2>
        <p className="mb-4 text-xs leading-6 text-slate-600">
          对当前位置 ({currentPosition.x}, {currentPosition.y}) 代入各模型公式：
        </p>
        <div className="space-y-3 text-xs leading-6">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-slate-800">当前帧像素 I(x,y)：</p>
              I({currentPosition.x}, {currentPosition.y}) = {currentGray}
         </div>
          {model === 'singleGaussian' ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="font-semibold text-slate-800">标准差 δ(x,y)：</p>
              <p className="text-slate-600">
                δ({currentPosition.x}, {currentPosition.y}) = {deviationGray}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                前景判定阈值 D·δ = 2.5 × {deviationGray} = {Math.round(2.5 * deviationGray)}，|I-B| = {diffGray}
              </p>
            </div>
          ) : null}
         <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
           <p className="font-semibold text-slate-800">背景减除差值：</p>
            <p className="text-slate-600">
              |I – B| = |{currentGray} – {backgroundGray}| = {diffGray}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-semibold text-slate-800">前景判定 D(x,y)：</p>
            <p className="text-slate-600">
              D(x,y) = {'{'} 1 当 {activeRuleText}; 0 其他 {'}'}
              &emsp;代入：{activeComparisonText}
              &emsp;结果：<span className={decisionClassName}>{decisionText}</span>
            </p>
          </div>
        </div>
      </div>
      {model === 'mixtureGaussian' ? (
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">混合高斯各分量链式代入</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            对当前位置 ({currentPosition.x}, {currentPosition.y})，灰度值 I = {currentGray}，
            各高斯分量 G<sub>i</sub> 的代入结果如下：
          </p>
          <div className="space-y-3">
            {result.mixtureComponents.map((component, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-2 font-semibold text-slate-800">
                  分量 G<sub>{index + 1}</sub> {component.background ? '（背景分布）' : '（前景候选）'}
                </div>
                <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                  <p>
                    权值公式：ω<sub>{index + 1}</sub> = {component.weight.toFixed(2)}
                  </p>
                  <p>
                    均值公式：μ<sub>{index + 1}</sub> = {Math.round(component.mean * 255)}
                    &emsp;（归一化值 {component.mean.toFixed(3)}）
                  </p>
                  <p>
                    标准差公式：δ<sub>{index + 1}</sub> = {Math.round(component.sigma * 255)}
                    &emsp;（归一化值 {component.sigma.toFixed(3)}）
                  </p>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <p className="mb-1 font-semibold text-slate-700">匹配判定链式代入：</p>
                    <p>
                      条件：|I – μ<sub>{index + 1}</sub>| ≤ D·δ<sub>{index + 1}</sub>
                    </p>
                    <p>
                      代入：|{currentGray} – {Math.round(component.mean * 255)}| = {Math.abs(currentGray - Math.round(component.mean * 255))}
                      &emsp;阈值 D·δ = 2.5 × {Math.round(component.sigma * 255)} = {Math.round(2.5 * component.sigma * 255)}
                    </p>
                    <p>
                      判定结果：
                      <span className={Math.abs(currentGray - Math.round(component.mean * 255)) <= Math.round(2.5 * component.sigma * 255) ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                        {Math.abs(currentGray - Math.round(component.mean * 255)) <= Math.round(2.5 * component.sigma * 255)
                          ? '匹配（属于该高斯分布）'
                          : '不匹配（前景候选）'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
  const parameters = (
    <div className="space-y-4">
      <SelectParam label="背景模型" value={model} onChange={handleModelChange} options={MODEL_OPTIONS} />
      {model === 'mean' ? (
        <>
          <SliderParam label="前景阈值 T" value={threshold} onChange={setThreshold} min={10} max={120} step={1} />
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
            均值模型用前 K 帧平均得到背景，不使用学习率 α；调整阈值会直接改变前景掩膜。
          </div>
        </>
      ) : null}
      {model === 'adaptive' ? (
        <>
          <SliderParam label="前景阈值 T" value={threshold} onChange={setThreshold} min={10} max={120} step={1} />
          <SliderParam label="学习率 α" value={learningRate} onChange={setLearningRate} min={1} max={40} step={1} unit="%" />
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-800">
            当前 α = {alphaValue.toFixed(2)}；α 越大，背景模型越快吸收新帧变化。
          </div>
        </>
      ) : null}
      {model === 'singleGaussian' ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-5 text-sky-800">
            单高斯演示使用 μ 和 δ 判定，不使用前景阈值 T。当前 λ 固定为 2.5。
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-slate-500">μ(x,y)</div>
              <div className="mt-1 font-mono text-base font-semibold text-slate-800">{backgroundGray}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-slate-500">2.5·δ</div>
              <div className="mt-1 font-mono text-base font-semibold text-slate-800">{gaussianLimit}</div>
            </div>
          </div>
        </div>
      ) : null}
      {model === 'mixtureGaussian' ? (
        <>
          <SliderParam label="前景阈值 T" value={threshold} onChange={setThreshold} min={10} max={120} step={1} />
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800">
            当前页用混合高斯背景图生成差分，再用 T 生成掩膜；分量权重与均值在右侧代入区展示。
          </div>
          <div className="space-y-2">
            {result.mixtureComponents.map((component, index) => (
              <div key={`param-mixture-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">G{index + 1}</span>
                  <span className={component.background ? 'text-emerald-600' : 'text-red-600'}>
                    {component.background ? '背景分量' : '前景候选'}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  ω={component.weight.toFixed(2)} / μ={Math.round(component.mean * 255)} / δ={Math.round(component.sigma * 255)}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <ConceptLayout
      title="背景建模与背景减除"
      subtitle="Background Modeling & Subtraction - 用长期背景模型提取前景"
      operationLabel="背景减除"
      parameterIntro="切换均值、自适应、单高斯与混合高斯模型，观察背景模型、差异图和前景掩膜之间的关系。"
      originalImage={result.current}
      resultImage={result.mask}
      parameters={parameters}
      mainVisual={mainVisual}
      visualOverlay={visualOverlay}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: BACKGROUND_CODE_TS }]} />}
      currentStep={{ x: currentPosition.x, y: currentPosition.y, kernelSize: 1 }}
      stepInfo={{ current: currentStepIndex, total: width * height }}
      imageLabels={{ input: '当前帧', output: '前景掩膜' }}
      imageHints={{ input: '点击像素查看背景模型差异', output: modelDescription(model) }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handlePixelSelect}
      onOutputPixelSelect={handlePixelSelect}
      navigationHintText="方向键移动 / 点击当前帧或前景掩膜定位像素"
    />
  );
}
