import { GrayscaleImage } from './types';
import { clamp, create2DArray } from '../utils/imageProcessing';
import {
  invertMatrix3,
  normalizePoints2D,
  orthogonalizeRotation,
  solveHomogeneous,
} from './matrixDecomposition';

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

type Vec3 = [number, number, number];

function identity3(): Matrix3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function crossProduct3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function multiplyMatrix3Vector3(matrix: number[][], vector: [number, number, number]): [number, number, number] {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ];
}

function multiplyMatrix3(a: number[][], b: number[][]): Matrix3 {
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

function transposeMatrix3(matrix: number[][]): Matrix3 {
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

/**
 * 根据 extrinsics 中的欧拉角构造旋转矩阵 R。
 *
 * 旋转顺序约定为 roll → pitch → yaw（即先绕 X 轴，再绕 Y 轴，最后绕 Z 轴），
 * 合成矩阵为 R = Rz * Ry * Rx，所有旋转均按右手坐标系正方向。
 */
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
    const cx = (highlightedCorner.col + 1) * cellPixels;
    const cy = (highlightedCorner.row + 1) * cellPixels;
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
  const boardCorners = createBoardCorners(spec);
  const objectPoints = boardCorners.map(corner => corner.world);

  // 1. 用真实内外参合成“检测角点”（含轻微确定性噪声）
  const observations = DEFAULT_CALIBRATION_VIEWS.map((extrinsics, index) => {
    const corners = projectBoardCorners(spec, intrinsics, extrinsics);
    return {
      id: `view-${index + 1}`,
      name: `姿态 ${index + 1}`,
      extrinsics,
      corners,
      imagePoints: corners.map(corner => corner.subPixel),
    };
  });

  // 2. 真实张正友估计：H -> B -> K
  const homographies = observations.map(view => estimateHomographyDLT(objectPoints, view.imagePoints, true));
  const estimatedIntrinsics = estimateIntrinsicsFromHomographies(homographies);

  // 3. 从每个 H 恢复外参
  const estimatedPoses = homographies.map(H => estimateExtrinsicsFromHomography(H, estimatedIntrinsics));

  // 4. 用估计参数重投影并计算误差
  return observations.map((view, index) => {
    const { rotation, translation } = estimatedPoses[index];
    const reprojectedCorners = reprojectBoardCorners(
      boardCorners,
      estimatedIntrinsics,
      rotation,
      translation,
      view.imagePoints
    );
    const meanReprojectionError =
      reprojectedCorners.reduce((total, corner) => total + corner.reprojectionError, 0) /
      reprojectedCorners.length;

    return {
      id: view.id,
      name: view.name,
      extrinsics: matrixToCalibrationExtrinsics(rotation, translation),
      corners: reprojectedCorners,
      homography: homographies[index],
      constraints: computeHomographyConstraints(homographies[index]),
      meanReprojectionError,
    };
  });
}

export function countCalibrationEquations(viewCount: number): number {
  return Math.max(0, viewCount) * 2;
}

function projectWorldPointWithRotation(
  point: CalibrationPoint3D,
  intrinsics: CalibrationIntrinsics,
  rotation: Matrix3,
  translation: Vec3
): ProjectionStep {
  const [xc, yc, zc] = multiplyMatrix3Vector3(rotation, [point.x, point.y, point.z]);
  const camera = {
    x: xc + translation[0],
    y: yc + translation[1],
    z: zc + translation[2],
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

function matrixToCalibrationExtrinsics(rotation: Matrix3, translation: Vec3): CalibrationExtrinsics {
  const roll = (Math.atan2(rotation[2][1], rotation[2][2]) * 180) / Math.PI;
  const pitch = (Math.atan2(-rotation[2][0], Math.hypot(rotation[2][1], rotation[2][2])) * 180) / Math.PI;
  const yaw = (Math.atan2(rotation[1][0], rotation[0][0]) * 180) / Math.PI;

  return {
    yaw,
    pitch,
    roll,
    tx: translation[0],
    ty: translation[1],
    tz: translation[2],
  };
}

function reprojectBoardCorners(
  boardCorners: CalibrationBoardCorner[],
  intrinsics: CalibrationIntrinsics,
  rotation: Matrix3,
  translation: Vec3,
  observedPixels: CalibrationPoint2D[]
): ProjectedBoardCorner[] {
  return boardCorners.map((corner, index) => {
    const projection = projectWorldPointWithRotation(corner.world, intrinsics, rotation, translation);
    const observed = observedPixels[index] ?? projection.pixel;
    const reprojectionError = Math.hypot(observed.x - projection.pixel.x, observed.y - projection.pixel.y);

    return {
      ...corner,
      projected: projection.pixel,
      rounded: {
        x: Math.round(projection.pixel.x),
        y: Math.round(projection.pixel.y),
      },
      subPixel: observed,
      visible: projection.visible,
      reprojectionError,
    };
  });
}

/**
 * 用 DLT 从平面标定板角点估计单应矩阵 H。
 * objectPoints 的 Z 坐标被忽略（假设标定板在 Z=0 平面）。
 * 默认启用 Hartley 归一化以提高数值稳定性。
 */
export function estimateHomographyDLT(
  objectPoints: CalibrationPoint3D[],
  imagePoints: CalibrationPoint2D[],
  normalize = true
): number[][] {
  if (objectPoints.length !== imagePoints.length || objectPoints.length < 4) {
    throw new Error('estimateHomographyDLT: need at least 4 matched point pairs');
  }

  const n = objectPoints.length;
  const objectPlane = objectPoints.map(p => ({ x: p.x, y: p.y }));
  const imagePlane = imagePoints.map(p => ({ x: p.x, y: p.y }));

  let Tobj = identity3();
  let Timg = identity3();
  let objNorm = objectPlane;
  let imgNorm = imagePlane;

  if (normalize) {
    const objResult = normalizePoints2D(objectPlane);
    const imgResult = normalizePoints2D(imagePlane);
    Tobj = objResult.T as Matrix3;
    Timg = imgResult.T as Matrix3;
    objNorm = objResult.normalized;
    imgNorm = imgResult.normalized;
  }

  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const X = objNorm[i].x;
    const Y = objNorm[i].y;
    const u = imgNorm[i].x;
    const v = imgNorm[i].y;
    A.push([-X, -Y, -1, 0, 0, 0, u * X, u * Y, u]);
    A.push([0, 0, 0, -X, -Y, -1, v * X, v * Y, v]);
  }

  const h = solveHomogeneous(A);
  const Hnorm: Matrix3 = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]],
  ];

  // 反归一化：H = Timg^{-1} * Hnorm * Tobj
  const TimgInv = invertMatrix3(Timg);
  const H = multiplyMatrix3(multiplyMatrix3(TimgInv, Hnorm), Tobj);
  return H;
}

