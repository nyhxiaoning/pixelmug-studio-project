# PixelMug Studio 项目导读

> 分析日期：2026-10-14  
> 分析方式：阅读当前仓库源码、配置、文档和测试。除本文件外未修改项目代码。为遵守“不要修改任何代码”的要求，本次未执行会生成 `ui-dist/` 或运行时目录的构建、测试和启动命令。

## 1. 项目是做什么的

PixelMug Studio 是 PixelMug / 冒泡智能体应用的本地开发、运行、调试和部署工作台。

一个由 Studio 管理的应用至少包含本地 Bot，也可以同时包含：

- `bot/`：必需，Node.js Bot 入口。
- `webapp/`：可选，在冒泡 App 中打开的 Web 页面。
- `mpy/`：可选，部署到 PixelMug 设备上的 MicroPython 代码。

Studio 的主要职责包括：

- 使用冒泡账号登录，读取账号下的 Bot 和 PixelMug 设备。
- 选择本地应用目录和 Bot 入口，并为 Bot 配置临时 token。
- 启动 Bot 子进程，注入 Studio 调试运行时。
- 构建并通过局域网网关提供应用的 WebApp。
- 发现、关联并授权真实设备。
- 让设备进入 Python Dev，上传和运行 `mpy/` 代码。
- 汇总 Bot、WebApp 和设备日志到应用目录下的 `debug/<runId>/`。
- 提供浏览器工作台和 Electron 桌面壳两种使用方式。

高层运行关系如下：

```text
Vue 工作台 / Electron BrowserWindow
              │
              ▼
    本机 Workbench HTTP 服务
      ├── 冒泡账号、Bot、设备 API
      ├── 本地项目浏览与文本编辑
      └── 启停一次 Studio Run
                    │
                    ├── Bot 子进程 + 调试运行时
                    ├── WebApp 构建与本地服务
                    ├── 局域网 Gateway + mDNS
                    └── PixelMug MPY 上传、运行、日志
```

## 2. 技术栈

### 核心运行环境

- Node.js `>=20.6`
- npm（仓库提交了 `package-lock.json`，推荐使用 `npm ci`）
- JavaScript ESM（`package.json` 中设置了 `"type": "module"`）
- 少量 MicroPython / Python，用于设备引导代码、示例和测试辅助

### 前端

- Vue 3.5，Composition API 与 `<script setup>`
- Vite 6
- CodeMirror 6，用于工作台中的本地文件编辑
- 原生 CSS，主要集中在 `ui/styles.css`
- 自定义轻量国际化：中文文案本身充当 key，`ui/en.js` 提供英文映射

项目没有使用 Vue Router。所谓“页面”是由 `activeSection` 控制的一组条件渲染区块。

### 后端与通信

- Node.js 原生 `http` 服务，无 Express/Koa
- `fetch` 调用冒泡 Creator 服务
- `ws` WebSocket 依赖
- Node.js `child_process.fork` 启动用户 Bot
- 基于 bearer token、Host/Origin 校验的本地 API 访问控制
- mDNS，使手机可通过 `pixelmug-studio.local:7979` 访问 WebApp
- Vite 编程式构建用户项目的 `webapp/`

### 桌面与发布

- Electron 44
- electron-builder 26
- Windows：NSIS x64 安装包
- macOS：Intel x64 与 Apple silicon arm64 DMG

### 测试

- Node.js 内置测试运行器 `node:test`
- 主要测试文件为 `test/*.test.mjs`
- 另有 `test/python_helpers_test.py`，但它没有被当前 `npm test` 脚本包含

## 3. 目录结构

