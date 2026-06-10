import { GrayscaleImage } from './types';
import { create2DArray } from '../utils/imageProcessing';
import { computeLBPImage, getLBPWindow } from './lbpGabor';

export type HaarTemplateType = 'edge' | 'line' | 'point' | 'diagonal';

export type HaarRegionTone = 'black' | 'white';

export interface HaarTemplateRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: HaarRegionTone;
}

export interface HaarRegionResult extends HaarTemplateRegion {
  sum: number;
}

export interface IntegralRectCorners {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface IntegralRectResult {
  rect: HaarTemplateRegion;
  corners: IntegralRectCorners;
  sum: number;
}

export interface HaarFeatureStep {
  x: number;
  y: number;
  windowSize: number;
  templateType: HaarTemplateType;
  inputRegion: GrayscaleImage;
  regions: HaarRegionResult[];
  blackSum: number;
  whiteSum: number;
  featureValue: number;
  absoluteFeatureValue: number;
  integralImage: GrayscaleImage;
  integralRegions: IntegralRectResult[];
}

export interface LBPHistogramBin {
  bin: number;
  count: number;
  normalized: number;
}

export interface LBPCellResult {
  index: number;
  cellX: number;
  cellY: number;
  x: number;
  y: number;
  size: number;
  histogram: number[];
  nonZeroBins: LBPHistogramBin[];
  samplePixel: {
    x: number;
    y: number;
    decimalValue: number;
    binaryPattern: number[];
    values: number[][];
    center: number;
  };
}

export interface LBPVectorStep {
  x: number;
  y: number;
  windowSize: number;
  cellSize: number;
  cellsPerSide: number;
  inputRegion: GrayscaleImage;
  lbpImage: GrayscaleImage;
  selectedCell: LBPCellResult;
  vectorLength: number;
  vectorPreview: number[];
}

function grayToByte(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

function getPixelByte(image: GrayscaleImage, x: number, y: number): number {
  return grayToByte(image[y]?.[x] ?? 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cropImage(image: GrayscaleImage, x: number, y: number, width: number, height: number): GrayscaleImage {
  const region = create2DArray(height, width, 0);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      region[row][col] = image[y + row]?.[x + col] ?? 0;
    }
  }

  return region;
}

function sumRegionBytes(image: GrayscaleImage, x: number, y: number, width: number, height: number): number {
  let sum = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      sum += getPixelByte(image, x + col, y + row);
    }
  }

  return sum;
}

export function getHaarTemplateRegions(type: HaarTemplateType, windowSize: number): HaarTemplateRegion[] {
  const half = Math.floor(windowSize / 2);
  const third = Math.floor(windowSize / 3);
  const centerStart = Math.floor(windowSize / 3);
  const centerSize = windowSize - centerStart * 2;

  switch (type) {
    case 'edge':
      return [
        { x: 0, y: 0, width: half, height: windowSize, tone: 'white' },
        { x: half, y: 0, width: windowSize - half, height: windowSize, tone: 'black' },
      ];
    case 'line':
      return [
        { x: 0, y: 0, width: third, height: windowSize, tone: 'white' },
        { x: third, y: 0, width: windowSize - third * 2, height: windowSize, tone: 'black' },
        { x: windowSize - third, y: 0, width: third, height: windowSize, tone: 'white' },
      ];
    case 'point':
      return [
        { x: 0, y: 0, width: windowSize, height: windowSize, tone: 'white' },
        { x: centerStart, y: centerStart, width: centerSize, height: centerSize, tone: 'black' },
      ];
    case 'diagonal':
      return [
        { x: 0, y: 0, width: half, height: half, tone: 'black' },
        { x: half, y: 0, width: windowSize - half, height: half, tone: 'white' },
        { x: 0, y: half, width: half, height: windowSize - half, tone: 'white' },
        { x: half, y: half, width: windowSize - half, height: windowSize - half, tone: 'black' },
      ];
  }
}

export function computeIntegralImage(image: GrayscaleImage): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const integral = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    let rowSum = 0;

    for (let x = 0; x < width; x++) {
      rowSum += getPixelByte(image, x, y);
      integral[y][x] = rowSum + (integral[y - 1]?.[x] ?? 0);
    }
  }

  return integral;
}

function getIntegralAt(integralImage: GrayscaleImage, x: number, y: number): number {
  if (x < 0 || y < 0) return 0;
  return integralImage[y]?.[x] ?? 0;
}

function sumRegionWithIntegral(
  integralImage: GrayscaleImage,
  rect: HaarTemplateRegion,
  offsetX: number,
  offsetY: number
): IntegralRectResult {
  const left = offsetX + rect.x;
  const top = offsetY + rect.y;
  const right = left + rect.width - 1;
  const bottom = top + rect.height - 1;
  const corners = {
    a: getIntegralAt(integralImage, left - 1, top - 1),
    b: getIntegralAt(integralImage, right, top - 1),
    c: getIntegralAt(integralImage, left - 1, bottom),
    d: getIntegralAt(integralImage, right, bottom),
  };

  return {
    rect,
    corners,
    sum: corners.d - corners.c - corners.b + corners.a,
  };
}

