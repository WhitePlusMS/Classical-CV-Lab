'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import { GrayscaleImage } from '@/lib/algorithms/types';
import {
  HOG_GX_KERNEL,
  HOG_GY_KERNEL,
  HogCellStep,
  getHogCellStepAt,
  renderHogVisualization,
} from '@/lib/algorithms/hog';
import {
  centerCropGrayscaleImage,
  loadImageAsGrayscale,
  resizeGrayscaleImage,
} from '@/lib/utils/imageProcessing';
import { createLenaImage } from '@/lib/utils/sampleImages';

const CELL_SIZE = 8;
const CELL_RENDER_SIZE = 24;
const HOG_IMAGE_SIZE = 256;

function upscaleNearest(image: GrayscaleImage, targetSize: number): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  if (!height || !width) return image;

  return Array.from({ length: targetSize }, (_, y) => {
    const sourceY = Math.min(height - 1, Math.floor((y / targetSize) * height));
    return Array.from({ length: targetSize }, (_, x) => {
      const sourceX = Math.min(width - 1, Math.floor((x / targetSize) * width));
      return image[sourceY][sourceX];
    });
  });
}

const FALLBACK_HOG_IMAGE = upscaleNearest(createLenaImage(), HOG_IMAGE_SIZE);

const NBINS_OPTIONS = [
  { value: '6', label: '6 个方向（30°/柱）' },
  { value: '9', label: '9 个方向（20°/柱）' },
  { value: '12', label: '12 个方向（15°/柱）' },
  { value: '18', label: '18 个方向（10°/柱）' },
];

const BLOCK_OPTIONS = [
  { value: '2', label: '2×2 cells' },
  { value: '3', label: '3×3 cells' },
];

const HOG_CODE = `function computeHogCell(image, cellX, cellY, cellSize, nbins) {
  const gradient = sobelGradient(image);
  const histogram = new Array(nbins).fill(0);
  const anglePerBin = 180 / nbins;

  for (let y = 0; y < cellSize; y++) {
    for (let x = 0; x < cellSize; x++) {
      const px = cellX * cellSize + x;
      const py = cellY * cellSize + y;
      const theta = unsigned180(gradient.direction[py][px]);
      const bin = Math.floor(theta / anglePerBin);
      histogram[bin] += gradient.magnitude[py][px];
    }
  }

  return histogram;
}

function normalizeBlock(cellHistograms) {
  const vector = cellHistograms.flat();
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0) + 1e-6);
  return vector.map(v => v / norm);
}`;

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00';
}

function getPixel(image: GrayscaleImage, x: number, y: number): number {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  if (x < 0 || y < 0 || x >= width || y >= height) return 0;
  return image[y][x];
}

function buildSobelKernelMatrixMathML(matrix: number[][]): string {
  const rows = matrix
    .map(row => `<mtr>${row.map(v => `<mtd><mn>${formatNumber(v, 0)}</mn></mtd>`).join('')}</mtr>`)
    .join('');
  return `<mrow><mo>[</mo><mtable>${rows}</mtable><mo>]</mo></mrow>`;
}

function buildWeightedSumMathML(terms: Array<{ weight: number; pixel: number }>): string {
  return terms
    .map(({ weight, pixel }, index) => {
      const absWeight = Math.abs(weight);
      if (index === 0) {
        return weight < 0
          ? `<mo>-</mo><mn>${absWeight}</mn><mo>·</mo><mn>${formatNumber(pixel)}</mn>`
          : `<mn>${absWeight}</mn><mo>·</mo><mn>${formatNumber(pixel)}</mn>`;
      }
      return weight < 0
        ? `<mo>-</mo><mn>${absWeight}</mn><mo>·</mo><mn>${formatNumber(pixel)}</mn>`
        : `<mo>+</mo><mn>${absWeight}</mn><mo>·</mo><mn>${formatNumber(pixel)}</mn>`;
    })
    .join('');
}

