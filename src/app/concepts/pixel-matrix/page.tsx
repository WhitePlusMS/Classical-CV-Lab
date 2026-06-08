'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  PixelColorSwatch,
  SelectParam,
  SliderParam,
  TeachingCard,
  FormulaCard,
  ProcessRail,
  AnchoredOverlay,
  buildInlineMathML,
} from '@/components';
import type { AnchoredOverlayPath, OverlayAnchor } from '@/components';
import {
  pixelMatrixSteps,
  grayscaleToTeachingColorImage,
  createColorCheckerboard,
  createColorGradient,
  createSmallMatrixImage,
  colorToGrayscaleImage,
  rgbArrayToColorImage,
  getNeighborhoodCoords,
} from '@/lib/algorithms/pixelMatrix';
import type { PixelMatrixStep, NeighborhoodType } from '@/lib/algorithms/pixelMatrix';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { centerCropRgbImage, loadImageAsRgb, resizeRgbImage } from '@/lib/utils/imageProcessing';
import { useGridNavigation } from '@/hooks/useGridNavigation';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

type TeachingImageType = SampleImageType | 'linear' | 'small-matrix' | 'color-checkerboard' | 'color-gradient';
type DisplayMode = 'grayscale' | 'color';

const LENA_DISPLAY_MAX_SIZE = 128;

// ---------------------------------------------------------------------------
// 代码示例
// ---------------------------------------------------------------------------

const PIXEL_MATRIX_CODE = `// 图像存储本质上是矩阵
// 本页内部使用 [0, 1] 归一化值；OpenCV 8-bit 图像常见存储范围是 [0, 255]
// 灰度图：每个元素是一个标量
// 彩色图：每个元素是 (R, G, B) 三元组

type GrayscaleImage = number[][];
type ColorPixel = { r: number; g: number; b: number };
type ColorImage = ColorPixel[][];

function clampIndex(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

// 读取位置 (row, col) 的像素值
const grayValue = image[row][col];                 // 灰度
const { r, g, b } = colorImage[row][col];          // 彩色

// 获取以 (col, row) 为中心的 k×k 邻域窗口
function getNeighborhood(
  image: ColorImage,
  col: number,
  row: number,
  size: number
): ColorImage {
  const half = Math.floor(size / 2);
  const result: ColorImage = [];
  for (let dy = -half; dy <= half; dy++) {
    const rowPixels: ColorPixel[] = [];
    for (let dx = -half; dx <= half; dx++) {
      const px = clampIndex(col + dx, image[0].length - 1);
      const py = clampIndex(row + dy, image.length - 1);
      rowPixels.push({ ...image[py][px] });
    }
    result.push(rowPixels);
  }
  return result;
}

// 注意区分：
// - 数学坐标 (x, y) → x 是列, y 是行
// - 数组访问 image[row][col] → row 是 y, col 是 x
// - 图像尺寸 = height × width = 行数 × 列数

// OpenCV 中的对应访问：
// cv::Mat image;
// image.at<uchar>(row, col);        // 灰度图
// image.at<Vec3b>(row, col)[k];     // 彩色图 (k=0 B, 1 G, 2 R)`;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function getTeachingImages(type: TeachingImageType, lenaRgbImage: number[][][] | null) {
  if (type === 'lena' && lenaRgbImage) {
    const colorImage = rgbArrayToColorImage(lenaRgbImage);
    return {
      colorImage,
      name: 'Lena',
      grayscaleImage: colorToGrayscaleImage(colorImage),
    };
  }

  if (type === 'color-checkerboard') {
    const colorImage = createColorCheckerboard();
    return {
      colorImage,
      name: '彩色棋盘格',
      grayscaleImage: colorToGrayscaleImage(colorImage),
    };
  }
  if (type === 'color-gradient') {
    const colorImage = createColorGradient();
    return {
      colorImage,
      name: '彩色渐变',
      grayscaleImage: colorToGrayscaleImage(colorImage),
    };
  }

  if (type === 'small-matrix') {
    const grayImage = createSmallMatrixImage();
    return {
      colorImage: grayscaleToTeachingColorImage(grayImage),
      name: '小矩阵 8×8',
      grayscaleImage: grayImage,
    };
  }

  const sampleKey: SampleImageType = type === 'linear' ? 'gradient' : type as SampleImageType;
  const grayImage = sampleImages[sampleKey].image;
  return {
    colorImage: grayscaleToTeachingColorImage(grayImage),
    name: sampleImages[sampleKey].name,
    grayscaleImage: grayImage,
  };
}

