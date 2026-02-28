import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBoardStore, useUIStore } from '@/stores';
import { ffmpegService } from '@/services';
import { downloadBlob, dataURLToBlob } from '@/utils';
import type { VideoElement } from '@/types';

export const VideoSidePanel: React.FC = () => {
  const { selectedIds, elements, addImage } = useBoardStore();
  const { addToast, setLoading } = useUIStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // GIF Modal state
  const [showGifModal, setShowGifModal] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);
  const [fps, setFps] = useState(10);
  const [gifWidth, setGifWidth] = useState(320);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewGif, setPreviewGif] = useState<string | null>(null);
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);

  // Get selected video element
  const selectedVideo = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0] && el.type === 'video') as VideoElement | undefined
    : undefined;

  // Reset state when video changes
  useEffect(() => {
    if (selectedVideo) {
      setCurrentTime(0);
      setDuration(selectedVideo.duration || 0);
      setStartTime(0);
      setEndTime(Math.min(5, selectedVideo.duration || 5));
      setPreviewGif(null);
      setShowGifModal(false);

      if (!ffmpegService.isLoaded()) {
        setIsLoadingFFmpeg(true);
        ffmpegService.load().then(() => setIsLoadingFFmpeg(false)).catch(() => setIsLoadingFFmpeg(false));
      }
    }
  }, [selectedVideo?.id]);

  // Sync video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
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
  }, [selectedVideo?.id]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.pause() : video.play();
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video) return;
    const frameTime = 1 / 30;
    const newTime = direction === 'forward'
      ? Math.min(video.currentTime + frameTime, duration)
      : Math.max(video.currentTime - frameTime, 0);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const extractFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !selectedVideo) return;

    try {
      setLoading(true, '正在抽取帧...');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      // Pass the selected video as reference element to find an empty position
      addImage(dataUrl, canvas.width, canvas.height, undefined, selectedVideo);
      addToast({ type: 'success', message: '帧已抽取为图片' });
    } catch (error) {
      console.error('Failed to extract frame:', error);
      addToast({ type: 'error', message: '帧抽取失败' });
    } finally {
      setLoading(false);
    }
  }, [selectedVideo, addImage, addToast, setLoading]);

  // GIF functions
  const generatePreview = useCallback(async () => {
    if (!selectedVideo) return;
    try {
      setIsConverting(true);
      setProgress(0);
      setPreviewGif(null);
      const videoBlob = dataURLToBlob(selectedVideo.dataUrl);
      const gifBlob = await ffmpegService.videoToGif(
        videoBlob,
        { startTime, duration: endTime - startTime, fps: Math.min(fps, 15), width: Math.min(gifWidth, 240) },
        (p) => setProgress(p)
      );
      setPreviewGif(URL.createObjectURL(gifBlob));
      addToast({ type: 'success', message: 'GIF 预览生成成功' });
    } catch (error) {
      console.error('Failed to generate preview:', error);
      addToast({ type: 'error', message: 'GIF 预览生成失败' });
    } finally {
      setIsConverting(false);
      setProgress(0);
    }
  }, [selectedVideo, startTime, endTime, fps, gifWidth, addToast]);

  const convertAndAdd = useCallback(async () => {
    if (!selectedVideo) return;
    try {
      setIsConverting(true);
      setLoading(true, '正在转换 GIF...');
      setProgress(0);
      const videoBlob = dataURLToBlob(selectedVideo.dataUrl);
      const gifBlob = await ffmpegService.videoToGif(
        videoBlob,
        { startTime, duration: endTime - startTime, fps, width: gifWidth },
        (p) => setProgress(p)
      );
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const aspectRatio = selectedVideo.originalWidth / selectedVideo.originalHeight;
        const height = Math.round(gifWidth / aspectRatio);
        useBoardStore.getState().addGif(dataUrl, gifWidth, height, { startTime, endTime, fps, width: gifWidth, height });
        addToast({ type: 'success', message: 'GIF 已添加到画布' });
        setShowGifModal(false);
      };
      reader.readAsDataURL(gifBlob);
    } catch (error) {
      console.error('Failed to convert:', error);
      addToast({ type: 'error', message: 'GIF 转换失败' });
    } finally {
      setIsConverting(false);
      setLoading(false);
      setProgress(0);
    }
  }, [selectedVideo, startTime, endTime, fps, gifWidth, addToast, setLoading]);

  const downloadGif = useCallback(async () => {
    if (!selectedVideo) return;
    try {
      setIsConverting(true);
      setLoading(true, '正在生成 GIF...');
      setProgress(0);
      const videoBlob = dataURLToBlob(selectedVideo.dataUrl);
      const gifBlob = await ffmpegService.videoToGif(
        videoBlob,
        { startTime, duration: endTime - startTime, fps, width: gifWidth },
        (p) => setProgress(p)
      );
      downloadBlob(gifBlob, `video-to-gif-${Date.now()}.gif`);
      addToast({ type: 'success', message: 'GIF 下载成功' });
    } catch (error) {
      console.error('Failed to download:', error);
      addToast({ type: 'error', message: 'GIF 下载失败' });
    } finally {
      setIsConverting(false);
      setLoading(false);
      setProgress(0);
    }
  }, [selectedVideo, startTime, endTime, fps, gifWidth, addToast, setLoading]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => { if (previewGif) URL.revokeObjectURL(previewGif); };
  }, [previewGif]);

  if (!selectedVideo) return null;

  return (
    <>
      {/* Side Drawer */}
      <AnimatePresence>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">视频操作</h3>
          </div>

          {/* Video Preview */}
          <div className="bg-black">
            <video ref={videoRef} src={selectedVideo.dataUrl} className="w-full max-h-44 object-contain" muted />
          </div>

          {/* Timeline */}
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="range"
              min={0}
              max={duration}
              step={0.01}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Play Controls */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">播放控制</div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => stepFrame('backward')} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="上一帧">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                </button>
                <button onClick={togglePlay} className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors" title={isPlaying ? '暂停' : '播放'}>
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <button onClick={() => stepFrame('forward')} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="下一帧">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Extract Frame */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">帧操作</div>
              <button
                onClick={extractFrame}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                抽取当前帧
              </button>
              <p className="text-xs text-gray-400 mt-1.5 text-center">使用进度条定位到想要的帧</p>
            </div>

            <div className="border-t border-gray-100" />

            {/* Convert to GIF */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">GIF 转换</div>
              <button
                onClick={() => setShowGifModal(true)}
                disabled={isLoadingFFmpeg}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                {isLoadingFFmpeg ? '加载中...' : '转换为 GIF'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* GIF Modal */}
      <AnimatePresence>
        {showGifModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50"
              onClick={() => !isConverting && setShowGifModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">转换为 GIF</h3>
                <button onClick={() => !isConverting && setShowGifModal(false)} className="p-1 hover:bg-gray-100 rounded" disabled={isConverting}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Time Range */}
                <div>
                  <label className="text-xs font-medium text-gray-600">时间范围（秒）</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="number" value={startTime.toFixed(1)} onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))} className="flex-1 px-3 py-1.5 text-sm border rounded-lg" step="0.1" min="0" max={duration} />
                    <span className="text-gray-400">→</span>
                    <input type="number" value={endTime.toFixed(1)} onChange={(e) => setEndTime(Math.min(duration, parseFloat(e.target.value) || 0))} className="flex-1 px-3 py-1.5 text-sm border rounded-lg" step="0.1" min="0" max={duration} />
                  </div>
                </div>

                {/* FPS & Width */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">帧率</label>
                    <select value={fps} onChange={(e) => setFps(parseInt(e.target.value))} className="w-full mt-1 px-3 py-1.5 text-sm border rounded-lg">
                      {[5, 10, 15, 20, 25, 30].map((v) => <option key={v} value={v}>{v} FPS</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">输出宽度</label>
                    <select value={gifWidth} onChange={(e) => setGifWidth(parseInt(e.target.value))} className="w-full mt-1 px-3 py-1.5 text-sm border rounded-lg">
                      {[160, 240, 320, 480, 640].map((v) => <option key={v} value={v}>{v}px</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                {previewGif && (
                  <div className="rounded-lg bg-gray-100 p-2">
                    <img src={previewGif} alt="GIF Preview" className="max-w-full max-h-32 mx-auto" />
                  </div>
                )}

                {/* Progress */}
                {isConverting && (
                  <div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-800 transition-all" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-1">{Math.round(progress * 100)}%</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={generatePreview} disabled={isConverting} className="flex-1 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors">预览</button>
                  <button onClick={downloadGif} disabled={isConverting} className="flex-1 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors">下载</button>
                  <button onClick={convertAndAdd} disabled={isConverting} className="flex-1 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 transition-colors">添加到画布</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default VideoSidePanel;
