'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ImageCanvas,
  InlineMath,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  TeachingTerm,
  buildInlineMathML,
} from '@/components';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { loadImageAsGrayscale, resizeGrayscaleImage } from '@/lib/utils/imageProcessing';

type AlgorithmMode = 'brief' | 'orb' | 'brisk';
type SamplingMethod = 'GI' | 'GII' | 'GIII' | 'GIV' | 'GV';
type PatchSource = 'synthetic' | 'image';
type Pair = [number, number, number, number];
type Point = { x: number; y: number };

const PATCH_SIZE = 9;
const PATCH_HALF = Math.floor(PATCH_SIZE / 2);
const DEFAULT_CENTER: Point = { x: 32, y: 28 };

const ALGORITHM_OPTIONS: { value: AlgorithmMode; label: string }[] = [
  { value: 'brief', label: 'BRIEF：点对比较' },
  { value: 'orb', label: 'ORB：带方向的 BRIEF' },
  { value: 'brisk', label: 'BRISK：长短点对' },
];

const SAMPLING_OPTIONS: { value: SamplingMethod; label: string; desc: string }[] = [
  { value: 'GI', label: 'GI - 均匀分布', desc: 'X、Y 在 Patch 内均匀分布，适合观察最直接的随机点对比较。' },
  { value: 'GII', label: 'GII - 高斯分布', desc: 'X、Y 更集中在 Patch 中心，常用于让描述子更关注关键点附近结构。' },
  { value: 'GIII', label: 'GIII - X 中心取 Y', desc: '先取 X，再在 X 附近取 Y，点对更偏向局部纹理关系。' },
  { value: 'GIV', label: 'GIV - 极坐标量化', desc: '按极坐标半径和角度取点，便于理解方向归一化。' },
  { value: 'GV', label: 'GV - 中心固定极坐标遍历', desc: 'X 固定在中心，Y 沿周围采样，适合观察中心与邻域的亮暗关系。' },
];

const PAIR_OPTIONS: { value: number; label: string }[] = [
  { value: 128, label: '128 bit' },
  { value: 256, label: '256 bit' },
  { value: 512, label: '512 bit' },
];

const SYNTHETIC_PATCH: number[][] = [
  [180, 178, 175, 170, 165, 160, 158, 155, 152],
  [176, 172, 168, 162, 155, 148, 142, 138, 135],
  [170, 165, 158, 150, 140, 130, 122, 118, 115],
  [162, 155, 145, 132, 118, 105, 95, 90, 88],
  [158, 148, 135, 118, 100, 82, 70, 65, 62],
  [152, 140, 125, 105, 82, 60, 48, 42, 40],
  [148, 135, 118, 95, 70, 48, 35, 30, 28],
  [145, 132, 115, 90, 65, 42, 30, 25, 22],
  [142, 130, 112, 88, 62, 40, 28, 22, 20],
];

const TAU_FORMULA = buildInlineMathML(
  '<mrow><mi>τ</mi><mo>(</mo><mi>p</mi><mo>;</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>:=</mo>' +
  '<mrow><mo>{</mo><mtable>' +
  '<mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mi>p</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>&lt;</mo><mi>p</mi><mo>(</mo><mi>y</mi><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr>' +
  '</mtable></mrow></mrow>'
);

const BRIEF_DESCRIPTOR_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>f</mi><msub><mi>n</mi><mi>d</mi></msub></msub><mo>(</mo><mi>p</mi><mo>)</mo>' +
  '<mo>:=</mo><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><msub><mi>n</mi><mi>d</mi></msub></munderover>' +
  '<msup><mn>2</mn><mrow><mi>i</mi><mo>-</mo><mn>1</mn></mrow></msup>' +
  '<mi>τ</mi><mo>(</mo><mi>p</mi><mo>;</mo><msub><mi>x</mi><mi>i</mi></msub><mo>,</mo><msub><mi>y</mi><mi>i</mi></msub><mo>)</mo></mrow>'
);

const HAMMING_FORMULA = buildInlineMathML(
  '<mrow><mi>d</mi><mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>,</mo><msub><mi>f</mi><mn>2</mn></msub><mo>)</mo>' +
  '<mo>=</mo><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover>' +
  '<mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>⊕</mo><msub><mi>f</mi><mn>2</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>)</mo></mrow>'
);

