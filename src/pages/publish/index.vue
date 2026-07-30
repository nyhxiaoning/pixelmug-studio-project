<template>
  <main class="content">
    <!-- 顶部标题区域 a -->
    <header class="topbar community-topbar">
      <div>
        <h1>{{ $t('common.pxm_publish_title') }}</h1>
        <p>{{ $t('common.pxm_publish_subtitle') }}</p>
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
        <span>{{ $t('common.pxm_publish_apply') }}</span>
      </el-button>
    </header>

    <section class="community-page">
      <!-- 统计卡片区域 b -->
      <div class="community-stats">
        <div class="stat-card">
          <strong pxm_publish_stats_live>{{ statData.live }}</strong>
          <span>{{ $t('common.pxm_publish_stats_live') }}</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_review>{{ statData.review }}</strong>
          <span>{{ $t('common.pxm_publish_stats_review') }}</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_draft>{{ statData.draft }}</strong>
          <span>{{ $t('common.pxm_publish_stats_draft') }}</span>
        </div>
      </div>

      <section
        class="community-section"
        v-infinite-scroll="loadTableDataMore"
        :infinite-scroll-disabled="!hasMore"
        :infinite-scroll-distance="100"
      >
        <div class="community-section-head">
          <h2>{{ $t('common.pxm_publish_management') }}</h2>
          <div class="community-status-filter">
            <span>{{ $t('common.pxm_publish_status_filter') }}</span>
            <el-select
              v-model="queryParams.status"
              :placeholder="$t('common.pxm_publish_all_statuses')"
              pxm_publish_status_filter
              @change="handleStatusChange"
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
        <el-empty
          v-if="tableData.length === 0 && !loadingInitial"
          :description="$t('common.pxm_editor_library_empty')"
        />
        <div v-else class="publish-table-wrap">
          <el-table
            :data="tableData"
            stripe
            style="width: 100%"
            v-loading="loadingMore"
            element-loading-text="Loading..."
          >
            <el-table-column :label="$t('common.pxm_publish_files')" min-width="280">
              <template #default="{ row }">
                <div class="publish-name">
                  <!-- <div class="publish-thumb" /> -->
                  <img :src="row?.coverUrl" width="128" height="64" alt="" />
                  <div>
                    <h3>{{ row.name }}</h3>
                    <em v-if="row.rejectReason" class="reject-tip"
                      >{{ $t('common.pxm_publish_reason') }}{{ row.rejectReason }}</em
                    >
                  </div>
                </div>
              </template>
            </el-table-column>
            <!-- <el-table-column :label="$t('common.pxm_publish_version')" prop="version" width="100" /> -->
            <el-table-column
              :label="$t('common.pxm_publish_last_submit')"
              prop="lastSubmit"
              width="140"
            />
            <el-table-column
              :label="$t('common.pxm_publish_latest_update')"
              prop="lastUpdate"
              width="140"
            />
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
                  <template v-if="row.status === 'published'">
                    <el-button v-if="row.contentConsistent" size="small" pxm_publish_update @click="handleUpdate(row)">
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
          <div v-if="loadingMore" class="infinite-loading-tip">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>Loading...</span>
          </div>
        </div>
      </section>
    </section>

    <!-- 弹窗：三步发布流程 D E -->
    <el-dialog v-model="resourceDialogVisible" width="55%" @close="resetDialogSelect">
      <template #header>
        <div class="dialog-header-wrap">
          <span class="dialog-title">{{ $t('common.pxm_publish_resources') }}</span>
          <div class="header-desc">{{ $t('common.pxm_publish_files') }}</div>
        </div>
      </template>

      <!-- 步骤条 -->
      <div class="publish-steps">
        <span :class="{ done: dialogStep > 0, active: dialogStep === 0 }">
          <strong>{{ 1 }}</strong>{{ t('common.selectWork') }}
        </span><i /><span :class="{ done: dialogStep > 1, active: dialogStep === 1 }">
          <strong>{{ 2 }}</strong>{{ t('common.selectCategory') }}
        </span><i /><span :class="{ done: dialogStep > 2, active: dialogStep === 2 }">
          <strong>{{ 3 }}</strong>{{ t('common.submitSuccessStep') }}
        </span>
      </div>

      <!-- 步骤 1：选择作品 -->
      <div v-show="dialogStep === 0" class="dialog-step-content">
        <el-input
          v-model="searchDraftKey"
          :placeholder="$t('common.pxm_publish_search_placeholder')"
          clearable
          @input="handleSearchDraft"
          style="margin-bottom: 16px"
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
            <div class="publish-card-image-wrap">
              <img :src="item.coverUrl" class="publish-card-image" />
              <div v-if="selectedDraftIds.includes(item.id)" class="publish-card-check">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#fff" />
                </svg>
              </div>
            </div>
            <div class="publish-card-body">
              <span class="publish-card-name">{{ item.name }}</span>
              <time class="publish-card-time">{{ item.updatedAt }}</time>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 步骤 2：选择标签（左侧预览，右侧标签列表） -->
      <div v-show="dialogStep === 1" class="dialog-step-content">
        <div class="tag-step-layout">
          <!-- 左侧：预览图 -->
          <div class="tag-step-preview">
            <div class="preview-image-wrap">
              <img
                :src="selectedWorkForTags?.coverUrl"
                class="preview-image"
                alt="preview"
              />
            </div>
            <p class="preview-title">{{ selectedWorkForTags?.name }}</p>
          </div>

          <!-- 右侧：标签列表 -->
          <div class="tag-step-list">
            <h3 class="tag-step-heading">{{ $t('common.pxm_publish_tag_select') }}</h3>
            <div v-if="tagLoading" class="tag-loading-wrap">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>{{ $t('common.pxm_common_loading') }}</span>
            </div>
            <div v-else-if="tagList.length === 0" class="tag-empty">
              <el-empty :description="$t('common.pxm_publish_no_tags')" :image-size="80" />
            </div>
            <div v-else class="tag-chip-list">
              <el-tag
                v-for="tag in tagList"
                :key="tag.id"
                :type="selectedTagIds.includes(tag.id) ? '' : 'info'"
                :effect="selectedTagIds.includes(tag.id) ? 'dark' : 'light'"
                class="tag-chip"
                @click="toggleTagSelect(tag)"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤 3：提交审核确认 -->
      <div v-show="dialogStep === 2" class="dialog-step-content">
        <div class="submit-step-card">
          <div class="submit-step-header">
            <el-icon :size="48" color="#67c23a"><CircleCheck /></el-icon>
            <h2>{{ $t('common.pxm_publish_confirm_title') }}</h2>
          </div>

          <el-descriptions :column="1" border class="submit-desc">
            <el-descriptions-item :label="$t('common.pxm_publish_files')">
              <div class="submit-work-name">
                <img :src="selectedWorkForSubmit?.coverUrl" class="submit-work-thumb" alt="" />
                <span>{{ selectedWorkForSubmit?.name }}</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('common.pxm_publish_category')">
              {{ selectedWorkForSubmit?.type || '--' }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('common.pxm_publish_status_filter')">
              <el-tag :type="getStatusTagType(selectedWorkForSubmit?.status)">
                {{ getStatusLabel(selectedWorkForSubmit?.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('common.pxm_publish_tags')">
              <el-tag
                v-for="tagId in selectedTagIds"
                :key="tagId"
                type="success"
                style="margin-right: 6px; margin-bottom: 4px"
              >
                {{ getTagNameById(tagId) }}
              </el-tag>
              <span v-if="selectedTagIds.length === 0" class="empty-text">--</span>
            </el-descriptions-item>
          </el-descriptions>

          <el-form
            v-if="selectedWorkForSubmit?.status === 'rejected'"
            :model="rejectRemark"
            label-position="top"
            style="margin-top: 16px"
          >
            <el-form-item :label="$t('common.pxm_publish_remark')">
              <el-input
                v-model="rejectRemark"
                type="textarea"
                :rows="3"
                :placeholder="$t('common.pxm_publish_remark_placeholder')"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer-wrap">
          <div v-if="dialogStep === 0" class="footer-left-text">
            {{ $t('common.pxm_publish_picker_footnote') }}
          </div>
          <div v-else-if="dialogStep === 1" class="footer-left-text">
            {{ $t('common.pxm_publish_tag_hint') }}
          </div>
          <div v-else class="footer-left-text">
            {{ $t('common.pxm_publish_submit_hint') }}
          </div>
          <div class="footer-btn-group">
            <el-button v-if="dialogStep > 0" @click="dialogStep--">
              {{ $t('common.pxm_common_prev') }}
            </el-button>
            <el-button v-if="dialogStep < 2" type="primary" @click="handleStepNext">
              {{ $t('common.nextStep') }}
            </el-button>
            <el-button v-if="dialogStep === 2" type="primary" :loading="submitting" @click="handleStepSubmit">
              {{ $t('common.pxm_publish_submit') }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppI18n } from '@/common/composables/useI18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, CircleCheck } from '@element-plus/icons-vue'

import {
  unpublishWorkApi,
  removeFromReleasesApi,
  withdrawWorkApi,
  submitWorkUpdateApi,
  submitWorkApi,
} from '@/api/publish'
import { pageReleasesApi, pageReleaseCandidatesApi, pageTagWorksApi } from '@/api/works'

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

// ===================== 三步发布流程 =====================
const dialogStep = ref(0)
const tagList = ref([])
const tagLoading = ref(false)
const selectedTagIds = ref([])
const selectedWorkForTags = ref(null)
const selectedWorkForSubmit = ref(null)
const rejectRemark = ref('')
const submitting = ref(false)

/** 根据 tagId 获取 tag 名称 */
function getTagNameById(tagId) {
  const tag = tagList.value.find((t) => t.id === tagId)
  return tag ? tag.name : ''
}

/** 加载标签列表 */
async function loadTagList() {
  tagLoading.value = true
  try {
    const res = await pageTagWorksApi()
    // 适配响应结构，根据实际接口调整
    tagList.value = (res.result || res.data || []).map((item) => ({
      id: item.id,
      name: item.name || item.tagName || item.label || String(item.id),
    }))
  } catch (e) {
    console.error('loadTagList error:', e)
    ElMessage.error(t('common.pxm_publish_load_tags_failed'))
    tagList.value = []
  } finally {
    tagLoading.value = false
  }
}

/** 切换标签选中 */
function toggleTagSelect(tag) {
  const idx = selectedTagIds.value.indexOf(tag.id)
  if (idx === -1) {
    selectedTagIds.value.push(tag.id)
  } else {
    selectedTagIds.value.splice(idx, 1)
  }
}

/** 步骤间下一步 */
function handleStepNext() {
  if (dialogStep.value === 0) {
    // 步骤1 → 步骤2：需选中一个作品
    if (selectedDraftIds.value.length === 0) {
      ElMessage.warning(t('common.pickerFootnote'))
      return
    }
    const workId = selectedDraftIds.value[0]
    const work = draftWorkList.value.find((w) => w.id === workId)
    selectedWorkForTags.value = work || null
    selectedWorkForSubmit.value = work || null
    loadTagList()
    dialogStep.value = 1
  } else if (dialogStep.value === 1) {
    // 步骤2 → 步骤3：标签可选，不强制
    dialogStep.value = 2
  }
}

/** 步骤3：提交审核 */
async function handleStepSubmit() {
  if (!selectedWorkForSubmit.value) return
  submitting.value = true
  try {
    const workId = selectedWorkForSubmit.value.id
    const remark = rejectRemark.value || undefined
    await submitWorkApi(workId, remark ? { remark } : undefined)
    ElMessage.success(t('common.pxm_publish_submit_success'))
    resourceDialogVisible.value = false
    resetTableData()
  } catch (e) {
    console.error('handleStepSubmit error:', e)
    ElMessage.error(t('common.pxm_publish_submit_failed'))
  } finally {
    submitting.value = false
  }
}

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

// 表格分页状态
const tablePageNumber = ref(1)
const tablePageSize = ref(20)
const hasMore = ref(true)
const loadingMore = ref(false)
const loadingInitial = ref(false)
const tableTotalCount = ref(0)

/** 仅加载统计数据（首次加载 / 状态筛选时调用一次） */
async function loadStatsData() {
  try {
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    const res = await pageReleasesApi({
      pageNumber: 1,
      pageSize: tablePageSize.value,
      status,
    })
    statData.value.live = res.result?.publishedCount || 0
    statData.value.review = res.result?.reviewingCount || 0
    statData.value.draft = res.result?.applicableCount || 0
  } catch (e) {
    console.error('loadStatsData error:', e)
  }
}

/** 发布管理列表（追加模式，不更新统计数据） */
async function loadTableDataInitial() {
  loadingInitial.value = true
  hasMore.value = true
  try {
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    // 使用当前分页页码：首次为空则重置为1，滚动场景则从当前页继续
    const pageNum = tablePageNumber.value || 1
    const res = await pageReleasesApi({
      pageNumber: pageNum,
      pageSize: tablePageSize.value,
      status,
    })

    if (pageNum == 1) {
      statData.value.live = res.result?.publishedCount || 0
      statData.value.review = res.result?.reviewingCount || 0
      statData.value.draft = res.result?.applicableCount || 0
    }

    tableTotalCount.value = res.result?.page?.total ?? tableTotalCount.value
    const newItems = (res.result?.page?.list ?? []).map(toTableRow)
    if (tableData.value.length === 0) {
      tableData.value = newItems
    } else {
      tableData.value = [...tableData.value, ...newItems]
    }
    tablePageNumber.value = pageNum + 1
    hasMore.value = tableData.value.length < tableTotalCount.value
  } catch (e) {
    console.error('loadTableData error:', e)
    ElMessage.error(t('common.pxm_publish_action_failed'))
  } finally {
    loadingInitial.value = false
  }
}

/** 重置列表并重新加载（操作后刷新表格，不更新统计数据） */
async function resetTableData() {
  tableData.value = []
  tablePageNumber.value = 1
  hasMore.value = true
  await loadTableDataInitial()
}

/** 滚动加载更多（追加而非替换） */
async function loadTableDataMore() {
  if (loadingMore.value || loadingInitial.value || !hasMore.value) return
  try {
    loadingMore.value = true
    // 使用当前页码（不 +1，避免和 loadTableDataInitial 的递进逻辑冲突）
    const pageNum = tablePageNumber.value
    const status = queryParams.status === 'all' ? undefined : queryParams.status.toUpperCase()
    const res = await pageReleasesApi({
      pageNumber: pageNum,
      pageSize: tablePageSize.value,
      status,
    })
    tableTotalCount.value = res.result?.page?.total ?? tableTotalCount.value
    const newItems = (res.result?.page?.list ?? []).map(toTableRow)
    tableData.value = [...tableData.value, ...newItems]
    tablePageNumber.value = pageNum + 1
    // 没有更多数据：返回为空 或 已加载总数 >= 总数
    hasMore.value = newItems.length > 0 && tableData.value.length < tableTotalCount.value
  } catch (e) {
    console.error('loadTableDataMore error:', e)
  } finally {
    loadingMore.value = false
  }
}

// ===================== 事件逻辑 a~i =====================

/** 状态筛选切换：重新加载统计数据 + 列表 */
async function handleStatusChange() {
  await loadStatsData()
  await resetTableData()
}

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
  dialogStep.value = 0
  tagList.value = []
  selectedTagIds.value = []
  selectedWorkForTags.value = null
  selectedWorkForSubmit.value = null
  rejectRemark.value = ''
  tagLoading.value = false
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
      resetTableData()
    })
    .catch(() => {
      ElMessage.error(t('common.pxm_publish_action_failed'))
    })
}

/** h. 单行直接发布（已驳回/已下架） */
const singlePublish = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_publish'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return submitWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_apply'))
      resetTableData()
    })
    .catch(() => {})
}

