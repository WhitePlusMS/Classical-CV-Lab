import { GrayscaleImage } from './types';
import { clamp, create2DArray } from '../utils/imageProcessing';

export interface CalibrationPoint2D {
  x: number;
  y: number;
}

export interface CalibrationPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface CalibrationIntrinsics {
  alpha: number;
  beta: number;
  gamma: number;
  u0: number;
  v0: number;
}

export interface CalibrationExtrinsics {
  yaw: number;
  pitch: number;
  roll: number;
  tx: number;
  ty: number;
  tz: number;
}

export interface CalibrationBoardSpec {
  rows: number;
  cols: number;
  cellSize: number;
}

export interface CalibrationBoardCorner {
  index: number;
  row: number;
  col: number;
  world: CalibrationPoint3D;
}

export interface ProjectionStep {
  world: CalibrationPoint3D;
  camera: CalibrationPoint3D;
  normalized: CalibrationPoint2D;
  pixel: CalibrationPoint2D;
  depth: number;
  visible: boolean;
}

export interface ProjectedBoardCorner extends CalibrationBoardCorner {
  projected: CalibrationPoint2D;
  rounded: CalibrationPoint2D;
  subPixel: CalibrationPoint2D;
  visible: boolean;
  reprojectionError: number;
}

export interface HomographyConstraintPair {
  v12: number[];
  v11MinusV22: number[];
}

export interface CalibrationViewSample {
  id: string;
  name: string;
  extrinsics: CalibrationExtrinsics;
  homography: number[][];
  constraints: HomographyConstraintPair;
  meanReprojectionError: number;
  corners: ProjectedBoardCorner[];
}

export const DEFAULT_CAMERA_INTRINSICS: CalibrationIntrinsics = {
  alpha: 860,
  beta: 840,
  gamma: 0,
  u0: 320,
  v0: 240,
};

export const DEFAULT_BOARD_SPEC: CalibrationBoardSpec = {
  rows: 6,
  cols: 8,
  cellSize: 1,
};

export const DEFAULT_CALIBRATION_VIEWS: CalibrationExtrinsics[] = [
  { yaw: -12, pitch: 8, roll: -4, tx: -2.1, ty: -1.5, tz: 11.5 },
  { yaw: 9, pitch: -6, roll: 5, tx: 1.8, ty: -0.8, tz: 10.8 },
  { yaw: 15, pitch: 12, roll: -6, tx: -1.1, ty: 1.3, tz: 12.2 },
  { yaw: -18, pitch: -9, roll: 7, tx: 2.6, ty: 0.9, tz: 13.4 },
  { yaw: 6, pitch: 16, roll: -3, tx: -0.4, ty: -1.1, tz: 10.1 },
];

type Matrix3 = [[number, number, number], [number, number, number], [number, number, number]];

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function multiplyMatrix3Vector3(matrix: Matrix3, vector: [number, number, number]): [number, number, number] {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ];
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

function transposeMatrix3(matrix: Matrix3): Matrix3 {
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]],
  ];
}

function invertUpperTriangularIntrinsics(intrinsics: CalibrationIntrinsics): Matrix3 {
  const { alpha, beta, gamma, u0, v0 } = intrinsics;
  return [
    [1 / alpha, -gamma / (alpha * beta), (gamma * v0 - beta * u0) / (alpha * beta)],
    [0, 1 / beta, -v0 / beta],
    [0, 0, 1],
  ];
}

export function createIntrinsicMatrix(intrinsics: CalibrationIntrinsics): Matrix3 {
  return [
    [intrinsics.alpha, intrinsics.gamma, intrinsics.u0],
    [0, intrinsics.beta, intrinsics.v0],
    [0, 0, 1],
  ];
}

export function createRotationMatrix(extrinsics: CalibrationExtrinsics): Matrix3 {
  const yaw = degreesToRadians(extrinsics.yaw);
  const pitch = degreesToRadians(extrinsics.pitch);
  const roll = degreesToRadians(extrinsics.roll);

  const rz: Matrix3 = [
    [Math.cos(yaw), -Math.sin(yaw), 0],
    [Math.sin(yaw), Math.cos(yaw), 0],
    [0, 0, 1],
  ];
  const ry: Matrix3 = [
    [Math.cos(pitch), 0, Math.sin(pitch)],
    [0, 1, 0],
    [-Math.sin(pitch), 0, Math.cos(pitch)],
  ];
  const rx: Matrix3 = [
    [1, 0, 0],
    [0, Math.cos(roll), -Math.sin(roll)],
    [0, Math.sin(roll), Math.cos(roll)],
  ];

  return multiplyMatrix3(rz, multiplyMatrix3(ry, rx));
}

