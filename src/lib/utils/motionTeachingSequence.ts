import { GrayscaleImage } from '../algorithms/types';
import { clamp, create2DArray } from './imageProcessing';

export interface MotionObjectBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface HumanMotionSequenceOptions {
  width?: number;
  height?: number;
  frameCount?: number;
  speed?: number;
  noiseStrength?: number;
  lightVariation?: number;
  dynamicBackgroundStrength?: number;
  objectValue?: number;
}

export interface HumanMotionSequence {
  width: number;
  height: number;
  frames: GrayscaleImage[];
  backgroundFrames: GrayscaleImage[];
  objectMasks: GrayscaleImage[];
  objectBoxes: MotionObjectBox[];
}

const DEFAULT_WIDTH = 96;
const DEFAULT_HEIGHT = 64;
const DEFAULT_FRAME_COUNT = 24;

function deterministicNoise(x: number, y: number, seed: number): number {
  const value = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed * 41.719) * 43758.5453;
  return value - Math.floor(value);
}

function createTeachingBackground(
  width: number,
  height: number,
  frameIndex: number,
  lightVariation: number,
  dynamicBackgroundStrength: number,
  noiseStrength: number
): GrayscaleImage {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const horizontal = 0.18 + 0.18 * (x / Math.max(1, width - 1));
      const vertical = 0.08 * (y / Math.max(1, height - 1));
      const light = lightVariation * Math.sin(frameIndex * 0.34);
      const dynamicWave =
        dynamicBackgroundStrength *
        Math.sin((x * 0.22) + (y * 0.11) + frameIndex * 0.55);
      const floorLine = y > height * 0.72 ? 0.05 : 0;
      const stripe = (Math.floor((x + frameIndex) / 12) % 2 === 0) ? 0.018 : 0;
      const noise = (deterministicNoise(x, y, frameIndex) - 0.5) * noiseStrength;

      return clamp(horizontal + vertical + light + dynamicWave + floorLine + stripe + noise, 0, 1);
    })
  );
}

function setPixel(image: GrayscaleImage, x: number, y: number, value: number): void {
  if (!image[y] || x < 0 || x >= image[y].length) return;
  image[y][x] = clamp(value, 0, 1);
}

function drawDisk(image: GrayscaleImage, centerX: number, centerY: number, radius: number, value: number): void {
  const minX = Math.floor(centerX - radius);
  const maxX = Math.ceil(centerX + radius);
  const minY = Math.floor(centerY - radius);
  const maxY = Math.ceil(centerY + radius);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(image, x, y, value);
      }
    }
  }
}

function drawEllipse(
  image: GrayscaleImage,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  value: number
): void {
  const minX = Math.floor(centerX - radiusX);
  const maxX = Math.ceil(centerX + radiusX);
  const minY = Math.floor(centerY - radiusY);
  const maxY = Math.ceil(centerY + radiusY);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = (x - centerX) / Math.max(1, radiusX);
      const dy = (y - centerY) / Math.max(1, radiusY);
      if (dx * dx + dy * dy <= 1) {
        setPixel(image, x, y, value);
      }
    }
  }
}

function drawThickLine(
  image: GrayscaleImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  value: number
): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    drawDisk(image, x, y, thickness, value);
  }
}

function drawHumanSilhouette(
  image: GrayscaleImage,
  mask: GrayscaleImage,
  centerX: number,
  baseY: number,
  scale: number,
  phase: number,
  value: number
): MotionObjectBox {
  const drawPart = (target: GrayscaleImage, partValue: number) => {
    const headY = baseY - 26 * scale;
    const shoulderY = baseY - 18 * scale;
    const hipY = baseY - 8 * scale;
    const armSwing = Math.sin(phase) * 4 * scale;
    const legSwing = Math.sin(phase + Math.PI) * 5 * scale;

    drawDisk(target, centerX, headY, 4.2 * scale, partValue);
    drawEllipse(target, centerX, shoulderY - 3 * scale, 5.2 * scale, 8.5 * scale, partValue);
    drawThickLine(target, centerX - 4 * scale, shoulderY, centerX - 10 * scale, hipY + armSwing, 1.8 * scale, partValue);
    drawThickLine(target, centerX + 4 * scale, shoulderY, centerX + 10 * scale, hipY - armSwing, 1.8 * scale, partValue);
    drawThickLine(target, centerX - 2.2 * scale, hipY, centerX - 8 * scale, baseY + legSwing, 2.2 * scale, partValue);
    drawThickLine(target, centerX + 2.2 * scale, hipY, centerX + 8 * scale, baseY - legSwing, 2.2 * scale, partValue);
  };

  drawPart(image, value);
  drawPart(mask, 1);

  const width = 24 * scale;
  const height = 32 * scale;
  return {
    x: Math.round(centerX - width / 2),
    y: Math.round(baseY - height),
    width: Math.round(width),
    height: Math.round(height),
    centerX: Math.round(centerX),
    centerY: Math.round(baseY - height / 2),
  };
}

export function createHumanMotionSequence(options: HumanMotionSequenceOptions = {}): HumanMotionSequence {
  const width = Math.max(48, Math.round(options.width ?? DEFAULT_WIDTH));
  const height = Math.max(32, Math.round(options.height ?? DEFAULT_HEIGHT));
  const frameCount = Math.max(3, Math.round(options.frameCount ?? DEFAULT_FRAME_COUNT));
  const speed = options.speed ?? 1;
  const noiseStrength = options.noiseStrength ?? 0.018;
  const lightVariation = options.lightVariation ?? 0.035;
  const dynamicBackgroundStrength = options.dynamicBackgroundStrength ?? 0.025;
  const objectValue = options.objectValue ?? 0.86;
  const scale = Math.max(0.8, Math.min(width / 96, height / 64));
  const margin = 14 * scale;
  const startX = margin;
  const endX = width - margin;
  const baseY = height * 0.78;

  const frames: GrayscaleImage[] = [];
  const backgroundFrames: GrayscaleImage[] = [];
  const objectMasks: GrayscaleImage[] = [];
  const objectBoxes: MotionObjectBox[] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const progress = frameIndex / Math.max(1, frameCount - 1);
    const loopProgress = (progress * speed) % 1;
    const x = startX + (endX - startX) * loopProgress;
    const y = baseY + Math.sin(frameIndex * 0.55) * 1.5 * scale;
    const phase = frameIndex * 0.75;
    const background = createTeachingBackground(
      width,
      height,
      frameIndex,
      lightVariation,
      dynamicBackgroundStrength,
      noiseStrength
    );
    const frame = background.map(row => [...row]);
    const mask = create2DArray(height, width, 0);

    const box = drawHumanSilhouette(frame, mask, x, y, scale, phase, objectValue);
    frames.push(frame);
    backgroundFrames.push(background);
    objectMasks.push(mask);
    objectBoxes.push(box);
  }

  return {
    width,
    height,
    frames,
    backgroundFrames,
    objectMasks,
    objectBoxes,
  };
}
