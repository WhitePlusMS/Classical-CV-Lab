'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
 import {
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
   buildInlineMathML,
 } from '@/components';
import { useLenaGrayscaleImage } from '@/hooks/useLenaGrayscaleImage';
import { GrayscaleImage } from '@/lib/algorithms/types';
import { loadImageAsGrayscale, resizeGrayscaleImage } from '@/lib/utils/imageProcessing';

/// ============================================================
/// 二进制特征描述子页面常量与工具
/// ============================================================

type SamplingMethod = 'GI' | 'GII' | 'GIII' | 'GIV' | 'GV';
type PatchSource = 'synthetic' | 'lenaPatch';

const SAMPLING_OPTIONS: { value: SamplingMethod; label: string; desc: string }[] = [
  { value: 'GI',   label: 'GI - 均匀分布',           desc: 'X、Y 在 Patch 内均匀分布' },
  { value: 'GII',  label: 'GII - 高斯分布',          desc: 'X、Y 均服从高斯分布（中心密集）' },
  { value: 'GIII', label: 'GIII - X 中心取 Y',       desc: '先随机取 X，再以 X 为中心取 Y' },
  { value: 'GIV',  label: 'GIV - 极坐标量化',        desc: '空间量化极坐标系下随机取 2N 个点' },
  { value: 'GV',   label: 'GV - 中心固定极坐标遍历', desc: 'X 固定在中心，Y 在极坐标系取所有可能值' },
];

const PAIR_OPTIONS: { value: number; label: string }[] = [
  { value: 128, label: '128 bit' },
  { value: 256, label: '256 bit' },
  { value: 512, label: '512 bit' },
];

/// 合成 9×9 Patch（模拟一个弱角点区域的灰度值，范围 0~255）
const SYNTHETIC_PATCH: number[][] = [
  [180, 178, 175, 170, 165, 160, 158, 155, 152],
  [176, 172, 168, 162, 155, 148, 142, 138, 135],
  [170, 165, 158, 150, 140, 130, 122, 118, 115],
  [162, 155, 145, 132, 118, 105,  95,  90,  88],
  [158, 148, 135, 118, 100,  82,  70,  65,  62],
  [152, 140, 125, 105,  82,  60,  48,  42,  40],
  [148, 135, 118,  95,  70,  48,  35,  30,  28],
  [145, 132, 115,  90,  65,  42,  30,  25,  22],
  [142, 130, 112,  88,  62,  40,  28,  22,  20],
];

const PATCH_SIZE = 9;

function createPatchPreviewImage(): GrayscaleImage {
  const size = 64;
  return Array.from({ length: size }, (_, y) => {
    const sourceY = Math.min(PATCH_SIZE - 1, Math.floor((y / size) * PATCH_SIZE));
    return Array.from({ length: size }, (_, x) => {
      const sourceX = Math.min(PATCH_SIZE - 1, Math.floor((x / size) * PATCH_SIZE));
      return SYNTHETIC_PATCH[sourceY][sourceX] / 255;
    });
  });
}

const FALLBACK_PATCH_IMAGE = createPatchPreviewImage();

/** 从 Lena 灰度图中提取 9x9 区域作为真实 Patch */
function extractLenaPatch(lenaImage: GrayscaleImage): number[][] {
  const h = lenaImage.length;
  const w = lenaImage[0]?.length ?? 1;
  const cx = Math.floor(w * 0.58);
  const cy = Math.floor(h * 0.42);
  const half = Math.floor(PATCH_SIZE / 2);
  const x0 = Math.max(0, Math.min(cx - half, w - PATCH_SIZE));
  const y0 = Math.max(0, Math.min(cy - half, h - PATCH_SIZE));
  return lenaImage.slice(y0, y0 + PATCH_SIZE).map(row => row.slice(x0, x0 + PATCH_SIZE).map(v => Math.round(v * 255)));
}

