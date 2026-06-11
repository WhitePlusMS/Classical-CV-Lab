'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { imageToCanvas, imageRgbToCanvas } from '@/lib/utils/imageProcessing';

interface ImageCanvasProps {
  image: GrayscaleImage | null;
  /** 可选的 RGB 彩色图（优先级高于灰度图），渲染为真彩色 */
  rgbImage?: number[][][] | null;
  maxDisplaySize?: number;
  showGrid?: boolean;
  selectedRegion?: { x: number; y: number; size: number; width?: number; height?: number } | null;
  selectedRegionMarker?: 'frame' | 'dot';
  highlightPixel?: { x: number; y: number } | null;
  onRegionSelect?: (x: number, y: number) => void;
  interactive?: boolean;
  containerClassName?: string;
}

export default function ImageCanvas({
  image,
  rgbImage,
  maxDisplaySize = 300,
  showGrid = false,
  selectedRegion,
  selectedRegionMarker = 'frame',
  highlightPixel,
  onRegionSelect,
  interactive = false,
  containerClassName = '',
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const display = useMemo(() => {
    const effectiveImage = rgbImage || image;
    if (!effectiveImage || effectiveImage.length === 0) {
      return {
        width: maxDisplaySize,
        height: maxDisplaySize,
        imageWidth: maxDisplaySize,
        imageHeight: maxDisplaySize,
        scale: 1,
      };
    }

    const imgHeight = effectiveImage.length;
    const imgWidth = effectiveImage[0]?.length || 0;
    const scale = Math.min(maxDisplaySize / imgWidth, maxDisplaySize / imgHeight);

    return {
      width: imgWidth * scale,
      height: imgHeight * scale,
      imageWidth: imgWidth,
      imageHeight: imgHeight,
      scale,
    };
  }, [image, rgbImage, maxDisplaySize]);

  const { width, height, imageWidth, imageHeight, scale } = display;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 优先使用 RGB 彩色图
    if (rgbImage && rgbImage.length > 0 && rgbImage[0]?.length > 0) {
      imageRgbToCanvas(rgbImage, canvas);
      return;
    }

    if (!image || image.length === 0) return;

    imageToCanvas(image, canvas);
  }, [image, rgbImage]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !onRegionSelect || !image || image.length === 0) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const imageWidth = image[0]?.length || 0;
      const imageHeight = image.length;
      const scaleX = imageWidth / rect.width;
      const scaleY = imageHeight / rect.height;

      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      onRegionSelect(
        Math.max(0, Math.min(x, imageWidth - 1)),
        Math.max(0, Math.min(y, imageHeight - 1))
      );
    },
    [image, interactive, onRegionSelect]
  );

  const selectedRegionStyle = useMemo(() => {
    if (!selectedRegion) return null;

    return {
      left: selectedRegion.x * scale,
      top: selectedRegion.y * scale,
      width: (selectedRegion.width ?? selectedRegion.size) * scale,
      height: (selectedRegion.height ?? selectedRegion.size) * scale,
    };
  }, [scale, selectedRegion]);

  const highlightPixelStyle = useMemo(() => {
    if (!highlightPixel) return null;

    return {
      left: highlightPixel.x * scale,
      top: highlightPixel.y * scale,
      width: scale,
      height: scale,
    };
  }, [highlightPixel, scale]);

  const gridOverlayStyle = useMemo(
    () => ({
      backgroundImage: [
        'linear-gradient(to right, rgba(255,255,255,0.82) 1px, transparent 1px)',
        'linear-gradient(to bottom, rgba(255,255,255,0.82) 1px, transparent 1px)',
        'linear-gradient(to right, rgba(15,23,42,0.28) 2px, transparent 2px)',
        'linear-gradient(to bottom, rgba(15,23,42,0.28) 2px, transparent 2px)',
      ].join(', '),
      backgroundSize: `${scale}px ${scale}px`,
      boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.26)',
    }),
    [scale]
  );

  const selectedRegionGridStyle = useMemo(
    () => ({
      backgroundImage: [
        'linear-gradient(to right, rgba(220,38,38,0.82) 1.5px, transparent 1.5px)',
        'linear-gradient(to bottom, rgba(220,38,38,0.82) 1.5px, transparent 1.5px)',
      ].join(', '),
      backgroundSize: `${scale}px ${scale}px`,
    }),
    [scale]
  );

  const selectedRegionDotStyle = useMemo(() => {
    if (!selectedRegion) return null;

    const dotSize = Math.max(10, Math.min(16, scale * 0.72));
    const regionWidth = selectedRegion.width ?? selectedRegion.size;
    const regionHeight = selectedRegion.height ?? selectedRegion.size;
    return {
      left: (selectedRegion.x + regionWidth / 2) * scale - dotSize / 2,
      top: (selectedRegion.y + regionHeight / 2) * scale - dotSize / 2,
      width: dotSize,
      height: dotSize,
    };
  }, [scale, selectedRegion]);

  if ((!image || image.length === 0) && (!rgbImage || rgbImage.length === 0)) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100"
        style={{ width: maxDisplaySize, height: maxDisplaySize }}
      >
        <span className="text-xs text-slate-400">无图像</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${interactive ? 'cursor-crosshair' : ''} ${containerClassName}`.trim()}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        width={imageWidth}
        height={imageHeight}
        style={{
          width,
          height,
          imageRendering: 'pixelated',
        }}
      />

      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0"
          style={gridOverlayStyle}
        />
      )}

      {selectedRegionStyle && selectedRegionMarker === 'frame' && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-slate-950/30" style={{ height: selectedRegionStyle.top }} />
          <div
            className="pointer-events-none absolute bg-slate-950/30"
            style={{
              left: 0,
              top: selectedRegionStyle.top,
              width: selectedRegionStyle.left,
              height: selectedRegionStyle.height,
            }}
          />
          <div
            className="pointer-events-none absolute bg-slate-950/30"
            style={{
              left: selectedRegionStyle.left + selectedRegionStyle.width,
              top: selectedRegionStyle.top,
              width: width - (selectedRegionStyle.left + selectedRegionStyle.width),
              height: selectedRegionStyle.height,
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bg-slate-950/30"
            style={{
              top: selectedRegionStyle.top + selectedRegionStyle.height,
              height: height - (selectedRegionStyle.top + selectedRegionStyle.height),
            }}
          />
          <div
            className="pointer-events-none absolute box-border border-[3px] border-red-600"
            style={{
              ...selectedRegionStyle,
              ...selectedRegionGridStyle,
            }}
          />
        </>
      )}

      {selectedRegionDotStyle && selectedRegionMarker === 'dot' && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-white bg-red-600 shadow-[0_0_0_2px_rgba(220,38,38,0.35)]"
          style={selectedRegionDotStyle}
        />
      )}

      {highlightPixelStyle && (
        <div
          className="pointer-events-none absolute box-border border-[3px] border-emerald-600"
          style={highlightPixelStyle}
        />
      )}
    </div>
  );
}
