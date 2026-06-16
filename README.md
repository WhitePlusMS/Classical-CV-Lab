[English](README.md) | [中文](README.zh.md)

# Classical CV Lab · 视界实验室

> An interactive learning workbench for classical computer vision. It decomposes core CV algorithms into observable, parameter-tunable, step-by-step experiments — making abstract math and algorithmic pipelines直观可见.

🌐 **Live Demo:** [https://whiteplusms.github.io/Classical-CV-Lab/](https://whiteplusms.github.io/Classical-CV-Lab/)

*© 2026 WhitePlusMS*

## Overview

31 interactive concept pages across four teaching chapters:

### Ch.2: Image Preprocessing & Geometric Correction

| Module | Concepts |
|--------|----------|
| **Part 1 · Image Preprocessing** | Grayscale, Pixel Matrix & Neighborhood, Histogram, Histogram Equalization, Sharpening, Convolution, Image Filtering, Edge Detection, Morphology |
| **Part 2 · Camera Calibration** | Camera Model & Parameters, Calibration Pattern & Corners, Zhang Calibration & Estimation |
| **Part 3 · Image Correction** | Distortion Correction, Geometric Transform, Perspective Transform, Image Registration |

### Ch.3: Object Detection

| Module | Concepts |
|--------|----------|
| **Part 1 · Simple Background Methods** | Threshold & Auto Threshold, Frame Difference & Motion, Background Modeling & Subtraction |
| **Part 2 · Feature Point Methods** | Keypoint Matching Pipeline, SIFT/SURF Scale Features, ORB/BRIEF/BRISK Binary Features |
| **Part 3 · Feature-Based Methods** | Color Space & Histogram, LBP & Gabor Texture, Histogram & Template Matching |
| **Part 4 · Machine Learning Methods** | HOG Feature, Haar/LBP Feature Vector |
| **Part 5 · Detection Pipeline** | Classifier & Detection Pipeline |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| 3D Visualization | Three.js |
| Algorithms | Pure TypeScript, zero OpenCV dependency |

## Architecture Highlights

- **Pure frontend algorithms** — All CV algorithms (convolution, morphology, SIFT, HOG, etc.) implemented in TypeScript; no backend or OpenCV runtime required.
- **Interactive parameter tuning** — Every concept page has a control panel (sliders, dropdowns, kernel editor) driving live recomputation.
- **Step-level visualization** — Complex pipelines (SIFT, Canny, OTSU) are broken into step-by-step flows with intermediate results displayed at each stage.
- **Teaching component system** — Unified components: ConceptIntro (Task → Approach → Observation), TeachingFlow (pipeline stepper), TeachingMath (formula cards), TeachingPixel (pixel-level inspection), and more.
- **Pixel-level navigation** — Arrow keys + click to inspect any pixel's intensity, gradient, neighborhood, and other details.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. The homepage organizes concepts by chapter and module — click any card to enter its interactive learning page.

## Project Structure

```
src/
  app/
    concepts/<name>/page.tsx   # 31 individual concept pages
  components/
    ConceptLayout.tsx          # Unified page layout (params | image | details)
    ImageCanvas.tsx            # Grayscale/RGB image rendering
    ParameterPanel.tsx         # Parameter panel (slider, select, kernel editor)
    CodeViewer.tsx             # TypeScript algorithm source display
    FormulaWithExplanation.tsx # Math formula rendering (MathML)
    teaching/                  # Teaching components: TeachingFlow, TeachingMath, TeachingCard, etc.
  lib/
    algorithms/                # Pure TypeScript CV algorithms (no external dependencies)
    utils/                     # Image processing utilities + sample image generators
```

## License

All Rights Reserved. This project is a proprietary educational product — see [LICENSE](LICENSE) for details.
