'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { loadImageAsGrayscale, resizeGrayscaleImage, centerCropGrayscaleImage } from '@/lib/utils/imageProcessing';

// ========================================
// 代码示例
// ========================================

const COMPARE_HIST_CODE = `double compareHist(
  InputArray H1, InputArray H2, int method
);

// 方法参数示例（OpenCV）
compareHist(hist1, hist2, HISTCMP_CORREL);      // 相关
compareHist(hist1, hist2, HISTCMP_CHISQR);       // 卡方
compareHist(hist1, hist2, HISTCMP_INTERSECT);    // 相交
compareHist(hist1, hist2, HISTCMP_BHATTACHARYYA);// 巴氏距离`;

const MATCH_TEMPLATE_CODE = `void matchTemplate(
  InputArray image,     // 被搜索图 S (WxH)
  InputArray templ,     // 模板 T (mxn)
  OutputArray result,   // 响应图 (W-w+1)x(H-h+1)
  int method            // 匹配方法
);

// 六种匹配方法
// 值越小越匹配（前两种）
CV_TM_SQDIFF         // 平方差匹配
CV_TM_SQDIFF_NORMED  // 归一化平方差匹配

// 值越大越匹配（后四种）
CV_TM_CCORR          // 相关匹配
CV_TM_CCORR_NORMED   // 归一化相关匹配
CV_TM_CCOEFF         // 相关系数匹配
CV_TM_CCOEFF_NORMED  // 归一化相关系数匹配`;

// ========================================
// 公式 MathML
// ========================================

/* 相关法：d_correlation = sum H1(i)*H2(i) / sqrt(sum H1^2(i) * sum H2^2(i)) */
const CORREL_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mtext>correl</mtext></msub>' +
  '<mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>,</mo><msub><mi>H</mi><mn>2</mn></msub><mo>)</mo><mo>=</mo>' +
  '<mfrac>' +
  '<mrow><msub><mo>∑</mo><mi>i</mi></msub><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>·</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo></mrow>' +
  '<msqrt><mrow><msub><mo>∑</mo><mi>i</mi></msub><msubsup><mi>H</mi><mn>1</mn><mn>2</mn></msubsup><mo>(</mo><mi>i</mi><mo>)</mo><mo>·</mo><msub><mo>∑</mo><mi>i</mi></msub><msubsup><mi>H</mi><mn>2</mn><mn>2</mn></msubsup><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msqrt>' +
  '</mfrac></mrow>'
);

/* 卡方距离：d_chi-square = sum (H1(i)-H2(i))^2 / (H1(i)+H2(i)) */
const CHISQR_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mtext>chi-square</mtext></msub>' +
  '<mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>,</mo><msub><mi>H</mi><mn>2</mn></msub><mo>)</mo><mo>=</mo>' +
  '<msub><mo>∑</mo><mi>i</mi></msub>' +
  '<mfrac><mrow><msup><mrow><mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>-</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup></mrow>' +
  '<mrow><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>+</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo></mrow></mfrac></mrow>'
);

/* 直方图相交法：d_intersection = sum min(H1(i), H2(i)) */
const INTERSECT_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mtext>intersection</mtext></msub>' +
  '<mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>,</mo><msub><mi>H</mi><mn>2</mn></msub><mo>)</mo><mo>=</mo>' +
  '<msub><mo>∑</mo><mi>i</mi></msub><mo>min</mo><mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>,</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo></mrow>'
);

/* Bhattacharyya 距离：d_Bhatta = sqrt(1 - sum sqrt(H1*H2) / (sum H1 * sum H2)) */
const BHATTA_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mtext>Bhatta</mtext></msub>' +
  '<mo>=</mo><msqrt><mrow><mn>1</mn><mo>-</mo>' +
  '<mfrac>' +
  '<mrow><msub><mo>∑</mo><mi>i</mi></msub><msqrt><mrow><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>·</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msqrt></mrow>' +
  '<mrow><mo>(</mo><msub><mo>∑</mo><mi>i</mi></msub><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo><mo>·</mo><mo>(</mo><msub><mo>∑</mo><mi>i</mi></msub><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo></mrow>' +
  '</mfrac></mrow></msqrt></mrow>'
);

