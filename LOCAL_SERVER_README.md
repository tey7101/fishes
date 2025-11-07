# 本地开发服务器 - 快速开始

## 🚀 快速启动

### 第一次使用

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动服务器**（三选一）
   - 双击 `start.bat` 文件
   - 或运行：`npm start`
   - 或运行：`node server.js`

3. **访问网站**
   - 打开浏览器访问 `http://localhost:5000`

## ✨ 主要特性

### 智能端口管理
- ✅ 默认使用 `.env.local` 中配置的 PORT（当前：5000）
- ✅ 自动检测端口是否被占用
- ✅ 尝试关闭占用端口的进程
- ✅ 如果无法关闭，自动切换到下一个可用端口

### 启动流程

```
读取 .env.local 的 PORT
         ↓
    检测端口是否可用
         ↓
    ├─ 可用 → 直接启动
    └─ 被占用
         ↓
    获取占用进程 PID
         ↓
    尝试关闭该进程
         ↓
    ├─ 成功 → 使用原端口启动
    └─ 失败 → 寻找新端口启动
```

## 📝 修改默认端口

编辑 `.env.local` 文件：

```env
# Server Configuration
PORT=5000  # 修改为你想要的端口号
```

## 📖 详细文档

查看完整使用指南：`docs/development/LOCAL_SERVER_GUIDE.md`

## 🔧 常见问题

**Q: 服务器启动后无法访问？**
- 检查控制台输出的实际端口号
- 确保防火墙没有阻止该端口

**Q: 无法关闭占用进程？**
- 以管理员身份运行启动脚本
- 或让服务器自动切换到新端口（已默认启用）

**Q: npm install 失败？**
```bash
npm cache clean --force
npm install
```

## 📁 相关文件

- `server.js` - 服务器主程序
- `package.json` - 依赖配置
- `.env.local` - 端口和环境配置
- `start.bat` - Windows 快速启动脚本
- `docs/development/LOCAL_SERVER_GUIDE.md` - 详细文档





