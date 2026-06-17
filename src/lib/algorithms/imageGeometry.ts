import { GrayscaleImage } from './types';
import { clamp, create2DArray } from '../utils/imageProcessing';

export type RgbPixel = [number, number, number];
export type RgbImage = RgbPixel[][];

export interface Point2D {
  x: number;
  y: number;
}

export type Matrix3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface DistortionCoefficients {
  k1: number;
  k2: number;
  p1: number;
  p2: number;
}

export type InterpolationMode = 'nearest' | 'bilinear';

const RGB_OUT_OF_BOUNDS_FILL: RgbPixel = [0.04, 0.04, 0.05];

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function isFinitePoint(point: Point2D): boolean {
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

function multiplyMatrix3(a: Matrix3, b: Matrix3): Matrix3 {
  return [
    [
      a[0][0] * b[0][0] + a[0][1] * b[1][0] + a[0][2] * b[2][0],
      a[0][0] * b[0][1] + a[0][1] * b[1][1] + a[0][2] * b[2][1],
      a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2] * b[2][2],
    ],
    [
      a[1][0] * b[0][0] + a[1][1] * b[1][0] + a[1][2] * b[2][0],
      a[1][0] * b[0][1] + a[1][1] * b[1][1] + a[1][2] * b[2][1],
      a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2] * b[2][2],
    ],
    [
      a[2][0] * b[0][0] + a[2][1] * b[1][0] + a[2][2] * b[2][0],
      a[2][0] * b[0][1] + a[2][1] * b[1][1] + a[2][2] * b[2][1],
      a[2][0] * b[0][2] + a[2][1] * b[1][2] + a[2][2] * b[2][2],
    ],
  ];
}

export function identityMatrix3(): Matrix3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

export function translationMatrix(tx: number, ty: number): Matrix3 {
  return [
    [1, 0, tx],
    [0, 1, ty],
    [0, 0, 1],
  ];
}

export function scaleMatrix(sx: number, sy: number): Matrix3 {
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1],
  ];
}

export function rotationMatrix(angleDegrees: number): Matrix3 {
  const theta = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [
    [cos, -sin, 0],
    [sin, cos, 0],
    [0, 0, 1],
  ];
}

export function shearMatrix(shearX: number, shearY: number): Matrix3 {
  return [
    [1, shearX, 0],
    [shearY, 1, 0],
    [0, 0, 1],
  ];
}

export function invertMatrix3(matrix: Matrix3): Matrix3 {
  const [
    [a, b, c],
    [d, e, f],
    [g, h, i],
  ] = matrix;

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const determinant = a * A + b * B + c * C;
  const safeDeterminant = Math.abs(determinant) < 1e-8 ? 1e-8 : determinant;

  return [
    [A / safeDeterminant, D / safeDeterminant, G / safeDeterminant],
    [B / safeDeterminant, E / safeDeterminant, H / safeDeterminant],
    [C / safeDeterminant, F / safeDeterminant, I / safeDeterminant],
  ];
}

export function transformPoint(matrix: Matrix3, point: Point2D): Point2D {
  const denominator = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
  const safeDenominator = Math.abs(denominator) < 1e-8 ? 1e-8 : denominator;
  return {
    x: (matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2]) / safeDenominator,
    y: (matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2]) / safeDenominator,
  };
}

function createRgbImage(height: number, width: number, fill: RgbPixel = [1, 1, 1]): RgbImage {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => [...fill] as RgbPixel)
  );
}

function setRgbPixel(image: RgbImage, x: number, y: number, color: RgbPixel): void {
  if (y < 0 || y >= image.length || x < 0 || x >= (image[0]?.length ?? 0)) return;
  image[y][x] = [...color];
}

function blendRgbPixel(image: RgbImage, x: number, y: number, color: RgbPixel, alpha: number): void {
  if (y < 0 || y >= image.length || x < 0 || x >= (image[0]?.length ?? 0)) return;
  const source = image[y][x];
  image[y][x] = [
    clamp(source[0] * (1 - alpha) + color[0] * alpha, 0, 1),
    clamp(source[1] * (1 - alpha) + color[1] * alpha, 0, 1),
    clamp(source[2] * (1 - alpha) + color[2] * alpha, 0, 1),
  ];
}

