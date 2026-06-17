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
  DEFAULT_BOARD_SPEC,
  DEFAULT_CALIBRATION_VIEWS,
  DEFAULT_CAMERA_INTRINSICS,
  buildCalibrationViewSamples,
  countCalibrationEquations,
  createBoardCorners,
  createCheckerboardImage,
  createIntrinsicMatrix,
  createProjectedCornerImage,
  estimateHomographyDLT,
  estimateIntrinsicsFromHomographies,
  formatMatrixValue,
} from '@/lib/algorithms/cameraCalibration';

const CHECKER_CELL_PIXELS = 12;
const PROJECTION_WIDTH = 640;
const PROJECTION_HEIGHT = 480;

type StageKey = 'correspondences' | 'homography' | 'intrinsics' | 'extrinsics' | 'reprojection' | 'summary';

interface StageItem {
  key: StageKey;
  label: string;
  summary: string;
}

const STAGES: StageItem[] = [
  { key: 'correspondences', label: '1. 角点对应', summary: '收集棋盘角点的世界坐标与像素坐标' },
  { key: 'homography', label: '2. 单应估计', summary: '对每张图用 DLT 估计 H' },
  { key: 'intrinsics', label: '3. 内参求解', summary: '由多个 H 构造 Vb=0 恢复 K' },
  { key: 'extrinsics', label: '4. 外参恢复', summary: '已知 K 后从 H 恢复 R,t' },
  { key: 'reprojection', label: '5. 误差验证', summary: '用估计参数重投影并检查误差' },
  { key: 'summary', label: '6. 结果总结', summary: '对比估计内参与真实内参' },
];

function getStageIndex(stage: StageKey): number {
  return STAGES.findIndex(item => item.key === stage);
}

function StageStepper({
  activeStage,
  onStageChange,
}: {
  activeStage: StageKey;
  onStageChange: (stage: StageKey) => void;
}) {
  const activeIndex = getStageIndex(activeStage);

  return (
    <div className="space-y-2">
      {STAGES.map((stage, index) => {
        const active = stage.key === activeStage;
        const completed = index < activeIndex;

        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onStageChange(stage.key)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
              active
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : completed
                  ? 'border-slate-200 bg-white text-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : completed
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-slate-500'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-sm font-semibold">{stage.label}</span>
            </div>
            <div className="mt-1 pl-8 text-xs leading-5">{stage.summary}</div>
          </button>
        );
      })}
    </div>
  );
}

const ZHANG_CODE = `// 当前页面实现的是张正友标定的线性部分（未做非线性优化 / 畸变估计）

// 1. 准备同一张棋盘格角点的两组坐标
const objectPoints = boardCorners.map(c => ({ x: c.world.x, y: c.world.y }));
const imagePoints = detectedCorners; // 亚像素角点 (u, v)

// 2. 对每张标定图估计单应矩阵 H（DLT + Hartley 归一化）
const homographies = views.map(view =>
  estimateHomographyDLT(view.objectPoints, view.imagePoints, true)
);

// 3. 由 H 构造约束 V b = 0，最小奇异向量给出 b
//    B = [[b1,b2,b4],[b2,b3,b5],[b4,b5,b6]] = K^{-T} K^{-1}
const b = solveHomogeneous(buildV(homographies));
const K = recoverIntrinsicMatrix(b);

// 4. 已知 K，从每个 H 恢复该图外参
const extrinsics = homographies.map(H => recoverExtrinsics(K, H));

// 5. 用 K, R, t 把棋盘角点重投影回图像，计算误差
const error = computeReprojectionError(K, extrinsics, objectPoints, imagePoints);`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function math(body: string): string {
  return buildInlineMathML(`<mrow>${body}</mrow>`);
}

