# 敦煌·探迹：代码技术总览

## 1. 产品一句话

一个以 360° 全景、时间档案、线索发现和推理解谜为核心的文化遗产探索产品：用户在洞窟/石窟全景中环顾、切换时相、发现线索，最后用题目把证据串成故事。

> 当前素材中包含原创示意画境和教学故事，不应当当作真实考古影像或历史结论。

## 2. 技术栈

- **Vue 3 + TypeScript**：组件化 UI、类型安全、`<script setup>`。
- **Vite**：本地开发和生产构建，生产部署到 GitHub Pages。
- **Vue Router**：按地点和页面分区组织路由：`/{PLACE}/{home|game|thank}`。
- **Pinia**：管理地点、关卡、题目、线索、探索进度和计时。
- **Three.js / WebGL**：在球体内侧渲染 2:1 等距柱状全景纹理，并提供射线拾取与后处理 Shader。
- **Vitest + Playwright**：单元测试和 Chromium 端到端/视觉检查。

## 3. 代码分层

```text
src/
├── views/                 页面编排：入口、地点首页、游戏、结算
├── components/            可复用交互：全景、线索、题目控制、媒体查看器
├── stores/game.ts         Pinia 状态、答题规则、存档/恢复/迁移
├── data/game.ts           地点、关卡、全景、热点、线索、题目配置
├── utils/
│   ├── clickPoints.ts     球面点击点的最近命中判断
│   ├── hotspots.ts        3D 热点投影到 CSS2D 标签
│   └── assets.ts          资源地址适配
├── types/game.ts          领域类型定义
└── assets/main.css        全局视觉与响应式布局
```

## 4. 产品主链路

1. `App.vue` 恢复 Pinia 存档，按路由控制入口动画和计时。
2. `HomeView / PlaceHome` 展示地点与选关入口。
3. `GameView` 编排 `PanoramaViewer`、线索抽屉、题目弹窗和时间轴。
4. `PanoramaViewer` 负责 WebGL 全景、热点投影、拖动旋转、缩放、UV 模式和点击发现。
5. `game.ts` 记录首次答题、线索解锁、发现点、当前时相和耗时，并持久化到 localStorage。
6. 完成本关后进入 `EndingView`，形成探索回响。

## 5. 深入功能一：360° 全景与点击发现

### 原理

- 全景图片使用 **2:1 等距柱状投影**；把它贴到半径 10 的球面上。
- `geometry.scale(-1, 1, 1)` 把球面法线/朝向翻到内侧，摄像机放在球心，用户看到的是球内壁。
- 拖动改变经纬角，滚轮/双指改变相机 FOV；Three.js 每帧更新相机朝向并渲染。
- 用户点击时由相机发射 Raycaster 射线，与球面求交；交点与配置的 `Vector3` 点击点做欧氏距离比较，最近且小于 `accept_click_range` 的点命中。

### 为什么这样做

点击点在 3D 球面坐标中配置，不依赖屏幕分辨率、窗口比例或图片裁剪；同一套数据可在桌面和移动端复用。

## 6. 深入功能二：紫外线观察 Shader

### 原理

- 普通模式：`WebGLRenderer.render(scene, camera)`，只走一次直接渲染。
- UV 模式：`RenderPass → ShaderPass → OutputPass`。
- Shader 先用亮度 `0.2126R + 0.7152G + 0.0722B` 和色差估计原图信息，再把明暗映射为深紫/蓝色。
- 低色差、高亮度区域作为“荧光”候选，采样上下左右邻域形成蓝色辉光，突出隐藏标记。
- UV 只在当前时相存在 `ultraviolet_url` 时开放；切换时相会退出 UV，避免显示错误状态。

### 为什么这样做

它不是“把图片染成紫色”，而是用一条可解释的颜色映射规则，把亮度、色差和邻域信息转成“可观察的隐迹”。因此既有视觉效果，也能讲清楚输入、处理和输出。

## 7. 工程化保障

- **资源安全**：纹理异步加载以 `loadId` 防止过期回调覆盖新状态；旧纹理和后处理资源及时 `dispose()`。
- **性能控制**：设备像素比上限 1.5；普通模式不启用 EffectComposer，减少不必要的渲染通道。
- **容错**：30 秒加载超时、WebGL context lost、媒体失败均提供重试；存档读取前做结构和题目指纹校验。
- **可维护数据**：关卡、时相、点击点、热点、线索和题目均配置驱动，新增地点主要修改 `src/data/game.ts`。
- **验证**：`npm run build`、Vitest 单元测试、Playwright Chromium 测试和视觉快照。

## 8. PPT 目录对应关系

PPT 共 15 页：第 1 页封面，第 2 页目录；第 3 页为 Part A“产品体验”分隔页，第 4–6 页为产品内容；第 7 页为 Part B“技术原理”分隔页，第 8–11 页为技术内容；第 12 页为 Part C“工程总结”分隔页，第 13–15 页为总结内容。技术部分按“先讲人话，再讲实现”展开。

## 9. 常用命令

```sh
npm run dev -- --host 127.0.0.1
npm run build
npm run test:unit -- --run
npm run test:e2e -- --project=chromium
npm run build:ppt
```
