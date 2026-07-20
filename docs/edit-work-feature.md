# 作品编辑功能实现说明

## 功能概述

支持从作品列表页面跳转到像素编辑器编辑已有的作品，自动加载作品数据并还原到画板中。

## 核心流程

```
作品列表点击"编辑"
    ↓
跳转到 /pixel-editor?workId={作品ID}
    ↓
PixelEditor 挂载
    ↓
检测到 workId 参数
    ↓
loadWorkForEdit(workId)
    ↓
Step 1: getWorkDetailApi(workId)
    ↓
Step 2: fetchJsonFromUrl(editableFileUrl)
    ↓
Step 3: 解析 JSON → 转换数据格式
    ↓
Step 4: 创建 Project 对象
    ↓
Step 5: 渲染到画板
```

## 详细实现

### 1. 路由跳转（从作品列表）

**文件：** `src/pages/works/index.vue`

```typescript
const openEditWork = (work: WorkItem) => {
  updateWorkApi(work.id, { title: work.title }).catch(() => {})
  router.push({ path: '/pixel-editor', query: { workId: work.id } })
}
```

**跳转 URL：**
```
/pixel-editor?workId=work_xxx
```

### 2. 加载编辑作品

**函数：** `loadWorkForEdit(workId: string)`

**位置：** `PixelEditor.vue:1338`

```typescript
async function loadWorkForEdit(workId: string): Promise<void> {
  if (!workId) return

  try {
    loadingWork.value = true
    editingWorkId.value = workId

    // Step 1: 获取作品详情
    const workDetail = await getWorkDetailApi(workId)
    editingWork.value = workDetail

    // Step 2: 从 editableFileUrl 加载 JSON 数据
    if (workDetail.editableFileUrl) {
      const projectData = await fetchJsonFromUrl<ProjectData>(workDetail.editableFileUrl)

      // Step 3: 转换数据为 Project 格式
      const frames = (projectData.frames || []).map((frameData) => ({
        id: frameData.id || id('frame'),
        delay: frameData.delay || 120,
        viewportX: frameData.viewportX || DEFAULT_VIEWPORT_X,
        viewportY: frameData.viewportY || DEFAULT_VIEWPORT_Y,
        layers: (frameData.layers || []).map((layerData) => ({
          id: layerData.id || id('layer'),
          name: layerData.name || t('common.pxm_editor_layer_one'),
          visible: layerData.visible !== false,
          opacity: layerData.opacity ?? 1,
          pixels: Array.isArray(layerData.pixels) ? layerData.pixels : emptyPixels(),
          canvasPixels: {},
        })),
      }))

      // Step 4: 创建新项目
      const newProject = sanitizeProject({
        id: projectData.id || id('project'),
        version: projectData.version || 4,
        name: projectData.name || workDetail.title || 'New Work',
        width: projectData.width || WIDTH,
        height: projectData.height || HEIGHT,
        currentFrameIndex: projectData.currentFrameIndex || 0,
        activeLayer: projectData.activeLayer || 0,
        frames: frames,
        createdAt: projectData.createdAt || Date.now(),
        updatedAt: Date.now(),
      })

      // Step 5: 切换到编辑模式
      projects.value.push(newProject)
      project.value = newProject
      view.value = 'editor'
      currentId.value = newProject.id
      localStorage.setItem(CURRENT_KEY, newProject.id)

      clearSelectionState()
      syncFrameDelayInput()
      persistNow()
    } else {
      // 没有 editableFileUrl，创建新项目
      handleNewProject()
    }
  } catch (error) {
    console.error('Failed to load work for editing:', error)
    ElMessage.error(t('common.pxm_editor_load_failed'))
    view.value = 'library'
  } finally {
    loadingWork.value = false
  }
}
```

### 3. 生命周期钩子

**位置：** `PixelEditor.vue:2795`

