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
import { computeSiftSurf, type SiftKeypoint } from '@/lib/algorithms/siftSurf';
import {
  createLenaImage,
  createRectangleImage,
  createCircleImage,
} from '@/lib/utils/sampleImages';
import { useGridNavigation } from '@/hooks/useGridNavigation';

// ==================== 教学步骤常量 ====================

const TEACHING_STEPS = [
  { key: 'overview', label: 'SIFT 概览' },
  { key: 'scale-space', label: '高斯尺度空间' },
  { key: 'dog-detection', label: 'DoG 极值检测' },
  { key: 'orientation', label: '方向分配' },
  { key: 'descriptor', label: '描述子生成' },
  { key: 'surf', label: 'SURF 算法' },
  { key: 'matching', label: '特征匹配' },
] as const;

type TeachingStepKey = (typeof TEACHING_STEPS)[number]['key'];

const IMAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'lena', label: 'Lena' },
  { value: 'rectangle', label: '矩形' },
  { value: 'circle', label: '圆形' },
];

// ==================== 公式常量 ====================
const GAUSSIAN_SCALE_FORMULA = buildInlineMathML(
  '<mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>*</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>'
);
const GAUSSIAN_FUNC = buildInlineMathML(
  '<mrow><mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac><msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac></mrow></msup></mrow>'
);
const DOG_FORMULA = buildInlineMathML(
  '<mrow><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>k</mi><mi>σ</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mrow>'
);
const GRADIENT_MAG_FORMULA = buildInlineMathML(
  '<mrow><mi>m</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><msqrt><msup><mrow><mo>(</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>-</mo><mn>1</mn><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow>'
);
const GRADIENT_ORIENT_FORMULA = buildInlineMathML(
  '<mrow><mi>θ</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><msup><mi>tan</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mo>(</mo><mfrac><mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>-</mo><mn>1</mn><mo>)</mo></mrow><mrow><mi>L</mi><mo>(</mo><mi>x</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>y</mi><mo>)</mo></mrow></mfrac><mo>)</mo></mrow>'
);
const ROTATION_FORMULA = buildInlineMathML(
  '<mrow><mrow><mo>[</mo><mtable><mtr><mtd><msup><mi>x</mi><mo>′</mo></msup></mtd></mtr><mtr><mtd><msup><mi>y</mi><mo>′</mo></msup></mtd></mtr></mtable><mo>]</mo></mrow><mo>=</mo><mrow><mo>[</mo><mtable><mtr><mtd><mi>cos</mi><mi>θ</mi></mtd><mtd><mo>-</mo><mi>sin</mi><mi>θ</mi></mtd></mtr><mtr><mtd><mi>sin</mi><mi>θ</mi></mtd><mtd><mi>cos</mi><mi>θ</mi></mtd></mtr></mtable><mo>]</mo></mrow><mrow><mo>[</mo><mtable><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable><mo>]</mo></mrow></mrow>'
);
const DESCRIPTOR_NORM = buildInlineMathML(
  '<mrow><msub><mi>l</mi><mi>j</mi></msub><mo>=</mo><mfrac><msub><mi>w</mi><mi>j</mi></msub><mrow><msqrt><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mn>128</mn></munderover><msub><mi>w</mi><mi>i</mi></msub></msqrt></mrow></mfrac><mo>,</mo><mi>j</mi><mo>=</mo><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mo>⋯</mo><mo>,</mo><mn>128</mn></mrow>'
);
const SURF_HESSIAN = buildInlineMathML(
  '<mrow><mi>H</mi><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mrow><mo>[</mo><mtable><mtr><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd></mtr><mtr><mtd><msub><mi>L</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd><mtd><msub><mi>L</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>(</mo><mi>X</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mtd></mtr></mtable><mo>]</mo></mrow></mrow>'
);
const SURF_DET_HESSIAN = buildInlineMathML(
  '<mrow><mi>det</mi><mo>(</mo><msub><mi>H</mi><mrow><mi>approx</mi></mrow></msub><mo>)</mo><mo>=</mo><msub><mi>D</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><msub><mi>D</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>-</mo><mo>(</mo><mi>w</mi><msub><mi>D</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><msup><mo>)</mo><mn>2</mn></msup></mrow>'
);
const INTEGRAL_IMAGE = buildInlineMathML(
  '<mrow><mi>II</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><munderover><mo>∑</mo><mrow><msup><mi>x</mi><mo>′</mo></msup><mo>≤</mo><mi>x</mi></mrow><mrow></mrow></munderover><munderover><mo>∑</mo><mrow><msup><mi>y</mi><mo>′</mo></msup><mo>≤</mo><mi>y</mi></mrow><mrow></mrow></munderover><mi>I</mi><mo>(</mo><msup><mi>x</mi><mo>′</mo></msup><mo>,</mo><msup><mi>y</mi><mo>′</mo></msup><mo>)</mo></mrow>'
);
const EUCLIDEAN_DIST = buildInlineMathML(
  '<mrow><mi>D</mi><mo>(</mo><msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><msub><mi>X</mi><mi>j</mi></msub><mo>)</mo><mo>=</mo><msqrt><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>n</mi></munderover><msup><mrow><mo>(</mo><msub><mi>X</mi><mrow><mi>i</mi><mi>k</mi></mrow></msub><mo>-</mo><msub><mi>X</mi><mrow><mi>j</mi><mi>k</mi></mrow></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow>'
);

