'use client';

import React, { useCallback, useMemo, useState } from 'react';
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
  buildInlineMathML,
} from '@/components';
import {
  createImageRegistrationScenario,
  formatRegistrationValue,
  type RegistrationEstimationMode,
  type RegistrationMatchEvaluation,
  type RegistrationModel,
  type RegistrationPoint,
} from '@/lib/algorithms/imageRegistration';

const MODEL_OPTIONS = [
  { value: 'affine', label: '仿射模型' },
  { value: 'perspective', label: '透视模型' },
] as const;

const ESTIMATION_OPTIONS = [
  { value: 'all-matches', label: '直接使用全部匹配' },
  { value: 'robust', label: '先做几何一致性筛选' },
] as const;

const PANEL_SIZE = 240;

const IMAGE_REGISTRATION_CODE = `const keypointsRef = detector.detect(referenceImage);
const keypointsSrc = detector.detect(sourceImage);

const descRef = detector.compute(referenceImage, keypointsRef);
const descSrc = detector.compute(sourceImage, keypointsSrc);
const matches = matcher.match(descRef, descSrc);

const goodMatches = rejectOutliers(matches); // 比如交叉验证或 RANSAC
const transform =
  model === 'affine'
    ? estimateAffine(goodMatches)
    : estimateHomography(goodMatches);

const aligned =
  model === 'affine'
    ? warpAffine(sourceImage, transform)
    : warpPerspective(sourceImage, transform);`;

function clampIndex(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, value));
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

function unwrapMath(mathML: string): string {
  return mathML
    .replace('<math xmlns="http://www.w3.org/1998/Math/MathML">', '')
    .replace('</math>', '');
}

function transformMatrixStatement(
  model: RegistrationModel,
  rows: string[][],
  suffix: 'true' | 'est'
): string {
  const symbol =
    model === 'affine'
      ? `<msub><mi>A</mi><mi>${suffix}</mi></msub>`
      : `<msub><mi>T</mi><mi>${suffix}</mi></msub>`;
  const symbolicRows =
    model === 'affine'
      ? [
          ['<msub><mi>a</mi><mn>11</mn></msub>', '<msub><mi>a</mi><mn>12</mn></msub>', '<msub><mi>t</mi><mi>x</mi></msub>'],
          ['<msub><mi>a</mi><mn>21</mn></msub>', '<msub><mi>a</mi><mn>22</mn></msub>', '<msub><mi>t</mi><mi>y</mi></msub>'],
          ['<mn>0</mn>', '<mn>0</mn>', '<mn>1</mn>'],
        ]
      : [
          ['<msub><mi>t</mi><mn>11</mn></msub>', '<msub><mi>t</mi><mn>12</mn></msub>', '<msub><mi>t</mi><mn>13</mn></msub>'],
          ['<msub><mi>t</mi><mn>21</mn></msub>', '<msub><mi>t</mi><mn>22</mn></msub>', '<msub><mi>t</mi><mn>23</mn></msub>'],
          ['<msub><mi>t</mi><mn>31</mn></msub>', '<msub><mi>t</mi><mn>32</mn></msub>', '<msub><mi>t</mi><mn>33</mn></msub>'],
        ];

  return buildInlineMathML(`<mrow>${symbol}<mo>=</mo>${unwrapMath(matrix(symbolicRows))}<mo>=</mo>${unwrapMath(matrix(rows))}</mrow>`);
}

function pointVector(point: RegistrationPoint): string {
  return unwrapMath(matrix([
    [formatRegistrationValue(point.x, 2)],
    [formatRegistrationValue(point.y, 2)],
    ['1'],
  ]));
}