export function getHaarFeatureStep(
  image: GrayscaleImage,
  x: number,
  y: number,
  templateType: HaarTemplateType,
  windowSize: number
): HaarFeatureStep | null {
  const height = image.length;
  const width = image[0]?.length ?? 0;

  if (width < windowSize || height < windowSize) return null;

  const safeX = clamp(x, 0, width - windowSize);
  const safeY = clamp(y, 0, height - windowSize);
  const templateRegions = getHaarTemplateRegions(templateType, windowSize);
  const integralImage = computeIntegralImage(image);
  const regions = templateRegions.map(region => ({
    ...region,
    sum: sumRegionBytes(image, safeX + region.x, safeY + region.y, region.width, region.height),
  }));
  const blackSum = regions
    .filter(region => region.tone === 'black')
    .reduce((total, region) => total + region.sum, 0);
  const whiteSum = regions
    .filter(region => region.tone === 'white')
    .reduce((total, region) => total + region.sum, 0);
  const featureValue = blackSum - whiteSum;

  return {
    x: safeX,
    y: safeY,
    windowSize,
    templateType,
    inputRegion: cropImage(image, safeX, safeY, windowSize, windowSize),
    regions,
    blackSum,
    whiteSum,
    featureValue,
    absoluteFeatureValue: Math.abs(featureValue),
    integralImage,
    integralRegions: templateRegions.map(region => sumRegionWithIntegral(integralImage, region, safeX, safeY)),
  };
}

export function computeHaarResponseMap(
  image: GrayscaleImage,
  templateType: HaarTemplateType,
  windowSize: number
): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const outputWidth = Math.max(0, width - windowSize + 1);
  const outputHeight = Math.max(0, height - windowSize + 1);
  const raw = create2DArray(outputHeight, outputWidth, 0);
  let maxAbs = 0;

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const step = getHaarFeatureStep(image, x, y, templateType, windowSize);
      const value = step?.absoluteFeatureValue ?? 0;
      raw[y][x] = value;
      maxAbs = Math.max(maxAbs, value);
    }
  }

  if (maxAbs === 0) return raw;

  return raw.map(row => row.map(value => value / maxAbs));
}

export function getLBPVectorStep(
  image: GrayscaleImage,
  x: number,
  y: number,
  windowSize: number,
  cellSize: number
): LBPVectorStep | null {
  const height = image.length;
  const width = image[0]?.length ?? 0;

  if (width < windowSize || height < windowSize || windowSize % cellSize !== 0) return null;

  const safeX = clamp(x, 0, width - windowSize);
  const safeY = clamp(y, 0, height - windowSize);
  const cellsPerSide = windowSize / cellSize;
  const lbpImage = computeLBPImage(image);
  const selectedCellX = Math.floor(cellsPerSide / 2);
  const selectedCellY = Math.floor(cellsPerSide / 2);
  const selectedCellOffsetX = selectedCellX * cellSize;
  const selectedCellOffsetY = selectedCellY * cellSize;
  const histogram = Array.from({ length: 256 }, () => 0);

  for (let row = 0; row < cellSize; row++) {
    for (let col = 0; col < cellSize; col++) {
      const px = safeX + selectedCellOffsetX + col;
      const py = safeY + selectedCellOffsetY + row;
      const decimalValue = getLBPWindow(image, px, py).decimalValue;
      histogram[decimalValue] += 1;
    }
  }

  const cellPixelCount = cellSize * cellSize;
  const normalizedHistogram = histogram.map(count => count / cellPixelCount);
  const nonZeroBins = normalizedHistogram
    .map((normalized, bin) => ({
      bin,
      count: histogram[bin] ?? 0,
      normalized,
    }))
    .filter(item => item.count > 0);
  const samplePixelX = safeX + selectedCellOffsetX + Math.floor(cellSize / 2);
  const samplePixelY = safeY + selectedCellOffsetY + Math.floor(cellSize / 2);
  const sampleWindow = getLBPWindow(image, samplePixelX, samplePixelY);

  return {
    x: safeX,
    y: safeY,
    windowSize,
    cellSize,
    cellsPerSide,
    inputRegion: cropImage(image, safeX, safeY, windowSize, windowSize),
    lbpImage,
    selectedCell: {
      index: selectedCellY * cellsPerSide + selectedCellX,
      cellX: selectedCellX,
      cellY: selectedCellY,
      x: selectedCellOffsetX,
      y: selectedCellOffsetY,
      size: cellSize,
      histogram: normalizedHistogram,
      nonZeroBins,
      samplePixel: {
        x: samplePixelX,
        y: samplePixelY,
        decimalValue: sampleWindow.decimalValue,
        binaryPattern: sampleWindow.binaryPattern,
        values: sampleWindow.values,
        center: sampleWindow.center,
      },
    },
    vectorLength: cellsPerSide * cellsPerSide * 256,
    vectorPreview: normalizedHistogram.slice(0, 16),
  };
}
