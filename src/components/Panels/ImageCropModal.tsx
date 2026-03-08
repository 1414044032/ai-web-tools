import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ImageElement } from '@/types';

interface ImageCropModalProps {
  isOpen: boolean;
  image: ImageElement | null;
  onClose: () => void;
  onCrop: (dataUrl: string, width: number, height: number) => void;
}

// Aspect ratio presets
const ASPECT_RATIOS = [
  { label: '自由', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  image,
  onClose,
  onCrop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Crop area state (relative to displayed image, 0-1 range)
  const [cropArea, setCropArea] = useState({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset crop area when image changes
  useEffect(() => {
    if (image && isOpen) {
      setCropArea({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
      setAspectRatio(null);
    }
  }, [image?.id, isOpen]);

  // Update image size when loaded
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    }
  }, []);

  // Handle aspect ratio change
  const handleAspectRatioChange = useCallback((ratio: number | null) => {
    setAspectRatio(ratio);
    if (ratio !== null) {
      // Adjust crop area to match aspect ratio
      const currentWidth = cropArea.width;
      const currentHeight = cropArea.height;
      const imageAspect = imageSize.width / imageSize.height;
      
      let newWidth = currentWidth;
      let newHeight = currentWidth / ratio * imageAspect;
      
      if (newHeight > 1) {
        newHeight = Math.min(currentHeight, 0.9);
        newWidth = newHeight * ratio / imageAspect;
      }
      
      // Center the crop area
      const newX = Math.max(0, Math.min(1 - newWidth, (1 - newWidth) / 2));
      const newY = Math.max(0, Math.min(1 - newHeight, (1 - newHeight) / 2));
      
      setCropArea({
        x: newX,
        y: newY,
        width: Math.min(newWidth, 1 - newX),
        height: Math.min(newHeight, 1 - newY),
      });
    }
  }, [cropArea, imageSize]);

  // Mouse handlers for dragging crop area
  const handleMouseDown = useCallback((e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(type);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...cropArea });
  }, [cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (imageSize.width === 0 || imageSize.height === 0) return;
    
    const dx = (e.clientX - dragStart.x) / imageSize.width;
    const dy = (e.clientY - dragStart.y) / imageSize.height;
    
    if (isDragging) {
      // Move the crop area
      let newX = cropStart.x + dx;
      let newY = cropStart.y + dy;
      
      // Constrain to image bounds
      newX = Math.max(0, Math.min(1 - cropStart.width, newX));
      newY = Math.max(0, Math.min(1 - cropStart.height, newY));
      
      setCropArea({
        ...cropArea,
        x: newX,
        y: newY,
      });
    } else if (isResizing) {
      // Resize the crop area
      let { x, y, width, height } = cropStart;
      
      const minSize = 0.1;
      
      switch (isResizing) {
        case 'nw':
          x = Math.min(cropStart.x + cropStart.width - minSize, Math.max(0, cropStart.x + dx));
          y = Math.min(cropStart.y + cropStart.height - minSize, Math.max(0, cropStart.y + dy));
          width = cropStart.width - (x - cropStart.x);
          height = cropStart.height - (y - cropStart.y);
          break;
        case 'ne':
          y = Math.min(cropStart.y + cropStart.height - minSize, Math.max(0, cropStart.y + dy));
          width = Math.max(minSize, Math.min(1 - cropStart.x, cropStart.width + dx));
          height = cropStart.height - (y - cropStart.y);
          break;
        case 'sw':
          x = Math.min(cropStart.x + cropStart.width - minSize, Math.max(0, cropStart.x + dx));
          width = cropStart.width - (x - cropStart.x);
          height = Math.max(minSize, Math.min(1 - cropStart.y, cropStart.height + dy));
          break;
        case 'se':
          width = Math.max(minSize, Math.min(1 - cropStart.x, cropStart.width + dx));
          height = Math.max(minSize, Math.min(1 - cropStart.y, cropStart.height + dy));
          break;
        case 'n':
          y = Math.min(cropStart.y + cropStart.height - minSize, Math.max(0, cropStart.y + dy));
          height = cropStart.height - (y - cropStart.y);
          break;
        case 's':
          height = Math.max(minSize, Math.min(1 - cropStart.y, cropStart.height + dy));
          break;
        case 'w':
          x = Math.min(cropStart.x + cropStart.width - minSize, Math.max(0, cropStart.x + dx));
          width = cropStart.width - (x - cropStart.x);
          break;
        case 'e':
          width = Math.max(minSize, Math.min(1 - cropStart.x, cropStart.width + dx));
          break;
      }
      
      // Apply aspect ratio constraint
      if (aspectRatio !== null) {
        const imageAspect = imageSize.width / imageSize.height;
        const targetHeight = width / aspectRatio * imageAspect;
        
        if (isResizing.includes('n') || isResizing.includes('s')) {
          width = height * aspectRatio / imageAspect;
        } else {
          height = targetHeight;
        }
        
        // Constrain to bounds
        if (x + width > 1) width = 1 - x;
        if (y + height > 1) height = 1 - y;
      }
      
      setCropArea({ x, y, width, height });
    }
  }, [isDragging, isResizing, dragStart, cropStart, imageSize, aspectRatio, cropArea]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  // Perform crop
  const handleCrop = useCallback(async () => {
    if (!image) return;
    
    setIsProcessing(true);
    
    try {
      // Load original image
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = image.dataUrl;
      });
      
      // Calculate crop coordinates on original image
      // Use the current display dimensions, not original dimensions
      const sourceWidth = image.width;
      const sourceHeight = image.height;
      
      const cropX = cropArea.x * sourceWidth;
      const cropY = cropArea.y * sourceHeight;
      const cropWidth = cropArea.width * sourceWidth;
      const cropHeight = cropArea.height * sourceHeight;
      
      // Create canvas for cropped image
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropWidth);
      canvas.height = Math.round(cropHeight);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      
      // Scale factor from original to display size
      const scaleX = img.naturalWidth / sourceWidth;
      const scaleY = img.naturalHeight / sourceHeight;
      
      // Draw cropped portion
      ctx.drawImage(
        img,
        cropX * scaleX,
        cropY * scaleY,
        cropWidth * scaleX,
        cropHeight * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      const dataUrl = canvas.toDataURL('image/png');
      onCrop(dataUrl, canvas.width, canvas.height);
      onClose();
    } catch (error) {
      console.error('Failed to crop image:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [image, cropArea, onCrop, onClose]);

  if (!image) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CropIcon />
                <span>裁剪图片</span>
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
            
            {/* Aspect Ratio Presets */}
            <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-2 overflow-x-auto">
              <span className="text-sm text-gray-400 mr-2">比例：</span>
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.label}
                  onClick={() => handleAspectRatioChange(ratio.value)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    aspectRatio === ratio.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
            
            {/* Crop Area */}
            <div
              ref={containerRef}
              className="relative bg-gray-950 p-8 flex items-center justify-center"
              style={{ minHeight: '400px' }}
            >
              <div className="relative inline-block max-w-full max-h-[60vh]">
                {/* Image */}
                <img
                  ref={imageRef}
                  src={image.dataUrl}
                  alt=""
                  onLoad={handleImageLoad}
                  className="max-w-full max-h-[60vh] object-contain select-none"
                  draggable={false}
                />
                
                {/* Dark overlay outside crop area */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(to right,
                      rgba(0,0,0,0.7) ${cropArea.x * 100}%,
                      transparent ${cropArea.x * 100}%,
                      transparent ${(cropArea.x + cropArea.width) * 100}%,
                      rgba(0,0,0,0.7) ${(cropArea.x + cropArea.width) * 100}%
                    )`,
                  }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${cropArea.x * 100}%`,
                    right: `${(1 - cropArea.x - cropArea.width) * 100}%`,
                    top: 0,
                    height: `${cropArea.y * 100}%`,
                    background: 'rgba(0,0,0,0.7)',
                  }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${cropArea.x * 100}%`,
                    right: `${(1 - cropArea.x - cropArea.width) * 100}%`,
                    bottom: 0,
                    height: `${(1 - cropArea.y - cropArea.height) * 100}%`,
                    background: 'rgba(0,0,0,0.7)',
                  }}
                />
                
                {/* Crop frame */}
                <div
                  className="absolute border-2 border-white cursor-move"
                  style={{
                    left: `${cropArea.x * 100}%`,
                    top: `${cropArea.y * 100}%`,
                    width: `${cropArea.width * 100}%`,
                    height: `${cropArea.height * 100}%`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                  </div>
                  
                  {/* Resize handles */}
                  {/* Corners */}
                  <div
                    className="absolute -left-2 -top-2 w-4 h-4 bg-white rounded-sm cursor-nw-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                  />
                  <div
                    className="absolute -right-2 -top-2 w-4 h-4 bg-white rounded-sm cursor-ne-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                  />
                  <div
                    className="absolute -left-2 -bottom-2 w-4 h-4 bg-white rounded-sm cursor-sw-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                  />
                  <div
                    className="absolute -right-2 -bottom-2 w-4 h-4 bg-white rounded-sm cursor-se-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                  />
                  
                  {/* Edges */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 -top-2 w-8 h-4 bg-white rounded-sm cursor-n-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'n')}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-8 h-4 bg-white rounded-sm cursor-s-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-8 bg-white rounded-sm cursor-w-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'w')}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-8 bg-white rounded-sm cursor-e-resize"
                    onMouseDown={(e) => handleMouseDown(e, 'e')}
                  />
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                裁剪区域：{Math.round(cropArea.width * image.width)} × {Math.round(cropArea.height * image.height)} px
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCrop}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>处理中...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon />
                      <span>确认裁剪</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Icons
const CropIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default ImageCropModal;