```typescript
onMounted(() => {
  applyTheme()
  syncFrameDelayInput()
  keydownHandler.value = handleKeydown
  window.addEventListener('keydown', keydownHandler.value)
  persistNow()
  nextTick(renderAll)

  // 检查是否有编辑作品的路由参数
  const workId = route.query.workId as string
  if (workId) {
    console.log('Loading work for editing:', workId)
    loadWorkForEdit(workId)
  } else {
    // 没有编辑参数，进入库视图
    view.value = 'library'
  }
})
```

### 4. 保存功能（支持创建和更新）

**函数：** `handleSaveToOSS()`

**位置：** `PixelEditor.vue:1261`

```typescript
async function handleSaveToOSS(): Promise<void> {
  // ... 上传逻辑 ...

  // Step 3: Create or Update work via API
  let workResult: string | void

  // 判断是创建还是更新
  if (editingWorkId.value) {
    // 编辑模式：更新已有作品
    await updateWorkApi(editingWorkId.value, workData)
    workResult = editingWorkId.value
  } else {
    // 创建模式：新建作品
    workResult = await createWorkApi(workData)
  }

  // 如果是新创建的作品，记录 ID
  if (workResult && typeof workResult === 'string' && !editingWorkId.value) {
    editingWorkId.value = workResult
  }
}
```

### 5. 从 URL 加载 JSON

**函数：** `fetchJsonFromUrl<T>(url: string)`

```typescript
async function fetchJsonFromUrl<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
  }
  return response.json()
}
```

## 数据结构转换

### JSON 数据格式（OSS）

```typescript
interface ProjectData {
  id?: string
  version: number
  name: string
  width: number
  height: number
  currentFrameIndex: number
  activeLayer: number
  frames: Array<{
    id?: string
    delay: number
    viewportX: number
    viewportY: number
    layers: Array<{
      id?: string
      name: string
      visible: boolean
      opacity: number
      pixels: (string | null)[]  // 像素颜色数组
      canvasPixels?: Record<string, string>
    }>
  }>
  createdAt?: number
  updatedAt?: number
}
```

### Project 对象格式（内部）

```typescript
interface Project {
  id: string
  version: number
  name: string
  width: number
  height: number
  currentFrameIndex: number
  activeLayer: number
  frames: Frame[]
  createdAt: number
  updatedAt: number
}

interface Frame {
  id: string
  delay: number
  viewportX: number
  viewportY: number
  layers: Layer[]
}

interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number
  pixels: (string | null)[]  // 512 个像素（32x16）
  canvasPixels: Record<string, string>  // 画布缓存
}
```

### 转换映射

| JSON 字段 | Project 字段 | 处理逻辑 |
|----------|-------------|---------|
| `projectData.frames[i].layers[j].pixels` | `layer.pixels` | 直接赋值 |
| `projectData.frames[i].layers[j].canvasPixels` | `layer.canvasPixels` | 初始化为 `{}` |
| `projectData.frames[i].delay` | `frame.delay` | 默认 120ms |
| `projectData.frames[i].viewportX` | `frame.viewportX` | 默认 DEFAULT_VIEWPORT_X |
| `projectData.frames[i].viewportY` | `frame.viewportY` | 默认 DEFAULT_VIEWPORT_Y |

## 响应式状态

### 新增状态变量

```typescript
// 路由
const route = useRoute()

// 编辑相关
const editingWorkId = ref<string | null>(null)
const editingWork = ref<CreatorWorkVO | null>(null)
const loadingWork = ref(false)
```

### 状态说明

| 变量 | 类型 | 说明 |
|------|------|------|
| `editingWorkId` | `string \| null` | 正在编辑的作品 ID |
| `editingWork` | `CreatorWorkVO \| null` | 作品详情数据 |
| `loadingWork` | `boolean` | 是否正在加载作品 |

## UI 变化

### 编辑模式标识

**位置：** 编辑器工具栏标题旁

```vue
<span v-if="editingWork" class="pe-editing-badge">
  {{ t('common.pxm_editor_editing_mode') }}
</span>
```

