import { create2DArray } from '../utils/imageProcessing';

/**
 * 小型稠密矩阵的数值工具库。
 *
 * 本库专为教学场景设计，矩阵规模通常 ≤ 50×9，优先可读性和正确性，
 * 不追求工业级大规模性能。所有算法均用纯 TypeScript 实现，零外部依赖。
 */

export interface SVDResult {
  U: number[][];
  S: number[];
  Vt: number[][];
}

export interface NormalizedPoints2D {
  normalized: { x: number; y: number }[];
  T: number[][];
}

function zeros(rows: number, cols: number): number[][] {
  return create2DArray(rows, cols, 0);
}

function identity(n: number): number[][] {
  const I = zeros(n, n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  const result = zeros(cols, rows);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }
  return result;
}

function multiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0]?.length ?? 0;
  const rowsB = B.length;
  const colsB = B[0]?.length ?? 0;
  if (colsA !== rowsB) {
    throw new Error(`Matrix dimensions mismatch: ${rowsA}x${colsA} * ${rowsB}x${colsB}`);
  }
  const result = zeros(rowsA, colsB);
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function multiplyAtB(A: number[][], B: number[][]): number[][] {
  return multiply(transpose(A), B);
}

function clone(A: number[][]): number[][] {
  return A.map(row => [...row]);
}

/**
 * 使用 Jacobi 旋转对对角矩阵做特征值分解。
 * 输入 A 必须是对称矩阵。返回 V 和 D，满足 A = V * D * V^T。
 * V 的每一列是一个特征向量，D 是对角特征值矩阵。
 */
function jacobiEigenDecomposition(A: number[][]): { V: number[][]; D: number[][] } {
  const n = A.length;
  const V = identity(n);
  const D = clone(A);

  const maxIterations = 100;
  const eps = 1e-12;

  for (let iter = 0; iter < maxIterations; iter++) {
    // 找到最大非对角元素
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const val = Math.abs(D[i][j]);
        if (val > maxVal) {
          maxVal = val;
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < eps) break;

    const Dpp = D[p][p];
    const Dqq = D[q][q];
    const Dpq = D[p][q];

    const phi = 0.5 * Math.atan2(2 * Dpq, Dqq - Dpp);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    // 更新 D = J^T D J
    const newDpp = c * c * Dpp - 2 * s * c * Dpq + s * s * Dqq;
    const newDqq = s * s * Dpp + 2 * s * c * Dpq + c * c * Dqq;
    const newDpq = (c * c - s * s) * Dpq + s * c * (Dpp - Dqq);

    D[p][p] = newDpp;
    D[q][q] = newDqq;
    D[p][q] = newDpq;
    D[q][p] = newDpq;

    for (let i = 0; i < n; i++) {
      if (i === p || i === q) continue;
      const Dip = D[i][p];
      const Diq = D[i][q];
      D[i][p] = c * Dip - s * Diq;
      D[p][i] = D[i][p];
      D[i][q] = s * Dip + c * Diq;
      D[q][i] = D[i][q];
    }

    // 更新 V = V J
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p];
      const Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }

  return { V, D };
}

/**
 * 对矩阵 A 做简化 SVD 分解：A ≈ U S Vt。
 *
 * 实现方式：计算 A^T A 的 n×n 特征值分解，得到奇异值和右奇异向量；
 * 再计算左奇异向量 U = A V / sigma（仅对非零奇异值）。
 *
 * 返回的维度：U 为 m×n，S 为长度 n 的数组，Vt 为 n×n。
 * 当 m < n 时，最后的 (n - m) 个奇异值理论为 0，对应 U 列为 0。
 */
