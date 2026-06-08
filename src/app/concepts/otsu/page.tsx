'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ConceptLayout, CodeViewer, SliderParam, OtsuFormula } from '@/components';
import { otsuThreshold, otsuSteps } from '@/lib/algorithms/threshold';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';

const OTSU_CODE_TS = `function otsuThreshold(image: number[][]): { threshold: number; binary: number[][] } {
  // 1. 计算直方图
  const histogram = new Array(256).fill(0);
  const totalPixels = image.length * image[0].length;
  
  for (const row of image) {
    for (const pixel of row) {
      histogram[Math.floor(pixel * 255)]++;
    }
  }
  
  // 2. 遍历所有可能的阈值，计算类间方差
  let maxVariance = 0;
  let bestThreshold = 0;
  
  for (let t = 0; t < 256; t++) {
    // 计算前景和背景的像素数、均值
    let w0 = 0, w1 = 0, sum0 = 0, sum1 = 0;
    
    for (let i = 0; i < 256; i++) {
      if (i < t) {
        w0 += histogram[i];
        sum0 += i * histogram[i];
      } else {
        w1 += histogram[i];
        sum1 += i * histogram[i];
      }
    }
    
    if (w0 === 0 || w1 === 0) continue;
    
    const m0 = sum0 / w0;
    const m1 = sum1 / w1;
    const variance = (w0 * w1 * (m0 - m1) ** 2) / (totalPixels ** 2);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }
  
  // 3. 应用阈值分割
  const binary = image.map(row =>
    row.map(pixel => (pixel > bestThreshold / 255 ? 1 : 0))
  );
  
  return { threshold: bestThreshold, binary };
}`;

interface OtsuStep {
  currentThreshold: number;
  variance: number;
  isMax: boolean;
  wB: number;
  wF: number;
  mB: number;
  mF: number;
}

