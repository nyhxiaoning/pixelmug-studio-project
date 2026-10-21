# GIF 透明背景修复设计

## 问题

GIF 上传流程会先用 `gifuct-js` 解码，再把每帧绘制成 Canvas，最后重新编码并上传。当前解码器只保存调色板索引，并在生成 RGBA 数据时把所有像素 Alpha 强制设为 `255`。透明索引因此会被解释为当前调色板中的实际颜色；当该颜色为红色时，透明背景就会变成红色。

## 方案

使用 `gifuct-js` 的 RGBA patch 输出作为每帧的像素来源，并在完整逻辑画布上做 RGBA 合成：

- 透明像素保持 `[0, 0, 0, 0]`，不写入可见颜色。
- 每帧使用自己的 RGBA patch，避免局部调色板索引跨帧误用。
- 按 GIF disposal method 处理“清除到背景”和“恢复到上一帧”。清除区域使用透明像素，保证透明 GIF 的背景不会重新出现调色板颜色。
- 保留现有 `decodeGifFrames` 返回 Canvas 的接口；新增纯数据解码接口用于测试，浏览器层只负责把 RGBA 数据写入 Canvas。

## 数据流

`GIF ArrayBuffer -> parseGIF -> decompressFrames(gif, true) -> RGBA 逻辑画布合成 -> Canvas -> 32×16 像素数组 -> GIF 编码上传`

## 验证

- 构造一个“透明索引的调色板项为红色、可见像素为蓝色”的 GIF，断言透明像素 Alpha 为 `0` 且 RGB 不参与展示。
- 断言可见蓝色像素仍为不透明蓝色。
- 保留现有 GIF 上传编码、帧时长和 Works 上传契约测试。
