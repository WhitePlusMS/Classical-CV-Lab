'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ProcessRail,
  SelectParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';

/// 特征方法枚举
type FeatureMethod = 'sift' | 'surf' | 'brief' | 'orb' | 'brisk';

const FEATURE_METHODS: { value: FeatureMethod; label: string }[] = [
  { value: 'sift',  label: 'SIFT' },
  { value: 'surf',  label: 'SURF' },
  { value: 'brief', label: 'BRIEF' },
  { value: 'orb',   label: 'ORB' },
  { value: 'brisk', label: 'BRISK' },
];

/// 距离度量类型
type DistanceType = 'euclidean' | 'hamming';

const DISTANCE_OPTIONS: { value: DistanceType; label: string }[] = [
  { value: 'euclidean', label: '欧氏距离（L2）' },
  { value: 'hamming',   label: '汉明距离' },
];

/// ============================================================
/// 公式 MathML 常量
/// ============================================================

/* 欧氏距离公式 */
const EUCLIDEAN_FORMULA = buildInlineMathML(
  '<mrow><mi>Dis</mi><mo>(</mo><msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><msub><mi>X</mi><mi>j</mi></msub><mo>)</mo>' +
  '<mo>=</mo><msup><mrow><mo>[</mo><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>n</mi></munderover><msup><mrow><mo>(</mo><msub><mi>X</mi><mrow><mi>i</mi><mi>k</mi></mrow></msub><mo>-</mo><msub><mi>X</mi><mrow><mi>j</mi><mi>k</mi></mrow></msub><mo>)</mo></mrow><mn>2</mn></msup><mo>]</mo></mrow><mrow><mn>1</mn><mo>/</mo><mn>2</mn></mrow></msup></mrow>'
);

/* 汉明距离公式 */
const HAMMING_FORMULA = buildInlineMathML(
  '<mrow><mi>d</mi><mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>,</mo><msub><mi>f</mi><mn>2</mn></msub><mo>)</mo>' +
  '<mo>=</mo><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>⊕</mo><msub><mi>f</mi><mn>2</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>)</mo></mrow>'
);

/* BRIEF τ 测试公式 */
const TAU_FORMULA = buildInlineMathML(
  '<mrow><mi>τ</mi><mo>(</mo><mi>p</mi><mo>;</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>:=</mo>' +
  '<mrow><mo>{</mo><mtable>' +
  '<mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mi>p</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>&lt;</mo><mi>p</mi><mo>(</mo><mi>y</mi><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr>' +
  '</mtable></mrow></mrow>'
);

/// ============================================================
/// 对比表数据
/// ============================================================

interface ComparisonRow {
  label: string;
  cells: string[];
}

const TABLE_HEADERS = ['', 'SIFT', 'SURF', 'BRIEF', 'ORB', 'BRISK'];

