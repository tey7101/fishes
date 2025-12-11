# Stripe 支付已启用 ✅

## 概述

Stripe 支付功能已成功集成到 FishTalk.app，现在支持 **Stripe（信用卡）** 和 **PayPal** 两种支付方式，用户可在会员页面自由选择。

## 新增文件

### 文档
- **`STRIPE_SETUP_GUIDE.md`** - Stripe 配置完整指南
  - API 密钥获取步骤
  - Webhook 配置说明
  - 本地测试方法
  - 生产环境部署指南
  - 常见问题解答

### 前端页面
- **`stripe-success.html`** - Stripe 支付成功页面
  - 验证 Stripe Checkout Session
  - 显示订阅详情
  - 3 秒倒计时后自动跳转到会员页面
  - 触发会员页面的智能重载机制

### 后端 API
- **`lib/api_handlers/payment/stripe-verify-session.js`** - Session 验证处理器
  - 验证 Stripe Checkout Session 有效性
  - 检查支付状态
  - 返回订阅信息

### 工具脚本
- **`verify-stripe-config.js`** - 配置验证脚本
  - 检查环境变量
  - 验证 API 密钥有效性
  - 测试 Hasura 连接
  - 检查数据库表结构
  - 验证文件完整性

- **`test-stripe-upgrade-flow.js`** - 端到端测试脚本
  - 创建测试用户
  - 生成 Checkout URL
  - 引导完成支付流程
  - 验证数据库记录

## 修改的文件

### 环境配置
- **`.env.local`**
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - 待填写
  - `STRIPE_SECRET_KEY` - 待填写
  - `STRIPE_WEBHOOK_SECRET` - 待填写

### 后端 API
- **`lib/api_handlers/payment/create-checkout.js`**
  - ✅ 更新 `success_url` → `stripe-success.html?session_id={CHECKOUT_SESSION_ID}`

- **`api/payment-api.js`**
  - ✅ 添加 `stripe-verify-session` 路由
  - ✅ 引入 `stripeVerifySessionHandler`

### 前端
- **`src/js/membership.js`**
  - ✅ 启用 Stripe 支付流程（移除"暂时不可用"提示）
  - ✅ 调用 `/api/payment?action=create-checkout`
  - ✅ 重定向到 Stripe Checkout

- **`membership.html`**
  - ✅ 更新版本号 `v=3.1`（强制刷新缓存）

## 已存在的功能（无需修改）

### Webhook 处理器
- **`lib/api_handlers/payment/webhook.js`** ✅ 已完善
  - ✅ 支持 4 种 Stripe 事件：
    - `checkout.session.completed` - 结账完成
    - `invoice.payment_succeeded` - 发票支付成功
    - `customer.subscription.updated` - 订阅更新
    - `customer.subscription.deleted` - 订阅取消
  - ✅ 自动创建 `user_subscriptions` 记录
  - ✅ 自动创建 `payment` 记录
  - ✅ 订阅升级使用"先禁用后创建"逻辑（保留历史）

### 数据库表
- **`user_subscriptions`** ✅ 已包含 Stripe 字段：
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `payment_provider`
  - `current_period_start`
  - `current_period_end`

- **`payment`** ✅ 已支持 Stripe：
  - `payment_provider`
  - `transaction_id`
  - `provider_subscription_id`

## 配置步骤

### 1. 获取 Stripe API 密钥

请参考：**`STRIPE_SETUP_GUIDE.md`** 第 1-2 步

**快速链接**：
- 测试模式：https://dashboard.stripe.com/test/apikeys
- 生产模式：https://dashboard.stripe.com/apikeys

### 2. 配置 Webhook

请参考：**`STRIPE_SETUP_GUIDE.md`** 第 2 步

**本地测试**（推荐）：
```bash
# 安装 Stripe CLI
stripe login

# 转发 webhook 到本地
stripe listen --forward-to localhost:3000/api/payment/webhook

# 复制输出的 whsec_xxx 并更新到 .env.local
```

**生产环境**：
- URL: `https://yourdomain.com/api/payment/webhook`
- 事件：
  - ✅ `checkout.session.completed`
  - ✅ `invoice.payment_succeeded`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`

### 3. 更新环境变量

编辑 `.env.local`，替换占位符：

```bash
# 从 Stripe Dashboard 获取
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# 从 Stripe CLI 或 Dashboard Webhook 页面获取
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

### 4. 验证配置

```bash
node verify-stripe-config.js
```

应该看到所有检查项都是 ✅

### 5. 重启服务器

```bash
# 重启以加载新的环境变量
npm start
```

## 测试流程

### 方式 1：自动化测试（推荐）

```bash
# 终端 1：启动服务器
npm start

# 终端 2：启动 Stripe CLI 转发
stripe listen --forward-to localhost:3000/api/payment/webhook

# 终端 3：运行测试脚本
node test-stripe-upgrade-flow.js
```

### 方式 2：手动测试

1. 访问：http://localhost:3000/membership.html
2. 选择套餐（Plus 或 Premium）
3. 选择支付方式：**💳 Credit Card**
4. 点击 **"Upgrade"** 按钮
5. 在 Stripe Checkout 页面输入测试卡号：`4242 4242 4242 4242`
6. 完成支付
7. 自动跳转到 `stripe-success.html`
8. 3 秒后自动跳转到 `membership.html`
9. 看到 "Current Plan" 徽章显示在正确的卡片上
10. 看到成功提示动画：🎉 "升级成功！您现在是 Plus 会员"

