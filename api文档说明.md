# 像素画编辑器 API 文档说明

> 本文档描述像素画编辑器作品的多帧数据结构设计、后端接口规范、数据流转方案及存储优化建议。
> 适用于：作品保存到后端、多端编辑同步、播放与展示分发。

---

## 一、现有数据结构分析

### 1.1 核心类型层级

```
Project（项目）
├── id / name / version / width / height     ← 元信息
├── currentFrameIndex / activeLayer          ← 游标状态
├── createdAt / updatedAt                    ← 时间戳
└── frames: Frame[]                          ← 帧列表

Frame（帧）
├── id / delay                               ← 帧级元信息
├── viewportX / viewportY                    ← 视窗偏移（在 256×256 大画布上的位置）
└── layers: Layer[]                          ← 图层栈

Layer（图层）
├── id / name                                ← 图层标识
├── visible / opacity                        ← 显示控制
├── pixels: PixelColor[]                     ← 32×16 视窗像素（密集数组）
└── canvasPixels: Record<string, string>      ← 256×256 世界像素（稀疏 map，"x,y"→hex）

PixelColor = string | null                    ← hex 颜色 or null（透明/空）
```

### 1.2 关键设计特点

| 特性 | 说明 |
|------|------|
| **双重坐标表示** | `pixels[]` 是相对视窗的密集数组，`canvasPixels{}` 是世界坐标的稀疏 map，互相同步 |
| **合成而非合并** | 渲染时实时 alpha 混合（`compositeFrame`），不预合成，保留图层可编辑性 |
| **稀疏存储优化** | `canvasPixels` 只存非空像素，大画布下节省大量空间 |
| **版本迁移** | `version` 字段（当前 v4），`sanitizeProject()` 负责旧版本数据清洗 |
| **序列化清洗** | `serializeProjectForSave()` 持久化前移除 `canvasPixels`，减小 localStorage 体积 |

### 1.3 当前常量约束

```
画布:  256 × 256 世界画布，32 × 16 视窗（可平移）
图层:  最多 4 层
帧数:  GIF 导出上限 50 帧
调色板: 24 色 PICO-8 风格
```

### 1.4 当前 GIF 导出链路

```
Project.frames[]
  → compositeFrame(frame)          // 每帧的 layers 实时 alpha 混合 → 512px 密集数组
  → encodeGif({ width, height, scale, frames: [{ delay, pixels }] })
  → Blob → downloadBlob()          // 浏览器下载 .gif 文件
```

**当前痛点**：

- **只导不存**：`exportGif()` 生成 Blob 后直接触发浏览器下载，没有走 HTTP 上传到后端
- **导出时才合成**：`compositeFrame()` 在导出那一刻才把每帧的图层压平
- **GIF 只进不出**：`loadGifImage()` 可以解码 GIF 进项目，但项目没法存回后端做二次编辑
- **没有增量更新**：`touchProject()` 每次改动都全量写 localStorage，后端无法做增量合并

---

## 二、分发场景与数据需求

| 分发形态 | 数据载体 | 前端需求 |
|---------|---------|---------|
| **静态图** | PNG 图片 URL / base64 | 只展示当前帧的合成效果 |
| **GIF 动图** | GIF 文件 URL / base64 | 展示所有帧的动画播放 |
| **二次编辑** | 分层 JSON | 恢复完整项目状态，可继续编辑 |

---

## 三、多帧作品数据结构设计

### 方案 A：最小化分发 — 纯图片 URL

适合内容分发网络（CDN）、社交分享、预览列表。

```json
{
  "id": "art_xxx",
  "name": "作品名",
  "type": "static" | "animated",
  "thumbnail": "https://cdn.example.com/art/art_xxx/thumb.png",
  "preview":   "https://cdn.example.com/art/art_xxx/preview.png",
  "gifUrl":    "https://cdn.example.com/art/art_xxx/anim.gif",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "createdAt": 1752500000000
}
```

**思路**：GIF 编码和 PNG 编码前置到服务端/构建阶段。前端拿到 URL 直接 `<img>` 展示，零解析开销。

---

### 方案 B：精简 JSON — 保留可渲染性，不需要编辑