const ORB_CENTROID_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>m</mi><mn>10</mn></msub><mo>=</mo><munderover><mo>∑</mo><mi>x</mi><mi>y</mi></munderover><mi>x</mi><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>' +
  '<mo>,</mo><msub><mi>m</mi><mn>01</mn></msub><mo>=</mo><munderover><mo>∑</mo><mi>x</mi><mi>y</mi></munderover><mi>y</mi><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>' +
  '<mo>,</mo><mi>θ</mi><mo>=</mo><mi>atan2</mi><mo>(</mo><msub><mi>m</mi><mn>01</mn></msub><mo>,</mo><msub><mi>m</mi><mn>10</mn></msub><mo>)</mo></mrow>'
);

const BRISK_DIRECTION_FORMULA = buildInlineMathML(
  '<mrow><mi>g</mi><mo>=</mo><mfenced open="(" close=")"><mtable><mtr><mtd><munder><mo>∑</mo><mi>L</mi></munder><msub><mi>g</mi><mi>x</mi></msub></mtd></mtr><mtr><mtd><munder><mo>∑</mo><mi>L</mi></munder><msub><mi>g</mi><mi>y</mi></msub></mtd></mtr></mtable></mfenced>' +
  '<mo>,</mo><mi>θ</mi><mo>=</mo><mi>atan2</mi><mo>(</mo><msub><mi>g</mi><mi>y</mi></msub><mo>,</mo><msub><mi>g</mi><mi>x</mi></msub><mo>)</mo></mrow>'
);

