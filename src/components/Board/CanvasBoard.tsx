import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useBoardStore } from '@/stores';
import type { CanvasElement, TransformState, ResizeHandle } from '@/types';
import { isPointInRotatedRect, getAngle, clamp, rotatePoint, getElementCenter } from '@/utils';

interface CanvasBoardProps {
  children?: React.ReactNode;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const HANDLE_SIZE = 10;
const ROTATION_HANDLE_OFFSET = 30;

export const CanvasBoard: React.FC<CanvasBoardProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    viewport,
    setViewport,
    elements,
    selectedIds,
    selectElement,
    clearSelection,
    updateElement,
    pushHistory,
  } = useBoardStore();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [transformState, setTransformState] = useState<TransformState | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - viewport.x) / viewport.zoom,
        y: (screenY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Handle wheel for zooming
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom with ctrl/cmd key
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = clamp(viewport.zoom * delta, MIN_ZOOM, MAX_ZOOM);

        // Zoom towards mouse position
        const zoomRatio = newZoom / viewport.zoom;
        const newX = mouseX - (mouseX - viewport.x) * zoomRatio;
        const newY = mouseY - (mouseY - viewport.y) * zoomRatio;

        setViewport({ zoom: newZoom, x: newX, y: newY });
      } else {
        // Pan with scroll
        setViewport({
          x: viewport.x - e.deltaX,
          y: viewport.y - e.deltaY,
        });
      }
    },
    [viewport, setViewport]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Prevent default to avoid text selection during drag
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const canvasPos = screenToCanvas(mouseX, mouseY);

      // Check if clicking on a resize handle or rotation handle (for selected element)
      if (selectedIds.length === 1) {
        const element = elements.find((el) => el.id === selectedIds[0]);
        if (element) {
          const handle = getHandleAtPoint(element, mouseX, mouseY, viewport);
          if (handle) {
            e.stopPropagation();
            setActiveElementId(element.id);
            if (handle === 'rotate') {
              setTransformState({
                isRotating: true,
                isDragging: false,
                isResizing: false,
                isCropping: false,
                startPoint: { x: mouseX, y: mouseY },
                startTransform: {
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                  rotation: element.rotation,
                },
              });
            } else {
              setTransformState({
                isResizing: true,
                isDragging: false,
                isRotating: false,
                isCropping: false,
                resizeHandle: handle as ResizeHandle,
                startPoint: { x: mouseX, y: mouseY },
                startTransform: {
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                  rotation: element.rotation,
                },
              });
            }
            pushHistory();
            return;
          }
        }
      }

      // Check if clicking on an element
      const clickedElement = findElementAtPoint(elements, canvasPos.x, canvasPos.y);

      if (clickedElement) {
        selectElement(clickedElement.id, e.shiftKey);
        setActiveElementId(clickedElement.id);
        setTransformState({
          isDragging: true,
          isResizing: false,
          isRotating: false,
          isCropping: false,
          startPoint: { x: mouseX, y: mouseY },
          startTransform: {
            x: clickedElement.x,
            y: clickedElement.y,
            width: clickedElement.width,
            height: clickedElement.height,
            rotation: clickedElement.rotation,
          },
        });
        pushHistory();
      } else {
        // Start panning or clear selection
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
          setIsPanning(true);
          setPanStart({ x: mouseX - viewport.x, y: mouseY - viewport.y });
        } else {
          clearSelection();
        }
      }
    },
    [elements, selectedIds, viewport, screenToCanvas, selectElement, clearSelection, pushHistory]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isPanning) {
        setViewport({
          x: mouseX - panStart.x,
          y: mouseY - panStart.y,
        });
        return;
      }

      if (transformState && activeElementId) {
        const element = elements.find((el) => el.id === activeElementId);
        if (!element) return;

        const dx = (mouseX - transformState.startPoint.x) / viewport.zoom;
        const dy = (mouseY - transformState.startPoint.y) / viewport.zoom;

        if (transformState.isDragging) {
          updateElement(activeElementId, {
            x: transformState.startTransform.x + dx,
            y: transformState.startTransform.y + dy,
          });
        } else if (transformState.isResizing && transformState.resizeHandle) {
          const newDimensions = calculateResize(
            transformState.startTransform,
            transformState.resizeHandle,
            dx,
            dy,
            e.shiftKey
          );
          updateElement(activeElementId, newDimensions);
        } else if (transformState.isRotating) {
          const centerX =
            (transformState.startTransform.x + transformState.startTransform.width / 2) *
              viewport.zoom +
            viewport.x;
          const centerY =
            (transformState.startTransform.y + transformState.startTransform.height / 2) *
              viewport.zoom +
            viewport.y;
          const startAngle = getAngle(
            centerX,
            centerY,
            transformState.startPoint.x,
            transformState.startPoint.y
          );
          const currentAngle = getAngle(centerX, centerY, mouseX, mouseY);
          let newRotation = transformState.startTransform.rotation + (currentAngle - startAngle);

          // Snap to 15-degree increments when holding shift
          if (e.shiftKey) {
            newRotation = Math.round(newRotation / 15) * 15;
          }

          updateElement(activeElementId, { rotation: newRotation });
        }
      }
    },
    [isPanning, panStart, transformState, activeElementId, viewport, elements, setViewport, updateElement]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setTransformState(null);
    setActiveElementId(null);
  }, []);

  // Add wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Add global mouse up listener to handle mouse up outside container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      setTransformState(null);
      setActiveElementId(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Sort elements by z-index for rendering
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  // Get cursor style based on current state
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (transformState?.isDragging) return 'move';
    if (transformState?.isResizing) return 'nwse-resize';
    if (transformState?.isRotating) return 'grab';
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#f8f9fa] cursor-default select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: getCursor(),
      }}
    >
      {/* Canvas elements */}
      <div
        className="absolute origin-top-left pointer-events-none"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {sortedElements.map((element) => (
          <ElementRenderer
            key={element.id}
            element={element}
            isSelected={selectedIds.includes(element.id)}
            zoom={viewport.zoom}
          />
        ))}
      </div>
    </div>
  );
};

