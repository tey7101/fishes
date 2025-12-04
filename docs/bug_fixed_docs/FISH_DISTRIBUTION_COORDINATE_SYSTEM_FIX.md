# 鱼分布不均问题修复 - 坐标系不匹配

## 问题描述

用户报告移动端鱼缸中，10条鱼应该均匀分布在屏幕的所有行中，但实际情况是：
- 多条鱼（3-5条）挤在底部行
- 部分行没有鱼
- 问题在移动端特别明显

## 根本原因

这是一个**坐标系不匹配**的问题：

### 问题详情

从控制台日志发现：
```
Canvas resized with DPI fix: display 427x802, actual 854x1604 (mobile, DPR: 2)
TankLayoutManager initialized with 10 rows (canvas: 854x1604, row height: 160px)
```

**关键矛盾**：
1. **鱼的坐标系**：使用 `canvas.logicalHeight = 802`（显示尺寸）
2. **TankLayoutManager**：使用 `canvas.height = 1604`（实际像素尺寸，DPR=2倍）

### 为什么会造成问题？

```
Canvas实际高度: 1604px
├─ Row 0: Y 0-160    (TankLayoutManager认为的范围)
├─ Row 1: Y 160-320
├─ ...
└─ Row 9: Y 1440-1604

鱼的Y坐标范围: 0-802px (只占实际canvas的前半部分!)
└─ 所有鱼的Y坐标都落在0-802范围内
   └─ 对应TankLayoutManager的Row 0-4
      └─ 结果：所有鱼挤在前5行，底部行空无一鱼
```

### 之前的DPI修复

在`docs/bug_fixed_docs/CANVAS_DPI_IMAGE_CLARITY_FIX.md`中记录的DPI修复：
- 为了提高图片清晰度，Canvas实际像素尺寸 = 显示尺寸 × DPI
- 设置了`canvas.logicalWidth`和`canvas.logicalHeight`作为逻辑坐标系
- **但TankLayoutManager没有使用逻辑坐标系！**

## 解决方案

### 1. 修复TankLayoutManager使用逻辑坐标系

**文件**: `src/js/tank-layout-manager.js`

```javascript
class TankLayoutManager {
  constructor(canvas, ctx) {
    // 🔧 关键修复：使用逻辑尺寸而非实际像素尺寸
    const canvasWidth = canvas.logicalWidth || canvas.width;
    const canvasHeight = canvas.logicalHeight || canvas.height;
    
    // ... 使用canvasWidth和canvasHeight进行计算
    const calculatedRows = Math.max(isMobile ? 8 : 6, Math.ceil(canvasHeight / minRowHeight));
    TANK_LAYOUT.rowHeight = Math.floor(canvasHeight / actualRows);
    
    // Create row managers with logical width
    for (let i = 0; i < TANK_LAYOUT.rows; i++) {
      this.rows.push(new TankRow(i, canvasWidth, ctx));
    }
  }
}
```

### 2. 修复鱼尺寸计算使用逻辑坐标系

**文件**: `src/js/tank.js` 第243-246行

```javascript
function calculateFishSize() {
    // 🔧 关键修复：使用逻辑尺寸而非实际像素尺寸
    const tankWidth = swimCanvas.logicalWidth || swimCanvas.width;
    const tankHeight = swimCanvas.logicalHeight || swimCanvas.height;
    // ...
}
```

### 3. 修复鱼初始位置计算使用逻辑坐标系

**文件**: `src/js/tank.js` 第512-518行

```javascript
function loadFishImageToTank(imgUrl, fishData, onDone) {
    // ...
    // 🔧 关键修复：使用逻辑尺寸而非实际像素尺寸
    const logicalWidth = swimCanvas.logicalWidth || swimCanvas.width;
    const logicalHeight = swimCanvas.logicalHeight || swimCanvas.height;
    const maxX = Math.max(0, logicalWidth - fishSize.width);
    const maxY = Math.max(0, logicalHeight - fishSize.height);
    // ...
}
```

### 4. 修复Y坐标比例计算

**文件**: `src/js/tank-layout-manager.js` 第335行和376行

```javascript
// 🔧 使用逻辑高度而非实际像素高度
const totalHeight = this.canvas.logicalHeight || this.canvas.height;
const yProportion = fish.y / totalHeight;
```

## 修改的文件

1. **`src/js/tank-layout-manager.js`**
   - 第282-316行：构造函数使用`logicalWidth`和`logicalHeight`
   - 第335行、376行：Y坐标比例计算使用`logicalHeight`
   
2. **`src/js/tank.js`**
   - 第243-246行：`calculateFishSize()`使用逻辑尺寸
   - 第512-518行：`loadFishImageToTank()`中maxX/maxY使用逻辑尺寸
   
3. **`tank.html`**
   - 更新版本号：`tank-layout-manager.js?v=1.4`
   - 更新版本号：`tank.js?v=5.7`

## 修复效果

### 修复前 ❌
```
Canvas: logical 427x802, actual 854x1604 (DPR=2)
TankLayoutManager: 使用 1604px 计算行
鱼Y坐标: 0-802px
结果: 所有鱼挤在前5行 (0-802对应Row 0-4)
```

### 修复后 ✅
```
Canvas: logical 427x802, actual 854x1604 (DPR=2)
TankLayoutManager: 使用 802px 计算行 ✅
鱼Y坐标: 0-802px
结果: 鱼均匀分布在所有10行 (每行约80px高)
```

### 预期日志

刷新后应该看到：
```
✅ TankLayoutManager initialized with 10 rows
   📐 Canvas: logical 427x802, actual 854x1604
   📏 Row height: 80px, mobile mode
   🎯 First row Y range: 11-67
   🎯 Last row Y range: 731-787
```

鱼的Y坐标应该在0-802范围内均匀分布。

## 技术要点

### Canvas坐标系的两个概念

1. **实际像素尺寸** (`canvas.width`, `canvas.height`)
   - 用于Canvas内部渲染
   - 受DPI影响：= 显示尺寸 × devicePixelRatio
   
2. **逻辑尺寸** (`canvas.logicalWidth`, `canvas.logicalHeight`)
   - 用于所有业务逻辑计算（鱼位置、行管理等）
   - 等于显示尺寸（CSS尺寸）

### 关键原则

**所有涉及位置计算的代码都必须使用逻辑尺寸！**

- ✅ 鱼的X/Y坐标
- ✅ TankLayoutManager的行范围
- ✅ 碰撞检测
- ✅ 点击事件坐标转换

## 相关问题

这个问题与之前的`CANVAS_DPI_IMAGE_CLARITY_FIX.md`直接相关：
- DPI修复提高了图片清晰度
- 但引入了两套坐标系
- 需要确保所有业务逻辑使用统一的逻辑坐标系

## 验证步骤

1. 刷新页面（确保禁用缓存）
2. 在移动端或缩小浏览器窗口（< 768px宽度）
3. 检查控制台日志：
   - `TankLayoutManager initialized` 应显示逻辑尺寸
   - `First row Y range` 和 `Last row Y range` 应该在逻辑高度范围内
4. 观察鱼的分布：应该均匀分布在所有可见行中

## 修复日期

- 2025-12-01
- 修复人员：AI Assistant
- 问题严重程度：高（严重影响用户体验）
- 修复复杂度：中等（需要理解DPI和坐标系）