export function svd(A: number[][]): SVDResult {
  if (A.length === 0 || A[0]?.length === 0) {
    throw new Error('SVD input matrix must not be empty');
  }

  const m = A.length;
  const n = A[0].length;

  const AtA = multiplyAtB(A, A);
  const { V, D } = jacobiEigenDecomposition(AtA);

  // 提取特征值并排序（降序）
  const eigenPairs: { value: number; index: number }[] = [];
  for (let i = 0; i < n; i++) {
    eigenPairs.push({ value: D[i][i], index: i });
  }
  eigenPairs.sort((a, b) => b.value - a.value);

  const S: number[] = eigenPairs.map(pair => Math.sqrt(Math.max(0, pair.value)));
  const Vsorted = zeros(n, n);
  for (let j = 0; j < n; j++) {
    const srcCol = eigenPairs[j].index;
    for (let i = 0; i < n; i++) {
      Vsorted[i][j] = V[i][srcCol];
    }
  }

  // 计算 U = A V / sigma（仅非零奇异值）
  const U = zeros(m, n);
  for (let j = 0; j < n; j++) {
    const sigma = S[j];
    if (sigma < 1e-12) continue;
    for (let i = 0; i < m; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * Vsorted[k][j];
      }
      U[i][j] = sum / sigma;
    }
  }

  return { U, S, Vt: transpose(Vsorted) };
}

/**
 * 解齐次线性方程组 A x = 0，返回单位化解向量（‖x‖ = 1）。
 * 取 A 的最小奇异值对应的右奇异向量。
 */
export function solveHomogeneous(A: number[][]): number[] {
  const { Vt } = svd(A);
  const n = Vt.length;
  // Vt 的最后一行对应最小奇异值的右奇异向量
  return Vt[n - 1].slice();
}

/**
 * 解非齐次最小二乘问题 A x ≈ b，返回 x。
 * 使用 SVD：x = V diag(1/S) U^T b。
 */
export function solveLinearLeastSquares(A: number[][], b: number[]): number[] {
  const { U, S, Vt } = svd(A);
  const m = U.length;
  const n = Vt.length;

  // c = U^T b
  const c = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let sum = 0;
    for (let i = 0; i < m; i++) {
      sum += U[i][j] * b[i];
    }
    c[j] = sum;
  }

  // y[j] = c[j] / S[j]
  const y = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    y[j] = S[j] < 1e-12 ? 0 : c[j] / S[j];
  }

  // x = V y = Vt^T y
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += Vt[j][i] * y[j];
    }
    x[i] = sum;
  }

  return x;
}

/**
 * Hartley 归一化：把 2D 点集平移到原点并缩放到平均距离为 sqrt(2)。
 * 返回归一化后的点集和 3×3 相似变换矩阵 T。
 */
export function normalizePoints2D(points: { x: number; y: number }[]): NormalizedPoints2D {
  const n = points.length;
  if (n === 0) {
    throw new Error('normalizePoints2D: empty point set');
  }

  let meanX = 0;
  let meanY = 0;
  for (const p of points) {
    meanX += p.x;
    meanY += p.y;
  }
  meanX /= n;
  meanY /= n;

  let meanDistance = 0;
  for (const p of points) {
    meanDistance += Math.hypot(p.x - meanX, p.y - meanY);
  }
  meanDistance /= n;

  const scale = meanDistance < 1e-12 ? 1 : Math.sqrt(2) / meanDistance;

  const normalized = points.map(p => ({
    x: (p.x - meanX) * scale,
    y: (p.y - meanY) * scale,
  }));

  const T = [
    [scale, 0, -scale * meanX],
    [0, scale, -scale * meanY],
    [0, 0, 1],
  ];

  return { normalized, T };
}

/**
 * 3×3 矩阵求逆。假设矩阵可逆，不做退化检查。
 */
export function invertMatrix3(matrix: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) {
    throw new Error('invertMatrix3: singular matrix');
  }
  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

/**
 * 对 3×3 矩阵做 SVD 并返回正交化后的旋转矩阵。
 * 用于把近似旋转矩阵 R 投影到 SO(3)。
 */
export function orthogonalizeRotation(R: number[][]): number[][] {
  const { U, Vt } = svd(R);
  const Rortho = multiply(U, Vt);

  // 确保行列式为 +1
  const det =
    Rortho[0][0] * (Rortho[1][1] * Rortho[2][2] - Rortho[1][2] * Rortho[2][1]) -
    Rortho[0][1] * (Rortho[1][0] * Rortho[2][2] - Rortho[1][2] * Rortho[2][0]) +
    Rortho[0][2] * (Rortho[1][0] * Rortho[2][1] - Rortho[1][1] * Rortho[2][0]);

  if (det < 0) {
    Rortho[0][2] *= -1;
    Rortho[1][2] *= -1;
    Rortho[2][2] *= -1;
  }

  return Rortho;
}
