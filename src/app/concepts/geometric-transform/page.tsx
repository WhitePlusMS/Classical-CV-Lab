'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnchoredOverlay,
  type AnchoredOverlayPath,
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ImageCanvas,
  MathText,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  TeachingTerm,
  buildInlineMathML,
} from '@/components';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import {
  type FlipMode,
  type GeometricTransformStep,
  type InterpolationMethod,
  type Matrix3,
  type Point2D,
  type TeachingLandmark,
  type TransformFamilyKey,
  DEFAULT_GEOMETRIC_TRANSFORM_PARAMS,
  TRANSFORM_COMPOSITION_ORDER,
  buildCompositeTransformMatrix,
  clampPointToImage,
  classifyTransformFamily,
  createGeometricTransformLandmarks,
  createGeometricTransformSampleImage,
  getGeometricTransformStep,
  invertAffineMatrix,
  mapSourcePointToDestination,
  transformGrayscaleImage,
  transformRgbImage,
  type RgbImage,
} from '@/lib/algorithms/geometricTransform';
import { centerCropRgbImage, loadImageAsRgb, resizeRgbImage } from '@/lib/utils/imageProcessing';
import { rgbToGrayscaleWeighted } from '@/lib/algorithms/grayscale';

const GEOMETRIC_TRANSFORM_CODE = `// 辅助函数说明：
// - applyInverseMapping(x', y', invM): 用逆矩阵把输出像素坐标映射回源图坐标
// - sampleNearest(image, x, y): 四舍五入取最近像素；越界时返回 0
// - sampleBilinear(image, x, y): 取 2×2 邻域加权平均；越界像素按 0 参与计算

function warpAffine(
  image: number[][],
  inverseMatrix: number[][],
  interpolation: 'nearest' | 'bilinear'
): number[][] {
  const height = image.length;
  const width = image[0].length;
  const output = Array.from({ length: height }, () => Array(width).fill(0));

  for (let yPrime = 0; yPrime < height; yPrime++) {
    for (let xPrime = 0; xPrime < width; xPrime++) {
      const [x, y] = applyInverseMapping(xPrime, yPrime, inverseMatrix);
      output[yPrime][xPrime] =
        interpolation === 'nearest'
          ? sampleNearest(image, x, y)
          : sampleBilinear(image, x, y);
    }
  }

  return output;
}`;

const SAMPLE_SIZE = 96;
const FALLBACK_SOURCE_IMAGE = createGeometricTransformSampleImage(SAMPLE_SIZE);
const INITIAL_SOURCE_POINT = createGeometricTransformLandmarks(SAMPLE_SIZE)[0].point;
const INITIAL_MATRIX = buildCompositeTransformMatrix(DEFAULT_GEOMETRIC_TRANSFORM_PARAMS);
const INITIAL_OUTPUT_POINT = clampPointToImage(
  mapSourcePointToDestination(
    INITIAL_SOURCE_POINT,
    INITIAL_MATRIX,
    SAMPLE_SIZE,
    SAMPLE_SIZE
  ).roundedDestinationImage,
  SAMPLE_SIZE,
  SAMPLE_SIZE
);

const MAIN_RELATION_MATHML = buildInlineMathML(`
  <mrow>
    <mi>I</mi><mo>&#x2032;</mo>
    <mo>(</mo><mi>x</mi><mo>&#x2032;</mo><mo>,</mo><mi>y</mi><mo>&#x2032;</mo><mo>)</mo>
    <mo>=</mo>
    <mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
  </mrow>
`);

const HOMOGENEOUS_FORMULA_MATHML = buildInlineMathML(`
  <mrow>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>x</mi><mo>&#x2032;</mo></mtd></mtr>
        <mtr><mtd><mi>y</mi><mo>&#x2032;</mo></mtd></mtr>
        <mtr><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><msub><mi>a</mi><mn>11</mn></msub></mtd><mtd><msub><mi>a</mi><mn>12</mn></msub></mtd><mtd><msub><mi>t</mi><mi>x</mi></msub></mtd></mtr>
        <mtr><mtd><msub><mi>a</mi><mn>21</mn></msub></mtd><mtd><msub><mi>a</mi><mn>22</mn></msub></mtd><mtd><msub><mi>t</mi><mi>y</mi></msub></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>x</mi></mtd></mtr>
        <mtr><mtd><mi>y</mi></mtd></mtr>
        <mtr><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`);

const TRANSLATION_FORMULA_MATHML = buildInlineMathML(`
  <mrow>
    <mi>T</mi><mo>(</mo><msub><mi>t</mi><mi>x</mi></msub><mo>,</mo><msub><mi>t</mi><mi>y</mi></msub><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mn>1</mn></mtd><mtd><mn>0</mn></mtd><mtd><msub><mi>t</mi><mi>x</mi></msub></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd><mtd><msub><mi>t</mi><mi>y</mi></msub></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`);

