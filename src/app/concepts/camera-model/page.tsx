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
  createBoardCorners,
  createBoardProjectionImage,
  createCheckerboardImage,
  formatMatrixValue,
  projectWorldPoint,
  type CalibrationExtrinsics,
  type CalibrationIntrinsics,
  type CalibrationPoint3D,
} from '@/lib/algorithms/cameraCalibration';

const IMAGE_WIDTH = 96;
const IMAGE_HEIGHT = 72;
const BOARD_CELL_PIXELS = 8;

const DEFAULT_INTRINSICS: CalibrationIntrinsics = {
  alpha: 52,
  beta: 48,
  gamma: 0,
  u0: 48,
  v0: 36,
};

const DEFAULT_EXTRINSICS: CalibrationExtrinsics = {
  yaw: -8,
  pitch: 10,
  roll: -4,
  tx: -1.6,
  ty: -1.1,
  tz: 12,
};

const CAMERA_MODEL_CODE = `const Xc = R * Xw + T;
const x = Xc.x / Xc.z;
const y = Xc.y / Xc.z;

const u = alpha * x + gamma * y + u0;
const v = beta * y + v0;

// Compact form:
// s * m = K [R, T] Xw`;

const CORNER_OPTIONS = [
  { value: '0', label: '左上角点' },
  { value: '7', label: '右上角点' },
  { value: '20', label: '中部角点' },
  { value: '40', label: '左下区域角点' },
  { value: '47', label: '右下角点' },
];

type CameraParameterKey =
  | 'pointHeight'
  | 'alpha'
  | 'beta'
  | 'gamma'
  | 'u0'
  | 'v0'
  | 'yaw'
  | 'pitch'
  | 'roll'
  | 'tx'
  | 'ty'
  | 'tz';

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

function pointVector(point: CalibrationPoint3D): string {
  return matrix([
    [formatMatrixValue(point.x, 2)],
    [formatMatrixValue(point.y, 2)],
    [formatMatrixValue(point.z, 2)],
  ]);
}

function buildIntrinsicMatrixMath(intrinsics: CalibrationIntrinsics): string {
  return matrix([
    [formatMatrixValue(intrinsics.alpha, 1), formatMatrixValue(intrinsics.gamma, 1), formatMatrixValue(intrinsics.u0, 1)],
    ['0', formatMatrixValue(intrinsics.beta, 1), formatMatrixValue(intrinsics.v0, 1)],
    ['0', '0', '1'],
  ]);
}

