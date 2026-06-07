'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  teachingHint?: React.ReactNode;
  imageHints?: {
    input?: string;
    output?: string;
  };
  showOriginalGrid?: boolean;
  originalRegionMarker?: 'frame' | 'dot';
  currentStep?: { x: number; y: number; kernelSize: number } | null;
  stepInfo?: { current: number; total: number } | null;
  onStepChange?: (newIndex: number) => void;
  onDirectionMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onInputRegionSelect?: (x: number, y: number) => void;
  onOutputPixelSelect?: (x: number, y: number) => void;
  navigationHintText?: string;
  singlePageScroll?: boolean;
  visualOverlay?: React.ReactNode;
  analysisPreview?: React.ReactNode;
}

export default function ConceptLayout({
  title,
  subtitle,
  originalImage,
  resultImage,
  parameters,
  stepDetails,
  codeTab,
  teachingHint,
  imageHints,
  showOriginalGrid = true,
  originalRegionMarker = 'frame',
  currentStep,
  stepInfo,
  onDirectionMove,
  onInputRegionSelect,
  onOutputPixelSelect,
  navigationHintText,
  singlePageScroll = false,
  visualOverlay,
  analysisPreview,
}: ConceptLayoutProps) {
  const [showCode, setShowCode] = useState(false);
  const [showParameters, setShowParameters] = useState(true);

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

  const resolvedNavigationHint = useMemo(() => {
    if (navigationHintText) return navigationHintText;
    if (onInputRegionSelect || onOutputPixelSelect) {
      return '方向键移动 / 点击图像跳转';
    }
    return '方向键移动';
  }, [navigationHintText, onInputRegionSelect, onOutputPixelSelect]);
  const mainImageSize = singlePageScroll ? 280 : 320;

  const navigationControlPanel = stepInfo ? (
    <details className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-slate-700 marker:content-none">
        <span>窗口定位</span>
        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
          辅助操作
        </span>
      </summary>
      <div className="border-t border-slate-200 px-3 py-3">
        <div className="text-xs leading-5 text-slate-500">
          用方向键或下方 4 个按钮移动当前窗口；也可以直接点击原图或结果图跳转。
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {currentStep && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              当前像素 ({currentStep.x}, {currentStep.y})
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
            第 {stepInfo.current + 1} / {stepInfo.total} 步
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 place-items-center">
          <div />
          <button
            type="button"
            onClick={() => onDirectionMove?.('up')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            aria-label="向上移动"
            title="向上移动"
          >
            ↑
          </button>
          <div />

          <button
            type="button"
            onClick={() => onDirectionMove?.('left')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            aria-label="向左移动"
            title="向左移动"
          >
            ←
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-[10px] font-semibold tracking-[0.12em] text-slate-400">
            方向
          </div>
          <button
            type="button"
            onClick={() => onDirectionMove?.('right')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            aria-label="向右移动"
            title="向右移动"
          >
            →
          </button>

          <div />
          <button
            type="button"
            onClick={() => onDirectionMove?.('down')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            aria-label="向下移动"
            title="向下移动"
          >
            ↓
          </button>
          <div />
        </div>
      </div>
    </details>
  ) : null;

  const navigationBar = stepInfo ? (
    <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-500">
          <span>{resolvedNavigationHint}</span>
          {currentStep && (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600">
              当前结果像素 ({currentStep.x}, {currentStep.y})
            </span>
          )}
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-medium text-slate-600">
          第 {stepInfo.current + 1} / {stepInfo.total} 步
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {visualOverlay}

      <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-full w-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm">返回</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-semibold text-slate-900">{title}</h1>
              {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
            </div>
          </div>

          <button
            onClick={() => setShowCode(!showCode)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              showCode
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {showCode ? '隐藏代码' : '查看代码'}
          </button>
        </div>
      </header>

      <div
        className={`flex flex-1 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_55%,#f1f5f9_100%)] ${
          singlePageScroll ? 'items-start' : 'overflow-hidden'
        }`}
      >
        <div
          className={`shrink-0 border-r border-slate-200/70 ${
            showParameters ? 'w-[15.5rem] xl:w-[17rem]' : 'w-[4.75rem]'
          } ${singlePageScroll ? 'sticky top-[4.25rem] self-start' : ''} transition-all duration-300`}
        >
          <div className={`${singlePageScroll ? 'p-3 xl:p-4' : 'h-full p-3 xl:p-4'}`}>
            <div
              className={`flex flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur ${
                singlePageScroll ? 'max-h-[calc(100vh-5.25rem)]' : 'h-full'
              }`}
            >
              <div className="border-b border-slate-100 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  {showParameters ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-semibold text-slate-800">参数面板</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        先观察右侧可视化过程，再结合这里的参数调整，有助于理解卷积窗口、核大小与输出尺寸之间的关系。
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-medium tracking-[0.2em] text-slate-500 [writing-mode:vertical-rl]">
                        参数
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowParameters(prev => !prev)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    aria-label={showParameters ? '收起参数面板' : '展开参数面板'}
                    title={showParameters ? '收起参数面板' : '展开参数面板'}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${showParameters ? '' : 'rotate-180'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {showParameters ? (
                <div className={`${singlePageScroll ? 'overflow-y-auto' : 'flex-1 overflow-y-auto'} px-4 pb-4 pt-3`}>
                  {parameters}
                  {navigationControlPanel}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center px-2 py-4">
                  <button
                    type="button"
                    onClick={() => setShowParameters(true)}
                    className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs leading-5 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  >
                    展开参数
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`relative flex-1 min-w-0 p-3 xl:p-4 ${singlePageScroll ? 'pb-6' : ''}`}>
          <div className={`flex min-w-0 flex-col ${singlePageScroll ? '' : 'h-full overflow-hidden'}`}>
            {singlePageScroll && navigationBar && (
              <div className="sticky top-[4.5rem] z-20 border-b border-slate-200/80 bg-[rgba(248,250,252,0.92)] backdrop-blur">
                {navigationBar}
              </div>
            )}

            <div
              className={`px-4 pt-4 xl:px-6 ${
                singlePageScroll ? 'pb-5 pt-5 xl:pt-5' : 'flex-1 min-h-0 overflow-auto pb-3 xl:pt-6 xl:pb-4'
              }`}
            >
              <div className="flex flex-wrap items-center justify-center gap-5 xl:gap-7">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">原图</span>
                    {originalImage && (
                      <span className="font-mono text-xs text-slate-400">
                        {originalImage[0]?.length}×{originalImage.length}
                      </span>
                    )}
                  </div>
                  <ImageCanvas
                    image={originalImage}
                    maxDisplaySize={mainImageSize}
                    showGrid={showOriginalGrid}
                    interactive={Boolean(onInputRegionSelect)}
                    onRegionSelect={onInputRegionSelect}
                    containerClassName="teaching-pulse-input conv-anchor-input-main"
                    selectedRegionMarker={originalRegionMarker}
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
                  {imageHints?.input && (
                    <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                      {imageHints.input}
                    </div>
                  )}
                </div>

                <div className="conv-anchor-main-operator shrink-0 flex flex-col items-center gap-2">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center shadow-[0_10px_24px_rgba(245,158,11,0.12)]">
                    <div className="text-[10px] font-semibold tracking-[0.12em] text-amber-700">
                      卷积计算
                    </div>
                    <svg
                      className="mx-auto mt-1 h-7 w-7 text-amber-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {stepInfo && (
                    <span className="font-mono text-xs text-slate-400">
                      {stepInfo.current + 1}/{stepInfo.total}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">结果</span>
                    {resultImage && (
                      <span className="font-mono text-xs text-slate-400">
                        {resultImage[0]?.length}×{resultImage.length}
                      </span>
                    )}
                  </div>
                  <ImageCanvas
                    image={resultImage}
                    maxDisplaySize={mainImageSize}
                    showGrid={Boolean(resultImage && (resultImage[0]?.length ?? 0) <= 16)}
                    interactive={Boolean(onOutputPixelSelect)}
                    onRegionSelect={onOutputPixelSelect}
                    containerClassName="teaching-pulse-output conv-anchor-output-main"
                    highlightPixel={currentStep ? { x: currentStep.x, y: currentStep.y } : null}
                  />
                  {imageHints?.output && (
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                      {imageHints.output}
                    </div>
                  )}
                </div>
              </div>

              {teachingHint && (
                <div className="mx-auto mt-4 max-w-5xl">
                  <div className="teaching-flow-card rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
                    {teachingHint}
                  </div>
                </div>
              )}

            </div>

            {singlePageScroll ? (
              <div className="px-4 pb-4 xl:px-6 xl:pb-6">
                <div className="overflow-visible">
                  {analysisPreview && (
                    <div className="border-b border-slate-200/80">
                      <div className="px-4 py-4">{analysisPreview}</div>
                    </div>
                  )}
                  {!singlePageScroll && navigationBar && navigationBar}
                  <div className="p-4">{stepDetails}</div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] max-h-[46vh] flex-col border-t border-slate-200 bg-white xl:max-h-[44vh]">
                {navigationBar}
                <div className="flex-1 overflow-y-auto p-4">{stepDetails}</div>
              </div>
            )}
          </div>

          {showCode && (
            <>
              <button
                type="button"
                aria-label="关闭代码面板"
                onClick={() => setShowCode(false)}
                className="absolute inset-3 z-10 rounded-[1.75rem] bg-slate-900/10 backdrop-blur-[1px] xl:inset-4"
              />
              <div
                className="absolute inset-y-3 right-3 z-20 flex w-full max-w-[30rem] flex-col overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl xl:inset-y-4 xl:right-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                  <span className="text-xs font-medium text-slate-300">代码实现</span>
                  <span className="text-[10px] text-slate-500">TypeScript</span>
                </div>
                <div className="flex-1 overflow-auto p-4">{codeTab}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
