# Bug修复：主页相似度显示时出现蒙板效果

## 问题描述
在主页画鱼后，当相似度值（Fish probability）显示时，整个页面会出现蒙板效果，导致页面上半部分颜色变暗/变灰，视觉上像是有一层半透明遮罩覆盖。

## 问题截图对比
- 左侧（有问题）：页面颜色偏暗，标题 "Draw Your Talking Fish" 颜色变淡
- 右侧（正常）：颜色鲜艳正常

## 根本原因
`.game-probability::before` 伪元素使用了 `position: absolute`，但父元素 `.game-probability` 没有设置 `position: relative`。

这导致伪元素相对于最近的定位祖先元素（body）定位，而不是相对于相似度显示框本身定位，从而覆盖了整个页面上半部分。

### 问题代码
```css
.game-probability {
  display: inline-flex;
  /* ... 其他样式 ... */
  /* 缺少 position: relative */
}

.game-probability::before {
  content: '';
  position: absolute;  /* 相对于最近的定位祖先定位 */
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
  /* ... */
}
```

### 问题表现
- `::before` 伪元素尺寸：`width: 1905px, height: 599.953px`（覆盖整个页面上半部分）
- 白色半透明渐变覆盖页面，导致颜色变淡

## 修复方案

### 修改文件：`src/css/cute-game-style.css`

给 `.game-probability` 添加 `position: relative`：

```css
.game-probability {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  margin: 0;
  background: linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-btn);
  font-size: 16px;
  font-weight: 700;
  border: 3px solid;
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease;
  color: #333;
  position: relative; /* 确保 ::before 伪元素相对于此元素定位 */
}
```

### 修复后
- `::before` 伪元素尺寸：`width: 268.906px, height: 26.5625px`（只在相似度显示框内部）

## 附加修复

### 修改文件：`src/css/hamburger-menu.css`

将 `sidebar-overlay` 的 `backdrop-filter` 从默认状态移到 `.active` 状态，避免在侧边栏关闭时产生不必要的模糊效果：

```css
.sidebar-overlay {
  /* ... */
  backdrop-filter: none; /* 默认不应用模糊 */
}

.sidebar-overlay.active {
  opacity: 1;
  visibility: visible;
  backdrop-filter: blur(2px); /* 只在激活时应用模糊 */
}
```

## 修复日期
2024-12-12

## 影响范围
- 主页（index.html）
- 所有使用 `.game-probability` 类的页面

## 测试验证
1. 打开主页
2. 在画布上绘制任意图形
3. 等待相似度值显示
4. 确认页面颜色保持正常，无蒙板效果
