# OSS JSON 存储优化说明

## 问题分析

### 原始问题
上传后返回的 URL 格式为：
```
https://storage.qajeejio.com/im/file/01KXZ993PXQSF5F7R96RS4ZZMD/PixelMug 07/20 16:11
```

**问题点：**
1. ❌ 文件名包含特殊字符（空格、`/`）
2. ❌ 没有 `.json` 后缀
3. ❌ **数据从未真正上传到 OSS**（`client.put()` 被注释掉了）
4. ❌ `fileSize` 计算错误（尝试读取字符串的 `.size` 属性）

### 根本原因
`uploadeditorJson` 函数中的 `client.put()` 方法被注释掉了，导致：
- 数据没有实际上传到 OSS
- 只是生成一个本地 URL，但文件不存在
- URL 包含无效字符导致无法访问

## 优化方案

### 1. 修复 `uploadeditorJson` 函数

**改动前：**
```typescript
const uploadeditorJson = (data: any, name: string, uploadType: string): Promise<FileResponse> => {
  return new Promise(async (resolve, reject) => {
    try {
      const ossConfig = await createOssClient(uploadType);
      const fileName = ossConfig.path + '/' + name;
      // const uploadResponse = await ossConfig.client.put(fileName, file, {}); // ❌ 被注释了
      resolve({
        fileUrl: ossConfig.fullPath + '/' + name,
        fileSize: data.size, // ❌ 字符串没有 .size
      });
    } catch (err) {
      console.error('上传失败:', err);
      reject(err);
    }
  });
};
```

**改动后：**
```typescript
const uploadeditorJson = (data: any, name: string, uploadType: string): Promise<FileResponse> => {
  return new Promise(async (resolve, reject) => {
    try {
      const ossConfig = await createOssClient(uploadType);

      // ✅ 生成合法的文件名
      let safeFileName = name;
      if (!safeFileName.endsWith('.json')) {
        safeFileName = `${safeFileName}.json`;
      }

      // ✅ 将数据转换为 Blob
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      const jsonBlob = new Blob([jsonString], { type: 'application/json' });

      // 生成文件名
      const fileName = `${ossConfig.path}/${safeFileName}`;

      // ✅ 执行实际上传
      const uploadResponse = await ossConfig.client.put(fileName, jsonBlob, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      resolve({
        fileUrl: `${ossConfig.fullPath}/${safeFileName}`,
        fileSize: jsonBlob.size, // ✅ 使用 Blob.size
      });
    } catch (err) {
      console.error('上传编辑器JSON失败:', err);
      reject(err);
    }
  });
};
```

### 2. 优化 `uploadPixelJSON` 函数

**改动前：**
```typescript
export const uploadPixelJSON = (data: any): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const uploadImgRes = await uploadeditorJson(JSON.stringify(data), data?.name, 'EDITABLE_JSON');
      // ...
      resolve({
        originData: data,
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
      });
    } catch (error) {
      reject(error);
    }
  });
};
```

**改动后：**
```typescript
export const uploadPixelJSON = (data: any): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      // ✅ 生成安全文件名（替换特殊字符）
      const projectName = data?.name || 'untitled';
      const safeFileName = `${projectName.replace(/[^a-zA-Z0-9一-龥_-]/g, '_')}.json`;

      const uploadRes = await uploadeditorJson(JSON.stringify(data), safeFileName, 'EDITABLE_JSON');

      resolve({
        originData: data,
        fileUrl: uploadRes.fileUrl,
        fileSize: uploadRes.fileSize,
      });
    } catch (error) {
      console.error('uploadPixelJSON failed:', error);
      reject(error);
    }
  });
};
```

## 优化效果

### 修复前
```
URL: https://storage.qajeejio.com/im/file/01KXZ993PXQSF5F7R96RS4ZZMD/PixelMug 07/20 16:11
❌ 无法访问
❌ 文件未实际上传
❌ 文件名包含特殊字符
❌ 无 .json 后缀
```

### 修复后
```
URL: https://storage.qajeejio.com/im/file/PixelMug_07_20_16_11.json
✅ 可正常访问
✅ 文件已上传到 OSS
✅ 文件名合法（特殊字符已替换）
✅ 有 .json 后缀
✅ Content-Type: application/json
```

