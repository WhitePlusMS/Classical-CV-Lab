'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ConceptLayout,
  CodeViewer,
  PixelColorSwatch,
  SelectParam,
} from '@/components';
import {
  pixelMatrixSteps,
  grayscaleToTeachingColorImage,
  createColorCheckerboard,
  createColorGradient,
  colorToGrayscaleImage,
  rgbArrayToColorImage,
} from '@/lib/algorithms/pixelMatrix';
import { sampleImages, SampleImageType } from '@/lib/utils/sampleImages';
import { loadImageAsRgb, resizeRgbImage } from '@/lib/utils/imageProcessing';
import { useGridNavigation } from '@/hooks/useGridNavigation';

// 教学示例图像类型
type TeachingImageType = SampleImageType | 'linear' | 'color-checkerboard' | 'color-gradient';

// 显示模式
type DisplayMode = 'grayscale' | 'color';

const LENA_DISPLAY_MAX_SIZE = 128;

const PIXEL_MATRIX_CODE = `// 图像存储本质上是矩阵
// 灰度图：每个元素是 [0, 255] 的标量
// 彩色图：每个元素是 (R, G, B) 三元组

type GrayscaleImage = number[][];
type ColorPixel = { r: number; g: number; b: number };
type ColorImage = ColorPixel[][];

// 读取灰度图位置 (row, col) 的像素值
const pixelValue = image[row][col];

// 读取彩色图位置 (row, col) 的像素值
const red = colorImage[row][col].r;
const green = colorImage[row][col].g;
const blue = colorImage[row][col].b;

// 注意区分：
// - 数学坐标 (x, y) → x 是列, y 是行
// - 数组访问 image[row][col] → row 是 y, col 是 x
// - 图像尺寸 = height × width = 行数 × 列数`;

// 获取教学用示例图像元数据
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

  // 标准灰度图
  const sampleKey: SampleImageType = type === 'linear' ? 'gradient' : type as SampleImageType;
  const grayImage = sampleImages[sampleKey].image;
  return {
    colorImage: grayscaleToTeachingColorImage(grayImage),
    name: sampleImages[sampleKey].name,
    grayscaleImage: grayImage,
  };
}

