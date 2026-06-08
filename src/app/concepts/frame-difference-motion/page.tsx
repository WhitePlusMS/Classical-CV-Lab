'use client';

import React from 'react';
import {
  CodeViewer,
  ConceptLayout,
  FlowColumn,
  FlowColumns,
  FlowNode,
  FormulaCard,
  ProcessRail,
  TeachingCard,
  buildInlineMathML,
} from '@/components';
import { createMotionSequence, computeFrameDifference } from '@/lib/algorithms/simpleBackground';

const FRAME_CODE_TS = `function frameDifference(previous, current, threshold) {
  return abs(current - previous) > threshold ? 1 : 0;
}

function symmetricDifference(f1, f2, f3, threshold) {
  const d12 = abs(f1 - f2);
  const d32 = abs(f3 - f2);
  const b12 = d12 > threshold ? 1 : 0;
  const b32 = d32 > threshold ? 1 : 0;
  const binary = b12 & b32;
  const morphology = close(binary);
  return connectedComponents(morphology);
}`;

const TIME_DIFF_EXAMPLES = [
  {
    src: '/assets/simple-background/frame-course-current.jpg',
    label: '当前帧1',
  },
  {
    src: '/assets/simple-background/frame-course-previous.jpg',
    label: '当前帧的前一帧 H',
  },
  {
    src: '/assets/simple-background/frame-course-motion-target.jpg',
    label: '运动目标 D(x,y)',
  },
] as const;

const SYMMETRIC_EXPERIMENT_STEPS = [
  {
    title: '1. 三帧图像序列',
    description: '输入第一帧、第二帧和第三帧。',
    images: [
      { src: '/assets/simple-background/symmetric-a-frame1.jpg', label: '(a) 第一帧' },
      { src: '/assets/simple-background/symmetric-b-frame2.jpg', label: '(b) 第二帧' },
      { src: '/assets/simple-background/symmetric-c-frame3.jpg', label: '(c) 第三帧' },
    ],
  },
  {
    title: '2. 两次帧间差',
    description: '分别计算第一帧与第二帧、第三帧与第二帧的绝对差。',
    images: [
      { src: '/assets/simple-background/symmetric-d-diff12.jpg', label: '(d) |f1 - f2|' },
      { src: '/assets/simple-background/symmetric-e-diff32.jpg', label: '(e) |f3 - f2|' },
    ],
  },
  {
    title: '3. 二值化结果',
    description: '对差分图做阈值化，得到候选运动区域。',
    images: [
      { src: '/assets/simple-background/symmetric-f-binary.jpg', label: '(f) 二值化结果' },
    ],
  },
  {
    title: '4. 形态学处理',
    description: '填充内部空洞，清除小噪声，平滑物体边缘。',
    images: [
      { src: '/assets/simple-background/symmetric-g-morphology.jpg', label: '(g) 形态学处理结果' },
    ],
  },
  {
    title: '5. 目标提取',
    description: '连通标注后提取运动目标及外轮廓。',
    images: [
      { src: '/assets/simple-background/symmetric-h-target.jpg', label: '(h) 目标提取结果' },
    ],
  },
] as const;

const displaySequence = createMotionSequence(6, 10);
const displayResult = computeFrameDifference(displaySequence, 52, 'twoFrame');