const SCALE_FORMULA_MATHML = buildInlineMathML(`
  <mrow>
    <mi>S</mi><mo>(</mo><msub><mi>s</mi><mi>x</mi></msub><mo>,</mo><msub><mi>s</mi><mi>y</mi></msub><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><msub><mi>s</mi><mi>x</mi></msub></mtd><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><msub><mi>s</mi><mi>y</mi></msub></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`);

const ROTATION_FORMULA_MATHML = buildInlineMathML(`
  <mrow>
    <mi>R</mi><mo>(</mo><mi>&#x03B8;</mi><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>cos</mi><mi>&#x03B8;</mi></mtd><mtd><mo>-</mo><mi>sin</mi><mi>&#x03B8;</mi></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mi>sin</mi><mi>&#x03B8;</mi></mtd><mtd><mi>cos</mi><mi>&#x03B8;</mi></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`);

const SHEAR_FORMULA_MATHML = buildInlineMathML(`
  <mrow>
    <mi>H</mi><mo>(</mo><mi>&#x03B1;</mi><mo>,</mo><mi>&#x03B2;</mi><mo>)</mo>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mn>1</mn></mtd><mtd><mi>&#x03B1;</mi></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mi>&#x03B2;</mi></mtd><mtd><mn>1</mn></mtd><mtd><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`);

const FAMILY_ORDER_MATHML = buildInlineMathML(`
  <mrow>
    <mi>正交</mi>
    <mo>&#x2282;</mo>
    <mi>刚体</mi>
    <mo>&#x2282;</mo>
    <mi>相似</mi>
    <mo>&#x2282;</mo>
    <mi>仿射</mi>
  </mrow>
`);

const ORTHOGONAL_FAMILY_MATHML = buildInlineMathML(`
  <mrow>
    <mi>R</mi><msup><mi>R</mi><mi>T</mi></msup><mo>=</mo><mi>I</mi>
  </mrow>
`);

const RIGID_FAMILY_MATHML = buildInlineMathML(`
  <mrow>
    <msub><mi>M</mi><mi>rigid</mi></msub>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>R</mi></mtd><mtd><mi>t</mi></mtd></mtr>
        <mtr><mtd><msup><mi>0</mi><mi>T</mi></msup></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`);

const SIMILAR_FAMILY_MATHML = buildInlineMathML(`
  <mrow>
    <mi>A</mi><msup><mi>A</mi><mi>T</mi></msup><mo>=</mo><mi>k</mi><mi>I</mi>
  </mrow>
`);

const AFFINE_FAMILY_MATHML = buildInlineMathML(`
  <mrow>
    <msub><mi>M</mi><mi>affine</mi></msub>
    <mo>=</mo>
    <mfenced open="[" close="]">
      <mtable>
        <mtr><mtd><mi>A</mi></mtd><mtd><mi>t</mi></mtd></mtr>
        <mtr><mtd><msup><mi>0</mi><mi>T</mi></msup></mtd><mtd><mn>1</mn></mtd></mtr>
      </mtable>
    </mfenced>
  </mrow>
`);

const FAMILY_LABELS: Record<TransformFamilyKey, string> = {
  orthogonal: '正交变换',
  rigid: '刚体变换',
  similar: '相似变换',
  affine: '仿射变换',
};

const INTERPOLATION_LABELS: Record<InterpolationMethod, string> = {
  nearest: '最近邻',
  bilinear: '双线性',
};

function formatNumber(value: number, digits: number = 2): string {
  const rounded = Number(value.toFixed(digits));
  if (Math.abs(rounded) < 1e-9) {
    return '0';
  }
  return rounded.toString();
}

function matrixToMathML(matrix: number[][]): string {
  const rows = matrix
    .map(
      row =>
        `<mtr>${row
          .map(value => `<mtd><mn>${formatNumber(value)}</mn></mtd>`)
          .join('')}</mtr>`
    )
    .join('');

  return `<mfenced open="[" close="]"><mtable columnalign="center">${rows}</mtable></mfenced>`;
}

function vectorToMathML(values: number[]): string {
  const rows = values
    .map(value => `<mtr><mtd><mn>${formatNumber(value)}</mn></mtd></mtr>`)
    .join('');

  return `<mfenced open="[" close="]"><mtable columnalign="center">${rows}</mtable></mfenced>`;
}

function buildMatrixStatementMathML(symbolMathML: string, matrix: number[][]): string {
  return buildInlineMathML(`
    <mrow>
      ${symbolMathML}
      <mo>=</mo>
      <mfenced open="[" close="]">
        <mtable columnalign="center">
          <mtr><mtd><msub><mi>m</mi><mn>11</mn></msub></mtd><mtd><msub><mi>m</mi><mn>12</mn></msub></mtd><mtd><msub><mi>m</mi><mn>13</mn></msub></mtd></mtr>
          <mtr><mtd><msub><mi>m</mi><mn>21</mn></msub></mtd><mtd><msub><mi>m</mi><mn>22</mn></msub></mtd><mtd><msub><mi>m</mi><mn>23</mn></msub></mtd></mtr>
          <mtr><mtd><msub><mi>m</mi><mn>31</mn></msub></mtd><mtd><msub><mi>m</mi><mn>32</mn></msub></mtd><mtd><msub><mi>m</mi><mn>33</mn></msub></mtd></mtr>
        </mtable>
      </mfenced>
      <mo>=</mo>
      ${matrixToMathML(matrix)}
    </mrow>
  `);
}

