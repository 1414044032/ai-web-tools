import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasElement,
  Viewport,
  HistoryState,
  ImageElement,
  VideoElement,
  GifElement,
} from '@/types';

// Find an empty position on the canvas that doesn't overlap with existing elements
function findEmptyPosition(
  elements: CanvasElement[],
  width: number,
  height: number,
  viewport: Viewport,
  referenceElement?: CanvasElement
): { x: number; y: number } {
  const GAP = 20; // Gap between elements

  // If there's a reference element, try to place next to it
  if (referenceElement) {
    const rightX = referenceElement.x + referenceElement.width + GAP;
    const rightY = referenceElement.y;

    // Check if this position is empty
    const hasCollision = elements.some((el) => {
      if (el.id === referenceElement.id) return false;
      return !(
        rightX + width < el.x ||
        rightX > el.x + el.width ||
        rightY + height < el.y ||
        rightY > el.y + el.height
      );
    });

    if (!hasCollision) {
      return { x: rightX, y: rightY };
    }
  }

  // Find the rightmost element
  let maxRightX = -Infinity;
  let rightmostElement: CanvasElement | null = null;

  for (const el of elements) {
    const rightEdge = el.x + el.width;
    if (rightEdge > maxRightX) {
      maxRightX = rightEdge;
      rightmostElement = el;
    }
  }

  // If no elements exist, place in center
  if (!rightmostElement) {
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    return {
      x: (canvasWidth / 2 - width / 2 - viewport.x) / viewport.zoom,
      y: (canvasHeight / 2 - height / 2 - viewport.y) / viewport.zoom,
    };
  }

  // Place to the right of the rightmost element
  return {
    x: maxRightX + GAP,
    y: rightmostElement.y,
  };
}

interface BoardStore {
  // Viewport
  viewport: Viewport;
  setViewport: (viewport: Partial<Viewport>) => void;
  resetViewport: () => void;

  // Elements
  elements: CanvasElement[];
  setElements: (elements: CanvasElement[]) => void;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElements: (ids: string[]) => void;

  // Selection
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  selectElement: (id: string, multi?: boolean) => void;
  clearSelection: () => void;

  // History
  history: HistoryState;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Clipboard
  clipboard: CanvasElement[];
  copyElements: () => void;
  pasteElements: () => void;

  // Helper methods
  addImage: (dataUrl: string, width: number, height: number, positionOffset?: { x: number; y: number }, referenceElement?: CanvasElement) => ImageElement;
  addVideo: (dataUrl: string, width: number, height: number, duration: number) => void;
  addGif: (dataUrl: string, width: number, height: number, config: GifElement['gifConfig']) => void;
  getSelectedElements: () => CanvasElement[];
  getElementByIndex: (id: string) => number;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
}

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

const DEFAULT_HISTORY: HistoryState = {
  past: [],
  future: [],
};

const MAX_HISTORY = 50;

