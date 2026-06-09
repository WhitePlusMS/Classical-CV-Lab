'use client';

import React, { useState, useMemo } from 'react';
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

/* ========================================
   常量定义
   ======================================== */

/** 可选的展示主题 */
type TopicKey = 'overview' | 'features' | 'svm' | 'cascade' | 'sliding';

const TOPIC_OPTIONS: { value: TopicKey; label: string }[] = [
  { value: 'overview', label: '检测流程概览' },
  { value: 'features', label: '特征提取' },
  { value: 'svm', label: 'SVM 分类器' },
  { value: 'cascade', label: '级联分类器' },
  { value: 'sliding', label: '滑动窗口检测' },
];

const IMG = '/assets/classifier-detection-pipeline';

/* ========================================
   公式常量（MathML 链式格式）
   ======================================== */

const SVM_HYPERPLANE = buildInlineMathML(`
  <mrow>
    <mi>w</mi><mo>&#x22C5;</mo><mi>x</mi><mo>+</mo><mi>b</mi><mo>=</mo><mn>0</mn>
  </mrow>
`);

const SVM_DECISION = buildInlineMathML(`
  <mrow>
    <mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo>
    <mi>s</mi><mi>i</mi><mi>g</mi><mi>n</mi><mo>(</mo>
    <mi>w</mi><mo>&#x22C5;</mo><mi>x</mi><mo>+</mo><mi>b</mi>
    <mo>)</mo>
  </mrow>
`);

const SVM_MARGIN = buildInlineMathML(`
  <mrow>
    <mi>m</mi><mi>a</mi><mi>r</mi><mi>g</mi><mi>i</mi><mi>n</mi>
    <mo>=</mo><mfrac><mn>2</mn><mrow><mo>&#x2016;</mo><mi>w</mi><mo>&#x2016;</mo></mrow></mfrac>
  </mrow>
`);

const SVM_KERNEL = buildInlineMathML(`
  <mrow>
    <mi>K</mi><mo>(</mo><msub><mi>x</mi><mi>i</mi></msub><mo>,</mo>
    <msub><mi>x</mi><mi>j</mi></msub><mo>)</mo>
    <mo>=</mo>
    <mi>&#x3C6;</mi><mo>(</mo><msub><mi>x</mi><mi>i</mi></msub><mo>)</mo>
    <mo>&#x22C5;</mo>
    <mi>&#x3C6;</mi><mo>(</mo><msub><mi>x</mi><mi>j</mi></msub><mo>)</mo>
  </mrow>
`);

const SVM_CHAIN_SUB = buildInlineMathML(`
  <mrow>
    <mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo>
    <mo>=</mo>
    <mi>s</mi><mi>i</mi><mi>g</mi><mi>n</mi><mo>(</mo>
    <mi>w</mi><mo>&#x22C5;</mo><mi>x</mi><mo>+</mo><mi>b</mi>
    <mo>)</mo>
    <mo>=</mo>
    <mi>s</mi><mi>i</mi><mi>g</mi><mi>n</mi><mo>(</mo>
    <mo>[</mo><mn>1</mn><mo>,</mo><mo>-</mo><mn>1</mn><mo>]</mo>
    <mo>&#x22C5;</mo>
    <mo>[</mo><mn>2</mn><mo>,</mo><mn>1</mn><mo>]</mo>
    <mo>+</mo><mn>0</mn>
    <mo>)</mo>
    <mo>=</mo>
    <mi>s</mi><mi>i</mi><mi>g</mi><mi>n</mi><mo>(</mo>
    <mn>2</mn><mo>-</mo><mn>1</mn>
    <mo>)</mo>
    <mo>=</mo>
    <mo>+</mo><mn>1</mn>
  </mrow>
`);

const HOG_MAGNITUDE = buildInlineMathML(`
  <mrow>
    <mi>M</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
    <mo>=</mo>
    <msqrt>
      <msubsup><mi>f</mi><mi>i</mi><mn>2</mn></msubsup>
      <mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      <mo>+</mo>
      <msubsup><mi>f</mi><mi>j</mi><mn>2</mn></msubsup>
      <mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
    </msqrt>
  </mrow>
`);

const HOG_THETA = buildInlineMathML(`
  <mrow>
    <mi>&#x3B8;</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
    <mo>=</mo>
    <mi>arctan</mi>
    <mfrac>
      <msub><mi>f</mi><mi>i</mi></msub><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
      <msub><mi>f</mi><mi>j</mi></msub><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo>
    </mfrac>
  </mrow>
`);

