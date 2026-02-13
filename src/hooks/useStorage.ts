import { useEffect, useRef, useCallback } from 'react';
import { useBoardStore } from '@/stores';
import { storageService } from '@/services';

interface UseStorageOptions {
  autoSaveInterval?: number; // in milliseconds
  enabled?: boolean;
}

export function useStorage(options: UseStorageOptions = {}) {
  const { autoSaveInterval = 5000, enabled = true } = options;
  const { elements, viewport, setElements, setViewport } = useBoardStore();
  const lastSaveRef = useRef<string>('');

  // Save board data
  const saveBoard = useCallback(async () => {
    const currentState = JSON.stringify({ elements, viewport });
    
    // Only save if state has changed
    if (currentState === lastSaveRef.current) {
      return;
    }

    try {
      await storageService.saveBoard({
        name: 'Default Board',
        elements,
        viewport,
      });
      lastSaveRef.current = currentState;
      console.log('Board saved automatically');
    } catch (error) {
      console.error('Failed to save board:', error);
    }
  }, [elements, viewport]);

  // Load board data
  const loadBoard = useCallback(async () => {
    try {
      const board = await storageService.loadBoard();
      if (board) {
        setElements(board.elements);
        setViewport(board.viewport);
        lastSaveRef.current = JSON.stringify({
          elements: board.elements,
          viewport: board.viewport,
        });
        console.log('Board loaded from storage');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load board:', error);
      return false;
    }
  }, [setElements, setViewport]);

  // Clear all stored data
  const clearStorage = useCallback(async () => {
    try {
      await storageService.clearAll();
      lastSaveRef.current = '';
      console.log('Storage cleared');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      saveBoard();
    }, autoSaveInterval);

    return () => clearInterval(intervalId);
  }, [enabled, autoSaveInterval, saveBoard]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (enabled) {
        saveBoard();
      }
    };
  }, [enabled, saveBoard]);

  // Load on mount
  useEffect(() => {
    if (enabled) {
      loadBoard();
    }
  }, [enabled, loadBoard]);

  return {
    saveBoard,
    loadBoard,
    clearStorage,
  };
}
