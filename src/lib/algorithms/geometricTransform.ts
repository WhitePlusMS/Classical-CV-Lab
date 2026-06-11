import { create2DArray, clamp } from '../utils/imageProcessing';
import { GrayscaleImage } from './types';

export type InterpolationMethod = 'nearest' | 'bilinear';
export type FlipMode = 'none' | 'horizontal' | 'vertical' | 'both';
export type TransformFamilyKey = 'orthogonal' | 'rigid' | 'similar' | 'affine';
export type RgbImage = number[][][];

export interface TransformParameters {
  translateX: number;
  translateY: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
  shearX: number;
  shearY: number;
  flipMode: FlipMode;
}

export interface Point2D {
  x: number;
  y: number;
}

export type Matrix3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface TeachingLandmark {
  id: string;
  label: string;
  description: string;
  point: Point2D;
}

export interface BilinearNeighbor {
  label: 'Q11' | 'Q21' | 'Q12' | 'Q22';
  x: number;
  y: number;
  value: number;
  weight: number;
}

export interface GeometricTransformStep {
  x: number;
  y: number;
  destinationCartesian: Point2D;
  sourceCartesian: Point2D;
  sourceImage: Point2D;
  outputValue: number;
  sourceInsideBounds: boolean;
  regionX: number;
  regionY: number;
  regionWidth: number;
  regionHeight: number;
  nearestSource: {
    x: number;
    y: number;
    value: number;
  } | null;
  bilinearNeighbors: BilinearNeighbor[];
}

export interface TransformPointMapping {
  sourceImage: Point2D;
  sourceCartesian: Point2D;
  transformedCartesian: Point2D;
  destinationImage: Point2D;
  roundedDestinationImage: Point2D;
  inBounds: boolean;
}

export const DEFAULT_GEOMETRIC_TRANSFORM_PARAMS: TransformParameters = {
  translateX: 0,
  translateY: 0,
  rotationDeg: 18,
  scaleX: 1,
  scaleY: 1,
  shearX: 0.2,
  shearY: 0,
  flipMode: 'none',
};

export const TRANSFORM_COMPOSITION_ORDER = ['flip', 'scale', 'shear', 'rotate', 'translate'] as const;

const EPSILON = 1e-6;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function createIdentityMatrix(): Matrix3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function multiplyMatrices(left: Matrix3, right: Matrix3): Matrix3 {
  const result = createIdentityMatrix();

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      result[row][col] =
        left[row][0] * right[0][col] +
        left[row][1] * right[1][col] +
        left[row][2] * right[2][col];
    }
  }

  return result;
}

function applyMatrix(point: Point2D, matrix: Matrix3): Point2D {
  return {
    x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2],
    y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2],
  };
}

export function buildTranslationMatrix(tx: number, ty: number): Matrix3 {
  return [
    [1, 0, tx],
    [0, 1, ty],
    [0, 0, 1],
  ];
}

export function buildScaleMatrix(sx: number, sy: number): Matrix3 {
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1],
  ];
}

export function buildRotationMatrix(rotationDeg: number): Matrix3 {
  const theta = toRadians(rotationDeg);
  const cosine = Math.cos(theta);
  const sine = Math.sin(theta);

  return [
    [cosine, -sine, 0],
    [sine, cosine, 0],
    [0, 0, 1],
  ];
}

export function buildShearMatrix(shearX: number, shearY: number): Matrix3 {
  return [
    [1, shearX, 0],
    [shearY, 1, 0],
    [0, 0, 1],
  ];
}

export function buildFlipMatrix(mode: FlipMode): Matrix3 {
  switch (mode) {
    case 'horizontal':
      return [
        [-1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
    case 'vertical':
      return [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 1],
      ];
    case 'both':
      return [
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, 1],
      ];
    default:
      return createIdentityMatrix();
  }
}

