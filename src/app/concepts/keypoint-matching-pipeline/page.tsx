'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AnchoredOverlay,
  type AnchoredOverlayPath,
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ImageCanvas,
  ProcessRail,
  SelectParam,
  SliderParam,
  TeachingCard,
  TeachingTerm,
  buildInlineMathML,
} from '@/components';
import {
  computeKeypointMatchingDemo,
  getMethodDistanceType,
  type CandidateMatch,
  type DistanceType,
  type FeatureMethod,
  type KeypointMatchingDemoResult,
  type ReferenceMatchSummary,
  type TeachingKeypoint,
} from '@/lib/algorithms/keypointMatchingPipeline';
import type { GrayscaleImage } from '@/lib/algorithms/types';

type TaskStage = 'intro' | 'detection' | 'description' | 'matching' | 'filtering' | 'compare';

interface StageItem {
  key: TaskStage;
  label: string;
  summary: string;
}

interface MethodFormulaItem {
  label: string;
  mathML: string;
  note: string;
  stage: 'detection' | 'description' | 'matching';
}

interface MethodPipelineStage {
  label: string;
  body: string;
}

interface MethodPrinciple {
  title: string;
  definition: string;
  purpose: string;
  coreIdea: string;
  operatorSummary: string;
  pipelineStages: MethodPipelineStage[];
  formulaReading: string[];
  formulas: MethodFormulaItem[];
  strengths: string[];
  limits: string[];
  descriptorKind: string;
  recommendedDistance: string;
}

const TASK_STAGES: StageItem[] = [
  { key: 'intro', label: '任务', summary: '在两张图间找对应点' },
  { key: 'detection', label: '检测', summary: '什么样的点是好的关键点' },
  { key: 'description', label: '描述', summary: '邻域如何编码成向量' },
  { key: 'matching', label: '匹配', summary: '距离排序找最近邻' },
  { key: 'filtering', label: '筛选', summary: 'ratio test 过滤误匹配' },
  { key: 'compare', label: '对比', summary: 'SIFT/SURF/ORB...差在哪' },
];

const METHOD_KEYS: FeatureMethod[] = ['sift', 'surf', 'brief', 'orb', 'brisk'];

const METHOD_LABELS: Record<FeatureMethod, string> = {
  sift: 'SIFT',
  surf: 'SURF',
  brief: 'BRIEF',
  orb: 'ORB',
  brisk: 'BRISK',
};

const TABLE_HEADERS = ['', 'SIFT', 'SURF', 'BRIEF', 'ORB', 'BRISK'];

const TABLE_ROWS = [
  {
    label: '提点方法',
    cells: [
      'DoG 最值点位置，再通过二次拟合确定位置',
      'Hessian 矩阵的行列式最值',
      '无',
      '使用 FAST 提点，使用 Harris Corner 去除非角点',
      '使用 FAST 或 AGAST 提点',
    ],
  },
  {
    label: '确定方向',
    cells: [
      '特征邻域梯度直方图的最值方向',
      '特征邻域对 Haar wavelet 的最大响应方向',
      '无',
      '使用 Intensity centroid 方法来确定方向',
      '使用预定义采样点对，对远点对做梯度确定方向',
    ],
  },
  {
    label: '确定尺度',
    cells: [
      '建立尺度空间，DoG 最值所在尺度',
      '尺度空间中 Hessian 矩阵行列式最值所在尺度',
      '无',
      '无',
      '尺度空间中 FAST 提点最显著的尺度',
    ],
  },
  {
    label: '描述方法',
    cells: [
      '4×4 sub-region 八方向梯度，128 维',
      '4×4 sub-region Haar 响应四值，64 维',
      '随机点对强度比较，256 位二进制串',
      '贪心法抽取正态分布随机点对（与 BRIEF 纯随机不同）',
      '短距离点对强度匹配，512 位二进制串',
    ],
  },
];

const EUCLIDEAN_FORMULA = buildInlineMathML(
  '<mrow><mi>Dis</mi><mo>(</mo><msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><msub><mi>X</mi><mi>j</mi></msub><mo>)</mo>' +
  '<mo>=</mo><msqrt><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>n</mi></munderover><msup><mrow><mo>(</mo><msub><mi>X</mi><mrow><mi>i</mi><mi>k</mi></mrow></msub><mo>-</mo><msub><mi>X</mi><mrow><mi>j</mi><mi>k</mi></mrow></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow>'
);

const HAMMING_FORMULA = buildInlineMathML(
  '<mrow><mi>d</mi><mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>,</mo><msub><mi>f</mi><mn>2</mn></msub><mo>)</mo>' +
  '<mo>=</mo><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>⊕</mo><msub><mi>f</mi><mn>2</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>)</mo></mrow>'
);

const TAU_FORMULA = buildInlineMathML(
  '<mrow><mi>τ</mi><mo>(</mo><mi>p</mi><mo>;</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>:=</mo>' +
  '<mrow><mo>{</mo><mtable>' +
  '<mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mi>p</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>&lt;</mo><mi>p</mi><mo>(</mo><mi>y</mi><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr>' +
  '</mtable></mrow></mrow>'
);

const SIFT_DOG_FORMULA = buildInlineMathML(
  '<mrow><mi>D</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo><mo>=</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>k</mi><mi>σ</mi><mo>)</mo><mo>-</mo><mi>L</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>,</mo><mi>σ</mi><mo>)</mo></mrow>'
);

const SIFT_GRADIENT_FORMULA = buildInlineMathML(
  '<mrow><mi>m</mi><mo>=</mo><msqrt><msup><mrow><mi>Δ</mi><mi>x</mi></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mi>Δ</mi><mi>y</mi></mrow><mn>2</mn></msup></msqrt><mo>,</mo><mi>θ</mi><mo>=</mo><mi>atan2</mi><mo>(</mo><mi>Δ</mi><mi>y</mi><mo>,</mo><mi>Δ</mi><mi>x</mi><mo>)</mo></mrow>'
);

const SURF_INTEGRAL_FORMULA = buildInlineMathML(
  '<mrow><mi>II</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>=</mo><munderover><mo>∑</mo><mrow><msup><mi>x</mi><mo>′</mo></msup><mo>≤</mo><mi>x</mi></mrow><mrow></mrow></munderover><munderover><mo>∑</mo><mrow><msup><mi>y</mi><mo>′</mo></msup><mo>≤</mo><mi>y</mi></mrow><mrow></mrow></munderover><mi>I</mi><mo>(</mo><msup><mi>x</mi><mo>′</mo></msup><mo>,</mo><msup><mi>y</mi><mo>′</mo></msup><mo>)</mo></mrow>'
);

const SURF_HESSIAN_FORMULA = buildInlineMathML(
  '<mrow><mi>det</mi><mo>(</mo><msub><mi>H</mi><mrow><mi>approx</mi></mrow></msub><mo>)</mo><mo>=</mo><msub><mi>D</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><msub><mi>D</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>-</mo><msup><mrow><mi>w</mi><msub><mi>D</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub></mrow><mn>2</mn></msup></mrow>'
);

const ORB_IMAGE_MOMENT_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>m</mi><mn>10</mn></msub><mo>=</mo><mo>∑</mo><mi>x</mi><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>,</mo><msub><mi>m</mi><mn>01</mn></msub><mo>=</mo><mo>∑</mo><mi>y</mi><mi>I</mi><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo></mrow>'
);

const ORB_CENTROID_FORMULA = buildInlineMathML(
  '<mrow><mi>θ</mi><mo>=</mo><mi>atan2</mi><mo>(</mo><msub><mi>m</mi><mn>01</mn></msub><mo>,</mo><msub><mi>m</mi><mn>10</mn></msub><mo>)</mo></mrow>'
);

const BRISK_DIRECTION_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>g</mi><mi>x</mi></msub><mo>=</mo><mo>∑</mo><msub><mi>g</mi><mrow><mi>i</mi><mi>j</mi><mi>x</mi></mrow></msub><mo>,</mo><msub><mi>g</mi><mi>y</mi></msub><mo>=</mo><mo>∑</mo><msub><mi>g</mi><mrow><mi>i</mi><mi>j</mi><mi>y</mi></mrow></msub><mo>,</mo><mi>θ</mi><mo>=</mo><mi>atan2</mi><mo>(</mo><msub><mi>g</mi><mi>y</mi></msub><mo>,</mo><msub><mi>g</mi><mi>x</mi></msub><mo>)</mo></mrow>'
);

