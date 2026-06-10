import { GrayscaleImage } from './types';
import { clamp, create2DArray } from '../utils/imageProcessing';

export interface HogGradientField {
  gx: GrayscaleImage;
  gy: GrayscaleImage;
  magnitude: GrayscaleImage;
  direction: number[][];
}

export interface HogPixelVote {
  x: number;
  y: number;
  gx: number;
  gy: number;
  magnitude: number;
  direction: number;
  bin: number;
}

export interface HogBlockCell {
  cellX: number;
  cellY: number;
  histogram: number[];
}

export interface HogCellStep {
  cellX: number;
  cellY: number;
  cellSize: number;
  nbins: number;
  cellsPerBlock: number;
  blockX: number;
  blockY: number;
  pixelRegion: GrayscaleImage;
  gxRegion: GrayscaleImage;
  gyRegion: GrayscaleImage;
  magnitudeRegion: GrayscaleImage;
  directionRegion: number[][];
  binRegion: number[][];
  histogram: number[];
  sample: HogPixelVote;
  blockCells: HogBlockCell[];
  normalizedBlock: number[];
  blockNorm: number;
}

export function computeHogGradients(image: GrayscaleImage): HogGradientField {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const gx = create2DArray(height, width, 0);
  const gy = create2DArray(height, width, 0);
  const magnitude = create2DArray(height, width, 0);
  const direction: number[][] = [];
  const gxKernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gyKernel = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  for (let y = 0; y < height; y++) {
    const dirRow: number[] = [];
    for (let x = 0; x < width; x++) {
      let sumX = 0;
      let sumY = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const py = y + ky;
          const px = x + kx;
          const pixel = py >= 0 && py < height && px >= 0 && px < width ? image[py][px] : 0;
          sumX += pixel * gxKernel[ky + 1][kx + 1];
          sumY += pixel * gyKernel[ky + 1][kx + 1];
        }
      }

      gx[y][x] = sumX;
      gy[y][x] = sumY;
      magnitude[y][x] = Math.sqrt(sumX * sumX + sumY * sumY);
      dirRow.push(Math.atan2(sumY, sumX) * (180 / Math.PI));
    }
    direction.push(dirRow);
  }

  return { gx, gy, magnitude, direction };
}

function normalizeUnsignedDirection(direction: number): number {
  let normalized = direction % 180;
  if (normalized < 0) normalized += 180;
  return normalized;
}

function directionToBin(direction: number, nbins: number): number {
  const anglePerBin = 180 / nbins;
  return Math.min(nbins - 1, Math.floor(normalizeUnsignedDirection(direction) / anglePerBin));
}

function sliceRegion<T>(matrix: T[][], x: number, y: number, size: number): T[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => matrix[y + row]?.[x + col])
  );
}

function computeCellHistogram(
  gradient: HogGradientField,
  cellX: number,
  cellY: number,
  cellSize: number,
  nbins: number
): number[] {
  const histogram = new Array(nbins).fill(0);
  const startX = cellX * cellSize;
  const startY = cellY * cellSize;

  for (let y = 0; y < cellSize; y++) {
    for (let x = 0; x < cellSize; x++) {
      const px = startX + x;
      const py = startY + y;
      const bin = directionToBin(gradient.direction[py]?.[px] ?? 0, nbins);
      histogram[bin] += gradient.magnitude[py]?.[px] ?? 0;
    }
  }

  return histogram;
}

export function getHogCellStepAt(
  image: GrayscaleImage,
  cellX: number,
  cellY: number,
  cellSize: number,
  nbins: number,
  cellsPerBlock: number
): HogCellStep | null {
  if (!image.length || !image[0]?.length) return null;
  const width = image[0].length;
  const height = image.length;
  const cellsX = Math.floor(width / cellSize);
  const cellsY = Math.floor(height / cellSize);
  if (cellsX === 0 || cellsY === 0) return null;

  const safeCellX = Math.max(0, Math.min(cellX, cellsX - 1));
  const safeCellY = Math.max(0, Math.min(cellY, cellsY - 1));
  const startX = safeCellX * cellSize;
  const startY = safeCellY * cellSize;
  const gradient = computeHogGradients(image);
  const pixelRegion = sliceRegion(image, startX, startY, cellSize);
  const gxRegion = sliceRegion(gradient.gx, startX, startY, cellSize);
  const gyRegion = sliceRegion(gradient.gy, startX, startY, cellSize);
  const magnitudeRegion = sliceRegion(gradient.magnitude, startX, startY, cellSize);
  const directionRegion = sliceRegion(gradient.direction, startX, startY, cellSize);
  const binRegion = directionRegion.map(row => row.map(value => directionToBin(value, nbins)));
  const histogram = computeCellHistogram(gradient, safeCellX, safeCellY, cellSize, nbins);
  const blockX = Math.max(0, Math.min(safeCellX, Math.max(0, cellsX - cellsPerBlock)));
  const blockY = Math.max(0, Math.min(safeCellY, Math.max(0, cellsY - cellsPerBlock)));
  const blockCells: HogBlockCell[] = [];

  for (let by = 0; by < cellsPerBlock; by++) {
    for (let bx = 0; bx < cellsPerBlock; bx++) {
      const nextCellX = blockX + bx;
      const nextCellY = blockY + by;
      if (nextCellX < cellsX && nextCellY < cellsY) {
        blockCells.push({
          cellX: nextCellX,
          cellY: nextCellY,
          histogram: computeCellHistogram(gradient, nextCellX, nextCellY, cellSize, nbins),
        });
      }
    }
  }

  const rawBlock = blockCells.flatMap(cell => cell.histogram);
  const blockNorm = Math.sqrt(rawBlock.reduce((sum, value) => sum + value * value, 0) + 1e-6);
  const normalizedBlock = rawBlock.map(value => value / blockNorm);
  let sample: HogPixelVote = {
    x: startX,
    y: startY,
    gx: gradient.gx[startY][startX],
    gy: gradient.gy[startY][startX],
    magnitude: gradient.magnitude[startY][startX],
    direction: normalizeUnsignedDirection(gradient.direction[startY][startX]),
    bin: directionToBin(gradient.direction[startY][startX], nbins),
  };

  for (let y = 0; y < cellSize; y++) {
    for (let x = 0; x < cellSize; x++) {
      const px = startX + x;
      const py = startY + y;
      const mag = gradient.magnitude[py][px];
      if (mag > sample.magnitude) {
        sample = {
          x: px,
          y: py,
          gx: gradient.gx[py][px],
          gy: gradient.gy[py][px],
          magnitude: mag,
          direction: normalizeUnsignedDirection(gradient.direction[py][px]),
          bin: directionToBin(gradient.direction[py][px], nbins),
        };
      }
    }
  }

  return {
    cellX: safeCellX,
    cellY: safeCellY,
    cellSize,
    nbins,
    cellsPerBlock,
    blockX,
    blockY,
    pixelRegion,
    gxRegion,
    gyRegion,
    magnitudeRegion,
    directionRegion,
    binRegion,
    histogram,
    sample,
    blockCells,
    normalizedBlock,
    blockNorm,
  };
}

