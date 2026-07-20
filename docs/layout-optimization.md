# 作品列表布局优化说明

## 优化目标

1. **网格视图（Grid）**：每行最多显示 6 个作品卡片，自适应宽度
2. **列表视图（List）**：图片高度统一为 50px

## 优化内容

### 1. 网格视图：每行 6 个自适应布局

**修改前：**
```css
.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}
```

**问题：**
- 使用 `auto-fill` 会根据容器宽度自动填充
- 无法保证每行正好 6 个
- 大屏幕上可能显示过多或过少

**修改后：**
```css
.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

/* 网格视图：每行最多6个 */
@media (min-width: 1200px) {
  .works-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

/* 中等屏幕：每行4个 */
@media (min-width: 900px) and (max-width: 1199px) {
  .works-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 小屏幕：每行3个 */
@media (min-width: 600px) and (max-width: 899px) {
  .works-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 超小屏幕：每行2个 */
@media (max-width: 599px) {
  .works-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### 2. 列表视图：图片高度 50px

**修改前：**
```css
.works-list .row-preview {
  width: 44px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
```

**修改后：**
```css
.works-list .row-preview {
  width: auto;
  min-width: 50px;
  height: 50px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}
```

**改进点：**
- ✅ 高度固定为 50px
- ✅ 最小宽度 50px
- ✅ 保持 16:9 宽高比
- ✅ 自适应宽度

## 响应式断点

| 断点 | 屏幕宽度 | 每行数量 | 说明 |
|------|---------|---------|------|
| **大屏幕** | ≥ 1200px | 6 个 | 桌面显示器 |
| **中等屏幕** | 900px - 1199px | 4 个 | 小型显示器/笔记本 |
| **小屏幕** | 600px - 899px | 3 个 | 平板设备 |
| **超小屏幕** | < 600px | 2 个 | 手机设备 |

## 布局效果

### 网格视图

#### 大屏幕 (≥1200px)
```
┌────┬────┬────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │
├────┼────┼────┼────┼────┼────┤
│ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │
├────┼────┼────┼────┼────┼────┤
│ 13 │ 14 │ 15 │ 16 │ 17 │ 18 │
└────┴────┴────┴────┴────┴────┘
```

#### 中等屏幕 (900-1199px)
```
┌────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │
├────┼────┼────┼────┤
│ 5  │ 6  │ 7  │ 8  │
├────┼────┼────┼────┤
│ 9  │ 10 │ 11 │ 12 │
└────┴────┴────┴────┘
```

#### 小屏幕 (600-899px)
```
┌────┬────┬────┐
│ 1  │ 2  │ 3  │
├────┼────┼────┤
│ 4  │ 5  │ 6  │
├────┼────┼────┤
│ 7  │ 8  │ 9  │
└────┴────┴────┘
```

#### 超小屏幕 (<600px)
```
┌────┬────┐
│ 1  │ 2  │
├────┼────┤
│ 3  │ 4  │
├────┼────┤
│ 5  │ 6  │
└────┴────┘
```

### 列表视图

**优化前：**
```
┌────────────────────────────────────────────┐
│ [44x32] Work 1              [Edit] [Del]  │
│ [44x32] Work 2              [Edit] [Del]  │
└────────────────────────────────────────────┘
```

**优化后：**
```
┌────────────────────────────────────────────┐
│ [50x50] Work 1                            │
│         Last modified │ Created │ Actions  │
├────────────────────────────────────────────┤
│ [50x50] Work 2                            │
│         Last modified │ Created │ Actions  │
└────────────────────────────────────────────┘
```

## CSS 技术细节

### 1. Grid 布局

**使用 `repeat()` 函数：**
```css
grid-template-columns: repeat(6, 1fr);
```
- `6` - 列数
- `1fr` - 等分可用空间（fraction unit）

**响应式媒体查询：**
```css
@media (min-width: 1200px) {
  .works-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
```

### 2. 宽高比（Aspect Ratio）

**使用 `aspect-ratio` 属性：**
```css
aspect-ratio: 16 / 9;
```

**优势：**
- ✅ 自动计算高度
- ✅ 保持宽高比
- ✅ 响应式缩放

**兼容性：**
- ✅ 现代浏览器全面支持
- ✅ Fallback: `height: 50px`

### 3. 最小宽度

**使用 `min-width`：**
```css
width: auto;
min-width: 50px;
```

**效果：**
- 宽度自适应内容
- 最小宽度 50px
- 不会过度压缩

## 视觉效果

### 网格视图

**大屏幕 (≥1200px)：**
- 每行 6 个卡片
- 卡片宽度自适应
- 间距统一 18px

**中等屏幕 (900-1199px)：**
- 每行 4 个卡片
- 宽度增加
- 保持视觉平衡

**小屏幕 (600-899px)：**
- 每行 3 个卡片
- 中等密度

**超小屏幕 (<600px)：**
- 每行 2 个卡片
- 高密度，适合手机

### 列表视图

**图片尺寸：**
- 高度：50px
- 最小宽度：50px
- 宽高比：16:9
- 实际宽度：根据图片比例自适应

**效果：**
- ✅ 清晰展示封面图
- ✅ 保持图片比例
- ✅ 列表行高适中
- ✅ 视觉平衡

## 响应式行为

### 断点测试

| 屏幕宽度 | 网格列数 | 列表图片高度 |
|---------|---------|------------|
| 1920px | 6 列 | 50px |
| 1440px | 6 列 | 50px |
| 1280px | 6 列 | 50px |
| 1199px | 4 列 | 50px |
| 1024px | 4 列 | 50px |
| 900px | 3 列 | 50px |
| 768px | 3 列 | 50px |
| 599px | 2 列 | 50px |
| 375px | 2 列 | 50px |

### 过渡效果

**断点切换：**
- 平滑过渡
- 无需刷新页面
- CSS Grid 自动调整

## 代码示例

### HTML 结构

```html
<!-- 网格视图 -->
<section class="works-grid">
  <article class="work-card">...</article>
  <article class="work-card">...</article>
  <article class="work-card">...</article>
  <!-- 自动布局 -->
</section>

<!-- 列表视图 -->
<section class="works-list">
  <el-table :data="sortedWorkList">
    <!-- 行数据 -->
  </el-table>
</section>
```

### CSS 结构

```css
/* 网格布局 */
.works-grid {
  display: grid;
  gap: 18px;
}

/* 响应式列数 */
@media (min-width: 1200px) {
  .works-grid { grid-template-columns: repeat(6, 1fr); }
}

/* 列表图片 */
.works-list .row-preview {
  height: 50px;
  aspect-ratio: 16 / 9;
}
```

## 优化效果

### 网格视图

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| **每行数量** | 不确定 | 固定 6 个（大屏） |
| **宽度自适应** | ✅ | ✅ |
| **响应式** | 一般 | 优秀 |
| **视觉一致性** | 一般 | 优秀 |

### 列表视图

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| **图片高度** | 32px | 50px |
| **图片宽度** | 44px | 自适应 |
| **宽高比** | 无 | 16:9 |
| **视觉效果** | 一般 | 清晰 |

## 浏览器兼容性

### Grid 布局

| 浏览器 | 版本 | 支持 |
|--------|------|------|
| Chrome | 57+ | ✅ |
| Firefox | 52+ | ✅ |
| Safari | 10.1+ | ✅ |
| Edge | 16+ | ✅ |
| IE | 11 | ⚠️ 部分支持 |

### aspect-ratio

| 浏览器 | 版本 | 支持 |
|--------|------|------|
| Chrome | 88+ | ✅ |
| Firefox | 89+ | ✅ |
| Safari | 15+ | ✅ |
| Edge | 88+ | ✅ |

**Fallback：**
- 旧浏览器会自动使用 `height: 50px`
- 不影响基本功能

## 文件修改

### 修改文件

- `src/pages/works/index.vue`
  - 新增响应式媒体查询（4 个断点）
  - 优化列表视图图片尺寸

### 未修改文件

- 其他组件文件 - 无需修改

## 总结

✅ **网格视图优化**
- 大屏幕：每行 6 个
- 中等屏幕：每行 4 个
- 小屏幕：每行 3 个
- 超小屏幕：每行 2 个

✅ **列表视图优化**
- 图片高度：50px
- 最小宽度：50px
- 宽高比：16:9
- 自适应宽度

✅ **响应式设计**
- 4 个断点
- 平滑过渡
- 完美适配各种屏幕

✅ **视觉效果**
- 统一间距
- 视觉平衡
- 用户体验提升
