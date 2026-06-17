'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  clampPerspectivePoint,
  computePerspectiveCorrection,
  createPerspectiveTeachingScene,
  formatTransformNumber,
  isValidPerspectiveQuad,
  type PerspectivePoint,
} from '@/lib/algorithms/perspectiveTransform';
import { imageRgbToCanvas } from '@/lib/utils/imageProcessing';

const HANDLE_OPTIONS = [
  { value: '0', label: 'A 左上角' },
  { value: '1', label: 'B 右上角' },
  { value: '2', label: 'C 左下角' },
  { value: '3', label: 'D 右下角' },
] as const;

const HANDLE_LABELS = ['A', 'B', 'C', 'D'] as const;
const HANDLE_DESCRIPTIONS = ['左上角', '右上角', '左下角', '右下角'] as const;
const HANDLE_COLORS = ['#dc2626', '#2563eb', '#059669', '#ea580c'] as const;
const SOURCE_VIEW_MAX_SIZE = 300;
const OUTPUT_VIEW_MAX_SIZE = 188;
const DRAG_PADDING = 10;

const PERSPECTIVE_CODE = `const dstQuad = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1],
];

const H = solvePerspectiveTransform(srcQuad, dstQuad);
const perspective = warpWithMatrix(srcImage, H, { width, height });

const A = solveAffineTransform(srcQuad.slice(0, 3), dstQuad.slice(0, 3));
const affine = warpWithMatrix(srcImage, A, { width, height });

// OpenCV 对应关系：
// getPerspectiveTransform(srcQuad, dstQuad)
// warpPerspective(src, dst, H, size)
// getAffineTransform(srcTri, dstTri)
// warpAffine(src, dst, A, size)`;

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

function unwrapMath(mathML: string): string {
  return mathML
    .replace('<math xmlns="http://www.w3.org/1998/Math/MathML">', '')
    .replace('</math>', '');
}

function pointVectorStatement(pointLabel: string, point: PerspectivePoint, prime: boolean = false): string {
  const vector = unwrapMath(matrix([
    [formatTransformNumber(point.x, 1)],
    [formatTransformNumber(point.y, 1)],
    ['1'],
  ]));

  return buildInlineMathML(`
    <mrow>
      <msub><mi>p${prime ? '&#x2032;' : ''}</mi><mi>${pointLabel}</mi></msub>
      <mo>=</mo>
      <mfenced open="[" close="]">
        <mtable>
          <mtr><mtd><msub><mi>x${prime ? '&#x2032;' : ''}</mi><mi>${pointLabel}</mi></msub></mtd></mtr>
          <mtr><mtd><msub><mi>y${prime ? '&#x2032;' : ''}</mi><mi>${pointLabel}</mi></msub></mtd></mtr>
          <mtr><mtd><mn>1</mn></mtd></mtr>
        </mtable>
      </mfenced>
      <mo>=</mo>
      ${vector}
    </mrow>
  `);
}

function homographyMatrixMath(matrixValues: number[][]): string {
  return buildInlineMathML(`
    <mrow>
      <mi>T</mi>
      <mo>=</mo>
      ${unwrapMath(matrix([
        ['<msub><mi>t</mi><mn>11</mn></msub>', '<msub><mi>t</mi><mn>12</mn></msub>', '<msub><mi>t</mi><mn>13</mn></msub>'],
        ['<msub><mi>t</mi><mn>21</mn></msub>', '<msub><mi>t</mi><mn>22</mn></msub>', '<msub><mi>t</mi><mn>23</mn></msub>'],
        ['<msub><mi>t</mi><mn>31</mn></msub>', '<msub><mi>t</mi><mn>32</mn></msub>', '<msub><mi>t</mi><mn>33</mn></msub>'],
      ]))}
      <mo>=</mo>
      ${unwrapMath(matrix(matrixValues.map(row => row.map(value => formatTransformNumber(value, Math.abs(value) < 0.05 ? 4 : 3)))))}
    </mrow>
  `);
}

