import { GrayscaleImage } from './types';
import { RgbImage, rgbToGrayscaleWeighted } from './grayscale';
import { clamp, create2DArray } from '../utils/imageProcessing';

export interface PerspectivePoint {
  x: number;
  y: number;
}

export interface PerspectiveSize {
  width: number;
  height: number;
}

export interface PerspectiveTeachingScene {
  sourceRgb: RgbImage;
  sourceGray: GrayscaleImage;
  referenceRgb: RgbImage;
  referenceGray: GrayscaleImage;
  sourceSize: PerspectiveSize;
  destinationSize: PerspectiveSize;
  sourcePoints: PerspectivePoint[];
  destinationPoints: PerspectivePoint[];
}

export interface PerspectiveComputationResult {
  perspectiveRgb: RgbImage;
  perspectiveGray: GrayscaleImage;
  affineRgb: RgbImage;
  affineGray: GrayscaleImage;
  homography: number[][];
  affineMatrix: number[][];
  affineFourthPoint: PerspectivePoint;
  affineResidual: number;
  centerProjection: {
    source: PerspectivePoint;
    destination: PerspectivePoint;
    scale: number;
  };
}

function clonePoint(point: PerspectivePoint): PerspectivePoint {
  return { x: point.x, y: point.y };
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function setPixel(image: RgbImage, x: number, y: number, color: [number, number, number]) {
  if (y < 0 || y >= image.length || x < 0 || x >= (image[0]?.length ?? 0)) {
    return;
  }

  image[y][x] = color;
}

function blendPixel(image: RgbImage, x: number, y: number, color: [number, number, number], alpha: number) {
  if (y < 0 || y >= image.length || x < 0 || x >= (image[0]?.length ?? 0)) {
    return;
  }

  const current = image[y][x];
  image[y][x] = [
    current[0] * (1 - alpha) + color[0] * alpha,
    current[1] * (1 - alpha) + color[1] * alpha,
    current[2] * (1 - alpha) + color[2] * alpha,
  ];
}

function createRgbImage(height: number, width: number, fill: [number, number, number]): RgbImage {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => [...fill])
  );
}

function createTeachingDocument(width: number, height: number): RgbImage {
  const image = createRgbImage(height, width, [0.96, 0.95, 0.91]);

  for (let y = 0; y < height; y++) {
    const verticalT = height > 1 ? y / (height - 1) : 0;
    for (let x = 0; x < width; x++) {
      const horizontalT = width > 1 ? x / (width - 1) : 0;
      image[y][x] = lerpColor(
        [0.99, 0.985, 0.96],
        [0.95, 0.94, 0.9],
        verticalT * 0.55 + horizontalT * 0.12
      );
    }
  }

  const borderColor: [number, number, number] = [0.24, 0.3, 0.4];
  for (let x = 6; x < width - 6; x++) {
    setPixel(image, x, 6, borderColor);
    setPixel(image, x, height - 7, borderColor);
  }
  for (let y = 6; y < height - 6; y++) {
    setPixel(image, 6, y, borderColor);
    setPixel(image, width - 7, y, borderColor);
  }

  for (let y = 18; y < 32; y++) {
    for (let x = 18; x < width - 18; x++) {
      setPixel(image, x, y, [0.17, 0.32, 0.56]);
    }
  }

  for (let y = 40; y < 44; y++) {
    for (let x = 20; x < Math.round(width * 0.62); x++) {
      setPixel(image, x, y, [0.85, 0.22, 0.2]);
    }
  }

  for (let y = 54; y < height - 18; y += 12) {
    for (let x = 20; x < width - 22; x++) {
      setPixel(image, x, y, [0.62, 0.76, 0.93]);
    }
  }

  for (let y = 66; y < 98; y++) {
    for (let x = width - 58; x < width - 20; x++) {
      setPixel(image, x, y, [0.73, 0.83, 0.92]);
    }
  }

  for (let x = width - 54; x < width - 24; x++) {
    setPixel(image, x, 66, [0.22, 0.38, 0.58]);
    setPixel(image, x, 97, [0.22, 0.38, 0.58]);
  }
  for (let y = 66; y < 98; y++) {
    setPixel(image, width - 54, y, [0.22, 0.38, 0.58]);
    setPixel(image, width - 25, y, [0.22, 0.38, 0.58]);
  }

  for (let y = 74; y < 90; y += 8) {
    for (let x = width - 50; x < width - 28; x++) {
      setPixel(image, x, y, [0.22, 0.38, 0.58]);
    }
  }

  return image;
}

