import React, { useRef } from 'react';
import { useBoardStore, useUIStore } from '@/stores';
import { readFileAsDataURL, getImageDimensions, getVideoMetadata, isImageFile, isVideoFile } from '@/utils';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, onClick, disabled, active }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex flex-col items-center justify-center p-2 rounded-lg transition-all
      ${active ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    title={label}
  >
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </button>
);

export const Toolbar: React.FC = () => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { addImage, addVideo, undo, redo, canUndo, canRedo, selectedIds, deleteElements, elements } =
    useBoardStore();
  const { setLoading, addToast, openVideoToGif } = useUIStore();

  // Handle image upload (supports multiple files with auto-layout)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    // Filter valid image files
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) {
      addToast({ type: 'error', message: '请选择有效的图片文件' });
      return;
    }

    try {
      setLoading(true, `正在加载 ${imageFiles.length} 张图片...`);
      
      let successCount = 0;
      let failCount = 0;
      const addedIds: string[] = [];
      
      // Calculate layout parameters
      const gap = 20; // Gap between images
      let currentX = 0;

      for (const file of imageFiles) {
        try {
          const dataUrl = await readFileAsDataURL(file);
          const { width, height } = await getImageDimensions(file);
          
          // Calculate display size (same logic as in store)
          const canvasWidth = window.innerWidth;
          const canvasHeight = window.innerHeight;
          const maxSize = Math.min(canvasWidth, canvasHeight) * 0.4;
          
          let displayWidth = width;
          if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            displayWidth = width * scale;
          }
          
          // Add image with horizontal offset
          const element = addImage(dataUrl, width, height, { 
            x: currentX - (imageFiles.length - 1) * (displayWidth + gap) / 2, 
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

      // Select all added images
      if (addedIds.length > 0) {
        useBoardStore.getState().setSelectedIds(addedIds);
      }

      if (successCount > 0 && failCount === 0) {
        addToast({ type: 'success', message: `成功添加 ${successCount} 张图片` });
      } else if (successCount > 0 && failCount > 0) {
        addToast({ type: 'warning', message: `成功 ${successCount} 张，失败 ${failCount} 张` });
      } else {
        addToast({ type: 'error', message: '图片加载失败' });
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
      addToast({ type: 'error', message: '图片加载失败' });
    } finally {
      setLoading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Handle video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isVideoFile(file)) {
      addToast({ type: 'error', message: '请选择有效的视频文件' });
      return;
    }

    try {
      setLoading(true, '正在加载视频...');
      const dataUrl = await readFileAsDataURL(file);
      const { width, height, duration } = await getVideoMetadata(file);
      addVideo(dataUrl, width, height, duration);
      addToast({ type: 'success', message: '视频添加成功' });
    } catch (error) {
      console.error('Failed to upload video:', error);
      addToast({ type: 'error', message: '视频加载失败' });
    } finally {
      setLoading(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  // Handle convert to GIF
  const handleConvertToGif = () => {
    if (selectedIds.length !== 1) return;
    const element = elements.find((el) => el.id === selectedIds[0]);
    if (element?.type !== 'video') {
      addToast({ type: 'warning', message: '请先选择一个视频' });
      return;
    }
    openVideoToGif(element.id);
  };

  // Check if a video is selected
  const hasVideoSelected = selectedIds.length === 1 && elements.find((el) => el.id === selectedIds[0])?.type === 'video';

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-white rounded-xl shadow-lg px-2 py-1 border border-gray-200">
        {/* Upload Image (multiple) */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        <ToolButton
          icon={<ImageIcon />}
          label="图片"
          onClick={() => imageInputRef.current?.click()}
        />

        {/* Upload Video */}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />
        <ToolButton
          icon={<VideoIcon />}
          label="视频"
          onClick={() => videoInputRef.current?.click()}
        />

        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* Convert to GIF */}
        <ToolButton
          icon={<GifIcon />}
          label="转GIF"
          onClick={handleConvertToGif}
          disabled={!hasVideoSelected}
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
const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const GifIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
    />
  </svg>
);

const UndoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
    />
  </svg>
);

const RedoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

export default Toolbar;