适合需要前端二次渲染（如 LED 预览、自定义放大比例导出）但不需要编辑的场景。

```json
{
  "id": "art_xxx",
  "name": "作品名",
  "type": "static" | "animated",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "frames": [
    {
      "id": "frame_xxx",
      "index": 0,
      "delay": 120,
      "pixels": ["#ffcc00", null, null, "#00e436", ...]  // 512 个元素的密集数组
    }
  ]
}
```

**思路**：
- 去掉 `layers` / `canvasPixels` / `viewportX/Y` — 分发端不需要图层编辑能力
- `frames[].pixels` 预合成（用 `compositeFrame()` 计算好），分发端直接画，省去混合逻辑
- 若只需要静态图，只发 `frames[0].pixels` + `width` / `height`

---

### 方案 C：完整可编辑 — 保留分层数据

适合作品回编辑、跨端同步、云端保存-加载。

```json
{
  "id": "art_xxx",
  "name": "作品名",
  "type": "static" | "animated",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "currentFrameIndex": 0,
  "activeLayer": 0,
  "createdAt": 1752500000000,
  "updatedAt": 1752500000000,
  "thumbnail": "https://cdn.example.com/art/art_xxx/thumb.png",
  "gifUrl": "https://cdn.example.com/art/art_xxx/anim.gif",
  "frames": [
    {
      "id": "frame_xxx",
      "index": 0,
      "delay": 120,
      "viewportX": 112,
      "viewportY": 120,
      "layers": [
        {
          "id": "layer_xxx",
          "name": "图层 1",
          "visible": true,
          "opacity": 1.0,
          "pixels": {
            "0,0": "#ffcc00",
            "1,0": "#ffcc00",
            "2,0": "#00e436"
          }
        }
      ]
    }
  ]
}
```

**思路**：
- 完整保留当前数据结构
- `pixels` 采用稀疏 map（`"x,y" → "#rrggbb"`）而非密集数组，节省 96%+ 存储
- 附加分发辅助字段：`thumbnail`（缩略图）、`gifUrl`（预渲染 GIF）

---

### 方案 D：二进制高效编码（进阶）

适合大量像素作品批量下发、WebSocket 实时推送、低带宽场景。

```
┌──────────────────────────────────────────────────────────┐
│  Header (16 bytes)                                         │
│    magic: "PXA1"  version: u8  width: u8  height: u8       │
│    frameCount: u16  layerCount: u8  flags: u8  reserved     │
├──────────────────────────────────────────────────────────┤
│  Per-Frame (变长)                                          │
│    delay: u16  layerCount: u8  [layer entries...]          │
├──────────────────────────────────────────────────────────┤
│  Per-Layer                                                 │
│    visible: u1  opacity: u7  pixelCount: u16              │
│    [pixel entries: index:u16, color:RGB24]                 │
└──────────────────────────────────────────────────────────┘
```

- 只存非空像素（稀疏编码），`index` 用 u16，颜色用 RGB24
- 32×16 = 512 像素，空像素占比高时压缩比大
- 无需 JSON 解析，直接 `ArrayBuffer` → `Uint8Array` 解码

---

## 四、数据格式对比

| 方案 | JSON 体积 | 解析速度 | 可编辑性 | 实现成本 | 适用场景 |
|------|----------|---------|---------|---------|---------|
| A 图片 URL | 最小 | 最快 | 不支持 | 低 | CDN 分发、社交分享 |
| B 精简 JSON | 中等 | 中等 | 不支持 | 中 | 二次渲染、自定义导出 |
| C 完整 JSON | 最大 | 中等 | 支持 | 低 | 编辑同步、云端保存 |
| D 二进制 | 最小 | 最快 | 支持 | 高 | 批量推送、WebSocket |

---

## 五、后端接口规范

### 5.1 作品管理

#### 创建作品

```http
POST /api/artworks
Content-Type: application/json

{
  "name": "像素猫",
  "width": 32,
  "height": 16,
  "frames": [ /* FrameRecord[] */ ]
}
```

**Response**

```json
{
  "id": "art_xxx",
  "createdAt": 1752500000000
}
```

