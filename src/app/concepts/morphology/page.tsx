'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  AnchoredOverlay,
  type AnchoredOverlayPath,
  ConceptLayout,
  CodeViewer,
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
  erode,
  dilate,
  open,
  close,
  morphologySteps,
  createStructElement,
  checkErosionCondition,
  checkDilationCondition,
  reflectStructElement,
  type MorphologyStep,
} from '@/lib/algorithms/morphology';
import type { GrayscaleImage, StructElement } from '@/lib/algorithms/types';
import { useGridNavigation } from '@/hooks/useGridNavigation';

// ========== 类型定义 ==========

type MorphologyOperation = 'erode' | 'dilate' | 'open' | 'close';
type SeShape = 'rectangle' | 'cross' | 'ellipse';
type MorphologyTask = 'removeNoise' | 'connectCrack' | 'fillHole';
type MorphologyViewMode = 'theory' | 'task';

const OPERATION_LABELS: Record<MorphologyOperation, string> = {
  erode: '腐蚀 (Erosion)',
  dilate: '膨胀 (Dilation)',
  open: '开操作 (Opening)',
  close: '闭操作 (Closing)',
};

const OPERATION_OPS: { value: string; label: string }[] = [
  { value: 'erode', label: '腐蚀 (Erode)' },
  { value: 'dilate', label: '膨胀 (Dilate)' },
  { value: 'open', label: '开操作 (Open)' },
  { value: 'close', label: '闭操作 (Close)' },
];

const SHAPE_LABELS: Record<SeShape, string> = {
  rectangle: '矩形 (MORPH_RECT)',
  cross: '十字 (MORPH_CROSS)',
  ellipse: '椭圆 (MORPH_ELLIPSE)',
};

const SHAPE_OPS: { value: string; label: string }[] = [
  { value: 'rectangle', label: '矩形 (MORPH_RECT)' },
  { value: 'cross', label: '十字 (MORPH_CROSS)' },
  { value: 'ellipse', label: '椭圆 (MORPH_ELLIPSE)' },
];

const TASK_LABELS: Record<MorphologyTask, string> = {
  removeNoise: '噪点去除（开操作）',
  connectCrack: '裂缝连接（闭操作）',
  fillHole: '小孔填补（闭操作）',
};

const TASK_HINTS: Record<MorphologyTask, string> = {
  removeNoise: '孤立小点不属于主体目标，通常先腐蚀去掉，再膨胀恢复主体。',
  connectCrack: '目标内部存在细小断裂，通常先膨胀连接裂缝，再腐蚀恢复轮廓。',
  fillHole: '目标内部有小孔洞，闭操作可以先扩张边界填孔，再回收外轮廓。',
};

const TASK_RECOMMENDED_OPERATION: Record<MorphologyTask, MorphologyOperation> = {
  removeNoise: 'open',
  connectCrack: 'close',
  fillHole: 'close',
};

const TASK_RECOMMENDED_REASON: Record<MorphologyTask, string> = {
  removeNoise: '孤立噪点尺度比主体小，先腐蚀能去掉小点，再膨胀把主体大致恢复回来。',
  connectCrack: '裂缝本质是前景中的小缺口，先膨胀能把断裂处接上，再腐蚀收回边界。',
  fillHole: '小孔洞是前景内部的背景空缺，闭操作能优先填补内部空洞，再维持整体轮廓。',
};

const TASK_OPS: { value: string; label: string }[] = [
  { value: 'removeNoise', label: TASK_LABELS.removeNoise },
  { value: 'connectCrack', label: TASK_LABELS.connectCrack },
  { value: 'fillHole', label: TASK_LABELS.fillHole },
];

// ========== 代码示例 ==========

const ERODE_CODE_TS = `/** 腐蚀：取结构元素邻域内的最小值
 *  集合定义: A Θ B = {z | (B)_z ⊆ A}
 */
function erode(image: number[][], structElement: StructElement): number[][] {
  const height = image.length;
  const width = image[0].length;
  const se = createStructElement(structElement.shape, structElement.size);
  const seSize = structElement.size;
  const center = Math.floor(seSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 1;
      for (let sy = 0; sy < seSize; sy++) {
        for (let sx = 0; sx < seSize; sx++) {
          if (!se[sy][sx]) continue;
          const px = x + sx - center;
          const py = y + sy - center;
          const pixelVal =
            px >= 0 && px < width && py >= 0 && py < height
              ? image[py][px]
              : 0;
          minVal = Math.min(minVal, pixelVal);
        }
      }
      result[y][x] = minVal;
    }
  }
  return result;
}`;

const DILATE_CODE_TS = `/** 膨胀：取结构元素邻域内的最大值
 *  集合定义: A ⊕ B = {z | (B_hat)_z ∩ A ≠ ∅}
 */
function dilate(image: number[][], structElement: StructElement): number[][] {
  const height = image.length;
  const width = image[0].length;
  const se = createStructElement(structElement.shape, structElement.size);
  const seSize = structElement.size;
  const center = Math.floor(seSize / 2);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      for (let sy = 0; sy < seSize; sy++) {
        for (let sx = 0; sx < seSize; sx++) {
          if (!se[sy][sx]) continue;
          const px = x + sx - center;
          const py = y + sy - center;
          const pixelVal =
            px >= 0 && px < width && py >= 0 && py < height
              ? image[py][px]
              : 0;
          maxVal = Math.max(maxVal, pixelVal);
        }
      }
      result[y][x] = maxVal;
    }
  }
  return result;
}`;

const OPEN_CODE_TS = `/** 开操作：先腐蚀后膨胀
 *  集合定义: A ○ B = (A Θ B) ⊕ B
 */
function open(image: number[][], structElement: StructElement): number[][] {
  const eroded = erode(image, structElement);
  return dilate(eroded, structElement);
}`;

const CLOSE_CODE_TS = `/** 闭操作：先膨胀后腐蚀
 *  集合定义: A • B = (A ⊕ B) Θ B
 */
function close(image: number[][], structElement: StructElement): number[][] {
  const dilated = dilate(image, structElement);
  return erode(dilated, structElement);
}`;

// ========== 辅助函数 ==========

function createBinaryCanvas(size: number = 16): GrayscaleImage {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function fillRect(image: GrayscaleImage, x1: number, y1: number, x2: number, y2: number): void {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      image[y][x] = 1;
    }
  }
}

function createMorphologyTaskImage(task: MorphologyTask): GrayscaleImage {
  const image = createBinaryCanvas();

  if (task === 'removeNoise') {
    fillRect(image, 5, 5, 10, 10);
    image[2][3] = 1;
    image[3][12] = 1;
    image[12][4] = 1;
    image[13][13] = 1;
    image[5][11] = 1;
    return image;
  }

  if (task === 'connectCrack') {
    fillRect(image, 3, 4, 12, 11);
    for (let y = 5; y <= 10; y++) image[y][8] = 0;
    image[7][7] = 0;
    image[8][9] = 0;
    return image;
  }

  fillRect(image, 3, 3, 12, 12);
  fillRect(image, 7, 7, 8, 8);
  image[6][8] = 0;
  image[8][6] = 0;
  return image;
}