export default function OtsuPage() {
  const [imageType, setImageType] = useState<SampleImageType>('lena');
  const [useOtsu, setUseOtsu] = useState(true);
  const [manualThreshold, setManualThreshold] = useState(128);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const lenaImage = useLenaGrayscaleImage(96);
  const originalImage = useMemo(() => {
    if (imageType === 'lena' && lenaImage) return lenaImage;
    return sampleImages[imageType].image;
  }, [imageType, lenaImage]);

  const otsuResult = useMemo(() => otsuThreshold(originalImage), [originalImage]);
  const bestThreshold = useMemo(
    () => Math.round(otsuResult.threshold * 255),
    [otsuResult.threshold]
  );

  const resultImage = useMemo(() => {
    if (useOtsu) {
      return otsuResult.image;
    }

    return originalImage.map(row =>
      row.map(pixel => (pixel > manualThreshold / 255 ? 1 : 0))
    );
  }, [manualThreshold, originalImage, otsuResult.image, useOtsu]);

  const steps = useMemo(() => {
    if (!useOtsu) return [];
    const generator = otsuSteps(originalImage);
    return Array.from(generator as Generator<OtsuStep>);
  }, [originalImage, useOtsu]);

  const currentStep = steps[currentStepIndex];

  // Direction movement for OTSU - move between thresholds
  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!useOtsu || steps.length === 0) return;
    
    switch (direction) {
      case 'left':
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
        break;
      case 'right':
        setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1));
        break;
      case 'up':
        setCurrentStepIndex(prev => Math.max(0, prev - 10));
        break;
      case 'down':
        setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 10));
        break;
    }
  }, [useOtsu, steps.length]);

  const handleImageTypeChange = useCallback((value: SampleImageType) => {
    setImageType(value);
    setCurrentStepIndex(0);
  }, []);

  const handleModeChange = useCallback((nextUseOtsu: boolean) => {
    setUseOtsu(nextUseOtsu);
    if (!nextUseOtsu) {
      setManualThreshold(bestThreshold);
    }
    setCurrentStepIndex(0);
  }, [bestThreshold]);

  const handleManualThresholdChange = useCallback((value: number) => {
    setManualThreshold(value);
    setCurrentStepIndex(0);
  }, []);

  const histogram = useMemo(() => {
    if (!originalImage) return [];
    const hist = new Array(256).fill(0);
    for (const row of originalImage) {
      for (const pixel of row) {
        hist[Math.floor(pixel * 255)]++;
      }
    }
    return hist;
  }, [originalImage]);

  const stepDetails = useMemo(() => {
    if (!useOtsu) {
      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p>
              <strong className="text-slate-800">固定阈值分割：</strong>
              使用手动设置的阈值 {manualThreshold} 进行二值化。
              像素值大于 {manualThreshold} 设为白色(1)，否则为黑色(0)。
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-24 flex items-end gap-px">
              {histogram.slice(0, 100).map((count, i) => (
                <div
                  key={i}
                  className={`flex-1 ${i < manualThreshold / 2.56 ? 'bg-slate-300' : 'bg-blue-400'}`}
                  style={{ height: `${Math.min(100, count / 10)}%` }}
                />
              ))}
            </div>            
            <div className="w-32">
              <div className="text-xs text-slate-500 mb-1">当前阈值</div>
              <div className="text-2xl font-bold text-blue-600">{manualThreshold}</div>
            </div>
          </div>
        </div>
      );
    }

    if (!currentStep) {
      return <div className="text-center text-slate-400 py-8">加载中...</div>;
    }

    const { currentThreshold: threshold, variance, isMax: isBest, wB: w0, wF: w1, mB: m0, mF: m1 } = currentStep;
    const totalPixels = w0 + w1;

    return (
      <div className="space-y-4">
        {/* Explanation */}
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="mb-2">
            <strong className="text-slate-800">OTSU算法步骤说明：</strong>
            测试阈值 <code className="bg-white px-1 rounded border">T = {threshold}</code>
            {isBest && <span className="text-emerald-600 font-medium ml-2">(最佳阈值)</span>}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs ml-1">
            <li>将像素分为两类：背景(灰度&lt;T)和前景(灰度≥T)</li>
            <li>计算两类像素的比例 ω₀, ω₁ 和平均灰度 μ₀, μ₁</li>
            <li>计算类间方差 σ² = ω₀ω₁(μ₀-μ₁)²</li>
            <li>选择使类间方差最大的阈值作为最佳阈值</li>
          </ol>
        </div>

        {/* Histogram with threshold line */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-28 flex items-end gap-px relative bg-slate-50 rounded border border-slate-100 p-2">
            {histogram.map((count, i) => (
              <div
                key={i}
                className={`flex-1 ${
                  i < threshold ? 'bg-slate-300' : 'bg-blue-400'
                } ${i === threshold ? 'bg-red-500' : ''}`}
                style={{ height: `${Math.min(100, Math.log(count + 1) * 8)}%` }}
              />
            ))}
            <div 
              className="absolute top-2 bottom-2 w-0.5 bg-red-500"
              style={{ left: `${(threshold / 256) * 100}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-red-600 font-medium whitespace-nowrap">
                T={threshold}
              </div>
            </div>
          </div>

          <div className="w-40 space-y-2 shrink-0">
            <div className={`p-3 rounded-lg border ${isBest ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] text-slate-500 mb-1">类间方差 σ²</div>
              <div className={`text-xl font-bold ${isBest ? 'text-emerald-700' : 'text-slate-700'}`}>
                {variance.toFixed(2)}
              </div>
              {isBest && <div className="text-[10px] text-emerald-600 mt-0.5">最大值</div>}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-medium text-slate-500 mb-2">背景 (灰度 &lt; {threshold})</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-slate-400">像素占比 ω₀</div>
                <div className="text-sm font-mono font-medium">{((w0 / totalPixels) * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">平均灰度 μ₀</div>
                <div className="text-sm font-mono font-medium">{m0.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-medium text-blue-600 mb-2">前景 (灰度 ≥ {threshold})</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-blue-400">像素占比 ω₁</div>
                <div className="text-sm font-mono font-medium text-blue-700">{((w1 / totalPixels) * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-blue-400">平均灰度 μ₁</div>
                <div className="text-sm font-mono font-medium text-blue-700">{m1.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Formula */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-500 mb-2">数学公式</div>
          <OtsuFormula 
            threshold={threshold} 
            variance={variance} 
            w0={w0 / totalPixels} 
            w1={w1 / totalPixels} 
            m0={m0} 
            m1={m1} 
          />
        </div>
      </div>
    );
  }, [currentStep, useOtsu, manualThreshold, histogram]);

  const parameters = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">示例图像</label>
        <select
          value={imageType}
          onChange={e => handleImageTypeChange(e.target.value as SampleImageType)}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
        >
          {Object.entries(sampleImages).map(([key, { name }]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">阈值方法</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange(true)}
            className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
              useOtsu 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            OTSU自动
          </button>
          <button
            onClick={() => handleModeChange(false)}
            className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
              !useOtsu 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            手动设置
          </button>
        </div>
      </div>

      {!useOtsu ? (
        <SliderParam
          label="阈值"
          value={manualThreshold}
          onChange={handleManualThresholdChange}
          min={0}
          max={255}
          step={1}
        />
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
          <div className="text-xs text-emerald-600 mb-1">自动计算的最佳阈值</div>
          <div className="text-2xl font-bold text-emerald-700">{bestThreshold}</div>
        </div>
      )}
    </div>
  );

  return (
    <ConceptLayout
      title="OTSU阈值分割"
      subtitle="自动计算最佳分割阈值"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: OTSU_CODE_TS }]} />}
      currentStep={null}
      stepInfo={useOtsu && steps.length > 0 ? { current: currentStepIndex, total: steps.length } : null}
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
    />
  );
}