```text
pixelmug-studio/
├── desktop/
│   ├── main.mjs              # Electron 主进程，启动 Workbench 并创建窗口
│   ├── icon.icns
│   └── icon.ico
├── src/
│   ├── server.mjs            # CLI / 浏览器版总入口
│   ├── workbench.mjs         # 工作台 HTTP API、登录、项目与运行编排
│   ├── receiver.mjs          # 单次调试运行服务、日志接收、Bot 子进程
│   ├── launch.mjs            # 设备部署和运行状态机
│   ├── gateway.mjs           # 局域网 WebApp 反向代理
│   ├── mdns.mjs              # pixelmug-studio.local 的 mDNS 响应
│   ├── creator.mjs           # 冒泡账号、Bot、设备服务客户端
│   ├── project.mjs           # 应用目录检查与 Bot 入口校验
│   ├── project-files.mjs     # 工作台内的安全文本文件访问/保存
│   ├── webapp-build.mjs      # 用户 WebApp 的 Vite 编程式构建
│   ├── webapp-addresses.mjs  # 局域网访问地址选择
│   ├── deploy.mjs            # MPY 快照与上传准备
│   ├── webrepl.mjs           # 设备 WebREPL 通信
│   ├── bindings.mjs          # Bot 与设备绑定状态
│   ├── sdk-assets.mjs        # SDK 浏览器资源定位
│   ├── device-bootstrap.py   # 设备端引导辅助代码
│   ├── devices/              # 设备类型适配
│   └── runtime/              # 注入 Bot/WebApp 的 Studio SDK 与调试适配层
├── ui/
│   ├── main.js               # Vue 入口
│   ├── App.vue               # 登录、项目、调试和设备页面的总状态容器
│   ├── components/           # 导航、设备、Bot、日志、文件、文档组件
│   ├── i18n.js / en.js       # 中英文切换与翻译字典
│   ├── styles.css            # 全局界面样式
│   └── assets/               # 工作台图片资源
├── test/                     # Node 测试及一个独立 Python 测试文件
├── getting-started/          # 4 个渐进式入门应用
├── examples/                 # Bot、WebApp、BLE、MPY 等专项示例
├── ui-dist/                  # Vite 构建产物，已被 Git 忽略
├── release/                  # Electron 安装包产物，已被 Git 忽略
├── vite.config.js            # Studio UI 构建配置
├── package.json              # 脚本、依赖与 electron-builder 配置
└── package-lock.json         # npm 锁文件
```

可以把 `src/` 再理解为四层：

1. `server.mjs` / `desktop/main.mjs`：进程入口。
2. `workbench.mjs`：用户工作台与会话编排。
3. `receiver.mjs` / `gateway.mjs`：单次运行的服务和网络边界。
4. `launch.mjs`、`deploy.mjs`、`webrepl.mjs`、`runtime/`：设备部署和运行时能力。

## 4. 启动、构建和测试命令

### 首次安装

```sh
npm ci
```

需要 Node.js 20.6 或更高版本。

### 构建 Studio UI

```sh
npm run build
```

Vite 会把 `ui/` 构建到被 Git 忽略的 `ui-dist/`。

### 启动完整浏览器版工作台

```sh
npm run build
npm start
```

终端会输出带有临时 `studioToken` 的 Studio URL。管理服务默认只监听本机 `127.0.0.1:8787`；WebApp 局域网网关默认使用端口 `7979`。

也可以直接运行指定应用和 Bot：

```sh
node src/server.mjs --project <应用目录> --bot bot/index.js
```

查看 CLI 参数：

```sh
node src/server.mjs --help
```

### 前端 Vite 开发服务器

```sh
npm run dev
```

这只启动 `ui/` 的 Vite 开发服务器。当前 `vite.config.js` 没有配置 `/api` 代理，因此它适合查看或开发纯 UI，但不能单独完成登录、项目选择、运行调试等依赖 Workbench API 的完整流程。

### 桌面版开发

```sh
npm run desktop:dev
```

该脚本实际执行：

```sh
npm run build && electron .
```

也就是说，桌面开发流程会先构建 `ui-dist/`，再以 `desktop/main.mjs` 为 Electron 主进程启动应用。它不是 Vite HMR 模式；修改 UI 后需要重新执行命令或至少重新构建并重启 Electron。

### 测试

```sh
npm test
```

