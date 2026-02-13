// Board State Types
import type { CanvasElement } from './elements';

export interface Viewport {
  x: number; // Canvas offset X
  y: number; // Canvas offset Y
  zoom: number; // Zoom level (0.1 - 5)
}

export interface HistoryState {
  past: CanvasElement[][];
  future: CanvasElement[][];
}

export interface BoardState {
  // Canvas viewport
  viewport: Viewport;
  // Elements collection
  elements: CanvasElement[];
  // Selected state
  selectedIds: string[];
  // History for undo/redo
  history: HistoryState;
}

// Tool types
export type ToolType = 'select' | 'pan' | 'crop';

// UI State
export interface UIState {
  activeTool: ToolType;
  isPanelOpen: boolean;
  isVideoToGifOpen: boolean;
  currentVideoId: string | null;
}