#### 拉取作品（编辑态）

```http
GET /api/artworks/:id
```

**Response** — 返回完整分层 JSON（`ArtworkRecord`）

```json
{
  "id": "art_xxx",
  "name": "像素猫",
  "width": 32,
  "height": 16,
  "frameCount": 8,
  "currentFrameIndex": 0,
  "activeLayer": 0,
  "createdAt": 1752500000000,
  "updatedAt": 1752500000000,
  "authorId": "user_xxx",
  "tags": ["cat", "animation"],
  "visibility": "public",
  "likeCount": 42,
  "playCount": 128,
  "frames": [
    {
      "id": "frame_xxx",
      "index": 0,
      "delay": 120,
      "viewportX": 112,
      "viewportY": 120,
      "layers": [
        {
          "id": "layer_xxx",
          "name": "图层 1",
          "visible": true,
          "opacity": 1.0,
          "pixels": {
            "0,0": "#ffcc00",
            "1,0": "#ffcc00"
          }
        }
      ]
    }
  ]
}
```

#### 更新作品

```http
PUT /api/artworks/:id
Content-Type: application/json
```

请求体与 `POST` 相同，支持全量覆盖或增量更新。

#### 删除作品

```http
DELETE /api/artworks/:id
```

---

### 5.2 作品列表（元数据索引）

```http
GET /api/artworks?page=1&limit=20&sort=updatedAt&order=desc
```

**Response**

```json
{
  "total": 128,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": "art_xxx",
      "name": "像素猫",
      "thumbnailUrl": "https://cdn.example.com/art/art_xxx/thumb.png",
      "gifPreviewUrl": "https://cdn.example.com/art/art_xxx/preview.gif",
      "frameCount": 8,
      "totalDuration": 960,
      "width": 32,
      "height": 16,
      "authorId": "user_xxx",
      "authorName": "张三",
      "tags": ["cat", "animation"],
      "visibility": "public",
      "likeCount": 42,
      "playCount": 128,
      "createdAt": 1752500000000,
      "updatedAt": 1752500000000,
      "dominantColors": ["#ffcc00", "#00e436", "#29adff"]
    }
  ]
}
```

---

### 5.3 播放资源

```http
GET /api/artworks/:id/playback
```

**Response** — 播放态资源包（`ArtworkPlayback`）

```json
{
  "id": "art_xxx",
  "name": "像素猫",
  "width": 32,
  "height": 16,
  "totalDuration": 960,
  "gifUrl": "https://cdn.example.com/art/art_xxx/anim.gif",
  "thumbnails": [
    "data:image/png;base64,iVBORw0KGgo...",
    "data:image/png;base64,iVBORw0KGgo..."
  ],
  "frames": [
    {
      "index": 0,
      "delay": 120,
      "thumbnailData": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]
}
```

**思路**：编辑态 JSON 播放时需要 `compositeFrame()` 实时合成每帧。播放态直接提供 GIF / 帧缩略图，浏览器原生解码即可，零 CPU 消耗。

---

### 5.4 二进制资源上传

```http
PUT /api/artworks/:id/gif
Content-Type: image/gif

<binary gif data>
```

```http
PUT /api/artworks/:id/thumbnail
Content-Type: image/png

<binary png data>
```

---

### 5.5 帧级操作

#### 新增帧

```http
POST /api/artworks/:id/frames
Content-Type: application/json

{
  "delay": 120,
  "layers": [ /* LayerRecord[] */ ]
}
```

#### 更新单帧

```http
PUT /api/artworks/:id/frames/:frameId
Content-Type: application/json
```

#### 删除帧

```http
DELETE /api/artworks/:id/frames/:frameId
```

---

## 六、核心类型定义

### ArtworkRecord（编辑态完整记录）