`pretest` 会先自动执行 `npm run build`，随后运行：

```sh
node --test test/*.test.mjs
```

部分 Node 测试内部还会调用名为 `python` 的可执行文件。独立的 `test/python_helpers_test.py` 不在 `npm test` 范围内，如需单独运行，可使用与本机环境匹配的 Python 测试命令，例如：

```sh
python -m unittest test/python_helpers_test.py
```

### 桌面安装包

```sh
npm run package:win       # Windows x64 NSIS
npm run package:win:dir   # Windows 未打包目录
npm run package:mac       # 同时构建 macOS x64 和 arm64 DMG
npm run package:mac:x64
npm run package:mac:arm64
```

产物写入 `release/`；当前配置生成的是未签名安装包。

## 5. 新增一个页面应该从哪里开始

当前项目没有路由器，新增工作台一级页面应从 `ui/components/StageNavigation.vue` 和 `ui/App.vue` 开始。

建议步骤：

1. 在 `ui/components/` 新建独立 Vue 组件，例如 `SettingsPanel.vue`。
2. 在 `StageNavigation.vue` 的 `tabs` 数组中加入页面 id、中文 label、描述和图标 class。
3. 在 `App.vue` 引入组件，并根据 `activeSection === '<页面 id>'` 渲染它。
4. 如果页面需要后端数据：
   - 先判断已有的 `/api/state` 是否足够；
   - 否则在 `src/workbench.mjs` 中增加受现有 token、Host 和 Origin 保护的 API 分支；
   - 前端继续通过 `App.vue` 中的 `api()` 包装器调用，或把包装器作为 prop 传给页面组件。
5. 中文文案直接作为 `t()` 的 key，并在 `ui/en.js` 补齐英文翻译。
6. 在 `ui/styles.css` 增加样式；如果页面较复杂，优先使用组件的 scoped style，避免继续扩大全局样式耦合。
7. 在 `test/` 增加对应行为测试，至少覆盖导航可达、API 权限、成功路径和错误路径。

如果新增的是“用户应用的 WebApp 页面”，而不是 Studio 工作台页面，则应从某个 `examples/*/webapp/` 或 `getting-started/*/webapp/` 的 `index.html`、`main.js`、`style.css` 结构开始。Studio 会通过 `src/webapp-build.mjs` 递归发现 HTML 入口并构建它们。

## 6. 当前明显的维护风险

### 高优先级

1. **前端总容器承担过多职责。** `ui/App.vue` 约 434 行，同时负责认证、轮询、设备、Bot、项目、运行、导航和大量派生状态。功能继续增加时，状态依赖和回归范围会快速扩大。建议逐步提取 composable，例如认证、项目、运行、设备和通知状态。

2. **后端编排文件和设备状态机偏大。** `src/workbench.mjs` 同时处理静态资源、鉴权、目录浏览、文件编辑、账号、Bot、设备和运行 API；`src/launch.mjs` 约 537 行，包含设备状态机、RPC、锁和重试。两者都是高变更热点，适合按领域拆分路由处理器和状态机模块。

3. **开发模式不完整。** `npm run dev` 只有 Vite，没有 Workbench API 代理；`desktop:dev` 则是“先完整构建，再启动 Electron”，没有 HMR。这会拉长桌面 UI 的反馈周期，也容易让 README 中“启动开发服务器”的描述被误解为可进行完整功能开发。

4. **质量门禁不足。** `package.json` 没有 lint、format、typecheck 或覆盖率脚本，仓库中也未发现项目级 ESLint、Prettier、TypeScript/JS 类型检查和 CI 工作流。当前主要依赖测试发现问题，静态错误和风格漂移缺少自动拦截。

5. **Python 测试入口不统一。** `test/python_helpers_test.py` 不会被 `npm test` 执行；另外部分 `.test.mjs` 直接调用 `python`，但 README 只声明 Node.js 要求。不同系统可能只有 `python3`，导致测试环境不一致。

### 中优先级