// Element renderer component
interface ElementRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  zoom: number;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, zoom }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    transformOrigin: 'center center',
  };

  return (
    <div style={style} className="group">
      {/* Element content */}
      {element.type === 'image' && (
        <img
          src={element.dataUrl}
          alt=""
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
      )}
      {element.type === 'video' && (
        <video
          src={element.dataUrl}
          className="w-full h-full object-cover pointer-events-none select-none"
          muted
          loop
        />
      )}
      {element.type === 'gif' && (
        <img
          src={element.dataUrl}
          alt=""
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
      )}

      {/* Selection border and handles */}
      {isSelected && (
        <>
          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

          {/* Resize handles */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((handle) => {
            const positions: Record<string, React.CSSProperties> = {
              'top-left': { top: -HANDLE_SIZE / 2 / zoom, left: -HANDLE_SIZE / 2 / zoom },
              'top-right': { top: -HANDLE_SIZE / 2 / zoom, right: -HANDLE_SIZE / 2 / zoom },
              'bottom-left': { bottom: -HANDLE_SIZE / 2 / zoom, left: -HANDLE_SIZE / 2 / zoom },
              'bottom-right': { bottom: -HANDLE_SIZE / 2 / zoom, right: -HANDLE_SIZE / 2 / zoom },
            };
            return (
              <div
                key={handle}
                className="absolute bg-white border-2 border-blue-500 rounded-sm pointer-events-none"
                style={{
                  ...positions[handle],
                  width: HANDLE_SIZE / zoom,
                  height: HANDLE_SIZE / zoom,
                }}
              />
            );
          })}

          {/* Rotation handle */}
          <div
            className="absolute left-1/2 bg-white border-2 border-blue-500 rounded-full pointer-events-none"
            style={{
              top: -ROTATION_HANDLE_OFFSET / zoom,
              width: HANDLE_SIZE / zoom,
              height: HANDLE_SIZE / zoom,
              transform: 'translateX(-50%)',
            }}
          />
          {/* Line connecting to rotation handle */}
          <div
            className="absolute left-1/2 bg-blue-500 pointer-events-none"
            style={{
              top: -ROTATION_HANDLE_OFFSET / zoom + HANDLE_SIZE / zoom / 2,
              width: 1 / zoom,
              height: (ROTATION_HANDLE_OFFSET - HANDLE_SIZE / 2) / zoom,
              transform: 'translateX(-50%)',
            }}
          />
        </>
      )}
    </div>
  );
};

