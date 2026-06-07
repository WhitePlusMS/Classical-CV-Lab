import React from 'react';

interface NormalizedRgb {
  r: number;
  g: number;
  b: number;
}

interface PixelColorSwatchProps {
  color: NormalizedRgb;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function PixelColorSwatch({
  color,
  className = 'h-8 w-8',
  style,
  title,
}: PixelColorSwatchProps) {
  return (
    <div
      className={`${className} rounded border border-slate-300`}
      title={title}
      style={{
        ...style,
        backgroundColor: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
      }}
    />
  );
}