function affineMatrixMath(matrixValues: number[][]): string {
  return buildInlineMathML(`
    <mrow>
      <mi>A</mi>
      <mo>=</mo>
      ${unwrapMath(matrix([
        ['<msub><mi>a</mi><mn>11</mn></msub>', '<msub><mi>a</mi><mn>12</mn></msub>', '<msub><mi>t</mi><mn>1</mn></msub>'],
        ['<msub><mi>a</mi><mn>21</mn></msub>', '<msub><mi>a</mi><mn>22</mn></msub>', '<msub><mi>t</mi><mn>2</mn></msub>'],
        ['<mn>0</mn>', '<mn>0</mn>', '<mn>1</mn>'],
      ]))}
      <mo>=</mo>
      ${unwrapMath(matrix(matrixValues.map(row => row.map(value => formatTransformNumber(value, Math.abs(value) < 0.05 ? 4 : 3)))))}
    </mrow>
  `);
}

function projectionSubstitutionMath(
  matrixSymbol: 'T' | 'A',
  matrixValues: number[][],
  sourcePoint: PerspectivePoint,
  targetPoint: PerspectivePoint,
  scale?: number
): string {
  const leftVector = matrixSymbol === 'T'
    ? `<mi>&omega;</mi>${unwrapMath(matrix([
        [formatTransformNumber(targetPoint.x, 1)],
        [formatTransformNumber(targetPoint.y, 1)],
        ['1'],
      ]))}`
    : unwrapMath(matrix([
        [formatTransformNumber(targetPoint.x, 1)],
        [formatTransformNumber(targetPoint.y, 1)],
        ['1'],
      ]));

  return buildInlineMathML(`
    <mrow>
      ${matrixSymbol === 'T' ? '<mi>&omega;</mi>' : ''}
      <msub><mi>p</mi><mi>dst</mi></msub>
      <mo>=</mo>
      <mi>${matrixSymbol}</mi>
      <mo>&#x22C5;</mo>
      <msub><mi>p</mi><mi>src</mi></msub>
      <mo>=</mo>
      ${unwrapMath(matrix(matrixValues.map(row => row.map(value => formatTransformNumber(value, Math.abs(value) < 0.05 ? 4 : 3)))))}
      <mo>&#x22C5;</mo>
      ${unwrapMath(matrix([
        [formatTransformNumber(sourcePoint.x, 1)],
        [formatTransformNumber(sourcePoint.y, 1)],
        ['1'],
      ]))}
      <mo>=</mo>
      ${leftVector}
      ${scale === undefined ? '' : `<mo>,</mo><mi>&omega;</mi><mo>=</mo><mn>${formatTransformNumber(scale, 4)}</mn>`}
    </mrow>
  `);
}

function createHandleSummary(points: PerspectivePoint[]): React.ReactNode {
  return (
    <div className="grid gap-2">
      {points.map((point, index) => (
        <div
          key={HANDLE_LABELS[index]}
          className="border-l border-slate-200 pl-3 text-xs leading-5 text-slate-700"
        >
          <span className="font-semibold text-slate-900">
            {HANDLE_LABELS[index]} 点
          </span>
          ：{HANDLE_DESCRIPTIONS[index]}，坐标 ({formatTransformNumber(point.x, 1)},{' '}
          {formatTransformNumber(point.y, 1)})
        </div>
      ))}
    </div>
  );
}

interface DraggablePerspectiveSourceProps {
  width: number;
  height: number;
  rgbImage: number[][][];
  points: PerspectivePoint[];
  selectedIndex: number;
  imageContainerClassName?: string;
  onSelect: (index: number) => void;
  onMovePoint: (index: number, point: PerspectivePoint) => void;
}