function createMorphologyPrincipleImage(): GrayscaleImage {
  const image = createBinaryCanvas();
  fillRect(image, 4, 4, 11, 11);
  image[3][8] = 1;
  image[8][12] = 1;
  image[7][7] = 0;
  image[7][8] = 0;
  image[12][3] = 1;
  return image;
}

function applyMorphologyOperation(
  image: GrayscaleImage,
  structElement: StructElement,
  operation: MorphologyOperation
): GrayscaleImage {
  switch (operation) {
    case 'erode':
      return erode(image, structElement);
    case 'dilate':
      return dilate(image, structElement);
    case 'open':
      return open(image, structElement);
    case 'close':
      return close(image, structElement);
  }
}

function countChangedPixels(base: GrayscaleImage, next: GrayscaleImage): number {
  let changed = 0;
  for (let y = 0; y < base.length; y++) {
    for (let x = 0; x < (base[y]?.length ?? 0); x++) {
      if (base[y][x] !== next[y]?.[x]) changed++;
    }
  }
  return changed;
}

function createChangeMap(base: GrayscaleImage, next: GrayscaleImage): GrayscaleImage {
  return base.map((row, y) =>
    row.map((value, x) => (value !== next[y]?.[x] ? 1 : 0))
  );
}

function findRepresentativeFocusPoint(
  base: GrayscaleImage,
  next: GrayscaleImage
): { x: number; y: number } | null {
  const height = base.length;
  const width = base[0]?.length ?? 0;
  if (height === 0 || width === 0) return null;

  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const changedPoints: { x: number; y: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (base[y][x] !== next[y]?.[x]) {
        changedPoints.push({ x, y });
      }
    }
  }

  if (changedPoints.length === 0) {
    return { x: Math.floor(centerX), y: Math.floor(centerY) };
  }

  return changedPoints.reduce((best, point) => {
    const bestDistance = Math.abs(best.x - centerX) + Math.abs(best.y - centerY);
    const currentDistance = Math.abs(point.x - centerX) + Math.abs(point.y - centerY);
    return currentDistance < bestDistance ? point : best;
  });
}

function getVisibleStructRegion(
  x: number,
  y: number,
  size: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const center = Math.floor(size / 2);
  const left = Math.max(0, x - center);
  const top = Math.max(0, y - center);
  const right = Math.min(imageWidth - 1, x + center);
  const bottom = Math.min(imageHeight - 1, y + center);

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1),
  };
}

/** 获取矩阵网格中单元格的样式类 */
function getCellClass(size: number): string {
  if (size >= 7) return 'w-6 h-6 text-[8px]';
  if (size >= 5) return 'w-8 h-8 text-[10px]';
  return 'w-10 h-10 text-xs';
}

/** 格式化像素值用于显示 */
function formatPixelVal(val: number): string {
  return val.toFixed(0);
}

/** 构建当前步骤的主公式 MathML */
function buildStepFormulaMathML(
  x: number,
  y: number,
  op: 'erode' | 'dilate',
  outputValue: number
): string {
  if (op === 'erode') {
    return buildInlineMathML(`
      <mrow>
        <mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
        <mo>=</mo>
        <mo form="prefix">min</mo>
        <mo>{</mo>
        <mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
        <mo>|</mo>
        <mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>&#x2208;</mo><msub><mi>N</mi><mi>B</mi></msub>
        <mo>}</mo>
        <mo>=</mo>
        <mn>${outputValue.toFixed(0)}</mn>
      </mrow>
    `);
  }
  return buildInlineMathML(`
    <mrow>
      <mi>G</mi><mo>(</mo><mn>${x}</mn><mo>,</mo><mn>${y}</mn><mo>)</mo>
      <mo>=</mo>
      <mo form="prefix">max</mo>
      <mo>{</mo>
      <mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      <mo>|</mo>
      <mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>&#x2208;</mo><msub><mi>N</mi><mi>B</mi></msub>
      <mo>}</mo>
      <mo>=</mo>
      <mn>${outputValue.toFixed(0)}</mn>
    </mrow>
  `);
}

// ========== 主页面组件 ==========

