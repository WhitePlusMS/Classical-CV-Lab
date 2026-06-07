'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ConceptLayout, CodeViewer } from '@/components';
import {
  generateRgbImage,
  rgbToGrayscaleWeighted,
  rgbToGrayscaleAverage,
  extractChannel,
  grayscaleSteps,
  type RgbImage,
  type GrayscaleStep,
  type DisplayMode,
} from '@/lib/algorithms/grayscale';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import FormulaWithExplanation from '@/components/FormulaWithExplanation';

/** 灰度化方法 */
type GrayMethod = 'weighted' | 'average';

const GRAYSCALE_CODE_TS = [
  '// 加权法灰度化: 基于人眼敏感度',
  'function rgbToGrayscaleWeighted(rgb: number[][][]): number[][] {',
  '  const h = rgb.length, w = rgb[0].length;',
  '  const result = Array.from({ length: h }, () => Array(w).fill(0));',
  '  for (let y = 0; y < h; y++)',
  '    for (let x = 0; x < w; x++) {',
  '      const [r, g, b] = rgb[y][x];',
  '      result[y][x] = 0.299 * r + 0.587 * g + 0.114 * b;',
  '    }',
  '  return result;',
  '}',
  '',
  '// 平均法灰度化',
  'function rgbToGrayscaleAverage(rgb: number[][][]): number[][] {',
  '  const h = rgb.length, w = rgb[0].length;',
  '  const result = Array.from({ length: h }, () => Array(w).fill(0));',
  '  for (let y = 0; y < h; y++)',
  '    for (let x = 0; x < w; x++) {',
  '      const [r, g, b] = rgb[y][x];',
  '      result[y][x] = (r + g + b) / 3;',
  '    }',
  '  return result;',
  '}',
  '',
  '// 提取单通道',
  'function extractChannel(rgb: number[][][], ch: 0|1|2): number[][] {',
  '  return rgb.map(row => row.map(pixel => pixel[ch]));',
  '}',
].join('\n');

/** 生成分通道显示用图片名称 */
function getDisplayLabel(mode: DisplayMode): string {
  switch (mode) {
    case 'color': return '彩色图';
    case 'red': return 'R 通道';
    case 'green': return 'G 通道';
    case 'blue': return 'B 通道';
    case 'grayWeighted': return '加权灰度';
    case 'grayAverage': return '平均灰度';
  }
}

