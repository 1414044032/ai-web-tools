import React, { useRef } from 'react';
import { useBoardStore, useUIStore } from '@/stores';
import { readFileAsDataURL, getImageDimensions, getVideoMetadata, isImageFile, isVideoFile } from '@/utils';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex flex-col items-center justify-center p-2 rounded-lg transition-all
      hover:bg-gray-100 text-gray-700
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    title={label}
  >
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </button>
);

export const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addImage, addVideo, undo, redo, canUndo, canRedo, selectedIds, deleteElements } = useBoardStore();
  const { setLoading, addToast } = useUIStore();

  // Handle file upload (supports multiple images and videos)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(isImageFile);
    const videoFiles = Array.from(files).filter(isVideoFile);

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      addToast({ type: 'error', message: '请选择有效的图片或视频文件' });
      return;
    }

    try {
      const totalCount = imageFiles.length + videoFiles.length;
      setLoading(true, `正在加载 ${totalCount} 个文件...`);

      let successCount = 0;
      let failCount = 0;
      const addedIds: string[] = [];
      const gap = 20;
      let currentX = 0;

      // Calculate total width for centering
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;
      const maxSize = Math.min(canvasWidth, canvasHeight) * 0.7;

      // Process images
      for (const file of imageFiles) {
        try {
          const dataUrl = await readFileAsDataURL(file);
          const { width, height } = await getImageDimensions(file);

          let displayWidth = width;
          if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            displayWidth = width * scale;
          }

          const element = addImage(dataUrl, width, height, {
            x: currentX - (totalCount - 1) * (displayWidth + gap) / 2,
            y: 0
          });

          if (element) {
            addedIds.push(element.id);
            currentX += displayWidth + gap;
          }
          successCount++;
        } catch (error) {
          console.error('Failed to upload image:', file.name, error);
          failCount++;
        }
      }

      // Process videos
      for (const file of videoFiles) {
        try {
          const dataUrl = await readFileAsDataURL(file);
          const { width, height, duration } = await getVideoMetadata(file);

          let displayWidth = width;
          if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            displayWidth = width * scale;
          }

          // Add video at current position
          addVideo(dataUrl, width, height, duration);

          // Get the added video element
          const elements = useBoardStore.getState().elements;
          const addedVideo = elements[elements.length - 1];
          if (addedVideo) {
            addedIds.push(addedVideo.id);
            // Update position for batch layout
            if (videoFiles.length > 1 || imageFiles.length > 0) {
              useBoardStore.getState().updateElement(addedVideo.id, {
                x: addedVideo.x + currentX - (totalCount - 1) * (displayWidth + gap) / 2,
              });
            }
            currentX += displayWidth + gap;
          }
          successCount++;
        } catch (error) {
          console.error('Failed to upload video:', file.name, error);
          failCount++;
        }
      }

      if (addedIds.length > 0) {
        useBoardStore.getState().setSelectedIds(addedIds);
      }

      if (successCount > 0 && failCount === 0) {
        addToast({ type: 'success', message: `成功添加 ${successCount} 个文件` });
      } else if (successCount > 0 && failCount > 0) {
        addToast({ type: 'warning', message: `成功 ${successCount} 个，失败 ${failCount} 个` });
      } else {
        addToast({ type: 'error', message: '文件加载失败' });
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      addToast({ type: 'error', message: '文件加载失败' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-white rounded-xl shadow-lg px-2 py-1 border border-gray-200">
        {/* Upload Files (Images & Videos) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <ToolButton
          icon={<UploadIcon />}
          label="上传"
          onClick={() => fileInputRef.current?.click()}
        />

        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* Undo */}
        <ToolButton
          icon={<UndoIcon />}
          label="撤销"
          onClick={undo}
          disabled={!canUndo()}
        />

        {/* Redo */}
        <ToolButton
          icon={<RedoIcon />}
          label="重做"
          onClick={redo}
          disabled={!canRedo()}
        />

        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* Delete */}
        <ToolButton
          icon={<TrashIcon />}
          label="删除"
          onClick={() => deleteElements(selectedIds)}
          disabled={selectedIds.length === 0}
        />
      </div>
    </div>
  );
};

// Icons
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const UndoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const RedoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default Toolbar;
