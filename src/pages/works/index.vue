<template>
  <main class="content">
    <!-- 顶部标题栏 -->
    <header class="topbar">
      <h1 class="work-title">Works</h1>
      <div class="top-actions">
        <!-- Upload 上传按钮 pxm_action_upload -->
        <el-button pxm_action_upload @click="triggerUpload">
          <template #icon>
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
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </template>
          Upload
        </el-button>
        <!-- Create 创建空白作品 pxm_action_create -->
        <el-button type="primary" pxm_action_create @click="goCreateEditor">
          <template #icon>
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
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </template>
          Create
        </el-button>
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
      <!-- 预览设备选择器 el-popover -->
      <el-popover
        v-model:visible="devicePanelOpen"
        placement="bottom-start"
        trigger="click"
        width="260"
      >
        <template #reference>
          <div class="preview-device-trigger">
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
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </template>
        <div>
          <div class="preview-device-panel-head">Bound</div>
          <el-checkbox-group v-model="selectedDeviceIds">
            <div class="device-list">
              <div
                v-for="dev in deviceList"
                :key="dev.id"
                class="device-item"
                :class="{ offline: !dev.online }"
              >
                <el-checkbox :label="dev.id" :disabled="!dev.online">
                  <span :class="['device-dot', dev.online ? 'online' : 'offline']" />
                  <span class="device-name">{{ dev.name }}</span>
                  <em>{{ dev.online ? 'Online' : 'Offline' }}</em>
                </el-checkbox>
              </div>
            </div>
          </el-checkbox-group>
        </div>
      </el-popover>

      <div>
        <el-input
          v-model="searchQuery"
          placeholder="Search works..."
          clearable
          class="works-search"
        >
          <template #prefix>
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
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </template>
        </el-input>
      </div>

      <div class="toolbar">
        <!-- 搜索框 -->

        <!-- 排序下拉 popover -->
        <el-popover
          v-model:visible="sortMenuOpen"
          placement="bottom-start"
          trigger="click"
          width="240"
        >
          <template #reference>
            <el-button @click.stop>
              {{ sortLabel }}
              <svg
                style="margin-left: 4px"
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </el-button>
          </template>

          <div class="sort-group">
            <p class="sort-title">排序方式 <span pxm_sort_by /></p>
            <el-radio-group v-model="sortBy" @change="applySort">
              <el-radio v-for="item in sortByOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </div>
          <div class="sort-group">
            <p class="sort-title">顺序 <span pxm_sort_order /></p>
            <el-radio-group v-model="sortOrder" @change="applySort">
              <el-radio v-for="item in sortOrderOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </div>
        </el-popover>

        <!-- 视图切换：el-radio-group 按钮组 -->
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button label="grid">
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
            >
              <path d="M12 3v18" />
              <path d="M3 12h18" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </el-radio-button>
          <el-radio-button label="list">
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
            >
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
              <path d="M3 6h.01" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M8 6h13" />
            </svg>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 作品列表区域 -->
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
            <el-button size="small" pxm_action_edit @click.stop="openEditWork(work)">
              Edit
            </el-button>
            <div class="card-icon-actions">
              <el-button
                circle
                size="small"
                pxm_action_preview
                title="Preview"
                @click.stop="sendWorkToDevice(work)"
              >
                <template #icon>
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
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </template>
              </el-button>
              <el-button
                circle
                size="small"
                type="danger"
                pxm_action_delete
                title="Delete"
                @click.stop="handleDeleteWork(work)"
              >
                <template #icon>
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
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                </template>
              </el-button>
            </div>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

// ===================== 基础状态 =====================
const fileInputRef = ref(null)
const sortMenuOpen = ref(false)
const devicePanelOpen = ref(false)
const viewMode = ref('grid')
const searchQuery = ref('')

