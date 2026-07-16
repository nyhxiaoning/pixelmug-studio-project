<template>
  <main class="content">
    <!-- 顶部标题区域 a -->
    <header class="topbar community-topbar">
      <div>
        <h1 pxm_publish_title>发布管理</h1>
        <p pxm_publish_subtitle>选择未发布作品提交官方审核，通过后即可上架。</p>
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
        <span pxm_publish_apply>发布</span>
      </el-button>
    </header>

    <section class="community-page">
      <!-- 统计卡片区域 b -->
      <div class="community-stats">
        <div class="stat-card">
          <strong pxm_publish_stats_live>{{ statData.live }}</strong>
          <span>已上架</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_review>{{ statData.review }}</strong>
          <span>审核中</span>
        </div>
        <div class="stat-card">
          <strong pxm_publish_stats_draft>{{ statData.draft }}</strong>
          <span>可申请</span>
        </div>
      </div>

      <section class="community-section">
        <div class="community-section-head">
          <h2>发布管理列表</h2>
          <div class="community-status-filter">
            <span>发布状态</span>
            <el-select
              v-model="queryParams.status"
              placeholder="全部状态"
              pxm_publish_status_filter
              @change="loadTableData"
            >
              <el-option label="全部" value="all" />
              <el-option label="审核中" value="pending" />
              <el-option label="已上架" value="live" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="已下架" value="offline" />
            </el-select>
          </div>
        </div>

        <!-- 发布管理表格 -->
        <el-table :data="tableData" border stripe style="width: 100%">
          <el-table-column label="作品信息" min-width="280">
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
          <el-table-column label="当前版本" prop="version" width="100" />
          <el-table-column label="上次提交时间" prop="lastSubmit" width="140" />
          <el-table-column label="最新修改时间" prop="lastUpdate" width="140" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="240">
            <template #default="{ row }">
              <div class="publish-actions">
                <!-- 已上架：提交更新 / 下架 f -->
                <template v-if="row.status === 'live'">
                  <el-button size="small" pxm_publish_update @click="handleUpdate(row)">
                    提交更新
                  </el-button>
                  <el-button
                    size="small"
                    type="warning"
                    pxm_publish_unPublish
                    @click="handleUnpublish(row)"
                  >
                    下架
                  </el-button>
                </template>
                <!-- 审核中：撤回 g -->
                <template v-if="row.status === 'pending'">
                  <el-button
                    size="small"
                    type="danger"
                    pxm_publish_withdraw
                    @click="handleWithdraw(row)"
                  >
                    撤回
                  </el-button>
                </template>
                <!-- 已驳回：重新发布 h -->
                <template v-if="row.status === 'rejected'">
                  <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                    发布
                  </el-button>
                </template>
                <!-- 已下架：重新发布 + 删除 h i -->
                <template v-if="row.status === 'offline'">
                  <el-button size="small" pxm_publish_apply @click="singlePublish(row)">
                    发布
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    pxm_action_delete
                    @click="handleDelete(row)"
                  >
                    删除
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
      title="选择作品提交发布"
      width="70%"
      @close="resetDialogSelect"
    >
      <el-input
        v-model="searchDraftKey"
        placeholder="搜索作品名称"
        clearable
        style="margin-bottom: 12px"
      />
      <el-table ref="draftTableRef" :data="draftWorkList" border row-key="id" style="width: 100%">
        <el-table-column type="selection" />
        <el-table-column label="预览" width="80">
          <template #default="{ row }">
            <div class="publish-thumb small" />
          </template>
        </el-table-column>
        <el-table-column label="作品名称" prop="name" />
        <el-table-column label="当前版本" prop="version" width="100" />
      </el-table>
      <template #footer>
        <el-button @click="resourceDialogVisible = false"> 取消 </el-button>
        <el-button type="primary" pxm_publish_apply @click="submitBatchPublish"> 发布 </el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// ===================== 查询条件 c =====================
const queryParams = reactive({
  status: 'all',
})

// 统计数据 b
const statData = ref({
  live: 0, // pxm_publish_stats_live 已上架
  review: 0, // pxm_publish_stats_review 审核中
  draft: 0, // pxm_publish_stats_draft 可申请
})

// 主表格列表
const tableData = ref([])

// 弹窗相关 D E
const resourceDialogVisible = ref(false)
const searchDraftKey = ref('')
const draftTableRef = ref(null)
// 草稿列表（可发布作品）
const draftWorkList = ref([])

