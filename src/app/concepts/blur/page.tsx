'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ConceptLayout, CodeViewer, SliderParam, SelectParam, BoxBlurFormula, MedianFormula } from '@/components';
import {
  boxBlur,
  gaussianBlur,
  medianFilter,
  boxBlurSteps,
  gaussianBlurSteps,
  medianFilterSteps,
} from '@/lib/algorithms/blur';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';

const BOX_BLUR_CODE_TS = `function boxBlur(image: number[][], kernelSize: number): number[][] {
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          sum += image[py][px];
          count++;
        }
      }
      result[y][x] = sum / count;
    }
  }
  return result;
}`;

const GAUSSIAN_BLUR_CODE_TS = `function gaussianBlur(image: number[][], kernelSize: number, sigma: number): number[][] {
  const half = Math.floor(kernelSize / 2);
  const kernel = createGaussianKernel(kernelSize, sigma);
  return convolve(image, kernel);
}`;

const MEDIAN_CODE_TS = `function medianFilter(image: number[][], kernelSize: number): number[][] {
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values = [];
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          values.push(image[py][px]);
        }
      }
      values.sort((a, b) => a - b);
      result[y][x] = values[Math.floor(values.length / 2)];
    }
  }
  return result;
}`;

type BlurMethod = 'box' | 'gaussian' | 'median';

interface BlurStep {
  x: number;
  y: number;
  inputRegion: number[][];
  kernel: number[][];
  outputValue: number;
  operation: string;
  description: string;
}

