// Canvas Element Types

export interface BaseElement {
  id: string;
  type: 'image' | 'video' | 'gif';
  // Position and transform
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // Rotation angle in degrees
  // Layer
  zIndex: number;
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface CropInfo {
  x: number; // Crop start X (relative to original)
  y: number; // Crop start Y
  width: number; // Crop width
  height: number; // Crop height
}

export interface ImageElement extends BaseElement {
  type: 'image';
  // Image data
  dataUrl: string; // base64 or blob URL
  originalWidth: number;
  originalHeight: number;
  // Crop info
  crop?: CropInfo;
}

export interface VideoElement extends BaseElement {
  type: 'video';
  dataUrl: string;
  duration: number; // Video duration in seconds
  originalWidth: number;
  originalHeight: number;
  // Video thumbnail
  thumbnailUrl?: string;
}

export interface GifConfig {
  startTime: number; // Start time in seconds
  endTime: number; // End time in seconds
  fps: number; // Frame rate
  width: number; // Output width
  height: number; // Output height
}

export interface GifElement extends BaseElement {
  type: 'gif';
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  // Source video info
  sourceVideoId?: string;
  // GIF config
  gifConfig: GifConfig;
}

export type CanvasElement = ImageElement | VideoElement | GifElement;

// Transform state for element manipulation
export interface TransformState {
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  isCropping: boolean;
  resizeHandle?: ResizeHandle;
  startPoint: { x: number; y: number };
  startTransform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
}

export type ResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';