function parameterImpact(key: CameraParameterKey): {
  focusMode: 'intrinsics' | 'extrinsics' | 'depth';
  title: string;
  summary: string;
  formulaLabel: string;
  formulaMath: string;
} {
  switch (key) {
    case 'yaw':
    case 'pitch':
    case 'roll':
      return {
        focusMode: 'extrinsics',
        title: '当前参数正在改变摄像机姿态',
        summary: 'yaw / pitch / roll 改的是旋转矩阵 R；本页按 roll→pitch→yaw 顺序合成，即 R=Rz·Ry·Rx，采用右手坐标系约定。',
        formulaLabel: '当前观察链路',
        formulaMath: math('<msub><mi>X</mi><mi>c</mi></msub><mo>=</mo><mi>R</mi><msub><mi>X</mi><mi>w</mi></msub><mo>+</mo><mi>t</mi>'),
      };
    case 'tx':
    case 'ty':
    case 'tz':
      return {
        focusMode: key === 'tz' ? 'depth' : 'extrinsics',
        title: '当前参数正在改变摄像机平移',
        summary: 'tx / ty / tz 改的是平移向量 T。tz 还会直接改变深度 Zc，所以投影缩放最明显。',
        formulaLabel: '当前观察链路',
        formulaMath: math('<msub><mi>X</mi><mi>c</mi></msub><mo>=</mo><mi>R</mi><msub><mi>X</mi><mi>w</mi></msub><mo>+</mo><mi>t</mi>'),
      };
    case 'alpha':
    case 'beta':
    case 'gamma':
      return {
        focusMode: 'intrinsics',
        title: '当前参数正在改变内参矩阵 K',
        summary: 'alpha / beta 是 u、v 方向的像素焦距，即 α=f/dx、β=f/dy（f 为焦距，dx/dy 为像素物理尺寸），gamma 是 skew，会让 x 坐标额外受到 y 坐标影响。',
        formulaLabel: '当前观察链路',
        formulaMath: math('<mi>u</mi><mo>=</mo><mi>&alpha;</mi><mi>x</mi><mo>+</mo><mi>&gamma;</mi><mi>y</mi><mo>+</mo><msub><mi>u</mi><mn>0</mn></msub><mo>,</mo><mi>v</mi><mo>=</mo><mi>&beta;</mi><mi>y</mi><mo>+</mo><msub><mi>v</mi><mn>0</mn></msub>'),
      };
    case 'u0':
    case 'v0':
      return {
        focusMode: 'intrinsics',
        title: '当前参数正在改变主点位置',
        summary: 'u0 / v0 决定主点，也就是光轴落到像素平面上的位置，会整体平移投影结果。',
        formulaLabel: '当前观察链路',
        formulaMath: math('<mi>u</mi><mo>=</mo><mi>&alpha;</mi><mi>x</mi><mo>+</mo><mi>&gamma;</mi><mi>y</mi><mo>+</mo><msub><mi>u</mi><mn>0</mn></msub><mo>,</mo><mi>v</mi><mo>=</mo><mi>&beta;</mi><mi>y</mi><mo>+</mo><msub><mi>v</mi><mn>0</mn></msub>'),
      };
    case 'pointHeight':
    default:
      return {
        focusMode: 'depth',
        title: '当前参数正在改变归一化平面上的位置',
        summary: '世界点高度 Zw 会先经旋转矩阵 R 同时影响 Xc、Yc、Zc 三个分量，再经平移 t 得到最终摄像机坐标，最后通过透视除法改变归一化平面坐标。',
        formulaLabel: '当前观察链路',
        formulaMath: math('<mi>x</mi><mo>=</mo><msub><mi>X</mi><mi>c</mi></msub><mo>/</mo><msub><mi>Z</mi><mi>c</mi></msub><mo>,</mo><mi>y</mi><mo>=</mo><msub><mi>Y</mi><mi>c</mi></msub><mo>/</mo><msub><mi>Z</mi><mi>c</mi></msub>'),
      };
  }
}

