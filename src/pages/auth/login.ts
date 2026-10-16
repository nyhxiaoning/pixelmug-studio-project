import type { FormInstance, FormItemRule, FormRules } from "element-plus"
import { ElMessage } from "element-plus"
import { ChatDotRound, Lock, User } from "@element-plus/icons-vue"
import { computed, defineComponent, onBeforeUnmount, reactive, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { authLoginIn, authLoginInNew, sendLoginCodeApiNew } from "@/api/auth"
import { useUserStore } from "@/pinia/modules/user"
import {
  SUPPORT_LOCALES,
  getBrowserLocale,
  getLocale,
  getLocaleDisplayName,
  setLocale
} from "@/locales"
import type { SupportLocale } from "@/locales"
import { useAppI18n } from "@/common/composables/useI18n.ts"

interface LoginForm {
  username: string
  password: string
  code: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CHINA_PHONE_PATTERN = /^1[3-9]\d{9}$/

export function isValidLoginAccount(value: string) {
  const account = value.trim()
  return EMAIL_PATTERN.test(account) || CHINA_PHONE_PATTERN.test(account)
}

interface LocaleOption {
  value: SupportLocale
  label: string
}

export default defineComponent({
  name: "LoginPage",
  setup() {
    const { t } = useAppI18n()
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
      codeCountdown.value > 0 ? `${codeCountdown.value}s` : t("common.pxm_login_get_code")
    )
    const codeButtonDisabled = computed(() => sendingCode.value || codeCountdown.value > 0)

    const fieldLabel = computed(() => t("common.pxm_login_account_label"))
    const fieldPlaceholder = computed(() => t("common.pxm_login_account_placeholder"))
    const secondLabel = computed(() =>
      loginType.value === "CODE" ? t("common.pxm_login_code_label") : t("common.pxm_login_password_label")
    )
    const secondPlaceholder = computed(() =>
      loginType.value === "CODE"
        ? t("common.pxm_login_code_placeholder")
        : t("common.pxm_login_password_placeholder")
    )

    // 每次进入登录页都跟随当前浏览器语言，登录成功后再持久化。
    const browserLocale = getBrowserLocale()
    setLocale(browserLocale, false)
    const currentLocale = ref<SupportLocale>(browserLocale)

    const localeOptions = computed<LocaleOption[]>(() =>
      SUPPORT_LOCALES.map((loc) => ({
        value: loc,
        label: getLocaleDisplayName(loc)
      }))
    )

    function handleLocaleChange(locale: SupportLocale) {
      setLocale(locale, false)
      currentLocale.value = locale
    }

    const form = reactive<LoginForm>({
      username: "",
      password: "",
      code: ""
    })

    const getRules = computed<FormRules<LoginForm>>(() => {
      const accountRule: FormItemRule = {
        validator: (_rule, value, callback) => {
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

      if (loginType.value === "CODE") {
        return {
          username: [accountRule],
          password: [],
          code: [
            {
              validator: (_rule, value, callback) => {
                if (!String(value || "").trim()) {
                  callback(new Error(t("common.pxm_login_required")))
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
        username: [accountRule],
        password: [
          {
            validator: (_rule, value, callback) => {
              if (!String(value || "").trim()) {
                callback(new Error(t("common.pxm_login_required")))
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
      if (submitting.value) return
      await formRef.value?.validate()
      submitting.value = true
      try {
        const account = form.username.trim()
        userStore.loginUserName = account
        let res
        if (loginType.value === "PASSWORD") {
          res = await authLoginIn({
            username: account,
            loginType: loginType.value,
            password: form.password.trim(),
            code: undefined
          })
        } else {
          res = await authLoginInNew({
            account,
            loginType: loginType.value,
            password: "",
            code: form.code.trim()
          })
        }

        userStore.setLogin(res?.result)
        userStore.avatar = res?.result?.avatar
        setLocale(getLocale())
        ElMessage.success(t("common.pxm_login_success"))
        const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/works"
        router.replace(redirect)
      } catch {
        ElMessage.error(t("common.pxm_login_failed"))
        submitting.value = false
      }
    }

    async function sendCode() {
      if (codeButtonDisabled.value) return
      if (!formRef.value) return
      try {
        await formRef.value.validateField("username")
      } catch {
        return
      }

      const account = form.username.trim()
      sendingCode.value = true

      try {
        await sendLoginCodeApiNew(account)
        startCountdown()
        ElMessage.success(t("common.pxm_login_code_sent"))
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
      handleLogin,
      sendCode,
      currentLocale,
      localeOptions,
      handleLocaleChange
    }
  }
})
