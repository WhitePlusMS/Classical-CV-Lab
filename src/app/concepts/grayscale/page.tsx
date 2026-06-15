'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  FormulaCard,
  SelectParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  generateRgbImage,
  rgbToGrayscaleWeighted,
  rgbToGrayscaleAverage,
  extractChannel,
  grayscaleSteps,
  getDisplayImage,
  type RgbImage,
  type GrayscaleStep,
  type DisplayMode,
} from '@/lib/algorithms/grayscale';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { centerCropRgbImage, loadImageAsRgb, resizeRgbImage } from '@/lib/utils/imageProcessing';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { useGridNavigation } from '@/hooks/useGridNavigation';

type GrayMethod = 'weighted' | 'average';

function buildWeightedFormulaMathML(r255: string, g255: string, b255: string, result: string): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>V</mi><mrow><mi>g</mi><mi>r</mi><mi>a</mi><mi>y</mi></mrow></msub>
      <mo>=</mo>
      <mn>0.299</mn><mo>&#x22C5;</mo><mi>R</mi>
      <mo>+</mo>
      <mn>0.587</mn><mo>&#x22C5;</mo><mi>G</mi>
      <mo>+</mo>
      <mn>0.114</mn><mo>&#x22C5;</mo><mi>B</mi>
      <mo>=</mo>
      <mn>0.299</mn><mo>&#x22C5;</mo><mn>${r255}</mn>
      <mo>+</mo>
      <mn>0.587</mn><mo>&#x22C5;</mo><mn>${g255}</mn>
      <mo>+</mo>
      <mn>0.114</mn><mo>&#x22C5;</mo><mn>${b255}</mn>
      <mo>=</mo>
      <mn>${result}</mn>
    </mrow>
  `);
}

function buildAverageFormulaMathML(r255: string, g255: string, b255: string, result: string): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>V</mi><mrow><mi>g</mi><mi>r</mi><mi>a</mi><mi>y</mi></mrow></msub>
      <mo>=</mo>
      <mfrac>
        <mrow><mi>R</mi><mo>+</mo><mi>G</mi><mo>+</mo><mi>B</mi></mrow>
        <mn>3</mn>
      </mfrac>
      <mo>=</mo>
      <mfrac>
        <mrow><mn>${r255}</mn><mo>+</mo><mn>${g255}</mn><mo>+</mo><mn>${b255}</mn></mrow>
        <mn>3</mn>
      </mfrac>
      <mo>=</mo>
      <mn>${result}</mn>
    </mrow>
  `);
}

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
  const [imageType, setImageType] = useState<SampleImageType>('gradient');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('color');
  const [method, setMethod] = useState<GrayMethod>('weighted');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // 加载真实 Lena 图像（仅客户端），并缩放到合理尺寸
  const [lenaRgbImage, setLenaRgbImage] = useState<RgbImage | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await loadImageAsRgb('/assets/lena-original.jpg');
        if (cancelled) return;
        setLenaRgbImage(resizeRgbImage(centerCropRgbImage(raw), 128));
      } catch {
        // 加载失败则回退到程序生成的图
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── 派生数据 ──
  // Lena 优先用真实图片，其他类型用 sampleImages
  const originalGray: GrayscaleImage = useMemo(() => {
    if (imageType === 'lena' && lenaRgbImage) return rgbToGrayscaleWeighted(lenaRgbImage);
    return sampleImages[imageType].image;
  }, [imageType, lenaRgbImage]);

  const rgbImage: RgbImage | null = useMemo(
    () => (imageType === 'lena' && lenaRgbImage ? lenaRgbImage : generateRgbImage(originalGray)),
    [imageType, lenaRgbImage, originalGray]
  );

  const weightedResult = useMemo(
    () => (rgbImage ? rgbToGrayscaleWeighted(rgbImage) : null),
    [rgbImage]
  );
  const averageResult = useMemo(
    () => (rgbImage ? rgbToGrayscaleAverage(rgbImage) : null),
    [rgbImage]
  );

  const displayImage = useMemo(() => {
    if (!rgbImage) return null;
    if (displayMode === 'color') return weightedResult;
    return getDisplayImage(rgbImage, displayMode, weightedResult, averageResult);
  }, [rgbImage, displayMode, weightedResult, averageResult]);

  const resultImage = useMemo(
    () => (method === 'weighted' ? weightedResult : averageResult),
    [method, weightedResult, averageResult]
  );

  const steps = useMemo(() => {
    if (!rgbImage) return [];
    return Array.from(grayscaleSteps(rgbImage, method));
  }, [rgbImage, method]);

  const currentStep: GrayscaleStep | undefined = steps[currentStepIndex];

  // —— 事件处理 ——

  const handleImageTypeChange = useCallback(function(value: string) {
    setImageType(value as SampleImageType);
    setCurrentStepIndex(0);
  }, []);

  const handleMethodChange = useCallback(function(value: GrayMethod) {
    setMethod(value);
    setCurrentStepIndex(0);
  }, []);

  const handleDisplayModeChange = useCallback(function(value: string) {
    setDisplayMode(value as DisplayMode);
    setCurrentStepIndex(0);
  }, []);

  const selectStepByPoint = useCallback(
    function(point: { x: number; y: number }) {
      const idx = steps.findIndex(function(s) { return s.x === point.x && s.y === point.y; });
      if (idx !== -1) setCurrentStepIndex(idx);
    },
    [steps]
  );

  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.x, y: currentStep.y } : null,
    bounds: { width: rgbImage?.[0]?.length ?? 0, height: rgbImage?.length ?? 0 },
    onMove: selectStepByPoint,
    disabled: steps.length === 0,
  });

  const handleInputRegionSelect = useCallback(
    function(x: number, y: number) {
      selectStepByPoint({ x, y });
    },
    [selectStepByPoint]
  );

  const handleOutputPixelSelect = useCallback(
    function(x: number, y: number) {
      selectStepByPoint({ x, y });
    },
    [selectStepByPoint]
  );

  // —— stepDetails（参考卷积模块格式）——

  const stepDetails = useMemo(function() {
    if (!currentStep || !rgbImage) return null;
    const step = currentStep;
    const x = step.x, y = step.y, r = step.r, g = step.g, b = step.b;
    const weightedGray = step.weightedGray, averageGray = step.averageGray;
    const r255 = (r * 255).toFixed(0), g255 = (g * 255).toFixed(0), b255 = (b * 255).toFixed(0);
    const wg255 = (weightedGray * 255).toFixed(1), ag255 = (averageGray * 255).toFixed(1);
    const weights = method === 'weighted'
      ? { r: 0.299, g: 0.587, b: 0.114 }
      : { r: 1 / 3, g: 1 / 3, b: 1 / 3 };
    const currentOutput = method === 'weighted' ? weightedGray : averageGray;
    const currentOutput255 = method === 'weighted' ? wg255 : ag255;
    const rContribution = (r * weights.r * 255).toFixed(1);
    const gContribution = (g * weights.g * 255).toFixed(1);
    const bContribution = (b * weights.b * 255).toFixed(1);

    const weightedFormulaML = buildWeightedFormulaMathML(r255, g255, b255, wg255);
    const averageFormulaML = buildAverageFormulaMathML(r255, g255, b255, ag255);
    const currentFormulaML = method === 'weighted' ? weightedFormulaML : averageFormulaML;
    const currentMethodLabel = method === 'weighted' ? '加权法' : '平均法';

    return (
      <div className="space-y-4">
        {/* 公式卡片 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">当前像素灰度化表达式</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                当前参数选择的是{currentMethodLabel}，所以下方只展示这一种方法的代入过程。
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              当前位置 ({x}, {y})
            </div>
          </div>

          <FormulaCard
            label={currentMethodLabel}
            mathML={currentFormulaML}
            className="mx-auto mt-4 max-w-4xl"
            mathClassName="[&_math]:text-lg"
          />

          <div className="mt-3 text-xs leading-6 text-slate-600 space-y-1">
            {method === 'weighted' ? (
              <p>加权法使用 0.299、0.587、0.114 三个权重，反映人眼对绿色更敏感、对蓝色相对不敏感的视觉特性。</p>
            ) : (
              <p>平均法把 R、G、B 三个通道等权相加后除以 3，用于说明最直接的三通道合并方式。</p>
            )}
          </div>
        </TeachingCard>

        {/* 代入展开卡片 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">公式在当前像素的具体代入</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                三个通道与当前方法对应权重的乘积，求和得到右侧结果图中的灰度输出值。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              共 3 项乘积
            </div>
          </div>

          {/* 四列布局（参考卷积模块） */}
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.85fr)]">
            <div className="rounded-2xl border border-red-200 bg-red-50/55 p-3">
              <div className="text-sm font-semibold text-red-700">R 通道贡献</div>
              <div className="mt-1 text-[11px] text-red-600">权重 × {weights.r.toFixed(3)}</div>
              <div className="mt-2 text-xs leading-5 text-red-700">红色通道值 × 权重</div>
              <div className="mt-3 rounded-xl border border-red-200 bg-white/90 px-3 py-3 text-center">
                <div className="font-mono text-lg font-bold text-red-700">{rContribution}</div>
                <div className="mt-1 font-mono text-[10px] text-red-500">{r255} × {weights.r.toFixed(3)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50/55 p-3">
              <div className="text-sm font-semibold text-green-700">G 通道贡献</div>
              <div className="mt-1 text-[11px] text-green-600">权重 × {weights.g.toFixed(3)}</div>
              <div className="mt-2 text-xs leading-5 text-green-700">绿色通道值 × 权重</div>
              <div className="mt-3 rounded-xl border border-green-200 bg-white/90 px-3 py-3 text-center">
                <div className="font-mono text-lg font-bold text-green-700">{gContribution}</div>
                <div className="mt-1 font-mono text-[10px] text-green-500">{g255} × {weights.g.toFixed(3)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/55 p-3">
              <div className="text-sm font-semibold text-blue-700">B 通道贡献</div>
              <div className="mt-1 text-[11px] text-blue-600">权重 × {weights.b.toFixed(3)}</div>
              <div className="mt-2 text-xs leading-5 text-blue-700">蓝色通道值 × 权重</div>
              <div className="mt-3 rounded-xl border border-blue-200 bg-white/90 px-3 py-3 text-center">
                <div className="font-mono text-lg font-bold text-blue-700">{bContribution}</div>
                <div className="mt-1 font-mono text-[10px] text-blue-500">{b255} × {weights.b.toFixed(3)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3">
              <div className="text-sm font-semibold text-emerald-800">输出结果</div>
              <div className="mt-1 text-[11px] text-emerald-700">三项求和</div>
              <div className="mt-2 text-xs leading-5 text-emerald-800">三通道贡献之和 = {currentMethodLabel}灰度值</div>
              <div className="mt-3 rounded-xl border border-emerald-200 bg-white/90 px-3 py-3 text-center">
                <div className="font-mono text-lg font-bold text-emerald-800">{currentOutput255}</div>
                <div className="mt-1 font-mono text-[10px] text-emerald-600">
                  {rContribution} + {gContribution} + {bContribution}
                </div>
              </div>
            </div>
          </div>
        </TeachingCard>

        {/* RGB 通道数值卡片 */}
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-3">
            位置 ({x}, {y}) 的 RGB 三通道数值
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
              <span className="text-[10px] text-amber-600 mb-0.5">灰度</span>
              <span className="text-lg font-bold text-amber-700">{(currentOutput * 255).toFixed(0)}</span>
              <div className="mt-1 w-full h-3 rounded bg-amber-500" style={{ opacity: currentOutput }} />
            </div>
          </div>
        </TeachingCard>
      </div>
    );
  }, [currentStep, rgbImage, method]);

  // —— 参数面板 ——

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="示例图像"
        value={imageType}
        onChange={handleImageTypeChange}
        options={Object.entries(sampleImages).map(function(entry) {
          return { value: entry[0], label: entry[1].name };
        })}
      />

      <SelectParam
        label="通道显示"
        value={displayMode}
        onChange={handleDisplayModeChange}
        options={[
          { value: 'color', label: '彩色图' },
          { value: 'red', label: 'R 通道' },
          { value: 'green', label: 'G 通道' },
          { value: 'blue', label: 'B 通道' },
          { value: 'grayWeighted', label: '加权灰度' },
          { value: 'grayAverage', label: '平均灰度' },
        ]}
      />

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">灰度方法</label>
        <div className="flex gap-2">
          {[
            { value: 'weighted' as GrayMethod, label: '加权法' },
            { value: 'average' as GrayMethod, label: '平均法' },
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

  const imageHints = useMemo(function() {
    return {
      input: getDisplayLabel(displayMode),
      output: method === 'weighted' ? '加权灰度结果' : '平均灰度结果',
    };
  }, [displayMode, method]);

  const shouldShowOriginalGrid = useMemo(function() {
    if (!displayImage || displayMode === 'color') return false;
    const width = displayImage[0]?.length || 0;
    return width <= 16 && displayImage.length <= 16;
  }, [displayImage, displayMode]);

  return (
    <ConceptLayout
      title="图像灰度化"
      subtitle="Grayscale - RGB 三通道与灰度转换"
      operationLabel="灰度转换"
      parameterIntro="左侧切换示例图像、通道显示和灰度化方法；右侧只围绕当前像素，展示 R/G/B 权重如何合成为一个灰度值。"
      originalImage={displayImage}
      originalRgbImage={displayMode === 'color' ? rgbImage : null}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: GRAYSCALE_CODE_TS }]} />}
      imageHints={imageHints}
      showOriginalGrid={shouldShowOriginalGrid}
      currentStep={currentStep ? { x: currentStep.x, y: currentStep.y, kernelSize: 1 } : null}
      stepInfo={steps.length > 0 ? { current: currentStepIndex, total: steps.length } : null}
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      singlePageScroll
      navigationHintText="方向键移动 / 点击图像格子跳转"
    />
  );
}
