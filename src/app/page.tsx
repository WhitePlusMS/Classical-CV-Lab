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
  overview: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
      <circle cx="18" cy="16" r="2.5" />
      <path d="M18 10v1.5M18 20.5V22M12 16h3.5M20.5 16H22" strokeLinecap="round" />
    </svg>
  ),
  acquisition: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8h3l2-3h6l2 3h3v10H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3" />
      <path d="M3 21h18M7 18v3M17 18v3" strokeLinecap="round" />
    </svg>
  ),
  grayscale: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 12h8M8 15h8" strokeLinecap="round" opacity="0.45" />
      <path d="M4 19 20 5" strokeLinecap="round" />
    </svg>
  ),
  pixelGrid: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h16v16H4z" />
      <path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" opacity="0.55" />
      <path d="M9.33 9.33h5.34v5.34H9.33z" strokeWidth="2" />
    </svg>
  ),
  histogram: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" strokeLinecap="round" />
      <path d="M7 17V9M12 17V6M17 17v-5" strokeLinecap="round" />
    </svg>
  ),
  equalization: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 19h18" strokeLinecap="round" />
      <path d="M6 16V9M10 16V6M14 16v-4M18 16V8" strokeLinecap="round" />
      <path d="M5 5c4 5 10 5 14 0" strokeLinecap="round" />
    </svg>
  ),
  sharpen: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3 4 20h16z" strokeLinejoin="round" />
      <path d="M12 8v5M9.5 15h5" strokeLinecap="round" />
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
  filter: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5h16l-6.5 7.5V19l-3 1.5v-8z" strokeLinejoin="round" />
      <path d="M7 8h10" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),
  morphology: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M17 14v6M14 17h6" strokeLinecap="round" />
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
  cameraModel: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8h4l3-3h6v14H4z" strokeLinejoin="round" />
      <circle cx="14" cy="12" r="3" />
      <path d="M14 12 21 8M14 12l7 4" strokeLinecap="round" />
    </svg>
  ),
  calibrationPattern: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 5h14v14H5z" />
      <path d="M5 9h14M5 13h14M5 17h14M9 5v14M13 5v14M17 5v14" opacity="0.55" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="17" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  calibrationSolve: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5h7v7H4zM13 12h7v7h-7z" />
      <path d="M11 8h4M15 8l-2-2M15 8l-2 2M9 15h4M9 15l2-2M9 15l2 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h4M7 17v4" strokeLinecap="round" />
    </svg>
  ),
  distortion: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5c3 2 13 2 16 0M4 19c3-2 13-2 16 0M5 4c2 3 2 13 0 16M19 4c-2 3-2 13 0 16" />
      <path d="M8 8h8v8H8z" opacity="0.55" />
    </svg>
  ),
  geometric: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 6h8v8H5z" />
      <path d="M11 10h8v8h-8z" opacity="0.65" />
      <path d="M15 5h4v4M19 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  perspective: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 6h14l-3 12H8z" strokeLinejoin="round" />
      <path d="M8 9h8M7 13h10M10 6l-1 12M14 6l1 12" opacity="0.55" />
    </svg>
  ),
  registration: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h9v9H4zM11 9h9v9h-9z" />
      <path d="M7 18l10-12M7 18h4M7 18v-4M17 6h-4M17 6v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  motion: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 6h8v8H5zM11 10h8v8h-8z" />
      <path d="M4 18h4M3 14h3M15 5l4 4M19 9h-4M19 9v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  backgroundModel: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16v12H4z" />
      <path d="M7 9h10M7 12h6M7 15h9" opacity="0.45" strokeLinecap="round" />
      <path d="M15 9l4 6M19 9l-4 6" strokeLinecap="round" />
    </svg>
  ),
  keypoints: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="7" r="2" />
      <circle cx="17" cy="6" r="2" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="18" cy="16" r="2" />
      <path d="M8 8.5 15 7M9.5 16.5l6.5-1M7 9l1 6" strokeLinecap="round" opacity="0.65" />
    </svg>
  ),
  scaleFeature: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2" />
      <circle cx="15" cy="13" r="4" />
      <circle cx="15" cy="13" r="7" opacity="0.35" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  ),
  binaryFeature: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 6h3v5H5zM16 6h3v5h-3zM5 13h3v5H5zM16 13h3v5h-3z" />
      <path d="M11 6v12M13 6v12" strokeLinecap="round" opacity="0.55" />
    </svg>
  ),
  colorSpace: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="9" r="4" />
      <circle cx="15" cy="9" r="4" />
      <circle cx="12" cy="15" r="4" />
    </svg>
  ),
  texture: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6c4-3 4 3 8 0s4 3 8 0M4 12c4-3 4 3 8 0s4 3 8 0M4 18c4-3 4 3 8 0s4 3 8 0" strokeLinecap="round" />
    </svg>
  ),
  templateMatching: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5h9v9H4zM11 10h9v9h-9z" />
      <path d="M14 13h3v3h-3z" />
      <path d="M6 18h3M7.5 16.5v3" strokeLinecap="round" />
    </svg>
  ),
  hog: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h16v16H4z" />
      <path d="M8 16l8-8M8 8l8 8M12 6v12M6 12h12" strokeLinecap="round" />
    </svg>
  ),
  haarLbp: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" />
      <path d="M7.5 5v6M16.5 13v6" opacity="0.55" />
    </svg>
  ),
  classifier: (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h5v5H4zM4 15h5v5H4zM15 10h5v5h-5z" />
      <path d="M9 8.5h3l3 4M9 17.5h3l3-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 11.5v2" strokeLinecap="round" />
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
    icon: icons.morphology,
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
    icon: icons.filter,
    color: 'from-cyan-500 to-sky-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  grayscale: {
    href: '/concepts/grayscale',
    title: '图像灰度化',
    titleEn: 'Grayscale Image',
    description: 'RGB 三通道到单通道灰度：加权法与平均法',
    icon: icons.grayscale,
    color: 'from-slate-500 to-slate-700',
    bgLight: 'bg-slate-50',
    textColor: 'text-slate-600',
  },
  pixelMatrix: {
    href: '/concepts/pixel-matrix',
    title: '像素矩阵与邻域窗口',
    titleEn: 'Pixel Matrix & Neighborhood',
    description: '图像即矩阵：像素坐标、索引、邻域与局部窗口',
    icon: icons.pixelGrid,
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
    icon: icons.equalization,
    color: 'from-orange-500 to-red-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  imageSharpening: {
    href: '/concepts/image-sharpening',
    title: '图像锐化',
    titleEn: 'Image Sharpening',
    description: '一阶梯度锐化与二阶 Laplace 增强：突出边缘与轮廓',
    icon: icons.sharpen,
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  cameraModel: {
    href: '/concepts/camera-model',
    title: '成像模型与内外参数',
    titleEn: 'Camera Model & Parameters',
    description: '针孔成像链路：世界坐标、内参矩阵与外参姿态的作用',
    icon: icons.cameraModel,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  calibrationPattern: {
    href: '/concepts/calibration-pattern',
    title: '标定板与角点检测',
    titleEn: 'Calibration Pattern & Corners',
    description: '棋盘格角点、世界坐标对应关系与亚像素级角点定位',
    icon: icons.calibrationPattern,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  zhangCalibration: {
    href: '/concepts/zhang-calibration',
    title: '张正友标定与参数求解',
    titleEn: 'Zhang Calibration & Estimation',
    description: '从单应矩阵到内外参数，再到重投影误差的求解链路',
    icon: icons.calibrationSolve,
    color: 'from-purple-500 to-fuchsia-600',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  distortionCorrection: {
    href: '/concepts/distortion-correction',
    title: '畸变校正',
    titleEn: 'Distortion Correction',
    description: '利用内参与畸变系数做坐标重映射，恢复接近理想针孔模型的图像',
    icon: icons.distortion,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  geometricTransform: {
    href: '/concepts/geometric-transform',
    title: '几何变换',
    titleEn: 'Geometric Transform',
    description: '平移、旋转、缩放、剪切与插值：理解图像位置关系如何改变',
    icon: icons.geometric,
    color: 'from-indigo-500 to-blue-600',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  perspectiveTransform: {
    href: '/concepts/perspective-transform',
    title: '透视变换',
    titleEn: 'Perspective Transform',
    description: '四对点与 3×3 齐次矩阵：把斜拍平面校正为正视图',
    icon: icons.perspective,
    color: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  imageRegistration: {
    href: '/concepts/image-registration',
    title: '图像配准',
    titleEn: 'Image Registration',
    description: '从特征匹配到几何对齐：把不同视角或时刻的图像映射到同一坐标系',
    icon: icons.registration,
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
    icon: icons.motion,
    color: 'from-violet-500 to-indigo-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  backgroundModelingSubtraction: {
    href: '/concepts/background-modeling-subtraction',
    title: '背景建模与背景减除',
    titleEn: 'Background Modeling & Subtraction',
    description: '均值、自适应、单高斯与混合高斯：用背景模型提取前景',
    icon: icons.backgroundModel,
    color: 'from-indigo-500 to-slate-600',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  keypointMatchingPipeline: {
    href: '/concepts/keypoint-matching-pipeline',
    title: '特征点检测与匹配流程',
    titleEn: 'Keypoint Matching Pipeline',
    description: '提取关键点、附加描述子、特征匹配——基于特征点方法的三步流程',
    icon: icons.keypoints,
    color: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
    textColor: 'text-sky-600',
  },
  siftSurfScaleFeatures: {
    href: '/concepts/sift-surf-scale-features',
    title: 'SIFT / SURF 尺度特征',
    titleEn: 'SIFT / SURF Scale Features',
    description: '尺度空间极值检测、方向分配与特征描述子生成',
    icon: icons.scaleFeature,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  binaryFeatureDescriptors: {
    href: '/concepts/binary-feature-descriptors',
    title: 'ORB / BRIEF / BRISK 二进制特征',
    titleEn: 'Binary Feature Descriptors',
    description: '像素强度比较、二进制编码与汉明距离快速匹配',
    icon: icons.binaryFeature,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  colorSpaceHistogram: {
    href: '/concepts/color-space-histogram',
    title: '颜色空间与颜色直方图',
    titleEn: 'Color Space & Histogram',
    description: 'RGB 与 HSV 颜色空间转换、颜色直方图统计与目标检测应用',
    icon: icons.colorSpace,
    color: 'from-yellow-500 to-amber-600',
    bgLight: 'bg-yellow-50',
    textColor: 'text-yellow-700',
  },
  lbpGaborTexture: {
    href: '/concepts/lbp-gabor-texture',
    title: 'LBP 与 Gabor 纹理特征',
    titleEn: 'LBP & Gabor Texture',
    description: '局部二值模式与 Gabor 滤波器：从局部灰度比较到方向频率选择',
    icon: icons.texture,
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  histogramTemplateMatching: {
    href: '/concepts/histogram-template-matching',
    title: '直方图匹配与模板匹配',
    titleEn: 'Histogram & Template Matching',
    description: '相关法、卡方距离、巴氏距离与 SSD/SAD 滑动窗口匹配',
    icon: icons.templateMatching,
    color: 'from-cyan-500 to-blue-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  hogFeature: {
    href: '/concepts/hog-feature',
    title: 'HOG 特征',
    titleEn: 'HOG Feature',
    description: '梯度方向直方图：从像素梯度到 cell-block-window 特征描述',
    icon: icons.hog,
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  haarLbpFeatureVector: {
    href: '/concepts/haar-lbp-feature-vector',
    title: 'Haar / LBP 特征向量',
    titleEn: 'Haar / LBP Feature Vector',
    description: 'Haar-like 特征与积分图加速、LBP 特征向量提取与串联',
    icon: icons.haarLbp,
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  classifierDetectionPipeline: {
    href: '/concepts/classifier-detection-pipeline',
    title: '分类器与检测流程',
    titleEn: 'Classifier & Detection Pipeline',
    description: '从训练样本、特征提取、分类器判定到滑动窗口输出检测框的完整流程',
    icon: icons.classifier,
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
      icons.overview,
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
      icons.acquisition,
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
    subtitle: '',
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
    chapter: '第二章',
    title: '图像预处理与几何校正',
    subtitle: '',
    modules: [
      {
        eyebrow: 'Part 1',
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
    chapter: '第三章',
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

const totalConceptCount = learningChapters.reduce(
  (chapterTotal, chapter) =>
    chapterTotal + chapter.modules.reduce((moduleTotal, module) => moduleTotal + module.concepts.length, 0),
  0,
);

const moduleCount = learningChapters.reduce((total, chapter) => total + chapter.modules.length, 0);

function ConceptCardView({ concept, index }: { concept: ConceptCard; index: number }) {
  const inner = (
    <>
      <div className={`h-1 bg-gradient-to-r ${concept.color}`} />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${concept.bgLight} ${concept.textColor} transition-transform duration-300 group-hover:scale-105`}>
            {concept.icon}
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            {index + 1}
          </div>
        </div>

        <h3 className="text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-600">
          {concept.title}
        </h3>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {concept.titleEn}
        </p>

        {concept.description ? (
          <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">
            {concept.description}
          </p>
        ) : (
          <div className="mt-3 h-12 rounded-lg border border-dashed border-slate-200 bg-slate-50/70" />
        )}

        <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${concept.href ? 'text-blue-600' : 'text-slate-400'}`}>
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

  const className = 'group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60';

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
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <header className="relative border-b border-slate-200 bg-white">
        <a
          href="https://github.com/WhitePlusMS/Classical-CV-Lab"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-5 top-10 text-slate-400 transition-colors hover:text-slate-700"
          aria-label="GitHub"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
              视界实验室
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              面向计算机视觉课程的交互式学习工作台，把图像采集、预处理、几何校正与目标检测拆成可观察、可调参、可推演的算法实验。
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{learningChapters.length}</span><span>章</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-800">{moduleCount}</span><span>模块</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-800">{totalConceptCount}</span><span>卡片</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        {/* Section Title
        <div className="mb-8 flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">按课程顺序开始学习</h2>
          <div className="ml-4 h-px flex-1 bg-slate-200" />
        </div> */}

        {/* Concept Chapters */}
        <div className="space-y-14">
          {learningChapters.map(chapter => (
            <section key={chapter.title}>
              <div className="mb-7 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {chapter.chapter ? (
                    <p className="text-xs font-semibold tracking-wide text-blue-600">{chapter.chapter}</p>
                  ) : null}
                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{chapter.title}</h3>
                </div>
                {chapter.subtitle ? (
                  <p className="text-sm text-slate-500">{chapter.subtitle}</p>
                ) : null}
              </div>

              <div className="space-y-10">
                {chapter.modules.map(module => (
                  <div key={`${chapter.title}-${module.title}`}>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {module.eyebrow}
                        </span>
                        <h4 className="text-xl font-bold tracking-tight text-slate-900">{module.title}</h4>
                      </div>
                      <div>
                        {module.source ? (
                          <p className="text-sm text-slate-500">{module.source}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="mt-10 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">课程路线</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  首页按章节与 Part 顺序组织入口；点击任一卡片进入对应概念页，查看参数、图像、公式与计算过程的联动演示。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <p className="text-xs text-slate-400 text-center">
          <a
              href="https://github.com/WhitePlusMS/Classical-CV-Lab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Classical-CV-Lab / 视界实验室 · WhitePlusMS &copy; 2026
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