export function createBoardCorners(spec: CalibrationBoardSpec): CalibrationBoardCorner[] {
  const corners: CalibrationBoardCorner[] = [];

  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.cols; col++) {
      corners.push({
        index: row * spec.cols + col,
        row,
        col,
        world: {
          x: col * spec.cellSize,
          y: row * spec.cellSize,
          z: 0,
        },
      });
    }
  }

  return corners;
}

export function projectWorldPoint(
  point: CalibrationPoint3D,
  intrinsics: CalibrationIntrinsics,
  extrinsics: CalibrationExtrinsics
): ProjectionStep {
  const rotation = createRotationMatrix(extrinsics);
  const [xc, yc, zc] = multiplyMatrix3Vector3(rotation, [point.x, point.y, point.z]);
  const camera = {
    x: xc + extrinsics.tx,
    y: yc + extrinsics.ty,
    z: zc + extrinsics.tz,
  };

  const safeDepth = Math.abs(camera.z) < 1e-6 ? 1e-6 : camera.z;
  const normalized = {
    x: camera.x / safeDepth,
    y: camera.y / safeDepth,
  };

  const pixel = {
    x: intrinsics.alpha * normalized.x + intrinsics.gamma * normalized.y + intrinsics.u0,
    y: intrinsics.beta * normalized.y + intrinsics.v0,
  };

  return {
    world: point,
    camera,
    normalized,
    pixel,
    depth: camera.z,
    visible: camera.z > 0,
  };
}

function deterministicCornerOffset(corner: CalibrationBoardCorner): CalibrationPoint2D {
  const jitterX = ((corner.row * 7 + corner.col * 11) % 5 - 2) * 0.04;
  const jitterY = ((corner.row * 13 + corner.col * 5) % 5 - 2) * 0.035;
  return { x: jitterX, y: jitterY };
}

export function projectBoardCorners(
  spec: CalibrationBoardSpec,
  intrinsics: CalibrationIntrinsics,
  extrinsics: CalibrationExtrinsics
): ProjectedBoardCorner[] {
  return createBoardCorners(spec).map(corner => {
    const projection = projectWorldPoint(corner.world, intrinsics, extrinsics);
    const rounded = {
      x: Math.round(projection.pixel.x),
      y: Math.round(projection.pixel.y),
    };
    const offset = deterministicCornerOffset(corner);
    const subPixel = {
      x: projection.pixel.x + offset.x,
      y: projection.pixel.y + offset.y,
    };
    const reprojectionError = Math.hypot(subPixel.x - projection.pixel.x, subPixel.y - projection.pixel.y);

    return {
      ...corner,
      projected: projection.pixel,
      rounded,
      subPixel,
      visible: projection.visible,
      reprojectionError,
    };
  });
}

export function createCheckerboardImage(
  rows: number,
  cols: number,
  highlightedCorner?: { row: number; col: number } | null,
  cellPixels: number = 10
): GrayscaleImage {
  const height = (rows + 1) * cellPixels;
  const width = (cols + 1) * cellPixels;
  const image = create2DArray(height, width, 0.94);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const squareRow = Math.floor(y / cellPixels);
      const squareCol = Math.floor(x / cellPixels);
      const isDark = (squareRow + squareCol) % 2 === 0;
      image[y][x] = isDark ? 0.16 : 0.92;
    }
  }

  if (highlightedCorner) {
    const cx = highlightedCorner.col * cellPixels;
    const cy = highlightedCorner.row * cellPixels;
    for (let dy = -1; dy <= 1; dy++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        const py = clamp(cy + dy, 0, height - 1);
        const px = clamp(x, 0, width - 1);
        image[py][px] = 1;
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let y = cy - 2; y <= cy + 2; y++) {
        const py = clamp(y, 0, height - 1);
        const px = clamp(cx + dx, 0, width - 1);
        image[py][px] = 1;
      }
    }
  }

  return image;
}

