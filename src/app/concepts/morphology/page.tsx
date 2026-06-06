'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ConceptLayout, CodeViewer, SliderParam, SelectParam } from '@/components';
import { erode, dilate, open, close, morphologySteps } from '@/lib/algorithms/morphology';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';

const ERODE_CODE_TS = `function erode(image: number[][], kernel: number[][]): number[][] {
  const height = image.length;
  const width = image[0].length;
  const kSize = kernel.length;
  const half = Math.floor(kSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          if (kernel[ky + half][kx + half] === 1) {
            const py = clamp(y + ky, 0, height - 1);
            const px = clamp(x + kx, 0, width - 1);
            minVal = Math.min(minVal, image[py][px]);
          }
        }
      }
      result[y][x] = minVal;
    }
  }
  return result;
}`;

const DILATE_CODE_TS = `function dilate(image: number[][], kernel: number[][]): number[][] {
  const height = image.length;
  const width = image[0].length;
  const kSize = kernel.length;
  const half = Math.floor(kSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          if (kernel[ky + half][kx + half] === 1) {
            const py = clamp(y + ky, 0, height - 1);
            const px = clamp(x + kx, 0, width - 1);
            maxVal = Math.max(maxVal, image[py][px]);
          }
        }
      }
      result[y][x] = maxVal;
    }
  }
  return result;
}`;

type MorphologyOperation = 'erode' | 'dilate' | 'open' | 'close';

import type { MorphologyStep } from '@/lib/algorithms/morphology';

const OPERATION_LABELS: Record<MorphologyOperation, string> = {
  erode: '腐蚀 (Erosion)',
  dilate: '膨胀 (Dilation)',
  open: '开运算 (Opening)',
  close: '闭运算 (Closing)',
};

const OPERATION_DESCRIPTIONS: Record<MorphologyOperation, string> = {
  erode: '取邻域最小值，用于收缩前景、消除小噪点',
  dilate: '取邻域最大值，用于扩张前景、填充小孔洞',
  open: '先腐蚀后膨胀，用于消除小物体、平滑边界',
  close: '先膨胀后腐蚀，用于填充小孔洞、连接断线',
};

export default function MorphologyPage() {
  const [imageType, setImageType] = useState<SampleImageType>('binary');
  const [operation, setOperation] = useState<MorphologyOperation>('erode');
  const [kernelSize, setKernelSize] = useState(3);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const originalImage = sampleImages[imageType].image;

  const resultImage = useMemo(() => {
    const structElement = { shape: 'square' as const, size: kernelSize };
    switch (operation) {
      case 'erode':
        return erode(originalImage, structElement);
      case 'dilate':
        return dilate(originalImage, structElement);
      case 'open':
        return open(originalImage, structElement);
      case 'close':
        return close(originalImage, structElement);
    }
  }, [originalImage, operation, kernelSize]);

  const steps = useMemo(() => {
    const structElement = { shape: 'square' as const, size: kernelSize };
    const generator = morphologySteps(originalImage, structElement, operation);
    return Array.from(generator as Generator<MorphologyStep>);
  }, [originalImage, operation, kernelSize]);

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

  const handleOperationChange = useCallback((value: MorphologyOperation) => {
    setOperation(value);
    setCurrentStepIndex(0);
  }, []);

  const handleKernelSizeChange = useCallback((value: number) => {
    setKernelSize(value);
    setCurrentStepIndex(0);
  }, []);

  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return (
        <div className="text-center text-slate-400 py-8">
          {operation === 'open' || operation === 'close' 
            ? '开运算/闭运算包含多个步骤，请查看代码实现' 
            : '加载中...'}
        </div>
      );
    }

    const { x, y, inputRegion, structElement: kernel, outputValue } = currentStep;
    const isErode = operation === 'erode' || (operation === 'open' && currentStep.operation === 'erode');
    const values = inputRegion.flat();
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    return (
      <div className="space-y-4">
        {/* Explanation */}
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="mb-2">
            <strong className="text-slate-800">步骤说明：</strong>
            {OPERATION_LABELS[operation]} - 计算位置 <code className="bg-white px-1 rounded border">({x}, {y})</code> 的像素值
          </p>
          <p className="text-xs text-slate-500">{OPERATION_DESCRIPTIONS[operation]}</p>
        </div>

        {/* Calculation Grid */}
        <div className="flex items-start gap-4 overflow-x-auto pb-2">
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
                      val === (isErode ? minVal : maxVal)
                        ? 'bg-amber-50 border-2 border-amber-400 text-amber-700'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    {val.toFixed(0)}
                  </div>
                ))
              )}
            </div>
            <div className="mt-1 text-[10px] text-amber-600 text-center">
              高亮 = {isErode ? '最小值' : '最大值'}
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">
            {isErode ? '取最小' : '取最大'}
          </div>

          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">结构元素</div>
            <div 
              className="inline-grid gap-1"
              style={{ gridTemplateColumns: `repeat(${kernelSize}, minmax(0, 1fr))` }}
            >
              {kernel.map((row, ry) =>
                row.map((val, rx) => (
                  <div
                    key={`${ry}-${rx}`}
                    className={`w-10 h-10 flex items-center justify-center text-xs font-mono rounded ${
                      val
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {val}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">=</div>

          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">输出像素</div>
            <div className="w-16 h-16 flex flex-col items-center justify-center bg-emerald-50 border-2 border-emerald-400 rounded-lg">
              <span className="text-[10px] text-emerald-600 mb-0.5">
                {isErode ? '最小值' : '最大值'}
              </span>
              <span className="text-lg font-bold text-emerald-700">
                {outputValue.toFixed(0)}
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <code className="text-sm text-blue-800 font-mono">
                {isErode 
                  ? `G(${x},${y}) = min{f(i,j) | (i,j)∈Ω} = ${outputValue.toFixed(0)}`
                  : `G(${x},${y}) = max{f(i,j) | (i,j)∈Ω} = ${outputValue.toFixed(0)}`}
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }, [currentStep, kernelSize, operation]);

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

      <SelectParam
        label="形态学操作"
        value={operation}
        onChange={v => handleOperationChange(v as MorphologyOperation)}
        options={[
          { value: 'erode', label: '腐蚀 (Erode)' },
          { value: 'dilate', label: '膨胀 (Dilate)' },
          { value: 'open', label: '开运算 (Open)' },
          { value: 'close', label: '闭运算 (Close)' },
        ]}
      />

      <SliderParam
        label="结构元素大小"
        value={kernelSize}
        onChange={handleKernelSizeChange}
        min={3}
        max={7}
        step={2}
      />
    </div>
  );

  const getCode = () => {
    switch (operation) {
      case 'erode':
      case 'open':
        return ERODE_CODE_TS;
      case 'dilate':
      case 'close':
        return DILATE_CODE_TS;
    }
  };

  return (
    <ConceptLayout
      title="形态学操作"
      subtitle="腐蚀、膨胀、开运算与闭运算"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: getCode() }]} />}
      currentStep={currentStep ? { x: currentStep.x, y: currentStep.y, kernelSize } : null}
      stepInfo={steps.length > 0 ? { current: currentStepIndex, total: steps.length } : null}
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
    />
  );
}