function createDeskBackground(width: number, height: number): RgbImage {
  const image = createRgbImage(height, width, [0.2, 0.24, 0.3]);

  for (let y = 0; y < height; y++) {
    const t = height > 1 ? y / (height - 1) : 0;
    for (let x = 0; x < width; x++) {
      const s = width > 1 ? x / (width - 1) : 0;
      image[y][x] = [
        clamp(0.12 + 0.2 * t + 0.05 * Math.sin((x + y) * 0.06), 0, 1),
        clamp(0.16 + 0.22 * t + 0.04 * Math.cos(x * 0.07), 0, 1),
        clamp(0.18 + 0.18 * s + 0.05 * Math.sin(y * 0.05), 0, 1),
      ];
    }
  }

  for (let y = 24; y < height - 20; y += 28) {
    for (let x = 0; x < width; x++) {
      blendPixel(image, x, y, [0.94, 0.95, 0.98], 0.08);
    }
  }

  return image;
}

function multiplyMatrixAndPoint(matrix: number[][], point: PerspectivePoint): { x: number; y: number; w: number } {
  const x = matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2];
  const y = matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2];
  const w = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];

  if (Math.abs(w) < 1e-8) {
    return { x: 0, y: 0, w };
  }

  return { x: x / w, y: y / w, w };
}

function determinant3x3(matrix: number[][]): number {
  return (
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
  );
}

function invert3x3(matrix: number[][]): number[][] {
  const det = determinant3x3(matrix);
  if (Math.abs(det) < 1e-10) {
    throw new Error('矩阵不可逆，无法执行透视校正。');
  }

  return [
    [
      (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) / det,
      (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) / det,
      (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) / det,
    ],
    [
      (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) / det,
      (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) / det,
      (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) / det,
    ],
    [
      (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) / det,
      (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) / det,
      (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) / det,
    ],
  ];
}

