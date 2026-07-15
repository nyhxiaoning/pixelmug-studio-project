import { computed, defineComponent, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
// import { ADMIN_MENUS, isMenuGroup, type AdminMenuEntry, type AdminMenuItem } from "/shared/manage-menu"
import { useUserStore } from "@/pinia/modules/user"

export default defineComponent({
  name: "AdminLayout",
  setup() {
    const route = useRoute()
    const router = useRouter()
    const userStore = useUserStore()
    const collapsedGroups = ref<string[]>([])

    const menu = computed<AdminMenuEntry[]>(() => {
      const entries: AdminMenuEntry[] = []
      ADMIN_MENUS.forEach((item) => {
        if (!isMenuGroup(item)) {
          if (userStore.canAccess(item.module)) entries.push(item)
          return
        }
        const children = item.children.filter((child) => userStore.canAccess(child.module))
        if (children.length) entries.push({ ...item, children })
      })
      return entries
    })

    function isActive(item: AdminMenuItem) {
      return route.meta.module === item.module
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
        userStore.logout()
        router.push("/login")
      }
    }

    return {
      route,
      menu,
      isMenuGroup,
      isActive,
      isGroupActive,
      isGroupExpanded,
      toggleGroup,
      handleUserCommand
    }
  }
})
