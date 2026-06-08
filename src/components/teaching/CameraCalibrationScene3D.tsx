'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  DEFAULT_BOARD_SPEC,
  DEFAULT_CAMERA_INTRINSICS,
  createRotationMatrix,
  type CalibrationPoint2D,
  projectWorldPoint,
  type CalibrationExtrinsics,
  type CalibrationIntrinsics,
  type CalibrationPoint3D,
} from '@/lib/algorithms/cameraCalibration';

export type CameraCalibrationSceneMode = 'camera-model' | 'corner-detection' | 'parameter-estimation';
export type CameraCalibrationSceneFocus = 'chain' | 'intrinsics' | 'extrinsics' | 'depth';

export interface CameraCalibrationScenePoint {
  index: number;
  row: number;
  col: number;
  world: CalibrationPoint3D;
}

export interface CameraCalibrationSceneViewPose {
  id: string;
  name: string;
  extrinsics: CalibrationExtrinsics;
}

interface CameraCalibrationScene3DProps {
  extrinsics: CalibrationExtrinsics;
  selectedPoint: CameraCalibrationScenePoint;
  intrinsics?: CalibrationIntrinsics;
  mode?: CameraCalibrationSceneMode;
  focusMode?: CameraCalibrationSceneFocus;
  viewPoses?: CameraCalibrationSceneViewPose[];
  activeViewId?: string;
  equationCount?: number;
  enoughEquations?: boolean;
  reprojectionError?: number;
  observedPixel?: CalibrationPoint2D;
  imageSize?: { width: number; height: number };
  title: string;
  subtitle?: string;
  badges?: string[];
  heightClassName?: string;
}

function disposeObject(object: THREE.Object3D) {
  if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
    object.geometry.dispose();
    const material = object.material;
    if (Array.isArray(material)) {
      material.forEach(item => item.dispose());
    } else {
      material.dispose();
    }
  }
}

function toSceneVector(point: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(point.x, -point.z, -point.y);
}

function createBoardVertex(x: number, y: number) {
  return toSceneVector({ x, y, z: 0 });
}

function createCheckerboardGroup(opacity: number, selected?: { row: number; col: number }) {
  const boardGroup = new THREE.Group();
  const squareRows = DEFAULT_BOARD_SPEC.rows + 1;
  const squareCols = DEFAULT_BOARD_SPEC.cols + 1;

  for (let row = 0; row < squareRows; row++) {
    for (let col = 0; col < squareCols; col++) {
      const isSelectedCornerSquare =
        selected && row >= selected.row && row <= selected.row + 1 && col >= selected.col && col <= selected.col + 1;
      const vertices = [
        createBoardVertex(col, row),
        createBoardVertex(col + 1, row),
        createBoardVertex(col + 1, row + 1),
        createBoardVertex(col, row + 1),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();

      const square = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: isSelectedCornerSquare ? 0xfca5a5 : (row + col) % 2 === 0 ? 0x1f2937 : 0xf8fafc,
          opacity,
          transparent: opacity < 1,
          roughness: 0.72,
          side: THREE.DoubleSide,
        })
      );
      boardGroup.add(square);
    }
  }

  return boardGroup;
}

function createLine(points: THREE.Vector3[], color: number, opacity = 1) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  );
}

function resolveImageSize(intrinsics: CalibrationIntrinsics, imageSize?: { width: number; height: number }) {
  return imageSize ?? {
    width: Math.max(1, intrinsics.u0 * 2),
    height: Math.max(1, intrinsics.v0 * 2),
  };
}

function normalizedFromPixel(pixel: CalibrationPoint2D, intrinsics: CalibrationIntrinsics) {
  const y = (pixel.y - intrinsics.v0) / intrinsics.beta;
  const x = (pixel.x - intrinsics.u0 - intrinsics.gamma * y) / intrinsics.alpha;
  return { x, y };
}

