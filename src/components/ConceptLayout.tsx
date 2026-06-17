'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ImageCanvas from './ImageCanvas';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { ConceptIntro, CONCEPT_INTRO_CONTENT } from '@/components/teaching';

interface ConceptLayoutProps {
  maxDisplaySize?: number;
  title: string;
  subtitle?: string;
  contentHeader?: React.ReactNode;
  originalImage: GrayscaleImage | null;
  resultImage: GrayscaleImage | null;
  /** 可选的 RGB 原图，用于真彩色渲染 */
  originalRgbImage?: number[][][] | null;
  /** 可选的 RGB 结果图 */
  resultRgbImage?: number[][][] | null;
  parameters: React.ReactNode;
  stepDetails: React.ReactNode;
  codeTab: React.ReactNode;
  teachingHint?: React.ReactNode;
  imageHints?: {
    input?: string;
    output?: string;
  };
  imageLabels?: {
    input?: string;
    output?: string;
  };
  showOriginalGrid?: boolean;
  originalRegionMarker?: 'frame' | 'dot';
  currentStep?: {
    x: number;
    y: number;
    kernelSize: number;
    regionX?: number;
    regionY?: number;
    regionWidth?: number;
    regionHeight?: number;
    outputX?: number;
    outputY?: number;
  } | null;
  currentStepLabel?: string;
  stepInfo?: { current: number; total: number } | null;
  onStepChange?: (newIndex: number) => void;
  onDirectionMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onInputRegionSelect?: (x: number, y: number) => void;
  onOutputPixelSelect?: (x: number, y: number) => void;
  navigationHintText?: string;
  singlePageScroll?: boolean;
  visualOverlay?: React.ReactNode;
  analysisPreview?: React.ReactNode;
  operationLabel?: string;
  parameterIntro?: React.ReactNode;
  mainVisual?: React.ReactNode;
  showInputSelection?: boolean;
  showNavigationBar?: boolean;
  showNavigationControls?: boolean;
  /** 章节标签，如 "第一章 / 图像采集与处理" */
  chapterLabel?: string;
}

/** 概念路径 → 章节标签映射 */
export const CHAPTER_LABELS: Record<string, string> = {
  // 第一章：课程导入
  '/concepts/applications-overview': '第一章 / 课程导入',
  '/concepts/acquisition-system': '第一章 / 课程导入',
  // 第二章：图像预处理与几何校正
  '/concepts/grayscale': '第二章 / 图像预处理',
  '/concepts/pixel-matrix': '第二章 / 图像预处理',
  '/concepts/histogram': '第二章 / 图像预处理',
  '/concepts/histogram-equalization': '第二章 / 图像预处理',
  '/concepts/image-sharpening': '第二章 / 图像预处理',
  '/concepts/convolution': '第二章 / 图像预处理',
  '/concepts/blur': '第二章 / 图像预处理',
  '/concepts/edge-detection': '第二章 / 图像预处理',
  '/concepts/morphology': '第二章 / 图像预处理',
  '/concepts/camera-model': '第二章 / 摄像机标定',
  '/concepts/calibration-pattern': '第二章 / 摄像机标定',
  '/concepts/zhang-calibration': '第三章 / 摄像机标定',
  '/concepts/distortion-correction': '第二章 / 图像校正',
  '/concepts/geometric-transform': '第二章 / 图像校正',
  '/concepts/perspective-transform': '第二章 / 图像校正',
  '/concepts/image-registration': '第二章 / 图像校正',
  // 第三章：目标检测
  '/concepts/threshold-auto-threshold': '第三章 / 简单背景方法',
  '/concepts/otsu': '第三章 / 简单背景方法',
  '/concepts/frame-difference-motion': '第三章 / 简单背景方法',
  '/concepts/background-modeling-subtraction': '第三章 / 简单背景方法',
  '/concepts/keypoint-matching-pipeline': '第三章 / 特征点方法',
  '/concepts/sift-surf-scale-features': '第三章 / 特征点方法',
  '/concepts/binary-feature-descriptors': '第三章 / 特征点方法',
  '/concepts/color-space-histogram': '第三章 / 特征明显方法',
  '/concepts/lbp-gabor-texture': '第三章 / 特征明显方法',
  '/concepts/histogram-template-matching': '第三章 / 特征明显方法',
  '/concepts/hog-feature': '第三章 / 机器学习方法',
  '/concepts/haar-lbp-feature-vector': '第三章 / 机器学习方法',
  '/concepts/classifier-detection-pipeline': '第三章 / 检测流程',
};