export function createProjectedCornerImage(
  corners: ProjectedBoardCorner[],
  width: number,
  height: number,
  highlightedCornerIndex?: number | null,
  useSubPixel: boolean = true
): GrayscaleImage {
  const image = create2DArray(height, width, 0.04);

  corners.forEach(corner => {
    const point = useSubPixel ? corner.subPixel : corner.rounded;
    const cx = clamp(Math.round(point.x), 0, width - 1);
    const cy = clamp(Math.round(point.y), 0, height - 1);
    const radius = corner.index === highlightedCornerIndex ? 3 : 2;
    const value = corner.index === highlightedCornerIndex ? 1 : 0.8;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const px = clamp(cx + dx, 0, width - 1);
        const py = clamp(cy + dy, 0, height - 1);
        image[py][px] = value;
      }
    }
  });

  return image;
}

export function createBoardProjectionImage(
  spec: CalibrationBoardSpec,
  intrinsics: CalibrationIntrinsics,
  extrinsics: CalibrationExtrinsics,
  highlightedCornerIndex?: number | null,
  width: number = 640,
  height: number = 480
): GrayscaleImage {
  const corners = projectBoardCorners(spec, intrinsics, extrinsics);
  return createProjectedCornerImage(corners, width, height, highlightedCornerIndex ?? undefined);
}

export function computeHomographyFromPose(
  intrinsics: CalibrationIntrinsics,
  extrinsics: CalibrationExtrinsics
): number[][] {
  const k = createIntrinsicMatrix(intrinsics);
  const rotation = createRotationMatrix(extrinsics);
  const planeMatrix: Matrix3 = [
    [rotation[0][0], rotation[0][1], extrinsics.tx],
    [rotation[1][0], rotation[1][1], extrinsics.ty],
    [rotation[2][0], rotation[2][1], extrinsics.tz],
  ];

  return multiplyMatrix3(k, planeMatrix);
}

export function computeBMatrix(intrinsics: CalibrationIntrinsics): Matrix3 {
  const kInverse = invertUpperTriangularIntrinsics(intrinsics);
  return multiplyMatrix3(transposeMatrix3(kInverse), kInverse);
}

export function computeVijVector(homography: number[][], i: number, j: number): number[] {
  const h1 = homography[0][i];
  const h2 = homography[1][i];
  const h3 = homography[2][i];
  const g1 = homography[0][j];
  const g2 = homography[1][j];
  const g3 = homography[2][j];

  return [
    h1 * g1,
    h1 * g2 + h2 * g1,
    h2 * g2,
    h3 * g1 + h1 * g3,
    h3 * g2 + h2 * g3,
    h3 * g3,
  ];
}

export function computeHomographyConstraints(homography: number[][]): HomographyConstraintPair {
  const v12 = computeVijVector(homography, 0, 1);
  const v11 = computeVijVector(homography, 0, 0);
  const v22 = computeVijVector(homography, 1, 1);

  return {
    v12,
    v11MinusV22: v11.map((value, index) => value - v22[index]),
  };
}

export function buildCalibrationViewSamples(
  intrinsics: CalibrationIntrinsics = DEFAULT_CAMERA_INTRINSICS,
  spec: CalibrationBoardSpec = DEFAULT_BOARD_SPEC
): CalibrationViewSample[] {
  return DEFAULT_CALIBRATION_VIEWS.map((extrinsics, index) => {
    const corners = projectBoardCorners(spec, intrinsics, extrinsics);
    const meanReprojectionError =
      corners.reduce((total, corner) => total + corner.reprojectionError, 0) / corners.length;
    const homography = computeHomographyFromPose(intrinsics, extrinsics);

    return {
      id: `view-${index + 1}`,
      name: `姿态 ${index + 1}`,
      extrinsics,
      corners,
      homography,
      constraints: computeHomographyConstraints(homography),
      meanReprojectionError,
    };
  });
}

export function countCalibrationEquations(viewCount: number): number {
  return Math.max(0, viewCount) * 2;
}

export function formatMatrixValue(value: number, digits: number = 3): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.abs(value) < 1e-9 ? 0 : value;
  return rounded.toFixed(digits);
}
