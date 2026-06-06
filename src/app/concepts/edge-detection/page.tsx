'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ConceptLayout, CodeViewer, SliderParam, SelectParam, SobelFormula } from '@/components';
import { sobelEdgeDetection, cannyEdgeDetection } from '@/lib/algorithms/edgeDetection';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';

const SOBEL_CODE_TS = `function sobelEdgeDetection(image: number[][]): { magnitude: number[][]; direction: number[][] } {
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  const gx = convolve(image, sobelX);
  const gy = convolve(image, sobelY);
  
  const magnitude = gx.map((row, y) =>
    row.map((_, x) => Math.sqrt(gx[y][x] ** 2 + gy[y][x] ** 2))
  );
  
  const direction = gx.map((row, y) =>
    row.map((_, x) => Math.atan2(gy[y][x], gx[y][x]))
  );
  
  return { magnitude, direction };
}`;

const CANNY_CODE_TS = `function cannyEdgeDetection(image: number[][], lowThreshold: number, highThreshold: number): number[][] {
  // 1. 高斯平滑
  const blurred = gaussianBlur(image, 5, 1.0);
  // 2. Sobel计算梯度
  const { magnitude, direction } = sobelEdgeDetection(blurred);
  // 3. 非极大值抑制
  const suppressed = nonMaximumSuppression(magnitude, direction);
  // 4. 双阈值检测
  const edges = doubleThreshold(suppressed, lowThreshold, highThreshold);
  // 5. 边缘跟踪
  return edgeTracking(edges);
}`;

type EdgeMethod = 'sobel' | 'canny';

interface EdgeStep {
  x: number;
  y: number;
  inputRegion: number[][];
  gx: number;
  gy: number;
  magnitude: number;
  direction: number;
}

