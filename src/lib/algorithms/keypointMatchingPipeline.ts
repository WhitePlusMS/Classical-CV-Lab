import type { GrayscaleImage } from './types';

export type FeatureMethod = 'sift' | 'surf' | 'brief' | 'orb' | 'brisk';
export type DistanceType = 'euclidean' | 'hamming';

export interface MethodDescriptors {
  sift: number[];
  surf: number[];
  brief: number[];
  orb: number[];
  brisk: number[];
}

export interface DetectionEvidence {
  responseValue: number;
  responseLabel: string;
  detectionHint: string;
}

export interface DetectionKeypointData {
  evidence: Record<FeatureMethod, DetectionEvidence>;
}

export interface TeachingKeypoint {
  id: string;
  label: string;
  x: number;
  y: number;
  scale: number;
  orientation: number;
  descriptors: MethodDescriptors;
  detection: DetectionKeypointData;
}

export interface CandidateMatch {
  target: TeachingKeypoint;
  distance: number;
  rank: number;
  accepted: boolean;
}

export interface ReferenceMatchSummary {
  reference: TeachingKeypoint;
  bestMatch: CandidateMatch;
  secondBestMatch: CandidateMatch;
  ratio: number;
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
  referenceMatches: ReferenceMatchSummary[];
  bestMatch: CandidateMatch;
  secondBestMatch: CandidateMatch;
  ratio: number;
  ratioThreshold: number;
  acceptedMatches: CandidateMatch[];
  sensitiveKeypointIndex: number;
  statusText: string;
  selectedDetectionEvidence: DetectionEvidence;
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
    descriptors: {
      sift: [0.12, 0.26, 0.58, 0.72, 0.44, 0.18, 0.10, 0.08],
      surf: [0.10, 0.22, 0.50, 0.62, 0.38, 0.15, 0.09, 0.07],
      brief: [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1],
      orb: [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1],
      brisk: [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.87,
          responseLabel: 'DoG 响应 0.87',
          detectionHint: '该点在相邻尺度层都保持局部极值，说明角点和纹理结构都比较稳定。',
        },
        surf: {
          responseValue: 0.79,
          responseLabel: 'Hessian 行列式 0.79',
          detectionHint: '盒式滤波近似的 Hessian 响应明显，亮暗突变位置集中在该邻域。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 只负责描述，不负责检测，这个关键点来自外部检测器的输入。',
        },
        orb: {
          responseValue: 12,
          responseLabel: 'FAST 圆周差异 12',
          detectionHint: '圆周上存在连续像素显著亮于中心，FAST 将其判断为角点。',
        },
        brisk: {
          responseValue: 0.83,
          responseLabel: 'AGAST 响应 0.83',
          detectionHint: '多尺度 AGAST 在该尺度下仍然给出高响应，说明位置重复性较好。',
        },
      },
    },
  },
  {
    id: 'r1',
    label: 'B',
    x: 8,
    y: 3,
    scale: 1.4,
    orientation: 112,
    descriptors: {
      sift: [0.10, 0.20, 0.38, 0.86, 0.78, 0.35, 0.18, 0.11],
      surf: [0.09, 0.18, 0.32, 0.74, 0.66, 0.30, 0.16, 0.10],
      brief: [0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1],
      orb: [1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1],
      brisk: [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.82,
          responseLabel: 'DoG 响应 0.82',
          detectionHint: '该点处于高对比边角交汇处，尺度空间中的极值位置清晰。',
        },
        surf: {
          responseValue: 0.74,
          responseLabel: 'Hessian 行列式 0.74',
          detectionHint: '二阶导数近似响应集中，说明局部曲率变化足够大。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 继承外部关键点，这里重点观察的是后续的二进制描述。',
        },
        orb: {
          responseValue: 11,
          responseLabel: 'FAST 圆周差异 11',
          detectionHint: 'FAST 在该位置找到连续像素差异，角点强度略低于 A 但仍稳定。',
        },
        brisk: {
          responseValue: 0.78,
          responseLabel: 'AGAST 响应 0.78',
          detectionHint: 'AGAST 在局部亮斑边缘给出稳定响应，适合进入 BRISK 描述阶段。',
        },
      },
    },
  },
  {
    id: 'r2',
    label: 'C',
    x: 6,
    y: 6,
    scale: 1.8,
    orientation: 64,
    descriptors: {
      sift: [0.14, 0.22, 0.44, 0.66, 0.82, 0.76, 0.40, 0.20],
      surf: [0.12, 0.19, 0.38, 0.58, 0.72, 0.68, 0.35, 0.18],
      brief: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0],
      orb: [1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0],
      brisk: [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.91,
          responseLabel: 'DoG 响应 0.91',
          detectionHint: '中心区域在多个尺度下都呈现显著极值，是最稳定的教学示例点之一。',
        },
        surf: {
          responseValue: 0.88,
          responseLabel: 'Hessian 行列式 0.88',
          detectionHint: 'Hessian 响应在中心块最强，说明斑点结构非常突出。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 仍需依赖外部关键点，这里借助中心稳定点展示描述子编码效果。',
        },
        orb: {
          responseValue: 14,
          responseLabel: 'FAST 圆周差异 14',
          detectionHint: '圆周对比最明显，ORB 会优先把这种高角点分数位置保留下来。',
        },
        brisk: {
          responseValue: 0.89,
          responseLabel: 'AGAST 响应 0.89',
          detectionHint: '多尺度 AGAST 在中心区域稳定响应，适合演示 BRISK 的尺度鲁棒性。',
        },
      },
    },
  },
  {
    id: 'r3',
    label: 'D',
    x: 3,
    y: 8,
    scale: 1.5,
    orientation: 206,
    descriptors: {
      sift: [0.16, 0.42, 0.82, 0.76, 0.46, 0.24, 0.18, 0.12],
      surf: [0.14, 0.36, 0.70, 0.66, 0.40, 0.20, 0.15, 0.10],
      brief: [0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0],
      orb: [1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0],
      brisk: [0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.84,
          responseLabel: 'DoG 响应 0.84',
          detectionHint: '该点位于斜向纹理与亮斑边界交汇处，尺度空间响应连续。',
        },
        surf: {
          responseValue: 0.76,
          responseLabel: 'Hessian 行列式 0.76',
          detectionHint: '局部二阶变化明显，SURF 能较快锁定这一块的显著结构。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 仅描述已有关键点，这里用于观察下方区域的二进制编码区别。',
        },
        orb: {
          responseValue: 10,
          responseLabel: 'FAST 圆周差异 10',
          detectionHint: 'FAST 可以检测到角点，但该处对比度略弱，因此分值低于中心点。',
        },
        brisk: {
          responseValue: 0.80,
          responseLabel: 'AGAST 响应 0.80',
          detectionHint: 'AGAST 在斜向结构上仍有稳定反应，适合演示多尺度二进制匹配。',
        },
      },
    },
  },
  {
    id: 'r4',
    label: 'E',
    x: 8,
    y: 8,
    scale: 1.7,
    orientation: 318,
    descriptors: {
      sift: [0.12, 0.28, 0.50, 0.74, 0.90, 0.70, 0.36, 0.16],
      surf: [0.11, 0.24, 0.44, 0.63, 0.78, 0.60, 0.31, 0.14],
      brief: [1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1],
      orb: [0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1],
      brisk: [1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.89,
          responseLabel: 'DoG 响应 0.89',
          detectionHint: '该亮斑边缘在大尺度下仍然清晰，是视角变化后也容易复现的关键点。',
        },
        surf: {
          responseValue: 0.81,
          responseLabel: 'Hessian 行列式 0.81',
          detectionHint: 'Hessian 对该块亮暗结构的响应充足，适合作为 SURF 的示例点。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 没有检测器，这个点主要用于对比不同描述子的区分能力。',
        },
        orb: {
          responseValue: 13,
          responseLabel: 'FAST 圆周差异 13',
          detectionHint: '圆周连续差异充足，ORB 会把它视为强角点并计算方向。',
        },
        brisk: {
          responseValue: 0.86,
          responseLabel: 'AGAST 响应 0.86',
          detectionHint: '多尺度角点响应强，适合作为 BRISK 的稳定匹配案例。',
        },
      },
    },
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
    descriptors: {
      sift: [0.11, 0.27, 0.56, 0.74, 0.42, 0.20, 0.11, 0.07],
      surf: [0.10, 0.23, 0.49, 0.64, 0.37, 0.16, 0.10, 0.06],
      brief: [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1],
      orb: [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1],
      brisk: [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.85,
          responseLabel: 'DoG 响应 0.85',
          detectionHint: '视角变化后仍保留稳定极值，说明这个点具有较好的重复检测性。',
        },
        surf: {
          responseValue: 0.77,
          responseLabel: 'Hessian 行列式 0.77',
          detectionHint: '目标图中亮暗变化稍有偏移，但 Hessian 响应仍然集中。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 继续复用外部检测结果，便于和参考图同一结构对比。',
        },
        orb: {
          responseValue: 12,
          responseLabel: 'FAST 圆周差异 12',
          detectionHint: 'FAST 在目标图的对应位置依旧能看到明显角点对比。',
        },
        brisk: {
          responseValue: 0.81,
          responseLabel: 'AGAST 响应 0.81',
          detectionHint: 'AGAST 响应略有下降，但仍属于稳定匹配的候选点。',
        },
      },
    },
  },
  {
    id: 't1',
    label: 'B′',
    x: 9,
    y: 3,
    scale: 1.4,
    orientation: 116,
    descriptors: {
      sift: [0.11, 0.18, 0.36, 0.84, 0.80, 0.36, 0.19, 0.10],
      surf: [0.10, 0.16, 0.31, 0.73, 0.68, 0.31, 0.17, 0.09],
      brief: [0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1],
      orb: [1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1],
      brisk: [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.81,
          responseLabel: 'DoG 响应 0.81',
          detectionHint: '目标图中该边缘拐角仍保持明显极值，适合作为对应点。',
        },
        surf: {
          responseValue: 0.73,
          responseLabel: 'Hessian 行列式 0.73',
          detectionHint: 'Hessian 响应略受视角影响，但仍足够区分此处结构。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 只对这个已检测点做二进制比较，不单独判断显著性。',
        },
        orb: {
          responseValue: 11,
          responseLabel: 'FAST 圆周差异 11',
          detectionHint: 'FAST 圆周差异与参考点接近，说明角点性质仍然稳定。',
        },
        brisk: {
          responseValue: 0.77,
          responseLabel: 'AGAST 响应 0.77',
          detectionHint: 'AGAST 在目标图也能找到类似角点，尺度适配保持稳定。',
        },
      },
    },
  },
  {
    id: 't2',
    label: 'C′',
    x: 7,
    y: 6,
    scale: 1.8,
    orientation: 70,
    descriptors: {
      sift: [0.15, 0.24, 0.43, 0.64, 0.84, 0.74, 0.42, 0.19],
      surf: [0.13, 0.21, 0.37, 0.56, 0.74, 0.66, 0.36, 0.17],
      brief: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0],
      orb: [1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0],
      brisk: [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.90,
          responseLabel: 'DoG 响应 0.90',
          detectionHint: '中心稳定结构在目标图中依旧显著，是最可靠的对应点之一。',
        },
        surf: {
          responseValue: 0.86,
          responseLabel: 'Hessian 行列式 0.86',
          detectionHint: 'Hessian 在中心斑块上的响应依然最强，SURF 能稳定检测到它。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 在这里重点体现的是描述子对中心纹理的编码稳定性。',
        },
        orb: {
          responseValue: 14,
          responseLabel: 'FAST 圆周差异 14',
          detectionHint: '目标图中心仍有明显圆周对比，ORB 会优先保留这个点。',
        },
        brisk: {
          responseValue: 0.88,
          responseLabel: 'AGAST 响应 0.88',
          detectionHint: 'AGAST 的多尺度响应和参考图接近，说明匹配潜力最高。',
        },
      },
    },
  },
  {
    id: 't3',
    label: 'D′',
    x: 4,
    y: 8,
    scale: 1.5,
    orientation: 211,
    descriptors: {
      sift: [0.18, 0.40, 0.84, 0.74, 0.48, 0.22, 0.17, 0.13],
      surf: [0.15, 0.35, 0.72, 0.64, 0.41, 0.19, 0.14, 0.11],
      brief: [0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0],
      orb: [1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
      brisk: [0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.83,
          responseLabel: 'DoG 响应 0.83',
          detectionHint: '目标图下方的斜向结构仍形成局部极值，可与参考图对应起来。',
        },
        surf: {
          responseValue: 0.75,
          responseLabel: 'Hessian 行列式 0.75',
          detectionHint: 'Hessian 对该处边缘和亮斑组合依旧敏感，响应较为稳定。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 继续沿用外部检测点，方便展示目标图的局部二进制差异。',
        },
        orb: {
          responseValue: 10,
          responseLabel: 'FAST 圆周差异 10',
          detectionHint: 'FAST 能检测到此处角点，但受亮度变化影响，分值略低。',
        },
        brisk: {
          responseValue: 0.79,
          responseLabel: 'AGAST 响应 0.79',
          detectionHint: 'AGAST 在这一块仍给出稳定响应，便于保留真实匹配。',
        },
      },
    },
  },
  {
    id: 't4',
    label: 'E′',
    x: 9,
    y: 8,
    scale: 1.7,
    orientation: 324,
    descriptors: {
      sift: [0.11, 0.30, 0.52, 0.72, 0.88, 0.72, 0.35, 0.18],
      surf: [0.10, 0.26, 0.45, 0.61, 0.77, 0.62, 0.30, 0.15],
      brief: [1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1],
      orb: [0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1],
      brisk: [1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.88,
          responseLabel: 'DoG 响应 0.88',
          detectionHint: '大尺度亮斑结构在目标图中仍保持明显极值，适合作为稳定对应点。',
        },
        surf: {
          responseValue: 0.80,
          responseLabel: 'Hessian 行列式 0.80',
          detectionHint: 'Hessian 对该处块状结构响应充分，SURF 匹配通常比较稳定。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 在这里主要展示和参考图同类亮斑的二进制相似性。',
        },
        orb: {
          responseValue: 13,
          responseLabel: 'FAST 圆周差异 13',
          detectionHint: 'FAST 对目标图右下亮斑边缘依旧给出较高角点分数。',
        },
        brisk: {
          responseValue: 0.85,
          responseLabel: 'AGAST 响应 0.85',
          detectionHint: 'AGAST 的尺度响应和参考点相近，通常会通过后续比值检验。',
        },
      },
    },
  },
  {
    id: 't5',
    label: '干扰',
    x: 6,
    y: 9,
    scale: 1.2,
    orientation: 18,
    descriptors: {
      sift: [0.09, 0.25, 0.55, 0.77, 0.48, 0.22, 0.13, 0.06],
      surf: [0.08, 0.21, 0.47, 0.67, 0.40, 0.18, 0.10, 0.05],
      brief: [1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1],
      orb: [0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0],
      brisk: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1],
    },
    detection: {
      evidence: {
        sift: {
          responseValue: 0.62,
          responseLabel: 'DoG 响应 0.62',
          detectionHint: '这个点也能形成极值，但稳定性和可区分性都弱于真实对应点。',
        },
        surf: {
          responseValue: 0.58,
          responseLabel: 'Hessian 行列式 0.58',
          detectionHint: 'Hessian 响应存在但不够突出，容易成为干扰候选。',
        },
        brief: {
          responseValue: 0,
          responseLabel: '无独立检测',
          detectionHint: 'BRIEF 无法单独排除该点，干扰主要依赖匹配阶段的距离与 ratio test 过滤。',
        },
        orb: {
          responseValue: 8,
          responseLabel: 'FAST 圆周差异 8',
          detectionHint: 'FAST 勉强检测到角点，但圆周差异较弱，更像容易误匹配的候选。',
        },
        brisk: {
          responseValue: 0.61,
          responseLabel: 'AGAST 响应 0.61',
          detectionHint: 'AGAST 响应偏弱，适合作为教学中的干扰点展示。',
        },
      },
    },
  },
];

