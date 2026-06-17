'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { resolveAssetPath } from '@/lib/utils/assetPath';
import { TeachingTerm } from './TeachingTerm';

export interface ConceptIntroImage {
  src: string;
  alt: string;
  caption: string;
  sourceLabel: string;
  sourceHref?: string;
}

export interface ConceptIntroProps {
  title: string;
  problem: React.ReactNode;
  idea: React.ReactNode;
  observe: React.ReactNode;
  image?: ConceptIntroImage;
}

export const CONCEPT_INTRO_CONTENT: Record<string, ConceptIntroProps> = {
  '/concepts/acquisition-system': {
    title: '图像采集系统先解决什么',
    problem: '当你想用计算机分析真实场景时，光线、镜头和传感器会共同决定最终数字图像长什么样。如果忽略这些硬件环节，后续算法看到的可能并不是你想测量的真实信息。',
    idea: '常用的办法是从采集链路的各个环节入手：先根据场景亮度与反光特性选择或布置光源，再按视野和清晰度需求选择镜头焦距与光圈，然后匹配分辨率、帧率和接口合适的相机，最后由处理平台完成实时传输与计算。每个环节都会改变图像数据。',
    observe: '切换不同的光源、镜头或相机配置，观察同一场景的亮度、清晰度和视野范围如何变化；注意采集链中哪一环让图像变暗、变模糊或产生畸变。',
    image: {
      src: '/assets/concept-intro/acquisition-system-machine-vision.jpg',
      alt: '机器视觉采集处理系统结构图',
      caption: '机器视觉系统把照明、镜头相机、传送机构和图像处理软件串成完整采集链路。',
      sourceLabel: 'Wikimedia Machine Vision System',
      sourceHref: 'https://commons.wikimedia.org/wiki/File:Machine_Vision_System.jpg',
    },
  },
  '/concepts/grayscale': {
    title: '为什么要把彩色图变成灰度图',
    problem: '当后续任务只关心物体的明暗结构和轮廓，而不需要区分红、绿、蓝颜色时，直接处理三个通道会让计算变重，也可能被不相关的颜色信息干扰。',
    idea: '常用的办法是把 R、G、B 三个通道合成为一个亮度值：可以用加权平均，也可以用简单平均把三通道等权处理，还可以只取某一个通道作为灰度结果。',
    observe: '切换原图的 R/G/B 单通道显示，再切换加权平均和简单平均等灰度化方法，观察同一个像素的输出值怎么变；注意颜色差异大的区域在灰度图中是否还能区分。',
    image: {
      src: '/assets/concept-intro/grayscale-rgb-to-gray.png',
      alt: 'RGB 图像转换为灰度图示例',
      caption: 'RGB 图像转灰度时，颜色通道被合成为单通道亮度结构。',
      sourceLabel: 'scikit-image rgb2gray 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/color_exposure/plot_rgb_to_gray.html',
    },
  },
  '/concepts/histogram': {
    title: '直方图统计什么',
    problem: '当你拿到一张偏暗、偏亮或灰度层次挤在一起的图像时，仅靠逐像素看图很难快速判断整体亮暗分布。我们需要一种直接统计所有像素亮度的方法。',
    idea: '常用的办法是把每个像素按灰度级分组计数，画成柱状图：柱子越高说明该灰度出现越多；分布偏左说明图像偏暗，偏右说明偏亮，集中则说明对比度较低。',
    observe: '切换不同的示例图，观察直方图整体是偏左、偏右还是集中；拖动阈值线时，看看哪些像素被划入当前区间，从而理解灰度分布和图像明暗的对应关系。',
    image: {
      src: '/assets/concept-intro/histogram-equalize-histogram.png',
      alt: '图像直方图与累计分布示例',
      caption: '直方图和累计分布展示灰度出现频率，是判断亮度与对比度的统计入口。',
      sourceLabel: 'scikit-image exposure 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/color_exposure/plot_equalize.html',
    },
  },
  '/concepts/convolution': {
    title: '卷积在计算什么',
    problem: '当 3×3 或更大的小窗口滑到图像某个位置时，需要把窗口里的每个像素按一定权重加权求和，得到一个新的输出像素。问题是这些权重从何而来，以及不同权重会产生什么效果。',
    idea: '常用办法是定义一个卷积核来规定窗口里每个位置的权重：可以全部取相同值做平滑平均，也可以中心为正、周围为负来提取边缘，还可以让权重朝某个方向倾斜以检测特定走向的轮廓。换核就是换计算规则。',
    observe: '拖动窗口看当前邻域里的原始像素，再对照核矩阵里逐项相乘后的结果：改变核类型或核大小，输出变化来自权重分布和窗口范围的改变。',
    image: {
      src: '/assets/concept-intro/convolution-filter-denoise.png',
      alt: '空间滤波卷积处理示例',
      caption: '空间滤波通过局部邻域和权重计算改变图像响应，是卷积运算的典型用途。',
      sourceLabel: 'scikit-image denoise 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/filters/plot_denoise.html',
    },
  },
  '/concepts/geometric-transform': {
    title: '几何变换改变什么',
    problem: '当我们想把图像平移、旋转、放大或拉斜时，像素原来的坐标不再适用。需要重新计算每个输出位置对应原图的哪个坐标，再把像素值搬过去。',
    idea: '常用办法是用一个 3×3 的变换矩阵描述坐标映射：可以只改 x、y 方向偏移做平移，可以绕中心乘旋转矩阵，也可以沿坐标轴缩放或加上剪切项。映射后如果坐标不是整数，还要用插值补出像素值。',
    observe: '拖动变换参数滑块，对比原图坐标和输出图像：矩阵改变的是坐标映射关系，插值方法决定非整数位置采样的颜色过渡是否平滑。',
    image: {
      src: '/assets/concept-intro/geometric-transform.png',
      alt: '几何坐标变换示例',
      caption: '几何变换通过坐标映射改变图像位置关系，插值负责补齐映射后的采样值。',
      sourceLabel: 'scikit-image geometric transform 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/transform/plot_geometric.html',
    },
  },
  '/concepts/frame-difference-motion': {
    title: '帧差法怎样发现运动',
    problem: '当我们看一段视频，想知道哪些区域在动、哪些背景保持不动时，需要比较连续两帧的像素差异。问题是差异多大才算运动，以及如何减少噪声和拖影的干扰。',
    idea: '常用办法是先算当前帧与前一帧对应位置的灰度绝对差，再用阈值把差值分成“静止”和“运动”两类；更稳的做法是三帧差法，比较当前帧与前后帧的两次差异，取交集来抑制噪声和空洞。',
    observe: '切换播放或拖动到不同帧，对比当前帧、前一帧、差分图和运动掩膜：阈值调低会连噪声一起标成运动，目标移动越快、帧间距越大，运动区域越宽。',
    image: {
      src: '/assets/concept-intro/frame-difference-motion-triptych.jpg',
      alt: '帧差法前一帧、当前帧和运动掩膜对比',
      caption: '帧差法通过比较相邻帧，把发生变化的位置转换成运动掩膜。',
      sourceLabel: '项目帧差法三联图',
    },
  },
  '/concepts/classifier-detection-pipeline': {
    title: '检测流水线把什么交给分类器',
    problem: (
      <>
        当一张图里目标位置和大小都不确定时，
        <TeachingTerm term="分类器" explanation="根据输入特征判断样本属于哪一类的模型" />
        只能回答“这个裁好的小窗口是不是目标”，没法直接说“目标在图的哪里”。检测任务需要把整张图拆成许多局部窗口，再逐个判断。
      </>
    ),
    idea: (
      <>
        常用的处理办法是：用一个
        <TeachingTerm term="滑动窗口" explanation="在图像上按固定大小逐步移动取样的矩形框" />
        从左到右、从上到下扫过整张图，把每个窗口裁出来交给分类器；为每个窗口提取 Haar、HOG 或 LBP 等特征，把像素转成更稳定的数字；对重叠的检测框做
        <TeachingTerm term="非极大值抑制" explanation="合并重叠检测框，只保留置信度最高的代表框" />
        ，只保留最有代表性的结果；再用
        <TeachingTerm term="级联" explanation="由简到繁的多级分类器，先用快速分类器排除简单背景" />
        结构先快速排除明显不是目标的窗口，把精细判断留给少数可疑窗口。
      </>
    ),
    observe: (
      <>
        拖动滑动窗口，比较当前窗口在原图的位置、提取出的特征响应和分类器输出；切换不同特征或级联阶段，观察哪些窗口被保留、哪些被过滤，理解整张图检测其实是很多局部判断的组合。
      </>
    ),
    image: {
      src: '/assets/concept-intro/classifier-detection-haar.png',
      alt: 'Haar 特征分类器训练示例',
      caption: 'Haar 特征和分类器把局部窗口转换成可判定的目标/背景样本。',
      sourceLabel: 'scikit-image Haar 分类示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/applications/plot_haar_extraction_selection_classification.html',
    },
  },
  '/concepts/histogram-equalization': {
    title: '为什么要做直方图均衡化',
    problem: (
      <>
        当照片整体偏暗、偏亮或灰度层次挤在一起时，原本该有的细节会糊成一片。任务是把集中在一起的灰度拉开，让暗部和亮部都能重新显出层次。
      </>
    ),
    idea: (
      <>
        常用的处理办法是：先统计每个灰度级出现的次数，画出
        <TeachingTerm term="灰度直方图" explanation="统计图像中各灰度级出现次数的柱状图" />
        ；再计算
        <TeachingTerm term="累计分布函数 CDF" explanation="灰度值小于等于某值的像素累计占比" />
        ，建立旧灰度到新灰度的映射表；然后按这个映射表把原图像素逐点替换。原本出现很多的灰度被拉开，出现很少的灰度被合并，图像的
        <TeachingTerm term="对比度" explanation="图像中明暗区域的差异程度" />
        自然增强。
      </>
    ),
    observe: (
      <>
        切换不同示例图，比较原图、原直方图、CDF 映射曲线和均衡化后的结果；拖动阈值观察灰度分布被拉开的过程，注意当原图灰度集中在一侧时，均衡化效果最明显，但噪声也可能被一起放大。
      </>
    ),
    image: {
      src: '/assets/concept-intro/histogram-equalization-scikit.png',
      alt: '直方图均衡化前后对比示例',
      caption: '低对比图像经过直方图均衡化后，灰度层次被重新拉开。',
      sourceLabel: 'scikit-image equalize 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/color_exposure/plot_equalize.html',
    },
  },
  '/concepts/image-sharpening': {
    title: '锐化要增强什么',
    problem: (
      <>
        当图像因为拍摄抖动、对焦不实或压缩而边缘发虚时，轮廓和纹理的细节会变模糊。任务是让边缘处的亮暗变化更陡峭，使轮廓重新清晰，而不是简单把整幅图变亮。
      </>
    ),
    idea: (
      <>
        常用的处理办法是：先提取图像的
        <TeachingTerm term="高频成分" explanation="图像中灰度变化剧烈的部分，通常对应边缘和细节" />
        或
        <TeachingTerm term="二阶差分" explanation="用中心像素与周围像素的差异衡量边缘强度" />
        ，找到边缘和纹理的位置；再把这部分变化量按一定比例叠加回原图；也可以先做一次轻微模糊得到
        <TeachingTerm term="低频图" explanation="图像中变化缓慢的大致明暗结构" />
        ，用原图减去低频图得到边缘细节，最后把细节加回去。参数越大边缘越突出，但噪声和伪影也可能被一起放大。
      </>
    ),
    observe: (
      <>
        拖动窗口到边缘位置，比较原图窗口、提取出的边缘响应和锐化后的输出；切换锐化强度，观察平坦区域几乎不变、边缘处变化加剧，同时注意过强参数会让噪声和伪影一起变得明显。
      </>
    ),
    image: {
      src: '/assets/concept-intro/image-sharpening-unsharp-mask.png',
      alt: '图像锐化示例',
      caption: '锐化通过增强局部变化，让轮廓和纹理更清楚。',
      sourceLabel: 'scikit-image unsharp mask 示例',
      sourceHref: 'https://scikit-image.org/docs/0.25.x/auto_examples/filters/plot_unsharp_mask.html',
    },
  },
  '/concepts/pixel-matrix': {
    title: '为什么需要边界策略',
    problem: '当 3×3 或更大的窗口滑到图像边缘时，窗口中心周围的格子会跑到图像外面。如果不处理，这个窗口就缺像素、算不下去。',
    idea: '常用的处理办法是给越界位置赋一个可用的像素值：可以补 0、复制边缘像素、按镜像方式对称填充，或者只计算窗口中仍在图像内的部分。补法不同，边缘像素的输出结果就不一样。',
    observe: '把窗口拖到图像边缘，看看邻域矩阵里哪些格子来自原图、哪些格子是边界策略补出来的；换一种策略，比较输出值的变化，就能明白边界处理到底影响了什么。',
    image: {
      src: '/assets/lena-original.jpg',
      alt: 'Lena 图像像素矩阵示例',
      caption: '把图像看成像素矩阵后，边缘位置的邻域窗口会出现越界问题。',
      sourceLabel: '项目示例图',
    },
  },
  '/concepts/blur': {
    title: '空间域滤波的共同思想',
    problem: '当图像里出现噪声点或细碎纹理干扰后续处理时，直接用单个像素的灰度值不可靠，需要借助周围像素重新估计中心像素的值。',
    idea: '常用的处理办法是用一个小窗口罩住中心像素，再把窗口里的像素按某种规则合并成一个新值：可以简单取平均值，可以按离中心远近加权（高斯加权），可以排序后取中间值去掉极端点，也可以在跨越边缘时使用边窗滤波只保留贴近边缘一侧的像素。',
    observe: '拖动窗口到平坦区域、边缘和噪声点旁边，切换均值/高斯/中值/边窗滤波，比较中心像素的变化；注意边缘处哪种方法能让边界保持清晰，噪声处哪种方法去噪更干净。',
    image: {
      src: '/assets/concept-intro/blur-denoise-scikit.png',
      alt: '图像降噪滤波示例',
      caption: '空间滤波通过邻域信息抑制噪声，但也可能损失边缘。',
      sourceLabel: 'scikit-image denoise 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/filters/plot_denoise.html',
    },
  },
  '/concepts/edge-detection': {
    title: '边缘检测在找什么',
    problem: '当我们要让计算机找到物体的轮廓、线条或明暗交界时，不能只看某个像素是深是浅，而要看它和周围像素的灰度变化有多大。',
    idea: '常用的处理办法是在小窗口里计算灰度变化：可以用一阶差分得到水平和竖直方向的变化量，再合成梯度幅值；可以用二阶导数找变化最陡的零点；也可以用 Canny 流程先平滑再求梯度、做非极大值抑制和双阈值筛选。',
    observe: '点击或拖动窗口到明暗交界处、平坦区域和噪声点，对比不同算子的响应图；注意灰度跳变越大的地方响应越强，而阈值和参数改变会如何影响检测到的边缘数量和粗细。',
    image: {
      src: '/assets/concept-intro/edge-detection-filter.png',
      alt: '边缘检测滤波示例',
      caption: '边缘检测把灰度突变转换为可观察的响应图。',
      sourceLabel: 'scikit-image edge filter 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/edges/plot_edge_filter.html',
    },
  },
  '/concepts/camera-model': {
    title: '相机成像需要哪些参数',
    problem: '当知道一个物体在真实世界中的三维坐标时，要算出它会出现在照片上的哪个像素位置，必须同时考虑相机放在哪里、朝向哪里，以及镜头和传感器如何把光线变成像素。',
    idea: '常用的处理办法是把成像拆成几步：先用外参把世界坐标转到相机坐标，再用透视投影把三维点映射到归一化平面，最后用内参把无单位坐标转成像素坐标。焦距决定放大倍数，主点决定光轴落在图像中的位置，像素尺度负责单位换算。',
    observe: '拖动三维点或旋转相机姿态，观察世界坐标、相机坐标、归一化平面坐标和像素坐标四列数值如何联动；尝试只改外参、只改焦距或只改主点，看看哪一段变化对应图像上的平移，哪一段对应缩放。',
    image: {
      src: '/assets/concept-intro/camera-calibration-left01.jpg',
      alt: '相机标定棋盘格样例图',
      caption: '真实相机图像中的已知几何点可用于反推相机成像参数。',
      sourceLabel: 'OpenCV calibration sample',
      sourceHref: 'https://github.com/opencv/opencv/blob/4.x/samples/data/left01.jpg',
    },
  },
  '/concepts/calibration-pattern': {
    title: '为什么要用标定板',
    problem: '当我们想从一张照片反推相机参数时，必须先知道照片中某些点在真实空间里的准确位置。普通场景里的墙面、桌椅没有精确三维坐标，单靠一张照片给不出求解所需的约束。',
    idea: '常用办法是在相机前放置几何形状已知的标定板：棋盘格利用黑白交界产生清晰角点，圆点阵列利用圆心提供稳定定位。角点检测得到像素坐标后，再和标定板上的世界坐标一一配对，就能形成求解相机参数的约束。',
    observe: '拖动或旋转标定板，观察角点在世界坐标和像素坐标之间是否还能一一对应；切换棋盘格与圆点图案，比较哪种角点在倾斜、模糊或靠近边缘时更容易被稳定检测和编号。',
    image: {
      src: '/assets/concept-intro/camera-calibration-left01.jpg',
      alt: '棋盘格标定板图像',
      caption: '棋盘格角点提供了已知几何坐标和像素坐标之间的对应关系。',
      sourceLabel: 'OpenCV calibration sample',
      sourceHref: 'https://github.com/opencv/opencv/blob/4.x/samples/data/left01.jpg',
    },
  },
  '/concepts/zhang-calibration': {
    title: '张正友标定解决什么',
    problem: '当我们只有普通相机和一张平面标定板时，想同时求出相机的内参和每张拍摄姿态的外参。问题是单张照片只能建立平面到图像的投影关系，无法直接拆分出焦距、主点和姿态。',
    idea: '常用办法是张正友标定：对每张标定板照片，先用角点对应估计单应矩阵 H；再把多张图的 H 合起来，利用旋转矩阵的约束解出内参 K；最后用 K 和每张图的 H 分解出对应的 R 和 t。',
    observe: '切换不同数量的标定照片，观察约束数量和估计精度的变化；点击某个角点，比较检测位置、重投影位置和真实位置之间的偏差，理解 H、K、R/t 的误差是怎样逐层传递的。',
    image: {
      src: '/assets/concept-intro/camera-calibration-left01.jpg',
      alt: '张正友标定使用的棋盘格图像',
      caption: '多张不同姿态的平面标定板图像可以共同约束相机内参。',
      sourceLabel: 'OpenCV calibration sample',
      sourceHref: 'https://github.com/opencv/opencv/blob/4.x/samples/data/left01.jpg',
    },
  },
  '/concepts/distortion-correction': {
    title: '镜头畸变为什么要校正',
    problem: '当用广角或普通镜头拍摄时，真实场景里的直线在照片边缘可能出现弯曲，物体的形状也会被拉长或压缩。如果不校正，后续基于直线或距离的测量就会出错。',
    idea: '常用办法是先建立畸变模型：径向畸变用多项式描述光线向边缘的弯曲，切向畸变描述镜头与传感器不平行带来的偏移。校正时根据目标像素反查它在原图中的采样位置，再把弯曲的结构重新映射回规则坐标。',
    observe: '拖动滑块改变畸变系数，观察图像中心与边缘的变形程度有什么不同；切换径向和切向参数，看看直线从弯曲恢复平直的过程主要来自哪一类畸变。',
    image: {
      src: '/assets/concept-intro/distortion-correction-radial.jpg',
      alt: '镜头径向畸变示例',
      caption: '径向畸变会让直线在图像边缘附近产生明显弯曲。',
      sourceLabel: 'OpenCV calibration docs',
      sourceHref: 'https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html',
    },
  },
  '/concepts/image-registration': {
    title: '图像配准要对齐什么',
    problem: '当同一目标在不同时间、视角或传感器拍成两幅图时，直接叠加会出现重影或错位。图像配准的任务是估计一个整体变换，把待配准图映射到参考图坐标系，使同一结构尽量重合。',
    idea: '常用办法是先找两幅图中的同名<TeachingTerm term="控制点" explanation="控制点是两幅图中对应同一空间位置的标记点，用于约束几何变换的参数。" />，再用这些点估计变换参数；也可以比较整图相似度，或者用<TeachingTerm term="相位相关" explanation="相位相关利用图像频谱的相位信息估计两幅图之间的平移量，对亮度变化较稳健。" />搜索平移偏移。变换常用<TeachingTerm term="仿射变换" explanation="仿射变换保持平行关系和直线性，适合视角变化较小、目标近似平面的场景。" />或<TeachingTerm term="透视变换" explanation="透视变换允许近大远小的投影形变，适合同一平面因视角改变产生明显收缩的场景。" />，估计完成后把待配准图逐像素重采样到参考坐标系。',
    observe: '切换几何模型或增加误匹配数量，观察参考点、观测点与模型预测点之间的误差向量；点击不同匹配对，查看叠加图重影和<TeachingTerm term="残差" explanation="残差是观测点与模型预测点之间的距离，越小表示当前匹配越支持估计出的变换。" />是否同步变化。',
    image: {
      src: '/assets/concept-intro/image-registration-translation.png',
      alt: '图像配准平移估计示例',
      caption: '图像配准估计坐标偏移或几何变换，让同一结构重合。',
      sourceLabel: 'scikit-image registration 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/registration/plot_register_translation.html',
    },
  },
  '/concepts/threshold-auto-threshold': {
    title: '阈值分割先决定什么',
    problem: '当需要从灰度图中把目标区域和背景区域分开时，只凭人工指定阈值容易受光照和场景变化影响。要先确定阈值 T 从哪里来，再确定每个像素与 T 比较后按什么规则写入结果。',
    idea: '常用办法是人工拖动固定阈值；也可以让 OTSU 根据直方图<TeachingTerm term="类间方差" explanation="类间方差衡量按某个阈值分开后，前景类和背景类均值差异的大小；OTSU 选择让它最大的阈值。" />自动选 T，或者用 Kittler 按梯度加权估计前景与背景的分界。阈值确定后，再用 BINARY、TRUNC、TOZERO 等输出规则生成结果图。',
    observe: '拖动阈值滑杆或切换阈值方法，观察直方图中的阈值线位置和结果图中的前景面积、边界如何一起变化；再切换输出类型，比较同一阈值下不同写入规则的区别。',
    image: {
      src: '/assets/concept-intro/threshold-auto-threshold-scikit.png',
      alt: '自动阈值分割示例',
      caption: '自动阈值方法根据灰度分布选择分割边界。',
      sourceLabel: 'scikit-image thresholding 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/applications/plot_thresholding.html',
    },
  },
  '/concepts/background-modeling-subtraction': {
    title: '背景模型是什么',
    problem: '当需要在连续视频中检测运动目标或新出现物体时，直接用相邻两帧相减会留下双影，也容易把静止不久的目标漏掉。需要先为每个像素建立一个长期背景模型，再把当前帧与它比较。',
    idea: '常用办法是用前若干帧的均值作为背景；也可以用<TeachingTerm term="自适应递推" explanation="自适应递推按学习率 α 把当前帧融入背景，α 越大背景更新越快，适合缓慢光照变化。" />持续更新背景，或者用单高斯分布、<TeachingTerm term="混合高斯模型" explanation="混合高斯模型允许同一像素有多个常见背景取值，适合树叶摇晃、水面反光等动态背景。" />描述每个像素的常见取值。当前像素与背景估计相差超过阈值时，就判为前景并写入<TeachingTerm term="前景掩膜" explanation="前景掩膜是一幅二值图，标记当前帧中被判定为运动目标或新出现物体的像素位置。" />。',
    observe: '点击不同像素或拖动当前帧序号，观察该位置的历史灰度序列、背景估计值和当前差分；再切换背景模型，比较前景掩膜中目标残留和背景噪声的变化。',
    image: {
      src: '/assets/concept-intro/background-modeling-subtraction-opencv.png',
      alt: '背景减除当前帧、背景模型和前景掩膜对比',
      caption: '背景模型从历史帧中估计稳定场景，再把当前帧中的运动目标分割为前景掩膜。',
      sourceLabel: 'OpenCV segment objects demo',
      sourceHref: 'https://amroamroamro.github.io/mexopencv/opencv/segment_objects_demo.html',
    },
  },
  '/concepts/binary-feature-descriptors': {
    title: '二进制描述子为什么快',
    problem: '当一幅图里检测出几百上千个关键点，需要快速判断哪些局部结构相似时，如果每个描述子都是高维浮点向量，存储和匹配都会变得很重。',
    idea: '常用办法是把关键点周围的局部小块变成 0/1 串：先在 Patch 里选若干点对并比较亮暗，亮暗关系决定每一位是 0 还是 1；BRIEF 直接随机选点比较，ORB 先估计主方向再旋转采样，BRISK 用长点对估计方向、短点对编码细节。两个二进制描述子的差异用汉明距离统计，匹配速度比浮点向量快很多。',
    observe: '拖动关键点位置或切换 BRIEF / ORB / BRISK，观察同一局部区域的采样点对、方向箭头和生成的 bit 串如何变化；重点比较旋转或移动后，哪些算法的 bit 串变化更小、更稳定。',
    image: {
      src: '/assets/concept-intro/binary-feature-descriptors-orb.png',
      alt: 'ORB 特征匹配示例',
      caption: '二进制特征用快速描述子支持大规模关键点匹配。',
      sourceLabel: 'scikit-image ORB 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/features_detection/plot_orb.html',
    },
  },
  '/concepts/color-space-histogram': {
    title: '为什么从 RGB 转到 HSV',
    problem: '当想根据颜色把图像里的目标区域挑出来时，直接用 RGB 判断很容易出问题：光照变亮或变暗会让同一种颜色的 R、G、B 三个值一起改变，红色在阴影和强光下看起来数值差别很大。',
    idea: '常用办法是先把颜色从 RGB 转到 HSV，然后只看色调范围来提取颜色；再用颜色直方图统计目标颜色在整幅图中的分布。这样亮度变化主要影响 V 通道，H 通道对同一种颜色更稳定。',
    observe: '切换不同光照下的同一张图，或调整 HSV 的色调范围，观察 RGB 三个通道和 HSV 色调通道哪个更稳定；再拖动阈值，看掩膜里被保留的区域是随 H 变化还是随亮度变化。',
    image: {
      src: '/assets/color-space-histogram/hsv-example.jpg',
      alt: 'HSV 颜色空间示例',
      caption: 'HSV 将颜色和亮度拆开，更适合做颜色范围提取。',
      sourceLabel: '项目 HSV 示例图',
    },
  },
  '/concepts/lbp-gabor-texture': {
    title: '纹理特征描述什么',
    problem: '当需要区分木材、布料、砖墙这类表面，或者要找出条纹、斑点、粗糙度等局部模式时，只用颜色或边缘不够：纹理关注的是灰度在局部怎么排列、怎么重复变化。',
    idea: '常用办法是用两种思路刻画纹理：LBP 把中心像素和周围邻域逐个比较亮暗，生成一个局部二进制模式，再统计这些模式出现的频率，适合描述微小结构；Gabor 用一组方向和频率的滤波器扫描图像，看局部区域对不同方向条纹的响应强弱，适合描述条纹、尺度和方向。',
    observe: '拖动观察窗口到不同纹理区域，比较 LBP 编码图和 Gabor 响应图：LBP 图里变化剧烈的地方通常对应细节丰富的纹理，Gabor 图里亮度高的方向则对应该区域的主导条纹方向。',
    image: {
      src: '/assets/concept-intro/lbp-gabor-texture-scikit.png',
      alt: 'Gabor 纹理滤波示例',
      caption: '纹理特征把局部灰度排列、方向和频率转化为可比较的数值响应。',
      sourceLabel: 'scikit-image Gabor 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/features_detection/plot_gabor.html',
    },
  },
  '/concepts/hog-feature': {
    title: 'HOG 把窗口变成什么',
    problem: '当直接把检测窗口的原始灰度交给分类器时，窗口大小或亮度一变化，向量就失去可比性；我们需要把窗口里的边缘结构抽成稳定描述。',
    idea: <>常用办法是把窗口分成若干 <TeachingTerm term="cell" explanation="HOG 中按方向统计梯度分布的最小网格单元。" className="mx-1" />，在每个 cell 里按梯度方向投票得到直方图，再把相邻 cell 拼成 <TeachingTerm term="block" explanation="由多个相邻 cell 组成的区域，对其内部直方图做归一化，使描述对局部亮度变化更稳定。" className="mx-1" />。这样生成的固定长度向量保留物体轮廓，又对光照变化不那么敏感。</>,
    observe: '拖动窗口到不同位置，对比 cell 直方图和 block 归一化前后的变化；注意梯度方向在哪里投票变多，以及 block 大小改变时哪些区域被合并。',
    image: {
      src: '/assets/concept-intro/hog-feature-scikit.png',
      alt: 'HOG 特征可视化示例',
      caption: 'HOG 将窗口中的边缘方向分布编码为固定长度特征。',
      sourceLabel: 'scikit-image HOG 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/features_detection/plot_hog.html',
    },
  },
  '/concepts/haar-lbp-feature-vector': {
    title: '特征向量给分类器什么',
    problem: '当分类器面对一个滑动窗口时，它不能直接读图；我们需要先把窗口里的亮暗结构和纹理规律转换成一组固定长度的数字。',
    idea: <>常用办法有两种：一种是用 <TeachingTerm term="Haar-like 特征" explanation="把窗口划分成黑白矩形，比较区域灰度差，描述边缘、线或亮斑结构。" className="mx-1" /> 计算矩形区域差值，并用 <TeachingTerm term="积分图" explanation="每个位置保存左上角累计和，任意矩形求和只需四个角点加减。" className="mx-1" /> 加速；另一种是把中心像素与邻域的比较结果转成 <TeachingTerm term="LBP 编码" explanation="用中心像素阈值化周围邻域像素后得到的局部纹理模式编号。" className="mx-1" />，再按 cell 统计直方图并串联成向量。</>,
    observe: '切换 Haar 模板或调整 LBP cell 大小，观察响应值和直方图怎么跟着变；注意同一个窗口里，哪些结构让 Haar 响应变大、哪些纹理让 LBP 直方图出现峰值。',
    image: {
      src: '/assets/haar-lbp-feature-vector/haar-integral-image.jpg',
      alt: 'Haar 积分图加速示例',
      caption: 'Haar 和 LBP 将窗口内容编码为分类器可使用的特征向量。',
      sourceLabel: '项目 Haar/LBP 示例图',
    },
  },
  '/concepts/keypoint-matching-pipeline': {
    title: '特征点匹配解决什么',
    problem: '当同一场景在两张图里发生视角偏移、尺度变化或亮度变化时，直接比对整图像素很难找到对应位置；我们需要先把图中稳定可重复的结构找出来。',
    idea: <>常用办法分三步：先在两张图里分别检测 <TeachingTerm term="关键点" explanation="图像中在视角、尺度、亮度变化下仍能被稳定检测到的局部显著位置。" className="mx-1" />，再为每个关键点生成 <TeachingTerm term="描述子" explanation="描述关键点周围局部结构的向量，用于比较两个关键点是否相似。" className="mx-1" />，最后比较描述子相似度找到对应关系。这样整图对齐就被拆成了局部结构的配对问题。</>,
    observe: '切换示例图片对或调整检测阈值，观察关键点在两张图里是否都能重复出现；拖动滑块改变匹配阈值，注意哪些连线真的连接了相同的局部结构，哪些是误匹配。',
    image: {
      src: '/assets/keypoint-matching-pipeline/feature-mapping.jpg',
      alt: '特征映射示意图',
      caption: '图像被映射为局部特征向量集后，匹配问题变成描述子相似度比较。',
      sourceLabel: '项目特征点匹配示例图',
    },
  },
  '/concepts/sift-surf-scale-features': {
    title: '尺度特征为什么重要',
    problem: '当同一张图被拉近、拉远或旋转一定角度后，同一个角点在图像里占的像素大小和方向都会变。如果检测器只认固定大小的窗口，就可能在某些尺度上找不到同一个关键点。',
    idea: '常用的处理办法是在多个尺度上同时观察图像：先用高斯模糊得到不同清晰程度的图层，再在相邻图层的差分里找极值点；给每个点分配一个主方向，让描述子对旋转也稳定；最后把周围梯度信息编码成固定长度的描述向量。',
    observe: '切换 SIFT 和 SURF 视角，拖动缩放条或旋转图像，观察同一关键点是否在不同尺度下都能被检测到；再对比描述子网格，看看方向归一化后相似结构的向量是否接近。',
    image: {
      src: '/assets/sift-surf/sift-surf-scale-comparison.jpg',
      alt: 'SIFT 和 SURF 尺度特征比较',
      caption: '尺度空间让关键点在远近变化时仍能被稳定检测。',
      sourceLabel: '项目 SIFT/SURF 示例图',
    },
  },
  '/concepts/perspective-transform': {
    title: '透视变换校正什么',
    problem: '当相机斜对着一张纸、路面或墙面拍摄时，原本矩形的平面在图像里会变成梯形或任意凸四边形。如果直接做仿射校正，四个角无法同时对齐，需要引入能描述近大远小的投影变换。',
    idea: '常用的处理办法是先在原图和目标正视图上各标出四个对应角点，用这八组坐标求解一个 3×3 齐次矩阵；得到矩阵后，对输出图像的每个像素反查原图位置并插值采样；也可以和仿射变换对比，体会前三点与四点约束的差别。',
    observe: '拖动左图 A-D 四个控制点，观察透视结果和仿射结果的变化：当四点构成明显梯形时，透视结果能把平面展开成矩形，而仿射结果在第四角会留下残差。',
    image: {
      src: '/assets/concept-intro/perspective-transform-geometric.png',
      alt: '几何与透视变换示例',
      caption: '透视变换通过对应点把斜视平面映射到目标平面。',
      sourceLabel: 'scikit-image geometric transform 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/transform/plot_geometric.html',
    },
  },
  '/concepts/morphology': {
    title: '形态学操作改变什么',
    problem: '当图像已经二值化后，前景里常混有孤立小白点、裂缝或小孔洞，轮廓也可能毛糙。如果直接交给后续步骤，这些噪声和断裂会被误判成真实结构。',
    idea: '常用的处理办法是用一个结构元素当作小探针，在二值图上滑动并按集合规则改写中心像素：腐蚀只保留结构元素完全落在前景内的位置，能去掉细小突出和孤立点；膨胀只要结构元素碰到前景就把中心标为前景，能连接裂缝；开操作先腐蚀再膨胀可去噪，闭操作先膨胀再腐蚀可填孔。',
    observe: '点击原图切换当前位置，或在应用示例里切换去噪、连接裂缝、填补小孔等任务，观察结构元素覆盖的邻域里有多少前景像素；再换矩形、十字或椭圆结构元素，比较同一位置的输出是否变化。',
    image: {
      src: '/assets/concept-intro/morphology-scikit.png',
      alt: '形态学操作示例',
      caption: '形态学操作用结构元素改变二值形状的局部几何关系。',
      sourceLabel: 'scikit-image morphology 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/applications/plot_morphology.html',
    },
  },
  '/concepts/histogram-template-matching': {
    title: '匹配方法比较什么',
    problem: '当要在一张大图里找出和目标相似的区域时，会遇到两种不同情况：有些目标只要颜色或灰度分布一致就能定位，有些目标则需要局部像素排列都对应。选错线索，匹配结果会要么漏掉目标、要么带回大量误检。',
    idea: '常用的处理办法分两类：模板匹配把目标窗口当作模板，在大图上逐位置滑动，用 SSD 或 SAD 比较像素差异；直方图匹配则统计目标区域和候选区域的灰度分布，用相关、卡方或巴氏距离判断分布是否接近；反向投影还可以把目标分布映射成每个像素属于目标的可能性图，再用后续约束筛选。',
    observe: '切换“模板匹配”和“直方图匹配”两个模式，拖动源图上的红框和蓝框，对比响应热力图与直方图分数：模板匹配对像素位置敏感，热力图峰值通常对应唯一位置；直方图匹配只认分布，相似区域可能给出多个高分候选。',
    image: {
      src: '/assets/concept-intro/histogram-template-matching-template.png',
      alt: '模板匹配示例',
      caption: '模板匹配通过滑动窗口寻找局部结构最相似的位置。',
      sourceLabel: 'scikit-image template matching 示例',
      sourceHref: 'https://scikit-image.org/docs/stable/auto_examples/features_detection/plot_template.html',
    },
  },
};

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function TeachingText({ text }: { text: React.ReactNode }): React.ReactElement {
  if (typeof text !== 'string') {
    return <span>{text}</span>;
  }

  const nodes: React.ReactNode[] = [];
  const regex = /<TeachingTerm\s+term="([^"]*)"\s+explanation="([^"]*)"\s*>([^<]*)<\/TeachingTerm>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [, term, explanation] = match;
    nodes.push(
      <TeachingTerm key={match.index} term={term} explanation={explanation} className="mx-1" />
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span>{nodes}</span>;
}

export function ConceptIntro({
  title,
  problem,
  idea,
  observe,
  image,
}: ConceptIntroProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const items = [
    { label: '任务', text: problem, tone: 'border-sky-200 bg-sky-50/70 text-sky-800' },
    { label: '思路', text: idea, tone: 'border-amber-200 bg-amber-50/70 text-amber-800' },
    { label: '观察', text: observe, tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-800' },
  ];

  useEffect(() => {
    if (!isPreviewOpen) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPreviewOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const trigger = previewTriggerRef.current;
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [isPreviewOpen]);

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          概念说明
        </span>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>

      <div className={`mt-4 grid min-w-0 gap-4 ${image ? 'xl:grid-cols-[minmax(14rem,0.62fr)_minmax(0,1.75fr)] xl:items-start' : ''}`}>
        {image && (
        <figure className="min-w-0 xl:max-w-[22rem]">
          <button
            ref={previewTriggerRef}
            type="button"
            className="block w-full cursor-zoom-in rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
            onClick={() => setIsPreviewOpen(true)}
            aria-label={`放大查看：${image.alt}`}
          >
            <Image
              src={resolveAssetPath(image.src)}
              alt={image.alt}
              className="aspect-[16/9] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
              loading="lazy"
              width={640}
              height={360}
            />
          </button>
          <figcaption className="mt-2 text-xs leading-5 text-slate-500">
            {image.caption}
            <span className="ml-1 text-slate-400">图源：</span>
            {image.sourceHref ? (
              <a
                href={image.sourceHref}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-sky-600 hover:text-sky-700"
              >
                {image.sourceLabel}
              </a>
            ) : (
              <span className="font-medium text-slate-600">{image.sourceLabel}</span>
            )}
          </figcaption>
        </figure>
        )}

        <div className="grid min-w-0 gap-3">
          {items.map(item => (
            <div key={item.label} className={classNames('rounded-xl border px-3 py-3', item.tone)}>
              <div className="text-[11px] font-semibold tracking-[0.12em]">{item.label}</div>
              <p className="mt-1 text-xs leading-6 text-slate-700"><TeachingText text={item.text} /></p>
            </div>
          ))}
        </div>
      </div>

      {image && isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={image.alt}
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-6xl flex-col items-center gap-3"
            onClick={event => event.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="absolute right-2 top-2 rounded-full border border-white/30 bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="关闭大图"
            >
              关闭
            </button>
            <Image
              src={resolveAssetPath(image.src)}
              alt={image.alt}
              className="max-h-[82vh] max-w-full rounded-lg bg-white object-contain shadow-2xl"
              width={1280}
              height={720}
            />
            <div className="max-w-4xl rounded-lg bg-slate-950/70 px-3 py-2 text-center text-xs leading-5 text-slate-100">
              {image.caption}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
