# 静态图上传功能实现说明

## 功能概述

在作品列表页面支持上传静态图片文件（JPEG/PNG），自动解析为像素数据，上传到 OSS，并创建标准化的作品记录。

## 核心流程

```
用户选择图片文件
    ↓
handleFileUpload(file)
    ↓
Step 1: 解析图片 → 像素数据
  imageFromFile(file)
  renderImageToPixels(image, options)
    ↓
Step 2: 创建项目数据
  projectData = {
    frames: [{
      layers: [{
        pixels: [...512 pixels...]
      }]
    }]
  }
    ↓
Step 3: 上传到 OSS
  uploadStaticImageWithJson(file, projectData)
  ├─ 上传封面图 (COVER_IMAGE)
  ├─ 转换为 RGB565 二进制 (STATIC_BIN)
  ├─ 转换为 PNG 预览图 (STATIC_BIN)
  └─ 上传 JSON 数据 (EDITABLE_JSON)
    ↓
Step 4: 创建作品
  createWorkApi(workData)
    ↓
Step 5: 刷新列表
  fetchWorks()
```

## 详细实现

### 1. 文件解析

**函数：** `handleFileUpload(e: Event)`

**位置：** `src/pages/works/index.vue:628`

```typescript
const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) return

  // 验证文件类型
  if (fileType !== 'image/jpeg' && fileType !== 'image/png') {
    ElMessage.error(t('common.fileTypeError'))
    return
  }

  // Step 1: 解析图片为像素数据
  const imageFile = await imageFromFile(file)
  const pixels = renderImageToPixels(imageFile, {
    fit: 'contain',
    cropX: 0.5,
    cropY: 0.5,
    zoom: 1,
    preserveColors: true,
    outputWidth: CANVAS_WIDTH,   // 256
    outputHeight: CANVAS_HEIGHT, // 256
    allowUpscale: false,
    dither: 'none',
  })
}
```

**解析参数：**
- `fit: 'contain'` - 保持宽高比，完整显示
- `cropX/cropY: 0.5` - 居中裁剪
- `preserveColors: true` - 保留原始颜色
- `outputWidth/Height: 256` - 输出尺寸 256x256
- `dither: 'none'` - 不使用抖动

### 2. 创建项目数据

```typescript
const projectData = {
  id: projectId,
  version: 4,
  name: file.name.split('.')[0],
  width: CANVAS_WIDTH,   // 256
  height: CANVAS_HEIGHT, // 256
  currentFrameIndex: 0,
  activeLayer: 0,
  frames: [
    {
      id: frameId,
      delay: 120,
      viewportX: 0,
      viewportY: 0,
      layers: [
        {
          id: layerId,
          name: 'Layer 1',
          visible: true,
          opacity: 1,
          pixels: pixels,      // 65536 个像素（256x256）
          canvasPixels: {},
        },
      ],
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
```

### 3. OSS 上传

**函数：** `uploadStaticImageWithJson(file, projectData)`

**位置：** `src/lib/images/uploadFile.ts:297`

```typescript
export const uploadStaticImageWithJson = async (
  file: File,
  projectData: object
): Promise<{
  coverUrl: string
  binFileUrl: string
  binFileSize: number
  editableFileUrl: string
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: 上传原始图片作为封面
      await uploadFile(file, file.name, 'COVER_IMAGE')

      // Step 2: 转换为 RGB565 二进制数据
      const rgb565Blob = await convertImageToRGB565(file, UploadFileEnum.STATIC_BIN)
      const binUploadRes = await uploadFile(rgb565Blob, binFileName, 'STATIC_BIN')

      // Step 3: 转换为 PNG 预览图
      const pngBlob = await convertRgb565BlobToPng(
        rgb565Blob,
        defaultImageSize.width,
        defaultImageSize.height
      )
      const pngUploadRes = await uploadFile(pngBlob, file.name, 'STATIC_BIN')

      // Step 4: 上传项目 JSON 数据
      const jsonUploadRes = await uploadPixelJSON(projectData)

      resolve({
        coverUrl: pngUploadRes.fileUrl,
        binFileUrl: binUploadRes.fileUrl,
        binFileSize: binUploadRes.fileSize,
        editableFileUrl: jsonUploadRes.fileUrl,
      })
    } catch (error) {
      reject(error)
    }
  })
}
```

**上传文件清单：**
1. **封面图** (`COVER_IMAGE`)
   - 原始图片文件
   - 用于作品列表展示

2. **二进制数据** (`STATIC_BIN`)
   - RGB565 格式
   - 用于 LED 预览播放