function frameDifferenceFormulaMathML(): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>D</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
      <mo>=</mo>
      <mrow>
        <mo>{</mo>
        <mtable>
          <mtr>
            <mtd><mn>1</mn></mtd>
            <mtd>
              <mo>|</mo><msub><mi>I</mi><mi>t</mi></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo>
              <mo>-</mo>
              <msub><mi>I</mi><mrow><mi>t</mi><mo>-</mo><mn>1</mn></mrow></msub><mo>(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>|</mo>
              <mo>&gt;</mo><mi>T</mi>
            </mtd>
          </mtr>
          <mtr>
            <mtd><mn>0</mn></mtd>
            <mtd><mtext>otherwise</mtext></mtd>
          </mtr>
        </mtable>
      </mrow>
      <mo>=</mo>
      <mrow>
        <mo>{</mo>
        <mtable>
          <mtr><mtd><mn>1</mn></mtd><mtd><mo>|</mo><mn>146</mn><mo>-</mo><mn>82</mn><mo>|</mo><mo>&gt;</mo><mn>60</mn></mtd></mtr>
          <mtr><mtd><mn>0</mn></mtd><mtd><mtext>otherwise</mtext></mtd></mtr>
        </mtable>
      </mrow>
      <mo>=</mo>
      <mrow>
        <mo>{</mo>
        <mtable>
          <mtr><mtd><mn>1</mn></mtd><mtd><mn>64</mn><mo>&gt;</mo><mn>60</mn></mtd></mtr>
          <mtr><mtd><mn>0</mn></mtd><mtd><mtext>otherwise</mtext></mtd></mtr>
        </mtable>
      </mrow>
      <mo>=</mo><mn>1</mn>
    </mrow>
  `);
}

function symmetricDifferenceFormulaMathML(): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>B</mi><mn>12</mn></msub>
      <mo>=</mo><mo>[</mo><mo>|</mo><msub><mi>f</mi><mn>1</mn></msub><mo>-</mo><msub><mi>f</mi><mn>2</mn></msub><mo>|</mo><mo>&gt;</mo><mi>T</mi><mo>]</mo>
      <mo>,</mo>
      <msub><mi>B</mi><mn>32</mn></msub>
      <mo>=</mo><mo>[</mo><mo>|</mo><msub><mi>f</mi><mn>3</mn></msub><mo>-</mo><msub><mi>f</mi><mn>2</mn></msub><mo>|</mo><mo>&gt;</mo><mi>T</mi><mo>]</mo>
      <mo>,</mo>
      <mi>B</mi>
      <mo>=</mo><msub><mi>B</mi><mn>12</mn></msub><mo>∧</mo><msub><mi>B</mi><mn>32</mn></msub>
      <mo>=</mo><mn>1</mn><mo>∧</mo><mn>1</mn>
      <mo>=</mo><mn>1</mn>
    </mrow>
  `);
}

function morphologyFormulaMathML(): string {
  return buildInlineMathML(`
    <mrow>
      <msub><mi>B</mi><mi>clean</mi></msub>
      <mo>=</mo><mi>Close</mi><mo>(</mo><mi>B</mi><mo>)</mo>
      <mo>=</mo><mi>Erode</mi><mo>(</mo><mi>Dilate</mi><mo>(</mo><mi>B</mi><mo>)</mo><mo>)</mo>
      <mo>→</mo><mtext>连通标注</mtext>
      <mo>→</mo><mtext>外接矩形</mtext>
      <mo>→</mo><mtext>目标提取</mtext>
    </mrow>
  `);
}

function CourseImage({
  src,
  label,
  className = 'h-44',
}: {
  src: string;
  label: string;
  className?: string;
}) {
  return (
    <figure className="space-y-2">
      <div className={`flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950 ${className}`}>
        <img src={src} alt={label} className="h-full w-full object-contain" />
      </div>
      <figcaption className="text-center text-xs font-semibold text-slate-700">{label}</figcaption>
    </figure>
  );
}

export default function FrameDifferenceMotionPage() {
  const mainVisual = (
    <section className="mx-auto w-full max-w-6xl">
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">时间差分法示例</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              相邻帧差异用于检测场景变化，结果是运动候选区域而不是完整物体语义。
            </p>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:grid-cols-3">
          {TIME_DIFF_EXAMPLES.map(item => (
            <CourseImage key={item.src} src={item.src} label={item.label} className="h-60" />
          ))}
        </div>
      </div>
    </section>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red">
            <div className="text-xs font-semibold text-red-700">相邻两帧输入</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              时间差分法比较前一帧与当前帧在同一像素位置的灰度变化。
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="center">
          <FlowNode tone="amber">
            <div className="text-xs font-semibold text-amber-700">绝对差与阈值</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              计算 |It - It-1|，当差值大于阈值 T 时，该位置被标记为变化区域。
            </p>
          </FlowNode>
        </FlowColumn>
        <FlowColumn align="end">
          <FlowNode tone="emerald">
            <div className="text-xs font-semibold text-emerald-700">运动候选区域</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              输出结果表示帧间发生明显变化的位置，需要后续形态学和连通区域处理才能形成目标区域。
            </p>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const stepDetails = (
    <div className="space-y-5">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">时间差分法</h2>
        <FormulaCard
          label="相邻帧变化判定"
          mathML={frameDifferenceFormulaMathML()}
          note="时间差分法通过比较相邻两帧同一位置的灰度差，检测场景变化。"
        />
        <TeachingCard>
          <div className="text-sm font-semibold text-slate-800">优点与限制</div>
          <div className="mt-3 grid gap-3 text-xs leading-6 text-slate-600 md:grid-cols-2">
            <p><span className="font-semibold text-emerald-700">优点：</span>鲁棒性较好、运算量小、易于实现，适合静止摄像机下的快速变化检测。</p>
            <p><span className="font-semibold text-rose-700">限制：</span>对噪声敏感，运动实体内部容易出现空洞；阈值 T 缺少自适应性，光照变化会影响检测结果。</p>
          </div>
        </TeachingCard>
      </section>

      <section className="border-t border-slate-200 pt-4">
        <h2 className="text-sm font-semibold text-slate-800">对称差分法</h2>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          对称差分法是时间差分法的三帧实验示例。它先取连续三帧，再分别计算前后两次帧间差，用两次差分共同约束中间帧的运动候选区域。
        </p>
      </section>

      <section className="border-t border-slate-200 pt-4">
        <h2 className="text-sm font-semibold text-slate-800">对称差分法流程图</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <img
            src="/assets/simple-background/symmetric-flowchart.jpg"
            alt="对称差分法流程图"
            className="mx-auto max-h-[560px] w-full object-contain"
          />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-4">
        <h2 className="text-sm font-semibold text-slate-800">对称差分法实验效果</h2>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          实验步骤按三帧输入、两次差分、二值化、形态学处理和目标提取组织。
        </p>
        <div className="mt-4 space-y-5">
          {SYMMETRIC_EXPERIMENT_STEPS.map(step => (
            <div key={step.title} className="border-t border-slate-200/80 pt-4 first:border-t-0 first:pt-0">
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-slate-800">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
              </div>
              <div className={`grid gap-3 ${step.images.length === 3 ? 'md:grid-cols-3' : step.images.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                {step.images.map(image => (
                  <CourseImage key={image.src} src={image.src} label={image.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-4">
        <h2 className="text-sm font-semibold text-slate-800">对称差分法公式链</h2>
        <FormulaCard
          label="两次差分与交集"
          mathML={symmetricDifferenceFormulaMathML()}
          note="两次差分同时成立时，当前像素才保留为中间帧的运动候选区域。"
        />
        <FormulaCard
          label="形态学与目标提取"
          mathML={morphologyFormulaMathML()}
          note="二值化结果经过形态学处理和连通区域标注后，得到最终运动目标及外轮廓。"
        />
      </section>
    </div>
  );

  const parameters = (
    <div className="space-y-4 text-xs leading-6 text-slate-600">
      <div className="border-l-2 border-emerald-300 bg-emerald-50/70 px-3 py-3">
        <div className="font-semibold text-emerald-700">讲解顺序</div>
        <p className="mt-1">先讲时间差分法定义、公式、优点与限制；再用对称差分法实验图解释三帧流程。</p>
      </div>
      <div className="border-t border-slate-200 pt-3">
        页面使用课程图像素材展示流程，不提供额外调参滑杆。
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="帧差法与运动检测"
      subtitle="Frame Difference & Motion - 相邻帧变化检测"
      operationLabel="帧间差分"
      parameterIntro="时间差分法通过相邻帧灰度变化检测运动区域；对称差分法用于展示三帧实验流程。"
      originalImage={displaySequence.current}
      resultImage={displayResult.cleaned}
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={<CodeViewer languages={[{ name: 'Pseudo Code', code: FRAME_CODE_TS }]} />}
      mainVisual={mainVisual}
      showOriginalGrid={false}
      originalRegionMarker="dot"
      singlePageScroll
      showNavigationBar={false}
      showNavigationControls={false}
      showInputSelection={false}
    />
  );
}
