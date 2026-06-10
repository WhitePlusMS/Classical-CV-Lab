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
  ProcessRail,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import {
  type CandidateWindow,
  type DetectionPipelineConfig,
  type DetectionScanProgress,
  type DetectionScanStep,
  type GrayscaleImage,
  type TeachingDetectionBox,
  computeDetectionScoreMap,
  createClassifierTeachingImage,
  formatFeatureValue,
  formatGrayByte,
  getDetectionWindowStep,
  getScanProgressAt,
} from '@/lib/algorithms';

type TaskStage = 'intro' | 'training' | 'feature' | 'classifier' | 'scan' | 'result' | 'compare';

interface StageItem {
  key: TaskStage;
  label: string;
  summary: string;
}

const TASK_STAGES: StageItem[] = [
  { key: 'intro', label: '任务', summary: '找出图中的目标' },
  { key: 'training', label: '训练', summary: '正样本与负样本' },
  { key: 'feature', label: '特征', summary: '窗口变成数值' },
  { key: 'classifier', label: '判定', summary: '逐级过滤背景' },
  { key: 'scan', label: '扫描', summary: '窗口扫完整图' },
  { key: 'result', label: '输出', summary: '候选框合并' },
  { key: 'compare', label: '对比', summary: '替换特征路线' },
];

const MAIN_CONFIG: DetectionPipelineConfig = {
  mode: 'haar-cascade',
  windowSize: 6,
  haarTemplateType: 'edge',
  cascadeThresholds: [0.04, 0.07, 0.1],
};

const TRAINING_SAMPLE_WINDOWS = {
  positive: { x: 13, y: 12, width: 6, height: 6 },
  negative: { x: 3, y: 22, width: 6, height: 6 },
};

const OPENCV_SVM_CODE = `// 训练阶段：正样本/负样本 -> 特征向量 -> SVM
Ptr<SVM> svm = SVM::create();
svm->setType(SVM::C_SVC);
svm->setKernel(SVM::POLY);
svm->setTermCriteria(TermCriteria(TermCriteria::MAX_ITER, 3000, 1e-6));
svm->train(trainingDataMat, ROW_SAMPLE, labelsMat);
svm->save("svm_model.xml");

// 检测阶段：滑动窗口 -> 提取特征 -> 分类器预测
float response = svm->predict(windowFeature);
Mat supportVectors = svm->getSupportVectors();`;

const TEACHING_DETECTION_CODE = `function scanImage(image) {
  const candidates = [];

  for (const window of slidingWindows(image)) {
    const haarValue = computeHaarFeature(window);

    // Cascade：前级快速拒绝，后级继续精细判断
    if (!passStage1(haarValue)) continue;
    if (!passStage2(haarValue)) continue;
    if (!passStage3(haarValue)) continue;

    candidates.push(window);
  }

  return mergeOverlappedCandidates(candidates);
}`;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getStageIndex(stage: TaskStage): number {
  return TASK_STAGES.findIndex(item => item.key === stage);
}

function buildHaarFeatureFormula(step: DetectionScanStep | null): string {
  const haarStep = step?.windowStep.haarStep;
  if (!haarStep) {
    return buildInlineMathML('<mrow><mi>V</mi><mo>=</mo><mn>0</mn></mrow>');
  }

  return buildInlineMathML(`
    <mrow>
      <mi>V</mi><mo>=</mo>
      <munder><mo>&#8721;</mo><mtext>黑区</mtext></munder><mi>p</mi>
      <mo>-</mo>
      <munder><mo>&#8721;</mo><mtext>白区</mtext></munder><mi>p</mi>
      <mo>=</mo><mn>${haarStep.blackSum}</mn><mo>-</mo><mn>${haarStep.whiteSum}</mn>
      <mo>=</mo><mn>${haarStep.featureValue}</mn>
    </mrow>
  `);
}

function buildCascadeFormula(step: DetectionScanStep | null): string {
  const cascadeStages = step?.windowStep.cascadeStages ?? [];
  const finalStage = cascadeStages.find(stage => stage.entered && !stage.passed) ?? cascadeStages[cascadeStages.length - 1];

  if (!finalStage) {
    return buildInlineMathML('<mrow><mi>stage</mi><mo>=</mo><mtext>等待扫描</mtext></mrow>');
  }

  return buildInlineMathML(`
    <mrow>
      <msub><mi>S</mi><mn>${finalStage.stage}</mn></msub>
      <mo>:</mo>
      <mo>|</mo><mi>V</mi><mo>|</mo><mo>&#x2265;</mo><msub><mi>T</mi><mn>${finalStage.stage}</mn></msub>
      <mo>=</mo><mn>${formatFeatureValue(finalStage.inputValue, 3)}</mn>
      <mo>&#x2265;</mo><mn>${formatFeatureValue(finalStage.threshold, 3)}</mn>
      <mo>&#x21D2;</mo><mtext>${finalStage.passed ? '通过' : '拒绝'}</mtext>
    </mrow>
  `);
}

