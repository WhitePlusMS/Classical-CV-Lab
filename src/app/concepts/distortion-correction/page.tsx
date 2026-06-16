'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  MathText,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { centerCropRgbImage, loadImageAsRgb, resizeRgbImage } from '@/lib/utils/imageProcessing';
import {
  buildUndistortionMaps,
  createCheckerboardRgbImage,
  createGeometryTeachingImage,
  distortImage,
  type DistortionCoefficients,
  rgbToGrayscale,
  undistortImage,
} from '@/lib/algorithms/imageGeometry';

const DISTORTION_CODE = `const { mapX, mapY } = initUndistortRectifyMap(K, distCoeffs, I, newK, size);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const srcX = mapX[y][x];
    const srcY = mapY[y][x];
    corrected[y][x] = bilinearSample(distorted, srcX, srcY);
  }
}`;

const SAMPLE_OPTIONS = [
  { value: 'checkerboard', label: '棋盘直线' },
  { value: 'geometry', label: '几何轮廓' },
  { value: 'lenaOriginal', label: 'Lena 彩色图' },
] as const;

const DISTORTION_OPTIONS = [
  { value: 'barrel', label: '桶形畸变' },
  { value: 'pincushion', label: '枕形畸变' },
] as const;

type SampleMode = (typeof SAMPLE_OPTIONS)[number]['value'];
type DistortionMode = (typeof DISTORTION_OPTIONS)[number]['value'];

