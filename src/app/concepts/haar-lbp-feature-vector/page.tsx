'use client';

import React, { useCallback, useMemo, useState } from 'react';
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

// ========================================
// 学习模式定义
// ========================================

type StudyMode = 'haar-template' | 'haar-integral' | 'lbp-vector';

type HaarSubType = 'edge' | 'line' | 'point' | 'diagonal';

const MODE_OPTIONS: { value: StudyMode; label: string }[] = [
  { value: 'haar-template', label: 'Haar-like 特征模板' },
  { value: 'haar-integral', label: 'Haar 特征值与积分图' },
  { value: 'lbp-vector', label: 'LBP 特征向量提取' },
];

const HAAR_SUB_OPTIONS: { value: HaarSubType; label: string }[] = [
  { value: 'edge', label: '边缘特征' },
  { value: 'line', label: '线特征' },
  { value: 'point', label: '点特征' },
  { value: 'diagonal', label: '对角线特征' },
];

const HAAR_EDGE_ITEMS = [
  { img: '/assets/haar-lbp-feature-vector/haar-edge-x.jpg', desc: 'x 方向边缘特征' },
  { img: '/assets/haar-lbp-feature-vector/haar-edge-y.jpg', desc: 'y 方向边缘特征' },
  { img: '/assets/haar-lbp-feature-vector/haar-edge-x-tilted.jpg', desc: 'x 倾斜方向边缘特征' },
  { img: '/assets/haar-lbp-feature-vector/haar-edge-y-tilted.jpg', desc: 'y 倾斜方向边缘特征' },
];

const HAAR_LINE_ITEMS = [
  { img: '/assets/haar-lbp-feature-vector/haar-line-1.jpg', desc: '线特征（水平）' },
  { img: '/assets/haar-lbp-feature-vector/haar-line-2.jpg', desc: '线特征（竖直）' },
  { img: '/assets/haar-lbp-feature-vector/haar-line-3-tilted-x3.jpg', desc: 'x 倾斜线特征（3 格）' },
  { img: '/assets/haar-lbp-feature-vector/haar-line-4-tilted-x4.jpg', desc: 'x 倾斜线特征（4 格）' },
  { img: '/assets/haar-lbp-feature-vector/haar-line-5.jpg', desc: '线特征' },
  { img: '/assets/haar-lbp-feature-vector/haar-line-6.jpg', desc: '线特征' },
  { img: '/assets/haar-lbp-feature-vector/haar-line-7-tilted-y3.jpg', desc: 'y 倾斜线特征（3 格）' },
  { img: '/assets/haar-lbp-feature-vector/haar-line-8-tilted-y4.jpg', desc: 'y 倾斜线特征（4 格）' },
];

const HAAR_POINT_ITEMS = [
  { img: '/assets/haar-lbp-feature-vector/haar-point.jpg', desc: '中心点特征' },
  { img: '/assets/haar-lbp-feature-vector/haar-point-tilted.jpg', desc: '倾斜点特征' },
];

const HAAR_DIAGONAL_ITEMS = [
  { img: '/assets/haar-lbp-feature-vector/haar-diagonal.jpg', desc: '对角线特征' },
];

// ========================================
// 公式常量（MathML 格式）
// ========================================

const FEATURE_VALUE_FORMULA = buildInlineMathML(
  '<mrow><mi>V</mi><mo>=</mo><munder><mo>\u2211</mo><mtext>\u9ED1\u533A</mtext></munder><mi>p</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>-</mo><munder><mo>\u2211</mo><mtext>\u767D\u533A</mtext></munder><mi>p</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo></mrow>'
);

const FEATURE_VALUE_CHAIN = buildInlineMathML(
  '<mrow><mi>V</mi><mo>=</mo><munder><mo>\u2211</mo><mtext>\u9ED1\u533A</mtext></munder><mi>p</mi><mo>-</mo><munder><mo>\u2211</mo><mtext>\u767D\u533A</mtext></munder><mi>p</mi><mo>=</mo><mn>128</mn><mo>-</mo><mn>45</mn><mo>=</mo><mn>83</mn></mrow>'
);

