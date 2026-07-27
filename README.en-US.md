# AI Web Tools - Canvas Media Tool

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7.3-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.1-cyan?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

A modern Web canvas tool based on Canvas, supporting image/video uploads, free editing, video-to-GIF conversion, and more. **Pure front-end implementation, no backend service required**.

## ✨ Features

### 🖼️ Infinite Canvas
- Free zooming (Ctrl/Cmd + Mouse Wheel)
- Pan/Translate (Alt + Drag or Mouse Middle Button)
- Scroll navigation
- **Marquee Selection**: Drag across empty areas to batch-select multiple elements

### 📷 Image Processing
- Supports batch upload of images and videos (unified upload button)
- Automatic horizontal arrangement after upload to prevent overlapping
- Free drag-and-drop movement
- Scaling via four-corner control points (Hold Shift to maintain aspect ratio)
- Rotation handle (Hold Shift to snap to 15° increments)
- **Element Type Labels**: Type identifiers (Image🖼️/Video🎬/GIF✨) displayed in the top-left corner of each element
- **Download Image**: Download according to current adjusted dimensions (not original size)
- **Merge Images**: Select multiple images to merge them into a single new image

### 🎬 Video Processing
- Operation drawer pops up on the right when a video is selected
- **Playback Control**: Play/Pause, frame-by-frame forward/backward
- **Frame Extraction**: Extract the current video frame as a standalone image, automatically placed in an empty space
- **Video to GIF**:
  - Visual time range selection
  - Custom frame rate (5-30 FPS)
  - Custom output width (160-640px)
  - Real-time GIF preview
  - Add converted GIF to canvas or download directly
  - Powered by FFmpeg.wasm, processed entirely within the browser

### 🔧 Utility Features
- ↩️ Undo/Redo (Ctrl/Cmd + Z / Ctrl/Cmd + Shift + Z)
- 📋 Copy/Paste (Ctrl/Cmd + C / V)
- 🗑️ Delete selected (Delete / Backspace)
- 📦 Auto-save to browser IndexedDB
- ⌨️ Full keyboard shortcut support

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm / pnpm / yarn

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Visit http://localhost:5173 to use the application.

### Build for Production

```bash
npm run build
```

Build artifacts are located in the `dist/` directory.

## 📖 User Guide

### Uploading Media Files
Click the **"Upload"** button in the top toolbar to select multiple image and video files simultaneously.

### Editing Elements
1. **Select**: Click an element.
2. **Multi-select**: Hold Shift and click multiple elements, or use marquee selection.
3. **Move**: Drag the element.
4. **Scale**: Drag the control points at the four corners.
5. **Rotate**: Drag the circular handle at the top.

### Image Operations
1. After selecting an image, the operation drawer will appear on the right.
2. **Download Image**: Download at the current size.
3. **Merge Items**: Select multiple images to merge them into one new image.

### Video Operations
1. After selecting a video, the operation drawer will appear on the right.
2. **Playback Control**: Play/pause video and view frame by frame.
3. **Extract Frame**: Add the current frame as an image to the canvas.
4. **Convert to GIF**: Click the button to open the settings panel.

### Shortcuts

| Shortcut | Function |
|--------|------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + A` | Select All |
| `Delete / Backspace` | Delete Selected |
| `Escape` | Deselect |
| `Ctrl/Cmd + Wheel` | Zoom Canvas |
| `Alt + Drag` | Pan Canvas |

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------|------|------|
| React | 19.2 | UI Framework |
| TypeScript | 5.9 | Type Safety |
| Vite | 7.3 | Build Tool |
| TailwindCSS | 4.1 | Styling |
| Zustand | 5.0 | State Management |
| FFmpeg.wasm | 0.12 | Video Processing |
| idb-keyval | 6.2 | IndexedDB Storage |
| Motion | 12.x | Animation Effects |

## 📁 Project Structure

```
src/
├── components/           # React Components
│   ├── Board/           # Canvas-related components
│   │   ├── CanvasBoard.tsx    # Main canvas (includes marquee selection)
│   │   └── ZoomControls.tsx   # Zoom controls
│   ├── Toolbar/         # Toolbar
│   │   └── Toolbar.tsx        # Unified upload button
│   └── Panels/          # Panel components
│       ├── VideoSidePanel.tsx   # Video operation drawer
│       ├── ImageSidePanel.tsx   # Image operation drawer
│       ├── VideoToGifPanel.tsx  # Video to GIF panel
│       ├── ToastContainer.tsx   # Notification toasts
│       └── LoadingOverlay.tsx   # Loading overlay
├── stores/              # Zustand State Management
│   ├── boardStore.ts    # Canvas state
│   └── uiStore.ts       # UI state
├── services/            # Service Layer
│   ├── ffmpeg.ts        # FFmpeg.wasm wrapper
│   └── storage.ts       # IndexedDB storage
├── hooks/               # Custom Hooks
│   ├── useKeyboard.ts   # Keyboard shortcuts
│   └── useStorage.ts    # Auto-save
├── utils/               # Utility Functions
│   ├── file.ts          # File processing
│   └── transform.ts     # Transformation calculations
├── types/               # TypeScript Types
├── App.tsx              # Application Entry
└── main.tsx             # Rendering Entry
```

## ⚠️ Important Notes

### FFmpeg.wasm Configuration
Since FFmpeg.wasm requires `SharedArrayBuffer` support, the necessary response headers have been added to the Vite configuration:

```typescript
// vite.config.ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

### Browser Compatibility
- Latest versions of Chrome / Edge / Firefox are recommended.
- Safari has limited support for `SharedArrayBuffer`.

## 📄 License

MIT License - See the [LICENSE](./LICENSE) file for details.

## 🤝 Contribution

Issues and Pull Requests are welcome!

---

Made with ❤️ by [wangliuqi](https://github.com/1414044032)
