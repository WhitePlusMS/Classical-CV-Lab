'use client';

import React, { useEffect, useState } from 'react';

export interface ConceptIntroImage {
  src: string;
  alt: string;
  caption: string;
  sourceLabel: string;
  sourceHref?: string;
}

export interface ConceptIntroProps {
  title: string;
  problem: string;
  idea: string;
  observe: string;
  image?: ConceptIntroImage;
}

export const CONCEPT_INTRO_CONTENT: Record<string, ConceptIntroProps> = {
  '/concepts/acquisition-system': {
    title: '图像采集系统先解决什么',
    problem: '任务是把真实世界中的光学场景稳定地变成可计算的数字图像。学生需要先理解：后续算法看到的不是物体本身，而是光源、镜头、传感器和采集设备共同形成的数据结果。',
    idea: '采集系统按光源、目标、镜头、摄像机、采集设备和处理设备串联工作。每个硬件环节都会影响亮度、清晰度、畸变、噪声、帧率和数据接口，因此系统选型本身就是视觉任务的一部分。',
    observe: '重点观察硬件链路中每一环的职责：光源决定可见性，镜头决定成像几何，相机完成光电转换，处理平台决定实时计算能力。',
    image: {
      src: '/assets/concept-intro/acquisition-system-machine-vision.jpg',
      alt: '机器视觉采集处理系统结构图',
      caption: '机器视觉系统把照明、镜头相机、传送机构和图像处理软件串成完整采集链路。',
      sourceLabel: 'Wikimedia Machine Vision System',
      sourceHref: 'https://commons.wikimedia.org/wiki/File:Machine_Vision_System.jpg',
    },
  },
  '/concepts/applications-overview': {
    title: '计算机视觉课程要解决哪些任务',
    problem: '任务是先把真实行业问题翻译成视觉处理目标。学生需要看到：识别、检测、定位、测量、分拣和跟踪不是抽象名词，而是工业、交通、遥感、无人平台和医学场景中的具体输出。',
    idea: '视觉系统通常从图像或视频输入出发，经过增强、校正、分割、特征提取和模式分析，最终输出目标、位置、尺寸、类别、轨迹或状态变化，再服务于业务决策。',
    observe: '重点观察每个案例的输入、处理目标和输出结果：同一套算法能力会在不同场景中组合成不同任务链路。',
  },
  '/concepts/grayscale': {
    title: '为什么要把彩色图变成灰度图',
    problem: '任务是在不关心颜色类别时，把 RGB 三通道压缩成一个强度通道，降低后续计算复杂度。学生需要先判断当前任务依赖亮暗结构，还是依赖具体颜色。',
    idea: '灰度化把 R、G、B 按权重合成为一个数值。加权法更接近人眼对绿色、红色和蓝色亮度的不同敏感度，平均法则把三个通道等权处理。',
    observe: '重点观察同一个像素的 R/G/B 数值如何贡献到灰度值：切换通道显示和灰度化方法时，输出变化来自权重分配不同。',
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
    problem: '任务是不用逐像素看图，也能快速判断图像整体亮度、对比度和灰度分布。学生需要先理解：直方图只统计灰度出现次数，不保留空间位置。',
    idea: '灰度直方图把每个像素归入 0 到 255 的灰度级，并统计数量或概率。柱子越高，说明该灰度级出现越多；分布偏左、偏右或集中，会反映图像偏暗、偏亮或低对比。',
    observe: '重点观察当前锁定灰度级的像素数和概率：切换示例图后，直方图形状如何对应图像亮度和对比度变化。',
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
    problem: '任务是用一个小窗口在整张图上逐位置计算局部响应。学生需要先理解：滤波、锐化、边缘检测等很多算法，本质上都在重复“窗口像素和核权重相乘再求和”。',
    idea: '卷积核定义邻域中每个位置的权重。窗口滑到某个输出位置时，输入窗口与核矩阵逐项相乘并求和，得到当前输出像素；不同核对应不同视觉效果。',
    observe: '重点观察输入窗口、核矩阵、逐项乘积和求和结果四步是否一一对应：修改核类别或大小后，输出变化来自权重分布改变。',
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
    problem: '任务是改变图像中物体的位置、方向、大小或形状，同时保持像素内容尽量合理。学生需要先区分：灰度处理改像素值，几何变换改像素所在坐标。',
    idea: '平移、旋转、缩放和错切都可以写成齐次坐标矩阵。输出图像中的每个位置会反查输入坐标，再用最近邻或双线性插值取得像素值。',
    observe: '重点观察组合矩阵、原图坐标和输出结果：参数改变的是坐标映射关系，插值方法决定非整数坐标如何采样。',
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
    problem: '任务是在连续视频帧中找出发生变化的区域。学生需要先理解：静止背景在相邻帧中灰度差小，运动目标的位置变化会带来明显差异。',
    idea: '帧差法计算当前帧和前一帧的绝对差，再用阈值判断运动像素；三帧差法同时比较前后两次差异，用交集减轻拖影和噪声影响。',
    observe: '重点观察当前帧、相邻帧、差分图和运动掩膜：阈值越低越敏感但噪声更多，目标速度和帧间距会影响运动区域形状。',
    image: {
      src: '/assets/concept-intro/frame-difference-motion-triptych.jpg',
      alt: '帧差法前一帧、当前帧和运动掩膜对比',
      caption: '帧差法通过比较相邻帧，把发生变化的位置转换成运动掩膜。',
      sourceLabel: '项目帧差法三联图',
    },
  },
  '/concepts/classifier-detection-pipeline': {
    title: '检测流水线把什么交给分类器',
    problem: '任务是在整张图里找到目标，而不是只判断一张裁好的小图。学生需要先理解：检测流程要先生成候选窗口，再把每个窗口编码成特征并交给分类器判定。',
    idea: '传统检测流水线通常包含训练样本、特征提取、分类器学习、滑动窗口扫描、候选框合并和方法对比。分类器只回答“当前窗口像不像目标”，整图检测依赖窗口遍历和后处理。',
    observe: '重点观察当前阶段、窗口位置、特征值、级联判定和最终候选框：检测结果来自许多局部窗口判定的组合，而不是一次性看完整图。',
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
    problem: '任务是让偏暗、偏亮或低对比度图像中原本挤在一起的灰度层次重新分开。学生先判断原图的灰度是否集中，再理解为什么直接看图像结果不够，必须同时看灰度分布。',
    idea: '均衡化先统计灰度直方图，再用累计分布函数 CDF 建立旧灰度到新灰度的映射。灰度出现得越集中，映射后的拉伸越明显，图像的明暗层次会被重新分配。',
    observe: '重点观察原直方图、CDF 映射曲线和均衡化结果三者是否一致：灰度分布被拉开时，图像局部细节应该更容易分辨。',
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
    problem: '任务是让边缘、轮廓和纹理从模糊图像中重新凸显出来。学生需要先把“锐化”理解成增强变化剧烈的位置，而不是简单把整张图变亮或变暗。',
    idea: '锐化通常先提取高频信息或二阶差分响应，再把这些变化量叠加回原图。梯度方法强调方向变化，拉普拉斯方法强调中心像素与邻域的差异。',
    observe: '重点观察当前窗口里的边缘响应如何影响输出像素：平坦区域变化小，边缘附近响应大，过强参数会让噪声和伪影一起被放大。',
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
    problem: '任务是在图像任意位置都能取到一个完整邻域窗口。学生需要先发现：当窗口中心移动到边缘时，卷积核或邻域模板会伸出图像范围。',
    idea: '边界策略负责给越界位置补上可计算的像素值。常见做法包括补零、复制边缘、镜像反射或只计算有效区域，不同策略会改变边缘附近的输出。',
    observe: '重点观察同一个边缘像素在不同策略下的邻域矩阵：哪些位置来自原图，哪些位置由规则补齐，输出差异就来自这些补齐值。',
    image: {
      src: '/assets/lena-original.jpg',
      alt: 'Lena 图像像素矩阵示例',
      caption: '把图像看成像素矩阵后，边缘位置的邻域窗口会出现越界问题。',
      sourceLabel: '项目示例图',
    },
  },
  '/concepts/blur': {
    title: '空间域滤波的共同思想',
    problem: '任务是在保留主要结构的同时抑制噪声或细碎纹理。学生先判断噪声是局部异常，还是整片区域的随机波动，再选择合适的邻域估计方法。',
    idea: '空间域滤波用窗口覆盖中心像素，根据邻域重新估计输出值。均值和高斯使用加权平均，中值用排序去掉极端值，边窗滤波在多个候选窗口中选择更贴近边缘的一侧。',
    observe: '重点观察同一个窗口在不同滤波方法下的计算依据：权重、排序、候选边窗会直接决定中心像素被平滑还是被保边。',
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
    problem: '任务是从图像中找到物体边界、线条或亮暗突变的位置。学生需要先把边缘理解为灰度变化剧烈的地方，而不是图像中所有深色或浅色区域。',
    idea: '边缘算子通过差分、梯度幅值、二阶导数或 Canny 多阶段流程衡量局部变化。不同算子在抗噪、边缘宽度、方向敏感性上各有取舍。',
    observe: '重点观察输入窗口、Gx/Gy 或 Canny 阶段响应：灰度变化越集中，梯度或二阶响应越强，最终越可能被保留为边缘。',
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
    problem: '任务是解释一个三维点为什么会落在某个二维像素位置。学生需要先区分相机在世界中的位置、镜头成像方式和像素坐标单位。',
    idea: '外参描述世界坐标到相机坐标的位姿变换，内参描述焦距、主点和像素尺度。完整成像链把三维点依次变换、归一化，再投影到像素平面。',
    observe: '重点观察同一个三维点经过世界坐标、相机坐标、归一化平面和像素平面的每一步坐标变化，理解参数改变会影响哪一段。',
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
    problem: '任务是给相机提供一组已知真实位置的点。普通照片里的点没有准确三维坐标，无法直接用来反推出相机参数。',
    idea: '棋盘格或圆点标定板把世界坐标固定在一个平面上，角点检测得到对应的像素坐标。多组世界点到像素点的对应关系会形成求解相机参数的约束。',
    observe: '重点观察角点是否按规则排列、是否能稳定编号，以及像素点和标定板坐标之间是否形成一一对应关系。',
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
    problem: '任务是只用多张平面标定板照片估计相机内参和每张照片的外参。学生需要先理解：每一张图都提供一个平面到图像的投影约束。',
    idea: '张正友法先从平面点和像素点求单应矩阵 H，再由多张图像的 H 共同约束内参 K，最后分解出每张图的旋转和平移。',
    observe: '重点观察世界平面点、像素点、H、K、R/t 的链路：某一步误差变大，会传递到后续参数和重投影误差。',
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
    problem: '任务是把被镜头弯曲或拉偏的图像恢复到更接近真实几何的位置。学生先观察直线是否弯曲、边缘是否被拉伸，再理解畸变不是简单平移或缩放。',
    idea: '畸变模型在归一化坐标中描述径向和切向偏移。校正时根据目标像素反查原图采样位置，把弯曲的结构重新映射回规则坐标。',
    observe: '重点观察同一个校正后像素对应到原图的采样坐标：越靠近图像边缘，畸变参数对位置的影响通常越明显。',
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
    problem: '任务是把来自不同时间、视角或传感器的图像放到同一坐标系中。学生先判断两张图哪里错位，再理解为什么需要估计一个整体变换。',
    idea: '配准通过控制点、相似度或相位相关等信息估计变换参数。变换会把待配准图的像素映射到参考图坐标，使同名结构尽量重合。',
    observe: '重点观察控制点、预测点和误差向量：如果同名点对齐，叠加图会更清晰，残差也会变小。',
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
    problem: '任务是把灰度图中的目标区域和背景区域分开。学生需要先区分两个问题：阈值 T 从哪里来，以及像素和 T 比较后写成什么结果。',
    idea: '固定阈值由人工指定，OTSU 根据类间方差自动选 T，Kittler 使用梯度加权信息估计分界。输出模式再决定二值、截断或归零等写入规则。',
    observe: '重点观察直方图中的阈值线和结果图：同一个输出规则下，T 的位置移动会直接改变前景面积和边界。',
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
    problem: '任务是在视频中找出正在运动或新出现的前景目标。学生先把“当前帧”与“长期背景”分开理解，避免把背景减除看成普通两帧相减。',
    idea: '背景建模用历史帧估计每个位置的常见外观，再把当前帧与模型比较。均值、自适应、高斯和混合高斯模型分别适合不同稳定程度的场景。',
    observe: '重点观察背景图、当前帧和前景掩膜：模型更新太慢会残留旧目标，更新太快可能把真实目标吸收到背景里。',
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
    problem: '任务是在大量关键点之间快速判断哪些局部结构相似。学生先理解：如果每个描述子都是高维浮点向量，存储和匹配都会变重。',
    idea: '二进制描述子用一组像素亮度比较生成 0/1 串。两个描述子的差异可以用汉明距离快速计算，适合实时匹配和资源受限场景。',
    observe: '重点观察采样点对的位置、亮度比较结果和最终 bit 串：采样方式改变，描述子的稳定性和区分能力也会改变。',
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
    problem: '任务是根据颜色找到目标区域。学生需要先意识到 RGB 同时混合了颜色和亮度，光照变化会让同一种颜色的 R/G/B 数值一起改变。',
    idea: 'HSV 把色调、饱和度和亮度拆开，使颜色提取可以主要关注色调范围。颜色直方图再统计目标颜色在图像中的分布，用于分割、检索或匹配。',
    observe: '重点观察 RGB、HSV 和掩膜结果：当亮度变化时，HSV 的色调通道是否仍能稳定指向目标颜色。',
    image: {
      src: '/assets/color-space-histogram/hsv-example.jpg',
      alt: 'HSV 颜色空间示例',
      caption: 'HSV 将颜色和亮度拆开，更适合做颜色范围提取。',
      sourceLabel: '项目 HSV 示例图',
    },
  },
  '/concepts/lbp-gabor-texture': {
    title: '纹理特征描述什么',
    problem: '任务是识别表面粗糙度、条纹方向、重复纹理等局部模式。学生先把纹理和颜色区分开：纹理关注的是灰度在局部怎样排列和变化。',
    idea: 'LBP 比较中心像素和邻域生成局部二进制模式，适合描述微小结构；Gabor 用方向和频率滤波器响应纹理，适合观察条纹、尺度和方向。',
    observe: '重点观察同一块纹理在 LBP 编码和 Gabor 响应中的表现：一个偏局部模式统计，一个偏方向频率响应。',
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
    problem: '任务是把一个检测窗口变成分类器可以使用的固定长度向量。学生需要先理解检测器关心的是边缘方向分布，而不是单个像素灰度。',
    idea: 'HOG 先计算梯度方向和幅值，再按 cell 统计方向直方图，最后把多个 cell 组成 block 并归一化。这样可以保留轮廓信息，同时减弱局部亮度变化影响。',
    observe: '重点观察当前 cell、方向 bin 和所属 block：每个像素的梯度投票如何累积成直方图，block 归一化如何改变最终向量。',
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
    problem: '任务是把滑动窗口变成一组可被分类器判断的数字。学生先理解分类器不能直接“看懂图片”，它接收的是特征响应或统计向量。',
    idea: 'Haar 特征用黑白区域差值描述亮暗结构，积分图让矩形求和变快；LBP 向量把局部纹理编码成直方图，再串联成固定长度输入。',
    observe: '重点观察检测窗口、Haar 响应、积分图四点求和和 LBP 直方图：这些中间量就是分类器输入的来源。',
    image: {
      src: '/assets/haar-lbp-feature-vector/haar-integral-image.jpg',
      alt: 'Haar 积分图加速示例',
      caption: 'Haar 和 LBP 将窗口内容编码为分类器可使用的特征向量。',
      sourceLabel: '项目 Haar/LBP 示例图',
    },
  },
  '/concepts/keypoint-matching-pipeline': {
    title: '特征点匹配解决什么',
    problem: '任务是在两张视角、尺度或光照不同的图像中找到同一物体的对应位置。固定模板比较整块像素，遇到旋转、缩放、遮挡时很容易失效。',
    idea: '特征点方法先寻找可重复出现的局部显著位置，再为每个位置生成描述子。匹配时比较描述子的相似度，把整图对齐问题转化为局部结构对应问题。',
    observe: '重点观察检测、描述和匹配三步：稳定关键点应该能在两张图中重复出现，正确匹配线应连接相同局部结构。',
    image: {
      src: '/assets/keypoint-matching-pipeline/feature-mapping.jpg',
      alt: '特征映射示意图',
      caption: '图像被映射为局部特征向量集后，匹配问题变成描述子相似度比较。',
      sourceLabel: '项目特征点匹配示例图',
    },
  },
  '/concepts/sift-surf-scale-features': {
    title: '尺度特征为什么重要',
    problem: '任务是在目标变大、变小或局部旋转后仍能找到同一类关键点。学生需要先理解：同一个角点在不同距离下会覆盖不同大小的像素区域。',
    idea: 'SIFT/SURF 构建尺度空间，在多个模糊程度和图像尺度中寻找稳定极值点，再分配主方向并生成描述子，从而增强尺度和旋转鲁棒性。',
    observe: '重点观察金字塔、DoG/Hessian 响应、主方向和描述子：关键点是否跨尺度稳定，是后续匹配可靠的前提。',
    image: {
      src: '/assets/sift-surf/sift-surf-scale-comparison.jpg',
      alt: 'SIFT 和 SURF 尺度特征比较',
      caption: '尺度空间让关键点在远近变化时仍能被稳定检测。',
      sourceLabel: '项目 SIFT/SURF 示例图',
    },
  },
  '/concepts/perspective-transform': {
    title: '透视变换校正什么',
    problem: '任务是把斜拍的平面目标校正成正视图。学生先观察：同一个矩形平面在相机视角下可能变成任意凸四边形。',
    idea: '透视变换用四对对应点求 3×3 齐次矩阵。矩阵不仅能表示平移、旋转和缩放，还能表示近大远小带来的投影形变。',
    observe: '重点观察四个控制点和校正结果：点序必须保持合理，拖动任一点都会改变整张平面的投影关系。',
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
    problem: '任务是在二值图中去除噪点、连接断裂、填补小孔或调整目标轮廓。学生需要先把图像看成前景集合和背景集合，而不是灰度连续图。',
    idea: '结构元素像一个小探针，在图像上滑动并按命中规则改写中心像素。腐蚀收缩前景，膨胀扩张前景，开闭操作组合两者解决具体形状问题。',
    observe: '重点观察结构元素覆盖当前邻域时的命中关系：输出像素是否变成前景，取决于当前操作和结构元素形状。',
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
    problem: '任务是在图像中找到和目标相似的区域。学生先区分两类线索：整体颜色或灰度分布相似，以及局部像素结构相似。',
    idea: '直方图匹配比较分布，不关心空间位置；模板匹配滑动窗口比较局部结构；反向投影把目标分布转成每个像素属于目标的可能性。',
    observe: '重点观察响应图和最终位置：分布相似可能带来多个候选，模板响应峰值则对应局部结构最相似的位置。',
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

export function ConceptIntro({
  title,
  problem,
  idea,
  observe,
  image,
}: ConceptIntroProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const items = [
    { label: '任务', text: problem, tone: 'border-sky-200 bg-sky-50/70 text-sky-800' },
    { label: '思路', text: idea, tone: 'border-amber-200 bg-amber-50/70 text-amber-800' },
    { label: '观察', text: observe, tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-800' },
  ];

  useEffect(() => {
    if (!isPreviewOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPreviewOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
            type="button"
            className="block w-full cursor-zoom-in rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
            onDoubleClick={() => setIsPreviewOpen(true)}
            aria-label={`双击放大查看：${image.alt}`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="aspect-[16/9] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
              loading="lazy"
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
              <p className="mt-1 text-xs leading-6 text-slate-700">{item.text}</p>
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
              type="button"
              className="absolute right-2 top-2 rounded-full border border-white/30 bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="关闭大图"
            >
              关闭
            </button>
            <img
              src={image.src}
              alt={image.alt}
              className="max-h-[82vh] max-w-full rounded-lg bg-white object-contain shadow-2xl"
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