// Helper functions
function findElementAtPoint(
  elements: CanvasElement[],
  x: number,
  y: number
): CanvasElement | null {
  // Check from top to bottom (highest z-index first)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  for (const element of sorted) {
    if (
      isPointInRotatedRect(
        x,
        y,
        element.x,
        element.y,
        element.width,
        element.height,
        element.rotation
      )
    ) {
      return element;
    }
  }

  return null;
}

function getHandleAtPoint(
  element: CanvasElement,
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; zoom: number }
): ResizeHandle | 'rotate' | null {
  const { zoom } = viewport;
  
  // Calculate element center in screen coordinates
  const elementCenterCanvas = getElementCenter(element.x, element.y, element.width, element.height);
  const elementCenterScreen = {
    x: elementCenterCanvas.x * zoom + viewport.x,
    y: elementCenterCanvas.y * zoom + viewport.y,
  };

  // Define handle positions relative to element center (before rotation)
  const halfWidth = (element.width / 2) * zoom;
  const halfHeight = (element.height / 2) * zoom;

  const handles: { name: ResizeHandle | 'rotate'; offsetX: number; offsetY: number }[] = [
    { name: 'top-left', offsetX: -halfWidth, offsetY: -halfHeight },
    { name: 'top-right', offsetX: halfWidth, offsetY: -halfHeight },
    { name: 'bottom-left', offsetX: -halfWidth, offsetY: halfHeight },
    { name: 'bottom-right', offsetX: halfWidth, offsetY: halfHeight },
    { name: 'rotate', offsetX: 0, offsetY: -halfHeight - ROTATION_HANDLE_OFFSET },
  ];

  const handleHitSize = HANDLE_SIZE * 1.5; // Slightly larger hit area

  for (const handle of handles) {
    // Rotate handle position around center
    const rotatedPos = rotatePoint(
      elementCenterScreen.x + handle.offsetX,
      elementCenterScreen.y + handle.offsetY,
      elementCenterScreen.x,
      elementCenterScreen.y,
      element.rotation
    );

    const dx = screenX - rotatedPos.x;
    const dy = screenY - rotatedPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= handleHitSize) {
      return handle.name;
    }
  }

  return null;
}

function calculateResize(
  startTransform: TransformState['startTransform'],
  handle: ResizeHandle,
  dx: number,
  dy: number,
  maintainRatio: boolean
): Partial<CanvasElement> {
  let { x, y, width, height } = startTransform;
  const aspectRatio = startTransform.width / startTransform.height;

  switch (handle) {
    case 'top-left':
      x += dx;
      y += dy;
      width -= dx;
      height -= dy;
      break;
    case 'top-right':
      y += dy;
      width += dx;
      height -= dy;
      break;
    case 'bottom-left':
      x += dx;
      width -= dx;
      height += dy;
      break;
    case 'bottom-right':
      width += dx;
      height += dy;
      break;
    case 'top':
      y += dy;
      height -= dy;
      break;
    case 'bottom':
      height += dy;
      break;
    case 'left':
      x += dx;
      width -= dx;
      break;
    case 'right':
      width += dx;
      break;
  }

  // Maintain aspect ratio if shift is held
  if (maintainRatio) {
    if (handle.includes('left') || handle.includes('right')) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }
  }

  // Ensure minimum size
  width = Math.max(width, 20);
  height = Math.max(height, 20);

  return { x, y, width, height };
}

export default CanvasBoard;