// ============ 排序配置 ============
const sortBy = ref('lastView')
const sortByOptions = [
  { label: '按字母', value: 'name' },
  { label: '创建日期', value: 'createTime' },
  { label: '最近查看', value: 'lastView' },
]
const sortOrder = ref('desc')
const sortOrderOptions = [
  { label: '最旧优先', value: 'asc' },
  { label: '最新优先', value: 'desc' },
]
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
const selectedDeviceIds = ref([1, 2])
const selectedDevices = computed(() => {
  return deviceList.value.filter((item) => selectedDeviceIds.value.includes(item.id))
})

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
  {
    id: 4,
    title: '星空动画',
    createdAt: '2026.07.20',
    createTimeStamp: new Date('2026-07-20').getTime(),
    lastViewTime: new Date('2026-08-08').getTime(),
  },
  {
    id: 5,
    title: '像素小猫',
    createdAt: '2026.06.15',
    createTimeStamp: new Date('2026-06-15').getTime(),
    lastViewTime: new Date('2026-08-05').getTime(),
  },
  {
    id: 6,
    title: '星空动画',
    createdAt: '2026.07.20',
    createTimeStamp: new Date('2026-07-20').getTime(),
    lastViewTime: new Date('2026-08-08').getTime(),
  },
  {
    id: 7,
    title: '像素小猫',
    createdAt: '2026.06.15',
    createTimeStamp: new Date('2026-06-15').getTime(),
    lastViewTime: new Date('2026-08-05').getTime(),
  },
])

const sortedWorkList = computed(() => {
  let arr = [...workList.value]
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    arr = arr.filter((w) => w.title.toLowerCase().includes(q))
  }
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

// ===================== 业务事件 =====================
const triggerUpload = () => {
  fileInputRef.value.click()
}
const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const newWork = {
    id: Date.now(),
    title: file.name.split('.')[0],
    createdAt: new Date().toLocaleDateString().replaceAll('/', '.'),
    createTimeStamp: Date.now(),
    lastViewTime: Date.now(),
  }
  workList.value.unshift(newWork)
  fileInputRef.value.value = ''
  ElMessage.success('图片上传成功，已生成新作品')
}

const goCreateEditor = () => {
  router.push('/editor')
}

const openEditWork = (work) => {
  work.lastViewTime = Date.now()
  router.push({ path: '/editor', query: { workId: work.id } })
}

const sendWorkToDevice = (work) => {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning('请至少选择一台预览设备！')
    return
  }
  console.log('推送作品到设备', work, selectedDevices.value)
  ElMessage.success(
    `【预览推送】作品《${work.title}》下发至：${selectedDevices.value.map((d) => d.name).join('、')}`
  )
}

const handleDeleteWork = (work) => {
  ElMessageBox.confirm(`确定要删除作品【${work.title}】吗？删除后不可恢复！`, '删除提示', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      const idx = workList.value.findIndex((w) => w.id === work.id)
      if (idx > -1) workList.value.splice(idx, 1)
      ElMessage.success('作品已删除')
    })
    .catch(() => {})
}
</script>

<style lang="css" scoped>
.content {
  padding: 20px;
  color: #374151;
  background: #fff;
  min-height: 100vh;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid #e4e4e7;
  margin-bottom: 16px;
}
.work-title {
  font-size: 24px;
  font-weight: 600;
  color: #27272a;
  margin: 0;
}
.top-actions {
  display: flex;
  gap: 10px;
}
.hidden-file-input {
  display: none;
}

.filterbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.preview-device-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f3f4f6;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
}
.preview-device-trigger strong {
  color: #111827;
  font-weight: 600;
}
.preview-device-trigger svg {
  color: #6b7280;
}

.preview-device-panel-head {
  padding: 6px 4px;
  color: #9ca3af;
  font-size: 12px;
}
.device-list {
  margin-top: 4px;
}
.device-item {
  padding: 4px 0;
}
.device-item.offline {
  opacity: 0.45;
}

.device-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
}
.device-dot.online {
  background: #22c55e;
}
.device-dot.offline {
  background: #d1d5db;
}
.device-name {
  font-weight: 400;
}
.device-item em {
  font-style: normal;
  font-size: 12px;
  color: #6b7280;
  margin-left: 6px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sort-group {
  margin-bottom: 10px;
}
.sort-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}
.works-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.works-list .work-card {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.works-list .work-card .preview {
  width: 100px;
  flex-shrink: 0;
}

.work-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: 0.2s;
}
.work-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.preview {
  height: 140px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
}
.work-meta {
  padding: 12px;
  color: #374151;
}
.work-meta h2 {
  margin: 0;
  font-size: 15px;
  color: #111827;
}
.work-meta p {
  margin: 4px 0 10px;
  color: #6b7280;
  font-size: 12px;
}
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-icon-actions {
  display: flex;
  gap: 6px;
}
</style>
