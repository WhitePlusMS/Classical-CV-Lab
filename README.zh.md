[English](README.md) | [中文](README.zh.md)

# Classical CV Lab · 视界实验室

> 面向计算机视觉课程的交互式学习工作台。将传统计算机视觉的核心算法拆解为可观察、可调参、可推演的实验模块，让抽象的数学公式和算法流程变得直观可见。

## 项目概览

31 个交互式概念页面，覆盖四大教学章节：

### 第二章：图像预处理与几何校正

| 模块 | 概念 |
|------|------|
| **Part 1 · 图像预处理** | 灰度化 · 像素矩阵与邻域窗口 · 直方图 · 直方图均衡化 · 图像锐化 · 卷积 · 图像滤波 · 边缘检测 · 形态学操作 |
| **Part 2 · 摄像机标定** | 成像模型与内外参数 · 标定板与角点检测 · 张正友标定与参数求解 |
| **Part 3 · 图像校正** | 畸变校正 · 几何变换 · 透视变换 · 图像配准 |

### 第三章：目标检测

| 模块 | 概念 |
|------|------|
| **Part 1 · 简单背景方法** | 阈值分割与自动阈值 · 帧差法与运动检测 · 背景建模与减除 |
| **Part 2 · 特征点方法** | 特征点检测与匹配流程 · SIFT/SURF 尺度特征 · ORB/BRIEF/BRISK 二进制特征 |
| **Part 3 · 特征明显方法** | 颜色空间与颜色直方图 · LBP 与 Gabor 纹理特征 · 直方图匹配与模板匹配 |
| **Part 4 · 机器学习方法** | HOG 特征 · Haar/LBP 特征向量 |
| **Part 5 · 检测流程** | 分类器与检测流程 |

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| 3D 可视化 | Three.js |
| 算法 | 纯 TypeScript 实现，零 OpenCV 依赖 |

## 架构特色

- **纯前端算法实现** — 所有 CV 算法（卷积、形态学、SIFT、HOG 等）均以纯 TypeScript 实现，无需后端服务或 OpenCV 运行时
- **交互式参数调优** — 每个概念页配备参数面板，滑动条 / 下拉选择 / 核编辑器即时驱动算法重新计算
- **步骤级可视化** — 复杂算法（如 SIFT、Canny、OTSU）拆解为多步骤流程，每步展示中间计算结果
- **教学组件体系** — ConceptIntro（任务→思路→观察）、TeachingFlow（步骤流水线）、TeachingMath（公式卡片）、TeachingPixel（像素级数值展示）等统一教学组件
- **像素级导航** — 方向键 + 点击可定位任意像素，查看灰度值 / 梯度 / 邻域等细节

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`，首页按章节与模块组织概念入口，点击卡片进入交互式学习页面。

## 项目结构

```
src/
  app/
    concepts/<name>/page.tsx   # 31 个独立概念页面
  components/
    ConceptLayout.tsx          # 概念页统一布局（左参数 + 中图像 + 下详情）
    ImageCanvas.tsx            # 灰度 / RGB 图像渲染
    ParameterPanel.tsx         # 参数面板（Slider / Select / KernelEditor）
    CodeViewer.tsx             # TypeScript 算法源码展示
    FormulaWithExplanation.tsx # 数学公式（MathML）
    teaching/                  # 教学组件集：TeachingFlow, TeachingMath, TeachingCard 等
  lib/
    algorithms/                # 纯 TypeScript CV 算法（无外部依赖）
    utils/                     # 图像处理工具函数 + 示例图生成
```

## 许可证

All Rights Reserved. 本项目为专有教育产品，保留所有权利。详见 [LICENSE](LICENSE)。