/** 按学习顺序排列的所有概念路径 */
const CONCEPT_ORDER: string[] = [
  '/concepts/applications-overview',
  '/concepts/acquisition-system',
  '/concepts/grayscale',
  '/concepts/pixel-matrix',
  '/concepts/histogram',
  '/concepts/histogram-equalization',
  '/concepts/image-sharpening',
  '/concepts/convolution',
  '/concepts/blur',
  '/concepts/edge-detection',
  '/concepts/morphology',
  '/concepts/camera-model',
  '/concepts/calibration-pattern',
  '/concepts/zhang-calibration',
  '/concepts/distortion-correction',
  '/concepts/geometric-transform',
  '/concepts/perspective-transform',
  '/concepts/image-registration',
  '/concepts/threshold-auto-threshold',
  '/concepts/otsu',
  '/concepts/frame-difference-motion',
  '/concepts/background-modeling-subtraction',
  '/concepts/keypoint-matching-pipeline',
  '/concepts/sift-surf-scale-features',
  '/concepts/binary-feature-descriptors',
  '/concepts/color-space-histogram',
  '/concepts/lbp-gabor-texture',
  '/concepts/histogram-template-matching',
  '/concepts/hog-feature',
  '/concepts/haar-lbp-feature-vector',
  '/concepts/classifier-detection-pipeline',
];

export interface NextConcept {
  href: string;
  title: string;
}

/** 路径 → 展示标题映射 */
const CONCEPT_TITLES: Record<string, string> = {
  '/concepts/applications-overview': '应用与发展现状',
  '/concepts/acquisition-system': '图像采集处理系统',
  '/concepts/grayscale': '图像灰度化',
  '/concepts/pixel-matrix': '像素矩阵与邻域窗口',
  '/concepts/histogram': '灰度直方图',
  '/concepts/histogram-equalization': '直方图均衡化',
  '/concepts/image-sharpening': '图像锐化',
  '/concepts/convolution': '卷积',
  '/concepts/blur': '图像滤波',
  '/concepts/edge-detection': '边缘检测',
  '/concepts/morphology': '形态学操作',
  '/concepts/camera-model': '成像模型与内外参数',
  '/concepts/calibration-pattern': '标定板与角点检测',
  '/concepts/zhang-calibration': '张正友标定与参数求解',
  '/concepts/distortion-correction': '畸变校正',
  '/concepts/geometric-transform': '几何变换',
  '/concepts/perspective-transform': '透视变换',
  '/concepts/image-registration': '图像配准',
  '/concepts/threshold-auto-threshold': '阈值分割与自动阈值',
  '/concepts/otsu': 'OTSU 阈值',
  '/concepts/frame-difference-motion': '帧差法与运动检测',
  '/concepts/background-modeling-subtraction': '背景建模与背景减除',
  '/concepts/keypoint-matching-pipeline': '特征点检测与匹配流程',
  '/concepts/sift-surf-scale-features': 'SIFT / SURF 尺度特征',
  '/concepts/binary-feature-descriptors': 'ORB / BRIEF / BRISK 二进制特征',
  '/concepts/color-space-histogram': '颜色空间与颜色直方图',
  '/concepts/lbp-gabor-texture': 'LBP 与 Gabor 纹理特征',
  '/concepts/histogram-template-matching': '直方图匹配与模板匹配',
  '/concepts/hog-feature': 'HOG 特征',
  '/concepts/haar-lbp-feature-vector': 'Haar / LBP 特征向量',
  '/concepts/classifier-detection-pipeline': '分类器与检测流程',
};

