'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConceptLayout, CodeViewer, SliderParam, KernelEditor, ConvolutionFormula } from '@/components';
import {
  convolve2D,
  convolve2DSteps,
  createKernel,
} from '@/lib/algorithms/convolution';
import { Kernel } from '@/lib/algorithms/types';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { normalizeImage } from '@/lib/utils/imageProcessing';

const CONVOLUTION_CODE_TS = `function convolve2D(
  image: number[][],
  kernel: number[][]
): number[][] {
  const height = image.length;
  const width = image[0].length;
  const kSize = kernel.length;
  const padding = Math.floor(kSize / 2);

  // 填充图像边界
  const padded = padImage(image, padding);
  const result = create2DArray(height, width, 0);

  // 遍历每个像素
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      
      // 卷积核双重循环
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = x + kx;
          const py = y + ky;
          sum += padded[py][px] * kernel[ky][kx];
        }
      }
      
      result[y][x] = sum;
    }
  }
  return result;
}`;

interface ConvStep {
  x: number;
  y: number;
  inputRegion: number[][];
  kernel: number[][];
  outputValue: number;
}

function createDefaultKernel(size: number): number[][] {
  const nextKernel = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
  const center = Math.floor(size / 2);
  nextKernel[center][center] = 1;
  return nextKernel;
}