/// 根据采样方式生成随机点对坐标
function generatePairs(method: SamplingMethod, count: number, seed: number = 42): [number, number, number, number][] {
  const half = Math.floor(PATCH_SIZE / 2);
  const pairs: [number, number, number, number][] = [];

  // 简单随机数生成器（固定种子保证可复现）
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    let x1: number, y1: number, x2: number, y2: number;

    switch (method) {
      case 'GI': {
        // X、Y 均匀分布
        x1 = Math.floor(rand() * PATCH_SIZE);
        y1 = Math.floor(rand() * PATCH_SIZE);
        x2 = Math.floor(rand() * PATCH_SIZE);
        y2 = Math.floor(rand() * PATCH_SIZE);
        break;
      }
      case 'GII': {
        // X、Y 均服从高斯分布（Box-Muller 变体）
        const sampleGauss = (): number => {
          const u1 = rand();
          const u2 = rand();
          const r = Math.sqrt(-2 * Math.log(u1 + 0.0001));
          const theta = 2 * Math.PI * u2;
          const z = r * Math.cos(theta);
          // 映射到 [0, PATCH_SIZE)，中心在 half
          return Math.round(Math.min(PATCH_SIZE - 1, Math.max(0, z * 1.2 + half)));
        };
        x1 = sampleGauss();
        y1 = sampleGauss();
        x2 = sampleGauss();
        y2 = sampleGauss();
        break;
      }
      case 'GIII': {
        // 先随机取 X，再以 X 为中心取 Y（高斯偏移）
        x1 = Math.floor(rand() * PATCH_SIZE);
        y1 = Math.floor(rand() * PATCH_SIZE);
        const u = rand();
        const v = rand();
        const offX = Math.round((u * 2 - 1) * 2);
        const offY = Math.round((v * 2 - 1) * 2);
        x2 = Math.min(PATCH_SIZE - 1, Math.max(0, x1 + offX));
        y2 = Math.min(PATCH_SIZE - 1, Math.max(0, y1 + offY));
        break;
      }
      case 'GIV': {
        // 极坐标量化下取 2N 个点，两两配对
        const r1 = rand() * half;
        const theta1 = rand() * 2 * Math.PI;
        const r2 = rand() * half;
        const theta2 = rand() * 2 * Math.PI;
        x1 = Math.round(half + r1 * Math.cos(theta1));
        y1 = Math.round(half + r1 * Math.sin(theta1));
        x2 = Math.round(half + r2 * Math.cos(theta2));
        y2 = Math.round(half + r2 * Math.sin(theta2));
        x1 = Math.min(PATCH_SIZE - 1, Math.max(0, x1));
        y1 = Math.min(PATCH_SIZE - 1, Math.max(0, y1));
        x2 = Math.min(PATCH_SIZE - 1, Math.max(0, x2));
        y2 = Math.min(PATCH_SIZE - 1, Math.max(0, y2));
        break;
      }
      case 'GV': {
        // X 固定在中心，Y 在极坐标系取尽可能多的值
        x1 = half;
        y1 = half;
        const r = rand() * half;
        const theta = rand() * 2 * Math.PI;
        x2 = Math.round(half + r * Math.cos(theta));
        y2 = Math.round(half + r * Math.sin(theta));
        x2 = Math.min(PATCH_SIZE - 1, Math.max(0, x2));
        y2 = Math.min(PATCH_SIZE - 1, Math.max(0, y2));
        break;
      }
      default: {
        x1 = 0; y1 = 0; x2 = 0; y2 = 0;
      }
    }

    pairs.push([x1, y1, x2, y2]);
  }

  return pairs;
}

/// τ 测试：比较两点灰度
function tauTest(patch: number[][], x1: number, y1: number, x2: number, y2: number): number {
  return patch[y1][x1] < patch[y2][x2] ? 1 : 0;
}

/// 构建描述子二进制串
function buildDescriptor(patch: number[][], pairs: [number, number, number, number][], upTo: number): string {
  let bits = '';
  for (let i = 0; i < Math.min(upTo, pairs.length); i++) {
    const [x1, y1, x2, y2] = pairs[i];
    bits += tauTest(patch, x1, y1, x2, y2).toString();
  }
  return bits;
}

/// ============================================================
/// 公式 MathML
/// ============================================================