function drawLine(image: RgbImage, start: Point2D, end: Point2D, color: RgbPixel, thickness: number = 1): void {
  const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y), 1);
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = Math.round(start.x + (end.x - start.x) * t);
    const y = Math.round(start.y + (end.y - start.y) * t);
    for (let dy = -thickness; dy <= thickness; dy++) {
      for (let dx = -thickness; dx <= thickness; dx++) {
        blendRgbPixel(image, x + dx, y + dy, color, 0.9);
      }
    }
  }
}

function fillRect(image: RgbImage, x0: number, y0: number, width: number, height: number, color: RgbPixel): void {
  for (let y = y0; y < y0 + height; y++) {
    for (let x = x0; x < x0 + width; x++) {
      setRgbPixel(image, x, y, color);
    }
  }
}

function fillCircle(image: RgbImage, center: Point2D, radius: number, color: RgbPixel): void {
  for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y++) {
    for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x++) {
      if ((x - center.x) ** 2 + (y - center.y) ** 2 <= radius ** 2) {
        setRgbPixel(image, x, y, color);
      }
    }
  }
}

export function rgbToGrayscale(rgb: RgbImage): GrayscaleImage {
  return rgb.map(row =>
    row.map(pixel => clamp(0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2], 0, 1))
  );
}

export function createCheckerboardRgbImage(size: number = 120, cells: number = 10): RgbImage {
  const image = createRgbImage(size, size, [0.97, 0.98, 1]);
  const cell = Math.max(6, Math.floor(size / cells));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const board = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      image[y][x] = board ? [0.17, 0.27, 0.46] : [0.93, 0.96, 1];
    }
  }

  for (let i = 0; i < size; i += cell) {
    drawLine(image, { x: i, y: 0 }, { x: i, y: size - 1 }, [0.98, 0.4, 0.2], 0);
    drawLine(image, { x: 0, y: i }, { x: size - 1, y: i }, [0.98, 0.4, 0.2], 0);
  }

  return image;
}

export function createGeometryTeachingImage(width: number = 120, height: number = 120): RgbImage {
  const image = createRgbImage(height, width, [0.985, 0.985, 0.99]);

  for (let x = 0; x < width; x += 12) {
    drawLine(image, { x, y: 0 }, { x, y: height - 1 }, [0.92, 0.94, 0.98], 0);
  }
  for (let y = 0; y < height; y += 12) {
    drawLine(image, { x: 0, y }, { x: width - 1, y }, [0.92, 0.94, 0.98], 0);
  }

  fillRect(image, 24, 26, 38, 38, [0.93, 0.34, 0.25]);
  fillRect(image, 24, 66, 14, 26, [0.15, 0.42, 0.8]);
  fillRect(image, 62, 26, 26, 18, [0.12, 0.67, 0.55]);
  fillCircle(image, { x: 84, y: 82 }, 11, [0.94, 0.72, 0.18]);
  drawLine(image, { x: 10, y: height - 12 }, { x: width - 12, y: height - 12 }, [0.2, 0.24, 0.32], 1);
  drawLine(image, { x: 12, y: 10 }, { x: 12, y: height - 10 }, [0.2, 0.24, 0.32], 1);

  return image;
}

export function createRegistrationReferenceImage(width: number = 140, height: number = 100): RgbImage {
  const image = createRgbImage(height, width, [0.98, 0.98, 0.97]);
  fillRect(image, 18, 16, 32, 28, [0.26, 0.46, 0.84]);
  fillRect(image, 64, 18, 24, 44, [0.93, 0.45, 0.18]);
  fillRect(image, 98, 24, 24, 16, [0.18, 0.68, 0.48]);
  fillCircle(image, { x: 42, y: 74 }, 10, [0.88, 0.28, 0.36]);
  fillCircle(image, { x: 98, y: 74 }, 13, [0.93, 0.8, 0.24]);
  drawLine(image, { x: 12, y: 10 }, { x: 120, y: 90 }, [0.35, 0.35, 0.43], 0);
  drawLine(image, { x: 20, y: 88 }, { x: 128, y: 18 }, [0.35, 0.35, 0.43], 0);
  return image;
}