/** f. 已上架 - 提交更新 */
const handleUpdate = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_update'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return submitWorkUpdateApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_update'))
      resetTableData()
    })
    .catch(() => {})
}

// ========== 弹窗草稿列表（可发布作品） ==========

// ========== 弹窗草稿列表（可发布作品） ==========
const resourceDialogVisible = ref(false)
const searchDraftKey = ref('')
const draftWorkList = ref([])
const selectedDraftIds = ref([])

// 搜索防抖定时器
let searchTimer = null

// 滚动加载分页
const draftPage = ref(1)
const draftPageSize = ref(20)
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
    draftTotal.value = res.result?.total ?? draftTotal.value
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
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_unpublish'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return unpublishWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_unpublish'))
      resetTableData()
    })
    .catch(() => {})
}

/** g. 审核中 - 撤回 */
const handleWithdraw = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_withdraw'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'warning',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return withdrawWorkApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_publish_withdraw'))
      resetTableData()
    })
    .catch(() => {})
}

/** i. 已下架 - 删除作品 */
const handleDelete = (row) => {
  ElMessageBox.confirm(
    t('common.pxm_publish_confirm_delete'),
    t('common.pxm_publish_confirm_title'),
    {
      type: 'error',
      confirmButtonText: t('common.pxm_common_confirm'),
      cancelButtonText: t('common.pxm_common_cancel'),
    }
  )
    .then(() => {
      return removeFromReleasesApi(row.id)
    })
    .then(() => {
      ElMessage.success(t('common.pxm_delete_success'))
      resetTableData()
    })
    .catch(() => {})
}

