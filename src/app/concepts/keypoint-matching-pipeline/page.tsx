'use client';

import React, { useMemo, useState, useCallback } from 'react';
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
  buildInlineMathML,
} from '@/components';
import {
  computeKeypointMatchingDemo,
  getRecommendedDistanceType,
  type CandidateMatch,
  type DistanceType,
  type FeatureMethod,
  type KeypointMatchingDemoResult,
  type TeachingKeypoint,
} from '@/lib/algorithms/keypointMatchingPipeline';
import type { GrayscaleImage } from '@/lib/algorithms/types';

const FEATURE_METHODS: { value: FeatureMethod; label: string }[] = [
  { value: 'sift', label: 'SIFT' },
  { value: 'surf', label: 'SURF' },
  { value: 'brief', label: 'BRIEF' },
  { value: 'orb', label: 'ORB' },
  { value: 'brisk', label: 'BRISK' },
];

const DISTANCE_OPTIONS: { value: DistanceType; label: string }[] = [
  { value: 'euclidean', label: '欧氏距离（L2）' },
  { value: 'hamming', label: '汉明距离' },
];

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
      '使用邻域随机抽样点对，对远点对做梯度确定方向',
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
      '贪心法抽取正态分布随机点对，同 BRIEF',
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
  '<mrow><mi>det</mi><mo>(</mo><msub><mi>H</mi><mrow><mi>approx</mi></mrow></msub><mo>)</mo><mo>=</mo><msub><mi>D</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><msub><mi>D</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>-</mo><mo>(</mo><mi>w</mi><msub><mi>D</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><msup><mo>)</mo><mn>2</mn></msup></mrow>'
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