export default function ConvolutionPage() {
  const [imageType, setImageType] = useState<SampleImageType>('checkerboard');
  const [kernelSize, setKernelSize] = useState(3);
  const [kernel, setKernel] = useState<number[][]>([
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0],
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const originalImage = sampleImages[imageType].image;

  const kernelObj = useMemo<Kernel>(() => {
    const anchor = Math.floor(kernelSize / 2);
    const newKernel = createKernel(kernelSize, anchor, anchor);
    newKernel.values = kernel;
    return newKernel;
  }, [kernelSize, kernel]);

  const resultImage = useMemo(() => {
    const result = convolve2D(originalImage, kernelObj);
    return normalizeImage(result);
  }, [originalImage, kernelObj]);

  const steps = useMemo(() => {
    const generator = convolve2DSteps(originalImage, kernelObj);
    return Array.from(generator as Generator<ConvStep>);
  }, [originalImage, kernelObj]);

  const currentStep = steps[currentStepIndex];

  // Auto play
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  // Direction movement - based on current step's x,y coordinates
  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!currentStep || !originalImage || steps.length === 0) return;
    
    const width = originalImage[0].length;
    const height = originalImage.length;
    
    // Get current x, y from the current step (not from step index)
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
    
    // Find the step index that matches the new coordinates
    const newIndex = steps.findIndex(s => s.x === newX && s.y === newY);
    if (newIndex !== -1) {
      setCurrentStepIndex(newIndex);
    }
  }, [currentStep, originalImage, steps]);

  const handlePresetSelect = useCallback((preset: string) => {
    switch (preset) {
      case 'identity':
        setKernel([[0, 0, 0], [0, 1, 0], [0, 0, 0]]);
        setKernelSize(3);
        break;
      case 'box':
        setKernel([[1, 1, 1], [1, 1, 1], [1, 1, 1]]);
        setKernelSize(3);
        break;
      case 'laplacian':
        setKernel([[0, 1, 0], [1, -4, 1], [0, 1, 0]]);
        setKernelSize(3);
        break;
      case 'sobelx':
        setKernel([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]);
        setKernelSize(3);
        break;
      case 'sobely':
        setKernel([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]);
        setKernelSize(3);
        break;
    }
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const handleImageTypeChange = useCallback((value: SampleImageType) => {
    setImageType(value);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const handleKernelSizeChange = useCallback((value: number) => {
    setKernelSize(value);
    setKernel(createDefaultKernel(value));
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const handleKernelChange = useCallback((value: number[][]) => {
    setKernel(value);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return (
        <div className="text-center text-slate-400 py-8">
          加载中...
        </div>
      );
    }

    const { x, y, inputRegion, kernel: stepKernel, outputValue } = currentStep;
    const calculations: { pixel: number; weight: number; product: number }[] = [];
    
    for (let ky = 0; ky < kernelSize; ky++) {
      for (let kx = 0; kx < kernelSize; kx++) {
        calculations.push({
          pixel: inputRegion[ky][kx],
          weight: stepKernel[ky][kx],
          product: inputRegion[ky][kx] * stepKernel[ky][kx],
        });
      }
    }

    return (
      <div className="space-y-4">
        {/* Explanation */}
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="mb-2">
            <strong className="text-slate-800">步骤说明：</strong>
            计算结果图位置 <code className="bg-white px-1 rounded border">({x}, {y})</code> 的像素值
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs ml-1">
            <li>在原图上以 <code>({x}, {y})</code> 为左上角，取 {kernelSize}×{kernelSize} 区域</li>
            <li>每个像素值与卷积核对应位置的数值相乘</li>
            <li>把所有乘积相加，得到结果</li>
          </ol>
        </div>

        {/* Calculation Grid - Horizontal Layout */}
        <div className="flex items-start gap-4 overflow-x-auto pb-2">
          {/* Input Region */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">原图区域</div>
            <div 
              className="inline-grid gap-1"
              style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
            >
              {inputRegion.map((row, ry) =>
                row.map((val, rx) => (
                  <div
                    key={`${ry}-${rx}`}
                    className="w-10 h-10 flex items-center justify-center text-xs font-mono bg-white border border-slate-200 rounded"
                  >
                    {val.toFixed(1)}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">×</div>

          {/* Kernel */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">卷积核</div>
            <div 
              className="inline-grid gap-1"
              style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
            >
              {stepKernel.map((row, ry) =>
                row.map((val, rx) => (
                  <div
                    key={`${ry}-${rx}`}
                    className={`w-10 h-10 flex items-center justify-center text-xs font-mono rounded ${
                      rx === Math.floor(kernelSize/2) && ry === Math.floor(kernelSize/2)
                        ? 'bg-red-50 border-2 border-red-400 text-red-700'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    {val}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">=</div>

          {/* Products */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">相乘结果</div>
            <div 
              className="inline-grid gap-1"
              style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
            >
              {calculations.map((calc, idx) => (
                <div
                  key={idx}
                  className="w-10 h-10 flex flex-col items-center justify-center text-[10px] bg-slate-50 border border-slate-200 rounded"
                >
                  <span className="text-slate-400 scale-90">
                    {calc.pixel.toFixed(0)}×{calc.weight}
                  </span>
                  <span className="font-mono text-slate-700">
                    {calc.product.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">→</div>

          {/* Result */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">结果像素</div>
            <div className="w-16 h-16 flex flex-col items-center justify-center bg-emerald-50 border-2 border-emerald-400 rounded-lg">
              <span className="text-[10px] text-emerald-600 mb-0.5">求和</span>
              <span className="text-lg font-bold text-emerald-700">
                {outputValue.toFixed(2)}
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
            <ConvolutionFormula x={x} y={y} outputValue={outputValue} />
          </div>
        </div>
      </div>
    );
  }, [currentStep, kernelSize]);

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
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">卷积核预设</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { key: 'identity', label: '恒等' },
            { key: 'box', label: '均值' },
            { key: 'laplacian', label: '拉普拉斯' },
            { key: 'sobelx', label: 'Sobel X' },
            { key: 'sobely', label: 'Sobel Y' },
          ].map(preset => (
            <button
              key={preset.key}
              onClick={() => handlePresetSelect(preset.key)}
              className="px-2 py-1.5 text-xs bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <SliderParam
        label="核大小"
        value={kernelSize}
        onChange={handleKernelSizeChange}
        min={3}
        max={7}
        step={2}
      />

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">卷积核数值</label>
        <KernelEditor
          label=""
          kernel={kernel}
          onChange={handleKernelChange}
          size={kernelSize}
        />
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="卷积运算"
      subtitle="Convolution - 图像处理的核心操作"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={<CodeViewer
        languages={[{ name: 'TypeScript', code: CONVOLUTION_CODE_TS }]}
      />}
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
