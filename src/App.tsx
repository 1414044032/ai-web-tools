import { CanvasBoard, ZoomControls } from './components/Board';
import { Toolbar } from './components/Toolbar';
import { VideoSidePanel, ImageSidePanel, ToastContainer, LoadingOverlay } from './components/Panels';
import { useKeyboard, useStorage } from './hooks';

function App() {
  // Initialize keyboard shortcuts
  useKeyboard();

  // Initialize auto-save
  useStorage({ autoSaveInterval: 5000, enabled: true });

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-50 relative">
      {/* Main Canvas */}
      <CanvasBoard />

      {/* Toolbar */}
      <Toolbar />

      {/* Zoom Controls */}
      <ZoomControls />

      {/* Video Side Panel (shows when video is selected) */}
      <VideoSidePanel />

      {/* Image Side Panel (shows when images are selected) */}
      <ImageSidePanel />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Loading Overlay */}
      <LoadingOverlay />
    </div>
  );
}

export default App;
