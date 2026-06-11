import type { GrayscaleImage } from './types';

export type FeatureMethod = 'sift' | 'surf' | 'brief' | 'orb' | 'brisk';
export type DistanceType = 'euclidean' | 'hamming';

export interface TeachingKeypoint {
  id: string;
  label: string;
  x: number;
  y: number;
  scale: number;
  orientation: number;
  floatDescriptor: number[];
  binaryDescriptor: number[];
}

export interface CandidateMatch {
  target: TeachingKeypoint;
  distance: number;
  rank: number;
  accepted: boolean;
}

export interface KeypointMatchingDemoResult {
  referenceImage: GrayscaleImage;
  targetImage: GrayscaleImage;
  referenceKeypoints: TeachingKeypoint[];
  targetKeypoints: TeachingKeypoint[];
  selectedKeypoint: TeachingKeypoint;
  selectedPatch: GrayscaleImage;
  targetPatch: GrayscaleImage;
  descriptorKind: 'float' | 'binary';
  descriptorLength: number;
  selectedDescriptor: number[];
  candidates: CandidateMatch[];
  bestMatch: CandidateMatch;
  secondBestMatch: CandidateMatch;
  ratio: number;
  ratioThreshold: number;
  acceptedMatches: CandidateMatch[];
  sensitiveKeypointIndex: number;
  statusText: string;
}

const IMAGE_SIZE = 12;
const PATCH_SIZE = 5;

const REFERENCE_IMAGE: GrayscaleImage = [
  [0.06, 0.07, 0.08, 0.09, 0.11, 0.12, 0.12, 0.11, 0.09, 0.08, 0.07, 0.06],
  [0.07, 0.16, 0.24, 0.20, 0.14, 0.13, 0.16, 0.23, 0.25, 0.17, 0.09, 0.06],
  [0.08, 0.25, 0.84, 0.76, 0.30, 0.14, 0.20, 0.72, 0.88, 0.26, 0.10, 0.07],
  [0.09, 0.20, 0.78, 0.92, 0.42, 0.18, 0.26, 0.82, 0.76, 0.22, 0.11, 0.08],
  [0.10, 0.15, 0.32, 0.46, 0.62, 0.40, 0.36, 0.44, 0.36, 0.18, 0.12, 0.09],
  [0.11, 0.13, 0.16, 0.30, 0.58, 0.82, 0.76, 0.42, 0.20, 0.14, 0.11, 0.08],
  [0.10, 0.12, 0.15, 0.26, 0.54, 0.78, 0.86, 0.48, 0.22, 0.15, 0.12, 0.09],
  [0.09, 0.12, 0.20, 0.42, 0.64, 0.48, 0.44, 0.68, 0.74, 0.30, 0.13, 0.08],
  [0.08, 0.15, 0.42, 0.86, 0.78, 0.34, 0.28, 0.70, 0.92, 0.36, 0.14, 0.08],
  [0.07, 0.14, 0.38, 0.72, 0.64, 0.28, 0.20, 0.38, 0.50, 0.24, 0.12, 0.07],
  [0.06, 0.09, 0.14, 0.20, 0.18, 0.12, 0.10, 0.14, 0.18, 0.13, 0.08, 0.06],
  [0.05, 0.06, 0.07, 0.08, 0.09, 0.09, 0.08, 0.08, 0.07, 0.06, 0.05, 0.05],
];

const TARGET_IMAGE: GrayscaleImage = [
  [0.05, 0.06, 0.07, 0.08, 0.10, 0.11, 0.11, 0.10, 0.08, 0.07, 0.06, 0.05],
  [0.06, 0.10, 0.15, 0.18, 0.14, 0.13, 0.15, 0.20, 0.26, 0.20, 0.10, 0.06],
  [0.07, 0.15, 0.30, 0.76, 0.86, 0.30, 0.16, 0.22, 0.70, 0.88, 0.25, 0.08],
  [0.08, 0.13, 0.24, 0.72, 0.92, 0.44, 0.20, 0.28, 0.82, 0.76, 0.24, 0.09],
  [0.09, 0.11, 0.18, 0.34, 0.50, 0.64, 0.42, 0.36, 0.48, 0.38, 0.18, 0.10],
  [0.09, 0.10, 0.13, 0.20, 0.32, 0.58, 0.82, 0.78, 0.44, 0.22, 0.14, 0.10],
  [0.08, 0.10, 0.12, 0.18, 0.28, 0.54, 0.78, 0.88, 0.50, 0.24, 0.15, 0.10],
  [0.08, 0.11, 0.14, 0.24, 0.44, 0.66, 0.50, 0.46, 0.70, 0.76, 0.30, 0.11],
  [0.07, 0.12, 0.18, 0.46, 0.88, 0.80, 0.36, 0.30, 0.72, 0.94, 0.38, 0.12],
  [0.06, 0.10, 0.16, 0.40, 0.74, 0.66, 0.30, 0.22, 0.40, 0.52, 0.25, 0.10],
  [0.05, 0.07, 0.10, 0.16, 0.22, 0.20, 0.13, 0.11, 0.16, 0.20, 0.14, 0.08],
  [0.05, 0.05, 0.06, 0.07, 0.08, 0.09, 0.09, 0.08, 0.08, 0.07, 0.06, 0.05],
];

