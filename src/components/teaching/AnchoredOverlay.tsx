'use client';

import React, { useEffect, useState } from 'react';

type OverlayTone = 'red' | 'amber' | 'emerald';

interface OverlayPoint {
  x: number;
  y: number;
}

interface ElementAnchor {
  kind: 'element';
  selector: string;
}

interface RegionAnchor {
  kind: 'region';
  selector: string;
  x: number;
  y: number;
  size: number;
  imageWidth: number;
  imageHeight: number;
}

interface PixelAnchor {
  kind: 'pixel';
  selector: string;
  x: number;
  y: number;
  imageWidth: number;
  imageHeight: number;
}

export type OverlayAnchor = ElementAnchor | RegionAnchor | PixelAnchor;

export interface AnchoredOverlayPath {
  id: string;
  tone: OverlayTone;
  from: OverlayAnchor;
  to: OverlayAnchor;
}

interface ResolvedOverlayPath {
  id: string;
  tone: OverlayTone;
  from: OverlayPoint;
  to: OverlayPoint;
}

interface AnchoredOverlayProps {
  paths: AnchoredOverlayPath[];
}

function getElementRect(selector: string): DOMRect | null {
  const element = document.querySelector(selector);
  return element ? element.getBoundingClientRect() : null;
}

function resolveAnchor(anchor: OverlayAnchor): OverlayPoint | null {
  const rect = getElementRect(anchor.selector);
  if (!rect) return null;

  if (anchor.kind === 'element') {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  if (anchor.imageWidth === 0 || anchor.imageHeight === 0) return null;

  const centerX = anchor.kind === 'pixel' ? anchor.x + 0.5 : anchor.x + anchor.size / 2;
  const centerY = anchor.kind === 'pixel' ? anchor.y + 0.5 : anchor.y + anchor.size / 2;

  return {
    x: rect.left + (centerX / anchor.imageWidth) * rect.width,
    y: rect.top + (centerY / anchor.imageHeight) * rect.height,
  };
}

export function AnchoredOverlay({ paths }: AnchoredOverlayProps) {
  const [resolvedPaths, setResolvedPaths] = useState<ResolvedOverlayPath[]>([]);

  useEffect(() => {
    const updatePaths = () => {
      const nextPaths = paths.flatMap(path => {
        const from = resolveAnchor(path.from);
        const to = resolveAnchor(path.to);
        if (!from || !to) return [];
        return [{ id: path.id, tone: path.tone, from, to }];
      });

      setResolvedPaths(nextPaths);
    };

    const frame = requestAnimationFrame(updatePaths);
    window.addEventListener('resize', updatePaths);
    window.addEventListener('scroll', updatePaths, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePaths);
      window.removeEventListener('scroll', updatePaths);
    };
  }, [paths]);

  if (resolvedPaths.length === 0) return null;

  const strokeClass: Record<OverlayTone, string> = {
    red: 'text-red-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
  };

  return (
    <svg className="conv-visual-overlay" aria-hidden>
      <defs>
        <filter id="teaching-overlay-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="rgb(15 23 42)" floodOpacity="0.16" />
        </filter>
      </defs>
      {resolvedPaths.map(path => {
        const controlY = Math.min(path.to.y - 48, path.from.y + 150);
        const d = `M ${path.from.x} ${path.from.y} C ${path.from.x} ${controlY}, ${path.to.x} ${controlY}, ${path.to.x} ${path.to.y}`;

        return (
          <g key={path.id} className={strokeClass[path.tone]} filter="url(#teaching-overlay-glow)">
            <path
              className="conv-overlay-path"
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={path.from.x} cy={path.from.y} r="5" fill="white" stroke="currentColor" strokeWidth="3" />
            <path
              d={`M ${path.to.x - 7} ${path.to.y - 10} L ${path.to.x} ${path.to.y} L ${path.to.x + 7} ${path.to.y - 10}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}
