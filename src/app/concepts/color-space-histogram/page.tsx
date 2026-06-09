'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ImageCanvas,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import { generateRgbImage } from '@/lib/algorithms/grayscale';
import { generateExampleImage } from '@/lib/algorithms/histogram';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { clamp } from '@/lib/utils/imageProcessing';

type DisplayMode = 'rgb' | 'r' | 'g' | 'b' | 'h' | 's' | 'v';

interface HsvPixel {
  h: number;
  s: number;
  v: number;
}

interface ColorSpaceStep {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  hsv: HsvPixel;
}

const DISPLAY_MODE_OPTIONS = [
  { value: 'rgb', label: 'RGB 彩图' },
  { value: 'r', label: 'R 通道' },
  { value: 'g', label: 'G 通道' },
  { value: 'b', label: 'B 通道' },
  { value: 'h', label: 'H 色调' },
  { value: 's', label: 'S 饱和度' },
  { value: 'v', label: 'V 明度' },
] as const;

function rgbToHsv(r: number, g: number, b: number): HsvPixel {
  const cmax = Math.max(r, g, b);
  const cmin = Math.min(r, g, b);
  const delta = cmax - cmin;
  let h = 0;
  if (delta === 0) {
    h = 0;
  } else if (cmax === r) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (cmax === g) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  const s = cmax === 0 ? 0 : delta / cmax;
  const v = cmax;
  return { h, s, v };
}

function getChannelImage(rgbImage: number[][][] | null, mode: DisplayMode): number[][] | null {
  if (!rgbImage || rgbImage.length === 0) return null;
  const height = rgbImage.length;
  const width = rgbImage[0].length;
  if (mode === 'rgb') return null;
  const result: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbImage[y][x];
      switch (mode) {
        case 'r': row.push(r); break;
        case 'g': row.push(g); break;
        case 'b': row.push(b); break;
        case 'h': case 's': case 'v': {
          const hsv = rgbToHsv(r, g, b);
          const val = mode === 'h' ? hsv.h / 360 : mode === 's' ? hsv.s : hsv.v;
          row.push(clamp(val, 0, 1));
          break;
        }
        default: row.push(0);
      }
    }
    result.push(row);
  }
  return result;
}

const RPB_GPB_BPB = buildInlineMathML(
  '<mrow><msup><mi>R</mi><mo>′</mo></msup><mo>=</mo><mfrac><mi>R</mi><mn>255</mn></mfrac><mo>,</mo>' +
  '<msup><mi>G</mi><mo>′</mo></msup><mo>=</mo><mfrac><mi>G</mi><mn>255</mn></mfrac><mo>,</mo>' +
  '<msup><mi>B</mi><mo>′</mo></msup><mo>=</mo><mfrac><mi>B</mi><mn>255</mn></mfrac></mrow>'
);

const CMAX_CMIN_DELTA = buildInlineMathML(
  '<mrow><msub><mi>C</mi><mi>max</mi></msub><mo>=</mo><mo>max</mo><mo>(</mo><msup><mi>R</mi><mo>′</mo></msup><mo>,</mo><msup><mi>G</mi><mo>′</mo></msup><mo>,</mo><msup><mi>B</mi><mo>′</mo></msup><mo>)</mo><mo>,</mo>' +
  '<msub><mi>C</mi><mi>min</mi></msub><mo>=</mo><mo>min</mo><mo>(</mo><msup><mi>R</mi><mo>′</mo></msup><mo>,</mo><msup><mi>G</mi><mo>′</mo></msup><mo>,</mo><msup><mi>B</mi><mo>′</mo></msup><mo>)</mo><mo>,</mo>' +
  '<mi mathvariant="normal">Δ</mi><mo>=</mo><msub><mi>C</mi><mi>max</mi></msub><mo>-</mo><msub><mi>C</mi><mi>min</mi></msub></mrow>'
);