**显示效果：**
```
作品名称  2 帧 · 图层 1  [编辑中]
```

### 加载状态

加载作品时显示 `loadingWork` 状态，可以在 UI 中添加加载指示器。

## API 调用流程

### 1. 获取作品详情

```typescript
GET /api/creator/works/{workId}

// 响应
{
  "id": "work_xxx",
  "title": "My Pixel Art",
  "type": "STATIC",
  "editableFileUrl": "https://storage.../project.json",
  "coverUrl": "https://storage.../cover.png",
  "binFileUrl": "https://storage.../data.bin",
  "binFileSize": 1024,
  "width": 32,
  "height": 16,
  "frameCount": 2,
  "frameDelay": 120,
  // ... 其他字段
}
```

### 2. 加载 JSON 数据

```typescript
GET https://storage.../project.json

// 响应（完整的项目数据）
{
  "id": "project_xxx",
  "version": 4,
  "name": "My Pixel Art",
  "width": 32,
  "height": 16,
  "currentFrameIndex": 0,
  "activeLayer": 0,
  "frames": [...],
  "createdAt": 1784528818238,
  "updatedAt": 1784529000000
}
```

### 3. 保存（创建或更新）

**创建模式：**
```typescript
POST /api/creator/works
```

**更新模式：**
```typescript
PUT /api/creator/works/{workId}
```

## 导入依赖

### 新增导入

```typescript
// 路由
import { useRoute } from 'vue-router'

// API
import { getWorkDetailApi, updateWorkApi } from '@/api/works'
import type { CreatorWorkVO } from '@/api/works'
```

### 完整导入列表

```typescript
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Ref, CanvasHTMLAttributes } from 'vue'
import { useRoute } from 'vue-router'  // ✅ 新增
import { ElMessage } from 'element-plus'

import { useAppI18n } from '@@/composables/useI18n'

import { uploadPixelJSON, uploadDoodle } from '@/lib/images/uploadFile'

import { createWorkApi, updateWorkApi, getWorkDetailApi } from '@/api/works'  // ✅ 新增 getWorkDetailApi, updateWorkApi
import type { CreatorWorkSaveRequest, CreatorWorkVO } from '@/api/works'  // ✅ 新增 CreatorWorkVO
```

## i18n 翻译键

### 新增翻译键

**英文 (en-US):**
```typescript
pxm_editor_no_editable_file: 'This work has no editable data available.',
pxm_editor_load_failed: 'Failed to load work. Please try again.',
pxm_editor_editing_mode: 'Editing',
```

**中文 (zh-CN):**
```typescript
pxm_editor_no_editable_file: '该作品暂无可用编辑数据',
pxm_editor_load_failed: '加载作品失败，请重试',
pxm_editor_editing_mode: '编辑中',
```

## 错误处理

### 异常场景

| 场景 | 处理方式 |
|------|---------|
| 网络错误 | 捕获异常，显示错误提示 |
| 作品不存在 | 返回 404，显示"加载失败" |
| JSON 解析失败 | 抛出错误，显示"加载失败" |
| editableFileUrl 为空 | 创建新项目，显示警告 |
| OSS URL 不可访问 | 网络错误处理 |

### 错误提示

```typescript
// 没有可编辑文件
ElMessage.warning(t('common.pxm_editor_no_editable_file'))

// 加载失败
ElMessage.error(t('common.pxm_editor_load_failed'))
```

## 生命周期

### 组件挂载流程

```
onMounted()
    ↓
检查 route.query.workId
    ↓
存在 → loadWorkForEdit(workId)
    ↓
获取作品详情
    ↓
加载 JSON 数据
    ↓
解析并转换数据
    ↓
创建 Project 对象
    ↓
渲染到画板 ✅

不存在 → view.value = 'library'
    ↓
显示作品库 ✅
```

### 保存流程（编辑模式）

