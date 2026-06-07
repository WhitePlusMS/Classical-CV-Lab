export const PRESET_SMOOTHING_SIZES = [3, 5, 7, 9, 11] as const;
export const PRESET_DERIVATIVE_SIZES = [3, 5, 7] as const;

export function buildPascalRow(order: number): number[] {
  const row = [1];
  for (let i = 0; i < order; i++) {
    row.unshift(0);
    for (let j = 0; j < row.length - 1; j++) {
      row[j] = row[j] + row[j + 1];
    }
  }
  return row;
}

export function convolve1D(signal: number[], kernel: number[]): number[] {
  const result = Array.from({ length: signal.length + kernel.length - 1 }, () => 0);
  for (let i = 0; i < signal.length; i++) {
    for (let j = 0; j < kernel.length; j++) {
      result[i + j] += signal[i] * kernel[j];
    }
  }
  return result;
}

export function outerProduct(row: number[], column: number[]): number[][] {
  return column.map(columnValue => row.map(rowValue => rowValue * columnValue));
}

export function sumMatrices(a: number[][], b: number[][]): number[][] {
  return a.map((row, y) => row.map((value, x) => value + b[y][x]));
}

export function createIdentityKernelValues(size: number): number[][] {
  const kernel = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  kernel[Math.floor(size / 2)][Math.floor(size / 2)] = 1;
  return kernel;
}

export function createBoxKernelValues(size: number): number[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 1));
}

export function createGaussianKernelValues(size: number): number[][] {
  const row = buildPascalRow(size - 1);
  return outerProduct(row, row);
}

export function createSobelDerivativeRow(size: number): number[] {
  if (size === 3) return [-1, 0, 1];
  return convolve1D(buildPascalRow(size - 3), [-1, 0, 1]);
}

export function createSobelXKernelValues(size: number): number[][] {
  const smoothingRow = buildPascalRow(size - 1);
  const derivativeRow = createSobelDerivativeRow(size);
  return outerProduct(derivativeRow, smoothingRow);
}

export function createSobelYKernelValues(size: number): number[][] {
  const smoothingRow = buildPascalRow(size - 1);
  const derivativeRow = createSobelDerivativeRow(size);
  return outerProduct(smoothingRow, derivativeRow);
}

export function createLaplacianKernelValues(size: number): number[][] {
  if (size === 3) {
    return [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0],
    ];
  }

  const smoothingRow = buildPascalRow(size - 1);
  const secondDerivativeRow = convolve1D(buildPascalRow(size - 3), [1, -2, 1]);
  return sumMatrices(
    outerProduct(secondDerivativeRow, smoothingRow),
    outerProduct(smoothingRow, secondDerivativeRow)
  );
}

export function findNearestSupportedSize(targetSize: number, supportedSizes: number[]): number {
  return supportedSizes.reduce((best, size) => {
    const currentDistance = Math.abs(size - targetSize);
    const bestDistance = Math.abs(best - targetSize);
    if (currentDistance < bestDistance) return size;
    if (currentDistance === bestDistance && size > best) return size;
    return best;
  }, supportedSizes[0]);
}

export function formatKernelValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, '');
  if (Math.abs(value) >= 1) return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatPixelValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
