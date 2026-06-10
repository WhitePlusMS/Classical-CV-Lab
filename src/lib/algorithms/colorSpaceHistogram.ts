import type { GrayscaleImage } from './types';
import { clamp, create2DArray } from '../utils/imageProcessing';

export type RgbPixel = [number, number, number];

export interface HsvPixel {
  h: number;
  s: number;
  v: number;
}

export type ColorDisplayMode = 'rgb' | 'r' | 'g' | 'b' | 'h' | 's' | 'v' | 'mask';
export type ColorHistogramChannel = 'r' | 'g' | 'b' | 'h' | 's' | 'v';

export interface ColorHistogram {
  bins: number[];
  counts: number[];
  totalPixels: number;
  channel: ColorHistogramChannel;
}

export interface ColorSpaceStep {
  x: number;
  y: number;
  rgb: RgbPixel;
  rgb255: RgbPixel;
  hsv: HsvPixel;
  cmax: number;
  cmin: number;
  delta: number;
  channel: ColorHistogramChannel;
  channelValue: number;
  histogramBin: number;
  thresholdHit: boolean;
}

function normalizeHistogramChannel(mode: ColorDisplayMode): ColorHistogramChannel {
  if (mode === 'rgb' || mode === 'mask') return 'h';
  return mode;
}

function hueDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

function getChannelValue(rgb: RgbPixel, hsv: HsvPixel, channel: ColorHistogramChannel): number {
  switch (channel) {
    case 'r': return rgb[0];
    case 'g': return rgb[1];
    case 'b': return rgb[2];
    case 'h': return hsv.h / 360;
    case 's': return hsv.s;
    case 'v': return hsv.v;
  }
}

function getHistogramBin(value: number, binCount: number): number {
  return Math.min(binCount - 1, Math.floor(clamp(value, 0, 1) * binCount));
}

export function rgbToHsv(r: number, g: number, b: number): HsvPixel {
  const cmax = Math.max(r, g, b);
  const cmin = Math.min(r, g, b);
  const delta = cmax - cmin;
  let h = 0;

  if (delta === 0) {
    h = 0;
  } else if (cmax === r) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (cmax === g) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }

  if (h < 0) h += 360;

  return {
    h,
    s: cmax === 0 ? 0 : delta / cmax,
    v: cmax,
  };
}

export function extractColorChannel(
  rgbImage: RgbPixel[][],
  mode: ColorDisplayMode
): GrayscaleImage | null {
  if (!rgbImage.length || !rgbImage[0]?.length || mode === 'rgb' || mode === 'mask') {
    return null;
  }

  const height = rgbImage.length;
  const width = rgbImage[0].length;
  const channel = normalizeHistogramChannel(mode);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = rgbImage[y][x];
      result[y][x] = getChannelValue(rgb, rgbToHsv(rgb[0], rgb[1], rgb[2]), channel);
    }
  }

  return result;
}

export function computeColorHistogram(
  rgbImage: RgbPixel[][],
  mode: ColorDisplayMode,
  binCount: number
): ColorHistogram {
  const channel = normalizeHistogramChannel(mode);
  const safeBinCount = Math.max(2, Math.round(binCount));
  const counts = new Array<number>(safeBinCount).fill(0);
  let totalPixels = 0;

  for (const row of rgbImage) {
    for (const rgb of row) {
      const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
      counts[getHistogramBin(getChannelValue(rgb, hsv, channel), safeBinCount)] += 1;
      totalPixels += 1;
    }
  }

  return {
    bins: totalPixels === 0 ? counts : counts.map(value => value / totalPixels),
    counts,
    totalPixels,
    channel,
  };
}

export function createHueMask(
  rgbImage: RgbPixel[][],
  targetHue: number,
  thresholdDegrees: number
): GrayscaleImage {
  const height = rgbImage.length;
  const width = rgbImage[0]?.length ?? 0;
  const result = create2DArray(height, width, 0);
  const safeThreshold = clamp(thresholdDegrees, 0, 180);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbImage[y][x];
      const hsv = rgbToHsv(r, g, b);
      result[y][x] = hueDistance(hsv.h, targetHue) <= safeThreshold ? 1 : 0;
    }
  }

  return result;
}

export function getColorSpaceStepAt(
  rgbImage: RgbPixel[][],
  x: number,
  y: number,
  mode: ColorDisplayMode,
  thresholdDegrees: number,
  binCount: number
): ColorSpaceStep | null {
  const height = rgbImage.length;
  const width = rgbImage[0]?.length ?? 0;
  if (height === 0 || width === 0) return null;

  const safeX = Math.round(clamp(x, 0, width - 1));
  const safeY = Math.round(clamp(y, 0, height - 1));
  const rgb = rgbImage[safeY][safeX];
  const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  const channel = normalizeHistogramChannel(mode);
  const channelValue = getChannelValue(rgb, hsv, channel);
  const safeBinCount = Math.max(2, Math.round(binCount));

  return {
    x: safeX,
    y: safeY,
    rgb,
    rgb255: rgb.map(value => Math.round(clamp(value, 0, 1) * 255)) as RgbPixel,
    hsv,
    cmax: Math.max(rgb[0], rgb[1], rgb[2]),
    cmin: Math.min(rgb[0], rgb[1], rgb[2]),
    delta: Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]),
    channel,
    channelValue,
    histogramBin: getHistogramBin(channelValue, safeBinCount),
    thresholdHit: hueDistance(hsv.h, hsv.h) <= clamp(thresholdDegrees, 0, 180),
  };
}