```typescript
interface ArtworkRecord {
  /** 作品 ID */
  id: string
  /** 作品名称 */
  name: string
  /** 画布宽度（固定 32） */
  width: number
  /** 画布高度（固定 16） */
  height: number
  /** 总帧数 */
  frameCount: number
  /** 当前激活帧索引 */
  currentFrameIndex: number
  /** 当前激活图层索引 */
  activeLayer: number
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number

  // ── 后端管理字段 ──
  /** 作者 ID */
  authorId?: string
  /** 标签 */
  tags?: string[]
  /** 可见性 */
  visibility: 'public' | 'unlisted' | 'private'
  /** 点赞数 */
  likeCount?: number
  /** 播放数 */
  playCount?: number

  /** 帧列表 */
  frames: FrameRecord[]
}

interface FrameRecord {
  id: string
  /** 帧序号（后端排序用，不依赖数组顺序） */
  index: number
  /** 显示间隔（毫秒） */
  delay: number
  /** 视窗 X 偏移 */
  viewportX: number
  /** 视窗 Y 偏移 */
  viewportY: number
  /** 图层列表 */
  layers: LayerRecord[]
}

interface LayerRecord {
  id: string
  name: string
  visible: boolean
  opacity: number       // 0.1~1.0
  /** 稀疏像素：只存非空像素的坐标+颜色 */
  pixels: Record<string, string>   // "x,y" → "#rrggbb"
}
```

### ArtworkIndex（列表元数据）

```typescript
interface ArtworkIndex {
  id: string
  name: string
  /** 缩略图 URL */
  thumbnailUrl: string
  /** 循环 GIF 预览 URL（可选） */
  gifPreviewUrl?: string
  /** 总帧数 */
  frameCount: number
  /** 总时长（毫秒） */
  totalDuration: number
  width: number
  height: number
  authorId?: string
  authorName?: string
  /**
   * 作品标签分类
   */
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
  /**
   * 点赞数
   */
  likeCount: number
  /**
   * 播放数
   */
  playCount: number
  createdAt: number
  updatedAt: number
  /** 主色调（前 3 色），用于颜色筛选 */
  dominantColors: string[]
}
```

### ArtworkPlayback（播放资源包）

```typescript
interface ArtworkPlayback {
  id: string
  name: string
  width: number
  height: number
  /** 所有帧 delay 之和（毫秒） */
  totalDuration: number

  // ── 方案1：预渲染 GIF（最简单） ──
  /** 预渲染 GIF 地址（CDN） */
  gifUrl: string

  // ── 方案2：帧缩略图（支持逐帧控制） ──
  /** 每帧缩略图（base64 或 URL） */
  thumbnails: string[]
  frames: FrameThumbnail[]
}

interface FrameThumbnail {
  index: number
  delay: number
  /** base64 data URI 或 CDN URL */
  thumbnailData: string
  thumbnailUrl?: string
}
```

### 二进制编码 Header

```typescript
interface BinaryHeader {
  magic: 'PXA1'          // 4 bytes
  version: number        // 1 byte  (当前 1)
  width: number          // 1 byte  (固定 32)
  height: number         // 1 byte  (固定 16)
  frameCount: number     // 2 bytes
  layerCount: number     // 1 byte  (最多 4)
  flags: number          // 1 byte
  reserved: number       // 4 bytes
}
```

---

## 七、数据流转全景

```
                     ┌─────────────┐
                     │   前端编辑器   │
                     │ EditorView   │
                     └──────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
    ┌─────────▼──────┐          ┌─────────▼──────┐
    │   编辑态保存     │          │   导出/分享     │
    │  (编辑 + 二次加载)│          │  (GIF/PNG)     │
    └─────────┬──────┘          └─────────┬──────┘
              │                           │
    POST/PUT  │                   下载 Blob │
    /artworks │                           │
              ▼                           ▼
    ┌──────────────────┐          ┌──────────────┐
    │  ArtworkRecord   │          │  GIF / PNG   │
    │  (JSON, ~55KB)   │          │  (二进制文件)  │
    │  + 缩略图 + GIF   │          └──────────────┘
    └────────┬─────────┘               │
             │                         │ CDN / 直接下载
             │    ┌──────────┐         │
             └───▶│ 后端服务  │◀────────┘
                  │ /api/art │
                  └────┬─────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────▼──────┐         ┌──────▼──────┐
    │  编辑场景     │         │  播放/展示场景 │
    │ GET /:id    │         │ GET /:id/   │
    │ 返回完整 JSON │         │   playback  │
    └─────────────┘         └──────┬──────┘
                                  │
                         ┌────────▼──────┐
                         │  Artwork      │
                         │  Playback     │
                         │  (GIF URL +   │
                         │   帧缩略图)    │
                         └───────────────┘
```

