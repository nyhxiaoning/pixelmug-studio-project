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
            <span>{{ $t('common.pxm_device_preview_devices') }}</span>
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
          <div class="preview-device-panel-head">
            {{ $t('common.pxm_device_bound') }}
          </div>
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
                  <em>{{
                    dev.online ? $t('common.pxm_device_online') : $t('common.pxm_device_offline')
                  }}</em>
                </el-checkbox>
              </div>
            </div>
          </el-checkbox-group>
        </div>
      </el-popover>

      <div>
        <el-input
          v-model="searchQuery"
          :placeholder="$t('common.pxm_search_placeholder')"
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
            <p class="sort-title">{{ $t('common.pxm_sort_by') }} <span pxm_sort_by /></p>
            <el-radio-group v-model="sortBy" @change="applySort">
              <el-radio v-for="item in sortByOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </div>
          <div class="sort-group">
            <p class="sort-title">{{ $t('common.pxm_sort_order') }} <span pxm_sort_order /></p>
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
    <template v-if="viewMode === 'grid'">
      <el-empty v-if="sortedWorkList.length === 0" description="No works yet" />
      <section v-else class="works-grid">
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
                  :title="$t('common.pxm_action_preview')"
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
                  :title="$t('common.pxm_action_delete')"
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
    </template>

    <template v-else>
      <el-empty v-if="sortedWorkList.length === 0" description="No works yet" />
      <section v-else class="works-list">
        <el-table :data="sortedWorkList" stripe style="width: 100%" @row-click="handleRowClick">
          <el-table-column :label="$t('common.pxm_column_name')" min-width="240">
            <template #default="{ row }">
              <div class="row-name">
                <div class="row-preview preview-dark-cluster">
                  <div class="dark-cluster-art">
                    <span class="mini-phone"><i /><i /><i /></span>
                    <span class="mini-phone"><i /><i /><i /></span>
                    <span class="mini-phone"><i /><i /><i /></span>
                    <span class="tiny-node n1" />
                    <span class="tiny-node n2" />
                    <span class="tiny-node n3" />
                  </div>
                  <span class="kind-icon bubble">&#9670;</span>
                </div>
                <span>{{ row.title }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_modified')" width="140">
            <template #default="{ row }">
              <span class="row-time">{{ formatDate(row.lastViewTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_created')" width="140">
            <template #default="{ row }">
              <span class="row-time">{{ row.createdAt }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_actions')" width="220" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button size="small" pxm_action_preview @click.stop="sendWorkToDevice(row)">
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  Preview
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  pxm_action_delete
                  @click.stop="handleDeleteWork(row)"
                >
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
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                  Delete
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>
  </main>
</template>

<script lang="ts" setup>
import {
  createWorkApi,
  updateWorkApi,
  deleteWorkApi,
  pageWorksApi,
  CreatorWorkVO,
} from '@/api/works'
import type { CreatorDeviceVO } from '@/api/device'
import { listDevicesApi, previewToDeviceApi } from '@/api/device'
import { uploadUserFile,uploadGif,uploadImage,uploadStaticImgCover} from "@/lib/images/uploadFile"

import {
  decodeGifFrames,
  imageFromFile,
  renderImageToPixels,
  
} from '@/modules/pixel-editor/core/image-import'

import { ref, computed, onMounted, watch } from 'vue'
import { useAppI18n } from '@/common/composables/useI18n'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const { t } = useAppI18n()

// ===================== 基础状态 =====================
const fileInputRef = ref<HTMLInputElement | null>(null)
const sortMenuOpen = ref(false)
const devicePanelOpen = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const searchQuery = ref('')

// 监听搜索关键词变化，自动触发搜索
watch(searchQuery, () => {
  pageNumber.value = 1 // 重置到第一页
  fetchWorks()
})

// 加载状态
const loading = ref(false)

// ===================== 接口数据适配 =====================
/** 作品列表条目 */
interface WorkItem {
  id: string
  title: string
  createdAt: string
  createTimeStamp: number
  lastViewTime: number
  coverUrl: string
  gifFileUrl: string
  editableFileUrl: string
  binFileSize: number
}

/** 将接口 CreatorWorkVO 适配为 UI 内部 workItem */
function toWorkItem(api: CreatorWorkVO): WorkItem {
  return {
    id: api.id,
    title: api.title,
    createdAt: formatDate(api.createTime),
    createTimeStamp: api.createTime ?? 0,
    lastViewTime: api.lastViewTime ?? api.updateTime ?? 0,
    coverUrl: api.coverUrl ?? '',
    gifFileUrl: api.gifFileUrl ?? '',
    editableFileUrl: api.editableFileUrl ?? '',
    binFileSize: api.binFileSize ?? 0,
  }
}

/** 分页参数 */
const pageNumber = ref(1)
const pageSize = ref(20)

// ============ 作品列表（来自接口） ============
const workList = ref<WorkItem[]>([])

/** 拉取作品列表 */
async function fetchWorks() {
  loading.value = true
  try {
    const params = buildSortParams()
    console.log('params.sortBy', params.sortBy)

    const res = await pageWorksApi({
      pageNumber: pageNumber.value,
      pageSize: pageSize.value,
      keyword: searchQuery.value.trim() || undefined,
      sortBy: params.sortBy,
      direction: params.sortOrder,
    })
    workList.value = (res.result?.list ?? []).map(toWorkItem)
  } catch (e) {
    console.error('fetchWorks error:', e)
    ElMessage.error(t('common.pxm_work_state_changed'))
  } finally {
    loading.value = false
  }
}

/** 将 UI 排序值映射为接口 sortBy */
function buildSortParams() {
  const map = {
    name: 'TITLE',
    createTime: 'CREATED_AT',
    lastView: 'LAST_VIEW_TIME',
  } as const
  return {
    sortBy: map[sortBy.value],
    sortOrder: sortOrder.value.toUpperCase() as 'ASC' | 'DESC',
  }
}

// ============ 排序配置 ============
const sortBy = ref<'name' | 'createTime' | 'lastView'>('lastView')
const sortByOptions = [
  { label: t('common.pxm_sort_alphabetical'), value: 'name' },
  { label: t('common.pxm_sort_date_created'), value: 'createTime' },
  { label: t('common.pxm_sort_last_viewed'), value: 'lastView' },
]
const sortOrder = ref<'asc' | 'desc'>('desc')
const sortOrderOptions = [
  { label: t('common.pxm_sort_oldest'), value: 'asc' },
  { label: t('common.pxm_sort_newest'), value: 'desc' },
]
const sortLabel = computed(() => {
  const map = {
    name: t('common.pxm_sort_alphabetical'),
    createTime: t('common.pxm_sort_date_created'),
    lastView: t('common.pxm_sort_last_viewed'),
  }
  // alert(JSON.stringify(map[sortBy.value]))
  return map[sortBy.value]
})

const applySort = () => {
  sortMenuOpen.value = false
  fetchWorks()
}

// ============ 预览设备列表（来自接口） ============
const deviceList = ref<CreatorDeviceVO[]>([])
const selectedDeviceIds = ref<string[]>([])

async function fetchDevices() {
  try {
    const res = await listDevicesApi()
    deviceList.value = res.result ?? []
    // 默认选中所有在线设备
    // selectedDeviceIds.value = deviceList.value.filter((d) => d.online === 'ONLINE').map((d) => d.id)
  } catch (e) {
    console.error('fetchDevices error:', e)
  }
}

const selectedDevices = computed(() => {
  return deviceList.value.filter((item) => selectedDeviceIds.value.includes(item.id))
})

// ============ 排序后列表（本地二次排序） ============
const sortedWorkList = computed(() => {
  let arr = [...workList.value]
  // 搜索过滤（本地兜底，接口已过滤）
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    arr = arr.filter((w) => w.title.toLowerCase().includes(q))
  }
  // 本地排序
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

// ===================== 业务事件 =====================
const triggerUpload = () => {
  fileInputRef.value?.click()
}

const formatDate = (ts: number | null | undefined): string => {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}


// Image import

/**
 * 导入静态图
 * @param event 
 */
async function handleLoadStaticImage(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  let imageFile = await imageFromFile(file)
  // await renderImageToPixels(imageFile)

  console.log(imageFile,'imageFile')
}

const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement | null
  const file = target?.files?.[0]
   let resImageInfo;
  if (!file) return

  const fileType = file.type

  if (fileType === 'image/jpeg' || fileType === 'image/png') {
    // uploadFileAction(file, UploadFileEnum.IMAGE)
     resImageInfo = await uploadImage(file);
    console.log('resImageInfo',resImageInfo)

    // await handleLoadStaticImage(e)

  } else if (fileType === 'image/gif') {
    // uploadFileAction(file, UploadFileEnum.GIF)
  } else {
    throw new Error(t('common.fileTypeError'))
  }

  target.value = ''

  // 测试STATIC
  createWorkApi({ title: file.name.split('.')[0],type:"STATIC",coverUrl:resImageInfo?.cover,editableFileUrl:"https://storage.qajeejio.com/im/bin/01KXZ5SE0VB96G95536TRF2C97/PixelMug-07-20-14-27.png",binFileUrl: resImageInfo?.binFileUrl,binFileSize:resImageInfo?.binSize})
    .then((res) => {
      const newWorkId = res.result
      ElMessage.success(t('common.pxm_upload_success'))
      fetchWorks()
      // router.push({ path: '/editor', query: { workId: newWorkId } })
    })
    .catch(() => {
      ElMessage.error(t('common.pxm_upload_failed'))
    })
  fileInputRef.value && (fileInputRef.value.value = '')
}

const goCreateEditor = () => {
  createWorkApi({ title: 'Untitled' })
    .then((res) => {
      router.push({ path: '/editor', query: { workId: res.result } })
    })
    .catch(() => {
      ElMessage.error(t('common.pxm_upload_failed'))
    })
}

const openEditWork = (work: WorkItem) => {
  updateWorkApi(work.id, { title: work.title }).catch(() => {})
  router.push({ path: '/editor', query: { workId: work.id } })
}

function handleRowClick(row: any) {
  openEditWork(row as WorkItem)
}

const sendWorkToDevice = async (work: WorkItem) => {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning(t('common.pxm_device_preview_before_bind'))
    return
  }
  try {
    const fileUrl = work.coverUrl || work.gifFileUrl || work.editableFileUrl || ''
    if (!fileUrl) {
      ElMessage.warning('作品暂无可用文件，无法预览')
      return
    }
    const res = await previewToDeviceApi({
      deviceIds: selectedDevices.value.map((d) => d.id),
      type: work.gifFileUrl ? 'GIF' : 'STATIC',
      fileUrl,
      fileSize: work.binFileSize || 0,
    })
    const failed = (res.result ?? []).filter((r) => !r.success)
    if (failed.length === 0) {
      // ElMessage.success(
      //   `【预览推送】作品《${work.title}》下发至：${selectedDevices.value.map((d) => d.name).join('、')}`
      // )
    } else {
      ElMessage.warning(`部分设备推送失败：${failed.map((f) => f.message).join('；')}`)
    }
  } catch (e) {
    console.error('preview error:', e)
    ElMessage.error(t('common.pxm_device_preview_push_error'))
  }
}

const handleDeleteWork = (work: WorkItem) => {
  ElMessageBox.confirm(`确定要删除作品【${work.title}】吗？删除后不可恢复！`, '删除提示', {
    confirmButtonText: t('common.pxm_common_confirm'),
    cancelButtonText: t('common.pxm_common_cancel'),
    type: 'warning',
  })
    .then(() => {
      return deleteWorkApi(work.id)
    })
    .then(() => {
      return fetchWorks()
    })
    .then(() => {
      ElMessage.success(t('common.pxm_delete_success'))
    })
    .catch((e) => {
      if (e !== 'cancel') {
        console.error('delete work failed:', e)
        ElMessage.error(t('common.pxm_delete_failed'))
      }
    })
}

// 初始化
onMounted(() => {
  fetchWorks()
  fetchDevices()
})
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

/* ============== List View (el-table) Styles ============== */
.works-list .row-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.works-list .row-preview {
  width: 44px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.works-list .row-preview .dark-cluster-art {
  transform: scale(0.55);
}

.works-list .kind-icon {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 11px;
  color: #6b7280;
}

.works-list .kind-icon.bubble {
  background: #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.works-list .row-time {
  font-size: 13px;
  color: #6b7280;
}

.works-list .row-actions {
  display: flex;
  gap: 8px;
}
</style>
