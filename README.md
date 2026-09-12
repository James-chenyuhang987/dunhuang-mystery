# 敦煌壁画探索

使用 `npx create-vue@latest dunhuang-mystery --ts --router --pinia --vitest --playwright --bare` 创建。Vue 3、TypeScript、Pinia、Vue Router 与 three.js；源码及配置使用 TypeScript，不编写 JavaScript 业务文件。浏览器运行与生产构建仍会由工具编译为 JavaScript，这是 Web 运行所必需的。

## 本地启动

```sh
cd dunhuang-mystery # 如果当前已在项目内则省略
npm install
npm run dev -- --host 127.0.0.1
```

推荐 Node 24.15+（或 22.22.2+），以满足当前工具链的 engine 要求。

## 替换正式素材

编辑 `src/data/game.ts`：

- `gameLocations`：配置地点、地点首页素材以及各自的关卡数组。每个地点用可选的 `intro_video_url` 配置 Google Earth 开场 MP4，用 `background_url` 配置首页背景；首次打开网站时播放一次开场动画并通过 localStorage 记忆完成状态；随后点击“开始”、选关、刷新或进行站内路由切换均不会重播。空的 `intro_video_url` 表示直接进入该地点页面。敦煌默认使用已有的 `/entrance.mp4` 与其尾帧 `/background.jpeg`。
- 默认保留敦煌莫高窟和秦始皇帝陵博物院两套地点配置；目前仅开放 `dunhuang`，兵马俑路由暂时重定向至敦煌首页。`gameLevels` 继续导出首个地点关卡以兼容旧调用。
- 每个关卡通过 `panorama: ImagePanorama[]` 按配置顺序定义多个时相；每项填写 `name`、普通纹理 `url`、可选 `ultraviolet_url` 和 `click_points`。纹理应使用 **2:1 等距柱状投影**，远程图片必须允许 CORS；建议单张不超过 8192×4096。问题 `true_answer` 从 **0** 开始。
- `siteConfig`：配置网站标题、浏览器标题后缀、品牌、首页介绍、菜单及结算标题和默认背景。页面不再另存一份固定标题。
- 关卡可选字段 `subtitle`、`description`、`thumbnail_url` 用于二级菜单；未填写时隐藏附加文字，预览图回退到 `panorama[0]?.url`。章节和时间点编号均按数组下标动态生成，不维护“一二三”映射，也不拼接素材路径。重复名称可用，身份依据数组下标；全部配置正常渲染，无虚拟滚动。
- 空关卡数组：显示“暂无关卡”并禁用开始；空题目数组：仍可查看全景和线索，手动点“完成本关”后继续或结算；空线索、空团队数组同样可用。问题仍须有四个字符串选项，正确答案是 0–3 的整数。媒体加载失败仍提供重试。
- `gameAuthors`：修改 `{ name, job }` 中的制作者姓名及职责。刷新页面后使用最新配置，旧存档中的团队信息不会覆盖修改，无需清除 localStorage。
- `public/art/`：附带离线可用的原创 SVG 全景、背景和线索演示，不代表真实洞窟影像。所有情节为虚构文化探秘，不能作为考古史实引用。

## 玩法和数据

路由结构为 `/{PLACE}/{home|game|thank}`（GitHub Pages 地址中位于 `#` 后）。`/` 与 `/dunhuang` 重定向到 `/dunhuang/home`；暂时禁用的兵马俑及未知地点也会回到该页。一级菜单仅提供“开始”和 outline 样式的“选关”：开始按 `levels` 顺序线性游玩；选关进入 `/dunhuang/home?panel=levels` 二级菜单，所选关完成后直接前往 `/dunhuang/thank`。游戏状态由 Pinia 管理，全部关卡共享 `/dunhuang/game`。

