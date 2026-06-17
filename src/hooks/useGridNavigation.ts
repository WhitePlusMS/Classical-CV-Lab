import { useCallback } from 'react';

export type GridDirection = 'up' | 'down' | 'left' | 'right';

export interface GridPoint {
  x: number;
  y: number;
}

interface GridBounds {
  width: number;
  height: number;
}

interface UseGridNavigationOptions {
  current: GridPoint | null;
  bounds: GridBounds;
  onMove: (point: GridPoint) => void;
  disabled?: boolean;
}

export function moveGridPoint(
  current: GridPoint,
  bounds: GridBounds,
  direction: GridDirection
): GridPoint {
  switch (direction) {
    case 'up':
      return { x: current.x, y: Math.max(0, current.y - 1) };
    case 'down':
      return { x: current.x, y: Math.min(bounds.height - 1, current.y + 1) };
    case 'left':
      return { x: Math.max(0, current.x - 1), y: current.y };
    case 'right':
      return { x: Math.min(bounds.width - 1, current.x + 1), y: current.y };
  }
}

export function useGridNavigation({
  current,
  bounds,
  onMove,
  disabled = false,
}: UseGridNavigationOptions) {
  return useCallback(
    (direction: GridDirection) => {
      if (disabled || !current || bounds.width <= 0 || bounds.height <= 0) return;
      onMove(moveGridPoint(current, bounds, direction));
    },
    [bounds, current, disabled, onMove]
  );
}
