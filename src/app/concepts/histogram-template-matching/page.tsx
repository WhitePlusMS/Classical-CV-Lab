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
import { generateExampleImage } from '@/lib/algorithms/histogram';

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
  '<mrow><msub><mo>\u2211</mo><mi>i</mi></msub><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>\u00B7</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo></mrow>' +
  '<msqrt><mrow><msub><mo>\u2211</mo><mi>i</mi></msub><msubsup><mi>H</mi><mn>1</mn><mn>2</mn></msubsup><mo>(</mo><mi>i</mi><mo>)</mo><mo>\u00B7</mo><msub><mo>\u2211</mo><mi>i</mi></msub><msubsup><mi>H</mi><mn>2</mn><mn>2</mn></msubsup><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msqrt>' +
  '</mfrac></mrow>'
);

/* 卡方距离：d_chi-square = sum (H1(i)-H2(i))^2 / (H1(i)+H2(i)) */
const CHISQR_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mtext>chi-square</mtext></msub>' +
  '<mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>,</mo><msub><mi>H</mi><mn>2</mn></msub><mo>)</mo><mo>=</mo>' +
  '<msub><mo>\u2211</mo><mi>i</mi></msub>' +
  '<mfrac><mrow><msup><mrow><mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>-</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup></mrow>' +
  '<mrow><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>+</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo></mrow></mfrac></mrow>'
);

/* 直方图相交法：d_intersection = sum min(H1(i), H2(i)) */
const INTERSECT_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mtext>intersection</mtext></msub>' +
  '<mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>,</mo><msub><mi>H</mi><mn>2</mn></msub><mo>)</mo><mo>=</mo>' +
  '<msub><mo>\u2211</mo><mi>i</mi></msub><mo>min</mo><mo>(</mo><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>,</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo></mrow>'
);

/* Bhattacharyya 距离：d_Bhatta = sqrt(1 - sum sqrt(H1*H2) / (sum H1 * sum H2)) */
const BHATTA_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>d</mi><mtext>Bhatta</mtext></msub>' +
  '<mo>=</mo><msqrt><mrow><mn>1</mn><mo>-</mo>' +
  '<mfrac>' +
  '<mrow><msub><mo>\u2211</mo><mi>i</mi></msub><msqrt><mrow><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>\u00B7</mo><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo></mrow></msqrt></mrow>' +
  '<mrow><mo>(</mo><msub><mo>\u2211</mo><mi>i</mi></msub><msub><mi>H</mi><mn>1</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo><mo>\u00B7</mo><mo>(</mo><msub><mo>\u2211</mo><mi>i</mi></msub><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>i</mi><mo>)</mo><mo>)</mo></mrow>' +
  '</mfrac></mrow></msqrt></mrow>'
);

/* SSD：SSD(i,j) = Min sum sum [S_ij(m,n)-T(m,n)]^2 */
const SSD_FORMULA = buildInlineMathML(
  '<mrow><mi>SSD</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<mo>Min</mo><munderover><mo>\u2211</mo><mrow><mi>m</mi><mo>=</mo><mn>1</mn></mrow><mi>M</mi></munderover>' +
  '<munderover><mo>\u2211</mo><mrow><mi>n</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></munderover>' +
  '<msup><mrow><mo>[</mo><msub><mi>S</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>-</mo><mi>T</mi><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>]</mo></mrow><mn>2</mn></msup></mrow>'
);

/* SAD：SAD(i,j) = Min sum sum |S_ij(m,n)-T(m,n)| */
const SAD_FORMULA = buildInlineMathML(
  '<mrow><mi>SAD</mi><mo>(</mo><mi>i</mi><mo>,</mo><mi>j</mi><mo>)</mo><mo>=</mo>' +
  '<mo>Min</mo><munderover><mo>\u2211</mo><mrow><mi>m</mi><mo>=</mo><mn>1</mn></mrow><mi>M</mi></munderover>' +
  '<munderover><mo>\u2211</mo><mrow><mi>n</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></munderover>' +
  '<mo>|</mo><msub><mi>S</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>-</mo><mi>T</mi><mo>(</mo><mi>m</mi><mo>,</mo><mi>n</mi><mo>)</mo><mo>|</mo></mrow>'
);

