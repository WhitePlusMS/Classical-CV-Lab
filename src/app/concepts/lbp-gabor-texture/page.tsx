'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
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
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  GABOR_PRESETS,
  applyGaborFilter,
  computeLBPImage,
  computeRotationInvariantLBP,
  generateGaborKernel,
  generateTextureTestImage,
  getLBPWindow,
} from '@/lib/algorithms';
import { normalizeImage } from '@/lib/utils/imageProcessing';
import { useGridNavigation } from '@/hooks/useGridNavigation';

// ========================================
// 模式定义
// ========================================
type TextureMode = 'lbp' | 'lbp-rotation' | 'gabor';

const MODE_OPTIONS: { value: TextureMode; label: string }[] = [
  { value: 'lbp', label: 'LBP 基础' },
  { value: 'lbp-rotation', label: 'LBP 旋转不变' },
  { value: 'gabor', label: 'Gabor 滤波' },
];

const GABOR_PRESET_OPTIONS = GABOR_PRESETS.map(p => ({ value: p.label, label: p.label }));

// ========================================
// 公式常量
// ========================================

/* LBP 主公式：LBP(x_c,y_c)=Σ s(I(p)-I(c))·2^p, p=1..8 */
const LBP_FORMULA = buildInlineMathML(
  '<mrow><mi>LBP</mi><mo>(</mo><msub><mi>x</mi><mi>c</mi></msub><mo>,</mo><msub><mi>y</mi><mi>c</mi></msub><mo>)</mo><mo>=</mo>' +
  '<munderover><mo>∑</mo><mrow><mi>p</mi><mo>=</mo><mn>1</mn></mrow><mn>8</mn></munderover>' +
  '<mi>s</mi><mo>(</mo><mi>I</mi><mo>(</mo><mi>p</mi><mo>)</mo><mo>-</mo><mi>I</mi><mo>(</mo><mi>c</mi><mo>)</mo><mo>)</mo>' +
  '<mo>&#x22C5;</mo><msup><mn>2</mn><mi>p</mi></msup></mrow>'
);

/* 阶跃函数：s(x)=1 if x≥0; 0 otherwise */
const STEP_FUNCTION = buildInlineMathML(
  '<mrow><mi>s</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo>' +
  '<mrow><mo>{</mo><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mi>x</mi><mo>≥</mo><mn>0</mn></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>other</mtext></mtd></mtr></mtable></mrow></mrow>'
);

/* Gabor 基础公式：h(x,y)=s(x,y)g(x,y) */
const GABOR_BASIC = buildInlineMathML(
  '<mrow><mi>h</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><mi>s</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mi>g</mi><mo>(</mo><mi>x</mi><mi>,</mi><mi>y</mi><mo>)</mo></mrow>'
);

/* Gabor 正弦波和高斯核 */
const GABOR_S_G = buildInlineMathML(
  '<mrow><mtable>' +
  '<mtr><mtd><mi>s</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<msup><mi>e</mi><mrow><mo>-</mo><mi>j</mi><mn>2</mn><mi>π</mi><mo>(</mo><msub><mi>u</mi><mn>0</mn></msub><mi>x</mi><mo>+</mo><msub><mi>v</mi><mn>0</mn></msub><mi>y</mi><mo>)</mo></mrow></msup></mtd></mtr>' +
  '<mtr><mtd><mi>g</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo>' +
  '<mfrac><mn>1</mn><mrow><msqrt><mn>2</mn><mi>π</mi></msqrt><mi>σ</mi></mrow></mfrac>' +
  '<msup><mi>e</mi><mrow><mo>-</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mo>(</mo><mfrac><msup><mi>x</mi><mn>2</mn></msup><msubsup><mi>σ</mi><mi>x</mi><mn>2</mn></msubsup></mfrac><mo>+</mo><mfrac><msup><mi>y</mi><mn>2</mn></msup><msubsup><mi>σ</mi><mi>y</mi><mn>2</mn></msubsup></mfrac><mo>)</mo></mrow></msup></mtd></mtr>' +
  '</mtable></mrow>'
);

