# 修复 Browser MCP "No server info found" 错误

## 🔍 问题诊断

错误日志显示：
```
[error] No server info found
```

这表示 Cursor 无法找到 Browser MCP 服务器的配置信息。

## ✅ 解决方案

### 步骤 1: 找到 Cursor MCP 配置文件

根据你的操作系统，配置文件位置如下：

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

### 步骤 2: 创建或编辑配置文件

如果文件不存在，创建它；如果存在，编辑它。

**完整的配置文件内容：**

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

### 步骤 3: 验证配置格式

确保：
- ✅ JSON 格式正确（无语法错误）
- ✅ 文件编码为 UTF-8
- ✅ 没有多余的逗号
- ✅ 所有引号都是双引号

### 步骤 4: 安装 Browser MCP 包（可选但推荐）

```bash
npm install -g @cursor-ide/browser-mcp
```

或者使用 npx（推荐，无需全局安装）：
```bash
npx -y @cursor-ide/browser-mcp
```

### 步骤 5: 重启 Cursor

1. **完全关闭 Cursor**
   - Windows: 确保任务管理器中无 Cursor 进程
   - Mac: 确保 Dock 中无 Cursor 图标
   - Linux: 确保进程列表中无 Cursor

2. **重新打开 Cursor**

3. **等待 MCP 服务器启动**
   - 查看 Cursor 的输出面板
   - 应该看到 Browser MCP 启动日志

### 步骤 6: 验证配置

在 Cursor 中：
1. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 搜索 "MCP" 或 "Model Context Protocol"
3. 查看是否有 Browser MCP 相关的命令

## 🔧 替代配置方法

### 方法 A: 使用完整路径

如果 npx 不可用，使用完整路径：

```json
{
  "mcpServers": {
    "cursor-ide-browser": {
      "command": "node",
      "args": [
        "C:\\Users\\YourName\\AppData\\Roaming\\npm\\node_modules\\@cursor-ide\\browser-mcp\\dist\\index.js"
      ],
      "env": {
        "BROWSER_HEADLESS": "false"
      }
    }
  }
}
```

### 方法 B: 使用环境变量

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
        "BROWSER_HEADLESS": "false",
        "BROWSER_EXECUTABLE_PATH": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      }
    }
  }
}
```

## 🧪 测试配置

配置完成后，在 Cursor 对话中测试：

```
请使用浏览器MCP导航到 http://localhost:3000
```

如果配置成功，应该能看到浏览器自动打开并导航到该页面。

## ⚠️ 常见问题

### 问题 1: 配置文件不存在

**解决：** 手动创建配置文件，确保目录存在。

### 问题 2: JSON 格式错误

**解决：** 使用 JSON 验证工具检查格式：
- 在线工具：https://jsonlint.com/
- VS Code: 安装 JSON 扩展

### 问题 3: npx 命令不可用

**解决：** 
1. 安装 Node.js（包含 npm 和 npx）
2. 或使用完整路径配置

### 问题 4: 权限问题

**解决：** 
- Windows: 以管理员身份运行 Cursor
- Mac/Linux: 检查文件权限

## 📝 快速检查清单

- [ ] 找到正确的配置文件路径
- [ ] 创建或编辑配置文件
- [ ] 添加 Browser MCP 服务器配置
- [ ] 验证 JSON 格式正确
- [ ] 安装 Browser MCP 包（可选）
- [ ] 完全重启 Cursor
- [ ] 检查 MCP 服务器是否启动
- [ ] 测试浏览器导航功能

## 🎯 配置完成后

配置成功后，你可以使用以下命令进行自动调试：

```
请使用浏览器MCP自动调试tank页面：
1. 导航到 http://localhost:3000/tank.html
2. 等待页面加载
3. 获取页面快照
4. 检查控制台错误
5. 检查网络请求
6. 检查聊天面板是否显示
7. 生成调试报告
```

## 📚 相关资源

- [Cursor MCP 文档](https://docs.cursor.com/mcp)
- [Browser MCP 包](https://www.npmjs.com/package/@cursor-ide/browser-mcp)