const METHOD_PRINCIPLES: Record<FeatureMethod, MethodPrinciple> = {
  sift: {
    title: 'SIFT：尺度空间中的局部梯度特征',
    definition: 'SIFT 是面向尺度与旋转变化设计的局部特征算子，用于在不同大小、方向和一定亮度变化条件下提取较稳定、可重复匹配的局部特征。',
    purpose: '当同一目标在两幅图像中出现缩放、旋转或局部光照变化时，SIFT 用稳定关键点和梯度描述子建立对应关系。',
    coreIdea: '局部结构若在连续尺度空间中仍表现为极值，并且邻域梯度分布稳定，则该位置更可能在另一幅图像中被再次检测到。SIFT 先找到这类位置，再把局部坐标旋转到主方向，最后用梯度直方图描述邻域形状。',
    operatorSummary: '尺度空间极值检测、主方向归一化和 128 维梯度直方图共同构成 SIFT 的核心算子链。',
    pipelineStages: [
      { label: '检测', body: '构建高斯尺度空间和 DoG 差分空间，在同层与上下层 26 邻域中寻找局部极值点。' },
      { label: '尺度', body: 'DoG 极值所在的尺度作为关键点尺度，使同一目标放大或缩小时仍能找到对应局部结构。' },
      { label: '方向', body: '统计关键点邻域梯度方向直方图，取峰值方向作为主方向，建立旋转归一化坐标。' },
      { label: '描述', body: '把 16×16 邻域分为 4×4 子区域，每个子区域统计 8 个方向梯度，形成 128 维浮点描述子。' },
      { label: '匹配', body: '用欧氏距离比较浮点描述子，再通过最近邻比值检验过滤模糊匹配。' },
    ],
    formulaReading: [
      '先看 D = L(kσ) - L(σ)：它把相邻尺度的平滑结果相减，用来突出在该尺度上亮暗变化更明显的位置。',
      '再看 m 和 θ：m 可以理解为局部灰度变化有多强，θ 表示变化的主要方向。',
      '128 维描述子不必背公式，只要理解为 4×4 个小区域分别统计 8 个方向梯度。',
    ],
    formulas: [
      { label: 'DoG 差分空间', mathML: SIFT_DOG_FORMULA, note: '两个尺度相减后，可把局部极值位置视作候选关键点，再结合后续条件继续筛选。', stage: 'detection' },
      { label: '梯度方向与幅值', mathML: SIFT_GRADIENT_FORMULA, note: '梯度幅值和主方向共同决定局部结构的描述方式。', stage: 'description' },
    ],
    strengths: ['尺度和旋转鲁棒性强，适合目标大小和姿态变化明显的场景。', '梯度直方图对局部亮度漂移有一定稳定性。'],
    limits: ['计算量较大，描述子维度高。', '纹理过少或重复纹理过强时仍可能产生误匹配。'],
    descriptorKind: '浮点描述子（典型实现常见 128 维）',
    recommendedDistance: '欧氏距离或 L2 距离',
  },
  surf: {
    title: 'SURF：用积分图和 Hessian 近似加速',
    definition: 'SURF 是加速型局部特征算子，用积分图、盒式滤波器和近似 Hessian 响应快速检测局部显著位置。',
    purpose: 'SURF 解决 SIFT 计算较重的问题，在保留尺度和旋转鲁棒性的同时提高检测与描述速度。',
    coreIdea: '局部亮暗结构会在二阶导数响应中形成明显极值。SURF 不直接使用昂贵的高斯二阶导数卷积，而是用盒式滤波近似 Hessian，并用积分图快速求矩形区域和。',
    operatorSummary: '积分图快速求和、近似 Hessian 检测和 Haar 响应统计是 SURF 的核心。',
    pipelineStages: [
      { label: '检测', body: '用盒式滤波器近似二阶高斯导数，计算 Hessian 行列式响应并寻找局部最大值。' },
      { label: '尺度', body: '保持图像大小相对稳定，通过放大滤波器尺寸构造尺度空间。' },
      { label: '方向', body: '在关键点周围圆形区域统计 Haar 小波响应，取响应最大的方向作为主方向。' },
      { label: '描述', body: '把 20s×20s 区域划分为 4×4 子块，每块统计 dx、dy、|dx|、|dy|，形成 64 维浮点描述子。' },
      { label: '匹配', body: '使用欧氏距离比较 64 维向量，并用 ratio test 保留区分度高的匹配。' },
    ],
    formulaReading: [
      '积分图只表达一件事：提前累计左上角到当前位置的灰度和，之后求任意矩形区域和会很快。',
      'Hessian 行列式可以粗略理解为局部二阶结构变化是否足够明显；响应越突出，该位置越值得作为候选关键点继续观察。',
      'SURF 的学习重点不是背矩阵，而是理解它如何把 SIFT 类思想加速。',
    ],
    formulas: [
      { label: '积分图', mathML: SURF_INTEGRAL_FORMULA, note: '积分图让 SURF 能快速计算盒式滤波响应。', stage: 'detection' },
      { label: '近似 Hessian 行列式', mathML: SURF_HESSIAN_FORMULA, note: '行列式越突出，该位置越可能成为稳定关键点。', stage: 'detection' },
    ],
    strengths: ['速度通常高于 SIFT，适合需要较快局部特征提取的任务。', '64 维描述子比 SIFT 更短，匹配成本更低。'],
    limits: ['盒式滤波是近似计算，细节表达不如完整梯度统计精细。', '在低纹理或重复结构中仍需要后续几何一致性筛选。'],
    descriptorKind: '浮点描述子（典型实现常见 64 维）',
    recommendedDistance: '欧氏距离或 L2 距离',
  },
  brief: {
    title: 'BRIEF：局部图像块内点对比较形成二进制串',
    definition: 'BRIEF 是基于局部图像块（Patch）灰度点对比较的二进制描述子算子，本身通常不负责检测关键点。',
    purpose: 'BRIEF 用极低成本把关键点邻域编码为二进制串，使描述子匹配可以通过异或和位计数快速完成。',
    coreIdea: '如果两个局部邻域来自相似局部结构，那么多个采样点对的灰度大小关系往往会保持一定一致性。BRIEF 直接比较点对灰度，把每次比较写成 0 或 1。',
    operatorSummary: 'BRIEF 的核心是局部图像块内的点对灰度比较，它把局部结构关系压缩成可快速匹配的二进制串。',
    pipelineStages: [
      { label: '检测', body: 'BRIEF 通常接收外部关键点，不单独完成关键点检测。' },
      { label: '尺度', body: '原始 BRIEF 不显式估计尺度，目标尺度变化明显时稳定性较弱。' },
      { label: '方向', body: '原始 BRIEF 不分配主方向，因此对旋转较敏感。' },
      { label: '描述', body: '在局部图像块中选取 N 组点对，比较每组灰度大小，得到 N 位二进制描述子。' },
      { label: '匹配', body: '用汉明距离统计两个二进制串对应位不同的个数，距离越小越相似。' },
    ],
    formulaReading: [
      'τ 测试就是一次判断：局部图像块里 x 点的灰度是否小于 y 点。',
      '很多次 τ 测试排成一串 0/1，就得到 BRIEF 描述子。',
      '汉明距离只数两个二进制串有多少位不同，因此速度很快。',
    ],
    formulas: [
      { label: 'BRIEF τ 测试', mathML: TAU_FORMULA, note: '每个 τ 测试比较局部图像块内两个采样点的灰度关系，并输出一个二进制位。', stage: 'description' },
      { label: '汉明距离', mathML: HAMMING_FORMULA, note: '二进制描述子的差异通过异或后统计不同位数得到。', stage: 'matching' },
    ],
    strengths: ['描述和匹配速度快，适合实时任务。', '二进制串存储成本低，便于硬件和大规模匹配。'],
    limits: ['原始 BRIEF 不具备旋转和尺度不变性。', '点对灰度比较容易受噪声和采样模式影响。'],
    descriptorKind: '二进制描述子（典型实现常见 256 位）',
    recommendedDistance: '汉明距离',
  },
  orb: {
    title: 'ORB：FAST 关键点 + 旋转 BRIEF',
    definition: 'ORB 是 Oriented FAST and Rotated BRIEF 算子，组合了 FAST 角点检测、Harris 筛选和带方向的 BRIEF 描述。',
    purpose: 'ORB 面向快速局部特征匹配，在保持二进制描述子速度优势的同时补足 BRIEF 的旋转稳定性。',
    coreIdea: '角点可由 FAST 快速找到，但候选点质量不完全稳定；Harris 响应用于筛选更可靠的角点，Intensity Centroid 用灰度质心估计方向，再把 BRIEF 点对旋转到该方向。',
    operatorSummary: 'FAST 提点、Harris 筛选、灰度质心方向和旋转 BRIEF 构成 ORB 的核心流程。',
    pipelineStages: [
      { label: '检测', body: 'FAST 比较候选点周围圆环像素，快速找出亮暗变化明显的角点候选。' },
      { label: '尺度', body: '常用图像金字塔扩展多尺度检测，但基础 ORB 描述子仍偏向快速二进制匹配。' },
      { label: '方向', body: '用 Intensity Centroid 计算局部图像块的灰度质心方向，使描述子具备旋转对齐能力。' },
      { label: '描述', body: '按照主方向旋转 BRIEF 采样点对，再执行二进制灰度比较。' },
      { label: '匹配', body: '生成的二进制描述子使用汉明距离匹配，适合实时目标检测。' },
    ],
    formulaReading: [
      'ORB 的方向来自局部图像块的灰度重心：灰度分布相对偏向哪里，主方向就指向哪里。',
      'm10 更关注水平方向的灰度偏移，m01 更关注垂直方向的灰度偏移。',
      'θ 算出来后，BRIEF 的点对会按这个方向旋转，再进行 0/1 比较。',
    ],
    formulas: [
      { label: '灰度重心统计', mathML: ORB_IMAGE_MOMENT_FORMULA, note: 'm10 和 m01 统计灰度在水平、垂直方向上的偏移，用于后续把 BRIEF 点对旋转到当前关键点主方向。', stage: 'description' },
      { label: 'Intensity Centroid 方向', mathML: ORB_CENTROID_FORMULA, note: 'atan2 根据垂直偏移和水平偏移得到主方向 θ，再据此执行旋转 BRIEF。', stage: 'description' },
    ],
    strengths: ['速度快，适合实时匹配和资源受限场景。', '比原始 BRIEF 更能处理旋转变化。'],
    limits: ['二进制描述能力通常弱于高维梯度描述子。', '尺度变化很大或纹理重复时仍可能产生不稳定匹配。'],
    descriptorKind: '二进制描述子（典型实现常见 256 位）',
    recommendedDistance: '汉明距离',
  },
  brisk: {
    title: 'BRISK：多尺度关键点与长短点对描述',
    definition: 'BRISK 是 Binary Robust Invariant Scalable Keypoints 算子，使用多尺度关键点检测和二进制点对描述。',
    purpose: 'BRISK 用二进制描述子保持匹配速度，同时借助尺度空间与方向估计提升对尺度、旋转和一定噪声扰动的适应性。',
    coreIdea: '局部采样点对按距离分成两类：长距离点对更适合估计整体方向，短距离点对更适合描述局部灰度细节。先确定方向，再用短点对编码，通常能让二进制描述子更稳定。',
    operatorSummary: '多尺度 FAST/AGAST 检测、长距离点对定向和短距离点对编码是 BRISK 的核心。',
    pipelineStages: [
      { label: '检测', body: '在尺度空间中使用 FAST 或 AGAST 检测候选关键点，并通过非极大值抑制确定稳定位置。' },
      { label: '尺度', body: '图像金字塔帮助关键点在不同目标大小下保持可重复检测。' },
      { label: '方向', body: '使用长距离点对估计平均梯度方向，得到关键点主方向。' },
      { label: '描述', body: '将采样模式按主方向归一化后，用短距离点对灰度比较生成 512 位二进制串。' },
      { label: '匹配', body: '使用汉明距离比较二进制串，再结合 ratio test 或几何一致性消除误匹配。' },
    ],
    formulaReading: [
      'BRISK 先用较远的点对估计整体方向，再用较近的点对生成二进制描述子。',
      'gx 和 gy 是很多点对方向贡献的总和，可以把它理解为局部灰度变化在水平和垂直方向上的总体偏向。',
      '最终仍然用汉明距离匹配，因为 BRISK 描述子也是二进制串。',
    ],
    formulas: [
      { label: 'BRISK 主方向', mathML: BRISK_DIRECTION_FORMULA, note: '本页把长点对灰度差沿点对方向投影后求和，再用 atan2 得到主方向，用来演示“长点对定方向”的思想。', stage: 'description' },
      { label: '汉明距离', mathML: HAMMING_FORMULA, note: 'BRISK 描述子为二进制串，匹配时统计对应位不同的数量。', stage: 'matching' },
    ],
    strengths: ['兼顾二进制匹配速度和尺度、旋转鲁棒性。', '512 位描述子能表达更丰富的局部点对关系。'],
    limits: ['描述子长度高于 BRIEF/ORB，匹配成本相应增加。', '采样模式固定，复杂视角变化下仍需几何一致性检查。'],
    descriptorKind: '二进制描述子（典型实现常见 512 位）',
    recommendedDistance: '汉明距离',
  },
};