/** DoG 极值点检测 - 26 邻域比较判定 */
const DOG_EXTREMUM_FORMULA = buildInlineMathML(
  '<mrow>' +
  '<mtable>' +
  '<mtr><mtd><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mtext> 为局部极值 </mtext><mo>⟺</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>同层 8 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo><mo>,</mo><mtext> </mtext><mo>(</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>)</mo><mo>≠</mo><mo>(</mo><mn>0</mn><mo>,</mo><mn>0</mn><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>上层 9 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>k</mi><mi>σ</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>下层 9 邻域: </mtext><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>&gt;</mo><mi>D</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>d</mi><mi>x</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>d</mi><mi>y</mi><mo>,</mo><mi>σ</mi><mo>/</mo><mi>k</mi><mo>)</mo><mo>,</mo><mtext> </mtext><mi>d</mi><mi>x</mi><mo>,</mo><mi>d</mi><mi>y</mi><mo>∈</mo><mo>{</mo><mo>-</mo><mn>1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mtd></mtr>' +
  '<mtr><mtd><mtext>（或全部 </mtext><mo>&lt;</mo><mtext>，为局部极小值）</mtext></mtd></mtr>' +
  '</mtable>' +
  '</mrow>'
);

/** 尺度链式代入: L(x,y,σ) = G(x,y,σ) * I(x,y) = [(1/(2πσ²))e^(-(x²+y²)/(2σ²))] * I(x,y) */
const SCALE_CHAIN_FORMULA = buildInlineMathML(
  '<mrow>' +
  '<mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo>' +
  '<mo>=</mo>' +
  '<mi>G</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo>' +
  '<mo>*</mo>' +
  '<mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>' +
  '<mo>=</mo>' +
  '<mrow><mo>[</mo>' +
  '<mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac>' +
  '<msup><mi>e</mi><mrow><mo>-</mo><mfrac><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow><mrow><mn>2</mn><msup><mi>σ</mi><mn>2</mn></msup></mrow></mfrac></mrow></msup>' +
  '<mo>]</mo></mrow>' +
  '<mo>*</mo>' +
  '<mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>' +
  '</mrow>'
);
// ==================== 辅助组件 ====================

/** 8 柱方向直方图 */
function OrientationHistogramGraph({ hist, highlightBin }: { hist: number[]; highlightBin?: number }) {
  const max = Math.max(...hist, 0.01);
  return (
    <div className="grid grid-cols-8 gap-1">
      {hist.map((v, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="flex h-20 w-full items-end justify-center">
            <div
              className={'w-full rounded-t ' + (highlightBin === i ? 'bg-amber-500' : 'bg-amber-400')}
              style={{ height: Math.max((v / max) * 100, 5) + '%' }}
            />
          </div>
          <span className="mt-1 text-[9px] text-slate-500">{i * 45}°</span>
        </div>
      ))}
    </div>
  );
}