export default function GrayscalePage() {
  // ── 状态 ──
  const [imageType, setImageType] = useState<SampleImageType>('lena');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('color');
  const [method, setMethod] = useState<GrayMethod>('weighted');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // ── 派生数据 ──
  const originalGray = sampleImages[imageType].image;

  // 从灰度图生成模拟 RGB（使彩色通道可分离）
  const rgbImage: RgbImage | null = useMemo(
    () => generateRgbImage(originalGray),
    [originalGray]
  );

  // 两种方法的灰度结果
  const weightedResult = useMemo(
    () => (rgbImage ? rgbToGrayscaleWeighted(rgbImage) : null),
    [rgbImage]
  );
  const averageResult = useMemo(
    () => (rgbImage ? rgbToGrayscaleAverage(rgbImage) : null),
    [rgbImage]
  );

  // 当前显示模式对应的实际显示图像
  const displayImage = useMemo(() => {
    if (!rgbImage) return null;
    switch (displayMode) {
      case 'color':
        // 彩色模式下，用加权灰度结果近似显示（因为 ImageCanvas 只支持单通道）
        // 但彩色图的 RGB 三通道在 stepDetails 中展示
        return weightedResult;
      case 'red':
        return extractChannel(rgbImage, 0);
      case 'green':
        return extractChannel(rgbImage, 1);
      case 'blue':
        return extractChannel(rgbImage, 2);
      case 'grayWeighted':
        return weightedResult;
      case 'grayAverage':
        return averageResult;
    }
  }, [rgbImage, displayMode, weightedResult, averageResult]);

  // 当前方法对应的灰度结果（用于结果图，始终显示灰度结果）
  const resultImage = useMemo(
    () => (method === 'weighted' ? weightedResult : averageResult),
    [method, weightedResult, averageResult]
  );

  // 分步数据
  const steps = useMemo(() => {
    if (!rgbImage) return [];
    return Array.from(grayscaleSteps(rgbImage, method));
  }, [rgbImage, method]);

  const currentStep: GrayscaleStep | undefined = steps[currentStepIndex];

  // ── 事件处理 ──
  const handleDirectionMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!currentStep || !rgbImage || steps.length === 0) return;
      const width = rgbImage[0].length;
      const height = rgbImage.length;
      let newX = currentStep.x;
      let newY = currentStep.y;
      switch (direction) {
        case 'up':    newY = Math.max(0, currentStep.y - 1); break;
        case 'down':  newY = Math.min(height - 1, currentStep.y + 1); break;
        case 'left':  newX = Math.max(0, currentStep.x - 1); break;
        case 'right': newX = Math.min(width - 1, currentStep.x + 1); break;
      }
      const newIndex = steps.findIndex(function(s) { return s.x === newX && s.y === newY; });
      if (newIndex !== -1) setCurrentStepIndex(newIndex);
    },
    [currentStep, rgbImage, steps]
  );

  const handleImageTypeChange = useCallback(function(value: SampleImageType) {
    setImageType(value);
    setCurrentStepIndex(0);
  }, []);

  const handleMethodChange = useCallback(function(value: GrayMethod) {
    setMethod(value);
    setCurrentStepIndex(0);
  }, []);

  const handleDisplayModeChange = useCallback(function(value: DisplayMode) {
    setDisplayMode(value);
    setCurrentStepIndex(0);
  }, []);

  const handleInputRegionSelect = useCallback(
    function(x: number, y: number) {
      var idx = steps.findIndex(function(s) { return s.x === x && s.y === y; });
      if (idx !== -1) setCurrentStepIndex(idx);
    },
    [steps]
  );

  const handleOutputPixelSelect = useCallback(
    function(x: number, y: number) {
      var idx = steps.findIndex(function(s) { return s.x === x && s.y === y; });
      if (idx !== -1) setCurrentStepIndex(idx);
    },
    [steps]
  );

  // ── 分析预览区（analysisPreview）──
  var analysisPreview = useMemo(function() {
    if (!currentStep || !rgbImage) return null;
    var step = currentStep;
    var x = step.x, y = step.y, r = step.r, g = step.g, b = step.b;
    var weightedGray = step.weightedGray, averageGray = step.averageGray;
    var curMethod = step.method;
    var outVal = curMethod === 'weighted' ? weightedGray : averageGray;
    var r255 = (r * 255).toFixed(0);
    var g255 = (g * 255).toFixed(0);
    var b255 = (b * 255).toFixed(0);
    var wg255 = (weightedGray * 255).toFixed(1);
    var ag255 = (averageGray * 255).toFixed(1);
    var ov255 = (outVal * 255).toFixed(1);

    return (
      <div className="max-w-3xl mx-auto space-y-3">
        {/* 像素 RGB 信息 */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <div className="text-xs font-medium text-slate-500">
            {'\u9009\u4E2D\u50CF\u7D20 (' + x + ',' + y + ')'}
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-mono text-red-700">
              {'R: ' + r255}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-mono text-green-700">
              {'G: ' + g255}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-mono text-blue-700">
              {'B: ' + b255}
            </span>
          </div>
        </div>

        {/* 计算过程 */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* 加权法 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-center min-w-[180px]">
            <div className="text-[10px] font-semibold tracking-wide text-amber-700 mb-1">{'\u52A0\u6743\u6CD5'}</div>
            <code className="text-xs text-amber-900 font-mono">
              {r255 + '\u00D7' + '0.299 + ' + g255 + '\u00D7' + '0.587 + ' + b255 + '\u00D7' + '0.114'}
            </code>
            <div className="mt-1 text-xs font-bold text-amber-800">
              {'= ' + wg255}
            </div>
          </div>

          {/* 平均法 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center min-w-[180px]">
            <div className="text-[10px] font-semibold tracking-wide text-slate-600 mb-1">{'\u5E73\u5747\u6CD5'}</div>
            <code className="text-xs text-slate-700 font-mono">
              {'(' + r255 + ' + ' + g255 + ' + ' + b255 + ') / 3'}
            </code>
            <div className="mt-1 text-xs font-bold text-slate-800">
              {'= ' + ag255}
            </div>
          </div>

          {/* 输出 */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-[10px] font-medium text-slate-500">{'\u5F53\u524D\u8F93\u51FA'}</div>
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-50 border-2 border-emerald-400 rounded-lg">
              <span className="text-sm font-bold text-emerald-700">{ov255}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [currentStep, rgbImage]);

  // ── 详细说明区（stepDetails）──
  var stepDetails = useMemo(function() {
    if (!currentStep || !rgbImage) return null;
    var step = currentStep;
    var x = step.x, y = step.y, r = step.r, g = step.g, b = step.b;
    var weightedGray = step.weightedGray, averageGray = step.averageGray;
    var r255 = (r * 255).toFixed(0);
    var g255 = (g * 255).toFixed(0);
    var b255 = (b * 255).toFixed(0);
    var wg255 = (weightedGray * 255).toFixed(1);
    var ag255 = (averageGray * 255).toFixed(1);
    var rContribution = (r * 0.299 * 255).toFixed(1);
    var gContribution = (g * 0.587 * 255).toFixed(1);
    var bContribution = (b * 0.114 * 255).toFixed(1);

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        {/* 公式 */}
        <FormulaWithExplanation
          formula={'V_gray(' + x + ',' + y + ') = 0.299 \u00D7 ' + r255 + ' + 0.587 \u00D7 ' + g255 + ' + 0.114 \u00D7 ' + b255 + ' = ' + wg255}
          detailedExplanation={
            <>
              <p><strong>{'\u52A0\u6743\u6CD5\u7070\u5EA6\u5316\u516C\u5F0F\u89E3\u8BFB\uFF1A'}</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>{'\u6743\u91CD 0.299\u30010.587\u30010.114 \u6765\u81EA ITU-R BT.601 \u6807\u51C6'}</li>
                <li>{'\u7EFF\u8272\u901A\u9053\u6743\u91CD\u6700\u9AD8\uFF080.587\uFF09\uFF0C\u56E0\u4E3A\u4EBA\u773C\u5BF9\u7EFF\u8272\u5149\u6700\u654F\u611F'}</li>
                <li>{'\u84DD\u8272\u901A\u9053\u6743\u91CD\u6700\u4F4E\uFF080.114\uFF09\uFF0C\u56E0\u4E3A\u4EBA\u773C\u5BF9\u84DD\u8272\u5149\u6700\u4E0D\u654F\u611F'}</li>
                <li>{'\u4E09\u4E2A\u6743\u91CD\u4E4B\u548C\u4E3A 1\uFF0C\u4FDD\u8BC1\u7070\u5EA6\u503C\u8303\u56F4\u4E0E\u539F\u59CB\u4EAE\u5EA6\u4E00\u81F4'}</li>
              </ul>
              <p className="mt-2"><strong>{'\u4E0E\u5E73\u5747\u6CD5\u5BF9\u6BD4\uFF1A'}</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>{'\u5E73\u5747\u6CD5\uFF1A(' + r255 + ' + ' + g255 + ' + ' + b255 + ') / 3 = ' + ag255}</li>
                <li>{'\u52A0\u6743\u6CD5\u8003\u8651\u4E86\u4EBA\u773C\u89C6\u89C9\u7279\u6027\uFF0C\u7ED3\u679C\u66F4\u81EA\u7136'}</li>
                <li>{'\u5E73\u5747\u6CD5\u5728\u7EFF\u8272\u5360\u4E3B\u5BFC\u7684\u533A\u57DF\u4F1A\u504F\u6697\uFF0C\u5728\u84DD\u8272\u5360\u4E3B\u5BFC\u7684\u533A\u57DF\u4F1A\u504F\u4EAE'}</li>
              </ul>
            </>
          }
        />

        {/* RGB 数值矩阵 */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">
            {'\u4F4D\u7F6E(' + x + ',' + y + ') \u7684 RGB \u4E09\u901A\u9053\u6570\u503C'}
          </div>
          <div className="flex gap-2 justify-center">
            <div className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 min-w-[72px]">
              <span className="text-[10px] text-red-600 mb-0.5">R</span>
              <span className="text-lg font-bold text-red-700">{r255}</span>
              <div className="mt-1 w-full h-3 rounded bg-red-500" style={{ opacity: r }} />
            </div>
            <div className="flex flex-col items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 min-w-[72px]">
              <span className="text-[10px] text-green-600 mb-0.5">G</span>
              <span className="text-lg font-bold text-green-700">{g255}</span>
              <div className="mt-1 w-full h-3 rounded bg-green-500" style={{ opacity: g }} />
            </div>
            <div className="flex flex-col items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 min-w-[72px]">
              <span className="text-[10px] text-blue-600 mb-0.5">B</span>
              <span className="text-lg font-bold text-blue-700">{b255}</span>
              <div className="mt-1 w-full h-3 rounded bg-blue-500" style={{ opacity: b }} />
            </div>
            <div className="flex flex-col items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 min-w-[72px]">
              <span className="text-[10px] text-amber-600 mb-0.5">{'\u7070\u5EA6'}</span>
              <span className="text-lg font-bold text-amber-700">{(weightedGray * 255).toFixed(0)}</span>
              <div className="mt-1 w-full h-3 rounded bg-amber-500" style={{ opacity: weightedGray }} />
            </div>
          </div>
        </div>

        {/* 逐项乘积明细 */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">{'\u52A0\u6743\u6CD5\u9010\u9879\u8BA1\u7B97\u660E\u7EC6'}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2 text-center">
              <div className="text-[10px] text-red-600">R {'\u8D21\u732E'}</div>
              <div className="font-mono text-sm text-red-700 font-bold">
                {r255 + ' \u00D7 0.299 = ' + rContribution}
              </div>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50/40 px-3 py-2 text-center">
              <div className="text-[10px] text-green-600">G {'\u8D21\u732E'}</div>
              <div className="font-mono text-sm text-green-700 font-bold">
                {g255 + ' \u00D7 0.587 = ' + gContribution}
              </div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-center">
              <div className="text-[10px] text-blue-600">B {'\u8D21\u732E'}</div>
              <div className="font-mono text-sm text-blue-700 font-bold">
                {b255 + ' \u00D7 0.114 = ' + bContribution}
              </div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs text-slate-500">
              {'\u4E09\u9879\u4E4B\u548C = ' + rContribution + ' + ' + gContribution + ' + ' + bContribution + ' = '}
              <strong className="text-amber-700">{wg255}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }, [currentStep, rgbImage]);

  // ── 参数面板 ──
  var parameters = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">{'\u793A\u4F8B\u56FE\u50CF'}</label>
        <select
          value={imageType}
          onChange={function(e) { handleImageTypeChange(e.target.value as SampleImageType); }}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
        >
          {Object.entries(sampleImages).map(function(entry) {
            var key = entry[0], name = entry[1].name;
            return <option key={key} value={key}>{name}</option>;
          })}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">{'\u901A\u9053\u663E\u793A'}</label>
        <select
          value={displayMode}
          onChange={function(e) { handleDisplayModeChange(e.target.value as DisplayMode); }}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
        >
          {(function() {
            var modes: DisplayMode[] = ['color', 'red', 'green', 'blue', 'grayWeighted', 'grayAverage'];
            return modes.map(function(m) {
              return <option key={m} value={m}>{getDisplayLabel(m)}</option>;
            });
          })()}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">{'\u7070\u5EA6\u65B9\u6CD5'}</label>
        <div className="flex gap-2">
          {[
            { value: 'weighted' as GrayMethod, label: '\u52A0\u6743\u6CD5' },
            { value: 'average' as GrayMethod, label: '\u5E73\u5747\u6CD5' },
          ].map(function(opt) {
            return (
              <button
                key={opt.value}
                type="button"
                onClick={function() { handleMethodChange(opt.value); }}
                className={'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ' + (method === opt.value ? 'border-amber-300 bg-amber-50 text-amber-800 font-medium' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── 原图提示（根据显示模式动态切换）──
  var imageHints = useMemo(function() {
    var inputLabel = getDisplayLabel(displayMode);
    return {
      input: inputLabel,
      output: method === 'weighted' ? '\u52A0\u6743\u7070\u5EA6\u7ED3\u679C' : '\u5E73\u5747\u7070\u5EA6\u7ED3\u679C',
    };
  }, [displayMode, method]);

  return (
    <ConceptLayout
      title={'\u56FE\u50CF\u7070\u5EA6\u5316'}
      subtitle={'Grayscale - RGB\u4E09\u901A\u9053\u4E0E\u7070\u5EA6\u8F6C\u6362'}
      originalImage={displayImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      analysisPreview={analysisPreview}
      codeTab={
        <CodeViewer
          languages={[{ name: 'TypeScript', code: GRAYSCALE_CODE_TS }]}
        />
      }
      imageHints={imageHints}
      currentStep={
        currentStep
          ? { x: currentStep.x, y: currentStep.y, kernelSize: 1 }
          : null
      }
      stepInfo={
        steps.length > 0
          ? { current: currentStepIndex, total: steps.length }
          : null
      }
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
    />
  );
}
