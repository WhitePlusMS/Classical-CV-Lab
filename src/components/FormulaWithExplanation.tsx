'use client';

import React, { useId, useState } from 'react';
import { MathText, buildInlineMathML } from './teaching';

interface FormulaWithExplanationProps {
  mathML: string;
  detailedExplanation: React.ReactNode;
}

export default function FormulaWithExplanation({
  mathML,
  detailedExplanation,
}: FormulaWithExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailId = useId();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={detailId}
      >
        <MathText
          mathML={mathML}
          className="min-w-0 flex-1 [&_math]:inline-block [&_math]:max-w-full [&_math]:overflow-x-auto [&_math]:text-sm [&_math]:text-slate-800"
        />
        <span className="shrink-0 text-slate-500" aria-hidden="true">
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {isExpanded && (
        <div id={detailId} className="border-t border-slate-200 bg-white/70 px-4 py-3">
          <div className="space-y-1 text-xs text-slate-600">
            {detailedExplanation}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConvolutionFormula({ x, y, outputValue }: { x: number; y: number; outputValue: number }) {
  return (
    <FormulaWithExplanation
      mathML={buildInlineMathML(`<mrow><mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo><mo>=</mo><munderover><mo>∑</mo><mi>i</mi><mi></mi></munderover><munderover><mo>∑</mo><mi>j</mi><mi></mi></munderover><mi>f</mi><mo>(</mo><mn>${x}</mn><mo>+</mo><mi>i</mi><mo>,</mo><mn>${y}</mn><mo>+</mo><mi>j</mi><mo>)</mo><mo>·</mo><mi>g</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo><mn>${outputValue.toFixed(2)}</mn></mrow>`)}
      detailedExplanation={
        <>
          <p><strong>公式解读：</strong></p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li><code className="rounded bg-slate-100 px-1">G({x},{y})</code>: 结果图像在位置({x},{y})的像素值</li>
            <li><code className="rounded bg-slate-100 px-1">f(x,y)</code>: 原图像素值</li>
            <li><code className="rounded bg-slate-100 px-1">g(i,j)</code>: 卷积核在位置(i,j)的权重</li>
            <li><code className="rounded bg-slate-100 px-1">Σ</code>: 对卷积核覆盖的所有位置求和</li>
            <li>最终结果是原图邻域像素与卷积核权重的加权和</li>
          </ul>
        </>
      }
    />
  );
}

export function BoxBlurFormula({ x, y, outputValue }: { x: number; y: number; outputValue: number }) {
  return (
    <FormulaWithExplanation
      mathML={buildInlineMathML(`<mrow><mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mi>N</mi></mfrac><munderover><mo>∑</mo><mrow><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>∈</mo><mi>Ω</mi></mrow><mi></mi></munderover><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo><mn>${outputValue.toFixed(2)}</mn></mrow>`)}
      detailedExplanation={
        <>
          <p><strong>均值模糊公式解读：</strong></p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li><code className="rounded bg-slate-100 px-1">Ω</code>: 卷积核覆盖的邻域区域</li>
            <li><code className="rounded bg-slate-100 px-1">N</code>: 邻域内像素总数（核大小×核大小）</li>
            <li>对所有邻域像素求和后除以像素数量，得到平均值</li>
            <li>效果：平滑图像、去除噪声，但会模糊边缘</li>
          </ul>
        </>
      }
    />
  );
}

export function MedianFormula({ x, y, outputValue }: { x: number; y: number; outputValue: number }) {
  return (
    <FormulaWithExplanation
      mathML={buildInlineMathML(`<mrow><mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo><mo>=</mo><mi>median</mi><mo>{</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>|</mo><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>∈</mo><mi>Ω</mi><mo>}</mo><mo>=</mo><mn>${outputValue.toFixed(2)}</mn></mrow>`)}
      detailedExplanation={
        <>
          <p><strong>中值滤波公式解读：</strong></p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li><code className="rounded bg-slate-100 px-1">median&#123;...&#125;</code>: 取中位数运算</li>
            <li>将邻域内所有像素值排序，取中间位置的值</li>
            <li>非线性滤波，对椒盐噪声特别有效</li>
            <li>相比均值模糊，能更好地保留边缘信息</li>
          </ul>
        </>
      }
    />
  );
}

export function SobelFormula({ x, y, gx, gy, magnitude }: { x: number; y: number; gx: number; gy: number; magnitude: number }) {
  return (
    <FormulaWithExplanation
      mathML={buildInlineMathML(`<mrow><mo>|</mo><mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo><mo>|</mo><mo>=</mo><msqrt><msup><mi>Gx</mi><mn>2</mn></msup><mo>+</mo><msup><mi>Gy</mi><mn>2</mn></msup></msqrt><mo>=</mo><msqrt><msup><mn>${gx.toFixed(1)}</mn><mn>2</mn></msup><mo>+</mo><msup><mn>${gy.toFixed(1)}</mn><mn>2</mn></msup></msqrt><mo>=</mo><mn>${magnitude.toFixed(2)}</mn></mrow>`)}
      detailedExplanation={
        <>
          <p><strong>Sobel边缘检测公式解读：</strong></p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li><code className="rounded bg-slate-100 px-1">Gx</code>: 水平方向梯度（Sobel X核卷积结果）</li>
            <li><code className="rounded bg-slate-100 px-1">Gy</code>: 垂直方向梯度（Sobel Y核卷积结果）</li>
            <li>梯度幅值 = √(Gx² + Gy²)，表示边缘强度</li>
            <li>梯度方向 = arctan(Gy/Gx)，表示边缘方向</li>
          </ul>
        </>
      }
    />
  );
}

export function OtsuFormula({
  threshold,
  variance,
  w0,
  w1,
  m0,
  m1,
}: {
  threshold: number;
  variance: number;
  w0: number;
  w1: number;
  m0: number;
  m1: number;
}) {
  return (
    <FormulaWithExplanation
      mathML={buildInlineMathML(`<mrow><msubsup><mi>σ</mi><mi>b</mi><mn>2</mn></msubsup><mo>(</mo><mn>${threshold}</mn><mo>)</mo><mo>=</mo><msub><mi>ω</mi><mn>0</mn></msub><msub><mi>ω</mi><mn>1</mn></msub><msup><mrow><mo>(</mo><msub><mi>μ</mi><mn>0</mn></msub><mo>-</mo><msub><mi>μ</mi><mn>1</mn></msub><mo>)</mo></mrow><mn>2</mn></msup><mo>=</mo><mn>${variance.toFixed(2)}</mn></mrow>`)}
      detailedExplanation={
        <>
          <p><strong>OTSU类间方差公式解读：</strong></p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li><code className="rounded bg-slate-100 px-1">ω₀ = {(w0 * 100).toFixed(1)}%</code>: 背景像素占比</li>
            <li><code className="rounded bg-slate-100 px-1">ω₁ = {(w1 * 100).toFixed(1)}%</code>: 前景像素占比</li>
            <li><code className="rounded bg-slate-100 px-1">μ₀ = {m0.toFixed(1)}</code>: 背景平均灰度值</li>
            <li><code className="rounded bg-slate-100 px-1">μ₁ = {m1.toFixed(1)}</code>: 前景平均灰度值</li>
            <li>类间方差越大，说明前景背景区分越明显</li>
            <li>OTSU算法选择使类间方差最大的阈值作为最佳阈值</li>
          </ul>
        </>
      }
    />
  );
}
