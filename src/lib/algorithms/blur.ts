import { GrayscaleImage } from './types';
import { create2DArray, clamp } from '../utils/imageProcessing';

// Box blur (mean blur)
export function boxBlur(image: GrayscaleImage, kernelSize: number): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const half = Math.floor(kernelSize / 2);

  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          sum += image[py][px];
          count++;
        }
      }

      result[y][x] = sum / count;
    }
  }

  return result;
}

// Gaussian blur
export function gaussianBlur(image: GrayscaleImage, kernelSize: number, sigma: number): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const half = Math.floor(kernelSize / 2);

  // Create 2D Gaussian kernel
  const kernel: number[][] = [];
  let sum = 0;

  for (let y = -half; y <= half; y++) {
    const row: number[] = [];
    for (let x = -half; x <= half; x++) {
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(val);
      sum += val;
    }
    kernel.push(row);
  }

  // Normalize kernel
  for (let y = 0; y < kernel.length; y++) {
    for (let x = 0; x < kernel[y].length; x++) {
      kernel[y][x] /= sum;
    }
  }

  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          val += image[py][px] * kernel[ky + half][kx + half];
        }
      }

      result[y][x] = val;
    }
  }

  return result;
}

// Median filter
export function medianFilter(image: GrayscaleImage, kernelSize: number): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const half = Math.floor(kernelSize / 2);

  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values: number[] = [];

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          values.push(image[py][px]);
        }
      }

      values.sort((a, b) => a - b);
      result[y][x] = values[Math.floor(values.length / 2)];
    }
  }

  return result;
}

// Step generators for visualization
export interface BlurStep {
  x: number;
  y: number;
  inputRegion: number[][];
  kernel: number[][];
  outputValue: number;
  operation: 'box' | 'gaussian' | 'median';
  description: string;
}

export function* boxBlurSteps(image: GrayscaleImage, kernelSize: number): Generator<BlurStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);
  const area = kernelSize * kernelSize;

  // Create uniform kernel for display
  const kernel: number[][] = [];
  for (let y = 0; y < kernelSize; y++) {
    const row: number[] = [];
    for (let x = 0; x < kernelSize; x++) {
      row.push(1 / area);
    }
    kernel.push(row);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inputRegion: number[][] = [];
      let sum = 0;
      let count = 0;

      for (let ky = -half; ky <= half; ky++) {
        const row: number[] = [];
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          row.push(image[py][px]);
          sum += image[py][px];
          count++;
        }
        inputRegion.push(row);
      }

      yield {
        x,
        y,
        inputRegion,
        kernel,
        outputValue: sum / count,
        operation: 'box',
        description: `均值模糊: 对${kernelSize}x${kernelSize}邻域取平均值`,
      };
    }
  }
}

export function* gaussianBlurSteps(
  image: GrayscaleImage,
  kernelSize: number,
  sigma: number
): Generator<BlurStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);

  // Create 2D Gaussian kernel
  const kernel: number[][] = [];
  let sum = 0;

  for (let y = -half; y <= half; y++) {
    const row: number[] = [];
    for (let x = -half; x <= half; x++) {
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(val);
      sum += val;
    }
    kernel.push(row);
  }

  // Normalize kernel for display
  const displayKernel = kernel.map(row => row.map(v => v / sum));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inputRegion: number[][] = [];
      let val = 0;

      for (let ky = -half; ky <= half; ky++) {
        const row: number[] = [];
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          row.push(image[py][px]);
          val += image[py][px] * displayKernel[ky + half][kx + half];
        }
        inputRegion.push(row);
      }

      yield {
        x,
        y,
        inputRegion,
        kernel: displayKernel,
        outputValue: val,
        operation: 'gaussian',
        description: `高斯模糊: 对${kernelSize}x${kernelSize}邻域进行高斯加权平均`,
      };
    }
  }
}

export function* medianFilterSteps(
  image: GrayscaleImage,
  kernelSize: number
): Generator<BlurStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);

  // Create identity-like kernel for display (all 1s)
  const kernel: number[][] = [];
  for (let y = 0; y < kernelSize; y++) {
    const row: number[] = [];
    for (let x = 0; x < kernelSize; x++) {
      row.push(1);
    }
    kernel.push(row);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inputRegion: number[][] = [];
      const values: number[] = [];

      for (let ky = -half; ky <= half; ky++) {
        const row: number[] = [];
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          row.push(image[py][px]);
          values.push(image[py][px]);
        }
        inputRegion.push(row);
      }

      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];

      yield {
        x,
        y,
        inputRegion,
        kernel,
        outputValue: median,
        operation: 'median',
        description: `中值滤波: 对${kernelSize}x${kernelSize}邻域取中位数`,
      };
    }
  }
}
