import { GrayscaleImage } from './types';
import { create2DArray, clamp } from '../utils/imageProcessing';

export interface SobelResult {
  magnitude: GrayscaleImage;
  direction: number[][];
  gx: GrayscaleImage;
  gy: GrayscaleImage;
}

export function sobelEdgeDetection(image: GrayscaleImage): SobelResult {
  const height = image.length;
  const width = image[0]?.length || 0;

  // Sobel X kernel
  const gxKernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];

  // Sobel Y kernel
  const gyKernel = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  const gx = create2DArray(height, width, 0);
  const gy = create2DArray(height, width, 0);
  const magnitude = create2DArray(height, width, 0);
  const direction: number[][] = [];

  for (let y = 0; y < height; y++) {
    const dirRow: number[] = [];
    for (let x = 0; x < width; x++) {
      let sumX = 0;
      let sumY = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const py = y + ky;
          const px = x + kx;

          let pixel = 0;
          if (py >= 0 && py < height && px >= 0 && px < width) {
            pixel = image[py][px];
          }

          sumX += pixel * gxKernel[ky + 1][kx + 1];
          sumY += pixel * gyKernel[ky + 1][kx + 1];
        }
      }

      gx[y][x] = sumX;
      gy[y][x] = sumY;

      const mag = Math.sqrt(sumX * sumX + sumY * sumY);
      magnitude[y][x] = mag;

      const angle = Math.atan2(sumY, sumX) * (180 / Math.PI);
      dirRow.push(angle);
    }
    direction.push(dirRow);
  }

  return { magnitude, direction, gx, gy };
}

export interface SobelStep {
  x: number;
  y: number;
  inputRegion: number[][];
  gxKernel: number[][];
  gyKernel: number[][];
  gxValue: number;
  gyValue: number;
  magnitude: number;
  direction: number;
}

export function* sobelSteps(image: GrayscaleImage): Generator<SobelStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;

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
    for (let x = 0; x < width; x++) {
      const inputRegion: number[][] = [];
      let sumX = 0;
      let sumY = 0;

      for (let ky = -1; ky <= 1; ky++) {
        const row: number[] = [];
        for (let kx = -1; kx <= 1; kx++) {
          const py = y + ky;
          const px = x + kx;

          let pixel = 0;
          if (py >= 0 && py < height && px >= 0 && px < width) {
            pixel = image[py][px];
          }

          row.push(pixel);
          sumX += pixel * gxKernel[ky + 1][kx + 1];
          sumY += pixel * gyKernel[ky + 1][kx + 1];
        }
        inputRegion.push(row);
      }

      const mag = Math.sqrt(sumX * sumX + sumY * sumY);
      const angle = Math.atan2(sumY, sumX) * (180 / Math.PI);

      yield {
        x,
        y,
        inputRegion,
        gxKernel,
        gyKernel,
        gxValue: sumX,
        gyValue: sumY,
        magnitude: mag,
        direction: angle,
      };
    }
  }
}

// Canny Edge Detection
export interface CannyResult {
  image: GrayscaleImage;
  stages: {
    grayscale: GrayscaleImage;
    blurred: GrayscaleImage;
    gradientMagnitude: GrayscaleImage;
    gradientDirection: number[][];
    nms: GrayscaleImage;
    thresholded: GrayscaleImage;
  };
}

export function cannyEdgeDetection(
  image: GrayscaleImage,
  lowThreshold: number = 0.05,
  highThreshold: number = 0.15
): CannyResult {
  const height = image.length;
  const width = image[0]?.length || 0;

  // Step 1: Gaussian blur (5x5, sigma=1)
  const blurred = gaussianBlur(image, 5, 1.0);

  // Step 2: Sobel gradient
  const { magnitude, direction } = sobelEdgeDetection(blurred);

  // Normalize magnitude for processing
  let maxMag = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      maxMag = Math.max(maxMag, magnitude[y][x]);
    }
  }
  if (maxMag === 0) maxMag = 1;

  const normalizedMag = create2DArray(height, width, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      normalizedMag[y][x] = magnitude[y][x] / maxMag;
    }
  }

  // Step 3: Non-maximum suppression
  const nms = nonMaximumSuppression(normalizedMag, direction);

  // Step 4: Double threshold + hysteresis
  const thresholded = hysteresisThreshold(nms, lowThreshold, highThreshold);

  return {
    image: thresholded,
    stages: {
      grayscale: image,
      blurred,
      gradientMagnitude: normalizedMag,
      gradientDirection: direction,
      nms,
      thresholded,
    },
  };
}