export function buildCompositeTransformMatrix(parameters: TransformParameters): Matrix3 {
  const translation = buildTranslationMatrix(parameters.translateX, parameters.translateY);
  const rotation = buildRotationMatrix(parameters.rotationDeg);
  const shear = buildShearMatrix(parameters.shearX, parameters.shearY);
  const scale = buildScaleMatrix(parameters.scaleX, parameters.scaleY);
  const flip = buildFlipMatrix(parameters.flipMode);

  return multiplyMatrices(
    translation,
    multiplyMatrices(rotation, multiplyMatrices(shear, multiplyMatrices(scale, flip)))
  );
}

export function invertAffineMatrix(matrix: Matrix3): Matrix3 {
  const a = matrix[0][0];
  const b = matrix[0][1];
  const c = matrix[0][2];
  const d = matrix[1][0];
  const e = matrix[1][1];
  const f = matrix[1][2];
  const determinant = a * e - b * d;

  if (Math.abs(determinant) < EPSILON) {
    return createIdentityMatrix();
  }

  const inverseDet = 1 / determinant;
  return [
    [e * inverseDet, -b * inverseDet, (b * f - e * c) * inverseDet],
    [-d * inverseDet, a * inverseDet, (d * c - a * f) * inverseDet],
    [0, 0, 1],
  ];
}

export function imageToCartesian(
  point: Point2D,
  width: number,
  height: number
): Point2D {
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;

  return {
    x: point.x - centerX,
    y: centerY - point.y,
  };
}

export function cartesianToImage(
  point: Point2D,
  width: number,
  height: number
): Point2D {
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;

  return {
    x: point.x + centerX,
    y: centerY - point.y,
  };
}

function isInsideImage(point: Point2D, width: number, height: number): boolean {
  return point.x >= 0 && point.x <= width - 1 && point.y >= 0 && point.y <= height - 1;
}

function getImageValue(image: GrayscaleImage, x: number, y: number): number {
  const height = image.length;
  const width = image[0]?.length ?? 0;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return 0;
  }

  return image[y][x];
}

function getRgbValue(image: RgbImage, x: number, y: number): [number, number, number] {
  const height = image.length;
  const width = image[0]?.length ?? 0;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return [0, 0, 0];
  }

  const pixel = image[y][x];
  return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
}

function getNearestRegion(point: Point2D, width: number, height: number) {
  const x = clamp(Math.round(point.x), 0, width - 1);
  const y = clamp(Math.round(point.y), 0, height - 1);

  return { x, y, width: 1, height: 1 };
}

function getBilinearRegion(point: Point2D, width: number, height: number) {
  const x0 = clamp(Math.floor(point.x), 0, Math.max(0, width - 1));
  const y0 = clamp(Math.floor(point.y), 0, Math.max(0, height - 1));
  const regionWidth = Math.min(2, width - x0);
  const regionHeight = Math.min(2, height - y0);

  return {
    x: x0,
    y: y0,
    width: Math.max(1, regionWidth),
    height: Math.max(1, regionHeight),
  };
}

function sampleNearest(image: GrayscaleImage, sourceImage: Point2D) {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const nearestX = Math.round(sourceImage.x);
  const nearestY = Math.round(sourceImage.y);
  const value = getImageValue(image, nearestX, nearestY);
  const region = getNearestRegion(sourceImage, width, height);

  return {
    value,
    regionX: region.x,
    regionY: region.y,
    regionWidth: region.width,
    regionHeight: region.height,
    nearestSource: {
      x: nearestX,
      y: nearestY,
      value,
    },
    bilinearNeighbors: [] as BilinearNeighbor[],
  };
}