### 验证数据库

在 Hasura Console 或使用 SQL：

```sql
-- 检查订阅记录
SELECT id, user_id, plan, payment_provider, 
       stripe_customer_id, stripe_subscription_id, 
       is_active, created_at
FROM user_subscriptions
WHERE payment_provider = 'stripe'
ORDER BY created_at DESC
LIMIT 10;

-- 检查支付记录
SELECT id, user_id, amount, currency, 
       payment_provider, plan, status, 
       transaction_id, payment_date
FROM payment
WHERE payment_provider = 'stripe'
ORDER BY payment_date DESC
LIMIT 10;
```

## Stripe 测试卡号

| 卡号 | 用途 |
|------|------|
| `4242 4242 4242 4242` | ✅ 成功支付 |
| `4000 0000 0000 0002` | ❌ 卡被拒绝 |
| `4000 0000 0000 9995` | ❌ 余额不足 |
| `4000 0025 0000 3155` | 🔐 需要 3D 验证 |

**其他信息**：
- 到期日期：任意未来日期（如 `12/34`）
- CVC：任意 3 位数字（如 `123`）
- 邮编：任意有效邮编（如 `12345`）

更多测试卡号：https://stripe.com/docs/testing

## 支付方式对比

| 特性 | Stripe | PayPal |
|------|--------|--------|
| **支付方式** | 信用卡/借记卡 | PayPal 账户 |
| **用户体验** | 嵌入式 Checkout | 跳转到 PayPal |
| **成功页面** | `stripe-success.html` | `paypal-success.html` |
| **Webhook** | `/api/payment/webhook` | `/api/payment?action=paypal-webhook` |
| **订阅 ID 字段** | `stripe_subscription_id` | `paypal_subscription_id` |
| **客户 ID 字段** | `stripe_customer_id` | - |
| **测试模式** | Stripe Test Mode | PayPal Sandbox |

## 双支付兼容性

✅ **Stripe 和 PayPal 可以同时使用，互不干扰**：

1. **数据库层面**：
   - 使用 `payment_provider` 字段区分（`'stripe'` 或 `'paypal'`）
   - 不同的订阅 ID 字段（`stripe_subscription_id` vs `paypal_subscription_id`）

2. **前端层面**：
   - 用户可在会员页面选择支付方式（单选按钮）
   - 根据选择调用不同的 API

3. **后端层面**：
   - 不同的 webhook 处理器
   - 相同的数据库操作逻辑（先禁用后创建）

## 生产环境部署

### 1. 切换到生产模式密钥

1. 访问：https://dashboard.stripe.com/apikeys
2. 确保右上角是 **"生产模式"**（Live mode）
3. 复制生产密钥（`pk_live_...` 和 `sk_live_...`）
4. 更新服务器的 `.env.local`

### 2. 配置生产环境 Webhook

1. 访问：https://dashboard.stripe.com/webhooks
2. 添加端点：`https://yourdomain.com/api/payment/webhook`
3. 选择相同的 4 个事件
4. 复制生产环境的 Webhook Secret（`whsec_...`）
5. 更新服务器的 `.env.local`

### 3. 测试生产环境

⚠️ **注意**：生产环境使用真实卡号会产生实际费用！

建议：
1. 先小额测试（如创建 $0.50 的测试订阅）
2. 完成支付后立即取消
3. 验证所有流程正常后再正式上线

## 故障排查

### 问题 1：Webhook 签名验证失败

**错误**：`Webhook Error: No signatures found matching the expected signature`

**解决**：
- 本地开发：确保使用 `stripe listen` 命令输出的密钥
- 生产环境：确保使用 Dashboard 中的 Signing Secret
- 重启服务器使环境变量生效

### 问题 2：订阅未创建

**检查步骤**：
1. Stripe Dashboard → Payments：是否有支付记录？
2. Stripe Dashboard → Subscriptions：是否有订阅记录？
3. Stripe Dashboard → Webhooks → 事件日志：webhook 是否发送成功？
4. 服务器日志：webhook 处理是否有错误？
5. 数据库 `user_subscriptions` 表：是否有记录？

### 问题 3：支付成功但页面显示错误

**可能原因**：
- Session ID 未正确传递
- `stripe-verify-session` API 错误
- 用户认证失败

**解决**：
- 检查浏览器控制台日志
- 检查服务器日志
- 运行 `node verify-stripe-config.js`

## 相关文档

- **配置指南**：[`STRIPE_SETUP_GUIDE.md`](STRIPE_SETUP_GUIDE.md)
- **会员重载修复**：[`MEMBERSHIP_RELOAD_FIX.md`](MEMBERSHIP_RELOAD_FIX.md)
- **PayPal Plan ID 最佳实践**：[`PAYPAL_PLAN_ID_BEST_PRACTICES.md`](PAYPAL_PLAN_ID_BEST_PRACTICES.md)

## 官方资源

- Stripe Dashboard: https://dashboard.stripe.com/
- Stripe API 文档: https://stripe.com/docs/api
- Stripe Testing: https://stripe.com/docs/testing
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Stripe Webhooks: https://stripe.com/docs/webhooks

---

**集成完成！** 🎉

现在请按照上述步骤配置 Stripe API 密钥，然后开始测试。