function sampleNearest(image: RgbImage, x: number, y: number): RgbPixel {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || width === 0 || height === 0) {
    return [...RGB_OUT_OF_BOUNDS_FILL];
  }
  const xi = clamp(Math.round(x), 0, width - 1);
  const yi = clamp(Math.round(y), 0, height - 1);
  return image[yi][xi];
}

function sampleBilinear(image: RgbImage, x: number, y: number): RgbPixel {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || width === 0 || height === 0) {
    return [...RGB_OUT_OF_BOUNDS_FILL];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = clamp(x0 + 1, 0, width - 1);
  const y1 = clamp(y0 + 1, 0, height - 1);
  const dx = clamp(x - x0, 0, 1);
  const dy = clamp(y - y0, 0, 1);

  const c00 = image[clamp(y0, 0, height - 1)][clamp(x0, 0, width - 1)];
  const c10 = image[clamp(y0, 0, height - 1)][x1];
  const c01 = image[y1][clamp(x0, 0, width - 1)];
  const c11 = image[y1][x1];

  const blend = (channel: 0 | 1 | 2): number => {
    const top = c00[channel] * (1 - dx) + c10[channel] * dx;
    const bottom = c01[channel] * (1 - dx) + c11[channel] * dx;
    return clamp(top * (1 - dy) + bottom * dy, 0, 1);
  };

  return [blend(0), blend(1), blend(2)];
}

function sampleRgb(image: RgbImage, x: number, y: number, interpolation: InterpolationMode): RgbPixel {
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return [...RGB_OUT_OF_BOUNDS_FILL];
  }
  if (x < 0 || x > (image[0]?.length ?? 0) - 1 || y < 0 || y > image.length - 1) {
    return [...RGB_OUT_OF_BOUNDS_FILL];
  }
  return interpolation === 'nearest' ? sampleNearest(image, x, y) : sampleBilinear(image, x, y);
}

/**
 * 对单通道灰度图做双线性采样。
 * 与 undistortImage / applyWarpFromInverseMap 默认使用的插值口径一致，
 * 用于教学页面向学生展示「当前灰度采样值」时与真实 remap 结果口径统一。
 */
export function sampleGrayscaleBilinear(image: GrayscaleImage, x: number, y: number): number {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || width === 0 || height === 0) {
    return 0;
  }
  if (x < 0 || x > width - 1 || y < 0 || y > height - 1) {
    return 0;
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = clamp(x0 + 1, 0, width - 1);
  const y1 = clamp(y0 + 1, 0, height - 1);
  const dx = clamp(x - x0, 0, 1);
  const dy = clamp(y - y0, 0, 1);

  const c00 = image[clamp(y0, 0, height - 1)][clamp(x0, 0, width - 1)];
  const c10 = image[clamp(y0, 0, height - 1)][x1];
  const c01 = image[y1][clamp(x0, 0, width - 1)];
  const c11 = image[y1][x1];

  const top = c00 * (1 - dx) + c10 * dx;
  const bottom = c01 * (1 - dx) + c11 * dx;
  return clamp(top * (1 - dy) + bottom * dy, 0, 1);
}

export function applyWarpFromInverseMap(
  source: RgbImage,
  destinationWidth: number,
  destinationHeight: number,
  inverseMap: (x: number, y: number) => Point2D,
  interpolation: InterpolationMode = 'bilinear'
): RgbImage {
  const output = createRgbImage(destinationHeight, destinationWidth, [0.04, 0.04, 0.05]);
  for (let y = 0; y < destinationHeight; y++) {
    for (let x = 0; x < destinationWidth; x++) {
      const sourcePoint = inverseMap(x, y);
      output[y][x] = sampleRgb(source, sourcePoint.x, sourcePoint.y, interpolation);
    }
  }
  return output;
}

