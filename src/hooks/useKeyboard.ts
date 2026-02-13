import { useEffect } from 'react';
import { useBoardStore } from '@/stores';

export function useKeyboard() {
  const { undo, redo, canUndo, canRedo, deleteElements, selectedIds, copyElements, pasteElements } =
    useBoardStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Z: Undo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      if ((mod && e.shiftKey && e.key === 'z') || (mod && e.key === 'y')) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
        return;
      }

      // Delete/Backspace: Delete selected elements
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        deleteElements(selectedIds);
        return;
      }

      // Ctrl/Cmd + C: Copy
      if (mod && e.key === 'c') {
        e.preventDefault();
        copyElements();
        return;
      }

      // Ctrl/Cmd + V: Paste
      if (mod && e.key === 'v') {
        e.preventDefault();
        pasteElements();
        return;
      }

      // Ctrl/Cmd + A: Select all
      if (mod && e.key === 'a') {
        e.preventDefault();
        const { elements, setSelectedIds } = useBoardStore.getState();
        setSelectedIds(elements.map((el) => el.id));
        return;
      }

      // Escape: Deselect all
      if (e.key === 'Escape') {
        e.preventDefault();
        useBoardStore.getState().clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, deleteElements, selectedIds, copyElements, pasteElements]);
}