function MatrixPreview({
  title,
  rows,
  tone = 'slate',
}: {
  title: string;
  rows: string[][];
  tone?: 'slate' | 'amber' | 'blue' | 'emerald';
}) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.12em]">{title}</div>
      <div className="mt-3 overflow-x-auto">
        <div className="inline-grid gap-1 rounded-xl bg-white/85 p-2">
          {rows.map((row, rowIndex) => (
            <div key={`${title}-${rowIndex}`} className="flex gap-1">
              {row.map((value, colIndex) => (
                <div
                  key={`${title}-${rowIndex}-${colIndex}`}
                  className="flex min-w-[5rem] items-center justify-center rounded-lg border border-slate-100 bg-white px-2 py-2 font-mono text-xs"
                >
                  {value}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ZhangCalibrationPage() {
  const allViews = useMemo(() => buildCalibrationViewSamples(), []);
  const boardCorners = useMemo(() => createBoardCorners(DEFAULT_BOARD_SPEC), []);
  const intrinsicMatrix = useMemo(() => createIntrinsicMatrix(DEFAULT_CAMERA_INTRINSICS), []);

  const [stage, setStage] = useState<StageKey>('correspondences');
  const [viewCount, setViewCount] = useState(3);
  const [activeViewId, setActiveViewId] = useState(allViews[0]?.id ?? 'view-1');
  const [selectedCornerIndex, setSelectedCornerIndex] = useState(0);

  const estimatedIntrinsics = useMemo(() => {
    const objectPoints = boardCorners.map(corner => corner.world);
    const homographies = allViews.map(view =>
      estimateHomographyDLT(objectPoints, view.corners.map(corner => corner.subPixel), true)
    );
    return estimateIntrinsicsFromHomographies(homographies);
  }, [allViews, boardCorners]);
  const estimatedIntrinsicMatrix = useMemo(
    () => createIntrinsicMatrix(estimatedIntrinsics),
    [estimatedIntrinsics]
  );

  const activeViews = useMemo(() => allViews.slice(0, clamp(viewCount, 1, allViews.length)), [allViews, viewCount]);

  const safeActiveViewId = activeViews.some(view => view.id === activeViewId)
    ? activeViewId
    : activeViews[0]?.id ?? 'view-1';

  const activeView = useMemo(
    () => activeViews.find(view => view.id === safeActiveViewId) ?? activeViews[0] ?? null,
    [safeActiveViewId, activeViews]
  );

  const selectedBoardCorner = boardCorners[selectedCornerIndex] ?? null;
  const selectedImageCorner = activeView?.corners[selectedCornerIndex] ?? null;
  const totalCorners = boardCorners.length;
  const equationCount = countCalibrationEquations(activeViews.length);
  const enoughEquations = equationCount >= 6;

  const originalImage = useMemo(
    () =>
      selectedBoardCorner
        ? createCheckerboardImage(
            DEFAULT_BOARD_SPEC.rows,
            DEFAULT_BOARD_SPEC.cols,
            { row: selectedBoardCorner.row, col: selectedBoardCorner.col },
            CHECKER_CELL_PIXELS
          )
        : null,
    [selectedBoardCorner]
  );

  const resultImage = useMemo(
    () =>
      activeView
        ? createProjectedCornerImage(activeView.corners, PROJECTION_WIDTH, PROJECTION_HEIGHT, selectedCornerIndex, false)
        : null,
    [activeView, selectedCornerIndex]
  );

  const handleCornerChange = useCallback(
    (index: number) => setSelectedCornerIndex(clamp(index, 0, Math.max(0, totalCorners - 1))),
    [totalCorners]
  );

  const handleDirectionMove = useGridNavigation({
    current: selectedBoardCorner ? { x: selectedBoardCorner.col, y: selectedBoardCorner.row } : null,
    bounds: { width: DEFAULT_BOARD_SPEC.cols, height: DEFAULT_BOARD_SPEC.rows },
    onMove: point => handleCornerChange(point.y * DEFAULT_BOARD_SPEC.cols + point.x),
    disabled: !selectedBoardCorner,
  });

  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      const col = clamp(Math.round(x / CHECKER_CELL_PIXELS) - 1, 0, DEFAULT_BOARD_SPEC.cols - 1);
      const row = clamp(Math.round(y / CHECKER_CELL_PIXELS) - 1, 0, DEFAULT_BOARD_SPEC.rows - 1);
      handleCornerChange(row * DEFAULT_BOARD_SPEC.cols + col);
    },
    [handleCornerChange]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      if (!activeView) return;

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      activeView.corners.forEach(corner => {
        const distance = Math.hypot(corner.projected.x - x, corner.projected.y - y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = corner.index;
        }
      });
      handleCornerChange(nearestIndex);
    },
    [activeView, handleCornerChange]
  );

  const currentStep = selectedBoardCorner && selectedImageCorner
    ? {
        x: clamp(Math.round(selectedImageCorner.projected.x), 0, PROJECTION_WIDTH - 1),
        y: clamp(Math.round(selectedImageCorner.projected.y), 0, PROJECTION_HEIGHT - 1),
        kernelSize: 1,
        regionX: (selectedBoardCorner.col + 1) * CHECKER_CELL_PIXELS,
        regionY: (selectedBoardCorner.row + 1) * CHECKER_CELL_PIXELS,
        regionWidth: 1,
        regionHeight: 1,
      }
    : null;

  const currentError = selectedImageCorner?.reprojectionError ?? 0;
  const viewError = activeView?.meanReprojectionError ?? 0;
  const observedCornerPoint = selectedImageCorner?.subPixel ?? null;
  const projectedCornerPoint = selectedImageCorner?.projected ?? null;
  const residualDx = observedCornerPoint && projectedCornerPoint ? observedCornerPoint.x - projectedCornerPoint.x : 0;
  const residualDy = observedCornerPoint && projectedCornerPoint ? observedCornerPoint.y - projectedCornerPoint.y : 0;

  const contentHeader = (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-800">把成像模型和角点对应合起来：由点对反求相机参数</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          成像模型给出
          <MathText
            className="mx-1"
            mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><mi>R</mi><mo>,</mo><mi>t</mi><mo>]</mo><msub><mover><mi>X</mi><mo>~</mo></mover><mi>w</mi></msub>')}
          />
          ，标定板提供同一批角点的世界坐标和像素坐标。张正友法把这些点对转化为
          <TeachingTerm
            term="单应矩阵 H"
            explanation="单应矩阵 H 是同一张平面标定板从世界平面到图像平面的 3×3 投影映射。"
            className="mx-1"
          />
          ，再求 K 和每张图的
          <TeachingTerm
            term="R/t"
            explanation="R 和 t 是这张图独有的外参，表示标定板相对相机的姿态和位置。"
            className="mx-1"
          />
          。
          <span className="ml-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
            教学实现：角点为程序合成并加入微小偏移，这里演示真实的 H→B→K→R,t 线性求解链；畸变与非线性优化暂未包含。
          </span>
        </p>
      </div>
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          enoughEquations ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
        }`}
      >
        {activeViews.length} 张图 / {equationCount} 条约束
      </div>
    </div>
  );

  const correspondencesPreview = activeView && selectedBoardCorner && selectedImageCorner && (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. 同一角点的两种坐标</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              `objectPoints` 是棋盘平面上的
              <MathText className="mx-1" mathML={math('<msub><mi>X</mi><mi>w</mi></msub><mo>=</mo><mo>(</mo><mi>X</mi><mo>,</mo><mi>Y</mi><mo>,</mo><mn>0</mn><mo>)</mo>')} />
              ；`imagePoints` 是同一角点在照片中的像素位置
              <MathText className="mx-1" mathML={math('<mi>m</mi><mo>=</mo><mo>(</mo><mi>u</mi><mo>,</mo><mi>v</mi><mo>)</mo>')} />
              。
            </p>
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              M=({selectedBoardCorner.world.x.toFixed(1)}, {selectedBoardCorner.world.y.toFixed(1)}, 0)
              ，m=({selectedImageCorner.subPixel.x.toFixed(2)}, {selectedImageCorner.subPixel.y.toFixed(2)})
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="slate">
            <div className="text-[11px] font-semibold uppercase text-slate-600">刚体变换</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              对每一张照片，先经过
              <MathText className="mx-1" mathML={math('<msub><mi>X</mi><mi>c</mi></msub><mo>=</mo><mi>R</mi><msub><mi>X</mi><mi>w</mi></msub><mo>+</mo><mi>t</mi>')} />
              ，再由 K 投到像素平面。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">平面约束</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              棋盘点都在
              <MathText className="mx-1" mathML={math('<mi>Z</mi><mo>=</mo><mn>0</mn>')} />
              平面上，因此一张标定图可先估计一个
              <TeachingTerm
                term="单应矩阵 H"
                explanation="H 把平面点直接映射到图像点，所以先不必一上来就展开完整三维投影链。"
                className="mx-1"
              />
              。
            </p>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const homographyPreview = activeView && (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. 单应矩阵 H</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              对当前视图用 DLT 估计 H，使得
              <MathText className="mx-1" mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>H</mi><mover><mi>M</mi><mo>~</mo></mover>')} />
              。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="blue">
            <div className="text-[11px] font-semibold uppercase text-blue-800">H 与 K、R、t 的关系</div>
            <FormulaCard
              className="mt-3"
              mathML={math('<mi>H</mi><mo>=</mo><mi>K</mi><mo>[</mo><msub><mi>r</mi><mn>1</mn></msub><msub><mi>r</mi><mn>2</mn></msub><mi>t</mi><mo>]</mo>')}
              formulaClassName="rounded-xl px-3 py-3 shadow-none"
              note="平面标定板把三维投影链压缩成 3×3 单应。"
            />
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="slate">
            <div className="text-[11px] font-semibold uppercase text-slate-600">当前视图 H</div>
            <div className="mt-3 inline-grid gap-1 rounded-xl bg-white/85 p-2">
              {activeView.homography.map((row, rowIndex) => (
                <div key={`h-${rowIndex}`} className="flex gap-1">
                  {row.map((value, colIndex) => (
                    <div
                      key={`h-${rowIndex}-${colIndex}`}
                      className="flex min-w-[4.5rem] items-center justify-center rounded-lg border border-slate-100 bg-white px-2 py-1.5 font-mono text-[10px]"
                    >
                      {formatMatrixValue(value, 2)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const intrinsicsPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. 由内参约束求 K</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              每张 H 给出
              <MathText className="mx-1" mathML={math('<msup><mi>v</mi><mi>T</mi></msup><mi>b</mi><mo>=</mo><mn>0</mn>')} />
              两条约束，联立后最小二乘解出 b，再分解出 K。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="blue">
            <div className="text-[11px] font-semibold uppercase text-blue-800">真实 K</div>
            <div className="mt-3 inline-grid gap-1 rounded-xl bg-white/85 p-2">
              {intrinsicMatrix.map((row, rowIndex) => (
                <div key={`k-${rowIndex}`} className="flex gap-1">
                  {row.map((value, colIndex) => (
                    <div
                      key={`k-${rowIndex}-${colIndex}`}
                      className="flex min-w-[4.5rem] items-center justify-center rounded-lg border border-slate-100 bg-white px-2 py-1.5 font-mono text-[10px]"
                    >
                      {formatMatrixValue(value, 2)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">估计 K</div>
            <div className="mt-3 inline-grid gap-1 rounded-xl bg-white/85 p-2">
              {estimatedIntrinsicMatrix.map((row, rowIndex) => (
                <div key={`kest-${rowIndex}`} className="flex gap-1">
                  {row.map((value, colIndex) => (
                    <div
                      key={`kest-${rowIndex}-${colIndex}`}
                      className="flex min-w-[4.5rem] items-center justify-center rounded-lg border border-slate-100 bg-white px-2 py-1.5 font-mono text-[10px]"
                    >
                      {formatMatrixValue(value, 2)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const extrinsicsPreview = activeView && (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">4. 当前视图外参</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              K 已知后，从当前 H 恢复 R,t：
              <MathText
                className="mx-1"
                mathML={math('<msub><mi>r</mi><mn>1</mn></msub><mo>=</mo><mi>&lambda;</mi><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>1</mn></msub>')}
              />
              。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="slate">
            <div className="text-[11px] font-semibold uppercase text-slate-600">当前视图真实姿态</div>
            <div className="mt-3 grid gap-1 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">yaw={DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.yaw.toFixed(1)}°</div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">pitch={DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.pitch.toFixed(1)}°</div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">roll={DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.roll.toFixed(1)}°</div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="blue">
            <div className="text-[11px] font-semibold uppercase text-blue-800">估计姿态</div>
            <div className="mt-3 grid gap-1 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">yaw={activeView.extrinsics.yaw.toFixed(1)}°</div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">pitch={activeView.extrinsics.pitch.toFixed(1)}°</div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">roll={activeView.extrinsics.roll.toFixed(1)}°</div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const reprojectionPreview = activeView && (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">5. 检测角点 vs 重投影点</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {'用估计的 K、R、t 把棋盘角点重新投影到图像，与"检测角点"比较。'}
            </p>
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              检测 m=({selectedImageCorner?.subPixel.x.toFixed(2)}, {selectedImageCorner?.subPixel.y.toFixed(2)})
              ，重投影 m^=({selectedImageCorner?.projected.x.toFixed(2)}, {selectedImageCorner?.projected.y.toFixed(2)})
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">当前角点误差</div>
            <div className="mt-3 text-2xl font-semibold text-amber-900">{currentError.toFixed(3)} px</div>
            <div className="mt-1 text-xs text-slate-500">Δu={residualDx.toFixed(2)}, Δv={residualDy.toFixed(2)}</div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">当前视图平均</div>
            <div className="mt-3 text-2xl font-semibold text-emerald-800">{viewError.toFixed(3)} px</div>
            <div className="mt-1 text-xs text-slate-500">所有角点重投影误差的均值</div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const summaryPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="blue">
            <div className="text-[11px] font-semibold uppercase text-blue-800">6. 内参估计对比</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              估计 K 与真实 K 的相对误差反映线性标定链的精度。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="slate">
            <div className="text-[11px] font-semibold uppercase text-slate-600">参数误差</div>
            <div className="mt-3 grid gap-1 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                α: {((Math.abs(estimatedIntrinsics.alpha - DEFAULT_CAMERA_INTRINSICS.alpha) / DEFAULT_CAMERA_INTRINSICS.alpha) * 100).toFixed(2)}%
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                β: {((Math.abs(estimatedIntrinsics.beta - DEFAULT_CAMERA_INTRINSICS.beta) / DEFAULT_CAMERA_INTRINSICS.beta) * 100).toFixed(2)}%
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                γ: {Math.abs(estimatedIntrinsics.gamma - DEFAULT_CAMERA_INTRINSICS.gamma).toFixed(3)}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                (u₀,v₀): ({Math.abs(estimatedIntrinsics.u0 - DEFAULT_CAMERA_INTRINSICS.u0).toFixed(2)},{' '}
                {Math.abs(estimatedIntrinsics.v0 - DEFAULT_CAMERA_INTRINSICS.v0).toFixed(2)})
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">各视图平均误差</div>
            <div className="mt-3 grid gap-1 text-xs">
              {activeViews.map(view => (
                <div key={view.id} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                  {view.name}: {view.meanReprojectionError.toFixed(3)} px
                </div>
              ))}
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const analysisPreview = (() => {
    switch (stage) {
      case 'correspondences':
        return correspondencesPreview;
      case 'homography':
        return homographyPreview;
      case 'intrinsics':
        return intrinsicsPreview;
      case 'extrinsics':
        return extrinsicsPreview;
      case 'reprojection':
        return reprojectionPreview;
      case 'summary':
        return summaryPreview;
      default:
        return null;
    }
  })();

  const correspondencesDetails = activeView && selectedBoardCorner && selectedImageCorner ? (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">输入变量先对齐：objectPoints 与 imagePoints</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          这两个名字来自 OpenCV 接口，本质上就是同一批棋盘角点在两个坐标系下的记录。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            label="棋盘世界坐标"
            mathML={math('<msub><mi>X</mi><mi>w</mi></msub><mo>=</mo><mo>(</mo><mi>X</mi><mo>,</mo><mi>Y</mi><mo>,</mo><mn>0</mn><mo>)</mo>')}
            note="由棋盘行列编号和格子尺寸直接确定。"
          />
          <FormulaCard
            label="图像像素坐标"
            mathML={math('<mi>m</mi><mo>=</mo><mo>(</mo><mi>u</mi><mo>,</mo><mi>v</mi><mo>,</mo><mn>1</mn><mo>)</mo>')}
            note="角点由合成投影加微小偏移得到。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前角点的坐标对</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
            世界角点 M=({selectedBoardCorner.world.x.toFixed(1)}, {selectedBoardCorner.world.y.toFixed(1)}, 0)
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
            检测角点 m=({selectedImageCorner.subPixel.x.toFixed(2)}, {selectedImageCorner.subPixel.y.toFixed(2)})
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            重投影点 m^=({selectedImageCorner.projected.x.toFixed(2)}, {selectedImageCorner.projected.y.toFixed(2)})
          </div>
        </div>
      </TeachingCard>
    </div>
  ) : null;

  const homographyDetails = activeView ? (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">DLT 估计单应矩阵</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          对每对匹配点，利用叉积关系
          <MathText className="mx-1" mathML={math('<mover><mi>m</mi><mo>~</mo></mover><mo>&#215;</mo><mi>H</mi><mover><mi>M</mi><mo>~</mo></mover><mo>=</mo><mn>0</mn>')} />
          构造线性方程 A h = 0，再取最小奇异向量。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            label="DLT 齐次方程"
            mathML={math('<mi>A</mi><mi>h</mi><mo>=</mo><mn>0</mn>')}
            note="h 是 H 的 9 个元素按行展开。"
          />
          <FormulaCard
            label="Hartley 归一化"
            mathML={math('<mover><mi>H</mi><mo>^</mo></mover><mo>=</mo><msup><mi>T</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mi>H</mi><mi>T</mi>')}
            note="对图像点和世界点分别做平移缩放，提高数值稳定性。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前视图估计的 H</div>
        <MatrixPreview title="H" tone="amber" rows={activeView.homography.map(row => row.map(value => formatMatrixValue(value, 2)))} />
      </TeachingCard>
    </div>
  ) : null;

  const intrinsicsDetails = (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">由 H 恢复内参 K</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {'利用旋转矩阵列向量的正交约束，把每张 H 转化为关于 B = K^{-T}K^{-1} 的线性方程。'}
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            label="正交约束"
            mathML={math('<msub><mi>h</mi><mn>1</mn></msup><msup><mi>K</mi><mrow><mo>-</mo><mi>T</mi></mrow></msup><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>2</mn></msub><mo>=</mo><mn>0</mn>')}
            note="r1 与 r2 正交。"
          />
          <FormulaCard
            label="等模约束"
            mathML={math('<msub><mi>h</mi><mn>1</mn></msup><msup><mi>K</mi><mrow><mo>-</mo><mi>T</mi></mrow></msup><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>1</mn></msub><mo>=</mo><msub><mi>h</mi><mn>2</mn></msup><msup><mi>K</mi><mrow><mo>-</mo><mi>T</mi></mrow></msup><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>2</mn></msub>')}
            note="r1 与 r2 模长均为 1。"
          />
          <FormulaCard
            label="向量形式"
            mathML={math('<msup><mi>v</mi><mi>T</mi></msup><mi>b</mi><mo>=</mo><mn>0</mn>')}
            note="b = [B11, B12, B22, B13, B23, B33]^T。"
          />
          <FormulaCard
            label="B 与 K 的关系"
            mathML={math('<mi>B</mi><mo>=</mo><msup><mi>K</mi><mrow><mo>-</mo><mi>T</mi></mrow></msup><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup>')}
            note="B 对称正定，对其做 Cholesky/解析分解得到 K。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">真实 K 与估计 K 对比</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <MatrixPreview title="真实 K" tone="blue" rows={intrinsicMatrix.map(row => row.map(value => formatMatrixValue(value, 2)))} />
          <MatrixPreview title="估计 K" tone="amber" rows={estimatedIntrinsicMatrix.map(row => row.map(value => formatMatrixValue(value, 2)))} />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">为什么至少需要三张有效图像</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          K 有 5 个自由参数（当假设 skew=0 时降为 4 参数），每张图的 H 提供 2 条线性约束。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            mathML={math(`<mn>2</mn><mi>N</mi><mo>&#8805;</mo><mn>6</mn><mo>,</mo><mi>N</mi><mo>&#8805;</mo><mn>3</mn>`)}
            note="三张图给出 6 条方程，才开始足以约束 5 个内参自由度。"
          />
          <div className={`rounded-2xl border px-4 py-4 text-sm leading-6 ${enoughEquations ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            当前选择 {activeViews.length} 张图像，共 {equationCount} 条约束。
            {enoughEquations ? ' 这满足线性求解的基本数量要求。' : ' 这还不足以稳定求出完整内参。'}
          </div>
        </div>
      </TeachingCard>
    </div>
  );

  const extrinsicsDetails = activeView ? (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">由 H 和 K 恢复外参</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          已知 K 后，H 的前两列分别与 r1、r2 成正比；第三列与 t 成正比。最后用 SVD 把近似旋转矩阵投影到 SO(3)。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            label="恢复列向量"
            mathML={math('<msub><mi>r</mi><mn>1</mn></msub><mo>=</mo><mi>&lambda;</mi><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>1</mn></msub><mo>,</mo><msub><mi>r</mi><mn>2</mn></msub><mo>=</mo><mi>&lambda;</mi><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>2</mn></msub><mo>,</mo><mi>t</mi><mo>=</mo><mi>&lambda;</mi><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>3</mn></msub>')}
            note="λ 取 1 / ||K^{-1}h1||。"
          />
          <FormulaCard
            label="正交化投影"
            mathML={math('<mi>R</mi><mo>=</mo><mi>U</mi><msup><mi>V</mi><mi>T</mi></msup>')}
            note="对 [r1, r2, r3] 做 SVD 后取 UV^T，并强制 det(R)=+1。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前视图姿态对比</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            <div className="font-semibold">真实姿态</div>
            <div>yaw={DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.yaw.toFixed(2)}°</div>
            <div>pitch={DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.pitch.toFixed(2)}°</div>
            <div>roll={DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.roll.toFixed(2)}°</div>
            <div>t=({DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.tx.toFixed(2)}, {DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.ty.toFixed(2)}, {DEFAULT_CALIBRATION_VIEWS[activeViews.indexOf(activeView)]?.tz.toFixed(2)})</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <div className="font-semibold">估计姿态</div>
            <div>yaw={activeView.extrinsics.yaw.toFixed(2)}°</div>
            <div>pitch={activeView.extrinsics.pitch.toFixed(2)}°</div>
            <div>roll={activeView.extrinsics.roll.toFixed(2)}°</div>
            <div>t=({activeView.extrinsics.tx.toFixed(2)}, {activeView.extrinsics.ty.toFixed(2)}, {activeView.extrinsics.tz.toFixed(2)})</div>
          </div>
        </div>
      </TeachingCard>
    </div>
  ) : null;

  const reprojectionDetails = activeView && selectedImageCorner ? (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">重投影误差：标定结果是否可信</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          求出的参数必须能把棋盘世界点重新投回接近检测角点的位置。
          <TeachingTerm
            term="重投影误差"
            explanation="重投影误差就是检测角点和模型投影点之间的像素距离，越小表示模型越能解释观测数据。"
            className="mx-1"
          />
          越小，说明模型越能解释观测数据。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            label="单点误差"
            mathML={math('<msub><mi>e</mi><mi>i</mi></msub><mo>=</mo><msqrt><msup><mrow><mo>(</mo><msub><mi>u</mi><mi>i</mi></msub><mo>-</mo><msub><mover><mi>u</mi><mo>^</mo></mover><mi>i</mi></msub><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><msub><mi>v</mi><mi>i</mi></msub><mo>-</mo><msub><mover><mi>v</mi><mo>^</mo></mover><mi>i</mi></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt>')}
            note="检测角点与模型投影点之间的距离。"
          />
          <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              检测角点：({formatMatrixValue(selectedImageCorner.subPixel.x, 2)}, {formatMatrixValue(selectedImageCorner.subPixel.y, 2)})
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              模型投影：({formatMatrixValue(selectedImageCorner.projected.x, 2)}, {formatMatrixValue(selectedImageCorner.projected.y, 2)})
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              误差箭头：({residualDx.toFixed(2)}, {residualDy.toFixed(2)}) px
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              当前角点误差：{currentError.toFixed(3)} px
            </div>
          </div>
        </div>
      </TeachingCard>
    </div>
  ) : null;

  const summaryDetails = (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">标定结果汇总</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          线性标定链完成后，所有视图的重投影误差应处于较低水平；内参与真实值的偏差主要来自角点噪声和未做非线性优化。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            <div className="font-semibold">真实内参 K</div>
            <div>α={DEFAULT_CAMERA_INTRINSICS.alpha}, β={DEFAULT_CAMERA_INTRINSICS.beta}</div>
            <div>γ={DEFAULT_CAMERA_INTRINSICS.gamma}, u₀={DEFAULT_CAMERA_INTRINSICS.u0}, v₀={DEFAULT_CAMERA_INTRINSICS.v0}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <div className="font-semibold">估计内参 K</div>
            <div>α={estimatedIntrinsics.alpha.toFixed(2)}, β={estimatedIntrinsics.beta.toFixed(2)}</div>
            <div>γ={estimatedIntrinsics.gamma.toFixed(3)}, u₀={estimatedIntrinsics.u0.toFixed(2)}, v₀={estimatedIntrinsics.v0.toFixed(2)}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {activeViews.map(view => (
            <div key={view.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
              <span>{view.name}</span>
              <span className="font-mono text-emerald-700">{view.meanReprojectionError.toFixed(3)} px</span>
            </div>
          ))}
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">OpenCV 接口对应关系</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <div><code>object_points</code>：每张图的棋盘世界坐标。</div>
            <div><code>image_points</code>：每张图检测到的像素角点。</div>
            <div><code>point_counts</code>：旧版 OpenCV C API 参数；现代 <code>calibrateCamera</code> 直接由 <code>object_points</code> / <code>image_points</code> 的数组长度推断每图有效点数。</div>
            <div><code>image_size</code>：输入图像尺寸。</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <div><code>intrinsic_matrix</code>：输出内参矩阵 K。</div>
            <div><code>distortion_coeffs</code>：输出畸变系数。</div>
            <div><code>rotation_vectors</code>：每张图的旋转向量。</div>
            <div><code>translation_vectors</code>：每张图的平移向量。</div>
          </div>
        </div>
      </TeachingCard>
    </div>
  );

  const stepDetails = (() => {
    switch (stage) {
      case 'correspondences':
        return correspondencesDetails;
      case 'homography':
        return homographyDetails;
      case 'intrinsics':
        return intrinsicsDetails;
      case 'extrinsics':
        return extrinsicsDetails;
      case 'reprojection':
        return reprojectionDetails;
      case 'summary':
        return summaryDetails;
      default:
        return null;
    }
  })();

  const parameters = (
    <div className="space-y-4">
      <StageStepper activeStage={stage} onStageChange={setStage} />

      <div className={`rounded-2xl border px-3 py-3 ${enoughEquations ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
        <div className={`text-xs font-semibold ${enoughEquations ? 'text-emerald-700' : 'text-red-700'}`}>约束数量</div>
        <p className={`mt-2 text-xs leading-5 ${enoughEquations ? 'text-emerald-700' : 'text-red-700'}`}>
          当前 {activeViews.length} 张图像，共 {equationCount} 条约束。
        </p>
      </div>

      <SliderParam label="参与求解图像数" value={viewCount} onChange={setViewCount} min={1} max={allViews.length} step={1} unit=" 张" />
      <SelectParam
        label="当前查看视图"
        value={safeActiveViewId}
        onChange={setActiveViewId}
        options={activeViews.map(view => ({ value: view.id, label: view.name }))}
      />
      <SliderParam label="当前角点编号" value={selectedCornerIndex} onChange={handleCornerChange} min={0} max={Math.max(0, totalCorners - 1)} step={1} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前视图平均重投影误差为 {viewError.toFixed(3)} px。误差用于评价估计参数能否解释检测角点。
      </div>
    </div>
  );

  const mainVisual = activeView && selectedBoardCorner ? (
    <CameraCalibrationScene3D
      extrinsics={activeView.extrinsics}
      intrinsics={DEFAULT_CAMERA_INTRINSICS}
      selectedPoint={selectedBoardCorner}
      mode="parameter-estimation"
      viewPoses={activeViews.map(view => ({ id: view.id, name: view.name, extrinsics: view.extrinsics }))}
      activeViewId={activeView.id}
      equationCount={equationCount}
      enoughEquations={enoughEquations}
      reprojectionError={currentError}
      observedPixel={selectedImageCorner?.subPixel}
      imageSize={{ width: PROJECTION_WIDTH, height: PROJECTION_HEIGHT }}
      title="用于求解的标定姿态"
      subtitle={`${activeView.name} / ${activeViews.length} 张图像 -> ${equationCount} 条约束 / 当前重投影误差 ${currentError.toFixed(3)} px`}
      badges={[
        enoughEquations ? '约束已足够' : '约束不足',
        `H -> B -> K`,
        `R,t from H`,
      ]}
      heightClassName="h-[560px]"
    />
  ) : null;

  return (
    <ConceptLayout
      title="张正友标定与参数求解"
      subtitle="Zhang Calibration & Estimation"
      contentHeader={contentHeader}
      operationLabel="参数求解"
      parameterIntro="按阶段查看张正友标定的完整求解链：角点对应 → H → K → R,t → 误差验证。"
      originalImage={originalImage}
      resultImage={resultImage}
      mainVisual={mainVisual}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: ZHANG_CODE }]} />}
      singlePageScroll
      imageLabels={{ input: '棋盘世界平面', output: '当前视图投影' }}
      imageHints={{
        input: '红点表示当前世界角点',
        output: '绿色标记表示该角点的模型投影位置',
      }}
      originalRegionMarker="dot"
      showOriginalGrid={false}
      currentStep={currentStep}
      currentStepLabel="投影点"
      stepInfo={totalCorners > 0 ? { current: selectedCornerIndex, total: totalCorners } : null}
      navigationHintText="方向键移动角点 / 下拉菜单切换角点"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
    />
  );
}