function buildGradientSubstitutionMathML(step: HogCellStep, image: GrayscaleImage): string {
  const { sample } = step;
  const neighborhood: number[][] = [];
  for (let ky = -1; ky <= 1; ky++) {
    const row: number[] = [];
    for (let kx = -1; kx <= 1; kx++) {
      row.push(getPixel(image, sample.x + kx, sample.y + ky));
    }
    neighborhood.push(row);
  }

  const gxTerms: Array<{ weight: number; pixel: number }> = [];
  const gyTerms: Array<{ weight: number; pixel: number }> = [];
  for (let ky = 0; ky < 3; ky++) {
    for (let kx = 0; kx < 3; kx++) {
      const gxWeight = HOG_GX_KERNEL[ky][kx];
      const gyWeight = HOG_GY_KERNEL[ky][kx];
      const pixel = neighborhood[ky][kx];
      if (gxWeight !== 0) gxTerms.push({ weight: gxWeight, pixel });
      if (gyWeight !== 0) gyTerms.push({ weight: gyWeight, pixel });
    }
  }

  return buildInlineMathML(`
    <mtable>
      <mtr>
        <mtd columnalign="left">
          <msub><mi>K</mi><mi>x</mi></msub><mo>=</mo>${buildSobelKernelMatrixMathML(HOG_GX_KERNEL)}
          <mspace width="1em"/>
          <msub><mi>K</mi><mi>y</mi></msub><mo>=</mo>${buildSobelKernelMatrixMathML(HOG_GY_KERNEL)}
        </mtd>
      </mtr>
      <mtr>
        <mtd columnalign="left">
          <msub><mi>G</mi><mi>x</mi></msub><mo>=</mo>
          <munder><mo>Σ</mo><mrow><mi>kx</mi><mo>,</mo><mi>ky</mi><mo>∈</mo><mrow><mo>{</mo><mn>-1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mrow></mrow></munder>
          <mi>I</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>kx</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>ky</mi><mo>)</mo>
          <mo>·</mo><msub><mi>K</mi><mi>x</mi></msub><mo>[</mo><mi>ky</mi><mo>+</mo><mn>1</mn><mo>]</mo><mo>[</mo><mi>kx</mi><mo>+</mo><mn>1</mn><mo>]</mo>
          <mo>=</mo>${buildWeightedSumMathML(gxTerms)}
          <mo>=</mo><mn>${formatNumber(sample.gx)}</mn>
        </mtd>
      </mtr>
      <mtr>
        <mtd columnalign="left">
          <msub><mi>G</mi><mi>y</mi></msub><mo>=</mo>
          <munder><mo>Σ</mo><mrow><mi>kx</mi><mo>,</mo><mi>ky</mi><mo>∈</mo><mrow><mo>{</mo><mn>-1</mn><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo>}</mo></mrow></mrow></munder>
          <mi>I</mi><mo>(</mo><mi>x</mi><mo>+</mo><mi>kx</mi><mo>,</mo><mi>y</mi><mo>+</mo><mi>ky</mi><mo>)</mo>
          <mo>·</mo><msub><mi>K</mi><mi>y</mi></msub><mo>[</mo><mi>ky</mi><mo>+</mo><mn>1</mn><mo>]</mo><mo>[</mo><mi>kx</mi><mo>+</mo><mn>1</mn><mo>]</mo>
          <mo>=</mo>${buildWeightedSumMathML(gyTerms)}
          <mo>=</mo><mn>${formatNumber(sample.gy)}</mn>
        </mtd>
      </mtr>
    </mtable>
  `);
}

function buildMagnitudeSubstitutionMathML(step: HogCellStep): string {
  const { sample } = step;
  return buildInlineMathML(`
    <mrow>
      <mi>M</mi><mo>=</mo><msqrt><mrow><msubsup><mi>G</mi><mi>x</mi><mn>2</mn></msubsup><mo>+</mo><msubsup><mi>G</mi><mi>y</mi><mn>2</mn></msubsup></mrow></msqrt>
      <mo>=</mo><msqrt><mrow><msup><mn>${formatNumber(sample.gx)}</mn><mn>2</mn></msup><mo>+</mo><msup><mn>${formatNumber(sample.gy)}</mn><mn>2</mn></msup></mrow></msqrt>
      <mo>=</mo><mn>${formatNumber(sample.magnitude)}</mn>
    </mrow>
  `);
}

