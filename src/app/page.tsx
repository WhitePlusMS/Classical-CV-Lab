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
  imageFiltering: {
    href: '/concepts/blur',
    title: '图像滤波',
    titleEn: 'Image Filtering',
    description: '均值、高斯、中值与边窗滤波的统一入口',
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
    title: '像素矩阵与邻域窗口',
    titleEn: 'Pixel Matrix & Neighborhood',
    description: '图像即矩阵：像素坐标、索引、邻域与局部窗口',
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
  histogramEqualization: {
    href: '/concepts/histogram-equalization',
    title: '直方图均衡化',
    titleEn: 'Histogram Equalization',
    description: 'CDF 映射：灰度级重新分布以增强图像对比度',
    icon: icons.histogram,
    color: 'from-orange-500 to-red-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  imageSharpening: {
    href: '/concepts/image-sharpening',
    title: '图像锐化',
    titleEn: 'Image Sharpening',
    description: '一阶梯度锐化与二阶 Laplace 增强：突出边缘与轮廓',
    icon: icons.edge,
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  cameraModel: {
    href: '/concepts/camera-model',
    title: '成像模型与内外参数',
    titleEn: 'Camera Model & Parameters',
    description: '针孔成像链路：世界坐标、内参矩阵与外参姿态的作用',
    icon: icons.camera,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  calibrationPattern: {
    href: '/concepts/calibration-pattern',
    title: '标定板与角点检测',
    titleEn: 'Calibration Pattern & Corners',
    description: '棋盘格角点、世界坐标对应关系与亚像素级角点定位',
    icon: icons.feature,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  zhangCalibration: {
    href: '/concepts/zhang-calibration',
    title: '张正友标定与参数求解',
    titleEn: 'Zhang Calibration & Estimation',
    description: '从单应矩阵到内外参数，再到重投影误差的求解链路',
    icon: icons.camera,
    color: 'from-purple-500 to-fuchsia-600',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  distortionCorrection: {
    href: '/concepts/distortion-correction',
    title: '畸变校正',
    titleEn: 'Distortion Correction',
    description: '利用内参与畸变系数做坐标重映射，恢复接近理想针孔模型的图像',
    icon: icons.camera,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  geometricTransform: {
    href: '/concepts/geometric-transform',
    title: '几何变换',
    titleEn: 'Geometric Transform',
    description: '平移、旋转、缩放、剪切与插值：理解图像位置关系如何改变',
    icon: icons.image,
    color: 'from-indigo-500 to-blue-600',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  perspectiveTransform: {
    href: '/concepts/perspective-transform',
    title: '透视变换',
    titleEn: 'Perspective Transform',
    description: '四对点与 3×3 齐次矩阵：把斜拍平面校正为正视图',
    icon: icons.image,
    color: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  imageRegistration: {
    href: '/concepts/image-registration',
    title: '图像配准',
    titleEn: 'Image Registration',
    description: '从特征匹配到几何对齐：把不同视角或时刻的图像映射到同一坐标系',
    icon: icons.feature,
    color: 'from-cyan-500 to-teal-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  thresholdAutoThreshold: {
    href: '/concepts/threshold-auto-threshold',
    title: '阈值分割与自动阈值',
    titleEn: 'Threshold & Auto Threshold',
    description: '固定阈值、OTSU 与课件版 Kittler：从灰度分布中分离前景',
    icon: icons.threshold,
    color: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  frameDifferenceMotion: {
    href: '/concepts/frame-difference-motion',
    title: '帧差法与运动检测',
    titleEn: 'Frame Difference & Motion',
    description: '比较相邻帧变化：理解运动目标、阈值、空洞与后处理',
    icon: icons.target,
    color: 'from-violet-500 to-indigo-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  backgroundModelingSubtraction: {
    href: '/concepts/background-modeling-subtraction',
    title: '背景建模与背景减除',
    titleEn: 'Background Modeling & Subtraction',
    description: '均值、自适应、单高斯与混合高斯：用背景模型提取前景',
    icon: icons.target,
    color: 'from-indigo-500 to-slate-600',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  keypointMatchingPipeline: {
    href: '/concepts/keypoint-matching-pipeline',
    title: '特征点检测与匹配流程',
    titleEn: 'Keypoint Matching Pipeline',
    description: '提取关键点、附加描述子、特征匹配——基于特征点方法的三步流程',
    icon: icons.feature,
    color: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
    textColor: 'text-sky-600',
  },
  siftSurfScaleFeatures: {
    href: '/concepts/sift-surf-scale-features',
    title: 'SIFT / SURF 尺度特征',
    titleEn: 'SIFT / SURF Scale Features',
    description: '尺度空间极值检测、方向分配与特征描述子生成',
    icon: icons.feature,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  binaryFeatureDescriptors: {
    href: '/concepts/binary-feature-descriptors',
    title: 'ORB / BRIEF / BRISK 二进制特征',
    titleEn: 'Binary Feature Descriptors',
    description: '像素强度比较、二进制编码与汉明距离快速匹配',
    icon: icons.feature,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  colorSpaceHistogram: {
    href: '/concepts/color-space-histogram',
    title: '颜色空间与颜色直方图',
    titleEn: 'Color Space & Histogram',
    description: 'RGB 与 HSV 颜色空间转换、颜色直方图统计与目标检测应用',
    icon: icons.histogram,
    color: 'from-yellow-500 to-amber-600',
    bgLight: 'bg-yellow-50',
    textColor: 'text-yellow-700',
  },
  lbpGaborTexture: {
    href: '/concepts/lbp-gabor-texture',
    title: 'LBP 与 Gabor 纹理特征',
    titleEn: 'LBP & Gabor Texture',
    description: '局部二值模式与 Gabor 滤波器：从局部灰度比较到方向频率选择',
    icon: icons.feature,
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  histogramTemplateMatching: {
    href: '/concepts/histogram-template-matching',
    title: '直方图匹配与模板匹配',
    titleEn: 'Histogram & Template Matching',
    description: '相关法、卡方距离、巴氏距离与 SSD/SAD 滑动窗口匹配',
    icon: icons.convolution,
    color: 'from-cyan-500 to-blue-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  hogFeature: {
    href: '/concepts/hog-feature',
    title: 'HOG 特征',
    titleEn: 'HOG Feature',
    description: '梯度方向直方图：从像素梯度到 cell-block-window 特征描述',
    icon: icons.feature,
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  haarLbpFeatureVector: {
    href: '/concepts/haar-lbp-feature-vector',
    title: 'Haar / LBP 特征向量',
    titleEn: 'Haar / LBP Feature Vector',
    description: 'Haar-like 特征与积分图加速、LBP 特征向量提取与串联',
    icon: icons.feature,
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  classifierDetectionPipeline: {
    href: '/concepts/classifier-detection-pipeline',
    title: '分类器与检测流程',
    titleEn: 'Classifier & Detection Pipeline',
    description: '从训练样本、特征提取、分类器判定到滑动窗口输出检测框的完整流程',
    icon: icons.target,
    color: 'from-amber-500 to-yellow-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
} as const satisfies Record<string, ConceptCard>;

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

const chapterOneCards = {
  applicationsOverview: {
    ...placeholder(
      '应用与发展现状',
      'Applications & Trends',
      icons.target,
      'from-sky-500 to-cyan-600',
      'bg-sky-50',
      'text-sky-600',
    ),
    href: '/concepts/applications-overview',
    description: '梳理图像处理的典型应用场景、行业案例和课程入口。',
  },
  acquisitionSystem: {
    ...placeholder(
      '图像采集处理系统',
      'Acquisition System',
      icons.camera,
      'from-indigo-500 to-blue-600',
      'bg-indigo-50',
      'text-indigo-600',
    ),
    href: '/concepts/acquisition-system',
    description: '概览光源、摄像机、镜头和采集平台的基础链路。',
  },
} as const;

const learningChapters: LearningChapter[] = [
  {
    chapter: '第一章',
    title: '图像采集与处理基础',
    subtitle: '应用场景与采集系统入口',
    modules: [
      {
        eyebrow: 'Part 1',
        title: '课程导入',
        source: '',
        concepts: [chapterOneCards.applicationsOverview, chapterOneCards.acquisitionSystem],
      },
    ],
  },
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
          implementedCards.histogramEqualization,
          implementedCards.imageSharpening,
          implementedCards.convolution,
          implementedCards.imageFiltering,
          implementedCards.edgeDetection,
          implementedCards.morphology,
        ],
      },
      {
        eyebrow: 'Part 2',
        title: '摄像机标定',
        source: '',
        concepts: [
          implementedCards.cameraModel,
          implementedCards.calibrationPattern,
          implementedCards.zhangCalibration,
        ],
      },
      {
        eyebrow: 'Part 3',
        title: '图像校正',
        source: '',
        concepts: [
          implementedCards.distortionCorrection,
          implementedCards.geometricTransform,
          implementedCards.perspectiveTransform,
          implementedCards.imageRegistration,
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
          implementedCards.thresholdAutoThreshold,
          implementedCards.frameDifferenceMotion,
          implementedCards.backgroundModelingSubtraction,
        ],
      },
      {
        eyebrow: 'Part 2',
        title: '特征点方法',
        source: '',
        concepts: [
          implementedCards.keypointMatchingPipeline,
          implementedCards.siftSurfScaleFeatures,
          implementedCards.binaryFeatureDescriptors,
        ],
      },
      {
        eyebrow: 'Part 3',
        title: '特征明显方法',
        source: '',
        concepts: [
          implementedCards.colorSpaceHistogram,
          implementedCards.lbpGaborTexture,
          implementedCards.histogramTemplateMatching,
        ],
      },
      {
        eyebrow: 'Part 4',
        title: '机器学习方法',
        source: '',
        concepts: [
          implementedCards.hogFeature,
          implementedCards.haarLbpFeatureVector,
        ],
      },
      {
        eyebrow: 'Part 5',
        title: '检测流程',
        source: '',
        concepts: [
          implementedCards.classifierDetectionPipeline,
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