interface MethodFormulaItem {
  label: string;
  mathML: string;
  note: string;
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

const METHOD_PRINCIPLES: Record<FeatureMethod, MethodPrinciple> = {
  sift: {
    title: 'SIFT：尺度空间中的稳定梯度特征',
    definition: 'SIFT 是尺度不变局部特征变换算子，用于在不同大小、方向和亮度条件下提取可重复匹配的局部特征。',
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
      '先看 D = L(kσ) - L(σ)：它只是把“更模糊的图”减去“较少模糊的图”，突出尺度变化明显的位置。',
      '再看 m 和 θ：m 表示边缘强不强，θ 表示边缘朝哪个方向。',
      '128 维描述子不必背公式，只要理解为 4×4 个小区域分别统计 8 个方向梯度。',
    ],
    formulas: [
      { label: 'DoG 差分空间', mathML: SIFT_DOG_FORMULA, note: 'L 是某个尺度下的模糊图，σ 是模糊尺度。两个尺度相减后，局部极值点就是候选关键点。' },
      { label: '梯度方向与幅值', mathML: SIFT_GRADIENT_FORMULA, note: 'Δx、Δy 分别表示水平方向和垂直方向的灰度变化。m 越大，局部边缘越明显；θ 给出主方向。' },
    ],
    strengths: ['尺度和旋转鲁棒性强，适合目标大小和姿态变化明显的场景。', '梯度直方图对局部亮度漂移有一定稳定性。'],
    limits: ['计算量较大，描述子维度高。', '纹理过少或重复纹理过强时仍可能产生误匹配。'],
    descriptorKind: '浮点描述子，典型长度 128',
    recommendedDistance: '欧氏距离或 L2 距离',
  },
  surf: {
    title: 'SURF：用积分图和 Hessian 近似加速',
    definition: 'SURF 是加速鲁棒特征算子，用积分图、盒式滤波器和近似 Hessian 响应快速检测局部显著点。',
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
      '积分图公式只表达一件事：提前累计左上角到当前位置的灰度和，之后求矩形区域会很快。',
      'Hessian 行列式可以理解为“局部亮暗突变强度”，值越突出越像兴趣点。',
      'SURF 的学习重点不是背矩阵，而是理解它用近似滤波和积分图把 SIFT 类思想加速。',
    ],
    formulas: [
      { label: '积分图', mathML: SURF_INTEGRAL_FORMULA, note: 'II(x,y) 表示从图像左上角到 (x,y) 的灰度总和。它让 SURF 能快速计算盒式滤波响应。' },
      { label: '近似 Hessian 行列式', mathML: SURF_HESSIAN_FORMULA, note: 'Dxx、Dyy、Dxy 是三个方向的盒式滤波响应。行列式越突出，该位置越可能是稳定兴趣点。' },
    ],
    strengths: ['速度通常高于 SIFT，适合需要较快局部特征提取的任务。', '64 维描述子比 SIFT 更短，匹配成本更低。'],
    limits: ['盒式滤波是近似计算，细节表达不如完整梯度统计精细。', '在低纹理或重复结构中仍需要后续几何一致性筛选。'],
    descriptorKind: '浮点描述子，典型长度 64',
    recommendedDistance: '欧氏距离或 L2 距离',
  },
  brief: {
    title: 'BRIEF：patch 内点对比较形成二进制串',
    definition: 'BRIEF 是基于局部 patch 灰度点对比较的二进制描述子算子，本身通常不负责检测关键点。',
    purpose: 'BRIEF 用极低成本把关键点邻域编码为二进制串，使描述子匹配可以通过异或和位计数快速完成。',
    coreIdea: '如果两个局部邻域对应同一物理结构，那么多个采样点对的灰度大小关系应当大体一致。BRIEF 直接比较点对灰度，把每次比较写成 0 或 1。',
    operatorSummary: 'BRIEF 的核心是 patch 点对灰度比较，它把局部纹理关系压缩成可快速匹配的二进制串。',
    pipelineStages: [
      { label: '检测', body: 'BRIEF 通常接收外部关键点，不单独完成关键点检测。' },
      { label: '尺度', body: '原始 BRIEF 不显式估计尺度，目标尺度变化明显时稳定性较弱。' },
      { label: '方向', body: '原始 BRIEF 不分配主方向，因此对旋转较敏感。' },
      { label: '描述', body: '在 patch 中选取 N 组点对，比较每组灰度大小，得到 N 位二进制描述子。' },
      { label: '匹配', body: '用汉明距离统计两个二进制串对应位不同的个数，距离越小越相似。' },
    ],
    formulaReading: [
      'τ 测试就是一次判断：patch 里 x 点是否比 y 点更暗。',
      '很多次 τ 测试排成一串 0/1，就是 BRIEF 描述子。',
      '汉明距离只数两个二进制串有多少位不同，因此速度很快。',
    ],
    formulas: [
      { label: 'BRIEF τ 测试', mathML: TAU_FORMULA, note: '每个 τ 测试比较 patch 内两个采样点的灰度关系，并输出一个二进制位。' },
      { label: '汉明距离', mathML: HAMMING_FORMULA, note: '二进制描述子的差异通过异或后统计不同位数得到。' },
    ],
    strengths: ['描述和匹配速度快，适合实时任务。', '二进制串存储成本低，便于硬件和大规模匹配。'],
    limits: ['原始 BRIEF 不具备旋转和尺度不变性。', '点对灰度比较容易受噪声和采样模式影响。'],
    descriptorKind: '二进制描述子，典型长度 256',
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
      { label: '方向', body: '用 Intensity Centroid 计算 patch 灰度质心方向，使描述子具备旋转对齐能力。' },
      { label: '描述', body: '按照主方向旋转 BRIEF 采样点对，再执行二进制灰度比较。' },
      { label: '匹配', body: '生成的二进制描述子使用汉明距离匹配，适合实时目标检测。' },
    ],
    formulaReading: [
      'ORB 的方向来自 patch 的“灰度重心”：亮暗分布偏向哪里，主方向就指向哪里。',
      'm10 更关注水平方向的灰度偏移，m01 更关注垂直方向的灰度偏移。',
      'θ 算出来后，BRIEF 的点对会按这个方向旋转，再进行 0/1 比较。',
    ],
    formulas: [
      { label: '灰度重心统计', mathML: ORB_IMAGE_MOMENT_FORMULA, note: 'I(x,y) 是 patch 中某个像素的灰度。m10 和 m01 分别统计灰度在水平、垂直方向上的偏移。' },
      { label: 'Intensity Centroid 方向', mathML: ORB_CENTROID_FORMULA, note: 'atan2 根据垂直偏移 m01 和水平偏移 m10 得到主方向 θ。' },
    ],
    strengths: ['速度快，适合实时匹配和资源受限场景。', '比原始 BRIEF 更能处理旋转变化。'],
    limits: ['二进制描述能力通常弱于高维梯度描述子。', '尺度变化很大或纹理重复时仍可能产生不稳定匹配。'],
    descriptorKind: '二进制描述子，典型长度 256',
    recommendedDistance: '汉明距离',
  },
  brisk: {
    title: 'BRISK：多尺度关键点与长短点对描述',
    definition: 'BRISK 是 Binary Robust Invariant Scalable Keypoints 算子，使用多尺度关键点检测和二进制点对描述。',
    purpose: 'BRISK 用二进制描述子保持匹配速度，同时通过尺度空间和方向估计提高尺度、旋转与噪声鲁棒性。',
    coreIdea: '局部采样点对按距离分成两类：长距离点对更适合估计整体方向，短距离点对更适合描述局部灰度细节。先确定方向，再用短点对编码，可让二进制描述子更稳定。',
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
      'gx 和 gy 是很多点对方向贡献的总和，可以理解为“总体向右多少、向下多少”。',
      '最终仍然用汉明距离匹配，因为 BRISK 描述子也是二进制串。',
    ],
    formulas: [
      { label: 'BRISK 主方向', mathML: BRISK_DIRECTION_FORMULA, note: 'gijx、gijy 表示单个长距离点对贡献的水平和垂直方向。求和后用 atan2 得到主方向。' },
      { label: '汉明距离', mathML: HAMMING_FORMULA, note: 'BRISK 描述子为二进制串，匹配时统计对应位不同的数量。' },
    ],
    strengths: ['兼顾二进制匹配速度和尺度、旋转鲁棒性。', '512 位描述子能表达更丰富的局部点对关系。'],
    limits: ['描述子长度高于 BRIEF/ORB，匹配成本相应增加。', '采样模式固定，复杂视角变化下仍需几何一致性检查。'],
    descriptorKind: '二进制描述子，典型长度 512',
    recommendedDistance: '汉明距离',
  },
};