/* τ 测试分段函数 */
const TAU_FORMULA = buildInlineMathML(
  '<mrow><mi>τ</mi><mo>(</mo><mi>p</mi><mo>;</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo>)</mo><mo>:=</mo>' +
  '<mrow><mo>{</mo><mtable>' +
  '<mtr><mtd><mn>1</mn></mtd><mtd><mtext>当 </mtext><mi>p</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>&lt;</mo><mi>p</mi><mo>(</mo><mi>y</mi><mo>)</mo></mtd></mtr>' +
  '<mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr>' +
  '</mtable></mrow></mrow>'
);

/* BRIEF 描述子：f_nd(p) = Σ 2^(i-1) τ(p; x_i, y_i) */
const BRIEF_DESCRIPTOR_FORMULA = buildInlineMathML(
  '<mrow><msub><mi>f</mi><msub><mi>n</mi><mi>d</mi></msub></msub><mo>(</mo><mi>p</mi><mo>)</mo>' +
  '<mo>:=</mo><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><msub><mi>n</mi><mi>d</mi></msub></munderover>' +
  '<msup><mn>2</mn><mrow><mi>i</mi><mo>-</mo><mn>1</mn></mrow></msup>' +
  '<mi>τ</mi><mo>(</mo><mi>p</mi><mo>;</mo><msub><mi>x</mi><mi>i</mi></msub><mo>,</mo><msub><mi>y</mi><mi>i</mi></msub><mo>)</mo></mrow>'
);

/* 汉明距离定义 */
const HAMMING_FORMULA = buildInlineMathML(
  '<mrow><mi>d</mi><mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>,</mo><msub><mi>f</mi><mn>2</mn></msub><mo>)</mo>' +
  '<mo>=</mo><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover>' +
  '<mo>(</mo><msub><mi>f</mi><mn>1</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>⊕</mo><msub><mi>f</mi><mn>2</mn></msub><mo>[</mo><mi>i</mi><mo>]</mo><mo>)</mo></mrow>'
);

/* 方向分配：Intensity Centroid */
const CENTROID_FORMULA = buildInlineMathML(
  '<mrow><mi>m</mi><mo>(</mo><msub><mi>p</mi><mn>10</mn></msub><mo>,</mo><msub><mi>p</mi><mn>01</mn></msub><mo>)</mo>' +
  '<mo>=</mo><mfenced open="[" close="]">' +
  '<mtable><mtr><mtd><msub><mi>m</mi><mn>10</mn></msub></mtd></mtr><mtr><mtd><msub><mi>m</mi><mn>01</mn></msub></mtd></mtr></mtable>' +
  '</mfenced>' +
  '<mo>,</mo><mi>θ</mi><mo>=</mo><mi>atan2</mi><mo>(</mo><msub><mi>m</mi><mn>01</mn></msub><mo>,</mo><msub><mi>m</mi><mn>10</mn></msub><mo>)</mo></mrow>'
);

/// ============================================================
/// OpenCV 代码
/// ============================================================

const ORB_CODE_TS = `// OpenCV ORB 特征提取与匹配
Ptr<ORB> orb = ORB::create();
vector<KeyPoint> keypoints1, keypoints2;
Mat descriptors1, descriptors2;

// 检测关键点
orb->detect(img1, keypoints1);
orb->detect(img2, keypoints2);

// 计算特征描述子
orb->compute(img1, keypoints1, descriptors1);
orb->compute(img2, keypoints2, descriptors2);

// 汉明距离匹配
BFMatcher matcher(NORM_HAMMING, true);
vector<DMatch> matches;
matcher.match(descriptors1, descriptors2, matches);`;

const BRISK_CODE_TS = `// OpenCV BRISK 特征提取与匹配
Ptr<BRISK> detector = BRISK::create();
vector<KeyPoint> kp1, kp2;
Mat des1, des2;

// 检测关键点
detector->detect(src1, kp1);
detector->detect(src2, kp2);

// 计算特征描述子
detector->compute(src1, kp1, des1);
detector->compute(src2, kp2, des2);

// 汉明距离匹配
BFMatcher matcher(NORM_HAMMING, true);
vector<DMatch> matches;
matcher.match(des1, des2, matches);`;

/// ============================================================
/// 页面组件
/// ============================================================

