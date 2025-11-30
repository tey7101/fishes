# ngrok 安装指南（Windows）

## 方法 1：官网下载（推荐）

1. 访问：https://ngrok.com/download
2. 下载 Windows 版本（.zip 文件）
3. 解压到任意目录（如 `C:\ngrok\`）
4. 将 ngrok.exe 所在目录添加到系统 PATH

### 快速添加到 PATH（临时）
在当前 PowerShell 终端运行：
```powershell
$env:Path += ";C:\ngrok"  # 替换为你的 ngrok.exe 所在目录
```

### 永久添加到 PATH
1. 右键"此电脑" → "属性"
2. "高级系统设置" → "环境变量"
3. 在"系统变量"中找到"Path"
4. 点击"编辑" → "新建" → 输入 ngrok.exe 所在目录
5. 确定并重启 PowerShell

## 方法 2：使用 Chocolatey

如果已安装 Chocolatey：
```powershell
choco install ngrok
```

## 方法 3：使用 Scoop

如果已安装 Scoop：
```powershell
scoop install ngrok
```

## 注册 ngrok 账户（免费）

1. 访问：https://dashboard.ngrok.com/signup
2. 注册免费账户
3. 获取 authtoken
4. 运行：
   ```powershell
   ngrok config add-authtoken <你的token>
   ```

## 验证安装

```powershell
ngrok version
```

应显示版本号，如：`ngrok version 3.x.x`

## 使用 ngrok

启动 HTTP 隧道：
```powershell
ngrok http 3000
```

这将：
- 创建一个公网 URL（如 `https://abc123.ngrok.io`）
- 转发所有请求到 `localhost:3000`
- 提供 Web UI：`http://127.0.0.1:4040`

## 注意事项

- 免费版每次启动 URL 都会变化
- 免费版限制：40 连接/分钟
- 付费版可固定域名
- 用于开发测试，不建议长期使用

