'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  MathText,
  ProcessRail,
  SelectParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  gradientSharpen,
  laplaceEnhance,
  gradientSharpenSteps,
  laplaceEnhanceSteps,
  LAPLACE_ENHANCE_KERNEL,
  type GradientMethod,
  type GradientSharpenStep,
  type LaplaceEnhanceStep,
} from '@/lib/algorithms/sharpening';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { loadImageAsGrayscale, resizeGrayscaleImage } from '@/lib/utils/imageProcessing';
import { useGridNavigation } from '@/hooks/useGridNavigation';

// ============================================================
const GRADIENT_CODE_TS = `function gradientSharpen(image: number[][], method: 'max' | 'sum'): number[][] {
  const height = image.length;
  const width = image[0].length;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 一阶差分：水平和垂直方向
      const fiDiff = image[y][clamp(x + 1, 0, width - 1)] - image[y][x];
      const fjDiff = image[clamp(y + 1, 0, height - 1)][x] - image[y][x];

      const absFi = Math.abs(fiDiff);
      const absFj = Math.abs(fjDiff);

      // 梯度幅值近似
      const grad = method === 'max'
        ? Math.max(absFi, absFj)
        : absFi + absFj;

      // 截断到有效范围
      result[y][x] = clamp(grad, 0, 1);
    }
  }
  return result;
}`;

const LAPLACE_CODE_TS = `function laplaceEnhance(image: number[][]): number[][] {
  const height = image.length;
  const width = image[0].length;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 四邻域像素
      const top = image[clamp(y - 1, 0, height - 1)][x];
      const bottom = image[clamp(y + 1, 0, height - 1)][x];
      const left = image[y][clamp(x - 1, 0, width - 1)];
      const right = image[y][clamp(x + 1, 0, width - 1)];
      const center = image[y][x];

      // Laplace 二阶差分
      const laplacian = bottom + top + right + left - 4 * center;

      // 增强：g = f - ∇²f，截断到 [0, 1]
      result[y][x] = clamp(center - laplacian, 0, 1);
    }
  }
  return result;
}`;

// ============================================================
type SharpenMethod = 'gradient' | 'laplace';

const METHOD_OPTIONS = [
  { value: 'gradient', label: '梯度锐化' },
  { value: 'laplace', label: 'Laplace 增强' },
];

const GRADIENT_MODE_OPTIONS = [
  { value: 'max', label: 'max(|fᵢ′|, |fⱼ′|)' },
  { value: 'sum', label: '|fᵢ′| + |fⱼ′|' },
];

function FormulaLine({
  mathML,
  className = '',
  mathClassName = '[&_math]:text-[0.92rem]',
}: {
  mathML: string;
  className?: string;
  mathClassName?: string;
}) {
  return (
    <div className={`leading-7 ${className}`}>
      <MathText
        mathML={mathML}
        className={`[&_math]:inline-block ${mathClassName}`}
      />
    </div>
  );
}

function InlineFormula({
  mathML,
  className = '',
}: {
  mathML: string;
  className?: string;
}) {
  return (
    <MathText
      mathML={mathML}
      className={`align-middle [&_math]:inline-block [&_math]:text-[0.82rem] ${className}`}
    />
  );
}

function fAt(x: number, y: number): string {
  return `<mi>f</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>`;
}

function gAt(x: number, y: number): string {
  return `<mi>g</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>`;
}

function numberNode(value: number | string): string {
  return `<mn>${value}</mn>`;
}

