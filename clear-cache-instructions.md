# 修复 hotguy 用户语言显示问题

## 问题诊断

✅ **数据库检查**：用户语言设置正确（`繁體中文`）
✅ **API 测试**：Profile API 返回正确的语言数据
❌ **前端显示**：Tank 页面显示为 `English`

## 原因分析

前端代码在以下情况会使用默认语言 `English`：
1. 用户未登录或 token 无效
2. API 调用失败
3. 浏览器缓存了旧数据

## 修复措施

### 1. 代码已修复 ✅

已更新 `tank.html` 中的语言加载逻辑：
- 即使没有 token 也会尝试调用 API
- 添加了详细的调试日志
- 增强了错误处理

### 2. 用户需要执行的操作

请让 **hotguy** 用户按以下步骤操作：

#### 步骤 1: 清除浏览器缓存

**Chrome/Edge:**
1. 打开开发者工具（按 `F12`）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

**或者：**
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部时间"
4. 点击"清除数据"

#### 步骤 2: 清除 localStorage

在开发者工具控制台（`F12` > Console）中执行：
```javascript
// 清除所有本地存储
localStorage.clear();
console.log('✅ localStorage 已清除');
```

#### 步骤 3: 重新登录

1. 刷新页面
2. 重新登录账号
3. 访问 Tank 页面

#### 步骤 4: 验证语言设置

1. 打开 Tank 页面
2. 点击左上角菜单按钮
3. 查看语言选择器，应该显示"繁體中文"
4. 如果仍然显示 English，在开发者控制台查看日志

### 3. 调试方法

如果问题仍然存在，请在控制台查看以下日志：

```javascript
// 查看当前用户
window.supabaseAuth.getCurrentUser().then(user => {
  console.log('当前用户:', user);
});

// 查看 localStorage
console.log('userToken:', localStorage.getItem('userToken'));
console.log('userId:', localStorage.getItem('userId'));

// 手动测试 API
fetch('/api/profile/11312701-f1d2-43f8-a13d-260eac812b7a')
  .then(r => r.json())
  .then(data => console.log('API 返回:', data));
```

### 4. 预期的控制台日志

正常情况下应该看到：
```
🔄 [Language] 开始加载用户语言设置...
🔄 [Language] 检测到用户登录: 11312701-f1d2-43f8-a13d-260eac812b7a
🔄 [Language] 调用 Profile API: { url: '...', hasToken: true }
🔄 [Language] API 响应状态: 200 OK
🔄 [Language] API 返回数据: { hasUser: true, language: '繁體中文' }
✅ [Language] 成功加载用户语言: 繁體中文
```

## 额外说明

### 为什么会出现这个问题？

1. **缓存问题**：浏览器可能缓存了旧版本的页面或脚本
2. **Token 问题**：旧代码要求必须有 token 才能调用 API
3. **时序问题**：语言设置在页面加载时可能还没有初始化完成

### 已修复的问题

✅ 即使没有 token 也会尝试获取语言设置
✅ 添加了详细的错误日志便于调试
✅ 增强了错误处理避免因异常导致使用默认值

## 技术细节

### 修改的文件
- `tank.html` (第 1357-1405 行)

### 关键改进
```javascript
// 旧代码：如果没有 token 就直接使用 English
if (token) {
  // 调用 API
} else {
  userLanguageSelect.value = 'English';  // ❌ 问题：直接跳过 API 调用
}

// 新代码：即使没有 token 也尝试调用 API
const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
const profileResponse = await fetch(url, { headers });  // ✅ 总是尝试调用
```

## 如需帮助

如果问题仍然存在，请提供：
1. 浏览器控制台的完整日志
2. 网络请求的响应（开发者工具 > Network）
3. 用户的登录状态（是否已登录）