/* Gabor 简化公式 */
const GABOR_SIMPLIFIED = buildInlineMathML(
  '<mrow><mi>h</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>;</mo><mi>λ</mi><mo>,</mo><mi>θ</mi><mo>,</mo><mi>ψ</mi><mo>,</mo><mi>σ</mi><mo>,</mo><mi>γ</mi><mo>)</mo><mo>=</mo>' +
  '<msup><mi>e</mi><mrow><mo>-</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mfrac><mrow><msup><mi>x</mi><mrow><mo>′</mo><mn>2</mn></mrow></msup><mo>+</mo><msup><mi>γ</mi><mn>2</mn></msup><msup><mi>y</mi><mrow><mo>′</mo><mn>2</mn></mrow></msup></mrow><msup><mi>σ</mi><mn>2</mn></msup></mfrac></mrow></msup>' +
  '<msup><mi>e</mi><mrow><mi>i</mi><mo>(</mo><mn>2</mn><mi>π</mi><mfrac><msup><mi>x</mi><mo>′</mo></msup><mi>λ</mi></mfrac><mo>+</mo><mi>ψ</mi><mo>)</mo></mrow></msup></mrow>'
);

/* Gabor 坐标变换 */
const GABOR_ROTATION = buildInlineMathML(
  '<mrow><mtable>' +
  '<mtr><mtd><msup><mi>x</mi><mo>′</mo></msup><mo>=</mo><mi>x</mi><mi>cos</mi><mi>θ</mi><mo>+</mo><mi>y</mi><mi>sin</mi><mi>θ</mi></mtd></mtr>' +
  '<mtr><mtd><msup><mi>y</mi><mo>′</mo></msup><mo>=</mo><mo>-</mo><mi>x</mi><mi>sin</mi><mi>θ</mi><mo>+</mo><mi>y</mi><mi>cos</mi><mi>θ</mi></mtd></mtr>' +
  '</mtable></mrow>'
);

// ========================================
// LBP 代码
// ========================================
const LBP_CODE_TS = `function computeLBP(image: number[][], x: number, y: number): number {
  const center = image[y][x];
  // 3×3 邻域按顺序比较
  // 顺序：左上、上、右上、右、右下、下、左下、左
  const neighbors = [
    [-1,-1],[-1,0],[-1,1],[0,1],
    [1,1],[1,0],[1,-1],[0,-1],
  ];
  let lbp = 0;
  for (let p = 0; p <= 7; p++) {
    const nx = x + neighbors[p][1];
    const ny = y + neighbors[p][0];
    const s = image[ny][nx] >= center ? 1 : 0;
    lbp += s * Math.pow(2, p);
  }
  return lbp; // 0~255
}

// 旋转不变 LBP: 循环移位取最小值
function rotationInvariantLBP(lbp: number, bits = 8): number {
  let minVal = lbp;
  for (let shift = 1; shift < bits; shift++) {
    const rotated =
      ((lbp >> shift) | (lbp << (bits - shift))) & 0xFF;
    minVal = Math.min(minVal, rotated);
  }
  return minVal;
}`;

const GABOR_CODE_TS = `function generateGaborKernel(params: {
  wavelength: number;  // λ
  orientation: number; // θ (度)
  phase: number;       // ψ (度)
  sigma: number;       // σ
  gamma: number;       // γ
  kernelSize: number;  // 边长（奇数）
}): number[][] {
  const theta = (params.orientation * Math.PI) / 180;
  const psi = (params.phase * Math.PI) / 180;
  const half = Math.floor(params.kernelSize / 2);
  const kernel = create2DArray(params.kernelSize, params.kernelSize, 0);

  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const xPrime = x * Math.cos(theta) + y * Math.sin(theta);
      const yPrime = -x * Math.sin(theta) + y * Math.cos(theta);
      const g = Math.exp(-0.5 * (xPrime*xPrime +
        params.gamma*params.gamma*yPrime*yPrime)
        / (params.sigma*params.sigma));
      const s = Math.cos(2 * Math.PI * xPrime
        / params.wavelength + psi);
      kernel[y + half][x + half] = g * s;
    }
  }
  return normalizeKernel(kernel);
}`;