function normalizedToByte(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

function gradientModeMathML(mode: GradientMethod): string {
  if (mode === 'max') {
    return `
      <mi>max</mi><mo>(</mo>
      <mo>|</mo><msub><mi>f</mi><mi>i</mi></msub><mo>′</mo><mo>|</mo>
      <mo>,</mo>
      <mo>|</mo><msub><mi>f</mi><mi>j</mi></msub><mo>′</mo><mo>|</mo>
      <mo>)</mo>
    `;
  }

  return `
    <mo>|</mo><msub><mi>f</mi><mi>i</mi></msub><mo>′</mo><mo>|</mo>
    <mo>+</mo>
    <mo>|</mo><msub><mi>f</mi><mi>j</mi></msub><mo>′</mo><mo>|</mo>
  `;
}

function normalizedOutputMathML(label: string, x: number, y: number, value: number): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>${label}</mi><mtext>8-bit</mtext></msub>
      <mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>=</mo><mi>round</mi><mo>(</mo><mn>255</mn><mo>×</mo>${numberNode(value.toFixed(4))}<mo>)</mo>
      <mo>=</mo>${numberNode(normalizedToByte(value))}
    </mrow>
  `);
}

// ============================================================
export default function ImageSharpeningPage() {
  const [imageType, setImageType] = useState<SampleImageType>('lena');
  const [method, setMethod] = useState<SharpenMethod>('gradient');
  const [gradientMode, setGradientMode] = useState<GradientMethod>('max');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lenaImage, setLenaImage] = useState<null | number[][]>(null);

  useEffect(() => {
    let cancelled = false;

    loadImageAsGrayscale('/assets/lena-original.jpg')
      .then(image => {
        if (!cancelled) setLenaImage(resizeGrayscaleImage(image, 96));
      })
      .catch(() => {
        if (!cancelled) setLenaImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const originalImage = useMemo(() => {
    if (imageType === 'lena' && lenaImage) return lenaImage;
    return sampleImages[imageType].image;
  }, [imageType, lenaImage]);

  const imageWidth = originalImage[0]?.length ?? 0;
  const imageHeight = originalImage.length;

  // 计算结果图
  const resultImage = useMemo(() => {
    if (method === 'gradient') {
      return gradientSharpen(originalImage, gradientMode);
    }
    return laplaceEnhance(originalImage);
  }, [originalImage, method, gradientMode]);

  // 生成步骤列表
  const steps = useMemo(() => {
    if (method === 'gradient') {
      return Array.from(gradientSharpenSteps(originalImage, gradientMode));
    }
    return Array.from(laplaceEnhanceSteps(originalImage));
  }, [originalImage, method, gradientMode]);

  const currentStep = steps[currentStepIndex] ?? null;

  // 方向键移动
  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.x, y: currentStep.y } : null,
    bounds: { width: imageWidth, height: imageHeight },
    onMove: useCallback(
      (pos: { x: number; y: number }) => {
        const idx = steps.findIndex(s => s.x === pos.x && s.y === pos.y);
        if (idx !== -1) setCurrentStepIndex(idx);
      },
      [steps]
    ),
    disabled: steps.length === 0,
  });

  // 点击图像定位
  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      const idx = steps.findIndex(s => s.x === x && s.y === y);
      if (idx !== -1) setCurrentStepIndex(idx);
    },
    [steps]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      const idx = steps.findIndex(s => s.x === x && s.y === y);
      if (idx !== -1) setCurrentStepIndex(idx);
    },
    [steps]
  );

  const currentStepForLayout = useMemo(() => {
    if (!currentStep) return null;

    if (imageType === 'lena' || imageWidth < 3 || imageHeight < 3) {
      return { x: currentStep.x, y: currentStep.y, kernelSize: 1 };
    }

    return {
      x: currentStep.x,
      y: currentStep.y,
      kernelSize: 3,
      regionX: Math.max(0, Math.min(currentStep.x - 1, imageWidth - 3)),
      regionY: Math.max(0, Math.min(currentStep.y - 1, imageHeight - 3)),
    };
  }, [currentStep, imageHeight, imageType, imageWidth]);

  // ============================================================
  // 参数面板
  // ============================================================
  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="教学示例"
        value={imageType}
        onChange={v => {
          setImageType(v as SampleImageType);
          setCurrentStepIndex(0);
        }}
        options={Object.entries(sampleImages).map(([key, { name }]) => ({
          value: key,
          label: name,
        }))}
      />

      <SelectParam
        label="锐化方法"
        value={method}
        onChange={v => {
          setMethod(v as SharpenMethod);
          setCurrentStepIndex(0);
        }}
        options={METHOD_OPTIONS}
      />

      {method === 'gradient' && (
        <SelectParam
          label="梯度合成方式"
          value={gradientMode}
          onChange={v => {
            setGradientMode(v as GradientMethod);
            setCurrentStepIndex(0);
          }}
          options={GRADIENT_MODE_OPTIONS}
        />
      )}
    </div>
  );

  // ============================================================
  // 分析预览区
  // ============================================================
  const analysisPreview = useMemo(() => {
    if (!currentStep) {
      return (
        <ProcessRail>
          <div className="text-center text-slate-400 py-4 text-sm">
            点击原图或结果图，或使用方向键选择像素查看锐化过程
          </div>
        </ProcessRail>
      );
    }

    const { x, y } = currentStep;

    if (method === 'gradient') {
      const gs = currentStep as GradientSharpenStep;
      const rightX = Math.min(x + 1, imageWidth - 1);
      const bottomY = Math.min(y + 1, imageHeight - 1);
      const fiPreviewML = buildInlineMathML(`
        <mrow>
          <msub><mi>f</mi><mi>i</mi></msub><mo>′</mo>
          <mo>=</mo>${fAt(rightX, y)}<mo>-</mo>${fAt(x, y)}
          <mo>=</mo>${numberNode(gs.fiDiff.toFixed(4))}
        </mrow>
      `);
      const fjPreviewML = buildInlineMathML(`
        <mrow>
          <msub><mi>f</mi><mi>j</mi></msub><mo>′</mo>
          <mo>=</mo>${fAt(x, bottomY)}<mo>-</mo>${fAt(x, y)}
          <mo>=</mo>${numberNode(gs.fjDiff.toFixed(4))}
        </mrow>
      `);
      const gradPreviewML = buildInlineMathML(`
        <mrow>
          <mi>grad</mi><mo>=</mo>${gradientModeMathML(gradientMode)}
          <mo>=</mo>${numberNode(gs.gradientMag.toFixed(4))}
        </mrow>
      `);
      const outputPreview8BitML = normalizedOutputMathML('output', x, y, gs.outputValue);

      return (
        <ProcessRail>
          <FlowColumns>
            {/* 左列：当前像素邻域 */}
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="text-xs font-semibold text-red-700 mb-1">
                  当前像素 ({x}, {y})
                </div>
                <div className="text-[11px] text-slate-600">
                  邻域 3×3，中心值 = {gs.inputRegion[1]?.[1]?.toFixed(3) ?? '-'}
                </div>
              </FlowNode>
            </FlowColumn>

            {/* 中列：梯度计算 */}
            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="text-xs font-semibold text-amber-700 mb-1">
                  梯度差分
                </div>
                <div className="space-y-0.5 text-slate-600">
                  <FormulaLine mathML={fiPreviewML} />
                  <FormulaLine mathML={fjPreviewML} />
                  <FormulaLine mathML={gradPreviewML} className="mt-1 font-semibold text-amber-700" />
                </div>
              </FlowNode>
            </FlowColumn>

            {/* 右列：输出 */}
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="text-xs font-semibold text-emerald-700 mb-1">
                  输出像素 ({x}, {y})
                </div>
                <div className="text-lg font-bold text-emerald-700">
                  {gs.outputValue.toFixed(4)}
                </div>
                <FormulaLine
                  mathML={outputPreview8BitML}
                  className="mt-0.5 font-semibold text-emerald-700"
                  mathClassName="[&_math]:text-[0.68rem]"
                />
                <div className="text-[10px] text-slate-500 mt-0.5">
                  内部为归一化灰度，显示为 8-bit 时裁剪到 0 到 255
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // Laplace
    const ls = currentStep as LaplaceEnhanceStep;
    const laplacePreviewML = buildInlineMathML(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${numberNode(ls.neighbors.bottom.toFixed(3))}
        <mo>+</mo>${numberNode(ls.neighbors.top.toFixed(3))}
        <mo>+</mo>${numberNode(ls.neighbors.right.toFixed(3))}
        <mo>+</mo>${numberNode(ls.neighbors.left.toFixed(3))}
        <mo>-</mo><mn>4</mn><mo>×</mo>${numberNode(ls.centerValue.toFixed(3))}
      </mrow>
    `);
    const laplacePreviewResultML = buildInlineMathML(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${numberNode(ls.laplacian.toFixed(4))}
      </mrow>
    `);
    const enhancePreviewML = buildInlineMathML(`
      <mrow>
        <mi>g</mi><mo>=</mo><mi>f</mi><mo>-</mo><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${numberNode(ls.centerValue.toFixed(3))}
        <mo>-</mo><mo>(</mo>${numberNode(ls.laplacian.toFixed(3))}<mo>)</mo>
      </mrow>
    `);
    const enhancePreview8BitML = normalizedOutputMathML('g', x, y, ls.outputValue);

    return (
      <ProcessRail>
        <FlowColumns>
          {/* 左列：当前像素邻域 */}
          <FlowColumn align="start">
            <FlowNode tone="red">
              <div className="text-xs font-semibold text-red-700 mb-1">
                当前像素 ({x}, {y})
              </div>
              <div className="text-[11px] text-slate-600">
                中心值 = {ls.centerValue.toFixed(4)}
              </div>
            </FlowNode>
          </FlowColumn>

          {/* 中列：Laplace 计算 */}
          <FlowColumn align="center">
            <FlowNode tone="amber">
              <div className="text-xs font-semibold text-amber-700 mb-1">
                Laplace 二阶差分
              </div>
              <div className="space-y-0.5 text-slate-600">
                <FormulaLine mathML={laplacePreviewML} />
                <FormulaLine mathML={laplacePreviewResultML} className="font-semibold text-amber-700" />
              </div>
            </FlowNode>
          </FlowColumn>

          {/* 右列：增强结果 */}
          <FlowColumn align="end">
            <FlowNode tone="emerald">
              <div className="text-xs font-semibold text-emerald-700 mb-1">
                增强输出 ({x}, {y})
              </div>
              <FormulaLine mathML={enhancePreviewML} className="text-slate-600" />
              <div className="text-lg font-bold text-emerald-700 mt-1">
                {ls.outputValue.toFixed(4)}
              </div>
              <FormulaLine
                mathML={enhancePreview8BitML}
                className="mt-0.5 font-semibold text-emerald-700"
                mathClassName="[&_math]:text-[0.68rem]"
              />
              <div className="text-[10px] text-slate-500 mt-0.5">
                内部为归一化灰度，显示为 8-bit 时裁剪到 0 到 255
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [currentStep, method, gradientMode, imageHeight, imageWidth]);

  // ============================================================
  // 详细区
  // ============================================================
  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return (
        <div className="text-center text-slate-400 py-8 text-sm">
          选择图像中的一个像素以查看锐化计算过程
        </div>
      );
    }

    const { x, y } = currentStep;
    const methodComparisonCard = (
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800 mb-2">
          一阶梯度锐化与 Laplace 增强的区别
        </div>
        <div className="grid gap-3 text-xs leading-6 text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
            <div className="font-semibold text-amber-700">一阶梯度锐化</div>
            <p className="mt-1">
              直接度量相邻像素的灰度变化，输出更接近“边缘强度图”。它能突出突变位置，但平坦区域通常接近 0。
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
            <div className="font-semibold text-emerald-700">Laplace 增强</div>
            <p className="mt-1">
              先计算二阶差分，再回写到原图上增强反差，因此更接近“锐化后的图像”。它对边缘和噪声都会更敏感。
            </p>
          </div>
        </div>
      </TeachingCard>
    );

    if (method === 'gradient') {
      const gs = currentStep as GradientSharpenStep;
      const gradientFormulaML = buildInlineMathML(`
        <mrow>
          <mi>grad</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
          <mo>=</mo>${gradientModeMathML(gradientMode)}
        </mrow>
      `);

      const rightX = Math.min(x + 1, imageWidth - 1);
      const bottomY = Math.min(y + 1, imageHeight - 1);
      const fiDetailML = buildInlineMathML(`
        <mrow>
          <msub><mi>f</mi><mi>i</mi></msub><mo>′</mo>
          <mo>=</mo>${fAt(rightX, y)}<mo>-</mo>${fAt(x, y)}
          <mo>=</mo>${numberNode(gs.inputRegion[1][2].toFixed(4))}
          <mo>-</mo>${numberNode(gs.inputRegion[1][1].toFixed(4))}
          <mo>=</mo>${numberNode(gs.fiDiff.toFixed(4))}
        </mrow>
      `);
      const fjDetailML = buildInlineMathML(`
        <mrow>
          <msub><mi>f</mi><mi>j</mi></msub><mo>′</mo>
          <mo>=</mo>${fAt(x, bottomY)}<mo>-</mo>${fAt(x, y)}
          <mo>=</mo>${numberNode(gs.inputRegion[2][1].toFixed(4))}
          <mo>-</mo>${numberNode(gs.inputRegion[1][1].toFixed(4))}
          <mo>=</mo>${numberNode(gs.fjDiff.toFixed(4))}
        </mrow>
      `);
      const absDetailML = buildInlineMathML(`
        <mrow>
          <mo>|</mo><msub><mi>f</mi><mi>i</mi></msub><mo>′</mo><mo>|</mo>
          <mo>=</mo>${numberNode(Math.abs(gs.fiDiff).toFixed(4))}
          <mo>,</mo>
          <mo>|</mo><msub><mi>f</mi><mi>j</mi></msub><mo>′</mo><mo>|</mo>
          <mo>=</mo>${numberNode(Math.abs(gs.fjDiff).toFixed(4))}
        </mrow>
      `);
      const gradDetailML = buildInlineMathML(`
        <mrow>
          <mi>grad</mi><mo>=</mo>${gradientModeMathML(gradientMode)}
          <mo>=</mo>${numberNode(gs.gradientMag.toFixed(4))}
        </mrow>
      `);
      const outputDetailML = buildInlineMathML(`
        <mrow>
          <mi>output</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
          <mo>=</mo>${numberNode(gs.outputValue.toFixed(4))}
        </mrow>
      `);
      const output8BitDetailML = normalizedOutputMathML('output', x, y, gs.outputValue);

      return (
        <div className="space-y-4">
          {/* 公式 */}
          <FormulaCard
            label="一阶梯度锐化公式"
            mathML={gradientFormulaML}
            note="梯度表示图像在行列方向上的灰度变化率。在离散图像中，偏导数用一阶差分近似。"
          />

          {/* 当前像素代入 */}
          <TeachingCard>
            <div className="text-sm font-semibold text-slate-800 mb-3">
              当前像素 ({x}, {y}) 代入计算
            </div>

            <div className="space-y-3">
              {/* 邻域矩阵 */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5">3×3 邻域矩阵</div>
                <div className="inline-grid gap-[2px] bg-slate-200 p-[2px] rounded-lg"
                  style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  {gs.inputRegion.map((row, ry) =>
                    row.map((val, rx) => {
                      const isCenter = ry === 1 && rx === 1;
                      const isRight = ry === 1 && rx === 2;
                      const isBottom = ry === 2 && rx === 1;
                      let cellClass = 'bg-white text-slate-600';
                      if (isCenter) cellClass = 'bg-red-50 border border-red-300 text-red-700 font-semibold';
                      else if (isRight || isBottom) cellClass = 'bg-amber-50 border border-amber-200 text-amber-700';
                      return (
                        <div key={`${ry}-${rx}`}
                          className={`w-12 h-10 flex items-center justify-center text-[10px] font-mono rounded ${cellClass}`}>
                          {val.toFixed(3)}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  红色 = 当前像素{' '}
                  <InlineFormula mathML={buildInlineMathML(`<mrow>${fAt(x, y)}</mrow>`)} />
                  ，黄色 = 差分计算用邻域像素
                </div>
              </div>

              {/* 差分计算 */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5">一阶差分计算</div>
                <div className="bg-[#f8f7f3] rounded-xl border border-slate-200 px-4 py-3 space-y-2 text-sm">
                  <FormulaLine mathML={fiDetailML} className="text-slate-600" />
                  <FormulaLine mathML={fjDetailML} className="text-slate-600" />
                </div>
              </div>

              {/* 梯度合成 */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5">梯度幅值合成</div>
                <div className="bg-[#f8f7f3] rounded-xl border border-slate-200 px-4 py-3">
                  <FormulaLine mathML={absDetailML} className="text-slate-600" />
                  <FormulaLine mathML={gradDetailML} className="mt-1 font-semibold text-emerald-700" />
                </div>
              </div>

              {/* 输出 */}
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3">
                <FormulaLine mathML={outputDetailML} className="font-semibold text-emerald-700" />
                <FormulaLine mathML={output8BitDetailML} className="font-semibold text-emerald-700" />
                <div className="text-[10px] text-slate-500 mt-1">
                  梯度值越大说明该位置灰度变化越剧烈（边缘越明显）。页面内部使用归一化灰度；按 8-bit 显示时必须裁剪到 0 到 255。
                </div>
              </div>
            </div>
          </TeachingCard>
          {methodComparisonCard}
        </div>
      );
    }

    // Laplace 详细区
    const ls = currentStep as LaplaceEnhanceStep;
    const topY = Math.max(y - 1, 0);
    const bottomY = Math.min(y + 1, imageHeight - 1);
    const leftX = Math.max(x - 1, 0);
    const rightX = Math.min(x + 1, imageWidth - 1);
    const laplaceDetailSymbolML = buildInlineMathML(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${fAt(x, bottomY)}
        <mo>+</mo>${fAt(x, topY)}
        <mo>+</mo>${fAt(rightX, y)}
        <mo>+</mo>${fAt(leftX, y)}
        <mo>-</mo><mn>4</mn><mo>·</mo>${fAt(x, y)}
      </mrow>
    `);
    const laplaceDetailValueML = buildInlineMathML(`
      <mrow>
        <mo>=</mo>${numberNode(ls.neighbors.bottom.toFixed(4))}
        <mo>+</mo>${numberNode(ls.neighbors.top.toFixed(4))}
        <mo>+</mo>${numberNode(ls.neighbors.right.toFixed(4))}
        <mo>+</mo>${numberNode(ls.neighbors.left.toFixed(4))}
        <mo>-</mo><mn>4</mn><mo>×</mo>${numberNode(ls.centerValue.toFixed(4))}
      </mrow>
    `);
    const laplaceDetailResultML = buildInlineMathML(`
      <mrow>
        <mo>=</mo>${numberNode(ls.laplacian.toFixed(4))}
      </mrow>
    `);
    const enhanceDetailSymbolML = buildInlineMathML(`
      <mrow>
        ${gAt(x, y)}
        <mo>=</mo>${fAt(x, y)}
        <mo>-</mo><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi>
        <mo>=</mo>${numberNode(ls.centerValue.toFixed(4))}
        <mo>-</mo><mo>(</mo>${numberNode(ls.laplacian.toFixed(4))}<mo>)</mo>
      </mrow>
    `);
    const enhanceDetailResultML = buildInlineMathML(`
      <mrow>
        <mo>=</mo>${numberNode(ls.outputValue.toFixed(4))}
      </mrow>
    `);
    const enhance8BitDetailML = normalizedOutputMathML('g', x, y, ls.outputValue);
    const centerWeightML = buildInlineMathML(`
      <mrow>
        <mi>center</mi><mo>=</mo><mn>1</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo><mo>=</mo><mn>5</mn>
      </mrow>
    `);
    const laplaceFormulaML = buildInlineMathML(`
      <mrow>
        <msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>=</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>+</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>+</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>+</mo><mn>1</mn><mo>)</mo>
        <mo>+</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>-</mo><mn>1</mn><mo>)</mo>
        <mo>-</mo><mn>4</mn><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      </mrow>
    `);

    const enhanceFormulaML = buildInlineMathML(`
      <mrow>
        <mi>g</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>=</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>-</mo><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      </mrow>
    `);

    return (
      <div className="space-y-4">
        {/* Laplace 公式 */}
        <FormulaCard
          label="Laplace 二阶微分算子"
          mathML={laplaceFormulaML}
          note="Laplace 算子是线性二阶微分算子，对离散图像用二阶差分近似。它对灰度突变区域（边缘）响应强烈。"
        />

        {/* Laplace 增强公式 */}
        <FormulaCard
          label="Laplace 增强"
          mathML={enhanceFormulaML}
          note="从原图减去 Laplace 值（负的拉普拉斯），使边缘区域的灰度反差增大，达到锐化效果。"
        />

        {/* 当前像素代入 */}
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-3">
            当前像素 ({x}, {y}) 代入计算
          </div>

          <div className="space-y-3">
            {/* 邻域矩阵 */}
            <div>
              <div className="text-xs text-slate-500 mb-1.5">3×3 邻域矩阵</div>
              <div className="inline-grid gap-[2px] bg-slate-200 p-[2px] rounded-lg"
                style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {ls.inputRegion.map((row, ry) =>
                  row.map((val, rx) => {
                    const isCenter = ry === 1 && rx === 1;
                    const isNeighbor =
                      (ry === 0 && rx === 1) || // top
                      (ry === 2 && rx === 1) || // bottom
                      (ry === 1 && rx === 0) || // left
                      (ry === 1 && rx === 2);   // right
                    let cellClass = 'bg-white text-slate-600';
                    if (isCenter) cellClass = 'bg-red-50 border border-red-300 text-red-700 font-semibold';
                    else if (isNeighbor) cellClass = 'bg-amber-50 border border-amber-200 text-amber-700';
                    return (
                      <div key={`${ry}-${rx}`}
                        className={`w-12 h-10 flex items-center justify-center text-[10px] font-mono rounded ${cellClass}`}>
                        {val.toFixed(3)}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                红色 = <InlineFormula mathML={buildInlineMathML(`<mrow>${fAt(x, y)}</mrow>`)} />
                ，黄色 = 四邻域{' '}
                <InlineFormula mathML={buildInlineMathML(`<mrow>${fAt(x, topY)}</mrow>`)} />
                、<InlineFormula mathML={buildInlineMathML(`<mrow>${fAt(x, bottomY)}</mrow>`)} />
                、<InlineFormula mathML={buildInlineMathML(`<mrow>${fAt(leftX, y)}</mrow>`)} />
                、<InlineFormula mathML={buildInlineMathML(`<mrow>${fAt(rightX, y)}</mrow>`)} />
              </div>
            </div>

            {/* Laplace 计算 */}
            <div>
              <div className="text-xs text-slate-500 mb-1.5">Laplace 二阶差分计算</div>
              <div className="bg-[#f8f7f3] rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-sm text-slate-600 space-y-1">
                  <FormulaLine mathML={laplaceDetailSymbolML} className="text-slate-600" />
                  <FormulaLine mathML={laplaceDetailValueML} className="text-amber-700" />
                  <FormulaLine mathML={laplaceDetailResultML} className="font-semibold text-amber-700" />
                </div>
              </div>
            </div>

            {/* 增强核 */}
            <div>
              <div className="text-xs text-slate-500 mb-1.5">等效卷积核（Laplace 增强核）</div>
              <div className="inline-grid gap-[2px] bg-slate-200 p-[2px] rounded-lg"
                style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {LAPLACE_ENHANCE_KERNEL.map((row, ry) =>
                  row.map((val, rx) => {
                    const isCenter = ry === 1 && rx === 1;
                    const cellClass = isCenter
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 font-semibold'
                      : 'bg-white text-slate-600';
                    return (
                      <div key={`${ry}-${rx}`}
                        className={`w-10 h-9 flex items-center justify-center text-xs font-mono rounded ${cellClass}`}>
                        {val > 0 ? `+${val}` : val}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                <FormulaLine
                  mathML={centerWeightML}
                  className="text-slate-500"
                  mathClassName="[&_math]:text-[0.72rem]"
                />
              </div>
            </div>

            {/* 增强结果 */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3">
              <FormulaLine mathML={enhanceDetailSymbolML} className="text-slate-600" />
              <FormulaLine mathML={enhanceDetailResultML} className="mt-1 font-bold text-emerald-700" />
              <FormulaLine mathML={enhance8BitDetailML} className="mt-1 font-bold text-emerald-700" />
              <div className="text-[10px] text-slate-500 mt-1">
                页面内部使用归一化灰度；按 8-bit 显示时必须裁剪到 0 到 255。锐化会增强边缘反差，同时也可能放大噪声。
              </div>
            </div>
          </div>
        </TeachingCard>

        {/* 教学说明 */}
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800 mb-2">
            为什么锐化能增强边缘？
          </div>
          <p className="text-xs leading-6 text-slate-600">
            在图像平坦区域（灰度变化小），Laplace 值接近 0，增强后的像素值与原值几乎一致。
            在边缘区域（灰度变化大），Laplace 值为较大的正值或负值，原图减去{' '}
            <InlineFormula mathML={buildInlineMathML('<mrow><msup><mo>∇</mo><mn>2</mn></msup><mi>f</mi></mrow>')} />
            {' '}后反差增大，
            边缘两侧的亮侧更亮、暗侧更暗，从而突出轮廓。但同时，噪声也会被放大，
            因为噪声点同样是灰度突变点。
          </p>
        </TeachingCard>
        {methodComparisonCard}
      </div>
    );
  }, [currentStep, method, gradientMode, imageHeight, imageWidth]);

  // ============================================================
  // 当前代码
  // ============================================================
  const currentCode = method === 'gradient' ? GRADIENT_CODE_TS : LAPLACE_CODE_TS;

  // stepInfo
  const stepInfo = useMemo(
    () =>
      steps.length > 0
        ? { current: currentStepIndex, total: steps.length }
        : null,
    [currentStepIndex, steps.length]
  );

  // ============================================================
  return (
    <ConceptLayout
      title="图像锐化"
      subtitle="Image Sharpening - 梯度锐化与 Laplace 增强"
      operationLabel="锐化处理"
      parameterIntro="图像锐化通过增强灰度突变区域来突出边缘和轮廓。选择不同方法观察一阶梯度与二阶 Laplace 的差异。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: currentCode }]} />}
      currentStep={currentStepForLayout}
      stepInfo={stepInfo}
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      showOriginalGrid={imageType !== 'lena'}
      originalRegionMarker={imageType === 'lena' ? 'dot' : 'frame'}
      imageHints={{
        input: imageType === 'lena' ? '真实 Lena 灰度图，红点表示当前中心像素' : '红框表示当前 3×3 邻域',
        output: '绿色框表示当前输出像素',
      }}
      singlePageScroll
      navigationHintText="方向键移动 / 点击原图或结果图跳转"
    />
  );
}
