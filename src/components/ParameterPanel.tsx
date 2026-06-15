'use client';

import React, { useId } from 'react';

interface ParameterPanelProps {
  children: React.ReactNode;
}

export default function ParameterPanel({ children }: ParameterPanelProps) {
  return <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-8 gap-y-4 overflow-x-hidden">{children}</div>;
}

interface SliderParamProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export function SliderParam({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
}: SliderParamProps) {
  const inputId = useId();

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="min-w-0 break-words text-sm font-medium text-slate-700">{label}</label>
        <span className="shrink-0 text-sm font-mono text-slate-600 tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
      />
    </div>
  );
}

interface SelectParamProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export function SelectParam({ label, value, onChange, options }: SelectParamProps) {
  const selectId = useId();

  return (
    <div className="w-full min-w-0 max-w-full space-y-1.5">
      <label htmlFor={selectId} className="block break-words text-sm font-medium text-slate-700">{label}</label>
      <div className="relative min-w-0 max-w-full">
        <select
          id={selectId}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full min-w-0 max-w-full cursor-pointer appearance-none truncate rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

interface KernelEditorProps {
  label: string;
  kernel: number[][];
  onChange: (kernel: number[][]) => void;
  size: number;
}

export function KernelEditor({ label, kernel, onChange, size }: KernelEditorProps) {
  const groupId = useId();

  const handleChange = (y: number, x: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newKernel = kernel.map(row => [...row]);
    newKernel[y][x] = numValue;
    onChange(newKernel);
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden">
      {label && <div id={groupId} className="block break-words text-sm font-medium text-slate-700">{label}</div>}
      <div
        role="group"
        aria-labelledby={label ? groupId : undefined}
        className="grid w-full min-w-0 max-w-full gap-1 rounded-xl border border-slate-100 bg-slate-50 p-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {kernel.map((row, y) =>
          row.map((value, x) => (
            <input
              key={`${y}-${x}`}
              type="number"
              step="0.1"
              value={value}
              onChange={e => handleChange(y, x, e.target.value)}
              aria-label={`${label || '卷积核'}第 ${y + 1} 行第 ${x + 1} 列`}
              className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white text-center font-mono text-xs transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ))
        )}
      </div>
    </div>
  );
}