const H_FORMULA = buildInlineMathML(
  '<mrow><mi>H</mi><mo>=</mo><mrow><mo>{</mo><mtable columnspacing="1em" rowspacing="0.3em">' +
  '<mtr><mtd><mn>0</mn><mo>°</mo></mtd><mtd><mi mathvariant="normal">Δ</mi><mo>=</mo><mn>0</mn></mtd></mtr>' +
  '<mtr><mtd><mn>60°</mn><mo>×</mo><mrow><mo>(</mo><mfrac><mrow><msup><mi>G</mi><mo>′</mo></msup><mo>-</mo><msup><mi>B</mi><mo>′</mo></msup></mrow><mi mathvariant="normal">Δ</mi></mfrac><mo>+</mo><mn>0</mn><mo>)</mo></mrow></mtd><mtd><msub><mi>C</mi><mi>max</mi></msub><mo>=</mo><msup><mi>R</mi><mo>′</mo></msup></mtd></mtr>' +
  '<mtr><mtd><mn>60°</mn><mo>×</mo><mrow><mo>(</mo><mfrac><mrow><msup><mi>B</mi><mo>′</mo></msup><mo>-</mo><msup><mi>R</mi><mo>′</mo></msup></mrow><mi mathvariant="normal">Δ</mi></mfrac><mo>+</mo><mn>2</mn><mo>)</mo></mrow></mtd><mtd><msub><mi>C</mi><mi>max</mi></msub><mo>=</mo><msup><mi>G</mi><mo>′</mo></msup></mtd></mtr>' +
  '<mtr><mtd><mn>60°</mn><mo>×</mo><mrow><mo>(</mo><mfrac><mrow><msup><mi>R</mi><mo>′</mo></msup><mo>-</mo><msup><mi>G</mi><mo>′</mo></msup></mrow><mi mathvariant="normal">Δ</mi></mfrac><mo>+</mo><mn>4</mn><mo>)</mo></mrow></mtd><mtd><msub><mi>C</mi><mi>max</mi></msub><mo>=</mo><msup><mi>B</mi><mo>′</mo></msup></mtd></mtr></mtable></mrow></mrow>'
);

const S_FORMULA = buildInlineMathML(
  '<mrow><mi>S</mi><mo>=</mo><mrow><mo>{</mo><mtable>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><msub><mi>C</mi><mi>max</mi></msub><mo>=</mo><mn>0</mn></mtd></mtr>' +
  '<mtr><mtd><mfrac><mi mathvariant="normal">Δ</mi><msub><mi>C</mi><mi>max</mi></msub></mfrac></mtd><mtd><msub><mi>C</mi><mi>max</mi></msub><mo>≠</mo><mn>0</mn></mtd></mtr></mtable></mrow></mrow>'
);

const V_FORMULA = buildInlineMathML(
  '<mrow><mi>V</mi><mo>=</mo><msub><mi>C</mi><mi>max</mi></msub></mrow>'
);

const CODE_TS = 'function rgbToHsv(r: number, g: number, b: number): { h: number, s: number, v: number } {\n' +
'  const r1 = r / 255, g1 = g / 255, b1 = b / 255;\n' +
'  const cmax = Math.max(r1, g1, b1);\n' +
'  const cmin = Math.min(r1, g1, b1);\n' +
'  const delta = cmax - cmin;\n\n' +
'  let h = 0;\n' +
'  if (delta === 0) { h = 0; }\n' +
'  else if (cmax === r1) { h = 60 * (((g1 - b1) / delta) % 6); }\n' +
'  else if (cmax === g1) { h = 60 * ((b1 - r1) / delta + 2); }\n' +
'  else { h = 60 * ((r1 - g1) / delta + 4); }\n' +
'  if (h < 0) h += 360;\n\n' +
'  const s = cmax === 0 ? 0 : delta / cmax;\n' +
'  const v = cmax;\n' +
'  return { h, s, v };\n' +
'}';

