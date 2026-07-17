import { computed, defineComponent, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ADMIN_MENUS, isMenuGroup, type AdminMenuEntry, type AdminMenuItem } from "@/shared/manage-menu"
import { useUserStore } from "@/pinia/modules/user"
import { MoreFilled, Place, SwitchButton } from "@element-plus/icons-vue"
import { getLocale, getLocaleDisplayName, setLocale, toggleLocale } from "@/locales"
import { sendLoginOut } from "@/api/auth"
import { useAppI18n } from '@@/composables/useI18n'




export default defineComponent({
  name: "AdminLayout",
  components: { MoreFilled, Place, SwitchButton },
  setup() {
    const { t, changeLocale, switchLocale, getCurrentLocale, formatDate } = useAppI18n()
    const route = useRoute()
    const router = useRouter()
    const userStore = useUserStore()
    const collapsedGroups = ref<string[]>([])

    const menu = computed<AdminMenuEntry[]>(() => {
      const entries: AdminMenuEntry[] = []
      ADMIN_MENUS.forEach((item) => {
        entries.push(item)
      })
      return entries
    })

    const localeName = computed(() => getLocaleDisplayName(getLocale()))

    function isActive(item: AdminMenuItem) {
      return route.path === item?.path
    }

    function isGroupActive(item: AdminMenuEntry) {
      return isMenuGroup(item) && item.children.some((child) => isActive(child))
    }

    function isGroupExpanded(item: AdminMenuEntry) {
      return isMenuGroup(item) && !collapsedGroups.value.includes(item.title)
    }

    function toggleGroup(item: AdminMenuEntry) {
      if (!isMenuGroup(item)) return
      if (collapsedGroups.value.includes(item.title)) {
        collapsedGroups.value = collapsedGroups.value.filter((title) => title !== item.title)
      } else {
        collapsedGroups.value = [...collapsedGroups.value, item.title]
      }
    }

    function handleUserCommand(command: string) {
      if (command === "logout") {
        // alert(111111)
        userStore.logout()
        router.push("/login")
      } else if (command === "language") {
        const current = getLocale()
        const next = current === "zh-CN" ? "en-US" : "zh-CN"
        setLocale(next)
        window.location.reload()
      }
    }


    function handleLogout() {
      sendLoginOut(userStore?.token).then(res => {
        userStore.logout()

        router.push("/login")
      }).catch(err => {
        console.log(err)
      })

    }


    function handleChangeLang(item: string) {
      toggleLocale()


      alert(t('common.pxm_account_language'))
      switchLocale()
    }


    return {
      route,
      menu,
      isMenuGroup,
      isActive,
      isGroupActive,
      isGroupExpanded,
      toggleGroup,
      userId: userStore.userId,
      userName: userStore.name,
      localeName,
      handleUserCommand,
      handleLogout,
      handleChangeLang
    }
  }
})
