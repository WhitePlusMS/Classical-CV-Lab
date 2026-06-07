import Link from 'next/link';
import type { ReactNode } from 'react';

type ConceptCard = {
  href?: string;
  title: string;
  titleEn: string;
  description?: string;
  icon: ReactNode;
  color: string;
  bgLight: string;
  textColor: string;
};

type LearningModule = {
  eyebrow: string;
  title: string;
  source: string;
  concepts: ConceptCard[];
};

type LearningChapter = {
  chapter: string;
  title: string;
  subtitle: string;
  modules: LearningModule[];
};

const iconClassName = 'w-7 h-7';

const icons = {
  image: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8" cy="10" r="1.5" />
      <path d="M21 16l-5-5-4 4-2-2-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  histogram: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" strokeLinecap="round" />
      <path d="M7 17V9M12 17V6M17 17v-5" strokeLinecap="round" />
    </svg>
  ),
  convolution: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" strokeLinecap="round" />
    </svg>
  ),
  stack: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  threshold: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  edge: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h16v16H4z" />
      <path d="M4 12h16M12 4v16" strokeLinecap="round" />
      <path d="M4 4l16 16M20 4L4 20" strokeLinecap="round" />
    </svg>
  ),
  blur: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6" opacity="0.5" />
      <circle cx="12" cy="12" r="9" opacity="0.3" />
    </svg>
  ),
  target: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
    </svg>
  ),
  camera: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  ),
  feature: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z" />
      <path d="M9 7h6M7 9v6M17 9v6M9 17h6" strokeLinecap="round" />
    </svg>
  ),
};

