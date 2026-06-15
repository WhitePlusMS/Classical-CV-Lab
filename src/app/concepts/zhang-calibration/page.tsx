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
  DEFAULT_CAMERA_INTRINSICS,
  buildCalibrationViewSamples,
  computeBMatrix,
  countCalibrationEquations,
  createBoardCorners,
  createCheckerboardImage,
  createIntrinsicMatrix,
  createProjectedCornerImage,
  formatMatrixValue,
} from '@/lib/algorithms/cameraCalibration';

const CHECKER_CELL_PIXELS = 12;
const PROJECTION_WIDTH = 640;
const PROJECTION_HEIGHT = 480;

const ZHANG_CODE = `// 1. Same chessboard corners in two coordinate systems:
const objectPoints = boardWorldCorners; // world plane points: (X, Y, 0)
const imagePoints = detectedCorners;    // detected image pixels: (u, v)

// 2. Estimate one homography H for each calibration image.
const homographies = views.map(view => estimateHomography(objectPoints, view.imagePoints));

// 3. Use rotation constraints to solve B = K^{-T} K^{-1}.
const equations = homographies.flatMap(H => [v12(H), v11(H) - v22(H)]);
const b = solveLinearSystem(equations);
const K = recoverIntrinsicMatrix(b);

// 4. Recover extrinsics and evaluate reprojection error.
const extrinsics = homographies.map(H => recoverExtrinsics(K, H));
const error = computeReprojectionError(K, extrinsics, objectPoints, imagePoints);`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function math(body: string): string {
  return buildInlineMathML(`<mrow>${body}</mrow>`);
}

