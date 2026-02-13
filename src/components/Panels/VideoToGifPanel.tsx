import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBoardStore, useUIStore } from '@/stores';
import { ffmpegService } from '@/services';
import { downloadBlob, dataURLToBlob } from '@/utils';
import type { VideoElement } from '@/types';

export const VideoToGifPanel: React.FC = () => {
  const { isVideoToGifOpen, currentVideoId, closeVideoToGif, setLoading, addToast } = useUIStore();
  const { elements, addGif } = useBoardStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(320);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewGif, setPreviewGif] = useState<string | null>(null);
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);

  // Get the current video element
  const videoElement = elements.find(
    (el) => el.id === currentVideoId && el.type === 'video'
  ) as VideoElement | undefined;

  // Initialize state when video changes
  useEffect(() => {
    if (videoElement) {
      setStartTime(0);
      setEndTime(Math.min(5, videoElement.duration));
      setPreviewGif(null);
    }
  }, [videoElement]);

  // Preload FFmpeg when panel opens
  useEffect(() => {
    if (isVideoToGifOpen && !ffmpegService.isLoaded()) {
      setIsLoadingFFmpeg(true);
      ffmpegService.load().then(() => {
        setIsLoadingFFmpeg(false);
      }).catch((error) => {
        console.error('Failed to load FFmpeg:', error);
        setIsLoadingFFmpeg(false);
        addToast({ type: 'error', message: 'FFmpeg 加载失败' });
      });
    }
  }, [isVideoToGifOpen, addToast]);

  // Handle time slider change
  const handleStartTimeChange = (value: number) => {
    setStartTime(value);
    if (value >= endTime) {
      setEndTime(Math.min(value + 1, videoElement?.duration || value + 1));
    }
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const handleEndTimeChange = (value: number) => {
    setEndTime(value);
    if (value <= startTime) {
      setStartTime(Math.max(0, value - 1));
    }
  };

  // Generate GIF preview
  const generatePreview = useCallback(async () => {
    if (!videoElement) return;

    try {
      setIsConverting(true);
      setProgress(0);
      setPreviewGif(null);

      const videoBlob = dataURLToBlob(videoElement.dataUrl);
      const duration = endTime - startTime;

      const gifBlob = await ffmpegService.videoToGif(
        videoBlob,
        {
          startTime,
          duration,
          fps: Math.min(fps, 15), // Limit preview FPS for speed
          width: Math.min(width, 240), // Limit preview size for speed
        },
        (p) => setProgress(p)
      );

      const gifUrl = URL.createObjectURL(gifBlob);
      setPreviewGif(gifUrl);
      addToast({ type: 'success', message: 'GIF 预览生成成功' });
    } catch (error) {
      console.error('Failed to generate preview:', error);
      addToast({ type: 'error', message: 'GIF 预览生成失败' });
    } finally {
      setIsConverting(false);
      setProgress(0);
    }
  }, [videoElement, startTime, endTime, fps, width, addToast]);

  // Convert and add to canvas
  const handleConvertAndAdd = async () => {
    if (!videoElement) return;

    try {
      setIsConverting(true);
      setLoading(true, '正在转换 GIF...');
      setProgress(0);

      const videoBlob = dataURLToBlob(videoElement.dataUrl);
      const duration = endTime - startTime;

      const gifBlob = await ffmpegService.videoToGif(
        videoBlob,
        { startTime, duration, fps, width },
        (p) => setProgress(p)
      );

      // Convert blob to data URL for storage
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        // Calculate height based on aspect ratio
        const aspectRatio = videoElement.originalWidth / videoElement.originalHeight;
        const height = Math.round(width / aspectRatio);

        addGif(dataUrl, width, height, {
          startTime,
          endTime,
          fps,
          width,
          height,
        });

        addToast({ type: 'success', message: 'GIF 已添加到画布' });
        closeVideoToGif();
      };
      reader.readAsDataURL(gifBlob);
    } catch (error) {
      console.error('Failed to convert video to GIF:', error);
      addToast({ type: 'error', message: 'GIF 转换失败' });
    } finally {
      setIsConverting(false);
      setLoading(false);
      setProgress(0);
    }
  };

  // Download GIF
  const handleDownload = async () => {
    if (!videoElement) return;

    try {
      setIsConverting(true);
      setLoading(true, '正在生成 GIF...');
      setProgress(0);

      const videoBlob = dataURLToBlob(videoElement.dataUrl);
      const duration = endTime - startTime;

      const gifBlob = await ffmpegService.videoToGif(
        videoBlob,
        { startTime, duration, fps, width },
        (p) => setProgress(p)
      );

      downloadBlob(gifBlob, `video-to-gif-${Date.now()}.gif`);
      addToast({ type: 'success', message: 'GIF 下载成功' });
    } catch (error) {
      console.error('Failed to download GIF:', error);
      addToast({ type: 'error', message: 'GIF 下载失败' });
    } finally {
      setIsConverting(false);
      setLoading(false);
      setProgress(0);
    }
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewGif) {
        URL.revokeObjectURL(previewGif);
      }
    };
  }, [previewGif]);

  if (!videoElement) return null;

  const duration = videoElement.duration;

  return (
    <AnimatePresence>
      {isVideoToGifOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
            onClick={closeVideoToGif}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">视频转 GIF</h2>
                <button
                  onClick={closeVideoToGif}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* FFmpeg loading indicator */}
              {isLoadingFFmpeg && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
                  正在加载 FFmpeg...
                </div>
              )}

              {/* Video preview */}
              <div className="mb-6 rounded-lg overflow-hidden bg-gray-100">
                <video
                  ref={videoRef}
                  src={videoElement.dataUrl}
                  className="w-full"
                  controls
                  muted
                />
              </div>

              {/* Time range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时间范围
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-500 w-16">
                    {formatTime(startTime)}
                  </span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
                    <div
                      className="absolute h-full bg-blue-500 rounded-full"
                      style={{
                        left: `${(startTime / duration) * 100}%`,
                        width: `${((endTime - startTime) / duration) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">
                    {formatTime(endTime)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">开始时间</label>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">结束时间</label>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  时长: {formatTime(endTime - startTime)}
                </p>
              </div>

              {/* FPS */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  帧率 (FPS): {fps}
                </label>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>15</span>
                  <span>30</span>
                </div>
              </div>

              {/* Output width */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  输出宽度: {width}px
                </label>
                <input
                  type="range"
                  min={160}
                  max={640}
                  step={40}
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>160</span>
                  <span>400</span>
                  <span>640</span>
                </div>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    GIF 预览
                  </label>
                  <button
                    onClick={generatePreview}
                    disabled={isConverting || isLoadingFFmpeg}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    生成预览
                  </button>
                </div>
                <div className="rounded-lg bg-gray-100 p-4 flex items-center justify-center min-h-32">
                  {isConverting ? (
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{Math.round(progress * 100)}%</p>
                    </div>
                  ) : previewGif ? (
                    <img src={previewGif} alt="GIF Preview" className="max-w-full" />
                  ) : (
                    <p className="text-sm text-gray-400">点击"生成预览"查看效果</p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {isConverting && (
                <div className="mb-6">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  disabled={isConverting || isLoadingFFmpeg}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  下载 GIF
                </button>
                <button
                  onClick={handleConvertAndAdd}
                  disabled={isConverting || isLoadingFFmpeg}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  添加到画布
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export default VideoToGifPanel;
