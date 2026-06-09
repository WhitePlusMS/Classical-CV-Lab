'use client';

import React, { useState } from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FormulaCard,
  SelectParam,
  TeachingCard,
  buildInlineMathML,
} from '@/components';

const GRAD_HORIZ = buildInlineMathML(
  '<mrow><msub><mi>f</mi><mi>i</mi></msub><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<mfrac><mrow><mi>∂</mi><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo></mrow><mrow><mi>∂</mi><mi>i</mi></mrow></mfrac>' +
  '<mo>=</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>+</mo><mn>1</mn><mo>,</mo><mi>j</mi><mo>)</mo><mo>-</mo>' +
  '<mi>f</mi><mo>(</mo><mi>i</mi><mo>-</mo><mn>1</mn><mo>,</mo><mi>j</mi><mo>)</mo></mrow>'
);

const GRAD_VERT = buildInlineMathML(
  '<mrow><msub><mi>f</mi><mi>j</mi></msub><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<mfrac><mrow><mi>∂</mi><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo></mrow><mrow><mi>∂</mi><mi>j</mi></mrow></mfrac>' +
  '<mo>=</mo><mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>-</mo>' +
  '<mi>f</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>-</mo><mn>1</mn><mo>)</mo></mrow>'
);

const GRAD_MAG = buildInlineMathML(
  '<mrow><mi>M</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<msqrt><mrow><msubsup><mi>f</mi><mi>i</mi><mn>2</mn></msubsup><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>' +
  '<mo>+</mo><msubsup><mi>f</mi><mi>j</mi><mn>2</mn></msubsup><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo></mrow></msqrt></mrow>'
);

const GRAD_ORIENT = buildInlineMathML(
  '<mrow><mi>θ</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<mi>arctan</mi><mfrac><mrow><msub><mi>f</mi><mi>i</mi></msub><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo></mrow>' +
  '<mrow><msub><mi>f</mi><mi>j</mi></msub><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo></mrow></mfrac></mrow>'
);
const NBINS_OPTIONS = [
  { value: '6', label: '6个方向（30°/柱）' },
  { value: '9', label: '9个方向（20°/柱）' },
  { value: '12', label: '12个方向（15°/柱）' },
  { value: '18', label: '18个方向（10°/柱）' },
];

const BLOCK_OPTIONS = [
  { value: '2', label: '2×2 cells' },
  { value: '3', label: '3×3 cells' },
];

const HOG_CODE = [
  '// OpenCV HOGDescriptor 行人检测示例（C++）',
  '#include <opencv2/opencv.hpp>',
  '',
  'cv::HOGDescriptor hog(',
  '  cv::Size(64, 128),  // winSize',
  '  cv::Size(16, 16),   // blockSize',
  '  cv::Size(8, 8),     // blockStride',
  '  cv::Size(8, 8),     // cellSize',
  '  9                    // nbins',
  ');',
  '',
  'hog.setSVMDetector(cv::HOGDescriptor::getDefaultPeopleDetector());',
  '',
  'cv::Mat img = cv::imread("pedestrian.jpg");',
  'std::vector<cv::Rect> found;',
  'hog.detectMultiScale(img, found);',
  '',
  'for (const auto& rect : found) {',
  '  cv::rectangle(img, rect, cv::Scalar(0, 0, 255), 2);',
  '}',
  'cv::imshow("HOG Pedestrian Detection", img);',
  'cv::waitKey(0);',
].join('\n');