---

## 八、接口总览

```
┌─────────┬──────────────────────────┬──────────────────────────────────┐
│ 方法    │ 路径                     │ 说明                              │
├─────────┼──────────────────────────┼──────────────────────────────────┤
│ POST    │ /artworks                │ 新建作品                          │
│ GET     │ /artworks                │ 列表（只含元数据+缩略图，分页）     │
│ GET     │ /artworks/:id            │ 编辑态（完整分层 JSON）            │
│ PUT     │ /artworks/:id            │ 更新作品（全量 or 增量）           │
│ DELETE  │ /artworks/:id            │ 删除作品                          │
│ PUT     │ /artworks/:id/gif        │ 上传 GIF 预渲染文件               │
│ PUT     │ /artworks/:id/thumbnail  │ 上传缩略图（PNG）                  │
│ GET     │ /artworks/:id/playback   │ 播放资源包（GIF URL + 帧缩略图）    │
│ GET     │ /artworks/:id/gif        │ 直接下载 GIF                      │
│ POST    │ /artworks/:id/frames     │ 新增帧                            │
│ PUT     │ /artworks/:id/frames/:fid│ 更新单帧                          │
│ DELETE  │ /artworks/:id/frames/:fid│ 删除帧                            │
└─────────┴──────────────────────────┴──────────────────────────────────┘
```

---

## 九、存储优化建议

| 优化方向 | 具体措施 | 效果 |
|---------|---------|------|
| **存储压缩** | `pixels` 从密集 `512 元素数组` → 稀疏 `Record<string, string>` | 减少 96%+ 体积 |
| **JSON 传输** | 后端 gzip/brotli 压缩 | 55 KB → 8~12 KB |
| **二次编辑无需重新上传 GIF** | 存分层数据，编辑后只增量同步变更的帧/图层 | 差分更新而非全量覆盖 |
| **播放态分离** | 编辑态 JSON + 播放态 GIF/帧缩略图两路资源 | 列表页秒开，编辑时全精度 |
| **缩略图预生成** | 后端服务端渲染第一帧 PNG（32×16 或放大版） | 列表页不解析 JSON 直接展示 |
| **GIF 预渲染** | 上传时后端 `encodeGif` 生成 GIF → CDN 托管 | 播放不消耗前端 CPU |
| **离线缓存** | IndexedDB 存编辑态 JSON + 播放态 GIF | 弱网下可编辑可播放 |
| **增量保存** | `touchProject` 改为 diff 对比后只 POST 变更的像素 | 每次保存几百 bytes 而非几十 KB |

**核心原则**：编辑和播放走两条路。编辑走分层 JSON（可回写、可 diff），播放走预渲染位图（GIF/PNG，浏览器原生播放）。两者在同一后端记录下共存，互不干扰。




