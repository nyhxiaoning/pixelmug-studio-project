# 登录账号输入优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将登录页账号栏统一为邮箱或中国大陆手机号输入，在不改变现有接口的前提下提供发送验证码与登录前校验。

**Architecture:** 在现有 `login.ts` 中增加纯账号校验函数，并将其接入 Element Plus 表单规则和获取验证码流程。页面继续通过验证码/密码模式选择现有 API；四种语言复用统一账号文案键。

**Tech Stack:** Vue 3、TypeScript、Element Plus、Vue I18n、Vite

**Spec:** `docs/plans/2026-10-16-login-account-input-design.md`

## Global Constraints

- 保留“验证码登录 / 密码登录”切换。
- 手机号只接受中国大陆 11 位格式：`^1[3-9]\d{9}$`。
- 不修改 `/creator/auth/account/code`、`/creator/auth/account/login`、`/creator/auth/login` 及其现有请求结构。
- 保持登录成功后的状态写入、语言持久化、跳转、版权信息和语言切换不变。
- 不引入新依赖。

---

### Task 1: 统一账号字段与账号格式校验

**Files:**
- Modify: `src/pages/auth/login.ts`

**Interfaces:**
- Consumes: `common.pxm_login_required`、`common.pxm_login_invalid_account` 翻译键，以及现有 `authLoginIn`、`authLoginInNew`、`sendLoginCodeApiNew` 调用。
- Produces: `isValidLoginAccount(value: string): boolean`，供账号表单规则间接使用。

- [ ] **Step 1: 定义账号格式规则**

在 `LoginForm` 类型后增加邮箱、中国大陆手机号正则和纯函数：

```ts
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CHINA_PHONE_PATTERN = /^1[3-9]\d{9}$/

export function isValidLoginAccount(value: string) {
  const account = value.trim()
  return EMAIL_PATTERN.test(account) || CHINA_PHONE_PATTERN.test(account)
}
```

- [ ] **Step 2: 统一账号标签和占位符**

移除按浏览器语言选择手机号/邮箱标签的逻辑，改为：

```ts
const fieldLabel = computed(() => t("common.pxm_login_account_label"))
const fieldPlaceholder = computed(() => t("common.pxm_login_account_placeholder"))
```

- [ ] **Step 3: 为账号字段增加空值和格式校验**

定义复用的账号规则，并在两种登录模式中使用：

```ts
const accountRule = {
  validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
    const account = String(value || "").trim()
    if (!account) {
      callback(new Error(t("common.pxm_login_required")))
      return
    }
    if (!isValidLoginAccount(account)) {
      callback(new Error(t("common.pxm_login_invalid_account")))
      return
    }
    callback()
  },
  trigger: "blur"
}
```

让验证码和密码模式的 `username` 规则都使用 `accountRule`，保证登录提交前执行同一套验证。

- [ ] **Step 4: 获取验证码前校验账号表单项**

在 `sendCode` 中调用表单字段校验；失败时停止，不发请求，不启动倒计时：

```ts
try {
  await formRef.value?.validateField("username")
} catch {
  return
}
```

保留后续 `sendLoginCodeApiNew(account)` 调用和 60 秒倒计时。

- [ ] **Step 5: 清理登录逻辑中的调试内容**

移除未使用的 `ArrowDown`、`sendLoginCodeApi` 导入、调试日志、注释掉的模拟登录代码和不再成立的 TODO。保持三个现有 API 的选择、入参和成功处理不变。

- [ ] **Step 6: 执行静态构建检查**

Run: `npm run build:qa`

Expected: Vite 构建成功，无 TypeScript 或 Vue 模板错误。

### Task 2: 对齐多语言账号提示

**Files:**
- Modify: `src/locales/en-US/common.ts`
- Modify: `src/locales/zh-CN/common.ts`
- Verify: `src/locales/ko-KR/common.ts`
- Verify: `src/locales/ja/common.ts`

**Interfaces:**
- Consumes: 登录表单引用的 `pxm_login_account_label`、`pxm_login_account_placeholder`、`pxm_login_invalid_account` 键。
- Produces: 四种语言中语义一致的账号输入和格式错误反馈。

- [ ] **Step 1: 更新英文文案**

```ts
pxm_login_account_placeholder: 'Enter email or phone number',
pxm_login_invalid_account: 'Invalid email or phone number format',
```

- [ ] **Step 2: 更新中文格式错误文案**

```ts
pxm_login_invalid_account: '邮箱或手机号格式不正确',
```

保留现有 `pxm_login_account_label: '账号'` 与 `pxm_login_account_placeholder: '请输入手机号或邮箱'`。

- [ ] **Step 3: 校验日语和韩语翻译键完整性**

确认两份语言文件均已包含 `pxm_login_account_label`、`pxm_login_account_placeholder` 和 `pxm_login_invalid_account`，无需改变既有自然语言表达。

- [ ] **Step 4: 再次执行生产构建**

Run: `npm run build:qa`

Expected: 构建成功；所有翻译模块可正常解析。

### Task 3: 回归检查接口与工作区

**Files:**
- Verify: `src/api/auth.ts`
- Verify: `src/pages/auth/LoginPage.vue`
- Verify: `src/pages/auth/login.scss`

**Interfaces:**
- Consumes: Task 1 和 Task 2 的登录逻辑及文案。
- Produces: 接口不变与页面结构不变的核验结果。

- [ ] **Step 1: 检查接口路径未变化**

Run: `git diff -- src/api/auth.ts`

Expected: 无输出。

- [ ] **Step 2: 检查页面结构和样式无非必要变化**

Run: `git diff -- src/pages/auth/LoginPage.vue src/pages/auth/login.scss`

Expected: 无输出；现有验证码/密码切换、底部版权及语言切换保持原样。

- [ ] **Step 3: 检查最终变更范围**

Run: `git diff --check && git status --short`

Expected: 无空白错误；实现变更仅包含 `login.ts` 和必要的语言文件，用户提供的 `登录页面优化.md` 保持未修改。