export function getMethodDistanceType(method: FeatureMethod): DistanceType {
  return method === 'sift' || method === 'surf' ? 'euclidean' : 'hamming';
}

function getDescriptor(keypoint: TeachingKeypoint, method: FeatureMethod): number[] {
  return keypoint.descriptors[method];
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, value, index) => {
      const delta = value - (b[index] ?? 0);
      return sum + delta * delta;
    }, 0)
  );
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
  ratioThreshold: number
): CandidateMatch[] {
  const distanceType = getMethodDistanceType(method);
  const referenceDescriptor = getDescriptor(referenceKeypoint, method);
  const sorted = TARGET_KEYPOINTS
    .map(target => ({
      target,
      distance: descriptorDistance(
        referenceDescriptor,
        getDescriptor(target, method),
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

function findSensitiveKeypointIndex(method: FeatureMethod, ratioThreshold: number): number {
  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < REFERENCE_KEYPOINTS.length; index++) {
    const matches = buildMatchesForKeypoint(REFERENCE_KEYPOINTS[index], method, ratioThreshold);
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
  selectedKeypointIndex: number,
  ratioThreshold: number
): KeypointMatchingDemoResult {
  const distanceType = getMethodDistanceType(method);
  const safeSelectedIndex = Math.max(
    0,
    Math.min(selectedKeypointIndex, REFERENCE_KEYPOINTS.length - 1)
  );
  const selectedKeypoint = REFERENCE_KEYPOINTS[safeSelectedIndex];
  const candidates = buildMatchesForKeypoint(selectedKeypoint, method, ratioThreshold);
  const bestMatch = candidates[0];
  const secondBestMatch = candidates[1];
  const ratio = bestMatch.distance / secondBestMatch.distance;
  const selectedDescriptor = getDescriptor(selectedKeypoint, method);
  const referenceMatches = REFERENCE_KEYPOINTS.map(referenceKeypoint => {
    const matches = buildMatchesForKeypoint(referenceKeypoint, method, ratioThreshold);
    return {
      reference: referenceKeypoint,
      bestMatch: matches[0],
      secondBestMatch: matches[1],
      ratio: matches[0].distance / matches[1].distance,
    };
  });
  const acceptedMatches = referenceMatches
    .map(item => item.bestMatch)
    .filter(match => match.accepted);
  const sensitiveKeypointIndex = findSensitiveKeypointIndex(method, ratioThreshold);
  const selectedDetectionEvidence = selectedKeypoint.detection.evidence[method];
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
    descriptorLength: selectedDescriptor.length,
    selectedDescriptor,
    candidates,
    referenceMatches,
    bestMatch,
    secondBestMatch,
    ratio,
    ratioThreshold,
    acceptedMatches,
    sensitiveKeypointIndex,
    statusText,
    selectedDetectionEvidence,
  };
}