// ========================================
// 工具函数
// ========================================

/** 灰度值（0~1）转文本 */
function grayVal(v: number): string {
  return Math.round(v * 255).toString();
}

/** 将 Gabor 核（范围 -1~1）映射到 [0, 1] 便于显示 */
function normalizeKernelImage(kernel: number[][]): number[][] {
  const h = kernel.length;
  const w = kernel[0]?.length || 0;
  const result: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      row.push((kernel[y][x] + 1) / 2);
    }
    result.push(row);
  }
  return result;
}

// ========================================
// 页面组件
// ========================================
export default function LBPGaborTexturePage() {
  const [mode, setMode] = useState<TextureMode>('lbp');
  const [currentPosition, setCurrentPosition] = useState({ x: 10, y: 10 });
 const [gaborPreset, setGaborPreset] = useState<string>(GABOR_PRESETS[0].label);
  // ---- LBP 邻域序号映射 ----
  const lbpRowMap = useMemo(() => [0, 0, 0, 1, 2, 2, 2, 1], []);
  const lbpColMap = useMemo(() => [0, 1, 2, 2, 2, 1, 0, 0], []);
  const lbpRow = (i: number): number => lbpRowMap[i] ?? 0;
  const lbpCol = (i: number): number => lbpColMap[i] ?? 0;

 // ---- 输入数据 ----
  const testImage = useMemo(() => generateTextureTestImage(), []);
  const width = testImage[0]?.length || 0;
  const height = testImage.length;

  // ---- 派生计算结果 ----
  const lbpResult = useMemo(() => computeLBPImage(testImage), [testImage]);
  const rotationInvariantResult = useMemo(
    () => computeRotationInvariantLBP(testImage),
    [testImage]
  );

  const currentGaborParams = useMemo(() => {
    const found = GABOR_PRESETS.find(p => p.label === gaborPreset);
    return found ?? GABOR_PRESETS[0];
  }, [gaborPreset]);

  const gaborKernel = useMemo(
    () => generateGaborKernel(currentGaborParams),
    [currentGaborParams]
  );
  const gaborResult = useMemo(
    () => applyGaborFilter(testImage, gaborKernel),
    [testImage, gaborKernel]
  );

  const resultImage = useMemo(() => {
    if (mode === 'lbp') return lbpResult;
    if (mode === 'lbp-rotation') return rotationInvariantResult;
    return gaborResult;
  }, [mode, lbpResult, rotationInvariantResult, gaborResult]);

  // ---- 当前窗口数据 ----
  const cx = currentPosition.x;
  const cy = currentPosition.y;
  const canAccessWindow = cx >= 1 && cx < width - 1 && cy >= 1 && cy < height - 1;
  const currentWindow = useMemo(() => {
    if (!canAccessWindow) return null;
    return getLBPWindow(testImage, cx, cy);
  }, [canAccessWindow, testImage, cx, cy]);

  // ---- 步进信息 ----
  const currentStepIndex = cy * width + cx;
  const totalSteps = width * height;
  const resultLabel =
    mode === 'lbp' ? 'LBP 码图像' :
    mode === 'lbp-rotation' ? '旋转不变 LBP' :
    'Gabor 滤波结果';

  // ---- 事件处理 ----
  const handleModeChange = useCallback((value: string) => {
    setMode(value as TextureMode);
    // Gabor 模式自动选第一个预设
    if (value === 'gabor') setGaborPreset(GABOR_PRESETS[0].label);
  }, []);

  const handleDirectionMove = useGridNavigation({
    current: currentPosition,
    bounds: { width, height },
    onMove: setCurrentPosition,
    disabled: width === 0 || height === 0,
  });

  const handlePixelSelect = useCallback((x: number, y: number) => {
    setCurrentPosition({ x, y });
  }, []);

  // ---- 参数面板 ----
  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="处理模式"
        value={mode}
        onChange={handleModeChange}
        options={MODE_OPTIONS}
      />
      {mode === 'gabor' && (
        <SelectParam
          label="Gabor 预设"
          value={gaborPreset}
          onChange={setGaborPreset}
          options={GABOR_PRESET_OPTIONS}
        />
      )}
    </div>
  );

  // ---- 分析预览区 ----
  const analysisPreview = (() => {
    if (mode === 'lbp' || mode === 'lbp-rotation') {
      const binStr = currentWindow
        ? currentWindow.binaryPattern.map(b => b.toString()).join('')
        : '--------';
      const decVal = currentWindow?.decimalValue ?? 0;
      const modeLabel = mode === 'lbp' ? 'LBP 码 (= Σ b_p·2^p)' : '旋转不变 LBP (取循环移位最小值)';

      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red" className="max-w-xs">
                <div className="mb-2 text-xs font-semibold text-red-600">3×3 窗口</div>
                {currentWindow ? (
                  <div className="space-y-1 text-xs">
                    {currentWindow.values.map((row, ri) => (
                      <div key={ri} className="flex gap-1">
                        {row.map((v, ci) => {
                          const isCenter = ri === 1 && ci === 1;
                          return (
                            <span
                              key={ci}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded text-[10px] font-mono ${
                                isCenter
                                  ? 'bg-red-100 font-bold text-red-700 ring-1 ring-red-400'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {grayVal(v)}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                    <p className="mt-1 text-slate-500">
                      中心值 {grayVal(currentWindow.center)}，
                      相邻 8 个像素逐一比较
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">边界像素无完整 3×3 窗口</p>
                )}
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="center">
              <FlowNode tone="amber" className="max-w-xs">
                <div className="mb-2 text-xs font-semibold text-amber-700">
                  阶跃比较 → {modeLabel}
                </div>
                {currentWindow ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {currentWindow.binaryPattern.map((b, i) => (
                        <span
                          key={i}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-mono ${
                            b === 1
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                    <p className="text-slate-500">
                      二进制 <code className="text-amber-700">{binStr}</code>
                    </p>
                    {mode === 'lbp-rotation' && (
                      <p className="text-xs text-slate-500">
                        循环移位后取最小值
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">无可用数据</p>
                )}
              </FlowNode>
            </FlowColumn>

            <FlowColumn align="end">
              <FlowNode tone="emerald" className="max-w-xs">
                <div className="mb-2 text-xs font-semibold text-emerald-700">
                  十进制 LBP 值
                </div>
                {currentWindow ? (
                  <div className="space-y-1 text-xs">
                    <p>
                      LBP = <span className="font-mono font-bold text-emerald-700">{decVal}</span>
                      &emsp;(0~255)
                    </p>
                    <p className="text-slate-500">
                      该值表示位置 ({cx}, {cy}) 的纹理编码
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">无可用数据</p>
                )}
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // Gabor 模式
    const kernelDisplay = useMemo(() => normalizeKernelImage(gaborKernel), [gaborKernel]);

    return (
      <ProcessRail>
        <FlowColumns>
          <FlowColumn align="start">
            <FlowNode tone="red" className="max-w-xs">
              <div className="mb-2 text-xs font-semibold text-red-600">原图</div>
              <ImageCanvas
                image={testImage}
                maxDisplaySize={120}
                showGrid={false}
                highlightPixel={currentPosition}
              />
              <p className="mt-2 text-xs text-slate-500">
                合成纹理图（含条纹、棋盘格和渐变区域）
              </p>
            </FlowNode>
          </FlowColumn>

          <FlowColumn align="center">
            <FlowNode tone="sky" className="max-w-xs">
              <div className="mb-2 text-xs font-semibold text-sky-700">Gabor 核 (显示)</div>
              <ImageCanvas
                image={kernelDisplay}
                maxDisplaySize={100}
                showGrid={false}
              />
              <p className="mt-2 text-xs text-slate-500">
                {currentGaborParams.label}
              </p>
            </FlowNode>
          </FlowColumn>

          <FlowColumn align="end">
            <FlowNode tone="emerald" className="max-w-xs">
              <div className="mb-2 text-xs font-semibold text-emerald-700">滤波结果</div>
              <ImageCanvas
                image={gaborResult}
                maxDisplaySize={120}
                showGrid={false}
                highlightPixel={currentPosition}
              />
              <p className="mt-2 text-xs text-slate-500">
                不同方向的 Gabor 核提取对应方向的纹理
              </p>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  })();

  // ---- 详细讲解区 ----
  const stepDetails = (
    <div className="space-y-6">

      {/* ===== LBP 部分 ===== */}
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">LBP — 局部二值模式</h2>
        <p className="text-xs leading-6 text-slate-600">
          LBP（Local Binary Pattern）是一种描述图像局部纹理特征的算子，具有灰度不变性。
          其基本原理：在 3×3 窗口内，以中心像素为阈值，与周围 8 个像素逐一比较大小，
          大于等于中心像素记为 1，否则记为 0，得到一个 8 位二进制数，再转换为十进制 LBP 码。
        </p>
      </TeachingCard>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（1）LBP 公式定义</h2>
        <div className="mb-4">
          <FormulaCard label="LBP 主公式" mathML={LBP_FORMULA} note="p 表示 3×3 窗口中除中心外的第 p 个像素" />
        </div>
        <figure className="mb-4">
          <img
            src="/assets/lbp-gabor-texture/40174f2ac651d62b8180037baa09883dbbbed718f3061894960b9dd0d191a09a.jpg"
            alt="LBP 3×3 窗口示意图"
            className="w-full max-w-lg rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">
            LBP 基本算子：3×3 窗口内比较生成 8 位二进制码
          </figcaption>
        </figure>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（2）阶跃函数</h2>
        <div className="mb-4">
          <FormulaCard label="阶跃比较函数" mathML={STEP_FUNCTION} note="s(x)=1 当 x≥0，否则 s(x)=0" />
        </div>
      </div>

      {currentWindow && (mode === 'lbp' || mode === 'lbp-rotation') && (
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            （3）当前位置 ({cx}, {cy}) 链式代入
          </h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            当前 3×3 窗口各像素灰度值（0~255）如下：
          </p>

          {/* 3×3 窗口灰度矩阵 */}
          <div className="mb-4 overflow-x-auto">
            <table className="mx-auto border-collapse text-xs">
              <tbody>
                {currentWindow.values.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((v, ci) => {
                      const isCenter = ri === 1 && ci === 1;
                      return (
                        <td
                          key={ci}
                          className={`border px-2 py-1 text-center font-mono ${
                            isCenter
                              ? 'border-red-400 bg-red-50 font-bold text-red-700'
                              : 'border-slate-300 text-slate-700'
                          }`}
                        >
                          {grayVal(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              中心值（红底） I(c) = {grayVal(currentWindow.center)}，与周围 8 个像素逐一比较
            </p>
        </div>


         {/* 阶跃比较：逐个像素代入 */}
          <div className="mb-4 space-y-2 text-xs leading-6">
            <p className="font-semibold text-slate-700">Step B: 逐个邻域代入 s(I(p)−I(c))</p>
            <div className="overflow-x-auto">
              <table className="mx-auto border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-700">邻域 p</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-700">I(p)</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-700">I(c)</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-700">I(p)−I(c)</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-700">s(·)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentWindow.binaryPattern.map((b, i) => {
                    const row = lbpRow(i);
                    const col = lbpCol(i);
                    const pv = currentWindow.values[row][col];
                    const cv = currentWindow.center;
                    return (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-3 py-1.5 text-slate-600">
                          p<sub>{i + 1}</sub>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">{grayVal(pv)}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">{grayVal(cv)}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-600">
                          {grayVal(pv)}−{grayVal(cv)} = {pv - cv >= 0 ? '+' : ''}{Math.round((pv - cv) * 255)}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-mono ${b === 1 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-500'}`}>
                            {b}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 二进制模式与位权重 */}
          <div className="mb-4 space-y-2 text-xs leading-6">
            <p className="font-semibold text-slate-700">Step C: 二进制模式（8 位）</p>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-slate-500">二进制：</span>
                {currentWindow.binaryPattern.map((b, i) => (
                  <span
                    key={i}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded text-[11px] font-mono ${b === 1 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {b}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="mr-1 text-slate-500">对应权重：</span>
                {currentWindow.binaryPattern.map((b, i) => (
                  <span key={i} className="inline-flex h-7 w-7 items-center justify-center rounded text-[10px] font-mono text-slate-500">
                    2<sup>{i}</sup>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* LBP 编码计算 */}
          <div className="mb-4 space-y-2 text-xs leading-6">
            <p className="font-semibold text-slate-700">Step D: LBP 码 = Σ s(p)·2^p</p>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-slate-600">
                LBP = {currentWindow.binaryPattern.map((b, i) => `${b}·2^${i}`).join(' + ')}
              </p>
              <p className="mt-1 text-slate-600">
                = {currentWindow.binaryPattern.map((b, i) => b === 1 ? `${Math.pow(2, i)}` : '0').filter(s => s !== '0').join(' + ') || '0'}
                {' '}= <span className="font-bold text-emerald-700">{currentWindow.decimalValue}</span>
              </p>
              <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                LBP({cx}, {cy}) = {currentWindow.decimalValue}
              </p>
            </div>
          </div>
          {mode === 'lbp-rotation' && (
            <div className="mb-4 space-y-2 text-xs leading-6">
              <p className="font-semibold text-slate-700">旋转不变 LBP：</p>
              <p className="text-slate-600">
                循环移位取最小值：所有 8 种循环移位模式的最小值作为旋转不变 LBP（切换至 LBP 旋转不变模式可查看结果图）。
              </p>
            </div>
          )}
        </div>
      )}

      {mode === 'lbp-rotation' && (
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">（4）旋转不变性</h2>
          <p className="mb-3 text-xs leading-6 text-slate-600">
            基本 LBP 按固定方向（从左上角顺时针）编码，图像旋转后二进制模式变化，LBP 值也变化。
            旋转不变 LBP 通过循环移位所有 8 种二进制模式，取最小值作为该邻域的 LBP 值，
            使得旋转后的纹理获得相同的 LBP 编码。
          </p>
          <figure className="mb-4">
            <img
              src="/assets/lbp-gabor-texture/169634d37509719dbd2eb5a4f663e8c43dbf5fbb5d8eb96e5044d78b8d95f117.jpg"
              alt="旋转不变 LBP 原理"
              className="w-full max-w-lg rounded-xl object-cover"
            />
            <figcaption className="mt-2 text-xs text-slate-500">
              旋转不变 LBP：循环移位求最小值
            </figcaption>
          </figure>
          <TeachingCard>
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold text-emerald-700">灰度不变性：</span>
              LBP 基于局部灰度比较，光照同增同减时不改变二进制模式，
              因此对单调光照变化相对稳定。<br />
              <span className="font-semibold text-red-600">局限性：</span>
              基本 LBP 二进制模式较多（共 256 种），且不具有旋转不变性。
              旋转不变 LBP 可以有效减少模式数量，但可能丢失方向信息。
            </p>
          </TeachingCard>
        </div>
      )}

      {/* ===== Gabor 部分 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Gabor 滤波器</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          Gabor 滤波器由特定频率和方向的正弦波与高斯核组合而成，
          可同时检测特定方向与频率的纹理信息，广泛应用于纹理分割、边缘检测和对象检测。
        </p>
        <div className="mb-4 space-y-3">
          <FormulaCard
            label="Gabor 滤波器基本形式：h(x,y)=s(x,y)g(x,y)"
            mathML={GABOR_BASIC}
            note="s(x,y) 是复数正弦波，g(x,y) 是高斯核函数"
          />
          <FormulaCard
            label="正弦波与高斯核"
            mathML={GABOR_S_G}
            note="u₀, v₀ 为空间频率分量"
          />
          <FormulaCard
            label="简化空间域表达式（实部）"
            mathML={GABOR_SIMPLIFIED}
            note={'当前参数：λ=' + currentGaborParams.wavelength + ', θ=' + currentGaborParams.orientation + '°'}
          />
          <FormulaCard
            label="坐标旋转变换"
            mathML={GABOR_ROTATION}
            note={'θ 控制条纹方向，当前 θ = ' + currentGaborParams.orientation + '°'}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Gabor 参数</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">参数</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">符号</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">含义</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">当前值</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-600">波长</td>
              <td className="px-3 py-2 font-mono text-slate-600">λ</td>
              <td className="px-3 py-2 text-slate-600">正弦曲线的周期</td>
              <td className="px-3 py-2 font-mono text-slate-700">{currentGaborParams.wavelength}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-600">方向</td>
              <td className="px-3 py-2 font-mono text-slate-600">θ</td>
              <td className="px-3 py-2 text-slate-600">平行条纹的法线角度</td>
              <td className="px-3 py-2 font-mono text-slate-700">{currentGaborParams.orientation}°</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-600">相位</td>
              <td className="px-3 py-2 font-mono text-slate-600">ψ</td>
              <td className="px-3 py-2 text-slate-600">正弦波的相位偏移</td>
              <td className="px-3 py-2 font-mono text-slate-700">{currentGaborParams.phase}°</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-600">方差</td>
              <td className="px-3 py-2 font-mono text-slate-600">σ</td>
              <td className="px-3 py-2 text-slate-600">高斯包络的标准差</td>
              <td className="px-3 py-2 font-mono text-slate-700">{currentGaborParams.sigma}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-slate-600">纵横比</td>
              <td className="px-3 py-2 font-mono text-slate-600">γ</td>
              <td className="px-3 py-2 text-slate-600">高斯包络的空间纵横比</td>
              <td className="px-3 py-2 font-mono text-slate-700">{currentGaborParams.gamma}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">LBP 与 Gabor 对比</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">方面</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">LBP</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Gabor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold text-slate-600">基本原理</td>
              <td className="px-3 py-2 text-slate-600">局部灰度比较与二值编码</td>
              <td className="px-3 py-2 text-slate-600">方向频率选择性滤波</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold text-slate-600">光照鲁棒性</td>
              <td className="px-3 py-2 text-slate-600">灰度单调变化不敏感</td>
              <td className="px-3 py-2 text-slate-600">受光照影响较大</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold text-slate-600">方向信息</td>
              <td className="px-3 py-2 text-slate-600">基本 LBP 含方向编码</td>
              <td className="px-3 py-2 text-slate-600">显式选择多方向</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-semibold text-slate-600">主要用途</td>
              <td className="px-3 py-2 text-slate-600">纹理分类、人脸识别</td>
              <td className="px-3 py-2 text-slate-600">纹理分割、边缘检测</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---- StepInfo ----
  const stepInfo = { current: currentStepIndex, total: totalSteps };

  return (
    <ConceptLayout
      title="LBP 与 Gabor 纹理特征"
      subtitle="Local Binary Pattern & Gabor Filter - 纹理的局部编码与频率选择性滤波"
      operationLabel={mode === 'gabor' ? 'Gabor 滤波' : 'LBP 编码'}
      parameterIntro="切换 LBP 基础、旋转不变 LBP 或 Gabor 滤波模式，观察不同纹理特征提取方法的效果。"
      originalImage={testImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={
        <CodeViewer
          languages={[
            { name: 'LBP', code: LBP_CODE_TS },
            { name: 'Gabor', code: GABOR_CODE_TS },
          ]}
        />
      }
      currentStep={{ x: cx, y: cy, kernelSize: 3 }}
      stepInfo={stepInfo}
      imageLabels={{ input: '纹理测试图', output: resultLabel }}
      imageHints={{ input: '点击像素查看 3×3 窗口 LBP 计算', output: mode === 'gabor' ? resultLabel + '（点击定位）' : 'LBP 编码结果（点击定位像素）' }}
      showOriginalGrid
      singlePageScroll
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handlePixelSelect}
      onOutputPixelSelect={handlePixelSelect}
      navigationHintText="方向键移动 / 点击纹理图或结果图定位像素"
    />
  );
}

