import type { FormInstance, FormRules } from "element-plus"
import { ElMessage } from "element-plus"
import { ArrowDown, ChatDotRound, Lock, User } from "@element-plus/icons-vue"
import { computed, defineComponent, onBeforeUnmount, reactive, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { loginApi, sendLoginCodeApi } from "@/api/auth"
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

    // 语言切换：默认用浏览器语言
    const browserLocale = (navigator.language || "zh-CN") as string
    const defaultLocale: string = SUPPORT_LOCALES.includes(browserLocale as any)
      ? browserLocale
      : browserLocale.startsWith("zh")
        ? "zh-CN"
        : "en-US"
    const currentLocale = ref<string>(getLocale() || defaultLocale)

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

    const rules: FormRules<LoginForm> = {
      username: [{ required: true, message: "请输入手机号/邮箱", trigger: "blur" }],
      password: [
        {
          validator: (_rule, value, callback) => {
            if (loginType.value === "PASSWORD" && !String(value || "").trim()) {
              callback(new Error("请输入密码"))
              return
            }
            callback()
          },
          trigger: "blur"
        }
      ],
      code: [
        {
          validator: (_rule, value, callback) => {
            if (loginType.value === "CODE" && !String(value || "").trim()) {
              callback(new Error("请输入验证码"))
              return
            }
            callback()
          },
          trigger: "blur"
        }
      ]
    }

    async function handleLogin() {
      if (submitting.value) return
      await formRef.value?.validate()
      submitting.value = true
      try {
        const account = form.username.trim()
        const { result } = await loginApi({
          username: account,
          loginType: loginType.value,
          password: loginType.value === "PASSWORD" ? form.password.trim() : undefined,
          code: loginType.value === "CODE" ? form.code.trim() : undefined
        })
        userStore.setLogin(result)
        ElMessage.success("登录成功")
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
        ElMessage.warning("请输入手机号/邮箱")
        return
      }
      sendingCode.value = true
      try {
        await sendLoginCodeApi(account)
        startCountdown()
        ElMessage.success("验证码已发送")
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
      rules,
      submitting,
      sendingCode,
      codeButtonText,
      codeButtonDisabled,
      loginType,
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