function inlineMath(body: string): string {
  return buildInlineMathML(`<mrow>${body}</mrow>`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createPatchPreviewImage(): GrayscaleImage {
  const size = 64;
  return Array.from({ length: size }, (_, y) => {
    const sourceY = Math.min(PATCH_SIZE - 1, Math.floor((y / size) * PATCH_SIZE));
    return Array.from({ length: size }, (_, x) => {
      const sourceX = Math.min(PATCH_SIZE - 1, Math.floor((x / size) * PATCH_SIZE));
      return SYNTHETIC_PATCH[sourceY][sourceX] / 255;
    });
  });
}

const FALLBACK_PATCH_IMAGE = createPatchPreviewImage();

function extractPatchFromImage(image: GrayscaleImage, center: Point): number[][] {
  const h = image.length;
  const w = image[0]?.length ?? 1;
  const centerX = clamp(center.x, PATCH_HALF, Math.max(PATCH_HALF, w - PATCH_HALF - 1));
  const centerY = clamp(center.y, PATCH_HALF, Math.max(PATCH_HALF, h - PATCH_HALF - 1));

  return Array.from({ length: PATCH_SIZE }, (_, y) => (
    Array.from({ length: PATCH_SIZE }, (_, x) => {
      const sourceX = clamp(centerX + x - PATCH_HALF, 0, w - 1);
      const sourceY = clamp(centerY + y - PATCH_HALF, 0, h - 1);
      return Math.round((image[sourceY]?.[sourceX] ?? 0) * 255);
    })
  ));
}

function generatePairs(method: SamplingMethod, count: number, seed = 42): Pair[] {
  const pairs: Pair[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;

    if (method === 'GI') {
      x1 = Math.floor(rand() * PATCH_SIZE);
      y1 = Math.floor(rand() * PATCH_SIZE);
      x2 = Math.floor(rand() * PATCH_SIZE);
      y2 = Math.floor(rand() * PATCH_SIZE);
    } else if (method === 'GII') {
      const sampleGauss = (): number => {
        const u1 = rand();
        const u2 = rand();
        const r = Math.sqrt(-2 * Math.log(u1 + 0.0001));
        const theta = 2 * Math.PI * u2;
        return clamp(Math.round(r * Math.cos(theta) * 1.2 + PATCH_HALF), 0, PATCH_SIZE - 1);
      };
      x1 = sampleGauss();
      y1 = sampleGauss();
      x2 = sampleGauss();
      y2 = sampleGauss();
    } else if (method === 'GIII') {
      x1 = Math.floor(rand() * PATCH_SIZE);
      y1 = Math.floor(rand() * PATCH_SIZE);
      x2 = clamp(x1 + Math.round((rand() * 2 - 1) * 2), 0, PATCH_SIZE - 1);
      y2 = clamp(y1 + Math.round((rand() * 2 - 1) * 2), 0, PATCH_SIZE - 1);
    } else if (method === 'GIV') {
      const r1 = rand() * PATCH_HALF;
      const theta1 = rand() * 2 * Math.PI;
      const r2 = rand() * PATCH_HALF;
      const theta2 = rand() * 2 * Math.PI;
      x1 = clamp(Math.round(PATCH_HALF + r1 * Math.cos(theta1)), 0, PATCH_SIZE - 1);
      y1 = clamp(Math.round(PATCH_HALF + r1 * Math.sin(theta1)), 0, PATCH_SIZE - 1);
      x2 = clamp(Math.round(PATCH_HALF + r2 * Math.cos(theta2)), 0, PATCH_SIZE - 1);
      y2 = clamp(Math.round(PATCH_HALF + r2 * Math.sin(theta2)), 0, PATCH_SIZE - 1);
    } else {
      const r = rand() * PATCH_HALF;
      const theta = rand() * 2 * Math.PI;
      x1 = PATCH_HALF;
      y1 = PATCH_HALF;
      x2 = clamp(Math.round(PATCH_HALF + r * Math.cos(theta)), 0, PATCH_SIZE - 1);
      y2 = clamp(Math.round(PATCH_HALF + r * Math.sin(theta)), 0, PATCH_SIZE - 1);
    }

    pairs.push([x1, y1, x2, y2]);
  }

  return pairs;
}

function generateBriskPairs(count: number, kind: 'short' | 'long'): Pair[] {
  const points = [
    { x: 4, y: 1 }, { x: 6, y: 2 }, { x: 7, y: 4 }, { x: 6, y: 6 },
    { x: 4, y: 7 }, { x: 2, y: 6 }, { x: 1, y: 4 }, { x: 2, y: 2 },
    { x: 4, y: 3 }, { x: 5, y: 4 }, { x: 4, y: 5 }, { x: 3, y: 4 },
  ];
  const pairs: Pair[] = [];

  for (let i = 0; i < count; i++) {
    const a = points[i % points.length];
    const b = points[(i + (kind === 'long' ? 4 : 1)) % points.length];
    pairs.push([a.x, a.y, b.x, b.y]);
  }

  return pairs;
}

function rotatePair(pair: Pair, theta: number): Pair {
  const rotate = (x: number, y: number): Point => {
    const dx = x - PATCH_HALF;
    const dy = y - PATCH_HALF;
    const rx = Math.round(PATCH_HALF + dx * Math.cos(theta) - dy * Math.sin(theta));
    const ry = Math.round(PATCH_HALF + dx * Math.sin(theta) + dy * Math.cos(theta));
    return {
      x: clamp(rx, 0, PATCH_SIZE - 1),
      y: clamp(ry, 0, PATCH_SIZE - 1),
    };
  };
  const p1 = rotate(pair[0], pair[1]);
  const p2 = rotate(pair[2], pair[3]);
  return [p1.x, p1.y, p2.x, p2.y];
}

function rotatePairs(pairs: Pair[], theta: number): Pair[] {
  return pairs.map(pair => rotatePair(pair, theta));
}

function tauTest(patch: number[][], x1: number, y1: number, x2: number, y2: number): number {
  return patch[y1]?.[x1] < patch[y2]?.[x2] ? 1 : 0;
}

function buildDescriptor(patch: number[][], pairs: Pair[], upTo: number): string {
  let bits = '';
  for (let i = 0; i < Math.min(upTo, pairs.length); i++) {
    const [x1, y1, x2, y2] = pairs[i];
    bits += tauTest(patch, x1, y1, x2, y2).toString();
  }
  return bits;
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

function calculateCentroidDirection(patch: number[][]): { m10: number; m01: number; theta: number; degrees: number } {
  let m10 = 0;
  let m01 = 0;
  for (let y = 0; y < PATCH_SIZE; y++) {
    for (let x = 0; x < PATCH_SIZE; x++) {
      const centeredX = x - PATCH_HALF;
      const centeredY = y - PATCH_HALF;
      const intensity = patch[y][x];
      m10 += centeredX * intensity;
      m01 += centeredY * intensity;
    }
  }
  const theta = Math.atan2(m01, m10);
  return { m10, m01, theta, degrees: Math.round(theta * 180 / Math.PI) };
}

function calculateBriskDirection(patch: number[][], longPairs: Pair[]): { gx: number; gy: number; theta: number; degrees: number } {
  let gx = 0;
  let gy = 0;
  for (const [x1, y1, x2, y2] of longPairs) {
    const diff = (patch[y2]?.[x2] ?? 0) - (patch[y1]?.[x1] ?? 0);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const norm = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    gx += diff * dx / norm;
    gy += diff * dy / norm;
  }
  const theta = Math.atan2(gy, gx);
  return { gx: Math.round(gx), gy: Math.round(gy), theta, degrees: Math.round(theta * 180 / Math.PI) };
}

function createDescriptorImage(bits: string, compareBits: string, currentIndex: number, totalBits: number): GrayscaleImage {
  const size = 64;
  const cols = totalBits <= 128 ? 16 : 32;
  const rows = Math.ceil(totalBits / cols);
  const cellW = size / cols;
  const cellH = size / rows;

  return Array.from({ length: size }, (_, y) => (
    Array.from({ length: size }, (_, x) => {
      const col = Math.min(cols - 1, Math.floor(x / cellW));
      const row = Math.min(rows - 1, Math.floor(y / cellH));
      const index = row * cols + col;
      if (index >= totalBits) return 0.96;
      if (index === currentIndex) return 0.3;
      if (index >= bits.length) return 0.9;
      if (bits[index] !== compareBits[index]) return 0.58;
      return bits[index] === '1' ? 0.16 : 0.82;
    })
  ));
}

function PatchPairView({ patch, pair, longPairs = [], theta }: { patch: number[][]; pair: Pair; longPairs?: Pair[]; theta?: number }) {
  const [x1, y1, x2, y2] = pair;
  const arrowStyle = theta === undefined
    ? null
    : {
        transform: `rotate(${theta}rad)`,
      };

  return (
    <div className="space-y-2">
      <div className="relative mx-auto grid w-44 grid-cols-9 gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {patch.flatMap((row, y) => row.map((value, x) => {
          const isX = x === x1 && y === y1;
          const isY = x === x2 && y === y2;
          const isLong = longPairs.some(([lx1, ly1, lx2, ly2]) => (x === lx1 && y === ly1) || (x === lx2 && y === ly2));
          const background = `rgb(${value}, ${value}, ${value})`;
          return (
            <div
              key={`${x}-${y}`}
              className={`flex aspect-square items-center justify-center rounded-[0.28rem] text-[9px] font-bold ${
                isX || isY ? 'ring-2 ring-white' : ''
              } ${isLong ? 'outline outline-1 outline-sky-300' : ''}`}
              style={{ background }}
              title={`p(${x},${y})=${value}`}
            >
              {isX ? <span className="rounded bg-red-600 px-1 text-white">x</span> : null}
              {isY ? <span className="rounded bg-emerald-600 px-1 text-white">y</span> : null}
            </div>
          );
        }))}
        {arrowStyle && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-16 origin-left rounded-full bg-sky-500" style={arrowStyle}>
            <span className="absolute -right-1 -top-1 h-2 w-2 rotate-45 border-r-2 border-t-2 border-sky-500" />
          </div>
        )}
      </div>
      <div className="text-center text-[11px] leading-5 text-slate-500">
        红色 x 与绿色 y 组成当前点对；蓝色轮廓表示 BRISK 用来估方向的长点对采样位置。
      </div>
    </div>
  );
}