const TABLE_ROWS: ComparisonRow[] = [
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

/// ============================================================
/// 代码片段
/// ============================================================

const CODE_SNIPPET = `// SIFT 特征点检测与匹配
Ptr<SIFT> siftDetector = SIFT::create();
vector<KeyPoint> kp1, kp2;
Mat des1, des2;
siftDetector->detect(src1, kp1);
siftDetector->detect(src2, kp2);
siftDetector->compute(src1, kp1, des1);
siftDetector->compute(src2, kp2, des2);
BFMatcher matcher(NORM_L2, true);
vector<DMatch> matches;
matcher.match(des1, des2, matches);

// ORB 特征点检测与匹配（二进制描述子使用汉明距离）
Ptr<ORB> orb = ORB::create();
orb->detect(img1, keypoints1);
orb->detect(img2, keypoints2);
orb->compute(img1, keypoints1, descriptors1);
orb->compute(img2, keypoints2, descriptors2);
BFMatcher matcher(NORM_HAMMING, true);
matcher.match(obj_descriptors, scene_descriptors, matches);

// 最近邻比值检验（Lowe's ratio test）
const float RATIO_THRESHOLD = 0.8f;
vector<DMatch> goodMatches;
for (size_t i = 0; i < matches.size(); i++) {
  if (matches[i].distance < RATIO_THRESHOLD * bestMatches[i].distance) {
    goodMatches.push_back(matches[i]);
  }
}`;

/// ============================================================
/// 主页面组件
/// ============================================================

export default function KeypointMatchingPipelinePage() {
  const [method, setMethod] = useState<FeatureMethod>('sift');
  const [distanceType, setDistanceType] = useState<DistanceType>('euclidean');
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });

  const analysisPreview = useMemo(() => (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="mb-2 text-xs font-semibold uppercase text-red-700">1. 提取关键点</div>
            <p className="text-xs leading-5 text-slate-600">
              在图像中检测具有可重复性的显著位置。关键点应能在不同视角、尺度下被重复检测。
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="mb-2 text-xs font-semibold uppercase text-amber-800">2. 附加描述信息</div>
            <p className="text-xs leading-5 text-slate-600">
              为每个关键点构建特征描述子。描述子以向量形式编码关键点周围邻域的局部结构。
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">3. 特征匹配</div>
            <p className="text-xs leading-5 text-slate-600">
              比较两幅图像中特征点描述子的距离，距离最近且满足约束条件的点对建立对应关系。
            </p>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  ), []);

  const stepDetails = useMemo(() => {
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

    return (
      <div className="space-y-6">

        {/* 1. 概述 */}
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">特征点匹配概述</h2>
          <p className="text-xs leading-6 text-slate-600">
            当目标存在旋转或尺度变化时，直接模板匹配容易失效。基于特征点的匹配方法将图像映射为一个局部特征向量集，这些特征向量具有平移、缩放、旋转不变性，同时对光照变化、仿射及投影变换也有一定不变性。
          </p>
          <div className="mt-4">
            <img
              src="/assets/keypoint-matching-pipeline/feature-mapping.jpg"
              alt="特征映射示意图"
              className="w-full max-w-lg rounded-xl object-cover"
            />
            <figcaption className="mt-2 text-xs text-slate-500">
              图像映射为局部特征向量集
            </figcaption>
          </div>
        </TeachingCard>

        {/* 2. 三大步骤 */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">特征点匹配三大步骤</h2>
          <div className="mb-4">
            <img
              src="/assets/keypoint-matching-pipeline/three-step-flow.jpg"
              alt="特征点匹配三大步骤"
              className="w-full max-w-2xl rounded-xl object-cover"
            />
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

        {/* 3. 对比表 */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">特征点方法对比</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            不同特征点方法在提点方式、方向赋值、尺度确定和描述策略上各有特点，决定了各自的应用场景。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  {TABLE_HEADERS.map((h, i) => (
                    <th
                      key={h}
                      className={`border border-slate-300 px-2 py-2 font-semibold text-slate-700 ${
                        i === 0 ? 'text-left' : 'text-center'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="border border-slate-300 px-2 py-2 font-medium text-slate-700">
                      {row.label}
                    </td>
                    {row.cells.map((cell, ci) => {
                      const isSelected =
                        (ci === 0 && method === 'sift') ||
                        (ci === 1 && method === 'surf') ||
                        (ci === 2 && method === 'brief') ||
                        (ci === 3 && method === 'orb') ||
                        (ci === 4 && method === 'brisk');
                      return (
                        <td
                          key={`${row.label}-${ci}`}
                          className={`border border-slate-300 px-2 py-2 text-slate-600 ${
                            isSelected ? 'bg-amber-50 text-amber-800' : ''
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

        {/* 4. 关键点与描述子 */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">关键点与描述子</h2>
          <div className="space-y-3 text-xs leading-6 text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-1 font-semibold text-slate-800">关键点（KeyPoint）</p>
              <p>
                关键点是在图像中具有显著性的位置，如角点、边缘交点、纹理突变处等。关键点应具有可重复检测性，即当图像发生旋转、缩放、光照变化等变换后，同一位置仍能被检测出来。
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-1 font-semibold text-slate-800">描述子（Descriptor）</p>
              <p>
                描述子是对关键点周围局部邻域的结构化编码。它以向量形式表达该点的局部特征。浮点型描述子（如 SIFT 的 128 维向量）可直接计算欧氏距离；二进制描述子（如 BRIEF 的 256 位串）通过汉明距离进行比较。
              </p>
            </div>
          </div>
        </div>

        {/* 5. 匹配距离 */}
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

        {/* 6. 匹配器与错配消除 */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">匹配器与错配消除</h2>
          <div className="space-y-3 text-xs leading-6 text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-1 font-semibold text-slate-800">BFMatcher（Brute-Force Matcher）</p>
              <p>
                暴力匹配器：对第一幅图像中的每个特征描述子，计算到第二幅图像中所有描述子的距离，取距离最小的作为匹配点。构造函数 BFMatcher(int normType=NORM_L2, bool crossCheck=false)，其中 normType 指定距离度量类型，crossCheck 为 true 时只返回双向一致的点对。
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-1 font-semibold text-slate-800">FLANN（Fast Library for Approximate Nearest Neighbors）</p>
              <p>
                最近邻近似匹配器：使用近似算法加速匹配过程，适合大规模特征点集。在某些场景下匹配速度优于 BFMatcher，但匹配结果可能存在近似误差。
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-1 font-semibold text-slate-800">最近邻比值检验（Lowe&apos;s Ratio Test）</p>
              <p>
                消除错配的常用方法：对每个待匹配点，计算其与最近邻和次近邻描述子的距离之比。若比值小于给定阈值（通常取 0.8），则接受该匹配；否则认为是模糊匹配予以剔除。阈值越小，匹配越稳定，但匹配数量越少。
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-1 font-semibold text-slate-800">几何一致性检查</p>
              <p>
                进一步消除错配的方法。利用匹配点对之间的几何约束（如单应矩阵、基础矩阵）过滤不满足几何变换模型的外点。
              </p>
            </div>
          </div>
        </div>

      </div>
    );
  }, [method, distanceType]);

  const handleDirectionMove = useCallback((dx: number, dy: number) => {
    setCurrentPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="特征方法"
        value={method}
        onChange={(value) => setMethod(value as FeatureMethod)}
        options={FEATURE_METHODS}
      />
      <SelectParam
        label="距离度量"
        value={distanceType}
        onChange={(value) => setDistanceType(value as DistanceType)}
        options={DISTANCE_OPTIONS}
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        特征方法选择将高亮对比表中对应列；距离度量切换将更新下方公式卡片的内容。
      </div>
      <TeachingCard>
        <p className="text-xs leading-6 text-slate-700">
          特征点的稳定性取决于提点方法、方向赋值和尺度确定的综合设计。了解各方法的对比有助于在实际任务中合理选型。
        </p>
      </TeachingCard>
    </div>
  );

  return (
    <ConceptLayout
      title="特征点检测与匹配流程"
      subtitle="Keypoint Matching Pipeline - 基于局部特征的目标匹配框架"
      operationLabel="特征点匹配"
      parameterIntro="选择特征方法和距离度量，观察对比表中对应列的差异，学习各方法在不同环节的设计选择。"
      originalImage={null}
      resultImage={null}
      mainVisual={
        <div className="flex flex-col items-center">
          <img
            src="/assets/keypoint-matching-pipeline/three-step-flow.jpg"
            alt="特征点匹配三大步骤"
            className="w-full max-w-2xl rounded-xl object-cover"
          />
          <p className="mt-3 text-xs leading-5 text-slate-500 text-center max-w-xl">
            特征点匹配的整体流程：首先在图像中检测可重复的关键点，然后为每个关键点构建
            描述局部信息的描述子，最后通过比较描述子之间的距离建立特征点之间的匹配关系。
          </p>
        </div>
      }
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'C++', code: CODE_SNIPPET }]} />}
      currentStep={{ x: currentPosition.x, y: currentPosition.y, kernelSize: 1 }}
      singlePageScroll
      imageLabels={{ input: '参考图关键点', output: '匹配结果' }}
      imageHints={{
        input: '当前选择方法与对应参数显示在右侧详情区',
        output: '匹配质量取决于描述子区分度和错配消除方法',
      }}
    />
  );
}