export function applyAffineTransform(
  source: RgbImage,
  matrix: Matrix3,
  interpolation: InterpolationMode = 'bilinear'
): RgbImage {
  const height = source.length;
  const width = source[0]?.length ?? 0;
  const inverse = invertMatrix3(matrix);
  return applyWarpFromInverseMap(source, width, height, (x, y) => transformPoint(inverse, { x, y }), interpolation);
}

export function createAffineMatrix(
  width: number,
  height: number,
  translationX: number,
  translationY: number,
  rotationDegrees: number,
  scaleXValue: number,
  scaleYValue: number,
  shearXValue: number,
  shearYValue: number
): Matrix3 {
  const center = translationMatrix(width / 2, height / 2);
  const centerInverse = translationMatrix(-width / 2, -height / 2);
  const transform = multiplyMatrix3(
    translationMatrix(translationX, translationY),
    multiplyMatrix3(
      rotationMatrix(rotationDegrees),
      multiplyMatrix3(shearMatrix(shearXValue, shearYValue), scaleMatrix(scaleXValue, scaleYValue))
    )
  );
  return multiplyMatrix3(center, multiplyMatrix3(transform, centerInverse));
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);

  for (let pivot = 0; pivot < n; pivot++) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < n; row++) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row;
      }
    }
    [augmented[pivot], augmented[maxRow]] = [augmented[maxRow], augmented[pivot]];

    const divisor = Math.abs(augmented[pivot][pivot]) < 1e-8 ? 1e-8 : augmented[pivot][pivot];
    for (let col = pivot; col <= n; col++) {
      augmented[pivot][col] /= divisor;
    }

    for (let row = 0; row < n; row++) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let col = pivot; col <= n; col++) {
        augmented[row][col] -= factor * augmented[pivot][col];
      }
    }
  }

  return augmented.map(row => row[n]);
}

export function computeHomography(src: Point2D[], dst: Point2D[]): Matrix3 {
  const matrix: number[][] = [];
  const vector: number[] = [];

  for (let index = 0; index < 4; index++) {
    const s = src[index];
    const d = dst[index];
    matrix.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
    vector.push(d.x);
    matrix.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
    vector.push(d.y);
  }

  const [h11, h12, h13, h21, h22, h23, h31, h32] = solveLinearSystem(matrix, vector);
  return [
    [h11, h12, h13],
    [h21, h22, h23],
    [h31, h32, 1],
  ];
}

export function computeAffineFromThreePairs(src: Point2D[], dst: Point2D[]): Matrix3 {
  const matrix: number[][] = [];
  const vector: number[] = [];

  for (let index = 0; index < 3; index++) {
    const s = src[index];
    const d = dst[index];
    matrix.push([s.x, s.y, 1, 0, 0, 0]);
    vector.push(d.x);
    matrix.push([0, 0, 0, s.x, s.y, 1]);
    vector.push(d.y);
  }

  const [a11, a12, a13, a21, a22, a23] = solveLinearSystem(matrix, vector);
  return [
    [a11, a12, a13],
    [a21, a22, a23],
    [0, 0, 1],
  ];
}

export function applyPerspectiveTransform(
  source: RgbImage,
  homography: Matrix3,
  destinationWidth: number,
  destinationHeight: number,
  interpolation: InterpolationMode = 'bilinear'
): RgbImage {
  const inverse = invertMatrix3(homography);
  return applyWarpFromInverseMap(source, destinationWidth, destinationHeight, (x, y) => transformPoint(inverse, { x, y }), interpolation);
}

function normalizePoint(point: Point2D, width: number, height: number): Point2D {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  if (halfWidth <= 0 || halfHeight <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (point.x - halfWidth) / halfWidth,
    y: (point.y - halfHeight) / halfHeight,
  };
}

function denormalizePoint(point: Point2D, width: number, height: number): Point2D {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  if (!isFinitePoint(point) || halfWidth <= 0 || halfHeight <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: point.x * halfWidth + halfWidth,
    y: point.y * halfHeight + halfHeight,
  };
}

