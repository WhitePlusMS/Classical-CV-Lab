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

/** 将 RGB 图像渲染到 Canvas，显示为彩色 */
export function imageRgbToCanvas(rgb: number[][][], canvas: HTMLCanvasElement): void {
  const height = rgb.length;
  const width = rgb[0]?.length || 0;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgb[y][x];
      const index = (y * width + x) * 4;
      imageData.data[index]     = Math.round(clamp(r, 0, 1) * 255);
      imageData.data[index + 1] = Math.round(clamp(g, 0, 1) * 255);
      imageData.data[index + 2] = Math.round(clamp(b, 0, 1) * 255);
      imageData.data[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function resizeRgbImage(rgb: number[][][], maxSize: number): number[][][] {
  const height = rgb.length;
  const width = rgb[0]?.length || 0;
  if (!height || !width || Math.max(height, width) <= maxSize) return rgb;

  const scale = maxSize / Math.max(height, width);
  const resizedHeight = Math.max(1, Math.round(height * scale));
  const resizedWidth = Math.max(1, Math.round(width * scale));

  return Array.from({ length: resizedHeight }, (_, y) => {
    const sourceY = Math.min(height - 1, Math.floor(y / scale));
    return Array.from({ length: resizedWidth }, (_, x) => {
      const sourceX = Math.min(width - 1, Math.floor(x / scale));
      const [r, g, b] = rgb[sourceY][sourceX];
      return [r, g, b];
    });
  });
}

export async function loadImageAsRgb(src: string): Promise<number[][][]> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;

      if (!width || !height) {
        reject(new Error(`无法读取图像尺寸: ${src}`));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height).data;
      const rgbImage = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => [0, 0, 0])
      );

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          rgbImage[y][x] = [
            imageData[index] / 255,
            imageData[index + 1] / 255,
            imageData[index + 2] / 255,
          ];
        }
      }

      resolve(rgbImage);
    };

    image.onerror = () => reject(new Error(`图像加载失败: ${src}`));
    image.src = src;
  });
}

export async function loadImageAsGrayscale(src: string): Promise<GrayscaleImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;

      if (!width || !height) {
        reject(new Error(`无法读取图像尺寸: ${src}`));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height).data;
      const grayscale = create2DArray(height, width, 0);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const r = imageData[index] / 255;
          const g = imageData[index + 1] / 255;
          const b = imageData[index + 2] / 255;
          grayscale[y][x] = clamp(0.299 * r + 0.587 * g + 0.114 * b, 0, 1);
        }
      }

      resolve(grayscale);
    };

    image.onerror = () => reject(new Error(`图像加载失败: ${src}`));
    image.src = src;
  });
}
