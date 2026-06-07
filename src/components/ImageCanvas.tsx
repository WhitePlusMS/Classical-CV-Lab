'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { imageToCanvas } from '@/lib/utils/imageProcessing';

interface ImageCanvasProps {
  image: GrayscaleImage | null;
  maxDisplaySize?: number;
  showGrid?: boolean;
  selectedRegion?: { x: number; y: number; size: number } | null;
  highlightPixel?: { x: number; y: number } | null;
  onRegionSelect?: (x: number, y: number) => void;
  interactive?: boolean;
  containerClassName?: string;
}

export default function ImageCanvas({
  image,
  maxDisplaySize = 300,
  showGrid = false,
  selectedRegion,
  highlightPixel,
  onRegionSelect,
  interactive = false,
  containerClassName = '',
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const display = useMemo(() => {
    if (!image || image.length === 0) {
      return { width: maxDisplaySize, height: maxDisplaySize, scale: 1 };
    }

    const imgHeight = image.length;
    const imgWidth = image[0]?.length || 0;
    const scale = Math.min(maxDisplaySize / imgWidth, maxDisplaySize / imgHeight);

    return {
      width: imgWidth * scale,
      height: imgHeight * scale,
      scale,
    };
  }, [image, maxDisplaySize]);

  const { width, height, scale } = display;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || image.length === 0) return;

    const imgHeight = image.length;
    const imgWidth = image[0]?.length || 0;

    canvas.width = imgWidth;
    canvas.height = imgHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    imageToCanvas(image, canvas);

  }, [image]);

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
      width: selectedRegion.size * scale,
      height: selectedRegion.size * scale,
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

  if (!image || image.length === 0) {
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

      {selectedRegionStyle && (
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

      {highlightPixelStyle && (
        <div
          className="pointer-events-none absolute box-border border-[3px] border-emerald-600"
          style={highlightPixelStyle}
        />
      )}
    </div>
  );
}
