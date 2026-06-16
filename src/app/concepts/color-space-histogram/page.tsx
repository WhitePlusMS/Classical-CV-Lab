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
  PixelColorSwatch,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import {
  ColorDisplayMode,
  ColorHistogram,
  ColorHistogramChannel,
  ColorSpaceStep,
  RgbPixel,
  computeColorHistogram,
  createHueMask,
  extractColorChannel,
  getColorSpaceStepAt,
  rgbToHsv,
} from '@/lib/algorithms/colorSpaceHistogram';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { useGridNavigation } from '@/hooks/useGridNavigation';
import {
  centerCropRgbImage,
  clamp,
  loadImageAsRgb,
  resizeRgbImage,
} from '@/lib/utils/imageProcessing';

const BIN_COUNT = 18;
const DEFAULT_THRESHOLD = 35;

const DISPLAY_MODE_OPTIONS = [
  { value: 'rgb', label: 'RGB 彩图' },
  { value: 'r', label: 'R 通道' },
  { value: 'g', label: 'G 通道' },
  { value: 'b', label: 'B 通道' },
  { value: 'h', label: 'H 色调' },
  { value: 's', label: 'S 饱和度' },
  { value: 'v', label: 'V 明度' },
  { value: 'mask', label: 'HSV 颜色提取' },
] as const;

const CORE_CODE_TS = `function rgbToHsv(r, g, b) {
  const cmax = Math.max(r, g, b);
  const cmin = Math.min(r, g, b);
  const delta = cmax - cmin;

  let h = 0;
  if (delta === 0) h = 0;
  else if (cmax === r) h = 60 * (((g - b) / delta) % 6);
  else if (cmax === g) h = 60 * ((b - r) / delta + 2);
  else h = 60 * ((r - g) / delta + 4);
  if (h < 0) h += 360;

  return {
    h,
    s: cmax === 0 ? 0 : delta / cmax,
    v: cmax,
  };
}

function computeColorHistogram(rgbImage, channel, binCount) {
  const bins = new Array(binCount).fill(0);
  for (const row of rgbImage) {
    for (const [r, g, b] of row) {
      const hsv = rgbToHsv(r, g, b);
      const value = channel === 'h' ? hsv.h / 360 :
        channel === 's' ? hsv.s :
        channel === 'v' ? hsv.v :
        channel === 'r' ? r :
        channel === 'g' ? g : b;
      bins[Math.min(binCount - 1, Math.floor(value * binCount))] += 1;
    }
  }
  return bins;
}

function createHueMask(rgbImage, targetHue, thresholdDegrees) {
  return rgbImage.map(row => row.map(([r, g, b]) => {
    const hue = rgbToHsv(r, g, b).h;
    const diff = Math.min(Math.abs(hue - targetHue), 360 - Math.abs(hue - targetHue));
    return diff <= thresholdDegrees ? 1 : 0;
  }));
}`;

function toRgbPixels(image: number[][][]): RgbPixel[][] {
  return image.map(row =>
    row.map(pixel => [
      clamp(pixel[0] ?? 0, 0, 1),
      clamp(pixel[1] ?? 0, 0, 1),
      clamp(pixel[2] ?? 0, 0, 1),
    ])
  );
}

function createFallbackRgbImage(size = 96): RgbPixel[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const nx = x / Math.max(1, size - 1);
      const ny = y / Math.max(1, size - 1);
      const redObject = Math.exp(-(((nx - 0.36) / 0.18) ** 2 + ((ny - 0.46) / 0.2) ** 2));
      const greenObject = Math.exp(-(((nx - 0.68) / 0.16) ** 2 + ((ny - 0.58) / 0.18) ** 2));
      const r = clamp(0.22 + redObject * 0.68 + nx * 0.18, 0, 1);
      const g = clamp(0.24 + greenObject * 0.62 + (1 - ny) * 0.18, 0, 1);
      const b = clamp(0.34 + (1 - redObject) * 0.18 + ny * 0.28, 0, 1);
      return [r, g, b] as RgbPixel;
    })
  );
}

function rgbToLumaImage(rgbImage: RgbPixel[][]): GrayscaleImage {
  return rgbImage.map(row =>
    row.map(([r, g, b]) => clamp(0.299 * r + 0.587 * g + 0.114 * b, 0, 1))
  );
}

function countMaskPixels(mask: GrayscaleImage): number {
  return mask.reduce(
    (total, row) => total + row.reduce((rowTotal, value) => rowTotal + (value > 0 ? 1 : 0), 0),
    0
  );
}

function hueDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

function channelLabel(channel: ColorHistogramChannel): string {
  const labels: Record<ColorHistogramChannel, string> = {
    r: 'R 通道',
    g: 'G 通道',
    b: 'B 通道',
    h: 'H 色调',
    s: 'S 饱和度',
    v: 'V 明度',
  };
  return labels[channel];
}

