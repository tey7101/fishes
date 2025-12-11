# Stripe 快速启动指南

## 🚀 3 步完成配置

### 步骤 1：打开新的 PowerShell 终端

按 `Win + X`，选择 **"Windows PowerShell"** 或 **"终端"**

### 步骤 2：启动 Stripe Webhook 转发

复制并运行以下命令（一次性执行）：

```powershell
cd D:\BaiduSyncdisk\CODE_PRJ\fish_art
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
stripe listen --forward-to "localhost:3000/api/payment?action=webhook"
```

**输出示例**：
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef (^C to quit)
```

### 步骤 3：复制 Webhook Secret

从上面输出中复制 `whsec_` 开头的完整字符串（例如：`whsec_1234567890abcdef`）

然后：
1. 打开 `.env.local` 文件
2. 找到第 61 行：`STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here`
3. 替换为：`STRIPE_WEBHOOK_SECRET=whsec_你复制的密钥`
4. 保存文件
5. **保持 Stripe CLI 终端运行**（不要关闭）

### 步骤 4：启动服务器

在**另一个新的 PowerShell 终端**中运行：

```powershell
cd D:\BaiduSyncdisk\CODE_PRJ\fish_art
npm start
```

### 步骤 5：测试支付

1. 访问：http://localhost:3000/membership.html
2. 选择套餐（Plus 或 Premium）
3. 选择支付方式：**💳 Credit Card**
4. 点击 **"Upgrade"** 按钮
5. 在 Stripe Checkout 页面使用测试卡号：
   - 卡号：`4242 4242 4242 4242`
   - 到期日期：任意未来日期（如 `12/34`）
   - CVC：任意 3 位数字（如 `123`）
   - 邮编：任意（如 `12345`）
6. 完成支付

## ✅ 验证成功

支付成功后：
- 自动跳转到 `stripe-success.html`
- 3 秒后自动跳转到会员页面
- 看到 "Current Plan" 徽章在正确的卡片上
- 看到成功提示：🎉 "升级成功！"

## 🔍 查看日志

### Stripe CLI 终端
会显示接收到的 webhook 事件：
```
2024-11-29 15:30:45  --> checkout.session.completed [evt_xxx]
2024-11-29 15:30:45  <-- [200] POST http://localhost:3000/api/payment/webhook
```

### 服务器终端
会显示处理日志：
```
✅ Subscription activated for user xxx, plan: plus
✅ Recorded payment transaction for Stripe subscription
```

## ❌ 常见问题

### 问题 1：stripe 命令找不到

**解决**：确保运行了 PATH 刷新命令：
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
```

### 问题 2：需要重新登录

如果看到 "You have not configured API keys yet"，运行：
```powershell
stripe login
```
- 按 Enter 打开浏览器
- 点击 "允许访问"
- 回到终端继续

### 问题 3：端口已被占用

如果 `localhost:3000` 被占用，修改 webhook 转发命令：
```powershell
stripe listen --forward-to localhost:3001/api/payment/webhook
```
并相应修改服务器启动端口。

## 📝 总结

运行中的终端：
- **终端 1**：Stripe CLI（保持运行，显示 webhook 事件）
- **终端 2**：Node.js 服务器（保持运行，处理请求）

配置文件：
- `.env.local`：已更新 Stripe API 密钥和 Webhook Secret

---

**祝测试顺利！** 🎉