function sampleBilinear(image: GrayscaleImage, sourceImage: Point2D) {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const x0 = Math.floor(sourceImage.x);
  const y0 = Math.floor(sourceImage.y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const dx = sourceImage.x - x0;
  const dy = sourceImage.y - y0;

  const neighbors: BilinearNeighbor[] = [
    { label: 'Q11', x: x0, y: y0, value: getImageValue(image, x0, y0), weight: (1 - dx) * (1 - dy) },
    { label: 'Q21', x: x1, y: y0, value: getImageValue(image, x1, y0), weight: dx * (1 - dy) },
    { label: 'Q12', x: x0, y: y1, value: getImageValue(image, x0, y1), weight: (1 - dx) * dy },
    { label: 'Q22', x: x1, y: y1, value: getImageValue(image, x1, y1), weight: dx * dy },
  ];

  const value = neighbors.reduce((sum, item) => sum + item.value * item.weight, 0);
  const region = getBilinearRegion(sourceImage, width, height);

  return {
    value,
    regionX: region.x,
    regionY: region.y,
    regionWidth: region.width,
    regionHeight: region.height,
    nearestSource: null,
    bilinearNeighbors: neighbors,
  };
}

function sampleNearestRgb(image: RgbImage, sourceImage: Point2D): [number, number, number] {
  return getRgbValue(image, Math.round(sourceImage.x), Math.round(sourceImage.y));
}

function sampleBilinearRgb(image: RgbImage, sourceImage: Point2D): [number, number, number] {
  const x0 = Math.floor(sourceImage.x);
  const y0 = Math.floor(sourceImage.y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const dx = sourceImage.x - x0;
  const dy = sourceImage.y - y0;

  const neighbors = [
    { value: getRgbValue(image, x0, y0), weight: (1 - dx) * (1 - dy) },
    { value: getRgbValue(image, x1, y0), weight: dx * (1 - dy) },
    { value: getRgbValue(image, x0, y1), weight: (1 - dx) * dy },
    { value: getRgbValue(image, x1, y1), weight: dx * dy },
  ];

  return [0, 1, 2].map(channel =>
    clamp(
      neighbors.reduce((sum, item) => sum + item.value[channel] * item.weight, 0),
      0,
      1
    )
  ) as [number, number, number];
}

function sampleRgb(
  image: RgbImage,
  sourceImage: Point2D,
  interpolation: InterpolationMethod
): [number, number, number] {
  return interpolation === 'nearest'
    ? sampleNearestRgb(image, sourceImage)
    : sampleBilinearRgb(image, sourceImage);
}

export function classifyTransformFamily(parameters: TransformParameters): TransformFamilyKey {
  const hasTranslation =
    Math.abs(parameters.translateX) > EPSILON || Math.abs(parameters.translateY) > EPSILON;
  const hasShear = Math.abs(parameters.shearX) > EPSILON || Math.abs(parameters.shearY) > EPSILON;
  const uniformScale = Math.abs(parameters.scaleX - parameters.scaleY) <= EPSILON;
  const unitScale =
    Math.abs(parameters.scaleX - 1) <= EPSILON && Math.abs(parameters.scaleY - 1) <= EPSILON;

  if (!hasTranslation && !hasShear && unitScale) {
    return 'orthogonal';
  }

  if (!hasShear && unitScale) {
    return 'rigid';
  }

  if (!hasShear && uniformScale) {
    return 'similar';
  }

  return 'affine';
}

export function createGeometricTransformSampleImage(size: number = 15): GrayscaleImage {
  const image = create2DArray(size, size, 0.08);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const centered = imageToCartesian({ x, y }, size, size);
      let value = 0.08 + ((centered.x + 7) / 14) * 0.04;

      if (centered.x >= -5 && centered.x <= -3 && centered.y >= -4 && centered.y <= 4) {
        value = 0.92;
      }

      if (centered.x >= -5 && centered.x <= 1 && centered.y >= 2 && centered.y <= 4) {
        value = 0.78;
      }

      if (centered.x >= -5 && centered.x <= 0 && centered.y >= -1 && centered.y <= 1) {
        value = 0.62;
      }

      if (centered.x >= 2 && centered.x <= 5 && centered.y >= -5 && centered.y <= -2) {
        value = 0.28 + (centered.x - 2) * 0.12 + (centered.y + 5) * 0.05;
      }

      if (Math.abs(centered.x - 3) + Math.abs(centered.y + 3) <= 1) {
        value = 1;
      }

      image[y][x] = clamp(value, 0, 1);
    }
  }

  return image;
}

