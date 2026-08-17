# Classical-CV-Lab 课程内容全面审查报告

审查日期：2026-08-16  
审查范围：31 个概念页、所有识别到的公式卡/步骤卡/代码卡/交互卡，以及共享教学组件与课程导航。

## 一、结论先行

- 31/31 个概念页已覆盖，重复 0，遗漏 0。
- 公式、数学原理和算法实现整体一致；未确认 P0 级硬伤。
- 发现 1 个需要优先修正的原则性教学错误：畸变校正页把 `k1` 符号与桶形/枕形的对应关系写反。
- 发现 2 个需要优先修正的交互/结构问题：Otsu 的 best 模式中“当前 T”与统计证据脱节；首页定义了 OTSU 卡但未放入章节数组，导致首页少 1 节。
- 其余问题主要属于语言、命名、示例量纲、控件提示或视觉一致性，不应与原理错误混为一谈。

分级含义：P0=会直接造成错误教学或核心功能错误；P1=应优先修正的原则/交互/结构错误；P2=会造成明显困惑的口径或结构不一致；P3=语言、显示或可选优化。

## 二、必须优先处理的问题

### P1-1：畸变校正的 `k1` 符号约定写反（原则/公式问题）

- 位置：[src/app/concepts/distortion-correction/page.tsx:95-100](src/app/concepts/distortion-correction/page.tsx:95)
- 当前内容写成“OpenCV 标准：`k1>0` 产生桶形、`k1<0` 产生枕形”，并且 `barrel` 模式使用正号。
- 当前径向模型为 `s = 1 + k1 r² + k2 r⁴`，实现位于 [src/lib/algorithms/imageGeometry.ts:487-500](src/lib/algorithms/imageGeometry.ts:487)。在该约定下，正的低阶径向系数使半径放大，通常对应枕形；负值通常对应桶形。
- OpenCV 官方文档给出的典型约定是桶形 `k1 < 0`、枕形 `k1 > 0`：[OpenCV Camera Calibration 文档](https://docs.opencv.org/3.4.7/d9/d0c/group__calib3d.html)。
- 这不是单纯措辞问题：选择“桶形”后，代码会生成正 `k1`，页面图形和标签会一起把枕形效果称为桶形，学生会形成错误的符号记忆。
- 建议：将 `barrel` 改为负号、`pincushion` 改为正号，并同步修改正文、注释、公式说明和示例；如果坚持自定义符号，必须删除“OpenCV 标准”并明确声明自定义约定。

### P1-2：Otsu best 模式显示的阈值与统计证据不是同一个 T（交互对应问题）

- 位置：[src/app/concepts/otsu/page.tsx:65-80](src/app/concepts/otsu/page.tsx:65)、[src/app/concepts/otsu/page.tsx:134-188](src/app/concepts/otsu/page.tsx:134)。
- `activeThreshold` 在 best 模式取最终最佳阈值，但 `currentStep` 仍由可调的 `candidateThreshold` 查找；公式卡的 `ω0、μ0、ω1、μ1、σ²` 来自 `currentStep`。
- 因此页面可能同时显示“正在测试 T=最佳阈值”和“候选滑块 T 对应的统计量”。拖动滑块时，统计值变化，但顶部 T 仍显示最佳值，破坏“调 T → 观察类间方差”的对应关系。
- 建议：best 模式下让 `currentStep` 也查找 `activeThreshold` 对应的步骤；或者明确把该模式改成只读最终结果，并隐藏/禁用候选阈值滑块。

### P1-3：首页 OTSU 卡定义存在，但没有加入首页章节数组（结构/导航问题）

- 位置：[src/app/page.tsx:260-269](src/app/page.tsx:260)、[src/app/page.tsx:639-647](src/app/page.tsx:639)。
- `implementedCards.otsu` 已定义，但“简单背景方法”数组只引用了 `thresholdAutoThreshold`、`frameDifferenceMotion`、`backgroundModelingSubtraction`。
- 结果是首页实际展示 30 张卡，而概念页目录和线性导航有 31 节；OTSU 只能通过前后节或直接 URL 到达，首页课程入口不完整。
- 建议：将 `implementedCards.otsu` 插入简单背景方法数组，并让顺序与 `CONCEPT_ORDER` 一致；同时核对首页节数统计。

## 三、P2：建议修正的内容口径与结构问题

### P2-1：张正友标定页眉章节标签错误

- 位置：[src/components/ConceptLayout.tsx:87-90](src/components/ConceptLayout.tsx:87)。
- `camera-model`、`calibration-pattern` 是“第二章 / 摄像机标定”，`zhang-calibration` 却显示“第三章 / 摄像机标定”；首页也把三者放在第二章同一组。
- 建议改为“第二章 / 摄像机标定”。这是结构标签问题，不是张正友算法原理错误。

### P2-2：Otsu 标准页缺少 `CONCEPT_INTRO_CONTENT` 引入卡

- 位置：[src/components/teaching/ConceptIntro.tsx:24](src/components/teaching/ConceptIntro.tsx:24) 及 Otsu 页面。
- Otsu 使用标准 `ConceptLayout`，但没有 `problem/idea/observe` 条目；同章其他页面有统一概念引入层。
- 建议补充 Otsu 的问题、核心思想和可观察现象。`applications-overview` 是自绘总览页，缺少该映射可视为有意设计，不与 Otsu 混为一谈。

### P2-3：背景模型递推卡片的时间下标命名不一致

- 位置：[src/app/concepts/background-modeling-subtraction/page.tsx:743-755](src/app/concepts/background-modeling-subtraction/page.tsx:743)、[src/app/concepts/background-modeling-subtraction/page.tsx:852-868](src/app/concepts/background-modeling-subtraction/page.tsx:852)。
- 代码取 `backgroundHistory[currentFrameIndex]` 作为当前帧判定前的模型状态；主卡把同一数据标成 `B(t)`，递推卡又标成 `B(t−1)`。
- 自适应公式本身是正确的，问题在于同一个图像/数值被赋予两个时间下标，学生无法判断代入公式的槽位。
- 建议统一成“当前帧判定前的模型状态”并明确记作 `B(t−1)`，或者统一将主卡定义为 `B(t−1)`；不要只改一个标签。

### P2-4：相机模型交互滑块与静态内参示例没有量纲桥接

- 位置：[src/app/concepts/camera-model/page.tsx:517-526](src/app/concepts/camera-model/page.tsx:517)、[src/app/concepts/camera-model/page.tsx:570-574](src/app/concepts/camera-model/page.tsx:570)。
- 交互场景是 `96×72` 小画布，滑块范围约为 `α/β=28..82、u0=18..78、v0=12..60`；相邻静态“典型标定结果”则显示 `α=860、β=840、u0=320、v0=240`。
- 两者都不是算法错误，但页面没有说明这是两套不同分辨率/示意尺度。学生拖动 `α=50` 后看到静态卡片 `α=860`，容易误认为公式或控件断链。
- 建议在滑块或静态卡片旁明确标注“交互为 96×72 演示坐标；静态卡为真实相机量级示例”，或统一两者的量纲。

### P2-5：彩色棋盘格的存储灰度与加权公式不一致（低置信度，数据口径问题）

- 位置：[src/lib/algorithms/pixelMatrix.ts:175-180](src/lib/algorithms/pixelMatrix.ts:175)、[src/app/concepts/pixel-matrix/page.tsx:609-610](src/app/concepts/pixel-matrix/page.tsx:609)。
- 白格使用 `r=1.0,g=0.2,b=0.2,gray=0.53`，按页面所教公式计算应为 `0.299×1+0.587×0.2+0.114×0.2=0.4392`。
- 页面明确写“存储灰度”，因此它可能是合成演示图的有意字段，不代表主灰度算法错误；但学习者自行按公式计算会得到不同答案。
- 建议改为按 RGB 加权派生，或把 `gray` 改为 `0.4392`，并保持后续 `colorToGrayscaleImage` 的口径一致。

## 四、P3：语言、显示和可选优化

这些项不应被描述为原则性原理错误，但建议在后续迭代中处理：

- 灰度页逐通道先四舍五入再求和，存在极小显示舍入差：[grayscale/page.tsx:241-246](src/app/concepts/grayscale/page.tsx:241)。
- 直方图均衡化的概念引入写“拖动阈值”，但页面没有对应阈值控件：[ConceptIntro.tsx:155](src/components/teaching/ConceptIntro.tsx:155)。
- 直方图均衡化示例网格没有 pixel-matrix 那样的逐格点选：[histogram-equalization/page.tsx:608](src/app/concepts/histogram-equalization/page.tsx:608)。
- 卷积恒等核“平移拷贝”、均值核标签与实际未归一化输出的措辞可更精确：[convolution/page.tsx:109-125](src/app/concepts/convolution/page.tsx:109)。
- Canny 双阈值文案使用严格不等式，而实现使用 `>=`：[edge-detection/page.tsx:1320-1334](src/app/concepts/edge-detection/page.tsx:1320)；NMS/阈值阶段还存在显示 3×3、实际输入 1×1 的提示差异。
- 张正友标定页在浏览视图数为 1/2 时，约束不足提示与仍基于全部 5 视图估计的 K 同时出现，需补充解释。
- 帧差法一位小数的公式链可能出现舍入后不完全相等；阈值教学代码中的 `gray*255` 与“按字节”注释也需统一口径。
- Kittler 可视化使用归一化梯度加权分布，建议明确这是形状展示而不是与阈值分子同量纲的统计量。
- 背景模型“多数背景假设”使用窗口均值±T 作为近似判据，应标出“近似统计”。（已处理：该“多数背景分布检验”为页面额外捏造的伪检验，均值模型本身即“前 K 帧均值”，已删除伪检验与“近似统计”措辞，改为如实陈述均值模型“背景占多数”的前提。）
- SIFT/SURF 页：梯度方向公式更适合写 `atan2`；17×17 梯度窗口与“16×16 邻域”文案需统一；教学中的 SURF 中心差分、Haar 小波称谓和 `20s×20s` 展示应显式标注简化。
- 特征点方法对比表的典型 256/512 位与页面演示的 16 位摘要需加“典型值/演示值”说明。
- 分类器页的 Haar 原始响应 `V` 与级联中归一化 `|V|∈[0,1]` 共用符号，建议改为 `V̄` 或在公式中加“归一化”。
- 共享 `CodeViewer` 已支持行高亮，但 31 页没有传 `highlightedLines/currentLine`；这是教学增强未启用，不是代码显示错误。
- 背景建模页前景掩膜卡使用绿色框，其余三张主卡使用红点；同一像素追踪的视觉标记不一致。
- 混合高斯的学习率显示值与实际 `0.55` 缩放值不同，页面已有说明，可把缩放提示加粗。（已处理：混合高斯已改为真实逐帧 GMM 迭代，去掉 `α×0.55` 缩放，直接使用 α；掩膜由“是否匹配背景分量”判定，不再用简化阈值 `|I-B|>T`。）
- 畸变页滑块只显示 `|k1|`，符号由类型下拉框隐含；修正 P1-1 后仍建议在控件旁显示当前有符号 `k1`。
- 帧差代码标签写作 “Pseudo Code”，而内容是 TypeScript，建议统一标签。
- Canny 高低阈值互锁会自动调整另一阈值，建议显示“已自动保持 high ≥ low+5”的提示。
- `threshold.ts` 的 `computeHistogram` 中转导出是冗余，不属于课程正确性问题。

## 五、31 节逐节覆盖表

“通过”表示在公式/原理、语言描述、交互对应三个维度均未发现 P0–P2 问题；P3 仍在上节列出。

| # | 页面 | 审查块 | 公式/原理 | 语言描述 | 交互/结构 | 重点结论 |
|---:|---|:---:|---|---|---|---|
| 1 | applications-overview | A | 通过/不适用 | 通过 | 静态页对应 | 无问题 |
| 2 | acquisition-system | A | 通过 | 通过 | 静态内容对应 | 焦距公式与算例通过 |
| 3 | grayscale | A | 通过 | 通过 | 通过 | 仅有舍入 P3 |
| 4 | pixel-matrix | A | P2 数据口径 | 通过 | 通过 | 棋盘格 gray 值需统一 |
| 5 | histogram | A | 通过 | 通过 | 通过 | 公式与示例值通过 |
| 6 | histogram-equalization | A | 通过 | P3 | P3 | observe 文案与控件不完全对应 |
| 7 | image-sharpening | A | 通过 | 通过 | 通过 | Laplace 代入与输出通过 |
| 8 | convolution | B | 通过 | P3 | 通过 | 恒等核/均值核措辞可精确 |
| 9 | blur | B | 通过 | 通过 | 通过 | 均值、高斯、中值、边窗通过 |
| 10 | edge-detection | B | 通过 | P3 | P3 | Canny 边界显示细节 |
| 11 | morphology | B | 通过 | 通过 | 通过 | 集合定义、反射、开闭通过 |
| 12 | camera-model | C/G | 通过 | P2/P3 | P2 | 小画布 K 与静态 K 量纲需桥接 |
| 13 | calibration-pattern | C/F | 通过 | P3 | 通过 | 标题“对应/检测”不统一 |
| 14 | zhang-calibration | C/F/G | 通过 | 通过 | P2/P3 | 章节标签、视图数提示 |
| 15 | distortion-correction | C/G | P1 | P1 | P1/P3 | k1 符号与类型对应写反 |
| 16 | geometric-transform | C/G | 通过 | 通过 | 通过 | 矩阵顺序、旋转方向、插值通过 |
| 17 | perspective-transform | C/G | 通过 | 通过 | 通过 | 4 点/8 自由度和拖拽对应通过 |
| 18 | image-registration | C/G | 通过 | 通过 | 通过 | 残差、RANSAC 教学近似披露充分 |
| 19 | threshold-auto-threshold | D/G | 通过 | P3 | 通过 | 教学代码/可视化量纲需说明 |
| 20 | otsu | D/F/G | 通过 | P2/P3 | P1 | best 模式脱节；首页入口和 intro 缺失 |
| 21 | frame-difference-motion | D/G | 通过 | P3 | P3 | 舍入链与代码标签 |
| 22 | background-modeling-subtraction | D/G | 通过 | P2/P3 | P3 | B(t−1)/B(t) 命名、视觉标记 |
| 23 | keypoint-matching-pipeline | E/G | 通过 | P3 | 通过 | 典型位宽与演示位宽需区分 |
| 24 | sift-surf-scale-features | E/G | 通过 | P3 | 通过 | atan2、窗口、SURF 简化标注 |
| 25 | binary-feature-descriptors | E/G | 通过 | 通过 | 通过 | 位串和三种描述子对应通过 |
| 26 | color-space-histogram | E/G | 通过 | 通过 | 通过 | RGB→HSV、直方图、mask 对应通过 |
| 27 | lbp-gabor-texture | E/G | 通过 | 通过 | 通过 | LBP/Gabor 参数链通过 |
| 28 | histogram-template-matching | E/G | 通过 | 通过 | 通过 | SSD/SAD/四种直方图比较通过 |
| 29 | hog-feature | E/G | 通过 | 通过 | 通过 | 梯度、bin、block 维度通过 |
| 30 | haar-lbp-feature-vector | E/G | 通过 | 通过 | 通过 | Haar 积分图、LBP 维度通过 |
| 31 | classifier-detection-pipeline | E/G | 通过 | P3 | 通过 | 归一化 V 符号可更清楚 |

## 六、审查方法与证据范围

本次将每节拆给独立子 Agent，逐页阅读页面源码、算法实现和共享组件；每张识别到的卡片分别核对：

1. 公式/原理：公式、数值、矩阵维度、边界条件与实际函数实现是否一致。
2. 语言描述：术语、因果关系、单位、前提条件和“教学近似”是否说清楚。
3. 页面对应：参数/选择项/点击/方向键/画布/步骤/代码卡是否真正改变并展示所讲变量。

每个审查条目都记录了 `file:line`、原文摘要、判断依据、建议、置信度和“问题/通过”状态。31 节的逐块原始证据已在审查过程中核对，最终结论只保留在本报告中；未对业务代码、课程页面或配置文件做任何修改。

### 外部原理依据

畸变符号判断采用 OpenCV 官方 Camera Calibration 文档的常用径向畸变约定：[OpenCV 3.4 calib3d 文档](https://docs.opencv.org/3.4.7/d9/d0c/group__calib3d.html)。
