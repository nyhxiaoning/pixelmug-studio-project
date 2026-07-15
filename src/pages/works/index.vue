<template>
  <main class="content">
    <!-- 顶部标题栏 -->
    <header class="topbar">
      <span class="work-tilte">Works</span>
      <div class="top-actions">
        <!-- Upload 上传按钮 pxm_action_upload -->
        <button
          class="ui-button ui-button-subtle ui-button-default action-button"
          pxm_action_upload
          @click="triggerUpload"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-upload"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          Upload
        </button>
        <!-- Create 创建空白作品 pxm_action_create -->
        <button
          class="ui-button ui-button-dark ui-button-default action-button"
          pxm_action_create
          @click="goCreateEditor"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-plus"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Create
        </button>
        <!-- 隐藏文件上传input -->
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="handleFileUpload"
        />
      </div>
    </header>

    <!-- 筛选工具栏区域 -->
    <div class="filterbar">
      <!-- 预览设备选择器 -->
      <div class="preview-device-selector">
        <button
          class="preview-device-trigger"
          type="button"
          @click="devicePanelOpen = !devicePanelOpen"
        >
          <span>Preview devices</span>
          <strong>{{ selectedDevices.map((d) => d.name).join('、') }}</strong>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-chevron-down"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div
          v-if="devicePanelOpen"
          class="preview-device-panel"
          role="menu"
          aria-label="Choose device"
        >
          <div class="preview-device-panel-head">Bound</div>
          <button
            v-for="dev in deviceList"
            :key="dev.id"
            :class="[
              selectedDevices.some((s) => s.id === dev.id) ? 'selected' : '',
              dev.online ? '' : 'offline',
            ]"
            type="button"
            @click="toggleDeviceSelect(dev)"
          >
            <span :class="['device-dot', dev.online ? 'online' : 'offline']" />
            <span class="device-name">{{ dev.name }}</span>
            <em>{{ dev.online ? 'Online' : 'Offline' }}</em>
            <svg
              v-if="selectedDevices.some((s) => s.id === dev.id)"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-check"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
        </div>
      </div>

      <div class="toolbar">
        <!-- 排序下拉按钮 pxm_sort_by 弹窗 -->
        <button
          class="ui-button ui-button-subtle ui-button-default sort-button"
          type="button"
          aria-haspopup="menu"
          :aria-expanded="sortMenuOpen"
          @click="sortMenuOpen = !sortMenuOpen"
        >
          {{ sortLabel }}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-chevron-down"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <!-- 排序菜单弹窗 -->
        <div v-if="sortMenuOpen" class="sort-dropdown-panel">
          <div class="sort-group">
            <p class="sort-title">排序方式 <span pxm_sort_by /></p>
            <label v-for="item in sortByOptions" :key="item.value">
              <input v-model="sortBy" type="radio" :value="item.value" @change="applySort" />
              {{ item.label }}
            </label>
          </div>
          <div class="sort-group">
            <p class="sort-title">顺序 <span pxm_sort_order /></p>
            <label v-for="item in sortOrderOptions" :key="item.value">
              <input v-model="sortOrder" type="radio" :value="item.value" @change="applySort" />
              {{ item.label }}
            </label>
          </div>
        </div>

        <!-- 视图切换：网格/列表 -->
        <div class="view-toggle" role="group" aria-label="View mode">
          <button
            :class="viewMode === 'grid' ? 'active' : ''"
            aria-label="Grid view"
            @click="viewMode = 'grid'"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-grid2x2"
            >
              <path d="M12 3v18" />
              <path d="M3 12h18" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
          <button
            :class="viewMode === 'list' ? 'active' : ''"
            aria-label="List view"
            @click="viewMode = 'list'"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-list"
            >
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
              <path d="M3 6h.01" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M8 6h13" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 作品列表区域 根据viewMode切换样式 -->
    <section :class="viewMode === 'grid' ? 'works-grid' : 'works-list'">
      <article
        v-for="work in sortedWorkList"
        :key="work.id"
        class="work-card clickable-work"
        tabindex="0"
        @click="openEditWork(work)"
      >
        <div class="preview preview-dark-cluster">
          <div class="dark-cluster-art">
            <span class="mini-phone"><i /><i /><i /></span>
            <span class="mini-phone"><i /><i /><i /></span>
            <span class="mini-phone"><i /><i /><i /></span>
            <span class="tiny-node n1" />
            <span class="tiny-node n2" />
            <span class="tiny-node n3" />
          </div>
        </div>
        <div class="work-meta">
          <div>
            <h2>{{ work.title }}</h2>
            <p>{{ work.createdAt }}</p>
          </div>
          <div class="card-actions">
            <!-- Edit按钮 pxm_action_edit -->
            <button class="card-primary-action" pxm_action_edit @click.stop="openEditWork(work)">
              Edit
            </button>
            <div class="card-icon-actions">
              <!-- Preview pxm_action_preview -->
              <button
                class="card-icon-action"
                title="Preview"
                aria-label="Preview"
                pxm_action_preview
                @click.stop="sendWorkToDevice(work)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-upload"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </button>
              <!-- Delete pxm_action_delete -->
              <button
                class="card-icon-action card-danger-action"
                title="Delete"
                aria-label="Delete"
                pxm_action_delete
                @click.stop="handleDeleteWork(work)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-trash2"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

