# Cursor 内置浏览器标签页调试指南

## 🌐 打开内置浏览器标签页

### 方法 1: 使用命令面板（推荐）

1. **打开命令面板**
   - Windows/Linux: `Ctrl+Shift+P`
   - Mac: `Cmd+Shift+P`

2. **输入命令**
   - 输入 `Simple Browser: Show`
   - 或输入 `Preview: Open Preview`
   - 或输入 `Live Preview: Show Preview`

3. **输入 URL**
   - 输入 `http://localhost:3000/tank.html`
   - 按 Enter

### 方法 2: 使用快捷键

**Windows/Linux:**
- `Ctrl+Shift+V` - 打开 Markdown 预览（如果页面是 Markdown）
- `Ctrl+K V` - 打开侧边预览

**Mac:**
- `Cmd+Shift+V` - 打开 Markdown 预览
- `Cmd+K V` - 打开侧边预览

### 方法 3: 安装 Simple Browser 扩展

如果内置功能不可用，可以安装扩展：

1. 打开扩展面板 (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. 搜索 "Simple Browser"
3. 安装 Microsoft 官方的 Simple Browser 扩展
4. 使用命令面板打开

## 🔧 在浏览器标签页中调试

### 1. 打开开发者工具

在 Simple Browser 标签页中：
- 右键点击页面 → 选择 "检查" 或 "Inspect"
- 或按 `F12`
- 或按 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

### 2. 检查控制台错误

1. 打开开发者工具
2. 切换到 **Console** 标签页
3. 查看是否有红色错误消息
4. 记录错误详情

### 3. 检查网络请求

1. 切换到 **Network** 标签页
2. 刷新页面 (`F5` 或 `Ctrl+R`)
3. 查看所有网络请求
4. 检查失败的请求（状态码 4xx 或 5xx）

### 4. 检查页面元素

1. 切换到 **Elements** 标签页
2. 使用选择器工具（左上角图标）
3. 点击页面元素查看 HTML
4. 检查样式和属性

## 📋 自动调试检查清单

### ✅ 页面加载检查
- [ ] 页面是否正常加载？
- [ ] 页面标题是否正确？
- [ ] 是否有 404 错误？

### ✅ JavaScript 错误检查
- [ ] 控制台是否有错误？
- [ ] 错误消息是什么？
- [ ] 错误发生在哪个文件？

### ✅ 网络请求检查
- [ ] API 请求是否成功？
- [ ] 是否有失败的请求？
- [ ] 请求响应时间是否正常？

### ✅ UI 元素检查
- [ ] 聊天面板是否显示？
- [ ] Test 按钮是否显示？
- [ ] 汉堡菜单是否可点击？

## 🎯 快速调试命令

在 Cursor 命令面板中可以使用：

```
Simple Browser: Show
```
然后输入：`http://localhost:3000/tank.html`

## 💡 调试技巧

### 1. 实时调试
- 在 Simple Browser 中打开页面
- 打开开发者工具
- 修改代码后刷新页面查看效果

### 2. 断点调试
- 在 Sources 标签页中找到 JavaScript 文件
- 设置断点
- 刷新页面，代码会在断点处暂停

### 3. 网络监控
- 在 Network 标签页中监控所有请求
- 检查请求/响应数据
- 查看请求时间线

### 4. 元素检查
- 使用 Elements 标签页检查 DOM
- 实时修改 CSS 查看效果
- 查看计算样式

## 🔍 常见问题

### Q: Simple Browser 命令找不到？
**A:** 
1. 确保 Cursor 是最新版本
2. 尝试安装 "Simple Browser" 扩展
3. 使用快捷键 `Ctrl+Shift+P` 搜索其他浏览器相关命令

### Q: 无法打开开发者工具？
**A:**
1. 右键点击页面 → 检查
2. 或使用快捷键 `F12`
3. 或使用 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

### Q: 页面无法加载？
**A:**
1. 确保开发服务器正在运行 (`http://localhost:3000`)
2. 检查 URL 是否正确
3. 检查防火墙设置

## 📚 相关资源

- [VS Code Simple Browser 文档](https://code.visualstudio.com/docs/editor/integrated-terminal)
- [Cursor 文档](https://docs.cursor.com)

