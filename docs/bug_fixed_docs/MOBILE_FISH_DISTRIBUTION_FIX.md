# 移动端鱼分布不均问题修复

## 问题描述

移动端tank页面鱼在各行的分配不均匀：
- 底部行经常挤3-5只鱼
- 有些行却是空的
- 在浏览器无痕模式测试也有同样问题（排除缓存因素）

## 根本原因

### 问题1：Y坐标被错误限制

**位置**: `src/js/tank.js` 第563行

```javascript
// ❌ 错误代码
y = Math.min(maxY, Math.max(0, targetRow.swimYMin + yOffset));
```

**问题分析**:
- `maxY = logicalHeight - fishSize.height`（例如：802 - 60 = 742px）
- 后面几行的 `swimYMin` 可能大于 `maxY`（例如：第8行的 swimYMin = 800px）
- `Math.min(maxY, ...)` 会强制将所有后面行的鱼Y坐标限制为 `maxY`
- 结果：大量鱼挤在同一个Y坐标（底部）

### 问题2：最后一行可能超出画布边界

**位置**: `src/js/tank-layout-manager.js` 第319行

TankLayoutManager 计算行边界时，最后一行的 `swimYMax` 可能超出画布高度：
```
rowHeight = canvasHeight / rows
最后一行的 swimYMax = rowTop + swimZone.height
                     = (rows-1) * rowHeight + swimZone.height
                     可能 > canvasHeight
```

## 解决方案

### 修复1：移除错误的Y坐标限制

**文件**: `src/js/tank.js`

```javascript
// ✅ 修复后
// 🔧 确保Y坐标在行的范围内，避免超出边界
const rowHeight = Math.max(1, targetRow.swimYMax - targetRow.swimYMin);
const yOffset = Math.random() * rowHeight;
// 不要使用 maxY 限制，因为行的范围本身已经是合理的
y = targetRow.swimYMin + yOffset;
// 只在必要时进行边界检查（防止超出画布）
if (y + fishSize.height > logicalHeight) {
    y = Math.max(0, logicalHeight - fishSize.height);
    console.warn(`⚠️ Fish Y adjusted to fit in canvas: ${Math.floor(y)}`);
}
```

**关键改进**:
1. 移除 `Math.min(maxY, ...)` 限制，让鱼可以分布在所有行
2. 只在鱼真的超出画布时才调整Y坐标
3. 信任 TankLayoutManager 计算的行边界

### 修复2：确保最后一行不超出画布

**文件**: `src/js/tank-layout-manager.js`

```javascript
// 🔧 修复：确保最后一行不超出画布边界
const lastRow = this.rows[this.rows.length - 1];
if (lastRow.swimYMax > canvasHeight) {
  console.warn(`⚠️ Last row swimYMax (${lastRow.swimYMax}) exceeds canvas height (${canvasHeight}), adjusting...`);
  lastRow.swimYMax = canvasHeight - 10; // 留10px边距
  console.log(`   Fixed: swimYMax adjusted to ${lastRow.swimYMax}`);
}
```

## 测试验证

### 测试步骤
1. 在移动端打开 tank.html
2. 观察鱼的分布
3. 刷新页面多次，验证分布是否均匀
4. 检查控制台日志，确认每行都有鱼分配

### 预期结果
- 鱼均匀分布在所有行中
- 每行的鱼数量大致相同（±1条）
- 控制台日志显示：`Fish #X assigned to row Y/Z`，Y值应该从0到Z-1均匀分布

### 控制台日志示例
```
🐠 Fish #0 assigned to row 0/8, Y: 52 (range: 45-195)
🐠 Fish #1 assigned to row 1/8, Y: 212 (range: 205-355)
🐠 Fish #2 assigned to row 2/8, Y: 372 (range: 365-515)
...
🐠 Fish #7 assigned to row 7/8, Y: 732 (range: 725-802)
```

## 相关文档

- [FISH_DISTRIBUTION_COORDINATE_SYSTEM_FIX.md](./FISH_DISTRIBUTION_COORDINATE_SYSTEM_FIX.md) - 之前修复的坐标系不匹配问题
- [CANVAS_DPI_IMAGE_CLARITY_FIX.md](./CANVAS_DPI_IMAGE_CLARITY_FIX.md) - DPI修复导致的坐标系问题

## 后续优化：移动端鱼尺寸调整

### 问题
修复分布问题后，移动端的鱼变得太小，不够清晰。

### 解决方案

**文件**: `src/js/tank.js` 第257-267行

```javascript
// ✅ 最终调整（适中大小）
// 移动端使用更大的比例和尺寸范围
const basePercentage = isMobile ? 0.20 : 0.1;  // 移动端20%，桌面端10%
const minWidth = isMobile ? 60 : 30;           // 移动端最小60px
const maxWidth = isMobile ? 160 : 150;         // 移动端最大160px
const minHeight = isMobile ? 36 : 18;
const maxHeight = isMobile ? 96 : 90;
```

**改进**:
1. 移动端基础比例从 10% 提高到 **20%**
2. 移动端最小宽度从 30px 提高到 **60px**
3. 移动端最大宽度提高到 **160px**

**效果**:
- 移动端鱼更大、更清晰
- 但不会太大而占据过多屏幕空间
- 桌面端保持原有尺寸

## 修复时间

2025-01-04