export default function EdgeDetectionPage() {
  const [imageType, setImageType] = useState<SampleImageType>('lena');
  const [method, setMethod] = useState<EdgeMethod>('sobel');
  const [lowThreshold, setLowThreshold] = useState(30);
  const [highThreshold, setHighThreshold] = useState(100);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const originalImage = sampleImages[imageType].image;

  const sobelResult = useMemo(
    () => (method === 'sobel' ? sobelEdgeDetection(originalImage) : null),
    [method, originalImage]
  );

  const resultImage = useMemo(() => {
    if (method === 'sobel') {
      return sobelResult?.magnitude ?? originalImage;
    }

    return cannyEdgeDetection(originalImage, lowThreshold / 255, highThreshold / 255).image;
  }, [highThreshold, lowThreshold, method, originalImage, sobelResult]);

  // Generate steps for visualization
  const steps = useMemo(() => {
    if (!originalImage || !sobelResult) return [];
    
    const stepList: EdgeStep[] = [];
    const height = originalImage.length;
    const width = originalImage[0].length;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const inputRegion = [];
        for (let ky = -1; ky <= 1; ky++) {
          const row = [];
          for (let kx = -1; kx <= 1; kx++) {
            row.push(originalImage[y + ky][x + kx]);
          }
          inputRegion.push(row);
        }
        
        stepList.push({
          x, y, inputRegion,
          gx: 0, gy: 0,
          magnitude: sobelResult.magnitude[y][x],
          direction: sobelResult.direction[y][x],
        });
      }
    }
    return stepList;
  }, [originalImage, sobelResult]);

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
        newY = Math.max(1, currentStep.y - 1);
        break;
      case 'down':
        newY = Math.min(height - 2, currentStep.y + 1);
        break;
      case 'left':
        newX = Math.max(1, currentStep.x - 1);
        break;
      case 'right':
        newX = Math.min(width - 2, currentStep.x + 1);
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

  const handleMethodChange = useCallback((value: EdgeMethod) => {
    setMethod(value);
    setCurrentStepIndex(0);
  }, []);

  const handleLowThresholdChange = useCallback((value: number) => {
    setLowThreshold(value);
    setCurrentStepIndex(0);
  }, []);

  const handleHighThresholdChange = useCallback((value: number) => {
    setHighThreshold(value);
    setCurrentStepIndex(0);
  }, []);

  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return (
        <div className="text-center text-slate-400 py-8">
          {method === 'canny' ? 'Canny边缘检测包含多个步骤，请查看代码实现' : '加载中...'}
        </div>
      );
    }

    const { x, y, inputRegion, magnitude, direction } = currentStep;
    const dirDegrees = (direction * 180 / Math.PI).toFixed(0);
    
    // Calculate Gx and Gy for display
    let gx = 0, gy = 0;
    const sobelX = [[-1,0,1],[-2,0,2],[-1,0,1]];
    const sobelY = [[-1,-2,-1],[0,0,0],[1,2,1]];
    for (let ky = 0; ky < 3; ky++) {
      for (let kx = 0; kx < 3; kx++) {
        gx += inputRegion[ky][kx] * sobelX[ky][kx];
        gy += inputRegion[ky][kx] * sobelY[ky][kx];
      }
    }

    return (
      <div className="space-y-4">
        {/* Explanation */}
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="mb-2">
            <strong className="text-slate-800">步骤说明：</strong>
            Sobel边缘检测 - 计算位置 <code className="bg-white px-1 rounded border">({x}, {y})</code> 的梯度
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs ml-1">
            <li>使用Sobel X核计算水平方向梯度 Gx</li>
            <li>使用Sobel Y核计算垂直方向梯度 Gy</li>
            <li>梯度幅值 = √(Gx² + Gy²)，表示边缘强度</li>
            <li>梯度方向 = arctan(Gy/Gx)，表示边缘方向</li>
          </ol>
        </div>

        {/* Calculation Grid */}
        <div className="flex items-start gap-4 overflow-x-auto pb-2">
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">输入邻域</div>
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {inputRegion.map((row, ry) =>
                row.map((val, rx) => (
                  <div key={`${ry}-${rx}`} className="w-10 h-10 flex items-center justify-center text-xs font-mono bg-white border border-slate-200 rounded">
                    {val.toFixed(0)}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">Sobel X</div>
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[[-1,0,1],[-2,0,2],[-1,0,1]].map((row, ry) =>
                row.map((val, rx) => (
                  <div key={`${ry}-${rx}`} className="w-10 h-10 flex items-center justify-center text-xs font-mono bg-white border border-slate-200 rounded">
                    {val}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">Sobel Y</div>
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[[-1,-2,-1],[0,0,0],[1,2,1]].map((row, ry) =>
                row.map((val, rx) => (
                  <div key={`${ry}-${rx}`} className="w-10 h-10 flex items-center justify-center text-xs font-mono bg-white border border-slate-200 rounded">
                    {val}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">→</div>

          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">梯度结果</div>
            <div className="space-y-2">
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded">
                <div className="text-[10px] text-blue-600">水平梯度 Gx</div>
                <div className="text-lg font-bold text-blue-700">{gx.toFixed(2)}</div>
              </div>
              <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded">
                <div className="text-[10px] text-purple-600">垂直梯度 Gy</div>
                <div className="text-lg font-bold text-purple-700">{gy.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">→</div>

          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">最终输出</div>
            <div className="space-y-2">
              <div className="w-16 h-14 flex flex-col items-center justify-center bg-emerald-50 border-2 border-emerald-400 rounded-lg">
                <span className="text-[10px] text-emerald-600">梯度幅值</span>
                <span className="text-lg font-bold text-emerald-700">{magnitude.toFixed(2)}</span>
              </div>
              <div className="w-16 h-10 flex flex-col items-center justify-center bg-indigo-50 border border-indigo-200 rounded">
                <span className="text-[10px] text-indigo-600">方向</span>
                <span className="text-sm font-bold text-indigo-700">{dirDegrees}°</span>
              </div>
            </div>
          </div>

          <div className="pt-7 text-slate-300 text-lg shrink-0">|</div>

          {/* Formula - Right side of result */}
          <div className="shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-2">数学公式</div>
            <SobelFormula x={x} y={y} gx={gx} gy={gy} magnitude={magnitude} />
          </div>
        </div>
      </div>
    );
  }, [currentStep, method]);

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
        label="检测方法"
        value={method}
        onChange={v => handleMethodChange(v as EdgeMethod)}
        options={[
          { value: 'sobel', label: 'Sobel算子' },
          { value: 'canny', label: 'Canny边缘检测' },
        ]}
      />

      {method === 'canny' && (
        <>
          <SliderParam
            label="低阈值"
            value={lowThreshold}
            onChange={handleLowThresholdChange}
            min={10}
            max={100}
            step={5}
          />
          <SliderParam
            label="高阈值"
            value={highThreshold}
            onChange={handleHighThresholdChange}
            min={50}
            max={200}
            step={5}
          />
        </>
      )}
    </div>
  );

  const getCode = () => method === 'sobel' ? SOBEL_CODE_TS : CANNY_CODE_TS;

  return (
    <ConceptLayout
      title="边缘检测"
      subtitle="Sobel算子与Canny边缘检测"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: getCode() }]} />}
      currentStep={currentStep ? { x: currentStep.x, y: currentStep.y, kernelSize: 3 } : null}
      stepInfo={steps.length > 0 ? { current: currentStepIndex, total: steps.length } : null}
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
    />
  );
}