export default function HogFeaturePage() {
  const [nbins, setNbins] = useState(9);
  const [cellsPerBlock, setCellsPerBlock] = useState(2);

  const winWidth = 64;
  const winHeight = 128;
  const cellSize = 8;
  const cellsX = winWidth / cellSize;
  const cellsY = winHeight / cellSize;
  const blockSize = cellsPerBlock * cellSize;
  const blockStride = cellSize;
  const blocksX = (cellsX - cellsPerBlock) / 1 + 1;
  const blocksY = (cellsY - cellsPerBlock) / 1 + 1;
  const totalBlocks = blocksX * blocksY;
  const featureDim = totalBlocks * cellsPerBlock * cellsPerBlock * nbins;
  const anglePerBin = 180 / nbins;
  const parameters = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">窗口 / cell 参数</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          检测窗口固定为 64&times;128（行人检测标准），cell 固定为 8&times;8 像素。
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/80 px-3 py-2 text-blue-800">
            <div className="font-semibold">窗口</div>
            <div>64 x 128</div>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2 text-blue-800">
            <div className="font-semibold">cell</div>
            <div>8 x 8</div>
          </div>
        </div>
      </div>
      <SelectParam label="方向数 nbins" value={String(nbins)} onChange={value => setNbins(Number(value))} options={NBINS_OPTIONS} />
      <SelectParam label="block 大小 (cells)" value={String(cellsPerBlock)} onChange={value => setCellsPerBlock(Number(value))} options={BLOCK_OPTIONS} />
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
        <div className="text-[11px] font-semibold text-amber-800">特征向量维度</div>
        <div className="mt-1 text-2xl font-bold text-amber-900">{featureDim.toLocaleString()}</div>
        <p className="mt-1 text-[10px] leading-4 text-amber-700">{blocksX}&times;{blocksY} blocks x {cellsPerBlock}&times;{cellsPerBlock} cells/block x {nbins} bins</p>
      </div>
    </div>
  );

  const stepDetails = (
    <div className="space-y-6">
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">HOG 特征</h2>
        <p className="text-xs leading-6 text-slate-600">
          HOG（Histogram of Oriented Gradient，方向梯度直方图）是一种在计算机视觉中用于
          目标检测的特征描述算子。它通过计算和统计图像局部区域的梯度方向直方图来构成特征。
          HOG 特征结合 SVM 分类器在行人检测中取得了巨大成功。
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          核心思想：目标的局部外形可以通过梯度或边缘的方向密度分布来描述，而无需知道对应的梯度或边缘的确切位置。
        </p>
      </TeachingCard>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（1）梯度计算</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          对图像中每个像素，计算水平方向和垂直方向的梯度，进而求得梯度幅值和方向。
        </p>
        <div className="mb-4 space-y-3">
          <FormulaCard
            label="水平梯度"
            mathML={GRAD_HORIZ}
            note="f_i(i,j) 表示像素点 (i,j) 在水平方向（i 方向）的一阶差分。"
          />
          <FormulaCard
            label="垂直梯度"
            mathML={GRAD_VERT}
            note="f_j(i,j) 表示像素点 (i,j) 在垂直方向（j 方向）的一阶差分。"
          />
          <FormulaCard
            label="梯度幅值"
            mathML={GRAD_MAG}
            note="M(i,j) 为梯度强度，反映该像素处灰度变化的剧烈程度。"
          />
          <FormulaCard
            label="梯度方向"
            mathML={GRAD_ORIENT}
            note="&#x3b8;(i,j) 的取值范围为 0&#x00b0;~180&#x00b0;（未取符号），180&#x00b0; 与 0&#x00b0; 视为同一方向。"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（2）Cell &mdash; Block &mdash; Window 三层结构</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          HOG 特征采用由小到大的分块方式，逐级统计梯度信息，最终形成描述目标区域的特征向量。
        </p>
        <div className="mb-4 space-y-3">
          <TeachingCard>
            <div className="flex items-start gap-4">
              <figure className="w-44 flex-shrink-0">
                <img
                  src="/assets/hog-feature/51fab89fe3c21eb6e0502002d9fe415b235f18ca816ed697b126d07de0470ff6.jpg"
                  alt="Cell 结构"
                  className="w-full rounded-lg object-cover"
                />
                <figcaption className="mt-1 text-[10px] text-slate-500">8&times;8 cell</figcaption>
              </figure>
              <div className="flex-1 space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">Cell（胞元）&mdash; 8&times;8 像素</h3>
                <p className="text-[11px] leading-5 text-slate-600">
                  cell 是 HOG 特征计算的最小单元。每个 cell 包含 64 个像素。
                  对 cell 内所有像素的梯度信息按方向投票，得到该 cell 的方向梯度直方图。
                </p>
              </div>
            </div>
          </TeachingCard>

          <TeachingCard>
            <div className="flex items-start gap-4">
              <figure className="w-44 flex-shrink-0">
                <img
                  src="/assets/hog-feature/2f0ecb6e50bd50fe008a475be7d7361fa6c2045e74132d11d5133cc3c85e24ad.jpg"
                  alt="Block 结构"
                  className="w-full rounded-lg object-cover"
                />
                <figcaption className="mt-1 text-[10px] text-slate-500">Block 滑动</figcaption>
              </figure>
              <div className="flex-1 space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">Block（块）&mdash; {cellsPerBlock}&times;{cellsPerBlock} cells</h3>
                <p className="text-[11px] leading-5 text-slate-600">
                  block 由 {cellsPerBlock}&times;{cellsPerBlock} 个相邻的 cell 组成（大小
                  {blockSize}&times;{blockSize} 像素）。block 在窗口内以 {blockStride} 像素为步长滑动。
                </p>
              </div>
            </div>
          </TeachingCard>

          <TeachingCard>
            <div className="flex items-start gap-4">
              <figure className="w-44 flex-shrink-0">
                <img
                  src="/assets/hog-feature/e9cd01d1b4e487b84b70d020c603c4c9df9a99519669dc507a59e3ab6f06d945.jpg"
                  alt="Window 结构"
                  className="w-full rounded-lg object-cover"
                />
                <figcaption className="mt-1 text-[10px] text-slate-500">检测窗口</figcaption>
              </figure>
              <div className="flex-1 space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">Window（窗口）&mdash; 64&times;128</h3>
                <p className="text-[11px] leading-5 text-slate-600">
                  检测窗口是最终要描述的目标区域。对于行人检测，标准窗口大小为 64&times;128 像素。
                  窗口内共有 8&times;16 = 128 个 cell，构成 {blocksX}&times;{blocksY} = {totalBlocks} 个 block。
                </p>
              </div>
            </div>
          </TeachingCard>

          <figure className="mb-4">
            <img
              src="/assets/hog-feature/32517170209fcbd2136ab4b9160fb61d5a7f078cd82673815993a5d28398bac8.jpg"
              alt="方向梯度直方图"
              className="w-full max-w-md rounded-xl object-cover"
            />
            <figcaption className="mt-2 text-xs text-slate-500">
              block 内 cell 的方向直方图可视化（18 个柱，每个 20 度）
            </figcaption>
          </figure>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（3）方向直方图与特征向量构建</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          梯度方向范围 0&#x00b0;~180&#x00b0;（无符号）被等分为 {nbins} 个区间，
          每个区间跨度为 {anglePerBin}&#x00b0;。每个 cell 的直方图向量长度为 {nbins}。
        </p>
        <TeachingCard>
          <div className="space-y-2 text-xs leading-6 text-slate-600">
            <p><span className="font-semibold text-slate-800">步骤 1：梯度计算</span> &mdash; 对窗口内每个像素计算梯度幅值和方向。</p>
            <p><span className="font-semibold text-slate-800">步骤 2：cell 直方图统计</span> &mdash; 在每个 8&times;8 cell 内，将像素梯度按方向投到 {nbins} 个柱中，幅值作为投票权重。</p>
            <p><span className="font-semibold text-slate-800">步骤 3：block 归一化</span> &mdash; 将 {cellsPerBlock}&times;{cellsPerBlock} 个 cell 串联为 block 向量并做 L2 归一化。</p>
            <p><span className="font-semibold text-slate-800">步骤 4：窗口特征串联</span> &mdash; 将所有 block 向量级联，形成最终的 HOG 特征向量，维度为 {featureDim.toLocaleString()}。</p>
          </div>
        </TeachingCard>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（4）OpenCV HOGDescriptor 参数</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          OpenCV 提供了 <code>HOGDescriptor</code> 类来方便地创建 HOG 描述子。
        </p>
        <figure className="mb-4">
          <img
            src="/assets/hog-feature/d800bc8aa9e513e8b7f87a75236a1e79227b5cb0e9b941f84ddb4409a4bb9771.jpg"
            alt="HOGDescriptor 参数"
            className="w-full max-w-xl rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">OpenCV HOGDescriptor 构造与参数</figcaption>
        </figure>
        <TeachingCard>
          <div className="space-y-2 text-xs leading-6 text-slate-600">
            <p><span className="font-semibold text-slate-800">_winSize</span> &mdash; 检测窗口大小（64&times;128），决定目标区域。</p>
            <p><span className="font-semibold text-slate-800">_blockSize</span> &mdash; block 大小（{blockSize}&times;{blockSize}），需为 cellSize 的整数倍。</p>
            <p><span className="font-semibold text-slate-800">_blockStride</span> &mdash; block 滑动步长（{blockStride}&times;{blockStride}），通常等于 cellSize。</p>
            <p><span className="font-semibold text-slate-800">_cellSize</span> &mdash; cell 大小（8&times;8），HOG 的最小统计单元。</p>
            <p><span className="font-semibold text-slate-800">_nbins</span> &mdash; 方向直方图的柱数（{nbins}），每个柱跨度 {anglePerBin}&#x00b0;。</p>
          </div>
        </TeachingCard>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（5）HOG + SVM 行人检测流程</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          完整的 HOG + SVM 行人检测系统由训练和检测两个阶段组成：
        </p>
        <figure className="mb-4">
          <img
            src="/assets/hog-feature/7f72a6bf3312414f671166926ecf87aca437e7438530b42102fbb59d66000282.jpg"
            alt="HOG 行人检测结果"
            className="w-full max-w-md rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">
            HOG 可视化与行人检测结果
          </figcaption>
        </figure>
        <TeachingCard>
          <div className="space-y-2 text-xs leading-6 text-slate-600">
            <p className="font-semibold text-slate-700">训练阶段：</p>
            <ol className="ml-4 list-inside list-decimal space-y-1">
              <li>收集正样本（行人图像）和负样本（非行人图像），统一缩放至 64&times;128。</li>
              <li>对每张样本图像提取 HOG 特征向量。</li>
              <li>将特征向量和标签输入 SVM 分类器进行训练。</li>
              <li>得到训练好的 SVM 模型。</li>
            </ol>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="font-semibold text-slate-700">检测阶段：</p>
              <ol className="ml-4 list-inside list-decimal space-y-1">
                <li>对输入图像构建图像金字塔。</li>
                <li>通过滑动窗口依次提取每个窗口的 HOG 特征。</li>
                <li>用训练好的 SVM 分类器对窗口进行分类。</li>
                <li>对检测结果进行非极大值抑制（NMS），合并重叠框。</li>
              </ol>
            </div>
          </div>
        </TeachingCard>
        <figure className="mt-4">
          <img
            src="/assets/hog-feature/d0561a7305d60a4114e6984d1c32dc083db79ee7d209616dcfd9d4455d717a9a.jpg"
            alt="HOG 检测效果"
            className="w-full max-w-lg rounded-xl object-cover"
          />
          <figcaption className="mt-2 text-xs text-slate-500">
            基于 HOG + SVM 的行人检测效果示例
          </figcaption>
        </figure>
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="HOG 特征"
      subtitle="Histogram of Oriented Gradient - 方向梯度直方图"
      operationLabel="HOG 特征提取"
      parameterIntro="调节方向数 nbins 和 block 大小，观察 HOG 特征维度的变化。"
      parameters={parameters}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'C++', code: HOG_CODE }]} />}
      originalImage={null}
      resultImage={null}
      singlePageScroll
    />
  );
}
