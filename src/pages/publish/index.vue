<template>
  <main class="content">
    <!-- 顶部标题区域 a -->
    <header class="topbar community-topbar">
      <div>
        <h1>{{ $t("common.pxm_publish_title") }}</h1>
        <p>{{ $t("common.pxm_publish_subtitle") }}</p>
      </div>
      <el-button class="black-btn" type="primary" @click="openResourceDialog">
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
        <span >{{ $t("common.pxm_publish_apply") }}</span>
      </el-button>
    </header>

    <section class="community-page">
      <!-- 统计卡片区域 b -->
      <div class="community-stats">
        <div class="stat-card">
          <strong pxm_publish_stats_live>{{ statData.live }}</strong>
          <span>{{ $t("common.pxm_publish_stats_live") }}</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_review>{{ statData.review }}</strong>
          <span>{{ $t("common.pxm_publish_stats_review") }}</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_draft>{{ statData.draft }}</strong>
          <span>{{ $t("common.pxm_publish_stats_draft") }}</span>
        </div>
      </div>

      <section class="community-section">
        <div class="community-section-head">
          <h2>{{ $t("common.pxm_publish_management") }}</h2>
          <div class="community-status-filter">
            <span>{{ $t("common.pxm_publish_status_filter") }}</span>
            <el-select
              v-model="queryParams.status"
              :placeholder="$t('common.pxm_publish_all_statuses')"
              pxm_publish_status_filter
              @change="loadTableData"
            >
              <el-option :label="$t('common.pxm_publish_all_statuses')" value="all" />
              <el-option :label="$t('common.pxm_publish_status_pending')" value="reviewing" />
              <el-option :label="$t('common.pxm_publish_status_live')" value="published" />
              <el-option :label="$t('common.pxm_publish_status_rejected')" value="rejected" />
              <el-option :label="$t('common.pxm_publish_status_offline')" value="offline" />
            </el-select>
          </div>
        </div>

        <!-- 发布管理表格 -->
        <el-empty v-if="tableData.length === 0" description="No works yet" />
        <el-table v-else :data="tableData" stripe style="width: 100%">
          <el-table-column :label="$t('common.pxm_publish_files')" min-width="280">
            <template #default="{ row }">
              <div class="publish-name">
                <div class="publish-thumb" />
                <div>
                  <h3>{{ row.name }}</h3>
                  <em v-if="row.rejectReason" class="reject-tip">{{$t('common.pxm_publish_reason')}}{{ row.rejectReason }}</em>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_publish_version')" prop="version" width="100" />
          <el-table-column :label="$t('common.pxm_publish_last_submit')" prop="lastSubmit" width="140" />
          <el-table-column :label="$t('common.pxm_publish_latest_update')" prop="lastUpdate" width="140" />
          <el-table-column :label="$t('common.pxm_publish_status_filter')" width="150">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_actions')" min-width="200">
            <template #default="{ row }">
              <div class="publish-actions">
                <!-- 无状态/默认：提交发布 -->
                <template v-if="!row.status || row.status === 'draft'">
                  <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                    {{ $t('common.pxm_publish_apply') }}
                  </el-button>
                </template>
                <!-- 审核中：撤回发布 -->
                <template v-if="row.status === 'reviewing'">
                  <el-button
                    size="small"
                    type="danger"
                    pxm_publish_withdraw
                    @click="handleWithdraw(row)"
                  >
                    {{ $t('common.pxm_publish_withdraw') }}
                  </el-button>
                </template>
                <!-- 已发布：发布更新 + 下架 -->
                <template v-if="row.status === 'published' || row.status === 'live'">
                  <el-button size="small" pxm_publish_update @click="handleUpdate(row)">
                    {{ $t('common.pxm_publish_update') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="warning"
                    pxm_publish_unPublish
                    @click="handleUnpublish(row)"
                  >
                    {{ $t('common.pxm_publish_unpublish') }}
                  </el-button>
                </template>
                <!-- 已驳回：重新发布 -->
                <template v-if="row.status === 'rejected'">
                  <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                    {{ $t('common.pxm_publish_apply') }}
                  </el-button>
                </template>
                <!-- 已下架：重新发布 + 删除 -->
                <template v-if="row.status === 'offline'">
                  <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                    {{ $t('common.pxm_publish_apply') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    pxm_action_delete
                    @click="handleDelete(row)"
                  >
                    {{ $t('common.pxm_action_delete') }}
                  </el-button>
                </template>
              </div>
            </template>
          </el-table-column>
          <!-- </el-table-column> -->
        </el-table>
      </section>
    </section>

    <!-- 弹窗：选择未发布作品 D E -->
    <el-dialog
      v-model="resourceDialogVisible"
      :title="$t('common.pxm_publish_picker_footnote')"
      width="70%"
      @close="resetDialogSelect"
    >
      <el-input
        v-model="searchDraftKey"
        :placeholder="$t('common.pxm_publish_search_placeholder')"
        clearable
        style="margin-bottom: 12px"
      />
      <div
        class="publish-card-list"
        v-infinite-scroll="loadMoreDrafts"
        :infinite-scroll-disabled="draftNoMore"
        :infinite-scroll-distance="100"
      >
        <el-card
          v-for="item in draftWorkList"
          :key="item.id"
          :body-style="{ padding: '0px' }"
          class="publish-work-card"
          :class="{ selected: selectedDraftIds.includes(item.id) }"
          @click="toggleDraftSelect(item)"
        >
          <img :src="item.coverUrl" class="publish-card-image" />
          <div class="publish-card-body">
            <span class="publish-card-name">{{ item.name }}</span>
            <time class="publish-card-time">{{ item.updatedAt }}</time>
          </div>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="resourceDialogVisible = false">{{ $t("common.pxm_common_cancel") }}</el-button>
        <el-button type="primary" pxm_publish_apply @click="submitBatchPublish">{{ $t("common.pxm_publish_apply") }}</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAppI18n } from '@/common/composables/useI18n'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  unpublishWorkApi,
  removeFromReleasesApi,
  withdrawWorkApi,
  submitWorkUpdateApi,
  submitWorkApi,
} from '@/api/publish'
import { pageReleasesApi, pageReleaseCandidatesApi } from '@/api/works'

const { t } = useAppI18n()

// ===================== 查询条件 c =====================
const queryParams = reactive({
  status: 'all',
})

// 统计数据 b
const statData = ref({
  live: 0,
  review: 0,
  draft: 0,
})

// ========== 工具函数 ==========
const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

// ========== 接口数据适配 ==========
/** 将发布管理接口数据适配为表格行数据 */
function toTableRow(api) {
  return {
    id: api.id,
    name: api.title,
    version: api.workVersion || '',
    lastSubmit: formatDate(api.submittedTime || api.createTime),
    lastUpdate: formatDate(api.updateTime),
    status: api.status || api.publishStatus ? (api.status || api.publishStatus).toLowerCase() : '',
    rejectReason: api.rejectReason || '',
    coverUrl: api.coverUrl || '',
  }
}

// 主表格列表
const tableData = ref([])

/** 加载发布管理列表 */
async function loadTableData() {
  try {
    // all默认传递空，其他的对应
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    const res = await pageReleasesApi({
      pageNumber: 1,
      pageSize: 100,
      status,
    })
    const page = (res.result || {}).page || {}
    tableData.value = (page.list || []).map(toTableRow)
    // 更新统计数值
    statData.value.live = res.result?.publishedCount || 0
    statData.value.review = res.result?.reviewingCount || 0
    statData.value.draft = res.result?.applicableCount || 0
  } catch (e) {
    console.error('loadTableData error:', e)
    ElMessage.error(t('common.pxm_publish_action_failed'))
  }
}

// ===================== 事件逻辑 a~i =====================
/** d. 打开资源选择弹窗 */
const openResourceDialog = () => {
  resourceDialogVisible.value = true
  loadDraftWorkList()
}

/** 重置弹窗多选 */
const resetDialogSelect = () => {
  searchDraftKey.value = ''
  selectedDraftIds.value = []
  draftWorkList.value = []
  draftPage.value = 1
  draftTotal.value = 0
}

/** e. 批量提交发布 */
const submitBatchPublish = () => {
  if (selectedDraftIds.value.length === 0) {
    ElMessage.warning(t('common.pxm_publish_incomplete'))
    return
  }
  Promise.all(selectedDraftIds.value.map((id) => submitWorkApi(id)))
    .then(() => {
      ElMessage.success(t('common.pxm_publish_apply'))
      resourceDialogVisible.value = false
      loadTableData()
    })
    .catch(() => {
      ElMessage.error(t('common.pxm_publish_action_failed'))
    })
}

/** h. 单行直接发布（已驳回/已下架） */
const singlePublish = (row) => {
   ElMessageBox.confirm(t('common.pxm_publish_confirm_publish'),t("common.pxm_publish_confirm_title"), {
          type: "warning",
   confirmButtonText: t('common.pxm_common_confirm'),
    cancelButtonText: t('common.pxm_common_cancel'),
        })
    .then(() => {
      return submitWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_apply'))
      loadTableData()
    })
    .catch(() => {})
}

/** f. 已上架 - 提交更新 */
const handleUpdate = (row) => {

   ElMessageBox.confirm(t('common.pxm_publish_confirm_update'),t("common.pxm_publish_confirm_title"), {
          type: "warning",
   confirmButtonText: t('common.pxm_common_confirm'),
    cancelButtonText: t('common.pxm_common_cancel'),
        })
    .then(() => {
      return submitWorkUpdateApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_update'))
      loadTableData()
    })
    .catch(() => {})
}

// ========== 弹窗草稿列表（可发布作品） ==========
const resourceDialogVisible = ref(false)
const searchDraftKey = ref('')
const draftWorkList = ref([])
const selectedDraftIds = ref([])

// 滚动加载分页
const draftPage = ref(1)
const draftPageSize = ref(12)
const draftTotal = ref(0)
const draftLoadingMore = ref(false)

const draftNoMore = computed(() => {
  return draftWorkList.value.length >= draftTotal.value && draftTotal.value > 0
})

/** 加载弹窗草稿列表（首屏/搜索） */
async function loadDraftWorkList() {
  try {
    draftPage.value = 1
    draftTotal.value = 0
    selectedDraftIds.value = []
    const res = await pageReleaseCandidatesApi({
      pageNumber: 1,
      pageSize: draftPageSize.value,
      keyword: searchDraftKey.value.trim() || undefined,
    })
    const pageData = (res.result || {}).list || []
    draftTotal.value = (res.result || {}).total || pageData.length
    draftWorkList.value = pageData.map((api) => ({
      id: api.id,
      name: api.title,
      coverUrl: api.coverUrl || '',
      updatedAt: formatDate(api.updateTime),
    }))
  } catch (e) {
    console.error('loadDraftWorkList error:', e)
    ElMessage.error(t('common.pxm_publish_action_failed'))
  }
}

/** 滚动加载更多 */
async function loadMoreDrafts() {
  if (draftLoadingMore.value || draftNoMore.value) return
  try {
    draftLoadingMore.value = true
    const nextPage = draftPage.value + 1
    const res = await pageReleaseCandidatesApi({
      pageNumber: nextPage,
      pageSize: draftPageSize.value,
      keyword: searchDraftKey.value.trim() || undefined,
    })
    const pageData = (res.result || {}).list || []
    draftTotal.value = (res.result || {}).total || draftTotal.value
    const newItems = pageData.map((api) => ({
      id: api.id,
      name: api.title,
      coverUrl: api.coverUrl || '',
      updatedAt: formatDate(api.updateTime),
    }))
    draftWorkList.value.push(...newItems)
    draftPage.value = nextPage
  } catch (e) {
    console.error('loadMoreDrafts error:', e)
  } finally {
    draftLoadingMore.value = false
  }
}

/** 切换卡片选中状态 */
function toggleDraftSelect(item) {
  const idx = selectedDraftIds.value.indexOf(item.id)
  if (idx === -1) {
    selectedDraftIds.value.push(item.id)
  } else {
    selectedDraftIds.value.splice(idx, 1)
  }
}

// ========== 状态映射工具函数 ==========
const statusMap = {
  all: t('common.pxm_publish_all_statuses'),
  reviewing: t('common.pxm_publish_status_pending'),
  published: t('common.pxm_publish_status_live'),
  rejected: t('common.pxm_publish_status_rejected'),
  offline: t('common.pxm_publish_status_offline'),
  draft: t('common.pxm_publish_status_offline'),
}
const getStatusLabel = (val) => statusMap[val] || val
const getStatusTagType = (status) => {
  const map = {
    reviewing: 'warning',
    published: 'success',
    live: 'success',
    rejected: 'danger',
    offline: 'info',
    draft: 'info',
    pending: 'warning',
  }
  return map[status] || ''
}

/** f. 已上架 - 下架 */
const handleUnpublish = (row) => {
   ElMessageBox.confirm(t('common.pxm_publish_confirm_unpublish'),t("common.pxm_publish_confirm_title"), {
          type: "warning",
   confirmButtonText: t('common.pxm_common_confirm'),
    cancelButtonText: t('common.pxm_common_cancel'),
        })
    .then(() => {
      return unpublishWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_unpublish'))
      loadTableData()
    })
    .catch(() => {})
}

/** g. 审核中 - 撤回 */
const handleWithdraw = (row) => {
  ElMessageBox.confirm(t('common.pxm_publish_confirm_withdraw'),t("common.pxm_publish_confirm_title"), {
          type: "warning",
   confirmButtonText: t('common.pxm_common_confirm'),
    cancelButtonText: t('common.pxm_common_cancel'),
        })
    .then(() => {
      return withdrawWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_withdraw'))
      loadTableData()
    })
    .catch(() => {})
}

/** i. 已下架 - 删除作品 */
const handleDelete = (row) => {
   ElMessageBox.confirm(t('common.pxm_publish_confirm_delete'),t("common.pxm_publish_confirm_title"), {
          type: "error",
   confirmButtonText: t('common.pxm_common_confirm'),
    cancelButtonText: t('common.pxm_common_cancel'),
        })
    .then(() => {
      return removeFromReleasesApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_delete_success'))
      loadTableData()
    })
    .catch(() => {})
}

onMounted(() => {
  loadTableData()
})
</script>

<style scoped>
.content {
  padding: 24px;
  background-color: #ffffff;
  min-height: 100vh;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.topbar h1 {
  font-size: 22px;
  margin: 0 0 4px;
}
.topbar p {
  color: #666;
  margin: 0;
}
.community-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.stat-card strong {
  display: block;
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 8px;
}
.stat-card span {
  color: #777;
}
.community-section {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.community-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.community-section-head h2 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
  flex-shrink: 0;
}
.community-status-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.community-status-filter :deep(.el-select) {
  min-width: 150px;
}
.publish-name {
  display: flex;
  align-items: center;
  gap: 12px;
}
.publish-thumb {
  width: 64px;
  height: 64px;
  background: #222;
  border-radius: 6px;
  flex-shrink: 0;
}
.publish-thumb.small {
  width: 44px;
  height: 44px;
}
.publish-name h3 {
  margin: 0 0 4px;
  font-size: 15px;
}
.reject-tip {
  color: #e04444;
  font-size: 12px;
  display: block;
  line-height: 1.4;
}
.publish-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ========== 草稿列表卡片网格 ========== */
.publish-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 4px;
}
.publish-work-card {
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}
.publish-work-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.25);
}
.publish-work-card.selected {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.35);
}
.publish-card-image {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
  background: #f0f0f0;
}
.publish-card-body {
  padding: 12px 14px;
}
.publish-card-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.publish-card-time {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* scoped下需要深度选择器 */
:deep(.black-btn) {
  background-color: #000 !important;
  border-color: #000 !important;
}
</style>
