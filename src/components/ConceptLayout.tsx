'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ImageCanvas from './ImageCanvas';
import { GrayscaleImage } from '@/lib/algorithms/types';

interface ConceptLayoutProps {
  title: string;
  subtitle?: string;
  originalImage: GrayscaleImage | null;
  resultImage: GrayscaleImage | null;
  parameters: React.ReactNode;
  stepDetails: React.ReactNode;
  codeTab: React.ReactNode;
  currentStep?: { x: number; y: number; kernelSize: number } | null;
  stepInfo?: { current: number; total: number } | null;
  onStepChange?: (newIndex: number) => void;
  onDirectionMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export default function ConceptLayout({
  title,
  subtitle,
  originalImage,
  resultImage,
  parameters,
  stepDetails,
  codeTab,
  currentStep,
  stepInfo,
  onStepChange,
  onDirectionMove,
}: ConceptLayoutProps) {
  const [showCode, setShowCode] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!onDirectionMove) return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onDirectionMove('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onDirectionMove('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onDirectionMove('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onDirectionMove('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDirectionMove]);

  const handlePrev = useCallback(() => {
    if (stepInfo && onStepChange) {
      onStepChange(Math.max(0, stepInfo.current - 1));
    }
  }, [stepInfo, onStepChange]);

  const handleNext = useCallback(() => {
    if (stepInfo && onStepChange) {
      onStepChange(Math.min(stepInfo.total - 1, stepInfo.current + 1));
    }
  }, [stepInfo, onStepChange]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center shrink-0">
        <div className="w-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm">返回</span>
            </Link>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-semibold text-slate-900">{title}</h1>
              {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
            </div>
          </div>
          
          <button
            onClick={() => setShowCode(!showCode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              showCode 
                ? 'bg-slate-800 text-white border-slate-800' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {showCode ? '隐藏代码' : '查看代码'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Parameters */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-slate-700">参数设置</span>
            </div>
            {parameters}
          </div>
        </div>

        {/* Center - Visualization */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
          {/* Image Comparison Row */}
          <div className="flex-1 flex items-center justify-center gap-8 p-6 min-h-0">
            {/* Original Image */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">原图</span>
                {originalImage && (
                  <span className="text-xs text-slate-400 font-mono">
                    {originalImage[0]?.length}×{originalImage.length}
                  </span>
                )}
              </div>
              <ImageCanvas
                image={originalImage}
                maxDisplaySize={320}
                showGrid
                selectedRegion={
                  currentStep
                    ? {
                        x: currentStep.x,
                        y: currentStep.y,
                        size: currentStep.kernelSize,
                      }
                    : null
                }
              />
            </div>

            {/* Arrow with step info */}
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {stepInfo && (
                <span className="text-xs text-slate-400 font-mono">
                  {stepInfo.current + 1}/{stepInfo.total}
                </span>
              )}
            </div>

            {/* Result Image */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md">结果</span>
                {resultImage && (
                  <span className="text-xs text-slate-400 font-mono">
                    {resultImage[0]?.length}×{resultImage.length}
                  </span>
                )}
              </div>
              <ImageCanvas
                image={resultImage}
                maxDisplaySize={320}
                showGrid={false}
                highlightPixel={currentStep ? { x: currentStep.x, y: currentStep.y } : null}
                selectedRegion={currentStep ? { x: currentStep.x, y: currentStep.y, size: currentStep.kernelSize } : null}
              />
            </div>
          </div>

          {/* Step Details Panel */}
          <div className="bg-white border-t border-slate-200 flex flex-col min-h-[280px] max-h-[40vh]">
            {/* Navigation Bar */}
            {stepInfo && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">方向键移动 / 点击跳转</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrev}
                    disabled={stepInfo.current === 0}
                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    上一步
                  </button>
                  <span className="px-2 text-xs font-mono text-slate-600">
                    {stepInfo.current + 1} / {stepInfo.total}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={stepInfo.current === stepInfo.total - 1}
                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    下一步
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">
              {stepDetails}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Code (Collapsible) */}
        {showCode && (
          <div className="w-96 bg-slate-900 border-l border-slate-700 overflow-hidden flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">代码实现</span>
              <span className="text-[10px] text-slate-500">TypeScript</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {codeTab}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
