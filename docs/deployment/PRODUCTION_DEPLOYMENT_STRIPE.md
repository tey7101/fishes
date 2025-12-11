# Stripe 生产环境部署指南

## 📋 目录
1. [本地开发 vs 生产环境](#本地开发-vs-生产环境)
2. [部署前准备](#部署前准备)
3. [部署步骤](#部署步骤)
4. [验证测试](#验证测试)
5. [常见问题](#常见问题)

---

## 🔄 本地开发 vs 生产环境

### 本地开发（当前配置）

| 项目 | 配置 |
|------|------|
| **Webhook 转发** | Stripe CLI (`stripe listen --forward-to ...`) |
| **Webhook URL** | `http://localhost:3000/api/payment?action=webhook` |
| **Webhook Secret** | CLI 生成（`whsec_o2irsqRc8...`） |
| **环境变量** | `STRIPE_LIVE_WEBHOOK_SECRET=whsec_o2irsqRc8...` |
| **优点** | 实时调试，无需公网域名 |
| **缺点** | 仅本地可用 |

### 生产环境（部署后）

| 项目 | 配置 |
|------|------|
| **Webhook 转发** | ❌ 不使用 CLI |
| **Webhook URL** | `https://yourdomain.com/api/payment?action=webhook` |
| **Webhook Secret** | Dashboard 生成（不同的 `whsec_xxx`） |
| **环境变量** | `STRIPE_LIVE_WEBHOOK_SECRET=whsec_新的secret` |
| **优点** | 可处理真实支付 |
| **缺点** | 需要公网域名和 HTTPS |

---

## 📦 部署前准备

### 1️⃣ 确认 Stripe 账户状态

访问：https://dashboard.stripe.com/settings/account

确认：
- ✅ 账户已激活（完成 KYC 验证）
- ✅ 已添加银行账户
- ✅ 账户状态为 "Active"，不是 "Restricted"

### 2️⃣ 准备域名

确保您的生产服务器有：
- ✅ 公网域名（如 `api.fishart.online`）
- ✅ HTTPS 证书（Stripe **要求** HTTPS）
- ✅ 域名解析到服务器 IP

---

## 🚀 部署步骤

### 步骤 1：在 Stripe Dashboard 创建 Webhook

1. **访问 Webhook 设置页面**
   
   https://dashboard.stripe.com/webhooks

2. **点击 "Add endpoint" 按钮**

3. **配置 Endpoint URL**
   
   ```
   https://yourdomain.com/api/payment?action=webhook
   ```
   
   ⚠️ **注意**：
   - 必须是 **HTTPS**（不能是 HTTP）
   - 必须包含 `?action=webhook` 参数
   - 替换 `yourdomain.com` 为您的实际域名

4. **选择要监听的事件**
   
   勾选以下 4 个事件：
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

5. **点击 "Add endpoint" 完成创建**

### 步骤 2：获取 Webhook Signing Secret

创建完成后，在 Webhook 详情页面：

1. 找到 **"Signing secret"** 部分
2. 点击 **"Reveal"** 按钮
3. 复制 secret（格式：`whsec_xxxxxxxxxx`）

### 步骤 3：更新生产服务器环境变量

在生产服务器的 `.env.local` 文件中：

```bash
# 确保使用生产模式
STRIPE_MODE=live

# 更新 Webhook Secret（从 Dashboard 复制的新 secret）
STRIPE_LIVE_WEBHOOK_SECRET=whsec_从Dashboard复制的新secret

# 其他生产密钥保持不变
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
```

⚠️ **重要**：
- Dashboard 的 webhook secret 与 CLI 的**不同**
- 必须使用 Dashboard 生成的新 secret

### 步骤 4：重启生产服务器

```bash
# 停止服务
pm2 stop fish-art

# 重启服务（重新加载环境变量）
pm2 start server.js --name fish-art

# 或者如果使用其他进程管理器
systemctl restart fish-art
```

---

## ✅ 验证测试

### 1️⃣ 测试 Webhook 连接

在 Stripe Dashboard 的 Webhook 详情页：

1. 点击 **"Send test webhook"**
2. 选择 `checkout.session.completed` 事件
3. 点击 **"Send test webhook"**
4. 查看响应状态码：
   - ✅ **200 OK** = 配置正确
   - ❌ **400/401** = Secret 不匹配
   - ❌ **404** = URL 错误
   - ❌ **500** = 服务器内部错误

### 2️⃣ 测试真实支付流程

1. 使用测试套餐（Test Plus/Premium，$0.50）
2. 完成支付
3. 检查：
   - ✅ Stripe Dashboard 显示支付记录
   - ✅ 数据库 `payment` 表有记录
   - ✅ 数据库 `user_subscriptions` 表有记录
   - ✅ 用户会员等级更新

### 3️⃣ 查看服务器日志

```bash
# 如果使用 pm2
pm2 logs fish-art

# 查看 webhook 处理日志
grep "webhook" /path/to/logs/server.log
```

应该看到：
```
✅ Webhook 签名验证成功
✅ 处理事件: checkout.session.completed
✅ 订阅记录已创建
```

---

## 🐛 常见问题

### Q1: Webhook 返回 400/401 错误

**原因**：Webhook Secret 不匹配

**解决**：
1. 确认 `.env.local` 中的 `STRIPE_LIVE_WEBHOOK_SECRET` 与 Dashboard 显示的一致
2. 确保重启了服务器
3. 检查环境变量是否正确加载：
   ```bash
   node -e "require('dotenv').config({path:'.env.local'}); console.log('Secret:', process.env.STRIPE_LIVE_WEBHOOK_SECRET?.substring(0, 15) + '***');"
   ```

### Q2: Webhook 返回 404 错误

**原因**：URL 配置错误

**解决**：
1. 确认 URL 包含 `?action=webhook` 参数
2. 检查服务器路由配置
3. 测试 API 是否可访问：
   ```bash
   curl https://yourdomain.com/api/payment?action=webhook
   ```

### Q3: Webhook 根本没有触发

**原因**：
- 域名无法访问
- 防火墙阻止
- HTTPS 证书问题

**解决**：
1. 测试域名是否可从外网访问
2. 检查防火墙规则（开放 80/443 端口）
3. 验证 HTTPS 证书有效性

### Q4: 本地开发时如何切换回 CLI？

**切换步骤**：

1. 停止生产服务器（如果在同一台机器）
2. 启动 Stripe CLI：
   ```bash
   stripe listen --forward-to "localhost:3000/api/payment?action=webhook" --live
   ```
3. 复制 CLI 输出的 webhook secret
4. 更新 `.env.local`：
   ```bash
   STRIPE_LIVE_WEBHOOK_SECRET=whsec_CLI输出的secret
   ```
5. 重启本地服务器

---

## 📊 环境对比总结

| 环境 | Webhook 方式 | Secret 来源 | URL | HTTPS 要求 |
|------|-------------|-------------|-----|-----------|
| **本地开发** | Stripe CLI | CLI 生成 | localhost:3000 | ❌ 不需要 |
| **生产部署** | Dashboard | Dashboard 生成 | yourdomain.com | ✅ **必须** |

---

## 🎯 最佳实践

1. **开发环境**：使用 Stripe CLI，方便调试
2. **测试环境**：使用 Dashboard webhook，但配置测试域名
3. **生产环境**：使用 Dashboard webhook，配置正式域名
4. **Secret 管理**：
   - 本地：存储在 `.env.local`（不提交到 Git）
   - 生产：使用环境变量或密钥管理服务（如 AWS Secrets Manager）

---

## 📞 需要帮助？

如果遇到问题：
1. 查看服务器日志
2. 检查 Stripe Dashboard 的 Webhook 日志
3. 使用 Stripe Dashboard 的 "Send test webhook" 功能测试
4. 联系 Stripe 支持：https://support.stripe.com/

---

**部署成功后，您的支付系统将完全运行在生产环境，可以处理真实的客户支付！** 🎉