function transposeMultiplyVector(matrix: number[][], vector: { x: number; y: number; z: number }): CalibrationPoint3D {
  return {
    x: matrix[0][0] * vector.x + matrix[1][0] * vector.y + matrix[2][0] * vector.z,
    y: matrix[0][1] * vector.x + matrix[1][1] * vector.y + matrix[2][1] * vector.z,
    z: matrix[0][2] * vector.x + matrix[1][2] * vector.y + matrix[2][2] * vector.z,
  };
}

function subtractPoints(a: CalibrationPoint3D, b: CalibrationPoint3D): CalibrationPoint3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function addPoints(a: CalibrationPoint3D, b: CalibrationPoint3D): CalibrationPoint3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scalePoint(point: CalibrationPoint3D, scale: number): CalibrationPoint3D {
  return { x: point.x * scale, y: point.y * scale, z: point.z * scale };
}

function computeCameraCenterWorld(extrinsics: CalibrationExtrinsics): CalibrationPoint3D {
  const rotation = createRotationMatrix(extrinsics);
  const translation = { x: extrinsics.tx, y: extrinsics.ty, z: extrinsics.tz };
  return scalePoint(transposeMultiplyVector(rotation, translation), -1);
}

function cameraVectorToWorld(vector: CalibrationPoint3D, extrinsics: CalibrationExtrinsics): CalibrationPoint3D {
  return transposeMultiplyVector(createRotationMatrix(extrinsics), vector);
}

function pixelToWorldPlanePoint(
  pixel: CalibrationPoint2D,
  intrinsics: CalibrationIntrinsics,
  extrinsics: CalibrationExtrinsics,
  cameraCenter: CalibrationPoint3D,
  imagePlaneDistance: number
) {
  const normalized = normalizedFromPixel(pixel, intrinsics);
  const worldDirection = cameraVectorToWorld(
    { x: normalized.x * imagePlaneDistance, y: normalized.y * imagePlaneDistance, z: imagePlaneDistance },
    extrinsics
  );
  return addPoints(cameraCenter, worldDirection);
}

function intersectCameraRayWithBoardPlane(
  cameraCenter: CalibrationPoint3D,
  rayPoint: CalibrationPoint3D
): THREE.Vector3 | null {
  const direction = subtractPoints(rayPoint, cameraCenter);
  if (Math.abs(direction.z) < 1e-6) return null;

  const scale = -cameraCenter.z / direction.z;
  if (scale <= 0) return null;

  return toSceneVector(addPoints(cameraCenter, scalePoint(direction, scale)));
}

function createFrameLines(points: THREE.Vector3[], color: number, opacity = 1) {
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      points[0],
      points[1],
      points[1],
      points[2],
      points[2],
      points[3],
      points[3],
      points[0],
    ]),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  );
}

function pixelToPlanePoint(
  pixel: CalibrationPoint2D,
  intrinsics: CalibrationIntrinsics,
  extrinsics: CalibrationExtrinsics,
  cameraCenter: CalibrationPoint3D,
  imagePlaneDistance: number
) {
  return toSceneVector(pixelToWorldPlanePoint(pixel, intrinsics, extrinsics, cameraCenter, imagePlaneDistance));
}

function createImagePlaneCorners(
  intrinsics: CalibrationIntrinsics,
  extrinsics: CalibrationExtrinsics,
  cameraCenter: CalibrationPoint3D,
  resolvedImageSize: { width: number; height: number },
  imagePlaneDistance: number
) {
  return [
    pixelToPlanePoint({ x: 0, y: 0 }, intrinsics, extrinsics, cameraCenter, imagePlaneDistance),
    pixelToPlanePoint({ x: resolvedImageSize.width, y: 0 }, intrinsics, extrinsics, cameraCenter, imagePlaneDistance),
    pixelToPlanePoint(
      { x: resolvedImageSize.width, y: resolvedImageSize.height },
      intrinsics,
      extrinsics,
      cameraCenter,
      imagePlaneDistance
    ),
    pixelToPlanePoint({ x: 0, y: resolvedImageSize.height }, intrinsics, extrinsics, cameraCenter, imagePlaneDistance),
  ];
}