export default function BinaryFeatureDescriptorsPage() {
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>('GI');
  const [numPairs, setNumPairs] = useState(256);
 const [currentPairIndex, setCurrentPairIndex] = useState(0);
 const [patchSource, setPatchSource] = useState<PatchSource>("synthetic");
  const lenaImage = useLenaGrayscaleImage(64);
  const [loadedImage, setLoadedImage] = useState<GrayscaleImage>(FALLBACK_PATCH_IMAGE);
 /// 异步加载课件中的真实图像作为原图展示
 useEffect(() => {
   let cancelled = false;
   loadImageAsGrayscale('/assets/binary-feature-descriptors/0611a984f7a384894e8779c0c84166142a64673d53ccbdac68d1da6bba77e06d.jpg')
     .then((img) => {
       if (!cancelled) {
         const resized = resizeGrayscaleImage(img, 64);
         setLoadedImage(resized);
       }
     })
     .catch(() => {
       if (!cancelled) {
         console.warn('加载参考图像失败');
         setLoadedImage(FALLBACK_PATCH_IMAGE);
       }
     });
   return () => { cancelled = true; };
 }, []);

  const totalPairs = numPairs;

  /// 生成点对（使用种子保证重现性）
  const activePatch = useMemo(() => patchSource === "lenaPatch" && lenaImage ? extractLenaPatch(lenaImage) : SYNTHETIC_PATCH, [patchSource, lenaImage]);

  const pairs = useMemo(
    () => generatePairs(samplingMethod, totalPairs, 42),
    [samplingMethod, totalPairs]
  );

  /// 前 currentPairIndex 对对应的二进制串
  const binaryString = useMemo(
    () => buildDescriptor(activePatch, pairs, currentPairIndex + 1),
    [pairs, currentPairIndex]
  );

  /// 当前点对
  const currentPair = pairs[currentPairIndex] ?? [0, 0, 0, 0];
  const [cx1, cy1, cx2, cy2] = currentPair;
  const v1 = SYNTHETIC_PATCH[cy1]?.[cx1] ?? 0;
  const v2 = SYNTHETIC_PATCH[cy2]?.[cx2] ?? 0;
  const tauResult = tauTest(activePatch, cx1, cy1, cx2, cy2);

  /// 汉明距离（对比一个偏移后的描述子）
  const offsetPairs = useMemo(
    () => generatePairs(samplingMethod, totalPairs, 137),
    [samplingMethod, totalPairs]
  );
  const binaryString2 = useMemo(
    () => buildDescriptor(activePatch, offsetPairs, currentPairIndex + 1),
    [offsetPairs, currentPairIndex]
  );

  const hammingDist = useMemo(() => {
    let dist = 0;
    for (let i = 0; i < binaryString.length; i++) {
      if (binaryString[i] !== binaryString2[i]) dist++;
    }
    return dist;
 }, [binaryString, binaryString2]);
 
 /// 链式代入：逐位展示 BRIEF 描述子的数值计算过程（前 8 位）
 const chainSubstitution = useMemo(() => {
   let sum = 0;
   const rows: { i: number; tau: number; weight: number; contrib: number; sum: number }[] = [];
   const bits = 8;
   for (let i = 0; i < Math.min(bits, pairs.length); i++) {
     const [x1, y1, x2, y2] = pairs[i];
     const v1 = SYNTHETIC_PATCH[y1][x1];
     const v2 = SYNTHETIC_PATCH[y2][x2];
     const tau = v1 < v2 ? 1 : 0;
     const weight = Math.pow(2, i);
     const contrib = weight * tau;
     sum += contrib;
     rows.push({ i: i + 1, tau, weight, contrib, sum });
   }
   return rows;
 }, [pairs]);

  /// 采样方式说明文案
  const samplingInfo = SAMPLING_OPTIONS.find(o => o.value === samplingMethod);

  const stepDetails = (
    <div className="space-y-6">

      {/* ===== 1. BRIEF 概述 ===== */}
      <TeachingCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">BRIEF 描述子概述</h2>
        <p className="text-xs leading-6 text-slate-600">
          BRIEF（Binary Robust Independent Elementary Features）是一种二进制特征描述子。
          它通过在特征点邻域内随机选取 N 对像素点，比较点对间的灰度值大小来生成二进制编码，
          从而避免使用梯度直方图这类高开销计算方法。
        </p>
      </TeachingCard>

      {/* ===== 2. τ 测试函数 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（1）τ 测试函数</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          对于以特征点 p 为中心取出的 S×S 邻域（Patch），定义 τ 测试来比较任意两点 x、y 的灰度大小。
        </p>
        <FormulaCard
          label="τ 测试（点对比较）"
          mathML={TAU_FORMULA}
          note={'当前点对 p(' + cx1 + ',' + cy1 + ')=' + v1 + '，p(' + cx2 + ',' + cy2 + ')=' + v2 +
                '，比较结果 τ = ' + tauResult + '。'}
        />
        <p className="mt-3 text-xs leading-6 text-slate-600">
          在计算前，通常对 2N 个采样点分别做高斯平滑，以抑制噪声干扰。
        </p>
      </div>

      {/* ===== 3. BRIEF 描述子公式 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（2）BRIEF 描述子编码</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          对 N 个点对依次执行 τ 测试，将得到的二进制码按权重 2ⁱ⁻¹ 加权求和，
          得到一个 N 维二进制向量（通常 N = 128、256、512）。
        </p>
        <FormulaCard
          label="BRIEF 描述子"
          mathML={BRIEF_DESCRIPTOR_FORMULA}
         note={'当前二进制串的前 ' + (currentPairIndex + 1) + ' 位：' + binaryString}
       />
       {/* 链式代入展示：前 8 位的逐位计算过程 */}
       <p className="mb-2 mt-4 text-xs font-semibold text-slate-700">
         链式代入过程（前 8 bit）
       </p>
       <div className="overflow-x-auto rounded-xl border border-slate-200">
         <table className="w-full text-left text-[11px] tabular-nums">
           <thead>
             <tr className="bg-slate-100">
               <th className="px-2 py-1.5 font-semibold text-slate-600">i</th>
               <th className="px-2 py-1.5 font-semibold text-slate-600">τ(p; xᵢ, yᵢ)</th>
               <th className="px-2 py-1.5 font-semibold text-slate-600">2^(i-1)</th>
               <th className="px-2 py-1.5 font-semibold text-slate-600">2^(i-1)·τ</th>
               <th className="px-2 py-1.5 font-semibold text-slate-600">累计和</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-200">
             {chainSubstitution.map(r => (
               <tr key={r.i} className={r.i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                 <td className="px-2 py-1.5 font-mono text-slate-800">{r.i}</td>
                 <td className="px-2 py-1.5 font-mono text-slate-700">
                   {r.tau}
                   <span className="ml-1 text-[10px] text-slate-500">
                     {r.tau === 1
                       ? '（p(x) < p(y)）'
                       : '（p(x) ≥ p(y)）'}
                   </span>
                 </td>
                 <td className="px-2 py-1.5 font-mono text-slate-700">{r.weight}</td>
                 <td className="px-2 py-1.5 font-mono text-slate-700">
                   <span className={r.contrib > 0 ? 'font-bold text-amber-700' : 'text-slate-400'}>
                     {r.contrib}
                   </span>
                 </td>
                 <td className="px-2 py-1.5 font-mono font-semibold text-blue-700">{r.sum}</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
      </div>

      {/* ===== 4. 五种采样方式 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（3）BRIEF 随机点对采样方式</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          BRIEF 定义了一组采样模式（GI-GV），每种模式对特征点邻域中随机点对的选取策略不同。
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <figure>
            <img
              src="/assets/binary-feature-descriptors/9ecdb642ab81e6009191cc556d69e00d5a7d282a296d4dcdb882258caad7f0d6.jpg"
              alt="GI - 均匀分布采样"
              className="w-full rounded-xl object-cover"
            />
            <figcaption className="mt-1 text-xs text-slate-500">GI：X、Y 在 Patch 内均匀分布</figcaption>
          </figure>
          <figure>
            <img
              src="/assets/binary-feature-descriptors/aabc7266b636397c8fa01bd3cd7f2ad7d807209ff91b763c373fb7c46fb37e90.jpg"
              alt="GIII - 以 X 为中心取 Y"
              className="w-full rounded-xl object-cover"
            />
            <figcaption className="mt-1 text-xs text-slate-500">GIII：先取 X，再以 X 为中心取 Y</figcaption>
          </figure>
          <figure>
            <img
              src="/assets/binary-feature-descriptors/f59097a5181c3855561d55f327db5797aac2a035e9fed9986b847855ca29d92c.jpg"
              alt="GIV - 极坐标量化"
              className="w-full rounded-xl object-cover"
            />
            <figcaption className="mt-1 text-xs text-slate-500">GIV：空间量化极坐标下取点</figcaption>
          </figure>
          <figure>
            <img
              src="/assets/binary-feature-descriptors/3b4b29ffa5205747141dce2cc7291a3a75969e1d375596a49404dccc25ec2428.jpg"
              alt="GV - 中心固定极坐标遍历"
              className="w-full rounded-xl object-cover"
            />
            <figcaption className="mt-1 text-xs text-slate-500">GV：X 固定在中心，Y 遍历极坐标</figcaption>
          </figure>
        </div>
        <TeachingCard>
          <ul className="list-inside list-disc space-y-1 text-xs leading-5 text-slate-700">
            <li><span className="font-semibold">GI</span>：X、Y 在 Patch 内均匀分布</li>
            <li><span className="font-semibold">GII</span>：X、Y 均服从高斯分布（中心区域密集）</li>
            <li><span className="font-semibold">GIII</span>：先随机取 X 点，再以 X 为中心取 Y 点</li>
            <li><span className="font-semibold">GIV</span>：在空间量化极坐标系下，随机取 2N 个点</li>
            <li><span className="font-semibold">GV</span>：X 固定在中心，Y 在极坐标系中取所有可能的值</li>
          </ul>
        </TeachingCard>
      </div>

      {/* ===== 5. BRIEF 优缺点 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（4）BRIEF 特点分析</h2>
        <TeachingCard>
          <p className="text-xs leading-6 text-slate-700">
            <span className="font-semibold text-emerald-700">优点：</span>
            BRIEF 抛弃了传统的梯度直方图描述方法，改用随机像素比较，大大加快了描述子建立速度。
            生成的二进制描述子便于高速匹配——计算汉明距离只需通过异或操作加上统计二进制编码中 "1" 的个数，
            通过底层位运算即可实现，且便于在硬件上实现。
          </p>
          <p className="mt-3 text-xs leading-6 text-slate-700">
            <span className="font-semibold text-red-600">缺点：</span>
            不具备旋转不变性，不具备尺度不变性，容易受噪声影响。
          </p>
        </TeachingCard>
      </div>

      {/* ===== 6. BRISK ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（5）BRISK 描述子</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          BRISK（Binary Robust Invariant Scalable Keypoints）是 BRIEF 的改进算法，
          也是一种基于二进制编码的特征描述子，具备尺度不变性和旋转不变性，同时对噪声鲁棒。
        </p>
        <TeachingCard>
          <div className="space-y-2 text-xs leading-5 text-slate-700">
            <p><span className="font-semibold">特征点检测：</span>
              使用 FAST 或 AGAST 算法检测特征点。为满足尺度不变性，
              BRISK 构造图像金字塔，在多尺度空间中检测特征点。</p>
            <p><span className="font-semibold">特征点描述：</span>
              通过比较邻域 Patch 内像素点对的灰度值进行二进制编码。
              为满足旋转不变性，使用远点对梯度确定主方向。</p>
            <p><span className="font-semibold">特征点匹配：</span>
              与 BRIEF 相同，通过计算汉明距离实现。</p>
          </div>
        </TeachingCard>
        <p className="mt-3 text-xs leading-6 text-slate-600">
          BRISK 具有较好的尺度不变性、旋转不变性和抗噪性能，计算速度优于 SIFT 和 SURF，但次于 ORB。
        </p>
      </div>

      {/* ===== 7. ORB ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（6）ORB 描述子</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          ORB（Oriented FAST and Rotated BRIEF）结合了 FAST 关键点检测与 BRIEF 描述子，
          并为其增加了方向信息。它兼顾了速度与旋转不变性。
        </p>
        <TeachingCard>
          <div className="space-y-2 text-xs leading-5 text-slate-700">
            <p><span className="font-semibold">关键点检测：</span>
              使用 FAST 提取候选关键点，再利用 Harris 角点响应函数去除非角点，
              保留响应最强的前 N 个点。</p>
            <p><span className="font-semibold">方向分配：</span>
              使用 Intensity Centroid 方法计算质心方向。
              质心 m = (m₁₀, m₀₁)，方向 θ = atan2(m₀₁, m₁₀)。</p>
            <p><span className="font-semibold">描述子：</span>
              通过贪心方法选取符合正态分布的随机点对，并按照方向 θ 旋转坐标后执行 BRIEF 编码，
              得到旋转不变的描述子。</p>
          </div>
        </TeachingCard>
        <div className="mt-3">
          <FormulaCard
            label="Intensity Centroid 方向分配"
            mathML={CENTROID_FORMULA}
            note="m₁₀、m₀₁ 为图像块的一阶矩，用于计算质心方向 θ。"
          />
        </div>
      </div>

      {/* ===== 8. 汉明距离匹配 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（7）汉明距离匹配</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          二进制描述子的匹配通过汉明距离实现。汉明距离定义为两个等长二进制串在对应位置上的不同比特数。
          计算时仅需一次异或操作（XOR）加一个 popcount（统计 "1" 的个数），因此速度极快。
        </p>
        <FormulaCard
          label="汉明距离"
          mathML={HAMMING_FORMULA}
          note={'当前二进制描述子 1 为 ' + binaryString + '，' +
                '描述子 2 为 ' + binaryString2.slice(0, Math.min(16, binaryString.length)) + '…，' +
                '汉明距离 = ' + hammingDist + '。'}
        />
      </div>

      {/* ===== 9. 算法对比汇总 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（8）算法对比</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 font-semibold text-slate-700"></th>
                <th className="px-3 py-2 font-semibold text-slate-700">BRIEF</th>
                <th className="px-3 py-2 font-semibold text-slate-700">ORB</th>
                <th className="px-3 py-2 font-semibold text-slate-700">BRISK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-3 py-2 font-medium text-slate-700">提点方法</td>
                <td className="px-3 py-2 text-slate-600">无</td>
                <td className="px-3 py-2 text-slate-600">FAST + Harris</td>
                <td className="px-3 py-2 text-slate-600">FAST / AGAST</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-700">方向</td>
                <td className="px-3 py-2 text-slate-600">无</td>
                <td className="px-3 py-2 text-slate-600">Intensity Centroid</td>
                <td className="px-3 py-2 text-slate-600">远点对梯度</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-700">尺度</td>
                <td className="px-3 py-2 text-slate-600">无</td>
                <td className="px-3 py-2 text-slate-600">无</td>
                <td className="px-3 py-2 text-slate-600">尺度空间</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-700">描述子</td>
                <td className="px-3 py-2 text-slate-600">256 位二进制</td>
                <td className="px-3 py-2 text-slate-600">改进 BRIEF</td>
                <td className="px-3 py-2 text-slate-600">512 位二进制</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-700">匹配</td>
                <td className="px-3 py-2 text-slate-600" colSpan={3}>汉明距离（NORM_HAMMING）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 10. OpenCV 调用流程 ===== */}
      <div className="border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">（9）OpenCV 调用流程</h2>
        <p className="mb-3 text-xs leading-6 text-slate-600">
          OpenCV 中 ORB 和 BRISK 的调用遵循"检测→计算→匹配"的经典三步流程，
          匹配时统一使用 NORM_HAMMING 作为距离度量。
        </p>
      </div>
    </div>
  );

  const analysisPreview = (
    <ProcessRail>
      <FlowColumns>
        <FlowColumn align="start">
          <FlowNode tone="red" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-red-600">特征点邻域 Patch</div>
            <div className="flex justify-center">
              <ImageCanvas
                image={activePatch}
                maxDisplaySize={160}
                showGrid
                highlightPixel={{ x: cx1, y: cy1 }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              9×9 合成 Patch，模拟一个弱角点区域。红点标记当前点对中的 x 点 ({cx1},{cy1})。
            </p>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="center">
          <FlowNode tone="amber" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-amber-700">点对采样与 τ 测试</div>
            <div className="grid gap-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-[10px] text-amber-700">采样方式</div>
                <div className="font-semibold text-amber-900">{samplingInfo?.label ?? 'GI'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-amber-600">x 点 p({cx1},{cy1})</div>
                  <div className="font-mono font-semibold text-amber-800">{v1}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-[10px] text-amber-600">y 点 p({cx2},{cy2})</div>
                  <div className="font-mono font-semibold text-amber-800">{v2}</div>
                </div>
              </div>
              <div className="rounded-xl bg-amber-100 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                p(x)={v1} {v1 < v2 ? '<' : '≥'} p(y)={v2} → τ = {tauResult}
              </div>
            </div>
          </FlowNode>

          <FlowNode tone="sky" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-sky-700">二进制编码（前 {Math.min(currentPairIndex + 1, 16)} bit）</div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <div className="font-mono text-xs font-semibold text-sky-800 break-all">
                {binaryString.slice(0, Math.min(16, binaryString.length))}
              </div>
              <div className="mt-2 text-xs text-sky-600">
                共 {binaryString.length} bit，{'当前步第 ' + (currentPairIndex + 1) + ' 位'}
              </div>
            </div>
          </FlowNode>
        </FlowColumn>

        <FlowColumn align="end">
          <FlowNode tone="emerald" className="max-w-xs">
            <div className="mb-3 text-xs font-semibold text-emerald-700">汉明距离匹配</div>
            <div className="grid gap-2">
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <div className="text-[10px] text-emerald-600">描述子 1</div>
                <div className="font-mono text-xs font-semibold text-emerald-800 break-all">
                  {binaryString.slice(0, Math.min(8, binaryString.length))}…
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <div className="text-[10px] text-emerald-600">描述子 2</div>
                <div className="font-mono text-xs font-semibold text-emerald-800 break-all">
                  {binaryString2.slice(0, Math.min(8, binaryString2.length))}…
                </div>
              </div>
              <div className="rounded-xl bg-emerald-100 px-3 py-2 text-center">
                <div className="text-[10px] text-emerald-700">汉明距离</div>
                <div className="font-mono text-sm font-bold text-emerald-800">{hammingDist}</div>
                <div className="text-[10px] text-emerald-600">（差异比特数 / {binaryString.length}）</div>
              </div>
            </div>
          </FlowNode>
        </FlowColumn>
      </FlowColumns>
    </ProcessRail>
  );

  const parameters = (
    <div className="space-y-4">
      <SelectParam
        label="采样方式"
        value={samplingMethod}
        onChange={value => { setSamplingMethod(value as SamplingMethod); setCurrentPairIndex(0); }}
        options={SAMPLING_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
      />
      {samplingInfo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs leading-5 text-amber-800">{samplingInfo.desc}</p>
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">描述子位数</label>
        <select
          value={String(numPairs)}
          onChange={e => { setNumPairs(Number(e.target.value)); setCurrentPairIndex(0); }}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
        >
          <option value="128">128 bit</option>
          <option value="256">256 bit</option>
          <option value="512">512 bit</option>
        </select>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
        拖动滑杆逐步查看每对点的 τ 测试结果如何构成完整的二进制描述子。
      </div>
    </div>
  );

  return (
    <ConceptLayout
      title="二进制特征描述子"
      subtitle="BRIEF / ORB / BRISK - 基于像素比较的快速特征编码"
      operationLabel="二进制编码"
      parameterIntro="选择采样方式与描述子位数，拖动点对编号逐步观察 τ 测试结果如何构成二进制描述子。"
      parameters={parameters}
      analysisPreview={analysisPreview}
      stepDetails={stepDetails}
      codeTab={
        <CodeViewer languages={[
          { name: 'ORB', code: ORB_CODE_TS },
          { name: 'BRISK', code: BRISK_CODE_TS },
       ]} />
     }
     originalImage={loadedImage}
     resultImage={loadedImage}
      singlePageScroll
    />
  );
}




