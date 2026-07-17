<template>
  <main class="content">
    <!-- 顶部标题区域 a -->
    <header class="topbar community-topbar">
      <div>
        <h1>{{ $t("common.pxm_publish_title") }}</h1>
        <p>{{ $t("common.pxm_publish_subtitle") }}</p>
      </div>
      <el-button type="primary" @click="openResourceDialog">
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
        <span>{{ $t("common.pxm_publish_apply") }}</span>
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
              <el-option :label="$t('common.pxm_publish_status_pending')" value="pending" />
              <el-option :label="$t('common.pxm_publish_status_live')" value="live" />
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
                  <em v-if="row.rejectReason" class="reject-tip">{{ row.rejectReason }}</em>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_publish_version')" prop="version" width="100" />
          <el-table-column :label="$t('common.pxm_publish_last_submit')" prop="lastSubmit" width="140" />
          <el-table-column :label="$t('common.pxm_publish_latest_update')" prop="lastUpdate" width="140" />
          <el-table-column :label="$t('common.pxm_publish_status_filter')" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.pxm_column_actions')" min-width="240">
            <template #default="{ row }">
              <div class="publish-actions">
                <!-- 已上架：提交更新 / 下架 f -->
                <template v-if="row.status === 'live'">
                  <el-button size="small" pxm_publish_update @click="handleUpdate(row)">
                    {{ $t('common.pxm_publish_update') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="warning"
                    pxm_publish_unPublish
                    @click="handleUnpublish(row)"
                  >
                  {{ $t('common.pxm_publish_unpublish') }}</el-button>
                </template>
                <!-- 审核中：撤回 g -->
                <template v-if="row.status === 'pending'">
                  <el-button
                    size="small"
                    type="danger"
                    pxm_publish_withdraw
                    @click="handleWithdraw(row)"
                  >
                    {{ $t('common.pxm_publish_withdraw') }}
                  </el-button>
                </template>
                <!-- 已驳回：重新发布 h -->
                <template v-if="row.status === 'rejected'">
                  <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                    {{ $t('common.pxm_publish_apply') }}
                  </el-button>
                </template>
                <!-- 已下架：重新发布 + 删除 h i -->
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
      <el-table ref="draftTableRef" :data="draftWorkList" row-key="id" style="width: 100%">
        <el-table-column type="selection" />
        <el-table-column label="预览" width="80">
          <template #default="{ row }">
            <div class="publish-thumb small" />
          </template>
        </el-table-column>
        <el-table-column label="作品名称" prop="name" />
        <el-table-column :label="$t('common.pxm_publish_version')" prop="version" width="100" />
      </el-table>
      <template #footer>
        <el-button @click="resourceDialogVisible = false">{{ $t("common.pxm_common_cancel") }}</el-button>
        <el-button type="primary" pxm_publish_apply @click="submitBatchPublish">{{ $t("common.pxm_publish_apply") }}</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
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
/** 将 CreatorWorkVO 适配为表格行数据 */
function toTableRow(api) {
  return {
    id: api.id,
    name: api.title,
    version: '',
    lastSubmit: formatDate(api.createTime),
    lastUpdate: formatDate(api.updateTime),
    status: api.publishStatus ? api.publishStatus.toLowerCase() : '',
    rejectReason: api.rejectedReason || '',
    coverUrl: api.coverUrl || '',
  }
}

// 主表格列表
const tableData = ref([])

/** 加载发布管理列表 */
async function loadTableData() {
  try {
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    const res = await pageReleasesApi({
      pageNumber: 1,
      pageSize: 100,
      status,
    })
    tableData.value = ((res.result || {}).list || []).map(toTableRow)
    // 更新统计数值
    statData.value.live = res.result?.totalLive || 0
    statData.value.review = res.result?.totalPending || 0
    statData.value.draft = res.result?.totalDraft || 0
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
  draftTableRef.value?.clearSelection()
}

/** e. 批量提交发布 */
const submitBatchPublish = () => {
  const selectedRows = draftTableRef.value?.getSelectionRows() || []
  if (selectedRows.length === 0) {
    ElMessage.warning(t('common.pxm_publish_incomplete'))
    return
  }
  Promise.all(selectedRows.map((row) => submitWorkApi(row.id)))
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
  ElMessageBox.confirm(t('common.pxm_publish_confirm_publish'))
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
  ElMessageBox.confirm(t('common.pxm_publish_confirm_update'))
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
const draftTableRef = ref(null)
const draftWorkList = ref([])

/** 加载弹窗草稿列表 */
async function loadDraftWorkList() {
  try {
    const res = await pageReleaseCandidatesApi({
      pageNumber: 1,
      pageSize: 100,
      keyword: searchDraftKey.value.trim() || undefined,
    })
    draftWorkList.value = ((res.result || {}).list || []).map((api) => ({
      id: api.id,
      name: api.title,
      version: '',
    }))
  } catch (e) {
    console.error('loadDraftWorkList error:', e)
    ElMessage.error(t('common.pxm_publish_action_failed'))
  }
}

// ========== 状态映射工具函数 ==========
const statusMap = {
  all: t('common.pxm_publish_all_statuses'),
  pending: t('common.pxm_publish_status_pending'),
  live: t('common.pxm_publish_status_live'),
  rejected: t('common.pxm_publish_status_rejected'),
  offline: t('common.pxm_publish_status_offline'),
}
const getStatusLabel = (val) => statusMap[val] || val
const getStatusTagType = (status) => {
  const map = {
    pending: 'warning',
    live: 'success',
    rejected: 'danger',
    offline: 'info',
  }
  return map[status] || ''
}

/** f. 已上架 - 下架 */
const handleUnpublish = (row) => {
  ElMessageBox.confirm(t('common.pxm_publish_confirm_unpublish'))
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
  ElMessageBox.confirm(t('common.pxm_publish_confirm_withdraw'))
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
  ElMessageBox.confirm(t('common.pxm_confirm_delete'), '!', {
    type: 'error',
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
  background-color: #f5f7fa;
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
  margin-bottom: 16px;
}
.community-section-head h2 {
  margin: 0;
  font-size: 18px;
}
.community-status-filter {
  display: flex;
  align-items: center;
  gap: 10px;
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
</style>