// ===================== 基础状态 =====================
const fileInputRef = ref(null)
const sortMenuOpen = ref(false)
const devicePanelOpen = ref(false)
// 视图模式 grid / list
const viewMode = ref('grid')

// ============ 排序配置 需求a、b ============
/** pxm_sort_by 排序方式 */
const sortBy = ref('lastView')
const sortByOptions = [
  { label: '按字母', value: 'name' },
  { label: '创建日期', value: 'createTime' },
  { label: '最近查看', value: 'lastView' },
]
/** pxm_sort_order 顺序 */
const sortOrder = ref('desc')
const sortOrderOptions = [
  { label: '最旧优先', value: 'asc' },
  { label: '最新优先', value: 'desc' },
]
// 显示当前排序名称
const sortLabel = computed(() => {
  const map = {
    name: '按字母',
    createTime: '创建日期',
    lastView: 'Last viewed',
  }
  return map[sortBy.value]
})

// ============ 预览设备列表 ============
const deviceList = ref([
  { id: 1, name: 'Bubble Pixel Pro', online: true },
  { id: 2, name: 'Desk LED 32x16', online: true },
  { id: 3, name: 'Studio Wall', online: false },
])
const selectedDevices = ref([
  { id: 1, name: 'Bubble Pixel Pro' },
  { id: 2, name: 'Desk LED 32x16' },
])
// 切换设备选中
const toggleDeviceSelect = (dev) => {
  const idx = selectedDevices.value.findIndex((d) => d.id === dev.id)
  if (idx > -1) {
    selectedDevices.value.splice(idx, 1)
  } else {
    selectedDevices.value.push(dev)
  }
}

// ============ 作品原始数据 & 排序计算 ============
const workList = ref([
  {
    id: 1,
    title: '水印模板',
    createdAt: '2026.08.01',
    createTimeStamp: new Date('2026-08-01').getTime(),
    lastViewTime: new Date('2026-08-10').getTime(),
  },
  {
    id: 2,
    title: '星空动画',
    createdAt: '2026.07.20',
    createTimeStamp: new Date('2026-07-20').getTime(),
    lastViewTime: new Date('2026-08-08').getTime(),
  },
  {
    id: 3,
    title: '像素小猫',
    createdAt: '2026.06.15',
    createTimeStamp: new Date('2026-06-15').getTime(),
    lastViewTime: new Date('2026-08-05').getTime(),
  },
])

// 排序后作品列表
const sortedWorkList = computed(() => {
  const arr = [...workList.value]
  arr.sort((a, b) => {
    let valA, valB
    if (sortBy.value === 'name') {
      valA = a.title
      valB = b.title
      return sortOrder.value === 'asc'
        ? valA.localeCompare(valB, 'zh-CN')
        : valB.localeCompare(valA, 'zh-CN')
    } else if (sortBy.value === 'createTime') {
      valA = a.createTimeStamp
      valB = b.createTimeStamp
    } else {
      // lastView 最近查看
      valA = a.lastViewTime
      valB = b.lastViewTime
    }
    return sortOrder.value === 'asc' ? valA - valB : valB - valA
  })
  return arr
})
const applySort = () => {
  sortMenuOpen.value = false
}

// ===================== 业务事件实现 a~h =====================
/** d. 点击Upload唤起文件选择 pxm_action_upload */
const triggerUpload = () => {
  fileInputRef.value.click()
}
/** 处理图片上传，生成新作品放到列表顶部 */
const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  // 模拟上传接口，新建作品插入数组头部
  const newWork = {
    id: Date.now(),
    title: file.name.split('.')[0],
    createdAt: new Date().toLocaleDateString().replaceAll('/', '.'),
    createTimeStamp: Date.now(),
    lastViewTime: Date.now(),
  }
  workList.value.unshift(newWork)
  // 清空input防止重复选同一文件不触发change
  fileInputRef.value.value = ''
}

/** e. Create 创建空白作品，跳转编辑器 pxm_action_create */
const goCreateEditor = () => {
  router.push('/editor')
}

/** f. 卡片点击 / Edit按钮，打开编辑 pxm_action_edit */
const openEditWork = (work) => {
  // 更新最近查看时间
  work.lastViewTime = Date.now()
  router.push({ path: '/editor', query: { workId: work.id } })
}

/** g. Preview：推送到选中设备 pxm_action_preview */
const sendWorkToDevice = (work) => {
  if (selectedDevices.value.length === 0) {
    alert('请至少选择一台预览设备！')
    return
  }
  console.log('推送作品到设备', work, selectedDevices.value)
  alert(
    `【预览推送】作品《${work.title}》下发至：${selectedDevices.value.map((d) => d.name).join('、')}`
  )
}

/** h. 删除作品 pxm_action_delete 弹窗确认 */
const handleDeleteWork = (work) => {
  const confirmDel = window.confirm(`确定要删除作品【${work.title}】吗？删除后不可恢复！`)
  if (confirmDel) {
    const idx = workList.value.findIndex((w) => w.id === work.id)
    if (idx > -1) workList.value.splice(idx, 1)
  }
}

// 点击外部关闭下拉菜单（简易方案，生产可封装clickOutside指令）
document.addEventListener('click', (ev) => {
  setTimeout(() => {
    sortMenuOpen.value = false
    devicePanelOpen.value = false
  }, 200)
})
</script>

<style scoped src="./index.css"></style>
