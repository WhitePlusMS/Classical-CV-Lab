import { GrayscaleImage, StructElement } from './types';
import { create2DArray } from '../utils/imageProcessing';

/** 创建结构元素矩阵 (boolean[][])，支持矩形、十字、椭圆三种形状 */
export function createStructElement(
  shape: StructElement['shape'],
  size: number
): boolean[][] {
  const se: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );
  const center = Math.floor(size / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);

      switch (shape) {
        case 'rectangle':
          // 矩形结构元素：所有位置均为激活
          se[y][x] = true;
          break;
        case 'cross':
          // 十字结构元素：只有中心行和中心列激活
          se[y][x] = x === center || y === center;
          break;
        case 'ellipse':
          // 椭圆结构元素：用中心半径近似 OpenCV 的 MORPH_ELLIPSE 形状
          se[y][x] = (dx * dx) / (center * center)
                   + (dy * dy) / (center * center) <= 1;
          break;
      }
    }
  }

  return se;
}

/** 获取结构元素反射（关于原点对称）: B_hat = {w | w = -b, b ∈ B} */
export function reflectStructElement(se: boolean[][]): boolean[][] {
  const size = se.length;
  const reflected: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      reflected[size - 1 - y][size - 1 - x] = se[y][x];
    }
  }

  return reflected;
}

/** 集合判定：检查结构元素平移到位置后，是否完全包含在目标集合内（腐蚀条件）
 *  A Θ B = {z | (B)_z ⊆ A}
 *  即结构元素的所有激活位置对应的像素值都为 1（前景）
 */
export function checkErosionCondition(
  localRegion: number[][],
  structElement: boolean[][]
): boolean {
  const size = structElement.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (structElement[y][x] && localRegion[y][x] === 0) {
        return false; // 结构元素激活位置有背景像素，不满足腐蚀条件
      }
    }
  }
  return true;
}

/** 集合判定：检查结构元素反射平移后，是否与目标集合有交集（膨胀条件）
 *  A ⊕ B = {z | (B_hat)_z ∩ A ≠ ∅}
 *  即结构元素反射后，至少有一个激活位置与前景像素重合
 */
export function checkDilationCondition(
  localRegion: number[][],
  structElement: boolean[][]
): boolean {
  const reflected = reflectStructElement(structElement);
  const size = structElement.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (reflected[y][x] && localRegion[y][x] === 1) {
        return true; // 有交集，满足膨胀条件
      }
    }
  }
  return false;
}

/** 腐蚀操作：结构元素激活位置取最小值，越界位置按背景 0 处理 */
export function erode(
  image: GrayscaleImage,
  structElement: StructElement
): GrayscaleImage {
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

          const pixelVal =
            px >= 0 && px < width && py >= 0 && py < height
              ? image[py][px]
              : 0;
          minVal = Math.min(minVal, pixelVal);
        }
      }

      result[y][x] = minVal;
    }
  }

  return result;
}

/** 膨胀操作：结构元素激活位置取最大值，越界位置按背景 0 处理 */
export function dilate(
  image: GrayscaleImage,
  structElement: StructElement
): GrayscaleImage {
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

          const pixelVal =
            px >= 0 && px < width && py >= 0 && py < height
              ? image[py][px]
              : 0;
          maxVal = Math.max(maxVal, pixelVal);
        }
      }

      result[y][x] = maxVal;
    }
  }

  return result;
}

/** 开操作：先腐蚀后膨胀 A ○ B = (A Θ B) ⊕ B */
export function open(
  image: GrayscaleImage,
  structElement: StructElement
): GrayscaleImage {
  const eroded = erode(image, structElement);
  return dilate(eroded, structElement);
}

/** 闭操作：先膨胀后腐蚀 A • B = (A ⊕ B) Θ B */
export function close(
  image: GrayscaleImage,
  structElement: StructElement
): GrayscaleImage {
  const dilated = dilate(image, structElement);
  return erode(dilated, structElement);
}

/** 形态学步骤记录 */
export interface MorphologyStep {
  /** 当前阶段的操作类型 */
  operation: 'erode' | 'dilate';
  /** 复合操作（开/闭）的阶段标记 */
  phase: 'first' | 'second';
  /** 当前像素坐标 */
  x: number;
  y: number;
  /** 结构元素覆盖的输入邻域 */
  inputRegion: number[][];
  /** 结构元素矩阵 */
  structElement: boolean[][];
  /** 输出值 */
  outputValue: number;
  /** 结构元素覆盖区域内是否有至少一个前景像素（1） */
  hasForeground: boolean;
  /** 结构元素反射平移后与目标集合的交集判断 */
  hasIntersection: boolean;
}