const CODE_SNIPPET = `type DistanceType = 'euclidean' | 'hamming';

function matchKeypoint(query, targets, distanceType, ratioThreshold) {
  const candidates = targets
    .map(target => ({
      target,
      distance: distanceType === 'euclidean'
        ? euclideanDistance(query.descriptor, target.descriptor)
        : hammingDistance(query.binaryDescriptor, target.binaryDescriptor),
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

function formatDistance(value: number, distanceType: DistanceType): string {
  return distanceType === 'euclidean' ? value.toFixed(3) : value.toFixed(0);
}

function descriptorPreview(values: number[], distanceType: DistanceType): string {
  if (distanceType === 'hamming') return values.join('');
  return values.map(value => value.toFixed(2)).join(', ');
}

function buildDistanceSubstitutionMathML(
  distanceType: DistanceType,
  distance: number
): string {
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

function PipelineFlowDiagram() {
  const nodes = [
    {
      tone: 'red',
      title: '参考图关键点',
      body: '检测可重复出现的局部显著位置',
    },
    {
      tone: 'amber',
      title: '描述子生成',
      body: '把关键点邻域编码成浮点向量或二进制串',
    },
    {
      tone: 'sky',
      title: '候选距离排序',
      body: '计算到目标图各关键点的距离并找最近邻',
    },
    {
      tone: 'emerald',
      title: '结果筛选',
      body: '通过 ratio test 保留稳定匹配',
    },
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

function MatchStatusSummary({
  demo,
}: {
  demo: KeypointMatchingDemoResult;
}) {
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
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}>
        {demo.bestMatch.accepted ? '当前匹配通过' : '当前匹配拒绝'}
      </div>
      <div className="text-center text-[11px] leading-5 text-slate-500">
        覆盖层曲线：最近邻<br />
        蓝色虚线：次近邻
      </div>
    </div>
  );
}

function KeypointMatchingVisual({
  demo,
  selectedKeypointIndex,
  onReferenceSelect,
}: {
  demo: KeypointMatchingDemoResult;
  selectedKeypointIndex: number;
  onReferenceSelect: (index: number) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">动态关键点匹配演示</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            点击参考图关键点，观察它的局部 patch、描述子、最近邻和 ratio test 结果如何同步变化。
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
            : 'border-amber-200 bg-amber-50 text-amber-800'
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
          onSelect={onReferenceSelect}
        />
        <MatchStatusSummary demo={demo} />
        <KeypointImagePanel
          image={demo.targetImage}
          keypoints={demo.targetKeypoints}
          bestTarget={demo.bestMatch.target}
          secondTarget={demo.secondBestMatch.target}
          title="目标图候选点"
          anchorClassName="keypoint-target-main"
        />
      </div>

      <div className="mt-4">
        <PipelineFlowDiagram />
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

export default function KeypointMatchingPipelinePage() {
  const [method, setMethod] = useState<FeatureMethod>('sift');
  const [distanceType, setDistanceType] = useState<DistanceType>('euclidean');
  const [selectedKeypointIndex, setSelectedKeypointIndex] = useState(0);
  const [ratioThreshold, setRatioThreshold] = useState(0.8);

  const demo = useMemo(
    () => computeKeypointMatchingDemo(
      method,
      distanceType,
      selectedKeypointIndex,
      ratioThreshold
    ),
    [distanceType, method, ratioThreshold, selectedKeypointIndex]
  );

  const handleMethodChange = useCallback((value: string) => {
    const nextMethod = value as FeatureMethod;
    setMethod(nextMethod);
    setDistanceType(getRecommendedDistanceType(nextMethod));
  }, []);

  const handleDirectionMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setSelectedKeypointIndex(prev => {
      if (direction === 'left' || direction === 'up') {
        return Math.max(0, prev - 1);
      }
      return Math.min(demo.referenceKeypoints.length - 1, prev + 1);
    });
  }, [demo.referenceKeypoints.length]);

  const visualOverlayPaths = useMemo<AnchoredOverlayPath[]>(() => {
    const imageWidth = demo.referenceImage[0]?.length ?? 0;
    const imageHeight = demo.referenceImage.length;
    const targetWidth = demo.targetImage[0]?.length ?? 0;
    const targetHeight = demo.targetImage.length;

    return [
      {
        id: 'best-match',
        tone: demo.bestMatch.accepted ? 'emerald' : 'amber',
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
  }, [demo]);

  const visualOverlay = <AnchoredOverlay paths={visualOverlayPaths} />;
  const methodPrinciple = METHOD_PRINCIPLES[method];

  const distanceFormulaCard = distanceType === 'euclidean' ? (
    <FormulaCard
      label="欧氏距离（Euclidean Distance）"
      mathML={EUCLIDEAN_FORMULA}
      note="式中 X_ik 和 X_jk 分别表示待配准图和参考图中第 i 个和第 j 个特征描述子的第 k 个元素，n 表示特征向量的维数。适用于 SIFT、SURF 等浮点型描述子。"
    />
  ) : (
    <FormulaCard
      label="汉明距离（Hamming Distance）"
      mathML={HAMMING_FORMULA}
      note="⊕ 表示异或操作。汉明距离计算两个等长二进制串对应位置不同字符的数目。适用于 ORB、BRIEF、BRISK 等二进制描述子。"
    />
  );

  const overviewIntro = useMemo(() => (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">特征点匹配概述</h2>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        当目标存在旋转或尺度变化时，直接模板匹配容易失效。基于特征点的匹配方法将图像映射为一个局部特征向量集，这些特征向量具有平移、缩放、旋转不变性，同时对光照变化、仿射及投影变换也有一定不变性。
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div>
          <img
            src="/assets/keypoint-matching-pipeline/feature-mapping.jpg"
            alt="特征映射示意图"
            className="w-full max-w-lg rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">
            图像映射为局部特征向量集
          </figcaption>
        </div>
        <div className="border-l-4 border-sky-300 pl-4 text-xs leading-6 text-slate-600">
          <div className="font-semibold text-slate-800">问题来源</div>
          <p className="mt-2">
            模板匹配直接比较固定窗口的像素排列。当目标发生缩放、旋转、局部遮挡或光照变化时，同一物体的像素位置和灰度值会整体改变，固定模板难以保持高相似度。
          </p>
          <p className="mt-2">
            特征点方法不要求整块图像完全一致，而是寻找可重复出现的局部显著位置，并把每个位置附近的结构编码成描述子。匹配问题因此转化为“局部结构是否相似”的比较问题。
          </p>
        </div>
      </div>
    </div>
  ), []);

  const analysisPreview = useMemo(() => (
    <div>
      {overviewIntro}
      <div className="mb-4">
        <KeypointMatchingVisual
          demo={demo}
          selectedKeypointIndex={selectedKeypointIndex}
          onReferenceSelect={setSelectedKeypointIndex}
        />
      </div>
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
              <div className="flex flex-col items-center gap-2">
                <ImageCanvas image={demo.selectedPatch} maxDisplaySize={116} showGrid />
                <div className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs leading-5 text-red-700">
                  {METHOD_LABELS[method]} 先在局部结构稳定的位置提取关键点。
                </div>
              </div>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="center">
            <FlowNode tone="sky">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-sky-700">当前算子</span>
                <span className="text-[11px] text-sky-700">
                  {methodPrinciple.recommendedDistance}
                </span>
              </div>
              <div className="border-l-4 border-sky-300 pl-3 text-xs leading-5 text-slate-600">
                <div className="font-semibold">{methodPrinciple.title}</div>
                <p className="mt-1">{methodPrinciple.operatorSummary}</p>
              </div>
              <div className="mt-3">
                <DescriptorBars values={demo.selectedDescriptor} distanceType={distanceType} />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {methodPrinciple.descriptorKind}；当前演示显示 8 个摘要维度。
              </p>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="end">
            <FlowNode tone="emerald">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-emerald-700">距离比较与筛选</span>
                <span className="font-mono text-[11px] text-emerald-700">
                  ratio {demo.ratio.toFixed(3)}
                </span>
              </div>
              <CandidateList candidates={demo.candidates} distanceType={distanceType} />
              <div className={`mt-2 rounded-xl px-3 py-2 text-xs leading-5 ${
                demo.bestMatch.accepted
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                最近邻 {demo.bestMatch.target.label} 与次近邻 {demo.secondBestMatch.target.label}
                的距离比 {demo.bestMatch.accepted ? '小于等于' : '大于'}阈值。
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    </div>
  ), [demo, distanceType, method, methodPrinciple, overviewIntro, selectedKeypointIndex]);

  const stepDetails = useMemo(() => (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">特征点匹配三大步骤</h2>
        <div className="mb-4">
          <PipelineFlowDiagram />
          <figcaption className="mt-2 text-xs text-slate-500">
            特征点匹配流程：提取关键点 → 附加描述信息 → 特征匹配
          </figcaption>
        </div>
        <ol className="list-inside list-decimal space-y-2 text-xs leading-6 text-slate-600">
          <li>
            <span className="font-semibold text-slate-800">提取关键点：</span>
            从图像中检测出显著的位置点，这些点在不同视角、光照和尺度下应具有可重复检测性。
          </li>
          <li>
            <span className="font-semibold text-slate-800">为关键点附加描述信息：</span>
            对每个关键点，以其为中心取局部邻域，构建能够表达该点局部结构的描述子向量。
          </li>
          <li>
            <span className="font-semibold text-slate-800">特征匹配建立对应关系：</span>
            通过两方特征点（附带上特征向量的关键点）的两两比较，找出相互匹配的若干对特征点，建立图像间的对应关系。
          </li>
        </ol>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">关键概念：点、尺度、方向、描述子、距离</h2>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {[
            ['关键点（KeyPoint）', '关键点是在图像中具有显著性的位置，如角点、边缘交点、纹理突变处等。关键点应具有可重复检测性，即图像发生旋转、缩放或光照变化后，同一物理位置仍有较高概率被检测出来。'],
            ['尺度（Scale）', '尺度表示关键点对应的局部结构大小。尺度估计使算法能够把“同一目标的放大或缩小”看作同一类局部结构。'],
            ['方向（Orientation）', '方向用于建立局部坐标系。将描述子对齐到主方向后，目标旋转时描述子变化会减小。'],
            ['描述子（Descriptor）', '描述子是对关键点周围局部邻域的结构化编码。浮点描述子通常表达梯度统计，二进制描述子通常表达点对灰度比较。'],
            ['距离（Distance）', '距离函数衡量两个描述子的差异。浮点描述子常用欧氏距离，二进制描述子常用汉明距离。'],
          ].map(([title, body]) => (
            <div key={title} className="border-l-2 border-slate-200 pl-3 text-xs leading-6 text-slate-600">
              <p className="mb-1 font-semibold text-slate-800">{title}</p>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">当前算法原理：{methodPrinciple.title}</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">{methodPrinciple.definition}</p>
          </div>
          <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            {methodPrinciple.descriptorKind}
          </div>
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2">
          <div className="border-l-4 border-red-300 pl-4 text-xs leading-6 text-slate-600">
            <div className="font-semibold text-red-700">作用</div>
            <p className="mt-1">{methodPrinciple.purpose}</p>
          </div>
          <div className="border-l-4 border-amber-300 pl-4 text-xs leading-6 text-slate-600">
            <div className="font-semibold text-amber-800">第一性原理</div>
            <p className="mt-1">{methodPrinciple.coreIdea}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            算子流程
          </div>
          <div className="grid gap-x-5 gap-y-3 md:grid-cols-5">
            {methodPrinciple.pipelineStages.map(stage => (
              <div key={stage.label} className="border-t border-slate-200 pt-2 text-xs leading-5 text-slate-600">
                <div className="font-semibold text-slate-800">{stage.label}</div>
                <p className="mt-1">{stage.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            公式读法
          </div>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-6 text-slate-600">
            {methodPrinciple.formulaReading.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {methodPrinciple.formulas.map(item => (
            <FormulaCard
              key={item.label}
              label={item.label}
              mathML={item.mathML}
              note={item.note}
            />
          ))}
        </div>

        <div className="mt-5 grid gap-x-6 gap-y-4 border-t border-slate-200 pt-4 md:grid-cols-2">
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
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">当前匹配为什么成立或被拒绝</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              对选中关键点，先计算它到目标图所有候选点的描述子距离，再用最近邻和次近邻的距离比过滤模糊匹配。
            </p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            demo.bestMatch.accepted
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {demo.selectedKeypoint.label} → {demo.bestMatch.target.label}
            {demo.bestMatch.accepted ? ' 通过' : ' 拒绝'}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="border-l-4 border-red-300 pl-4">
            <div className="text-sm font-semibold text-slate-800">局部 patch</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              参考图关键点 {demo.selectedKeypoint.label} 的邻域，与目标图最近邻 {demo.bestMatch.target.label} 的邻域进行比较。
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <div>
                <ImageCanvas image={demo.selectedPatch} maxDisplaySize={116} showGrid />
                <div className="mt-1 text-center text-[10px] text-red-600">参考 patch</div>
              </div>
              <div>
                <ImageCanvas image={demo.targetPatch} maxDisplaySize={116} showGrid />
                <div className="mt-1 text-center text-[10px] text-emerald-600">目标 patch</div>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-sky-300 pl-4">
            <div className="text-sm font-semibold text-slate-800">描述子摘要</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              当前摘要：{descriptorPreview(demo.selectedDescriptor, distanceType)}
            </p>
            <div className="mt-3">
              <DescriptorBars values={demo.selectedDescriptor} distanceType={distanceType} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormulaCard
            label="当前最近邻距离"
            mathML={buildDistanceSubstitutionMathML(distanceType, demo.bestMatch.distance)}
            note={`最近邻候选点为 ${demo.bestMatch.target.label}，距离为 ${formatDistance(demo.bestMatch.distance, distanceType)}。`}
          />
          <FormulaCard
            label="最近邻比值检验"
            mathML={buildRatioFormulaMathML(demo)}
            note={`次近邻候选点为 ${demo.secondBestMatch.target.label}。阈值越小，保留的匹配越少但更稳定。`}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">匹配距离度量</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          特征描述子之间的相似性通过距离函数来度量。不同的描述子类型适用不同的距离度量方式。
        </p>
        {distanceFormulaCard}
        <div className="mt-4 text-xs leading-6 text-slate-600">
          <p className="mb-2">
            <span className="font-semibold text-slate-800">距离选择原则：</span>
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>SIFT、SURF 等浮点型描述子：优先选择 NORM_L1 或 NORM_L2（欧氏距离）。</li>
            <li>ORB、BRIEF、BRISK 等二进制描述子：优先选择 NORM_HAMMING 或 NORM_HAMMING2。</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">匹配器与错配消除</h2>
        <div className="divide-y divide-slate-200 text-xs leading-6 text-slate-600">
          <div className="py-3">
            <p className="mb-1 font-semibold text-slate-800">BFMatcher（Brute-Force Matcher）</p>
            <p>
              暴力匹配器：对第一幅图像中的每个特征描述子，计算到第二幅图像中所有描述子的距离，取距离最小的作为匹配点。构造函数 BFMatcher(int normType=NORM_L2, bool crossCheck=false)，其中 normType 指定距离度量类型，crossCheck 为 true 时只返回双向一致的点对。
            </p>
          </div>
          <div className="py-3">
            <p className="mb-1 font-semibold text-slate-800">FLANN（Fast Library for Approximate Nearest Neighbors）</p>
            <p>
              最近邻近似匹配器：使用近似算法加速匹配过程，适合大规模特征点集。在某些场景下匹配速度优于 BFMatcher，但匹配结果可能存在近似误差。
            </p>
          </div>
          <div className="py-3">
            <p className="mb-1 font-semibold text-slate-800">最近邻比值检验（Lowe&apos;s Ratio Test）</p>
            <p>
              消除错配的常用方法：对每个待匹配点，计算其与最近邻和次近邻描述子的距离之比。若比值小于给定阈值（通常取 0.8），则接受该匹配；否则认为是模糊匹配予以剔除。阈值越小，匹配越稳定，但匹配数量越少。
            </p>
          </div>
          <div className="py-3">
            <p className="mb-1 font-semibold text-slate-800">几何一致性检查</p>
            <p>
              进一步消除错配的方法。利用匹配点对之间的几何约束（如单应矩阵、基础矩阵）过滤不满足几何变换模型的外点。
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">特征点方法对比</h2>
        <p className="mb-4 text-xs leading-6 text-slate-600">
          不同特征点方法在提点方式、方向赋值、尺度确定和描述策略上各有特点，决定了各自的应用场景。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                {TABLE_HEADERS.map((header, index) => (
                  <th
                    key={header}
                    className={`border border-slate-300 px-2 py-2 font-semibold text-slate-700 ${
                      index === 0 ? 'text-left' : 'text-center'
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map(row => (
                <tr key={row.label}>
                  <td className="border border-slate-300 px-2 py-2 font-medium text-slate-700">
                    {row.label}
                  </td>
                  {row.cells.map((cell, cellIndex) => {
                    const selectedColumn =
                      (cellIndex === 0 && method === 'sift') ||
                      (cellIndex === 1 && method === 'surf') ||
                      (cellIndex === 2 && method === 'brief') ||
                      (cellIndex === 3 && method === 'orb') ||
                      (cellIndex === 4 && method === 'brisk');
                    return (
                      <td
                        key={`${row.label}-${cellIndex}`}
                        className={`border border-slate-300 px-2 py-2 text-slate-600 ${
                          selectedColumn ? 'bg-amber-50 text-amber-800' : ''
                        }`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          表格中被高亮的列为当前参数面板选中的方法，方便学生聚焦对比。
        </p>
      </div>
    </div>
  ), [demo, distanceFormulaCard, distanceType, method, methodPrinciple]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="特征方法"
        value={method}
        onChange={handleMethodChange}
        options={FEATURE_METHODS}
      />
      <SelectParam
        label="距离度量"
        value={distanceType}
        onChange={value => setDistanceType(value as DistanceType)}
        options={DISTANCE_OPTIONS}
      />
      <SliderParam
        label="Ratio 阈值"
        value={ratioThreshold}
        onChange={setRatioThreshold}
        min={0.45}
        max={0.95}
        step={0.05}
      />
      <SliderParam
        label="参考关键点"
        value={selectedKeypointIndex}
        onChange={setSelectedKeypointIndex}
        min={0}
        max={demo.referenceKeypoints.length - 1}
        step={1}
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-3">
        <div className="text-xs font-semibold text-amber-800">关键点选择</div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
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
        当前 {METHOD_LABELS[method]} 使用
        {' '}
        {distanceType === 'euclidean' ? '浮点描述子和欧氏距离' : '二进制描述子和汉明距离'}。
        已通过 ratio test 的匹配数：{demo.acceptedMatches.length}。
      </div>

      <div className={`rounded-2xl border px-3 py-3 text-xs leading-5 ${
        demo.bestMatch.accepted
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}>
        <div className="font-semibold">当前阈值反馈</div>
        <p className="mt-1">{demo.statusText}</p>
        {selectedKeypointIndex !== demo.sensitiveKeypointIndex && (
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

  return (
    <ConceptLayout
      title="特征点检测与匹配流程"
      subtitle="Keypoint Matching Pipeline - 基于局部特征的目标匹配框架"
      operationLabel="特征点匹配"
      parameterIntro="选择特征方法、距离度量、关键点和 ratio 阈值，观察局部 patch、描述子距离与匹配筛选如何联动。"
      originalImage={null}
      resultImage={null}
      mainVisual={<div className="sr-only" aria-hidden />}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: CODE_SNIPPET }]} />}
      currentStep={{
        x: demo.selectedKeypoint.x,
        y: demo.selectedKeypoint.y,
        kernelSize: 1,
      }}
      stepInfo={{
        current: selectedKeypointIndex,
        total: demo.referenceKeypoints.length,
      }}
      currentStepLabel="当前关键点"
      navigationHintText="方向键切换关键点 / 点击参考图关键点跳转"
      onDirectionMove={handleDirectionMove}
      visualOverlay={visualOverlay}
      singlePageScroll
      imageLabels={{ input: '参考图关键点', output: '目标图候选点' }}
      imageHints={{
        input: '点击参考图关键点可切换当前匹配样例',
        output: '绿色为最近邻，蓝色虚线为次近邻',
      }}
    />
  );
}