3. **PNG 预览图** (`STATIC_BIN`)
   - 64x16 像素化预览
   - 用于封面缩略图

4. **JSON 数据** (`EDITABLE_JSON`)
   - 完整的项目数据
   - 用于编辑器还原

### 4. 创建作品

```typescript
const workData: CreatorWorkSaveRequest = {
  title: file.name.split('.')[0],
  type: 'STATIC',
  coverUrl: uploadResult.coverUrl,
  editableFileUrl: uploadResult.editableFileUrl,
  binFileUrl: uploadResult.binFileUrl,
  binFileSize: uploadResult.binFileSize,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  frameCount: 1,
  frameDelay: 120,
}

const workResult = await createWorkApi(workData)
```

### 5. 图片解析流程

```
原始图片 (任意尺寸)
    ↓
imageFromFile(file)
    ↓
HTMLImageElement
    ↓
renderImageToPixels(image, options)
    ↓
创建 Canvas (256x256)
    ↓
绘制图片（保持比例，居中）
    ↓
获取像素数据
    ↓
preserveImageDataColors(data)
    ↓
颜色数组 [color1, color2, ...] (65536 个)
    ↓
转换为调色板颜色
    ↓
pixels: (string | null)[] (65536 个)
```

## 新增函数

### uploadStaticImage

**位置：** `src/lib/images/uploadFile.ts:230`

```typescript
export const uploadStaticImage = (file: File): Promise<AddArtifactParam>
```

上传静态图，生成封面、二进制文件和预览图。

### uploadStaticImageWithJson

**位置：** `src/lib/images/uploadFile.ts:249`

```typescript
export const uploadStaticImageWithJson = async (
  file: File,
  projectData: object
): Promise<{
  coverUrl: string
  binFileUrl: string
  binFileSize: number
  editableFileUrl: string
}>
```

上传静态图 + JSON 数据，一次性完成所有上传。

## 数据转换

### 像素数据格式

**输入：** HTMLImageElement（任意尺寸）

**处理：**
1. 缩放到 256x256
2. 保持宽高比（contain）
3. 居中显示
4. 提取像素颜色

**输出：** 65536 个颜色值（256x256）

```typescript
pixels: [
  "#ff004d", "#ff004d", "#ffa300", ...  // 65536 个
]
```

### RGB565 转换

**函数：** `convertImageToRGB565(file, UploadFileEnum.STATIC_BIN)`

**位置：** `src/lib/images/rgb.ts:10`

```typescript
// RGB888 → RGB565
R: 8-bit → 5-bit (>> 3)
G: 8-bit → 6-bit (>> 2)
B: 8-bit → 5-bit (>> 3)

// 组合为 16-bit
rgb565 = (r5 << 11) | (g6 << 5) | b5

// 存储为字节数组
byteArray[index * 2] = (rgb565 >>> 8) & 0xff  // 高字节
byteArray[index * 2 + 1] = rgb565 & 0xff      // 低字节
```

**文件大小：**
- 256x256x2 bytes = 131,072 bytes ≈ 128KB

### PNG 预览图

**函数：** `convertRgb565BlobToPng(blob, 64, 16)`

**位置：** `src/lib/images/rgb.ts:98`

**转换流程：**
1. RGB565 → RGB888
2. 缩放到 64x16
3. 生成 PNG 图片

**用途：** 作品列表封面预览

## 导入依赖

### works/index.vue

```typescript
// 图片解析
import {
  imageFromFile,
  renderImageToPixels,
} from '@/modules/pixel-editor/core/image-import'

// 画布尺寸
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/modules/pixel-editor/core/index'

// 上传函数
import {
  uploadStaticImageWithJson,
} from '@/lib/images/uploadFile'

// API
import { createWorkApi } from '@/api/works'
import type { CreatorWorkSaveRequest } from '@/api/works'
```

## 上传文件结构

```
OSS Storage
├── cover/
│   └── {filename}.jpg/png          (原始图片)
├── bin/
│   └── bin                          (RGB565 二进制)
├── im/
│   └── {filename}.png              (PNG 预览图)
└── file/
    └── {projectName}.json          (项目数据)
```

## 错误处理

### 异常场景

| 场景 | 处理方式 |
|------|---------|
| 文件类型错误 | 显示错误提示，终止上传 |
| 图片解析失败 | 捕获异常，显示"上传失败" |
| OSS 上传失败 | 捕获异常，显示"上传失败" |
| API 调用失败 | 捕获异常，显示"上传失败" |
| 网络错误 | try-catch 统一处理 |