export function renderHogVisualization(
  image: GrayscaleImage,
  cellSize: number,
  nbins: number,
  cellsPerBlock: number,
  selectedCellX: number,
  selectedCellY: number,
  cellRenderSize: number = 24
): GrayscaleImage {
  if (!image.length || !image[0]?.length) return [];
  const cellsX = Math.floor(image[0].length / cellSize);
  const cellsY = Math.floor(image.length / cellSize);
  const outWidth = cellsX * cellRenderSize;
  const outHeight = cellsY * cellRenderSize;
  const out = create2DArray(outHeight, outWidth, 0);
  const gradient = computeHogGradients(image);
  const anglePerBin = 180 / nbins;
  const blockX = Math.max(0, Math.min(selectedCellX, Math.max(0, cellsX - cellsPerBlock)));
  const blockY = Math.max(0, Math.min(selectedCellY, Math.max(0, cellsY - cellsPerBlock)));

  for (let cellY = 0; cellY < cellsY; cellY++) {
    for (let cellX = 0; cellX < cellsX; cellX++) {
      const histogram = computeCellHistogram(gradient, cellX, cellY, cellSize, nbins);
      const maxHist = Math.max(...histogram, 1e-6);
      const centerX = cellX * cellRenderSize + cellRenderSize / 2;
      const centerY = cellY * cellRenderSize + cellRenderSize / 2;

      for (let bin = 0; bin < nbins; bin++) {
        const strength = histogram[bin] / maxHist;
        if (strength < 0.05) continue;
        const angle = bin * anglePerBin * Math.PI / 180;
        const length = strength * cellRenderSize * 0.38;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        for (let t = -length; t <= length; t += 0.5) {
          const px = Math.round(centerX + dx * t);
          const py = Math.round(centerY + dy * t);
          if (px >= 0 && px < outWidth && py >= 0 && py < outHeight) {
            out[py][px] = clamp(Math.max(out[py][px], 0.95), 0, 1);
          }
        }
      }

      drawRect(out, cellX * cellRenderSize, cellY * cellRenderSize, cellRenderSize, cellRenderSize, 0.14);
    }
  }

  drawRect(
    out,
    blockX * cellRenderSize,
    blockY * cellRenderSize,
    cellsPerBlock * cellRenderSize,
    cellsPerBlock * cellRenderSize,
    0.45
  );
  drawRect(
    out,
    selectedCellX * cellRenderSize,
    selectedCellY * cellRenderSize,
    cellRenderSize,
    cellRenderSize,
    1
  );

  return out;
}

function drawRect(image: GrayscaleImage, x: number, y: number, width: number, height: number, value: number): void {
  const imageHeight = image.length;
  const imageWidth = image[0]?.length ?? 0;
  const x2 = Math.min(x + width - 1, imageWidth - 1);
  const y2 = Math.min(y + height - 1, imageHeight - 1);

  for (let px = x; px <= x2; px++) {
    if (y >= 0 && y < imageHeight) image[y][px] = clamp(Math.max(image[y][px], value), 0, 1);
    if (y2 >= 0 && y2 < imageHeight) image[y2][px] = clamp(Math.max(image[y2][px], value), 0, 1);
  }
  for (let py = y; py <= y2; py++) {
    if (x >= 0 && x < imageWidth) image[py][x] = clamp(Math.max(image[py][x], value), 0, 1);
    if (x2 >= 0 && x2 < imageWidth) image[py][x2] = clamp(Math.max(image[py][x2], value), 0, 1);
  }
}
