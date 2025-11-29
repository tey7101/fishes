# Stripe 配置指南

本指南将帮助您配置 Stripe 支付集成所需的 API 密钥和 Webhook。

## 步骤 1：获取 Stripe API 密钥

### 1.1 访问 Stripe Dashboard

**测试模式**（推荐先使用）：
- 访问：https://dashboard.stripe.com/test/apikeys
- 确保右上角切换到 **"测试模式"**（Test mode）

**生产模式**（正式上线后）：
- 访问：https://dashboard.stripe.com/apikeys
- 确保右上角切换到 **"生产模式"**（Live mode）

### 1.2 复制 API 密钥

在 API Keys 页面，您会看到两种密钥：

#### Publishable key（可发布密钥）
- 用于前端，可以公开
- 测试模式格式：`pk_test_...`
- 生产模式格式：`pk_live_...`
- 点击 **"显示测试密钥"** 并复制

#### Secret key（密钥）
- 用于后端，必须保密
- 测试模式格式：`sk_test_...`
- 生产模式格式：`sk_live_...`
- 点击 **"显示"** 按钮，输入密码后复制

## 步骤 2：配置 Webhook

### 2.1 创建 Webhook Endpoint

1. 访问：https://dashboard.stripe.com/test/webhooks
2. 点击 **"添加端点"**（Add endpoint）按钮
3. 填写端点信息：

#### Endpoint URL（本地测试）
```
http://localhost:3000/api/payment/webhook
```

**注意**：本地开发需要使用 Stripe CLI 转发（见下方"本地测试"部分）

#### Endpoint URL（生产环境）
```
https://yourdomain.com/api/payment/webhook
```
将 `yourdomain.com` 替换为您的实际域名

### 2.2 选择监听事件

在 **"选择要监听的事件"** 部分，添加以下事件：

- ✅ `checkout.session.completed` - 结账完成
- ✅ `invoice.payment_succeeded` - 发票支付成功
- ✅ `customer.subscription.updated` - 订阅更新
- ✅ `customer.subscription.deleted` - 订阅取消

### 2.3 获取 Webhook Signing Secret

1. 创建 endpoint 后，点击进入详情页
2. 在 **"Signing secret"** 部分，点击 **"显示"**
3. 复制密钥（格式：`whsec_...`）

## 步骤 3：更新环境变量

打开项目根目录的 `.env.local` 文件，更新以下变量：

```bash
# Stripe 配置（支付系统）
# ============================================
# 从 https://dashboard.stripe.com/test/apikeys 获取
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# 从 https://dashboard.stripe.com/test/webhooks 获取
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

**重要**：
- 将 `YOUR_KEY_HERE` 和 `YOUR_SECRET_HERE` 替换为实际密钥
- 不要将 `.env.local` 文件提交到 Git（已在 `.gitignore` 中）
- 密钥泄露后请立即在 Stripe Dashboard 删除并重新生成

## 步骤 4：本地测试 Webhook

由于 Stripe 无法直接访问 `localhost`，需要使用 Stripe CLI 进行本地测试。

### 4.1 安装 Stripe CLI

**Windows**：
```powershell
scoop install stripe
```
或下载安装包：https://github.com/stripe/stripe-cli/releases/latest

**macOS**：
```bash
brew install stripe/stripe-cli/stripe
```

**Linux**：
```bash
wget https://github.com/stripe/stripe-cli/releases/download/vX.X.X/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### 4.2 登录 Stripe CLI

```bash
stripe login
```
浏览器会打开，点击 **"允许访问"** 授权。

### 4.3 转发 Webhook 到本地

启动服务器后，在新终端运行：

```bash
stripe listen --forward-to localhost:3000/api/payment/webhook
```

您会看到类似输出：
```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

**重要**：复制这个 `whsec_xxx` 并更新到 `.env.local` 的 `STRIPE_WEBHOOK_SECRET`

### 4.4 测试 Webhook

在另一个终端触发测试事件：

```bash
# 测试结账完成事件
stripe trigger checkout.session.completed