export default function BlurPage() {
  const [imageType, setImageType] = useState<SampleImageType>('lena');
  const [method, setMethod] = useState<BlurMethod>('box');
  const [kernelSize, setKernelSize] = useState(3);
  const [sigma, setSigma] = useState(1.0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const originalImage = sampleImages[imageType].image;

  const resultImage = useMemo(() => {
    switch (method) {
      case 'box':
        return boxBlur(originalImage, kernelSize);
      case 'gaussian':
        return gaussianBlur(originalImage, kernelSize, sigma);
      case 'median':
        return medianFilter(originalImage, kernelSize);
    }
  }, [originalImage, method, kernelSize, sigma]);

  const steps = useMemo(() => {
    let generator;
    switch (method) {
      case 'box':
        generator = boxBlurSteps(originalImage, kernelSize);
        break;
      case 'gaussian':
        generator = gaussianBlurSteps(originalImage, kernelSize, sigma);
        break;
      case 'median':
        generator = medianFilterSteps(originalImage, kernelSize);
        break;
    }

    return Array.from(generator as Generator<BlurStep>);
  }, [originalImage, method, kernelSize, sigma]);

  const currentStep = steps[currentStepIndex];

  // Direction movement
  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!currentStep || !originalImage || steps.length === 0) return;
    
    const width = originalImage[0].length;
    const height = originalImage.length;
    
    let newX = currentStep.x;
    let newY = currentStep.y;
    
    switch (direction) {
      case 'up':
        newY = Math.max(0, currentStep.y - 1);
        break;
      case 'down':
        newY = Math.min(height - 1, currentStep.y + 1);
        break;
      case 'left':
        newX = Math.max(0, currentStep.x - 1);
        break;
      case 'right':
        newX = Math.min(width - 1, currentStep.x + 1);
        break;
    }
    
    const newIndex = steps.findIndex(s => s.x === newX && s.y === newY);
    if (newIndex !== -1) {
      setCurrentStepIndex(newIndex);
    }
  }, [currentStep, originalImage, steps]);

  const handleImageTypeChange = useCallback((value: SampleImageType) => {
    setImageType(value);
    setCurrentStepIndex(0);
  }, []);

  const handleMethodChange = useCallback((value: BlurMethod) => {
    setMethod(value);
    setCurrentStepIndex(0);
  }, []);

  const handleKernelSizeChange = useCallback((value: number) => {
    setKernelSize(value);
    setCurrentStepIndex(0);
  }, []);

  const handleSigmaChange = useCallback((value: number) => {
    setSigma(value);
    setCurrentStepIndex(0);
  }, []);

  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return (
        <div className="text-center text-slate-400 py-8">
          加载中...
        </div>
      );
    }

    const { x, y, inputRegion, kernel, outputValue, operation } = currentStep;
    const isMedian = operation === 'median';
    const isBox = operation === 'box';
    const sortedValues = isMedian ? [...inputRegion.flat()].sort((a, b) => a - b) : [];
    const medianIdx = Math.floor(sortedValues.length / 2);

    return (
      <div className="space-y-4">
        {/* Explanation */}
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="mb-2">
            <strong className="text-slate-800">步骤说明：</strong>
            {isMedian ? '中值滤波' : isBox ? '均值模糊' : '高斯模糊'} - 计算位置 <code className="bg-white px-1 rounded border">({x}, {y})</code> 的像素值
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs ml-1">
            <li>在原图上以 <code>({x}, {y})</code> 为中心，取 {kernelSize}×{kernelSize} 邻域</li>
            {isMedian ? (
              <>
                <li>将邻域内所有像素值排序</li>
                <li>取中间位置的值作为结果</li>
              </>
            ) : isBox ? (
              <>
                <li>将所有邻域像素值相加</li>
                <li>除以像素总数 {kernelSize * kernelSize}，得到平均值</li>
              </>
            ) : (
              <>
                <li>每个像素值乘以对应的高斯权重</li>
                <li>将所有加权值相加，得到结果</li>
              </>
            )}
          </ol>
        </div>

        {/* Calculation Grid */}
        <div className="flex items-start gap-4 overflow-x-auto pb-2">
          {/* Input Region */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">输入邻域</div>
            <div 
              className="inline-grid gap-1"
              style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
            >
              {inputRegion.map((row, ry) =>
                row.map((val, rx) => (
                  <div
                    key={`${ry}-${rx}`}
                    className={`w-10 h-10 flex items-center justify-center text-xs font-mono rounded ${
                      isMedian && val === sortedValues[medianIdx]
                        ? 'bg-amber-50 border-2 border-amber-400 text-amber-700'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    {val.toFixed(1)}
                  </div>
                ))
              )}
            </div>
            {isMedian && (
              <div className="mt-1 text-[10px] text-amber-600 text-center">高亮 = 中位数</div>
            )}
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">
            {isMedian ? '→' : '×'}
          </div>

          {/* Kernel or Sort */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">
              {isBox ? '均值权重' : isMedian ? '排序结果' : '高斯权重'}
            </div>
            {isMedian ? (
              <div className="flex flex-wrap gap-1 max-w-[140px]">
                {sortedValues.map((v, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      i === medianIdx
                        ? 'bg-amber-100 text-amber-700 font-bold'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {v.toFixed(1)}
                  </span>
                ))}
              </div>
            ) : (
              <div 
                className="inline-grid gap-1"
                style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
              >
                {kernel.map((row, ry) =>
                  row.map((val, rx) => (
                    <div
                      key={`${ry}-${rx}`}
                      className="w-10 h-10 flex items-center justify-center text-[10px] font-mono bg-white border border-slate-200 rounded"
                    >
                      {val < 0.01 ? val.toExponential(1) : val.toFixed(2)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {!isMedian && (
            <>
              <div className="pt-7 text-slate-300 text-lg shrink-0">=</div>

              {/* Products for non-median */}
              <div className="shrink-0">
                <div className="text-xs font-medium text-slate-500 mb-2">加权结果</div>
                <div 
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
                >
                  {inputRegion.map((row, ry) =>
                    row.map((val, rx) => {
                      const product = val * kernel[ry][rx];
                      return (
                        <div
                          key={`${ry}-${rx}`}
                          className="w-10 h-10 flex flex-col items-center justify-center text-[10px] bg-slate-50 border border-slate-200 rounded"
                        >
                          <span className="text-slate-400 scale-90">
                            {val.toFixed(0)}×{kernel[ry][rx] < 0.1 ? kernel[ry][rx].toExponential(0) : kernel[ry][rx].toFixed(1)}
                          </span>
                          <span className="font-mono text-slate-700">
                            {product.toFixed(1)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          <div className="pt-7 text-slate-300 text-lg shrink-0">→</div>

          {/* Result */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">输出像素</div>
            <div className="w-16 h-16 flex flex-col items-center justify-center bg-emerald-50 border-2 border-emerald-400 rounded-lg">
              <span className="text-[10px] text-emerald-600 mb-0.5">
                {isMedian ? '中位数' : isBox ? '平均值' : '加权平均'}
              </span>
              <span className="text-lg font-bold text-emerald-700">
                {outputValue < 0.01 ? outputValue.toExponential(1) : outputValue.toFixed(2)}
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-slate-500 text-center">
              位置({x},{y})
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">|</div>

          {/* Formula - Right side of result */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">数学公式</div>
            {isBox ? (
              <BoxBlurFormula x={x} y={y} outputValue={outputValue} />
            ) : isMedian ? (
              <MedianFormula x={x} y={y} outputValue={outputValue} />
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <code className="text-sm text-blue-800 font-mono">
                  G({x},{y}) = Σᵢ Σⱼ f({x}+i, {y}+j) · G(i, j; σ) = {outputValue.toFixed(2)}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [currentStep, kernelSize]);

  const parameters = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">
          示例图像
        </label>
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

      <SelectParam
        label="滤波方法"
        value={method}
        onChange={v => handleMethodChange(v as BlurMethod)}
        options={[
          { value: 'box', label: '均值模糊' },
          { value: 'gaussian', label: '高斯模糊' },
          { value: 'median', label: '中值滤波' },
        ]}
      />

      <SliderParam
        label="核大小"
        value={kernelSize}
        onChange={handleKernelSizeChange}
        min={3}
        max={7}
        step={2}
      />

      {method === 'gaussian' && (
        <SliderParam
          label="Sigma"
          value={sigma}
          onChange={handleSigmaChange}
          min={0.5}
          max={3}
          step={0.1}
        />
      )}
    </div>
  );

  const getCode = () => {
    switch (method) {
      case 'box': return BOX_BLUR_CODE_TS;
      case 'gaussian': return GAUSSIAN_BLUR_CODE_TS;
      case 'median': return MEDIAN_CODE_TS;
    }
  };

  return (
    <ConceptLayout
      title="模糊滤波"
      subtitle="均值模糊、高斯模糊与中值滤波"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={
        <CodeViewer
          languages={[{ name: 'TypeScript', code: getCode() }]}
        />
      }
      currentStep={
        currentStep
          ? {
              x: currentStep.x,
              y: currentStep.y,
              kernelSize: kernelSize,
            }
          : null
      }
      stepInfo={
        steps.length > 0
          ? { current: currentStepIndex, total: steps.length }
          : null
      }
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
    />
  );
}
