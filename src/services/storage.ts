import { get, set, del, keys, clear } from 'idb-keyval';
import type { CanvasElement, Viewport } from '@/types';

interface BoardData {
  id: string;
  name: string;
  elements: CanvasElement[];
  viewport: Viewport;
  createdAt: number;
  updatedAt: number;
}

interface MediaData {
  id: string;
  type: 'image' | 'video' | 'gif';
  blob: Blob;
  filename: string;
  size: number;
  createdAt: number;
}

const BOARD_KEY = 'canvas-board';
const MEDIA_PREFIX = 'media-';

class StorageService {
  // Board operations
  async saveBoard(data: Omit<BoardData, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const existing = await this.loadBoard();
    const board: BoardData = {
      id: existing?.id || 'default',
      name: data.name,
      elements: data.elements,
      viewport: data.viewport,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await set(BOARD_KEY, board);
  }

  async loadBoard(): Promise<BoardData | null> {
    try {
      const board = await get<BoardData>(BOARD_KEY);
      return board || null;
    } catch (error) {
      console.error('Failed to load board:', error);
      return null;
    }
  }

  async clearBoard(): Promise<void> {
    await del(BOARD_KEY);
  }

  // Media operations
  async saveMedia(id: string, blob: Blob, type: MediaData['type'], filename: string): Promise<void> {
    const media: MediaData = {
      id,
      type,
      blob,
      filename,
      size: blob.size,
      createdAt: Date.now(),
    };
    await set(`${MEDIA_PREFIX}${id}`, media);
  }

  async loadMedia(id: string): Promise<MediaData | null> {
    try {
      return await get<MediaData>(`${MEDIA_PREFIX}${id}`);
    } catch (error) {
      console.error('Failed to load media:', error);
      return null;
    }
  }

  async deleteMedia(id: string): Promise<void> {
    await del(`${MEDIA_PREFIX}${id}`);
  }

  async getAllMediaIds(): Promise<string[]> {
    const allKeys = await keys();
    return allKeys
      .filter((key) => typeof key === 'string' && key.startsWith(MEDIA_PREFIX))
      .map((key) => (key as string).replace(MEDIA_PREFIX, ''));
  }

  // Utility operations
  async clearAll(): Promise<void> {
    await clear();
  }

  async getStorageUsage(): Promise<{ count: number; size: number }> {
    const allKeys = await keys();
    let totalSize = 0;

    for (const key of allKeys) {
      const value = await get(key);
      if (value) {
        totalSize += JSON.stringify(value).length;
      }
    }

    return {
      count: allKeys.length,
      size: totalSize,
    };
  }
}

export const storageService = new StorageService();