const CODE_SNIPPET = `type DistanceType = 'euclidean' | 'hamming';
type FeatureMethod = 'sift' | 'surf' | 'brief' | 'orb' | 'brisk';

function getMethodDistanceType(method: FeatureMethod): DistanceType {
  return method === 'sift' || method === 'surf' ? 'euclidean' : 'hamming';
}

function getDescriptor(keypoint, method: FeatureMethod) {
  return keypoint.descriptors[method];
}

function matchKeypoint(referenceKeypoint, targets, method: FeatureMethod, ratioThreshold) {
  const distanceType = getMethodDistanceType(method);
  const referenceDescriptor = getDescriptor(referenceKeypoint, method);
  const candidates = targets
    .map(target => ({
      target,
      distance: descriptorDistance(
        referenceDescriptor,
        getDescriptor(target, method),
        distanceType
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  const best = candidates[0];
  const second = candidates[1];
  const ratio = best.distance / second.distance;

  return {
    best,
    second,
    ratio,
    accepted: ratio <= ratioThreshold,
  };
}`;

function getStageIndex(stage: TaskStage): number {
  return TASK_STAGES.findIndex(item => item.key === stage);
}

function getStageFormulas(
  method: FeatureMethod,
  stage: 'detection' | 'description' | 'matching'
): MethodFormulaItem[] {
  return METHOD_PRINCIPLES[method].formulas.filter(item => item.stage === stage);
}

function formatDistance(value: number, distanceType: DistanceType): string {
  return distanceType === 'euclidean' ? value.toFixed(3) : value.toFixed(0);
}

function descriptorPreview(values: number[], distanceType: DistanceType): string {
  if (distanceType === 'hamming') return values.join('');
  return values.map(value => value.toFixed(2)).join(', ');
}

function buildDistanceSubstitutionMathML(distanceType: DistanceType, distance: number): string {
  if (distanceType === 'euclidean') {
    return buildInlineMathML(
      `<mrow><mi>Dis</mi><mo>(</mo><msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><msub><mi>X</mi><mi>j</mi></msub><mo>)</mo><mo>=</mo><msqrt><mtext>当前 8 维差值平方和</mtext></msqrt><mo>=</mo><mn>${distance.toFixed(3)}</mn></mrow>`
    );
  }

  return buildInlineMathML(
    `<mrow><mi>d</mi><mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>,</mo><msub><mi>f</mi><mn>2</mn></msub><mo>)</mo><mo>=</mo><mtext>异或后不同位数</mtext><mo>=</mo><mn>${distance.toFixed(0)}</mn></mrow>`
  );
}

function buildRatioFormulaMathML(demo: KeypointMatchingDemoResult): string {
  const ratioText = demo.ratio.toFixed(3);
  return buildInlineMathML(
    `<mrow><mi>ratio</mi><mo>=</mo><mfrac><msub><mi>d</mi><mn>1</mn></msub><msub><mi>d</mi><mn>2</mn></msub></mfrac><mo>=</mo><mfrac><mn>${demo.bestMatch.distance.toFixed(3)}</mn><mn>${demo.secondBestMatch.distance.toFixed(3)}</mn></mfrac><mo>=</mo><mn>${ratioText}</mn><mo>${demo.bestMatch.accepted ? '≤' : '>'}</mo><mn>${demo.ratioThreshold.toFixed(2)}</mn></mrow>`
  );
}

