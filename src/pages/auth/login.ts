import type { FormInstance, FormRules } from "element-plus"
import { ElMessage } from "element-plus"
import { ArrowDown, ChatDotRound, Lock, User } from "@element-plus/icons-vue"
import { computed, defineComponent, onBeforeUnmount, reactive, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { loginApi, sendLoginCodeApi, authLoginIn } from "@/api/auth"
import { useUserStore } from "@/pinia/modules/user"
import { SUPPORT_LOCALES, getLocale, getLocaleDisplayName, setLocale } from "@/locales"

interface LoginForm {
  username: string
  password: string
  code: string
}

interface LocaleOption {
  value: string
  label: string
}

export default defineComponent({
  name: "LoginPage",
  setup() {
    const route = useRoute()
    const router = useRouter()
    const userStore = useUserStore()
    const formRef = ref<FormInstance>()
    const submitting = ref(false)
    const sendingCode = ref(false)
    const codeCountdown = ref(0)
    let countdownTimer: ReturnType<typeof window.setInterval> | undefined
    const loginType = ref<"CODE" | "PASSWORD">("CODE")
    const codeButtonText = computed(() =>
      codeCountdown.value > 0 ? `${codeCountdown.value}s` : "发送验证码"
    )
    const codeButtonDisabled = computed(() => sendingCode.value || codeCountdown.value > 0)

    // 动态标签文案：根据当前选中的语言环境
    const isEnLocale = computed(() => {
      const locale = (currentLocale.value || (navigator.language || "zh-CN")).toLowerCase()
      return locale.startsWith("en")
    })

    const fieldLabel = computed(() =>
      loginType.value === "CODE"
        ? isEnLocale.value
          ? "Email"
          : "手机号 / 邮箱"
        : "账 号"
    )
    const fieldPlaceholder = computed(() =>
      loginType.value === "CODE"
        ? isEnLocale.value
          ? "Please enter email"
          : "请输入手机号 / 邮箱"
        : "请输入账号"
    )
    const secondLabel = computed(() =>
      loginType.value === "CODE" ? "验证码" : "密码"
    )
    const secondPlaceholder = computed(() =>
      loginType.value === "CODE"
        ? isEnLocale.value
          ? "Please enter verification code"
          : "请输入验证码"
        : isEnLocale.value
          ? "Please enter password"
          : "请输入密码"
    )

    // 语言切换：默认用浏览器语言
    const browserLocale = (navigator.language || "zh-CN") as string
    const defaultLocale: string = SUPPORT_LOCALES.includes(browserLocale as any)
      ? browserLocale
      : browserLocale.startsWith("zh")
        ? "zh-CN"
        : "en-US"
    const currentLocale = ref((getLocale() || defaultLocale) as string)

    const localeOptions = computed<LocaleOption[]>(() =>
      SUPPORT_LOCALES.map((loc) => ({
        value: loc,
        label: getLocaleDisplayName(loc)
      }))
    )

    function handleLocaleChange(locale: string) {
      setLocale(locale as any)
      currentLocale.value = locale
      window.location.reload()
    }

    const form = reactive<LoginForm>({
      username: "",
      password: "",
      code: ""
    })

    const getRules = computed<FormRules<LoginForm>>(() => {
      if (loginType.value === "CODE") {
        return {
          username: [
            { required: true, message: isEnLocale.value ? "Please enter email" : "请输入手机号/邮箱", trigger: "blur" }
          ],
          password: [],
          code: [
            {
              validator: (_rule, value, callback) => {
                if (!String(value || "").trim()) {
                  callback(new Error(isEnLocale.value ? "Please enter verification code" : "请输入验证码"))
                  return
                }
                callback()
              },
              trigger: "blur"
            }
          ]
        }
      }
      return {
        username: [{ required: true, message: "请输入账号", trigger: "blur" }],
        password: [
          {
            validator: (_rule, value, callback) => {
              if (!String(value || "").trim()) {
                callback(new Error(isEnLocale.value ? "Please enter password" : "请输入密码"))
                return
              }
              callback()
            },
            trigger: "blur"
          }
        ],
        code: []
      }
    })

    async function handleLogin() {
      ElMessage.success(isEnLocale.value ? "Login successful" : "登录成功")
      // const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/settings"
      // router.replace(redirect)
      // return;
      if (submitting.value) return
      await formRef.value?.validate()
      submitting.value = true
      try {
        const account = form.username.trim()
        console.log('account', account, loginType.value, form.password.trim(), 'form---')
        const { result } = await authLoginIn({
          username: account,
          loginType: loginType.value,
          password: loginType.value === "PASSWORD" ? form.password.trim() : undefined,
          code: loginType.value === "CODE" ? form.code.trim() : undefined
        })
        userStore.setLogin(result)
        ElMessage.success(isEnLocale.value ? "Login successful" : "登录成功")
        const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/settings"
        router.replace(redirect)
      } finally {
        submitting.value = false
      }
    }

    async function sendCode() {
      if (codeButtonDisabled.value) return
      const account = form.username.trim()
      if (!account) {
        ElMessage.warning(isEnLocale.value ? "Please enter email" : "请输入手机号/邮箱")
        return
      }
      sendingCode.value = true

      alert(JSON.stringify(account))
      try {
        let res = await sendLoginCodeApi(account)
        alert(JSON.stringify(res))
        // 验证码倒计时
        startCountdown()
        ElMessage.success(isEnLocale.value ? "Verification code sent" : "验证码已发送")
      } finally {
        sendingCode.value = false
      }
    }

    function startCountdown() {
      clearCountdown()
      codeCountdown.value = 60
      countdownTimer = window.setInterval(() => {
        codeCountdown.value -= 1
        if (codeCountdown.value <= 0) {
          clearCountdown()
        }
      }, 1000)
    }

    function clearCountdown() {
      if (countdownTimer) {
        window.clearInterval(countdownTimer)
        countdownTimer = undefined
      }
      if (codeCountdown.value < 0) {
        codeCountdown.value = 0
      }
    }

    onBeforeUnmount(clearCountdown)

    return {
      formRef,
      form,
      getRules,
      submitting,
      sendingCode,
      codeButtonText,
      codeButtonDisabled,
      loginType,
      fieldLabel,
      fieldPlaceholder,
      secondLabel,
      secondPlaceholder,
      User,
      Lock,
      ChatDotRound,
      ArrowDown,
      handleLogin,
      sendCode,
      currentLocale,
      localeOptions,
      handleLocaleChange
    }
  }
})