/* SSD：SSD(i,j) = Min sum sum [S_ij(m,n)-T(m,n)]^2 */
const SSD_FORMULA = buildInlineMathML(
  '<mrow><mi>SSD</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<mo>Min</mo><munderover><mo>∑</mo><mrow><mi>m</mi><mo>=</mo><mn>1</mn></mrow><mi>M</mi></munderover>' +
  '<munderover><mo>∑</mo><mrow><mi>n</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></munderover>' +
  '<msup><mrow><mo>[</mo><msub><mi>S</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>-</mo><mi>T</mi><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>]</mo></mrow><mn>2</mn></msup></mrow>'
);

/* SAD：SAD(i,j) = Min sum sum |S_ij(m,n)-T(m,n)| */
const SAD_FORMULA = buildInlineMathML(
  '<mrow><mi>SAD</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<mo>Min</mo><munderover><mo>∑</mo><mrow><mi>m</mi><mo>=</mo><mn>1</mn></mrow><mi>M</mi></munderover>' +
  '<munderover><mo>∑</mo><mrow><mi>n</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></munderover>' +
  '<mo>|</mo><msub><mi>S</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>-</mo><mi>T</mi><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>|</mo></mrow>'
);

// ========================================
// 方法说明数据
// ========================================

const HIST_METHODS = [
  {
    value: 'correlation',
    label: '相关法',
    info: '值越大匹配越好。完全匹配为 1，完全不匹配为 -1，值为 0 表示无关联。',
    formula: CORREL_FORMULA,
  },
  {
    value: 'chi-square',
    label: '卡方距离',
    info: '值越小匹配越好。完全匹配为 0，完全不匹配为无穷大。',
    formula: CHISQR_FORMULA,
  },
  {
    value: 'intersection',
    label: '直方图相交法',
    info: '值越大匹配越好。归一化后完全匹配为 1，完全不匹配为 0。',
    formula: INTERSECT_FORMULA,
  },
  {
    value: 'bhattacharyya',
    label: '巴氏距离',
    info: '值越小匹配越好。完全匹配为 0，完全不匹配为 1。',
    formula: BHATTA_FORMULA,
  },
] as const;

type HistMethod = (typeof HIST_METHODS)[number]['value'];

const COMPAREHIST_TABLE = [
  { method: '相关 Correlation', param: 'HISTCMP_CORREL' },
  { method: '卡方 Chi-square', param: 'HISTCMP_CHISQR' },
  { method: '相交 Intersection', param: 'HISTCMP_INTERSECT' },
  { method: '巴氏距离 Bhattacharyya', param: 'HISTCMP_BHATTACHARYYA' },
];

const MATCHTEMPLATE_METHODS = [
  { method: '平方差匹配法', param: 'CV_TM_SQDIFF', direction: '越小越好' },
  { method: '归一化平方差匹配法', param: 'CV_TM_SQDIFF_NORMED', direction: '越小越好' },
  { method: '相关匹配法', param: 'CV_TM_CCORR', direction: '越大越好' },
  { method: '归一化相关匹配法', param: 'CV_TM_CCORR_NORMED', direction: '越大越好' },
  { method: '相关系数匹配法', param: 'CV_TM_CCOEFF', direction: '越大越好' },
  { method: '归一化相关系数匹配法', param: 'CV_TM_CCOEFF_NORMED', direction: '越大越好' },
];

