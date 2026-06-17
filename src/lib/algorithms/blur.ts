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

  // 创建高斯核：省略前置常数 1/(2πσ²)，因最终归一化后结果不变
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
  /** 线性滤波（均值/高斯）的权重矩阵；中值滤波无权重矩阵，省略该字段 */
  kernel?: number[][];
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

  // 创建高斯核：省略前置常数 1/(2πσ²)，因最终归一化后结果不变
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
        outputValue: median,
        operation: 'median',
        description: `中值滤波: 对${kernelSize}x${kernelSize}邻域取中位数`,
      };
    }
  }
}

// ========== 噪声生成 (Noise Generation) ==========

/**
 * 添加椒盐噪声
 * @param image 原始灰度图像 [0, 1]
 * @param density 噪声密度 (0-1)，默认 0.05
 */
export function addSaltPepperNoise(image: GrayscaleImage, density: number = 0.05): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rand = Math.random();
      if (rand < density / 2) {
        result[y][x] = 0; // 椒噪声（黑点）
      } else if (rand < density) {
        result[y][x] = 1; // 盐噪声（白点）
      } else {
        result[y][x] = image[y][x];
      }
    }
  }

  return result;
}

/**
 * 添加高斯噪声
 * @param image 原始灰度图像 [0, 1]
 * @param sigma 噪声标准差，默认 0.08
 */
export function addGaussianNoise(image: GrayscaleImage, sigma: number = 0.08): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Box-Muller 方法生成高斯随机数
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const noise = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
      result[y][x] = Math.max(0, Math.min(1, image[y][x] + noise));
    }
  }

  return result;
}

// ========== 边窗滤波 (Side Window Filtering) ==========

/** 边窗候选方向 */
export interface SideWindowCandidate {
  name: string;
  kernel: number[][];
  value: number;
}

/** 边窗滤波步骤 */
export interface SideWindowStep {
  x: number;
  y: number;
  inputRegion: number[][];
  centerValue: number;
  candidates: SideWindowCandidate[];
  selectedIndex: number;
  outputValue: number;
}

/**
 * 创建8个方向的侧窗核矩阵
 * 每个核矩阵只覆盖当前像素的一侧（半平面），用于边窗滤波
 * 3×3 时与课程中的 1/4 角窗和 1/6 边窗权重完全一致
 */
export function createSideWindowKernels(kernelSize: number): { name: string; kernel: number[][] }[] {
  const half = Math.floor(kernelSize / 2);
  const k = kernelSize;

  const directions: { name: string; rowStart: number; rowEnd: number; colStart: number; colEnd: number }[] = [
    { name: 'NW', rowStart: 0, rowEnd: half, colStart: 0, colEnd: half },
    { name: 'NE', rowStart: 0, rowEnd: half, colStart: half, colEnd: k - 1 },
    { name: 'SW', rowStart: half, rowEnd: k - 1, colStart: 0, colEnd: half },
    { name: 'SE', rowStart: half, rowEnd: k - 1, colStart: half, colEnd: k - 1 },
    { name: 'U',  rowStart: 0, rowEnd: half, colStart: 0, colEnd: k - 1 },
    { name: 'D',  rowStart: half, rowEnd: k - 1, colStart: 0, colEnd: k - 1 },
    { name: 'L',  rowStart: 0, rowEnd: k - 1, colStart: 0, colEnd: half },
    { name: 'R',  rowStart: 0, rowEnd: k - 1, colStart: half, colEnd: k - 1 },
  ];

  return directions.map(({ name, rowStart, rowEnd, colStart, colEnd }) => {
    const kernel: number[][] = [];
    let count = 0;
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = colStart; c <= colEnd; c++) count++;
    }

    const weight = 1 / count;
    for (let r = 0; r < k; r++) {
      const row: number[] = [];
      for (let c = 0; c < k; c++) {
        row.push((r >= rowStart && r <= rowEnd && c >= colStart && c <= colEnd) ? weight : 0);
      }
      kernel.push(row);
    }

    return { name, kernel };
  });
}

/**
 * 边窗滤波：对每个像素使用8个方向侧窗分别计算均值，选择最接近原像素值的候选作为输出
 * 侧窗只覆盖当前像素的一侧，避免跨边缘混合，达到保边效果
 */
export function sideWindowFilter(image: GrayscaleImage, kernelSize: number): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const half = Math.floor(kernelSize / 2);
  const sideWindows = createSideWindowKernels(kernelSize);
  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 收集邻域
      const region: number[][] = [];
      for (let ky = -half; ky <= half; ky++) {
        const row: number[] = [];
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          row.push(image[py][px]);
        }
        region.push(row);
      }

      const center = image[y][x];
      let bestVal = center;
      let bestDiff = Infinity;

      for (const sw of sideWindows) {
        let sum = 0;
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            sum += region[ky][kx] * sw.kernel[ky][kx];
          }
        }
        const diff = (sum - center) * (sum - center);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestVal = sum;
        }
      }

      result[y][x] = bestVal;
    }
  }

  return result;
}

/**
 * 边窗滤波步骤生成器，用于可视化教学
 */
export function* sideWindowFilterSteps(
  image: GrayscaleImage,
  kernelSize: number
): Generator<SideWindowStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;
  const half = Math.floor(kernelSize / 2);
  const sideWindows = createSideWindowKernels(kernelSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inputRegion: number[][] = [];
      for (let ky = -half; ky <= half; ky++) {
        const row: number[] = [];
        for (let kx = -half; kx <= half; kx++) {
          const py = clamp(y + ky, 0, height - 1);
          const px = clamp(x + kx, 0, width - 1);
          row.push(image[py][px]);
        }
        inputRegion.push(row);
      }

      const centerValue = image[y][x];
      const candidates: SideWindowCandidate[] = [];
      let bestIndex = 0;
      let bestDiff = Infinity;

      for (let i = 0; i < sideWindows.length; i++) {
        const sw = sideWindows[i];
        let sum = 0;
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            sum += inputRegion[ky][kx] * sw.kernel[ky][kx];
          }
        }
        candidates.push({ name: sw.name, kernel: sw.kernel, value: sum });
        const diff = (sum - centerValue) * (sum - centerValue);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }

      yield {
        x,
        y,
        inputRegion,
        centerValue,
        candidates,
        selectedIndex: bestIndex,
        outputValue: candidates[bestIndex].value,
      };
    }
  }
}