const INTEGRAL_IMAGE_FORMULA = buildInlineMathML(
  '<mrow><mi>n</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo><munder><mo>\u2211</mo><mrow><msup><mi>i</mi><mo>\u2032</mo></msup><mo>\u2264</mo><mi>i</mi><mo>,</mo><msup><mi>j</mi><mo>\u2032</mo></msup><mo>\u2264</mo><mi>j</mi></mrow></munder><mi>p</mi><mo>(</mo><msup><mi>i</mi><mo>\u2032</mo></msup><mo>,</mo><msup><mi>j</mi><mo>\u2032</mo></msup><mo>)</mo></mrow>'
);

const FOUR_CORNER_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>S</mi><mrow><mi>A</mi><mi>B</mi><mi>C</mi><mi>D</mi></mrow></msub><mo>=</mo><mi>D</mi><mo>-</mo><mi>C</mi><mo>-</mo><mi>B</mi><mo>+</mo><mi>A</mi></mrow>'
);

const LBP_FORMULA = buildInlineMathML(
  '<mrow><mi>LBP</mi><mo>(</mo><msub><mi>x</mi><mi>c</mi></msub><mo>,</mo><msub><mi>y</mi><mi>c</mi></msub><mo>)</mo><mo>=</mo>' +
  '<munderover><mo>\u2211</mo><mrow><mi>p</mi><mo>=</mo><mn>1</mn></mrow><mn>8</mn></munderover>' +
  '<mi>s</mi><mo>(</mo><mi>I</mi><mo>(</mo><msub><mi>p</mi><mi>i</mi></msub><mo>)</mo><mo>-</mo><mi>I</mi><mo>(</mo><msub><mi>p</mi><mi>c</mi></msub><mo>)</mo><mo>)</mo><msup><mn>2</mn><mrow><mi>p</mi><mo>-</mo><mn>1</mn></mrow></msup></mrow>'
);

const LBP_THRESHOLD = buildInlineMathML(
  '<mrow><mi>s</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><mrow><mo>{</mo><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mtext>\u82E5 </mtext><mi>x</mi><mo>\u2265</mo><mn>0</mn></mtd></mtr><mtr><mtd><mn>0</mn></mtd><mtd><mtext>\u82E5 </mtext><mi>x</mi><mo><</mo><mn>0</mn></mtd></mtr></mtable></mrow></mrow>'
);

const LBP_HISTOGRAM = buildInlineMathML(
  '<mrow><msub><mi>h</mi><mi>k</mi></msub><mo>(</mo><mi>b</mi><mo>)</mo><mo>=</mo><mfrac><mrow><mtext>cell</mtext><msub><mi>k</mi></msub><mtext>\u4E2D LBP \u503C\u4E3A</mtext><mi>b</mi><mtext>\u7684\u50CF\u7D20\u6570</mtext></mrow><mrow><mtext>cell \u603B\u50CF\u7D20\u6570</mtext></mrow></mfrac></mrow>'
);

const FEATURE_VECTOR_FORMULA = buildInlineMathML(
  '<mrow><mi>v</mi><mo>=</mo><mo>[</mo><msub><mi>h</mi><mn>1</mn></msub><mo>,</mo><msub><mi>h</mi><mn>2</mn></msub><mo>,</mo><mo>\u22EF</mo><mo>,</mo><msub><mi>h</mi><mi>N</mi></msub><mo>]</mo></mrow>'
);

// ========================================
// 代码段
// ========================================

const HAAR_CODE = '// OpenCV Haar 特征级联分类器检测\n' +
'cv::CascadeClassifier faceCascade;\n' +
'faceCascade.load("haarcascade_frontalface.xml");\n' +
'\n' +
'std::vector<cv::Rect> faces;\n' +
'faceCascade.detectMultiScale(img, faces, 1.1, 3);\n' +
'\n' +
'// Haar 特征值计算 (积分图加速)\n' +
'// 对每个 Haar 模板：\n' +
'//   V = sum(black_region) - sum(white_region)\n' +
'//   = integral(D) - integral(C) - integral(B) + integral(A)';

