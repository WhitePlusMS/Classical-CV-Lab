import { GrayscaleImage } from '../algorithms/types';

export function create2DArray(height: number, width: number, fill: number = 0): number[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => fill)
  );
}

export function normalizeImage(image: GrayscaleImage): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      min = Math.min(min, image[y][x]);
      max = Math.max(max, image[y][x]);
    }
  }

  const range = max - min || 1;
  const result = create2DArray(height, width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = (image[y][x] - min) / range;
    }
  }

  return result;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function imageToCanvas(image: GrayscaleImage, canvas: HTMLCanvasElement): void {
  const height = image.length;
  const width = image[0]?.length || 0;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = Math.round(clamp(image[y][x], 0, 1) * 255);
      const index = (y * width + x) * 4;
      imageData.data[index] = value;
      imageData.data[index + 1] = value;
      imageData.data[index + 2] = value;
      imageData.data[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