function buildBinSubstitutionMathML(step: HogCellStep): string {
  const anglePerBin = 180 / step.nbins;
  return buildInlineMathML(`
    <mrow>
      <mi>bin</mi>
      <mo>=</mo>
      <mo>floor</mo><mo>(</mo>
      <mfrac><mi>θ</mi><mrow><mn>180</mn><mo>/</mo><mi>nBins</mi></mrow></mfrac>
      <mo>)</mo>
      <mo>=</mo>
      <mo>floor</mo><mo>(</mo>
      <mfrac><mn>${formatNumber(step.sample.direction, 1)}</mn><mrow><mn>180</mn><mo>/</mo><mn>${step.nbins}</mn></mrow></mfrac>
      <mo>)</mo>
      <mo>=</mo>
      <mo>floor</mo><mo>(</mo>
      <mfrac><mn>${formatNumber(step.sample.direction, 1)}</mn><mn>${formatNumber(anglePerBin, 1)}</mn></mfrac>
      <mo>)</mo>
      <mo>=</mo><mn>${step.sample.bin}</mn>
    </mrow>
  `);
}

function buildDescriptorExampleFormulaMathML(
  featureDim: number,
  totalBlocks: number,
  cellsPerBlock: number,
  nbins: number,
  blockVectorLength: number
): string {
  return buildInlineMathML(`
    <mtable>
      <mtr>
        <mtd columnalign="left">
          <mrow>
            <msub><mi>v</mi><mtext>block</mtext></msub>
            <mo>=</mo>
            <mi>normalize</mi><mo>(</mo><mo>[</mo><msub><mi>h</mi><mn>1</mn></msub><mo>,</mo><mo>&hellip;</mo><mo>,</mo><msub><mi>h</mi><mn>${cellsPerBlock * cellsPerBlock}</mn></msub><mo>]</mo><mo>)</mo>
            <mo>&#x2208;</mo><msup><mi>R</mi><mn>${blockVectorLength}</mn></msup>
          </mrow>
        </mtd>
      </mtr>
      <mtr>
        <mtd columnalign="left">
          <mrow>
            <mi>dim</mi><mo>(</mo><msub><mi>v</mi><mtext>block</mtext></msub><mo>)</mo>
            <mo>=</mo><mn>${cellsPerBlock}</mn><mo>&#x00D7;</mo><mn>${cellsPerBlock}</mn><mo>&#x00D7;</mo><mn>${nbins}</mn>
            <mo>=</mo><mn>${blockVectorLength}</mn>
          </mrow>
        </mtd>
      </mtr>
      <mtr>
        <mtd columnalign="left">
          <mrow>
            <msub><mi>x</mi><mtext>window</mtext></msub>
            <mo>=</mo>
            <mi>concat</mi><mo>(</mo><msub><mi>v</mi><mn>1</mn></msub><mo>,</mo><mo>&hellip;</mo><mo>,</mo><msub><mi>v</mi><mn>${totalBlocks}</mn></msub><mo>)</mo>
          </mrow>
        </mtd>
      </mtr>
      <mtr>
        <mtd columnalign="left">
          <mrow>
            <mi>dim</mi><mo>(</mo><msub><mi>x</mi><mtext>window</mtext></msub><mo>)</mo>
            <mo>=</mo><mn>${totalBlocks}</mn><mo>&#x00D7;</mo><mn>${cellsPerBlock}</mn><mo>&#x00D7;</mo><mn>${cellsPerBlock}</mn><mo>&#x00D7;</mo><mn>${nbins}</mn>
            <mo>=</mo><mn>${featureDim}</mn>
          </mrow>
        </mtd>
      </mtr>
    </mtable>
  `);
}

