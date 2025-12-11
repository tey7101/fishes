# 会员计划显示问题调试指南

## 问题
Plus 用户的 "Current Plan" 标记显示在 Free 卡片上，而不是 Plus 卡片上。

## 已添加的调试日志

### 1. 页面初始化
```
💎 Initializing membership page...
✅ Current user: [用户ID]
```

### 2. 加载会员信息
```
🔍 Loading membership for user: [用户ID]
📦 GraphQL response: [完整响应]
✅ Current plan loaded from database: "[plan值]" (subscription ID: XX, active: true)
```

### 3. 渲染卡片
```
🎨 Rendering plan cards... currentUser: [用户ID], currentPlan: "[plan值]"
🔍 创建卡片 "free": currentUser=true, currentPlan="plus", isCurrentPlan=false
🔍 创建卡片 "plus": currentUser=true, currentPlan="plus", isCurrentPlan=true
🔍 创建卡片 "premium": currentUser=true, currentPlan="plus", isCurrentPlan=false
✅ Rendered 3 plan cards
```

## 调试步骤

### 1. 打开浏览器控制台
- Windows: F12 或 Ctrl+Shift+I
- Mac: Cmd+Option+I

### 2. 刷新会员页面
访问 `http://localhost:3000/membership.html`

### 3. 查看日志输出

#### 正常情况（Plus 用户）：
```
💎 Initializing membership page...
✅ Current user: test-user-123
🔍 Loading membership for user: test-user-123
✅ Current plan loaded from database: "plus" (subscription ID: 42, active: true)
🎨 Rendering plan cards... currentUser: test-user-123, currentPlan: "plus"
🔍 创建卡片 "free": currentUser=true, currentPlan="plus", isCurrentPlan=false
🔍 创建卡片 "plus": currentUser=true, currentPlan="plus", isCurrentPlan=true  ← 这里应该是 true
✅ Rendered 3 plan cards
```

#### 异常情况（显示错误）：
```
💎 Initializing membership page...
✅ Current user: test-user-123
🔍 Loading membership for user: test-user-123
⚠️ No active subscription found, defaulting to free plan  ← 问题：没有找到活跃订阅
🎨 Rendering plan cards... currentUser: test-user-123, currentPlan: "free"  ← 问题：currentPlan 是 free
🔍 创建卡片 "free": currentUser=true, currentPlan="free", isCurrentPlan=true  ← 错误！
```

## 可能的问题和解决方案

### 问题1: 数据库查询失败
**症状**: 看到 `⚠️ No active subscription found`

**原因**:
- 用户没有活跃的订阅记录
- GraphQL 查询失败
- 数据库连接问题

**解决**:
```bash
# 检查用户的订阅记录
node test-membership-plan-display.js
```

### 问题2: GraphQL 响应格式错误
**症状**: 看到 `📦 GraphQL response:` 但数据结构异常

**解决**: 检查响应中的 `users_by_pk.user_subscriptions` 路径

### 问题3: 浏览器缓存
**症状**: 修改后没有效果

**解决**:
- 硬刷新: Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)
- 清除缓存
- 使用隐私/无痕模式

### 问题4: JavaScript 错误
**症状**: 控制台显示错误

**解决**: 检查是否有 JavaScript 错误打断了执行流程

## 验证数据库

运行测试脚本检查数据库中的订阅数据：

```bash
node test-membership-plan-display.js
```

应该看到：
```
✅ 找到 X 个 Plus 用户:
1. 用户ID: XXX
   Plan字段值: "plus" (长度: 4)
   是否活跃: true
```

## 手动修复

如果问题持续存在，可以手动检查和修复：

1. **检查 user_subscriptions 表**:
   - 确认有活跃的 Plus 订阅（`is_active = true`）
   - 确认 `plan` 字段值正确（`"plus"`，不是 `"Plus"` 或 `" plus "`）

2. **检查 users 表**:
   - 确认用户 ID 正确

3. **清除浏览器缓存**:
   - F12 → Application/应用 → Clear storage/清除存储 → Clear site data/清除网站数据

## 预期结果

修复后，Plus 用户访问会员页面应该看到：
- Free 卡片: "Get Started" 或空白按钮
- Plus 卡片: "Current Plan" ✅
- Premium 卡片: "Upgrade Now ✨"