/** 路径 → 下一节信息 */
export const NEXT_CONCEPT_MAP: Record<string, NextConcept> = {};
for (let i = 0; i < CONCEPT_ORDER.length - 1; i++) {
  const current = CONCEPT_ORDER[i];
  const nextPath = CONCEPT_ORDER[i + 1];
  NEXT_CONCEPT_MAP[current] = {
    href: nextPath,
    title: CONCEPT_TITLES[nextPath] ?? nextPath.split('/').pop() ?? '',
  };
}

export default function ConceptLayout({
  title,
  subtitle,
  contentHeader,
  chapterLabel,
  originalImage,
  resultImage,
  originalRgbImage,
  resultRgbImage,
  parameters,
  stepDetails,
  codeTab,
  teachingHint,
  imageHints,
  imageLabels,
  showOriginalGrid = true,
  originalRegionMarker = 'frame',
  currentStep,
  currentStepLabel = '当前结果像素',
  stepInfo,
  onDirectionMove,
  onInputRegionSelect,
  onOutputPixelSelect,
  navigationHintText,
  maxDisplaySize,
  singlePageScroll = false,
  visualOverlay,
  analysisPreview,
  operationLabel = '处理步骤',
  parameterIntro = '参数面板用于调整当前示例、算法参数和辅助操作；主区负责展示图像处理过程。',
  mainVisual,
  showInputSelection = true,
  showNavigationBar = true,
  showNavigationControls = true,
}: ConceptLayoutProps) {
  const pathname = usePathname();
  const [showCode, setShowCode] = useState(false);
  const [showParameters, setShowParameters] = useState(true);
  const conceptIntroContent = CONCEPT_INTRO_CONTENT[pathname ?? ''];
  const resolvedChapterLabel = chapterLabel || CHAPTER_LABELS[pathname ?? ''];
  const resolvedNextConcept = NEXT_CONCEPT_MAP[pathname ?? ''];
  const mergedContentHeader = conceptIntroContent || contentHeader ? (
    <div className="space-y-4">
      {conceptIntroContent && <ConceptIntro {...conceptIntroContent} />}
      {contentHeader && (
        <div className={conceptIntroContent ? 'border-t border-slate-200 pt-4' : ''}>
          {contentHeader}
        </div>
      )}
    </div>
  ) : null;

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
  const mainImageSize = maxDisplaySize ?? (singlePageScroll ? 280 : 320);

  const navigationControlPanel = stepInfo && showNavigationControls ? (
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
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-600">
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

  const navigationBar = stepInfo && showNavigationBar ? (
    <div className="bg-slate-50/50 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-500">
          <span>{resolvedNavigationHint}</span>
          {currentStep && (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600">
              {currentStepLabel} ({currentStep.x}, {currentStep.y})
            </span>
          )}
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-medium tabular-nums text-slate-600">
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

          <div className="flex items-center gap-3">
            {resolvedChapterLabel && (
              <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                {resolvedChapterLabel}
              </span>
            )}
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
        </div>
      </header>

      <div
        className={`flex flex-1 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_55%,#f1f5f9_100%)] ${
          singlePageScroll ? 'items-start' : 'overflow-hidden'
        }`}
      >
        <div
          className={`min-w-0 shrink-0 overflow-x-hidden border-r border-slate-200/70 ${
            showParameters ? 'w-[15.5rem] xl:w-[17rem]' : 'w-[4.75rem]'
          } ${singlePageScroll ? 'sticky top-[4.25rem] self-start' : ''} transition-all duration-300`}
        >
          <div className={`min-w-0 ${singlePageScroll ? 'p-3 xl:p-4' : 'h-full p-3 xl:p-4'}`}>
            <div
              className={`flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur ${
                singlePageScroll ? 'max-h-[calc(100vh-5.25rem)]' : 'h-full'
              }`}
            >
              <div className="border-b border-slate-100 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  {showParameters ? (
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-semibold text-slate-800">参数面板</span>
                      </div>
                      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
                        {parameterIntro}
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
                <div className={`${singlePageScroll ? 'overflow-y-auto' : 'flex-1 overflow-y-auto'} min-w-0 overflow-x-hidden px-4 pb-4 pt-3`}>
                  <div className="min-w-0 max-w-full [&_*]:min-w-0">
                    {parameters}
                    {navigationControlPanel}
                  </div>
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
            <div
              className={`px-4 pt-4 xl:px-6 ${
                singlePageScroll ? 'pb-5 pt-5 xl:pt-5' : 'flex-1 min-h-0 overflow-auto pb-3 xl:pt-6 xl:pb-4'
              }`}
            >
              {mergedContentHeader && (
                <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 shadow-sm">
                  <div className="px-4 py-4">{mergedContentHeader}</div>
                </div>
              )}

              {navigationBar && (
                <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
                  {navigationBar}
                </div>
              )}

              {mainVisual ? (
                <div className="mx-auto w-full max-w-6xl">{mainVisual}</div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-5 xl:gap-7">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {imageLabels?.input ?? '原图'}
                      </span>
                      {originalImage && (
                        <span className="font-mono text-xs text-slate-400">
                          {originalImage[0]?.length}×{originalImage.length}
                        </span>
                      )}
                    </div>
                    <ImageCanvas
                      image={originalImage}
                      rgbImage={originalRgbImage}
                      maxDisplaySize={mainImageSize}
                      showGrid={showOriginalGrid}
                      interactive={Boolean(onInputRegionSelect)}
                      onRegionSelect={onInputRegionSelect}
                      containerClassName="teaching-pulse-input conv-anchor-input-main"
                      selectedRegionMarker={originalRegionMarker}
                      selectedRegion={
                        currentStep && showInputSelection
                          ? {
                              x: currentStep.regionX ?? currentStep.x,
                              y: currentStep.regionY ?? currentStep.y,
                              size: currentStep.kernelSize,
                              width: currentStep.regionWidth,
                              height: currentStep.regionHeight,
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
                        {operationLabel}
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
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-500 shadow-sm">
                        第 {stepInfo.current + 1} / {stepInfo.total} 步
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                        {imageLabels?.output ?? '结果'}
                      </span>
                      {resultImage && (
                        <span className="font-mono text-xs text-slate-400">
                          {resultImage[0]?.length}×{resultImage.length}
                        </span>
                      )}
                    </div>
                    <ImageCanvas
                      image={resultImage}
                      rgbImage={resultRgbImage}
                      maxDisplaySize={mainImageSize}
                      showGrid={Boolean(resultImage && (resultImage[0]?.length ?? 0) <= 16)}
                      interactive={Boolean(onOutputPixelSelect)}
                      onRegionSelect={onOutputPixelSelect}
                      containerClassName="teaching-pulse-output conv-anchor-output-main"
                      highlightPixel={currentStep ? { x: currentStep.outputX ?? currentStep.x, y: currentStep.outputY ?? currentStep.y } : null}
                    />
                    {imageHints?.output && (
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                        {imageHints.output}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  <div className="p-4">{stepDetails}</div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] max-h-[46vh] flex-col border-t border-slate-200 bg-white xl:max-h-[44vh]">
                <div className="flex-1 overflow-y-auto p-4">{stepDetails}</div>
              </div>
            )}

            {resolvedNextConcept && (
              <div className="border-t border-slate-200/80 bg-white px-4 py-4 xl:px-6 xl:py-5">
                <Link
                  href={resolvedNextConcept.href}
                  className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">下一节</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                      {resolvedNextConcept.title}
                    </div>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
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