function MatrixView({
  title,
  matrix,
  formatter = value => formatNumber(value),
}: {
  title: string;
  matrix: number[][];
  formatter?: (value: number) => string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">{title}</div>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${matrix[0]?.length ?? 0}, minmax(0, 1fr))` }}
      >
        {matrix.flatMap((row, y) =>
          row.map((value, x) => (
            <div
              key={`${title}-${y}-${x}`}
              className="flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 bg-white font-mono text-[9px] text-slate-700"
            >
              {formatter(value)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistogramBars({ values }: { values: number[] }) {
  const maxValue = Math.max(...values, 1e-6);
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {values.map((value, index) => (
        <div key={`hist-${index}`} className="flex min-w-0 flex-col items-center">
          <div className="flex h-24 w-full items-end rounded bg-slate-100">
            <div
              className="w-full rounded-t bg-amber-500"
              style={{ height: `${Math.max(6, (value / maxValue) * 100)}%` }}
            />
          </div>
          <div className="mt-1 font-mono text-[9px] text-slate-500">{index}</div>
          <div className="font-mono text-[8px] text-slate-400">{formatNumber(value, 1)}</div>
        </div>
      ))}
    </div>
  );
}

function BlockCellsView({ step }: { step: HogCellStep }) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${step.cellsPerBlock}, minmax(0, 1fr))` }}
    >
      {step.blockCells.map(cell => {
        const active = cell.cellX === step.cellX && cell.cellY === step.cellY;
        return (
          <div
            key={`block-cell-${cell.cellX}-${cell.cellY}`}
            className={`rounded border px-2 py-2 text-center text-[10px] ${
              active
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <div className="font-mono font-semibold">({cell.cellX},{cell.cellY})</div>
            <div className="mt-1 text-[9px]">Σ={formatNumber(cell.histogram.reduce((s, v) => s + v, 0), 1)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function HogFeaturePage() {
  const [nbins, setNbins] = useState(9);
  const [cellsPerBlock, setCellsPerBlock] = useState(2);
  const [rawImage, setRawImage] = useState<GrayscaleImage>(FALLBACK_HOG_IMAGE);
  const [currentCell, setCurrentCell] = useState({ x: 8, y: 8 });

  useEffect(() => {
    let cancelled = false;
    loadImageAsGrayscale('/assets/lena-original.jpg')
      .then(image => {
        if (!cancelled) {
          setRawImage(resizeGrayscaleImage(centerCropGrayscaleImage(image), HOG_IMAGE_SIZE));
        }
      })
      .catch(error => {
        console.error('加载 HOG Lena 示例图失败:', error);
        if (!cancelled) setRawImage(FALLBACK_HOG_IMAGE);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const originalImage = rawImage;
  const imageWidth = originalImage[0]?.length ?? 0;
  const imageHeight = originalImage.length;
  const cellsX = Math.floor(imageWidth / CELL_SIZE);
  const cellsY = Math.floor(imageHeight / CELL_SIZE);
  const safeCell = {
    x: cellsX > 0 ? Math.max(0, Math.min(currentCell.x, cellsX - 1)) : 0,
    y: cellsY > 0 ? Math.max(0, Math.min(currentCell.y, cellsY - 1)) : 0,
  };
  const anglePerBin = 180 / nbins;
  const blocksX = Math.max(0, cellsX - cellsPerBlock + 1);
  const blocksY = Math.max(0, cellsY - cellsPerBlock + 1);
  const totalBlocks = blocksX * blocksY;
  const featureDim = totalBlocks * cellsPerBlock * cellsPerBlock * nbins;

  const currentHogStep = useMemo(
    () => getHogCellStepAt(rawImage, safeCell.x, safeCell.y, CELL_SIZE, nbins, cellsPerBlock),
    [cellsPerBlock, nbins, rawImage, safeCell.x, safeCell.y]
  );

  const resultImage = useMemo(
    () => renderHogVisualization(rawImage, CELL_SIZE, nbins, cellsPerBlock, safeCell.x, safeCell.y, CELL_RENDER_SIZE),
    [cellsPerBlock, nbins, rawImage, safeCell.x, safeCell.y]
  );

  const handleDirectionMove = useGridNavigation({
    current: currentHogStep ? safeCell : null,
    bounds: { width: cellsX, height: cellsY },
    onMove: setCurrentCell,
    disabled: !currentHogStep,
  });

  const handleInputRegionSelect = useCallback((x: number, y: number) => {
    setCurrentCell({
      x: Math.floor(x / CELL_SIZE),
      y: Math.floor(y / CELL_SIZE),
    });
  }, []);

  const handleOutputPixelSelect = useCallback((x: number, y: number) => {
    setCurrentCell({
      x: Math.floor(x / CELL_RENDER_SIZE),
      y: Math.floor(y / CELL_RENDER_SIZE),
    });
  }, []);

  const parameters = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">当前 cell</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          原图按 {CELL_SIZE}×{CELL_SIZE} 像素划分为 {cellsX}×{cellsY} 个 cell。点击原图可选择一个 cell。
        </p>
        <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 font-mono text-sm font-semibold text-blue-800">
          cell ({safeCell.x}, {safeCell.y})
        </div>
      </div>

      <SelectParam
        label="方向数 nbins"
        value={String(nbins)}
        onChange={value => setNbins(Number(value))}
        options={NBINS_OPTIONS}
      />
      <SelectParam
        label="block 大小 (cells)"
        value={String(cellsPerBlock)}
        onChange={value => setCellsPerBlock(Number(value))}
        options={BLOCK_OPTIONS}
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
        <div className="text-[11px] font-semibold text-amber-800">当前窗口特征维度</div>
        <div className="mt-1 text-2xl font-bold text-amber-900">{featureDim.toLocaleString()}</div>
        <p className="mt-1 text-[10px] leading-4 text-amber-700">
          {blocksX}×{blocksY} blocks × {cellsPerBlock}×{cellsPerBlock} cells/block × {nbins} bins
        </p>
      </div>
    </div>
  );

  const analysisPreview = currentHogStep ? (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="mb-2 text-[11px] font-semibold uppercase text-red-700">输入 cell</div>
            <ImageCanvas image={currentHogStep.pixelRegion} maxDisplaySize={150} showGrid />
            <p className="mt-2 text-xs leading-5 text-slate-600">
              原图第 {safeCell.y * CELL_SIZE + 1}-{safeCell.y * CELL_SIZE + CELL_SIZE} 行，
              第 {safeCell.x * CELL_SIZE + 1}-{safeCell.x * CELL_SIZE + CELL_SIZE} 列。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="mb-2 text-[11px] font-semibold uppercase text-amber-700">梯度计算</div>
            <MatrixView title="M 梯度幅值" matrix={currentHogStep.magnitudeRegion} formatter={value => formatNumber(value, 1)} />
          </FlowNode>
          <FlowNode tone="sky">
            <div className="mb-2 text-[11px] font-semibold uppercase text-sky-700">bin 投票</div>
            <MatrixView title="方向 bin" matrix={currentHogStep.binRegion} formatter={value => String(Math.round(value))} />
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="mb-2 text-[11px] font-semibold uppercase text-emerald-700">当前 cell 直方图</div>
            <HistogramBars values={currentHogStep.histogram} />
          </FlowNode>
          <FlowNode tone="slate">
            <div className="mb-2 text-[11px] font-semibold uppercase text-slate-600">所属 block</div>
            <BlockCellsView step={currentHogStep} />
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  ) : null;

  const stepDetails = currentHogStep ? (
    <div className="space-y-6">
      <TeachingCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-800">HOG 要解决什么问题</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              目标检测不能只记住原始像素值。光照、颜色和纹理一变，同一个物体的像素会明显变化；
              但物体的轮廓、边缘走向和局部形状通常更稳定。
              HOG 把一个图像窗口转换成“边缘方向分布向量”，让后续分类器读取这条向量来判断窗口里是否有目标。
            </p>
          </div>
          <div className="max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            具体一点：先框出一个候选窗口，例如人、车或标志所在的小区域；HOG 把这个窗口变成一串边缘方向数字；
            分类器只回答“这个窗口像不像要找的目标”。把窗口从左到右、从上到下扫完整张图，就能找出目标可能出现的位置。
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">当前 cell 的真实 HOG 计算</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              选中 cell ({currentHogStep.cellX}, {currentHogStep.cellY})，先对其中每个像素计算 Sobel 梯度，
              再按方向 bin 累加梯度幅值，最后把所属 block 内的 cell 直方图串联并归一化。
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              当前页面为教学演示，采用硬投票（每个像素只投入最近的一个方向 bin）和固定左上角 block 策略；
              标准 HOG 还会对相邻 bin 做线性插值、使用 L2-Hys 归一化，并让 block 以 stride 滑动重叠。
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            每柱角度：{formatNumber(anglePerBin, 1)}°
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">代表像素代入</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          代表像素选取当前 cell 内梯度幅值最大的像素，便于观察方向投票如何发生。
        </p>
        <div className="space-y-3">
          <FormulaCard
            label={`像素 (${currentHogStep.sample.x}, ${currentHogStep.sample.y}) 的 Sobel 梯度`}
            mathML={buildGradientSubstitutionMathML(currentHogStep, originalImage)}
            note="这里使用未归一化的 Sobel 核近似梯度，Gx、Gy 数值来自当前 Lena 图的 3×3 邻域加权求和。"
            tone="embedded"
          />
          <FormulaCard
            label="梯度幅值"
            mathML={buildMagnitudeSubstitutionMathML(currentHogStep)}
            note="梯度幅值作为投票权重，边缘越强，对直方图贡献越大。"
            tone="embedded"
          />
          <FormulaCard
            label="方向落入的 bin"
            mathML={buildBinSubstitutionMathML(currentHogStep)}
            note={`nbins=${nbins} 时，每个方向柱覆盖 ${formatNumber(anglePerBin, 1)}°。`}
            tone="embedded"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">当前 cell 的矩阵展开</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <MatrixView title="原始灰度" matrix={currentHogStep.pixelRegion} formatter={value => formatNumber(value, 2)} />
          <MatrixView title="Gx 水平梯度" matrix={currentHogStep.gxRegion} formatter={value => formatNumber(value, 2)} />
          <MatrixView title="Gy 垂直梯度" matrix={currentHogStep.gyRegion} formatter={value => formatNumber(value, 2)} />
          <MatrixView title="bin 编号" matrix={currentHogStep.binRegion} formatter={value => String(Math.round(value))} />
        </div>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">block 归一化</h2>
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs leading-6 text-slate-600">
              当前 block 从 cell ({currentHogStep.blockX}, {currentHogStep.blockY}) 开始，
              覆盖 {cellsPerBlock}×{cellsPerBlock} 个 cell。先串联这些 cell 的方向直方图，再做 L2 归一化。
            </div>
            <div className="mt-2 text-xs leading-6 text-slate-500">
              当前页面为演示，把当前 cell 固定分配到包含它的最左上角 block；若 cell 靠近图像边界，block 会自动贴近边缘。
              标准 HOG 中 block 会以 stride 滑动，一个 cell 可能参与多个重叠 block 的归一化。
            </div>
            <div className="mt-3">
              <BlockCellsView step={currentHogStep} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold text-slate-800">归一化向量摘要</div>
            <div className="mt-2 text-xs leading-6 text-slate-600">
              向量长度：{currentHogStep.normalizedBlock.length}，
              L2 范数：{formatNumber(currentHogStep.blockNorm, 3)}
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1">
              {currentHogStep.normalizedBlock.slice(0, 24).map((value, index) => (
                <div key={`norm-${index}`} className="rounded border border-slate-200 bg-white px-1.5 py-1 text-center font-mono text-[9px] text-slate-600">
                  {formatNumber(value, 2)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">这个描述子能做什么</h2>
        <div className="space-y-3 text-xs leading-6 text-slate-600">
          <p>
            从当前 Lena 选区看，红框 cell 负责统计一个小区域的边缘方向；灰框 block 负责把相邻 cell 合成更稳定的小向量；
            整个检测窗口再把所有 block 向量接成一条长描述子。分类器读取的是这条描述子，而不是直接读取原始像素。
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border-l-2 border-amber-300 pl-3">
              <div className="font-semibold text-amber-700">当前 cell：局部方向统计</div>
              <p>
                cell ({currentHogStep.cellX}, {currentHogStep.cellY}) 内的每个像素先计算梯度，
                再投票到 {nbins} 个方向柱中，形成当前这张方向直方图。
              </p>
            </div>
            <div className="border-l-2 border-sky-300 pl-3">
              <div className="font-semibold text-sky-700">当前 block：稳定的小向量</div>
              <p>
                灰框 block 覆盖 {cellsPerBlock}×{cellsPerBlock} 个 cell，把这些直方图串联后归一化，
                得到长度为 {currentHogStep.normalizedBlock.length} 的 block 向量。
              </p>
            </div>
            <div className="border-l-2 border-emerald-300 pl-3">
              <div className="font-semibold text-emerald-700">检测窗口：一条长描述子</div>
              <p>
                当前窗口共有 {totalBlocks} 个 block，全部按扫描顺序拼接后，
                得到 {featureDim.toLocaleString()} 维窗口描述子，作为分类器输入。
              </p>
            </div>
          </div>
        </div>
        <FormulaCard
          className="mt-4"
          label="从当前 block 到窗口描述子"
          mathML={buildDescriptorExampleFormulaMathML(
            featureDim,
            totalBlocks,
            cellsPerBlock,
            nbins,
            currentHogStep.normalizedBlock.length
          )}
          note="分类器检测流水线会继续展开滑动窗口、分类器判别和候选框筛选。"
          tone="embedded"
        />
      </TeachingCard>
    </div>
  ) : (
    <div className="py-8 text-center text-slate-400">加载 HOG 示例图...</div>
  );

  return (
    <ConceptLayout
      title="HOG 特征"
      subtitle="Histogram of Oriented Gradient - 方向梯度直方图"
      operationLabel="HOG 统计"
      parameterIntro="点击 Lena 图选择一个 8×8 cell，或用方向键移动；当前页面只追踪当前 cell 的梯度幅值、方向 bin、直方图和 block 归一化证据。"
      parameters={parameters}
      stepDetails={stepDetails}
      analysisPreview={analysisPreview}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: HOG_CODE }]} />}
      originalImage={originalImage}
      resultImage={resultImage}
      imageLabels={{ input: 'Lena 原图', output: 'HOG cell/block 可视化' }}
      imageHints={{
        input: `红框为当前 ${CELL_SIZE}×${CELL_SIZE} cell，可点击切换`,
        output: '白框为当前 cell，灰框为所属 block，可点击切换',
      }}
      maxDisplaySize={400}
      showOriginalGrid={false}
      originalRegionMarker="frame"
      currentStep={
        currentHogStep
          ? {
              x: currentHogStep.cellX * CELL_SIZE,
              y: currentHogStep.cellY * CELL_SIZE,
              kernelSize: CELL_SIZE,
              outputX: currentHogStep.cellX * CELL_RENDER_SIZE + Math.floor(CELL_RENDER_SIZE / 2),
              outputY: currentHogStep.cellY * CELL_RENDER_SIZE + Math.floor(CELL_RENDER_SIZE / 2),
            }
          : null
      }
      stepInfo={
        cellsX > 0 && cellsY > 0
          ? { current: safeCell.y * cellsX + safeCell.x, total: cellsX * cellsY }
          : null
      }
      navigationHintText="方向键移动 cell / 点击原图或 HOG 图切换 cell"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      singlePageScroll
    />
  );
}