/** 搜索防抖：输入停止 300ms 后触发 */
function handleSearchDraft() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadDraftWorkList()
  }, 300)
}

onMounted(() => {
  // loadStatsData()
  loadTableDataInitial()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.content {
  padding: 24px;
  background-color: #ffffff;
  height: 100vh;
  overflow-y: hidden;
  box-sizing: border-box;
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
  max-height: calc(100vh - 280px);
  overflow-y: auto;
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
  height: 80px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.publish-name img{
  /* Firefox旧版本兼容 */
  image-rendering: -moz-crisp-edges;
  /* Safari 旧版兼容 */
  image-rendering: -webkit-optimize-contrast;
  /* 标准 */
  image-rendering: crisp-edges;
  /* Chrome/Edge像素渲染兜底 */
  image-rendering: pixelated;
}

.publish-thumb {
  width: 128px;
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

/* ========== 草稿列表卡片网格：每行固定 3 个 ========== */
.publish-card-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 8px;
}
.publish-card-list::-webkit-scrollbar {
  width: 6px;
}
.publish-card-list::-webkit-scrollbar-thumb {
  background: #d0d7e2;
  border-radius: 3px;
}
.publish-card-list::-webkit-scrollbar-thumb:hover {
  background: #b8c4d8;
}
.publish-work-card {
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
}
.publish-work-card:hover {
  border-color: #b3d4fc;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.18);
  transform: translateY(-2px);
}
.publish-work-card.selected {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.35);
  background-color: #f0f7ff;
}
.publish-card-image-wrap {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: #e8ecf0;
  overflow: hidden;
}
.publish-card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.publish-card-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}
.publish-card-body {
  padding: 12px 14px 14px;
}
.publish-card-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
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

.dialog-footer-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.footer-left-text {
  color: #666;
  font-size: 13px;
  line-height: 1.5;
  flex-shrink: 1; /* 文字区域自适应压缩，不挤压按钮 */
}

.footer-btn-group {
  display: flex;
  gap: 12px; /* 按钮之间固定间距 */
  flex-shrink: 0; /* 按钮区域不压缩 */
}

/* 头部布局：左右并排，垂直居中 */
.dialog-header-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 主标题加粗，保持原生弹窗标题样式 */
.dialog-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

/* 右侧说明文本样式，可自行调整颜色大小 */
.header-desc {
  padding: 2px 10px;
  color: #909399;
  background: #f3f3f3;
  font-size: 13px;
}

/* ========== 发布管理表格无限滚动 ========== */
.publish-table-wrap {
  position: relative;
}
.infinite-loading-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}