const ORB_CODE_TS = `// OpenCV ORB 特征提取与匹配
Ptr<ORB> orb = ORB::create();
vector<KeyPoint> keypoints1, keypoints2;
Mat descriptors1, descriptors2;

orb->detect(img1, keypoints1);
orb->detect(img2, keypoints2);

orb->compute(img1, keypoints1, descriptors1);
orb->compute(img2, keypoints2, descriptors2);

BFMatcher matcher(NORM_HAMMING, true);
vector<DMatch> matches;
matcher.match(descriptors1, descriptors2, matches);`;

const BRISK_CODE_TS = `// OpenCV BRISK 特征提取与匹配
Ptr<BRISK> brisk = BRISK::create();
vector<KeyPoint> kp1, kp2;
Mat des1, des2;

brisk->detect(src1, kp1);
brisk->detect(src2, kp2);

brisk->compute(src1, kp1, des1);
brisk->compute(src2, kp2, des2);

BFMatcher matcher(NORM_HAMMING, true);
vector<DMatch> matches;
matcher.match(des1, des2, matches);`;

const BRIEF_CODE_TS = `function tauTest(patch, x, y) {
  return patch[x] < patch[y] ? 1 : 0;
}

function buildBriefDescriptor(patch, pairs) {
  return pairs.map(([x, y]) => tauTest(patch, x, y)).join('');
}

function hammingDistance(a, b) {
  return [...a].filter((bit, i) => bit !== b[i]).length;
}`;

