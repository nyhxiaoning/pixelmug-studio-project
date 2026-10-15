# 退出登录清理作品存储设计

## 目标

用户退出登录时清除当前账号留在浏览器中的作品和会话数据，避免下一位登录用户读取到上一位用户的本地项目、当前项目、预览设备选择或持久化用户状态。

## 清理范围

退出时删除以下四个键：

- `localStorage.pixelart_web_editor_projects`
- `localStorage.pixelart_web_editor_current_project`
- `sessionStorage.creator.preview.deviceIds`
- `sessionStorage.user-store`

保留 `localStorage.locale`、`localStorage.pixelart-web-editor.theme` 等与账号作品无关的全局偏好。

## 实现设计

在用户状态模块附近新增一个独立、可测试的清理函数，接收 `localStorage` 和 `sessionStorage` 兼容对象并精确删除上述四个键。`userStore.logout()` 在重置内存状态和认证键后调用该函数。

所有现有退出入口最终都调用 `userStore.logout()`，包括手动退出、无权限页面退出和 HTTP 401 自动退出，因此无需在各页面重复清理逻辑。

不调用 `localStorage.clear()` 或 `sessionStorage.clear()`，避免误删其他模块和用户偏好数据。

## 错误处理

Storage API 的单键删除正常情况下不会因键不存在而失败。清理函数保持幂等，多次退出或键已不存在时均可安全执行。

## 验证

- 单元测试证明四个目标键均被删除。
- 单元测试证明语言和主题键仍然存在。
- 契约测试证明 `userStore.logout()` 调用了集中清理函数。
- QA 构建通过。

