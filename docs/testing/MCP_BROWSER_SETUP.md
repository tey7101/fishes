# Cursor Browser MCP 配置指南

## 📋 概述

Browser MCP (Model Context Protocol) 允许 Cursor AI 直接控制浏览器进行自动调试和测试。

## 🔧 配置步骤

### 方法1: 通过 Cursor 设置界面配置

1. **打开 Cursor 设置**
   - 按 `Ctrl+,` (Windows/Linux) 或 `Cmd+,` (Mac)
   - 或点击 `File` → `Preferences` → `Settings`

2. **找到 MCP 设置**
   - 搜索 "MCP" 或 "Model Context Protocol"
   - 或直接编辑设置文件

3. **添加 Browser MCP 服务器**

在 Cursor 的设置文件中添加：

```json
{
  "mcpServers": {
    "cursor-ide-browser": {
      "command": "npx",
      "args": [
        "-y",
        "@cursor-ide/browser-mcp"
      ],
      "env": {
        "BROWSER_HEADLESS": "false"
      }
    }
  }
}
```

### 方法2: 直接编辑配置文件

**Windows:**
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

**Mac:**
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Linux:**
```
~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

## 🚀 使用方法

配置完成后，重启 Cursor，然后可以在对话中使用以下命令：

### 基本操作

```
# 导航到页面
导航到 http://localhost:3000/tank.html

# 检查页面状态
获取页面快照

# 查看控制台错误
检查控制台消息

# 查看网络请求
检查网络请求
```

### 自动调试流程

1. **导航到目标页面**
   ```
   请导航到 http://localhost:3000/tank.html 并检查页面状态
   ```

2. **检查控制台错误**
   ```
   检查页面控制台是否有错误消息
   ```

3. **检查网络请求**
   ```
   检查是否有失败的API请求（状态码4xx或5xx）
   ```

4. **检查页面元素**
   ```
   检查聊天面板是否存在且可见
   检查Test按钮是否显示
   ```

## 🔍 常用调试命令

### 检查页面加载
```
导航到 http://localhost:3000/tank.html
获取页面快照
检查页面标题是否为 "Global Fish Tank"
```

### 检查JavaScript错误
```
获取所有控制台消息
过滤出错误级别的消息
显示错误详情和堆栈跟踪
```

### 检查API请求
```
获取所有网络请求
检查 /api/fish-api?action=group-chat 的响应状态
检查是否有500错误
```

### 检查UI元素
```
检查聊天面板元素是否存在
检查Test按钮是否可见
检查汉堡菜单是否可点击
```

## 📝 示例：自动调试tank页面

```
请帮我自动调试tank页面：
1. 导航到 http://localhost:3000/tank.html
2. 等待页面加载完成
3. 检查控制台是否有错误
4. 检查网络请求是否成功
5. 检查聊天面板是否显示
6. 检查Test按钮是否显示（如果已登录管理员）
7. 生成调试报告
```

## ⚠️ 故障排除

### Browser MCP 不可用

1. **检查配置**
   - 确认配置文件格式正确
   - 确认路径正确

2. **重启 Cursor**
   - 完全关闭 Cursor
   - 重新打开

3. **检查依赖**
   ```bash
   npm install -g @cursor-ide/browser-mcp
   ```

4. **检查日志**
   - 查看 Cursor 的输出面板
   - 查找 MCP 相关错误

### 浏览器无法启动

1. **检查环境变量**
   ```json
   {
     "env": {
       "BROWSER_HEADLESS": "false",
       "BROWSER_EXECUTABLE_PATH": "/path/to/chrome"
     }
   }
   ```

2. **检查端口占用**
   - 确保 3000 端口未被占用
   - 检查防火墙设置

## 📚 相关资源

- [Cursor MCP 文档](https://docs.cursor.com/mcp)
- [Browser MCP GitHub](https://github.com/cursor-ide/browser-mcp)

## 🎯 快速开始

1. 复制 `.cursor/mcp-browser-config.json` 中的配置
2. 粘贴到 Cursor 的 MCP 设置中
3. 重启 Cursor
4. 在对话中请求："请使用浏览器MCP调试tank页面"

