/** 4x4 子区域网格（描述子可视化） */
function DescriptorGrid({ grid, label }: { grid: number[][]; label: string }) {
  if (grid.length === 0) return null;
  const allVals = grid.flat();
  const maxVal = Math.max(...allVals, 0.01);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
      <div className="grid grid-cols-4 gap-1">
        {grid.map((sub, i) => (
          <div key={i} className="rounded border border-slate-200 bg-white p-1">
            <div className="text-[8px] text-slate-400">R{i}</div>
            <div className="mt-0.5 grid grid-cols-1 gap-0.5">
              {sub.map((v, j) => (
                <div key={j} className="flex items-center gap-0.5">
                  <div
                    className="h-1.5 flex-1 rounded"
                    style={{
                      backgroundColor: 'rgba(251, 146, 60, ' + Math.max(v / maxVal, 0.05) + ')',
                    }}
                  />
                  <span className="w-5 text-right text-[7px] font-mono text-slate-500">
                    {v.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 代码 ====================

const SIFT_SURF_CODE = '// 简化 SIFT 关键点检测\n' +
'function detectSIFTKeypoints(image, sigma) {\n' +
'  // 1. 构建高斯尺度空间\n' +
'  const gaussianScales = buildGaussianPyramid(image, sigma);\n' +
'  // 2. 构建 DoG 尺度空间\n' +
'  const dogScales = [];\n' +
'  for (let i = 0; i < gaussianScales.length - 1; i++) {\n' +
'    dogScales.push(subtract(gaussianScales[i + 1], gaussianScales[i]));\n' +
'  }\n' +
'  // 3. 极值检测（26 邻域）\n' +
'  const keypoints = [];\n' +
'  for (const dog of dogScales) {\n' +
'    for (let y = 1; y < h - 1; y++) {\n' +
'      for (let x = 1; x < w - 1; x++) {\n' +
'        if (isLocalExtremum(dog, x, y)) {\n' +
'          keypoints.push({ x, y, scale: currentScale });\n' +
'        }\n' +
'      }\n' +
'    }\n' +
'  }\n' +
'  // 4. 方向分配\n' +
'  for (const kp of keypoints) {\n' +
'    const hist = computeOrientationHistogram(image, kp);\n' +
'    kp.orientation = findPeak(hist);\n' +
'  }\n' +
'  // 5. 描述子生成（4x4x8 = 128 维）\n' +
'  for (const kp of keypoints) {\n' +
'    kp.descriptor = computeSIFTDescriptor(image, kp);\n' +
'  }\n' +
'  return keypoints;\n' +
'}';

/** 在图像上画关键点标记 */
function renderKeypointOverlay(
  image: number[][], keypoints: SiftKeypoint[], selectedIdx: number
): number[][] {
  const h = image.length;
  const w = image[0]?.length ?? 0;
  const overlay = image.map(row => [...row]);

  for (let i = 0; i < keypoints.length; i++) {
    const kp = keypoints[i];
    const isSelected = i === selectedIdx;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = kp.x + dx;
        const py = kp.y + dy;
        if (px >= 0 && px < w && py >= 0 && py < h) {
          overlay[py][px] = isSelected ? 1.0 : 0.7;
        }
      }
    }
  }

  return overlay;
}

// ==================== 页面组件 ====================

export default function SiftSurfScaleFeaturesPage() {
  const [step, setStep] = useState<TeachingStepKey>('overview');
  const [imageType, setImageType] = useState<string>('lena');
  const [sigma, setSigma] = useState(1.0);
  const [numScales, setNumScales] = useState(3);
  const [selectedKpIdx, setSelectedKpIdx] = useState(0);
  const [currentPosition, setCurrentPosition] = useState({ x: 16, y: 16 });

  // 获取源图像
  const sourceImage = useMemo(() => {
    switch (imageType) {
      case 'rectangle': return createRectangleImage();
      case 'circle': return createCircleImage();
      default: return createLenaImage();
    }
  }, [imageType]);

  // 计算 SIFT/SURF 结果
  const result = useMemo(
    () => computeSiftSurf(sourceImage, sigma, numScales, selectedKpIdx),
    [sourceImage, sigma, numScales, selectedKpIdx]
  );

  const { keypoints, gaussianScales, dogScales, stepData } = result;

  // 导航
  const handleDirectionMove = useGridNavigation({
    current: currentPosition,
    bounds: {
      width: sourceImage[0]?.length ?? 0,
      height: sourceImage.length,
    },
    onMove: setCurrentPosition,
    disabled: sourceImage.length === 0,
  });

  const handleInputRegionSelect = useCallback((x: number, y: number) => {
    setCurrentPosition({ x, y });
  }, []);

  const handleImageChange = useCallback((value: string) => {
    setImageType(value);
    setSelectedKpIdx(0);
  }, []);

  const handleSigmaChange = useCallback((value: number) => {
    setSigma(value);
    setSelectedKpIdx(0);
  }, []);

  // 关键点覆盖图
  const keypointImage = useMemo(
    () => renderKeypointOverlay(sourceImage, keypoints, selectedKpIdx),
    [sourceImage, keypoints, selectedKpIdx]
  );

  // ==================== Parameters ====================

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="教学步骤"
        value={step}
        onChange={(v) => setStep(v as TeachingStepKey)}
        options={TEACHING_STEPS.map(s => ({ value: s.key, label: s.label }))}
      />

      <SelectParam
        label="测试图像"
        value={imageType}
        onChange={handleImageChange}
        options={IMAGE_OPTIONS}
      />

      <SliderParam
        label="初始尺度 &sigma;"
        value={sigma}
        onChange={handleSigmaChange}
        min={0.5}
        max={2.0}
        step={0.1}
      />

      <SliderParam
        label="每组层数"
        value={numScales}
        onChange={(v) => { setNumScales(v); setSelectedKpIdx(0); }}
        min={2}
        max={5}
        step={1}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
        <div className="text-[11px] font-semibold text-amber-800">检测到的关键点</div>
        <div className="mt-1 text-[10px] text-amber-700">
          共 {keypoints.length} 个（按响应值排序，显示前 20 个）
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {keypoints.slice(0, 15).map((kp, i) => (
            <button
              key={i}
              onClick={() => setSelectedKpIdx(i)}
              className={'rounded px-1 py-0.5 text-[9px] font-mono ' +
                (selectedKpIdx === i
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-amber-100')}
            >
              #{i}
            </button>
          ))}
        </div>
        {stepData.currentKeypoint && (
          <div className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] text-slate-700">
            Kp #{selectedKpIdx}: ({stepData.currentKeypoint.x},{stepData.currentKeypoint.y})
            &sigma;={stepData.currentKeypoint.scale.toFixed(1)}
            &theta;={(stepData.currentKeypoint.orientation * 180 / Math.PI).toFixed(0)}&deg;
          </div>
        )}
      </div>
    </div>
  );

  // ==================== Analysis Preview ====================

  const analysisPreview = useMemo(() => {
    switch (step) {
      case 'scale-space':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="mb-2 text-[11px] font-semibold text-red-700">原图 I(x,y)</div>
                  <ImageCanvas image={sourceImage} maxDisplaySize={120} showGrid={false} />
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="amber">
                  <div className="mb-2 text-[11px] font-semibold text-amber-700">高斯卷积</div>
                  <div className="rounded bg-amber-50 px-3 py-3 text-center text-xs text-amber-800">
                    G(x,y,&sigma;) * I(x,y)
                  </div>
                  {gaussianScales.length > 1 && (
                    <div className="mt-3">
                      <div className="mb-1 text-[10px] text-amber-700">尺度层</div>
                      <div className="grid grid-cols-4 gap-1">
                        {gaussianScales.slice(0, 4).map((g, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <ImageCanvas image={g} maxDisplaySize={50} showGrid={false} />
                            <span className="mt-0.5 text-[8px] text-slate-500">s={i}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">模糊结果</div>
                  <ImageCanvas image={gaussianScales[1] ?? sourceImage} maxDisplaySize={120} showGrid={false} />
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    尺度 &sigma; 越大，图像越模糊。相邻两层的尺度因子比例系数为 k。
                  </p>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );

      case 'dog-detection':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="mb-2 text-[11px] font-semibold text-red-700">原图（关键点标记）</div>
                  <ImageCanvas image={keypointImage} maxDisplaySize={130} showGrid={false} />
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    高亮点为检测到的 DoG 极值点。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="amber">
                  <div className="mb-2 text-[11px] font-semibold text-amber-700">DoG 响应图</div>
                  {dogScales.length > 0 && (
                    <ImageCanvas image={dogScales[0]} maxDisplaySize={130} showGrid={false} />
                  )}
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    亮区为高响应区域。每个像素与同层 8 个邻域 + 上下层各 9 个（共 26 个）比较。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">选中关键点</div>
                  <ImageCanvas
                    image={keypointImage}
                    maxDisplaySize={130}
                    showGrid={false}
                    highlightPixel={{
                      x: stepData.currentKeypoint?.x ?? 0,
                      y: stepData.currentKeypoint?.y ?? 0,
                    }}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    当前选中的关键点以高亮标记。
                  </p>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );

      case 'orientation':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="mb-2 text-[11px] font-semibold text-red-700">关键点邻域梯度</div>
                  {stepData.gradientMagnitudes && (
                    <ImageCanvas image={stepData.gradientMagnitudes} maxDisplaySize={120} showGrid={false} />
                  )}
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    以关键点为中心，计算 17x17 邻域的梯度幅值。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="sky">
                  <div className="mb-2 text-[11px] font-semibold text-sky-700">方向直方图</div>
                  {stepData.orientationHistogram ? (
                    <OrientationHistogramGraph
                      hist={stepData.orientationHistogram}
                      highlightBin={(() => {
                        const h = stepData.orientationHistogram ?? [];
                        let mb = 0;
                        for (let i = 1; i < h.length; i++) if (h[i] > h[mb]) mb = i;
                        return mb;
                      })()}
                    />
                  ) : (
                    <div className="text-xs text-slate-400">无数据</div>
                  )}
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">方向分配结果</div>
                  {stepData.currentKeypoint && (
                    <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center">
                      <div className="text-lg font-bold text-emerald-700">
                        {(stepData.currentKeypoint.orientation * 180 / Math.PI).toFixed(0)}&deg;
                      </div>
                      <div className="mt-1 text-xs text-slate-500">关键点主方向</div>
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    直方图峰值方向为关键点主方向，使描述子具有旋转不变性。
                  </p>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );

      case 'descriptor':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="mb-2 text-[11px] font-semibold text-red-700">关键点邻域</div>
                  {stepData.gradientMagnitudes && (
                    <ImageCanvas image={stepData.gradientMagnitudes} maxDisplaySize={120} showGrid />
                  )}
                  <p className="mt-2 text-xs text-slate-600">16x16 邻域划分为 4x4 子区域。</p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="sky">
                  <div className="mb-2 text-[11px] font-semibold text-sky-700">SIFT: 4x4x8 = 128 维</div>
                  {stepData.siftDescriptorGrid && (
                    <DescriptorGrid grid={stepData.siftDescriptorGrid} label="每个子区域 8 方向" />
                  )}
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">SURF: 4x4x4 = 64 维</div>
                  {stepData.surfDescriptorGrid && (
                    <DescriptorGrid
                      grid={stepData.surfDescriptorGrid}
                      label="&Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy|"
                    />
                  )}
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );

      case 'surf':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="mb-2 text-[11px] font-semibold text-red-700">积分图加速</div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs text-red-700">
                    任意矩形区域像素和只需 4 次查表
                  </div>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="amber">
                  <div className="mb-2 text-[11px] font-semibold text-amber-700">Hessian 行列式</div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">
                    用盒子滤波器近似高斯二阶偏导
                  </div>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">描述子</div>
                  {stepData.surfDescriptorGrid && (
                    <DescriptorGrid grid={stepData.surfDescriptorGrid} label="Haar 小波响应" />
                  )}
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );

      case 'matching':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red" className="max-w-xs">
                  <div className="mb-2 text-[11px] font-semibold text-red-700">匹配对数</div>
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {stepData.matches?.length ?? 0}
                    </div>
                    <div className="text-xs text-red-600">最近邻比值 &lt; 0.8</div>
                  </div>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="amber">
                  <div className="mb-2 text-[11px] font-semibold text-amber-700">匹配距离</div>
                  {stepData.matches && stepData.matches.length > 0 ? (
                    <div className="space-y-1">
                      {stepData.matches.slice(0, 10).map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-8 text-right text-[9px] text-slate-400">
                            {m.queryIdx}-{m.trainIdx}
                          </span>
                          <div className="h-2.5 flex-1 rounded bg-slate-100">
                            <div
                              className="h-full rounded bg-amber-500"
                              style={{ width: Math.max(100 - m.distance * 50, 5) + '%' }}
                            />
                          </div>
                          <span className="w-10 text-right text-[9px] font-mono text-slate-500">
                            {m.distance.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">无匹配</div>
                  )}
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">比值检验</div>
                  <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs leading-6 text-slate-700">
                    最小距离 / 次小距离 &lt; 阈值（0.8）时匹配可靠。
                    阈值越小，匹配越稳定，但数目越少。
                  </div>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );

      default: // overview
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="mb-2 text-[11px] font-semibold text-red-700">待检测图像</div>
                  <ImageCanvas image={sourceImage} maxDisplaySize={110} showGrid={false} />
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="amber">
                  <div className="mb-2 text-[11px] font-semibold text-amber-700">SIFT 四步流程</div>
                  <div className="space-y-2">
                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                      1. 尺度空间极值检测
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                      2. 关键点定位
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                      3. 方向分配
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] text-slate-700">
                      4. 描述子生成
                    </div>
                  </div>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="mb-2 text-[11px] font-semibold text-emerald-700">检测结果</div>
                  <ImageCanvas image={keypointImage} maxDisplaySize={110} showGrid={false} />
                  <p className="mt-2 text-[10px] text-slate-500">共 {keypoints.length} 个关键点</p>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );
    }
  }, [step, sourceImage, gaussianScales, dogScales, keypointImage, keypoints,
      stepData, selectedKpIdx]);

  // ==================== Step Details ====================

  const stepDetails = useMemo(() => {
    switch (step) {
      case 'scale-space':
        return (
          <div className="space-y-4">
            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">高斯尺度空间</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                尺度空间的核心思想是：通过高斯卷积核在不同尺度下对图像进行平滑，
                模拟人眼或相机在不同距离观察目标的效果。尺度越大，图像越模糊，细节被抑制。
              </p>
            </TeachingCard>

            <FormulaCard label="高斯函数" mathML={GAUSSIAN_FUNC} />
            <p className="text-xs text-slate-500">&sigma; 控制平滑程度；&sigma; 越大，图像越模糊。</p>

            <FormulaCard label="高斯尺度空间" mathML={GAUSSIAN_SCALE_FORMULA} />
            <p className="text-xs text-slate-500">
              对原图 I(x,y) 与不同尺度 &sigma; 的高斯核 G 做卷积，得到一组尺度空间图像 L。
            </p>

            <TeachingCard>
              <div className="flex flex-wrap gap-3">
                {gaussianScales.slice(0, 5).map((g, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <ImageCanvas image={g} maxDisplaySize={80} showGrid={false} />
                    <div className="mt-1 text-[9px] text-slate-500">
                      &sigma; = {(sigma * (2 ** (i / Math.max(numScales, 1)))).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                从左到右：&sigma; 逐渐增大，图像逐渐模糊。相邻层尺度因子比例 k。
              </div>
            </TeachingCard>

            <TeachingCard>
              <img
                src="/assets/sift-surf/gaussian-pyramid.jpg"
                alt="高斯金字塔"
                className="h-auto max-w-full rounded-lg"
              />
              <div className="mt-2 text-[10px] text-slate-500">
                高斯金字塔：同一阶相邻两层的尺度因子比例系数为 k，下一阶由上一阶中间层降采样获得。
              </div>
            </TeachingCard>
          </div>
        );

      case 'dog-detection':
        return (
          <div className="space-y-4">
            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">DoG 尺度空间与极值检测</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                DoG（Difference of Gaussian）是尺度归一化高斯拉普拉斯的近似，
                通过相邻高斯尺度空间的图像相减得到。
              </p>
            </TeachingCard>

            <FormulaCard label="DoG 尺度空间" mathML={DOG_FORMULA} />
            <p className="text-xs text-slate-500">
              D(x,y,&sigma;) 为相邻高斯尺度空间之差，k 为相邻尺度的比例因子。
            </p>

            <TeachingCard>
              <div className="flex flex-wrap gap-3">
                {dogScales.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <ImageCanvas image={d} maxDisplaySize={80} showGrid={false} />
                    <div className="mt-1 text-[9px] text-slate-500">DoG {i}</div>
                  </div>
                ))}
              </div>
            </TeachingCard>

            <TeachingCard>
              <img
                src="/assets/sift-surf/dog-pyramid.jpg"
                alt="DoG 金字塔"
                className="h-auto max-w-full rounded-lg"
              />
            </TeachingCard>

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">26 邻域极值检测</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                在 DoG 尺度空间中，中间层的每个像素需要与同层相邻的 8 个像素、
                上下层各 9 个像素（共 26 个邻域点）进行比较。
                若该点的 DoG 值比所有 26 个邻域点都大或都小，则记为候选极值点。
              </p>
           </TeachingCard>

            <FormulaCard label="26 邻域极值判定条件" mathML={DOG_EXTREMUM_FORMULA} />

            <TeachingCard>
              <img
                src="/assets/sift-surf/dog-extreme-detection.jpg"
                alt="DOG 极值检测 26 邻域"
                className="h-auto max-w-full rounded-lg"
              />
              <div className="mt-2 text-[10px] text-slate-500">
                标记叉号的像素与 26 个相邻像素比较，确定局部极值。
              </div>
            </TeachingCard>
          </div>
        );

      case 'orientation':
        return (
          <div className="space-y-4">
            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">关键点方向分配</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                为使描述子具有旋转不变性，需要为每个关键点分配基准方向。
                基于关键点邻域像素的梯度方向直方图确定主方向。
              </p>
            </TeachingCard>

            <FormulaCard label="梯度幅值" mathML={GRADIENT_MAG_FORMULA} />
            <FormulaCard label="梯度方向" mathML={GRADIENT_ORIENT_FORMULA} />

            <TeachingCard>
              {stepData.orientationHistogram && (
                <div>
                  <div className="mb-2 text-xs font-semibold text-slate-700">
                    当前关键点方向直方图（8 柱，每柱 45&deg;）
                  </div>
                  <OrientationHistogramGraph
                    hist={stepData.orientationHistogram}
                    highlightBin={(() => {
                      const h = stepData.orientationHistogram ?? [];
                      let mb = 0;
                      for (let i = 1; i < h.length; i++) if (h[i] > h[mb]) mb = i;
                      return mb;
                    })()}
                  />
                  {stepData.currentKeypoint && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      主方向: {(stepData.currentKeypoint.orientation * 180 / Math.PI).toFixed(1)}&deg;
                    </div>
                  )}
                </div>
              )}
            </TeachingCard>

            <TeachingCard>
              <img
                src="/assets/sift-surf/orientation-histogram.jpg"
                alt="方向直方图"
                className="h-auto max-w-full rounded-lg"
              />
              <div className="mt-1 text-[10px] text-slate-500">直方图的峰值方向即为关键点主方向。</div>
            </TeachingCard>
          </div>
        );

      case 'descriptor':
        return (
          <div className="space-y-4">
            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">SIFT 描述子</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                在关键点周围取 16x16 邻域，划分为 4x4 个子区域。
                每个子区域计算 8 个方向的梯度累加值，共 4x4x8 = 128 维向量。
              </p>
            </TeachingCard>

            <TeachingCard>
              <img
                src="/assets/sift-surf/sift-descriptor-grid.jpg"
                alt="SIFT 描述子网格"
                className="h-auto max-w-full rounded-lg"
              />
              <div className="mt-1 text-[10px] text-slate-500">
                左：关键点 16x16 邻域梯度；右：4x4 子区域 8 方向直方图叠加。
              </div>
            </TeachingCard>

            <TeachingCard>
              <img
                src="/assets/sift-surf/coordinate-rotation.jpg"
                alt="坐标旋转"
                className="h-auto max-w-full rounded-lg"
              />
              <div className="mt-1 text-[10px] text-slate-500">
                将坐标轴旋转到关键点主方向，确保旋转不变性。
              </div>
            </TeachingCard>

            <FormulaCard label="坐标旋转" mathML={ROTATION_FORMULA} />
            <FormulaCard label="描述子归一化" mathML={DESCRIPTOR_NORM} />

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">SIFT vs SURF 描述子对比</div>
              <table className="mt-2 w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700">特性</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700">SIFT</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700">SURF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">邻域大小</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">16x16</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">20s x 20s</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">子区域</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">4x4</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">4x4</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">描述方式</td>
                    <td className="px-2 py-1.5 text-slate-700">8 方向梯度直方图</td>
                    <td className="px-2 py-1.5 text-slate-700">Haar 小波 &Sigma;dx, &Sigma;|dx|, &Sigma;dy, &Sigma;|dy|</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">维数</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">128</td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">64</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-3">
                {stepData.siftDescriptorGrid && (
                  <DescriptorGrid grid={stepData.siftDescriptorGrid} label="SIFT 各子区域 8 方向直方图" />
                )}
              </div>
              <div className="mt-3">
                {stepData.surfDescriptorGrid && (
                  <DescriptorGrid grid={stepData.surfDescriptorGrid} label="SURF 各子区域 4 维响应" />
                )}
              </div>
            </TeachingCard>
          </div>
        );

      case 'surf':
        return (
          <div className="space-y-4">
            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">SURF 算法</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                SURF 在 SIFT 基础上引入积分图、近似 Hessian 矩阵和 Haar 小波响应，
                大幅提高计算速度，同时保持较好的鲁棒性。
              </p>
            </TeachingCard>

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">积分图像</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                积分图像中每个点存储其左上方向所有像素的灰度值之和。
                任意矩形区域的像素和只需 4 次查表即可计算，与矩形大小无关。
              </p>
            </TeachingCard>

            <FormulaCard label="积分图像定义" mathML={INTEGRAL_IMAGE} />

            <TeachingCard>
              <img
                src="/assets/sift-surf/integral-image.jpg"
                alt="积分图像"
                className="h-auto max-w-full rounded-lg"
              />
            </TeachingCard>

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">Hessian 矩阵检测</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                SURF 使用近似的 Hessian 矩阵行列式定位兴趣点。
                用盒子滤波器近似高斯二阶偏导，结合积分图实现快速卷积。
              </p>
            </TeachingCard>

            <FormulaCard label="Hessian 矩阵" mathML={SURF_HESSIAN} />
            <FormulaCard label="近似行列式" mathML={SURF_DET_HESSIAN} />
            <p className="text-xs text-slate-500">w 取 0.9，补偿近似误差。</p>

            <TeachingCard>
              <img
                src="/assets/sift-surf/surf-hessian-filters.jpg"
                alt="SURF 滤波器"
                className="h-auto max-w-full rounded-lg"
              />
              <div className="mt-1 text-[10px] text-slate-500">盒子滤波器对高斯二阶导数的近似（9x9 模板）。</div>
            </TeachingCard>

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">尺度空间对比</div>
              <img
                src="/assets/sift-surf/sift-surf-scale-comparison.jpg"
                alt="SIFT 与 SURF 尺度空间对比"
                className="mt-2 h-auto max-w-full rounded-lg"
              />
              <div className="mt-1 text-[10px] text-slate-500">
                SIFT 改变图像大小，SURF 保持图像大小不变、改变滤波器大小。
              </div>
            </TeachingCard>

            <TeachingCard>
              <img
                src="/assets/sift-surf/surf-descriptor.jpg"
                alt="SURF 描述子"
                className="h-auto max-w-full rounded-lg"
              />
              <div className="mt-1 text-[10px] text-slate-500">
                SURF 描述子：20s x 20s 区域划分为 4x4 子块，计算 Haar 小波响应。
              </div>
            </TeachingCard>
          </div>
        );

      case 'matching':
        return (
          <div className="space-y-4">
            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">特征匹配</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                特征匹配通过计算两个特征描述子的相似度来实现。
                常用欧氏距离（SIFT/SURF）和汉明距离（BRIEF/ORB）。
              </p>
            </TeachingCard>

            <FormulaCard label="欧氏距离" mathML={EUCLIDEAN_DIST} />

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">最近邻比值检验</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                对于待配准图上的特征点，计算它到参考图像上所有特征点的欧氏距离，
                得到最小距离 d_min 和次小距离 d_2nd。如果：
              </p>
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center font-mono text-sm font-bold text-amber-800">
                d_min / d_2nd &lt; 0.8
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                则该匹配被认为是可靠的。阈值越小，匹配越稳定，但数目越少。
              </p>
            </TeachingCard>

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">SIFT 与 SURF 对比</div>
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700">特性</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700">SIFT</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700">SURF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">尺度空间</td>
                    <td className="px-2 py-1.5 text-slate-700">DoG 与不同尺度图像卷积</td>
                    <td className="px-2 py-1.5 text-slate-700">不同尺度 box filter 与原图卷积</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">特征点检测</td>
                    <td className="px-2 py-1.5 text-slate-700">非极大抑制 + 去除低对比度 + Hessian 去边缘</td>
                    <td className="px-2 py-1.5 text-slate-700">Hessian 确定候选 + 非极大抑制</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">方向</td>
                    <td className="px-2 py-1.5 text-slate-700">正方形区域梯度幅值直方图</td>
                    <td className="px-2 py-1.5 text-slate-700">圆形区域 Haar 小波响应，扇形滑动</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">描述子</td>
                    <td className="px-2 py-1.5 text-slate-700">16x16 &rarr; 4x4 x 8bin = 128 维</td>
                    <td className="px-2 py-1.5 text-slate-700">20sx20s &rarr; 4x4 x 4维 = 64 维</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-2 py-1.5 text-slate-600">速度</td>
                    <td className="px-2 py-1.5 text-slate-700">较慢</td>
                    <td className="px-2 py-1.5 text-slate-700">较快（积分图加速）</td>
                  </tr>
                </tbody>
              </table>
            </TeachingCard>

            {stepData.matches && stepData.matches.length > 0 && (
              <TeachingCard>
                <div className="text-xs font-semibold text-slate-700">
                  当前有 {stepData.matches.length} 对匹配
                </div>
                <div className="mt-2 space-y-1">
                  {stepData.matches.slice(0, 5).map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">#{i + 1}</span>
                      <span>Kp {m.queryIdx} &harr; {m.trainIdx}</span>
                      <span className="ml-auto font-mono text-amber-700">
                        d = {m.distance.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </TeachingCard>
            )}
          </div>
        );

      default: // overview
        return (
          <div className="space-y-4">
            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">SIFT 算法概述</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                SIFT（Scale Invariant Feature Transform）是一种经典的局部特征检测算法。
                它将一幅图像映射为局部特征向量集，特征向量具有平移、缩放、旋转不变性，
                同时对光照变化、仿射变换也有一定不变性。
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                总共包括四步：（1）检测尺度空间极值点；（2）精确确定关键点位置和尺度；
                （3）为关键点分配方向；（4）生成关键点描述子。
              </p>
            </TeachingCard>

            <TeachingCard>
              <div className="text-sm font-semibold text-slate-800">SURF 算法简介</div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                SURF（Speeded Up Robust Features）在 SIFT 基础上引入积分图、
                近似 Hessian 矩阵和 Haar 小波变换来提高时间效率。
              </p>
            </TeachingCard>

            {keypoints.length > 0 && (
              <TeachingCard>
                <div className="text-xs font-semibold text-slate-700">当前图像检测结果</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">关键点总数</div>
                    <div className="text-lg font-bold text-slate-800">{keypoints.length}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">匹配对数</div>
                    <div className="text-lg font-bold text-slate-800">
                      {stepData.matches?.length ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">当前 &sigma;</div>
                    <div className="text-lg font-bold text-slate-800">{sigma.toFixed(1)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">每组层数</div>
                    <div className="text-lg font-bold text-slate-800">{numScales}</div>
                  </div>
                </div>
              </TeachingCard>
            )}

            <FormulaCard label="尺度空间链式代入" mathML={SCALE_CHAIN_FORMULA} />

          </div>
        );
    }
  }, [step, gaussianScales, dogScales, sigma, numScales, keypoints,
      stepData, selectedKpIdx, sourceImage]);

 // ==================== Main Render ====================
 return (
    <ConceptLayout
      title="SIFT / SURF 尺度特征"
      subtitle="Scale Invariant Features - 尺度不变的局部特征检测"
      operationLabel={
        step === 'overview' ? 'SIFT 四步流程' :
        step === 'scale-space' ? '尺度空间构建' :
        step === 'dog-detection' ? 'DoG 极值检测' :
        step === 'orientation' ? '方向分配' :
        step === 'descriptor' ? '描述子生成' :
        step === 'surf' ? 'SURF 算法' : '特征匹配'
      }
     parameterIntro="选择教学步骤与测试图像，调整尺度参数观察关键点变化，选中单个关键点查看其描述子细节。"
     originalImage={sourceImage}
     resultImage={keypointImage}
     parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      imageHints={{
        input: '原图，点击定位像素',
        output: '关键点检测结果（高亮标记当前选中）',
      }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      navigationHintText="方向键移动 / 点击图像定位"
      onInputRegionSelect={handleInputRegionSelect}
      codeTab={
        <CodeViewer languages={[{ name: 'TypeScript', code: SIFT_SURF_CODE }]} />
      }
      onDirectionMove={handleDirectionMove}
    />
  );
}