// ========================================
// 方法说明数据
// ========================================

const HIST_METHODS = [
  {
    value: 'correlation',
    label: '\u76F8\u5173\u6CD5',
    info: '\u503C\u8D8A\u5927\u5339\u914D\u8D8A\u597D\u3002\u5B8C\u5168\u5339\u914D\u4E3A 1\uFF0C\u5B8C\u5168\u4E0D\u5339\u914D\u4E3A -1\uFF0C\u503C\u4E3A 0 \u8868\u793A\u65E0\u5173\u8054\u3002',
    formula: CORREL_FORMULA,
  },
  {
    value: 'chi-square',
    label: '\u5361\u65B9\u8DDD\u79BB',
    info: '\u503C\u8D8A\u5C0F\u5339\u914D\u8D8A\u597D\u3002\u5B8C\u5168\u5339\u914D\u4E3A 0\uFF0C\u5B8C\u5168\u4E0D\u5339\u914D\u4E3A\u65E0\u7A77\u5927\u3002',
    formula: CHISQR_FORMULA,
  },
  {
    value: 'intersection',
    label: '\u76F4\u65B9\u56FE\u76F8\u4EA4\u6CD5',
    info: '\u503C\u8D8A\u5927\u5339\u914D\u8D8A\u597D\u3002\u5F52\u4E00\u5316\u540E\u5B8C\u5168\u5339\u914D\u4E3A 1\uFF0C\u5B8C\u5168\u4E0D\u5339\u914D\u4E3A 0\u3002',
    formula: INTERSECT_FORMULA,
  },
  {
    value: 'bhattacharyya',
    label: '\u5DF4\u6C0F\u8DDD\u79BB',
    info: '\u503C\u8D8A\u5C0F\u5339\u914D\u8D8A\u597D\u3002\u5B8C\u5168\u5339\u914D\u4E3A 0\uFF0C\u5B8C\u5168\u4E0D\u5339\u914D\u4E3A 1\u3002',
    formula: BHATTA_FORMULA,
  },
] as const;

type HistMethod = (typeof HIST_METHODS)[number]['value'];

const COMPAREHIST_TABLE = [
  { method: '\u76F8\u5173 Correlation', param: 'HISTCMP_CORREL' },
  { method: '\u5361\u65B9 Chi-square', param: 'HISTCMP_CHISQR' },
  { method: '\u76F8\u4EA4 Intersection', param: 'HISTCMP_INTERSECT' },
  { method: '\u5DF4\u6C0F\u8DDD\u79BB Bhattacharyya', param: 'HISTCMP_BHATTACHARYYA' },
];