function solveLinearSystem(coefficients: number[][], constants: number[]): number[] {
  const size = coefficients.length;
  const augmented = coefficients.map((row, rowIndex) => [...row, constants[rowIndex]]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex++) {
    let maxRow = pivotIndex;
    for (let row = pivotIndex + 1; row < size; row++) {
      if (Math.abs(augmented[row][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivotIndex]) < 1e-10) {
      throw new Error('点对应关系退化，无法求解变换矩阵。');
    }

    [augmented[pivotIndex], augmented[maxRow]] = [augmented[maxRow], augmented[pivotIndex]];

    const pivotValue = augmented[pivotIndex][pivotIndex];
    for (let column = pivotIndex; column <= size; column++) {
      augmented[pivotIndex][column] /= pivotValue;
    }

    for (let row = 0; row < size; row++) {
      if (row === pivotIndex) continue;
      const factor = augmented[row][pivotIndex];
      for (let column = pivotIndex; column <= size; column++) {
        augmented[row][column] -= factor * augmented[pivotIndex][column];
      }
    }
  }

  return augmented.map(row => row[size]);
}

export function solvePerspectiveTransform(sourcePoints: PerspectivePoint[], destinationPoints: PerspectivePoint[]): number[][] {
  if (sourcePoints.length !== 4 || destinationPoints.length !== 4) {
    throw new Error('透视变换必须使用四对点。');
  }

  const coefficients: number[][] = [];
  const constants: number[] = [];

  for (let index = 0; index < 4; index++) {
    const source = sourcePoints[index];
    const destination = destinationPoints[index];

    coefficients.push([
      source.x, source.y, 1, 0, 0, 0, -destination.x * source.x, -destination.x * source.y,
    ]);
    constants.push(destination.x);

    coefficients.push([
      0, 0, 0, source.x, source.y, 1, -destination.y * source.x, -destination.y * source.y,
    ]);
    constants.push(destination.y);
  }

  const [h11, h12, h13, h21, h22, h23, h31, h32] = solveLinearSystem(coefficients, constants);
  return [
    [h11, h12, h13],
    [h21, h22, h23],
    [h31, h32, 1],
  ];
}

export function solveAffineTransform(sourcePoints: PerspectivePoint[], destinationPoints: PerspectivePoint[]): number[][] {
  if (sourcePoints.length !== 3 || destinationPoints.length !== 3) {
    throw new Error('仿射变换必须使用三对点。');
  }

  const coefficients: number[][] = [];
  const constants: number[] = [];

  for (let index = 0; index < 3; index++) {
    const source = sourcePoints[index];
    const destination = destinationPoints[index];

    coefficients.push([source.x, source.y, 1, 0, 0, 0]);
    constants.push(destination.x);

    coefficients.push([0, 0, 0, source.x, source.y, 1]);
    constants.push(destination.y);
  }

  const [a11, a12, a13, a21, a22, a23] = solveLinearSystem(coefficients, constants);
  return [
    [a11, a12, a13],
    [a21, a22, a23],
    [0, 0, 1],
  ];
}

function sampleBilinear(image: RgbImage, x: number, y: number): [number, number, number] {
  const height = image.length;
  const width = image[0]?.length ?? 0;

  const safeX = clamp(x, 0, width - 1);
  const safeY = clamp(y, 0, height - 1);
  const x0 = Math.floor(safeX);
  const y0 = Math.floor(safeY);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = safeX - x0;
  const fy = safeY - y0;

  const topLeft = image[y0][x0];
  const topRight = image[y0][x1];
  const bottomLeft = image[y1][x0];
  const bottomRight = image[y1][x1];

  const top = [
    topLeft[0] * (1 - fx) + topRight[0] * fx,
    topLeft[1] * (1 - fx) + topRight[1] * fx,
    topLeft[2] * (1 - fx) + topRight[2] * fx,
  ] as [number, number, number];

  const bottom = [
    bottomLeft[0] * (1 - fx) + bottomRight[0] * fx,
    bottomLeft[1] * (1 - fx) + bottomRight[1] * fx,
    bottomLeft[2] * (1 - fx) + bottomRight[2] * fx,
  ] as [number, number, number];

  return [
    top[0] * (1 - fy) + bottom[0] * fy,
    top[1] * (1 - fy) + bottom[1] * fy,
    top[2] * (1 - fy) + bottom[2] * fy,
  ];
}

function warpWithMatrix(sourceRgb: RgbImage, matrix: number[][], destinationSize: PerspectiveSize): RgbImage {
  const destination = createRgbImage(destinationSize.height, destinationSize.width, [0.08, 0.11, 0.16]);
  const inverse = invert3x3(matrix);

  for (let y = 0; y < destinationSize.height; y++) {
    for (let x = 0; x < destinationSize.width; x++) {
      const sourcePoint = multiplyMatrixAndPoint(inverse, { x, y });
      if (Math.abs(sourcePoint.w) < 1e-8) {
        continue;
      }

      const inside =
        sourcePoint.x >= 0 &&
        sourcePoint.x <= (sourceRgb[0]?.length ?? 0) - 1 &&
        sourcePoint.y >= 0 &&
        sourcePoint.y <= sourceRgb.length - 1;

      if (inside) {
        destination[y][x] = sampleBilinear(sourceRgb, sourcePoint.x, sourcePoint.y);
      }
    }
  }

  return destination;
}

function warpDocumentToSource(documentRgb: RgbImage, sourceSize: PerspectiveSize, sourceQuad: PerspectivePoint[]): RgbImage {
  const destinationQuad: PerspectivePoint[] = [
    { x: 0, y: 0 },
    { x: documentRgb[0].length - 1, y: 0 },
    { x: 0, y: documentRgb.length - 1 },
    { x: documentRgb[0].length - 1, y: documentRgb.length - 1 },
  ];

  const matrix = solvePerspectiveTransform(destinationQuad, sourceQuad);
  const source = createDeskBackground(sourceSize.width, sourceSize.height);
  const inverse = invert3x3(matrix);

  for (let y = 0; y < sourceSize.height; y++) {
    for (let x = 0; x < sourceSize.width; x++) {
      const documentPoint = multiplyMatrixAndPoint(inverse, { x, y });
      const inside =
        documentPoint.x >= 0 &&
        documentPoint.x <= documentRgb[0].length - 1 &&
        documentPoint.y >= 0 &&
        documentPoint.y <= documentRgb.length - 1;

      if (!inside) {
        continue;
      }

      const shadowDistance = Math.max(0, Math.min(1, (y - 18) / sourceSize.height));
      blendPixel(source, x + 3, y + 5, [0.03, 0.04, 0.06], 0.12 + 0.1 * shadowDistance);
      source[y][x] = sampleBilinear(documentRgb, documentPoint.x, documentPoint.y);
    }
  }

  return source;
}

function polygonArea(points: PerspectivePoint[]): number {
  let area = 0;
  const ordered = [points[0], points[1], points[3], points[2]];

  for (let index = 0; index < ordered.length; index++) {
    const current = ordered[index];
    const next = ordered[(index + 1) % ordered.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

function cross(o: PerspectivePoint, a: PerspectivePoint, b: PerspectivePoint): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function isValidPerspectiveQuad(points: PerspectivePoint[]): boolean {
  if (points.length !== 4) return false;

  const ordered = [points[0], points[1], points[3], points[2]];
  const orientation = Math.sign(polygonArea(points));
  if (orientation === 0 || Math.abs(polygonArea(points)) < 900) {
    return false;
  }

  for (let index = 0; index < ordered.length; index++) {
    const previous = ordered[index];
    const current = ordered[(index + 1) % ordered.length];
    const next = ordered[(index + 2) % ordered.length];
    const value = cross(previous, current, next);
    if (Math.sign(value) !== orientation && Math.abs(value) > 1e-6) {
      return false;
    }
  }

  return true;
}

export function clampPerspectivePoint(point: PerspectivePoint, bounds: PerspectiveSize, padding: number): PerspectivePoint {
  return {
    x: clamp(point.x, padding, bounds.width - padding),
    y: clamp(point.y, padding, bounds.height - padding),
  };
}

export function createPerspectiveTeachingScene(): PerspectiveTeachingScene {
  const destinationSize = { width: 168, height: 120 };
  const sourceSize = { width: 232, height: 176 };
  const referenceRgb = createTeachingDocument(destinationSize.width, destinationSize.height);
  const sourcePoints: PerspectivePoint[] = [
    { x: 58, y: 30 },
    { x: 184, y: 24 },
    { x: 36, y: 150 },
    { x: 206, y: 160 },
  ];
  const destinationPoints: PerspectivePoint[] = [
    { x: 0, y: 0 },
    { x: destinationSize.width - 1, y: 0 },
    { x: 0, y: destinationSize.height - 1 },
    { x: destinationSize.width - 1, y: destinationSize.height - 1 },
  ];

  const sourceRgb = warpDocumentToSource(referenceRgb, sourceSize, sourcePoints);

  return {
    sourceRgb,
    sourceGray: rgbToGrayscaleWeighted(sourceRgb),
    referenceRgb,
    referenceGray: rgbToGrayscaleWeighted(referenceRgb),
    sourceSize,
    destinationSize,
    sourcePoints: sourcePoints.map(clonePoint),
    destinationPoints: destinationPoints.map(clonePoint),
  };
}

export function computePerspectiveCorrection(
  scene: PerspectiveTeachingScene,
  selectedPoints: PerspectivePoint[]
): PerspectiveComputationResult {
  const homography = solvePerspectiveTransform(selectedPoints, scene.destinationPoints);
  const affineMatrix = solveAffineTransform(
    selectedPoints.slice(0, 3),
    scene.destinationPoints.slice(0, 3)
  );

  const perspectiveRgb = warpWithMatrix(scene.sourceRgb, homography, scene.destinationSize);
  const affineRgb = warpWithMatrix(scene.sourceRgb, affineMatrix, scene.destinationSize);
  const affineFourthPointRaw = multiplyMatrixAndPoint(affineMatrix, selectedPoints[3]);
  const affineFourthPoint = {
    x: affineFourthPointRaw.x,
    y: affineFourthPointRaw.y,
  };
  const affineResidual = Math.hypot(
    affineFourthPoint.x - scene.destinationPoints[3].x,
    affineFourthPoint.y - scene.destinationPoints[3].y
  );
  const centerSource = {
    x: selectedPoints.reduce((sum, point) => sum + point.x, 0) / selectedPoints.length,
    y: selectedPoints.reduce((sum, point) => sum + point.y, 0) / selectedPoints.length,
  };
  const centerProjectionRaw = multiplyMatrixAndPoint(homography, centerSource);

  return {
    perspectiveRgb,
    perspectiveGray: rgbToGrayscaleWeighted(perspectiveRgb),
    affineRgb,
    affineGray: rgbToGrayscaleWeighted(affineRgb),
    homography,
    affineMatrix,
    affineFourthPoint,
    affineResidual,
    centerProjection: {
      source: centerSource,
      destination: {
        x: centerProjectionRaw.x,
        y: centerProjectionRaw.y,
      },
      scale: centerProjectionRaw.w,
    },
  };
}

export function formatTransformNumber(value: number, digits: number = 3): string {
  if (Math.abs(value) < 1e-6) {
    return '0';
  }

  return value.toFixed(digits).replace(/\.?0+$/, '');
}

export function createPointMarkerImage(size: PerspectiveSize, points: PerspectivePoint[]): GrayscaleImage {
  const image = create2DArray(size.height, size.width, 0.18);

  points.forEach(point => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = Math.round(point.x + dx);
        const y = Math.round(point.y + dy);
        if (x >= 0 && x < size.width && y >= 0 && y < size.height) {
          image[y][x] = 0.95;
        }
      }
    }
  });

  return image;
}
