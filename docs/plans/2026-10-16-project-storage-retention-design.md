# 像素作品本地存储保留设计

## 目标

限制像素编辑器在 `localStorage` 中保留的作品数量，避免重复打开作品和多帧、多图层数据长期累积后触发 `QuotaExceededError`。

## 保留规则

- 本地最多保留 2 个作品。
- 保存前按作品 ID 去重。
- 同 ID 作品保留时间更新的一份；时间相同时保留输入列表中最后出现的一份。
- 不同 ID 作品按 `updatedAt` 判断新旧，缺失时回退到 `createdAt`，再缺失时按 0 处理。
- 超过 2 个作品时淘汰最旧作品。
- 不额外设置 2 MB 字节硬上限。
- 每作品在读取和写入边界最多保留 50 帧，每帧最多保留 4 图层。当前代码只在 GIF 导出时检查 50 帧，实施时需将该上限补到项目数据清洗边界。

## 存储流程

在像素编辑器核心模块中提供统一的作品整理函数，读取和写入都使用同一套规则。

`sanitizeProject()` 统一裁剪帧和图层数量。`loadProjects()` 在反序列化和数据清洗后去重、裁剪，使历史超量缓存在下次加载时即不再进入页面内存。`saveProjects()` 在写入前同样清洗和裁剪，并返回实际保留的项目。编辑器将返回值同步回 `projects.value`，保证页面项目库与 `localStorage` 一致。

## 退出登录

继续使用现有的定向清理逻辑：

- 删除 `localStorage.pixelart_web_editor_projects`。
- 删除 `localStorage.pixelart_web_editor_current_project`。
- 删除 `sessionStorage.creator.preview.deviceIds`。
- 删除 `sessionStorage.user-store`。
- 保留语言、主题等非账号作品偏好。

## 错误处理

作品裁剪不影响现有序列化清洗，`canvasPixels` 仍不写入 `localStorage`。如果裁剪后单个作品仍超过浏览器配额，Storage API 继续抛出原始异常，不静默丢弃当前作品。

## 验证

- 同 ID 多份数据只保留最新一份。
- 三个不同作品只保留最新两个。
- 时间相同的重复 ID 保留最后出现的一份。
- 读取历史超量缓存时返回最新两个。
- 写入内容和返回的作品列表一致。
- 读取和写入超过 50 帧、4 图层的项目时都裁剪到上限。
- 退出登录清理测试继续通过。