const MATCHTEMPLATE_METHODS = [
  { method: '\u5E73\u65B9\u5DEE\u5339\u914D\u6CD5', param: 'CV_TM_SQDIFF', direction: '\u8D8A\u5C0F\u8D8A\u597D' },
  { method: '\u5F52\u4E00\u5316\u5E73\u65B9\u5DEE\u5339\u914D\u6CD5', param: 'CV_TM_SQDIFF_NORMED', direction: '\u8D8A\u5C0F\u8D8A\u597D' },
  { method: '\u76F8\u5173\u5339\u914D\u6CD5', param: 'CV_TM_CCORR', direction: '\u8D8A\u5927\u8D8A\u597D' },
  { method: '\u5F52\u4E00\u5316\u76F8\u5173\u5339\u914D\u6CD5', param: 'CV_TM_CCORR_NORMED', direction: '\u8D8A\u5927\u8D8A\u597D' },
  { method: '\u76F8\u5173\u7CFB\u6570\u5339\u914D\u6CD5', param: 'CV_TM_CCOEFF', direction: '\u8D8A\u5927\u8D8A\u597D' },
  { method: '\u5F52\u4E00\u5316\u76F8\u5173\u7CFB\u6570\u5339\u914D\u6CD5', param: 'CV_TM_CCOEFF_NORMED', direction: '\u8D8A\u5927\u8D8A\u597D' },
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

  const originalImage = useMemo(() => generateExampleImage('standard'), []);
  const resultImage = useMemo(() => generateExampleImage('standard'), []);

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
                <div className="mb-2 text-xs font-semibold text-red-600">\u76EE\u6807\u4E0E\u6A21\u677F</div>
                <p className="text-xs leading-5 text-slate-600">
                  \u63D0\u53D6\u76EE\u6807\u548C\u6A21\u677F\u56FE\u50CF\u7684\u76F4\u65B9\u56FE H\u2081(i) \u548C H\u2082(i)\uFF0Ci \u4E3A\u76F4\u65B9\u56FE\u67F1\u3002
                </p>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="center">
              <FlowNode tone="amber" className="max-w-48">
                <div className="mb-2 text-xs font-semibold text-amber-700">\u8BA1\u7B97\u76F8\u4F3C\u5EA6</div>
                <p className="text-xs leading-5 text-slate-600">
                  \u5BF9\u6BCF\u4E2A\u67F1 i \u6309\u6240\u9009\u65B9\u6CD5\u8BA1\u7B97 H\u2081 \u4E0E H\u2082 \u7684\u5DEE\u5F02\u6216\u76F8\u5173\u6027\u3002
                </p>
              </FlowNode>
            </FlowColumn>
            <FlowColumn align="end">
              <FlowNode tone="emerald" className="max-w-48">
                <div className="mb-2 text-xs font-semibold text-emerald-700">\u5339\u914D\u5224\u5B9A</div>
                <p className="text-xs leading-5 text-slate-600">
                  \u5C06\u5F53\u524D\u76F4\u65B9\u56FE\u4E0E\u6A21\u677F\u76F4\u65B9\u56FE\u6BD4\u8F83\uFF0C\u6839\u636E\u76F8\u4F3C\u5EA6\u5F97\u5206\u5224\u5B9A\u662F\u5426\u5339\u914D\u3002
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
              <div className="mb-2 text-xs font-semibold text-red-600">\u6ED1\u52A8\u7A97\u53E3</div>
              <p className="text-xs leading-5 text-slate-600">
                \u6A21\u677F T(m\u00D7n) \u5728\u6E90\u56FE S(W\u00D7H) \u4E0A\u9010\u50CF\u7D20\u6ED1\u52A8\uFF0C\u4EA7\u751F\u5B50\u56FE S_ij\u3002
              </p>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="center">
            <FlowNode tone="amber" className="max-w-48">
              <div className="mb-2 text-xs font-semibold text-amber-700">\u8BA1\u7B97\u54CD\u5E94</div>
              <p className="text-xs leading-5 text-slate-600">
                \u5BF9\u6BCF\u4E2A\u4F4D\u7F6E (i,j)\uFF0C\u8BA1\u7B97\u6A21\u677F T \u4E0E\u5B50\u56FE S_ij \u7684\u76F8\u4F3C\u5EA6\uFF08SSD/SAD \u7B49\uFF09\u3002
              </p>
            </FlowNode>
          </FlowColumn>
          <FlowColumn align="end">
            <FlowNode tone="emerald" className="max-w-48">
              <div className="mb-2 text-xs font-semibold text-emerald-700">\u6700\u4F73\u5339\u914D</div>
              <p className="text-xs leading-5 text-slate-600">
                \u904D\u5386\u5168\u56FE\u540E\u5F97\u5230\u54CD\u5E94\u56FE\uFF0C\u4ECE\u4E2D\u9009\u51FA\u6700\u4F73\u5339\u914D\u4F4D\u7F6E\u3002
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
            <h2 className="mb-3 text-sm font-semibold text-slate-800">\u76F4\u65B9\u56FE\u5339\u914D</h2>
            <p className="text-xs leading-6 text-slate-600">
              \u76EE\u6807\u7684\u7279\u5F81\u91C7\u7528\u76F4\u65B9\u56FE\u63CF\u8FF0\u3002\u5047\u8BBE\u5F97\u5230\u7684\u76EE\u6807\u548C\u6A21\u677F\u7684\u76F4\u65B9\u56FE\u5206\u522B\u4E3A H\u2081(i) \u548C H\u2082(i)\uFF0C
              \u5176\u4E2D i \u4E3A\u76F4\u65B9\u56FE\u7684\u67F1\uFF08bin\uFF09\u3002\u76F4\u65B9\u56FE\u5339\u914D\u901A\u8FC7\u6BD4\u8F83 H\u2081 \u4E0E H\u2082 \u7684\u76F8\u4F3C\u7A0B\u5EA6\u6765\u5B8C\u6210\u76EE\u6807\u68C0\u6D4B\uFF0C
              \u5E38\u7528\u7684\u6BD4\u8F83\u65B9\u6CD5\u5305\u62EC\u76F8\u5173\u6CD5\u3001\u5361\u65B9\u8DDD\u79BB\u3001\u76F4\u65B9\u56FE\u76F8\u4EA4\u6CD5\u548C Bhattacharyya \u8DDD\u79BB\u3002
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              \u76F4\u65B9\u56FE\u5339\u914D\u7684\u6838\u5FC3\u601D\u8DEF\uFF1A\u7528\u76F4\u65B9\u56FE\u4F5C\u4E3A\u7279\u5F81\u63CF\u8FF0\u5B50\uFF0C\u4E0D\u5173\u5FC3\u50CF\u7D20\u7684\u7A7A\u95F4\u5E03\u5C40\uFF0C
              \u53EA\u6BD4\u8F83\u989C\u8272\u6216\u7070\u5EA6\u503C\u7684\u7EDF\u8BA1\u5206\u5E03\u3002
            </p>
          </TeachingCard>

          {/* ---- 2. 四种匹配方法 ---- */}
          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">\u5339\u914D\u65B9\u6CD5</h2>
            <p className="mb-4 text-xs leading-6 text-slate-600">
              \u4EE5\u4E0B\u4E3A\u56DB\u79CD\u5E38\u7528\u7684\u76F4\u65B9\u56FE\u6BD4\u8F83\u65B9\u6CD5\uFF0C\u53EF\u901A\u8FC7\u5DE6\u4FA7\u53C2\u6570\u5207\u6362\u67E5\u770B\u3002
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
            <h2 className="mb-3 text-sm font-semibold text-slate-800">\u5F53\u524D\u65B9\u6CD5\uFF1A{currentHistMethod.label}</h2>
            <TeachingCard tone="amber">
              <p className="text-xs leading-6 text-slate-700">
                {currentHistMethod.info}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                \u76F4\u65B9\u56FE\u5339\u914D\u8BA1\u7B97\u7684\u662F H\u2081 \u4E0E H\u2082 \u5728\u6BCF\u4E2A\u67F1\u4E0A\u7684\u5DEE\u5F02\u6216\u76F8\u5173\u6027\uFF0C\u5C06\u6240\u6709\u67F1\u7684\u7ED3\u679C\u6C47\u603B\u4E3A\u4E00\u4E2A\u76F8\u4F3C\u5EA6\u5206\u6570\u3002
                \u4E0D\u540C\u7684\u65B9\u6CD5\u5173\u6CE8\u7684\u7EDF\u8BA1\u7279\u6027\u4E0D\u540C\uFF1A\u76F8\u5173\u6CD5\u8861\u91CF\u7EBF\u6027\u76F8\u5173\u6027\uFF0C\u5361\u65B9\u8DDD\u79BB\u5BF9\u5DEE\u5F02\u654F\u611F\uFF0C
                \u76F8\u4EA4\u6CD5\u76F4\u63A5\u5EA6\u91CF\u91CD\u53E0\u9762\u79EF\uFF0C\u5DF4\u6C0F\u8DDD\u79BB\u57FA\u4E8E\u6982\u7387\u5206\u5E03\u7684\u91CD\u53E0\u7A0B\u5EA6\u3002
              </p>
            </TeachingCard>
          </div>

          {/* ---- 4. OpenCV compareHist ---- */}
          <div className="border-t border-slate-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">OpenCV \u5B9E\u73B0</h2>
            <p className="mb-3 text-xs leading-6 text-slate-600">
              OpenCV \u63D0\u4F9B <code>compareHist</code> \u51FD\u6570\u8BA1\u7B97\u4E24\u4E2A\u76F4\u65B9\u56FE\u7684\u76F8\u4F3C\u5EA6\uFF0C\u5404\u65B9\u6CD5\u5BF9\u5E94\u7684\u53C2\u6570\u5982\u4E0B\uFF1A
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 text-left font-semibold text-slate-700">\u65B9\u6CD5</th>
                  <th className="py-2 text-left font-semibold text-slate-700">\u53C2\u6570</th>
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
          <h2 className="mb-3 text-sm font-semibold text-slate-800">\u6A21\u677F\u5339\u914D</h2>
          <p className="text-xs leading-6 text-slate-600">
            \u6A21\u677F\u5339\u914D\u7528\u4E8E\u5728\u6E90\u56FE\u50CF\u4E2D\u5BFB\u627E\u5B9A\u4F4D\u7ED9\u5B9A\u76EE\u6807\u56FE\u50CF\uFF08\u6A21\u677F\u56FE\u50CF\uFF09\u3002\u5176\u539F\u7406\u662F\u901A\u8FC7\u4E00\u5B9A\u7684\u76F8\u4F3C\u5EA6\u51C6\u5219
            \u6765\u8861\u91CF\u6A21\u677F\u56FE\u50CF\u4E0E\u88AB\u641C\u7D22\u56FE\u50CF\u4E2D\u6BCF\u4E2A\u7A97\u53E3\u533A\u57DF\u7684\u76F8\u4F3C\u7A0B\u5EA6\u3002
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            \u6A21\u677F\u5339\u914D\u4E0E\u76F4\u65B9\u56FE\u5339\u914D\u7684\u533A\u522B\uFF1A\u76F4\u65B9\u56FE\u5339\u914D\u53EA\u5173\u5FC3\u50CF\u7D20\u7684\u7EDF\u8BA1\u5206\u5E03\uFF0C\u4E0D\u5173\u5FC3\u7A7A\u95F4\u6392\u5217\uFF1B
            \u800C\u6A21\u677F\u5339\u914D\u9010\u7A97\u53E3\u6BD4\u8F83\u50CF\u7D20\u7684\u5C40\u90E8\u6392\u5217\uFF0C\u5BF9\u7A7A\u95F4\u5E03\u5C40\u654F\u611F\u3002
          </p>
        </TeachingCard>

        {/* ---- 2. 滑动窗口原理（带图像） ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">\u6ED1\u52A8\u7A97\u53E3\u539F\u7406</h2>
          <p className="mb-3 text-xs leading-6 text-slate-600">
            \u6A21\u677F T(m\u00D7n) \u5728\u6E90\u56FE\u50CF S(W\u00D7H) \u4E0A\u4ECE\u5DE6\u5230\u53F3\u3001\u4ECE\u4E0A\u5230\u4E0B\u9010\u50CF\u7D20\u5E73\u79FB\uFF0C\u6A21\u677F\u8986\u76D6\u7684\u533A\u57DF\u79F0\u4E3A\u5B50\u56FE S_ij\u3002
            \u641C\u7D22\u8303\u56F4\u4E3A\uFF1A1 \u2264 i \u2264 W-m\uFF0C1 \u2264 j \u2264 H-n\u3002
          </p>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <figure>
              <img
                src="/assets/histogram-template-matching/templ-sliding-window.jpg"
                alt="\u6A21\u677F\u5339\u914D\u6ED1\u52A8\u7A97\u53E3\u539F\u7406"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">\u6ED1\u52A8\u7A97\u53E3\uFF1A\u6A21\u677F\u5728\u6E90\u56FE\u50CF\u4E0A\u9010\u50CF\u7D20\u5E73\u79FB</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/templ-concept-1.jpg"
                alt="\u6A21\u677F\u5339\u914D\u793A\u610F"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">\u6A21\u677F\u5339\u914D\u8FC7\u7A0B\u793A\u610F</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/templ-concept-2.jpg"
                alt="\u6A21\u677F\u5339\u914D\u793A\u610F"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">\u5B50\u56FE\u4E0E\u6A21\u677F\u6BD4\u8F83</figcaption>
            </figure>
          </div>

          <TeachingCard>
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold">\u5173\u952E\u6982\u5FF5\uFF1A</span>\u5BF9\u6BCF\u4E2A\u4F4D\u7F6E (i,j) \u8BA1\u7B97\u4E00\u4E2A\u76F8\u4F3C\u5EA6\u503C\uFF0C
              \u904D\u5386\u5B8C\u6210\u540E\u5F97\u5230\u4E00\u5F20\u54CD\u5E94\u56FE\uFF08\u5C3A\u5BF8 (W-w+1)\u00D7(H-h+1)\uFF09\u3002
              \u6839\u636E\u6240\u9009\u65B9\u6CD5\uFF0C\u5728\u54CD\u5E94\u56FE\u4E2D\u5BFB\u627E\u6700\u5C0F\u503C\u6216\u6700\u5927\u503C\u4F4D\u7F6E\u5373\u4E3A\u6700\u4F73\u5339\u914D\u3002
            </p>
          </TeachingCard>
        </div>

        {/* ---- 3. SSD 与 SAD 公式 ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">\u5339\u914D\u51C6\u5219</h2>
          <p className="mb-4 text-xs leading-6 text-slate-600">
            \u8861\u91CF\u6A21\u677F T \u4E0E\u5B50\u56FE S_ij \u7684\u5339\u914D\u7A0B\u5EA6\uFF0C\u6700\u57FA\u7840\u7684\u4E24\u79CD\u51C6\u5219\u662F SSD\uFF08\u5E73\u65B9\u5DEE\u4E4B\u548C\uFF09\u548C SAD\uFF08\u7EDD\u5BF9\u5DEE\u4E4B\u548C\uFF09\uFF0C
            \u4E8C\u8005\u7684\u503C\u8D8A\u5C0F\u8868\u793A\u5339\u914D\u7A0B\u5EA6\u8D8A\u9AD8\u3002
          </p>

          <div className="space-y-4">
            <FormulaCard
              label="SSD\uFF08\u5E73\u65B9\u5DEE\uFF09"
              mathML={SSD_FORMULA}
              note="\u5BF9\u6A21\u677F\u548C\u5B50\u56FE\u5BF9\u5E94\u4F4D\u7F6E\u7684\u50CF\u7D20\u503C\u6C42\u5DEE\u540E\u5E73\u65B9\uFF0C\u518D\u5168\u90E8\u6C42\u548C\u3002\u5E73\u65B9\u64CD\u4F5C\u653E\u5927\u4E86\u8F83\u5927\u5DEE\u5F02\u7684\u5F71\u54CD\u3002"
            />
            <FormulaCard
              label="SAD\uFF08\u7EDD\u5BF9\u5DEE\uFF09"
              mathML={SAD_FORMULA}
              note="\u5BF9\u6A21\u677F\u548C\u5B50\u56FE\u5BF9\u5E94\u4F4D\u7F6E\u7684\u50CF\u7D20\u503C\u6C42\u7EDD\u5BF9\u5DEE\u540E\u6C42\u548C\u3002\u76F8\u6BD4 SSD \u5BF9\u5927\u5DEE\u5F02\u7684\u60E9\u7F5A\u66F4\u6E29\u548C\u3002"
            />
          </div>

          <TeachingCard tone="amber" className="mt-4">
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold">SSD \u4E0E SAD \u7684\u5DEE\u5F02\uFF1A</span>
              SSD \u5BF9\u50CF\u7D20\u503C\u5DEE\u5F02\u8FDB\u884C\u5E73\u65B9\uFF0C\u4F7F\u8F83\u5927\u7684\u5DEE\u5F02\u88AB\u653E\u5927\u7A81\u51FA\uFF0C\u5BF9\u8FB9\u7F18\u548C\u7EB9\u7406\u53D8\u5316\u66F4\u654F\u611F\uFF1B
              SAD \u4F7F\u7528\u7EDD\u5BF9\u503C\uFF0C\u5BF9\u6240\u6709\u5DEE\u5F02\u7B49\u6743\u5904\u7406\uFF0C\u8BA1\u7B97\u91CF\u66F4\u5C0F\u4F46\u5BF9\u566A\u58F0\u66F4\u4E0D\u654F\u611F\u3002
              \u4E24\u8005\u5747\u8F93\u51FA\u6700\u5C0F\u7684\u4F4D\u7F6E\u4F5C\u4E3A\u6700\u4F73\u5339\u914D\u3002
            </p>
          </TeachingCard>
        </div>

        {/* ---- 4. 模板匹配实验结果 ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">\u6A21\u677F\u5339\u914D\u5B9E\u9A8C\u793A\u4F8B</h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <figure>
              <img
                src="/assets/histogram-template-matching/original-image.jpg"
                alt="\u539F\u59CB\u56FE\u50CF"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">\uFF08a\uFF09\u539F\u59CB\u56FE\u50CF</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/template-image.jpg"
                alt="\u6A21\u677F\u56FE\u50CF"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">\uFF08b\uFF09\u6A21\u677F\u56FE\u50CF</figcaption>
            </figure>
            <figure>
              <img
                src="/assets/histogram-template-matching/matching-result.jpg"
                alt="\u5339\u914D\u7ED3\u679C\u56FE\u50CF"
                className="w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500">\uFF08c\uFF09\u5339\u914D\u7ED3\u679C\u56FE\u50CF</figcaption>
            </figure>
          </div>

          <figure className="mb-4">
            <img
              src="/assets/histogram-template-matching/matching-process.jpg"
              alt="\u6A21\u677F\u5339\u914D\u8FC7\u7A0B\u56FE"
              className="w-full max-w-lg rounded-lg object-cover"
            />
            <figcaption className="mt-1.5 text-xs text-slate-500">\u6A21\u677F\u5339\u914D\u8FC7\u7A0B\u56FE</figcaption>
          </figure>

          <figure className="mb-4">
            <img
              src="/assets/histogram-template-matching/matching-final-result.jpg"
              alt="\u6A21\u677F\u5339\u914D\u7ED3\u679C\u56FE"
              className="w-full max-w-lg rounded-lg object-cover"
            />
            <figcaption className="mt-1.5 text-xs text-slate-500">\u6A21\u677F\u5339\u914D\u7ED3\u679C\u56FE\uFF1A\u5728\u539F\u59CB\u56FE\u50CF\u4E2D\u51C6\u786E\u5B9A\u4F4D\u4E86\u6A21\u677F\u4F4D\u7F6E</figcaption>
          </figure>

          <TeachingCard>
            <p className="text-xs leading-6 text-slate-700">
              <span className="font-semibold">\u5B9E\u9A8C\u5206\u6790\uFF1A</span>\u901A\u8FC7\u6A21\u677F\u5339\u914D\u7B97\u6CD5\uFF0C\u53EF\u4EE5\u5728\u5305\u542B\u591A\u4E2A\u76EE\u6807\u7684\u590D\u6742\u573A\u666F\u4E2D
              \u51C6\u786E\u627E\u5230\u4E0E\u6A21\u677F\u6700\u76F8\u4F3C\u7684\u533A\u57DF\u3002\u5339\u914D\u7ED3\u679C\u7684\u7CBE\u5EA6\u53D6\u51B3\u4E8E\u6240\u9009\u65B9\u6CD5\u3001\u6A21\u677F\u7684\u533A\u5206\u5EA6\u4EE5\u53CA\u76EE\u6807\u662F\u5426\u53D1\u751F\u65CB\u8F6C\u6216\u5C3A\u5EA6\u53D8\u5316\u3002
              \u6A21\u677F\u5339\u914D\u5BF9\u76EE\u6807\u7684\u65CB\u8F6C\u548C\u5C3A\u5EA6\u53D8\u5316\u8F83\u4E3A\u654F\u611F\u2014\u2014\u76EE\u6807\u65CB\u8F6C\u6216\u7F29\u653E\u540E\uFF0C\u54CD\u5E94\u503C\u4F1A\u663E\u8457\u4E0B\u964D\u3002
            </p>
          </TeachingCard>
        </div>

        {/* ---- 5. OpenCV matchTemplate ---- */}
        <div className="border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">OpenCV matchTemplate</h2>
          <p className="mb-3 text-xs leading-6 text-slate-600">
            OpenCV \u7684 <code>matchTemplate</code> \u51FD\u6570\u63D0\u4F9B\u516D\u79CD\u5339\u914D\u65B9\u6CD5\uFF0C\u5206\u4E3A\u4E24\u7EC4\uFF1A
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 text-left font-semibold text-slate-700">\u65B9\u6CD5</th>
                <th className="py-2 pr-3 text-left font-semibold text-slate-700">\u53C2\u6570</th>
                <th className="py-2 text-left font-semibold text-slate-700">\u5224\u5B9A\u51C6\u5219</th>
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
              <span className="font-semibold">\u5206\u7EC4\u8BF4\u660E\uFF1A</span>
              \u524D\u4E24\u79CD\u65B9\u6CD5\uFF08\u5E73\u65B9\u5DEE\u3001\u5F52\u4E00\u5316\u5E73\u65B9\u5DEE\uFF09\u8F93\u51FA\u503C\u8D8A\u5C0F\u8868\u793A\u5339\u914D\u8D8A\u597D\uFF0C\u6700\u4F73\u5339\u914D\u5728\u54CD\u5E94\u56FE\u4E2D\u53D6\u6700\u5C0F\u503C\uFF1B
              \u540E\u56DB\u79CD\u65B9\u6CD5\uFF08\u76F8\u5173\u3001\u5F52\u4E00\u5316\u76F8\u5173\u3001\u76F8\u5173\u7CFB\u6570\u3001\u5F52\u4E00\u5316\u76F8\u5173\u7CFB\u6570\uFF09\u8F93\u51FA\u503C\u8D8A\u5927\u8868\u793A\u5339\u914D\u8D8A\u597D\uFF0C
              \u6700\u4F73\u5339\u914D\u5728\u54CD\u5E94\u56FE\u4E2D\u53D6\u6700\u5927\u503C\u3002\u5F52\u4E00\u5316\u7248\u672C\u5BF9\u5149\u7167\u53D8\u5316\u5177\u6709\u66F4\u597D\u7684\u9C81\u68D2\u6027\u3002
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
        label="\u6559\u5B66\u7AE0\u8282"
        value={section}
        onChange={handleSectionChange}
        options={[
          { value: 'histogram', label: '\u76F4\u65B9\u56FE\u5339\u914D' },
          { value: 'template', label: '\u6A21\u677F\u5339\u914D' },
        ]}
      />
      {section === 'histogram' && (
        <SelectParam
          label="\u5339\u914D\u65B9\u6CD5"
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
      title="\u76F4\u65B9\u56FE\u5339\u914D\u4E0E\u6A21\u677F\u5339\u914D"
      subtitle="Histogram Matching & Template Matching - \u57FA\u4E8E\u7279\u5F81\u5339\u914D\u7684\u76EE\u6807\u68C0\u6D4B"
      operationLabel="\u7279\u5F81\u5339\u914D"
      parameterIntro="\u5207\u6362\u76F4\u65B9\u56FE\u5339\u914D\u548C\u6A21\u677F\u5339\u914D\u4E24\u4E2A\u7AE0\u8282\uFF0C\u5206\u522B\u67E5\u770B\u5339\u914D\u65B9\u6CD5\u7684\u516C\u5F0F\u548C\u5B9E\u9A8C\u793A\u4F8B\u3002"
      originalImage={originalImage}
      resultImage={resultImage}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={codeSections} />}
      imageHints={{
        input: '\u793A\u4F8B\u56FE\uFF0812\u00D712\uFF09',
        output: '\u793A\u4F8B\u56FE\uFF0812\u00D712\uFF09',
      }}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
    />
  );
}