function math(body: string): string {
  return buildInlineMathML(`<mrow>${body}</mrow>`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function DistortionCorrectionPage() {
  const [sampleMode, setSampleMode] = useState<SampleMode>('checkerboard');
  const [distortionMode, setDistortionMode] = useState<DistortionMode>('barrel');
  const [strength, setStrength] = useState(0.32);
  const [selectedPixel, setSelectedPixel] = useState({ x: 60, y: 60 });
  const [lenaRgb, setLenaRgb] = useState<ReturnType<typeof createCheckerboardRgbImage> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImageAsRgb('/assets/lena-original.jpg')
      .then(raw => {
        if (!cancelled) {
          const cropped = centerCropRgbImage(raw);
          setLenaRgb(resizeRgbImage(cropped, 120) as any);
        }
      })
      .catch(() => { if (!cancelled) setLenaRgb(null); });
    return () => { cancelled = true; };
  }, []);

  const idealRgb = useMemo(
    () => {
      if (sampleMode === 'lenaOriginal') return lenaRgb ?? createCheckerboardRgbImage(120, 10);
      return sampleMode === 'checkerboard' ? createCheckerboardRgbImage(120, 10) : createGeometryTeachingImage(120, 120);
    },
    [sampleMode, lenaRgb]
  );

  const coefficients = useMemo<DistortionCoefficients>(() => {
    const sign = distortionMode === 'barrel' ? -1 : 1;
    return {
      k1: sign * strength,
      k2: sign * strength * 0.18,
      p1: 0,
      p2: 0,
    };
  }, [distortionMode, strength]);

  const distortedRgb = useMemo(() => distortImage(idealRgb, coefficients), [coefficients, idealRgb]);
  const correctedRgb = useMemo(() => undistortImage(distortedRgb, coefficients), [coefficients, distortedRgb]);
  const distortedGray = useMemo(() => rgbToGrayscale(distortedRgb), [distortedRgb]);
  const correctedGray = useMemo(() => rgbToGrayscale(correctedRgb), [correctedRgb]);

  const width = correctedGray[0]?.length ?? 0;
  const height = correctedGray.length;

  const maps = useMemo(() => buildUndistortionMaps(width, height, coefficients), [coefficients, height, width]);

  const currentSource = useMemo(
    () => ({
      x: maps.mapX[selectedPixel.y]?.[selectedPixel.x] ?? 0,
      y: maps.mapY[selectedPixel.y]?.[selectedPixel.x] ?? 0,
    }),
    [maps.mapX, maps.mapY, selectedPixel.x, selectedPixel.y]
  );

  const handleDirectionMove = useGridNavigation({
    current: selectedPixel,
    bounds: { width, height },
    onMove: point => setSelectedPixel(point),
  });

  const handleOutputPixelSelect = (x: number, y: number) => {
    setSelectedPixel({ x, y });
  };

  const distortedValue = distortedGray[Math.round(currentSource.y)]?.[Math.round(currentSource.x)] ?? 0;
  const correctedValue = correctedGray[selectedPixel.y]?.[selectedPixel.x] ?? 0;
  const normalizedX = ((selectedPixel.x - width / 2) / (width / 2)).toFixed(3);
  const normalizedY = ((selectedPixel.y - height / 2) / (height / 2)).toFixed(3);
  const radialSquared = Number(normalizedX) ** 2 + Number(normalizedY) ** 2;
  const radialScale =
    1 + coefficients.k1 * radialSquared + coefficients.k2 * radialSquared ** 2;

  const contentHeader = (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-800">畸变校正的本质：坐标重映射</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          镜头畸变会把本应保持笔直的结构扭曲或弯曲。标定得到的畸变系数并不直接修改亮度，而是先计算每个输出像素应当回到原畸变图中的哪个坐标，再由
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">remap</code>
          完成采样。
        </p>
      </div>
      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        当前模式：{distortionMode === 'barrel' ? '桶形畸变校正' : '枕形畸变校正'}
          <div className="mt-1 text-[11px] leading-4 text-violet-600">
            桶形（k₁&lt;0）使直线向外鼓出，枕形（k₁&gt;0）使直线向内凹陷。
          </div>
      </div>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. 畸变图中的采样位置</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              畸变图是已经被镜头畸变扭曲后的观测图像。当前输出像素不会直接复制畸变图同坐标，而是先查询
              <MathText className="mx-1" mathML={math('<mi>mapx</mi><mo>,</mo><mi>mapy</mi>')} />
              给出的源位置。
            </p>
            <div className="mt-3 space-y-1 border-t border-red-100 pt-3 text-xs leading-5">
              <div className="font-medium text-red-800">
                源坐标约为 ({currentSource.x.toFixed(2)}, {currentSource.y.toFixed(2)})
              </div>
              <div className="text-slate-600">
                当前灰度采样值：{distortedValue.toFixed(3)}
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. 由畸变系数生成映射表</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              映射表通常由
              <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-[11px]">initUndistortRectifyMap</code>
              预先计算完成。当前坐标代入一次径向畸变映射后，就能得到等价的采样位置。
            </p>
            <FormulaCard
              className="mt-3"
              mathML={math('<msub><mi>x</mi><mi>d</mi></msub><mo>=</mo><mi>x</mi><mi>s</mi><mo>,</mo><msub><mi>y</mi><mi>d</mi></msub><mo>=</mo><mi>y</mi><mi>s</mi><mo>,</mo><mi>s</mi><mo>=</mo><mn>1</mn><mo>+</mo><msub><mi>k</mi><mn>1</mn></msub><msup><mi>r</mi><mn>2</mn></msup><mo>+</mo><msub><mi>k</mi><mn>2</mn></msub><msup><mi>r</mi><mn>4</mn></msup>')}
              formulaClassName="rounded-xl px-4 py-4 shadow-none"
              note={`当前使用 k1=${coefficients.k1.toFixed(3)}，k2=${coefficients.k2.toFixed(3)}。`}
              tone="embedded"
            />
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. remap 写回校正图</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              校正图的当前像素位于 ({selectedPixel.x}, {selectedPixel.y})，它显示的是畸变图源坐标采样后的结果（使用双线性插值），因此校正后直线会重新接近笔直。
            </p>
            <div className="mt-3 space-y-1 border-t border-emerald-100 pt-3 text-xs leading-5">
              <div className="font-medium text-emerald-800">
                输出灰度值：{correctedValue.toFixed(3)}
              </div>
              <div className="text-slate-600">
                空白或暗边来自越界采样，不是图像内容本身发生变化。
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const stepDetails = (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">畸变校正链路</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          畸变校正不是对像素值做卷积或增强，而是利用内参矩阵和畸变系数，为每个输出像素找到原畸变图中的采样位置。
        </p>
        <div className="mt-4 grid gap-4">
          <FormulaCard
            label="OpenCV 的两步实现"
            mathML={math('<mi>map</mi><mo>=</mo><mi>initUndistortRectifyMap</mi><mo>(</mo><mi>K</mi><mo>,</mo><mi>distCoeffs</mi><mo>)</mo><mo>,</mo><msup><mi>I</mi><mo>&prime;</mo></msup><mo>=</mo><mi>remap</mi><mo>(</mo><mi>I</mi><mo>,</mo><mi>map</mi><mo>)</mo>')}
            note="第一步算坐标映射，第二步按映射表取样。"
            tone="embedded"
          />
          <FormulaCard
            label="径向畸变"
            mathML={math('<msub><mi>x</mi><mi>d</mi></msub><mo>=</mo><mi>x</mi><mi>s</mi><mo>,</mo><msub><mi>y</mi><mi>d</mi></msub><mo>=</mo><mi>y</mi><mi>s</mi><mo>,</mo><mi>s</mi><mo>=</mo><mn>1</mn><mo>+</mo><msub><mi>k</mi><mn>1</mn></msub><msup><mi>r</mi><mn>2</mn></msup><mo>+</mo><msub><mi>k</mi><mn>2</mn></msub><msup><mi>r</mi><mn>4</mn></msup>')}
            note="x 和 y 都乘同一个径向比例项；桶形和枕形的差别，主要体现在一阶径向系数 k₁ 的正负。"
            tone="embedded"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前像素如何代入映射</div>
        <div className="grid gap-4">
          <FormulaCard
            label="输出像素的归一化坐标"
            mathML={math(`<mi>x</mi><mo>=</mo><mfrac><mrow><mo>(</mo><msup><mi>u</mi><mo>&prime;</mo></msup><mo>-</mo><msub><mi>c</mi><mi>x</mi></msub><mo>)</mo></mrow><msub><mi>f</mi><mi>x</mi></msub></mfrac><mo>=</mo><mfrac><mrow><mo>(</mo><mn>${selectedPixel.x}</mn><mo>-</mo><mn>${(width / 2).toFixed(0)}</mn><mo>)</mo></mrow><mn>${(width / 2).toFixed(0)}</mn></mfrac><mo>=</mo><mn>${normalizedX}</mn><mo>,</mo><mi>y</mi><mo>=</mo><mfrac><mrow><mo>(</mo><msup><mi>v</mi><mo>&prime;</mo></msup><mo>-</mo><msub><mi>c</mi><mi>y</mi></msub><mo>)</mo></mrow><msub><mi>f</mi><mi>y</mi></msub></mfrac><mo>=</mo><mfrac><mrow><mo>(</mo><mn>${selectedPixel.y}</mn><mo>-</mo><mn>${(height / 2).toFixed(0)}</mn><mo>)</mo></mrow><mn>${(height / 2).toFixed(0)}</mn></mfrac><mo>=</mo><mn>${normalizedY}</mn>`)}
            note="此处简化假设主点在图像中心（cₓ=w/2）且焦距等于半宽（fₓ=w/2），实际标定中这些值来自内参矩阵。"
            tone="embedded"
          />
          <FormulaCard
            label="当前径向比例项"
            mathML={math(`<msup><mi>r</mi><mn>2</mn></msup><mo>=</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>=</mo><msup><mn>${normalizedX}</mn><mn>2</mn></msup><mo>+</mo><msup><mn>${normalizedY}</mn><mn>2</mn></msup><mo>=</mo><mn>${radialSquared.toFixed(3)}</mn><mo>,</mo><mi>s</mi><mo>=</mo><mn>1</mn><mo>+</mo><msub><mi>k</mi><mn>1</mn></msub><msup><mi>r</mi><mn>2</mn></msup><mo>+</mo><msub><mi>k</mi><mn>2</mn></msub><msup><mi>r</mi><mn>4</mn></msup><mo>=</mo><mn>1</mn><mo>+</mo><mn>${coefficients.k1.toFixed(3)}</mn><mo>&#x22C5;</mo><mn>${radialSquared.toFixed(3)}</mn><mo>+</mo><mn>${coefficients.k2.toFixed(3)}</mn><mo>&#x22C5;</mo><msup><mn>${radialSquared.toFixed(3)}</mn><mn>2</mn></msup><mo>=</mo><mn>${radialScale.toFixed(3)}</mn>`)}
            note="比例项决定当前点向光轴中心收缩还是向外扩张。"
            tone="embedded"
          />
          <FormulaCard
            label="mapx / mapy 查询结果"
            mathML={math(`<msub><mi>u</mi><mi>s</mi></msub><mo>=</mo><mi>mapx</mi><mo>(</mo><msup><mi>u</mi><mo>&prime;</mo></msup><mo>,</mo><msup><mi>v</mi><mo>&prime;</mo></msup><mo>)</mo><mo>=</mo><mi>mapx</mi><mo>(</mo><mn>${selectedPixel.x}</mn><mo>,</mo><mn>${selectedPixel.y}</mn><mo>)</mo><mo>=</mo><mn>${currentSource.x.toFixed(2)}</mn><mo>,</mo><msub><mi>v</mi><mi>s</mi></msub><mo>=</mo><mi>mapy</mi><mo>(</mo><msup><mi>u</mi><mo>&prime;</mo></msup><mo>,</mo><msup><mi>v</mi><mo>&prime;</mo></msup><mo>)</mo><mo>=</mo><mi>mapy</mi><mo>(</mo><mn>${selectedPixel.x}</mn><mo>,</mo><mn>${selectedPixel.y}</mn><mo>)</mo><mo>=</mo><mn>${currentSource.y.toFixed(2)}</mn>`)}
            note="这就是 remap 要回到原畸变图中取样的位置。"
            tone="embedded"
          />
          <FormulaCard
            label="写回后的像素值"
            mathML={math(`<msup><mi>I</mi><mo>&prime;</mo></msup><mo>(</mo><msup><mi>u</mi><mo>&prime;</mo></msup><mo>,</mo><msup><mi>v</mi><mo>&prime;</mo></msup><mo>)</mo><mo>=</mo><mi>I</mi><mo>(</mo><msub><mi>u</mi><mi>s</mi></msub><mo>,</mo><msub><mi>v</mi><mi>s</mi></msub><mo>)</mo><mo>=</mo><mi>I</mi><mo>(</mo><mn>${currentSource.x.toFixed(2)}</mn><mo>,</mo><mn>${currentSource.y.toFixed(2)}</mn><mo>)</mo><mo>=</mo><mn>${correctedValue.toFixed(3)}</mn>`)}
            note="双线性插值会综合附近 4 个源像素，因此比最近邻采样的结果更平滑。"
            tone="embedded"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">如何判断校正是否有效</div>
        <div className="grid gap-4">
          <div className="text-sm leading-7 text-slate-700">
            <div>1. 观察棋盘格或边界线是否从弯曲恢复为接近直线。</div>
            <div>2. 注意边缘黑边并不表示校正失败，而是映射后的部分像素落在原图范围之外。</div>
            <div>3. 如果畸变系数与真实镜头不匹配，直线仍会残留弯曲或出现过校正。</div>
          </div>
          <div className="border-l-4 border-violet-300 pl-4 text-sm leading-7 text-violet-900">
            <div className="font-semibold">学习检查</div>
            <div className="mt-2">
              畸变校正的核心不是「改亮度」，而是「用标定参数把输出像素重新映射回原图中的正确采样位置」。
            </div>
          </div>
        </div>
      </TeachingCard>
    </div>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="教学示例"
        value={sampleMode}
        options={SAMPLE_OPTIONS}
        onChange={value => setSampleMode(value as SampleMode)}
      />
      <SelectParam
        label="畸变类型"
        value={distortionMode}
        options={DISTORTION_OPTIONS}
        onChange={value => setDistortionMode(value as DistortionMode)}
      />
      <SliderParam
        label="径向强度 |k1|"
        value={strength}
        min={0.08}
        max={0.48}
        step={0.02}
        onChange={setStrength}
      />
      <div className="border-t border-slate-200 pt-3 text-xs leading-6 text-slate-600">
        畸变图显示镜头畸变后的观测图像，校正图显示按照当前系数执行坐标校正后的结果。当前解释对象是校正图绿色框输出像素如何反向映射回畸变图采样位置；请优先观察直线边界是否恢复。
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="畸变校正"
      subtitle="Distortion Correction"
      operationLabel="畸变重映射"
      contentHeader={contentHeader}
      originalImage={distortedGray}
      resultImage={correctedGray}
      originalRgbImage={distortedRgb}
      resultRgbImage={correctedRgb}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: DISTORTION_CODE }]} />}
      singlePageScroll
      showOriginalGrid={false}
      imageLabels={{ input: '畸变图', output: '校正图' }}
      imageHints={{
        output: '校正图绿色框是当前正在解释的校正后输出像素。',
      }} currentStep={{
        x: selectedPixel.x,
        y: selectedPixel.y,
        kernelSize: 1,
        regionX: clamp(Math.round(currentSource.x), 0, width - 1),
        regionY: clamp(Math.round(currentSource.y), 0, height - 1),
        regionWidth: 1,
        regionHeight: 1,
      }}
      onDirectionMove={handleDirectionMove}
      onOutputPixelSelect={handleOutputPixelSelect}
    />
  );
}