const LBP_FORMULA = buildInlineMathML(`
  <mrow>
    <mi>L</mi><mi>B</mi><mi>P</mi><mo>(</mo><msub><mi>P</mi><mi>c</mi></msub><mo>)</mo>
    <mo>=</mo>
    <munderover><mo>&#x2211;</mo><mrow><mi>n</mi><mo>=</mo><mn>0</mn></mrow><mn>7</mn></munderover>
    <mi>s</mi><mo>(</mo><msub><mi>p</mi><mi>n</mi></msub><mo>-</mo><msub><mi>p</mi><mi>c</mi></msub><mo>)</mo>
    <mo>&#x22C5;</mo><msup><mn>2</mn><mi>n</mi></msup>
  </mrow>
`);

const LBP_SIGN = buildInlineMathML(`
  <mrow>
    <mi>s</mi><mo>(</mo><mi>x</mi><mo>)</mo>
    <mo>=</mo>
    <mrow><mo>{</mo>
      <mtable>
        <mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mi>x</mi><mo>&#x2265;</mo><mn>0</mn></mtd></mtr>
        <mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr>
      </mtable>
    </mrow>
  </mrow>
`);

const HAAR_FORMULA = buildInlineMathML(`
  <mrow>
    <mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo>
    <mo>=</mo>
    <munder><mo>&#x2211;</mo><mtext>white</mtext></munder>
    <mi>p</mi><mo>(</mo><mi>x</mi><mo>)</mo>
    <mo>-</mo>
    <munder><mo>&#x2211;</mo><mtext>black</mtext></munder>
    <mi>p</mi><mo>(</mo><mi>x</mi><mo>)</mo>
  </mrow>
`);

const INTEGRAL_FORMULA = buildInlineMathML(`
  <mrow>
    <msub><mi>S</mi><mrow><mi>A</mi><mi>B</mi><mi>C</mi><mi>D</mi></mrow></msub>
    <mo>=</mo>
    <mi>D</mi><mo>-</mo><mi>C</mi><mo>-</mo><mi>B</mi><mo>+</mo><mi>A</mi>
  </mrow>
`);

const OPENCV_SVM_CODE = `// OpenCV SVM 训练与预测典型流程

// 1. 创建 SVM 对象
Ptr<SVM> svm = SVM::create();

// 2. 设置 SVM 类型（C_SVC 支持非线性）
svm->setType(SVM::C_SVC);

// 3. 设置核函数（POLY 多项式核 / RBF 径向基核）
svm->setKernel(SVM::POLY);
// svm->setKernel(SVM::RBF);

// 4. 设置算法终止条件（最大迭代次数 + 精度阈值）
svm->setTermCriteria(
  TermCriteria(TermCriteria::MAX_ITER, 3000, 1e-6)
);

// 5. 训练支持向量机
svm->train(trainDataMat, ROW_SAMPLE, labelsMat);

// 6. 保存训练好的模型
svm->save("svm_model.xml");

// 7. （预测时）导入模型
// Ptr<SVM> svm = SVM::load<SVM>("svm_model.xml");

// 8. 对新样本进行分类预测
float response = svm->predict(testSample);

// 9. 获取支持向量
Mat supportVectors = svm->getSupportVectors();`;

/* ========================================
   页面组件
   ======================================== */