```
用户点击 Save
    ↓
editingWorkId.value 存在？
    ↓
是 → updateWorkApi(editingWorkId, workData)
    ↓
否 → createWorkApi(workData)
    ↓
保存成功
```

## 测试场景

### 场景 1：编辑新创建的作品

```
1. 在作品列表点击"创建"
2. 绘制像素画
3. 点击 Save（创建新作品）
4. 返回作品列表
5. 点击刚创建的作品的"编辑"
6. 预期：画板显示之前绘制的内容 ✅
```

### 场景 2：编辑已有作品

```
1. 在作品列表点击某个作品的"编辑"
2. 预期：画板显示该作品的像素数据 ✅
3. 修改像素
4. 点击 Save（更新作品）
5. 返回作品列表
6. 预期：作品封面已更新 ✅
```

### 场景 3：没有可编辑数据的作品

```
1. 编辑一个没有 editableFileUrl 的作品
2. 预期：显示警告，创建新项目 ✅
```

### 场景 4：无效的作品 ID

```
1. 访问 /pixel-editor?workId=invalid_id
2. 预期：显示错误提示，回到库视图 ✅
```

## 关键特性

✅ **完整的编辑流程**：从作品列表到画板还原  
✅ **数据解析**：正确解析 JSON 并转换为 Project 格式  
✅ **画板渲染**：像素数据正确还原到画板  
✅ **创建/更新模式**：自动判断是新建还是更新  
✅ **错误处理**：完整的异常捕获和用户提示  
✅ **加载状态**：loadingWork 状态管理  
✅ **编辑标识**：工具栏显示"编辑中"徽章  
✅ **i18n 支持**：完整的多语言翻译  
✅ **路由参数**：通过 workId 加载对应作品  

## 注意事项

### ⚠️ 重要限制

1. **依赖 editableFileUrl**
   - 只有保存过的作品才有可编辑数据
   - 没有 editableFileUrl 的作品无法编辑

2. **第一帧第一层**
   - 只加载第一帧第一层的像素数据
   - 多图层项目仅加载顶层

3. **数据格式兼容**
   - JSON 数据格式需与保存时一致
   - 缺少字段使用默认值填充

### 🔄 未来扩展

1. **支持多帧加载**
   - 当前只加载所有帧的像素数据
   - 需要验证帧切换逻辑

2. **支持多图层**
   - 当前加载所有图层
   - 需要验证图层可见性和编辑逻辑

3. **增量更新**
   - 只上传修改的部分
   - 减少上传时间和带宽

4. **实时保存**
   - 编辑时自动保存
   - 防止数据丢失

## 文件修改清单

### 修改的文件

1. **PixelEditor.vue**
   - 新增导入：`useRoute`, `getWorkDetailApi`, `updateWorkApi`, `CreatorWorkVO`
   - 新增状态：`route`, `editingWorkId`, `editingWork`, `loadingWork`
   - 新增函数：`loadWorkForEdit()`, `fetchJsonFromUrl()`
   - 修改函数：`handleSaveToOSS()`, `onMounted()`
   - UI 更新：编辑模式徽章

2. **en-US/common.ts**
   - 新增翻译键：`pxm_editor_no_editable_file`, `pxm_editor_load_failed`, `pxm_editor_editing_mode`

3. **zh-CN/common.ts**
   - 新增翻译键：`pxm_editor_no_editable_file`, `pxm_editor_load_failed`, `pxm_editor_editing_mode`

### 未修改的文件

- `uploadFile.ts` - 使用现有函数
- `works.ts` - 使用现有接口
- 其他文件 - 无需修改

## 总结

✅ **完整的编辑功能**：从路由参数到画板还原  
✅ **创建/更新双模式**：自动判断并调用相应 API  
✅ **数据完整性**：完整解析 JSON 并还原到画板  
✅ **用户友好**：编辑模式标识、加载状态、错误提示  
✅ **可扩展性**：支持未来多帧、多图层等特性