export default function PixelMatrixPage() {
  // 状态管理
  const [imageType, setImageType] = useState<TeachingImageType>('checkerboard');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grayscale');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lenaRgbImage, setLenaRgbImage] = useState<number[][][] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rawImage = await loadImageAsRgb('/assets/lena-original.jpg');
        if (!cancelled) {
          setLenaRgbImage(resizeRgbImage(rawImage, LENA_DISPLAY_MAX_SIZE));
        }
      } catch {
        // Lena 加载失败时保留 sampleImages 中的程序化示例，避免页面整体不可用。
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { colorImage, grayscaleImage, name } = useMemo(
    () => getTeachingImages(imageType, lenaRgbImage),
    [imageType, lenaRgbImage]
  );

  // 用于 ConceptLayout 显示的灰度图
  const displayImage = useMemo(() => {
    if (displayMode === 'color') return colorToGrayscaleImage(colorImage);
    return grayscaleImage;
  }, [grayscaleImage, colorImage, displayMode]);

  // 步进生成
  const steps = useMemo(() => {
    const img = displayMode === 'color' ? colorImage : grayscaleImage;
    return Array.from(pixelMatrixSteps(img));
  }, [grayscaleImage, colorImage, displayMode]);

  const currentStep = steps[currentStepIndex];
  const selectStepByPoint = useCallback((point: { x: number; y: number }) => {
    const idx = steps.findIndex(s => s.col === point.x && s.row === point.y);
    if (idx !== -1) setCurrentStepIndex(idx);
  }, [steps]);

  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.col, y: currentStep.row } : null,
    bounds: { width: displayImage[0]?.length ?? 0, height: displayImage.length },
    onMove: selectStepByPoint,
    disabled: steps.length === 0,
  });

  // 点击原图跳转
  const handleInputRegionSelect = useCallback((col: number, row: number) => {
    selectStepByPoint({ x: col, y: row });
  }, [selectStepByPoint]);

  // 图像切换
  const handleImageTypeChange = useCallback((value: TeachingImageType) => {
    setImageType(value);
    setCurrentStepIndex(0);
  }, []);

  // 显示模式切换
  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    setCurrentStepIndex(0);
  }, []);

  // 获取当前图像尺寸
  const imageDim = useMemo(() => {
    if (!displayImage || displayImage.length === 0) return { height: 0, width: 0 };
    return { height: displayImage.length, width: displayImage[0].length };
  }, [displayImage]);

  const shouldShowOriginalGrid = useMemo(() => {
    return displayMode === 'grayscale' && imageDim.width <= 16 && imageDim.height <= 16;
  }, [displayMode, imageDim]);

  // --- stepDetails: 完整详细区 ---
  const stepDetails = useMemo(() => {
    if (!currentStep) return null;

    const { row, col, x, y, color, neighborhood } = currentStep;
    const width = displayImage[0]?.length || 0;
    const height = displayImage.length;
    const zoomedSize = zoomLevel;

    return (
      <div className="space-y-5">
        {/* 1. 图像尺寸与矩阵对应关系 */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">图像 = 矩阵</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">图像尺寸</div>
              <div className="font-mono text-sm text-slate-700">
                高度 (height) × 宽度 (width) = {height} × {width}
                {'  '}
                <span className="text-slate-400">→ 矩阵 {height} 行 × {width} 列</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">当前像素</div>
              <div className="font-mono text-sm text-slate-700">
                第 {row + 1} 行, 第 {col + 1} 列
                {'  '}
                <span className="text-slate-400">→ 数学坐标 ({x}, {y})</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 坐标对照 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">坐标约定</h3>
          <div className="text-xs text-amber-800 space-y-1.5">
            <p>
              <code className="bg-amber-100 px-1 rounded">image[row][col]</code>：
              第 <strong>{row}</strong> 行（row），第 <strong>{col}</strong> 列（col）
            </p>
            <p>
              <code className="bg-amber-100 px-1 rounded">(x, y)</code> 数学坐标：
              x = <strong>{col}</strong>（水平/列方向），y = <strong>{row}</strong>（垂直/行方向）
            </p>
            <p className="text-amber-600">
              注意：图像中 y 轴向下为正方向，与数学坐标的 y 轴向上相反
            </p>
          </div>
        </div>

        {/* 3. 像素值和邻域矩阵展示 */}
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {displayMode === 'color' ? '彩色像素 — 三通道值' : '灰度像素 — 单通道值'}
          </h3>

          <div className="flex flex-wrap items-center gap-6">
            {/* 选中像素 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-[10px] font-medium text-slate-400">选中像素</div>
              <PixelColorSwatch color={color} className="h-12 w-12" />
              <div className="font-mono text-[10px] text-slate-500">
                行 {row + 1}, 列 {col + 1}
              </div>
            </div>

            {/* 像素值详情 */}
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
                  <span className="text-slate-500">灰度值: </span>
                  <span className="text-slate-800">
                    {(color.gray ?? color.r).toFixed(3)}
                    {'  '}→ 标量（单通道）
                  </span>
                </div>
              )}
            </div>

            {/* 3×3 邻域放大 */}
            <div className="border-l border-slate-200 pl-6">
              <div className="text-[10px] font-medium text-slate-400 mb-2">3×3 邻域放大</div>
              <div className="grid gap-0.5" style={{
                gridTemplateColumns: `repeat(3, ${Math.max(24, zoomedSize * 8)}px)`,
              }}>
                {neighborhood.flat().map((pixel, i) => {
                  const nRow = Math.floor(i / 3);
                  const nCol = i % 3;
                  const isCenter = nRow === 1 && nCol === 1;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center border ${
                        isCenter ? 'border-red-500 ring-1 ring-red-400' : 'border-slate-200'
                      } rounded`}
                      style={{
                        width: `${Math.max(24, zoomedSize * 8)}px`,
                        height: `${Math.max(24, zoomedSize * 8)}px`,
                        backgroundColor: `rgb(${Math.round(pixel.r * 255)}, ${Math.round(pixel.g * 255)}, ${Math.round(pixel.b * 255)})`,
                      }}
                    >
                      {false && (
                        <span className="text-[6px] text-white font-mono leading-none"
                          style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
                          {isCenter ? pixel.r.toFixed(1) : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. 图像矩阵展示 - 带高亮的放大格子 */}
        <div className="border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">矩阵详览</h3>
          <div className="overflow-x-auto">
            <div
              className="grid gap-0.5 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${Math.min(width, 16)}, ${Math.max(16, 24)}px)`,
                width: 'fit-content',
              }}
            >
              {displayImage.slice(0, Math.min(height, 16)).map((rowData, r) =>
                rowData.slice(0, Math.min(width, 16)).map((val, c) => {
                  const pixel = colorImage[r]?.[c] ?? { r: val, g: val, b: val, gray: val };
                  const isSelected = r === row && c === col;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`flex items-center justify-center border rounded text-[9px] font-mono cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-red-500 bg-red-50 text-red-700 font-bold ring-1 ring-red-400 z-10'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                      style={{
                        width: `${Math.max(16, 20)}px`,
                        height: `${Math.max(16, 20)}px`,
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
            {(width > 16 || height > 16) && (
              <div className="text-center text-[10px] text-slate-400 mt-2">
                仅显示前 16×16 子矩阵，共 {height}×{width} 像素
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }, [currentStep, displayImage, displayMode, zoomLevel, colorImage, steps]);

  // --- 参数面板 ---
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
          <div>当前模式：{displayMode === 'color' ? '彩色（RGB三通道）' : '灰度（单通道）'}</div>
        </div>
      </details>
    </div>
  );

  return (
    <ConceptLayout
      title="像素矩阵"
      subtitle="图像 = 矩阵 · 理解像素的存储与访问"
      operationLabel="矩阵访问"
      parameterIntro="左侧用于切换示例图像和显示模式；右侧展示图像坐标、数组行列与像素值之间的对应关系。"
      originalImage={displayImage}
      originalRgbImage={displayMode === 'color' ? colorImage.map(row => row.map(p => [p.r, p.g, p.b] as [number, number, number])) : null}
      resultImage={displayImage}
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: PIXEL_MATRIX_CODE }]} />}
      showOriginalGrid={shouldShowOriginalGrid}
      originalRegionMarker={imageType === 'lena' ? 'dot' : 'frame'}
      currentStep={
        currentStep
          ? { x: currentStep.col, y: currentStep.row, kernelSize: 1 }
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
      imageHints={{ input: '原图 · 点击或方向键选择像素', output: '矩阵详览（选中行列高亮）' }}
      singlePageScroll
      navigationHintText="方向键移动行列 / 点击图像或矩阵格子跳转"
    />
  );
}
