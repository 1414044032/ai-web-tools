# AI Web Tools - Canvas 画布媒体工具

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7.3-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.1-cyan?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

一个基于 Canvas 的现代化 Web 画布工具，支持图片/视频上传、自由编辑、视频转 GIF 等功能。**纯前端实现，无需后端服务**。

## ✨ 功能特性

### 🖼️ 无限画布
- 自由缩放（Ctrl/Cmd + 滚轮）
- 拖拽平移（Alt + 拖拽 或 鼠标中键）
- 滚轮滚动浏览
- **框选功能**：拖拽空白区域批量选中多个元素

### 📷 图片处理
- 支持批量上传图片和视频（统一上传按钮）
- 上传后自动横向排列，不重叠
- 自由拖拽移动位置
- 四角控制点缩放（按住 Shift 保持比例）
- 旋转手柄旋转（按住 Shift 以 15° 为单位吸附）
- **元素类型标签**：每个元素左上角显示类型标识（图片🖼️/视频🎬/GIF✨）
- **下载图片**：按当前调整后的尺寸下载（非原始尺寸）
- **合并图片**：选中多张图片后可合并为一张新图片

### 🎬 视频处理
- 选中视频后右侧弹出操作抽屉
- **播放控制**：播放/暂停、逐帧前进/后退
- **帧抽取**：将视频当前帧抽取为独立图片，自动放置到空位置
- **视频转 GIF**：
  - 可视化时间范围选择
  - 自定义帧率（5-30 FPS）
  - 自定义输出宽度（160-640px）
  - 实时 GIF 预览
  - 转换后添加到画布或直接下载
  - 基于 FFmpeg.wasm，完全在浏览器端处理

### 🔧 辅助功能
- ↩️ 撤销/重做（Ctrl/Cmd + Z / Ctrl/Cmd + Shift + Z）
- 📋 复制/粘贴（Ctrl/Cmd + C / V）
- 🗑️ 删除选中（Delete / Backspace）
- 📦 自动保存到浏览器 IndexedDB
- ⌨️ 完整快捷键支持

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm / pnpm / yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可使用。

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 📖 使用指南

### 上传媒体文件
点击顶部工具栏的 **「上传」** 按钮，可同时选择多个图片和视频文件

### 编辑元素
1. **选中**：单击元素
2. **多选**：按住 Shift 点击多个元素，或拖拽框选
3. **移动**：拖拽元素
4. **缩放**：拖拽四角的控制点
5. **旋转**：拖拽顶部的圆形手柄

### 图片操作
1. 选中图片后，右侧弹出操作抽屉
2. **下载图片**：按当前尺寸下载
3. **合并 Item**：选中多张图片后，将它们合并为一张新图片

### 视频操作
1. 选中视频后，右侧弹出操作抽屉
2. **播放控制**：播放/暂停视频，逐帧查看
3. **抽取帧**：将当前帧作为图片添加到画布
4. **转换 GIF**：点击按钮弹出设置面板

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |
| `Ctrl/Cmd + C` | 复制 |
| `Ctrl/Cmd + V` | 粘贴 |
| `Ctrl/Cmd + A` | 全选 |
| `Delete / Backspace` | 删除选中 |
| `Escape` | 取消选择 |
| `Ctrl/Cmd + 滚轮` | 缩放画布 |
| `Alt + 拖拽` | 平移画布 |

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2 | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7.3 | 构建工具 |
| TailwindCSS | 4.1 | 样式 |
| Zustand | 5.0 | 状态管理 |
| FFmpeg.wasm | 0.12 | 视频处理 |
| idb-keyval | 6.2 | IndexedDB 存储 |
| Motion | 12.x | 动画效果 |

## 📁 项目结构

```
src/
├── components/           # React 组件
│   ├── Board/           # 画布相关组件
│   │   ├── CanvasBoard.tsx    # 主画布（含框选功能）
│   │   └── ZoomControls.tsx   # 缩放控制
│   ├── Toolbar/         # 工具栏
│   │   └── Toolbar.tsx        # 统一上传按钮
│   └── Panels/          # 面板组件
│       ├── VideoSidePanel.tsx   # 视频操作抽屉
│       ├── ImageSidePanel.tsx   # 图片操作抽屉
│       ├── VideoToGifPanel.tsx  # 视频转GIF面板
│       ├── ToastContainer.tsx   # 通知提示
│       └── LoadingOverlay.tsx   # 加载遮罩
├── stores/              # Zustand 状态管理
│   ├── boardStore.ts    # 画布状态
│   └── uiStore.ts       # UI 状态
├── services/            # 服务层
│   ├── ffmpeg.ts        # FFmpeg.wasm 封装
│   └── storage.ts       # IndexedDB 存储
├── hooks/               # 自定义 Hooks
│   ├── useKeyboard.ts   # 快捷键
│   └── useStorage.ts    # 自动保存
├── utils/               # 工具函数
│   ├── file.ts          # 文件处理
│   └── transform.ts     # 变换计算
├── types/               # TypeScript 类型
├── App.tsx              # 应用入口
└── main.tsx             # 渲染入口
```

## ⚠️ 注意事项

### FFmpeg.wasm 配置
由于 FFmpeg.wasm 需要 SharedArrayBuffer 支持，Vite 配置中已添加必要的响应头：

```typescript
// vite.config.ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

### 浏览器兼容性
- 推荐使用最新版 Chrome / Edge / Firefox
- Safari 对 SharedArrayBuffer 支持有限

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ by [wangliuqi](https://github.com/1414044032)