const REFERENCE_KEYPOINTS: TeachingKeypoint[] = [
  {
    id: 'r0',
    label: 'A',
    x: 3,
    y: 3,
    scale: 1.6,
    orientation: 38,
    floatDescriptor: [0.12, 0.26, 0.58, 0.72, 0.44, 0.18, 0.10, 0.08],
    binaryDescriptor: [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1],
  },
  {
    id: 'r1',
    label: 'B',
    x: 8,
    y: 3,
    scale: 1.4,
    orientation: 112,
    floatDescriptor: [0.10, 0.20, 0.38, 0.86, 0.78, 0.35, 0.18, 0.11],
    binaryDescriptor: [0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1],
  },
  {
    id: 'r2',
    label: 'C',
    x: 6,
    y: 6,
    scale: 1.8,
    orientation: 64,
    floatDescriptor: [0.14, 0.22, 0.44, 0.66, 0.82, 0.76, 0.40, 0.20],
    binaryDescriptor: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0],
  },
  {
    id: 'r3',
    label: 'D',
    x: 3,
    y: 8,
    scale: 1.5,
    orientation: 206,
    floatDescriptor: [0.16, 0.42, 0.82, 0.76, 0.46, 0.24, 0.18, 0.12],
    binaryDescriptor: [0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0],
  },
  {
    id: 'r4',
    label: 'E',
    x: 8,
    y: 8,
    scale: 1.7,
    orientation: 318,
    floatDescriptor: [0.12, 0.28, 0.50, 0.74, 0.90, 0.70, 0.36, 0.16],
    binaryDescriptor: [1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1],
  },
];

const TARGET_KEYPOINTS: TeachingKeypoint[] = [
  {
    id: 't0',
    label: 'A′',
    x: 4,
    y: 3,
    scale: 1.6,
    orientation: 42,
    floatDescriptor: [0.11, 0.27, 0.56, 0.74, 0.42, 0.20, 0.11, 0.07],
    binaryDescriptor: [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1],
  },
  {
    id: 't1',
    label: 'B′',
    x: 9,
    y: 3,
    scale: 1.4,
    orientation: 116,
    floatDescriptor: [0.11, 0.18, 0.36, 0.84, 0.80, 0.36, 0.19, 0.10],
    binaryDescriptor: [0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1],
  },
  {
    id: 't2',
    label: 'C′',
    x: 7,
    y: 6,
    scale: 1.8,
    orientation: 70,
    floatDescriptor: [0.15, 0.24, 0.43, 0.64, 0.84, 0.74, 0.42, 0.19],
    binaryDescriptor: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0],
  },
  {
    id: 't3',
    label: 'D′',
    x: 4,
    y: 8,
    scale: 1.5,
    orientation: 211,
    floatDescriptor: [0.18, 0.40, 0.84, 0.74, 0.48, 0.22, 0.17, 0.13],
    binaryDescriptor: [0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0],
  },
  {
    id: 't4',
    label: 'E′',
    x: 9,
    y: 8,
    scale: 1.7,
    orientation: 324,
    floatDescriptor: [0.11, 0.30, 0.52, 0.72, 0.88, 0.72, 0.35, 0.18],
    binaryDescriptor: [1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1],
  },
  {
    id: 't5',
    label: '干扰',
    x: 6,
    y: 9,
    scale: 1.2,
    orientation: 18,
    floatDescriptor: [0.09, 0.25, 0.55, 0.77, 0.48, 0.22, 0.13, 0.06],
    binaryDescriptor: [1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1],
  },
];

export function getRecommendedDistanceType(method: FeatureMethod): DistanceType {
  return method === 'sift' || method === 'surf' ? 'euclidean' : 'hamming';
}

function methodFloatDescriptor(keypoint: TeachingKeypoint, method: FeatureMethod): number[] {
  if (method === 'surf') {
    return keypoint.floatDescriptor.map((value, index) =>
      Number((value * (index % 2 === 0 ? 0.86 : 0.74)).toFixed(3))
    );
  }

  return keypoint.floatDescriptor;
}

function methodBinaryDescriptor(keypoint: TeachingKeypoint, method: FeatureMethod): number[] {
  if (method === 'brisk') {
    return keypoint.binaryDescriptor.map((value, index) =>
      index % 5 === 0 ? 1 - value : value
    );
  }

  if (method === 'brief') {
    return keypoint.binaryDescriptor.map((value, index) =>
      index % 7 === 0 ? 1 - value : value
    );
  }

  return keypoint.binaryDescriptor;
}