export default function ColorSpaceHistogramPage() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rgb');
  const [currentPosition, setCurrentPosition] = useState({ x: 5, y: 5 });
  const [threshold, setThreshold] = useState(50);

  const rgbImage = useMemo(() => {
    const gray = generateExampleImage('standard');
    return generateRgbImage(gray);
  }, []);

  const width = rgbImage[0]?.length || 0;
  const height = rgbImage.length;

  const safePos = {
    x: width > 0 ? Math.min(currentPosition.x, width - 1) : 0,
    y: height > 0 ? Math.min(currentPosition.y, height - 1) : 0,
  };

  const currentPixel = useMemo(() => {
    if (!rgbImage.length) return null;
    const [r, g, b] = rgbImage[safePos.y]?.[safePos.x] ?? [0, 0, 0];
    const hsv = rgbToHsv(r, g, b);
    return {
      x: safePos.x, y: safePos.y,
      r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255),
      h: hsv.h.toFixed(1), s: (hsv.s * 100).toFixed(1), v: (hsv.v * 100).toFixed(1),
      rNorm: r, gNorm: g, bNorm: b, hsv,
    };
  }, [rgbImage, safePos.x, safePos.y]);

  const resultImage = useMemo(() => getChannelImage(rgbImage, displayMode), [rgbImage, displayMode]);
  const currentStepIndex = safePos.y * width + safePos.x;
  const totalSteps = width * height;

  const handleDirectionMove = useGridNavigation({
    current: { x: safePos.x, y: safePos.y },
    bounds: { width, height },
    onMove: setCurrentPosition,
    disabled: width === 0 || height === 0,
  });

  const handlePixelSelect = useCallback((x: number, y: number) => {
    setCurrentPosition({
      x: Math.max(0, Math.min(x, width - 1)),
      y: Math.max(0, Math.min(y, height - 1)),
    });
  }, [width, height]);

  const analysisPreview = useMemo(() => {
    if (!currentPixel) return null;
    const { r, g, b, h, s, v } = currentPixel;
    return (
      <ProcessRail>
        <FlowColumns>
          <FlowColumn align="start">
            <FlowNode tone="red">
              <div className="mb-2 text-xs font-semibold text-red-600">当前像素 RGB</div>
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                R = {r}<br />G = {g}<br />B = {b}
              </div>
              <div className="mt-2 text-xs text-slate-500">坐标 ({currentPixel.x}, {currentPixel.y})</div>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="center">
            <FlowNode tone="amber">
              <div className="mb-2 text-xs font-semibold text-amber-700">RGB → HSV 转换</div>
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                H = {h}°<br />S = {s}%<br />V = {v}%
              </div>
              <div className="mt-2 text-[10px] leading-4 text-amber-700">
                归一化 R′=R/255，G′=G/255，B′=B/255，<br />
                再代入 Cmax、Cmin、Δ 公式
              </div>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="end">
            <FlowNode tone="emerald">
              <div className="mb-2 text-xs font-semibold text-emerald-700">颜色直方图</div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
                统计 {width}×{height} = {width * height} 个像素的<br />
                {displayMode === 'rgb' ? 'RGB 分量' :
                 displayMode === 'h' ? 'H 分量' :
                 displayMode === 's' ? 'S 分量' :
                 displayMode === 'v' ? 'V 分量' :
                 displayMode.toUpperCase() + ' 通道'}分布
              </div>
              <div className="mt-2 text-[10px] text-emerald-600">
                直方图描述了目标的颜色特征分布
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [currentPixel, displayMode, width, height]);

  const stepDetails = useMemo(() => {
    if (!currentPixel) return null;
    const { r, g, b, h, s, v, rNorm, gNorm, bNorm, hsv } = currentPixel;
    const cmax = Math.max(rNorm, gNorm, bNorm);
    const cmin = Math.min(rNorm, gNorm, bNorm);
    const delta = cmax - cmin;

    return (
      <div className="space-y-6">
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">（1）RGB 颜色空间</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            RGB 颜色空间以红（R）、绿（G）、蓝（B）三种基色光的分量叠加混合表示颜色，
            每种分量的取值范围为 0 ~ 255。当三基色分量都为 0（最弱）时混合为黑色，
            当三基色分量都为 255（最强）时混合为白色。RGB 颜色空间可以用一个三维立方体表示。
          </p>
          <div className="mb-4 flex flex-wrap gap-4">
            <figure className="flex-1">
              <img src="/assets/color-space-histogram/rgb-cube.jpg" alt="RGB 颜色立方体" className="w-full max-w-xs rounded-xl object-cover" />
              <figcaption className="mt-2 text-xs text-slate-500">RGB 颜色空间三维立方体</figcaption>
            </figure>
            <figure className="flex-1">
              <img src="/assets/color-space-histogram/rgb-mixing.jpg" alt="RGB 三基色混合" className="w-full max-w-xs rounded-xl object-cover" />
              <figcaption className="mt-2 text-xs text-slate-500">R、G、B 三基色分量叠加混合</figcaption>
            </figure>
          </div>
        </TeachingCard>

        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">（2）HSV 颜色空间</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            HSV 颜色空间用色调 H（Hue）、饱和度 S（Saturation）、明度 V（Value）三个分量描述颜色。
            色调 H 由绕 V 轴的旋转角给出，红色对应 0°，绿色对应 120°，蓝色对应 240°。
            饱和度 S 取值 0 ~ 1，描述颜色的纯度。明度 V 取值 0 ~ 1，描述颜色的明亮程度。
            HSV 模型通常用圆锥空间模型表示。
          </p>
          <div className="mb-4 flex flex-wrap gap-4">
            <figure className="flex-1">
              <img src="/assets/color-space-histogram/hsv-cone.jpg" alt="HSV 圆锥空间模型" className="w-full max-w-xs rounded-xl object-cover" />
              <figcaption className="mt-2 text-xs text-slate-500">HSV 圆锥空间模型</figcaption>
            </figure>
            <figure className="flex-1">
              <img src="/assets/color-space-histogram/hsv-example.jpg" alt="HSV 应用示例" className="w-full max-w-xs rounded-xl object-cover" />
              <figcaption className="mt-2 text-xs text-slate-500">HSV 颜色空间应用示例</figcaption>
            </figure>
          </div>
        </TeachingCard>

        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">（3）RGB → HSV 转换</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            转换分两步：第一步将 R、G、B 值归一化到 [0, 1] 区间；第二步按 Cmax、Cmin、Δ 计算 H、S、V。
          </p>
          <div className="mb-4 space-y-3">
            <FormulaCard label="第一步：归一化" mathML={RPB_GPB_BPB} note="将 R、G、B 除以 255，得到 [0,1] 范围的 R′、G′、B′" />
            <FormulaCard label="第二步：求极值与差值" mathML={CMAX_CMIN_DELTA} note="Cmax 为最大值，Cmin 为最小值，Δ 为两者之差" />
            <FormulaCard label="H 色调计算（分段）" mathML={H_FORMULA} note="H 的取值范围为 0° ~ 360°" />
            <FormulaCard label="S 饱和度计算" mathML={S_FORMULA} note="S 的取值范围为 [0, 1]" />
            <FormulaCard label="V 明度计算" mathML={V_FORMULA} note="V 即 Cmax，取值范围为 [0, 1]" />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">（4）当前像素代入计算</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            对当前位置 ({currentPixel.x}, {currentPixel.y}) 的像素代入 RGB → HSV 转换公式：
          </p>
          <div className="space-y-3 text-xs leading-6">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-2 font-semibold text-slate-800">归一化：</p>
              <p className="text-slate-600">
                R′ = {r} / 255 = {rNorm.toFixed(3)}&emsp;
                G′ = {g} / 255 = {gNorm.toFixed(3)}&emsp;
                B′ = {b} / 255 = {bNorm.toFixed(3)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-2 font-semibold text-slate-800">极值与差值：</p>
              <p className="text-slate-600">
                Cmax = max({rNorm.toFixed(3)}, {gNorm.toFixed(3)}, {bNorm.toFixed(3)}) = {cmax.toFixed(3)}&emsp;
                Cmin = min({rNorm.toFixed(3)}, {gNorm.toFixed(3)}, {bNorm.toFixed(3)}) = {cmin.toFixed(3)}&emsp;
                Δ = Cmax − Cmin = {cmax.toFixed(3)} − {cmin.toFixed(3)} = {delta.toFixed(3)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-2 font-semibold text-slate-800">H 色调：</p>
              <p className="text-slate-600">
                由于 Cmax = {cmax === rNorm ? 'R′' : cmax === gNorm ? 'G′' : 'B′'}，
                H = {h}°
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-2 font-semibold text-slate-800">S 饱和度：</p>
              <p className="text-slate-600">
                S = Δ / Cmax = {delta.toFixed(3)} / {cmax.toFixed(3)} = {hsv.s.toFixed(3)} ≈ {s}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-2 font-semibold text-slate-800">V 明度：</p>
              <p className="text-slate-600">
                V = Cmax = {cmax.toFixed(3)} ≈ {v}%
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">（5）颜色直方图</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            颜色直方图统计图像中每个颜色分量（R、G、B）或 H 分量的像素数量分布。
            在目标检测中，提取目标的颜色直方图作为特征，通过直方图匹配方法（相关法、卡方法、
            直方图相交法、巴氏距离等）进行特征匹配，可实现对目标的识别与定位。
          </p>
          <TeachingCard>
            <div className="space-y-1 text-xs leading-5 text-slate-700">
              <p className="font-semibold">颜色直方图用于目标检测的基本流程：</p>
              <ol className="list-inside list-decimal space-y-1 pl-2">
                <li>从目标区域提取颜色分量或 H 分量的直方图 H₁(i)</li>
                <li>从待检测区域提取相同分量的直方图 H₂(i)</li>
                <li>采用直方图匹配方法计算两个直方图的相似度</li>
                <li>相似度超过阈值则判定为目标匹配</li>
              </ol>
            </div>
          </TeachingCard>
          <p className="mt-4 text-xs leading-6 text-slate-600">
            颜色特征适用于目标颜色与背景颜色有明显差异的场景。HSV 颜色空间中的 H 分量
            对光照变化相对不敏感，因此比 RGB 更适合用于颜色分割与目标检测任务。
          </p>
        </div>
      </div>
    );
  }, [currentPixel]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam label="显示模式" value={displayMode} onChange={value => setDisplayMode(value as DisplayMode)} options={DISPLAY_MODE_OPTIONS} />
      <SliderParam label="颜色阈值 T" value={threshold} onChange={setThreshold} min={10} max={200} step={10} />
      <p className="mt-1 text-[11px] leading-4 text-slate-500">
        用于颜色范围提取，在 HSV 空间中匹配 H ± T 区间内的像素
      </p>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">图像尺寸</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          示例图大小为 {width}×{height}，共 {width * height} 个像素。
          切换显示模式可观察不同颜色空间的分量分布。
        </p>
      </div>
      {currentPixel && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3">
          <div className="text-xs font-semibold text-amber-800">当前像素</div>
          <div className="mt-2 space-y-1 font-mono text-[11px] text-amber-800">
            <div>坐标 ({currentPixel.x}, {currentPixel.y})</div>
            <div>RGB ({currentPixel.r}, {currentPixel.g}, {currentPixel.b})</div>
            <div>HSV ({currentPixel.h}°, {currentPixel.s}%, {currentPixel.v}%)</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ConceptLayout
      title="颜色空间与颜色直方图"
      subtitle="Color Space &amp; Histogram - 基于颜色特征的目标检测"
      operationLabel={displayMode === 'rgb' ? 'RGB 彩图' : displayMode.toUpperCase()}
      parameterIntro="切换显示模式观察 RGB 与 HSV 各分量的分布差异，点击像素查看 RGB→HSV 的转换计算。"
      originalImage={resultImage}
      originalRgbImage={rgbImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: CODE_TS }]} />}
      currentStep={{ x: safePos.x, y: safePos.y, kernelSize: 1 }}
      stepInfo={{ current: currentStepIndex, total: totalSteps }}
      imageLabels={{ input: displayMode === 'rgb' ? 'RGB 彩图' : displayMode.toUpperCase() + ' 通道', output: displayMode === 'rgb' ? 'RGB 彩图' : displayMode.toUpperCase() + ' 通道' }}
      imageHints={{ input: '点击像素查看 RGB 与 HSV 数值转换', output: '点击像素查看对应通道值' }}
      showOriginalGrid
      originalRegionMarker="dot"
      singlePageScroll
      navigationHintText="方向键移动 / 点击图像定位像素"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handlePixelSelect}
      onOutputPixelSelect={handlePixelSelect}
    />
  );
}
