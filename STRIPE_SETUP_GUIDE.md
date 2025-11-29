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
http://localhost:3000/api/payment?action=webhook
```

**注意**：
- 本地开发需要使用 Stripe CLI 转发（见下方"本地测试"部分）
- `?action=webhook` 参数是必需的

#### Endpoint URL（生产环境）
```
https://yourdomain.com/api/payment?action=webhook
```
- 将 `yourdomain.com` 替换为您的实际域名（例如：`fishart.online`）
- 必须使用 HTTPS（HTTP 不支持）
- `?action=webhook` 参数是必需的

### 2.2 选择监听事件

在 **"选择要监听的事件"** 部分，添加以下事件：

#### 必需事件（核心功能）

- ✅ `checkout.session.completed` - **最重要**：首次支付完成，创建订阅和支付记录
- ✅ `invoice.payment_succeeded` - 续费支付成功，记录续费交易
- ✅ `customer.subscription.updated` - 订阅状态变更（升级、降级等）
- ✅ `customer.subscription.deleted` - 订阅取消，将用户降级为 free

#### 推荐事件（用于监控和调试）

- ☑️ `invoice.payment_failed` - 支付失败提醒
- ☑️ `customer.created` - 客户创建（用于跟踪）
- ☑️ `customer.updated` - 客户信息更新
- ☑️ `payment_intent.succeeded` - 支付成功确认
- ☑️ `payment_intent.payment_failed` - 支付失败详情

#### 配置说明

1. 点击 **"Listen to"**，选择 `Events on your account`
2. 点击 **"Select events to listen to"**
3. 搜索并勾选上述事件（至少选择前 4 个必需事件）
4. 其他事件会被接收但标记为 `Unhandled event type`，不会影响系统运行

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
stripe listen --forward-to "localhost:3000/api/payment?action=webhook"
```

**注意**：URL 中的 `?action=webhook` 参数是必需的，用于路由到正确的处理器。

您会看到类似输出：
```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

**重要**：
1. 复制这个 `whsec_xxx` 并更新到 `.env.local` 的 `STRIPE_TEST_WEBHOOK_SECRET`
2. 保持这个终端窗口打开，否则 webhook 无法转发
3. 每次重启 `stripe listen` 可能会生成新的 webhook secret

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
   stripe listen --forward-to "localhost:3000/api/payment?action=webhook"
   ```
   或使用快捷脚本：
   ```bash
   .\START_STRIPE_WEBHOOK.bat
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

## 步骤 7：测试套餐（可选）

### 7.1 关于测试套餐

系统提供了两个特殊的测试套餐（`test_plus` 和 `test_premium`），用于在生产环境中测试真实支付流程：

- **价格**：仅 $0.01/月
- **可见性**：仅特定测试用户可见
- **功能**：与正式套餐相同
- **记录**：创建真实的订阅和支付记录

### 7.2 使用测试套餐

1. 使用测试用户账户登录
2. 访问会员页面，可以看到带橙色边框的测试套餐
3. 选择 Test Plus 或 Test Premium
4. 使用真实信用卡支付 $0.01
5. 验证整个支付流程和数据库记录
6. 测试完成后在 Stripe Dashboard 中取消订阅

**优点**：
- ✅ 测试真实的 Stripe API 调用
- ✅ 验证生产环境配置
- ✅ 成本极低（每次仅 $0.01 + Stripe 手续费）
- ✅ 不影响正式用户

## 步骤 8：生产环境部署

### 8.1 切换到生产模式

1. 在 Stripe Dashboard 切换到 **"生产模式"**（右上角开关）
2. 获取生产环境的 API 密钥：
   - 访问：https://dashboard.stripe.com/apikeys
   - 复制 Publishable key（`pk_live_...`）
   - 复制 Secret key（`sk_live_...`）
3. 配置生产环境 Webhook：
   - 访问：https://dashboard.stripe.com/webhooks
   - 点击 **"添加端点"**
   - Endpoint URL: `https://yourdomain.com/api/payment?action=webhook`
   - 选择必需的 4 个事件（见上文 2.2 节）
4. 获取生产环境的 Webhook Secret：
   - 创建 endpoint 后点击进入详情页
   - 复制 Signing Secret（`whsec_...`）

### 8.2 更新生产环境变量

在服务器上更新 `.env.local`（或使用环境变量管理工具）：

```bash
# Stripe 模式切换
STRIPE_MODE=live

# 生产模式密钥
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_LIVE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_LIVE_WEBHOOK_SECRET=whsec_YOUR_LIVE_SECRET

# 测试模式密钥（保留，便于故障排查）
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY
STRIPE_TEST_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_TEST_WEBHOOK_SECRET=whsec_YOUR_TEST_SECRET
```

**重要**：
- 设置 `STRIPE_MODE=live` 切换到生产模式
- 设置 `STRIPE_MODE=test` 切换回测试模式（用于故障排查）
- 重启服务器使更改生效

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