export default function ClassifierDetectionPipelinePage() {
  const [topic, setTopic] = useState<TopicKey>('overview');

  const mainVisual = useMemo(() => {
    if (topic === 'overview') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 text-xs font-semibold text-red-700">样本采集</div>
                <div className="max-w-[10rem] space-y-1 text-[11px] leading-5 text-slate-600">
                  <p>采集正样本（目标）和负样本（背景），构成训练数据集。</p>
                  <p className="mt-2 text-[10px] text-red-500">正例 + 负例</p>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-xs font-semibold text-amber-800">特征提取</div>
                <div className="max-w-[10rem] space-y-1 text-[11px] leading-5 text-slate-600">
                  <p>从每个样本中计算特征向量：HOG、LBP 或 Haar。</p>
                  <p className="mt-2 text-[10px] text-amber-600">HOG / LBP / Haar</p>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-xs font-semibold text-amber-800">分类器训练</div>
                <div className="max-w-[10rem] space-y-1 text-[11px] leading-5 text-slate-600">
                  <p>用特征向量训练分类器（SVM、级联分类器等）。</p>
                  <p className="mt-2 text-[10px] text-amber-600">SVM / Cascade</p>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold text-emerald-700">滑动窗口检测</div>
                <div className="max-w-[10rem] space-y-1 text-[11px] leading-5 text-slate-600">
                  <p>用训练好的分类器逐窗口扫描输入图像，输出检测结果。</p>
                  <p className="mt-2 text-[10px] text-emerald-600">检测框 + 置信度</p>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (topic === 'features') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 text-xs font-semibold text-red-700">输入图像</div>
                <figure className="mt-2">
                  <img
                    src={`${IMG}/51fab89fe3c21eb6e0502002d9fe415b235f18ca816ed697b126d07de0470ff6.jpg`}
                    alt="HOG 输入图像窗口划分"
                    className="w-48 rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-[10px] text-slate-500">
                    图像划分为 cell &rarr; block &rarr; window
                  </figcaption>
                </figure>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-xs font-semibold text-amber-800">特征向量计算</div>
                <div className="max-w-[10rem] space-y-2 text-[11px] leading-5 text-slate-600">
                  <p>HOG：计算梯度方向直方图</p>
                  <p>LBP：比较邻域灰度生成二进制编码</p>
                  <p>Haar：积分图计算矩形区域差值</p>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold text-emerald-700">特征向量输出</div>
                <div className="max-w-[10rem] text-[11px] leading-5 text-slate-600">
                  <p>所有特征级联形成特征向量，作为分类器的输入。</p>
                  <p className="mt-2 font-mono text-[10px] text-emerald-600">
                    维度：数千至数万
                  </p>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (topic === 'svm') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 text-xs font-semibold text-red-700">两类样本</div>
                <figure className="mt-2">
                  <img
                    src={`${IMG}/48d3cf2834681475358da495c813bca46255d7da52a0dc99b7ef1e2b46f10d92.jpg`}
                    alt="两类分类问题"
                    className="w-48 rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-[10px] text-slate-500">
                    红色圆圈与绿色方块
                  </figcaption>
                </figure>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-xs font-semibold text-amber-800">寻找最优分类面</div>
                <div className="max-w-[10rem] space-y-2 text-[11px] leading-5 text-slate-600">
                  <p>众多分类线中，只有使分类间隔最大的那条才是最优的。</p>
                  <figure className="mt-2">
                    <img
                      src={`${IMG}/8fe1382671d6600ca5dd433c2895ed1cfdeac15e37d339652612c9a1d88209a9.jpg`}
                      alt="分类间隔 margin"
                      className="w-48 rounded-xl object-cover"
                    />
                    <figcaption className="mt-1 text-[10px] text-slate-500">
                      H：分类线，H<sub>1</sub>与H<sub>2</sub>间隔为 margin
                    </figcaption>
                  </figure>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold text-emerald-700">最大间隔分类</div>
                <figure className="mt-2">
                  <img
                    src={`${IMG}/a8dcd1161728cd8396d534207745b560e60c51088741e9abf86a542b5c91a77d.jpg`}
                    alt="最大间隔"
                    className="w-48 rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-[10px] text-slate-500">
                    margin 越大，抗干扰能力越强
                  </figcaption>
                </figure>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    if (topic === 'cascade') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red">
                <div className="mb-2 text-xs font-semibold text-red-700">输入窗口</div>
                <div className="max-w-[10rem] text-[11px] leading-5 text-slate-600">
                  <p>滑动窗口从图像中提取候选区域，送入级联分类器。</p>
                </div>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber">
                <div className="mb-2 text-xs font-semibold text-amber-800">多级过滤</div>
                <figure className="mt-2">
                  <img
                    src={`${IMG}/f978beeb7fa614e18b610012281caf842d85b6829aa8c14e8a3518b07a71cf40.jpg`}
                    alt="级联分类器流程"
                    className="w-64 rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-[10px] text-slate-500">
                    前级快速过滤大量负样本，后级逐步精细
                  </figcaption>
                </figure>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald">
                <div className="mb-2 text-xs font-semibold text-emerald-700">检测结果</div>
                <div className="max-w-[10rem] text-[11px] leading-5 text-slate-600">
                  <p>只有通过全部强分类器的窗口才判为目标区域。</p>
                  <p className="mt-2 font-mono text-[10px] text-emerald-600">
                    准确率高
                  </p>
                </div>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    return (
      <ProcessRail>
        <FlowColumns>
          <FlowColumn align="start">
            <FlowNode tone="red">
              <div className="mb-2 text-xs font-semibold text-red-700">输入图像</div>
              <div className="max-w-[10rem] text-[11px] leading-5 text-slate-600">
                <p>输入任意尺寸的待检测图像。</p>
              </div>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="center">
            <FlowNode tone="amber">
              <div className="mb-2 text-xs font-semibold text-amber-800">滑动窗口</div>
              <div className="max-w-[12rem] space-y-2 text-[11px] leading-5 text-slate-600">
                <p>用固定尺寸的窗口在图像上逐行扫描。</p>
                <p>步长（stride）决定窗口移动间隔。</p>
                <p>多尺度：缩放图像金字塔实现多尺寸检测。</p>
              </div>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="end">
            <FlowNode tone="emerald">
              <div className="mb-2 text-xs font-semibold text-emerald-700">分类 + 输出</div>
              <div className="max-w-[10rem] text-[11px] leading-5 text-slate-600">
                <p>每个窗口提取特征后送入分类器。</p>
                <p>分类为正的窗口合并后输出检测框。</p>
              </div>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [topic]);

  const analysisPreview = useMemo(() => {
    if (topic === 'overview') {
      return (
        <TeachingCard>
          <div className="space-y-3 text-xs leading-6 text-slate-600">
            <p>
              基于特征和分类器的同类多目标检测是深度学习时代之前最主流的目标检测方案。
              其核心思想是：利用目标的视觉特征（如梯度方向、纹理、亮度对比）在大量样本上训练分类器，
              然后用训练好的分类器在输入图像上逐窗口扫描，识别目标。
            </p>
            <p>
              该流程包含四个关键环节：<span className="font-semibold text-red-600">样本采集</span>
              &rarr; <span className="font-semibold text-amber-700">特征提取</span>
              &rarr; <span className="font-semibold text-amber-700">分类器训练</span>
              &rarr; <span className="font-semibold text-emerald-600">滑动窗口检测</span>。
              可用特征包括 HOG、LBP、Haar 等；常用分类器包括 SVM、级联分类器、决策树、神经网络等。
            </p>
          </div>
        </TeachingCard>
      );
    }

    if (topic === 'features') {
      return (
        <TeachingCard>
          <div className="space-y-3 text-xs leading-6 text-slate-600">
            <p>
              特征是描述目标外观的数值表达。一个好的特征应能区分目标与背景，同时对光照、尺度、旋转等变化具有鲁棒性。
            </p>
            <ul className="list-inside list-disc space-y-1 pl-2">
              <li><span className="font-semibold text-amber-700">HOG</span>：适合刚性物体（行人），基于梯度方向统计</li>
              <li><span className="font-semibold text-amber-700">LBP</span>：适合纹理丰富的区域，基于邻域二值编码</li>
              <li><span className="font-semibold text-amber-700">Haar</span>：适合人脸检测，基于亮度对比的矩形特征</li>
            </ul>
          </div>
        </TeachingCard>
      );
    }

    if (topic === 'svm') {
      return (
        <TeachingCard>
          <div className="space-y-3 text-xs leading-6 text-slate-600">
            <p>
              支持向量机（SVM）由 Cortes 和 Vapnik 于 1995 年提出，在解决小样本、非线性等分类问题中表现出特有优势。
              SVM 的核心思想是在特征空间中寻找一个使分类间隔最大化的超平面。
            </p>
            <p>
              对于线性不可分的数据，SVM 通过核函数将低维数据映射到高维空间，使其在高维空间中线性可分。
              常用的核函数包括多项式核（POLY）、径向基核（RBF）等。
            </p>
          </div>
        </TeachingCard>
      );
    }

    if (topic === 'cascade') {
      return (
        <TeachingCard>
          <div className="space-y-3 text-xs leading-6 text-slate-600">
            <p>
              级联分类器（Cascade Classifier）由 Viola 和 Jones 提出，最初用于实时人脸检测。
              它将多个强分类器串联成级联结构，前级分类器结构简单（弱分类器数量少），后级逐步精细化。
            </p>
            <p>
              在检测时，输入窗口依次通过每个强分类器。
              前级快速过滤掉大量负样本，只有全部通过所有强分类器的窗口才被判定为目标。
            </p>
          </div>
        </TeachingCard>
      );
    }

    return (
      <TeachingCard>
        <div className="space-y-3 text-xs leading-6 text-slate-600">
          <p>
            滑动窗口检测是经典目标检测中产生候选区域的标准方法。
            其基本操作是：在输入图像上放置一个固定尺寸的窗口，按设定的步长从左到右、从上到下逐位置滑动，
            对每个窗口位置提取特征并送入分类器判断。
          </p>
          <p>
            为检测不同大小的目标，通常构建图像金字塔&mdash;&mdash;将输入图像按比例缩放，
            在每个尺度的图像上执行滑动窗口检测，最后合并所有尺度上的检测结果。
          </p>
        </div>
      </TeachingCard>
    );
  }, [topic]);

  const stepDetails = useMemo(() => {
    if (topic === 'features') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">（1）HOG 特征</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              HOG（方向梯度直方图）通过统计图像局部区域的梯度方向分布来描述目标外观。
              其基本计算单元为 8&times;8 像素的 cell，4 个 cell 组成一个 block，
              整个检测窗口（如 64&times;128）由若干 block 通过滑动覆盖。
            </p>
            <div className="mb-4 space-y-3">
              <FormulaCard
                label="梯度幅值 M(i,j)"
                mathML={HOG_MAGNITUDE}
                note="分别计算水平和垂直方向的一阶差分，再取欧几里得范数。"
              />
              <FormulaCard
                label="梯度方向 &theta;(i,j)"
                mathML={HOG_THETA}
                note="梯度方向范围为 0&deg;～360&deg;（或有符号 0&deg;～180&deg;），nBins=9 时每 20&deg; 一个区间。"
              />
            </div>
            <figure className="mb-4">
              <img
                src={`${IMG}/32517170209fcbd2136ab4b9160fb61d5a7f078cd82673815993a5d28398bac8.jpg`}
                alt="HOG 方向直方图"
                className="w-full max-w-md rounded-xl object-cover"
              />
              <figcaption className="mt-1 text-xs text-slate-500">
                每个 cell 内的梯度方向直方图，18 个柱每个 20&deg;
              </figcaption>
            </figure>
            <p className="text-xs leading-6 text-slate-600">
              所有 cell 的直方图级联成 block 特征向量，所有 block 的特征向量再级联为完整的 HOG 特征向量。
              例如 64&times;128 窗口、8&times;8 cell、2&times;2 block、9 bins 时，特征维度为 7&times;15&times;4&times;9 = 3780。
            </p>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">（2）LBP 特征</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              LBP（局部二值模式）是一种描述图像局部纹理特征的算子。
              它将 3&times;3 邻域中中心像素与周围 8 个像素进行比较，生成一个 8 位二进制编码作为该像素的 LBP 值。
            </p>
            <div className="mb-4 space-y-3">
              <FormulaCard
                label="LBP 编码"
                mathML={LBP_FORMULA}
                note="p_c 为中心像素值，p_n 为邻域像素值。"
              />
              <FormulaCard
                label="比较函数 s(x)"
                mathML={LBP_SIGN}
                note="周围像素大于等于中心像素则记 1，否则记 0。"
              />
            </div>
            <p className="text-xs leading-6 text-slate-600">
              对每个 cell 统计 LBP 值的直方图，再级联所有 cell 的直方图构成整幅图像的 LBP 纹理特征向量。
              归一化处理可增强对光照变化的鲁棒性。
            </p>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">（3）Haar 特征</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              Haar-like 特征通过计算图像中矩形区域间的亮度对比来描述局部特征。
              每种特征由黑色和白色矩形区域组成，特征值为白色区域像素和减去黑色区域像素和。
              常用 Haar 特征包括边缘特征、线特征、点特征和对角线特征。
            </p>
            <div className="mb-4 space-y-3">
              <FormulaCard
                label="Haar 特征值"
                mathML={HAAR_FORMULA}
                note="白色区域与黑色区域的像素值之和的差值即为该 Haar 特征的特征值。"
              />
              <FormulaCard
                label="积分图加速"
                mathML={INTEGRAL_FORMULA}
                note="积分图可在常数时间内快速计算任意矩形区域的像素和。"
              />
            </div>
            <figure className="mb-4">
              <img
                src={`${IMG}/0aad807ba78ab4647a68c5822dee639c68c05d14405601ed2f33a8797fb2a65a.jpg`}
                alt="Haar 边缘特征"
                className="w-full max-w-sm rounded-xl object-cover"
              />
              <figcaption className="mt-1 text-xs text-slate-500">
                边缘特征（Edge feature）：沿 x 方向和 y 方向的亮度突变
              </figcaption>
            </figure>
          </div>
        </div>
      );
    }

    if (topic === 'svm') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">SVM 基本原理</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              SVM 是在两类线性可分情况下，从获得最优分类面问题中提出的。
              最优分类面就是要求分类面不但能将两类正确分开，而且应使分类间隔最大。
            </p>
            <figure className="mb-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1">
                  <img
                    src={`${IMG}/809fdad6a0d9ce3a3e36b20de077bf432736b114b621b9e2ed49c41339820300.jpg`}
                    alt="一个候选分类面"
                    className="w-full max-w-xs rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-center text-xs text-slate-500">一个可能的分类面</figcaption>
                </div>
                <div className="flex-1">
                  <img
                    src={`${IMG}/45137fcc3ca1afae903e0251a3916e70f72130a8fabb9ff0886d9da94613bbd6.jpg`}
                    alt="另一个候选分类面"
                    className="w-full max-w-xs rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-center text-xs text-slate-500">另一个可能的分类面</figcaption>
                </div>
                <div className="flex-1">
                  <img
                    src={`${IMG}/000f4de0ef1a199b4bd4d3ab2d47172f0a7665d46eaea3a44708283a9ac061f6.jpg`}
                    alt="最优分类面选择"
                    className="w-full max-w-xs rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-center text-xs text-slate-500">
                    哪个更好？B<sub>1</sub> 还是 B<sub>2</sub>？
                  </figcaption>
                </div>
              </div>
            </figure>

            <div className="mb-4 space-y-3">
              <FormulaCard
                label="分类超平面"
                mathML={SVM_HYPERPLANE}
                note="w 为法向量，b 为偏置。该平面将特征空间分为两个半空间。"
              />
              <FormulaCard
                label="决策函数"
                mathML={SVM_DECISION}
                note="sign 为正则判定为 +1 类（目标），为负则判定为 -1 类（背景）。"
              />
              <FormulaCard
                label="分类间隔最大化"
                mathML={SVM_MARGIN}
                note="margin 越大，分类面对新样本的泛化能力越强。"
              />
            </div>

            <figure className="mb-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1">
                  <img
                    src={`${IMG}/a8dcd1161728cd8396d534207745b560e60c51088741e9abf86a542b5c91a77d.jpg`}
                    alt="margin 越大越好"
                    className="w-full max-w-xs rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-center text-xs text-slate-500">
                    Margin 越大，抗干扰能力越强
                  </figcaption>
                </div>
                <div className="flex-1">
                  <img
                    src={`${IMG}/48c311edb9c3966852c6688d54d154017a66728b2e08874a7558b2bd5b58c5a8.jpg`}
                    alt="margin 越大越好说明"
                    className="w-full max-w-xs rounded-xl object-cover"
                  />
                  <figcaption className="mt-1 text-center text-xs text-slate-500">
                    Margin 越大，分类面可移动范围更大
                  </figcaption>
                </div>
              </div>
            </figure>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">核映射处理线性不可分</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              对于线性不可分的数据，SVM 通过核函数将数据从低维空间映射到高维空间，
              使得原本在低维空间线性不可分的数据在高维空间中变得线性可分。
            </p>
            <div className="mb-4 flex flex-wrap gap-4">
              <figure className="flex-1">
                <img
                  src={`${IMG}/47e5899680dea200dbde6274214cef7b2427854f35bbe4f88d89811b4fee95e7.jpg`}
                  alt="二维线性不可分"
                  className="w-full max-w-xs rounded-xl object-cover"
                />
                <figcaption className="mt-1 text-center text-xs text-slate-500">二维空间线性不可分</figcaption>
              </figure>
              <figure className="flex-1">
                <img
                  src={`${IMG}/02707f0848d078272b8cbe07b5d70d86e4ba81854dd1b39dfda93c4a1bdc885b.jpg`}
                  alt="三维线性可分"
                  className="w-full max-w-xs rounded-xl object-cover"
                />
                <figcaption className="mt-1 text-center text-xs text-slate-500">三维空间线性可分</figcaption>
              </figure>
            </div>
            <div className="mb-4">
              <FormulaCard
                label="核函数"
                mathML={SVM_KERNEL}
                note="&phi; 为映射函数，将低维数据映射到高维特征空间。核函数避免了显式计算高维空间的内积。"
              />
            </div>
            <p className="text-xs leading-6 text-slate-600">
              常用的核函数包括：线性核（Linear）、多项式核（POLY）、径向基核（RBF / 高斯核）、Sigmoid 核。
              其中 RBF 核是最常用的通用核函数，适用于大多数非线性分类问题。
            </p>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">链式代入示例</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              给定权重向量 w = [1, -1]、偏置 b = 0，对样本点 x = [2, 1]
              （属于红色圆圈类）进行判定：
            </p>
            <FormulaCard
              label="代入决策函数"
              mathML={SVM_CHAIN_SUB}
              note="结果为 +1，判定为红色圆圈类（正类）。如果结果为 -1 则判为绿色方块类（负类）。"
            />
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">OpenCV SVM 参数设置</h2>
            <TeachingCard>
              <ul className="list-inside list-disc space-y-2 text-xs leading-6 text-slate-700">
                <li>
                  <span className="font-semibold">svm-&gt;setType(SVM::C_SVC)</span>：
                  可以处理非线性分割问题，通过惩罚参数 C 控制容错度。
                </li>
                <li>
                  <span className="font-semibold">svm-&gt;setKernel(SVM::POLY)</span>：
                  使用多项式核函数。也可以设置为 SVM::RBF 使用径向基核。
                </li>
                <li>
                  <span className="font-semibold">svm-&gt;setTermCriteria(...)</span>：
                  设置算法终止条件，如最大迭代次数 3000，精度阈值 1e-6。
                </li>
                <li>
                  <span className="font-semibold">svm-&gt;train(trainDataMat, ROW_SAMPLE, labelsMat)</span>：
                  用样本特征矩阵和标签矩阵进行训练。
                </li>
                <li>
                  <span className="font-semibold">svm-&gt;predict(testSample)</span>：
                  对新输入样本进行分类预测，返回预测类别标签。
                </li>
              </ul>
            </TeachingCard>
          </div>
        </div>
      );
    }

    if (topic === 'cascade') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">级联分类器原理</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              级联分类器（Cascade Classifier）的核心思想是通过串联多个由弱分类器提升而成的强分类器，
              实现逐步精细的检测过滤。
            </p>
            <TeachingCard>
              <div className="space-y-2 text-xs leading-6 text-slate-700">
                <p><span className="font-semibold">关键特点：</span></p>
                <ol className="list-inside list-decimal space-y-2">
                  <li><span className="font-semibold">前级简单</span>：前面的强分类器弱分类器数量少，快速过滤大量负窗口。</li>
                  <li><span className="font-semibold">后级复杂</span>：后面的强分类器包含更多弱分类器，只在可能为目标的位置精细判断。</li>
                  <li><span className="font-semibold">串联通过</span>：输入窗口必须按顺序通过每一级分类器，任一级拒绝则立即丢弃。</li>
                  <li><span className="font-semibold">最终判决</span>：只有全部通过所有级的窗口才被判定为目标区域。</li>
                </ol>
              </div>
            </TeachingCard>
            <figure className="mb-4 mt-4">
              <img
                src={`${IMG}/f978beeb7fa614e18b610012281caf842d85b6829aa8c14e8a3518b07a71cf40.jpg`}
                alt="级联分类器流程"
                className="w-full max-w-2xl rounded-xl object-cover"
              />
              <figcaption className="mt-1 text-xs text-slate-500">
                级联分类器流程：输入窗口依次通过各级强分类器，全部通过则判为目标
              </figcaption>
            </figure>
          </div>
        </div>
      );
    }

    if (topic === 'sliding') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">滑动窗口检测</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              滑动窗口是经典目标检测中产生候选区域的基本方法。其操作过程如下：
            </p>
            <TeachingCard>
              <div className="space-y-2 text-xs leading-6 text-slate-700">
                <p><span className="font-semibold">操作步骤：</span></p>
                <ol className="list-inside list-decimal space-y-2">
                  <li>设定窗口尺寸，在输入图像上从左上角开始放置。</li>
                  <li>按水平步长向右移动，到达右边界后按垂直步长向下换行。</li>
                  <li>对每个窗口位置提取特征向量（HOG / LBP / Haar）。</li>
                  <li>将特征向量送入分类器，得到该窗口的分类结果。</li>
                  <li>构建图像金字塔，在每个尺度重复上述过程，实现多尺度检测。</li>
                  <li>合并所有正窗口，用非极大值抑制（NMS）去除重复框。</li>
                </ol>
              </div>
            </TeachingCard>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">基于特征和分类器的目标检测流程</h2>
          <p className="mb-3 text-xs leading-6 text-slate-600">
            基于特征和分类器的同类多目标检测通过以下四个步骤实现目标的自动识别与定位。
          </p>

          <div className="mb-4 border-l-4 border-red-300 pl-4">
            <h3 className="mb-2 text-xs font-semibold text-red-700">1. 样本采集</h3>
            <p className="text-xs leading-6 text-slate-600">
              收集包含待检测目标的正样本和不包含目标的负样本，统一缩放到固定尺寸。
              正样本数量通常需要数千至数万张，涵盖目标的各种姿态、光照和背景条件。
            </p>
          </div>

          <div className="mb-4 border-l-4 border-amber-300 pl-4">
            <h3 className="mb-2 text-xs font-semibold text-amber-700">2. 特征提取</h3>
            <p className="text-xs leading-6 text-slate-600">
              对每个样本计算特征向量。HOG 特征基于梯度方向统计，LBP 基于邻域纹理编码，
              Haar 基于亮度对比。特征向量是连接原始图像和分类器的桥梁。
            </p>
          </div>

          <div className="mb-4 border-l-4 border-amber-300 pl-4">
            <h3 className="mb-2 text-xs font-semibold text-amber-700">3. 分类器训练</h3>
            <p className="text-xs leading-6 text-slate-600">
              使用正负样本的特征向量训练分类器。SVM 寻找最大间隔分类超平面，
              级联分类器串联多个强分类器逐步过滤。
            </p>
          </div>

          <div className="mb-4 border-l-4 border-emerald-300 pl-4">
            <h3 className="mb-2 text-xs font-semibold text-emerald-700">4. 滑动窗口检测</h3>
            <p className="text-xs leading-6 text-slate-600">
              在输入图像上逐位置移动窗口，提取特征送入分类器。判定为正的窗口对应目标区域。
              通过图像金字塔实现多尺度检测，最后用 NMS 合并重叠结果。
            </p>
          </div>

          <TeachingCard>
            <div className="space-y-2 text-xs leading-6 text-slate-700">
              <p><span className="font-semibold">特征与分类器典型组合：</span></p>
              <ul className="list-inside list-disc space-y-1">
                <li><span className="font-semibold text-amber-700">HOG + SVM</span>：行人检测（Dalal &amp; Triggs, 2005）</li>
                <li><span className="font-semibold text-amber-700">Haar + Cascade</span>：人脸检测（Viola &amp; Jones, 2001）</li>
                <li><span className="font-semibold text-amber-700">LBP + SVM</span>：纹理识别、人脸识别</li>
              </ul>
            </div>
          </TeachingCard>
        </div>
      </div>
    );
  }, [topic]);

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="教学主题"
        value={topic}
        onChange={(value: string) => setTopic(value as TopicKey)}
        options={TOPIC_OPTIONS}
      />
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-700">
        <p className="font-semibold">导航提示</p>
        <p className="mt-2">
          通过切换教学主题，可以分别了解检测流程全貌、特征提取原理、
          SVM 分类器数学基础、级联分类器过滤策略和滑动窗口检测的实现方式。
        </p>
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="分类器与检测流程"
      subtitle="Classifier & Detection Pipeline - 基于特征和分类器的目标检测"
      originalImage={null}
      resultImage={null}
      mainVisual={mainVisual}
      operationLabel=""
      parameterIntro="切换主题查看检测流程各环节的详细讲解。"
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={
        <CodeViewer
          languages={[
            { name: 'C++ (OpenCV)', code: OPENCV_SVM_CODE },
          ]}
        />
      }
      singlePageScroll
    />
  );
}