function getDescriptor(
  keypoint: TeachingKeypoint,
  method: FeatureMethod,
  distanceType: DistanceType
): number[] {
  return distanceType === 'euclidean'
    ? methodFloatDescriptor(keypoint, method)
    : methodBinaryDescriptor(keypoint, method);
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, index) => {
    const delta = value - (b[index] ?? 0);
    return sum + delta * delta;
  }, 0));
}

function hammingDistance(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + (value === b[index] ? 0 : 1), 0);
}

function descriptorDistance(a: number[], b: number[], distanceType: DistanceType): number {
  return distanceType === 'euclidean'
    ? euclideanDistance(a, b)
    : hammingDistance(a, b);
}

function extractPatch(image: GrayscaleImage, cx: number, cy: number): GrayscaleImage {
  const radius = Math.floor(PATCH_SIZE / 2);
  return Array.from({ length: PATCH_SIZE }, (_, row) =>
    Array.from({ length: PATCH_SIZE }, (_, col) => {
      const y = Math.max(0, Math.min(IMAGE_SIZE - 1, cy + row - radius));
      const x = Math.max(0, Math.min(IMAGE_SIZE - 1, cx + col - radius));
      return image[y][x];
    })
  );
}

function buildMatchesForKeypoint(
  referenceKeypoint: TeachingKeypoint,
  method: FeatureMethod,
  distanceType: DistanceType,
  ratioThreshold: number
): CandidateMatch[] {
  const referenceDescriptor = getDescriptor(referenceKeypoint, method, distanceType);
  const sorted = TARGET_KEYPOINTS
    .map(target => ({
      target,
      distance: descriptorDistance(
        referenceDescriptor,
        getDescriptor(target, method, distanceType),
        distanceType
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  const secondDistance = sorted[1]?.distance ?? Number.POSITIVE_INFINITY;

  return sorted.map((match, index) => ({
    target: match.target,
    distance: match.distance,
    rank: index + 1,
    accepted: index === 0 && match.distance / secondDistance <= ratioThreshold,
  }));
}

function findSensitiveKeypointIndex(
  method: FeatureMethod,
  distanceType: DistanceType,
  ratioThreshold: number
): number {
  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < REFERENCE_KEYPOINTS.length; index++) {
    const matches = buildMatchesForKeypoint(
      REFERENCE_KEYPOINTS[index],
      method,
      distanceType,
      ratioThreshold
    );
    const ratio = matches[0].distance / matches[1].distance;
    const inTeachingRange = ratio >= 0.45 && ratio <= 0.95;
    const score = (inTeachingRange ? 0 : 1) + Math.abs(ratio - ratioThreshold);

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function computeKeypointMatchingDemo(
  method: FeatureMethod,
  distanceType: DistanceType,
  selectedKeypointIndex: number,
  ratioThreshold: number
): KeypointMatchingDemoResult {
  const safeSelectedIndex = Math.max(
    0,
    Math.min(selectedKeypointIndex, REFERENCE_KEYPOINTS.length - 1)
  );
  const selectedKeypoint = REFERENCE_KEYPOINTS[safeSelectedIndex];
  const candidates = buildMatchesForKeypoint(
    selectedKeypoint,
    method,
    distanceType,
    ratioThreshold
  );
  const bestMatch = candidates[0];
  const secondBestMatch = candidates[1];
  const ratio = bestMatch.distance / secondBestMatch.distance;
  const acceptedMatches = REFERENCE_KEYPOINTS
    .map(referenceKeypoint => buildMatchesForKeypoint(
      referenceKeypoint,
      method,
      distanceType,
      ratioThreshold
    )[0])
    .filter(match => match.accepted);
  const selectedDescriptor = getDescriptor(selectedKeypoint, method, distanceType);
  const sensitiveKeypointIndex = findSensitiveKeypointIndex(method, distanceType, ratioThreshold);
  const statusText = bestMatch.accepted
    ? `ratio ${ratio.toFixed(3)} ≤ ${ratioThreshold.toFixed(2)}，保留该匹配`
    : `ratio ${ratio.toFixed(3)} > ${ratioThreshold.toFixed(2)}，拒绝该匹配`;

  return {
    referenceImage: REFERENCE_IMAGE,
    targetImage: TARGET_IMAGE,
    referenceKeypoints: REFERENCE_KEYPOINTS,
    targetKeypoints: TARGET_KEYPOINTS,
    selectedKeypoint,
    selectedPatch: extractPatch(REFERENCE_IMAGE, selectedKeypoint.x, selectedKeypoint.y),
    targetPatch: extractPatch(TARGET_IMAGE, bestMatch.target.x, bestMatch.target.y),
    descriptorKind: distanceType === 'euclidean' ? 'float' : 'binary',
    descriptorLength: distanceType === 'euclidean'
      ? (method === 'surf' ? 64 : 128)
      : (method === 'brisk' ? 512 : 256),
    selectedDescriptor,
    candidates,
    bestMatch,
    secondBestMatch,
    ratio,
    ratioThreshold,
    acceptedMatches,
    sensitiveKeypointIndex,
    statusText,
  };
}