function buildTransformMath(
  model: RegistrationModel,
  rows: string[][],
  source?: RegistrationPoint,
  target?: RegistrationPoint
): string {
  const transformSymbol =
    model === 'affine'
      ? '<msub><mi>A</mi><mi>est</mi></msub>'
      : '<msub><mi>T</mi><mi>est</mi></msub>';
  const leftVector =
    '<mfenced open="[" close="]"><mtable><mtr><mtd><msup><mi>x</mi><mo>&prime;</mo></msup></mtd></mtr><mtr><mtd><msup><mi>y</mi><mo>&prime;</mo></msup></mtd></mtr><mtr><mtd><mn>1</mn></mtd></mtr></mtable></mfenced>';
  const rightVector =
    '<mfenced open="[" close="]"><mtable><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr><mtr><mtd><mn>1</mn></mtd></mtr></mtable></mfenced>';
  const left = model === 'affine' ? leftVector : `<mi>&omega;</mi>${leftVector}`;
  const substitution = source && target
    ? `<mo>=</mo>${unwrapMath(matrix(rows))}<mo>&#x22C5;</mo>${pointVector(source)}<mo>=</mo>${model === 'affine' ? '' : '<mi>&omega;</mi>'}${pointVector(target)}`
    : `<mo>=</mo>${unwrapMath(matrix(rows))}<mo>&#x22C5;</mo>${rightVector}`;

  return buildInlineMathML(
    `<mrow>${left}<mo>=</mo>${transformSymbol}<mo>&#x22C5;</mo>${rightVector}${substitution}</mrow>`
  );
}

function formatPoint(point: RegistrationPoint): string {
  return `(${formatRegistrationValue(point.x, 2)}, ${formatRegistrationValue(point.y, 2)})`;
}

function pointButtonClass(selected: boolean, variant: 'source' | 'observed'): string {
  if (variant === 'source') {
    return selected
      ? 'border-red-600 bg-red-600 text-white shadow-[0_0_0_4px_rgba(220,38,38,0.18)]'
      : 'border-red-500 bg-white text-red-700';
  }

  return selected
    ? 'border-slate-800 bg-slate-800 text-white shadow-[0_0_0_4px_rgba(15,23,42,0.14)]'
    : 'border-slate-400 bg-white text-slate-700';
}

