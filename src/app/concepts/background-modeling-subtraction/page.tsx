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
  InlineMath,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  TeachingTerm,
  buildInlineMathML,
} from '@/components';
import {
  BackgroundModelType,
  createBackgroundTeachingSequence,
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

/** 初始化：用前 N 帧训练像素估计 μ₀、δ₀ */
function initSingleGaussian(trainingPixels: number[]): SingleGaussianParams {
  const mean = trainingPixels.reduce((sum, p) => sum + p, 0) / trainingPixels.length;
  const variance = trainingPixels.reduce((sum, p) => (p - mean) ** 2, 0) / trainingPixels.length;
  return { mean, variance, sigma: Math.sqrt(Math.max(0.0001, variance)) };
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
 * 教学说明：教学演示中的前景掩膜使用简化阈值判定 |I-B|>T；
 * 下方函数展示完整 GMM 的匹配、更新与背景选择逻辑，用于理解多分布建模思想。
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
  const matchedIndex = sorted.findIndex(c => Math.abs(pixel - c.mean) <= D * c.sigma);
  const matchedWeight = matchedIndex >= 0 ? sorted[matchedIndex].weight : 0.05;
  const rho = alpha / Math.max(matchedWeight, 0.01);
  let matched = false;

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
    updated[minIdx] = { weight: 0.05, mean: pixel, sigma: 20 };
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

/* 自适应背景更新：B_t(x,y) = α·I_t(x,y) + (1-α)·B_{t-1}(x,y) */
const ADAPTIVE_BG_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>B</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mi>α</mi><msub><mi>I</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>+</mo>' +
  '<mo>(</mo><mn>1</mn><mo>-</mo><mi>α</mi><mo>)</mo><msub><mi>B</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>'
);

/* 单高斯概率密度函数 */
const GAUSSIAN_PDF = buildInlineMathML(
  '<mrow><mi>P</mi><mo>(</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>t</mi><mo>)</mo><mo>)</mo><mo>=</mo>' +
  '<mi>G</mi><mo>(</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>t</mi><mo>)</mo><mo>;</mo><msub><mi>μ</mi><mi>t</mi></msub><mo>,</mo><msub><mi>δ</mi><mi>t</mi></msub><mo>)</mo><mo>=</mo>' +
  '<mfrac><mn>1</mn><mrow><msub><mi>δ</mi><mi>t</mi></msub><msqrt><mn>2</mn><mi>π</mi></msqrt></mrow></mfrac>' +
  '<msup><mi>e</mi><mrow><mo>-</mo><mfrac><msup><mrow><mo>(</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>t</mi><mo>)</mo><mo>-</mo><msub><mi>μ</mi><mi>t</mi></msub><mo>)</mo></mrow><mn>2</mn></msup><mrow><mn>2</mn><msubsup><mi>δ</mi><mi>t</mi><mn>2</mn></msubsup></mrow></mfrac></mrow></msup></mrow>'
);

/* 单高斯前景判定 */
const GAUSSIAN_DETECT = buildInlineMathML(
  '<mrow><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mrow><mo>{</mo><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mi>t</mi></msub><mo>|</mo><mo>&gt;</mo><mi>λ</mi><msub><mi>δ</mi><mi>t</mi></msub></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr></mtable></mrow></mrow>'
);

/* 单高斯初始化：用前 N 帧训练像素估计 μ₀、δ₀ */
const GAUSSIAN_INIT = buildInlineMathML(
  '<mrow><msub><mi>μ</mi><mn>0</mn></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mfrac><mn>1</mn><mi>N</mi></mfrac><munderover><mo>∑</mo><mrow><mi>j</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></munderover>' +
  '<msub><mi>I</mi><mi>j</mi></msub><mo>,</mo>' +
  '<msubsup><mi>δ</mi><mn>0</mn><mn>2</mn></msubsup><mo>=</mo>' +
  '<mfrac><mn>1</mn><mi>N</mi></mfrac><munderover><mo>∑</mo><mrow><mi>j</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></munderover>' +
  '<msup><mrow><mo>(</mo><msub><mi>I</mi><mi>j</mi></msub><mo>-</mo><msub><mi>μ</mi><mn>0</mn></msub><mo>)</mo></mrow><mn>2</mn></msup></mrow>'
);

/* 单高斯模型更新 */
const GAUSSIAN_UPDATE = buildInlineMathML(
  '<mrow><mtable><mtr><mtd><msub><mi>μ</mi><mi>t</mi></msub><mo>=</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>α</mi><mo>)</mo><msub><mi>μ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>+</mo><mi>α</mi><msub><mi>I</mi><mi>t</mi></msub></mtd></mtr>' +
  '<mtr><mtd><msubsup><mi>δ</mi><mi>t</mi><mn>2</mn></msubsup><mo>=</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>α</mi><mo>)</mo><msubsup><mi>δ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow><mn>2</mn></msubsup><mo>+</mo><mi>α</mi><msup><mrow><mo>(</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>)</mo></mrow><mn>2</mn></msup></mtd></mtr></mtable></mrow>'
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
  '<mtr><mtd><msup><mi>δ</mi><mn>2</mn></msup><mo>=</mo><mo>(</mo><mn>1</mn><mo>-</mo><mi>ρ</mi><mo>)</mo><msubsup><mi>δ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow><mn>2</mn></msubsup><mo>+</mo><mi>ρ</mi><msup><mrow><mo>(</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>)</mo></mrow><mn>2</mn></msup></mtd></mtr></mtable></mrow>'
);

/* 混合高斯判定与背景选择合并 */
const MIXTURE_DETECT_ALL = buildInlineMathML(
  '<mrow><mtable><mtr><mtd><mtext>背景:</mtext><mi>B</mi><mo>=</mo><munder><mrow><mo>argmin</mo></mrow><mi>B</mi></munder><mo>(</mo><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow><mi>B</mi></munderover><msub><mi>ω</mi><mi>k</mi></msub><mo>≥</mo><mi>T</mi><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>前景:</mtext><mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>μ</mi><mi>i</mi></msub><mo>|</mo><mo>&gt;</mo><mi>D</mi><msub><mi>δ</mi><mi>i</mi></msub><mo>,</mo><mi>i</mi><mo>=</mo><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mo>⋯</mo><mo>,</mo><mi>B</mi></mtd></mtr></mtable></mrow>'
);

function inlineMath(body: string): string {
  return buildInlineMathML(`<mrow>${body}</mrow>`);
}


function grayAt(image: number[][], x: number, y: number): number {
  return Math.round((image[y]?.[x] ?? 0) * 255);
}

function grayValue(value: number): number {
  return Math.round(value * 255);
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
  const [currentFrameIndex, setCurrentFrameIndex] = useState(12);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentPosition, setCurrentPosition] = useState({ x: 48, y: 42 });

  const result = useMemo(
    () => createBackgroundTeachingSequence(model, threshold, learningRate, currentFrameIndex, currentPosition),
    [currentFrameIndex, currentPosition, learningRate, model, threshold]
  );
  const width = result.current[0]?.length || 0;
  const height = result.current.length;
  const currentStepIndex = currentPosition.y * width + currentPosition.x;
  const frameCount = result.frames.length;

  useEffect(() => {
    if (!isPlaying || frameCount === 0) return;

    const timer = window.setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % frameCount);
    }, 650);

    return () => window.clearInterval(timer);
  }, [frameCount, isPlaying]);

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

  const handleFrameChange = useCallback((value: number) => {
    setIsPlaying(false);
    setCurrentFrameIndex(value);
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
  const currentPixelMath = inlineMath(`<mi>I</mi><mo>(</mo><mn>${currentPosition.x}</mn><mo>,</mo><mn>${currentPosition.y}</mn><mo>)</mo><mo>=</mo><mn>${currentGray}</mn>`);
  const deviationMath = inlineMath(`<mi>δ</mi><mo>(</mo><mn>${currentPosition.x}</mn><mo>,</mo><mn>${currentPosition.y}</mn><mo>)</mo><mo>=</mo><mn>${deviationGray}</mn>`);
  const differenceMath = inlineMath(`<mo>|</mo><mi>I</mi><mo>-</mo><mi>B</mi><mo>|</mo><mo>=</mo><mo>|</mo><mn>${currentGray}</mn><mo>-</mo><mn>${backgroundGray}</mn><mo>|</mo><mo>=</mo><mn>${diffGray}</mn>`);
  const decisionRuleMath = model === 'singleGaussian'
    ? inlineMath('<mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><mo>{</mo><mn>1</mn><mtext> 当 </mtext><mo>|</mo><mi>I</mi><mo>-</mo><mi>μ</mi><mo>|</mo><mo>&gt;</mo><mn>2.5</mn><mi>δ</mi><mo>;</mo><mn>0</mn><mtext> 其他</mtext><mo>}</mo>')
    : inlineMath('<msub><mi>D</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><mo>{</mo><mn>1</mn><mtext> 当 </mtext><mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>B</mi><mi>t</mi></msub><mo>|</mo><mo>&gt;</mo><mi>T</mi><mo>;</mo><mn>0</mn><mtext> 其他</mtext><mo>}</mo>');
  const comparisonMath = model === 'singleGaussian'
    ? inlineMath(`<mo>|</mo><mi>I</mi><mo>-</mo><mi>μ</mi><mo>|</mo><mo>=</mo><mn>${diffGray}</mn><mo>,</mo><mn>2.5</mn><mi>δ</mi><mo>=</mo><mn>${gaussianLimit}</mn>`)
    : inlineMath(`<mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>B</mi><mi>t</mi></msub><mo>|</mo><mo>=</mo><mn>${diffGray}</mn><mo>,</mo><mi>T</mi><mo>=</mo><mn>${threshold}</mn>`);
  const trainingWindowEnd = 7;
  const trainingWindowStart = 0;
  const mainVisual = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">连续帧小人运动序列</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              公共序列生成器输出 {width}×{height}、{frameCount} 帧；当前显示第 {currentFrameIndex + 1} 帧。
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
          {result.frames.map((frame, index) => (
            <button
              key={`film-${index}`}
              type="button"
              onClick={() => handleFrameChange(index)}
              className={`shrink-0 rounded-xl border px-1.5 py-1.5 transition ${
                index === currentFrameIndex
                  ? 'border-red-300 bg-red-50 shadow-sm'
                  : index >= trainingWindowStart && index <= trainingWindowEnd
                    ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <ImageCanvas
                image={frame}
                maxDisplaySize={48}
                showGrid={false}
              />
              <div className="mt-1 text-center font-mono text-[10px] text-slate-500">
                t={index + 1}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          琥珀色缩略图表示当前像素参与背景建模的历史窗口，红色缩略图表示当前正在判定的第 {currentFrameIndex + 1} 帧。
        </div>
      </div>

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
    <div className="space-y-4">
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
            <p className="mt-3 text-xs leading-5 text-slate-600">
              {modelDescription(model)}
              {model === 'adaptive' ? (
                <TeachingTerm term="学习率 α" explanation="学习率 α 决定新帧写入背景模型的速度，越大表示背景更新越快。" className="mx-1" />
              ) : model === 'singleGaussian' ? (
                <TeachingTerm term="单高斯" explanation="单高斯假设同一个像素的背景灰度围绕一个均值上下波动，用 μ 和 δ 描述。" className="mx-1" />
              ) : model === 'mixtureGaussian' ? (
                <TeachingTerm term="混合高斯" explanation="混合高斯允许一个像素在时间上有多个常见背景值，适合动态背景。" className="mx-1" />
              ) : null}
            </p>
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

      <TeachingCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">当前像素时间序列</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              观察 ({currentPosition.x}, {currentPosition.y}) 在连续帧中的观测值、背景估计和前景判定。
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            当前 t = {currentFrameIndex + 1}
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-1.5">
            {result.pixelTimeline.map(point => (
              <button
                key={`timeline-${point.frameIndex}`}
                type="button"
                onClick={() => handleFrameChange(point.frameIndex)}
                className={`flex w-9 flex-col items-center rounded-lg border px-1.5 py-2 ${
                  point.frameIndex === currentFrameIndex
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white'
                }`}
                title={`t=${point.frameIndex + 1}`}
              >
                <div className="flex h-16 items-end gap-0.5">
                  <div
                    className="w-2 rounded-t bg-red-400"
                    style={{ height: `${Math.max(3, point.current * 64)}px` }}
                  />
                  <div
                    className="w-2 rounded-t bg-amber-400"
                    style={{ height: `${Math.max(3, point.background * 64)}px` }}
                  />
                </div>
                <div className={`mt-1 h-2 w-2 rounded-full ${point.mask > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className="mt-1 font-mono text-[9px] text-slate-500">{point.frameIndex + 1}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600 md:grid-cols-3">
          <div className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
            红条 <InlineMath mathML={inlineMath('<msub><mi>I</mi><mi>t</mi></msub>')} />：当前像素观测值，当前帧为 {currentGray}。
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
            黄条 <InlineMath mathML={inlineMath('<msub><mi>B</mi><mi>t</mi></msub><mo>/</mo><msub><mi>μ</mi><mi>t</mi></msub>')} />：背景估计，当前帧为 {backgroundGray}。
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            下方圆点：红色表示该帧判为前景，绿色表示背景。
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          其中琥珀色高亮时间窗口表示当前像素参与背景建模的历史帧，红色边框表示当前正在判定的帧。
        </div>
      </TeachingCard>
    </div>
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
  const trainingFrames = result.frames.slice(0, Math.min(8, result.frames.length));
  const trainingPixelValues = trainingFrames.map(frame => grayAt(frame, currentPosition.x, currentPosition.y));
  const trainingMeanGray = trainingPixelValues.length > 0
    ? Math.round(trainingPixelValues.reduce((sum, value) => sum + value, 0) / trainingPixelValues.length)
    : 0;
  const trainingBackgroundLikeCount = trainingPixelValues.filter(value => Math.abs(value - trainingMeanGray) <= threshold).length;
  const trainingBackgroundMajority = trainingFrames.length > 0 && trainingBackgroundLikeCount > trainingFrames.length / 2;
  const previousBackgroundImage = result.backgroundHistory[Math.max(0, currentFrameIndex - 1)] ?? result.background;
  const previousBackgroundGray = grayAt(previousBackgroundImage, currentPosition.x, currentPosition.y);
  const adaptiveUpdatedGray = Math.round(alphaValue * currentGray + (1 - alphaValue) * previousBackgroundGray);
  const lowerGaussianBound = Math.max(0, backgroundGray - gaussianLimit);
  const upperGaussianBound = Math.min(255, backgroundGray + gaussianLimit);
  const sortedMixtureComponents = [...result.mixtureComponents].sort(
    (a, b) => b.weight / Math.max(0.001, b.sigma) - a.weight / Math.max(0.001, a.sigma)
  );
  const backgroundComponentCount = sortedMixtureComponents.filter(component => component.background).length;

  const renderMeanDerivation = () => (
    <div className="space-y-4">
      <TeachingCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">均值模型动态推导</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              用前 {trainingFrames.length} 帧估计当前像素的背景均值，再与第 {currentFrameIndex + 1} 帧比较。
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            K = {trainingFrames.length}
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-slate-700">前 K 帧训练序列</div>
            <div className="flex gap-2">
              {trainingFrames.map((frame, index) => (
                <div key={`mean-frame-${index}`} className="shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-2 py-2">
                  <ImageCanvas image={frame} maxDisplaySize={58} showGrid={false} highlightPixel={currentPosition} />
                  <div className="mt-1 text-center font-mono text-[10px] text-slate-500">
                    I{index + 1}={trainingPixelValues[index]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <FormulaCard
              label="均值背景估计"
              mathML={buildInlineMathML('<mrow><msub><mi>B</mi><mi>t</mi></msub><mo>=</mo><mfrac><mn>1</mn><mi>K</mi></mfrac><munderover><mo>∑</mo><mrow><mi>j</mi><mo>=</mo><mn>1</mn></mrow><mi>K</mi></munderover><msub><mi>I</mi><mi>j</mi></msub></mrow>')}
              tone="embedded"
              note={'当前像素训练均值 = ' + trainingMeanGray + '，背景图中 B = ' + backgroundGray + '。'}
            />
            <div className="grid gap-2 text-xs leading-5 text-slate-700 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                <div className="font-semibold text-amber-800">前提假设</div>
                <div className="mt-1">
                  前 K 帧中该像素多数时间应呈现背景值。当前统计：{trainingBackgroundLikeCount}/{trainingFrames.length} 帧接近均值，
                  <span className={trainingBackgroundMajority ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
                    {trainingBackgroundMajority ? '满足' : '不满足'}
                  </span>
                  多数背景假设。
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-800">历史帧与当前帧分工</div>
                <div className="mt-1">历史帧只用于估计 B，当前帧 <InlineMath mathML={inlineMath('<msub><mi>I</mi><mi>t</mi></msub>')} /> 只用于和 B 做差分判定。</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-800">常用参数</div>
                <div className="mt-1">教材示例常用 T=58、K=3；此处 T 可调，K 固定为 {trainingFrames.length} 帧以增强连续序列稳定性。</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-700">
              <div className="font-semibold text-slate-800">当前帧判定</div>
              <div className="mt-1">
                <InlineMath mathML={inlineMath(`<mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>-</mo><msub><mi>B</mi><mi>t</mi></msub><mo>|</mo><mo>=</mo><mo>|</mo><mn>${currentGray}</mn><mo>-</mo><mn>${backgroundGray}</mn><mo>|</mo><mo>=</mo><mn>${diffGray}</mn>`)} />，
                T = {threshold}，结果：
                <span className={decisionClassName}> {decisionText}</span>
              </div>
            </div>
          </div>
        </div>
      </TeachingCard>
    </div>
  );

  const renderAdaptiveDerivation = () => (
    <div className="space-y-4">
      <TeachingCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">自适应背景动态推导</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              当前位置使用当前帧和上一背景递推更新，α 直接控制背景吸收运动目标的速度。
            </p>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            α = {alphaValue.toFixed(2)}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-red-700">当前帧 <InlineMath mathML={inlineMath('<msub><mi>I</mi><mi>t</mi></msub>')} /></div>
            <ImageCanvas image={result.current} maxDisplaySize={150} showGrid={false} highlightPixel={currentPosition} />
            <div className="mt-2 font-mono text-sm font-semibold text-red-700">I = {currentGray}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-amber-700">上一背景 <InlineMath mathML={inlineMath('<msub><mi>B</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub>')} /></div>
            <ImageCanvas image={previousBackgroundImage} maxDisplaySize={150} showGrid={false} highlightPixel={currentPosition} />
            <div className="mt-2 font-mono text-sm font-semibold text-amber-800"><InlineMath mathML={inlineMath(`<msub><mi>B</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>=</mo><mn>${previousBackgroundGray}</mn>`)} /></div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-emerald-700">更新后背景</div>
            <ImageCanvas image={result.background} maxDisplaySize={150} showGrid={false} highlightPixel={currentPosition} />
            <div className="mt-2 font-mono text-sm font-semibold text-emerald-700"><InlineMath mathML={inlineMath(`<msub><mi>B</mi><mi>t</mi></msub><mo>≈</mo><mn>${adaptiveUpdatedGray}</mn>`)} /></div>
          </div>
        </div>
        <FormulaCard
          label="递推代入"
          mathML={ADAPTIVE_BG_FORMULA}
          tone="embedded"
          note={'代入当前像素：' + alphaValue.toFixed(2) + ' × ' + currentGray + ' + ' + (1 - alphaValue).toFixed(2) + ' × ' + previousBackgroundGray + ' ≈ ' + adaptiveUpdatedGray + '。'}
        />
        <div className="mt-3 grid gap-3 text-xs leading-5 text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="font-semibold text-slate-800">初始化</div>
            <div className="mt-1">第一帧可直接作为初始背景：<InlineMath mathML={inlineMath('<msub><mi>B</mi><mn>1</mn></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><msub><mi>I</mi><mn>1</mn></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>')} />。</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="font-semibold text-blue-800">两项加权</div>
            <div className="mt-1">当前帧贡献 α，上一背景贡献 1-α；α 越大，运动目标越快被吸收到背景。</div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <div className="font-semibold text-amber-800">递推闭环</div>
            <div className="mt-1">本轮更新后的 <InlineMath mathML={inlineMath('<msub><mi>B</mi><mi>t</mi></msub>')} /> 会在下一帧成为 <InlineMath mathML={inlineMath('<msub><mi>B</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub>')} />，这就是“前一背景 = 当前背景”的含义。</div>
          </div>
        </div>
      </TeachingCard>
    </div>
  );

  const renderSingleGaussianDerivation = () => (
    <div className="space-y-4">
      <TeachingCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">单高斯模型动态推导</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              当前像素用一个高斯分布描述背景，重点看 <InlineMath mathML={inlineMath('<msub><mi>I</mi><mi>t</mi></msub>')} /> 是否落在 <InlineMath mathML={inlineMath('<mi>μ</mi><mo>±</mo><mn>2.5</mn><mi>δ</mi>')} /> 区间内。
            </p>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
            μ={backgroundGray} / δ={deviationGray}
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-3 text-xs font-semibold text-slate-700">像素时间序列与匹配区间</div>
            <div className="flex h-32 items-end gap-1 overflow-x-auto border-b border-slate-200 pb-2">
              {result.pixelTimeline.map(point => (
                <button
                  key={`gaussian-point-${point.frameIndex}`}
                  type="button"
                  onClick={() => handleFrameChange(point.frameIndex)}
                  className={`flex w-7 shrink-0 flex-col items-center gap-1 rounded-md border px-1 py-1 ${
                    point.frameIndex === currentFrameIndex ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div
                    className="w-2 rounded-t bg-red-400"
                    style={{ height: `${Math.max(4, point.current * 88)}px` }}
                  />
                  <div className={`h-1.5 w-1.5 rounded-full ${point.mask > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600 md:grid-cols-3">
              <div className="rounded-xl bg-sky-50 px-3 py-2">下界 μ - 2.5δ = {lowerGaussianBound}</div>
              <div className="rounded-xl bg-sky-50 px-3 py-2">当前 <InlineMath mathML={inlineMath('<msub><mi>I</mi><mi>t</mi></msub>')} /> = {currentGray}</div>
              <div className="rounded-xl bg-sky-50 px-3 py-2">上界 μ + 2.5δ = {upperGaussianBound}</div>
            </div>
          </div>
          <div className="space-y-3">
            <FormulaCard
              label="像素时间分布"
              mathML={GAUSSIAN_PDF}
              tone="embedded"
              note="每个像素的时间灰度值可看作随机过程，背景值集中在高斯分布的均值附近；δ 表示标准差，部分教材记作 σ。"
            />
            <FormulaCard
              label="模型初始化"
              mathML={GAUSSIAN_INIT}
              tone="embedded"
              note="用前 N 帧训练像素初始化均值 μ 和标准差 δ。"
            />
            <FormulaCard
              label="单高斯前景判定"
              mathML={GAUSSIAN_DETECT}
              tone="embedded"
              note={'当前 |I-μ| = ' + diffGray + '，2.5δ = ' + gaussianLimit + '，结果：' + decisionText + '。'}
            />
            <FormulaCard
              label="单高斯模型更新"
              mathML={GAUSSIAN_UPDATE}
              tone="embedded"
              note={'α = ' + alphaValue.toFixed(2) + '，当前 μ = ' + backgroundGray + '，δ = ' + deviationGray + '。'}
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 text-xs leading-5 text-slate-700 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
            <div className="font-semibold text-emerald-800">适合场景</div>
            <div className="mt-1">室内或变化较小的室外环境，背景灰度围绕一个稳定中心波动，分割目标通常较完整。</div>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
            <div className="font-semibold text-red-700">局限</div>
            <div className="mt-1">树枝摇晃、水面反光等复杂背景会形成多个稳定取值，一个高斯峰不足以描述。</div>
          </div>
        </div>
      </TeachingCard>
    </div>
  );

  const renderMixtureGaussianDerivation = () => (
    <div className="space-y-4">
      <TeachingCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">混合高斯模型动态流程</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              不再使用静态“流程图”截图；这里直接用当前像素和当前分量展示匹配、排序、背景选择和前景判定。
              以下分量是为教学演示预设的，用于展示匹配、排序与背景选择规则，并非由在线迭代真实生成。
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            当前 I = {currentGray}
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-red-700">1. 匹配分量</div>
            <div className="space-y-2 text-xs leading-5">
              {sortedMixtureComponents.map((component, index) => {
                const meanGray = grayValue(component.mean);
                const sigmaGray = Math.max(1, grayValue(component.sigma));
                const distance = Math.abs(currentGray - meanGray);
                const limit = Math.round(2.5 * sigmaGray);
                const matched = distance <= limit;
                return (
                  <div key={`match-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span>G{index + 1}: |{currentGray}-{meanGray}|={distance}</span>
                      <span className={matched ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                        {matched ? '匹配' : '不匹配'}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-500">阈值 2.5δ = {limit}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-amber-700">2. 更新参数</div>
            <div className="space-y-2 text-xs leading-5 text-slate-700">
              <div className="rounded-xl bg-amber-50 px-3 py-2">匹配分量：ω、μ、δ² 按 α 更新</div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">未匹配分量：ω 按 (1-α) 衰减</div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">当前 α = {alphaValue.toFixed(2)}</div>
            </div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-sky-700">3. 按 <InlineMath mathML={inlineMath('<mi>ω</mi><mo>/</mo><mi>δ</mi>')} /> 排序</div>
            <div className="space-y-2 text-xs leading-5">
              {sortedMixtureComponents.map((component, index) => (
                <div key={`sort-${index}`} className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                  G{index + 1}: <InlineMath mathML={inlineMath(`<mi>ω</mi><mo>/</mo><mi>δ</mi><mo>=</mo><mn>${(component.weight / Math.max(0.001, component.sigma)).toFixed(2)}</mn>`)} />
                  <span className={component.background ? 'ml-2 font-semibold text-emerald-700' : 'ml-2 font-semibold text-red-600'}>
                    {component.background ? '背景' : '前景候选'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-emerald-700">4. 输出判定</div>
            <div className="rounded-xl bg-emerald-50 px-3 py-3 text-xs leading-6 text-slate-700">
              当前像素与背景模型差分为 {diffGray}，阈值 T = {threshold}。
              <div className={`mt-2 text-sm ${decisionClassName}`}>{decisionText}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 text-xs leading-5 text-slate-700 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="font-semibold text-emerald-800">多峰分布含义</div>
            <div className="mt-2">
              曲线表达的是同一个像素在时间上可能有多个常见灰度峰。当前有 {sortedMixtureComponents.length} 个分量，
              其中 {backgroundComponentCount} 个被标记为背景分量。
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {sortedMixtureComponents.map((component, index) => (
                <div key={`mixture-peak-${index}`} className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                  <div className="font-semibold text-slate-800">G{index + 1}</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">
                    ω={component.weight.toFixed(2)} / μ={grayValue(component.mean)} / δ={grayValue(component.sigma)}
                  </div>
                  <div className={component.background ? 'mt-1 font-semibold text-emerald-700' : 'mt-1 font-semibold text-red-600'}>
                    {component.background ? '背景峰' : '前景候选'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="font-semibold text-slate-800">适合场景</div>
            <div className="mt-2">
              摇动树叶、灌木、旋转风扇、海面波纹等动态背景，单高斯会把正常波动误判为前景，混合高斯用多个背景峰吸收这些重复变化。
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <FormulaCard
            label="混合高斯概率"
            mathML={MIXTURE_FORMULA}
            tone="embedded"
            note="多个高斯分量共同描述同一个像素在时间上的多模态背景。"
          />
          <FormulaCard
            label="匹配条件"
            mathML={MIXTURE_MATCH}
            tone="embedded"
            note="新像素先与各分量比较，距离落在 D·δ 范围内才认为匹配。"
          />
          <FormulaCard
            label="匹配后的参数更新"
            mathML={MIXTURE_UPDATE}
            tone="embedded"
            note={'匹配分量按 α 或 ρ 更新；当前 α = ' + alphaValue.toFixed(2) + '。'}
          />
          <FormulaCard
            label="背景选择与前景检测"
            mathML={MIXTURE_DETECT_ALL}
            tone="embedded"
            note={<><InlineMath mathML={inlineMath('<mi>ω</mi><mo>/</mo><mi>δ</mi>')} /> 排序后，累计权重大于阈值的分量视为背景分布。</>}
          />
        </div>
      </TeachingCard>
    </div>
  );

  const activeDerivation = (() => {
    switch (model) {
      case 'mean':
        return renderMeanDerivation();
      case 'adaptive':
        return renderAdaptiveDerivation();
      case 'singleGaussian':
        return renderSingleGaussianDerivation();
      case 'mixtureGaussian':
        return renderMixtureGaussianDerivation();
    }
  })();
  // ========================================
  // stepDetails - 当前模型动态推导
  // ========================================
  const stepDetails = (
    <div className="space-y-6">
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">背景减除法</h2>
        <p className="text-xs leading-6 text-slate-600">
          下面使用连续帧小人运动序列讲解背景建模：先建立长期背景，再比较当前帧与背景模型，差异超过判定条件的位置输出为前景。
        </p>
      </TeachingCard>

      {activeDerivation}

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">当前像素总结</h2>
        <p className="mb-4 text-xs leading-6 text-slate-600">
          对当前位置 ({currentPosition.x}, {currentPosition.y}) 和第 {currentFrameIndex + 1} 帧做统一代入。
        </p>
        <div className="space-y-3 text-xs leading-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-semibold text-slate-800">当前帧像素：</p>
            <div className="mt-1 text-slate-700">
              <InlineMath mathML={currentPixelMath} />
            </div>
         </div>
          {model === 'singleGaussian' ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-800">标准差：</p>
              <div className="mt-1 text-slate-700">
                <InlineMath mathML={deviationMath} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                前景判定阈值 <InlineMath mathML={inlineMath(`<mi>D</mi><mo>·</mo><mi>δ</mi><mo>=</mo><mn>2.5</mn><mo>×</mo><mn>${deviationGray}</mn><mo>=</mo><mn>${Math.round(2.5 * deviationGray)}</mn>`)} />，<InlineMath mathML={inlineMath(`<mo>|</mo><mi>I</mi><mo>-</mo><mi>B</mi><mo>|</mo><mo>=</mo><mn>${diffGray}</mn>`)} />
              </p>
            </div>
          ) : null}
         <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
           <p className="font-semibold text-slate-800">背景减除差值：</p>
            <div className="mt-1 text-slate-700">
              <InlineMath mathML={differenceMath} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-semibold text-slate-800">前景判定 D(x,y)：</p>
            <div className="mt-1 text-slate-700">
              <InlineMath mathML={decisionRuleMath} />
            </div>
            <p className="mt-1 text-slate-600">
              代入：<InlineMath mathML={comparisonMath} />
              <span className="mx-2">，</span>
              结果：<span className={decisionClassName}>{decisionText}</span>
            </p>
          </div>
        </div>
      </TeachingCard>
    </div>
  );
  const parameters = (
    <div className="space-y-4">
      <SelectParam label="背景模型" value={model} onChange={handleModelChange} options={MODEL_OPTIONS} />
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
          value={currentFrameIndex + 1}
          onChange={value => handleFrameChange(value - 1)}
          min={1}
          max={Math.max(1, frameCount)}
          step={1}
        />
      </div>
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
          <SliderParam label="学习率 α" value={learningRate} onChange={setLearningRate} min={1} max={40} step={1} unit="%" />
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-5 text-sky-800">
            单高斯演示使用 μ 和 δ 判定，不使用前景阈值 T。α 控制 μ/δ 的逐帧更新速度，λ 固定为 2.5。
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2">
              <div className="text-slate-500">μ(x,y)</div>
              <div className="mt-1 font-mono text-base font-semibold text-slate-800">{backgroundGray}</div>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2">
              <div className="text-slate-500">2.5·δ</div>
              <div className="mt-1 font-mono text-base font-semibold text-slate-800">{gaussianLimit}</div>
            </div>
          </div>
        </div>
      ) : null}
      {model === 'mixtureGaussian' ? (
        <>
          <SliderParam label="前景阈值 T" value={threshold} onChange={setThreshold} min={10} max={120} step={1} />
          <SliderParam label="学习率 α" value={learningRate} onChange={setLearningRate} min={1} max={40} step={1} unit="%" />
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800">
            混合高斯教学版按连续帧更新背景分量；T 控制掩膜，α 控制分量吸收新像素的速度。
            教学演示中的前景掩膜使用简化阈值判定 |I-B|&gt;T；右侧代码展示完整 GMM 匹配/更新/背景选择逻辑。
            当前 α = {alphaValue.toFixed(2)}，为稳定性实际更新速率已缩放为 {(alphaValue * 0.55).toFixed(3)}。
            当前匹配到的
            <TeachingTerm term="匹配分量" explanation="匹配分量就是当前像素落入阈值范围内的那一个高斯分布，它会优先被更新。" className="mx-1" />
            会在下方动态流程中直接显示。
          </div>
          <div className="space-y-2">
            {result.mixtureComponents.map((component, index) => (
              <div key={`param-mixture-${index}`} className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs">
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