function modeLabel(mode: ColorDisplayMode): string {
  if (mode === 'rgb') return 'RGB 彩图';
  if (mode === 'mask') return 'HSV 颜色提取';
  return channelLabel(mode);
}

function operationLabel(mode: ColorDisplayMode): string {
  if (mode === 'mask') return '颜色范围提取';
  if (mode === 'rgb') return 'RGB → HSV';
  return '通道提取';
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function buildRgbNormalizeFormula(step: ColorSpaceStep): string {
  const [r, g, b] = step.rgb255;
  return buildInlineMathML(`
    <mrow>
      <msup><mi>R</mi><mo>&#8242;</mo></msup><mo>=</mo><mfrac><mn>${r}</mn><mn>255</mn></mfrac><mo>=</mo><mn>${step.rgb[0].toFixed(3)}</mn>
      <mo>,</mo>
      <msup><mi>G</mi><mo>&#8242;</mo></msup><mo>=</mo><mfrac><mn>${g}</mn><mn>255</mn></mfrac><mo>=</mo><mn>${step.rgb[1].toFixed(3)}</mn>
      <mo>,</mo>
      <msup><mi>B</mi><mo>&#8242;</mo></msup><mo>=</mo><mfrac><mn>${b}</mn><mn>255</mn></mfrac><mo>=</mo><mn>${step.rgb[2].toFixed(3)}</mn>
    </mrow>
  `);
}

function buildHsvExtremaFormula(step: ColorSpaceStep): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>C</mi><mi>max</mi></msub><mo>=</mo><mo>max</mo><mo>(</mo><mn>${step.rgb[0].toFixed(3)}</mn><mo>,</mo><mn>${step.rgb[1].toFixed(3)}</mn><mo>,</mo><mn>${step.rgb[2].toFixed(3)}</mn><mo>)</mo><mo>=</mo><mn>${step.cmax.toFixed(3)}</mn>
      <mo>,</mo>
      <msub><mi>C</mi><mi>min</mi></msub><mo>=</mo><mn>${step.cmin.toFixed(3)}</mn>
      <mo>,</mo>
      <mi>&#916;</mi><mo>=</mo><mn>${step.delta.toFixed(3)}</mn>
    </mrow>
  `);
}

function buildHsvResultFormula(step: ColorSpaceStep): string {
  return buildInlineMathML(`
    <mrow>
      <mi>HSV</mi><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo>
      <mo>=</mo>
      <mo>(</mo><mn>${step.hsv.h.toFixed(1)}</mn><mo>&#176;</mo><mo>,</mo><mn>${step.hsv.s.toFixed(3)}</mn><mo>,</mo><mn>${step.hsv.v.toFixed(3)}</mn><mo>)</mo>
    </mrow>
  `);
}

function buildHistogramFormula(step: ColorSpaceStep, histogram: ColorHistogram): string {
  const count = histogram.counts[step.histogramBin] ?? 0;
  const probability = histogram.bins[step.histogramBin] ?? 0;
  return buildInlineMathML(`
    <mrow>
      <mi>H</mi><mo>(</mo><mn>${step.histogramBin}</mn><mo>)</mo>
      <mo>=</mo>
      <mfrac><mrow><mi>count</mi><mo>(</mo><mn>${step.histogramBin}</mn><mo>)</mo></mrow><mi>N</mi></mfrac>
      <mo>=</mo>
      <mfrac><mn>${count}</mn><mn>${histogram.totalPixels}</mn></mfrac>
      <mo>=</mo>
      <mn>${probability.toFixed(4)}</mn>
    </mrow>
  `);
}

function buildMaskFormula(step: ColorSpaceStep, targetHue: number, threshold: number): string {
  const distance = hueDistance(step.hsv.h, targetHue);
  return buildInlineMathML(`
    <mrow>
      <mo>|</mo><mi>H</mi><mo>(</mo><mn>${step.x}</mn><mo>,</mo><mn>${step.y}</mn><mo>)</mo><mo>-</mo><msub><mi>H</mi><mn>0</mn></msub><mo>|</mo>
      <mo>=</mo>
      <mn>${distance.toFixed(1)}</mn><mo>&#176;</mo>
      <mo>&#8804;</mo>
      <mn>${threshold}</mn><mo>&#176;</mo>
      <mo>=</mo>
      <mn>${distance <= threshold ? 1 : 0}</mn>
    </mrow>
  `);
}

function HistogramBars({
  histogram,
  highlightedBin,
}: {
  histogram: ColorHistogram;
  highlightedBin: number;
}) {
  const maxValue = Math.max(0.001, ...histogram.bins);

  return (
    <div className="h-56 rounded-xl border border-sky-200 bg-sky-50/60 px-2 py-3">
      <div className="flex h-full items-end gap-1">
        {histogram.bins.map((value, index) => (
          <div key={`${histogram.channel}-${index}`} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className={`w-full rounded-t-sm ${
                index === highlightedBin ? 'bg-amber-500' : 'bg-sky-500'
              }`}
              style={{ height: `${Math.max(6, (value / maxValue) * 172)}px` }}
              title={`bin ${index}: ${histogram.counts[index]} pixels`}
            />
            {index % 3 === 0 ? (
              <span className="font-mono text-[8px] text-slate-400">{index}</span>
            ) : (
              <span className="h-[10px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function projectRgbPoint([r, g, b]: RgbPixel): { x: number; y: number } {
  return {
    x: 66 + r * 128 + g * 44 - b * 44,
    y: 164 - g * 76 - b * 42,
  };
}

function RgbCubeDiagram({ step }: { step: ColorSpaceStep }) {
  const vertices: Array<{ id: string; rgb: RgbPixel; label: string }> = [
    { id: 'black', rgb: [0, 0, 0], label: '黑' },
    { id: 'red', rgb: [1, 0, 0], label: 'R' },
    { id: 'green', rgb: [0, 1, 0], label: 'G' },
    { id: 'blue', rgb: [0, 0, 1], label: 'B' },
    { id: 'cyan', rgb: [0, 1, 1], label: 'C' },
    { id: 'magenta', rgb: [1, 0, 1], label: 'M' },
    { id: 'yellow', rgb: [1, 1, 0], label: 'Y' },
    { id: 'white', rgb: [1, 1, 1], label: '白' },
  ];
  const vertexMap = Object.fromEntries(vertices.map(vertex => [vertex.id, projectRgbPoint(vertex.rgb)]));
  const edges = [
    ['black', 'red'], ['black', 'green'], ['black', 'blue'],
    ['red', 'yellow'], ['red', 'magenta'],
    ['green', 'yellow'], ['green', 'cyan'],
    ['blue', 'magenta'], ['blue', 'cyan'],
    ['yellow', 'white'], ['magenta', 'white'], ['cyan', 'white'],
  ];
  const current = projectRgbPoint(step.rgb);
  const rProjection = projectRgbPoint([step.rgb[0], 0, 0]);
  const gProjection = projectRgbPoint([0, step.rgb[1], 0]);
  const bProjection = projectRgbPoint([0, 0, step.rgb[2]]);
  const faces = [
    { id: 'rg', vertices: ['black', 'red', 'yellow', 'green'], fill: 'rgba(250, 204, 21, 0.16)' },
    { id: 'rb', vertices: ['black', 'red', 'magenta', 'blue'], fill: 'rgba(168, 85, 247, 0.14)' },
    { id: 'gb', vertices: ['black', 'green', 'cyan', 'blue'], fill: 'rgba(20, 184, 166, 0.14)' },
    { id: 'top', vertices: ['cyan', 'white', 'yellow', 'green'], fill: 'rgba(255, 255, 255, 0.32)' },
    { id: 'right', vertices: ['red', 'yellow', 'white', 'magenta'], fill: 'rgba(239, 68, 68, 0.08)' },
    { id: 'back', vertices: ['blue', 'magenta', 'white', 'cyan'], fill: 'rgba(59, 130, 246, 0.1)' },
  ];
  const rgbChannels = [
    { label: 'R', value: step.rgb[0], raw: step.rgb255[0], color: 'bg-red-500', border: 'border-red-200', text: 'text-red-700' },
    { label: 'G', value: step.rgb[1], raw: step.rgb255[1], color: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-700' },
    { label: 'B', value: step.rgb[2], raw: step.rgb255[2], color: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-700' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">RGB 颜色立方体</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">三条彩色轴表示 R/G/B 强度，发光点是当前像素在立方体中的位置。</p>
        </div>
        <PixelColorSwatch color={{ r: step.rgb[0], g: step.rgb[1], b: step.rgb[2] }} className="h-10 w-10" />
      </div>

      <svg viewBox="0 0 280 220" className="mt-3 h-60 w-full rounded-xl bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#f8fafc_46%,#eef2f7_100%)]">
        <defs>
          <marker id="rgb-axis-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="rgb(100 116 139)" />
          </marker>
          <filter id="rgb-point-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="132" cy="181" rx="104" ry="18" fill="rgb(15 23 42)" opacity="0.08" />

        {faces.map(face => (
          <polygon
            key={face.id}
            points={face.vertices.map(id => {
              const point = vertexMap[id];
              return `${point.x},${point.y}`;
            }).join(' ')}
            fill={face.fill}
            stroke="rgba(148, 163, 184, 0.45)"
            strokeWidth="1"
          />
        ))}

        {edges.map(([from, to]) => {
          const start = vertexMap[from];
          const end = vertexMap[to];
          return (
            <line
              key={`${from}-${to}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgb(148 163 184)"
              strokeWidth="1.5"
            />
          );
        })}

        {[0.25, 0.5, 0.75].map(level => {
          const rLineStart = projectRgbPoint([level, 0, 0]);
          const rLineEnd = projectRgbPoint([level, 1, 1]);
          const gLineStart = projectRgbPoint([0, level, 0]);
          const gLineEnd = projectRgbPoint([1, level, 1]);
          const bLineStart = projectRgbPoint([0, 0, level]);
          const bLineEnd = projectRgbPoint([1, 1, level]);
          return (
            <g key={level} opacity="0.32">
              <line x1={rLineStart.x} y1={rLineStart.y} x2={rLineEnd.x} y2={rLineEnd.y} stroke="rgb(239 68 68)" strokeDasharray="3 5" />
              <line x1={gLineStart.x} y1={gLineStart.y} x2={gLineEnd.x} y2={gLineEnd.y} stroke="rgb(34 197 94)" strokeDasharray="3 5" />
              <line x1={bLineStart.x} y1={bLineStart.y} x2={bLineEnd.x} y2={bLineEnd.y} stroke="rgb(37 99 235)" strokeDasharray="3 5" />
            </g>
          );
        })}

        <line
          x1={vertexMap.black.x}
          y1={vertexMap.black.y}
          x2={vertexMap.red.x}
          y2={vertexMap.red.y}
          stroke="rgb(239 68 68)"
          strokeWidth="2.4"
          markerEnd="url(#rgb-axis-arrow)"
        />
        <line
          x1={vertexMap.black.x}
          y1={vertexMap.black.y}
          x2={vertexMap.green.x}
          y2={vertexMap.green.y}
          stroke="rgb(34 197 94)"
          strokeWidth="2.4"
          markerEnd="url(#rgb-axis-arrow)"
        />
        <line
          x1={vertexMap.black.x}
          y1={vertexMap.black.y}
          x2={vertexMap.blue.x}
          y2={vertexMap.blue.y}
          stroke="rgb(37 99 235)"
          strokeWidth="2.4"
          markerEnd="url(#rgb-axis-arrow)"
        />

        <line x1={current.x} y1={current.y} x2={rProjection.x} y2={rProjection.y} stroke="rgb(239 68 68)" strokeDasharray="4 4" strokeWidth="1.6" opacity="0.8" />
        <line x1={current.x} y1={current.y} x2={gProjection.x} y2={gProjection.y} stroke="rgb(34 197 94)" strokeDasharray="4 4" strokeWidth="1.6" opacity="0.8" />
        <line x1={current.x} y1={current.y} x2={bProjection.x} y2={bProjection.y} stroke="rgb(37 99 235)" strokeDasharray="4 4" strokeWidth="1.6" opacity="0.8" />

        {vertices.map(vertex => {
          const point = vertexMap[vertex.id];
          const [r, g, b] = vertex.rgb;
          return (
            <g key={vertex.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r="7"
                fill={`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`}
                stroke="white"
                strokeWidth="2"
              />
              <text x={point.x + 9} y={point.y + 4} className="fill-slate-500 text-[10px] font-semibold">
                {vertex.label}
              </text>
            </g>
          );
        })}

        <line x1={vertexMap.black.x} y1={vertexMap.black.y} x2={current.x} y2={current.y} stroke="rgb(245 158 11)" strokeDasharray="4 4" strokeWidth="2" />
        <circle cx={current.x} cy={current.y} r="14" fill="rgb(245 158 11)" fillOpacity="0.22" filter="url(#rgb-point-glow)" />
        <circle cx={current.x} cy={current.y} r="6" fill="rgb(245 158 11)" stroke="white" strokeWidth="2.4" />
        <text x={current.x + 10} y={current.y - 8} className="fill-amber-700 text-[10px] font-semibold">
          当前像素
        </text>
      </svg>

      <div className="mt-4 grid gap-2 text-xs">
        {rgbChannels.map(channel => (
          <div key={channel.label} className={`rounded-xl border ${channel.border} bg-white px-3 py-2`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`font-semibold ${channel.text}`}>{channel.label}</span>
              <span className="font-mono text-slate-500">{channel.raw} / 255</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${channel.color}`} style={{ width: `${channel.value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function hueWheelPath(startAngle: number, endAngle: number): string {
  const center = 92;
  const radius = 72;
  const start = {
    x: center + radius * Math.cos(startAngle),
    y: center + radius * Math.sin(startAngle),
  };
  const end = {
    x: center + radius * Math.cos(endAngle),
    y: center + radius * Math.sin(endAngle),
  };
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y} Z`;
}

function HsvConeDiagram({ step }: { step: ColorSpaceStep }) {
  const sectors = Array.from({ length: 48 }, (_, index) => {
    const start = (index / 48) * Math.PI * 2 - Math.PI / 2;
    const end = ((index + 1) / 48) * Math.PI * 2 - Math.PI / 2;
    return { start, end, hue: index * 7.5 };
  });
  const hueAngle = (step.hsv.h / 360) * Math.PI * 2 - Math.PI / 2;
  const hueOuterPoint = {
    x: 92 + Math.cos(hueAngle) * 78,
    y: 92 + Math.sin(hueAngle) * 78,
  };
  const huePoint = {
    x: 92 + Math.cos(hueAngle) * Math.max(18, step.hsv.s * 68),
    y: 92 + Math.sin(hueAngle) * Math.max(18, step.hsv.s * 68),
  };
  const svPlane = { x: 194, y: 44, width: 118, height: 120 };
  const svPoint = {
    x: svPlane.x + step.hsv.s * svPlane.width,
    y: svPlane.y + (1 - step.hsv.v) * svPlane.height,
  };
  const hueGradientId = `hsv-sv-hue-${Math.round(step.hsv.h)}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">HSV 色相环与 S/V 平面</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">左侧选色相 H，右侧固定 H 后查看饱和度 S 与明度 V。</p>
        </div>
        <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-xs text-amber-800">
          H {step.hsv.h.toFixed(1)}°
        </div>
      </div>

      <svg viewBox="0 0 350 230" className="mt-3 h-60 w-full rounded-xl bg-[radial-gradient(circle_at_40%_34%,#ffffff_0%,#f8fafc_48%,#eef2f7_100%)]">
        <defs>
          <linearGradient id={hueGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor={`hsl(${step.hsv.h}, 100%, 50%)`} />
          </linearGradient>
          <linearGradient id="hsv-value-overlay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="1" />
          </linearGradient>
          <filter id="hsv-point-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="92" cy="94" rx="84" ry="84" fill="white" opacity="0.7" />
        {sectors.map(sector => (
          <path
            key={sector.hue}
            d={hueWheelPath(sector.start, sector.end)}
            fill={`hsl(${sector.hue}, 88%, 54%)`}
            stroke="white"
            strokeWidth="0.25"
          />
        ))}
        <circle cx="92" cy="92" r="52" fill="white" fillOpacity="0.54" />
        <circle cx="92" cy="92" r="24" fill="white" fillOpacity="0.82" />
        <line x1="92" y1="92" x2={hueOuterPoint.x} y2={hueOuterPoint.y} stroke="rgb(15 23 42)" strokeWidth="2" />
        <line x1="92" y1="92" x2={huePoint.x} y2={huePoint.y} stroke="white" strokeWidth="4" strokeOpacity="0.8" />
        <circle cx={huePoint.x} cy={huePoint.y} r="8" fill="rgb(15 23 42)" stroke="white" strokeWidth="2.4" filter="url(#hsv-point-glow)" />
        <text x="77" y="96" className="fill-slate-500 text-[10px] font-semibold">S=0</text>
        <text x="122" y="31" className="fill-slate-600 text-[10px] font-semibold">H 指针</text>

        <g opacity="0.18">
          <path d="M 253 28 L 318 176 L 188 176 Z" fill={`hsl(${step.hsv.h}, 88%, 56%)`} />
          <ellipse cx="253" cy="176" rx="65" ry="14" fill={`hsl(${step.hsv.h}, 88%, 56%)`} />
          <path d="M 253 28 L 253 176" stroke="rgb(15 23 42)" strokeWidth="1" strokeDasharray="5 5" />
        </g>

        <rect
          x={svPlane.x}
          y={svPlane.y}
          width={svPlane.width}
          height={svPlane.height}
          rx="6"
          fill={`url(#${hueGradientId})`}
        />
        <rect
          x={svPlane.x}
          y={svPlane.y}
          width={svPlane.width}
          height={svPlane.height}
          rx="6"
          fill="url(#hsv-value-overlay)"
        />
        <rect
          x={svPlane.x}
          y={svPlane.y}
          width={svPlane.width}
          height={svPlane.height}
          rx="6"
          fill="none"
          stroke="rgb(100 116 139)"
          strokeWidth="1.5"
        />
        {[0.25, 0.5, 0.75].map(level => (
          <g key={level} opacity="0.42">
            <line x1={svPlane.x + level * svPlane.width} y1={svPlane.y} x2={svPlane.x + level * svPlane.width} y2={svPlane.y + svPlane.height} stroke="white" />
            <line x1={svPlane.x} y1={svPlane.y + level * svPlane.height} x2={svPlane.x + svPlane.width} y2={svPlane.y + level * svPlane.height} stroke="white" />
          </g>
        ))}
        <line x1={svPlane.x} y1={svPoint.y} x2={svPoint.x} y2={svPoint.y} stroke="white" strokeOpacity="0.92" strokeDasharray="4 4" strokeWidth="1.5" />
        <line x1={svPoint.x} y1={svPlane.y + svPlane.height} x2={svPoint.x} y2={svPoint.y} stroke="white" strokeOpacity="0.92" strokeDasharray="4 4" strokeWidth="1.5" />
        <circle cx={svPoint.x} cy={svPoint.y} r="14" fill="rgb(16 185 129)" fillOpacity="0.24" filter="url(#hsv-point-glow)" />
        <circle cx={svPoint.x} cy={svPoint.y} r="7" fill="rgb(16 185 129)" stroke="white" strokeWidth="2.4" />
        <text x={svPlane.x - 2} y={svPlane.y - 9} className="fill-slate-600 text-[10px] font-semibold">V=1</text>
        <text x={svPlane.x - 2} y={svPlane.y + svPlane.height + 17} className="fill-slate-500 text-[10px] font-semibold">V=0</text>
        <text x={svPlane.x - 2} y={svPlane.y + svPlane.height + 34} className="fill-slate-500 text-[10px] font-semibold">S=0</text>
        <text x={svPlane.x + svPlane.width - 23} y={svPlane.y + svPlane.height + 34} className="fill-slate-500 text-[10px] font-semibold">S=1</text>
      </svg>

      <div className="mt-4 grid gap-2 text-xs">
        {[
          { label: 'H', value: step.hsv.h / 360, text: `${step.hsv.h.toFixed(1)}°`, color: 'bg-amber-500', border: 'border-amber-200', tone: 'text-amber-800' },
          { label: 'S', value: step.hsv.s, text: formatPercent(step.hsv.s), color: 'bg-sky-500', border: 'border-sky-200', tone: 'text-sky-800' },
          { label: 'V', value: step.hsv.v, text: formatPercent(step.hsv.v), color: 'bg-emerald-500', border: 'border-emerald-200', tone: 'text-emerald-800' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl border ${item.border} bg-white px-3 py-2`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`font-semibold ${item.tone}`}>{item.label}</span>
              <span className="font-mono text-slate-500">{item.text}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ColorSpaceHistogramPage() {
  const [displayMode, setDisplayMode] = useState<ColorDisplayMode>('rgb');
  const [currentPosition, setCurrentPosition] = useState({ x: 38, y: 44 });
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [referenceHue, setReferenceHue] = useState<number | null>(null);
  const [loadedRgbImage, setLoadedRgbImage] = useState<RgbPixel[][] | null>(null);
  const fallbackRgbImage = useMemo(() => createFallbackRgbImage(), []);

  useEffect(() => {
    let cancelled = false;

    loadImageAsRgb('/assets/lena-original.jpg')
      .then(image => {
        if (!cancelled) {
          setLoadedRgbImage(toRgbPixels(resizeRgbImage(centerCropRgbImage(image), 96)));
        }
      })
      .catch(error => {
        console.error('加载颜色空间教学图失败:', error);
        if (!cancelled) setLoadedRgbImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rgbImage = loadedRgbImage ?? fallbackRgbImage;
  const width = rgbImage[0]?.length ?? 0;
  const height = rgbImage.length;
  const baseImage = useMemo(() => rgbToLumaImage(rgbImage), [rgbImage]);

  const safePosition = {
    x: width > 0 ? Math.min(currentPosition.x, width - 1) : 0,
    y: height > 0 ? Math.min(currentPosition.y, height - 1) : 0,
  };

  const currentStep = useMemo(
    () => getColorSpaceStepAt(rgbImage, safePosition.x, safePosition.y, displayMode, threshold, BIN_COUNT, referenceHue),
    [displayMode, rgbImage, safePosition.x, safePosition.y, threshold, referenceHue]
  );

  const effectiveReferenceHue = referenceHue ?? currentStep?.hsv.h ?? 0;

  const histogram = useMemo(
    () => computeColorHistogram(rgbImage, displayMode, BIN_COUNT),
    [displayMode, rgbImage]
  );

  const maskImage = useMemo(() => {
    if (!currentStep) return baseImage;
    return createHueMask(rgbImage, effectiveReferenceHue, threshold);
  }, [baseImage, currentStep, effectiveReferenceHue, rgbImage, threshold]);

  const resultImage = useMemo<GrayscaleImage>(() => {
    if (displayMode === 'rgb') return baseImage;
    if (displayMode === 'mask') return maskImage;
    return extractColorChannel(rgbImage, displayMode) ?? baseImage;
  }, [baseImage, displayMode, maskImage, rgbImage]);

  const resultRgbImage = displayMode === 'rgb' ? rgbImage : null;
  const currentStepIndex = safePosition.y * width + safePosition.x;
  const totalSteps = width * height;
  const maskPixelCount = useMemo(() => countMaskPixels(maskImage), [maskImage]);

  const handlePixelSelect = useCallback((x: number, y: number) => {
    if (width === 0 || height === 0) return;
    const newX = Math.max(0, Math.min(x, width - 1));
    const newY = Math.max(0, Math.min(y, height - 1));
    setCurrentPosition({ x: newX, y: newY });
    // Set referenceHue from the clicked pixel for thresholdHit comparison
    if (rgbImage[newY]?.[newX]) {
      const [r, g, b] = rgbImage[newY][newX];
      const hsv = rgbToHsv(r, g, b);
      setReferenceHue(hsv.h);
    }
  }, [height, width, rgbImage]);

  const handleDirectionMove = useGridNavigation({
    current: currentStep ? { x: currentStep.x, y: currentStep.y } : null,
    bounds: { width, height },
    onMove: setCurrentPosition,
    disabled: totalSteps === 0,
  });

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (!currentStep || width === 0 || height === 0) return [];

    return [
      {
        id: 'color-input-pixel',
        tone: 'red',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-input-main',
          x: currentStep.x,
          y: currentStep.y,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.color-anchor-rgb-node' },
      },
      {
        id: 'color-output-pixel',
        tone: 'emerald',
        from: {
          kind: 'pixel',
          selector: '.conv-anchor-output-main',
          x: currentStep.x,
          y: currentStep.y,
          imageWidth: width,
          imageHeight: height,
        },
        to: { kind: 'element', selector: '.color-anchor-mask-node' },
      },
    ];
  }, [currentStep, height, width]);

  const visualOverlay = visualOverlayPaths.length > 0 ? (
    <AnchoredOverlay paths={visualOverlayPaths} />
  ) : null;

  const analysisPreview = useMemo(() => {
    if (!currentStep) return null;
    const [r, g, b] = currentStep.rgb255;
    const currentCount = histogram.counts[currentStep.histogramBin] ?? 0;
    const currentProbability = histogram.bins[currentStep.histogramBin] ?? 0;

    return (
      <ProcessRail>
        <FlowColumns>
          <FlowColumn align="start">
            <FlowNode tone="red" className="color-anchor-rgb-node">
              <div className="mb-2 text-xs font-semibold text-red-700">当前像素 RGB</div>
              <div className="flex items-center gap-3">
                <PixelColorSwatch
                  color={{ r: currentStep.rgb[0], g: currentStep.rgb[1], b: currentStep.rgb[2] }}
                  className="h-14 w-14"
                  title={`RGB(${r}, ${g}, ${b})`}
                />
                <div className="font-mono text-sm leading-6 text-slate-700">
                  <div>R = {r}</div>
                  <div>G = {g}</div>
                  <div>B = {b}</div>
                </div>
              </div>
              <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                坐标 ({currentStep.x}, {currentStep.y}) 的真实像素值进入后续 HSV 和直方图计算。
              </div>
            </FlowNode>
          </FlowColumn>

          <FlowColumn align="center">
            <FlowNode tone="amber">
              <div className="mb-2 text-xs font-semibold text-amber-700">RGB → HSV</div>
              <div className="grid gap-2 text-xs text-amber-800">
                <div className="rounded-xl bg-amber-50 px-3 py-2">
                  Cmax = {currentStep.cmax.toFixed(3)}，Cmin = {currentStep.cmin.toFixed(3)}，Δ = {currentStep.delta.toFixed(3)}
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono">
                  H = {currentStep.hsv.h.toFixed(1)}°<br />
                  S = {formatPercent(currentStep.hsv.s)}<br />
                  V = {formatPercent(currentStep.hsv.v)}
                </div>
              </div>
            </FlowNode>

            <FlowNode tone="sky">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-sky-700">{channelLabel(histogram.channel)}直方图</span>
                <span className="font-mono text-[11px] text-sky-700">bin {currentStep.histogramBin}</span>
              </div>
              <HistogramBars histogram={histogram} highlightedBin={currentStep.histogramBin} />
              <div className="mt-2 text-xs leading-5 text-slate-600">
                当前 bin 有 {currentCount} 个像素，比例为 {formatPercent(currentProbability)}。
              </div>
            </FlowNode>
          </FlowColumn>

          <FlowColumn align="end">
            <FlowNode tone="emerald" className="color-anchor-mask-node">
              <div className="mb-2 text-xs font-semibold text-emerald-700">颜色范围提取</div>
              <div className="grid gap-2 text-xs leading-5 text-emerald-800">
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  目标色调 H0 = {effectiveReferenceHue.toFixed(1)}°，阈值 T = {threshold}°
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2">
                  当前 mask 共选中 {maskPixelCount} / {totalSteps} 个像素。
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 font-semibold">
                  当前像素：{currentStep.thresholdHit ? '命中目标色范围' : '未命中'}
                </div>
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [currentStep, histogram, maskPixelCount, threshold, totalSteps, effectiveReferenceHue]);

  const stepDetails = useMemo(() => {
    if (!currentStep) return null;

    return (
      <div className="space-y-4">
        <TeachingCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">当前像素的 RGB → HSV 代入</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                HSV 先把 RGB 归一化，再用最大值、最小值和差值决定色调、饱和度与明度。
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              ({currentStep.x}, {currentStep.y})
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <FormulaCard label="归一化" mathML={buildRgbNormalizeFormula(currentStep)} />
            <FormulaCard label="极值与差值" mathML={buildHsvExtremaFormula(currentStep)} />
            <FormulaCard label="HSV 结果" mathML={buildHsvResultFormula(currentStep)} />
          </div>
        </TeachingCard>

        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">当前直方图 bin</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            直方图不关心颜色出现在哪里，只统计当前通道数值落入每个区间的像素比例。
          </p>
          <div className="mt-4">
            <HistogramBars histogram={histogram} highlightedBin={currentStep.histogramBin} />
          </div>
          <FormulaCard
            className="mt-4"
            label={`${channelLabel(histogram.channel)} 的归一化直方图`}
            mathML={buildHistogramFormula(currentStep, histogram)}
          />
        </TeachingCard>

        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">HSV 颜色范围提取</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            以当前像素的 H 作为目标色调 H0，在色调环上选择距离不超过阈值 T 的像素，得到右侧 mask。
          </p>
          <FormulaCard
            className="mt-4"
            label="Hue 阈值判定"
            mathML={buildMaskFormula(currentStep, effectiveReferenceHue, threshold)}
            note={`当前阈值选中 ${maskPixelCount} 个像素，占整幅图 ${formatPercent(maskPixelCount / Math.max(1, totalSteps))}。`}
          />
        </TeachingCard>

        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">概念补充</div>
          <p className="mt-1 text-xs leading-6 text-slate-600">
            RGB 适合描述显示设备中的三基色强度，HSV 把颜色拆成色调、饱和度和明度。目标颜色与背景差异明显时，
            H 分量和颜色直方图可以作为简单、直观的目标检测特征。
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <RgbCubeDiagram step={currentStep} />
            <HsvConeDiagram step={currentStep} />
          </div>
        </TeachingCard>
      </div>
    );
  }, [currentStep, histogram, maskPixelCount, threshold, totalSteps, effectiveReferenceHue]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="显示模式"
        value={displayMode}
        onChange={value => setDisplayMode(value as ColorDisplayMode)}
        options={DISPLAY_MODE_OPTIONS}
      />

      <SliderParam
        label="Hue 阈值 T"
        value={threshold}
        onChange={setThreshold}
        min={5}
        max={90}
        step={5}
      />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
        <div className="text-xs font-semibold text-emerald-800">阈值含义</div>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          在 HSV 色调环上，以当前像素 H0 为中心，选择 H0 ± {threshold}° 范围内的像素作为目标颜色。
        </p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">当前图像</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          尺寸 {width}×{height}，共 {totalSteps} 个像素。点击图像或使用方向键会同步刷新公式、直方图和 mask。
        </p>
      </div>

      {currentStep && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3">
          <div className="text-xs font-semibold text-amber-800">当前像素</div>
          <div className="mt-2 flex items-center gap-3">
            <PixelColorSwatch
              color={{ r: currentStep.rgb[0], g: currentStep.rgb[1], b: currentStep.rgb[2] }}
              className="h-10 w-10"
            />
            <div className="space-y-1 font-mono text-[11px] text-amber-800">
              <div>坐标 ({currentStep.x}, {currentStep.y})</div>
              <div>RGB ({currentStep.rgb255.join(', ')})</div>
              <div>HSV ({currentStep.hsv.h.toFixed(1)}°, {formatPercent(currentStep.hsv.s)}, {formatPercent(currentStep.hsv.v)})</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ConceptLayout
      title="颜色空间与颜色直方图"
      subtitle="Color Space & Histogram - 基于颜色特征的目标检测"
      operationLabel={operationLabel(displayMode)}
      parameterIntro="切换显示模式查看不同颜色通道或 HSV 颜色提取结果；当前像素会同步驱动公式代入、当前直方图 bin 和颜色范围提取结果。"
      originalImage={baseImage}
      originalRgbImage={rgbImage}
      resultImage={resultImage}
      resultRgbImage={resultRgbImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={visualOverlay}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: CORE_CODE_TS }]} />}
      currentStep={
        currentStep
          ? { x: currentStep.x, y: currentStep.y, kernelSize: 1 }
          : null
      }
      stepInfo={totalSteps > 0 ? { current: currentStepIndex, total: totalSteps } : null}
      imageLabels={{
        input: '真实 RGB 原图',
        output: modeLabel(displayMode),
      }}
      imageHints={{
        input: '点击像素选择目标颜色并刷新 HSV 计算',
        output: displayMode === 'mask' ? '白色表示 Hue 阈值命中区域' : '点击结果图同步定位像素',
      }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      navigationHintText="方向键移动 / 点击原图或结果图定位像素"
      onDirectionMove={handleDirectionMove}
      onInputRegionSelect={handlePixelSelect}
      onOutputPixelSelect={handlePixelSelect}
    />
  );
}