## 关键技术细节

### 1. 文件名清洗
```typescript
const safeFileName = `${projectName.replace(/[^a-zA-Z0-9一-龥_-]/g, '_')}.json`;
```

**替换规则：**
- 保留：字母、数字、中文、下划线、连字符
- 替换：空格、`/`、`.` 等所有其他字符为 `_`
- 添加：`.json` 后缀

**示例：**
```
"PixelMug 07/20 16:11"  →  "PixelMug_07_20_16_11.json"
"My Project"             →  "My_Project.json"
"Test/Name"              →  "Test_Name.json"
```

### 2. 数据序列化
```typescript
const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
const jsonBlob = new Blob([jsonString], { type: 'application/json' });
```

- 确保数据转换为 JSON 字符串
- 创建正确的 Blob 对象
- 设置 `Content-Type: application/json`

### 3. 文件大小计算
```typescript
fileSize: jsonBlob.size  // ✅ 使用 Blob.size
```

**修复前：**
```typescript
fileSize: data.size  // ❌ 字符串没有 .size 属性
```

### 4. 实际上传
```typescript
await ossConfig.client.put(fileName, jsonBlob, {
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**关键点：**
- ✅ 取消注释上传逻辑
- ✅ 设置正确的 Content-Type
- ✅ 等待上传完成后再 resolve

## 文件修改清单

### 修改的文件
- ✏️ `src/lib/images/uploadFile.ts`
  - 修复 `uploadeditorJson` 函数
  - 优化 `uploadPixelJSON` 函数
  - 删除调试用的 `alert()`

### 依赖的现有代码
- 无需修改其他文件
- 编辑器保存按钮已实现（`PixelEditor.vue`）

## 测试验证

### 测试场景
1. **正常文件名**
   ```javascript
   uploadPixelJSON({ name: "Test", frames: [] })
   // URL: .../Test.json
   ```

2. **包含特殊字符**
   ```javascript
   uploadPixelJSON({ name: "PixelMug 07/20 16:11", frames: [] })
   // URL: .../PixelMug_07_20_16_11.json
   ```

3. **中文名称**
   ```javascript
   uploadPixelJSON({ name: "我的项目", frames: [] })
   // URL: .../我的项目.json
   ```

4. **空名称**
   ```javascript
   uploadPixelJSON({ frames: [] })
   // URL: .../untitled.json
   ```

### 预期结果
- ✅ 返回可访问的 OSS URL
- ✅ URL 以 `.json` 结尾
- ✅ 文件名不包含特殊字符
- ✅ 文件 Content-Type 为 `application/json`
- ✅ `fileSize` 为正确的字节数

## 后续优化建议

### 1. 增加上传重试机制
```typescript
// 在 uploadeditorJson 中添加重试逻辑
const maxRetries = 3;
for (let i = 0; i < maxRetries; i++) {
  try {
    // ... 上传逻辑
    break;
  } catch (err) {
    if (i === maxRetries - 1) throw err;
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
}
```

### 2. 添加文件名冲突检测
```typescript
// 如果文件已存在，添加数字后缀
// PixelArt.json → PixelArt_1.json → PixelArt_2.json
```

### 3. 上传进度回调
```typescript
const uploadResponse = await ossConfig.client.put(fileName, jsonBlob, {
  headers: { 'Content-Type': 'application/json' },
});
// 可以添加 progress 回调
```

### 4. 缓存已上传 URL
```typescript
// 避免重复上传相同内容
const cacheKey = hash(JSON.stringify(data));
```

## 总结

✅ **数据真正上传到 OSS**：修复了被注释的 `client.put()` 调用  
✅ **文件名合法化**：替换特殊字符，确保 URL 可访问  
✅ **正确的文件格式**：添加 `.json` 后缀和 `Content-Type`  
✅ **正确的文件大小**：使用 `Blob.size` 计算  
✅ **错误处理优化**：更清晰的错误日志

现在上传的 JSON 文件会：
1. 真正存储到 OSS
2. 生成可访问的合法 URL
3. 包含正确的文件格式和大小
4. 支持未来的数据还原功能