function StageStepper({
  activeStage,
  onStageChange,
}: {
  activeStage: TaskStage;
  onStageChange: (stage: TaskStage) => void;
}) {
  const activeIndex = getStageIndex(activeStage);

  return (
    <div className="space-y-2">
      {TASK_STAGES.map((stage, index) => {
        const active = stage.key === activeStage;
        const completed = index < activeIndex;

        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onStageChange(stage.key)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
              active
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : completed
                  ? 'border-slate-200 bg-white text-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                active
                  ? 'bg-emerald-600 text-white'
                  : completed
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-500'
              }`}>
                {index + 1}
              </span>
              <span className="text-sm font-semibold">{stage.label}</span>
            </div>
            <div className="mt-1 pl-8 text-xs leading-5">{stage.summary}</div>
          </button>
        );
      })}
    </div>
  );
}

function PipelineFlowDiagram() {
  const nodes = [
    { tone: 'red', title: '参考图关键点', body: '检测可重复出现的局部显著位置' },
    { tone: 'amber', title: '描述子生成', body: '把关键点邻域编码成浮点向量或二进制串' },
    { tone: 'sky', title: '候选距离排序', body: '计算到目标图各关键点的距离并找最近邻' },
    { tone: 'emerald', title: '结果筛选', body: '通过 ratio test 保留稳定匹配' },
  ] as const;

  const toneClass = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
      {nodes.map((node, index) => (
        <React.Fragment key={node.title}>
          <div className={`rounded-2xl border px-4 py-3 ${toneClass[node.tone]}`}>
            <div className="text-xs font-semibold">{index + 1}. {node.title}</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{node.body}</p>
          </div>
          {index < nodes.length - 1 && (
            <div className="flex items-center justify-center text-slate-300">
              <span className="hidden text-2xl md:block">→</span>
              <span className="text-xl md:hidden">↓</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function DescriptorBars({
  values,
  distanceType,
}: {
  values: number[];
  distanceType: DistanceType;
}) {
  if (distanceType === 'hamming') {
    return (
      <div className="grid grid-cols-8 gap-1">
        {values.map((value, index) => (
          <div
            key={`bit-${index}`}
            className={`flex h-7 items-center justify-center rounded border font-mono text-[11px] font-semibold ${
              value === 1
                ? 'border-sky-300 bg-sky-100 text-sky-800'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            {value}
          </div>
        ))}
      </div>
    );
  }

  const maxValue = Math.max(...values, 0.01);
  return (
    <div className="grid grid-cols-8 gap-1">
      {values.map((value, index) => (
        <div key={`float-${index}`} className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-full items-end rounded bg-slate-100 px-1">
            <div
              className="w-full rounded-t bg-sky-400"
              style={{ height: `${Math.max((value / maxValue) * 100, 8)}%` }}
            />
          </div>
          <span className="font-mono text-[9px] text-slate-500">{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

function KeypointImagePanel({
  image,
  keypoints,
  selectedKeypoint,
  bestTarget,
  secondTarget,
  title,
  anchorClassName,
  onSelect,
}: {
  image: GrayscaleImage;
  keypoints: TeachingKeypoint[];
  selectedKeypoint?: TeachingKeypoint;
  bestTarget?: TeachingKeypoint;
  secondTarget?: TeachingKeypoint;
  title: string;
  anchorClassName: string;
  onSelect?: (index: number) => void;
}) {
  const imageWidth = image[0]?.length ?? 1;
  const imageHeight = image.length || 1;

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {title}
        </span>
        <span className="font-mono text-xs text-slate-400">{imageWidth}×{imageHeight}</span>
      </div>
      <div className="relative inline-block">
        <ImageCanvas
          image={image}
          maxDisplaySize={210}
          showGrid
          containerClassName={anchorClassName}
        />
        <div className="absolute inset-0">
          {keypoints.map((keypoint, index) => {
            const isSelected = selectedKeypoint?.id === keypoint.id;
            const isBest = bestTarget?.id === keypoint.id;
            const isSecond = secondTarget?.id === keypoint.id;
            const className = isSelected || isBest
              ? 'border-white bg-emerald-600 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.28)]'
              : isSecond
                ? 'border-white bg-sky-500 text-white shadow-[0_0_0_3px_rgba(14,165,233,0.22)]'
                : 'border-white bg-slate-700 text-white shadow-[0_0_0_2px_rgba(15,23,42,0.20)]';

            return (
              <button
                key={keypoint.id}
                type="button"
                onClick={() => onSelect?.(index)}
                className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold ${className}`}
                style={{
                  left: `${((keypoint.x + 0.5) / imageWidth) * 100}%`,
                  top: `${((keypoint.y + 0.5) / imageHeight) * 100}%`,
                }}
                title={`${keypoint.label} (${keypoint.x}, ${keypoint.y})`}
              >
                {keypoint.label.replace('′', '')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CandidateList({
  candidates,
  distanceType,
}: {
  candidates: CandidateMatch[];
  distanceType: DistanceType;
}) {
  return (
    <div className="space-y-2">
      {candidates.slice(0, 4).map(candidate => (
        <div
          key={candidate.target.id}
          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
            candidate.rank === 1
              ? candidate.accepted
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
              : candidate.rank === 2
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <span className="font-semibold">#{candidate.rank} {candidate.target.label}</span>
          <span className="font-mono">{formatDistance(candidate.distance, distanceType)}</span>
        </div>
      ))}
    </div>
  );
}

function MatchStatusSummary({ demo }: { demo: KeypointMatchingDemoResult }) {
  return (
    <div className="flex min-w-[10rem] flex-col items-center justify-center gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          ratio test
        </div>
        <div className="mt-1 font-mono text-lg font-bold text-slate-800">
          {demo.ratio.toFixed(3)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          阈值 {demo.ratioThreshold.toFixed(2)}
        </div>
      </div>
      <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        demo.bestMatch.accepted
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}>
        {demo.bestMatch.accepted ? '当前匹配通过' : '当前匹配拒绝'}
      </div>
      <div className="text-center text-[11px] leading-5 text-slate-500">
        绿色实线：最近邻
        <br />
        蓝色虚线：次近邻
      </div>
    </div>
  );
}

function FilteringMatchSummary({
  match,
  distanceType,
  ratioThreshold,
}: {
  match: ReferenceMatchSummary;
  distanceType: DistanceType;
  ratioThreshold: number;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${
      match.bestMatch.accepted
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-red-200 bg-red-50 text-red-700'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">
          {match.reference.label} {'->'} {match.bestMatch.target.label}
        </span>
        <span>{match.bestMatch.accepted ? '通过' : '拒绝'}</span>
      </div>
      <div className="mt-1 text-[11px] leading-5">
        ratio {match.ratio.toFixed(3)} / 阈值 {ratioThreshold.toFixed(2)} / d1 {formatDistance(match.bestMatch.distance, distanceType)}
      </div>
    </div>
  );
}

function isSelectedMethodColumn(cellIndex: number, method: FeatureMethod): boolean {
  return (
    (cellIndex === 0 && method === 'sift') ||
    (cellIndex === 1 && method === 'surf') ||
    (cellIndex === 2 && method === 'brief') ||
    (cellIndex === 3 && method === 'orb') ||
    (cellIndex === 4 && method === 'brisk')
  );
}

function buildMethodOptions() {
  return METHOD_KEYS.map(method => ({
    value: method,
    label: METHOD_LABELS[method],
  }));
}

function buildStageFeedbackText(
  stage: TaskStage,
  demo: KeypointMatchingDemoResult,
  method: FeatureMethod
): string {
  if (stage === 'intro') {
    return '先建立整体任务图景，再进入检测、描述、匹配和筛选阶段逐步观察。';
  }

  if (stage === 'detection') {
    return `${demo.selectedDetectionEvidence.responseLabel}：当前关键点 ${demo.selectedKeypoint.label} 的检测证据已锁定。`;
  }

  if (stage === 'description') {
    return `当前方法使用 ${demo.descriptorLength} 维教学摘要向量演示描述子编码。`;
  }

  if (stage === 'matching' || stage === 'filtering') {
    return demo.statusText;
  }

  return `当前聚焦 ${METHOD_LABELS[method]} 的优势、限制和适用场景。`;
}

export default function KeypointMatchingPipelinePage() {
  const [taskStage, setTaskStage] = useState<TaskStage>('intro');
  const [method, setMethod] = useState<FeatureMethod>('sift');
  const [selectedKeypointIndex, setSelectedKeypointIndex] = useState(0);
  const [ratioThreshold, setRatioThreshold] = useState(0.8);

  const distanceType = useMemo(() => getMethodDistanceType(method), [method]);
  const demo = useMemo(
    () => computeKeypointMatchingDemo(method, selectedKeypointIndex, ratioThreshold),
    [method, ratioThreshold, selectedKeypointIndex]
  );
  const methodPrinciple = METHOD_PRINCIPLES[method];
  const stageIndex = getStageIndex(taskStage);
  const stageFeedbackText = useMemo(
    () => buildStageFeedbackText(taskStage, demo, method),
    [demo, method, taskStage]
  );
  const showSensitiveKeypointJump = taskStage === 'matching' || taskStage === 'filtering';

  const goStage = useCallback((stage: TaskStage) => {
    setTaskStage(stage);
  }, []);

  const goPrevious = useCallback(() => {
    const nextIndex = Math.max(0, stageIndex - 1);
    goStage(TASK_STAGES[nextIndex].key);
  }, [goStage, stageIndex]);

  const goNext = useCallback(() => {
    const nextIndex = Math.min(TASK_STAGES.length - 1, stageIndex + 1);
    goStage(TASK_STAGES[nextIndex].key);
  }, [goStage, stageIndex]);

  const handleMethodChange = useCallback((value: string) => {
    setMethod(value as FeatureMethod);
  }, []);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (taskStage === 'intro' || taskStage === 'compare') return;

    setSelectedKeypointIndex(prev => {
      if (direction === 'left' || direction === 'up') {
        return Math.max(0, prev - 1);
      }
      return Math.min(demo.referenceKeypoints.length - 1, prev + 1);
    });
  }, [demo.referenceKeypoints.length, taskStage]);

  const distanceFormulaCard = distanceType === 'euclidean' ? (
    <FormulaCard
      label="欧氏距离（Euclidean Distance）"
      mathML={EUCLIDEAN_FORMULA}
      note="适用于 SIFT、SURF 这类浮点型描述子。"
      tone="embedded"
    />
  ) : (
    <FormulaCard
      label="汉明距离（Hamming Distance）"
      mathML={HAMMING_FORMULA}
      note="适用于 ORB、BRIEF、BRISK 这类二进制描述子。"
      tone="embedded"
    />
  );

  const mainVisual = useMemo(() => {
    if (taskStage === 'intro') {
      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">特征点匹配任务</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  两张不同视角的图像，通过局部特征建立对应关系。
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                任务输入
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <KeypointImagePanel
                image={demo.referenceImage}
                keypoints={demo.referenceKeypoints}
                title="参考图"
                anchorClassName="keypoint-ref-main"
                onSelect={index => {
                  setSelectedKeypointIndex(index);
                  goStage('detection');
                }}
              />
              <KeypointImagePanel
                image={demo.targetImage}
                keypoints={demo.targetKeypoints}
                title="目标图"
                anchorClassName="keypoint-target-main"
              />
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold">5 个参考关键点</span> A-E
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold">6 个目标关键点</span> A′-E′ + 干扰
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              点击参考图关键点跳转到检测阶段
            </div>
          </div>
        </div>
      );
    }

    if (taskStage === 'detection') {
      if (method === 'brief') {
        return (
          <div className="flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-6 py-16 shadow-sm">
            <div className="max-w-md text-center">
              <div className="mb-2 text-sm font-semibold text-amber-800">BRIEF 例外</div>
              <p className="text-xs leading-5 text-amber-700">
                BRIEF 是纯描述子，不包含关键点检测器。实际使用时需配合 CenSurE、FAST
                等外部检测器提供关键点位置。
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">关键点检测：{METHOD_LABELS[method]}</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  方向键切换关键点 / 点击图像定位。关键点位置固定，证据解释随方法变化。
                </p>
              </div>
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                可点击定位
              </span>
            </div>
            <KeypointImagePanel
              image={demo.referenceImage}
              keypoints={demo.referenceKeypoints}
              selectedKeypoint={demo.selectedKeypoint}
              title="参考图关键点"
              anchorClassName="keypoint-ref-main"
              onSelect={setSelectedKeypointIndex}
            />
          </div>
          <div className="grid gap-3">
            {methodPrinciple.pipelineStages.slice(0, 3).map(stage => (
              <div key={stage.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <div className="font-semibold text-slate-800">{stage.label}</div>
                <p className="mt-1 leading-5 text-slate-600">{stage.body}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (taskStage === 'description') {
      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">局部图像块（Patch）</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  固定同一个关键点，观察换方法后局部结构如何被不同方式编码。
                </p>
              </div>
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                {demo.selectedKeypoint.label}
              </span>
            </div>
            <div className="flex justify-center">
              <ImageCanvas image={demo.selectedPatch} maxDisplaySize={180} showGrid />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">描述子可视化</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {methodPrinciple.descriptorKind}，当前只展示教学摘要维度。
                </p>
              </div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                {demo.descriptorLength} 维
              </span>
            </div>
            <DescriptorBars values={demo.selectedDescriptor} distanceType={distanceType} />
          </div>
        </div>
      );
    }

    if (taskStage === 'matching') {
      return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {taskStage === 'matching' ? '距离排序找最近邻' : 'ratio test 过滤误匹配'}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                点击参考图关键点，观察它的最近邻、次近邻和筛选结果如何同步变化。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Kp #{selectedKeypointIndex + 1}: {demo.selectedKeypoint.label}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600">
              通过匹配数 {demo.acceptedMatches.length} / {demo.referenceKeypoints.length}
            </span>
            <span className={`rounded-full border px-3 py-1 font-semibold ${
              demo.bestMatch.accepted
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {demo.statusText}
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
            <KeypointImagePanel
              image={demo.referenceImage}
              keypoints={demo.referenceKeypoints}
              selectedKeypoint={demo.selectedKeypoint}
              title="参考图关键点"
              anchorClassName="keypoint-ref-main"
              onSelect={setSelectedKeypointIndex}
            />
            <MatchStatusSummary demo={demo} />
            <KeypointImagePanel
              image={demo.targetImage}
              keypoints={demo.targetKeypoints}
              bestTarget={taskStage === 'matching' ? demo.bestMatch.target : undefined}
              secondTarget={taskStage === 'matching' ? demo.secondBestMatch.target : undefined}
              title="目标图候选点"
              anchorClassName="keypoint-target-main"
            />
          </div>
        </div>
      );
    }

    if (taskStage === 'filtering') {
      return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">ratio test 过滤误匹配</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                同时观察全部参考点当前最优匹配，理解阈值变化如何把模糊匹配筛掉。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              当前阈值 {ratioThreshold.toFixed(2)}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              通过 {demo.acceptedMatches.length}
            </span>
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-700">
              拒绝 {demo.referenceMatches.length - demo.acceptedMatches.length}
            </span>
            <span className={`rounded-full border px-3 py-1 font-semibold ${
              demo.bestMatch.accepted
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              当前点 {demo.selectedKeypoint.label}：{demo.statusText}
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem_minmax(0,1fr)] lg:items-start">
            <KeypointImagePanel
              image={demo.referenceImage}
              keypoints={demo.referenceKeypoints}
              selectedKeypoint={demo.selectedKeypoint}
              title="参考图关键点"
              anchorClassName="keypoint-ref-main"
              onSelect={setSelectedKeypointIndex}
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="mb-2 text-xs font-semibold text-slate-800">全部候选筛选结果</div>
              <div className="space-y-2">
                {demo.referenceMatches.map(match => (
                  <FilteringMatchSummary
                    key={match.reference.id}
                    match={match}
                    distanceType={distanceType}
                    ratioThreshold={ratioThreshold}
                  />
                ))}
              </div>
            </div>
            <KeypointImagePanel
              image={demo.targetImage}
              keypoints={demo.targetKeypoints}
              bestTarget={undefined}
              secondTarget={undefined}
              title="目标图候选点"
              anchorClassName="keypoint-target-main"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
        <div className="mb-3 text-xs font-semibold text-slate-800">特征点方法对比</div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                {TABLE_HEADERS.map((header, index) => (
                  <th
                    key={header}
                    className={`border border-slate-300 px-2 py-2 font-semibold text-slate-700 ${index === 0 ? 'text-left' : 'text-center'}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map(row => (
                <tr key={row.label}>
                  <td className="border border-slate-300 px-2 py-2 font-medium text-slate-700">{row.label}</td>
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      key={`${row.label}-${cellIndex}`}
                      className={`border border-slate-300 px-2 py-2 text-slate-600 ${
                        isSelectedMethodColumn(cellIndex, method) ? 'bg-amber-50 text-amber-800' : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [demo, distanceType, goStage, method, methodPrinciple, selectedKeypointIndex, taskStage]);

  const analysisPreview = useMemo(() => {
    if (taskStage === 'intro') {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
          <div className="mb-3 text-xs font-semibold text-slate-800">特征点匹配流程</div>
          <PipelineFlowDiagram />
          <p className="mt-2 text-xs text-slate-500">
            特征点匹配流程：提取关键点 → 生成描述子 → 特征匹配 → 结果筛选
          </p>
        </div>
      );
    }

    if (taskStage === 'detection') {
      if (method === 'brief') {
        return (
          <TeachingCard>
            <div className="mb-2 text-sm font-semibold text-slate-800">BRIEF 例外：无独立检测器</div>
            <p className="text-xs leading-5 text-slate-600">
              BRISK/ORB 用 FAST 检测角点，SIFT 用 DoG 找极值，SURF 用 Hessian 行列式响应。
              BRIEF 依赖外部检测器提供关键点位置，因此检测阶段无独立检测过程可展示。
            </p>
          </TeachingCard>
        );
      }

      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase text-red-700">选中关键点</span>
                  <span className="font-mono text-[11px] text-red-600">
                    ({demo.selectedKeypoint.x}, {demo.selectedKeypoint.y})
                  </span>
                </div>
                <ImageCanvas image={demo.selectedPatch} maxDisplaySize={116} showGrid />
                <div className="mt-2 text-xs leading-5 text-red-700">
                  尺度 {demo.selectedKeypoint.scale.toFixed(1)} / 方向 {demo.selectedKeypoint.orientation}°
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-xs font-semibold uppercase text-amber-800">检测证据</div>
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  <div className="font-semibold">{demo.selectedDetectionEvidence.responseLabel}</div>
                  <p className="mt-1">{demo.selectedDetectionEvidence.detectionHint}</p>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">全部关键点</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {demo.referenceKeypoints.map((keypoint, index) => (
                    <button
                      key={keypoint.id}
                      type="button"
                      onClick={() => setSelectedKeypointIndex(index)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                        index === selectedKeypointIndex
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {keypoint.label}
                    </button>
                  ))}
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (taskStage === 'description') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 text-xs font-semibold uppercase text-red-700">局部图像块（Patch）</div>
                <ImageCanvas image={demo.selectedPatch} maxDisplaySize={116} showGrid />
                <div className="mt-2 text-xs leading-5 text-red-700">
                  关键点 {demo.selectedKeypoint.label}，以同一局部图像块比较不同方法的编码策略。
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="sky">
                <div className="mb-2 text-xs font-semibold uppercase text-sky-700">描述逻辑</div>
                <div className="border-l-4 border-sky-300 pl-3 text-xs leading-5 text-slate-600">
                  <div className="font-semibold">{methodPrinciple.title}</div>
                  <p className="mt-1">{methodPrinciple.pipelineStages[3]?.body}</p>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">描述子摘要</div>
                <div className="font-mono text-xs break-all text-emerald-800">
                  {descriptorPreview(demo.selectedDescriptor.slice(0, 8), distanceType)}
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-600">
                  {methodPrinciple.descriptorKind}；当前演示展示前 8 维摘要。
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (taskStage === 'matching') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 text-xs font-semibold uppercase text-red-700">参考描述子</div>
                <DescriptorBars values={demo.selectedDescriptor} distanceType={distanceType} />
                <div className="mt-2 text-xs leading-5 text-red-700">查询向量：{demo.selectedKeypoint.label}</div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="sky">
                <div className="mb-2 text-xs font-semibold uppercase text-sky-700">距离代入</div>
                <FormulaCard
                  label="当前最近邻距离"
                  mathML={buildDistanceSubstitutionMathML(distanceType, demo.bestMatch.distance)}
                  note={`最近邻候选点为 ${demo.bestMatch.target.label}。`}
                  tone="embedded"
                />
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">候选排序</div>
                <CandidateList candidates={demo.candidates} distanceType={distanceType} />
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (taskStage === 'filtering') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 text-xs font-semibold uppercase text-red-700">最近邻 / 次近邻</div>
                <div className="grid gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-slate-500">d₁</span>{' '}
                    <span className="font-mono font-semibold">{formatDistance(demo.bestMatch.distance, distanceType)}</span>
                    <span className="ml-1 text-slate-400">({demo.bestMatch.target.label})</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-slate-500">d₂</span>{' '}
                    <span className="font-mono font-semibold">{formatDistance(demo.secondBestMatch.distance, distanceType)}</span>
                    <span className="ml-1 text-slate-400">({demo.secondBestMatch.target.label})</span>
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="sky">
                <div className="mb-2 text-xs font-semibold uppercase text-sky-700">最近邻比值检验</div>
                <FormulaCard
                  label="ratio 公式代入"
                  mathML={buildRatioFormulaMathML(demo)}
                  note="Ratio 阈值越小，保留的匹配越少但更稳定。"
                  tone="embedded"
                />
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">判定</div>
                <div className={`rounded-xl px-3 py-3 text-center ${
                  demo.bestMatch.accepted
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-red-50 text-red-700'
                }`}>
                  <div className="text-lg font-bold">{demo.bestMatch.accepted ? '通过' : '拒绝'}</div>
                  <div className="mt-1 text-xs">
                    通过匹配数 {demo.acceptedMatches.length}/{demo.referenceKeypoints.length}
                  </div>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    return (
      <div className="grid gap-3 lg:grid-cols-3">
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">SIFT / SURF 路线</div>
          <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
            高精度浮点描述子 + 欧氏距离
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-600">
            128/64 维梯度描述子，通常对尺度与旋转变化更稳。适合精度优先、目标变化较大的场景。
          </p>
        </TeachingCard>
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">ORB / BRIEF 路线</div>
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            高速二进制描述子 + 汉明距离
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-600">
            256 位二进制串，匹配速度极快。适合实时任务和资源受限场景。BRIEF 需配合外部检测器。
          </p>
        </TeachingCard>
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">BRISK 路线</div>
          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            多尺度二进制描述子 + 汉明距离
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-600">
            512 位二进制串，长点对定方向、短点对编码。通常能较好兼顾尺度/旋转变化适应性与二进制匹配速度。
          </p>
        </TeachingCard>
      </div>
    );
  }, [demo, distanceType, method, methodPrinciple, selectedKeypointIndex, taskStage]);

  const stepDetails = useMemo(() => {
    if (taskStage === 'intro') {
      return (
        <div className="space-y-5">
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">任务拆解</h2>
            <div className="grid gap-3 md:grid-cols-5">
              {['关键点检测', '描述子生成', '距离排序', '比值筛选', '建立对应'].map((label, index) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs text-slate-700">
                  <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 font-semibold text-white">
                    {index + 1}
                  </div>
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-600">
              SIFT、SURF、ORB、BRISK 都包含“检测 + 描述”的完整链路；BRIEF 只负责描述子编码，通常依赖外部检测器提供关键点。
              距离度量和 ratio test 则负责比较描述子并初步过滤不可靠的匹配。
            </p>
          </TeachingCard>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">为什么模板匹配不够用</h2>
            <p className="text-xs leading-6 text-slate-600">
              固定模板比较整块像素，遇到旋转、缩放、光照变化时很容易失效。特征点方法先寻找可重复出现的局部显著位置，
              再为每个位置生成描述子。匹配时比较描述子的相似度，把“整块像素直接硬对齐”改成“先找局部对应，再组合判断整体关系”。
            </p>
          </TeachingCard>
        </div>
      );
    }

    if (taskStage === 'detection') {
      if (method === 'brief') {
        return (
          <div className="space-y-5">
            <TeachingCard>
              <h2 className="mb-3 text-sm font-semibold text-slate-800">什么是好的关键点</h2>
              <p className="text-xs leading-6 text-slate-600">
                关键点是在图像中具有显著性的位置，如角点、边缘交点、纹理突变处等。
                关键点应具有可重复检测性，即图像发生旋转、缩放或光照变化后，同一物理位置仍有较高概率被检测出来。
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full table-auto border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-2 py-2 text-left font-semibold">方法</th>
                      <th className="border border-slate-300 px-2 py-2 font-semibold">检测方式</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METHOD_KEYS.map(currentMethod => (
                      <tr key={currentMethod} className={currentMethod === 'brief' ? 'bg-amber-50' : ''}>
                        <td className="border border-slate-300 px-2 py-2 font-medium">{METHOD_LABELS[currentMethod]}</td>
                        <td className="border border-slate-300 px-2 py-2 text-slate-600">
                          {currentMethod === 'sift' && 'DoG 极值点 + 二次拟合定位'}
                          {currentMethod === 'surf' && 'Hessian 矩阵行列式最值'}
                          {currentMethod === 'brief' && '无独立检测（依赖外部检测器）'}
                          {currentMethod === 'orb' && 'FAST 提点 + Harris 筛选'}
                          {currentMethod === 'brisk' && 'FAST/AGAST 多尺度提点'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TeachingCard>
          </div>
        );
      }

      return (
        <div className="space-y-5">
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">什么是好的关键点</h2>
            <p className="text-xs leading-6 text-slate-600">
              关键点是在图像中具有显著性的位置，如角点、边缘交点、纹理突变处等。关键点应具有可重复检测性，
              即图像发生旋转、缩放或光照变化后，同一物理位置仍有较高概率被检测出来。
            </p>
          </TeachingCard>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">五种方法检测对比</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-2 py-2 text-left font-semibold">方法</th>
                    <th className="border border-slate-300 px-2 py-2 font-semibold">检测方式</th>
                  </tr>
                </thead>
                <tbody>
                  {METHOD_KEYS.map(currentMethod => (
                    <tr key={currentMethod} className={currentMethod === method ? 'bg-amber-50' : ''}>
                      <td className="border border-slate-300 px-2 py-2 font-medium">{METHOD_LABELS[currentMethod]}</td>
                      <td className="border border-slate-300 px-2 py-2 text-slate-600">
                        {currentMethod === 'sift' && 'DoG 极值点 + 二次拟合定位'}
                        {currentMethod === 'surf' && 'Hessian 矩阵行列式最值'}
                        {currentMethod === 'brief' && '无独立检测'}
                        {currentMethod === 'orb' && 'FAST 提点 + Harris 筛选'}
                        {currentMethod === 'brisk' && 'FAST/AGAST 多尺度提点'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TeachingCard>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {METHOD_LABELS[method]}：检测 / 尺度 / 方向
            </h2>
            <div className="grid gap-x-5 gap-y-3 md:grid-cols-3">
              {methodPrinciple.pipelineStages.slice(0, 3).map(stage => (
                <div key={stage.label} className="border-t border-slate-200 pt-2 text-xs leading-5 text-slate-600">
                  <div className="font-semibold text-slate-800">{stage.label}</div>
                  <p className="mt-1">{stage.body}</p>
                </div>
              ))}
            </div>
          </TeachingCard>
        </div>
      );
    }

    if (taskStage === 'description') {
      const stageFormulas = getStageFormulas(method, 'description');

      return (
        <div className="space-y-5">
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">描述子是什么</h2>
            <p className="text-xs leading-6 text-slate-600">
              描述子负责把关键点邻域中的局部结构压缩成可比数值。浮点描述子通常记录梯度统计，
              二进制描述子通常记录点对灰度比较结果。匹配时并不直接比较原始局部图像块，而是比较这些编码后的描述子。
            </p>
          </TeachingCard>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">浮点 vs 二进制描述子</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-6 text-sky-800">
                <div className="font-semibold">浮点描述子</div>
                <p className="mt-1">适合 SIFT / SURF。更强调梯度幅值和方向统计，通常配合欧氏距离比较；当前页面只抽取参与教学计算的摘要维度，不直接铺开展示理论完整长度。</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-6 text-amber-800">
                <div className="font-semibold">二进制描述子</div>
                <p className="mt-1">适合 BRIEF / ORB / BRISK。强调 0/1 点对比较，通常配合汉明距离高速匹配；当前页面展示的是用于当前距离计算的教学摘要位串。</p>
              </div>
            </div>
          </TeachingCard>
          {stageFormulas.length > 0 ? (
            stageFormulas.map(item => (
              <FormulaCard
                key={item.label}
                label={item.label}
                mathML={item.mathML}
                note={item.note}
                tone="embedded"
              />
            ))
          ) : (
            <TeachingCard>
              <h2 className="mb-3 text-sm font-semibold text-slate-800">本阶段公式说明</h2>
              <p className="text-xs leading-6 text-slate-600">本阶段以流程说明为主，无独立公式。以 SURF 为例，本页只展示 4×4 子块统计思想，不在这里展开完整 64 维构造公式。</p>
            </TeachingCard>
          )}
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">当前方法完整流程</h2>
            <div className="grid gap-x-5 gap-y-3 md:grid-cols-5">
              {methodPrinciple.pipelineStages.map(stage => (
                <div key={stage.label} className="border-t border-slate-200 pt-2 text-xs leading-5 text-slate-600">
                  <div className="font-semibold text-slate-800">{stage.label}</div>
                  <p className="mt-1">{stage.body}</p>
                </div>
              ))}
            </div>
          </TeachingCard>
        </div>
      );
    }

    if (taskStage === 'matching') {
      return (
        <div className="space-y-5">
          <FormulaCard
            label="当前最近邻距离"
            mathML={buildDistanceSubstitutionMathML(distanceType, demo.bestMatch.distance)}
            note={`最近邻候选点为 ${demo.bestMatch.target.label}，距离为 ${formatDistance(demo.bestMatch.distance, distanceType)}。`}
            tone="embedded"
          />
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">BFMatcher 与 FLANN</h2>
            <p className="text-xs leading-6 text-slate-600">
              BFMatcher 会对每个查询描述子遍历全部候选点，逐个计算距离，适合教学演示“最近邻是怎么排出来的”。
              FLANN 则用近似最近邻结构加速查找，更适合大规模特征点集；但本页为了把距离排序过程讲清楚，主线仍采用 BFMatcher 式遍历思路。
            </p>
          </TeachingCard>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">距离度量选择原则</h2>
            <p className="text-xs leading-6 text-slate-600">
              浮点描述子强调连续数值差异，因此常用欧氏距离；二进制描述子只关心每一位是否相同，因此常用汉明距离。
              当前 {METHOD_LABELS[method]} 已自动锁定为 {distanceType === 'euclidean' ? '欧氏距离（L2）' : '汉明距离'}。
            </p>
            <div className="mt-4">{distanceFormulaCard}</div>
          </TeachingCard>
        </div>
      );
    }

    if (taskStage === 'filtering') {
      return (
        <div className="space-y-5">
          <FormulaCard
            label="最近邻比值检验"
            mathML={buildRatioFormulaMathML(demo)}
            note={`次近邻候选点为 ${demo.secondBestMatch.target.label}。Ratio 阈值越小，保留的匹配越少但更稳定。`}
            tone="embedded"
          />
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">为什么只看最近邻不够</h2>
            <p className="text-xs leading-6 text-slate-600">
              最近邻只告诉“最像谁”，但不告诉“像得多明显”。如果最近邻和次近邻距离接近，说明描述子区分度不够。
              ratio test 要求最近邻显著优于次近邻，避免把“只是勉强排第一”的候选点过早当成可靠匹配。
            </p>
          </TeachingCard>
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">几何一致性检查</h2>
            <p className="text-xs leading-6 text-slate-600">
              ratio test 只能先过滤描述子层面的模糊匹配。真正进入目标定位或图像拼接时，还要继续用 RANSAC、
              单应矩阵或基础矩阵等几何约束，把不满足整体几何关系的外点进一步剔除。也就是说，ratio test 是“先做第一道筛选”，不是整条匹配链路的终点。
            </p>
          </TeachingCard>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">各方法的优势与限制</h2>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="text-xs leading-6 text-slate-600">
              <div className="font-semibold text-emerald-700">具体作用</div>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {methodPrinciple.strengths.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="text-xs leading-6 text-slate-600">
              <div className="font-semibold text-slate-800">使用限制</div>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {methodPrinciple.limits.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </TeachingCard>
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">选型建议</h2>
          <ul className="list-inside list-disc space-y-2 text-xs leading-6 text-slate-600">
            <li><span className="font-semibold">精度优先</span>：优先考虑 SIFT；若更看重速度且任务仍需要较强局部特征，可再考虑 SURF。</li>
            <li><span className="font-semibold">速度优先</span>：优先选择 ORB；若系统里已有外部关键点检测器，也可用 BRIEF 作为极简描述子方案。</li>
            <li><span className="font-semibold">平衡型</span>：选择 BRISK，通常能在尺度/旋转变化适应性与二进制匹配速度之间取得较平衡的效果。</li>
          </ul>
        </TeachingCard>
      </div>
    );
  }, [demo, distanceFormulaCard, distanceType, method, methodPrinciple, taskStage]);

  const parameters = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
        <div className="text-xs font-semibold text-emerald-800">课堂任务</div>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          为两张不同视角的图像建立局部结构对应关系。
        </p>
      </div>

      <StageStepper activeStage={taskStage} onStageChange={goStage} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={goPrevious}
          disabled={stageIndex === 0}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={stageIndex === TASK_STAGES.length - 1}
          className="rounded-xl border border-emerald-200 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          下一步
        </button>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <SelectParam
          label="特征方法"
          value={method}
          onChange={handleMethodChange}
          options={buildMethodOptions()}
        />
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium">距离度量：</span>
          {distanceType === 'euclidean' ? '欧氏距离（L2）' : '汉明距离'}
          <span className="ml-1 text-slate-400">（{METHOD_LABELS[method]} 默认）</span>
        </div>
        <div className="mt-3">
          <SliderParam
            label="Ratio 阈值"
            value={ratioThreshold}
            onChange={setRatioThreshold}
            min={0.45}
            max={0.95}
            step={0.05}
          />
        </div>
        <div className="mt-3">
          <SliderParam
            label="参考关键点"
            value={selectedKeypointIndex}
            onChange={setSelectedKeypointIndex}
            min={0}
            max={demo.referenceKeypoints.length - 1}
            step={1}
          />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {demo.referenceKeypoints.map((keypoint, index) => (
            <button
              key={keypoint.id}
              type="button"
              onClick={() => setSelectedKeypointIndex(index)}
              className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                selectedKeypointIndex === index
                  ? 'border-amber-300 bg-white text-amber-800'
                  : 'border-amber-200 bg-white/80 text-amber-700'
              }`}
            >
              {keypoint.label}
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-xl bg-white/80 px-2 py-1.5 text-[10px] leading-4 text-slate-600">
          当前点：({demo.selectedKeypoint.x}, {demo.selectedKeypoint.y})，
          方向 {demo.selectedKeypoint.orientation}°，
          尺度 {demo.selectedKeypoint.scale.toFixed(1)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        当前 {METHOD_LABELS[method]} 使用{' '}
        {distanceType === 'euclidean' ? (
          <>
            浮点<TeachingTerm term="描述子" explanation="当前方法输出的是可逐维比较的浮点向量。" className="mx-1" />和
            <TeachingTerm term="欧氏距离" explanation="适合比较 SIFT/SURF 这类浮点向量的整体差异。" className="mx-1" />
          </>
        ) : (
          <>
            二进制<TeachingTerm term="描述子" explanation="当前方法输出的是 0/1 bit 串，适合用位运算快速比较。" className="mx-1" />和
            <TeachingTerm term="汉明距离" explanation="只统计不同 bit 的数量，数量越少越相似。" className="mx-1" />
          </>
        )}
        。已通过 <TeachingTerm term="ratio test" explanation="最近邻距离除以次近邻距离，只有比值小于阈值时才认为最近邻足够明确。" className="mx-1" /> 的匹配数：{demo.acceptedMatches.length}。
      </div>

      <div className={`rounded-2xl border px-3 py-3 text-xs leading-5 ${
        demo.bestMatch.accepted
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}>
        <div className="font-semibold">当前阶段反馈</div>
        <p className="mt-1">{stageFeedbackText}</p>
        {showSensitiveKeypointJump && selectedKeypointIndex !== demo.sensitiveKeypointIndex && (
          <button
            type="button"
            onClick={() => setSelectedKeypointIndex(demo.sensitiveKeypointIndex)}
            className="mt-2 rounded-lg border border-white/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            切到更敏感的关键点 {demo.referenceKeypoints[demo.sensitiveKeypointIndex].label}
          </button>
        )}
      </div>
    </div>
  );

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    if (taskStage !== 'matching' && taskStage !== 'filtering') return [];

    const imageWidth = demo.referenceImage[0]?.length ?? 0;
    const imageHeight = demo.referenceImage.length;
    const targetWidth = demo.targetImage[0]?.length ?? 0;
    const targetHeight = demo.targetImage.length;

    if (taskStage === 'filtering') {
      return demo.referenceMatches.map(match => ({
        id: `filter-${match.reference.id}`,
        tone: match.bestMatch.accepted ? 'emerald' : 'red',
        dashed: !match.bestMatch.accepted,
        straight: true,
        from: {
          kind: 'pixel',
          selector: '.keypoint-ref-main',
          x: match.reference.x,
          y: match.reference.y,
          imageWidth,
          imageHeight,
        },
        to: {
          kind: 'pixel',
          selector: '.keypoint-target-main',
          x: match.bestMatch.target.x,
          y: match.bestMatch.target.y,
          imageWidth: targetWidth,
          imageHeight: targetHeight,
        },
      }));
    }

    return [
      {
        id: 'best-match',
        tone: demo.bestMatch.accepted ? 'emerald' : 'red',
        from: {
          kind: 'pixel',
          selector: '.keypoint-ref-main',
          x: demo.selectedKeypoint.x,
          y: demo.selectedKeypoint.y,
          imageWidth,
          imageHeight,
        },
        to: {
          kind: 'pixel',
          selector: '.keypoint-target-main',
          x: demo.bestMatch.target.x,
          y: demo.bestMatch.target.y,
          imageWidth: targetWidth,
          imageHeight: targetHeight,
        },
      },
      {
        id: 'second-best-match',
        tone: 'sky',
        dashed: true,
        from: {
          kind: 'pixel',
          selector: '.keypoint-ref-main',
          x: demo.selectedKeypoint.x,
          y: demo.selectedKeypoint.y,
          imageWidth,
          imageHeight,
        },
        to: {
          kind: 'pixel',
          selector: '.keypoint-target-main',
          x: demo.secondBestMatch.target.x,
          y: demo.secondBestMatch.target.y,
          imageWidth: targetWidth,
          imageHeight: targetHeight,
        },
      },
    ];
  }, [demo, taskStage]);

  const contentHeader = taskStage === 'intro' ? (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">任务目标</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">在两张图像间建立关键点对应关系</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          检测可重复的关键点，为每个关键点邻域生成描述子，通过距离比较和 ratio test 建立可靠的关键点匹配。
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          <div className="font-semibold">检测</div>
          <div className="mt-1">关键点定位</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700">
          <div className="font-semibold">描述</div>
          <div className="mt-1">邻域生成描述子</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
          <div className="font-semibold">匹配</div>
          <div className="mt-1">距离 + 筛选</div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <ConceptLayout
      title="特征点检测与匹配流程"
      subtitle="Keypoint Matching Pipeline - 基于局部特征的目标匹配框架"
      contentHeader={contentHeader}
      operationLabel="特征点匹配"
      parameterIntro="按任务步骤推进，观察关键点检测、描述子生成、距离匹配和 ratio test 筛选的完整流程。"
      originalImage={null}
      resultImage={null}
      mainVisual={mainVisual}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      visualOverlay={visualOverlayPaths.length > 0 ? <AnchoredOverlay paths={visualOverlayPaths} /> : null}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: CODE_SNIPPET }]} />}
      currentStep={{
        x: demo.selectedKeypoint.x,
        y: demo.selectedKeypoint.y,
        kernelSize: 1,
      }}
      currentStepLabel="当前关键点"
      stepInfo={{
        current: selectedKeypointIndex,
        total: demo.referenceKeypoints.length,
      }}
      onDirectionMove={taskStage !== 'intro' && taskStage !== 'compare' ? handleDirectionMove : undefined}
      navigationHintText={taskStage !== 'intro' && taskStage !== 'compare'
        ? '方向键切换关键点 / 点击参考图关键点跳转'
        : undefined}
      singlePageScroll
    />
  );
}
