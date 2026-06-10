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
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  type GrayscaleImage,
  type HaarFeatureStep,
  type HaarRegionResult,
  type HaarTemplateType,
  type LBPVectorStep,
  computeHaarResponseMap,
  generateTextureTestImage,
  getHaarFeatureStep,
  getLBPVectorStep,
} from '@/lib/algorithms';
import {
  type ConvolutionTeachingImageType,
  convolutionTeachingImages,
} from '@/lib/utils/convolutionTeachingImages';
import {
  centerCropGrayscaleImage,
  loadImageAsGrayscale,
  resizeGrayscaleImage,
} from '@/lib/utils/imageProcessing';
import { useGridNavigation } from '@/hooks/useGridNavigation';

type StudyMode = 'haar-template' | 'haar-integral' | 'lbp-vector';
type LBPImageType = 'texture' | 'lenaOriginal';

const HAAR_WINDOW_SIZE = 6;
const LBP_WINDOW_SIZE = 16;
const LBP_CELL_SIZE = 4;
const LBP_SAMPLE_OFFSET = Math.floor(LBP_WINDOW_SIZE / 2) + Math.floor(LBP_CELL_SIZE / 2);

const MODE_OPTIONS: { value: StudyMode; label: string }[] = [
  { value: 'haar-template', label: 'Haar 模板响应' },
  { value: 'haar-integral', label: 'Haar 积分图加速' },
  { value: 'lbp-vector', label: 'LBP 特征向量' },
];

const HAAR_TEMPLATE_OPTIONS: { value: HaarTemplateType; label: string }[] = [
  { value: 'edge', label: '边缘特征' },
  { value: 'line', label: '线特征' },
  { value: 'point', label: '点特征' },
  { value: 'diagonal', label: '对角线特征' },
];

const HAAR_IMAGE_OPTIONS: { value: ConvolutionTeachingImageType; label: string }[] = [
  { value: 'edge12', label: '阶跃边缘' },
  { value: 'horizontalEdge12', label: '水平边缘' },
  { value: 'spot12', label: '亮斑十字' },
  { value: 'frame12', label: '方框轮廓' },
  { value: 'lenaOriginal', label: 'Lena 灰度图' },
];

const LBP_IMAGE_OPTIONS: { value: LBPImageType; label: string }[] = [
  { value: 'texture', label: '纹理测试图' },
  { value: 'lenaOriginal', label: 'Lena 灰度图' },
];

const HAAR_TEMPLATE_LABELS: Record<HaarTemplateType, string> = {
  edge: '边缘特征',
  line: '线特征',
  point: '点特征',
  diagonal: '对角线特征',
};

const HAAR_TEMPLATE_NOTES: Record<HaarTemplateType, string> = {
  edge: '左右两个矩形比较亮度差，适合观察竖直边缘或明暗分界。',
  line: '中间矩形与两侧矩形比较，适合观察线状结构。',
  point: '中心小矩形与周围区域比较，适合观察局部亮斑或暗斑。',
  diagonal: '对角矩形分组比较，适合观察对角方向的明暗结构。',
};

const HAAR_CODE_TS = `export function getHaarFeatureStep(
  image: number[][],
  x: number,
  y: number,
  templateType: HaarTemplateType,
  windowSize: number
): HaarFeatureStep {
  const regions = getHaarTemplateRegions(templateType, windowSize);
  const integralImage = computeIntegralImage(image);

  const regionSums = regions.map(region => {
    const sum = rectSumByIntegral(integralImage, x + region.x, y + region.y, region.width, region.height);
    return { ...region, sum };
  });

  const blackSum = regionSums
    .filter(region => region.tone === 'black')
    .reduce((total, region) => total + region.sum, 0);
  const whiteSum = regionSums
    .filter(region => region.tone === 'white')
    .reduce((total, region) => total + region.sum, 0);

  return {
    x,
    y,
    regions: regionSums,
    featureValue: blackSum - whiteSum,
  };
}`;

