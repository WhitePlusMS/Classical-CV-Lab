import { GrayscaleImage } from '../algorithms/types';
import { create2DArray } from './imageProcessing';

const TEACHING_IMAGE_SIZE = 12;

function createTeachingCheckerboardImage(): GrayscaleImage {
  const image = create2DArray(TEACHING_IMAGE_SIZE, TEACHING_IMAGE_SIZE, 0);

  for (let y = 0; y < TEACHING_IMAGE_SIZE; y++) {
    for (let x = 0; x < TEACHING_IMAGE_SIZE; x++) {
      const blockX = Math.floor(x / 2) % 2;
      const blockY = Math.floor(y / 2) % 2;
      image[y][x] = (blockX + blockY) % 2 === 0 ? 0.15 : 0.85;
    }
  }

  return image;
}

function createTeachingEdgeImage(): GrayscaleImage {
  const image = create2DArray(TEACHING_IMAGE_SIZE, TEACHING_IMAGE_SIZE, 0);

  for (let y = 0; y < TEACHING_IMAGE_SIZE; y++) {
    for (let x = 0; x < TEACHING_IMAGE_SIZE; x++) {
      if (x < 4) {
        image[y][x] = 0.1;
      } else if (x < 8) {
        image[y][x] = 0.45;
      } else {
        image[y][x] = 0.9;
      }
    }
  }

  return image;
}

function createTeachingSpotImage(): GrayscaleImage {
  const image = create2DArray(TEACHING_IMAGE_SIZE, TEACHING_IMAGE_SIZE, 0.12);

  for (let y = 0; y < TEACHING_IMAGE_SIZE; y++) {
    for (let x = 0; x < TEACHING_IMAGE_SIZE; x++) {
      const isCenterBlock = x >= 4 && x <= 7 && y >= 4 && y <= 7;
      const isCrossArm =
        (x === 5 || x === 6 || y === 5 || y === 6) &&
        x >= 2 &&
        x <= 9 &&
        y >= 2 &&
        y <= 9;

      if (isCenterBlock) {
        image[y][x] = 1;
      } else if (isCrossArm) {
        image[y][x] = 0.58;
      }
    }
  }

  return image;
}

export type ConvolutionTeachingImageType = 'checkerboard12' | 'edge12' | 'spot12';

export const convolutionTeachingImages: Record<
  ConvolutionTeachingImageType,
  { name: string; image: GrayscaleImage }
> = {
  checkerboard12: {
    name: '棋盘格 12×12',
    image: createTeachingCheckerboardImage(),
  },
  edge12: {
    name: '阶跃边缘 12×12',
    image: createTeachingEdgeImage(),
  },
  spot12: {
    name: '亮斑十字 12×12',
    image: createTeachingSpotImage(),
  },
};
