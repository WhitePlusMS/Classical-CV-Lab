import { GrayscaleImage, StructElement } from './types';
import { create2DArray } from '../utils/imageProcessing';

function createStructElement(shape: StructElement['shape'], size: number): boolean[][] {
  const se: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );
  const center = Math.floor(size / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);

      switch (shape) {
        case 'square':
          se[y][x] = true;
          break;
        case 'cross':
          se[y][x] = x === center || y === center;
          break;
        case 'diamond':
          se[y][x] = dx + dy <= center;
          break;
      }
    }
  }

  return se;
}

export function erode(image: GrayscaleImage, structElement: StructElement): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const se = createStructElement(structElement.shape, structElement.size);
  const seSize = structElement.size;
  const center = Math.floor(seSize / 2);

  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 1;

      for (let sy = 0; sy < seSize; sy++) {
        for (let sx = 0; sx < seSize; sx++) {
          if (!se[sy][sx]) continue;

          const px = x + sx - center;
          const py = y + sy - center;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            minVal = Math.min(minVal, image[py][px]);
          }
        }
      }

      result[y][x] = minVal;
    }
  }

  return result;
}

export function dilate(image: GrayscaleImage, structElement: StructElement): GrayscaleImage {
  const height = image.length;
  const width = image[0]?.length || 0;
  const se = createStructElement(structElement.shape, structElement.size);
  const seSize = structElement.size;
  const center = Math.floor(seSize / 2);

  const result = create2DArray(height, width, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;

      for (let sy = 0; sy < seSize; sy++) {
        for (let sx = 0; sx < seSize; sx++) {
          if (!se[sy][sx]) continue;

          const px = x + sx - center;
          const py = y + sy - center;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            maxVal = Math.max(maxVal, image[py][px]);
          }
        }
      }

      result[y][x] = maxVal;
    }
  }

  return result;
}

export function open(image: GrayscaleImage, structElement: StructElement): GrayscaleImage {
  const eroded = erode(image, structElement);
  return dilate(eroded, structElement);
}

export function close(image: GrayscaleImage, structElement: StructElement): GrayscaleImage {
  const dilated = dilate(image, structElement);
  return erode(dilated, structElement);
}

export interface MorphologyStep {
  operation: 'erode' | 'dilate';
  x: number;
  y: number;
  inputRegion: number[][];
  structElement: boolean[][];
  outputValue: number;
}

export function* morphologySteps(
  image: GrayscaleImage,
  structElement: StructElement,
  operation: 'erode' | 'dilate' | 'open' | 'close'
): Generator<MorphologyStep> {
  if (!image || image.length === 0 || !image[0]) return;
  const se = createStructElement(structElement.shape, structElement.size);
  const seSize = structElement.size;
  const center = Math.floor(seSize / 2);

  const height = image.length;
  const width = image[0].length;

  let workingImage = image;

  if (operation === 'open' || operation === 'close') {
    const firstOp = operation === 'open' ? 'erode' : 'dilate';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inputRegion: number[][] = [];
        let value = firstOp === 'erode' ? 1 : 0;

        for (let sy = 0; sy < seSize; sy++) {
          const row: number[] = [];
          for (let sx = 0; sx < seSize; sx++) {
            const px = x + sx - center;
            const py = y + sy - center;

            if (px >= 0 && px < width && py >= 0 && py < height) {
              row.push(image[py][px]);
              if (firstOp === 'erode') {
                value = Math.min(value, image[py][px]);
              } else {
                value = Math.max(value, image[py][px]);
              }
            } else {
              row.push(0);
            }
          }
          inputRegion.push(row);
        }

        yield {
          operation: firstOp,
          x,
          y,
          inputRegion,
          structElement: se,
          outputValue: value,
        };
      }
    }

    workingImage = firstOp === 'erode' ? erode(image, structElement) : dilate(image, structElement);
  }

  if (operation === 'open' || operation === 'close') {
    const secondOp = operation === 'open' ? 'dilate' : 'erode';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inputRegion: number[][] = [];
        let value = secondOp === 'dilate' ? 0 : 1;

        for (let sy = 0; sy < seSize; sy++) {
          const row: number[] = [];
          for (let sx = 0; sx < seSize; sx++) {
            const px = x + sx - center;
            const py = y + sy - center;

            if (px >= 0 && px < width && py >= 0 && py < height) {
              row.push(workingImage[py][px]);
              if (secondOp === 'dilate') {
                value = Math.max(value, workingImage[py][px]);
              } else {
                value = Math.min(value, workingImage[py][px]);
              }
            } else {
              row.push(0);
            }
          }
          inputRegion.push(row);
        }

        yield {
          operation: secondOp,
          x,
          y,
          inputRegion,
          structElement: se,
          outputValue: value,
        };
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inputRegion: number[][] = [];
        let value = operation === 'erode' ? 1 : 0;

        for (let sy = 0; sy < seSize; sy++) {
          const row: number[] = [];
          for (let sx = 0; sx < seSize; sx++) {
            const px = x + sx - center;
            const py = y + sy - center;

            if (px >= 0 && px < width && py >= 0 && py < height) {
              row.push(image[py][px]);
              if (operation === 'erode') {
                value = Math.min(value, image[py][px]);
              } else {
                value = Math.max(value, image[py][px]);
              }
            } else {
              row.push(operation === 'erode' ? 0 : 0);
              if (operation === 'erode') value = 0;
            }
          }
          inputRegion.push(row);
        }

        yield {
          operation,
          x,
          y,
          inputRegion,
          structElement: se,
          outputValue: value,
        };
      }
    }
  }
}