export function createGeometricTransformLandmarks(size: number): TeachingLandmark[] {
  const centerX = (size - 1) / 2;
  const centerY = (size - 1) / 2;
  const point = (x: number, y: number): Point2D => ({
    x: clamp(Math.round(x), 0, size - 1),
    y: clamp(Math.round(y), 0, size - 1),
  });

  return [
    {
      id: 'top-bar',
      label: 'A',
      description: '上方纹理区域的参考点',
      point: point(centerX + 1, centerY - 3),
    },
    {
      id: 'mid-bar',
      label: 'B',
      description: '图像中心附近的参考点',
      point: point(centerX, centerY),
    },
    {
      id: 'bright-dot',
      label: 'C',
      description: '右下区域的参考点',
      point: point(centerX + 3, centerY + 3),
    },
    {
      id: 'bottom-stem',
      label: 'D',
      description: '下方边缘附近的参考点',
      point: point(centerX - 4, centerY + 4),
    },
  ];
}

export function mapSourcePointToDestination(
  sourceImage: Point2D,
  matrix: Matrix3,
  width: number,
  height: number
): TransformPointMapping {
  const sourceCartesian = imageToCartesian(sourceImage, width, height);
  const transformedCartesian = applyMatrix(sourceCartesian, matrix);
  const destinationImage = cartesianToImage(transformedCartesian, width, height);
  const roundedDestinationImage = {
    x: Math.round(destinationImage.x),
    y: Math.round(destinationImage.y),
  };

  return {
    sourceImage,
    sourceCartesian,
    transformedCartesian,
    destinationImage,
    roundedDestinationImage,
    inBounds: isInsideImage(destinationImage, width, height),
  };
}

export function getGeometricTransformStep(
  image: GrayscaleImage,
  inverseMatrix: Matrix3,
  x: number,
  y: number,
  interpolation: InterpolationMethod
): GeometricTransformStep {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const destinationCartesian = imageToCartesian({ x, y }, width, height);
  const sourceCartesian = applyMatrix(destinationCartesian, inverseMatrix);
  const sourceImage = cartesianToImage(sourceCartesian, width, height);
  const sampled =
    interpolation === 'nearest'
      ? sampleNearest(image, sourceImage)
      : sampleBilinear(image, sourceImage);

  return {
    x,
    y,
    destinationCartesian,
    sourceCartesian,
    sourceImage,
    outputValue: sampled.value,
    sourceInsideBounds: isInsideImage(sourceImage, width, height),
    regionX: sampled.regionX,
    regionY: sampled.regionY,
    regionWidth: sampled.regionWidth,
    regionHeight: sampled.regionHeight,
    nearestSource: sampled.nearestSource,
    bilinearNeighbors: sampled.bilinearNeighbors,
  };
}

export function transformGrayscaleImage(
  image: GrayscaleImage,
  inverseMatrix: Matrix3,
  interpolation: InterpolationMethod
): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const output = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      output[y][x] = getGeometricTransformStep(image, inverseMatrix, x, y, interpolation).outputValue;
    }
  }

  return output;
}

export function transformRgbImage(
  image: RgbImage,
  inverseMatrix: Matrix3,
  interpolation: InterpolationMethod
): RgbImage {
  const height = image.length;
  const width = image[0]?.length ?? 0;
  const output: RgbImage = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => [0, 0, 0])
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const destinationCartesian = imageToCartesian({ x, y }, width, height);
      const sourceCartesian = applyMatrix(destinationCartesian, inverseMatrix);
      const sourceImage = cartesianToImage(sourceCartesian, width, height);
      output[y][x] = sampleRgb(image, sourceImage, interpolation);
    }
  }

  return output;
}

export function clampPointToImage(point: Point2D, width: number, height: number): Point2D {
  return {
    x: clamp(point.x, 0, width - 1),
    y: clamp(point.y, 0, height - 1),
  };
}