export function distortNormalizedPoint(point: Point2D, coefficients: DistortionCoefficients): Point2D {
  if (!isFinitePoint(point)) {
    return { x: 0, y: 0 };
  }
  const r2 = point.x * point.x + point.y * point.y;
  const radial = 1 + coefficients.k1 * r2 + coefficients.k2 * r2 * r2;
  const distorted = {
    x:
      point.x * radial +
      2 * coefficients.p1 * point.x * point.y +
      coefficients.p2 * (r2 + 2 * point.x * point.x),
    y:
      point.y * radial +
      coefficients.p1 * (r2 + 2 * point.y * point.y) +
      2 * coefficients.p2 * point.x * point.y,
  };
  return isFinitePoint(distorted) ? distorted : { x: 0, y: 0 };
}

export function undistortNormalizedPoint(point: Point2D, coefficients: DistortionCoefficients, iterations: number = 6): Point2D {
  if (!isFinitePoint(point)) {
    return { x: 0, y: 0 };
  }
  let estimate = { ...point };
  for (let iteration = 0; iteration < iterations; iteration++) {
    const distorted = distortNormalizedPoint(estimate, coefficients);
    const nextEstimate = {
      x: estimate.x + (point.x - distorted.x),
      y: estimate.y + (point.y - distorted.y),
    };
    if (!isFinitePoint(nextEstimate)) {
      return { ...point };
    }
    estimate = nextEstimate;
  }
  return isFinitePoint(estimate) ? estimate : { ...point };
}

export function buildUndistortionMaps(
  width: number,
  height: number,
  coefficients: DistortionCoefficients
): { mapX: number[][]; mapY: number[][] } {
  const mapX = create2DArray(height, width, 0);
  const mapY = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const undistorted = normalizePoint({ x, y }, width, height);
      const distorted = distortNormalizedPoint(undistorted, coefficients);
      const mapped = denormalizePoint(distorted, width, height);
      mapX[y][x] = isFiniteNumber(mapped.x) ? mapped.x : 0;
      mapY[y][x] = isFiniteNumber(mapped.y) ? mapped.y : 0;
    }
  }

  return { mapX, mapY };
}

export function distortImage(source: RgbImage, coefficients: DistortionCoefficients, interpolation: InterpolationMode = 'bilinear'): RgbImage {
  const height = source.length;
  const width = source[0]?.length ?? 0;

  return applyWarpFromInverseMap(source, width, height, (x, y) => {
    const distorted = normalizePoint({ x, y }, width, height);
    const undistorted = undistortNormalizedPoint(distorted, coefficients);
    return denormalizePoint(undistorted, width, height);
  }, interpolation);
}

export function undistortImage(source: RgbImage, coefficients: DistortionCoefficients, interpolation: InterpolationMode = 'bilinear'): RgbImage {
  const height = source.length;
  const width = source[0]?.length ?? 0;

  return applyWarpFromInverseMap(source, width, height, (x, y) => {
    const undistorted = normalizePoint({ x, y }, width, height);
    const distorted = distortNormalizedPoint(undistorted, coefficients);
    return denormalizePoint(distorted, width, height);
  }, interpolation);
}

export function createDefaultPerspectiveQuad(width: number, height: number): Point2D[] {
  return [
    { x: width * 0.1, y: height * 0.28 },
    { x: width * 0.88, y: height * 0.2 },
    { x: width * 0.18, y: height * 0.78 },
    { x: width * 0.82, y: height * 0.9 },
  ];
}

export function createRectangleQuad(width: number, height: number): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 },
  ];
}

export function averagePixelValue(pixel: RgbPixel): number {
  return (pixel[0] + pixel[1] + pixel[2]) / 3;
}

export function createOverlayBlend(reference: RgbImage, moving: RgbImage): RgbImage {
  const height = Math.min(reference.length, moving.length);
  const width = Math.min(reference[0]?.length ?? 0, moving[0]?.length ?? 0);
  const output = createRgbImage(height, width, [0, 0, 0]);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const left = reference[y][x];
      const right = moving[y][x];
      output[y][x] = [
        clamp(left[0] * 0.72 + right[0] * 0.28, 0, 1),
        clamp(left[1] * 0.4 + right[1] * 0.7, 0, 1),
        clamp(left[2] * 0.35 + right[2] * 0.72, 0, 1),
      ];
    }
  }

  return output;
}