# 测试发票支付成功事件
stripe trigger invoice.payment_succeeded
```

查看服务器日志，应该看到 webhook 事件被成功处理。

## 步骤 5：验证配置

运行配置验证脚本：

```bash
node verify-stripe-config.js
```

脚本会检查：
- ✅ 环境变量是否配置
- ✅ Stripe API 密钥是否有效
- ✅ Webhook endpoint 是否可访问
- ✅ 数据库连接是否正常

## 步骤 6：测试支付流程

### 6.1 使用测试卡号

Stripe 提供了一系列测试卡号，不会产生真实费用：

| 卡号 | 用途 |
|------|------|
| `4242 4242 4242 4242` | 成功支付 |
| `4000 0000 0000 0002` | 卡被拒绝 |
| `4000 0000 0000 9995` | 余额不足 |
| `4000 0025 0000 3155` | 需要 3D 验证 |

**其他信息**：
- 到期日期：任意未来日期（如 `12/34`）
- CVC：任意 3 位数字（如 `123`）
- 邮编：任意有效邮编（如 `12345`）

更多测试卡号：https://stripe.com/docs/testing

### 6.2 完整测试流程

1. 启动服务器：
   ```bash
   npm start
   ```

2. 启动 Stripe CLI（新终端）：
   ```bash
   stripe listen --forward-to localhost:3000/api/payment/webhook
   ```

3. 访问会员页面：
   ```
   http://localhost:3000/membership.html
   ```

4. 选择套餐和 **"Credit Card"** 支付方式

5. 点击 **"Upgrade"** 按钮

6. 在 Stripe Checkout 页面使用测试卡号 `4242 4242 4242 4242`

7. 支付成功后，应该自动跳转到 `stripe-success.html`

8. 3 秒后自动跳转到 `membership.html`，显示升级成功提示

9. 验证数据库：
   - `user_subscriptions` 表应有新记录（`payment_provider = 'stripe'`）
   - `payment` 表应有新记录
   - `stripe_customer_id` 和 `stripe_subscription_id` 字段已填充

## 步骤 7：生产环境部署

### 7.1 切换到生产模式

1. 在 Stripe Dashboard 切换到 **"生产模式"**
2. 获取生产环境的 API 密钥（`pk_live_...` 和 `sk_live_...`）
3. 配置生产环境 Webhook：
   - URL: `https://yourdomain.com/api/payment/webhook`
   - 选择相同的 4 个事件
4. 获取生产环境的 Webhook Secret（`whsec_...`）

### 7.2 更新生产环境变量

在服务器上更新 `.env.local`（或使用环境变量管理工具）：

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_SECRET
```

### 7.3 测试生产环境

⚠️ **重要**：使用真实卡号会产生实际费用，请先小额测试！

建议：
1. 创建最低价格的测试订阅（如 $0.50）
2. 完成支付后立即取消
3. 验证数据库记录
4. 检查 Stripe Dashboard 中的交易记录

## 常见问题

### Q1: Webhook 签名验证失败

**错误**：`Webhook Error: No signatures found matching the expected signature`

**解决**：
- 确保 `STRIPE_WEBHOOK_SECRET` 配置正确
- 本地开发时，使用 `stripe listen` 命令输出的密钥
- 生产环境使用 Dashboard 中的 Signing Secret

### Q2: API 密钥无效

**错误**：`Invalid API Key provided`

**解决**：
- 检查密钥是否完整复制（包括前缀 `pk_test_` 或 `sk_test_`）
- 确认密钥模式（测试/生产）与环境匹配
- 重新生成密钥并更新配置

### Q3: Webhook 事件未收到

**解决**：
1. 检查 Stripe Dashboard → Webhooks → 事件日志
2. 确认 endpoint URL 正确
3. 本地开发确保 `stripe listen` 正在运行
4. 检查服务器日志是否有错误

### Q4: 订阅未创建

**检查**：
1. Stripe Dashboard → Payments → 是否有支付记录
2. Stripe Dashboard → Subscriptions → 是否有订阅记录
3. 数据库 `user_subscriptions` 表是否有记录
4. 服务器日志中的 webhook 处理日志

## 相关资源

- Stripe Dashboard: https://dashboard.stripe.com/
- Stripe API 文档: https://stripe.com/docs/api
- Stripe Testing: https://stripe.com/docs/testing
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Stripe Webhooks: https://stripe.com/docs/webhooks

## 需要帮助？

如果遇到问题：
1. 运行 `node verify-stripe-config.js` 检查配置
2. 查看服务器控制台日志
3. 查看 Stripe Dashboard 事件日志
4. 参考 Stripe 官方文档

---

**配置完成后，请重启服务器使环境变量生效！**