const LBP_CODE_TS = `export function getLBPVectorStep(
  image: number[][],
  x: number,
  y: number,
  windowSize = 16,
  cellSize = 4
): LBPVectorStep {
  const cellsPerSide = windowSize / cellSize;
  const selectedCellX = Math.floor(cellsPerSide / 2);
  const selectedCellY = Math.floor(cellsPerSide / 2);
  const histogram = Array.from({ length: 256 }, () => 0);

  for (let row = 0; row < cellSize; row++) {
    for (let col = 0; col < cellSize; col++) {
      const px = x + selectedCellX * cellSize + col;
      const py = y + selectedCellY * cellSize + row;
      const lbp = getLBPWindow(image, px, py).decimalValue;
      histogram[lbp] += 1;
    }
  }

  return {
    vectorLength: cellsPerSide * cellsPerSide * 256,
    histogram: histogram.map(count => count / (cellSize * cellSize)),
  };
}`;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function grayByte(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function buildHaarValueFormula(step: HaarFeatureStep): string {
  return buildInlineMathML(`
    <mrow>
      <mi>V</mi><mo>=</mo>
      <munder><mo>&#8721;</mo><mtext>黑区</mtext></munder><mi>p</mi>
      <mo>-</mo>
      <munder><mo>&#8721;</mo><mtext>白区</mtext></munder><mi>p</mi>
      <mo>=</mo><mn>${step.blackSum}</mn><mo>-</mo><mn>${step.whiteSum}</mn>
      <mo>=</mo><mn>${step.featureValue}</mn>
    </mrow>
  `);
}

function buildIntegralFormula(region: HaarFeatureStep['integralRegions'][number]): string {
  const { a, b, c, d } = region.corners;

  return buildInlineMathML(`
    <mrow>
      <mi>S</mi><mo>=</mo><mi>D</mi><mo>-</mo><mi>C</mi><mo>-</mo><mi>B</mi><mo>+</mo><mi>A</mi>
      <mo>=</mo><mn>${d}</mn><mo>-</mo><mn>${c}</mn><mo>-</mo><mn>${b}</mn><mo>+</mo><mn>${a}</mn>
      <mo>=</mo><mn>${region.sum}</mn>
    </mrow>
  `);
}

function buildLBPCodeFormula(step: LBPVectorStep): string {
  const pattern = step.selectedCell.samplePixel.binaryPattern;
  const terms = pattern
    .map((bit, index) => ({ bit, value: bit * 2 ** index, index }))
    .filter(term => term.bit === 1);
  const expression = terms.length > 0
    ? terms.map(term => `<mn>${term.value}</mn>`).join('<mo>+</mo>')
    : '<mn>0</mn>';

  return buildInlineMathML(`
    <mrow>
      <mi>LBP</mi><mo>=</mo>
      <munderover><mo>&#8721;</mo><mrow><mi>p</mi><mo>=</mo><mn>1</mn></mrow><mn>8</mn></munderover>
      <msub><mi>b</mi><mi>p</mi></msub><msup><mn>2</mn><mrow><mi>p</mi><mo>-</mo><mn>1</mn></mrow></msup>
      <mo>=</mo>${expression}
      <mo>=</mo><mn>${step.selectedCell.samplePixel.decimalValue}</mn>
    </mrow>
  `);
}

function buildLBPHistogramFormula(step: LBPVectorStep): string {
  const topBin = step.selectedCell.nonZeroBins[0];
  const bin = topBin?.bin ?? 0;
  const count = topBin?.count ?? 0;

  return buildInlineMathML(`
    <mrow>
      <msub><mi>h</mi><mn>${step.selectedCell.index + 1}</mn></msub>
      <mo>(</mo><mn>${bin}</mn><mo>)</mo>
      <mo>=</mo>
      <mfrac><mrow><mtext>bin </mtext><mn>${bin}</mn><mtext> 的像素数</mtext></mrow><mrow><mtext>cell 像素数</mtext></mrow></mfrac>
      <mo>=</mo><mfrac><mn>${count}</mn><mn>${step.cellSize * step.cellSize}</mn></mfrac>
      <mo>=</mo><mn>${formatNumber(count / (step.cellSize * step.cellSize))}</mn>
    </mrow>
  `);
}

function buildVectorFormula(step: LBPVectorStep): string {
  return buildInlineMathML(`
    <mrow>
      <mi>dim</mi><mo>(</mo><mi>v</mi><mo>)</mo>
      <mo>=</mo><mtext>cell 数</mtext><mo>&#x00D7;</mo><mn>256</mn>
      <mo>=</mo><mn>${step.cellsPerSide}</mn><mo>&#x00D7;</mo><mn>${step.cellsPerSide}</mn><mo>&#x00D7;</mo><mn>256</mn>
      <mo>=</mo><mn>${step.vectorLength}</mn>
    </mrow>
  `);
}

function getRegionTone(regions: HaarRegionResult[], x: number, y: number): 'black' | 'white' | null {
  const blackRegion = regions.find(region =>
    region.tone === 'black' &&
    x >= region.x &&
    x < region.x + region.width &&
    y >= region.y &&
    y < region.y + region.height
  );

  if (blackRegion) return 'black';

  const whiteRegion = regions.find(region =>
    region.tone === 'white' &&
    x >= region.x &&
    x < region.x + region.width &&
    y >= region.y &&
    y < region.y + region.height
  );

  return whiteRegion ? 'white' : null;
}

function HaarWindowMatrix({ step }: { step: HaarFeatureStep }) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${step.windowSize}, minmax(0, 1fr))` }}
    >
      {step.inputRegion.map((row, rowIndex) =>
        row.map((value, colIndex) => {
          const tone = getRegionTone(step.regions, colIndex, rowIndex);
          const toneClass = tone === 'black'
            ? 'border-slate-800 bg-slate-800 text-white'
            : tone === 'white'
              ? 'border-slate-300 bg-white text-slate-800'
              : 'border-slate-200 bg-slate-50 text-slate-700';

          return (
            <div
              key={`haar-cell-${rowIndex}-${colIndex}`}
              className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-[10px] font-semibold ${toneClass}`}
            >
              {grayByte(value)}
            </div>
          );
        })
      )}
    </div>
  );
}

