'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  CameraCalibrationScene3D,
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
  buildInlineMathML,
} from '@/components';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import {
  DEFAULT_BOARD_SPEC,
  buildCalibrationViewSamples,
  countCalibrationEquations,
  createCheckerboardImage,
  createProjectedCornerImage,
  type CalibrationViewSample,
  type ProjectedBoardCorner,
} from '@/lib/algorithms/cameraCalibration';

const BOARD_CELL_PIXELS = 12;
const PREVIEW_WIDTH = 120;
const PREVIEW_HEIGHT = 90;
const SOURCE_WIDTH = 640;
const SOURCE_HEIGHT = 480;

const CALIBRATION_PATTERN_CODE = `const objectPoints = createChessboardWorldPoints(patternSize, squareSize);
const imagePoints = [];

for (const image of calibrationImages) {
  const found = findChessboardCorners(image, patternSize, corners);
  if (!found) continue;

  const refinedCorners = findCornerSubPix(grayImage, corners, windowSize);
  imagePoints.push(refinedCorners);
}

// The next page uses objectPoints and imagePoints to estimate camera parameters.
calibrateCamera(objectPoints, imagePoints, imageSize);`;

interface PreviewCorner extends ProjectedBoardCorner {
  previewPoint: { x: number; y: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function math(body: string): string {
  return buildInlineMathML(`<mrow>${body}</mrow>`);
}

function scaleCornersForPreview(corners: ProjectedBoardCorner[]): PreviewCorner[] {
  const sx = PREVIEW_WIDTH / SOURCE_WIDTH;
  const sy = PREVIEW_HEIGHT / SOURCE_HEIGHT;

  return corners.map(corner => ({
    ...corner,
    projected: { x: corner.projected.x * sx, y: corner.projected.y * sy },
    rounded: { x: corner.rounded.x * sx, y: corner.rounded.y * sy },
    subPixel: { x: corner.subPixel.x * sx, y: corner.subPixel.y * sy },
    previewPoint: { x: corner.subPixel.x * sx, y: corner.subPixel.y * sy },
  }));
}

function findNearestCorner(corners: PreviewCorner[], x: number, y: number): number {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  corners.forEach(corner => {
    const distance = Math.hypot(corner.previewPoint.x - x, corner.previewPoint.y - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = corner.index;
    }
  });

  return nearestIndex;
}

export default function CalibrationPatternPage() {
  const [viewCount, setViewCount] = useState(3);
  const [activeViewId, setActiveViewId] = useState('view-1');
  const [selectedCornerIndex, setSelectedCornerIndex] = useState(0);

  const boardSpec = DEFAULT_BOARD_SPEC;
  const allViews = useMemo(() => buildCalibrationViewSamples(), []);
  const activeViews = useMemo(() => allViews.slice(0, viewCount), [allViews, viewCount]);

  const safeActiveViewId = activeViews.some(view => view.id === activeViewId)
    ? activeViewId
    : activeViews[0]?.id ?? 'view-1';

  const activeView = useMemo<CalibrationViewSample | null>(
    () => activeViews.find(view => view.id === safeActiveViewId) ?? activeViews[0] ?? null,
    [safeActiveViewId, activeViews]
  );

  const totalCorners = boardSpec.rows * boardSpec.cols;

  const previewCorners = useMemo(() => scaleCornersForPreview(activeView?.corners ?? []), [activeView]);
  const selectedCorner = activeView?.corners[selectedCornerIndex] ?? null;
  const selectedPreviewCorner = previewCorners[selectedCornerIndex] ?? null;

  const boardImage = useMemo(
    () =>
      createCheckerboardImage(
        boardSpec.rows,
        boardSpec.cols,
        selectedCorner ? { row: selectedCorner.row, col: selectedCorner.col } : null,
        BOARD_CELL_PIXELS
      ),
    [boardSpec.cols, boardSpec.rows, selectedCorner]
  );

  const projectionImage = useMemo(
    () => createProjectedCornerImage(previewCorners, PREVIEW_WIDTH, PREVIEW_HEIGHT, selectedCornerIndex, true),
    [previewCorners, selectedCornerIndex]
  );

  const handleDirectionMove = useGridNavigation({
    current: selectedCorner ? { x: selectedCorner.col, y: selectedCorner.row } : null,
    bounds: { width: boardSpec.cols, height: boardSpec.rows },
    onMove: point => setSelectedCornerIndex(point.y * boardSpec.cols + point.x),
    disabled: !selectedCorner,
  });

  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      const col = clamp(Math.round(x / BOARD_CELL_PIXELS), 0, boardSpec.cols - 1);
      const row = clamp(Math.round(y / BOARD_CELL_PIXELS), 0, boardSpec.rows - 1);
      setSelectedCornerIndex(row * boardSpec.cols + col);
    },
    [boardSpec.cols, boardSpec.rows]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      if (previewCorners.length === 0) return;
      setSelectedCornerIndex(findNearestCorner(previewCorners, x, y));
    },
    [previewCorners]
  );

  const pairFormula = selectedCorner
    ? math(`<msub><mi>M</mi><mi>${selectedCorner.index}</mi></msub><mo>=</mo><mo>(</mo><mn>${selectedCorner.world.x.toFixed(1)}</mn><mo>,</mo><mn>${selectedCorner.world.y.toFixed(1)}</mn><mo>,</mo><mn>0</mn><mo>)</mo><mo>&#8596;</mo><msub><mi>m</mi><mi>${selectedCorner.index}</mi></msub><mo>=</mo><mo>(</mo><mn>${selectedCorner.subPixel.x.toFixed(2)}</mn><mo>,</mo><mn>${selectedCorner.subPixel.y.toFixed(2)}</mn><mo>)</mo>`)
    : math('<mn>0</mn>');

  const contentHeader = (
    <div>
      <div className="text-sm font-semibold text-slate-800">继续回答“求参数需要哪些数据”</div>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        投影方程确定后，为了反求 K 和每张图的 [R,t]，需要采集许多组同一角点的两种坐标：
        棋盘平面上的世界坐标 M，以及照片中检测到的像素坐标 m。
      </p>
    </div>
  );

  const mainVisual = selectedCorner && activeView ? (
    <CameraCalibrationScene3D
      extrinsics={activeView.extrinsics}
      selectedPoint={selectedCorner}
      mode="corner-detection"
      viewPoses={activeViews.map(view => ({ id: view.id, name: view.name, extrinsics: view.extrinsics }))}
      activeViewId={activeView.id}
      imageSize={{ width: SOURCE_WIDTH, height: SOURCE_HEIGHT }}
      title="空间标定关系"
      subtitle={`${activeView.name} / 已启用 ${activeViews.length} 张标定图 / 当前角点 ${selectedCorner.index + 1}`}
      badges={[
        `yaw ${activeView.extrinsics.yaw}°`,
        `pitch ${activeView.extrinsics.pitch}°`,
        `roll ${activeView.extrinsics.roll}°`,
      ]}
      heightClassName="h-[560px]"
    />
  ) : null;

  const analysisPreview = selectedCorner ? (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. object_points：棋盘提供已知世界点</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              棋盘格被放在
              <MathText className="mx-1" mathML={math('<mi>Z</mi><mo>=</mo><mn>0</mn>')} />
              平面上，格子间距已知，因此每个角点的世界坐标可由行列编号直接写出。
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                第 {selectedCorner.row + 1} 行，第 {selectedCorner.col + 1} 列
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                M=({selectedCorner.world.x.toFixed(1)}, {selectedCorner.world.y.toFixed(1)}, 0)
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. image_points：图像检测得到像素点</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              同一角点在照片中会落到一个像素位置。角点检测和亚像素细化的任务，就是稳定得到这个
              <MathText className="mx-1" mathML={math('<mi>m</mi><mo>=</mo><mo>(</mo><mi>u</mi><mo>,</mo><mi>v</mi><mo>)</mo>')} />
              。
            </p>
            <FormulaCard
              className="mt-3"
              mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><mi>R</mi><mo>,</mo><mi>t</mi><mo>]</mo><mover><mi>M</mi><mo>~</mo></mover>')}
              formulaClassName="rounded-xl px-3 py-3 shadow-none"
              note="成像模型保持不变，只是输入点来自标定板。"
            />
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. 点对进入参数求解</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              每个角点形成一组
              <MathText className="mx-1" mathML={math('<msub><mi>M</mi><mi>i</mi></msub><mo>&#8596;</mo><msub><mi>m</mi><mi>i</mi></msub>')} />
              。多张不同姿态的标定图共享同一个 K，但各自有不同的 [R,t]。
            </p>
            <FormulaCard
              className="mt-3"
              mathML={pairFormula}
              formulaClassName="rounded-xl px-3 py-3 shadow-none"
              note={`${activeViews.length} 张姿态图可提供 ${countCalibrationEquations(activeViews.length)} 条内参约束。`}
            />
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  ) : null;

  const stepDetails = selectedCorner && selectedPreviewCorner ? (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-emerald-900">求解相机参数前，需要准备四类输入</div>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          标定步骤通常包括：读取多张棋盘图，检测角点，亚像素细化，再把图像角点坐标和世界物理坐标送入标定函数。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">object_points</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">棋盘内角点的物理坐标，形如 M=(X,Y,0)。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">image_points</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">同一角点在照片中的像素坐标，形如 m=(u,v)。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">point_counts</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">每张有效图中的角点数量，且编号顺序必须一致。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">image_size</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">图像宽高，用于初始化和约束相机参数求解。</p>
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前角点如何形成一组输入数据</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          上方三维场景负责理解空间关系；二维视图负责核对同一角点在棋盘世界平面和图像平面中的两种坐标。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm font-semibold text-slate-800">棋盘世界平面</div>
            <ImageCanvas
              image={boardImage}
              maxDisplaySize={220}
              showGrid
              selectedRegionMarker="dot"
              selectedRegion={{
                x: selectedCorner.col * BOARD_CELL_PIXELS,
                y: selectedCorner.row * BOARD_CELL_PIXELS,
                size: 1,
              }}
              interactive
              onRegionSelect={handleInputRegionSelect}
            />
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm font-semibold text-slate-800">图像中的角点</div>
            <ImageCanvas
              image={projectionImage}
              maxDisplaySize={220}
              highlightPixel={{
                x: Math.round(selectedPreviewCorner.subPixel.x),
                y: Math.round(selectedPreviewCorner.subPixel.y),
              }}
              interactive
              onRegionSelect={handleOutputPixelSelect}
            />
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前角点对应关系</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            label="世界坐标点"
            mathML={math(`<msub><mi>M</mi><mi>${selectedCorner.index}</mi></msub><mo>=</mo><mo>(</mo><mn>${selectedCorner.world.x.toFixed(1)}</mn><mo>,</mo><mn>${selectedCorner.world.y.toFixed(1)}</mn><mo>,</mo><mn>0</mn><mo>)</mo>`)}
            note="棋盘格平面设为 Z=0，角点坐标由行列和格子尺寸决定。"
          />
          <FormulaCard
            label="图像坐标点"
            mathML={math(`<msub><mi>m</mi><mi>${selectedCorner.index}</mi></msub><mo>=</mo><mo>(</mo><mn>${selectedCorner.subPixel.x.toFixed(2)}</mn><mo>,</mo><mn>${selectedCorner.subPixel.y.toFixed(2)}</mn><mo>)</mo>`)}
            note="图像点来自角点检测和亚像素细化。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">为什么需要多张不同姿态的标定图</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          同一块棋盘以不同姿态出现，会产生不同的平面到图像映射。多张图合在一起，才能从多个 H 中稳定求出同一个 K。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="grid gap-3">
            {activeViews.map(view => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveViewId(view.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  view.id === activeView?.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{view.name}</span>
                  <span className="text-xs text-slate-500">
                    yaw {view.extrinsics.yaw}°, pitch {view.extrinsics.pitch}°, roll {view.extrinsics.roll}°
                  </span>
                </div>
              </button>
            ))}
          </div>
          <FormulaCard
            label="约束数量"
            mathML={math(`<mn>2</mn><mo>&#215;</mo><mn>${activeViews.length}</mn><mo>=</mo><mn>${countCalibrationEquations(activeViews.length)}</mn>`)}
            note="每张有效姿态图在张正友法中提供两条内参约束。"
          />
        </div>
      </TeachingCard>
    </div>
  ) : (
    <div className="py-8 text-center text-slate-400">暂无有效角点</div>
  );

  const parameters = (
    <div className="space-y-4">
      <SliderParam label="有效标定图数量" value={viewCount} onChange={setViewCount} min={1} max={allViews.length} step={1} unit=" 张" />
      <SelectParam
        label="当前姿态图"
        value={safeActiveViewId}
        onChange={setActiveViewId}
        options={activeViews.map(view => ({ value: view.id, label: view.name }))}
      />
      <SliderParam label="当前角点编号" value={selectedCornerIndex} onChange={setSelectedCornerIndex} min={0} max={totalCorners - 1} step={1} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前角点：第 {selectedCorner ? selectedCorner.row + 1 : 0} 行、第 {selectedCorner ? selectedCorner.col + 1 : 0} 列。
        切换姿态图可以观察同一角点在不同拍摄角度下的投影变化。
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="标定板与角点检测"
      subtitle="Calibration Pattern & Corners"
      contentHeader={contentHeader}
      operationLabel="角点对应"
      parameterIntro="只保留会影响教学观察的操作：标定图数量、当前姿态和当前角点。"
      originalImage={boardImage}
      resultImage={projectionImage}
      mainVisual={mainVisual}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: CALIBRATION_PATTERN_CODE }]} />}
      singlePageScroll
      currentStep={
        selectedCorner && selectedPreviewCorner
          ? {
              x: Math.round(selectedPreviewCorner.subPixel.x),
              y: Math.round(selectedPreviewCorner.subPixel.y),
              kernelSize: 1,
              regionX: selectedCorner.col * BOARD_CELL_PIXELS,
              regionY: selectedCorner.row * BOARD_CELL_PIXELS,
              regionWidth: 1,
              regionHeight: 1,
            }
          : null
      }
      currentStepLabel="当前角点"
      stepInfo={{ current: selectedCornerIndex, total: totalCorners }}
      navigationHintText="方向键移动角点 / 在下方二维视图中点击切换角点"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
    />
  );
}