function buildScanProgressFormula(progress: DetectionScanProgress): string {
  return buildInlineMathML(`
    <mrow>
      <mtext>扫描进度</mtext>
      <mo>=</mo>
      <mfrac><mn>${progress.scannedCount}</mn><mn>${progress.total}</mn></mfrac>
      <mspace width="1em"/>
      <mtext>候选窗口</mtext><mo>=</mo><mn>${progress.candidateCount}</mn>
      <mspace width="1em"/>
      <mtext>最终框</mtext><mo>=</mo><mn>${progress.detections.length}</mn>
    </mrow>
  `);
}

function cropImageRegion(
  image: GrayscaleImage,
  region: { x: number; y: number; width: number; height: number }
): GrayscaleImage {
  return Array.from({ length: region.height }, (_, row) =>
    Array.from({ length: region.width }, (_, col) => image[region.y + row]?.[region.x + col] ?? 0)
  );
}

function MetricCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'red' | 'amber' | 'emerald';
}) {
  const toneClass = {
    slate: 'border-slate-200 bg-white text-slate-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] opacity-75">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

function StageStepper({
  activeStage,
  onStageChange,
}: {
  activeStage: TaskStage;
  onStageChange: (stage: TaskStage) => void;
}) {
  const activeIndex = getStageIndex(activeStage);

  return (
    <div className="space-y-2">
      {TASK_STAGES.map((stage, index) => {
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
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                active
                  ? 'bg-emerald-600 text-white'
                  : completed
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-500'
              }`}>
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

function WindowMatrix({ image }: { image: GrayscaleImage }) {
  const size = image[0]?.length ?? 0;

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {image.flatMap((row, y) =>
        row.map((value, x) => (
          <div
            key={`window-${y}-${x}`}
            className="flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 bg-white font-mono text-[9px] text-slate-700"
          >
            {formatGrayByte(value)}
          </div>
        ))
      )}
    </div>
  );
}

function CascadeStageList({ step }: { step: DetectionScanStep | null }) {
  const stages = step?.windowStep.cascadeStages ?? [];

  return (
    <div className="grid gap-2">
      {stages.map(stage => (
        <div
          key={`stage-${stage.stage}`}
          className={`rounded-xl border px-3 py-2 text-xs ${
            !stage.entered
              ? 'border-slate-200 bg-slate-50 text-slate-400'
              : stage.passed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">第 {stage.stage} 级强分类器</span>
            <span className="font-mono">
              {stage.entered
                ? `${formatFeatureValue(stage.inputValue, 3)} / ${formatFeatureValue(stage.threshold, 3)}`
                : '未进入'}
            </span>
          </div>
          <p className="mt-1 leading-5">
            {stage.entered
              ? `${stage.weakClassifierCount} 个弱分类器参与判断，结果：${stage.passed ? '通过' : '拒绝'}。`
              : '前一级已经拒绝，后续级不再计算。'}
          </p>
        </div>
      ))}
    </div>
  );
}

function DetectionBoard({
  image,
  currentStep,
  scannedSteps,
  candidates,
  detections,
  trainingSamples,
  size = 'normal',
  onWindowSelect,
}: {
  image: GrayscaleImage;
  currentStep: DetectionScanStep | null;
  scannedSteps: DetectionScanStep[];
  candidates: CandidateWindow[];
  detections: TeachingDetectionBox[];
  trainingSamples?: {
    positive: { x: number; y: number; width: number; height: number };
    negative: { x: number; y: number; width: number; height: number };
  };
  size?: 'normal' | 'large';
  onWindowSelect?: (x: number, y: number) => void;
}) {
  const imageWidth = image[0]?.length ?? 1;
  const imageHeight = image.length || 1;
  const maxWidthClass = size === 'large' ? 'max-w-[34rem]' : 'max-w-[25rem]';

  const boxStyle = (box: { x: number; y: number; width: number; height: number }) => ({
    left: `${(box.x / imageWidth) * 100}%`,
    top: `${(box.y / imageHeight) * 100}%`,
    width: `${(box.width / imageWidth) * 100}%`,
    height: `${(box.height / imageHeight) * 100}%`,
  });

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onWindowSelect) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * imageWidth);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * imageHeight);

    onWindowSelect(clamp(x, 0, imageWidth - 1), clamp(y, 0, imageHeight - 1));
  };

  return (
    <div
      className={`relative w-full ${maxWidthClass} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${onWindowSelect ? 'cursor-crosshair' : ''}`}
      onClick={handleClick}
    >
      <div
        className="grid aspect-square"
        style={{ gridTemplateColumns: `repeat(${imageWidth}, minmax(0, 1fr))` }}
      >
        {image.flatMap((row, y) =>
          row.map((value, x) => (
            <div
              key={`pixel-${y}-${x}`}
              style={{ backgroundColor: `rgb(${formatGrayByte(value)} ${formatGrayByte(value)} ${formatGrayByte(value)})` }}
            />
          ))
        )}
      </div>

      {scannedSteps.slice(-80).map(step => (
        <div
          key={`scanned-${step.index}`}
          className={`pointer-events-none absolute box-border border ${
            step.status === 'candidate'
              ? 'border-amber-400 bg-amber-300/10'
              : 'border-slate-400/40 bg-slate-500/5'
          }`}
          style={boxStyle({ x: step.x, y: step.y, width: step.windowStep.windowSize, height: step.windowStep.windowSize })}
        />
      ))}

      {candidates.map(candidate => (
        <div
          key={`candidate-${candidate.sourceIndex}`}
          className="pointer-events-none absolute box-border border-2 border-amber-500 bg-amber-300/10"
          style={boxStyle(candidate)}
        />
      ))}

      {detections.map((detection, index) => (
        <div
          key={`detection-${index}`}
          className="pointer-events-none absolute box-border border-[3px] border-emerald-500 bg-emerald-300/10 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
          style={boxStyle(detection)}
        />
      ))}

      {trainingSamples && (
        <>
          <div
            className="pointer-events-none absolute box-border border-[3px] border-emerald-500 bg-emerald-300/10 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
            style={boxStyle(trainingSamples.positive)}
          />
          <div
            className="pointer-events-none absolute rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
            style={{ left: `${(trainingSamples.positive.x / imageWidth) * 100}%`, top: `${(trainingSamples.positive.y / imageHeight) * 100}%` }}
          >
            正样本
          </div>
          <div
            className="pointer-events-none absolute box-border border-[3px] border-slate-500 bg-slate-300/10 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
            style={boxStyle(trainingSamples.negative)}
          />
          <div
            className="pointer-events-none absolute rounded-md bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
            style={{ left: `${(trainingSamples.negative.x / imageWidth) * 100}%`, top: `${(trainingSamples.negative.y / imageHeight) * 100}%` }}
          >
            负样本
          </div>
        </>
      )}

      {currentStep && (
        <div
          className="pointer-events-none absolute box-border border-[3px] border-red-600 bg-red-500/10"
          style={boxStyle({
            x: currentStep.x,
            y: currentStep.y,
            width: currentStep.windowStep.windowSize,
            height: currentStep.windowStep.windowSize,
          })}
        />
      )}
    </div>
  );
}