function getWindowSizeLabel(size: number): string {
  return `${size}×${size}`;
}

function getCenteredWindowStart(center: number, size: number, limit: number): number {
  if (limit <= size) return 0;
  const half = Math.floor(size / 2);
  return Math.max(0, Math.min(center - half, limit - size));
}

function isOffsetInNeighborhood(dx: number, dy: number, type: NeighborhoodType): boolean {
  if (dx === 0 && dy === 0) return false;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
  return type === '8' || Math.abs(dx) + Math.abs(dy) === 1;
}

// ---------------------------------------------------------------------------
// 页面组件
// ---------------------------------------------------------------------------

export default function PixelMatrixPage() {
  // --- 状态 ---
  const [imageType, setImageType] = useState<TeachingImageType>('small-matrix');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grayscale');
  const [windowSize, setWindowSize] = useState(3);
  const [neighborhoodType, setNeighborhoodType] = useState<NeighborhoodType>('8');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lenaRgbImage, setLenaRgbImage] = useState<number[][][] | null>(null);

  // --- 异步加载 Lena 图 ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawImage = await loadImageAsRgb('/assets/lena-original.jpg');
        if (!cancelled) setLenaRgbImage(resizeRgbImage(centerCropRgbImage(rawImage), LENA_DISPLAY_MAX_SIZE));
      } catch {
        // Lena 加载失败时保留 sampleImages 中的程序化示例
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // --- 派生数据 ---
  const { colorImage, grayscaleImage, name } = useMemo(
    () => getTeachingImages(imageType, lenaRgbImage),
    [imageType, lenaRgbImage]
  );

  const displayImage = useMemo(() => {
    if (displayMode === 'color') return colorToGrayscaleImage(colorImage);
    return grayscaleImage;
  }, [grayscaleImage, colorImage, displayMode]);

  const imageDim = useMemo(() => {
    if (!displayImage || displayImage.length === 0) return { height: 0, width: 0 };
    return { height: displayImage.length, width: displayImage[0].length };
  }, [displayImage]);

  // --- 步进生成（按需使用可变窗口大小） ---
  const steps = useMemo(() => {
    const img = displayMode === 'color' ? colorImage : grayscaleImage;
    return Array.from(pixelMatrixSteps(img, { windowSize }));
  }, [grayscaleImage, colorImage, displayMode, windowSize]);

  const currentStep: PixelMatrixStep | undefined = steps[currentStepIndex];

  // --- 定位与导航 ---
  const selectStepByPoint = useCallback((point: { x: number; y: number }) => {
    const idx = steps.findIndex(s => s.col === point.x && s.row === point.y);
    if (idx !== -1) setCurrentStepIndex(idx);
  }, [steps]);

  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.col, y: currentStep.row } : null,
    bounds: { width: imageDim.width, height: imageDim.height },
    onMove: selectStepByPoint,
    disabled: steps.length === 0,
  });

  const handleInputRegionSelect = useCallback((col: number, row: number) => {
    selectStepByPoint({ x: col, y: row });
  }, [selectStepByPoint]);

  // --- 参数变更 ---
  const handleImageTypeChange = useCallback((value: TeachingImageType) => {
    setImageType(value);
    setCurrentStepIndex(0);
  }, []);

  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    setCurrentStepIndex(0);
  }, []);

  const handleWindowSizeChange = useCallback((size: number) => {
    setWindowSize(size);
    setCurrentStepIndex(0);
  }, []);

  const handleNeighborhoodTypeChange = useCallback((type: NeighborhoodType) => {
    setNeighborhoodType(type);
  }, []);

  // --- 网格 & 标记 ---
  const shouldShowOriginalGrid = useMemo(() => {
    return displayMode === 'grayscale' && imageDim.width <= 16 && imageDim.height <= 16;
  }, [displayMode, imageDim]);

  const selectedWindowRegion = useMemo(() => {
    if (!currentStep) return null;

    if (imageType === 'lena') {
      return { x: currentStep.col, y: currentStep.row, size: 1 };
    }

    return {
      x: getCenteredWindowStart(currentStep.col, windowSize, imageDim.width),
      y: getCenteredWindowStart(currentStep.row, windowSize, imageDim.height),
      size: windowSize,
    };
  }, [currentStep, imageType, imageDim, windowSize]);

  // -------------------------------------------------------------------------
  // 参数面板
  // -------------------------------------------------------------------------

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="示例图像"
        value={imageType}
        onChange={value => handleImageTypeChange(value as TeachingImageType)}
        options={[
          ...Object.entries(sampleImages).map(([key, item]) => ({
            value: key,
            label: item.name,
          })),
          { value: 'small-matrix', label: '小矩阵 8×8' },
          { value: 'linear', label: 'Linear（线性渐变）' },
          { value: 'color-checkerboard', label: '彩色棋盘格' },
          { value: 'color-gradient', label: '彩色渐变' },
        ]}
      />

      <SelectParam
        label="显示模式"
        value={displayMode}
        onChange={value => handleDisplayModeChange(value as DisplayMode)}
        options={[
          { value: 'grayscale', label: '灰度（单通道）' },
          { value: 'color', label: '彩色（三通道）' },
        ]}
      />

      <SliderParam
        label="窗口大小"
        value={windowSize}
        onChange={handleWindowSizeChange}
        min={3}
        max={7}
        step={2}
      />

      <SelectParam
        label="邻域类型"
        value={neighborhoodType}
        onChange={value => handleNeighborhoodTypeChange(value as NeighborhoodType)}
        options={[
          { value: '4', label: '四邻域（上下左右）' },
          { value: '8', label: '八邻域（含对角线）' },
        ]}
      />

      <details className="rounded-2xl border border-slate-200 bg-slate-50/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-slate-700 marker:content-none">
          <span>图像信息</span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {name}
          </span>
        </summary>
        <div className="border-t border-slate-200 px-3 py-3 space-y-1.5 text-xs text-slate-600">
          <div>尺寸：{imageDim.width} × {imageDim.height}</div>
          <div>矩阵：{imageDim.height} 行 × {imageDim.width} 列</div>
          <div>总像素数：{imageDim.width * imageDim.height}</div>
          <div>当前窗口：{getWindowSizeLabel(windowSize)}</div>
          <div>当前模式：{displayMode === 'color' ? '彩色（RGB三通道）' : '灰度（单通道）'}</div>
        </div>
      </details>
    </div>
  );

  // -------------------------------------------------------------------------
  // analysisPreview — 当前窗口矩阵预览区
  // -------------------------------------------------------------------------

  const analysisPreview = useMemo(() => {
    if (!currentStep) return null;

    const { row, col, color, neighborhood, isBoundary } = currentStep;
    const width = imageDim.width;
    const height = imageDim.height;
    const half = Math.floor(windowSize / 2);

    return (
      <ProcessRail>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] xl:items-center">
          <div className="pixel-anchor-neighborhood rounded-2xl border border-emerald-200 bg-white px-4 py-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-emerald-700">
                  当前 {getWindowSizeLabel(windowSize)} 窗口矩阵
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  整个方阵都是当前窗口；绿色描边只标出
                  {neighborhoodType === '4' ? '四邻域' : '八邻域'}的方向集合。
                </div>
              </div>
              <PixelColorSwatch color={color} className="h-9 w-9 rounded-lg" />
            </div>

            <div
              className="grid gap-1 mx-auto"
              style={{ gridTemplateColumns: `repeat(${windowSize}, ${windowSize <= 5 ? 32 : 26}px)`, width: 'fit-content' }}
            >
              {neighborhood.map((pRow, r) =>
                pRow.map((p, c) => {
                  const dx = c - half;
                  const dy = r - half;
                  const gCol = col + dx;
                  const gRow = row + dy;
                  const isCenter = dx === 0 && dy === 0;
                  const isClamped = gCol < 0 || gCol >= width || gRow < 0 || gRow >= height;
                  const isActiveNeighbor = isOffsetInNeighborhood(dx, dy, neighborhoodType);
                  const isImmediateButInactive = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !isCenter && !isActiveNeighbor;

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`flex items-center justify-center rounded border text-[8px] font-mono transition ${
                        isCenter
                          ? 'border-red-600 ring-2 ring-red-400 z-10'
                          : isClamped
                            ? 'border-orange-400 ring-1 ring-orange-200'
                          : isActiveNeighbor
                            ? 'border-emerald-500 ring-1 ring-emerald-300'
                            : isImmediateButInactive
                              ? 'border-slate-200 opacity-35'
                              : 'border-slate-200 opacity-60'
                      }`}
                      style={{
                        width: `${windowSize <= 5 ? 32 : 26}px`,
                        height: `${windowSize <= 5 ? 32 : 26}px`,
                        backgroundColor: `rgb(${Math.round(p.r * 255)}, ${Math.round(p.g * 255)}, ${Math.round(p.b * 255)})`,
                      }}
                      title={isCenter
                        ? `中心像素 image[${row}][${col}]`
                        : isClamped
                          ? `窗口位置 (${gCol}, ${gRow}) 越界，显示 clamp 后的边界像素`
                        : `窗口偏移 (dx=${dx}, dy=${dy})`
                      }
                    >
                      {displayMode === 'grayscale' && (
                        <span className="text-[7px] text-white leading-none" style={{ textShadow: '0 0 3px rgba(0,0,0,0.9)' }}>
                          {(p.gray ?? p.r).toFixed(1)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-xs leading-6 text-slate-600">
            <div className="font-semibold text-slate-800">当前窗口如何读取</div>
            <div className="mt-2">
              中心像素位于第 {row + 1} 行、第 {col + 1} 列，即数学坐标
              <span className="font-mono text-slate-800"> (x={col}, y={row})</span>。
              当前窗口向四周各扩展 {half} 格，得到 {getWindowSizeLabel(windowSize)} 局部矩阵；窗口内所有格子都属于当前局部范围。
            </div>
            <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              {neighborhoodType === '4'
                ? '四邻域只选中心像素的上、下、左、右四个直接相邻位置；对角线位置不会被计入四邻域。'
                : '八邻域在四邻域基础上再加入左上、右上、左下、右下四个对角位置。绿色描边用于说明方向定义，不表示大窗口里只有这些格子参与。'}
            </div>
            {isBoundary && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                当前窗口靠近图像边界，越界位置按 clamp 策略复制最近的边界像素。
              </div>
            )}
          </div>
        </div>
      </ProcessRail>
    );
  }, [currentStep, windowSize, neighborhoodType, displayMode, imageDim]);

  // -------------------------------------------------------------------------
  // visualOverlay — 跨层引导线
  // -------------------------------------------------------------------------

  const visualOverlay = useMemo(() => {
    if (!currentStep || !selectedWindowRegion) return null;

    const fromAnchor: OverlayAnchor = imageType === 'lena'
      ? {
          kind: 'pixel',
          selector: '.conv-anchor-input-main',
          x: currentStep.col,
          y: currentStep.row,
          imageWidth: imageDim.width,
          imageHeight: imageDim.height,
        }
      : {
          kind: 'region',
          selector: '.conv-anchor-input-main',
          x: selectedWindowRegion.x,
          y: selectedWindowRegion.y,
          size: selectedWindowRegion.size,
          imageWidth: imageDim.width,
          imageHeight: imageDim.height,
        };

    const paths: AnchoredOverlayPath[] = [
      {
        id: 'pixel-to-neighborhood',
        tone: 'red',
        from: fromAnchor,
        to: {
          kind: 'element',
          selector: '.pixel-anchor-neighborhood',
        },
      },
    ];

    return <AnchoredOverlay paths={paths} />;
  }, [currentStep, imageDim, imageType, selectedWindowRegion]);

  // -------------------------------------------------------------------------
  // stepDetails — 完整详细区
  // -------------------------------------------------------------------------

  const stepDetails = useMemo(() => {
    if (!currentStep) return null;

    const { row, col, x, y, color, neighborhood, windowSize: ws, isBoundary } = currentStep;
    const width = imageDim.width;
    const height = imageDim.height;
    const half = Math.floor(ws / 2);
    const neighborCoords = getNeighborhoodCoords(neighborhoodType);

    const coordFormula = buildInlineMathML(`
      <mrow>
        <mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
        <mo>=</mo>
        <mo>(</mo><mi>col</mi><mo>,</mo><mi>row</mi><mo>)</mo>
        <mo>=</mo>
        <mo>(</mo><mn>${col}</mn><mo>,</mo><mn>${row}</mn><mo>)</mo>
      </mrow>
    `);

    const windowFormula = buildInlineMathML(`
      <mrow>
        <mi>N</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
        <mo>=</mo>
        <mo>{</mo>
        <mi>image</mi><mo>[</mo><mi>y</mi><mo>+</mo><mi>dy</mi><mo>][</mo><mi>x</mi><mo>+</mo><mi>dx</mi><mo>]</mo>
        <mo>|</mo>
        <mo>-</mo><mi>h</mi><mo>≤</mo><mi>dx</mi><mo>,</mo><mi>dy</mi><mo>≤</mo><mi>h</mi>
        <mo>}</mo>
      </mrow>
    `);

    return (
      <div className="space-y-5">
        {/* 1. 图像 = 矩阵 */}
        <TeachingCard>
          <h3 className="text-sm font-semibold text-slate-800">图像 = 矩阵</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div>
              <div className="font-medium text-slate-500 mb-1">图像尺寸</div>
              <div className="font-mono">
                高度 × 宽度 = {height} × {width}
                <span className="text-slate-400"> → 矩阵 {height} 行 × {width} 列</span>
              </div>
            </div>
            <div>
              <div className="font-medium text-slate-500 mb-1">当前像素</div>
              <div className="font-mono">
                第 {row + 1} 行，第 {col + 1} 列
                <span className="text-slate-400"> → 数学坐标 ({x}, {y})</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            灰度图中每个元素是一个标量；本页内部使用 <code className="bg-slate-100 px-1 rounded">[0, 1]</code> 归一化值，
            OpenCV 8-bit 图像中常见范围是 <code className="bg-slate-100 px-1 rounded">[0, 255]</code>。
            彩色图中每个元素是 <code className="bg-slate-100 px-1 rounded">(R, G, B)</code> 三元组。
            在 OpenCV 中使用 <code className="bg-slate-100 px-1 rounded">cv::Mat</code> 存储，
            通过 <code className="bg-slate-100 px-1 rounded">image.at&lt;uchar&gt;(row, col)</code> 访问灰度值，
            通过 <code className="bg-slate-100 px-1 rounded">image.at&lt;Vec3b&gt;(row, col)[k]</code> 访问通道值（k=0 B, 1 G, 2 R）。
          </div>
        </TeachingCard>

        {/* 2. 坐标约定 */}
        <TeachingCard tone="amber">
          <h3 className="text-sm font-semibold text-amber-700">坐标约定</h3>
          <div className="mt-2 space-y-2 text-xs text-amber-800">
            <div>
              <code className="bg-amber-100 px-1 rounded text-[11px]">image[row][col]</code>
              <span className="ml-2">第 <strong>{row}</strong> 行（row），第 <strong>{col}</strong> 列（col）</span>
            </div>
            <div>
              <code className="bg-amber-100 px-1 rounded text-[11px]">(x, y)</code>
              <span className="ml-2">x = <strong>{col}</strong>（水平/列方向），y = <strong>{row}</strong>（垂直/行方向）</span>
            </div>
            <div className="text-amber-600 text-[11px]">
              图像坐标系中 y 轴向下为正，与数学坐标系 y 轴向上相反。本页统一使用 (x, y) = (col, row)。
            </div>
          </div>
          <FormulaCard
            mathML={coordFormula}
            className="mt-3"
            formulaClassName="px-4 py-4"
          />
        </TeachingCard>

        {/* 3. 当前像素值 */}
        <TeachingCard>
          <h3 className="text-sm font-semibold text-slate-800">
            {displayMode === 'color' ? '彩色像素 — 三通道值' : '灰度像素 — 单通道值'}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-[10px] font-medium text-slate-400">选中像素</div>
              <PixelColorSwatch color={color} className="h-12 w-12 rounded-lg" />
              <div className="font-mono text-[10px] text-slate-500">
                行 {row + 1}, 列 {col + 1}
              </div>
            </div>

            <div className="text-xs font-mono space-y-1">
              {displayMode === 'color' ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-3 inline-block rounded bg-red-500" />
                    <span>R = {(color.r * 255).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-3 inline-block rounded bg-green-500" />
                    <span>G = {(color.g * 255).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-3 inline-block rounded bg-blue-500" />
                    <span>B = {(color.b * 255).toFixed(0)}</span>
                  </div>
                  <div className="text-slate-400 mt-1">
                    灰度合成 ≈ {(color.gray ?? (0.299 * color.r + 0.587 * color.g + 0.114 * color.b)).toFixed(3)}
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-slate-500">灰度值：</span>
                  <span className="text-slate-800 font-semibold">
                    {(color.gray ?? color.r).toFixed(3)}
                  </span>
                  <span className="text-slate-400 ml-1">→ 标量（单通道）</span>
                </div>
              )}
            </div>
          </div>
        </TeachingCard>

        {/* 4. 邻域窗口矩阵 */}
        <TeachingCard>
          <h3 className="text-sm font-semibold text-emerald-700">
            {getWindowSizeLabel(ws)} 邻域窗口矩阵
            <span className="ml-2 text-[11px] font-normal text-emerald-500">
              （中心红框 = image[{row}][{col}]）
            </span>
          </h3>

          <FormulaCard
            mathML={windowFormula}
            className="mt-3"
            formulaClassName="px-4 py-4"
            note={
              <span>
                其中 <code className="rounded bg-slate-100 px-1">k = {ws}</code>，
                <code className="rounded bg-slate-100 px-1">h = floor(k / 2) = {half}</code>；
                因此当前窗口覆盖中心像素周围横向和纵向各 {half} 格。
              </span>
            }
          />

          {/* 邻域矩阵放大 */}
          <div className="mt-3 overflow-x-auto">
            <div
              className="grid gap-0.5 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${ws}, ${ws <= 5 ? 30 : 26}px)`,
                width: 'fit-content',
              }}
            >
              {neighborhood.map((pRow, r) =>
                pRow.map((p, c) => {
                  const isCenter = r === half && c === half;
                  const gCol = col + (c - half);
                  const gRow = row + (r - half);
                  const dx = c - half;
                  const dy = r - half;
                  const isClamped = gCol < 0 || gCol >= width || gRow < 0 || gRow >= height;
                  const isActiveNeighbor = isOffsetInNeighborhood(dx, dy, neighborhoodType);
                  const isImmediateButInactive = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !isCenter && !isActiveNeighbor;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`flex flex-col items-center justify-center border rounded text-[8px] font-mono ${
                        isCenter
                          ? 'border-red-500 ring-1 ring-red-400 z-10'
                          : isClamped
                            ? 'border-orange-400 ring-1 ring-orange-200'
                          : isActiveNeighbor
                            ? 'border-emerald-500 ring-1 ring-emerald-300'
                            : isImmediateButInactive
                              ? 'border-slate-200 opacity-35'
                            : 'border-emerald-200'
                      }`}
                      style={{
                        width: `${ws <= 5 ? 30 : 26}px`,
                        height: `${ws <= 5 ? 30 : 26}px`,
                        backgroundColor: `rgb(${Math.round(p.r * 255)}, ${Math.round(p.g * 255)}, ${Math.round(p.b * 255)})`,
                      }}
                      title={
                        isCenter
                          ? `中心像素 [${row}][${col}]`
                          : isClamped
                            ? `越界 (${gCol},${gRow}) → clamp 到边界`
                          : isActiveNeighbor
                            ? `${neighborhoodType === '4' ? '四邻域' : '八邻域'}方向 [${gRow}][${gCol}]`
                            : `邻域 [${gRow}][${gCol}]`
                      }
                    >
                      {displayMode === 'grayscale' && (
                        <span className="text-[7px] text-white leading-none"
                          style={{ textShadow: '0 0 3px rgba(0,0,0,0.9)' }}>
                          {(p.gray ?? p.r).toFixed(1)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 邻域类型说明 */}
          <div className="mt-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50/50">
            <div className="text-xs font-medium text-emerald-700 mb-1.5">
              {neighborhoodType === '4' ? '四邻域（4 方向）' : '八邻域（8 方向）'}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {neighborCoords.map(({ dx, dy }) => (
                <div
                  key={`${dx},${dy}`}
                  className="flex items-center gap-1 rounded border border-emerald-200 bg-white px-1.5 py-0.5 text-[10px] text-emerald-700"
                >
                  <span className="font-mono">({dx > 0 ? '+' : ''}{dx}, {dy > 0 ? '+' : ''}{dy})</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-emerald-600 leading-relaxed">
              {neighborhoodType === '4'
                ? '四邻域只包含中心像素的上、下、左、右四个直接相邻位置；矩阵中的对角线位置会淡化显示。'
                : '八邻域包含四邻域的全部方向，再加上四个对角方向；在 3×3 情况下，除中心外的 8 个位置都会被高亮。'
              }
            </div>
          </div>
        </TeachingCard>

        {/* 5. 边界处理 */}
        {isBoundary && (
          <TeachingCard tone="amber">
            <h3 className="text-sm font-semibold text-red-600">边界越界处理</h3>
            <div className="mt-2 text-xs text-red-700 leading-relaxed space-y-2">
              <p>
                当前像素位于图像边界附近（行 {row + 1}，列 {col + 1}），
                {getWindowSizeLabel(ws)} 窗口部分超出图像范围。
              </p>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { name: 'Clamp（复制边界）', desc: '越界坐标映射到最近的有效边界像素值', active: true },
                  { name: 'Zero（补零）', desc: '越界位置填充 0', active: false },
                  { name: 'Mirror（镜像）', desc: '越界位置沿边界镜像反射', active: false },
                  { name: 'Ignore（忽略）', desc: '不处理边界像素，输出图缩小', active: false },
                ].map(s => (
                  <div
                    key={s.name}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] leading-relaxed ${
                      s.active
                        ? 'border-red-300 bg-red-50 text-red-700 font-medium'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <div className="font-semibold">{s.name}</div>
                    <div className="mt-0.5">{s.desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-red-500 mt-1">
                本页当前使用 Clamp 策略：越界坐标被限制到最近的有效边界位置，窗口不会真正"越界"。
              </p>
            </div>
          </TeachingCard>
        )}

        {/* 6. 矩阵详览（小尺寸图像） */}
        {width <= 16 && height <= 16 && (
          <TeachingCard>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">矩阵详览（点击跳转）</h3>
            <div className="overflow-x-auto">
              <div
                className="grid gap-0.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${width}, 22px)`,
                  width: 'fit-content',
                }}
              >
                {displayImage.map((rowData, r) =>
                  rowData.map((val, c) => {
                    const pixel = colorImage[r]?.[c] ?? { r: val, g: val, b: val, gray: val };
                    const isSelected = r === row && c === col;
                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`flex items-center justify-center border rounded text-[8px] font-mono cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-red-500 bg-red-50 text-red-700 font-bold ring-1 ring-red-400 z-10'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        style={{
                          width: '22px',
                          height: '22px',
                          backgroundColor: isSelected
                            ? undefined
                            : `rgb(${Math.round(pixel.r * 255)}, ${Math.round(pixel.g * 255)}, ${Math.round(pixel.b * 255)})`,
                        }}
                        onClick={() => {
                          const idx = steps.findIndex(s => s.row === r && s.col === c);
                          if (idx !== -1) setCurrentStepIndex(idx);
                        }}
                        title={`行 ${r + 1}, 列 ${c + 1} = ${(pixel.gray ?? pixel.r).toFixed(2)}`}
                      >
                        {displayMode === 'grayscale' ? (pixel.gray ?? pixel.r).toFixed(1) : ''}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TeachingCard>
        )}

        {/* 7. 教学衔接提示 */}
        <TeachingCard>
          <h3 className="text-sm font-semibold text-blue-700">为什么需要邻域窗口？</h3>
          <div className="mt-2 text-xs text-blue-700 leading-relaxed">
            后续课程中的卷积、均值滤波、中值滤波、Sobel 边缘检测、拉普拉斯锐化、形态学操作等算法，
            都依赖从图像中取出一个局部窗口（邻域），对这个窗口内的像素进行加权求和、排序、比较等操作，
            然后将结果写回输出图像的对应位置。没有邻域窗口概念，就无法理解为什么这些算法需要"看周围像素"而不只是"看当前像素"。
          </div>
        </TeachingCard>
      </div>
    );
  }, [currentStep, displayImage, displayMode, colorImage, steps, windowSize, neighborhoodType, imageDim]);

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  return (
    <ConceptLayout
      title="像素矩阵与邻域窗口"
      subtitle="Pixel Matrix & Neighborhood - 图像即矩阵：像素坐标、索引、邻域与局部窗口"
      operationLabel="矩阵访问"
      parameterIntro="左侧切换示例图像、显示模式、窗口大小与邻域类型；右侧展示图像坐标、数组行列、像素值及局部邻域窗口之间的对应关系。"
      originalImage={displayImage}
      originalRgbImage={displayMode === 'color' ? colorImage.map(row => row.map(p => [p.r, p.g, p.b] as [number, number, number])) : null}
      resultImage={displayImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={visualOverlay}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: PIXEL_MATRIX_CODE }]} />}
      showOriginalGrid={shouldShowOriginalGrid}
      originalRegionMarker={imageType === 'lena' ? 'dot' : 'frame'}
      currentStep={
        currentStep && selectedWindowRegion
          ? {
              x: currentStep.col,
              y: currentStep.row,
              kernelSize: selectedWindowRegion.size,
              regionX: selectedWindowRegion.x,
              regionY: selectedWindowRegion.y,
            }
          : null
      }
      currentStepLabel="当前像素"
      stepInfo={
        steps.length > 0
          ? { current: currentStepIndex, total: steps.length }
          : null
      }
      onStepChange={setCurrentStepIndex}
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      imageLabels={{ output: '矩阵视图' }}
      imageHints={{ input: '原图 · 点击或方向键选择像素', output: '同步矩阵视图（选中行列高亮）' }}
      singlePageScroll
      navigationHintText="方向键移动行列 / 点击图像或矩阵格子跳转"
    />
  );
}