img {
   /* 关闭平滑线性插值，启用锐利渲染 */
  image-rendering: crisp-edges;
  /* Chrome/Edge 兼容像素化放大 */
  image-rendering: pixelated;
  /* 兼容旧版 Safari */
  image-rendering: -webkit-optimize-contrast;
}

/* ========== 步骤内容区 ========== */
.dialog-step-content {
  min-height: 400px;
}

/* -------- 步骤2：标签选择（左预览 + 右标签） -------- */
.tag-step-layout {
  display: flex;
  gap: 32px;
  min-height: 440px;
}

.tag-step-preview {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image-wrap {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: #f0f2f5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.preview-image {
  width: 100%;
  display: block;
}

.preview-title {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  text-align: center;
}

.tag-step-list {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tag-step-heading {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #303133;
}

.tag-loading-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}

.tag-empty {
  padding: 40px 0;
}

.tag-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-chip {
  cursor: pointer;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.2s;
}

.tag-chip:hover {
  transform: scale(1.05);
}

/* -------- 步骤3：提交确认 -------- */
.submit-step-card {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 8px;
}

.submit-step-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.submit-step-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.submit-desc {
  margin-bottom: 16px;
}

.submit-work-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.submit-work-thumb {
  width: 64px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.empty-text {
  color: #c0c4cc;
}

/* ========== 步骤条 ========== */
.publish-steps {
  display: grid;
  grid-template-columns: max-content 1fr max-content 1fr max-content;
  align-items: center;
  gap: 16px;
  padding: 16px 32px;
  border-bottom: 1px solid #eeeeee;
}

.publish-steps span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8b8f98;
  font-size: 13px;
  font-weight: 600;
}

.publish-steps strong {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #f0f2f5;
  color: #8b8f98;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.publish-steps span.active,
.publish-steps span.done {
  color: #202124;
}

.publish-steps span.active strong,
.publish-steps span.done strong {
  background: #2d7ff9;
  color: #fff;
}

.publish-steps i {
  height: 1px;
  background: #e3e5e8;
}
</style>