function residualTone(match: RegistrationMatchEvaluation): string {
  if (match.isOutlier) return 'border-red-200 bg-red-50 text-red-700';
  if (!match.inlier) return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function FeaturePanel({
  title,
  badge,
  caption,
  image,
  points,
  predictedPoints,
  selectedIndex,
  variant,
  imageContainerClassName,
  onSelect,
}: {
  title: string;
  badge: string;
  caption: string;
  image: number[][];
  points: Array<{ label: string; point: RegistrationPoint; outlier?: boolean }>;
  predictedPoints?: RegistrationPoint[];
  selectedIndex: number;
  variant: 'source' | 'observed';
  imageContainerClassName?: string;
  onSelect: (index: number) => void;
}) {
  const scale = PANEL_SIZE / (image[0]?.length ?? 1);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{caption}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {badge}
        </span>
      </div>

      <div className={`relative mt-4 mx-auto w-fit ${imageContainerClassName ?? ''}`}>
        <ImageCanvas image={image} maxDisplaySize={PANEL_SIZE} showGrid={false} />

        {predictedPoints?.map((point, index) => {
          const selected = index === selectedIndex;
          const size = selected ? 18 : 14;

          return (
            <div
              key={`predicted-${points[index]?.label ?? index}`}
              className={`pointer-events-none absolute rounded-full border-2 ${
                selected ? 'border-emerald-600 bg-emerald-100/65' : 'border-emerald-400 bg-emerald-50/45'
              }`}
              style={{
                left: point.x * scale - size / 2,
                top: point.y * scale - size / 2,
                width: size,
                height: size,
              }}
            />
          );
        })}

        {points.map((item, index) => {
          const selected = index === selectedIndex;
          const size = selected ? 18 : 14;
          const left = item.point.x * scale - size / 2;
          const top = item.point.y * scale - size / 2;

          return (
            <button
              key={`${variant}-${item.label}`}
              type="button"
              onClick={() => onSelect(index)}
              className={`absolute flex items-center justify-center rounded-full border-2 text-[10px] font-semibold transition ${pointButtonClass(selected, variant)}`}
              style={{ left, top, width: size, height: size }}
              aria-label={`选择${item.label}`}
              title={`${item.label}${item.outlier ? '（误匹配）' : ''}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        {variant === 'source'
          ? '红色编号点表示参考图中的稳定特征。'
          : '深色编号点表示观测匹配位置，绿色空心圈表示当前矩阵预测位置。'}
      </div>
    </section>
  );
}

export default function ImageRegistrationPage() {
  const [model, setModel] = useState<RegistrationModel>('affine');
  const [estimationMode, setEstimationMode] = useState<RegistrationEstimationMode>('robust');
  const [mismatchCount, setMismatchCount] = useState(1);

  const scenario = useMemo(
    () => createImageRegistrationScenario(model, mismatchCount, estimationMode),
    [estimationMode, mismatchCount, model]
  );

  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);

  const matches = scenario.activeEstimate.matches;
  const safeSelectedIndex = clampIndex(selectedMatchIndex, matches.length);
  const activeMatch = matches[safeSelectedIndex] ?? matches[0];

  const activeMatrixRows = useMemo(
    () => scenario.activeEstimate.matrix.map(row => row.map(value => formatRegistrationValue(value, 3))),
    [scenario.activeEstimate.matrix]
  );

  const trueMatrixRows = useMemo(
    () => scenario.trueMatrix.map(row => row.map(value => formatRegistrationValue(value, 3))),
    [scenario.trueMatrix]
  );

  const handleDirectionMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (matches.length === 0) return;
      const delta = direction === 'left' || direction === 'up' ? -1 : 1;
      setSelectedMatchIndex(current => (current + delta + matches.length) % matches.length);
    },
    [matches.length]
  );

  const contentHeader = (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-800">图像配准不是增强图像，而是建立两幅图的同一坐标系</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          图像配准的基本流程是：先找对应特征点，再估计仿射矩阵或透视矩阵，最后把整幅待配准图重新映射到参考图坐标系。这样才能服务于零件检测、图像拼接和变化检测。
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {scenario.modelInfo.label} / {scenario.modelInfo.degreesOfFreedom} 个自由度
      </div>
    </div>
  );

  const analysisPreview = activeMatch ? (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-[11px] font-semibold uppercase text-red-700">1. 建立图像对应关系</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              特征点匹配先比较描述子距离，再判断几何关系是否一致。当前匹配点对应
              <MathText className="mx-1" mathML={math('<mi>D</mi><mo>=</mo><msqrt><munderover><mo>&Sigma;</mo><mi>k</mi><mi>n</mi></munderover><msup><mrow><mo>(</mo><msub><mi>X</mi><mi>ik</mi></msub><mo>-</mo><msub><mi>X</mi><mi>jk</mi></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt>')} />
              的一个候选最近邻。
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                参考点 {activeMatch.label}：{formatPoint(activeMatch.source)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                待配准图观测点：{formatPoint(activeMatch.observedTarget)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                描述子距离：{formatRegistrationValue(activeMatch.descriptorDistance, 1)}
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-[11px] font-semibold uppercase text-amber-800">2. 用对应点估计变换矩阵</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              当前选择的是 {scenario.modelInfo.label}，至少需要 {scenario.modelInfo.minimumPairs} 对点。
              如果误匹配混入估计，矩阵中每个参数都会被错误拉动。
            </p>
            <FormulaCard
              className="mt-3"
              mathML={buildTransformMath(model, activeMatrixRows, activeMatch.source, activeMatch.predictedTarget)}
              formulaClassName="rounded-xl px-3 py-3 shadow-none"
              note={`${scenario.modelInfo.matrixNote} 当前策略为“${scenario.activeEstimate.label}”。`}
            />
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">3. 把整幅图重采样到参考坐标系</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              配准完成后，不是只对特征点变换，而是把待配准图中全部像素都映射到参考图坐标系：
              <MathText className="mx-1" mathML={math('<msup><mi>I</mi><mo>&prime;</mo></msup><mo>(</mo><msup><mi>x</mi><mo>&prime;</mo></msup><mo>,</mo><msup><mi>y</mi><mo>&prime;</mo></msup><mo>)</mo><mo>=</mo><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>')} />
              。
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                当前内点平均残差：{formatRegistrationValue(scenario.activeEstimate.meanResidual, 2)} px
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                叠加强度误差：{formatRegistrationValue(scenario.activeEstimate.meanIntensityError, 3)}
              </div>
              <div className={`rounded-xl border px-3 py-2 ${residualTone(activeMatch)}`}>
                当前点残差：{formatRegistrationValue(activeMatch.residual, 2)} px
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  ) : null;

  const stepDetails = activeMatch ? (
    <div className="space-y-4">
      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">从特征匹配到图像对齐</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          第四章强调“提取关键点、构造描述子、建立匹配关系”；第三章强调“选对几何模型并对整幅图做坐标变换”。图像配准正是这两部分内容的连接点。
        </p>
        <div className="mt-4 grid gap-4">
          <FormulaCard
            label="特征距离"
            mathML={math('<msub><mi>Dis</mi><mi>ij</mi></msub><mo>=</mo><msqrt><munderover><mo>&Sigma;</mo><mi>k</mi><mi>n</mi></munderover><msup><mrow><mo>(</mo><msub><mi>X</mi><mi>ik</mi></msub><mo>-</mo><msub><mi>X</mi><mi>jk</mi></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt>')}
            note="描述子之间的欧氏距离是常见相似性度量。距离小，只说明“像”，不保证几何上一定正确。"
          />
          <FormulaCard
            label={model === 'affine' ? '仿射坐标变换' : '透视坐标变换'}
            mathML={buildTransformMath(model, activeMatrixRows, activeMatch.source, activeMatch.predictedTarget)}
            note={scenario.modelInfo.propertyNote}
          />
        </div>
      </TeachingCard>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">当前矩阵与真实矩阵对比</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          “真实矩阵”来自示例图生成时使用的变换；“估计矩阵”来自当前匹配点集合。误匹配越多，两者偏差通常越明显。
        </p>
        <div className="mt-4 grid gap-4">
            <FormulaCard
              label="生成待配准图时使用的真实矩阵"
              mathML={transformMatrixStatement(model, trueMatrixRows, 'true')}
              note="它对应示例数据中的真实几何关系，实际任务中通常未知。"
            />
            <FormulaCard
              label={`当前估计矩阵（${scenario.activeEstimate.label}）`}
              mathML={transformMatrixStatement(model, activeMatrixRows, 'est')}
              note={`模型至少需要 ${scenario.modelInfo.minimumPairs} 对点；当前有 ${scenario.activeEstimate.inlierCount} 对内点参与稳定估计。`}
            />
          </div>
        </TeachingCard>

      <div className="grid gap-4">
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">误匹配为什么会破坏配准</div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              当前观测点：{formatPoint(activeMatch.observedTarget)}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              当前矩阵预测点：{formatPoint(activeMatch.predictedTarget)}
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${residualTone(activeMatch)}`}>
              残差定义为
              <MathText className="mx-1" mathML={math('<mi>e</mi><mo>=</mo><mroot><mrow><msup><mrow><mo>(</mo><msup><mi>x</mi><mo>&prime;</mo></msup><mo>-</mo><msup><mover><mi>x</mi><mo>^</mo></mover><mo>&prime;</mo></msup><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><msup><mi>y</mi><mo>&prime;</mo></msup><mo>-</mo><msup><mover><mi>y</mi><mo>^</mo></mover><mo>&prime;</mo></msup><mo>)</mo></mrow><mn>2</mn></msup></mrow><mn>2</mn></mroot>')} />
              ，当前值为 {formatRegistrationValue(activeMatch.residual, 2)} px。
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${activeMatch.isOutlier ? 'border-red-200 bg-red-50 text-red-700' : activeMatch.inlier ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {activeMatch.isOutlier
                ? '该匹配是故意注入的误匹配。即使描述子阶段把它当成候选，如果不做几何筛选，也会直接扰动矩阵估计。'
                : activeMatch.inlier
                  ? '该匹配与当前矩阵保持几何一致，是稳定估计变换的有效支撑点。'
                  : '该匹配不是故意注入的误匹配，但在当前矩阵下残差偏大，说明它不再支持稳定的配准结果。'}
            </div>
          </div>
        </TeachingCard>

        <TeachingCard tone="amber">
          <div className="text-sm font-semibold text-amber-900">“全部匹配”与“筛除误匹配”的差异</div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              直接估计：内点平均残差 {formatRegistrationValue(scenario.directEstimate.meanResidual, 2)} px，
              叠加强度误差 {formatRegistrationValue(scenario.directEstimate.meanIntensityError, 3)}。
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              稳健筛选：内点平均残差 {formatRegistrationValue(scenario.robustEstimate.meanResidual, 2)} px，
              叠加强度误差 {formatRegistrationValue(scenario.robustEstimate.meanIntensityError, 3)}。
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              当误匹配数量增加时，学生应重点观察“矩阵偏差”和“叠加后重影”是否同步恶化。前者说明参数被拉偏，后者说明全图像素已经无法对齐。
            </div>
          </div>
        </TeachingCard>
      </div>

      <TeachingCard>
        <div className="text-sm font-semibold text-slate-800">仿射与透视模型如何选择</div>
        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
            <div className="text-sm font-semibold text-blue-800">仿射模型</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              适合拍摄视角变化较小、目标近似位于同一平面且透视效应不强的场景。它保留平行性，因此参数更少、估计更稳定。
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="text-sm font-semibold text-emerald-800">透视模型</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              当同一平面因为视角改变而产生明显透视收缩时，应改用透视模型。它能拟合更多形变，但也更依赖准确的对应点。
            </p>
          </div>
        </div>
      </TeachingCard>
    </div>
  ) : (
    <div className="py-8 text-center text-slate-400">暂无可分析的匹配点</div>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="几何模型"
        value={model}
        onChange={value => setModel(value as RegistrationModel)}
        options={MODEL_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
      />

      <SelectParam
        label="估计策略"
        value={estimationMode}
        onChange={value => setEstimationMode(value as RegistrationEstimationMode)}
        options={ESTIMATION_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
      />

      <SliderParam
        label="误匹配数量"
        value={mismatchCount}
        onChange={setMismatchCount}
        min={0}
        max={3}
        step={1}
        unit=" 对"
      />

      <SliderParam
        label="观察匹配对"
        value={safeSelectedIndex}
        onChange={value => setSelectedMatchIndex(clampIndex(value, matches.length))}
        min={0}
        max={Math.max(0, matches.length - 1)}
        step={1}
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        {scenario.modelInfo.label} 至少需要 {scenario.modelInfo.minimumPairs} 对点；
        当前策略保留了 {scenario.activeEstimate.inlierCount} 对内点，内点平均残差为 {formatRegistrationValue(scenario.activeEstimate.meanResidual, 2)} px。
      </div>

      <div className={`rounded-2xl border px-3 py-3 text-xs leading-5 ${activeMatch ? residualTone(activeMatch) : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
        {activeMatch
          ? `当前匹配“${activeMatch.label}”的残差为 ${formatRegistrationValue(activeMatch.residual, 2)} px，${activeMatch.isOutlier ? '它是误匹配。' : activeMatch.inlier ? '它支持当前矩阵。' : '它未通过当前几何一致性判断。'}`
          : '请先选择一个匹配点。'}
      </div>
    </div>
  );

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(
    () =>
      activeMatch
        ? [
            {
              id: 'registration-current-match',
              tone: activeMatch.isOutlier ? 'red' : activeMatch.inlier ? 'emerald' : 'amber',
              from: {
                kind: 'pixel',
                selector: '.registration-image-reference',
                x: activeMatch.source.x,
                y: activeMatch.source.y,
                imageWidth: scenario.width,
                imageHeight: scenario.height,
              },
              to: {
                kind: 'pixel',
                selector: '.registration-image-target',
                x: activeMatch.observedTarget.x,
                y: activeMatch.observedTarget.y,
                imageWidth: scenario.width,
                imageHeight: scenario.height,
              },
            },
          ]
        : [],
    [activeMatch, scenario.height, scenario.width]
  );

  const mainVisual = activeMatch ? (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)_minmax(0,1fr)] xl:items-stretch">
        <FeaturePanel
          title="参考图"
          badge="固定坐标系"
          caption="参考图提供稳定的特征坐标。"
          image={scenario.referenceImage}
          points={scenario.referenceFeatures.map(feature => ({ label: feature.label, point: feature.point }))}
          selectedIndex={safeSelectedIndex}
          variant="source"
          imageContainerClassName="registration-image-reference"
          onSelect={setSelectedMatchIndex}
        />

        <section className="flex h-full flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
          <div>
            <div className="text-sm font-semibold text-amber-950">当前匹配</div>
            <div className="mt-1 text-xs leading-5 text-amber-900">
              {activeMatch.label}
            </div>
          </div>

          <dl className="mt-4 divide-y divide-amber-200/70 text-sm leading-6 text-slate-800">
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2">
              <dt className="text-xs text-slate-500">参考点</dt>
              <dd className="font-medium">{formatPoint(activeMatch.source)}</dd>
            </div>
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2">
              <dt className="text-xs text-slate-500">观测点</dt>
              <dd className="font-medium">{formatPoint(activeMatch.observedTarget)}</dd>
            </div>
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2">
              <dt className="text-xs text-slate-500">预测点</dt>
              <dd className="font-medium">{formatPoint(activeMatch.predictedTarget)}</dd>
            </div>
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2">
              <dt className="text-xs text-slate-500">残差</dt>
              <dd className={activeMatch.isOutlier ? 'font-semibold text-red-700' : activeMatch.inlier ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-800'}>
                {formatRegistrationValue(activeMatch.residual, 2)} px
              </dd>
            </div>
          </dl>

          <div className={`mt-4 border-t pt-3 text-xs leading-5 ${activeMatch.isOutlier ? 'border-red-200 text-red-700' : activeMatch.inlier ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-800'}`}>
            {activeMatch.isOutlier
              ? '该匹配是误匹配，会扰动矩阵估计。'
              : activeMatch.inlier
                ? '该匹配支持当前矩阵估计。'
                : '该匹配残差偏大，当前策略未采用它。'}
          </div>
        </section>

        <FeaturePanel
          title="待配准图"
          badge={scenario.activeEstimate.label}
          caption="观测点与预测圈用于判断几何一致性。"
          image={scenario.targetImage}
          points={matches.map(match => ({ label: match.label, point: match.observedTarget, outlier: match.isOutlier }))}
          predictedPoints={matches.map(match => match.predictedTarget)}
          selectedIndex={safeSelectedIndex}
          variant="observed"
          imageContainerClassName="registration-image-target"
          onSelect={setSelectedMatchIndex}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-stretch">
        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">配准后叠加结果</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                重影越明显，说明估计矩阵越偏。
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              残差 {formatRegistrationValue(scenario.activeEstimate.meanResidual, 2)} px
            </span>
          </div>
          <div className="mt-4 flex flex-1 items-center justify-center">
            <ImageCanvas image={scenario.activeEstimate.overlayImage} maxDisplaySize={PANEL_SIZE} showGrid={false} />
          </div>
        </section>

        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">矩阵估计与结果判读</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                当前模型：{scenario.modelInfo.label}；估计策略：{scenario.activeEstimate.label}。
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              强度误差 {formatRegistrationValue(scenario.activeEstimate.meanIntensityError, 3)}
            </span>
          </div>
          <div className="mt-4">
            <FormulaCard
              mathML={buildTransformMath(model, activeMatrixRows, activeMatch.source, activeMatch.predictedTarget)}
              formulaClassName="rounded-xl px-3 py-3 shadow-none"
              note={`${scenario.modelInfo.matrixNote} 当前策略为“${scenario.activeEstimate.label}”。`}
            />
          </div>
          <div className="mt-4 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-700">
            切换模型或增加误匹配数量时，重点观察矩阵残差和叠加重影是否同步变化；这比单独看某一对匹配更能反映配准质量。
          </div>
        </section>
      </div>
    </div>
  ) : null;

  return (
    <ConceptLayout
      title="图像配准"
      subtitle="Image Registration"
      contentHeader={contentHeader}
      operationLabel="配准变换"
      parameterIntro="先切换仿射或透视模型，再调节误匹配数量与估计策略，观察矩阵、匹配残差和叠加结果如何一起变化。"
      originalImage={scenario.referenceImage}
      resultImage={scenario.activeEstimate.overlayImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: IMAGE_REGISTRATION_CODE }]} />}
      mainVisual={mainVisual}
      visualOverlay={<AnchoredOverlay paths={visualOverlayPaths} />}
      singlePageScroll
      onDirectionMove={handleDirectionMove}
      showNavigationBar={false}
      showNavigationControls={false}
    />
  );
}