function matrix(rows: string[][]): string {
  return buildInlineMathML(
    `<mfenced open="[" close="]"><mtable>${rows
      .map(row => `<mtr>${row.map(cell => `<mtd>${cell}</mtd>`).join('')}</mtr>`)
      .join('')}</mtable></mfenced>`
  );
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
  const bMatrix = useMemo(() => computeBMatrix(DEFAULT_CAMERA_INTRINSICS), []);

  const [viewCount, setViewCount] = useState(3);
  const [activeViewId, setActiveViewId] = useState(allViews[0]?.id ?? 'view-1');
  const [selectedCornerIndex, setSelectedCornerIndex] = useState(0);

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
      const col = clamp(Math.round(x / CHECKER_CELL_PIXELS), 0, DEFAULT_BOARD_SPEC.cols - 1);
      const row = clamp(Math.round(y / CHECKER_CELL_PIXELS), 0, DEFAULT_BOARD_SPEC.rows - 1);
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
        regionX: selectedBoardCorner.col * CHECKER_CELL_PIXELS,
        regionY: selectedBoardCorner.row * CHECKER_CELL_PIXELS,
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
          <MathText className="mx-1" mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><mi>R</mi><mo>,</mo><mi>t</mi><mo>]</mo><msub><mover><mi>X</mi><mo>~</mo></mover><mi>w</mi></msub>')} />
          ，标定板提供同一批角点的世界坐标和像素坐标。张正友法把这些点对转化为
          <TeachingTerm term="单应矩阵 H" explanation="单应矩阵 H 是同一张平面标定板从世界平面到图像平面的 3×3 投影映射。" className="mx-1" />
          ，再求 K 和每张图的
          <TeachingTerm term="R/t" explanation="R 和 t 是这张图独有的外参，表示标定板相对相机的姿态和位置。" className="mx-1" />
          。
        </p>
      </div>
      <div className={`rounded-2xl border px-4 py-3 text-sm ${enoughEquations ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
        {activeViews.length} 张图 / {equationCount} 条约束
      </div>
    </div>
  );

  const analysisPreview = activeView && selectedBoardCorner && selectedImageCorner ? (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. 同一角点的两种坐标</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              `objectPoints` 不是任意数组，它是棋盘平面上的
              <MathText className="mx-1" mathML={math('<msub><mi>X</mi><mi>w</mi></msub><mo>=</mo><mo>(</mo><mi>X</mi><mo>,</mo><mi>Y</mi><mo>,</mo><mn>0</mn><mo>)</mo>')} />
              ；`imagePoints` 是同一角点在照片中的
              <MathText className="mx-1" mathML={math('<msub><mi>M</mi><mi>i</mi></msub><mo>&#8596;</mo><msub><mi>m</mi><mi>i</mi></msub>')} />
              。这一页默认锁定一组当前角点对，不再同时平铺整批角点。
            </p>
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              M=({selectedBoardCorner.world.x.toFixed(1)}, {selectedBoardCorner.world.y.toFixed(1)}, 0)
              ，m=({selectedImageCorner.subPixel.x.toFixed(2)}, {selectedImageCorner.subPixel.y.toFixed(2)})
            </div>
          </FlowNode>

          <FlowNode tone="slate">
            <div className="text-[11px] font-semibold uppercase text-slate-600">先经过该照片的相机坐标系</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              对每一张照片，都先有刚体变换
              <MathText className="mx-1" mathML={math('<msub><mi>X</mi><mi>c</mi></msub><mo>=</mo><mi>R</mi><msub><mi>X</mi><mi>w</mi></msub><mo>+</mo><mi>t</mi>')} />
              ，再由 K 投到像素平面。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. 平面棋盘把投影压缩为 H</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              棋盘点都在
              <MathText className="mx-1" mathML={math('<mi>Z</mi><mo>=</mo><mn>0</mn>')} />
              平面上，因此一张标定图可先估计一个
              <TeachingTerm term="单应矩阵 H" explanation="H 把平面点直接映射到图像点，所以先不必一上来就展开完整三维投影链。" className="mx-1" />
              。
            </p>
            <FormulaCard
              className="mt-3"
              mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><msub><mi>r</mi><mn>1</mn></msub><msub><mi>r</mi><mn>2</mn></msub><mi>t</mi><mo>]</mo><mover><mi>M</mi><mo>~</mo></mover><mo>=</mo><mi>H</mi><mover><mi>M</mi><mo>~</mo></mover>')}
              formulaClassName="rounded-xl px-3 py-3 shadow-none"
              note="H 表示棋盘平面到图像平面的投影映射。"
            />
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. 求 K、求 R,t、查误差</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              解出 K 后，每张图都能从自己的 H 反求外参。最后把棋盘点投影回图像，用重投影误差检查结果。
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                当前视图平均误差：{viewError.toFixed(3)} px
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                当前角点误差：{currentError.toFixed(3)} px
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                Δu={residualDx.toFixed(2)}，Δv={residualDy.toFixed(2)}
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  ) : null;

  const stepDetails = activeView && selectedBoardCorner && selectedImageCorner ? (
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
            note="由角点检测和亚像素细化得到。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前角点对的三类点</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          当前角点会同时看到世界平面角点、检测到的图像角点、模型重投影点。真正需要盯住的是“检测点到重投影点”的偏差方向和长度。
        </p>
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

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">张正友法的推导链路</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          先保留世界坐标到相机坐标的刚体变换，再利用棋盘平面 Z=0 把投影写成单应性。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            label="从针孔模型出发"
            mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><mi>R</mi><mo>,</mo><mi>t</mi><mo>]</mo><msub><mover><mi>X</mi><mo>~</mo></mover><mi>w</mi></msub>')}
            note="这与针孔成像的总公式一致。"
          />
          <FormulaCard
            label="先进入相机坐标系"
            mathML={math('<msub><mi>X</mi><mi>c</mi></msub><mo>=</mo><mi>R</mi><msub><mi>X</mi><mi>w</mi></msub><mo>+</mo><mi>t</mi>')}
            note="每张标定图都有自己的 R 和 t。"
          />
          <FormulaCard
            label="标定板平面 Z=0"
            mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><msub><mi>r</mi><mn>1</mn></msub><msub><mi>r</mi><mn>2</mn></msub><mi>t</mi><mo>]</mo><mover><mi>M</mi><mo>~</mo></mover><mo>=</mo><mi>H</mi><mover><mi>M</mi><mo>~</mo></mover>')}
            note="平面标定板让三维投影先转化为二维平面单应性。"
          />
          <FormulaCard
            label="H 与 K、R、t 的关系"
            mathML={math('<mi>H</mi><mo>=</mo><mo>[</mo><msub><mi>h</mi><mn>1</mn></msub><msub><mi>h</mi><mn>2</mn></msub><msub><mi>h</mi><mn>3</mn></msub><mo>]</mo><mo>=</mo><mi>&lambda;</mi><mi>K</mi><mo>[</mo><msub><mi>r</mi><mn>1</mn></msub><msub><mi>r</mi><mn>2</mn></msub><mi>t</mi><mo>]</mo>')}
            note="每张标定图有一个自己的 H。"
          />
          <FormulaCard
            label="由 H 反求外参"
            mathML={math('<msub><mi>r</mi><mn>1</mn></msub><mo>=</mo><mi>&lambda;</mi><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>1</mn></msub><mo>,</mo><msub><mi>r</mi><mn>2</mn></msub><mo>=</mo><mi>&lambda;</mi><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>2</mn></msub><mo>,</mo><mi>t</mi><mo>=</mo><mi>&lambda;</mi><msup><mi>K</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><msub><mi>h</mi><mn>3</mn></msub>')}
            note="K 已知后，每一张图的姿态可以单独恢复。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">为什么至少需要三张有效图像</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              K 有 5 个自由参数，每张图的 H 提供 2 条线性约束。
            </p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs font-medium ${enoughEquations ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {enoughEquations ? '约束已足够' : '约束不足'}
          </div>
        </div>
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

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前视图中的矩阵关系</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          这些数值来自同一组示例参数，作用是把 H、B、K 的关系落到具体矩阵上。手算时通常不必展开完整矩阵。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <MatrixPreview title="当前视图 H" tone="amber" rows={activeView.homography.map(row => row.map(value => formatMatrixValue(value, 2)))} />
          <MatrixPreview title="示例内参 K" tone="blue" rows={intrinsicMatrix.map(row => row.map(value => formatMatrixValue(value, 2)))} />
          <MatrixPreview title="B=K^{-T}K^{-1}" tone="emerald" rows={bMatrix.map(row => row.map(value => formatMatrixValue(value, 6)))} />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">重投影误差：标定结果是否可信</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          求出的参数必须能把棋盘世界点重新投回接近检测角点的位置。这里的
          <TeachingTerm term="重投影误差" explanation="重投影误差就是检测角点和模型投影点之间的像素距离，越小表示模型越能解释观测数据。" className="mx-1" />
          越小，说明模型越能解释观测数据。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <FormulaCard
            mathML={math('<msub><mi>e</mi><mi>i</mi></msub><mo>=</mo><msqrt><msup><mrow><mo>(</mo><msub><mi>u</mi><mi>i</mi></msub><mo>-</mo><msub><mover><mi>u</mi><mo>^</mo></mover><mi>i</mi></msub><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><msub><mi>v</mi><mi>i</mi></msub><mo>-</mo><msub><mover><mi>v</mi><mo>^</mo></mover><mi>i</mi></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt>')}
            note="检测角点与模型投影点之间的距离就是单点重投影误差。"
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

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">OpenCV 接口对应关系</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <div><code>object_points</code>：每张图的棋盘世界坐标。</div>
            <div><code>image_points</code>：每张图检测到的像素角点。</div>
            <div><code>point_counts</code>：每张图有效点数。</div>
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
  ) : (
    <div className="py-8 text-center text-slate-400">暂无有效标定视图</div>
  );

  const parameters = (
    <div className="space-y-4">
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
      parameterIntro="切换参与求解的图像数量和当前视图，观察 H、K、R,t 与重投影误差之间的关系。"
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
      navigationHintText="方向键移动角点 / 点击左图或右图切换角点"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
    />
  );
}