function buildForwardPointMathML(
  matrix: Matrix3,
  source: Point2D,
  destination: Point2D
): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>p</mi><mi>dst</mi></msub>
      <mo>=</mo>
      <mi>M</mi><mo>&#x22C5;</mo><msub><mi>p</mi><mi>src</mi></msub>
      <mo>=</mo>
      ${matrixToMathML(matrix)}
      <mo>&#x22C5;</mo>
      ${vectorToMathML([source.x, source.y, 1])}
      <mo>=</mo>
      ${vectorToMathML([destination.x, destination.y, 1])}
    </mrow>
  `);
}

function buildInversePointMathML(
  inverseMatrix: Matrix3,
  destination: Point2D,
  source: Point2D
): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>p</mi><mi>src</mi></msub>
      <mo>=</mo>
      <msup><mi>M</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup>
      <mo>&#x22C5;</mo>
      <msub><mi>p</mi><mi>dst</mi></msub>
      <mo>=</mo>
      ${matrixToMathML(inverseMatrix)}
      <mo>&#x22C5;</mo>
      ${vectorToMathML([destination.x, destination.y, 1])}
      <mo>=</mo>
      ${vectorToMathML([source.x, source.y, 1])}
    </mrow>
  `);
}

function buildNearestMathML(step: GeometricTransformStep): string {
  const nearest = step.nearestSource;
  if (!nearest) {
    return buildInlineMathML(`
      <mrow>
        <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo>
        <mo>=</mo>
        <mn>0</mn>
      </mrow>
    `);
  }

  return buildInlineMathML(`
    <mrow>
      <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo>
      <mo>=</mo>
      <mi>I</mi><mo>(</mo><mn>${nearest.x}</mn><mo>,</mo><mn>${nearest.y}</mn><mo>)</mo>
      <mo>=</mo>
      <mn>${formatNumber(nearest.value)}</mn>
    </mrow>
  `);
}

function buildBilinearMathML(step: GeometricTransformStep): string {
  if (step.bilinearNeighbors.length === 0) {
    return buildInlineMathML(`
      <mrow>
        <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo>
        <mo>=</mo>
        <mn>0</mn>
      </mrow>
    `);
  }

  const terms = step.bilinearNeighbors
    .map(
      item =>
        `<mn>${formatNumber(item.weight)}</mn><mo>&#x22C5;</mo><mn>${formatNumber(item.value)}</mn>`
    )
    .join('<mo>+</mo>');

  return buildInlineMathML(`
    <mrow>
      <mi>I</mi><mo>&#x2032;</mo><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo>
      <mo>=</mo>
      ${terms}
      <mo>=</mo>
      <mn>${formatNumber(step.outputValue)}</mn>
    </mrow>
  `);
}

function extractRegion(
  image: number[][],
  x: number,
  y: number,
  width: number,
  height: number
): number[][] {
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col) => image[y + row]?.[x + col] ?? 0)
  );
}

function findMatchingLandmark(
  landmarks: TeachingLandmark[],
  point: Point2D
): TeachingLandmark | null {
  return (
    landmarks.find(
      item => item.point.x === point.x && item.point.y === point.y
    ) ?? null
  );
}