### 错误提示

```typescript
// 文件类型错误
ElMessage.error(t('common.fileTypeError'))

// 上传失败
ElMessage.error(t('common.pxm_upload_failed'))
```

## 与涂鸦上传的对比

| 特性 | 静态图上传 | 涂鸦上传 |
|------|-----------|---------|
| **输入** | 图片文件 | 颜色数组 |
| **解析** | imageFromFile + renderImageToPixels | 直接使用 |
| **RGB565** | convertImageToRGB565 | colorsToBlob |
| **PNG 预览** | convertRgb565BlobToPng | convertHexArrayToPng |
| **JSON 数据** | uploadPixelJSON | uploadDoodle (colorsToJsonBlob) |
| **文件数量** | 4 个（封面、二进制、PNG、JSON） | 3 个（JSON、PNG、二进制） |
| **输出尺寸** | 256x256 | 64x16 |

## 编辑器预览

### 路由跳转

```typescript
// 上传成功后跳转到编辑器
router.push({
  path: '/pixel-editor',
  query: { workId: workResult.result }
})
```

### 数据加载

编辑器通过 `loadWorkForEdit(workId)` 加载：
1. 调用 `getWorkDetailApi(workId)` 获取作品详情
2. 从 `editableFileUrl` 加载 JSON 数据
3. 解析并还原到画板

**详细实现：** [edit-work-feature.md](edit-work-feature.md)

## 关键特性

✅ **自动解析**：图片自动转换为像素数据  
✅ **保持比例**：contain 模式，不变形  
✅ **保留颜色**：preserveColors 模式  
✅ **多文件上传**：封面 + 二进制 + PNG + JSON  
✅ **标准化数据**：与涂鸦上传一致的 JSON 格式  
✅ **错误处理**：完整的异常捕获  
✅ **用户反馈**：成功/失败提示  
✅ **可预览**：支持跳转编辑器预览  

## 注意事项

### ⚠️ 重要限制

1. **输出尺寸固定**
   - 当前为 256x256（CANVAS_WIDTH x CANVAS_HEIGHT）
   - 像素编辑器画布为 32x16（WIDTH x HEIGHT）

2. **单帧单图层**
   - 当前只创建单帧单图层
   - 所有像素在 Layer 1

3. **文件大小限制**
   - RGB565 二进制：128KB
   - PNG 预览：较小
   - 封面图：原始大小

4. **格式支持**
   - 仅支持 JPEG/PNG
   - 不支持 GIF

### 🔄 未来扩展

1. **多帧支持**
   - 解析 GIF 动图
   - 创建多帧项目

2. **多图层支持**
   - 分离前景/背景
   - 智能分层

3. **尺寸适配**
   - 支持不同画布尺寸
   - 自动适配像素编辑器

4. **实时预览**
   - 上传前预览效果
   - 调整参数实时更新

## 文件修改清单

### 新增文件

- `src/lib/images/uploadFile.ts` - 新增 `uploadStaticImage()` 和 `uploadStaticImageWithJson()`

### 修改文件

- `src/pages/works/index.vue` - 重写 `handleFileUpload()` 函数
- `src/lib/images/uploadFile.ts` - 新增静态图上传函数

### 未修改文件

- 编辑器相关文件 - 使用现有功能
- API 相关文件 - 使用现有接口

## 测试场景

### 场景 1：上传小尺寸图片

```
文件: 32x16.png
    ↓
解析: 256x256 画布
    ↓
上传: 4 个文件到 OSS
    ↓
创建作品 ✅
```

### 场景 2：上传大尺寸图片

```
文件: 1920x1080.jpg
    ↓
缩放: contain 模式 → 居中裁剪
    ↓
解析: 256x256 像素数据
    ↓
上传 ✅
```

### 场景 3：上传非标准比例

```
文件: 100x100.png (1:1)
    ↓
contain: 完整显示，可能有留白
    ↓
解析: 256x256（部分区域为空）
    ↓
上传 ✅
```

## 总结

✅ **完整的静态图上传流程**：解析 → 转换 → 上传 → 创建作品  
✅ **标准化数据格式**：与涂鸦上传一致的 JSON 结构  
✅ **多文件上传**：封面、二进制、PNG、JSON 全套文件  
✅ **画板预览支持**：可在像素编辑器中完整还原  
✅ **错误处理完善**：类型验证、异常捕获、用户提示  
✅ **可扩展性强**：支持未来多帧、多图层等特性
