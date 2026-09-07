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

- `mediaConfig.introVideoUrl`：填写约 14 MB 的 MP4 地址。空值表示演示模式，直接进入首页。已配置时显示纯 SVG 动画，缓冲就绪后淡出并播放；自动播放受阻提供手动播放，加载失败或 45 秒无响应提供重试及跳过。
- `mediaConfig.introPosterUrl`：填写开场尾帧的莫高窟卫星图地址。不会自动截图；为空使用原创 SVG 插画。
- `gameLevels`：按类型定义填写关卡、全景 URL、线索及四选一问题。`true_answer` 从 **0** 开始。全景应使用 **2:1 等距柱状投影**，远程图片必须允许 CORS；建议单张不超过 8192×4096，并根据目标设备降低尺寸。
- `gameAuthors`：修改 `{ name, job }` 中的制作者姓名及职责。刷新页面后使用最新配置，旧存档中的团队信息不会覆盖修改，无需清除 localStorage。
- `public/art/`：附带离线可用的原创 SVG 全景、背景和线索演示，不代表真实洞窟影像。所有情节为虚构文化探秘，不能作为考古史实引用。

## 玩法和数据

首页 `/` 选择关卡与三档难度，所有关卡共享 `/game`；结束与制作信息位于 `/ending`。每次只探索首页选中的一关，该关所选难度的题目全部答对后即可进入结束页，不会自动进入其他章节。

初探抽取 1 题，寻踪抽取题量一半（向上取整），解谜抽取全部。首页、游戏设置及题目弹窗均可修改难度，显示“本关需答 X / Y 题”；难度标签可直接点击，滑块也支持触摸、鼠标与键盘。每关生成稳定随机顺序，途中改变难度调整题目集合但保留答题历史。答对数为首次正确的题数，答错数为错误尝试次数；每次记录原始题目下标、关卡下标、选择和时间。

拖动/单指旋转；滚轮/双指捏合改变 FOV；方向键和加减键也可操作。线索默认折叠，支持图片、音频、视频、文本，面板事件不会传给全景。图片、视频提供全屏查看器，支持按钮、滚轮与双指缩放（100%–500%）、放大后拖动、重置及设备全屏；不支持 Fullscreen API 的移动浏览器仍可使用占满视口的查看器。

Pinia 管理全部关卡及问答状态。`pagehide`、`beforeunload`、隐藏页面时保存到 localStorage，并每 15 秒备份；提交答案、切换难度和结算时立即保存。恢复时以源码中的关卡及团队配置为准：修改素材、线索、解析或团队信息保留进度，题干、选项或正确答案改变则提示旧进度不兼容并重置。旧版多关存档仅保留当前关答题记录；因旧版没有各关耗时，历史累计时间会保留。只有可见的游戏页计时，后台、首页和结束页暂停。恢复时校验数据，存储禁用或损坏时显示可重试提示。浏览器强制终止不保证触发退出事件，最多可能丢失最近一次备份后的时间。

## 验证与部署

```sh
npm run build
npm run test:unit -- --run
npm run test:e2e -- --project=chromium
```

首次缺少浏览器时执行 `npx playwright install chromium`。部署 `dist/` 到静态服务，配置 history 回退（例如 Nginx `try_files $uri $uri/ /index.html;`），保证刷新 `/game` 不出现 404。媒体地址需 HTTPS 且可公开访问，音视频服务建议支持 Range 请求。

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
