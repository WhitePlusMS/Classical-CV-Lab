import { GrayscaleImage, Kernel, StepResult } from './types';
import { create2DArray } from '../utils/imageProcessing';

export interface ConvolutionOptions {
  kernel: Kernel;
  padding: number;
  stride: number;
}

export function createKernel(size: number, anchorX: number, anchorY: number): Kernel {
  const values = create2DArray(size, size, 0);
  return {
    values,
    size,
    anchor: { x: anchorX, y: anchorY },
  };
}

function flipKernelValues(values: number[][]): number[][] {
  const size = values.length;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => values[size - 1 - y][size - 1 - x])
  );
}

function getConvolutionKernel(kernel: Kernel): number[][] {
  return flipKernelValues(kernel.values);
}

function padImage(image: GrayscaleImage, padding: number): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const paddedHeight = height + 2 * padding;
  const paddedWidth = width + 2 * padding;

  const padded = create2DArray(paddedHeight, paddedWidth, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      padded[y + padding][x + padding] = image[y][x];
    }
  }

  return padded;
}

export function convolve2D(
  image: GrayscaleImage,
  kernel: Kernel,
  options: Partial<ConvolutionOptions> = {}
): GrayscaleImage {
  const kernelSize = kernel.size;
  const padding = options.padding ?? Math.floor(kernelSize / 2);
  const stride = options.stride ?? 1;

  const padded = padImage(image, padding);
  const paddedHeight = padded.length;
  const paddedWidth = padded[0]?.length || 0;
  const convolutionKernel = getConvolutionKernel(kernel);

  const outputWidth = Math.floor((paddedWidth - kernelSize) / stride) + 1;
  const outputHeight = Math.floor((paddedHeight - kernelSize) / stride) + 1;

  const result = create2DArray(outputHeight, outputWidth, 0);

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      let sum = 0;

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = x * stride + kx;
          const py = y * stride + ky;
          sum += padded[py][px] * convolutionKernel[ky][kx];
        }
      }

      result[y][x] = sum;
    }
  }

  return result;
}

export function* convolve2DSteps(
  image: GrayscaleImage,
  kernel: Kernel,
  options: Partial<ConvolutionOptions> = {}
): Generator<StepResult> {
  if (!image || image.length === 0 || !image[0]) return;
  const kernelSize = kernel.size;
  const padding = options.padding ?? Math.floor(kernelSize / 2);
  const stride = options.stride ?? 1;

  const padded = padImage(image, padding);
  const paddedHeight = padded.length;
  const paddedWidth = padded[0]?.length || 0;
  const convolutionKernel = getConvolutionKernel(kernel);

  const outputWidth = Math.floor((paddedWidth - kernelSize) / stride) + 1;
  const outputHeight = Math.floor((paddedHeight - kernelSize) / stride) + 1;

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const inputRegion: number[][] = [];
      let sum = 0;

      for (let ky = 0; ky < kernelSize; ky++) {
        const row: number[] = [];
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = x * stride + kx;
          const py = y * stride + ky;
          row.push(padded[py][px]);
          sum += padded[py][px] * convolutionKernel[ky][kx];
        }
        inputRegion.push(row);
      }

      yield {
        x,
        y,
        inputRegion,
        kernel: convolutionKernel,
        displayKernel: kernel.values,
        outputValue: sum,
        formula: `G(${x},${y}) = Σ f(i,j) · g(${x}-i, ${y}-j)`,
      };
    }
  }
}

export function getConvolutionStepAt(
  image: GrayscaleImage,
  kernel: Kernel,
  x: number,
  y: number,
  options: Partial<ConvolutionOptions> = {}
): StepResult | null {
  if (!image || image.length === 0 || !image[0]) return null;

  const kernelSize = kernel.size;
  const padding = options.padding ?? Math.floor(kernelSize / 2);
  const stride = options.stride ?? 1;
  const padded = padImage(image, padding);
  const paddedHeight = padded.length;
  const paddedWidth = padded[0]?.length || 0;
  const convolutionKernel = getConvolutionKernel(kernel);
  const outputWidth = Math.floor((paddedWidth - kernelSize) / stride) + 1;
  const outputHeight = Math.floor((paddedHeight - kernelSize) / stride) + 1;

  if (x < 0 || y < 0 || x >= outputWidth || y >= outputHeight) {
    return null;
  }

  const inputRegion: number[][] = [];
  let sum = 0;

  for (let ky = 0; ky < kernelSize; ky++) {
    const row: number[] = [];
    for (let kx = 0; kx < kernelSize; kx++) {
      const px = x * stride + kx;
      const py = y * stride + ky;
      row.push(padded[py][px]);
      sum += padded[py][px] * convolutionKernel[ky][kx];
    }
    inputRegion.push(row);
  }

  return {
    x,
    y,
    inputRegion,
    kernel: convolutionKernel,
    displayKernel: kernel.values,
    outputValue: sum,
    formula: `G(${x},${y}) = Σ f(i,j) · g(${x}-i, ${y}-j)`,
  };
}