const LBP_CODE = '// LBP 特征向量提取 (OpenCV)\n' +
'cv::Ptr<cv::LBPHFaceRecognizer> model =\n' +
'    cv::LBPHFaceRecognizer::create(1, 8, 8, 8);\n' +
'\n' +
'// 内部流程：\n' +
'// 1. 将检测窗口划分为 16x16 cell\n' +
'// 2. 对每个像素与 8 邻域比较，得到 LBP 编码\n' +
'// 3. 统计每个 cell 的 LBP 直方图并归一化\n' +
'// 4. 串联所有 cell 直方图 -> 特征向量\n' +
'model->train(images, labels);\n' +
'\n' +
'int label = model->predict(testImg);';

// ========================================
// 数据定义
// ========================================

interface HaarSubSection {
  title: string;
  description: string;
  formulaMathML: string;
}

const HAAR_SUB_SECTIONS: Record<HaarSubType, HaarSubSection> = {
  edge: {
    title: '边缘特征（4 种）',
    description:
      '边缘特征包括 x 方向、y 方向、x 倾斜方向、y 倾斜方向四种模板。每种模板由黑白两个矩形区域组成，特征值为黑色区域像素和与白色区域像素和之差，用于检测图像中的边缘信息。',
    formulaMathML: buildInlineMathML(
      '<mrow><mi>V</mi><mo>=</mo><munder><mo>\u2211</mo><mtext>\u9ED1\u533A</mtext></munder><mi>p</mi><mo>-</mo><munder><mo>\u2211</mo><mtext>\u767D\u533A</mtext></munder><mi>p</mi></mrow>'
    ),
  },
  line: {
    title: '线特征（8 种）',
    description:
      '线特征包含水平方向、竖直方向及其倾斜方向的共 8 种模板结构。每个模板由三个矩形区域组成（黑白黑或白黑白模式），用于检测图像中呈线状分布的结构。',
    formulaMathML: buildInlineMathML(
      '<mrow><mi>V</mi><mo>=</mo><munder><mo>\u2211</mo><mtext>\u9ED1\u533A</mtext></munder><mi>p</mi><mo>-</mo><munder><mo>\u2211</mo><mtext>\u767D\u533A</mtext></munder><mi>p</mi></mrow>'
    ),
  },
  point: {
    title: '点特征（中心特征，2 种）',
    description:
      '点特征由一个中心矩形与周围矩形区域构成，用于检测图像中心与周边区域的差异，适合检测孤立亮点或暗点区域。',
    formulaMathML: buildInlineMathML(
      '<mrow><mi>V</mi><mo>=</mo><munder><mo>\u2211</mo><mtext>\u9ED1\u533A</mtext></munder><mi>p</mi><mo>-</mo><munder><mo>\u2211</mo><mtext>\u767D\u533A</mtext></munder><mi>p</mi></mrow>'
    ),
  },
  diagonal: {
    title: '对角线特征（1 种）',
    description:
      '对角线特征采用对角划分的黑白矩形结构，用于检测图像中对角线方向上的亮度差异。',
    formulaMathML: buildInlineMathML(
      '<mrow><mi>V</mi><mo>=</mo><munder><mo>\u2211</mo><mtext>\u9ED1\u533A</mtext></munder><mi>p</mi><mo>-</mo><munder><mo>\u2211</mo><mtext>\u767D\u533A</mtext></munder><mi>p</mi></mrow>'
    ),
  },
};

// ========================================
// 主页面组件
// ========================================

