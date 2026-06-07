'use client';

import React, { useState } from 'react';

interface FormulaWithExplanationProps {
  formula: string;
  detailedExplanation: React.ReactNode;
}

export default function FormulaWithExplanation({
  formula,
  detailedExplanation,
}: FormulaWithExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      <div 
        className="flex items-start justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-blue-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <code className="flex-1 min-w-0 text-sm text-blue-800 font-mono leading-relaxed whitespace-normal break-all">
          {formula}
        </code>
        <button className="text-blue-600 hover:text-blue-800 shrink-0">
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      
      {isExpanded && (
        <div className="px-3 py-3 border-t border-blue-200 bg-white/50">
          <div className="text-xs text-slate-600 space-y-1">
            {detailedExplanation}
          </div>
        </div>
      )}
    </div>
  );
}

// Pre-built formula explanations for common operations
export function ConvolutionFormula({ x, y, outputValue }: { x: number; y: number; outputValue: number }) {
  return (
    <FormulaWithExplanation
      formula={`G(${x},${y}) = Σᵢ Σⱼ f(${x}+i, ${y}+j) · g(i, j) = ${outputValue.toFixed(2)}`}
      detailedExplanation={
        <>
          <p><strong>公式解读：</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><code className="bg-slate-100 px-1 rounded">G({x},{y})</code>: 结果图像在位置({x},{y})的像素值</li>
            <li><code className="bg-slate-100 px-1 rounded">f(x,y)</code>: 原图像素值</li>
            <li><code className="bg-slate-100 px-1 rounded">g(i,j)</code>: 卷积核在位置(i,j)的权重</li>
            <li><code className="bg-slate-100 px-1 rounded">Σᵢ Σⱼ</code>: 对卷积核覆盖的所有位置求和</li>
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
      formula={`G(${x},${y}) = (1/N) Σ₍ᵢ,ⱼ₎∈Ω f(i, j) = ${outputValue.toFixed(2)}`}
      detailedExplanation={
        <>
          <p><strong>均值模糊公式解读：</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><code className="bg-slate-100 px-1 rounded">Ω</code>: 卷积核覆盖的邻域区域</li>
            <li><code className="bg-slate-100 px-1 rounded">N</code>: 邻域内像素总数（核大小×核大小）</li>
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
      formula={`G(${x},${y}) = median{f(i, j) | (i,j)∈Ω} = ${outputValue.toFixed(2)}`}
      detailedExplanation={
        <>
          <p><strong>中值滤波公式解读：</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><code className="bg-slate-100 px-1 rounded">median&#123;...&#125;</code>: 取中位数运算</li>
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
      formula={`|G(${x},${y})| = √(Gx² + Gy²) = √(${gx.toFixed(1)}² + ${gy.toFixed(1)}²) = ${magnitude.toFixed(2)}`}
      detailedExplanation={
        <>
          <p><strong>Sobel边缘检测公式解读：</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><code className="bg-slate-100 px-1 rounded">Gx</code>: 水平方向梯度（Sobel X核卷积结果）</li>
            <li><code className="bg-slate-100 px-1 rounded">Gy</code>: 垂直方向梯度（Sobel Y核卷积结果）</li>
            <li>梯度幅值 = √(Gx² + Gy²)，表示边缘强度</li>
            <li>梯度方向 = arctan(Gy/Gx)，表示边缘方向</li>
          </ul>
        </>
      }
    />
  );
}

export function OtsuFormula({ threshold, variance, w0, w1, m0, m1 }: { 
  threshold: number; 
  variance: number; 
  w0: number; 
  w1: number; 
  m0: number; 
  m1: number;
}) {
  return (
    <FormulaWithExplanation
      formula={`σ²(${threshold}) = ω₀ω₁(μ₀-μ₁)² = ${variance.toFixed(2)}`}
      detailedExplanation={
        <>
          <p><strong>OTSU类间方差公式解读：</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><code className="bg-slate-100 px-1 rounded">ω₀ = ${(w0 * 100).toFixed(1)}%</code>: 背景像素占比</li>
            <li><code className="bg-slate-100 px-1 rounded">ω₁ = ${(w1 * 100).toFixed(1)}%</code>: 前景像素占比</li>
            <li><code className="bg-slate-100 px-1 rounded">μ₀ = ${m0.toFixed(1)}</code>: 背景平均灰度值</li>
            <li><code className="bg-slate-100 px-1 rounded">μ₁ = ${m1.toFixed(1)}</code>: 前景平均灰度值</li>
            <li>类间方差越大，说明前景背景区分越明显</li>
            <li>OTSU算法选择使类间方差最大的阈值作为最佳阈值</li>
          </ul>
        </>
      }
    />
  );
}