export default function MorphologyPage() {
  const [viewMode, setViewMode] = useState<MorphologyViewMode>('theory');
  const [task, setTask] = useState<string>('removeNoise');
  const [operation, setOperation] = useState<string>('open');
  const [seShape, setSeShape] = useState<string>('rectangle');
  const [seSize, setSeSize] = useState(3);
  const currentTask = task as MorphologyTask;
  const recommendedOperation = TASK_RECOMMENDED_OPERATION[currentTask];
  const effectiveOperation: MorphologyOperation =
    viewMode === 'task' ? recommendedOperation : (operation as MorphologyOperation);

  const originalImage = useMemo(
    () =>
      viewMode === 'theory'
        ? createMorphologyPrincipleImage()
        : createMorphologyTaskImage(task as MorphologyTask),
    [task, viewMode]
  );

  const structElement = useMemo(
    () => ({ shape: seShape as SeShape, size: seSize }),
    [seShape, seSize]
  );

  // 每个操作的结果图像
  const resultImage = useMemo(() => {
    if (!originalImage || originalImage.length === 0) return [];
    return applyMorphologyOperation(
      originalImage,
      structElement,
      effectiveOperation
    );
  }, [originalImage, effectiveOperation, structElement]);

  // 中间结果（开/闭操作的第一阶段输出）
  const intermediateImage = useMemo(() => {
    if (!originalImage || originalImage.length === 0) return null;
    if (effectiveOperation === 'open') {
      return erode(originalImage, structElement);
    }
    if (effectiveOperation === 'close') {
      return dilate(originalImage, structElement);
    }
    return null;
  }, [originalImage, effectiveOperation, structElement]);

  const recommendedResultImage = useMemo(() => {
    if (!originalImage || originalImage.length === 0) return [];
    return applyMorphologyOperation(originalImage, structElement, recommendedOperation);
  }, [originalImage, structElement, recommendedOperation]);

  const recommendedIntermediateImage = useMemo(() => {
    if (!originalImage || originalImage.length === 0) return null;
    if (recommendedOperation === 'open') return erode(originalImage, structElement);
    if (recommendedOperation === 'close') return dilate(originalImage, structElement);
    return null;
  }, [originalImage, structElement, recommendedOperation]);

  const operationChain = useMemo(() => {
    if (!originalImage || originalImage.length === 0) return [];
    const erodedImage = erode(originalImage, structElement);
    const dilatedImage = dilate(originalImage, structElement);
    const openedImage = open(originalImage, structElement);
    const closedImage = close(originalImage, structElement);

    return [
      { label: '原图', image: originalImage, changed: 0, changeMap: createBinaryCanvas() },
      {
        label: '腐蚀',
        image: erodedImage,
        changed: countChangedPixels(originalImage, erodedImage),
        changeMap: createChangeMap(originalImage, erodedImage),
      },
      {
        label: '膨胀',
        image: dilatedImage,
        changed: countChangedPixels(originalImage, dilatedImage),
        changeMap: createChangeMap(originalImage, dilatedImage),
      },
      {
        label: '开操作',
        image: openedImage,
        changed: countChangedPixels(originalImage, openedImage),
        changeMap: createChangeMap(originalImage, openedImage),
      },
      {
        label: '闭操作',
        image: closedImage,
        changed: countChangedPixels(originalImage, closedImage),
        changeMap: createChangeMap(originalImage, closedImage),
      },
    ];
  }, [originalImage, structElement]);

  // 输入图像尺寸
  const inputWidth = originalImage?.[0]?.length ?? 0;
  const inputHeight = originalImage?.length ?? 0;

  // 步骤生成器
  const steps = useMemo(() => {
    if (!originalImage || originalImage.length === 0) return [];
    const generator = morphologySteps(
      originalImage,
      structElement,
      effectiveOperation
    );
    return Array.from(generator);
  }, [originalImage, effectiveOperation, structElement]);

  const totalSteps = steps.length;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const taskRepresentativePoint = useMemo(
    () =>
      viewMode === 'task' && originalImage.length > 0 && resultImage.length > 0
        ? findRepresentativeFocusPoint(originalImage, resultImage)
        : null,
    [viewMode, originalImage, resultImage]
  );

  const taskStepIndex = useMemo(() => {
    if (viewMode !== 'task' || steps.length === 0) return 0;

    const targetPhase = effectiveOperation === 'open' || effectiveOperation === 'close' ? 'second' : 'first';

    if (taskRepresentativePoint) {
      const exactMatchIndex = steps.findIndex(
        (step) =>
          step.phase === targetPhase &&
          step.x === taskRepresentativePoint.x &&
          step.y === taskRepresentativePoint.y
      );
      if (exactMatchIndex !== -1) return exactMatchIndex;
    }

    const phaseStartIndex = steps.findIndex((step) => step.phase === targetPhase);
    return phaseStartIndex !== -1 ? phaseStartIndex : 0;
  }, [viewMode, steps, taskRepresentativePoint, effectiveOperation]);

  const activeStepIndex = viewMode === 'task' ? taskStepIndex : currentStepIndex;
  const currentStep: MorphologyStep | null = steps[activeStepIndex] ?? null;

  useEffect(() => {
    if (viewMode === 'theory') {
      setCurrentStepIndex(0);
    }
  }, [task, operation, seShape, seSize, viewMode]);

  // 判断当前是高亮哪种操作类型
  const isErode = currentStep?.operation === 'erode';
  const isComposite = effectiveOperation === 'open' || effectiveOperation === 'close';
  const isFirstPhase = currentStep?.phase === 'first';
  const isSecondPhase = currentStep?.phase === 'second';

  // 计算当前步骤在图像维度上的边界（与输出图像同大小）
  const outputWidth = inputWidth;
  const outputHeight = inputHeight;

  const handleTaskChange = useCallback((nextTask: string) => {
    setTask(nextTask);
    setOperation(nextTask === 'removeNoise' ? 'open' : 'close');
  }, []);

  const modeHeader = useMemo(() => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">页面结构切换</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            先用原理演示理解结构元素与开闭操作，再看应用示例中的典型任务结果。
          </p>
        </div>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('theory')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              viewMode === 'theory'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            原理演示
          </button>
          <button
            type="button"
            onClick={() => setViewMode('task')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              viewMode === 'task'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            应用示例
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-medium text-sky-700">
          原理演示：聚焦集合判定、结构元素和平移/反射关系
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700">
          应用示例：展示噪点去除、裂缝连接、小孔填补等典型任务结果
        </span>
      </div>
    </div>
  ), [viewMode]);

  const parameterIntro = viewMode === 'theory'
    ? '这一栏只保留会影响原理演示的参数，重点观察结构元素如何滑动并决定输出像素。'
    : '这一栏用于切换任务场景并查看对应演示配置；任务页使用固定观察窗口展示局部区域与结果的对应关系。';

  // 使用 useGridNavigation 钩子
  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.x, y: currentStep.y } : null,
    bounds: { width: outputWidth, height: outputHeight },
    onMove: useCallback(
      (point) => {
        // 在当前阶段中查找匹配的步骤
        const currentPhase = currentStep?.phase ?? 'first';
        const index = steps.findIndex(
          s => s.x === point.x && s.y === point.y && s.phase === currentPhase
        );
        if (index !== -1) setCurrentStepIndex(index);
      },
      [steps, currentStep]
    ),
    disabled: totalSteps === 0 || viewMode === 'task',
  });

  // 图像点击处理
  const handleInputRegionSelect = useCallback(
    (x: number, y: number) => {
      if (viewMode === 'task') return;
      if (totalSteps === 0) return;
      const currentPhase = currentStep?.phase ?? 'first';
      const index = steps.findIndex(
        s => s.x === x && s.y === y && s.phase === currentPhase
      );
      if (index !== -1) setCurrentStepIndex(index);
    },
    [steps, currentStep, totalSteps, viewMode]
  );

  const handleOutputPixelSelect = useCallback(
    (x: number, y: number) => {
      if (viewMode === 'task') return;
      if (totalSteps === 0) return;
      // 对于复合操作，选择第二阶段对应位置的步骤
      const targetPhase = isComposite ? 'second' : 'first';
      const index = steps.findIndex(
        s => s.x === x && s.y === y && s.phase === targetPhase
      );
      if (index !== -1) setCurrentStepIndex(index);
    },
    [steps, isComposite, totalSteps, viewMode]
  );

  // ========== analysisPreview: ProcessRail + FlowColumns + FlowNode ==========
  const analysisPreview = useMemo(() => {
    if (!currentStep || viewMode === 'task') return null;

    const { x, y, inputRegion, structElement: se, outputValue, operation: stepOp, phase } = currentStep;
    const size = se.length;
    const center = Math.floor(size / 2);
    const cellClass = getCellClass(size);
    const zoomDisplaySize = size >= 7 ? 120 : Math.min(150, Math.max(112, size * 30));
    const activeValues = inputRegion.flatMap((row, ry) =>
      row.filter((_, rx) => se[ry][rx])
    );
    const activeForegroundCount = activeValues.filter(v => v === 1).length;
    const activeBackgroundCount = activeValues.filter(v => v === 0).length;

    // 检查腐蚀/膨胀的集合条件
    const erosionOk = checkErosionCondition(inputRegion, se);
    const dilationOk = checkDilationCondition(inputRegion, se);
    const isErosionStep = stepOp === 'erode';

    // 阶段标签
    const phaseLabel = isComposite
      ? phase === 'first'
        ? isErosionStep
          ? '第1步：腐蚀'
          : '第1步：膨胀'
        : isErosionStep
          ? '第2步：腐蚀'
          : '第2步：膨胀'
      : isErosionStep
        ? '腐蚀'
        : '膨胀';

    return (
      <ProcessRail>
        <FlowColumns>
          {/* 列 1: 输入邻域（红色调） */}
          <FlowColumn align="start">
            <FlowNode tone="red">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-red-700">
                  {phaseLabel} - 输入邻域
                </span>
                <span className="font-mono text-[11px] text-red-600">
                  {size}&#x00D7;{size}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div>
                  <ImageCanvas
                    image={inputRegion}
                    maxDisplaySize={zoomDisplaySize}
                    showGrid
                    containerClassName="conv-window-zoom conv-anchor-window-zoom"
                  />
                  <div className="mt-1 text-center text-[10px] font-medium text-red-600">
                    位置 ({x}, {y}) 的结构元素覆盖区域
                  </div>
                </div>
                <div className="max-w-[12rem] rounded-xl bg-red-50 px-3 py-2 text-center text-xs leading-5 text-red-700">
                  {isComposite && phase === 'second'
                    ? '输入为第一阶段输出的中间结果图像'
                    : '输入为原始二值图像'}
                </div>
              </div>
            </FlowNode>

            <FlowNode tone="slate">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-slate-600">邻域摘要</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {size}&#x00D7;{size}
                </span>
              </div>
              <div className="grid gap-2 text-xs text-slate-600">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-slate-400">参与前景数</div>
                    <div className="font-semibold text-slate-700">
                      {activeForegroundCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] text-red-500">参与背景数</div>
                    <div className="font-mono font-semibold text-red-700">
                      {activeBackgroundCount}
                    </div>
                  </div>
                </div>
              </div>
            </FlowNode>
          </FlowColumn>

          {/* 列 2: 结构元素与操作逻辑（琥珀色调） */}
          <FlowColumn align="center">
            <FlowNode tone="amber" className="conv-anchor-kernel-node">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-amber-800">结构元素 B</span>
                <span className="font-mono text-[11px] text-amber-700">
                  {SHAPE_LABELS[seShape as SeShape]}
                </span>
              </div>
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
              >
                {se.map((row, ry) =>
                  row.map((val, rx) => (
                    <div
                      key={`flow-se-${ry}-${rx}`}
                      className={`${cellClass} flex items-center justify-center rounded border font-mono font-semibold ${
                        val
                          ? 'border-amber-400 bg-amber-100 text-amber-800'
                          : 'border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      {val ? 1 : 0}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2 text-center text-[10px] text-amber-600">
                &#x25A0; = 激活 / &#x25A1; = 不关注
              </div>
            </FlowNode>

            <FlowNode tone="amber">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-amber-800">操作逻辑</span>
                <span className="font-mono text-[11px] text-amber-700">
                  {isErosionStep ? 'min' : 'max'}
                </span>
              </div>
              <div className="grid gap-2 text-xs">
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                  {isErosionStep
                    ? '腐蚀 = 取结构元素覆盖区域内的最小值（所有激活位置必须全是前景 1，输出才为 1）'
                    : '膨胀 = 取结构元素覆盖区域内的最大值（任意激活位置有前景 1，输出即为 1）'}
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-amber-600">集合条件判断</div>
                  <div className="mt-1 font-semibold">
                    {isErosionStep
                      ? erosionOk
                        ? <span className="text-emerald-600">满足: (B)_z &#x2286; A</span>
                        : <span className="text-red-500">不满足: (B)_z &#x2288; A</span>
                      : dilationOk
                        ? <span className="text-emerald-600">满足: (B_hat)_z &#x2229; A &#x2260; &#x2205;</span>
                        : <span className="text-red-500">不满足: (B_hat)_z &#x2229; A = &#x2205;</span>
                    }
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <span className="text-amber-700">输出值</span>
                  <span className="font-mono text-sm font-semibold text-amber-800">
                    {formatPixelVal(outputValue)}
                  </span>
                </div>
              </div>
            </FlowNode>
          </FlowColumn>

          {/* 列 3: 输出像素（翡翠色调） */}
          <FlowColumn align="end">
            <FlowNode tone="emerald" className="conv-anchor-output-node min-w-[12.75rem]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase text-emerald-700">输出像素</span>
                <span className="text-[11px] text-emerald-700">
                  位置 ({x}, {y})
                </span>
              </div>
              <div className="grid gap-2">
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-emerald-600">对应结果图绿框</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-800">
                    结果图第 {y + 1} 行，第 {x + 1} 列
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    {isErosionStep ? '腐蚀（最小值）' : '膨胀（最大值）'}
                  </div>
                  <div className="font-mono text-2xl font-bold text-emerald-700">
                    {formatPixelVal(outputValue)}
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">
                    {isErosionStep
                      ? '结构元素完全在目标内则保留前景'
                      : '结构元素与目标有交集则输出前景'}
                  </div>
                </div>
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [currentStep, seShape, isComposite, viewMode]);

  // ========== visualOverlay: AnchoredOverlay 连接线 ==========
  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (!currentStep || viewMode === 'task') return [];
    const visibleRegion = getVisibleStructRegion(
      currentStep.x,
      currentStep.y,
      seSize,
      inputWidth,
      inputHeight
    );

    return [
      {
        id: 'input-window',
        tone: 'red',
        from: {
          kind: 'region',
          selector: '.conv-anchor-input-main',
          x: visibleRegion.x,
          y: visibleRegion.y,
          size: seSize,
          width: visibleRegion.width,
          height: visibleRegion.height,
          imageWidth: inputWidth,
          imageHeight: inputHeight,
        },
        to: { kind: 'element', selector: '.conv-anchor-window-zoom' },
      },
      {
        id: 'kernel-weight',
        tone: 'amber',
        from: { kind: 'element', selector: '.conv-anchor-main-operator' },
        to: { kind: 'element', selector: '.conv-anchor-kernel-node' },
      },
      {
        id: 'output-write',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: currentStep.x,
          y: currentStep.y,
          imageWidth: outputWidth,
          imageHeight: outputHeight,
        },
        to: { kind: 'element', selector: '.conv-anchor-output-node' },
      },
    ];
  }, [currentStep, inputHeight, inputWidth, seSize, outputHeight, outputWidth, viewMode]);

  const visualOverlay =
    visualOverlayPaths.length > 0 ? (
      <AnchoredOverlay paths={visualOverlayPaths} />
    ) : null;

  // ========== stepDetails: TeachingCard 区域 ==========
  const stepDetails = useMemo(() => {
    if (!currentStep) {
      return (
        <div className="py-8 text-center text-slate-400">
          选择参数并移动窗口以查看步骤详情
        </div>
      );
    }

    const { x, y, inputRegion, structElement: se, outputValue, operation: stepOp, phase } = currentStep;
    const size = se.length;
    const center = Math.floor(size / 2);
    const cellClass = getCellClass(size);
    const isErosionStep = stepOp === 'erode';
    const activeValues = inputRegion.flatMap((row, ry) =>
      row.filter((_, rx) => se[ry][rx])
    );
    const minVal = Math.min(...activeValues);
    const maxVal = Math.max(...activeValues);

    // 构建公式中的常量
    const stepFormula = buildStepFormulaMathML(x, y, stepOp, outputValue);

    // 腐蚀集合公式
    const erosionSetFormula = buildInlineMathML(`
      <mrow>
        <mi>A</mi><mo>&#x0398;</mo><mi>B</mi>
        <mo>=</mo>
        <mo>{</mo><mi>z</mi><mo>|</mo><msub><mrow><mo>(</mo><mi>B</mi><mo>)</mo></mrow><mi>z</mi></msub><mo>&#x2286;</mo><mi>A</mi><mo>}</mo>
      </mrow>
    `);

    // 膨胀集合公式
    const dilationSetFormula = buildInlineMathML(`
      <mrow>
        <mi>A</mi><mo>&#x2295;</mo><mi>B</mi>
        <mo>=</mo>
        <mo>{</mo><mi>z</mi><mo>|</mo><msub><mrow><mo>(</mo><mover><mi>B</mi><mo>^</mo></mover><mo>)</mo></mrow><mi>z</mi></msub><mo>&#x2229;</mo><mi>A</mi><mo>&#x2260;</mo><mo>&#x2205;</mo><mo>}</mo>
      </mrow>
    `);

    // 开操作公式
    const openFormula = buildInlineMathML(`
      <mrow>
        <mi>A</mi><mo>&#x25CB;</mo><mi>B</mi>
        <mo>=</mo>
        <mo>(</mo><mi>A</mi><mo>&#x0398;</mo><mi>B</mi><mo>)</mo>
        <mo>&#x2295;</mo><mi>B</mi>
      </mrow>
    `);

    // 闭操作公式
    const closeFormula = buildInlineMathML(`
      <mrow>
        <mi>A</mi><mo>&#x2022;</mo><mi>B</mi>
        <mo>=</mo>
        <mo>(</mo><mi>A</mi><mo>&#x2295;</mo><mi>B</mi><mo>)</mo>
        <mo>&#x0398;</mo><mi>B</mi>
      </mrow>
    `);

    const setBasicFormula = buildInlineMathML(`
      <mrow>
        <mi>A</mi><mo>&#x222A;</mo><mi>B</mi><mo>,</mo>
        <mi>A</mi><mo>&#x2229;</mo><mi>B</mi><mo>,</mo>
        <msup><mi>A</mi><mi>c</mi></msup><mo>,</mo>
        <mi>A</mi><mo>-</mo><mi>B</mi>
      </mrow>
    `);

    // 结构元素反射公式
    const reflectFormula = buildInlineMathML(`
      <mrow>
        <mover><mi>B</mi><mo>^</mo></mover>
        <mo>=</mo>
        <mo>{</mo><mi>w</mi><mo>|</mo><mi>w</mi><mo>=</mo><mo>-</mo><mi>b</mi><mo>,</mo><mi>b</mi><mo>&#x2208;</mo><mi>B</mi><mo>}</mo>
      </mrow>
    `);

    // 集合平移公式
    const translateFormula = buildInlineMathML(`
      <mrow>
        <msub><mrow><mo>(</mo><mi>A</mi><mo>)</mo></mrow><mi>z</mi></msub>
        <mo>=</mo>
        <mo>{</mo><mi>c</mi><mo>|</mo><mi>c</mi><mo>=</mo><mi>a</mi><mo>+</mo><mi>z</mi><mo>,</mo><mi>a</mi><mo>&#x2208;</mo><mi>A</mi><mo>}</mo>
      </mrow>
    `);

    // 计算结构元素反射矩阵
    const seReflected = reflectStructElement(se);

    if (viewMode === 'task') {
      return (
        <div className="space-y-4">
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">任务场景与对应操作</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  这一页展示任务场景、对应操作与最终结果之间的关系，不进行逐像素步骤推导。
                </p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                任务演示
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  任务现象
                </div>
                <div className="mt-2 text-base font-semibold text-slate-800">
                  {TASK_LABELS[currentTask]}
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  {TASK_HINTS[currentTask]}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                  对应操作
                </div>
                <div className="mt-2 text-base font-semibold text-emerald-800">
                  {OPERATION_LABELS[recommendedOperation]}
                </div>
                <p className="mt-2 text-xs leading-6 text-emerald-800">
                  {TASK_RECOMMENDED_REASON[currentTask]}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600">
                  观察方式
                </div>
                <div className="mt-2 text-base font-semibold text-amber-800">
                  代表位置演示
                </div>
                <p className="mt-2 text-xs leading-6 text-amber-800">
                  界面固定展示一个代表性局部位置，用来对应原图局部区域、结构元素与结果图输出。
                </p>
              </div>
            </div>
          </TeachingCard>

          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">代表位置观察</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  下面这个局部窗口用于观察该任务下局部区域与结果图之间的对应关系。
                </p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                结果图该点输出 {formatPixelVal(outputValue)}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
              <div className="rounded-2xl border border-red-200 bg-red-50/55 p-4">
                <div className="text-sm font-semibold text-red-700">原图中的局部窗口</div>
                <div className="mt-1 text-[11px] text-red-600">
                  第 {Math.max(0, y - center) + 1} 到 {Math.min(inputHeight, y + center + 1)} 行，
                  第 {Math.max(0, x - center) + 1} 到 {Math.min(inputWidth, x + center + 1)} 列
                </div>
                <div
                  className="mt-3 inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                >
                  {inputRegion.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`task-input-${ry}-${rx}`}
                        className={`${cellClass} flex items-center justify-center rounded border font-mono ${
                          rx === center && ry === center
                            ? 'border-red-400 bg-white text-red-700 font-bold'
                            : 'border-red-200 bg-white/90 text-slate-700'
                        }`}
                      >
                        {formatPixelVal(val)}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-4">
                <div className="text-sm font-semibold text-amber-800">本任务使用的结构元素</div>
                <div className="mt-1 text-[11px] text-amber-700">
                  {SHAPE_LABELS[seShape as SeShape]} · {size}&#x00D7;{size}
                </div>
                <div
                  className="mt-3 inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                >
                  {se.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`task-se-${ry}-${rx}`}
                        className={`${cellClass} flex items-center justify-center rounded border font-mono ${
                          val
                            ? 'border-amber-400 bg-amber-100 text-amber-800 font-semibold'
                            : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {val ? 1 : 0}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-4">
                <div className="text-sm font-semibold text-emerald-800">为什么这个位置能说明问题</div>
                <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-3">
                  <div className="text-[11px] text-emerald-600">当前操作</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-800">
                    {OPERATION_LABELS[recommendedOperation]}
                  </div>
                  <div className="mt-3 text-[11px] text-emerald-600">结果图对应位置</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                    {formatPixelVal(outputValue)}
                  </div>
                </div>

                <div className="mt-3 text-xs leading-6 text-slate-600">
                  {isErosionStep
                    ? `在这个局部区域里，只要结构元素覆盖到背景 0，腐蚀结果就会压成 0。这正适合去掉孤立噪点或细小突起。`
                    : `在这个局部区域里，只要结构元素覆盖到前景 1，膨胀结果就能扩展出去。这正适合连接裂缝或填补小孔周围的缺口。`}
                </div>
              </div>
            </div>
          </TeachingCard>

          {recommendedIntermediateImage && recommendedResultImage && (
            <TeachingCard>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">处理过程展示</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    下图展示该任务在当前结构元素下的处理过程。
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr]">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">原始任务图</div>
                  <ImageCanvas image={originalImage} maxDisplaySize={120} showGrid />
                </div>
                <div className="hidden items-center text-slate-300 xl:flex">&#x2192;</div>
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xs font-semibold text-amber-800">
                    第1步：{recommendedOperation === 'open' ? '腐蚀' : '膨胀'}
                  </div>
                  <ImageCanvas image={recommendedIntermediateImage} maxDisplaySize={120} showGrid />
                </div>
                <div className="hidden items-center text-slate-300 xl:flex">&#x2192;</div>
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-semibold text-emerald-800">
                    第2步：{recommendedOperation === 'open' ? '膨胀' : '腐蚀'}
                  </div>
                  <ImageCanvas image={recommendedResultImage} maxDisplaySize={120} showGrid />
                </div>
              </div>
            </TeachingCard>
          )}

          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">同一任务下的结果对比</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  保持同一张任务图不变，对比不同操作的最终结果以及变化位置。
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {operationChain.map(item => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 ${
                    item.label === '开操作' && recommendedOperation === 'open'
                      ? 'border-emerald-300 bg-emerald-50'
                      : item.label === '闭操作' && recommendedOperation === 'close'
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-700">{item.label}</div>
                  <ImageCanvas image={item.image} maxDisplaySize={105} showGrid />
                  <div className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    改变 {item.changed} 个像素
                  </div>
                  {item.label !== '原图' && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[10px] text-slate-400">变化位置</div>
                      <ImageCanvas image={item.changeMap} maxDisplaySize={58} showGrid />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TeachingCard>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 当前步骤计算公式 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {isComposite
                  ? phase === 'first'
                    ? `开/闭操作 - 第1步：${isErosionStep ? '腐蚀' : '膨胀'}`
                    : `开/闭操作 - 第2步：${isErosionStep ? '腐蚀' : '膨胀'}`
                  : `当前步骤：${isErosionStep ? '腐蚀' : '膨胀'}`}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                下方展示位置 ({x}, {y}) 处结构元素覆盖邻域、计算过程及输出值。
                {isComposite && phase === 'second' && ' 此阶段输入为第一步输出的中间结果。'}
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              输出值 {formatPixelVal(outputValue)}
            </div>
          </div>

          <FormulaCard
            mathML={stepFormula}
            className="mx-auto mt-4 max-w-4xl"
            mathClassName="[&_math]:text-lg sm:[&_math]:text-xl"
          />

          <div className="mt-3 space-y-2 text-xs leading-6 text-slate-600">
            <p>
              当前结构元素（{size}&#x00D7;{size} {SHAPE_LABELS[seShape as SeShape]}）以像素 ({x}, {y}) 为中心，
              覆盖图像第 {Math.max(0, y - center) + 1} 到 {Math.min(inputHeight, y + center + 1)} 行、
              第 {Math.max(0, x - center) + 1} 到 {Math.min(inputWidth, x + center + 1)} 列区域。
              若结构元素落到图像外，越界位置按背景 0 处理。
            </p>
            <p>
              {isErosionStep
                ? `腐蚀取该区域内的最小值：min = ${minVal.toFixed(0)}，这意味着只有当结构元素完全落在前景内时，输出才为 1。`
                : `膨胀取该区域内的最大值：max = ${maxVal.toFixed(0)}，这意味着只要结构元素与前景有交集，输出即为 1。`}
            </p>
          </div>
        </TeachingCard>

        {isComposite && intermediateImage && resultImage && (
          <TeachingCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">复合操作的两阶段结果</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {operation === 'open'
                    ? '开操作不是一个单独的新计算，而是先腐蚀，再对腐蚀结果做膨胀。'
                    : '闭操作不是一个单独的新计算，而是先膨胀，再对膨胀结果做腐蚀。'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">原图 A</div>
                <ImageCanvas image={originalImage} maxDisplaySize={120} showGrid />
              </div>
              <div className="hidden items-center text-slate-300 xl:flex">&#x2192;</div>
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-800">
                  第1步：{operation === 'open' ? '腐蚀' : '膨胀'}
                </div>
                <ImageCanvas image={intermediateImage} maxDisplaySize={120} showGrid />
              </div>
              <div className="hidden items-center text-slate-300 xl:flex">&#x2192;</div>
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs font-semibold text-emerald-800">
                  第2步：{operation === 'open' ? '膨胀' : '腐蚀'}
                </div>
                <ImageCanvas image={resultImage} maxDisplaySize={120} showGrid />
              </div>
            </div>
          </TeachingCard>
        )}

        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">同一二值图的操作对比</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                下面固定使用当前结构元素，对同一张任务图比较腐蚀、膨胀、开操作和闭操作；“改变像素”表示相对原图发生变化的位置数。
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {operationChain.map(item => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="text-xs font-semibold text-slate-700">{item.label}</div>
                <ImageCanvas image={item.image} maxDisplaySize={105} showGrid />
                <div className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  改变 {item.changed} 个像素
                </div>
                {item.label !== '原图' && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-slate-400">变化位置</div>
                    <ImageCanvas image={item.changeMap} maxDisplaySize={58} showGrid />
                  </div>
                )}
              </div>
            ))}
          </div>
        </TeachingCard>

        {/* 当前步骤可视化：输入邻域 / 结构元素 / 输出 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">步骤可视化展开</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                左侧输入邻域、中间结构元素、右侧输出像素，三者对应展示当前步骤的完整计算过程。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {isErosionStep ? '腐蚀 (min)' : '膨胀 (max)'}
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.7fr)]">
            {/* 输入邻域 */}
            <div className="rounded-2xl border border-red-200 bg-red-50/55 p-3">
              <div className="text-sm font-semibold text-red-700">输入邻域</div>
              <div className="mt-1 text-[11px] text-red-600">
                以 ({x}, {y}) 为中心的 {size}&#x00D7;{size} 区域
              </div>
              <div
                className="mt-3 inline-grid gap-1"
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
              >
                {inputRegion.map((row, ry) =>
                  row.map((val, rx) => (
                    <div
                      key={`input-${ry}-${rx}`}
                      className={`${cellClass} flex flex-col items-center justify-center rounded border font-mono ${
                        rx === center && ry === center
                          ? 'border-red-400 bg-white text-red-700 font-bold'
                          : se[ry][rx] && val === (isErosionStep ? minVal : maxVal)
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : !se[ry][rx]
                              ? 'border-slate-200 bg-slate-50 text-slate-300'
                            : 'border-red-200 bg-white/90 text-slate-700'
                      }`}
                    >
                      {formatPixelVal(val)}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                {isErosionStep ? '琥珀色 = 参与格最小值' : '琥珀色 = 参与格最大值'} / 灰色 = 结构元素不关注
              </div>
            </div>

            {/* 结构元素 */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-3">
              <div className="text-sm font-semibold text-amber-800">结构元素 B</div>
              <div className="mt-1 text-[11px] text-amber-700">
                {SHAPE_LABELS[seShape as SeShape]} &#x2022; {size}&#x00D7;{size}
              </div>
              <div
                className="mt-3 inline-grid gap-1"
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
              >
                {se.map((row, ry) =>
                  row.map((val, rx) => (
                    <div
                      key={`se-${ry}-${rx}`}
                      className={`${cellClass} flex items-center justify-center rounded border font-mono ${
                        val
                          ? 'border-amber-400 bg-amber-100 text-amber-800 font-semibold'
                          : 'border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      {val ? 1 : 0}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2 text-[10px] text-amber-700">
                &#x25A0; = 激活（参与运算） / &#x25A1; = 不关注
              </div>
            </div>

            {/* 输出像素 */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3">
              <div className="text-sm font-semibold text-emerald-800">输出像素</div>
              <div className="mt-2 rounded-xl border border-emerald-200 bg-white px-3 py-3">
                <div className="text-[11px] text-emerald-600">
                  {isErosionStep ? '腐蚀结果（min）' : '膨胀结果（max）'}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                  {formatPixelVal(outputValue)}
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  {isErosionStep
                    ? '结构元素全部激活位置对应邻域值均 = 1 时，输出才为 1。'
                    : '结构元素任意激活位置对应邻域值 = 1 时，输出即为 1。'}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  写入结果图第 {y + 1} 行 / 第 {x + 1} 列
                </div>
              </div>
            </div>
          </div>
        </TeachingCard>

        {/* 结构元素反射 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">结构元素反射 B_hat</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                膨胀操作需先对结构元素做关于原点反射。对于中心对称的形状（矩形、椭圆），反射前后相同；十字形状也中心对称。
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)]">
            <div>
              <FormulaCard mathML={reflectFormula} className="mt-2" />
            </div>
            <div className="flex items-start gap-6">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-2">原始 B</div>
                <div
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                >
                  {se.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`se-raw-${ry}-${rx}`}
                        className={`${cellClass} flex items-center justify-center rounded border font-mono ${
                          val
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {val ? 1 : 0}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-8 text-slate-400 text-lg">&#x2192;</div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-2">反射后 B_hat</div>
                <div
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                >
                  {seReflected.map((row, ry) =>
                    row.map((val, rx) => (
                      <div
                        key={`se-ref-${ry}-${rx}`}
                        className={`${cellClass} flex items-center justify-center rounded border font-mono ${
                          val
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {val ? 1 : 0}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            结构元素反射用于膨胀运算：先将 B 关于原点反射得 B_hat，再将 B_hat 平移到位置 z，
            若 B_hat_z 与目标集合 A 有交集（至少一个像素重合），则该位置 z 被纳入膨胀结果。
          </p>
        </TeachingCard>

        {/* 集合论基础与公式 */}
        <TeachingCard tone="amber">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">集合论基础</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                形态学操作以集合论为基础，使用结构元素在二值图像上度量和改变目标形状。
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              集合基本运算
            </div>
            <FormulaCard mathML={setBasicFormula} className="mt-2" />
            <p className="mt-2 text-xs leading-5 text-slate-600">
              二值图像可看作前景像素集合 A：并集表示合并目标，交集表示重叠区域，补集表示背景，差集表示从目标中扣除另一部分。
            </p>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                集合平移
              </div>
              <FormulaCard mathML={translateFormula} className="mt-2" />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                (A)_z 表示将集合 A 整体平移向量 z，结构元素在图像上的滑动就是反复做集合平移。
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                结构元素反射
              </div>
              <FormulaCard mathML={reflectFormula} className="mt-2" />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                膨胀时需将结构元素关于原点取对称，然后平移并与目标集合求交集。
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                腐蚀
              </div>
              <FormulaCard mathML={erosionSetFormula} className="mt-2" />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                结构元素 B 平移到 z 后，必须完全落在集合 A 内，z 才属于腐蚀结果。
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                膨胀
              </div>
              <FormulaCard mathML={dilationSetFormula} className="mt-2" />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                B 先关于原点反射得 B_hat，再平移到 z。只要 B_hat_z 与 A 发生任何交集，z 就算作膨胀结果。
              </p>
            </div>
          </div>
        </TeachingCard>

        {/* 开操作与闭操作公式 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">开操作与闭操作</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                这两个操作由腐蚀和膨胀组合而成，用于更精细的形状处理。
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                开操作 (先腐蚀后膨胀)
              </div>
              <FormulaCard mathML={openFormula} className="mt-2" />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                先腐蚀去除小目标/细突起/孤立噪点，再膨胀恢复主体形状。适合消除噪点和分离粘连物体。
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                闭操作 (先膨胀后腐蚀)
              </div>
              <FormulaCard mathML={closeFormula} className="mt-2" />
              <p className="mt-2 text-xs leading-5 text-slate-600">
                先膨胀填充小孔/裂缝/间隙，再腐蚀恢复主体轮廓。适合连接断线和填补空洞。
              </p>
            </div>
          </div>
        </TeachingCard>

        {/* OpenCV 函数与结构元素形状说明 */}
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">OpenCV 函数参考</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                OpenCV 中相关函数与结构元素形状常量。
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-700">核心函数</div>
              <div className="mt-2 grid gap-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.erode(src, kernel, iterations=1)</code>
                  <span>腐蚀操作</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.dilate(src, kernel, iterations=1)</code>
                  <span>膨胀操作</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.morphologyEx(src, op, kernel)</code>
                  <span>通用形态学操作（含开/闭/梯度/顶帽/黑帽）</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.getStructuringElement(shape, ksize)</code>
                  <span>创建结构元素</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-700">结构元素形状常量</div>
              <div className="mt-2 grid gap-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.MORPH_RECT</code>
                  <span>矩形结构元素：所有位置均参与运算</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.MORPH_CROSS</code>
                  <span>十字形结构元素：仅中心行和中心列参与</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.MORPH_ELLIPSE</code>
                  <span>椭圆形结构元素：内切椭圆区域参与运算</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-700">morphologyEx 操作类型</div>
              <div className="mt-2 grid gap-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.MORPH_OPEN</code>
                  <span>开操作：先腐蚀后膨胀</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.MORPH_CLOSE</code>
                  <span>闭操作：先膨胀后腐蚀</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sky-700">cv2.MORPH_GRADIENT</code>
                  <span>形态学梯度：膨胀 - 腐蚀</span>
                </div>
              </div>
            </div>
          </div>
        </TeachingCard>
      </div>
    );
  }, [
    currentStep,
    task,
    viewMode,
    seSize,
    seShape,
    isComposite,
    operation,
    originalImage,
    intermediateImage,
    resultImage,
    operationChain,
    inputWidth,
    inputHeight,
  ]);

  // ========== getCode: 按操作类型返回代码 ==========
  const getCode = useCallback(() => {
    switch (effectiveOperation) {
      case 'erode':
        return ERODE_CODE_TS;
      case 'dilate':
        return DILATE_CODE_TS;
      case 'open':
        return OPEN_CODE_TS;
      case 'close':
        return CLOSE_CODE_TS;
    }
  }, [effectiveOperation]);

  // ========== 参数面板 ==========
  const parameters = (
    <div className="space-y-4">
      {/* 尺寸信息 */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">
          {viewMode === 'theory' ? '原理演示概述' : '应用示例概述'}
        </div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          {viewMode === 'theory'
            ? '当前页面固定使用一张二值示例图，重点观察结构元素平移后如何决定腐蚀、膨胀、开操作和闭操作的输出。'
            : '当前页面聚焦典型教学任务，重点比较面对不同目标时不同操作产生的结果差异，并固定展示一个代表性局部位置。'}
          {' '}输入与输出图像分辨率相同：{inputWidth}&#x00D7;{inputHeight}。
        </p>
        {isComposite && (
          <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-medium text-blue-800">
            当前为两阶段操作（先{operation === 'open' ? '腐蚀后膨胀' : '膨胀后腐蚀'}），
            右侧步骤分两阶段展示每一步的详细计算。
          </div>
        )}
      </div>

      {viewMode === 'task' ? (
        <>
          <SelectParam
            label="教学任务"
            value={task}
            onChange={handleTaskChange}
            options={TASK_OPS}
          />

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
            <span className="font-semibold">任务目标：</span>
            {TASK_HINTS[currentTask]}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800">
            <span className="font-semibold">对应操作：</span>
            {OPERATION_LABELS[recommendedOperation]}。当前页面固定展示该操作的处理结果，不提供逐像素步骤切换。
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-5 text-sky-800">
          <span className="font-semibold">示例说明：</span>
          原理演示使用固定二值样例，避免任务切换打断对结构元素、集合判定和局部窗口输出关系的理解。
        </div>
      )}

      {viewMode === 'theory' && (
        <SelectParam
          label="形态学操作"
          value={operation}
          onChange={setOperation}
          options={OPERATION_OPS}
        />
      )}

      {/* 结构元素形状 */}
      <SelectParam
        label="结构元素形状"
        value={seShape}
        onChange={setSeShape}
        options={SHAPE_OPS}
      />

      {/* 结构元素大小 */}
      <SliderParam
        label="结构元素大小"
        value={seSize}
        onChange={setSeSize}
        min={3}
        max={7}
        step={2}
      />

      {/* 操作说明 */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        <span className="font-semibold text-slate-700">当前配置：</span>
        {viewMode === 'theory'
          ? '原理演示示例图'
          : TASK_LABELS[currentTask]}，
        {OPERATION_LABELS[effectiveOperation]}，
        结构元素 {SHAPE_LABELS[seShape as SeShape]}，
        {seSize}&#x00D7;{seSize}。
        {isComposite && ' 此操作分两阶段完成，中间结果在下方分析区可见。'}
      </div>
    </div>
  );

  // ========== 渲染 ==========
  return (
    <ConceptLayout
      title="形态学操作"
      subtitle="Morphology - 腐蚀、膨胀、开闭操作与结构元素"
      contentHeader={modeHeader}
      operationLabel="形态学运算"
      parameterIntro={parameterIntro}
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      stepDetails={stepDetails}
      visualOverlay={visualOverlay}
      analysisPreview={analysisPreview}
      imageHints={{
        input: viewMode === 'theory'
          ? `红框显示结构元素落在图像内的部分；越界位置在下方邻域中按背景 0 处理`
          : `红框为系统自动选取的代表位置，用来说明该任务下局部窗口的判定依据`,
        output: viewMode === 'theory'
          ? `绿框对应结果图中的当前输出像素（共 ${outputWidth}×${outputHeight}），可点击结果图直接定位`
          : `绿框对应代表位置在结果图中的写入结果；任务模式默认仅供观察与比较`,
      }}
      showOriginalGrid={inputWidth <= 16}
      originalRegionMarker="frame"
      singlePageScroll
      navigationHintText={viewMode === 'theory' ? '方向键移动 / 点击原图或结果图跳转' : undefined}
      onInputRegionSelect={viewMode === 'theory' ? handleInputRegionSelect : undefined}
      onOutputPixelSelect={viewMode === 'theory' ? handleOutputPixelSelect : undefined}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: getCode() }]} />}
      currentStep={
        currentStep
          ? (() => {
              const visibleRegion = getVisibleStructRegion(
                currentStep.x,
                currentStep.y,
                seSize,
                inputWidth,
                inputHeight
              );
              return {
                x: currentStep.x,
                y: currentStep.y,
                kernelSize: seSize,
                regionX: visibleRegion.x,
                regionY: visibleRegion.y,
                regionWidth: visibleRegion.width,
                regionHeight: visibleRegion.height,
              };
            })()
          : null
      }
      currentStepLabel="当前处理像素"
      stepInfo={
        viewMode === 'theory' && totalSteps > 0
          ? { current: activeStepIndex, total: totalSteps }
          : null
      }
      onDirectionMove={viewMode === 'theory' ? handleDirectionMove : undefined}
    />
  );
}