export default function BinaryFeatureDescriptorsPage() {
  const [algorithm, setAlgorithm] = useState<AlgorithmMode>('brief');
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>('GI');
  const [numPairs, setNumPairs] = useState(256);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [patchSource, setPatchSource] = useState<PatchSource>('image');
  const [patchCenter, setPatchCenter] = useState<Point>(DEFAULT_CENTER);
  const [loadedImage, setLoadedImage] = useState<GrayscaleImage>(FALLBACK_PATCH_IMAGE);

  useEffect(() => {
    let cancelled = false;
    loadImageAsGrayscale('/assets/binary-feature-descriptors/0611a984f7a384894e8779c0c84166142a64673d53ccbdac68d1da6bba77e06d.jpg')
      .then((img) => {
        if (!cancelled) {
          setLoadedImage(resizeGrayscaleImage(img, 64));
        }
      })
      .catch(() => {
        if (!cancelled) {
          console.warn('加载二进制描述子参考图失败，使用教学 Patch 兜底。');
          setLoadedImage(FALLBACK_PATCH_IMAGE);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const activePatch = useMemo(
    () => patchSource === 'image' ? extractPatchFromImage(loadedImage, patchCenter) : SYNTHETIC_PATCH,
    [loadedImage, patchCenter, patchSource]
  );

  const centroid = useMemo(() => calculateCentroidDirection(activePatch), [activePatch]);
  const briskLongPairs = useMemo(() => generateBriskPairs(16, 'long'), []);
  const briskDirection = useMemo(() => calculateBriskDirection(activePatch, briskLongPairs), [activePatch, briskLongPairs]);

  const basePairs = useMemo(() => {
    if (algorithm === 'brisk') return generateBriskPairs(numPairs, 'short');
    return generatePairs(algorithm === 'orb' ? 'GII' : samplingMethod, numPairs, 42);
  }, [algorithm, numPairs, samplingMethod]);

  const pairs = useMemo(() => {
    if (algorithm === 'orb') return rotatePairs(basePairs, centroid.theta);
    if (algorithm === 'brisk') return rotatePairs(basePairs, briskDirection.theta);
    return basePairs;
  }, [algorithm, basePairs, briskDirection.theta, centroid.theta]);

  const comparePairs = useMemo(() => {
    if (algorithm === 'brisk') return rotatePairs(generateBriskPairs(numPairs, 'short'), briskDirection.theta + 0.22);
    if (algorithm === 'orb') return rotatePairs(generatePairs('GII', numPairs, 137), centroid.theta + 0.18);
    return generatePairs(samplingMethod, numPairs, 137);
  }, [algorithm, briskDirection.theta, centroid.theta, numPairs, samplingMethod]);

  const binaryString = useMemo(
    () => buildDescriptor(activePatch, pairs, currentPairIndex + 1),
    [activePatch, currentPairIndex, pairs]
  );

  const binaryString2 = useMemo(
    () => buildDescriptor(activePatch, comparePairs, currentPairIndex + 1),
    [activePatch, comparePairs, currentPairIndex]
  );

  const hammingDist = useMemo(() => hammingDistance(binaryString, binaryString2), [binaryString, binaryString2]);
  const resultImage = useMemo(
    () => createDescriptorImage(binaryString, binaryString2, currentPairIndex, numPairs),
    [binaryString, binaryString2, currentPairIndex, numPairs]
  );

  const currentPair = pairs[currentPairIndex] ?? [0, 0, 0, 0];
  const [cx1, cy1, cx2, cy2] = currentPair;
  const v1 = activePatch[cy1]?.[cx1] ?? 0;
  const v2 = activePatch[cy2]?.[cx2] ?? 0;
  const tauResult = tauTest(activePatch, cx1, cy1, cx2, cy2);
  const samplingInfo = SAMPLING_OPTIONS.find(option => option.value === samplingMethod);
  const algorithmLabel = ALGORITHM_OPTIONS.find(option => option.value === algorithm)?.label ?? 'BRIEF';
  const directionInfo = algorithm === 'orb'
    ? `灰度质心方向 θ=${centroid.degrees}°`
    : algorithm === 'brisk'
      ? `长点对方向 θ=${briskDirection.degrees}°`
      : '原始 BRIEF 不估计主方向';

  const chainSubstitution = useMemo(() => {
    let sum = 0;
    return pairs.slice(0, Math.min(8, pairs.length)).map((pair, index) => {
      const [x1, y1, x2, y2] = pair;
      const tau = tauTest(activePatch, x1, y1, x2, y2);
      const weight = Math.pow(2, index);
      const contrib = weight * tau;
      sum += contrib;
      return { i: index + 1, tau, weight, contrib, sum };
    });
  }, [activePatch, pairs]);

  const handleInputRegionSelect = (x: number, y: number) => {
    setPatchCenter({
      x: clamp(x, PATCH_HALF, 63 - PATCH_HALF),
      y: clamp(y, PATCH_HALF, 63 - PATCH_HALF),
    });
    setPatchSource('image');
    setCurrentPairIndex(0);
  };

  const handleDirectionMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    setPatchSource('image');
    setPatchCenter(prev => {
      const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
      return {
        x: clamp(prev.x + dx, PATCH_HALF, 63 - PATCH_HALF),
        y: clamp(prev.y + dy, PATCH_HALF, 63 - PATCH_HALF),
      };
    });
    setCurrentPairIndex(0);
  };

  const stepDetails = (
    <div className="space-y-6">
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">从像素块到二进制描述子</h2>
        <p className="text-xs leading-6 text-slate-600">
          局部特征匹配不直接保存整块原始像素，而是把关键点附近的
          <TeachingTerm term="Patch" explanation="围绕关键点截取的小图像块，描述子只编码这个局部区域的结构。" className="mx-1" />
          转成更稳定、更容易比较的
          <TeachingTerm term="描述子" explanation="描述子是局部图像结构的编码。二进制描述子使用 0/1 串，适合用位运算快速匹配。" className="mx-1" />
          。BRIEF、ORB、BRISK 都利用像素点对的亮暗关系生成 bit；这样同一局部结构在距离、旋转或亮度略有变化时，仍然有机会被识别为相同目标的一部分。
        </p>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">当前算法：{algorithmLabel}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-xs font-semibold text-slate-700">检测位置</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {algorithm === 'brief'
                ? 'BRIEF 通常接收外部关键点，只负责把当前 Patch 编码成二进制串。'
                : algorithm === 'orb'
                  ? 'ORB 用 FAST 快速找角点，再用 Harris 响应保留更可靠的候选点。'
                  : 'BRISK 在尺度空间中找稳定关键点，让远近变化后的同一结构更容易被再次定位。'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-xs font-semibold text-slate-700">方向与尺度</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {algorithm === 'brief'
                ? '原始 BRIEF 不估计方向和尺度，所以目标旋转或变大变小时会更敏感。'
                : algorithm === 'orb'
                  ? 'ORB 用灰度质心估计主方向，再旋转 BRIEF 点对，减少旋转带来的 bit 翻转。'
                  : 'BRISK 先用长距离点对估计整体方向，再用短距离点对描述局部细节。'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-xs font-semibold text-slate-700">匹配方式</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              最终比较的是二进制描述子，不是逐像素相减。汉明距离只统计不同 bit 的数量，能快速判断两个局部结构是否相似。
            </p>
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（1）点对比较与 τ 测试</h2>
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <PatchPairView
            patch={activePatch}
            pair={currentPair}
            longPairs={algorithm === 'brisk' ? briskLongPairs : []}
            theta={algorithm === 'orb' ? centroid.theta : algorithm === 'brisk' ? briskDirection.theta : undefined}
          />
          <div className="space-y-3">
            <p className="text-xs leading-6 text-slate-600">
              当前第 {currentPairIndex + 1} 对采样点为 x=({cx1},{cy1})、y=({cx2},{cy2})。
              比较两个位置的灰度值即可得到一个
              <TeachingTerm term="bit" explanation="一次点对比较只输出 0 或 1；很多 bit 顺序排列后就是描述子。" className="mx-1" />
              。
            </p>
            <FormulaCard
              label="τ 测试"
              mathML={TAU_FORMULA}
              tone="embedded"
              note={`当前 p(x)=${v1}，p(y)=${v2}，因此 τ=${tauResult}。`}
            />
          </div>
        </div>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（2）描述子编码与汉明距离</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          当前页面把前 {currentPairIndex + 1} 次点对比较串成二进制描述子。输出图中深色表示 bit=1，浅色表示 bit=0，中灰色表示两条描述子在该位不同，当前位用更深色标出。
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          <FormulaCard
            label="BRIEF 描述子"
            mathML={BRIEF_DESCRIPTOR_FORMULA}
            tone="embedded"
            note={`当前描述子前 ${Math.min(binaryString.length, 24)} 位：${binaryString.slice(0, 24)}${binaryString.length > 24 ? '...' : ''}`}
          />
          <FormulaCard
            label="汉明距离"
            mathML={HAMMING_FORMULA}
            tone="embedded"
            note={`当前两条描述子已比较 ${binaryString.length} 位，差异 bit 数为 ${hammingDist}。`}
          />
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
          <table className="w-full text-left text-[11px] tabular-nums">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-2 py-1.5 font-semibold text-slate-600">i</th>
                <th className="px-2 py-1.5 font-semibold text-slate-600">τ</th>
                <th className="px-2 py-1.5 font-semibold text-slate-600">权重</th>
                <th className="px-2 py-1.5 font-semibold text-slate-600">贡献</th>
                <th className="px-2 py-1.5 font-semibold text-slate-600">累计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {chainSubstitution.map(row => (
                <tr key={row.i}>
                  <td className="px-2 py-1.5 font-mono text-slate-800">{row.i}</td>
                  <td className="px-2 py-1.5 font-mono text-slate-700">{row.tau}</td>
                  <td className="px-2 py-1.5 font-mono text-slate-700">{row.weight}</td>
                  <td className="px-2 py-1.5 font-mono text-slate-700">{row.contrib}</td>
                  <td className="px-2 py-1.5 font-mono font-semibold text-blue-700">{row.sum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（3）ORB：方向让 BRIEF 更稳定</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          ORB 不是另起炉灶，而是把 FAST 角点、Harris 筛选和旋转 BRIEF 串起来。当前 Patch 中亮暗分布的重心给出方向
          <InlineMath mathML={inlineMath('<mi>θ</mi>')} className="mx-1" />
          ，点对按这个方向旋转后再比较；这样图像发生旋转时，描述子的采样关系仍尽量对齐同一局部结构。
        </p>
        <FormulaCard
          label="Intensity Centroid 方向"
          mathML={ORB_CENTROID_FORMULA}
          tone="embedded"
          note={`当前 m10=${centroid.m10}，m01=${centroid.m01}，θ≈${centroid.degrees}°。`}
        />
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（4）BRISK：长点对定方向，短点对做编码</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          BRISK 的教学模型把采样点对分成两类：距离较远的点对更能反映局部结构的整体朝向，距离较近的点对更适合记录细节。它还会在尺度空间中寻找稳定位置，避免只在原图上找到的角点在目标变远或变近后消失。
        </p>
        <FormulaCard
          label="BRISK 主方向"
          mathML={BRISK_DIRECTION_FORMULA}
          tone="embedded"
          note={`当前长点对累计 gx=${briskDirection.gx}，gy=${briskDirection.gy}，θ≈${briskDirection.degrees}°。`}
        />
      </TeachingCard>

      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（5）三种二进制描述子的差异</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 font-semibold text-slate-700">算法</th>
                <th className="px-3 py-2 font-semibold text-slate-700">关键动作</th>
                <th className="px-3 py-2 font-semibold text-slate-700">优势</th>
                <th className="px-3 py-2 font-semibold text-slate-700">仍需注意</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className={algorithm === 'brief' ? 'bg-amber-50' : ''}>
                <td className="px-3 py-2 font-semibold text-slate-700">BRIEF</td>
                <td className="px-3 py-2 text-slate-600">直接比较 Patch 点对</td>
                <td className="px-3 py-2 text-slate-600">极快、存储小</td>
                <td className="px-3 py-2 text-slate-600">旋转和尺度变化下更敏感</td>
              </tr>
              <tr className={algorithm === 'orb' ? 'bg-amber-50' : ''}>
                <td className="px-3 py-2 font-semibold text-slate-700">ORB</td>
                <td className="px-3 py-2 text-slate-600">FAST/Harris + 灰度质心 + 旋转 BRIEF</td>
                <td className="px-3 py-2 text-slate-600">速度快，旋转适应性更好</td>
                <td className="px-3 py-2 text-slate-600">大尺度变化和重复纹理仍可能不稳</td>
              </tr>
              <tr className={algorithm === 'brisk' ? 'bg-amber-50' : ''}>
                <td className="px-3 py-2 font-semibold text-slate-700">BRISK</td>
                <td className="px-3 py-2 text-slate-600">尺度空间 + 长点对方向 + 短点对编码</td>
                <td className="px-3 py-2 text-slate-600">兼顾尺度、方向和二进制匹配速度</td>
                <td className="px-3 py-2 text-slate-600">512 位常更重，复杂场景仍需几何筛选</td>
              </tr>
            </tbody>
          </table>
        </div>
      </TeachingCard>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-red-600">当前 Patch</div>
            <PatchPairView
              patch={activePatch}
              pair={currentPair}
              longPairs={algorithm === 'brisk' ? briskLongPairs : []}
              theta={algorithm === 'orb' ? centroid.theta : algorithm === 'brisk' ? briskDirection.theta : undefined}
            />
            <p className="mt-3 text-xs leading-5 text-slate-600">
              Patch 中保留的是局部结构，不是整张原图；描述子会把这些亮暗关系压缩成 bit 串。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-amber-700">点对采样与方向</div>
            <div className="grid gap-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-[10px] text-amber-700">当前算法</div>
                <div className="font-semibold text-amber-900">{algorithmLabel}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                <div className="text-[10px] text-amber-600">方向处理</div>
                <div className="text-xs font-semibold text-amber-800">{directionInfo}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-amber-600">x 点 p({cx1},{cy1})</div>
                  <div className="font-mono font-semibold text-amber-800">{v1}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-amber-600">y 点 p({cx2},{cy2})</div>
                  <div className="font-mono font-semibold text-amber-800">{v2}</div>
                </div>
              </div>
              <div className="rounded-xl bg-amber-100 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                p(x)={v1} {v1 < v2 ? '<' : '≥'} p(y)={v2}，τ={tauResult}
              </div>
            </div>
          </FlowNode>

          <FlowNode tone="sky" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-sky-700">二进制编码</div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <div className="font-mono text-xs font-semibold text-sky-800 break-all">
                {binaryString.slice(0, Math.min(32, binaryString.length))}
              </div>
              <div className="mt-2 text-xs text-sky-600">
                已生成 {binaryString.length} bit，当前位为 {tauResult}
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-emerald-700">汉明距离匹配</div>
            <div className="grid gap-2">
              <ImageCanvas image={resultImage} maxDisplaySize={150} showGrid />
              <div className="rounded-xl bg-emerald-100 px-3 py-2 text-center">
                <div className="text-[10px] text-emerald-700">差异 bit 数</div>
                <div className="font-mono text-sm font-bold text-emerald-800">{hammingDist}</div>
                <div className="text-[10px] text-emerald-600">已比较 {binaryString.length} / {numPairs} 位</div>
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="算法模式"
        value={algorithm}
        onChange={value => {
          const nextAlgorithm = value as AlgorithmMode;
          setAlgorithm(nextAlgorithm);
          setCurrentPairIndex(0);
          if (nextAlgorithm === 'brisk') setNumPairs(512);
        }}
        options={ALGORITHM_OPTIONS}
      />
      <SelectParam
        label="采样方式"
        value={samplingMethod}
        onChange={value => {
          setSamplingMethod(value as SamplingMethod);
          setCurrentPairIndex(0);
        }}
        options={SAMPLING_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
      />
      {samplingInfo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs leading-5 text-amber-800">{samplingInfo.desc}</p>
        </div>
      )}
      <SelectParam
        label="Patch 来源"
        value={patchSource}
        onChange={value => {
          setPatchSource(value as PatchSource);
          setCurrentPairIndex(0);
        }}
        options={[
          { value: 'image', label: '点击主图选 Patch' },
          { value: 'synthetic', label: '教学 Patch' },
        ]}
      />
      <SelectParam
        label="描述子位数"
        value={String(numPairs)}
        onChange={value => {
          setNumPairs(Number(value));
          setCurrentPairIndex(0);
        }}
        options={PAIR_OPTIONS.map(option => ({ value: String(option.value), label: option.label }))}
      />
      <SliderParam
        label="当前点对"
        value={currentPairIndex}
        onChange={setCurrentPairIndex}
        min={0}
        max={Math.max(0, numPairs - 1)}
        step={1}
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前第 {currentPairIndex + 1} 对：p({cx1},{cy1})={v1} 与 p({cx2},{cy2})={v2}，τ={tauResult}。
        {patchSource === 'image' ? ` 当前主图中心为 (${patchCenter.x}, ${patchCenter.y})。` : ' 当前使用固定教学 Patch。'}
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="二进制特征描述子"
      subtitle="BRIEF / ORB / BRISK - 基于像素比较的快速特征编码"
      operationLabel="描述子编码"
      parameterIntro="切换算法、点击主图选择 Patch，并拖动点对编号观察 bit 如何逐步构成描述子。"
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={
        <CodeViewer languages={[
          { name: 'BRIEF', code: BRIEF_CODE_TS },
          { name: 'ORB', code: ORB_CODE_TS },
          { name: 'BRISK', code: BRISK_CODE_TS },
        ]} />
      }
      originalImage={loadedImage}
      resultImage={resultImage}
      currentStep={{
        x: patchCenter.x,
        y: patchCenter.y,
        kernelSize: PATCH_SIZE,
        regionX: clamp(patchCenter.x - PATCH_HALF, 0, 64 - PATCH_SIZE),
        regionY: clamp(patchCenter.y - PATCH_HALF, 0, 64 - PATCH_SIZE),
        regionWidth: PATCH_SIZE,
        regionHeight: PATCH_SIZE,
      }}
      currentStepLabel="Patch 中心"
      stepInfo={{ current: currentPairIndex, total: numPairs }}
      onInputRegionSelect={handleInputRegionSelect}
      onDirectionMove={handleDirectionMove}
      navigationHintText="点击原图选择 Patch / 方向键微调 Patch 中心"
      imageLabels={{ input: '可点击原图', output: '描述子 bit 图' }}
      imageHints={{
        input: '红框为当前 9×9 Patch，点击可重新选局部结构',
        output: '深色=1，浅色=0，中灰=两条描述子该位不同',
      }}
      singlePageScroll
    />
  );
}