function RouteCompare() {
  const routes = [
    {
      name: 'Haar + Cascade',
      role: '快速过滤大量背景窗口',
      scene: '人脸、固定结构目标',
      note: '前几级很简单，先把明显背景排除，后几级只处理少数疑似目标。',
    },
    {
      name: 'HOG + SVM',
      role: '用梯度结构描述目标轮廓',
      scene: '行人、边缘轮廓清楚的目标',
      note: 'HOG 页学到的是特征向量怎么来，SVM 负责把向量分成目标或背景。',
    },
    {
      name: 'LBP + SVM',
      role: '用局部纹理统计描述窗口',
      scene: '纹理差异明显的目标',
      note: 'Haar/LBP 页学到的是窗口如何变成纹理直方图，分类器读取的是这些统计值。',
    },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {routes.map(route => (
        <TeachingCard key={route.name}>
          <div className="text-sm font-semibold text-slate-800">{route.name}</div>
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {route.role}
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-600">{route.note}</p>
          <div className="mt-3 text-[11px] font-medium text-slate-500">典型场景：{route.scene}</div>
        </TeachingCard>
      ))}
    </div>
  );
}

export default function ClassifierDetectionPipelinePage() {
  const [taskStage, setTaskStage] = useState<TaskStage>('intro');
  const [scanIndex, setScanIndex] = useState(0);
  const [autoScan, setAutoScan] = useState(false);

  const originalImage = useMemo(() => createClassifierTeachingImage(), []);
  const positiveTrainingSample = useMemo(
    () => cropImageRegion(originalImage, TRAINING_SAMPLE_WINDOWS.positive),
    [originalImage]
  );
  const negativeTrainingSample = useMemo(
    () => cropImageRegion(originalImage, TRAINING_SAMPLE_WINDOWS.negative),
    [originalImage]
  );
  const scoreImage = useMemo(() => computeDetectionScoreMap(originalImage, MAIN_CONFIG), [originalImage]);
  const progress = useMemo(
    () => getScanProgressAt(originalImage, MAIN_CONFIG, scanIndex),
    [originalImage, scanIndex]
  );
  const fullProgress = useMemo(
    () => getScanProgressAt(originalImage, MAIN_CONFIG, Number.MAX_SAFE_INTEGER),
    [originalImage]
  );
  const currentScanStep = progress.currentStep;
  const currentWindowStep = currentScanStep?.windowStep ?? null;
  const currentStepIndex = currentScanStep?.index ?? 0;
  const stageIndex = getStageIndex(taskStage);
  const canSelectWindow = taskStage === 'feature' || taskStage === 'classifier' || taskStage === 'scan';
  const canShowCurrentWindow = canSelectWindow;
  const canUseResponseMap = taskStage === 'feature' || taskStage === 'classifier';
  const canShowScanState = taskStage === 'scan' || taskStage === 'result';
  const displayedProgress = taskStage === 'result' ? fullProgress : progress;

  useEffect(() => {
    if (!autoScan || taskStage !== 'scan') return;

    const timer = window.setInterval(() => {
      setScanIndex(prevIndex => {
        if (prevIndex >= progress.total - 1) {
          window.clearInterval(timer);
          setAutoScan(false);
          setTaskStage('result');
          return prevIndex;
        }

        return prevIndex + 1;
      });
    }, 180);

    return () => window.clearInterval(timer);
  }, [autoScan, progress.total, taskStage]);

  const goStage = useCallback((stage: TaskStage) => {
    setTaskStage(stage);
    if (stage === 'scan' && taskStage !== 'scan') {
      setScanIndex(0);
    }
    if (stage !== 'scan') {
      setAutoScan(false);
    }
  }, [taskStage]);

  const goPrevious = useCallback(() => {
    const nextIndex = Math.max(0, stageIndex - 1);
    goStage(TASK_STAGES[nextIndex].key);
  }, [goStage, stageIndex]);

  const goNext = useCallback(() => {
    const nextIndex = Math.min(TASK_STAGES.length - 1, stageIndex + 1);
    goStage(TASK_STAGES[nextIndex].key);
  }, [goStage, stageIndex]);

  const restartScan = useCallback(() => {
    setScanIndex(0);
    setAutoScan(false);
  }, []);

  const selectWindowAtImagePoint = useCallback((x: number, y: number) => {
    const validWidth = scoreImage[0]?.length ?? 0;
    const validHeight = scoreImage.length;
    if (validWidth === 0 || validHeight === 0) return;

    const halfWindow = Math.floor(MAIN_CONFIG.windowSize / 2);
    const nextX = clamp(x - halfWindow, 0, validWidth - 1);
    const nextY = clamp(y - halfWindow, 0, validHeight - 1);
    setScanIndex(nextY * validWidth + nextX);
    setAutoScan(false);
  }, [scoreImage]);

  const handleInputRegionSelect = useCallback((x: number, y: number) => {
    if (!canSelectWindow) return;
    selectWindowAtImagePoint(x, y);
  }, [canSelectWindow, selectWindowAtImagePoint]);

  const handleOutputPixelSelect = useCallback((x: number, y: number) => {
    if (!canUseResponseMap) return;

    const validWidth = scoreImage[0]?.length ?? 0;
    const validHeight = scoreImage.length;
    if (validWidth === 0 || validHeight === 0) return;

    const nextX = clamp(x, 0, validWidth - 1);
    const nextY = clamp(y, 0, validHeight - 1);
    setScanIndex(nextY * validWidth + nextX);
    setAutoScan(false);
  }, [canUseResponseMap, scoreImage]);

  const handleDirectionMove = useGridNavigation({
    current: currentScanStep ? { x: currentScanStep.x, y: currentScanStep.y } : null,
    bounds: { width: scoreImage[0]?.length ?? 0, height: scoreImage.length },
    onMove: point => {
      const validWidth = scoreImage[0]?.length ?? 0;
      setScanIndex(point.y * validWidth + point.x);
      setAutoScan(false);
    },
    disabled: !currentScanStep || !canSelectWindow,
  });

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (!currentScanStep || !canUseResponseMap) return [];

    return [
      {
        id: 'task-window',
        tone: 'red',
        from: {
          kind: 'region',
          selector: '.conv-anchor-input-main',
          x: currentScanStep.x,
          y: currentScanStep.y,
          size: currentScanStep.windowStep.windowSize,
          imageWidth: originalImage[0]?.length ?? 0,
          imageHeight: originalImage.length,
        },
        to: { kind: 'element', selector: '.classifier-task-window' },
      },
      {
        id: 'task-output',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: currentScanStep.x,
          y: currentScanStep.y,
          imageWidth: scoreImage[0]?.length ?? 0,
          imageHeight: scoreImage.length,
        },
        to: { kind: 'element', selector: '.classifier-task-output' },
      },
    ];
  }, [canUseResponseMap, currentScanStep, originalImage, scoreImage]);

  const parameters = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
        <div className="text-xs font-semibold text-emerald-800">课堂任务</div>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          用传统机器学习检测器找出图像中的单个目标区域。
        </p>
      </div>

      <StageStepper activeStage={taskStage} onStageChange={goStage} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={goPrevious}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-xl border border-emerald-200 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          下一步
        </button>
      </div>

      {taskStage === 'scan' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAutoScan(prev => !prev)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              autoScan
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {autoScan ? '暂停扫描' : '自动扫描'}
          </button>
          <button
            type="button"
            onClick={restartScan}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            回到起点
          </button>
        </div>
      )}

      {canShowScanState && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-700">
          <div className="font-semibold">{taskStage === 'result' ? '整图输出统计' : '扫描状态'}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MetricCard label="已扫描" value={`${displayedProgress.scannedCount}/${displayedProgress.total}`} />
            <MetricCard label="候选窗口" value={String(displayedProgress.candidateCount)} tone="amber" />
            <MetricCard label="拒绝窗口" value={String(displayedProgress.rejectedCount)} tone="red" />
            <MetricCard label="最终框" value={String(displayedProgress.detections.length)} tone="emerald" />
          </div>
        </div>
      )}
    </div>
  );

  const contentHeader = (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">任务目标</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">在图像中找出一个目标区域</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          训练样本让分类器学会区分目标和背景；检测时，滑动窗口逐个检查图像位置，
          每个窗口先提取 Haar 特征，再经过级联分类器过滤，最终保留候选检测框。
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <MetricCard label="主线特征" value="Haar" tone="amber" />
        <MetricCard label="主线分类器" value="Cascade" tone="emerald" />
        <MetricCard label="目标输出" value="检测框" />
      </div>
    </div>
  );

  const mainVisual = useMemo(() => {
    if (taskStage === 'feature' || taskStage === 'classifier' || taskStage === 'compare') {
      return null;
    }

    if (taskStage === 'training') {
      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)] lg:items-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">训练样本在原图中的位置</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  绿色框提供目标外观，灰色框提供背景外观，二者共同定义分类器要区分的边界。
                </p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                固定样本
              </span>
            </div>
            <DetectionBoard
              image={originalImage}
              currentStep={null}
              scannedSteps={[]}
              candidates={[]}
              detections={[]}
              trainingSamples={TRAINING_SAMPLE_WINDOWS}
              size="large"
            />
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
              <div className="text-sm font-semibold">正样本：目标窗口</div>
              <div className="mt-3">
                <ImageCanvas image={positiveTrainingSample} maxDisplaySize={132} showGrid />
              </div>
              <p className="mt-3 text-xs leading-5">标签 +1，用来告诉分类器这类外观应保留。</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700">
              <div className="text-sm font-semibold">负样本：背景窗口</div>
              <div className="mt-3">
                <ImageCanvas image={negativeTrainingSample} maxDisplaySize={132} showGrid />
              </div>
              <p className="mt-3 text-xs leading-5">标签 -1，用来告诉分类器这类外观应拒绝。</p>
            </div>
          </div>
        </div>
      );
    }

    if (taskStage === 'scan') {
      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">滑动窗口正在扫完整张图</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  红框是当前窗口；灰框已拒绝，橙框是通过全部级联阶段的候选窗口。
                </p>
              </div>
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                可点击定位
              </span>
            </div>
            <DetectionBoard
              image={originalImage}
              currentStep={currentScanStep}
              scannedSteps={progress.scannedSteps}
              candidates={progress.candidateWindows}
              detections={[]}
              size="large"
              onWindowSelect={selectWindowAtImagePoint}
            />
          </div>

          <div className="grid gap-3">
            <MetricCard label="已扫描窗口" value={`${progress.scannedCount}/${progress.total}`} />
            <MetricCard label="被拒绝窗口" value={String(progress.rejectedCount)} tone="red" />
            <MetricCard label="候选窗口" value={String(progress.candidateCount)} tone="amber" />
            <MetricCard label="当前窗口" value={currentScanStep ? `(${currentScanStep.x}, ${currentScanStep.y})` : '-'} />
          </div>
        </div>
      );
    }

    const resultDetections = fullProgress.detections;

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                {taskStage === 'result' ? '最终检测框回到原图' : '待检测图像'}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {taskStage === 'result'
                  ? '绿色框是整图扫描后的输出结果，来自多个相邻候选窗口的合并。'
                  : '目标检测任务从原图开始，后续步骤会解释窗口怎样被判断为目标或背景。'}
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              {taskStage === 'result' ? '输出结果' : '任务输入'}
            </span>
          </div>
          <DetectionBoard
            image={originalImage}
            currentStep={null}
            scannedSteps={taskStage === 'result' ? fullProgress.scannedSteps : []}
            candidates={taskStage === 'result' ? fullProgress.candidateWindows : []}
            detections={taskStage === 'result' ? resultDetections : []}
            size="large"
          />
        </div>

        <div className="grid gap-3">
          {taskStage === 'result' ? (
            <>
              <MetricCard label="候选窗口" value={String(fullProgress.candidateCount)} tone="amber" />
              <MetricCard label="最终框数量" value={String(resultDetections.length)} tone="emerald" />
              <MetricCard label="主线特征" value="Haar" />
              <MetricCard label="主线分类器" value="Cascade" tone="emerald" />
            </>
          ) : (
            <>
              <MetricCard label="任务" value="找目标" tone="emerald" />
              <MetricCard label="下一步" value="训练样本" tone="amber" />
              <MetricCard label="检测方式" value="滑动窗口" />
            </>
          )}
        </div>
      </div>
    );
  }, [
    currentScanStep,
    fullProgress,
    negativeTrainingSample,
    originalImage,
    positiveTrainingSample,
    progress,
    selectWindowAtImagePoint,
    taskStage,
  ]);

  const analysisPreview = (
    <div className="space-y-4">
      {taskStage === 'compare' ? (
        <RouteCompare />
      ) : (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red" className="classifier-task-window">
                <div className="mb-2 text-[11px] font-semibold uppercase text-red-700">
                  {taskStage === 'training' ? '训练样本' : '当前窗口'}
                </div>
                {taskStage === 'training' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800">
                      <div className="font-semibold">正样本</div>
                      <div className="mt-2">
                        <ImageCanvas image={positiveTrainingSample} maxDisplaySize={96} showGrid />
                      </div>
                      <div className="mt-2 font-mono text-[10px]">
                        ({TRAINING_SAMPLE_WINDOWS.positive.x}, {TRAINING_SAMPLE_WINDOWS.positive.y})
                      </div>
                      <p className="mt-2 leading-5">包含目标的窗口，用来告诉分类器“这类外观应保留”。</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-700">
                      <div className="font-semibold">负样本</div>
                      <div className="mt-2">
                        <ImageCanvas image={negativeTrainingSample} maxDisplaySize={96} showGrid />
                      </div>
                      <div className="mt-2 font-mono text-[10px]">
                        ({TRAINING_SAMPLE_WINDOWS.negative.x}, {TRAINING_SAMPLE_WINDOWS.negative.y})
                      </div>
                      <p className="mt-2 leading-5">背景窗口，用来告诉分类器“这类外观应拒绝”。</p>
                    </div>
                  </div>
                ) : currentWindowStep ? (
                  <div>
                    <ImageCanvas image={currentWindowStep.inputRegion} maxDisplaySize={150} showGrid />
                    <p className="mt-2 text-xs leading-5 text-red-700">
                      窗口坐标 ({currentWindowStep.x}, {currentWindowStep.y})，尺寸 {currentWindowStep.windowSize}x{currentWindowStep.windowSize}。
                    </p>
                  </div>
                ) : null}
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-[11px] font-semibold uppercase text-amber-800">Haar 特征</div>
                {currentWindowStep ? (
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard label="黑区和" value={String(currentWindowStep.haarStep?.blackSum ?? 0)} />
                    <MetricCard label="白区和" value={String(currentWindowStep.haarStep?.whiteSum ?? 0)} />
                    <MetricCard label="特征值 V" value={String(currentWindowStep.featureSummary.haarFeatureValue)} tone="amber" />
                    <MetricCard label="归一化 |V|" value={formatFeatureValue(currentWindowStep.featureSummary.haarAbsoluteValue, 3)} />
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-slate-600">
                    每个窗口先被转换成可计算的特征值，分类器不直接理解“图像”，只读取这些数值。
                  </p>
                )}
              </FlowNode>

              <FlowNode tone="sky">
                <div className="mb-2 text-[11px] font-semibold uppercase text-sky-700">级联分类器</div>
                <CascadeStageList step={currentScanStep} />
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald" className="classifier-task-output">
                <div className="mb-2 text-[11px] font-semibold uppercase text-emerald-700">整图扫描结果</div>
                <DetectionBoard
                  image={originalImage}
                  currentStep={canShowCurrentWindow ? currentScanStep : null}
                  scannedSteps={taskStage === 'scan' || taskStage === 'result' ? displayedProgress.scannedSteps : []}
                  candidates={taskStage === 'scan' || taskStage === 'result' ? displayedProgress.candidateWindows : []}
                  detections={taskStage === 'result' ? displayedProgress.detections : []}
                  trainingSamples={taskStage === 'training' ? TRAINING_SAMPLE_WINDOWS : undefined}
                />
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  {taskStage === 'training' ? (
                    <>
                      <MetricCard label="绿" value="正样本" tone="emerald" />
                      <MetricCard label="灰" value="负样本" />
                      <MetricCard label="窗口" value="6x6" tone="amber" />
                    </>
                  ) : (
                    <>
                      <MetricCard label="灰" value="已拒绝" />
                      <MetricCard label="橙" value="候选" tone="amber" />
                      <MetricCard label="绿" value="最终框" tone="emerald" />
                    </>
                  )}
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      )}
    </div>
  );

  const stepDetails = (
    <div className="space-y-5">
      {taskStage === 'intro' && (
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">任务拆解</h2>
          <div className="grid gap-3 md:grid-cols-5">
            {['收集样本', '提取特征', '训练分类器', '扫描图像', '合并输出'].map((label, index) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs text-slate-700">
                <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 font-semibold text-white">
                  {index + 1}
                </div>
                {label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-600">
            HOG、Haar、LBP 是把窗口变成特征向量的方法；SVM、Cascade 是读取特征并判断目标/背景的分类器；
            滑动窗口负责把这个判断过程应用到整张图。
          </p>
        </TeachingCard>
      )}

      {taskStage === 'training' && (
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">分类器从样本中来</h2>
          <p className="text-xs leading-6 text-slate-600">
            训练阶段先准备正样本和负样本。每个样本窗口都要转换成同一种特征表达，
            然后用标签训练分类器。检测阶段不再重新学习，只把新窗口送入已经训练好的分类器。
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricCard label="正样本标签" value="+1 目标" tone="emerald" />
            <MetricCard label="负样本标签" value="-1 背景" />
            <MetricCard label="训练产物" value="分类器参数" tone="amber" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TeachingCard>
              <div className="mb-2 text-xs font-semibold text-emerald-700">正样本窗口</div>
              <ImageCanvas image={positiveTrainingSample} maxDisplaySize={130} showGrid />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                该窗口覆盖目标中心区域，标签为 +1。
              </p>
            </TeachingCard>
            <TeachingCard>
              <div className="mb-2 text-xs font-semibold text-slate-700">负样本窗口</div>
              <ImageCanvas image={negativeTrainingSample} maxDisplaySize={130} showGrid />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                该窗口只包含背景纹理，标签为 -1。
              </p>
            </TeachingCard>
          </div>
        </TeachingCard>
      )}

      {taskStage === 'feature' && currentScanStep && (
        <div className="space-y-4">
          <FormulaCard
            label="当前 Haar 特征值"
            mathML={buildHaarFeatureFormula(currentScanStep)}
            note="黑区与白区来自当前窗口内的 Haar 模板划分。特征值越能区分目标结构，越适合作为分类器输入。"
          />
          <TeachingCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">当前窗口灰度矩阵</h3>
            <WindowMatrix image={currentScanStep.windowStep.inputRegion} />
          </TeachingCard>
        </div>
      )}

      {taskStage === 'classifier' && (
        <div className="space-y-4">
          <FormulaCard
            label="当前 Cascade 阶段判定"
            mathML={buildCascadeFormula(currentScanStep)}
            note="任一级拒绝后，后续级不再计算；只有全部通过的窗口才进入候选集合。"
          />
          <TeachingCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">逐级过滤状态</h3>
            <CascadeStageList step={currentScanStep} />
          </TeachingCard>
        </div>
      )}

      {taskStage === 'scan' && (
        <div className="space-y-4">
          <FormulaCard
            label="扫描进度"
            mathML={buildScanProgressFormula(progress)}
            note="滑动窗口按行扫描整张图，每个位置都执行同一个 Haar + Cascade 判定过程。"
          />
          <TeachingCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">扫描统计</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard label="已扫描窗口" value={`${progress.scannedCount}/${progress.total}`} />
              <MetricCard label="被拒绝窗口" value={String(progress.rejectedCount)} tone="red" />
              <MetricCard label="候选窗口" value={String(progress.candidateCount)} tone="amber" />
              <MetricCard label="当前窗口" value={currentScanStep ? `(${currentScanStep.x},${currentScanStep.y})` : '-'} />
            </div>
          </TeachingCard>
        </div>
      )}

      {taskStage === 'result' && (
        <div className="space-y-4">
          <FormulaCard
            label="候选框合并"
            mathML={buildScanProgressFormula(fullProgress)}
            note="多个相邻候选窗口通常对应同一个目标，需要合并成少量最终检测框。"
          />
          <TeachingCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">最终检测框</h3>
            {fullProgress.detections.length > 0 ? (
              <div className="grid gap-2">
                {fullProgress.detections.map((box, index) => (
                  <div key={`box-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span className="font-semibold">检测框 {index + 1}</span>
                    <span className="font-mono">
                      x={box.x}, y={box.y}, w={box.width}, h={box.height}, score={formatFeatureValue(box.score, 3)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-6 text-slate-600">当前教学阈值下没有形成稳定最终框，可回到扫描步骤观察候选窗口怎样累积。</p>
            )}
          </TeachingCard>
        </div>
      )}

      {taskStage === 'compare' && (
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">三个页面之间的关系</h2>
          <p className="text-xs leading-6 text-slate-600">
            HOG 特征页和 Haar / LBP 特征向量页负责解释“窗口怎样变成数值”；
            分类器与检测流程页负责解释“这些数值怎样被分类器用于整图目标检测”。
          </p>
          <div className="mt-4">
            <RouteCompare />
          </div>
        </TeachingCard>
      )}
    </div>
  );

  return (
    <ConceptLayout
      title="分类器与检测流程"
      subtitle="Classifier & Detection Pipeline - 从窗口判定到整图检测"
      contentHeader={contentHeader}
      operationLabel="Haar + Cascade"
      parameterIntro="按任务步骤推进，观察传统目标检测器如何从训练样本、窗口特征和级联分类器得到最终检测框。"
      originalImage={originalImage}
      resultImage={scoreImage}
      parameters={parameters}
      mainVisual={mainVisual}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={visualOverlayPaths.length > 0 ? <AnchoredOverlay paths={visualOverlayPaths} /> : null}
      codeTab={
        <CodeViewer
          languages={[
            { name: 'C++ (OpenCV)', code: OPENCV_SVM_CODE },
            { name: 'TypeScript 教学流程', code: TEACHING_DETECTION_CODE },
          ]}
        />
      }
      currentStep={
        currentScanStep && canShowCurrentWindow
          ? {
            x: currentScanStep.x,
            y: currentScanStep.y,
            kernelSize: currentScanStep.windowStep.windowSize,
            regionX: currentScanStep.x,
            regionY: currentScanStep.y,
            regionWidth: currentScanStep.windowStep.windowSize,
            regionHeight: currentScanStep.windowStep.windowSize,
          }
          : null
      }
      currentStepLabel="当前检测窗口"
      stepInfo={canShowCurrentWindow && progress.total > 0 ? { current: currentStepIndex, total: progress.total } : null}
      imageLabels={{ input: '待检测图像', output: '分类响应图' }}
      imageHints={canUseResponseMap
        ? {
          input: '点击图像可选择一个候选窗口',
          output: '点击响应图可定位窗口左上角',
        }
        : undefined}
      showOriginalGrid
      originalRegionMarker="frame"
      showInputSelection={canShowCurrentWindow}
      showNavigationControls={canUseResponseMap}
      singlePageScroll
      navigationHintText={canUseResponseMap ? '方向键移动窗口 / 点击原图或响应图定位' : '方向键移动窗口 / 点击大图定位'}
      onDirectionMove={canSelectWindow ? handleDirectionMove : undefined}
      onInputRegionSelect={canSelectWindow && canUseResponseMap ? handleInputRegionSelect : undefined}
      onOutputPixelSelect={canUseResponseMap ? handleOutputPixelSelect : undefined}
    />
  );
}
