export type GrayscaleImage = number[][];

export interface Kernel {
  values: number[][];
  size: number;
  anchor: { x: number; y: number };
}

export interface StructElement {
  shape: 'rectangle' | 'cross' | 'ellipse';
  size: number;
}

export interface ThresholdResult {
  image: GrayscaleImage;
  threshold: number;
}

export interface Histogram {
  bins: number[];
  totalPixels: number;
}

export interface StepResult {
  x: number;
  y: number;
  inputRegion: number[][];
  kernel: number[][];
  displayKernel: number[][];
  outputValue: number;
  formula: string;
}