function createImagePlaneGeometry(corners: THREE.Vector3[]) {
  const geometry = new THREE.BufferGeometry().setFromPoints(corners);
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function focusText(mode: CameraCalibrationSceneMode, focusMode: CameraCalibrationSceneFocus) {
  if (mode === 'corner-detection') return '多姿态标定板提供多组角点对应';
  if (mode === 'parameter-estimation') return '多张图的单应性约束共同求解参数';

  const text = {
    chain: '完整链路：外参 -> 透视投影 -> 内参',
    intrinsics: '高亮内参：焦距、skew 与主点改变像素映射',
    extrinsics: '高亮外参：旋转和平移改变标定板姿态',
    depth: '高亮深度：Zc 改变透视缩放关系',
  };
  return text[focusMode];
}

export function CameraCalibrationScene3D({
  extrinsics,
  selectedPoint,
  intrinsics = DEFAULT_CAMERA_INTRINSICS,
  mode = 'camera-model',
  focusMode = 'chain',
  viewPoses = [],
  activeViewId,
  equationCount,
  enoughEquations,
  reprojectionError,
  observedPixel,
  imageSize,
  title,
  subtitle,
  badges = [],
  heightClassName = 'h-[480px]',
}: CameraCalibrationScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf8fafc, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf8fafc, 16, 34);

    const cameraCenter = computeCameraCenterWorld(extrinsics);
    const cameraScenePoint = toSceneVector(cameraCenter);
    const opticalAxisScenePoint = toSceneVector(
      addPoints(cameraCenter, cameraVectorToWorld({ x: 0, y: 0, z: 1 }, extrinsics))
    );
    const opticalAxisDirection = opticalAxisScenePoint.clone().sub(cameraScenePoint).normalize();
    const boardCenterScenePoint = toSceneVector({
      x: DEFAULT_BOARD_SPEC.cols / 2,
      y: DEFAULT_BOARD_SPEC.rows / 2,
      z: 0,
    });
    const sceneUp = new THREE.Vector3(0, 1, 0);
    let observerSideDirection = new THREE.Vector3().crossVectors(opticalAxisDirection, sceneUp).normalize();
    if (observerSideDirection.lengthSq() < 1e-6) {
      observerSideDirection = new THREE.Vector3(1, 0, 0);
    }
    const observerStart = cameraScenePoint
      .clone()
      .sub(opticalAxisDirection.clone().multiplyScalar(8))
      .add(observerSideDirection.multiplyScalar(7))
      .add(sceneUp.clone().multiplyScalar(4));
    const observerTarget = cameraScenePoint.clone().add(opticalAxisDirection.clone().multiplyScalar(5));

    const observerCamera = new THREE.PerspectiveCamera(48, 1, 0.1, 90);
    observerCamera.position.copy(observerStart);
    observerCamera.up.set(0, 1, 0);

    const controls = new OrbitControls(observerCamera, renderer.domElement);
    controls.target.copy(observerTarget.lerp(boardCenterScenePoint, 0.18));
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 5;
    controls.maxDistance = 42;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 6, 5);
    scene.add(keyLight);

    const floorGrid = new THREE.GridHelper(15, 15, 0x94a3b8, 0xdbe3eb);
    floorGrid.position.set(DEFAULT_BOARD_SPEC.cols / 2, -0.02, -DEFAULT_BOARD_SPEC.rows / 2);
    scene.add(floorGrid);

    const cameraGroup = new THREE.Group();
    const cameraBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.5, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 })
    );
    cameraBody.position.set(0, 0, 0.16);
    cameraGroup.add(cameraBody);

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.15 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, -0.15);
    cameraGroup.add(lens);
    cameraGroup.position.copy(cameraScenePoint);
    cameraGroup.lookAt(cameraScenePoint.clone().add(opticalAxisDirection));
    scene.add(cameraGroup);

    const imagePlaneDistance = 2.2;
    const resolvedImageSize = resolveImageSize(intrinsics, imageSize);
    const imagePlaneWorldCorners = [
      pixelToWorldPlanePoint({ x: 0, y: 0 }, intrinsics, extrinsics, cameraCenter, imagePlaneDistance),
      pixelToWorldPlanePoint({ x: resolvedImageSize.width, y: 0 }, intrinsics, extrinsics, cameraCenter, imagePlaneDistance),
      pixelToWorldPlanePoint(
        { x: resolvedImageSize.width, y: resolvedImageSize.height },
        intrinsics,
        extrinsics,
        cameraCenter,
        imagePlaneDistance
      ),
      pixelToWorldPlanePoint({ x: 0, y: resolvedImageSize.height }, intrinsics, extrinsics, cameraCenter, imagePlaneDistance),
    ];
    const imagePlaneCorners = createImagePlaneCorners(
      intrinsics,
      extrinsics,
      cameraCenter,
      resolvedImageSize,
      imagePlaneDistance
    );
    const imagePlaneColor = focusMode === 'intrinsics' ? 0xd1fae5 : mode === 'parameter-estimation' ? 0xe0e7ff : 0xdbeafe;
    const imagePlaneOpacity = focusMode === 'extrinsics' ? 0.22 : 0.38;
    const imagePlane = new THREE.Mesh(
      createImagePlaneGeometry(imagePlaneCorners),
      new THREE.MeshBasicMaterial({
        color: imagePlaneColor,
        transparent: true,
        opacity: imagePlaneOpacity,
        side: THREE.DoubleSide,
      })
    );
    scene.add(imagePlane);

    const imageFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(createImagePlaneGeometry(imagePlaneCorners)),
      new THREE.LineBasicMaterial({ color: focusMode === 'intrinsics' ? 0x059669 : 0x2563eb })
    );
    scene.add(imageFrame);

    const boardOpacity = focusMode === 'intrinsics' ? 0.7 : 1;
    scene.add(createCheckerboardGroup(boardOpacity, { row: selectedPoint.row, col: selectedPoint.col }));

    const projection = projectWorldPoint(selectedPoint.world, intrinsics, extrinsics);
    const boardPoint = toSceneVector(selectedPoint.world);
    const imagePoint = pixelToPlanePoint(
      projection.pixel,
      intrinsics,
      extrinsics,
      cameraCenter,
      imagePlaneDistance
    );
    const cameraToBoard = subtractPoints(selectedPoint.world, cameraCenter);
    const cameraToBoardSceneVector = toSceneVector(cameraToBoard);
    const cameraToBoardDistance = cameraToBoardSceneVector.length();
    const cameraToPlaneDistance = imagePoint.clone().sub(cameraScenePoint).length();
    const rayOpacity = cameraToPlaneDistance <= cameraToBoardDistance + 1e-6 ? 1 : 0.55;

    const selectedDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x7f1d1d, emissiveIntensity: 0.25 })
    );
    selectedDot.position.copy(boardPoint);
    scene.add(selectedDot);

    const imageDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x059669, emissive: 0x064e3b, emissiveIntensity: 0.3 })
    );
    imageDot.position.copy(imagePoint);
    scene.add(imageDot);

    scene.add(createLine([cameraScenePoint, imagePoint, boardPoint], 0xf59e0b, focusMode === 'intrinsics' ? 0.72 : rayOpacity));

    if (focusMode === 'depth') {
      scene.add(createLine([cameraScenePoint, boardPoint], 0xdc2626, 0.85));
      const depthTick = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, Math.max(0.2, cameraToBoardDistance)),
        new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.38 })
      );
      depthTick.position.copy(cameraScenePoint.clone().lerp(boardPoint, 0.5));
      depthTick.lookAt(boardPoint);
      scene.add(depthTick);
    }

    if (observedPixel) {
      const observedPoint = pixelToPlanePoint(
        observedPixel,
        intrinsics,
        extrinsics,
        cameraCenter,
        imagePlaneDistance
      );
      const observedDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x4c1d95, emissiveIntensity: 0.28 })
      );
      observedDot.position.copy(observedPoint);
      scene.add(observedDot);
      scene.add(createLine([imagePoint, observedPoint], 0x7c3aed, 0.9));
    }

    const frustumMaterial = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.5 });
    imagePlaneCorners.forEach(corner => {
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([cameraScenePoint, corner]), frustumMaterial));
    });
    const boardFootprintCorners = imagePlaneWorldCorners
      .map(corner => intersectCameraRayWithBoardPlane(cameraCenter, corner))
      .filter((corner): corner is THREE.Vector3 => Boolean(corner));
    if (boardFootprintCorners.length === 4) {
      scene.add(createFrameLines(boardFootprintCorners, 0x10b981, 0.72));
      boardFootprintCorners.forEach(corner => {
        scene.add(createLine([cameraScenePoint, corner], 0x10b981, 0.18));
      });
    }

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height, false);
      observerCamera.aspect = width / height;
      observerCamera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, observerCamera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse(disposeObject);
    };
  }, [
    activeViewId,
    enoughEquations,
    equationCount,
    extrinsics,
    focusMode,
    imageSize,
    intrinsics,
    mode,
    observedPixel,
    reprojectionError,
    selectedPoint,
    viewPoses,
  ]);

  const focusBadge = focusText(mode, focusMode);
  const statusBadges = [
    mode === 'corner-detection' && viewPoses.length > 0 ? `${viewPoses.length} 张姿态图` : null,
    mode === 'parameter-estimation' && typeof equationCount === 'number' ? `${equationCount} 条约束` : null,
    mode === 'parameter-estimation' && typeof reprojectionError === 'number' ? `误差 ${reprojectionError.toFixed(3)} px` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#f8fafc_100%)] shadow-sm ${heightClassName}`}
    >
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 max-w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur">
        <div className="font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-slate-600">{subtitle}</div>}
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
            {focusBadge}
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
            拖动旋转
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
            滚轮缩放
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 hidden gap-2 text-xs lg:grid">
        {badges.map(badge => (
          <div key={badge} className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 font-medium text-slate-700 shadow-sm backdrop-blur">
            {badge}
          </div>
        ))}
        {statusBadges.map(badge => (
          <div key={badge} className="rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1 font-medium text-amber-800 shadow-sm backdrop-blur">
            {badge}
          </div>
        ))}
        {mode === 'parameter-estimation' && typeof enoughEquations === 'boolean' && (
          <div
            className={`rounded-full border px-3 py-1 font-medium shadow-sm backdrop-blur ${
              enoughEquations ? 'border-emerald-200 bg-emerald-50/95 text-emerald-700' : 'border-red-200 bg-red-50/95 text-red-700'
            }`}
          >
            {enoughEquations ? '约束足够' : '约束不足'}
          </div>
        )}
      </div>
      {viewPoses.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs text-slate-700 shadow-sm backdrop-blur">
          <div className="font-semibold text-slate-800">{mode === 'parameter-estimation' ? '参与求解的姿态图' : '已启用的标定姿态'}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {viewPoses.map((view, index) => {
              const active = view.id === activeViewId;
              return (
                <span
                  key={view.id}
                  className={`rounded-full border px-2.5 py-1 font-medium ${
                    active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  {index + 1}
                </span>
              );
            })}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-4 right-4 grid gap-2 text-xs">
        <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-medium text-blue-700">蓝框：成像平面</div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">绿框：视场落在棋盘平面</div>
        <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700">红点：棋盘世界点</div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">绿点：图像投影点</div>
        {mode === 'parameter-estimation' && (
          <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-700">紫点：检测角点</div>
        )}
      </div>
    </div>
  );
}
