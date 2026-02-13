import type { ResizeHandle } from '@/types';

/**
 * Calculate the angle from a center point to a target point
 */
export function getAngle(
  centerX: number,
  centerY: number,
  targetX: number,
  targetY: number
): number {
  const dx = targetX - centerX;
  const dy = targetY - centerY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Calculate distance between two points
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Rotate a point around a center
 */
export function rotatePoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number
): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const nx = cos * (x - centerX) - sin * (y - centerY) + centerX;
  const ny = sin * (x - centerX) + cos * (y - centerY) + centerY;

  return { x: nx, y: ny };
}

/**
 * Get the cursor style for a resize handle based on element rotation
 */
export function getResizeCursor(handle: ResizeHandle, rotation: number): string {
  const baseAngles: Record<ResizeHandle, number> = {
    'top-left': -135,
    'top': -90,
    'top-right': -45,
    'right': 0,
    'bottom-right': 45,
    'bottom': 90,
    'bottom-left': 135,
    'left': 180,
  };

  const angle = (baseAngles[handle] + rotation + 360) % 360;
  const normalizedAngle = Math.round(angle / 45) * 45;

  const cursors: Record<number, string> = {
    0: 'ew-resize',
    45: 'nwse-resize',
    90: 'ns-resize',
    135: 'nesw-resize',
    180: 'ew-resize',
    225: 'nwse-resize',
    270: 'ns-resize',
    315: 'nesw-resize',
    360: 'ew-resize',
  };

  return cursors[normalizedAngle % 360] || 'move';
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
export function maintainAspectRatio(
  originalWidth: number,
  originalHeight: number,
  newWidth: number,
  newHeight: number,
  handle: ResizeHandle
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  if (handle === 'left' || handle === 'right') {
    return { width: newWidth, height: newWidth / aspectRatio };
  } else if (handle === 'top' || handle === 'bottom') {
    return { width: newHeight * aspectRatio, height: newHeight };
  } else {
    // Corner handles - use the larger change
    const widthRatio = newWidth / originalWidth;
    const heightRatio = newHeight / originalHeight;

    if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
      return { width: newWidth, height: newWidth / aspectRatio };
    } else {
      return { width: newHeight * aspectRatio, height: newHeight };
    }
  }
}

/**
 * Get the center point of an element
 */
export function getElementCenter(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
}

/**
 * Get the bounding box of a rotated element
 */
export function getRotatedBoundingBox(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const center = getElementCenter(x, y, width, height);
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  const rotatedCorners = corners.map((corner) =>
    rotatePoint(corner.x, corner.y, center.x, center.y, rotation)
  );

  const xs = rotatedCorners.map((c) => c.x);
  const ys = rotatedCorners.map((c) => c.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * Check if a point is inside a rotated rectangle
 */
export function isPointInRotatedRect(
  pointX: number,
  pointY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
  rotation: number
): boolean {
  const center = getElementCenter(rectX, rectY, rectWidth, rectHeight);

  // Rotate the point in the opposite direction to align with the rectangle
  const rotatedPoint = rotatePoint(pointX, pointY, center.x, center.y, -rotation);

  return (
    rotatedPoint.x >= rectX &&
    rotatedPoint.x <= rectX + rectWidth &&
    rotatedPoint.y >= rectY &&
    rotatedPoint.y <= rectY + rectHeight
  );
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize an angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}
