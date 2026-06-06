'use client';

import React from 'react';

interface ParameterPanelProps {
  children: React.ReactNode;
}

export default function ParameterPanel({ children }: ParameterPanelProps) {
  return <div className="flex flex-wrap items-center gap-x-8 gap-y-4">{children}</div>;
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
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-700 min-w-[80px]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-32 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
      />
      <span className="text-sm font-mono text-slate-600 min-w-[50px] tabular-nums">
        {value}
        {unit}
      </span>
    </div>
  );
}

interface SelectParamProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SelectParam({ label, value, onChange, options }: SelectParamProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-700 min-w-[80px]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none px-4 py-2 pr-10 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  const handleChange = (y: number, x: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newKernel = kernel.map(row => [...row]);
    newKernel[y][x] = numValue;
    onChange(newKernel);
  };

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div
        className="inline-grid gap-1.5 p-4 bg-slate-50 rounded-xl border border-slate-100"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {kernel.map((row, y) =>
          row.map((value, x) => (
            <input
              key={`${y}-${x}`}
              type="number"
              step="0.1"
              value={value}
              onChange={e => handleChange(y, x, e.target.value)}
              className="w-14 h-11 text-center text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          ))
        )}
      </div>
    </div>
  );
}