## 图片的数据结构：存储帧内容
### 数据内容：
```
{"id":"project_mrinohls_vrorfk","version":4,"name":"Untitled Pixel Art","width":32,"height":16,"currentFrameIndex":1,"activeLayer":0,"frames":[{"id":"frame_mrkg5w9b_sdb5u1","delay":120,"viewportX":112,"viewportY":120,"layers":[{"id":"layer_mrkg5w9b_2wlnkz","name":"图层 1","visible":true,"opacity":1,"pixels":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]},{"id":"layer_mrkg5w9b_iea0o1","name":"图层 2","visible":true,"opacity":1,"pixels":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]},{"id":"frame_mrkg640i_3nu2x3","delay":100,"viewportX":112,"viewportY":120,"layers":[{"id":"layer_mrkg640i_r25olg","name":"图层 1","visible":true,"opacity":1,"pixels":["#484855","#6c4855","#484855","#484855","#484855","#484855","#484855","#6c6c55","#6c6c55","#6c6c55","#6c6c55","#484855","#242455","#484855","#482455","#484855","#6c6c55","#6c6c55","#6c6c55","#6c6c55","#242455","#242455","#242400","#000000","#000000","#242400","#242400","#242400","#242400","#000000","#000000","#000000","#484855","#484855","#484800","#484800","#484800","#484800","#484800","#484855","#484855","#484855","#6c6caa","#6c6c55","#6c6c55","#b4b4aa","#d8d8aa","#fcfcaa","#fcfcff","#fcfcff","#fcd8ff","#d8d8ff","#909055","#6c6c55","#6c6c55","#484855","#484800","#242455","#000055","#000055","#000055","#242400","#242400","#240000","#484855","#4848aa","#484800","#484800","#484800","#242400","#484800","#484855","#4848aa","#484855","#6c6caa","#6c6c55","#909055","#d8d8aa","#fcfcaa","#fcfcff","#fcfcff","#fcfcff","#fcfcff","#d8d8ff","#909055","#6c6c55","#6c6c55","#484800","#484800","#000055","#000055","#000000","#242455","#242400","#000000","#242400","#000055","#002455","#242400","#242400","#242400","#242400","#242400","#242455","#244855","#484855","#484855","#484855","#6c6c55","#909055","#b4b4aa","#d8b4aa","#b4b4ff","#b4b4ff","#b4b4aa","#9090aa","#6c6c55","#484855","#484855","#484800","#484800","#242455","#484855","#484855","#484855","#484800","#484800","#484800","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000055","#242455","#484800","#484800","#484855","#6c6c55","#909055","#6c6caa","#9090aa","#9090aa","#9090aa","#6c6c55","#6c6c55","#484855","#482400","#242400","#242455","#242455","#242455","#242455","#484800","#484800","#484800","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#242400","#484855","#242455","#242455","#484855","#484800","#242400","#482400","#484800","#482400","#242455","#242455","#242455","#242455","#484800","#484800","#484800","#242400","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#000055","#000000","#000055","#242455","#242455","#484855","#6c6c55","#484855","#6c6c55","#484855","#242455","#242455","#242455","#242455","#484800","#484800","#484800","#484855","#242455","#242455","#242455","#000000","#242400","#000000","#000000","#000000","#000000","#000000","#002400","#242400","#242400","#242400","#000000","#000000","#242400","#242455","#484855","#6c6c55","#6c6c55","#906c55","#906c55","#6c4855","#484855","#484855","#242455","#242455","#484800","#484800","#484800","#484800","#242455","#242455","#242455","#242400","#242400","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#000055","#242400","#242455","#242455","#242455","#6c6c55","#6c6c55","#6c6c55","#6c6c55","#484855","#484855","#484855","#242455","#242455","#484800","#484800","#484800","#484855","#242455","#242455","#242455","#002400","#242400","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#002400","#242400","#000000","#000000","#000000","#000000","#242400","#242400","#484800","#484855","#484855","#242455","#242455","#242455","#242455","#242455","#484800","#484800","#484855","#484800","#242455","#242455","#242455","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#242400","#242400","#242400","#242400","#242400","#242455","#242455","#242455","#242455","#482400","#242400","#242400","#242400","#242400","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#000000","#000055","#000000","#000000","#000000","#000000","#000000","#240000","#240000","#240000","#240000","#240000","#240000","#240000","#000000","#000000","#000000","#000000","#000000","#240000","#240000","#240000","#240000","#240000","#000000","#000000","#000000","#240000","#240000","#240000","#240000","#240000","#000000","#240000","#240000","#240000","#240000","#240000","#240000","#b40000","#d82400","#6c0000","#d80055","#900000","#900000","#b40055","#900000","#d82400","#900000","#900000","#900000","#6c0000","#900055","#6c0000","#6c0000","#b40000","#900000","#b40000","#b40000","#6c0000","#b40000","#900000","#900000","#b40055","#900000","#d82400","#d80000","#b40000","#b40055","#900000","#b40055"]},{"id":"layer_mrkg640i_lcnihp","name":"图层 2","visible":true,"opacity":1,"pixels":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]},],"createdAt":1783912898080,"updatedAt":1784021216151}




```