const implementedCards = {
  convolution: {
    href: '/concepts/convolution',
    title: '卷积',
    titleEn: 'Convolution',
    description: '理解空间滤波的核心：卷积运算原理与实现',
    icon: icons.convolution,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  morphology: {
    href: '/concepts/morphology',
    title: '形态学操作',
    titleEn: 'Morphology',
    description: '腐蚀、膨胀、开闭操作与结构元素',
    icon: icons.stack,
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  otsu: {
    href: '/concepts/otsu',
    title: 'OTSU 阈值',
    titleEn: 'OTSU Threshold',
    description: '自动阈值分割：直方图双峰与类间方差',
    icon: icons.threshold,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  edgeDetection: {
    href: '/concepts/edge-detection',
    title: '边缘检测',
    titleEn: 'Edge Detection',
    description: 'Sobel 算子与 Canny 边缘检测算法',
    icon: icons.edge,
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  blur: {
    href: '/concepts/blur',
    title: '模糊滤波',
    titleEn: 'Blur Filters',
    description: '均值模糊、高斯模糊与中值滤波',
    icon: icons.blur,
    color: 'from-cyan-500 to-sky-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  grayscale: {
    href: '/concepts/grayscale',
    title: '图像灰度化',
    titleEn: 'Grayscale Image',
    description: 'RGB 三通道到单通道灰度：加权法与平均法',
    icon: icons.image,
    color: 'from-slate-500 to-slate-700',
    bgLight: 'bg-slate-50',
    textColor: 'text-slate-600',
  },
  pixelMatrix: {
    href: '/concepts/pixel-matrix',
    title: '像素矩阵',
    titleEn: 'Pixel Matrix',
    description: '图像即矩阵：像素坐标、索引与邻域',
    icon: icons.convolution,
    color: 'from-gray-500 to-slate-700',
    bgLight: 'bg-gray-50',
    textColor: 'text-gray-600',
  },
  histogram: {
    href: '/concepts/histogram',
    title: '灰度直方图',
    titleEn: 'Histogram',
    description: '灰度级分布：亮度、对比度与双峰分析',
    icon: icons.histogram,
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
} satisfies Record<string, ConceptCard>;

const placeholder = (
  title: string,
  titleEn: string,
  icon: ReactNode,
  color: string,
  bgLight: string,
  textColor: string,
): ConceptCard => ({
  title,
  titleEn,
  icon,
  color,
  bgLight,
  textColor,
});

const learningChapters: LearningChapter[] = [
  {
    chapter: '第三章',
    title: '图像预处理与几何校正',
    subtitle: '',
    modules: [
      {
        eyebrow: 'Part 1 / 3.1',
        title: '图像预处理',
        source: '',
        concepts: [
          implementedCards.grayscale,
          implementedCards.pixelMatrix,
          implementedCards.histogram,
          placeholder('直方图均衡化', 'Histogram Equalization', icons.histogram, 'from-orange-500 to-red-500', 'bg-orange-50', 'text-orange-600'),
          placeholder('图像锐化', 'Image Sharpening', icons.edge, 'from-pink-500 to-rose-600', 'bg-pink-50', 'text-pink-600'),
          placeholder('邻域与窗口', 'Neighborhood Window', icons.convolution, 'from-sky-500 to-blue-600', 'bg-sky-50', 'text-sky-600'),
          implementedCards.convolution,
          implementedCards.blur,
          placeholder('中值滤波', 'Median Filter', icons.blur, 'from-teal-500 to-emerald-600', 'bg-teal-50', 'text-teal-600'),
          placeholder('边窗滤波', 'Side Window Filter', icons.convolution, 'from-lime-500 to-green-600', 'bg-lime-50', 'text-lime-700'),
          implementedCards.edgeDetection,
          implementedCards.morphology,
        ],
      },
      {
        eyebrow: 'Part 2',
        title: '摄像机标定',
        source: '',
        concepts: [
          placeholder('成像模型', 'Camera Model', icons.camera, 'from-blue-500 to-indigo-600', 'bg-blue-50', 'text-blue-600'),
          placeholder('内外参数', 'Intrinsic / Extrinsic', icons.camera, 'from-indigo-500 to-violet-600', 'bg-indigo-50', 'text-indigo-600'),
          placeholder('标定板与角点', 'Calibration Pattern', icons.feature, 'from-violet-500 to-purple-600', 'bg-violet-50', 'text-violet-600'),
          placeholder('参数求解', 'Parameter Estimation', icons.camera, 'from-purple-500 to-fuchsia-600', 'bg-purple-50', 'text-purple-600'),
        ],
      },
      {
        eyebrow: 'Part 3',
        title: '图像校正',
        source: '',
        concepts: [
          placeholder('畸变校正', 'Distortion Correction', icons.camera, 'from-violet-500 to-purple-600', 'bg-violet-50', 'text-violet-600'),
          placeholder('几何变换', 'Geometric Transform', icons.image, 'from-indigo-500 to-blue-600', 'bg-indigo-50', 'text-indigo-600'),
          placeholder('透视变换', 'Perspective Transform', icons.image, 'from-blue-500 to-cyan-600', 'bg-blue-50', 'text-blue-600'),
          placeholder('图像配准', 'Image Registration', icons.feature, 'from-cyan-500 to-teal-600', 'bg-cyan-50', 'text-cyan-600'),
        ],
      },
    ],
  },
  {
    chapter: '',
    title: '目标检测',
    subtitle: '',
    modules: [
      {
        eyebrow: 'Part 1',
        title: '简单背景方法',
        source: '',
        concepts: [
          placeholder('阈值分割', 'Threshold Segmentation', icons.threshold, 'from-purple-500 to-violet-600', 'bg-purple-50', 'text-purple-600'),
          implementedCards.otsu,
          placeholder('Kittler 阈值', 'Kittler Threshold', icons.threshold, 'from-fuchsia-500 to-purple-600', 'bg-fuchsia-50', 'text-fuchsia-600'),
          placeholder('时间差分法', 'Frame Difference', icons.target, 'from-violet-500 to-indigo-600', 'bg-violet-50', 'text-violet-600'),
          placeholder('背景减除法', 'Background Subtraction', icons.target, 'from-indigo-500 to-slate-600', 'bg-indigo-50', 'text-indigo-600'),
          placeholder('高斯背景模型', 'Gaussian Background', icons.target, 'from-slate-500 to-blue-600', 'bg-slate-50', 'text-slate-600'),
        ],
      },
      {
        eyebrow: 'Part 2',
        title: '特征点方法',
        source: '',
        concepts: [
          placeholder('关键点检测', 'Keypoint Detection', icons.feature, 'from-sky-500 to-blue-600', 'bg-sky-50', 'text-sky-600'),
          placeholder('尺度空间', 'Scale Space', icons.feature, 'from-blue-500 to-indigo-600', 'bg-blue-50', 'text-blue-600'),
          placeholder('SIFT', 'Scale-Invariant Feature', icons.feature, 'from-blue-500 to-indigo-600', 'bg-blue-50', 'text-blue-600'),
          placeholder('SURF', 'Speeded-Up Robust Feature', icons.feature, 'from-indigo-500 to-violet-600', 'bg-indigo-50', 'text-indigo-600'),
          placeholder('ORB', 'Oriented FAST and BRIEF', icons.feature, 'from-violet-500 to-purple-600', 'bg-violet-50', 'text-violet-600'),
          placeholder('BRIEF / BRISK', 'Binary Descriptors', icons.feature, 'from-green-500 to-emerald-600', 'bg-green-50', 'text-green-600'),
        ],
      },
      {
        eyebrow: 'Part 3',
        title: '特征敏感方法',
        source: '',
        concepts: [
          placeholder('颜色空间', 'Color Space', icons.histogram, 'from-yellow-500 to-amber-600', 'bg-yellow-50', 'text-yellow-700'),
          placeholder('LBP 纹理', 'LBP Texture', icons.feature, 'from-emerald-500 to-green-600', 'bg-emerald-50', 'text-emerald-600'),
          placeholder('Gabor 滤波器', 'Gabor Filter', icons.feature, 'from-teal-500 to-cyan-600', 'bg-teal-50', 'text-teal-600'),
          placeholder('直方图匹配', 'Histogram Matching', icons.histogram, 'from-amber-500 to-orange-600', 'bg-amber-50', 'text-amber-700'),
          placeholder('模板匹配', 'Template Matching', icons.convolution, 'from-cyan-500 to-blue-600', 'bg-cyan-50', 'text-cyan-600'),
        ],
      },
      {
        eyebrow: 'Part 4',
        title: '机器学习方法',
        source: '',
        concepts: [
          placeholder('HOG 特征', 'HOG Feature', icons.feature, 'from-rose-500 to-red-600', 'bg-rose-50', 'text-rose-600'),
          placeholder('Haar 特征', 'Haar Feature', icons.feature, 'from-red-500 to-orange-600', 'bg-red-50', 'text-red-600'),
          placeholder('LBP 特征向量', 'LBP Feature Vector', icons.feature, 'from-orange-500 to-amber-600', 'bg-orange-50', 'text-orange-600'),
          placeholder('级联分类器', 'Cascade Classifier', icons.target, 'from-orange-500 to-amber-600', 'bg-orange-50', 'text-orange-600'),
          placeholder('SVM 分类器', 'SVM Classifier', icons.target, 'from-amber-500 to-yellow-600', 'bg-amber-50', 'text-amber-700'),
        ],
      },
    ],
  },
];

function ConceptCardView({ concept, index }: { concept: ConceptCard; index: number }) {
  const inner = (
    <>
      <div className={`h-1 bg-gradient-to-r ${concept.color}`} />
      <div className="p-7">
        <div className="mb-5 flex items-center justify-between">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${concept.bgLight} ${concept.textColor} group-hover:scale-105 transition-transform duration-300`}>
            {concept.icon}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
            {index + 1}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
          {concept.title}
        </h3>
        <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide uppercase">
          {concept.titleEn}
        </p>

        {concept.description ? (
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {concept.description}
          </p>
        ) : (
          <div className="mt-3 h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50/70" />
        )}

        <div className={`mt-5 flex items-center gap-2 text-sm font-medium ${concept.href ? 'text-blue-600' : 'text-slate-400'}`}>
          <span>{concept.href ? '开始学习' : '入口占位'}</span>
          {concept.href ? (
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </div>
      </div>
    </>
  );

  const className = 'group relative bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 overflow-hidden';

  if (concept.href) {
    return (
      <Link href={concept.href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={`${className} opacity-80`}>
      {inner}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50" />
        <div className="relative max-w-6xl mx-auto px-8 py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-700 tracking-wide">交互式教学平台</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              计算机视觉
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                教学软件
              </span>
            </h1>
            <p className="mt-5 text-lg text-slate-500 leading-relaxed">
              通过可视化交互与实时计算过程，深入理解计算机视觉核心算法原理
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-14">
        {/* Section Title */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">按课程顺序开始学习</h2>
          <div className="flex-1 h-px bg-slate-200 ml-4" />
        </div>

        {/* Concept Chapters */}
        <div className="space-y-16">
          {learningChapters.map(chapter => (
            <section key={chapter.title}>
              <div className="mb-8 border-b border-slate-200 pb-5">
                {chapter.chapter ? (
                  <p className="text-xs font-semibold tracking-wide text-blue-600">{chapter.chapter}</p>
                ) : null}
                <h3 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{chapter.title}</h3>
                {chapter.subtitle ? (
                  <p className="mt-2 text-sm text-slate-500">{chapter.subtitle}</p>
                ) : null}
              </div>

              <div className="space-y-12">
                {chapter.modules.map(module => (
                  <div key={`${chapter.title}-${module.title}`}>
                    <div className="mb-5">
                      <p className="text-xs font-semibold tracking-wide text-slate-500">{module.eyebrow}</p>
                      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <h4 className="text-2xl font-bold tracking-tight text-slate-900">{module.title}</h4>
                        {module.source ? (
                          <p className="text-sm text-slate-500">{module.source}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {module.concepts.map((concept, conceptIndex) => (
                        <ConceptCardView key={`${module.title}-${concept.title}`} concept={concept} index={conceptIndex} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-14 bg-white rounded-2xl border border-slate-200/80 p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">使用说明</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>每个概念页面包含原图显示、参数设置、计算过程可视化、代码展示</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>点击“计算过程”标签查看逐步计算，理解算法每一步的原理</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>点击“代码”标签查看 TypeScript 实现，支持多语言切换</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>调整参数实时观察结果变化，加深对算法的理解</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <p className="text-xs text-slate-400 text-center">
            CV Teaching Software - 计算机视觉交互式教学平台
          </p>
        </div>
      </footer>
    </div>
  );
}