export default function HistogramTemplateMatchingPage() {
  const [section, setSection] = useState<'histogram' | 'template'>('histogram');
  const [histMethod, setHistMethod] = useState<HistMethod>('correlation');

  const handleSectionChange = useCallback((value: string) => {
    setSection(value as 'histogram' | 'template');
  }, []);

  const handleHistMethodChange = useCallback((value: string) => {
    setHistMethod(value as HistMethod);
  }, []);

  const [originalImage, setOriginalImage] = useState<number[][]>([]);
  const [resultImage, setResultImage] = useState<number[][]>([]);

  // 加载课程模板匹配实验原图和结果图作为教学主图
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadImageAsGrayscale('/assets/histogram-template-matching/original-image.jpg'),
      loadImageAsGrayscale('/assets/histogram-template-matching/matching-final-result.jpg'),
    ]).then(([orig, result]) => {
      if (!cancelled) {
        setOriginalImage(resizeGrayscaleImage(centerCropGrayscaleImage(orig), 128));
        setResultImage(resizeGrayscaleImage(centerCropGrayscaleImage(result), 128));
      }
    }).catch(() => {
      if (!cancelled) { setOriginalImage([]); setResultImage([]); }
    });
    return () => { cancelled = true; };
  }, []);

  // 当前直方图方法信息
  const currentHistMethod = useMemo(
    () => HIST_METHODS.find(m => m.value === histMethod) ?? HIST_METHODS[0],
    [histMethod]
  );

  // ========================================
  // analysisPreview
  // ========================================

  const analysisPreview = useMemo(() => {
    if (section === 'histogram') {
      return (
        <ProcessRail>
          <FlowColumns>
            <FlowColumn align="start">
              <FlowNode tone="red" className="max-w-48">
                <div className="mb-2 text-xs font-semibold text-red-600">目标与模板</div>
                <p className="text-xs leading-5 text-slate-600">
                  提取目标和模板图像的直方图 H₁(i) 和 H₂(i)，i 为直方图柱。
                </p>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber" className="max-w-48">
                <div className="mb-2 text-xs font-semibold text-amber-700">计算相似度</div>
                <p className="text-xs leading-5 text-slate-600">
                  对每个柱 i 按所选方法计算 H₁ 与 H₂ 的差异或相关性。
                </p>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald" className="max-w-48">
                <div className="mb-2 text-xs font-semibold text-emerald-700">匹配判定</div>
                <p className="text-xs leading-5 text-slate-600">
                  将当前直方图与模板直方图比较，根据相似度得分判定是否匹配。
                </p>
              </FlowNode>
            </FlowColumn>
          </FlowColumns>
        </ProcessRail>
      );
    }

    // 模板匹配
    return (
      <ProcessRail>
        <FlowColumns>
          <FlowColumn align="start">
            <FlowNode tone="red" className="max-w-48">
              <div className="mb-2 text-xs font-semibold text-red-600">滑动窗口</div>
              <p className="text-xs leading-5 text-slate-600">
                模板 T(m×n) 在源图 S(W×H) 上逐像素滑动，产生子图 S_ij。
              </p>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="center">
            <FlowNode tone="amber" className="max-w-48">
              <div className="mb-2 text-xs font-semibold text-amber-700">计算响应</div>
              <p className="text-xs leading-5 text-slate-600">
                对每个位置 (i,j)，计算模板 T 与子图 S_ij 的相似度（SSD/SAD 等）。
              </p>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="end">
            <FlowNode tone="emerald" className="max-w-48">
              <div className="mb-2 text-xs font-semibold text-emerald-700">最佳匹配</div>
              <p className="text-xs leading-5 text-slate-600">
                遍历全图后得到响应图，从中选出最佳匹配位置。
              </p>
            </FlowNode>
          </FlowColumn>
        </FlowColumns>
      </ProcessRail>
    );
  }, [section]);

  // ========================================
  // stepDetails
  // ========================================

  const stepDetails = useMemo(() => {
    if (section === 'histogram') {
      return (
        <div className="space-y-6">

          {/* ---- 1. 直方图匹配概述 ---- */}
          <TeachingCard>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">直方图匹配</h2>
            <p className="text-xs leading-6 text-slate-600">
              目标的特征采用直方图描述。假设得到的目标和模板的直方图分别为 H₁(i) 和 H₂(i)，
              其中 i 为直方图的柱（bin）。直方图匹配通过比较 H₁ 与 H₂ 的相似程度来完成目标检测，
              常用的比较方法包括相关法、卡方距离、直方图相交法和 Bhattacharyya 距离。
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              直方图匹配的核心思路：用直方图作为特征描述子，不关心像素的空间布局，
              只比较颜色或灰度值的统计分布。
            </p>
          </TeachingCard>

          {/* ---- 2. 四种匹配方法 ---- */}
          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">匹配方法</h2>
            <p className="mb-4 text-xs leading-6 text-slate-600">
              以下为四种常用的直方图比较方法，可通过左侧参数切换查看。
            </p>

            <div className="space-y-5">
              {HIST_METHODS.map(m => (
                <div key={m.value}>
                  <FormulaCard
                    label={m.label}
                    mathML={m.formula}
                    note={m.info}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ---- 3. 当前方法说明 ---- */}
          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">当前方法：{currentHistMethod.label}</h2>
            <TeachingCard tone="amber">
              <p className="text-xs leading-6 text-slate-700">
                {currentHistMethod.info}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                直方图匹配计算的是 H₁ 与 H₂ 在每个柱上的差异或相关性，将所有柱的结果汇总为一个相似度分数。
                不同的方法关注的统计特性不同：相关法衡量线性相关性，卡方距离对差异敏感，
                相交法直接度量重叠面积，巴氏距离基于概率分布的重叠程度。
              </p>
            </TeachingCard>
          </div>

          {/* ---- 4. OpenCV compareHist ---- */}
          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">OpenCV 实现</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              OpenCV 提供 <code>compareHist</code> 函数计算两个直方图的相似度，各方法对应的参数如下：
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 text-left font-semibold text-slate-700">方法</th>
                  <th className="py-2 text-left font-semibold text-slate-700">参数</th>
                </tr>
              </thead>
              <tbody>
                {COMPAREHIST_TABLE.map(row => (
                  <tr key={row.param} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-600">{row.method}</td>
                    <td className="py-2 font-mono text-slate-600">{row.param}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      );
    }

    // ========================================
    // 模板匹配 section
    // ========================================
    return (
      <div className="space-y-6">

        {/* ---- 1. 模板匹配概述 ---- */}
        <TeachingCard>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">模板匹配</h2>
          <p className="text-xs leading-6 text-slate-600">
            模板匹配用于在源图像中寻找定位给定目标图像（模板图像）。其原理是通过一定的相似度准则
            来衡量模板图像与被搜索图像中每个窗口区域的相似程度。
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            模板匹配与直方图匹配的区别：直方图匹配只关心像素的统计分布，不关心空间排列；
            而模板匹配逐窗口比较像素的局部排列，对空间布局敏感。
          </p>
        </TeachingCard>

        {/* ---- 2. 滑动窗口原理（带图像） ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">滑动窗口原理</h2>
          <p className="mb-3 text-xs leading-6 text-slate-600">
            模板 T(m×n) 在源图像 S(W×H) 上从左到右、从上到下逐像素平移，模板覆盖的区域称为子图 S_ij。
            搜索范围为：1 ≤ i ≤ W-m，1 ≤ j ≤ H-n。
          </p>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <figure>
              <img
                src="/assets/histogram-template-matching/templ-sliding-window.jpg"
                alt="模板匹配滑动窗口原理"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">滑动窗口：模板在源图像上逐像素平移</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/templ-concept-1.jpg"
                alt="模板匹配示意"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">模板匹配过程示意</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/templ-concept-2.jpg"
                alt="模板匹配示意"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">子图与模板比较</figcaption>
            </figure>
          </div>

          <TeachingCard>
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold">关键概念：</span>对每个位置 (i,j) 计算一个相似度值，
              遍历完成后得到一张响应图（尺寸 (W-w+1)×(H-h+1)）。
              根据所选方法，在响应图中寻找最小值或最大值位置即为最佳匹配。
            </p>
          </TeachingCard>
        </div>

        {/* ---- 3. SSD 与 SAD 公式 ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">匹配准则</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            衡量模板 T 与子图 S_ij 的匹配程度，最基础的两种准则是 SSD（平方差之和）和 SAD（绝对差之和），
            二者的值越小表示匹配程度越高。
          </p>

          <div className="space-y-4">
            <FormulaCard
              label="SSD（平方差）"
              mathML={SSD_FORMULA}
              note="对模板和子图对应位置的像素值求差后平方，再全部求和。平方操作放大了较大差异的影响。"
            />
            <FormulaCard
              label="SAD（绝对差）"
              mathML={SAD_FORMULA}
              note="对模板和子图对应位置的像素值求绝对差后求和。相比 SSD 对大差异的惩罚更温和。"
            />
          </div>

          <TeachingCard tone="amber" className="mt-4">
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold">SSD 与 SAD 的差异：</span>
              SSD 对像素值差异进行平方，使较大的差异被放大突出，对边缘和纹理变化更敏感；
              SAD 使用绝对值，对所有差异等权处理，计算量更小但对噪声更不敏感。
              两者均输出最小的位置作为最佳匹配。
            </p>
          </TeachingCard>
        </div>

        {/* ---- 4. 模板匹配实验结果 ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">模板匹配实验示例</h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <figure>
              <img
                src="/assets/histogram-template-matching/original-image.jpg"
                alt="原始图像"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">（a）原始图像</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/template-image.jpg"
                alt="模板图像"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">（b）模板图像</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/matching-result.jpg"
                alt="匹配结果图像"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">（c）匹配结果图像</figcaption>
            </figure>
          </div>

          <figure className="mb-4">
            <img
              src="/assets/histogram-template-matching/matching-process.jpg"
              alt="模板匹配过程图"
              className="w-full max-w-lg rounded-lg object-cover"
            />
            <figcaption className="mt-1.5 text-xs text-slate-500">模板匹配过程图</figcaption>
          </figure>

          <figure className="mb-4">
            <img
              src="/assets/histogram-template-matching/matching-final-result.jpg"
              alt="模板匹配结果图"
              className="w-full max-w-lg rounded-lg object-cover"
            />
            <figcaption className="mt-1.5 text-xs text-slate-500">模板匹配结果图：在原始图像中准确定位了模板位置</figcaption>
          </figure>

          <TeachingCard>
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold">实验分析：</span>通过模板匹配算法，可以在包含多个目标的复杂场景中
              准确找到与模板最相似的区域。匹配结果的精度取决于所选方法、模板的区分度以及目标是否发生旋转或尺度变化。
              模板匹配对目标的旋转和尺度变化较为敏感——目标旋转或缩放后，响应值会显著下降。
            </p>
          </TeachingCard>
        </div>

        {/* ---- 5. OpenCV matchTemplate ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">OpenCV matchTemplate</h2>
          <p className="mb-3 text-xs leading-6 text-slate-600">
            OpenCV 的 <code>matchTemplate</code> 函数提供六种匹配方法，分为两组：
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 text-left font-semibold text-slate-700">方法</th>
                <th className="py-2 pr-3 text-left font-semibold text-slate-700">参数</th>
                <th className="py-2 text-left font-semibold text-slate-700">判定准则</th>
              </tr>
            </thead>
            <tbody>
              {MATCHTEMPLATE_METHODS.map(row => (
                <tr key={row.param} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-600">{row.method}</td>
                  <td className="py-2 pr-3 font-mono text-slate-600">{row.param}</td>
                  <td className="py-2 text-slate-600">{row.direction}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <TeachingCard tone="amber" className="mt-4">
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold">分组说明：</span>
              前两种方法（平方差、归一化平方差）输出值越小表示匹配越好，最佳匹配在响应图中取最小值；
              后四种方法（相关、归一化相关、相关系数、归一化相关系数）输出值越大表示匹配越好，
              最佳匹配在响应图中取最大值。归一化版本对光照变化具有更好的鲁棒性。
            </p>
          </TeachingCard>
        </div>

      </div>
    );
  }, [section, histMethod, currentHistMethod]);

  // ========================================
  // parameters
  // ========================================

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="教学章节"
        value={section}
        onChange={handleSectionChange}
        options={[
          { value: 'histogram', label: '直方图匹配' },
          { value: 'template', label: '模板匹配' },
        ]}
      />
      {section === 'histogram' && (
        <SelectParam
          label="匹配方法"
          value={histMethod}
          onChange={handleHistMethodChange}
          options={HIST_METHODS.map(m => ({ value: m.value, label: m.label }))}
        />
      )}
    </div>
  );

  // ========================================
  // codeTab
  // ========================================

  const codeSections = section === 'histogram'
    ? [
        { name: 'compareHist', code: COMPARE_HIST_CODE },
        { name: 'matchTemplate', code: MATCH_TEMPLATE_CODE },
      ]
    : [
        { name: 'matchTemplate', code: MATCH_TEMPLATE_CODE },
        { name: 'compareHist', code: COMPARE_HIST_CODE },
      ];

  // ========================================
  // Render
  // ========================================

  return (
    <ConceptLayout
      title="直方图匹配与模板匹配"
      subtitle="Histogram Matching & Template Matching - 基于特征匹配的目标检测"
      operationLabel="特征匹配"
      parameterIntro="切换直方图匹配和模板匹配两个章节，分别查看匹配方法的公式和实验示例。"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={codeSections} />}
      imageHints={{
        input: '模板匹配原图',
        output: '匹配结果图',
      }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
    />
  );
}
