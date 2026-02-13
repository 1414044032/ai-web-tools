import { create } from 'zustand';
import type { ToolType } from '@/types';

interface UIStore {
  // Active tool
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Panel states
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  togglePanel: () => void;

  // Video to GIF modal
  isVideoToGifOpen: boolean;
  currentVideoId: string | null;
  openVideoToGif: (videoId: string) => void;
  closeVideoToGif: () => void;

  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // Toast/notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIStore>((set) => ({
  // Active tool
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Panel states
  isPanelOpen: false,
  setIsPanelOpen: (open) => set({ isPanelOpen: open }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  // Video to GIF modal
  isVideoToGifOpen: false,
  currentVideoId: null,
  openVideoToGif: (videoId) => set({ isVideoToGifOpen: true, currentVideoId: videoId }),
  closeVideoToGif: () => set({ isVideoToGifOpen: false, currentVideoId: null }),

  // Loading states
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

  // Toast/notifications
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