export const useBoardStore = create<BoardStore>((set, get) => ({
  // Viewport
  viewport: DEFAULT_VIEWPORT,
  setViewport: (viewportUpdate) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewportUpdate },
    })),
  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

  // Elements
  elements: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) =>
    set((state) => {
      get().pushHistory();
      return { elements: [...state.elements, element] };
    }),
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates, updatedAt: Date.now() } as typeof el) : el
      ),
    })),
  deleteElements: (ids) =>
    set((state) => {
      get().pushHistory();
      return {
        elements: state.elements.filter((el) => !ids.includes(el.id)),
        selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
      };
    }),

  // Selection
  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  selectElement: (id, multi = false) =>
    set((state) => ({
      selectedIds: multi
        ? state.selectedIds.includes(id)
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id]
        : [id],
    })),
  clearSelection: () => set({ selectedIds: [] }),

  // History
  history: DEFAULT_HISTORY,
  pushHistory: () =>
    set((state) => ({
      history: {
        past: [...state.history.past.slice(-MAX_HISTORY + 1), state.elements],
        future: [],
      },
    })),
  undo: () =>
    set((state) => {
      if (state.history.past.length === 0) return state;
      const newPast = [...state.history.past];
      const previous = newPast.pop()!;
      return {
        elements: previous,
        history: {
          past: newPast,
          future: [state.elements, ...state.history.future],
        },
      };
    }),
  redo: () =>
    set((state) => {
      if (state.history.future.length === 0) return state;
      const newFuture = [...state.history.future];
      const next = newFuture.shift()!;
      return {
        elements: next,
        history: {
          past: [...state.history.past, state.elements],
          future: newFuture,
        },
      };
    }),
  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  // Clipboard
  clipboard: [],
  copyElements: () => {
    const { elements, selectedIds } = get();
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    set({ clipboard: selected });
  },
  pasteElements: () => {
    const { clipboard, viewport, elements } = get();
    if (clipboard.length === 0) return;

    get().pushHistory();
    const newElements = clipboard.map((el) => ({
      ...el,
      id: uuidv4(),
      x: el.x + 20 - viewport.x,
      y: el.y + 20 - viewport.y,
      zIndex: elements.length + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    set((state) => ({
      elements: [...state.elements, ...newElements],
      selectedIds: newElements.map((el) => el.id),
    }));
  },

  // Helper methods
  addImage: (dataUrl, width, height, positionOffset, referenceElement) => {
    const { elements, viewport } = get();
    const maxZIndex = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) : 0;

    // Calculate position to center in viewport
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    // Scale down if image is too large
    let displayWidth = width;
    let displayHeight = height;
    const maxSize = Math.min(canvasWidth, canvasHeight) * 0.7;

    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      displayWidth = width * scale;
      displayHeight = height * scale;
    }

    // Calculate position
    let x: number;
    let y: number;

    if (positionOffset) {
      // Apply position offset if provided (for batch upload)
      x = (canvasWidth / 2 - displayWidth / 2 - viewport.x) / viewport.zoom + positionOffset.x;
      y = (canvasHeight / 2 - displayHeight / 2 - viewport.y) / viewport.zoom + positionOffset.y;
    } else if (referenceElement) {
      // Find empty position relative to reference element
      const pos = findEmptyPosition(elements, displayWidth, displayHeight, viewport, referenceElement);
      x = pos.x;
      y = pos.y;
    } else {
      // Default: center in viewport
      x = (canvasWidth / 2 - displayWidth / 2 - viewport.x) / viewport.zoom;
      y = (canvasHeight / 2 - displayHeight / 2 - viewport.y) / viewport.zoom;
    }

    const element: ImageElement = {
      id: uuidv4(),
      type: 'image',
      x,
      y,
      width: displayWidth,
      height: displayHeight,
      rotation: 0,
      zIndex: maxZIndex + 1,
      dataUrl,
      originalWidth: width,
      originalHeight: height,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    get().addElement(element);
    return element;
  },

  addVideo: (dataUrl, width, height, duration) => {
    const { elements, viewport } = get();
    const maxZIndex = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) : 0;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    let displayWidth = width;
    let displayHeight = height;
    const maxSize = Math.min(canvasWidth, canvasHeight) * 0.7;

    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      displayWidth = width * scale;
      displayHeight = height * scale;
    }

    const element: VideoElement = {
      id: uuidv4(),
      type: 'video',
      x: (canvasWidth / 2 - displayWidth / 2 - viewport.x) / viewport.zoom,
      y: (canvasHeight / 2 - displayHeight / 2 - viewport.y) / viewport.zoom,
      width: displayWidth,
      height: displayHeight,
      rotation: 0,
      zIndex: maxZIndex + 1,
      dataUrl,
      duration,
      originalWidth: width,
      originalHeight: height,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    get().addElement(element);
    set({ selectedIds: [element.id] });
  },

  addGif: (dataUrl, width, height, config) => {
    const { elements, viewport } = get();
    const maxZIndex = elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) : 0;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    let displayWidth = width;
    let displayHeight = height;
    const maxSize = Math.min(canvasWidth, canvasHeight) * 0.6;

    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      displayWidth = width * scale;
      displayHeight = height * scale;
    }

    const element: GifElement = {
      id: uuidv4(),
      type: 'gif',
      x: (canvasWidth / 2 - displayWidth / 2 - viewport.x) / viewport.zoom,
      y: (canvasHeight / 2 - displayHeight / 2 - viewport.y) / viewport.zoom,
      width: displayWidth,
      height: displayHeight,
      rotation: 0,
      zIndex: maxZIndex + 1,
      dataUrl,
      originalWidth: width,
      originalHeight: height,
      gifConfig: config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    get().addElement(element);
    set({ selectedIds: [element.id] });
  },

  getSelectedElements: () => {
    const { elements, selectedIds } = get();
    return elements.filter((el) => selectedIds.includes(el.id));
  },

  getElementByIndex: (id) => {
    const { elements } = get();
    return elements.findIndex((el) => el.id === id);
  },

  bringToFront: (id) => {
    const { elements } = get();
    const maxZIndex = Math.max(...elements.map((e) => e.zIndex));
    get().updateElement(id, { zIndex: maxZIndex + 1 });
  },

  sendToBack: (id) => {
    const { elements } = get();
    const minZIndex = Math.min(...elements.map((e) => e.zIndex));
    get().updateElement(id, { zIndex: minZIndex - 1 });
  },

  bringForward: (id) => {
    const { elements } = get();
    const element = elements.find((e) => e.id === id);
    if (!element) return;

    // Find the element with the next higher zIndex
    const sortedByZ = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedByZ.findIndex((e) => e.id === id);

    if (currentIndex < sortedByZ.length - 1) {
      const nextElement = sortedByZ[currentIndex + 1];
      // Swap zIndex values
      get().updateElement(id, { zIndex: nextElement.zIndex });
      get().updateElement(nextElement.id, { zIndex: element.zIndex });
    }
  },

  sendBackward: (id) => {
    const { elements } = get();
    const element = elements.find((e) => e.id === id);
    if (!element) return;

    // Find the element with the next lower zIndex
    const sortedByZ = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedByZ.findIndex((e) => e.id === id);

    if (currentIndex > 0) {
      const prevElement = sortedByZ[currentIndex - 1];
      // Swap zIndex values
      get().updateElement(id, { zIndex: prevElement.zIndex });
      get().updateElement(prevElement.id, { zIndex: element.zIndex });
    }
  },
}));