6. **“页面”依赖手写字符串状态。** `activeSection`、`device:<id>` 和导航数组共同承担路由职责。页面数量增加后，深链、刷新恢复、未识别页面、访问约束和类型安全都会变难。可以考虑引入轻量路由层，或至少集中定义页面常量和元数据。

7. **国际化容易漂移。** 当前以中文原文作为 key、英文对象作为映射，没有自动检查缺失翻译、废弃 key 或重复语义。修改中文文案会隐式改变 key。建议增加字典一致性测试，长期可迁移到稳定的语义 key。

8. **高频轮询和同步文件 I/O 会限制扩展。** UI 每秒请求一次状态，并定期刷新设备；日志和部署路径中存在同步文件写入。当前本地单用户规模通常可接受，但日志量、设备数或并发操作增长后可能阻塞 Node.js 事件循环并增加 Creator 服务压力。

9. **错误可观测性存在空洞。** 若干位置使用空 `catch {}` 或把错误压缩为通用提示。这样能避免次要失败打断流程，但也可能隐藏图标加载、关闭、网络或清理异常。建议为可忽略错误保留 debug 级记录，并区分预期失败和未知失败。

10. **发布流程仍偏早期。** 项目版本为 `0.1.0`，Electron 包明确为未签名包，未看到自动构建、签名、公证和多平台冒烟测试流程。正式分发时需要补齐供应链、签名和发布验证。

### 已经做得较好的基础

维护风险之外，当前项目也有一些值得保留的设计：

- 本机管理服务只绑定 loopback，并校验 Host、Origin 和随机 bearer token。
- WebApp 网关与管理工作台分离，局域网暴露面相对清楚。
- 项目文件访问防止路径穿越、符号链接越界和覆盖并发修改。
- 日志持久化前再次做 secret 脱敏。
- `test/` 已覆盖 Workbench、运行时、绑定、部署、浏览器行为、国际化、mDNS 和入门示例等多个关键域。
- `examples/` 和 `getting-started/` 数量丰富，能够作为功能回归样本和新开发者参考。

## 结论

这是一个结构清晰、功能边界已经成形的本地硬件开发工具：Vue 工作台负责交互，Node.js 服务负责编排，Electron 提供桌面容器，运行时和网关把 Bot、WebApp 与 PixelMug 设备串起来。当前最值得优先投入的是拆分前后端高复杂度文件、建立完整的静态质量/CI 门禁，并改善真正可联调的桌面开发体验。




## 测试一下：testaipixel这个：token的使用整体流程。
token：这是你的 Token 🔑
jI91TvkINkxNihU6Vx1VZoU57zLyPwvB_oWVvwjn9nY



## 任务规划TODO：说明
请参考下面的完整设计与后续实施计划，帮我继续完成没有完成的任务，对于代码中nestjs和react对应实现：

（1）完整设计文档对应：
/Users/henryning/Documents/code/companyCode/pixelmug-studio/docs/plans/2026-10-14-docker-deployment-design.md
（2）后续实施计划对应：
/Users/henryning/Documents/code/companyCode/pixelmug-studio/docs/superpowers/plans/2026-10-14-docker-deployment-export.md


### 解析来问题：对于一个dockerfile文件，这里的配置如何传递；

BOT_TOKEN、BOT_API_BASE_URL，PUBLIC_WEBAPP_URL

process.env.BOT_TOKEN

process.env.PUBLIC_WEBAPP_URL

#### 配置内容如下：启动的时候，传递参数给docker的容器配置
Dockerfile启动的时候，如何注入两个环境变量给容器：process.env.BOT_TOKEN，process.env.PUBLIC_WEBAPP_URL


docker run \
  -e BOT_TOKEN="your_bot_token_here" \
  -e PUBLIC_WEBAPP_URL="https://your-webapp.url" \
  your-image-name


## TODO:本地docker配置：容器管理启动实现本机启动docker后可以回环使用这个工具：
根据当前的zip包拿到内容，本地测试一下部署实战；