export default function CameraModelPage() {
  const [selectedCornerIndex, setSelectedCornerIndex] = useState(20);
  const [pointHeight, setPointHeight] = useState(0);
  const [intrinsics, setIntrinsics] = useState<CalibrationIntrinsics>(DEFAULT_INTRINSICS);
  const [extrinsics, setExtrinsics] = useState<CalibrationExtrinsics>(DEFAULT_EXTRINSICS);
  const [activeParameterKey, setActiveParameterKey] = useState<CameraParameterKey>('pointHeight');

  const boardSpec = DEFAULT_BOARD_SPEC;
  const boardCorners = useMemo(() => createBoardCorners(boardSpec), [boardSpec]);
  const selectedCorner = boardCorners[selectedCornerIndex] ?? boardCorners[0];

  const worldPoint = useMemo<CalibrationPoint3D>(
    () => ({
      x: selectedCorner.world.x,
      y: selectedCorner.world.y,
      z: pointHeight,
    }),
    [pointHeight, selectedCorner.world.x, selectedCorner.world.y]
  );

  const projection = useMemo(
    () => projectWorldPoint(worldPoint, intrinsics, extrinsics),
    [extrinsics, intrinsics, worldPoint]
  );

  const originalImage = useMemo(
    () =>
      createCheckerboardImage(
        boardSpec.rows,
        boardSpec.cols,
        { row: selectedCorner.row, col: selectedCorner.col },
        BOARD_CELL_PIXELS
      ),
    [boardSpec.cols, boardSpec.rows, selectedCorner.col, selectedCorner.row]
  );

  const resultImage = useMemo(
    () => createBoardProjectionImage(boardSpec, intrinsics, extrinsics, selectedCornerIndex, IMAGE_WIDTH, IMAGE_HEIGHT),
    [boardSpec, extrinsics, intrinsics, selectedCornerIndex]
  );

  const projectedPoints = useMemo(
    () =>
      boardCorners.map(corner => ({
        index: corner.index,
        pixel: projectWorldPoint(corner.world, intrinsics, extrinsics).pixel,
      })),
    [boardCorners, extrinsics, intrinsics]
  );

  const currentStep = useMemo(
    () => ({
      x: clamp(Math.round(projection.pixel.x), 0, IMAGE_WIDTH - 1),
      y: clamp(Math.round(projection.pixel.y), 0, IMAGE_HEIGHT - 1),
      kernelSize: 1,
      regionX: selectedCorner.col * BOARD_CELL_PIXELS,
      regionY: selectedCorner.row * BOARD_CELL_PIXELS,
      regionWidth: 1,
      regionHeight: 1,
    }),
    [projection.pixel.x, projection.pixel.y, selectedCorner.col, selectedCorner.row]
  );

  const handleDirectionMove = useGridNavigation({
    current: { x: selectedCorner.col, y: selectedCorner.row },
    bounds: { width: boardSpec.cols, height: boardSpec.rows },
    onMove: point => setSelectedCornerIndex(point.y * boardSpec.cols + point.x),
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
      let nearestIndex = selectedCornerIndex;
      let nearestDistance = Number.POSITIVE_INFINITY;

      projectedPoints.forEach(point => {
        const distance = Math.hypot(point.pixel.x - x, point.pixel.y - y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = point.index;
        }
      });

      setSelectedCornerIndex(nearestIndex);
    },
    [projectedPoints, selectedCornerIndex]
  );

  const updateIntrinsics = useCallback(
    <K extends keyof CalibrationIntrinsics>(key: K, value: CalibrationIntrinsics[K]) => {
      setActiveParameterKey(key);
      setIntrinsics(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateExtrinsics = useCallback(
    <K extends keyof CalibrationExtrinsics>(key: K, value: CalibrationExtrinsics[K]) => {
      setActiveParameterKey(key);
      setExtrinsics(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const activeImpact = useMemo(() => parameterImpact(activeParameterKey), [activeParameterKey]);

  const nearDepth = Math.max(1, projection.depth - 2.5);
  const farDepth = projection.depth + 2.5;
  const nearX = projection.camera.x / nearDepth;
  const farX = projection.camera.x / farDepth;

  const contentHeader = (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-800">先明确：摄像机标定到底要解什么</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          单目摄像机模型包含正向投影和反向标定两个视角。正向看，已知内参 K 和外参 [R,t]，可以把世界点投影到像素点
          （教学简化：把图像坐标 (x,y) 到像素坐标 (u,v) 的中间步骤合并进 K 矩阵）；
          反向看，摄像机标定就是用许多已知点对反求 K，以及每张照片对应的 [R,t]。
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <MathText
          mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><mi>R</mi><mo>,</mo><mi>t</mi><mo>]</mo><msub><mover><mi>X</mi><mo>~</mo></mover><mi>w</mi></msub>')}
        />
      </div>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. 外参：回答摄像机与世界的相对姿态</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              第一步是刚体变换：
              <MathText className="mx-1" mathML={math('<msub><mi>X</mi><mi>c</mi></msub><mo>=</mo><mi>R</mi><msub><mi>X</mi><mi>w</mi></msub><mo>+</mo><mi>t</mi>')} />
              。它说明当前世界点在这台摄像机坐标系下的位置，这一段就是
              <TeachingTerm term="外参" explanation="外参描述这张照片里摄像机相对世界的姿态和位置，每换一个拍摄姿态就会变。" className="mx-1" />
              的作用范围。
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                世界点：第 {selectedCorner.row + 1} 行、第 {selectedCorner.col + 1} 列角点
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 font-mono text-slate-700">
                Xc=({formatMatrixValue(projection.camera.x, 2)}, {formatMatrixValue(projection.camera.y, 2)}, {formatMatrixValue(projection.camera.z, 2)})
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. 透视投影：除以深度</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              针孔模型的关键动作是
              <MathText className="mx-1" mathML={math('<mi>x</mi><mo>=</mo><msub><mi>X</mi><mi>c</mi></msub><mo>/</mo><msub><mi>Z</mi><mi>c</mi></msub><mo>,</mo><mi>y</mi><mo>=</mo><msub><mi>Y</mi><mi>c</mi></msub><mo>/</mo><msub><mi>Z</mi><mi>c</mi></msub>')} />
              。这一步把点落到
              <TeachingTerm term="归一化平面" explanation="归一化平面就是先把摄像机坐标除以深度 Zc 后得到的无单位平面坐标，还没变成像素。" className="mx-1" />
              上，也解释了“远处物体成像更小”。
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                当前深度 Zc={formatMatrixValue(projection.depth, 2)}
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 font-mono text-slate-700">
                (x,y)=({formatMatrixValue(projection.normalized.x, 3)}, {formatMatrixValue(projection.normalized.y, 3)})
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. 内参：回答落在图像数组哪个像素</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              <TeachingTerm term="内参" explanation="内参描述同一台摄像机自身的成像尺度、倾斜和主点位置，通常不随拍摄姿态变化。" className="mr-1" />
              矩阵把归一化坐标变成图像数组中的
              <MathText className="mx-1" mathML={math('<mi>u</mi><mo>,</mo><mi>v</mi>')} />
              。其中
              <TeachingTerm term="主点" explanation="主点是光轴落到像素平面上的位置，u0 和 v0 控制它在图像中的坐标。" className="mx-1" />
              由 u0、v0 表示。
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                u={formatMatrixValue(projection.pixel.x, 2)}, v={formatMatrixValue(projection.pixel.y, 2)}
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-slate-700">
                K 的 5 个自由参数：α、β、γ、u0、v0
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const stepDetails = (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">正向模型与反向标定</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          先按成像顺序理解正向模型，再用棋盘角点的世界坐标和图像坐标反求公式中的 K 与每张图的 [R,t]。
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <FormulaCard
            label="正向成像"
            mathML={math('<mi>s</mi><mover><mi>m</mi><mo>~</mo></mover><mo>=</mo><mi>K</mi><mo>[</mo><mi>R</mi><mo>,</mo><mi>t</mi><mo>]</mo><msub><mover><mi>X</mi><mo>~</mo></mover><mi>w</mi></msub>')}
            tone="embedded"
            note="已知参数时，世界点可以投影到像素点。"
          />
          <FormulaCard
            label="刚体变换"
            mathML={math('<msub><mi>X</mi><mi>c</mi></msub><mo>=</mo><mi>R</mi><msub><mi>X</mi><mi>w</mi></msub><mo>+</mo><mi>t</mi>')}
            tone="embedded"
            note="[R,t] 是每张照片对应的外参。"
          />
          <FormulaCard
            label="内参矩阵 K"
            mathML={buildIntrinsicMatrixMath(intrinsics)}
            tone="embedded"
            note="K 是同一台摄像机通常保持不变的内部参数。"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前点如何代入公式</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <FormulaCard
            label="外参变换后"
            mathML={pointVector(projection.camera)}
            tone="embedded"
            note="该结果是以摄像机光心为原点的三维坐标。"
          />
          <FormulaCard
            label="透视除法"
            mathML={math(`<mi>x</mi><mo>=</mo><mfrac><mn>${formatMatrixValue(projection.camera.x, 2)}</mn><mn>${formatMatrixValue(projection.camera.z, 2)}</mn></mfrac><mo>=</mo><mn>${formatMatrixValue(projection.normalized.x, 3)}</mn><mo>,</mo><mi>y</mi><mo>=</mo><mfrac><mn>${formatMatrixValue(projection.camera.y, 2)}</mn><mn>${formatMatrixValue(projection.camera.z, 2)}</mn></mfrac><mo>=</mo><mn>${formatMatrixValue(projection.normalized.y, 3)}</mn>`)}
            tone="embedded"
            note="归一化坐标尚未转换为像素单位。"
          />
          <FormulaCard
            label="内参映射"
            mathML={math(`<mi>u</mi><mo>=</mo><mi>&alpha;</mi><mi>x</mi><mo>+</mo><mi>&gamma;</mi><mi>y</mi><mo>+</mo><msub><mi>u</mi><mn>0</mn></msub><mo>=</mo><mn>${formatMatrixValue(projection.pixel.x, 2)}</mn><mo>,</mo><mi>v</mi><mo>=</mo><mi>&beta;</mi><mi>y</mi><mo>+</mo><msub><mi>v</mi><mn>0</mn></msub><mo>=</mo><mn>${formatMatrixValue(projection.pixel.y, 2)}</mn>`)}
            tone="embedded"
            note="这一步得到图像数组中的像素坐标。"
          />
        </div>
      </TeachingCard>

      <TeachingCard tone="amber">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-amber-900">{activeImpact.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{activeImpact.summary}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3">
            <FormulaCard
              label={activeImpact.formulaLabel}
              mathML={activeImpact.formulaMath}
              tone="embedded"
              formulaClassName="rounded-lg px-3 py-3"
              note={`最近调整参数：${activeParameterKey}`}
            />
          </div>
        </div>
      </TeachingCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">内参与外参的边界</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4">
              <div className="text-sm font-semibold text-emerald-800">内参 K</div>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                α、β、γ、u0、v0 描述摄像机成像几何和像素坐标系。K 把图像坐标 (x,y) 映射到像素坐标 (u,v)，
                其中 α=f/dx、β=f/dy 同时体现了焦距与像素物理尺寸。换一个拍摄角度，它们通常不变。
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-4">
              <div className="text-sm font-semibold text-blue-800">外参 [R,t]</div>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                R、t 描述当前这一张照片中，摄像机和世界坐标系之间的相对姿态。换一张标定图，它们会变。
              </p>
            </div>
          </div>
        </TeachingCard>

        <TeachingCard tone="amber">
          <div className="text-sm font-semibold text-amber-900">深度为什么影响成像大小</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            保持 Xc 不变时，Zc 越大，
            <MathText className="mx-1" mathML={math('<mi>x</mi><mo>=</mo><msub><mi>X</mi><mi>c</mi></msub><mo>/</mo><msub><mi>Z</mi><mi>c</mi></msub>')} />
            越接近 0，投影点越靠近主点。
          </p>
          <FormulaCard
            className="mt-4"
            mathML={math(`<mfrac><mn>${formatMatrixValue(projection.camera.x, 2)}</mn><mn>${formatMatrixValue(nearDepth, 2)}</mn></mfrac><mo>=</mo><mn>${formatMatrixValue(nearX, 3)}</mn><mo>,</mo><mfrac><mn>${formatMatrixValue(projection.camera.x, 2)}</mn><mn>${formatMatrixValue(farDepth, 2)}</mn></mfrac><mo>=</mo><mn>${formatMatrixValue(farX, 3)}</mn>`)}
            tone="embedded"
            note="这也是透视投影和正交投影最直观的差别。"
          />
        </TeachingCard>
      </div>

      <TeachingCard>
        <div className="text-sm font-semibold text-emerald-900">为什么需要标定板</div>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          投影方程中的未知量需要由观测数据来约束：必须获得许多组已知的
          <MathText className="mx-1" mathML={math('<msub><mi>X</mi><mi>w</mi></msub>')} />
          和检测到的
          <MathText className="mx-1" mathML={math('<mi>m</mi>')} />
          ，才能反求 K 和每张图的 [R,t]。
        </p>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">典型标定结果数值示例</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          以下为一组常见量级的内参与某张标定图的外参，仅用于建立数值直觉。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormulaCard
            label="内参 K（像素单位）"
            mathML={matrix([
              ['860', '0', '320'],
              ['0', '840', '240'],
              ['0', '0', '1'],
            ])}
            tone="embedded"
            note="α=f/dx、β=f/dy；u0、v0 为主点；γ 在理想相机中常为 0。"
          />
          <FormulaCard
            label="外参 [R,t]（某张标定图）"
            mathML={matrix([
              ['0.99', '0.05', '-0.12', '-1.5'],
              ['-0.04', '0.99', '0.10', '-0.8'],
              ['0.13', '-0.09', '0.99', '12.0'],
            ])}
            tone="embedded"
            note="R 为世界坐标系到摄像机坐标系的旋转；t 为平移。"
          />
        </div>
      </TeachingCard>
    </div>
  );

  const parameters = (
    <div className="space-y-4">
      <SliderParam
        label="点高度 Zw"
        value={pointHeight}
        onChange={value => {
          setActiveParameterKey('pointHeight');
          setPointHeight(value);
        }}
        min={0}
        max={6}
        step={0.5}
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前点先按外参进入摄像机坐标系，再除以深度，最后由 K 映射到像素坐标。
      </div>

      <SelectParam
        label="世界点"
        value={String(selectedCornerIndex)}
        onChange={value => setSelectedCornerIndex(Number(value))}
        options={CORNER_OPTIONS}
      />

      <details className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-emerald-800 marker:content-none">内参 K</summary>
        <div className="space-y-4 border-t border-emerald-200 px-3 py-3">
          <SliderParam label="α" value={intrinsics.alpha} onChange={value => updateIntrinsics('alpha', value)} min={28} max={82} step={1} />
          <SliderParam label="β" value={intrinsics.beta} onChange={value => updateIntrinsics('beta', value)} min={28} max={82} step={1} />
          <SliderParam label="γ" value={intrinsics.gamma} onChange={value => updateIntrinsics('gamma', value)} min={-18} max={18} step={1} />
          <SliderParam label="u0" value={intrinsics.u0} onChange={value => updateIntrinsics('u0', value)} min={18} max={78} step={1} />
          <SliderParam label="v0" value={intrinsics.v0} onChange={value => updateIntrinsics('v0', value)} min={12} max={60} step={1} />
        </div>
      </details>

      <details className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/70">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-blue-800 marker:content-none">外参 [R,t]</summary>
        <div className="space-y-4 border-t border-blue-200 px-3 py-3">
          <SliderParam label="yaw" value={extrinsics.yaw} onChange={value => updateExtrinsics('yaw', value)} min={-30} max={30} step={1} unit="°" />
          <SliderParam label="pitch" value={extrinsics.pitch} onChange={value => updateExtrinsics('pitch', value)} min={-25} max={25} step={1} unit="°" />
          <SliderParam label="roll" value={extrinsics.roll} onChange={value => updateExtrinsics('roll', value)} min={-25} max={25} step={1} unit="°" />
          <SliderParam label="tx" value={extrinsics.tx} onChange={value => updateExtrinsics('tx', value)} min={-4} max={4} step={0.2} />
          <SliderParam label="ty" value={extrinsics.ty} onChange={value => updateExtrinsics('ty', value)} min={-4} max={4} step={0.2} />
          <SliderParam label="tz" value={extrinsics.tz} onChange={value => updateExtrinsics('tz', value)} min={6} max={18} step={0.2} />
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs leading-5 text-slate-600">
            旋转顺序约定：roll（绕 X 轴）→ pitch（绕 Y 轴）→ yaw（绕 Z 轴），合成矩阵
            <MathText className="mx-1" mathML={math('<mi>R</mi><mo>=</mo><msub><mi>R</mi><mi>z</mi></msub><mo>·</mo><msub><mi>R</mi><mi>y</mi></msub><mo>·</mo><msub><mi>R</mi><mi>x</mi></msub>')} />
            ，采用右手坐标系。
          </div>
        </div>
      </details>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
        当前像素约为 ({formatMatrixValue(projection.pixel.x, 2)}, {formatMatrixValue(projection.pixel.y, 2)})，
        深度 Zc={formatMatrixValue(projection.depth, 2)}。最近调整参数：{activeParameterKey}，主视觉会自动强调它影响的链路段。
      </div>
    </div>
  );

  const mainVisual = (
    <CameraCalibrationScene3D
      extrinsics={extrinsics}
      intrinsics={intrinsics}
      mode="camera-model"
      focusMode={activeImpact.focusMode}
      imageSize={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}
      selectedPoint={{ ...selectedCorner, world: worldPoint }}
      title="成像模型的三维关系"
      subtitle={`当前世界点 ${selectedCorner.index + 1} / 深度 Zc=${formatMatrixValue(projection.depth, 2)} / 投影像素 (${formatMatrixValue(projection.pixel.x, 2)}, ${formatMatrixValue(projection.pixel.y, 2)})`}
      badges={[
        `α ${formatMatrixValue(intrinsics.alpha, 0)}`,
        `β ${formatMatrixValue(intrinsics.beta, 0)}`,
        `γ ${formatMatrixValue(intrinsics.gamma, 0)}`,
      ]}
      heightClassName="h-[560px]"
    />
  );

  return (
    <ConceptLayout
      title="成像模型与内外参数"
      subtitle="Camera Model & Parameters"
      contentHeader={contentHeader}
      operationLabel="透视投影"
      parameterIntro="先选世界点，再分别展开内参 K 和外参 [R,t] 调整。主视觉会自动强调最近参数影响的成像环节。"
      originalImage={originalImage}
      resultImage={resultImage}
      mainVisual={mainVisual}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: CAMERA_MODEL_CODE }]} />}
      singlePageScroll
      imageLabels={{ input: '世界坐标棋盘', output: '像素坐标平面' }}
      imageHints={{
        input: '红点表示当前世界点',
        output: '绿色标记表示当前点的投影像素',
      }}
      currentStep={currentStep}
      currentStepLabel="投影像素"
      stepInfo={{ current: selectedCornerIndex, total: boardCorners.length }}
      navigationHintText="方向键移动角点 / 下拉菜单切换观察点"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handleInputRegionSelect}
      onOutputPixelSelect={handleOutputPixelSelect}
      originalRegionMarker="dot"
    />
  );
}