function DraggablePerspectiveSource({
  width,
  height,
  rgbImage,
  points,
  selectedIndex,
  imageContainerClassName,
  onSelect,
  onMovePoint,
}: DraggablePerspectiveSourceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const scale = useMemo(
    () => Math.min(SOURCE_VIEW_MAX_SIZE / width, SOURCE_VIEW_MAX_SIZE / height),
    [height, width]
  );
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    imageRgbToCanvas(rgbImage, canvas);
  }, [rgbImage]);

  const updatePointFromClient = useCallback(
    (clientX: number, clientY: number, handleIndex: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const nextPoint = clampPerspectivePoint(
        {
          x: (clientX - rect.left) / scale,
          y: (clientY - rect.top) / scale,
        },
        { width, height },
        DRAG_PADDING
      );

      onMovePoint(handleIndex, nextPoint);
    },
    [height, onMovePoint, scale, width]
  );

  useEffect(() => {
    if (draggingIndex === null) return;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updatePointFromClient(event.clientX, event.clientY, draggingIndex);
    };

    const handlePointerUp = () => {
      setDraggingIndex(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingIndex, updatePointFromClient]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700">
          在左图拖动 A-D 四点，模拟文档扫描时的角点定位
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
          当前选中：{HANDLE_LABELS[selectedIndex]} {HANDLE_DESCRIPTIONS[selectedIndex]}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm ${imageContainerClassName ?? ''}`}
        style={{ width: displayWidth, height: displayHeight }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: displayWidth,
            height: displayHeight,
            imageRendering: 'auto',
          }}
        />

        <svg
          className="pointer-events-none absolute inset-0"
          viewBox={`0 0 ${displayWidth} ${displayHeight}`}
          preserveAspectRatio="none"
        >
          <polygon
            points={[points[0], points[1], points[3], points[2]]
              .map(point => `${point.x * scale},${point.y * scale}`)
              .join(' ')}
            fill="rgba(14,165,233,0.14)"
            stroke="rgba(14,165,233,0.9)"
            strokeWidth="2.5"
            strokeDasharray="8 6"
          />
          <line
            x1={points[0].x * scale}
            y1={points[0].y * scale}
            x2={points[3].x * scale}
            y2={points[3].y * scale}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <line
            x1={points[1].x * scale}
            y1={points[1].y * scale}
            x2={points[2].x * scale}
            y2={points[2].y * scale}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>

        {points.map((point, index) => (
          <button
            key={HANDLE_LABELS[index]}
            type="button"
            onClick={() => onSelect(index)}
            onPointerDown={event => {
              event.preventDefault();
              onSelect(index);
              setDraggingIndex(index);
              updatePointFromClient(event.clientX, event.clientY, index);
            }}
            className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold text-white shadow-[0_10px_20px_rgba(15,23,42,0.25)] outline-none transition ${
              selectedIndex === index ? 'scale-110 ring-4 ring-white/70' : ''
            }`}
            style={{
              left: point.x * scale,
              top: point.y * scale,
              borderColor: 'rgba(255,255,255,0.92)',
              backgroundColor: HANDLE_COLORS[index],
            }}
            aria-label={`拖动 ${HANDLE_LABELS[index]} 点`}
            title={`${HANDLE_LABELS[index]} 点：${HANDLE_DESCRIPTIONS[index]}`}
          >
            {HANDLE_LABELS[index]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PerspectiveTransformPage() {
  const [selectedHandleIndex, setSelectedHandleIndex] = useState(0);
  const scene = useMemo(() => createPerspectiveTeachingScene(), []);
  const [controlPoints, setControlPoints] = useState<PerspectivePoint[]>(() =>
    scene.sourcePoints.map(point => ({ ...point }))
  );

  const currentPoint = controlPoints[selectedHandleIndex] ?? controlPoints[0];

  const handleDirectionMove = useGridNavigation({
    current: currentPoint,
    bounds: scene.sourceSize,
    onMove: nextPoint => {
      setControlPoints(previous => {
        const nextPoints = previous.map(point => ({ ...point }));
        nextPoints[selectedHandleIndex] = clampPerspectivePoint(
          nextPoint,
          scene.sourceSize,
          DRAG_PADDING
        );
        return isValidPerspectiveQuad(nextPoints) ? nextPoints : previous;
      });
    },
  });

  const handleMovePoint = useCallback(
    (index: number, point: PerspectivePoint) => {
      setControlPoints(previous => {
        const nextPoints = previous.map(item => ({ ...item }));
        nextPoints[index] = point;
        return isValidPerspectiveQuad(nextPoints) ? nextPoints : previous;
      });
    },
    []
  );

  const resetControlPoints = useCallback(() => {
    setControlPoints(scene.sourcePoints.map(point => ({ ...point })));
  }, [scene.sourcePoints]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setControlPoints(scene.sourcePoints.map(point => ({ ...point })));
    setSelectedHandleIndex(0);
  }, [scene]);

  const computation = useMemo(
    () => computePerspectiveCorrection(scene, controlPoints),
    [scene, controlPoints]
  );

  const matrixCardNote = (
    <div className="space-y-1">
      <div>透视矩阵使用四对点，等价于 3×3 齐次矩阵。</div>
      <div>仿射矩阵只使用前三对点，因此第四个角点不会被强制对齐。</div>
    </div>
  );

  const contentHeader = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-800">透视变换只解决一个问题</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          同一平面在不同视角下会形成不同的四边形投影。透视变换用四对对应点建立一个 3×3 齐次矩阵，
          把倾斜拍摄的平面重新映射为正视图。它保持直线性，但不保持平行性。
        </p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        四对点确定透视矩阵，随后对整幅图执行重采样。
      </div>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. 建立四对点对应</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              左图四个控制点对应拍摄到的平面角点，右侧目标平面固定为一个矩形。每一对点都在说明”同一平面上的同一位置，在两个视角下分别落到哪里”。
            </p>
            <div className="mt-3 space-y-1 border-t border-red-100 pt-3 text-xs leading-5">
              <div className="font-medium text-red-800">
                当前控制点：{HANDLE_LABELS[selectedHandleIndex]} {HANDLE_DESCRIPTIONS[selectedHandleIndex]}
              </div>
              <div className="text-slate-600">
                控制点四边形保持凸包顺序，才能稳定对应同一平面边界。
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. 由对应点求变换矩阵</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              透视变换使用四对点，得到 3×3 齐次矩阵；仿射变换只使用前三对点，得到的 3×3 矩阵第三行为 [0,0,1]。
              两者都保留直线，但只有透视矩阵能补偿斜拍造成的汇聚关系。
            </p>
            <div className="mt-3 space-y-1 border-t border-amber-100 pt-3 text-xs leading-5">
              <div className="font-medium text-amber-900">
                控制点中心尺度因子 ω={formatTransformNumber(computation.centerProjection.scale, 4)}
              </div>
              <div className="text-slate-600">
                仿射矩阵只由前三点确定，因此第四个角点只能被近似预测。
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. 扩展到整个平面</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              求得矩阵后，图像中的每个像素都按该矩阵重投影。透视校正能让四个角同时对齐，仿射校正只能让前三点准确重合，第四个角会留下残差。
            </p>
            <div className="mt-3 space-y-1 border-t border-emerald-100 pt-3 text-xs leading-5">
              <div className="font-medium text-emerald-800">
                透视结果输出为 {scene.destinationSize.width}×{scene.destinationSize.height} 的正视图
              </div>
              <div className="text-slate-600">
                仿射第四角残差约为 {formatTransformNumber(computation.affineResidual, 2)} 像素
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
        <div className="text-sm font-semibold text-slate-800">公式与关键结论</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          透视变换强调四对点、3×3 矩阵、直线性保留与平行性不保留。
        </p>
        <div className="mt-4 grid gap-4">
          <FormulaCard
            label="透视变换"
            mathML={math('<mi>&omega;</mi><mfenced open="[" close="]"><mtable><mtr><mtd><msup><mi>x</mi><mo>&prime;</mo></msup></mtd></mtr><mtr><mtd><msup><mi>y</mi><mo>&prime;</mo></msup></mtd></mtr><mtr><mtd><mn>1</mn></mtd></mtr></mtable></mfenced><mo>=</mo><mfenced open="[" close="]"><mtable><mtr><mtd><msub><mi>t</mi><mn>11</mn></msub></mtd><mtd><msub><mi>t</mi><mn>12</mn></msub></mtd><mtd><msub><mi>t</mi><mn>13</mn></msub></mtd></mtr><mtr><mtd><msub><mi>t</mi><mn>21</mn></msub></mtd><mtd><msub><mi>t</mi><mn>22</mn></msub></mtd><mtd><msub><mi>t</mi><mn>23</mn></msub></mtd></mtr><mtr><mtd><msub><mi>t</mi><mn>31</mn></msub></mtd><mtd><msub><mi>t</mi><mn>32</mn></msub></mtd><mtd><msub><mi>t</mi><mn>33</mn></msub></mtd></mtr></mtable></mfenced><mfenced open="[" close="]"><mtable><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr><mtr><mtd><mn>1</mn></mtd></mtr></mtable></mfenced>')}
            note="t31、t32 描述透视失真；它们为 0 时，矩阵会退化为仿射形式。"
            tone="embedded"
          />
          <FormulaCard
            label="仿射变换"
            mathML={math('<mfenced open="[" close="]"><mtable><mtr><mtd><msup><mi>x</mi><mo>&prime;</mo></msup></mtd></mtr><mtr><mtd><msup><mi>y</mi><mo>&prime;</mo></msup></mtd></mtr><mtr><mtd><mn>1</mn></mtd></mtr></mtable></mfenced><mo>=</mo><mfenced open="[" close="]"><mtable><mtr><mtd><msub><mi>a</mi><mn>11</mn></msub></mtd><mtd><msub><mi>a</mi><mn>12</mn></msub></mtd><mtd><msub><mi>t</mi><mn>1</mn></msub></mtd></mtr><mtr><mtd><msub><mi>a</mi><mn>21</mn></msub></mtd><mtd><msub><mi>a</mi><mn>22</mn></msub></mtd><mtd><msub><mi>t</mi><mn>2</mn></msub></mtd></mtr><mtr><mtd><mn>0</mn></mtd><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr></mtable></mfenced><mfenced open="[" close="]"><mtable><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr><mtr><mtd><mn>1</mn></mtd></mtr></mtable></mfenced>')}
            note="仿射变换保留平行性，因此它无法完全纠正斜拍平面带来的汇聚现象。"
            tone="embedded"
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">四对点坐标与变换矩阵</div>
        <div className="grid gap-4">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                当前四点坐标
              </div>
              <div className="mt-3">{createHandleSummary(controlPoints)}</div>
            </div>
            <FormulaCard
              label="当前选中点"
              mathML={pointVectorStatement(HANDLE_LABELS[selectedHandleIndex], currentPoint)}
              note={`当前选中 ${HANDLE_LABELS[selectedHandleIndex]} 点，方向键会以 1 像素为单位微调该点。`}
              tone="embedded"
            />
            <FormulaCard
              label="目标矩形对应点"
              mathML={pointVectorStatement(
                HANDLE_LABELS[selectedHandleIndex],
                scene.destinationPoints[selectedHandleIndex],
                true
              )}
              note="四个目标点固定在正视矩形的四个顶点。"
              tone="embedded"
            />
          </div>
          <div className="space-y-4">
            <FormulaCard
              label="当前透视矩阵 T"
              mathML={homographyMatrixMath(computation.homography)}
              note={matrixCardNote}
              tone="embedded"
            />
            <FormulaCard
              label="当前控制点中心透视代入"
              mathML={projectionSubstitutionMath(
                'T',
                computation.homography,
                computation.centerProjection.source,
                computation.centerProjection.destination,
                computation.centerProjection.scale
              )}
              note="取四个控制点的中心作为示例点；透视变换先得到齐次坐标，再除以尺度因子 omega 得到真正的像素坐标。"
              tone="embedded"
            />
            <FormulaCard
              label="当前仿射矩阵 A"
              mathML={affineMatrixMath(computation.affineMatrix)}
              note={`由 A、B、C 三点决定。用它预测 D 点时，坐标约为 (${formatTransformNumber(computation.affineFourthPoint.x, 1)}, ${formatTransformNumber(computation.affineFourthPoint.y, 1)})。`}
              tone="embedded"
            />
            <FormulaCard
              label="当前 D 点仿射预测"
              mathML={projectionSubstitutionMath(
                'A',
                computation.affineMatrix,
                controlPoints[3],
                computation.affineFourthPoint
              )}
              note="仿射矩阵没有透视尺度项，因此第四点只能被前三点确定的模型预测。"
              tone="embedded"
            />
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="grid gap-6">
        <section>
          <div className="text-sm font-semibold text-slate-800">为什么透视变换需要四对点</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            3×3 齐次矩阵共有 9 个元素，但整体只差一个比例因子，因此有效自由度是 8。
            一对点给出两个独立方程，四对点正好提供 8 个约束，所以求解过程和 OpenCV 实现都要求使用四对点。
          </p>
          <FormulaCard
            className="mt-4"
            label="约束数量"
            mathML={math('<mn>4</mn><mtext> 对点 </mtext><mo>&Rightarrow;</mo><mn>8</mn><mtext> 个方程 </mtext><mo>&Rightarrow;</mo><mn>8</mn><mtext> 个自由度</mtext>')}
            note="三对点只够求仿射矩阵，因为仿射矩阵只含 6 个自由度。"
            tone="embedded"
          />
        </section>

        <section className="border-l-4 border-amber-300 pl-4">
          <div className="text-sm font-semibold text-amber-900">为什么文档扫描和车道校正常用透视变换</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            这类任务都近似处理“同一平面”：纸张表面、路面、棋盘格平面都可以看作二维平面。只要找到四个稳定角点，就能把斜拍视角重新拉回到近似正视图。
          </p>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
            <div>
              文档扫描：把梯形纸张校正为矩形版面，便于 OCR 和排版分析。
            </div>
            <div>
              车道线校正：把斜前方路面变成俯视平面，便于测量车道宽度和偏移量。
            </div>
          </div>
        </section>
        </div>
      </TeachingCard>
    </div>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="微调控点"
        value={String(selectedHandleIndex)}
        onChange={value => setSelectedHandleIndex(Number(value))}
        options={HANDLE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
      />

      <div className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
        透视校正需要保持 A-B-D-C 四点构成凸四边形。拖动时如果点序发生交叉，会保留上一组有效位置。
      </div>

      <button
        type="button"
        onClick={resetControlPoints}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        重置到初始示意位置
      </button>

      <div className="border-l-4 border-emerald-300 pl-3 text-xs leading-5 text-emerald-800">
        透视矩阵由四点决定；仿射矩阵只由前三点决定，因此残差大小可以直接反映两者能力差异。
      </div>
    </div>
  );

  const mainVisual = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
      <TeachingCard className="overflow-hidden">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-800">输入图像：斜拍文档平面</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              第一步是建立两幅图像的透视变换方程；示例先用四个角点描述同一平面在当前视角下的位置。
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
            {scene.sourceSize.width}×{scene.sourceSize.height}
          </div>
        </div>
        <DraggablePerspectiveSource
          width={scene.sourceSize.width}
          height={scene.sourceSize.height}
          rgbImage={scene.sourceRgb}
          points={controlPoints}
          selectedIndex={selectedHandleIndex}
          imageContainerClassName="persp-image-source"
          onSelect={setSelectedHandleIndex}
          onMovePoint={handleMovePoint}
        />
      </TeachingCard>

      <div className="grid gap-4">
        <TeachingCard>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">透视校正结果</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                四个角同时与目标矩形对齐，更接近文档扫描或平面展开的真实需求。
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              四点全部参与
            </div>
          </div>
          <div className="persp-image-perspective flex justify-center">
            <ImageCanvas
              image={computation.perspectiveGray}
              rgbImage={computation.perspectiveRgb}
              maxDisplaySize={OUTPUT_VIEW_MAX_SIZE}
              showGrid={false}
            />
          </div>
          <div className="mt-3 border-t border-emerald-200 pt-3 text-xs leading-5 text-emerald-900">
            透视矩阵同时约束四个角，因此能把梯形平面展开为矩形正视图。
          </div>
        </TeachingCard>

        <TeachingCard tone="amber">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-amber-900">仿射校正结果</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                A、B、C 三点可以重合，但 D 点只能被“预测”，因此难以消除透视汇聚。
              </p>
            </div>
            <div className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-800">
              第四角残差 {formatTransformNumber(computation.affineResidual, 2)}
            </div>
          </div>
          <div className="persp-image-affine flex justify-center">
            <ImageCanvas
              image={computation.affineGray}
              rgbImage={computation.affineRgb}
              maxDisplaySize={OUTPUT_VIEW_MAX_SIZE}
              showGrid={false}
            />
          </div>
          <div className="mt-3 border-t border-amber-300 pt-3 text-xs leading-5 text-amber-900">
            仿射变换保留平行性，适合弱透视场景；遇到明显斜拍时，第四个角的误差会直接暴露出来。
          </div>
        </TeachingCard>
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="透视变换"
      subtitle="Perspective Transform"
      contentHeader={contentHeader}
      operationLabel="透视校正"
      parameterIntro="先拖动左图四个控制点贴合纸张边界；当前点对只用于解透视矩阵，再对比透视结果与仿射结果的差别。"
      originalImage={scene.sourceGray}
      resultImage={computation.perspectiveGray}
      originalRgbImage={scene.sourceRgb}
      resultRgbImage={computation.perspectiveRgb}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: PERSPECTIVE_CODE }]} />}
      mainVisual={mainVisual}
      singlePageScroll
      onDirectionMove={handleDirectionMove}    />
  );
}