export default function HaarLbpFeatureVectorPage() {
  const [mode, setMode] = useState<StudyMode>('haar-template');
  const [haarSubType, setHaarSubType] = useState<HaarSubType>('edge');

  const handleModeChange = useCallback((value: string) => {
    setMode(value as StudyMode);
  }, []);

  const handleHaarSubChange = useCallback((value: string) => {
    setHaarSubType(value as HaarSubType);
  }, []);

  // ========================================
  // mainVisual
  // ========================================

  const mainVisual = useMemo(() => {
    switch (mode) {
      case 'haar-template': {
        const items = haarSubType === 'edge' ? HAAR_EDGE_ITEMS
          : haarSubType === 'line' ? HAAR_LINE_ITEMS
          : haarSubType === 'point' ? HAAR_POINT_ITEMS
          : HAAR_DIAGONAL_ITEMS;
        return (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="max-w-lg rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <img
                src={items[0].img}
                alt={items[0].desc}
                className="w-full max-w-sm rounded-lg object-cover"
              />
            </div>
            {items.length > 1 && (
              <div className="grid w-full max-w-lg grid-cols-2 gap-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100"
                  >
                    <img
                      src={item.img}
                      alt={item.desc}
                      className="w-full object-cover"
                    />
                    <div className="px-2 py-1 text-[10px] font-medium text-slate-600">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'haar-integral':
        return (
          <div className="flex flex-col items-center gap-6 py-2">
            <div className="max-w-lg rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-amber-600">
                Haar 特征值计算
              </div>
              <div className="flex gap-3">
                <img
                  src="/assets/haar-lbp-feature-vector/haar-feature-value-x2.jpg"
                  alt="Haar x2"
                  className="w-1/2 rounded-lg object-cover"
                />
                <img
                  src="/assets/haar-lbp-feature-vector/haar-feature-value-y2.jpg"
                  alt="Haar y2"
                  className="w-1/2 rounded-lg object-cover"
                />
              </div>
            </div>
            <div className="max-w-lg rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
                积分图
              </div>
              <img
                src="/assets/haar-lbp-feature-vector/haar-integral-image.jpg"
                alt="积分图"
                className="w-full max-w-sm rounded-lg object-cover"
              />
            </div>
          </div>
        );
      case 'lbp-vector':
        return (
          <div className="flex flex-col items-center gap-4 py-2">
            <ProcessRail>
              <FlowColumns>
                <FlowColumn align="start">
                  <FlowNode tone="red">
                    <div className="text-[11px] font-semibold text-red-700">划分 cell</div>
                    <div className="mt-1 text-[10px] leading-4 text-red-600">
                      检测窗口划分为 16x16 的单元格
                    </div>
                  </FlowNode>
                </FlowColumn>
                <FlowColumn align="center">
                  <FlowNode tone="amber">
                    <div className="text-[11px] font-semibold text-amber-800">计算 LBP 值</div>
                    <div className="mt-1 text-[10px] leading-4 text-amber-700">
                      每个像素与 8 邻域比较，得到二进制编码
                    </div>
                  </FlowNode>
                </FlowColumn>
                <FlowColumn align="center">
                  <FlowNode tone="sky">
                    <div className="text-[11px] font-semibold text-sky-700">统计直方图</div>
                    <div className="mt-1 text-[10px] leading-4 text-sky-700">
                      对每个 cell 的 LBP 编码值统计并归一化
                    </div>
                  </FlowNode>
                </FlowColumn>
                <FlowColumn align="end">
                  <FlowNode tone="emerald">
                    <div className="text-[11px] font-semibold text-emerald-700">串联特征向量</div>
                    <div className="mt-1 text-[10px] leading-4 text-emerald-700">
                      所有 cell 直方图连接为窗口级向量
                    </div>
                  </FlowNode>
                </FlowColumn>
              </FlowColumns>
            </ProcessRail>
          </div>
        );
    }
  }, [haarSubType, mode]);

  // ========================================
  // analysisPreview
  // ========================================

  const analysisPreview = useMemo(() => {
    switch (mode) {
      case 'haar-template': {
        const section = HAAR_SUB_SECTIONS[haarSubType];
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="text-[11px] font-semibold uppercase text-red-700">Haar 特征模板</div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {section.title}：模板覆盖在检测窗口上，将区域划分为黑色和白色两部分。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="sky">
                  <div className="text-[11px] font-semibold uppercase text-sky-700">区域求和</div>
                  <p className="mt-2 text-xs leading-5 text-sky-700">
                    分别计算黑色区域和白色区域内所有像素的灰度值之和。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="text-[11px] font-semibold uppercase text-emerald-700">特征值</div>
                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    黑区灰度和 - 白区灰度和，得到一个标量特征值。
                  </p>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );
      }
      case 'haar-integral':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="text-[11px] font-semibold uppercase text-red-700">积分图</div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    计算原图的积分图，任意点 (i,j) 的值等于左上角区域灰度和。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="amber">
                  <div className="text-[11px] font-semibold uppercase text-amber-800">矩形和公式</div>
                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    S_ABCD = D - C - B + A，仅需 4 次加减运算。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="text-[11px] font-semibold uppercase text-emerald-700">快速计算</div>
                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    任意矩形区域的灰度和可在常数时间内求出，大幅加速 Haar 特征计算。
                  </p>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );
      case 'lbp-vector':
        return (
          <ProcessRail>
            <FlowColumns>
              <FlowColumn align="start">
                <FlowNode tone="red">
                  <div className="text-[11px] font-semibold uppercase text-red-700">cell 划分</div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    检测窗口分为 16x16 像素的 cell，每个 cell 独立处理。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="amber">
                  <div className="text-[11px] font-semibold uppercase text-amber-800">LBP 编码</div>
                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    每个像素与 8 邻域比较，将比较结果按位编码为 0~255 的十进制数。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="center">
                <FlowNode tone="sky">
                  <div className="text-[11px] font-semibold uppercase text-sky-700">直方图串联</div>
                  <p className="mt-2 text-xs leading-5 text-sky-700">
                    cell 直方图归一化后串联为窗口特征向量，输入分类器进行目标检测。
                  </p>
                </FlowNode>
              </FlowColumn>
              <FlowColumn align="end">
                <FlowNode tone="emerald">
                  <div className="text-[11px] font-semibold uppercase text-emerald-700">特征向量</div>
                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    若窗口含 10x8 个 cell，每个 cell 直方图 256 维，则特征向量为 10x8x256 = 20480 维。
                  </p>
                </FlowNode>
              </FlowColumn>
            </FlowColumns>
          </ProcessRail>
        );
    }
  }, [haarSubType, mode]);

  // ========================================
  // stepDetails
  // ========================================

  const stepDetails = useMemo(() => {
    switch (mode) {
      case 'haar-template': {
        const section = HAAR_SUB_SECTIONS[haarSubType];
        return (
          <div className="space-y-6">
            <TeachingCard>
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Haar-like 特征</h2>
              <p className="text-xs leading-6 text-slate-600">
                Haar-like 特征是一种基于矩形区域灰度差值的特征描述方法，由 Viola 和 Jones
                提出并广泛应用于人脸检测。常用的 Haar-like 特征包括边缘特征（4 种）、
                线特征（8 种）、点特征（2 种）和对角线特征（1 种），共计 15 种基本模板。
              </p>
            </TeachingCard>
            <div className="border-t border-slate-200 pt-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">{section.title}</h2>
              <p className="mb-4 text-xs leading-6 text-slate-600">{section.description}</p>
              <FormulaCard
                label="Haar 特征值公式"
                mathML={section.formulaMathML}
                note="黑色区域像素值与白色区域像素值之差构成该模板的特征值。"
              />
            </div>
          </div>
        );
      }
      case 'haar-integral':
        return (
          <div className="space-y-6">
            <TeachingCard>
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Haar 特征值</h2>
              <p className="text-xs leading-6 text-slate-600">
                每一种 Haar-like 特征的计算方式相同：黑色填充区域的像素值之和减去白色填充区域的像素值之和。
                这一差值称为该 Haar-like 模板在当前窗口位置上的特征值。
              </p>
            </TeachingCard>
            <FormulaCard
              label="Haar 特征值"
              mathML={FEATURE_VALUE_FORMULA}
              note="V 表示特征值，p(i,j) 表示图像在 (i,j) 处的灰度值。"
            />
            <FormulaCard
              label="特征值示例"
              mathML={FEATURE_VALUE_CHAIN}
              note="代入示例数值：黑色区域灰度和为 128，白色区域灰度和为 45，特征值 V = 83。"
            />
            <div className="border-t border-slate-200 pt-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">积分图</h2>
              <p className="mb-4 text-xs leading-6 text-slate-600">
                积分图（Integral Image）是一种快速计算图像任意矩形区域内像素和的数据结构。
                积分图像中任意一点 n(i,j) 的值为原图像左上角到该点矩形区域内所有像素灰度值之和。
              </p>
              <FormulaCard
                label="积分图定义"
                mathML={INTEGRAL_IMAGE_FORMULA}
                note="n(i,j) 为积分图像在 (i,j) 处的值，p(i',j') 为原图像素灰度值。"
              />
              <p className="mb-3 mt-4 text-xs leading-6 text-slate-600">
                有了积分图后，任意矩形区域 ABCD 的灰度和可通过四个角点的积分图值快速计算：
              </p>
              <FormulaCard
                label="矩形区域快速求和"
                mathML={FOUR_CORNER_FORMULA}
                note="A、B、C、D 分别为矩形区域的左上、右上、左下、右下四个角点。仅需 4 次加减运算即可得到任意矩形和。"
              />
              <TeachingCard>
                <p className="text-xs leading-6 text-slate-700">
                  <span className="font-semibold text-emerald-700">加速原理：</span>
                  直接计算矩形区域像素和需要遍历区域内每个像素，时间复杂度为 O(宽 x 高)。
                  利用积分图后，任意矩形和的查询降至 O(1)，这对于需要大量窗口滑动计算的
                  Haar 特征提取至关重要。
                </p>
              </TeachingCard>
            </div>
          </div>
        );
      case 'lbp-vector':
        return (
          <div className="space-y-6">
            <TeachingCard>
              <h2 className="mb-3 text-sm font-semibold text-slate-800">LBP 特征向量提取</h2>
              <p className="text-xs leading-6 text-slate-600">
                LBP（Local Binary Pattern，局部二值模式）特征向量是对检测窗口内纹理信息的统计描述。
                其基本思想是：将检测窗口划分为若干 cell，对每个像素计算 LBP 编码，
                统计每个 cell 的直方图，最后将所有 cell 的直方图串联为整图的特征向量。
              </p>
            </TeachingCard>
            <div className="border-t border-slate-200 pt-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">步骤一：划分 cell</h2>
              <p className="mb-3 text-xs leading-6 text-slate-600">
                首先将检测窗口划分为 16x16 像素的小区域（cell）。
                每个 cell 将独立进行 LBP 统计，cell 的大小决定了特征描述的粒度。
              </p>
            </div>
            <div className="border-t border-slate-200 pt-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">步骤二：计算 LBP 值</h2>
              <p className="mb-3 text-xs leading-6 text-slate-600">
                对于 cell 中的每个像素，将其 3x3 邻域内 8 个相邻像素的灰度值与中心像素进行比较。
                若周围像素值大于等于中心像素值，则该位置标记为 1，否则为 0。
                8 个比较结果构成一个 8 位二进制数，转换为十进制即得到该中心像素的 LBP 值。
              </p>
              <FormulaCard
                label="LBP 编码公式"
                mathML={LBP_FORMULA}
                note="(x_c, y_c) 为中心像素坐标；I(p_c) 为中心像素灰度值；I(p_i) 为邻域像素灰度值。"
              />
              <FormulaCard
                label="阈值函数"
                mathML={LBP_THRESHOLD}
                note="s(x) 为符号函数；邻域灰度大于等于中心时置 1，否则置 0。"
              />
            </div>
            <div className="border-t border-slate-200 pt-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">步骤三：直方图统计与归一化</h2>
              <p className="mb-3 text-xs leading-6 text-slate-600">
                对每个 cell 内的所有 LBP 编码值（0~255）进行直方图统计，然后对直方图进行归一化处理，
                得到该 cell 的 LBP 分布特征。
              </p>
              <FormulaCard
                label="cell 直方图归一化"
                mathML={LBP_HISTOGRAM}
                note="h_k(b) 为第 k 个 cell 中 LBP 值为 b 的频率，即归一化后的直方图值。"
              />
            </div>
            <div className="border-t border-slate-200 pt-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">步骤四：串联特征向量</h2>
              <p className="mb-3 text-xs leading-6 text-slate-600">
                将所有 cell 的归一化直方图按照空间顺序依次连接，形成一个长向量，
                即整幅检测窗口的 LBP 纹理特征向量。该特征向量可以直接送入 SVM、
                级联分类器等分类器进行目标识别。
              </p>
              <FormulaCard
                label="特征向量串联"
                mathML={FEATURE_VECTOR_FORMULA}
                note="v 为最终特征向量，h_1 ~ h_N 为各 cell 的归一化直方图。若窗口大小为 160x128，cell 为 16x16，则 cell 数为 10x8=80，特征向量维度为 80x256=20480。"
              />
            </div>
            <TeachingCard>
              <p className="text-xs leading-6 text-slate-700">
                <span className="font-semibold">LBP 特征向量与 LBP 编码的区别：</span>
                LBP 编码描述的是单个像素的局部纹理信息，是一个 0~255 的数值；
                而 LBP 特征向量是在 cell 维度上对大量 LBP 编码的统计汇总，是送到分类器中的向量。
                与 Haar 特征相比，LBP 特征对光照变化更鲁棒（基于灰度比较而非绝对值），
                而 Haar 特征对亮度绝对变化更敏感。
              </p>
            </TeachingCard>
          </div>
        );
    }
  }, [haarSubType, mode]);

  // ========================================
  // parameters
  // ========================================

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="学习模式"
        value={mode}
        onChange={handleModeChange}
        options={MODE_OPTIONS}
      />
      {mode === 'haar-template' && (
        <SelectParam
          label="特征类型"
          value={haarSubType}
          onChange={handleHaarSubChange}
          options={HAAR_SUB_OPTIONS}
        />
      )}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
        <div className="text-xs font-semibold text-blue-700">说明</div>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          {mode === 'haar-template' && '15 种 Haar-like 模板分别用于检测不同类型的图像特征。'}
          {mode === 'haar-integral' && '积分图将矩形求和从 O(n^2) 降为 O(1)，是 Haar 实时计算的关键。'}
          {mode === 'lbp-vector' && 'LBP 特征向量通过局部纹理模式统计描述窗口，对光照变化有较好鲁棒性。'}
        </p>
      </div>
    </div>
  );

  // ========================================
  // codeTab
  // ========================================

  const codeTabContent = useMemo(() => {
    return mode === 'lbp-vector' ? LBP_CODE : HAAR_CODE;
  }, [mode]);

  return (
    <ConceptLayout
      title="Haar / LBP 特征向量"
      subtitle="Haar / LBP Feature Vector - 滑动窗口检测中的手工特征"
      operationLabel={mode === 'haar-template' ? 'Haar 模板计算'
        : mode === 'haar-integral' ? '积分图加速'
        : 'LBP 向量提取'}
      parameterIntro="选择学习模式，观察 Haar 特征模板、特征值计算、积分图原理或 LBP 特征向量的提取流程。"
      mainVisual={mainVisual}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'TypeScript', code: codeTabContent }]} />}
      originalImage={null}
      resultImage={null}
      singlePageScroll
    />
  );
}