/** 生成形态学操作的分步演示数据 */
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

  // 检查经过结构元素反射后，是否与前景有交集
  const computeHasIntersection = (
    region: number[][],
    structElem: boolean[][]
  ): boolean => {
    const reflected = reflectStructElement(structElem);
    const sz = structElem.length;
    for (let sy = 0; sy < sz; sy++) {
      for (let sx = 0; sx < sz; sx++) {
        if (reflected[sy][sx] && region[sy][sx] === 1) {
          return true;
        }
      }
    }
    return false;
  };

  if (operation === 'open' || operation === 'close') {
    const firstOp = operation === 'open' ? 'erode' : 'dilate';

    // 第一阶段步
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inputRegion: number[][] = [];
        let value = firstOp === 'erode' ? 1 : 0;
        let hasForeground = false;

        for (let sy = 0; sy < seSize; sy++) {
          const row: number[] = [];
          for (let sx = 0; sx < seSize; sx++) {
            const px = x + sx - center;
            const py = y + sy - center;

            const pixelVal =
              px >= 0 && px < width && py >= 0 && py < height
                ? image[py][px]
                : 0;
            row.push(pixelVal);

            if (!se[sy][sx]) continue;

            if (pixelVal === 1) hasForeground = true;
            if (firstOp === 'erode') {
              value = Math.min(value, pixelVal);
            } else {
              value = Math.max(value, pixelVal);
            }
          }
          inputRegion.push(row);
        }

        yield {
          operation: firstOp,
          phase: 'first',
          x,
          y,
          inputRegion,
          structElement: se,
          outputValue: value,
          hasForeground,
          hasIntersection: computeHasIntersection(inputRegion, se),
        };
      }
    }

    // 计算第一阶段输出图像
    const workingImage =
      firstOp === 'erode'
        ? erode(image, structElement)
        : dilate(image, structElement);

    const secondOp = operation === 'open' ? 'dilate' : 'erode';

    // 第二阶段步：输入区域来自第一阶段输出图像
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inputRegion: number[][] = [];
        let value = secondOp === 'dilate' ? 0 : 1;
        let hasForeground = false;

        for (let sy = 0; sy < seSize; sy++) {
          const row: number[] = [];
          for (let sx = 0; sx < seSize; sx++) {
            const px = x + sx - center;
            const py = y + sy - center;

            const pixelVal =
              px >= 0 && px < width && py >= 0 && py < height
                ? workingImage[py][px]
                : 0;
            row.push(pixelVal);

            if (!se[sy][sx]) continue;

            if (pixelVal === 1) hasForeground = true;
            if (secondOp === 'dilate') {
              value = Math.max(value, pixelVal);
            } else {
              value = Math.min(value, pixelVal);
            }
          }
          inputRegion.push(row);
        }

        yield {
          operation: secondOp,
          phase: 'second',
          x,
          y,
          inputRegion,
          structElement: se,
          outputValue: value,
          hasForeground,
          hasIntersection: computeHasIntersection(inputRegion, se),
        };
      }
    }
  } else {
    // 单一操作（腐蚀或膨胀）
    const singleOp = operation as 'erode' | 'dilate';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inputRegion: number[][] = [];
        let value = singleOp === 'erode' ? 1 : 0;
        let hasForeground = false;

        for (let sy = 0; sy < seSize; sy++) {
          const row: number[] = [];
          for (let sx = 0; sx < seSize; sx++) {
            const px = x + sx - center;
            const py = y + sy - center;

            const pixelVal =
              px >= 0 && px < width && py >= 0 && py < height
                ? image[py][px]
                : 0;
            row.push(pixelVal);

            if (!se[sy][sx]) continue;

            if (pixelVal === 1) hasForeground = true;
            if (singleOp === 'erode') {
              value = Math.min(value, pixelVal);
            } else {
              value = Math.max(value, pixelVal);
            }
          }
          inputRegion.push(row);
        }

        yield {
          operation: singleOp,
          phase: 'first',
          x,
          y,
          inputRegion,
          structElement: se,
          outputValue: value,
          hasForeground,
          hasIntersection: computeHasIntersection(inputRegion, se),
        };
      }
    }
  }
}