export default function GeometricTransformPage() {
  const [transform, setTransform] = useState(DEFAULT_GEOMETRIC_TRANSFORM_PARAMS);
  const [interpolation, setInterpolation] = useState<InterpolationMethod>('bilinear');
  const [selectedSourcePoint, setSelectedSourcePoint] = useState<Point2D>(INITIAL_SOURCE_POINT);
  const [currentPosition, setCurrentPosition] = useState<Point2D>(INITIAL_OUTPUT_POINT);
  const [sourceRgbImage, setSourceRgbImage] = useState<RgbImage | null>(null);
  const [sourceGrayImage, setSourceGrayImage] = useState(FALLBACK_SOURCE_IMAGE);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rawImage = await loadImageAsRgb('/assets/lena-original.jpg');
        if (cancelled) return;

        const lenaRgb = resizeRgbImage(centerCropRgbImage(rawImage), SAMPLE_SIZE);
        setSourceRgbImage(lenaRgb);
        setSourceGrayImage(rgbToGrayscaleWeighted(lenaRgb));

        const nextSourcePoint = createGeometricTransformLandmarks(lenaRgb.length)[0].point;
        const nextWidth = lenaRgb[0]?.length ?? SAMPLE_SIZE;
        const nextHeight = lenaRgb.length;
        const nextMatrix = buildCompositeTransformMatrix(DEFAULT_GEOMETRIC_TRANSFORM_PARAMS);
        setSelectedSourcePoint(nextSourcePoint);
        setCurrentPosition(
          clampPointToImage(
            mapSourcePointToDestination(
              nextSourcePoint,
              nextMatrix,
              nextWidth,
              nextHeight
            ).roundedDestinationImage,
            nextWidth,
            nextHeight
          )
        );
      } catch {
        // Lena 资源异常时保留合成图兜底，保证教学流程仍可操作。
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const originalImage = sourceGrayImage;
  const width = originalImage[0]?.length ?? 0;
  const height = originalImage.length;
  const landmarks = useMemo(() => createGeometricTransformLandmarks(height), [height]);

  const matrix = useMemo(() => buildCompositeTransformMatrix(transform), [transform]);
  const inverseMatrix = useMemo(() => invertAffineMatrix(matrix), [matrix]);
  const activeFamily = useMemo(
    () => classifyTransformFamily(transform),
    [transform]
  );

  const nearestResultImage = useMemo(
    () => transformGrayscaleImage(originalImage, inverseMatrix, 'nearest'),
    [inverseMatrix, originalImage]
  );
  const bilinearResultImage = useMemo(
    () => transformGrayscaleImage(originalImage, inverseMatrix, 'bilinear'),
    [inverseMatrix, originalImage]
  );

  const resultImage =
    interpolation === 'nearest' ? nearestResultImage : bilinearResultImage;
  const nearestResultRgbImage = useMemo(
    () =>
      sourceRgbImage
        ? transformRgbImage(sourceRgbImage, inverseMatrix, 'nearest')
        : null,
    [inverseMatrix, sourceRgbImage]
  );
  const bilinearResultRgbImage = useMemo(
    () =>
      sourceRgbImage
        ? transformRgbImage(sourceRgbImage, inverseMatrix, 'bilinear')
        : null,
    [inverseMatrix, sourceRgbImage]
  );
  const resultRgbImage =
    interpolation === 'nearest' ? nearestResultRgbImage : bilinearResultRgbImage;

  const currentStep = useMemo(
    () =>
      getGeometricTransformStep(
        originalImage,
        inverseMatrix,
        currentPosition.x,
        currentPosition.y,
        interpolation
      ),
    [currentPosition.x, currentPosition.y, interpolation, inverseMatrix, originalImage]
  );

  const nearestStep = useMemo(
    () =>
      getGeometricTransformStep(
        originalImage,
        inverseMatrix,
        currentPosition.x,
        currentPosition.y,
        'nearest'
      ),
    [currentPosition.x, currentPosition.y, inverseMatrix, originalImage]
  );

  const bilinearStep = useMemo(
    () =>
      getGeometricTransformStep(
        originalImage,
        inverseMatrix,
        currentPosition.x,
        currentPosition.y,
        'bilinear'
    ),
    [currentPosition.x, currentPosition.y, inverseMatrix, originalImage]
  );

  const activeInterpolationStep =
    interpolation === 'nearest' ? nearestStep : bilinearStep;

  const selectedPointMapping = useMemo(
    () =>
      mapSourcePointToDestination(selectedSourcePoint, matrix, width, height),
    [height, matrix, selectedSourcePoint, width]
  );

  const selectedLandmark = useMemo(
    () => findMatchingLandmark(landmarks, selectedSourcePoint),
    [landmarks, selectedSourcePoint]
  );

  const sourceRegionImage = useMemo(
    () =>
      extractRegion(
        originalImage,
        currentStep.regionX,
        currentStep.regionY,
        currentStep.regionWidth,
        currentStep.regionHeight
      ),
    [currentStep.regionHeight, currentStep.regionWidth, currentStep.regionX, currentStep.regionY, originalImage]
  );

  const currentStepIndex = currentPosition.y * width + currentPosition.x;
  const totalSteps = width * height;

  const handleDirectionMove = useGridNavigation({
    current: currentPosition,
    bounds: { width, height },
    onMove: setCurrentPosition,
    disabled: totalSteps === 0,
  });

  const updateTransform = useCallback(
    (key: keyof typeof transform, value: number | FlipMode) => {
      setTransform(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      const sourcePoint = { x, y };
      const mapping = mapSourcePointToDestination(sourcePoint, matrix, width, height);
      setSelectedSourcePoint(sourcePoint);
      setCurrentPosition(
        clampPointToImage(mapping.roundedDestinationImage, width, height)
      );
    },
    [height, matrix, width]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      const nextPosition = { x, y };
      const step = getGeometricTransformStep(
        originalImage,
        inverseMatrix,
        x,
        y,
        interpolation
      );

      setCurrentPosition(nextPosition);
      setSelectedSourcePoint(
        clampPointToImage(
          {
            x: Math.round(step.sourceImage.x),
            y: Math.round(step.sourceImage.y),
          },
          width,
          height
        )
      );
    },
    [height, interpolation, inverseMatrix, originalImage, width]
  );

  const contentHeader = (
    <div className="grid gap-4 lg:grid-cols-[1.3fr,0.9fr]">
      <div>
        <div className="text-sm font-semibold text-slate-800">变换层级</div>
        <div className="mt-2">
          <MathText mathML={FAMILY_ORDER_MATHML} className="text-sm text-slate-700" />
        </div>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          当前参数对应
          <span className="mx-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
            {FAMILY_LABELS[activeFamily]}
          </span>
          。该层级由是否包含平移、是否保持等比例缩放，以及是否出现剪切共同决定。
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          坐标约定
        </div>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          为了让旋转方向与角度定义保持一致，程序在画布中心建立笛卡尔坐标系，
          再把结果映射回图像像素坐标。
        </p>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          组合顺序固定为 {TRANSFORM_COMPOSITION_ORDER.join(' → ')}。
        </p>
      </div>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red" className="geo-anchor-source-node">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase text-red-700">原图采样邻域</span>
              <span className="text-[11px] text-red-700">
                {currentStep.sourceInsideBounds
                  ? `${currentStep.regionWidth}×${currentStep.regionHeight}`
                  : '落在图像外'}
              </span>
            </div>
            {currentStep.sourceInsideBounds ? (
              <div className="flex flex-col items-center gap-2">
                <ImageCanvas
                  image={sourceRegionImage}
                  maxDisplaySize={120}
                  showGrid
                  containerClassName="geo-anchor-source-zoom"
                />
                <div className="max-w-[12rem] text-center text-xs leading-5 text-red-700">
                  反向映射先找到原图中的采样位置，再根据插值方式决定取单点还是取 2×2 邻域。
                </div>
              </div>
            ) : (
              <div className="border-t border-red-100 pt-3 text-xs leading-6 text-red-700">
                {interpolation === 'nearest'
                  ? '当前输出像素反向映射到原图之外，按背景值 0 填充，这也是几何变换中常见的边界处理方式。'
                  : '当前输出像素反向映射到原图边缘/之外；双线性插值会按 0 填充缺失的邻域像素并参与加权，因此边界结果会偏暗。'}
              </div>
            )}
            <div className="mt-3 border-t border-slate-200 pt-3 text-xs leading-6 text-slate-600">
              原图坐标约为 ({formatNumber(currentStep.sourceImage.x)}, {formatNumber(currentStep.sourceImage.y)})，
              对应中心坐标为 ({formatNumber(currentStep.sourceCartesian.x)}, {formatNumber(currentStep.sourceCartesian.y)})。
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber" className="geo-anchor-matrix-node">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase text-amber-800">齐次矩阵</span>
              <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700">
                {FAMILY_LABELS[activeFamily]}
              </span>
            </div>
            <FormulaCard
              mathML={buildMatrixStatementMathML('<mi>M</mi>', matrix)}
              formulaClassName="rounded-xl px-4 py-4 shadow-none"
              className="mt-2"
              note="矩阵把平移、缩放、旋转、翻转和剪切统一写成一次乘法。"
            />
          </FlowNode>

          <FlowNode tone="sky">
            <div className="mb-2 text-[11px] font-semibold uppercase text-sky-700">教学点正向映射</div>
            <div className="border-t border-sky-100 pt-3 text-xs leading-6 text-sky-800">
              当前教学点
              <span className="mx-1 font-semibold">
                ({selectedSourcePoint.x}, {selectedSourcePoint.y})
              </span>
              {selectedLandmark ? `对应 ${selectedLandmark.label} 点` : '来自原图点击选择'}。
            </div>
            <div className="mt-2 text-xs leading-6 text-slate-600">
              正向变换后得到的目标图像坐标约为
              <span className="mx-1 font-semibold text-sky-700">
                ({formatNumber(selectedPointMapping.destinationImage.x)}, {formatNumber(selectedPointMapping.destinationImage.y)})
              </span>
              ，最近的像素位置为
              <span className="mx-1 font-semibold text-sky-700">
                ({selectedPointMapping.roundedDestinationImage.x}, {selectedPointMapping.roundedDestinationImage.y})
              </span>
              。
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald" className="geo-anchor-output-node">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase text-emerald-700">输出像素写回</span>
              <span className="text-[11px] text-emerald-700">
                ({currentPosition.x}, {currentPosition.y})
              </span>
            </div>
            <div className="border-t border-emerald-100 pt-3">
              <div className="text-[10px] text-emerald-600">当前插值方式</div>
              <div className="mt-1 text-sm font-semibold text-emerald-800">
                {INTERPOLATION_LABELS[interpolation]}
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-emerald-700">
                {formatNumber(currentStep.outputValue, 3)}
              </div>
            </div>
            <div className="mt-2 text-xs leading-6 text-slate-600">
              {interpolation === 'nearest'
                ? '最近邻插值只读取最接近的一个源像素，结果保持清晰，但边缘更容易出现锯齿。'
                : '双线性插值综合 2×2 邻域加权平均，结果更平滑，但会引入轻微模糊。'}
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const stepDetails = (
    <div className="space-y-4">
      <TeachingCard>
        <div className="grid gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">几何变换的统一表达</div>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              核心关系是
              <MathText mathML={MAIN_RELATION_MATHML} className="mx-1 inline-block text-slate-700" />
              。
              真正生成输出图像时，程序通常不做“正向逐点写回”，而是对每个输出像素做反向映射，再查找原图中的采样位置。
            </p>
            <FormulaCard
              mathML={MAIN_RELATION_MATHML}
              className="mt-3"
              note="图像内容本身不变，改变的是像素之间的位置关系。"
              tone="embedded"
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">齐次坐标矩阵</div>
            <FormulaCard
              mathML={HOMOGENEOUS_FORMULA_MATHML}
              className="mt-3"
              note="平移项写入第三列后，平移、旋转、缩放和剪切就都能并入一次矩阵乘法。"
              tone="embedded"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <FormulaCard
            mathML={buildMatrixStatementMathML('<mi>M</mi>', matrix)}
            label="当前组合矩阵"
            note={`按 ${TRANSFORM_COMPOSITION_ORDER.join(' → ')} 的顺序依次复合。`}
            tone="embedded"
          />
          <FormulaCard
            mathML={buildMatrixStatementMathML('<msup><mi>M</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup>', inverseMatrix)}
            label="当前反向映射矩阵"
            note="输出图像中的每一个像素，都先乘逆矩阵，再回到原图寻找采样位置。"
            tone="embedded"
          />
        </div>

        <div className="mt-4 grid gap-4">
          <FormulaCard
            mathML={ORTHOGONAL_FAMILY_MATHML}
            label="正交"
            note="长度和夹角保持不变，常见代表是纯旋转或翻转。"
            tone="embedded"
          />
          <FormulaCard
            mathML={RIGID_FAMILY_MATHML}
            label="刚体"
            note="在线性部分保持正交的前提下，再加入平移项。"
            tone="embedded"
          />
          <FormulaCard
            mathML={SIMILAR_FAMILY_MATHML}
            label="相似"
            note="允许整体等比例缩放，因此角度不变、长度按同一比例变化。这里的 A 表示线性部分，与纯旋转矩阵 R 区分。"
            tone="embedded"
          />
          <FormulaCard
            mathML={AFFINE_FAMILY_MATHML}
            label="仿射"
            note="最一般的二维线性位置变换，可由平移、缩放、旋转、翻转、剪切复合得到。"
            tone="embedded"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="grid gap-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">教学点的正向坐标变换</div>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {selectedLandmark
                    ? `${selectedLandmark.label} 点：${selectedLandmark.description}`
                    : '当前教学点来自原图点击。'}
                </p>
              </div>
              <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                源点 ({selectedSourcePoint.x}, {selectedSourcePoint.y})
              </div>
            </div>

            <FormulaCard
              mathML={buildForwardPointMathML(
                matrix,
                selectedPointMapping.sourceCartesian,
                selectedPointMapping.transformedCartesian
              )}
              className="mt-3"
              note="使用的是中心化后的笛卡尔坐标，因此正角度仍表示逆时针旋转。"
              tone="embedded"
            />
          </div>

          <div className="px-1 py-1">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              当前点映射结果
            </div>
            <div className="mt-3 divide-y divide-slate-200 text-sm text-slate-700">
              <div className="py-2">
                原图坐标：({selectedSourcePoint.x}, {selectedSourcePoint.y})
              </div>
              <div className="py-2">
                中心坐标：({formatNumber(selectedPointMapping.sourceCartesian.x)}, {formatNumber(selectedPointMapping.sourceCartesian.y)})
              </div>
              <div className="py-2">
                目标中心坐标：({formatNumber(selectedPointMapping.transformedCartesian.x)}, {formatNumber(selectedPointMapping.transformedCartesian.y)})
              </div>
              <div className="py-2">
                目标图像坐标：({formatNumber(selectedPointMapping.destinationImage.x)}, {formatNumber(selectedPointMapping.destinationImage.y)})
              </div>
            </div>
            <div className="mt-3 border-l-4 border-amber-300 pl-3 text-xs leading-6 text-amber-800">
              {selectedPointMapping.inBounds
                ? '该点仍然落在结果图内部，可以在结果图上继续观察它附近的采样效果。'
                : '该点已经移出结果图边界，这说明几何变换可能让部分内容离开画布范围。'}
            </div>
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">当前输出像素的反向映射与插值</div>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              输出像素固定在
              <span className="mx-1 font-semibold text-emerald-700">
                ({currentPosition.x}, {currentPosition.y})
              </span>
              ，先通过逆矩阵回到原图，再根据插值方式取得灰度值。
            </p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            当前方式：{INTERPOLATION_LABELS[interpolation]}
          </div>
        </div>

        <FormulaCard
          mathML={buildInversePointMathML(
            inverseMatrix,
            currentStep.destinationCartesian,
            currentStep.sourceCartesian
          )}
          className="mt-3"
          note="给出的坐标仍然是中心化后的笛卡尔坐标，便于直接对应齐次矩阵公式。"
          tone="embedded"
        />

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {INTERPOLATION_LABELS[interpolation]}插值
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <ImageCanvas
              image={resultImage}
              maxDisplaySize={132}
              showGrid
              highlightPixel={currentPosition}
            />
            <div className="min-w-0 flex-1">
              <FormulaCard
                mathML={
                  interpolation === 'nearest'
                    ? buildNearestMathML(activeInterpolationStep)
                    : buildBilinearMathML(activeInterpolationStep)
                }
                formulaClassName="rounded-xl px-4 py-4 shadow-none"
                note={
                  interpolation === 'nearest'
                    ? '只取最接近的一个原图像素，速度快，但边缘更容易产生锯齿。'
                    : '同时利用 2×2 邻域的四个像素做加权平均，边缘更平滑，但会略微模糊。'
                }
                tone="embedded"
              />
            </div>
          </div>
        </div>

        {interpolation === 'bilinear' && bilinearStep.bilinearNeighbors.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              双线性邻域权重
            </div>
            <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-4">
              {bilinearStep.bilinearNeighbors.map(item => (
                <div
                  key={`${item.label}-${item.x}-${item.y}`}
                  className="border-l border-slate-200 pl-3 text-xs leading-5 text-slate-700"
                >
                  <div className="font-semibold text-slate-800">{item.label}</div>
                  <div>坐标：({item.x}, {item.y})</div>
                  <div>灰度：{formatNumber(item.value, 3)}</div>
                  <div>权重：{formatNumber(item.weight, 3)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </TeachingCard>

      <TeachingCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">原子变换矩阵</div>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              仿射变换可以由多个原子变换复合而成。下列矩阵与平移、缩放、旋转、翻转、剪切一一对应。
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            当前层级：{FAMILY_LABELS[activeFamily]}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormulaCard
            mathML={TRANSLATION_FORMULA_MATHML}
            label="平移"
            note="控制整体位置，不改变形状和朝向。"
            tone="embedded"
          />
          <FormulaCard
            mathML={SCALE_FORMULA_MATHML}
            label="缩放"
            note="等比例缩放对应相似变换的一部分。"
            tone="embedded"
          />
          <FormulaCard
            mathML={ROTATION_FORMULA_MATHML}
            label="旋转 / 翻转"
            note="旋转矩阵保持角度关系；翻转可看作某个坐标轴方向的符号取反，仍属于正交变换。"
            tone="embedded"
          />
          <FormulaCard
            mathML={SHEAR_FORMULA_MATHML}
            label="剪切"
            note="剪切会改变角度关系，因此会把相似变换推进到更一般的仿射变换。"
            tone="embedded"
          />
        </div>
      </TeachingCard>
    </div>
  );

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(
    () => [
      {
        id: 'source-region',
        tone: 'red',
        from: {
          kind: 'region',
          selector: '.geo-anchor-input-main',
          x: currentStep.regionX,
          y: currentStep.regionY,
          size: currentStep.regionWidth,
          width: currentStep.regionWidth,
          height: currentStep.regionHeight,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.geo-anchor-source-node' },
      },
      {
        id: 'matrix-flow',
        tone: 'amber',
        from: { kind: 'element', selector: '.geo-anchor-main-operator' },
        to: { kind: 'element', selector: '.geo-anchor-matrix-node' },
      },
      {
        id: 'output-flow',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.geo-anchor-output-main',
          x: currentPosition.x,
          y: currentPosition.y,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.geo-anchor-output-node' },
      },
    ],
    [
      currentPosition.x,
      currentPosition.y,
      currentStep.regionHeight,
      currentStep.regionWidth,
      currentStep.regionX,
      currentStep.regionY,
      height,
      width,
    ]
  );

  const parameters = (
    <div className="space-y-4">
      <div className="border-l-4 border-blue-300 pl-3">
        <div className="text-xs font-semibold text-blue-700">当前参数层级</div>
        <div className="mt-1 text-sm font-semibold text-blue-800">
          {FAMILY_LABELS[activeFamily]}
        </div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          <TeachingTerm term="正交" explanation="保持长度和夹角，典型情况是纯旋转或翻转。" />
          {' ⊂ '}
          <TeachingTerm term="刚体" explanation="在保持形状不变的基础上允许平移，目标只换位置和朝向。" />
          {' ⊂ '}
          <TeachingTerm term="相似" explanation="允许整体等比例缩放，角度不变但长度按同一比例变化。" />
          {' ⊂ '}
          <TeachingTerm term="仿射" explanation="允许剪切和非等比例缩放，平行关系保留但角度可能改变。" />
          。当前层级会随着缩放是否等比例、是否存在剪切和平移而变化。
        </p>
      </div>

      <SelectParam
        label="插值方式"
        value={interpolation}
        onChange={value => setInterpolation(value as InterpolationMethod)}
        options={[
          { value: 'nearest', label: '最近邻插值' },
          { value: 'bilinear', label: '双线性插值' },
        ]}
      />

      <SelectParam
        label="翻转方式"
        value={transform.flipMode}
        onChange={value => updateTransform('flipMode', value as FlipMode)}
        options={[
          { value: 'none', label: '不翻转' },
          { value: 'horizontal', label: '水平翻转' },
          { value: 'vertical', label: '垂直翻转' },
          { value: 'both', label: '水平+垂直' },
        ]}
      />

      <SliderParam
        label="平移 tx"
        value={transform.translateX}
        onChange={value => updateTransform('translateX', value)}
        min={-4}
        max={4}
        step={1}
      />
      <SliderParam
        label="平移 ty"
        value={transform.translateY}
        onChange={value => updateTransform('translateY', value)}
        min={-4}
        max={4}
        step={1}
      />
      <SliderParam
        label="旋转角度"
        value={transform.rotationDeg}
        onChange={value => updateTransform('rotationDeg', value)}
        min={-90}
        max={90}
        step={5}
        unit="°"
      />
      <SliderParam
        label="缩放 sx"
        value={transform.scaleX}
        onChange={value => updateTransform('scaleX', value)}
        min={0.6}
        max={1.8}
        step={0.1}
      />
      <SliderParam
        label="缩放 sy"
        value={transform.scaleY}
        onChange={value => updateTransform('scaleY', value)}
        min={0.6}
        max={1.8}
        step={0.1}
      />
      <SliderParam
        label="剪切 α"
        value={transform.shearX}
        onChange={value => updateTransform('shearX', value)}
        min={-0.8}
        max={0.8}
        step={0.1}
      />
      <SliderParam
        label="剪切 β"
        value={transform.shearY}
        onChange={value => updateTransform('shearY', value)}
        min={-0.8}
        max={0.8}
        step={0.1}
      />

      <div className="border-t border-amber-200 pt-3 text-xs leading-5 text-amber-800">
        当前处理流程固定为：源点正向映射到目标点，输出像素再通过
        <TeachingTerm term="反向映射" explanation="生成结果图时，先从输出像素回到原图坐标，再在原图采样，避免正向写回留下空洞。" className="mx-1" />
        找采样来源。点击原图会选中一个教学点；点击结果图则查看当前输出像素从原图哪里采样。
      </div>

      <div className="border-t border-slate-200 pt-3">
        <div className="text-xs font-semibold text-slate-600">当前教学点</div>
        <div className="mt-2 text-sm font-semibold text-slate-800">
          ({selectedSourcePoint.x}, {selectedSourcePoint.y})
        </div>
        <div className="mt-1 text-xs leading-5 text-slate-500">
          {selectedLandmark
            ? `${selectedLandmark.label} 点：${selectedLandmark.description}`
            : '这是用户在原图中手动选择的点。'}
        </div>
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="几何变换"
      subtitle="Geometric Transform - 位置关系与插值采样"
      contentHeader={contentHeader}
      operationLabel="几何映射"
      parameterIntro="调整平移、旋转、缩放、翻转和剪切后，重点观察两个问题：一个点如何被矩阵映射到新位置，以及结果图像为什么必须依赖插值。"
      originalImage={originalImage}
      originalRgbImage={sourceRgbImage}
      resultImage={resultImage}
      resultRgbImage={resultRgbImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={<AnchoredOverlay paths={visualOverlayPaths} />}
      imageHints={{
        input: `红框表示当前输出像素在原图中的${currentStep.regionWidth}×${currentStep.regionHeight}采样邻域；点击原图可选教学点`,
        output: `绿框表示当前输出像素；点击结果图可查看该像素的反向映射来源`,
      }}
      showOriginalGrid={false}
      originalRegionMarker="frame"
      currentStep={{
        x: currentPosition.x,
        y: currentPosition.y,
        kernelSize: 1,
        regionX: currentStep.regionX,
        regionY: currentStep.regionY,
        regionWidth: currentStep.regionWidth,
        regionHeight: currentStep.regionHeight,
      }}
      stepInfo={{ current: currentStepIndex, total: totalSteps }}
      navigationHintText="方向键移动输出像素 / 点击原图看正向映射 / 点击结果图看反向采样"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: GEOMETRIC_TRANSFORM_CODE }]} />}
      singlePageScroll
    />
  );
}
