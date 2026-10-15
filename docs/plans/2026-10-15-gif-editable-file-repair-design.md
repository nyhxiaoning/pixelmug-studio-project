# GIF 可编辑文件自动修复设计

## 目标

当 GIF 作品缺少 `editableFileUrl` 时，编辑器应从现有 `gifFileUrl`（回退使用 `coverUrl`）解析全部帧，生成标准像素编辑项目 JSON，上传到 OSS，并把返回地址回写到当前作品。用户随后可以立即查看和编辑每一帧，再次编辑时直接读取已生成的 JSON。

## 根因

现有回退流程已经能解析 GIF 并构造多帧项目，但最后调用 `persistNow()`，把包含所有帧像素的项目集合整体写入 `pixelart_web_editor_projects`。当浏览器本地存储空间不足时，`localStorage.setItem` 抛出 `QuotaExceededError`，外层将整个作品加载判定为失败。

## 方案比较

1. 仅捕获并忽略本地存储配额异常：可以进入编辑器，但不会补齐 `editableFileUrl`，后续每次编辑都要重新解析 GIF。
2. 仅在当前页面内存中生成项目：避免本次报错，但刷新后丢失修复结果，也不符合作品可编辑文件的既有数据模型。
3. 生成编辑 JSON、上传并回写作品，同时将本地缓存降级为非关键路径：永久修复作品，并避免本地存储配额阻断远程作品加载。

采用方案 3。

## 数据流

1. `loadWorkForEdit` 获取作品详情，确认类型为 `GIF` 且没有 `editableFileUrl`。
2. 下载 `gifFileUrl`，没有时回退到 `coverUrl`，使用现有 `decodeGifFrames` 解析完整动画。
3. 使用现有 `renderImageToPixels` 将每帧转换为 32×16 像素数据，并构造符合版本 4 的项目对象。
4. 将项目转换为与保存流程一致的 JSON（移除派生的 `canvasPixels`），调用现有 `uploadPixelJSON` 上传。
5. 调用 `updateWorkApi(workId, { ...原作品可保存字段, editableFileUrl })` 回写作品，避免更新接口覆盖已有 GIF 元数据。
6. 更新当前内存中的作品详情并展示所有帧。
7. 尝试写入本地项目缓存；若仅发生 `QuotaExceededError`，保留内存中的编辑项目并继续渲染。其他存储异常仍按现有错误流程处理。

## 边界与错误处理

- GIF 下载、解码、JSON 上传或作品回写失败时，不伪造成功状态，沿用现有加载失败提示。
- 只有 `QuotaExceededError` 被视为可降级错误；它不应影响已加载的远程项目。
- 必须先完成上传和后端回写，再把自动生成项目标记为已保存，避免自动保存立即重复上传。
- 不修改 GIF 文件、封面、帧延迟和作品类型。
- 不清理用户已有的本地项目，避免破坏用户数据。

## 验证

- 回归测试证明缺少 `editableFileUrl` 的 GIF 会生成包含全部帧的可编辑项目数据，并调用上传与作品更新。
- 回归测试证明本地存储抛出 `QuotaExceededError` 时，远程项目仍保持加载成功。
- 现有像素编辑器测试、TypeScript 类型检查及 QA 构建通过。

