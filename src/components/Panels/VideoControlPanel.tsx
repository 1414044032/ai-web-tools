import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBoardStore, useUIStore } from '@/stores';
import type { VideoElement } from '@/types';

interface VideoControlPanelProps {
  videoElement: VideoElement;
  onClose: () => void;
}

export const VideoControlPanel: React.FC<VideoControlPanelProps> = ({ videoElement, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoElement.duration || 0);

  const { addImage } = useBoardStore();
  const { addToast, setLoading } = useUIStore();

  // Sync video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  // Seek to time
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Step forward/backward
  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video) return;

    // Assume ~30fps, step by 1 frame
    const frameTime = 1 / 30;
    const newTime = direction === 'forward'
      ? Math.min(video.currentTime + frameTime, duration)
      : Math.max(video.currentTime - frameTime, 0);

    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Extract current frame as image
  const extractFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setLoading(true, '正在抽取帧...');

      // Create canvas and draw current frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');

      // Add as new image element
      addImage(dataUrl, canvas.width, canvas.height, { x: 50, y: 0 });

      addToast({ type: 'success', message: '帧已抽取为图片' });
      onClose();
    } catch (error) {
      console.error('Failed to extract frame:', error);
      addToast({ type: 'error', message: '帧抽取失败' });
    } finally {
      setLoading(false);
    }
  }, [addImage, addToast, setLoading, onClose]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">视频控制</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video preview */}
        <div className="rounded-lg overflow-hidden bg-black mb-3">
          <video
            ref={videoRef}
            src={videoElement.dataUrl}
            className="w-full max-h-48 object-contain"
            muted
          />
        </div>

        {/* Time slider */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Step backward */}
          <button
            onClick={() => stepFrame('backward')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="上一帧"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Step forward */}
          <button
            onClick={() => stepFrame('forward')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="下一帧"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>

          <div className="w-px h-8 bg-gray-200 mx-2" />

          {/* Extract frame */}
          <button
            onClick={extractFrame}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
            title="将当前帧抽取为图片"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">抽取此帧</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Wrapper component that manages visibility
export const VideoControlPanelWrapper: React.FC = () => {
  const { selectedIds, elements } = useBoardStore();
  const [showPanel, setShowPanel] = useState(false);

  // Check if a single video is selected
  const selectedVideo = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0] && el.type === 'video') as VideoElement | undefined
    : undefined;

  // Show panel when video is double-clicked or via toolbar
  useEffect(() => {
    if (!selectedVideo) {
      setShowPanel(false);
    }
  }, [selectedVideo]);

  // Listen for custom event to open panel
  useEffect(() => {
    const handleOpenVideoControl = () => {
      if (selectedVideo) {
        setShowPanel(true);
      }
    };

    window.addEventListener('openVideoControl', handleOpenVideoControl);
    return () => window.removeEventListener('openVideoControl', handleOpenVideoControl);
  }, [selectedVideo]);

  if (!selectedVideo || !showPanel) return null;

  return (
    <AnimatePresence>
      <VideoControlPanel
        videoElement={selectedVideo}
        onClose={() => setShowPanel(false)}
      />
    </AnimatePresence>
  );
};

export default VideoControlPanel;
