import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBoardStore, useUIStore } from '@/stores';
import { getRotatedBoundingBox } from '@/utils';
import { ImageCropModal } from './ImageCropModal';
import type { ImageElement } from '@/types';

export const ImageSidePanel: React.FC = () => {
  const { selectedIds, elements, addImage } = useBoardStore();
  const { addToast, setLoading } = useUIStore();

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState<ImageElement | null>(null);

  // Get selected image elements
  const selectedImages = selectedIds
    .map((id) => elements.find((el) => el.id === id))
    .filter((el): el is ImageElement => el?.type === 'image');

  // Check if we should show the panel (only when images are selected, not videos)
  const hasSelectedImages = selectedImages.length > 0;
  const hasSelectedVideos = selectedIds.some(
    (id) => elements.find((el) => el.id === id)?.type === 'video'
  );

  // Don't show if videos are selected (VideoSidePanel handles that)
  const shouldShow = hasSelectedImages && !hasSelectedVideos;

  // Open crop modal
  const openCropModal = useCallback((img: ImageElement) => {
    setCropImage(img);
    setShowCropModal(true);
  }, []);

  // Handle crop result
  const handleCrop = useCallback((dataUrl: string, width: number, height: number) => {
    if (!cropImage) return;

    // Add the cropped image as a new element
    const element = addImage(dataUrl, width, height, undefined, cropImage);

    if (element) {
      useBoardStore.getState().setSelectedIds([element.id]);
      addToast({ type: 'success', message: '裁剪成功，已生成新图片' });
    }
  }, [cropImage, addImage, addToast]);

  // Merge multiple images into one
  const mergeImages = useCallback(async () => {
    if (selectedImages.length < 2) {
      addToast({ type: 'warning', message: '请选择至少2个图片进行合并' });
      return;
    }

    try {
      setLoading(true, '正在合并图片...');

      // Calculate bounding box of all selected images (considering rotation)
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const img of selectedImages) {
        // Get the actual bounding box after rotation
        const bbox = getRotatedBoundingBox(img.x, img.y, img.width, img.height, img.rotation);
        minX = Math.min(minX, bbox.minX);
        minY = Math.min(minY, bbox.minY);
        maxX = Math.max(maxX, bbox.maxX);
        maxY = Math.max(maxY, bbox.maxY);
      }

      const mergedWidth = Math.ceil(maxX - minX);
      const mergedHeight = Math.ceil(maxY - minY);

      // Create a canvas to merge images
      const canvas = document.createElement('canvas');
      canvas.width = mergedWidth;
      canvas.height = mergedHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Fill with transparent background
      ctx.clearRect(0, 0, mergedWidth, mergedHeight);

      // Sort images by zIndex to draw in correct order
      const sortedImages = [...selectedImages].sort((a, b) => a.zIndex - b.zIndex);

      // Draw each image
      for (const img of sortedImages) {
        await new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            // Calculate the center of the image relative to the bounding box
            const imgCenterX = img.x + img.width / 2 - minX;
            const imgCenterY = img.y + img.height / 2 - minY;

            // Save context state
            ctx.save();

            // Move to image center, rotate, then draw
            ctx.translate(imgCenterX, imgCenterY);
            ctx.rotate((img.rotation * Math.PI) / 180);

            // Draw the image centered at origin
            ctx.drawImage(image, -img.width / 2, -img.height / 2, img.width, img.height);

            // Restore context state
            ctx.restore();
            resolve();
          };
          image.onerror = reject;
          image.src = img.dataUrl;
        });
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');

      // Add the merged image to the canvas
      // Position it at the same location as the bounding box
      const element = addImage(dataUrl, mergedWidth, mergedHeight);

      // Update position to match the original bounding box
      if (element) {
        useBoardStore.getState().updateElement(element.id, {
          x: minX,
          y: minY,
          width: mergedWidth,
          height: mergedHeight,
        });
        useBoardStore.getState().setSelectedIds([element.id]);
      }

      addToast({ type: 'success', message: `成功合并 ${selectedImages.length} 张图片` });
    } catch (error) {
      console.error('Failed to merge images:', error);
      addToast({ type: 'error', message: '图片合并失败' });
    } finally {
      setLoading(false);
    }
  }, [selectedImages, addImage, addToast, setLoading]);

  // Download image with current size (not original size)
  const downloadImage = useCallback(async (img: ImageElement) => {
    try {
      setLoading(true, '正在生成图片...');

      // Create canvas with current display size
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width);
      canvas.height = Math.round(img.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Load and draw the image
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          // Apply rotation if needed
          if (img.rotation !== 0) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((img.rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
          }
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        image.onerror = reject;
        image.src = img.dataUrl;
      });

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `image_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({ type: 'success', message: '图片下载成功' });
    } catch (error) {
      console.error('Failed to download image:', error);
      addToast({ type: 'error', message: '图片下载失败' });
    } finally {
      setLoading(false);
    }
  }, [addToast, setLoading]);

  // Download all selected images
  const downloadAllImages = useCallback(async () => {
    for (const img of selectedImages) {
      await downloadImage(img);
    }
  }, [selectedImages, downloadImage]);

  const formatSize = (size: number) => Math.round(size);

  return (
    <>
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-40 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🖼️</span>
                <span>图片操作</span>
                <span className="text-sm text-gray-400">({selectedImages.length}个)</span>
              </h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Selected Images Preview */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300">已选择的图片</h3>
                <div className="grid grid-cols-3 gap-2">
                  {selectedImages.slice(0, 6).map((img) => (
                    <div
                      key={img.id}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700"
                    >
                      <img
                        src={img.dataUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {selectedImages.length > 6 && (
                    <div className="aspect-square rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 text-sm">
                      +{selectedImages.length - 6}
                    </div>
                  )}
                </div>
              </div>

              {/* Image Info */}
              {selectedImages.length === 1 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-300">图片信息</h3>
                  <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">尺寸</span>
                      <span>{formatSize(selectedImages[0].width)} × {formatSize(selectedImages[0].height)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">原始尺寸</span>
                      <span>{selectedImages[0].originalWidth} × {selectedImages[0].originalHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">旋转角度</span>
                      <span>{Math.round(selectedImages[0].rotation)}°</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Operations */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300">操作</h3>

                {/* Crop Button - Only for single image */}
                {selectedImages.length === 1 && (
                  <>
                    <button
                      onClick={() => openCropModal(selectedImages[0])}
                      className="w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      <CropIcon />
                      <span>裁剪图片</span>
                    </button>
                    <p className="text-xs text-gray-400 text-center">
                      自由裁剪或按比例裁剪，生成新图片
                    </p>
                  </>
                )}

                {/* Download Button */}
                <button
                  onClick={downloadAllImages}
                  className="w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-gray-700 hover:bg-gray-600 text-white"
                >
                  <DownloadIcon />
                  <span>下载图片{selectedImages.length > 1 ? ` (${selectedImages.length}张)` : ''}</span>
                </button>
                <p className="text-xs text-gray-400 text-center">
                  按当前尺寸下载图片
                </p>

                {/* Merge Button */}
                <button
                  onClick={mergeImages}
                  disabled={selectedImages.length < 2}
                  className={`
                    w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                    ${selectedImages.length >= 2
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  <MergeIcon />
                  <span>合并 Item</span>
                </button>
                {selectedImages.length < 2 && (
                  <p className="text-xs text-gray-500 text-center">
                    请选择至少2个图片进行合并
                  </p>
                )}
                {selectedImages.length >= 2 && (
                  <p className="text-xs text-gray-400 text-center">
                    将 {selectedImages.length} 个图片合并为一个新图片
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        image={cropImage}
        onClose={() => {
          setShowCropModal(false);
          setCropImage(null);
        }}
        onCrop={handleCrop}
      />
    </>
  );
};

// Icons
const CropIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const MergeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export default ImageSidePanel;