// 筛选搜索弹窗草稿
const filterDraftList = computed(() => {
  if (!searchDraftKey.value) return draftWorkList.value
  return draftWorkList.value.filter((item) => item.name.includes(searchDraftKey.value))
})

// ========== 状态映射工具函数 ==========
const statusMap = {
  all: '全部',
  pending: '审核中',
  live: '已上架',
  rejected: '已驳回',
  offline: '已下架',
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

// ========== 模拟加载列表 ==========
const loadTableData = () => {
  // 模拟原始数据
  const mockAllData = [
    {
      id: 1,
      name: 'Mail icon (Community)',
      version: '1.4',
      lastSubmit: '2026.07.02',
      lastUpdate: '2026.07.06',
      status: 'pending',
      rejectReason: '',
    },
    {
      id: 2,
      name: '冒泡 2025',
      version: '1.0',
      lastSubmit: '2026.05.21',
      lastUpdate: '2026.06.12',
      status: 'rejected',
      rejectReason: 'Reason: The image has blank edges. Crop it and submit again.',
    },
    {
      id: 3,
      name: '星空像素动画',
      version: '2.1',
      lastSubmit: '2026.04.10',
      lastUpdate: '2026.07.01',
      status: 'live',
      rejectReason: '',
    },
    {
      id: 4,
      name: '猫咪头像套件',
      version: '1.2',
      lastSubmit: '2026.03.15',
      lastUpdate: '2026.03.20',
      status: 'offline',
      rejectReason: '',
    },
  ]

  // 状态筛选
  if (queryParams.status === 'all') {
    tableData.value = mockAllData
  } else {
    tableData.value = mockAllData.filter((row) => row.status === queryParams.status)
  }

  // 更新统计数值
  statData.value.live = mockAllData.filter((d) => d.status === 'live').length
  statData.value.review = mockAllData.filter((d) => d.status === 'pending').length
  statData.value.draft = 19
}

// 加载弹窗草稿列表（未发布草稿）
const loadDraftWorkList = () => {
  draftWorkList.value = [
    { id: 101, name: '夏日云朵像素', version: '1.0' },
    { id: 102, name: '复古时钟素材', version: '2.2' },
    { id: 103, name: '霓虹文字模板', version: '1.1' },
  ]
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
  if (draftTableRef.value) draftTableRef.value.clearSelection()
}

/** e. 批量提交发布 */
const submitBatchPublish = () => {
  const selectedRows = draftTableRef.value.getSelectionRows()
  if (selectedRows.length === 0) {
    ElMessage.warning('请至少选择一个作品')
    return
  }
  console.log('批量提交发布', selectedRows)
  ElMessage.success(`成功提交${selectedRows.length}个作品进入审核队列`)
  resourceDialogVisible.value = false
  loadTableData()
}

/** h. 单行直接发布（已驳回/已下架） */
const singlePublish = (row) => {
  ElMessageBox.confirm(`确认提交【${row.name}】发起发布审核？`)
    .then(() => {
      console.log('单独发布', row)
      ElMessage.success('已提交审核')
      loadTableData()
    })
    .catch(() => {})
}

/** f. 已上架 - 提交更新 */
const handleUpdate = (row) => {
  ElMessageBox.confirm(`确认对【${row.name}】提交版本更新审核？`)
    .then(() => {
      ElMessage.success('更新申请已提交')
      loadTableData()
    })
    .catch(() => {})
}

/** f. 已上架 - 下架 */
const handleUnpublish = (row) => {
  ElMessageBox.confirm(`确定下架【${row.name}】？下架后公众无法查看`)
    .then(() => {
      row.status = 'offline'
      ElMessage.success('作品已下架')
      loadTableData()
    })
    .catch(() => {})
}

/** g. 审核中 - 撤回 */
const handleWithdraw = (row) => {
  ElMessageBox.confirm(`确认撤回审核中的作品【${row.name}】？`)
    .then(() => {
      row.status = 'draft'
      ElMessage.success('已撤回审核申请')
      loadTableData()
    })
    .catch(() => {})
}

/** i. 已下架 - 删除作品 */
const handleDelete = (row) => {
  ElMessageBox.confirm(`⚠ 删除【${row.name}】后数据无法恢复，确定删除？`, '危险操作', {
    type: 'error',
  })
    .then(() => {
      const idx = tableData.value.findIndex((item) => item.id === row.id)
      if (idx > -1) tableData.value.splice(idx, 1)
      ElMessage.success('作品已删除')
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