function gaussianBlur(image: GrayscaleImage, kernelSize: number, sigma: number): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const half = Math.floor(kernelSize / 2);

  // Create 1D Gaussian kernel
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -half; i <= half; i++) {
    const val = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(val);
    sum += val;
  }
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }

  // Horizontal pass
  const temp = create2DArray(height, width, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const px = clamp(x + k, 0, width - 1);
        val += image[y][px] * kernel[k + half];
      }
      temp[y][x] = val;
    }
  }

  // Vertical pass
  const result = create2DArray(height, width, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const py = clamp(y + k, 0, height - 1);
        val += temp[py][x] * kernel[k + half];
      }
      result[y][x] = val;
    }
  }

  return result;
}

function nonMaximumSuppression(
  magnitude: GrayscaleImage,
  direction: number[][]
): GrayscaleImage {
  const height = magnitude.length;
  const width = magnitude[0]?.length || 0;
  const result = create2DArray(height, width, 0);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const angle = direction[y][x];
      const mag = magnitude[y][x];

      // Quantize angle to 4 directions: 0, 45, 90, 135
      let qAngle = Math.round(angle / 45) * 45;
      if (qAngle < 0) qAngle += 180;
      if (qAngle >= 180) qAngle -= 180;

      let neighbor1 = 0;
      let neighbor2 = 0;

      if (qAngle === 0 || qAngle === 180) {
        neighbor1 = magnitude[y][x - 1];
        neighbor2 = magnitude[y][x + 1];
      } else if (qAngle === 45) {
        neighbor1 = magnitude[y - 1][x + 1];
        neighbor2 = magnitude[y + 1][x - 1];
      } else if (qAngle === 90) {
        neighbor1 = magnitude[y - 1][x];
        neighbor2 = magnitude[y + 1][x];
      } else if (qAngle === 135) {
        neighbor1 = magnitude[y - 1][x - 1];
        neighbor2 = magnitude[y + 1][x + 1];
      }

      if (mag >= neighbor1 && mag >= neighbor2) {
        result[y][x] = mag;
      } else {
        result[y][x] = 0;
      }
    }
  }

  return result;
}

function hysteresisThreshold(
  nms: GrayscaleImage,
  lowThreshold: number,
  highThreshold: number
): GrayscaleImage {
  const height = nms.length;
  const width = nms[0]?.length || 0;
  const result = create2DArray(height, width, 0);
  const visited = create2DArray(height, width, 0);

  // Mark strong edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (nms[y][x] >= highThreshold) {
        result[y][x] = 1;
        visited[y][x] = 1;
      }
    }
  }

  // Trace weak edges connected to strong edges
  const stack: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (result[y][x] === 1) {
        stack.push([x, y]);
      }
    }
  }

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (visited[ny][nx] === 0 && nms[ny][nx] >= lowThreshold) {
            result[ny][nx] = 1;
            visited[ny][nx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
    }
  }

  return result;
}

export interface CannyStep {
  stage: 'blur' | 'gradient' | 'nms' | 'threshold';
  x: number;
  y: number;
  description: string;
  value: number;
}

export function* cannySteps(
  image: GrayscaleImage,
  lowThreshold: number = 0.05,
  highThreshold: number = 0.15
): Generator<CannyStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const height = image.length;
  const width = image[0].length;

  // Blur stage
  const blurred = gaussianBlur(image, 5, 1.0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      yield {
        stage: 'blur',
        x,
        y,
        description: `高斯模糊: 对像素(${x},${y})进行5x5高斯滤波`,
        value: blurred[y][x],
      };
    }
  }

  // Gradient stage
  const { magnitude, direction } = sobelEdgeDetection(blurred);
  let maxMag = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      maxMag = Math.max(maxMag, magnitude[y][x]);
    }
  }
  if (maxMag === 0) maxMag = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      yield {
        stage: 'gradient',
        x,
        y,
        description: `梯度计算: 像素(${x},${y})梯度幅值=${(magnitude[y][x] / maxMag).toFixed(3)}`,
        value: magnitude[y][x] / maxMag,
      };
    }
  }

  // NMS stage
  const normalizedMag = create2DArray(height, width, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      normalizedMag[y][x] = magnitude[y][x] / maxMag;
    }
  }

  const nms = nonMaximumSuppression(normalizedMag, direction);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      yield {
        stage: 'nms',
        x,
        y,
        description: `非极大值抑制: 像素(${x},${y})保留=${nms[y][x] > 0 ? '是' : '否'}`,
        value: nms[y][x],
      };
    }
  }

  // Threshold stage
  const thresholded = hysteresisThreshold(nms, lowThreshold, highThreshold);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      yield {
        stage: 'threshold',
        x,
        y,
        description: `双阈值检测: 像素(${x},${y})=${thresholded[y][x] > 0 ? '边缘' : '非边缘'}`,
        value: thresholded[y][x],
      };
    }
  }
}
