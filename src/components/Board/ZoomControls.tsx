import React from 'react';
import { useBoardStore } from '@/stores';

export const ZoomControls: React.FC = () => {
  const { viewport, setViewport, resetViewport } = useBoardStore();

  const zoomIn = () => {
    setViewport({ zoom: Math.min(viewport.zoom * 1.2, 5) });
  };

  const zoomOut = () => {
    setViewport({ zoom: Math.max(viewport.zoom / 1.2, 0.1) });
  };

  const zoomReset = () => {
    resetViewport();
  };

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="absolute bottom-4 left-4 z-50">
      <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg px-2 py-1 border border-gray-200">
        <button
          onClick={zoomOut}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="缩小"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <button
          onClick={zoomReset}
          className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors min-w-[60px]"
          title="重置缩放"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={zoomIn}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="放大"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ZoomControls;
