'use client';

import React, { useRef, useEffect, useCallback } from 'react';
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
}

export default function ImageCanvas({
  image,
  maxDisplaySize = 300,
  showGrid = false,
  selectedRegion,
  highlightPixel,
  onRegionSelect,
  interactive = false,
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate display dimensions maintaining aspect ratio
  const getDisplayDimensions = () => {
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
  };

  const { width, height, scale } = getDisplayDimensions();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || image.length === 0) return;

    const imgHeight = image.length;
    const imgWidth = image[0]?.length || 0;

    // Set canvas to actual image dimensions for correct pixel mapping
    canvas.width = imgWidth;
    canvas.height = imgHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    imageToCanvas(image, canvas);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 0.5;

      for (let x = 0; x <= imgWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, imgHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= imgHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(imgWidth, y);
        ctx.stroke();
      }
    }

    // Draw selected region (for original image) - using actual pixel coordinates
    if (selectedRegion) {
      const { x, y, size } = selectedRegion;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 / scale; // Adjust line width based on scale
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(x, y, size, size);
    }

    // Draw highlight region (for result image) - using actual pixel coordinates
    // This shows the region corresponding to the kernel operation
    if (highlightPixel) {
      const { x, y } = highlightPixel;
      // Default size is 1 (single pixel), but can be overridden by selectedRegion
      const size = selectedRegion?.size || 1;
      
      // Draw the highlight region with the same size as the kernel
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(x, y, size, size);
    }
  }, [image, showGrid, selectedRegion, highlightPixel, scale]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive || !onRegionSelect || !image || image.length === 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      onRegionSelect(
        Math.max(0, Math.min(x, image[0].length - 1)),
        Math.max(0, Math.min(y, image.length - 1))
      );
    },
    [interactive, onRegionSelect, image]
  );

  if (!image || image.length === 0) {
    return (
      <div
        className="bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center"
        style={{ width: maxDisplaySize, height: maxDisplaySize }}
      >
        <span className="text-xs text-slate-400">无图像</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={interactive ? 'cursor-crosshair' : ''}
        style={{
          width,
          height,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