function IntegralMatrix({ matrix, x, y, windowSize }: { matrix: GrayscaleImage; x: number; y: number; windowSize: number }) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${windowSize}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: windowSize }, (_, row) =>
        Array.from({ length: windowSize }, (_, col) => {
          const value = matrix[y + row]?.[x + col] ?? 0;

          return (
            <div
              key={`integral-cell-${row}-${col}`}
              className="flex h-8 w-12 items-center justify-center rounded border border-emerald-200 bg-emerald-50 font-mono text-[9px] font-semibold text-emerald-800"
            >
              {value}
            </div>
          );
        })
      )}
    </div>
  );
}

function LBPWindowMatrix({ step }: { step: LBPVectorStep }) {
  const sample = step.selectedCell.samplePixel;

  return (
    <div className="space-y-2">
      <div className="grid w-max grid-cols-3 gap-1">
        {sample.values.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const isCenter = rowIndex === 1 && colIndex === 1;

            return (
              <div
                key={`lbp-sample-${rowIndex}-${colIndex}`}
                className={`flex h-8 w-8 items-center justify-center rounded border font-mono text-[10px] font-semibold ${
                  isCenter
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {grayByte(value)}
              </div>
            );
          })
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {sample.binaryPattern.map((bit, index) => (
          <span
            key={`lbp-bit-${index}`}
            className={`inline-flex h-7 w-7 items-center justify-center rounded font-mono text-[10px] font-semibold ${
              bit === 1 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {bit}
          </span>
        ))}
      </div>
    </div>
  );
}

function NonZeroHistogram({ step }: { step: LBPVectorStep }) {
  const maxCount = Math.max(1, ...step.selectedCell.nonZeroBins.map(item => item.count));

  return (
    <div className="space-y-2">
      {step.selectedCell.nonZeroBins.slice(0, 8).map(item => (
        <div key={`hist-${item.bin}`} className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-xs">
          <span className="font-mono text-slate-600">{item.bin}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="font-mono text-slate-600">
            {item.count}/{step.cellSize * step.cellSize}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HaarLbpFeatureVectorPage() {
  const [mode, setMode] = useState<StudyMode>('haar-template');
  const [haarTemplateType, setHaarTemplateType] = useState<HaarTemplateType>('edge');
  const [haarImageType, setHaarImageType] = useState<ConvolutionTeachingImageType>('edge12');
  const [lbpImageType, setLbpImageType] = useState<LBPImageType>('texture');
  const [lenaImage, setLenaImage] = useState<GrayscaleImage | null>(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;

    loadImageAsGrayscale('/assets/lena-original.jpg')
      .then(image => {
        if (!cancelled) {
          setLenaImage(resizeGrayscaleImage(centerCropGrayscaleImage(image), 64));
        }
      })
      .catch(error => {
        console.error('加载 Lena 灰度图失败:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const textureImage = useMemo(() => generateTextureTestImage(), []);
  const haarFallbackImage = convolutionTeachingImages.edge12.image ?? [];
  const haarImage = haarImageType === 'lenaOriginal'
    ? lenaImage ?? haarFallbackImage
    : convolutionTeachingImages[haarImageType].image ?? haarFallbackImage;
  const lbpInputImage = lbpImageType === 'lenaOriginal' ? lenaImage ?? textureImage : textureImage;
  const originalImage = mode === 'lbp-vector' ? lbpInputImage : haarImage;
  const windowSize = mode === 'lbp-vector' ? LBP_WINDOW_SIZE : HAAR_WINDOW_SIZE;
  const inputWidth = originalImage[0]?.length ?? 0;
  const inputHeight = originalImage.length;
  const validWidth = Math.max(0, inputWidth - windowSize + 1);
  const validHeight = Math.max(0, inputHeight - windowSize + 1);
  const safePosition = {
    x: validWidth > 0 ? clamp(currentPosition.x, 0, validWidth - 1) : 0,
    y: validHeight > 0 ? clamp(currentPosition.y, 0, validHeight - 1) : 0,
  };

  const haarStep = useMemo(() => {
    if (mode === 'lbp-vector') return null;
    return getHaarFeatureStep(haarImage, safePosition.x, safePosition.y, haarTemplateType, HAAR_WINDOW_SIZE);
  }, [haarImage, haarTemplateType, mode, safePosition.x, safePosition.y]);

  const lbpStep = useMemo(() => {
    if (mode !== 'lbp-vector') return null;
    return getLBPVectorStep(lbpInputImage, safePosition.x, safePosition.y, LBP_WINDOW_SIZE, LBP_CELL_SIZE);
  }, [lbpInputImage, mode, safePosition.x, safePosition.y]);

  const resultImage = useMemo<GrayscaleImage>(() => {
    if (mode === 'lbp-vector') return lbpStep?.lbpImage ?? [];
    return computeHaarResponseMap(haarImage, haarTemplateType, HAAR_WINDOW_SIZE);
  }, [haarImage, haarTemplateType, lbpStep, mode]);

  const resultWidth = resultImage[0]?.length ?? 0;
  const resultHeight = resultImage.length;
  const samplePixel = lbpStep?.selectedCell.samplePixel;
  const displayCurrentStep = mode === 'lbp-vector' && samplePixel
    ? {
        x: samplePixel.x,
        y: samplePixel.y,
        kernelSize: LBP_WINDOW_SIZE,
        regionX: lbpStep.x,
        regionY: lbpStep.y,
        regionWidth: LBP_WINDOW_SIZE,
        regionHeight: LBP_WINDOW_SIZE,
      }
    : haarStep
      ? {
          x: haarStep.x,
          y: haarStep.y,
          kernelSize: HAAR_WINDOW_SIZE,
          regionX: haarStep.x,
          regionY: haarStep.y,
          regionWidth: HAAR_WINDOW_SIZE,
          regionHeight: HAAR_WINDOW_SIZE,
        }
      : null;
  const currentStepIndex = validWidth > 0 ? safePosition.y * validWidth + safePosition.x : 0;
  const totalSteps = validWidth * validHeight;

  const handleDirectionMove = useGridNavigation({
    current: safePosition,
    bounds: { width: validWidth, height: validHeight },
    onMove: setCurrentPosition,
    disabled: validWidth === 0 || validHeight === 0,
  });

  const resetPosition = useCallback(() => {
    setCurrentPosition({ x: 0, y: 0 });
  }, []);

  const handleModeChange = useCallback((value: string) => {
    setMode(value as StudyMode);
    resetPosition();
  }, [resetPosition]);

  const handleTemplateChange = useCallback((value: string) => {
    setHaarTemplateType(value as HaarTemplateType);
    resetPosition();
  }, [resetPosition]);

  const handleHaarImageChange = useCallback((value: string) => {
    setHaarImageType(value as ConvolutionTeachingImageType);
    resetPosition();
  }, [resetPosition]);

  const handleLbpImageChange = useCallback((value: string) => {
    setLbpImageType(value as LBPImageType);
    resetPosition();
  }, [resetPosition]);

  const handleInputRegionSelect = useCallback((x: number, y: number) => {
    if (validWidth === 0 || validHeight === 0) return;
    setCurrentPosition({
      x: clamp(x, 0, validWidth - 1),
      y: clamp(y, 0, validHeight - 1),
    });
  }, [validHeight, validWidth]);

  const handleOutputPixelSelect = useCallback((x: number, y: number) => {
    if (mode === 'lbp-vector') {
      setCurrentPosition({
        x: clamp(x - LBP_SAMPLE_OFFSET, 0, validWidth - 1),
        y: clamp(y - LBP_SAMPLE_OFFSET, 0, validHeight - 1),
      });
      return;
    }

    setCurrentPosition({
      x: clamp(x, 0, validWidth - 1),
      y: clamp(y, 0, validHeight - 1),
    });
  }, [mode, validHeight, validWidth]);

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (!displayCurrentStep) return [];

    return [
      {
        id: 'haar-lbp-input-window',
        tone: 'red',
        from: {
          kind: 'region',
          selector: '.conv-anchor-input-main',
          x: displayCurrentStep.regionX ?? displayCurrentStep.x,
          y: displayCurrentStep.regionY ?? displayCurrentStep.y,
          size: displayCurrentStep.kernelSize,
          imageWidth: inputWidth,
          imageHeight: inputHeight,
        },
        to: { kind: 'element', selector: '.haar-lbp-anchor-window' },
      },
      {
        id: 'haar-lbp-output',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: displayCurrentStep.x,
          y: displayCurrentStep.y,
          imageWidth: resultWidth,
          imageHeight: resultHeight,
        },
        to: { kind: 'element', selector: '.haar-lbp-anchor-result' },
      },
    ];
  }, [displayCurrentStep, inputHeight, inputWidth, resultHeight, resultWidth]);

  const analysisPreview = useMemo(() => {
    if ((mode === 'haar-template' || mode === 'haar-integral') && haarStep) {
      const firstRegion = haarStep.integralRegions[0];

      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red" className="haar-lbp-anchor-window">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-red-700">检测窗口</span>
                  <span className="font-mono text-[11px] text-red-600">
                    ({haarStep.x}, {haarStep.y}) / {HAAR_WINDOW_SIZE}x{HAAR_WINDOW_SIZE}
                  </span>
                </div>
                <HaarWindowMatrix step={haarStep} />
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-[11px] font-semibold uppercase text-amber-800">
                  {mode === 'haar-integral' ? '积分图四角求和' : HAAR_TEMPLATE_LABELS[haarTemplateType]}
                </div>
                {mode === 'haar-integral' && firstRegion ? (
                  <div className="space-y-2 text-xs text-amber-800">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="rounded-lg border border-amber-200 bg-white px-2 py-1">A={firstRegion.corners.a}</span>
                      <span className="rounded-lg border border-amber-200 bg-white px-2 py-1">B={firstRegion.corners.b}</span>
                      <span className="rounded-lg border border-amber-200 bg-white px-2 py-1">C={firstRegion.corners.c}</span>
                      <span className="rounded-lg border border-amber-200 bg-white px-2 py-1">D={firstRegion.corners.d}</span>
                    </div>
                    <p className="leading-5">用四个积分值直接得到第一个矩形区域和：{firstRegion.sum}</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs leading-5 text-amber-800">
                    <p>{HAAR_TEMPLATE_NOTES[haarTemplateType]}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="rounded-lg border border-slate-300 bg-slate-800 px-2 py-1 text-white">黑区求和</span>
                      <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700">白区求和</span>
                    </div>
                  </div>
                )}
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald" className="haar-lbp-anchor-result">
                <div className="mb-2 text-[11px] font-semibold uppercase text-emerald-700">当前响应</div>
                <div className="grid gap-2 text-xs">
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-emerald-600">黑区和 - 白区和</div>
                    <div className="font-mono text-lg font-bold text-emerald-800">
                      {haarStep.blackSum} - {haarStep.whiteSum} = {haarStep.featureValue}
                    </div>
                  </div>
                  <p className="leading-5 text-slate-500">
                    右侧结果图显示各个滑动窗口的 Haar 响应强度，绿框对应当前窗口。
                  </p>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (mode === 'lbp-vector' && lbpStep) {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red" className="haar-lbp-anchor-window">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase text-red-700">检测窗口</span>
                  <span className="font-mono text-[11px] text-red-600">
                    {LBP_WINDOW_SIZE}x{LBP_WINDOW_SIZE}
                  </span>
                </div>
                <ImageCanvas
                  image={lbpStep.inputRegion}
                  maxDisplaySize={150}
                  showGrid
                  selectedRegion={{
                    x: lbpStep.selectedCell.x,
                    y: lbpStep.selectedCell.y,
                    size: lbpStep.selectedCell.size,
                  }}
                />
                <p className="mt-2 text-xs leading-5 text-red-700">
                  红框窗口被划分为 {lbpStep.cellsPerSide}x{lbpStep.cellsPerSide} 个 cell，当前展开中心 cell。
                </p>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-[11px] font-semibold uppercase text-amber-800">3x3 LBP 编码</div>
                <LBPWindowMatrix step={lbpStep} />
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  当前采样像素 ({lbpStep.selectedCell.samplePixel.x}, {lbpStep.selectedCell.samplePixel.y})
                  的 LBP 值为 {lbpStep.selectedCell.samplePixel.decimalValue}。
                </p>
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald" className="haar-lbp-anchor-result">
                <div className="mb-2 text-[11px] font-semibold uppercase text-emerald-700">cell 直方图</div>
                <NonZeroHistogram step={lbpStep} />
                <p className="mt-2 text-xs leading-5 text-emerald-700">
                  非零 bin 共 {lbpStep.selectedCell.nonZeroBins.length} 个；所有 cell 直方图串联后为 {lbpStep.vectorLength} 维。
                </p>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    return <div className="py-8 text-center text-slate-400">加载中...</div>;
  }, [haarStep, haarTemplateType, lbpStep, mode]);

  const stepDetails = useMemo(() => {
    if ((mode === 'haar-template' || mode === 'haar-integral') && haarStep) {
      return (
        <div className="space-y-5">
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {mode === 'haar-integral' ? 'Haar 特征与积分图' : 'Haar 模板响应'}
            </h2>
            <p className="text-xs leading-6 text-slate-600">
              Haar-like 特征把检测窗口切成黑白矩形区域，用黑色区域灰度和减去白色区域灰度和得到一个标量特征。
              积分图把任意矩形求和转化为四个角点的加减，因此适合大量滑动窗口扫描。
            </p>
          </TeachingCard>

          <FormulaCard
            label="Haar 特征值当前代入"
            mathML={buildHaarValueFormula(haarStep)}
            note={`当前模板为 ${HAAR_TEMPLATE_LABELS[haarTemplateType]}，窗口左上角为 (${haarStep.x}, ${haarStep.y})。`}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <TeachingCard>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">区域求和</h3>
              <div className="space-y-2">
                {haarStep.regions.map((region, index) => (
                  <div
                    key={`region-sum-${index}`}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
                      region.tone === 'black'
                        ? 'border-slate-700 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span>
                      {region.tone === 'black' ? '黑区' : '白区'} R{index + 1}
                      {' '}({region.x},{region.y},{region.width}x{region.height})
                    </span>
                    <span className="font-mono font-semibold">{region.sum}</span>
                  </div>
                ))}
              </div>
            </TeachingCard>

            <TeachingCard>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">当前窗口矩阵</h3>
              <HaarWindowMatrix step={haarStep} />
              <p className="mt-3 text-xs leading-5 text-slate-600">
                矩阵值为 0~255 灰度值。深色格属于黑区，白色格属于白区，所有显示数值都参与当前特征值计算。
              </p>
            </TeachingCard>
          </div>

          {mode === 'haar-integral' && (
            <div className="space-y-4 border-t border-slate-200 pt-5">
              <TeachingCard>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">积分图局部矩阵</h3>
                <div className="overflow-x-auto">
                  <IntegralMatrix
                    matrix={haarStep.integralImage}
                    x={haarStep.x}
                    y={haarStep.y}
                    windowSize={haarStep.windowSize}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  每个积分值表示从原图左上角到当前位置的矩形灰度和。矩形区域求和只需要四个角点。
                </p>
              </TeachingCard>

              <div className="grid gap-4 xl:grid-cols-2">
                {haarStep.integralRegions.map((region, index) => (
                  <FormulaCard
                    key={`integral-formula-${index}`}
                    label={`R${index + 1} 矩形和`}
                    mathML={buildIntegralFormula(region)}
                    note={`${region.rect.tone === 'black' ? '黑区' : '白区'}矩形：局部坐标 (${region.rect.x}, ${region.rect.y})，尺寸 ${region.rect.width}x${region.rect.height}。`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (mode === 'lbp-vector' && lbpStep) {
      return (
        <div className="space-y-5">
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">LBP 特征向量提取</h2>
            <p className="text-xs leading-6 text-slate-600">
              单个 LBP 编码描述一个像素的 3x3 局部纹理；LBP 特征向量则把检测窗口划分为多个 cell，
              对每个 cell 的 LBP 编码做 256 维直方图统计，再按空间顺序串联成分类器输入。
            </p>
          </TeachingCard>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <TeachingCard>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">当前 3x3 编码</h3>
              <LBPWindowMatrix step={lbpStep} />
              <p className="mt-3 text-xs leading-5 text-slate-600">
                中心像素灰度为 {grayByte(lbpStep.selectedCell.samplePixel.center)}。
                邻域像素大于等于中心记为 1，否则记为 0。
              </p>
            </TeachingCard>

            <FormulaCard
              label="当前 LBP 编码代入"
              mathML={buildLBPCodeFormula(lbpStep)}
              note="该值只是当前 cell 中一个像素的 LBP 编码，后续还要统计整个 cell 的分布。"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <TeachingCard>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">当前 cell 非零直方图 bin</h3>
              <NonZeroHistogram step={lbpStep} />
              <p className="mt-3 text-xs leading-5 text-slate-600">
                当前 cell 是第 {lbpStep.selectedCell.index + 1} 个 cell，
                尺寸为 {lbpStep.cellSize}x{lbpStep.cellSize}，共有 {lbpStep.cellSize * lbpStep.cellSize} 个 LBP 编码参与统计。
              </p>
            </TeachingCard>

            <div className="space-y-4">
              <FormulaCard
                label="cell 直方图归一化"
                mathML={buildLBPHistogramFormula(lbpStep)}
                note="这里只展开当前 cell 的一个非零 bin；完整直方图仍为 256 维。"
              />
              <FormulaCard
                label="窗口特征向量维度"
                mathML={buildVectorFormula(lbpStep)}
                note="完整向量来自所有 cell 的 256 维直方图串联，而不是单个 LBP 编码。"
              />
            </div>
          </div>

          <TeachingCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">向量摘要</h3>
            <div className="flex flex-wrap gap-2">
              {lbpStep.vectorPreview.map((value, index) => (
                <span
                  key={`vector-preview-${index}`}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-600"
                >
                  v[{index}]={formatNumber(value)}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              摘要只显示当前 cell 直方图前 16 项，界面不直接铺开全部 {lbpStep.vectorLength} 个维度，避免遮蔽核心教学过程。
            </p>
          </TeachingCard>
        </div>
      );
    }

    return <div className="py-8 text-center text-slate-400">加载中...</div>;
  }, [haarStep, haarTemplateType, lbpStep, mode]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="学习模式"
        value={mode}
        onChange={handleModeChange}
        options={MODE_OPTIONS}
      />

      {mode !== 'lbp-vector' && (
        <>
          <SelectParam
            label="Haar 模板类型"
            value={haarTemplateType}
            onChange={handleTemplateChange}
            options={HAAR_TEMPLATE_OPTIONS}
          />
          <SelectParam
            label="输入图像"
            value={haarImageType}
            onChange={handleHaarImageChange}
            options={HAAR_IMAGE_OPTIONS}
          />
        </>
      )}
      {mode === 'lbp-vector' && (
        <SelectParam
          label="输入图像"
          value={lbpImageType}
          onChange={handleLbpImageChange}
          options={LBP_IMAGE_OPTIONS}
        />
      )}

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">当前窗口</div>
        <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 font-mono text-sm font-semibold text-blue-800">
          ({safePosition.x}, {safePosition.y}) / {windowSize}x{windowSize}
        </div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          {mode === 'lbp-vector'
            ? `LBP 窗口划分为 ${LBP_WINDOW_SIZE / LBP_CELL_SIZE}x${LBP_WINDOW_SIZE / LBP_CELL_SIZE} 个 cell，中心 cell 展开统计。`
            : '点击原图或结果图可移动滑动窗口，公式会实时更新当前 Haar 响应。'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前有效窗口数：{validWidth}x{validHeight} = {totalSteps}。
      </div>
    </div>
  );

  const codeTabContent = mode === 'lbp-vector' ? LBP_CODE_TS : HAAR_CODE_TS;
  const imageLabels = mode === 'lbp-vector'
    ? { input: lbpImageType === 'lenaOriginal' ? 'Lena 灰度图' : '纹理测试图', output: 'LBP 编码图' }
    : { input: haarImageType === 'lenaOriginal' ? 'Lena 灰度图' : 'Haar 教学图', output: 'Haar 响应图' };
  const imageHints = mode === 'lbp-vector'
    ? {
        input: '红框为 16x16 检测窗口，点击可移动窗口',
        output: '绿框为当前采样像素，点击 LBP 图可反向定位窗口',
      }
    : {
        input: `红框为 ${HAAR_WINDOW_SIZE}x${HAAR_WINDOW_SIZE} Haar 检测窗口`,
        output: '绿框为当前窗口在响应图中的位置',
      };

  return (
    <ConceptLayout
      title="Haar / LBP 特征向量"
      subtitle="Haar / LBP Feature Vector - 滑动窗口检测中的手工特征"
      operationLabel={
        mode === 'haar-template'
          ? 'Haar 模板响应'
          : mode === 'haar-integral'
            ? '积分图求和'
            : 'LBP 向量提取'
      }
      parameterIntro="选择 Haar 或 LBP 教学模式后，点击图像或使用方向键移动滑动窗口，观察公式和统计结果实时刷新。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={visualOverlayPaths.length > 0 ? <AnchoredOverlay paths={visualOverlayPaths} /> : null}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: codeTabContent }]} />}
      currentStep={displayCurrentStep}
      currentStepLabel={mode === 'lbp-vector' ? '当前 LBP 采样像素' : '当前响应窗口'}
      stepInfo={totalSteps > 0 ? { current: currentStepIndex, total: totalSteps } : null}
      imageLabels={imageLabels}
      imageHints={imageHints}
      showOriginalGrid
      originalRegionMarker="frame"
      singlePageScroll
      navigationHintText="方向键移动 / 点击原图或结果图定位窗口"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
    />
  );
}
