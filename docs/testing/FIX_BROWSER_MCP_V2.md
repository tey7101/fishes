# 修复 Browser MCP 404 错误

## 🔍 问题分析

错误显示：
```
npm error 404 Not Found - GET https://registry.npmjs.org/@cursor-ide%2fbrowser-mcp - Not found
```

**原因：** `@cursor-ide/browser-mcp` 包在 npm 上不存在。

## ✅ 解决方案

### 方案 1: 使用 Cursor 内置 Browser MCP（推荐）

Cursor 可能已经内置了 Browser MCP，不需要额外安装包。尝试以下配置：

**配置文件位置：**
```
C:\Users\terry\AppData\Roaming\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

**配置内容（尝试1 - 空配置让 Cursor 使用内置）：**
```json
{
  "mcpServers": {
    "browser": {}
  }
}
```

**配置内容（尝试2 - 使用内置路径）：**
```json
{
  "mcpServers": {
    "browser": {
      "command": "cursor",
      "args": ["--browser-mcp"]
    }
  }
}
```

### 方案 2: 检查 Cursor 版本和功能

1. **检查 Cursor 版本**
   - 打开 Cursor
   - 点击 `Help` → `About`
   - 确保是最新版本

2. **检查 MCP 功能是否启用**
   - 打开设置 (`Ctrl+,`)
   - 搜索 "MCP" 或 "Model Context Protocol"
   - 查看是否有 Browser MCP 相关设置

### 方案 3: 使用 Playwright MCP（替代方案）

如果 Cursor 内置 Browser MCP 不可用，可以使用 Playwright MCP：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/playwright-mcp-server"
      ]
    }
  }
}
```

### 方案 4: 手动启动 Chrome 调试端口

1. **启动 Chrome 调试模式：**
   ```bash
   chrome.exe --remote-debugging-port=9222
   ```

2. **配置 MCP 连接到调试端口：**
   ```json
   {
     "mcpServers": {
       "browser": {
         "command": "node",
         "args": [
           "-e",
           "const http = require('http'); http.get('http://localhost:9222/json', (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => console.log(data)); });"
         ]
       }
     }
   }
   ```

## 🔧 当前建议

由于 `@cursor-ide/browser-mcp` 包不存在，建议：

1. **检查 Cursor 文档**
   - 访问 https://docs.cursor.com
   - 查找 Browser MCP 相关文档
   - 查看最新配置方法

2. **联系 Cursor 支持**
   - Browser MCP 可能是新功能
   - 可能需要特定版本的 Cursor
   - 或需要特殊配置

3. **使用替代调试方法**
   - 使用浏览器开发者工具手动调试
   - 使用 VS Code 的调试功能
   - 使用 Puppeteer/Playwright 脚本

## 📝 测试步骤

1. 尝试方案1的配置
2. 重启 Cursor
3. 检查 MCP 日志是否还有 404 错误
4. 如果仍有错误，尝试其他方案

## 🎯 快速修复

**最简单的尝试：**

1. 编辑配置文件，使用最简单的配置：
   ```json
   {
     "mcpServers": {
       "browser": {}
     }
   }
   ```

2. 重启 Cursor

3. 如果不行，尝试完全移除 Browser MCP 配置，看看 Cursor 是否会自动检测内置功能
