/**
 * 从多张标定图像的单应矩阵 H 恢复相机内参矩阵 K。
 * 每张 H 提供 v12^T b = 0 和 (v11 - v22)^T b = 0 两条约束。
 */
export function estimateIntrinsicsFromHomographies(homographies: number[][][]): CalibrationIntrinsics {
  if (homographies.length < 2) {
    throw new Error('estimateIntrinsicsFromHomographies: need at least 2 homographies');
  }

  const V: number[][] = [];
  for (const H of homographies) {
    const v12 = computeVijVector(H, 0, 1);
    const v11 = computeVijVector(H, 0, 0);
    const v22 = computeVijVector(H, 1, 1);
    V.push(v12);
    V.push(v11.map((value, index) => value - v22[index]));
  }

  const b = solveHomogeneous(V);
  const B = [
    [b[0], b[1], b[3]],
    [b[1], b[2], b[4]],
    [b[3], b[4], b[5]],
  ];

  const B11 = B[0][0];
  const B12 = B[0][1];
  const B22 = B[1][1];
  const B13 = B[0][2];
  const B23 = B[1][2];
  const B33 = B[2][2];

  const v0 = (B12 * B13 - B11 * B23) / (B11 * B22 - B12 * B12);
  const lambda = B33 - (B13 * B13 + v0 * (B12 * B13 - B11 * B23)) / B11;
  const alpha = Math.sqrt(lambda / B11);
  const beta = Math.sqrt((lambda * B11) / (B11 * B22 - B12 * B12));
  const gamma = -(B12 * alpha * alpha * beta) / lambda;
  const u0 = (gamma * v0) / alpha - (B13 * alpha * alpha) / lambda;

  return {
    alpha,
    beta,
    gamma,
    u0,
    v0,
  };
}

/**
 * 已知内参 K 和单应矩阵 H，恢复该图的外参 R 和 t。
 * 返回的旋转矩阵已经过正交化投影到 SO(3)。
 */
export function estimateExtrinsicsFromHomography(
  homography: number[][],
  intrinsics: CalibrationIntrinsics
): { rotation: Matrix3; translation: Vec3 } {
  const K = createIntrinsicMatrix(intrinsics);
  const Kinv = invertMatrix3(K);

  const h1: Vec3 = [homography[0][0], homography[1][0], homography[2][0]];
  const h2: Vec3 = [homography[0][1], homography[1][1], homography[2][1]];
  const h3: Vec3 = [homography[0][2], homography[1][2], homography[2][2]];

  const KinvH1 = multiplyMatrix3Vector3(Kinv, h1);
  const KinvH2 = multiplyMatrix3Vector3(Kinv, h2);
  const KinvH3 = multiplyMatrix3Vector3(Kinv, h3);

  const lambda = 1 / Math.hypot(...KinvH1);

  const r1: Vec3 = [KinvH1[0] * lambda, KinvH1[1] * lambda, KinvH1[2] * lambda];
  const r2: Vec3 = [KinvH2[0] * lambda, KinvH2[1] * lambda, KinvH2[2] * lambda];
  const r3: Vec3 = crossProduct3(r1, r2);
  const t: Vec3 = [KinvH3[0] * lambda, KinvH3[1] * lambda, KinvH3[2] * lambda];

  // r1, r2, r3 是 R 的列向量，需要按列组装成旋转矩阵
  const RfromCols: Matrix3 = [
    [r1[0], r2[0], r3[0]],
    [r1[1], r2[1], r3[1]],
    [r1[2], r2[2], r3[2]],
  ];
  const rotation = orthogonalizeRotation(RfromCols) as Matrix3;

  return {
    rotation,
    translation: t,
  };
}

/**
 * 从多视图标定数据估计相机内参和每视图外参。
 * objectPoints 为同一组棋盘角点的世界坐标（Z=0），imagePoints 为对应像素坐标。
 */
export function calibrateCameraFromViews(
  views: { objectPoints: CalibrationPoint3D[]; imagePoints: CalibrationPoint2D[] }[]
): {
  intrinsics: CalibrationIntrinsics;
  poses: { rotation: Matrix3; translation: Vec3 }[];
} {
  if (views.length < 2) {
    throw new Error('calibrateCameraFromViews: need at least 2 views');
  }

  const homographies = views.map(view => estimateHomographyDLT(view.objectPoints, view.imagePoints, true));
  const intrinsics = estimateIntrinsicsFromHomographies(homographies);
  const poses = homographies.map(H => estimateExtrinsicsFromHomography(H, intrinsics));

  return { intrinsics, poses };
}

export function formatMatrixValue(value: number, digits: number = 3): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.abs(value) < 1e-9 ? 0 : value;
  return rounded.toFixed(digits);
}