初探抽取 1 题，寻踪抽取题量一半（向上取整），解谜抽取全部。二级选关菜单、游戏设置及题目弹窗均可修改难度，显示“本关需答 X / Y 题”；难度标签可直接点击，滑块也支持触摸、鼠标与键盘。每关生成稳定随机顺序，途中改变难度调整当前关的题目集合但保留答题历史；线性模式中已离开的关卡按通过时的难度保留完成状态，不受后续难度切换影响。答对数为首次正确的题数，答错数为错误尝试次数；每次记录原始题目下标、关卡下标、选择和时间。

拖动/单指旋转；滚轮/双指捏合改变 FOV；方向键和加减键也可操作。时间轴按 `panorama` 数组顺序显示 `name` 并热切换纹理；仅当当前时相定义 `ultraviolet_url` 时显示紫外线按钮，切换时相会退出紫外模式。桌面端的时间轴、紫外线和发现进度位于底部工具栏，移动端通过“时间与观察”折叠面板打开。`ultraviolet_url` 可提供灰度或彩色原图，隐藏笔迹用纯白表示；渲染器先按 sRGB 解码，再由 ShaderPass 根据亮度与色度统一映射为紫外配色，并增强低色差白色标记的辉光。纹理成功后才替换旧纹理，异步过期结果及后处理/WebGL 资源均会释放，加载失败或上下文丢失可重新加载。

`ClickPoint.vec` 是以球心为原点、半径约 10 的球面笛卡尔坐标；点击射线与球面的交点减去球心后，与同模式点击点计算欧氏距离，距离小于等于 `accept_click_range` 即命中。每次非拖动点击都会在浏览器控制台输出实际 `Vector3` 和可直接粘贴到配置的 `new Vector3(x, y, z)`。`in_uv: false` 仅普通模式可发现，`true` 仅紫外模式可发现；重叠范围取最近点。发现按关卡、时相和配置下标去重并持久化，但不影响答题通关。

`hotspots` 显示配置驱动的线索点并展开相应 `clue_index`；`clue.problem_indexes` 可关联原始题目下标。线索默认折叠，支持图片、音频、视频、文本，面板事件不会传给全景。图片、视频及带图彩蛋提供全屏查看器，支持按钮、滚轮与双指缩放（100%–500%）、放大后拖动、重置及设备全屏。

每题只有一次作答机会：答错后记录结果但不直接公布正确答案，可打开关联线索后继续；也可跳过，答错与跳过分别统计并持久化。

Pinia 管理全部关卡及问答状态。`pagehide`、`beforeunload`、隐藏页面时保存到 localStorage，并每 15 秒备份；提交答案、切换难度和结算时立即保存。恢复时以源码中的关卡及团队配置为准：修改素材、线索、解析或团队信息保留进度，题干、选项或正确答案改变则提示旧进度不兼容并重置。新版线性存档保留模式、全部已进行关卡及累计答题记录，刷新后从当前关继续。没有模式字段的旧版多关存档迁移为单关，仅保留当前关答题记录；因旧版没有各关耗时，历史累计时间会保留。只有可见的游戏页计时，后台、首页和结束页暂停。恢复时校验数据，存储禁用或损坏时显示可重试提示。浏览器强制终止不保证触发退出事件，最多可能丢失最近一次备份后的时间。

## 验证与部署

```sh
npm run build
npm run test:unit -- --run
npm run test:e2e -- --project=chromium
```

首次缺少浏览器时执行 `npx playwright install chromium`。项目已适配 GitHub Pages：使用 Hash 路由避免刷新 404，生产构建会在 GitHub Actions 中自动根据仓库名设置子路径，并通过 `.github/workflows/deploy-pages.yml` 发布 `dist/`。

使用方式：将代码推送到 GitHub 仓库的 `main` 分支，在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。工作流完成后即可打开 Actions 输出的 Pages 地址。若仓库名为 `username.github.io`，同样可以直接使用根路径部署。

本地构建默认使用 `/`，因此无需为开发环境修改配置。媒体地址需 HTTPS 且可公开访问，音视频服务建议支持 Range 请求。

---

以下保留脚手架工具参考。

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```
