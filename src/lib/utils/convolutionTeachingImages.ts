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

function createTeachingHorizontalEdgeImage(): GrayscaleImage {
  const image = create2DArray(TEACHING_IMAGE_SIZE, TEACHING_IMAGE_SIZE, 0);

  for (let y = 0; y < TEACHING_IMAGE_SIZE; y++) {
    for (let x = 0; x < TEACHING_IMAGE_SIZE; x++) {
      if (y < 4) {
        image[y][x] = 0.12;
      } else if (y < 8) {
        image[y][x] = 0.5;
      } else {
        image[y][x] = 0.88;
      }
    }
  }

  return image;
}

function createTeachingDiagonalEdgeImage(): GrayscaleImage {
  const image = create2DArray(TEACHING_IMAGE_SIZE, TEACHING_IMAGE_SIZE, 0);

  for (let y = 0; y < TEACHING_IMAGE_SIZE; y++) {
    for (let x = 0; x < TEACHING_IMAGE_SIZE; x++) {
      const offset = x - y;

      if (offset <= -2) {
        image[y][x] = 0.15;
      } else if (offset <= 2) {
        image[y][x] = 0.52;
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

function createTeachingFrameImage(): GrayscaleImage {
  const image = create2DArray(TEACHING_IMAGE_SIZE, TEACHING_IMAGE_SIZE, 0.14);

  for (let y = 0; y < TEACHING_IMAGE_SIZE; y++) {
    for (let x = 0; x < TEACHING_IMAGE_SIZE; x++) {
      const onOuterFrame = x === 2 || x === 9 || y === 2 || y === 9;
      const inFrameBounds = x >= 2 && x <= 9 && y >= 2 && y <= 9;
      const inInnerArea = x >= 4 && x <= 7 && y >= 4 && y <= 7;

      if (onOuterFrame && inFrameBounds) {
        image[y][x] = 0.95;
      } else if (inInnerArea) {
        image[y][x] = 0.38;
      }
    }
  }

  return image;
}

export type ConvolutionTeachingImageType =
  | 'checkerboard12'
  | 'edge12'
  | 'horizontalEdge12'
  | 'diagonalEdge12'
  | 'spot12'
  | 'frame12'
  | 'lenaOriginal';

export interface ConvolutionTeachingImageConfig {
  name: string;
  image?: GrayscaleImage;
  assetPath?: string;
  regionMarker: 'frame' | 'dot';
  showGrid: boolean;
}

export const convolutionTeachingImages: Record<
  ConvolutionTeachingImageType,
  ConvolutionTeachingImageConfig
> = {
  checkerboard12: {
    name: '棋盘格 12×12',
    image: createTeachingCheckerboardImage(),
    regionMarker: 'frame',
    showGrid: true,
  },
  edge12: {
    name: '阶跃边缘 12×12',
    image: createTeachingEdgeImage(),
    regionMarker: 'frame',
    showGrid: true,
  },
  horizontalEdge12: {
    name: '水平边缘 12×12',
    image: createTeachingHorizontalEdgeImage(),
    regionMarker: 'frame',
    showGrid: true,
  },
  diagonalEdge12: {
    name: '斜向边缘 12×12',
    image: createTeachingDiagonalEdgeImage(),
    regionMarker: 'frame',
    showGrid: true,
  },
  spot12: {
    name: '亮斑十字 12×12',
    image: createTeachingSpotImage(),
    regionMarker: 'frame',
    showGrid: true,
  },
  frame12: {
    name: '方框轮廓 12×12',
    image: createTeachingFrameImage(),
    regionMarker: 'frame',
    showGrid: true,
  },
  lenaOriginal: {
    name: 'Lena 原图',
    assetPath: '/assets/lena-original.jpg',
    regionMarker: 'dot',
    showGrid: false,
  },
};
