# PayPal订阅支付集成指南

本指南将帮助你完成PayPal订阅支付的配置和部署。

## 📋 目录

1. [前置要求](#前置要求)
2. [PayPal账号设置](#paypal账号设置)
3. [环境配置](#环境配置)
4. [数据库迁移](#数据库迁移)
5. [测试流程](#测试流程)
6. [生产部署](#生产部署)
7. [常见问题](#常见问题)

---

## 前置要求

- ✅ Node.js 20+ 已安装
- ✅ 已部署的FishTalk.app实例
- ✅ Hasura数据库访问权限
- ✅ PayPal Business账号（或创建新账号）

---

## PayPal账号设置

### 1. 创建PayPal开发者账号

1. 访问 [PayPal Developer](https://developer.paypal.com/)
2. 使用你的PayPal账号登录（或创建新账号）
3. 进入 **Dashboard**

### 2. 创建Sandbox测试应用

1. 点击 **Apps & Credentials**
2. 确保在 **Sandbox** 标签页
3. 点击 **Create App**
4. 输入应用名称：`FishTalk Sandbox`
5. 选择应用类型：**Merchant**
6. 点击 **Create App**

### 3. 获取Sandbox凭证

创建应用后，你会看到：

- **Client ID**: `AXXXXxxxxx...`（复制这个）
- **Secret**: 点击 **Show** 查看并复制

保存这些凭证，稍后配置时需要。

### 4. 创建Sandbox测试账号

1. 在Developer Dashboard，点击 **Sandbox** → **Accounts**
2. 系统会自动创建两个测试账号：
   - **Business Account** (商家账号)
   - **Personal Account** (买家账号)
3. 点击买家账号的 **...** → **View/Edit Account** 查看登录信息
4. 测试支付时使用这个买家账号登录

### 5. 配置Webhook (稍后配置)

Webhook配置需要在应用部署后进行，我们会在[测试流程](#测试流程)中说明。

---

## 环境配置

### 1. 更新 `.env.local`

已自动添加到 `.env.local` 文件中，请更新以下值：

```env
# ============================================
# 3. PayPal 配置（支付系统）
# ============================================
# sandbox 用于测试，production 用于生产环境
PAYPAL_MODE=sandbox

# 从 https://developer.paypal.com/dashboard/ 获取
PAYPAL_CLIENT_ID=你的Sandbox_Client_ID
PAYPAL_CLIENT_SECRET=你的Sandbox_Secret

# Webhook ID 在配置 webhook 后获取（稍后配置）
PAYPAL_WEBHOOK_ID=

# PayPal Plan IDs (创建订阅计划后自动生成，无需手动填写)
PAYPAL_PLUS_MONTHLY_PLAN_ID=
PAYPAL_PLUS_YEARLY_PLAN_ID=
PAYPAL_PREMIUM_MONTHLY_PLAN_ID=
PAYPAL_PREMIUM_YEARLY_PLAN_ID=
```

### 2. 安装依赖（已完成）

```bash
npm install
```

---

## 数据库迁移

### 1. 运行迁移脚本

在Hasura Console中执行SQL迁移：

```bash
# 文件位置：database/migrations/add-paypal-support.sql
```

或者在Hasura Console → Data → SQL 中执行以下SQL：

```sql
-- 添加支付提供商字段
ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20) DEFAULT 'stripe';

-- 添加 PayPal 订阅ID字段
ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR(255);

-- 添加约束
ALTER TABLE user_subscriptions 
  ADD CONSTRAINT IF NOT EXISTS payment_provider_check 
  CHECK (payment_provider IN ('stripe', 'paypal'));

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paypal_id 
  ON user_subscriptions(paypal_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_provider 
  ON user_subscriptions(payment_provider);
```

### 2. 验证迁移

在Hasura Console中检查 `user_subscriptions` 表，确认新字段已添加：
- `payment_provider` (VARCHAR)
- `paypal_subscription_id` (VARCHAR)

---

## 测试流程

### 1. 启动本地服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动

### 2. 访问测试页面

打开浏览器访问：

```
http://localhost:3000/test-paypal-subscription.html
```

### 3. 测试创建订阅

1. 在测试页面输入测试用户ID（如 `test-user-123`）
2. 选择套餐（Plus 或 Premium）
3. 选择计费周期（Monthly 或 Yearly）
4. 点击 **Create Subscription**
5. 会显示PayPal approval URL
6. 点击链接或允许自动打开

### 4. PayPal Sandbox登录

在打开的PayPal页面：

1. 使用Sandbox **Personal Account** (买家账号) 登录
2. 查看订阅详情
3. 点击 **Subscribe Now** 或 **Agree & Subscribe**
4. 完成支付流程

### 5. 配置Webhook

#### 步骤1：获取Webhook URL

你的webhook URL格式：
```
https://your-domain.com/api/payment?action=paypal-webhook
```

本地测试可以使用 [ngrok](https://ngrok.com/) 暴露本地服务：
```bash
ngrok http 3000
```

使用ngrok提供的HTTPS URL，例如：
```
https://abcd1234.ngrok.io/api/payment?action=paypal-webhook
```

#### 步骤2：在PayPal中配置Webhook

1. 返回 [PayPal Developer Dashboard](https://developer.paypal.com/)
2. 进入你的应用 → **Webhooks**
3. 点击 **Add Webhook**
4. 输入Webhook URL
5. 选择事件类型：
   - ✅ `Billing` → `Subscription activated`
   - ✅ `Billing` → `Subscription cancelled`
   - ✅ `Billing` → `Subscription suspended`
   - ✅ `Billing` → `Subscription expired`
   - ✅ `Payments` → `Sale completed`
6. 点击 **Save**

#### 步骤3：获取Webhook ID

保存后，PayPal会显示Webhook ID（类似 `WH-xxxxx...`）。

将这个ID添加到 `.env.local`：
```env
PAYPAL_WEBHOOK_ID=WH-xxxxx...
```

重启服务器以加载新配置。

### 6. 测试Webhook

完成一次订阅支付后：

1. 在PayPal Developer Dashboard → Webhooks → 你的Webhook
2. 查看 **Webhook events** 历史
3. 确认事件已成功发送（状态为 `SUCCESS`）
4. 在Hasura Console检查 `user_subscriptions` 表
5. 确认订阅记录已创建，`payment_provider` 为 `paypal`

### 7. 测试其他功能

在 `test-paypal-subscription.html` 页面测试：

- ✅ **Check Status**: 查询订阅状态
- ✅ **Cancel Subscription**: 取消订阅

---

## 生产部署

### 1. 创建Production应用

1. 在PayPal Developer Dashboard切换到 **Live** 标签
2. 创建新的Production应用
3. 获取Production凭证

### 2. 更新生产环境变量

```env
PAYPAL_MODE=production
PAYPAL_CLIENT_ID=你的Production_Client_ID
PAYPAL_CLIENT_SECRET=你的Production_Secret
PAYPAL_WEBHOOK_ID=你的Production_Webhook_ID
```

### 3. 配置Production Webhook

重复[测试流程](#5-配置webhook)中的webhook配置步骤，但使用：
- 生产环境的应用
- 真实的域名URL（不是ngrok）

### 4. 部署到服务器

```bash
git add .
git commit -m "Add PayPal subscription payment support"
git push origin paypal-integration
```

合并到main分支后部署。

### 5. 验证生产环境

1. 访问 `https://fishtalk.app/membership.html`
2. 使用真实PayPal账号测试订阅
3. 确认Webhook正常工作
4. 检查数据库订阅记录

---

## 常见问题

### Q: 订阅创建成功但用户未被激活？

**A:** 检查webhook配置：
1. Webhook URL是否正确
2. Webhook ID是否设置到环境变量
3. 查看PayPal Developer Dashboard的webhook事件历史
4. 检查服务器日志是否有webhook处理错误

### Q: 如何查看PayPal API日志？

**A:** 
- 检查服务器控制台输出（带有 `💰` `✅` `❌` 等emoji的日志）
- 在PayPal Developer Dashboard查看API调用历史
- 使用 `test-paypal-subscription.html` 页面的详细输出

### Q: Sandbox测试成功但Production失败？

**A:** 确认：
1. Production应用已激活（可能需要提交审核）
2. Production凭证正确
3. 域名已添加到PayPal应用的域白名单
4. HTTPS已正确配置（PayPal要求HTTPS）

### Q: PayPal订阅可以降级吗？

**A:** PayPal不支持订阅降级。用户需要：
1. 取消当前订阅
2. 等待订阅周期结束
3. 重新订阅低级别套餐

### Q: 如何测试年度订阅？

**A:** Sandbox环境中：
1. 选择Yearly计费周期
2. PayPal会按比例收取测试费用
3. 或使用PayPal的时间快进功能模拟年度续费

### Q: 支持退款吗？

**A:** 需要在PayPal后台手动处理退款：
1. 登录PayPal Business账号
2. 找到对应交易
3. 点击退款

代码中可以添加退款API支持（需要时再实现）。

---

## 📚 相关资源

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Sandbox Testing](https://developer.paypal.com/docs/api-basics/sandbox/)

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看服务器日志
2. 检查PayPal Developer Dashboard的错误信息
3. 使用 `test-paypal-subscription.html` 调试
4. 参考PayPal官方文档

---

## ✅ 集成检查清单

部署前确认：

- [ ] PayPal应用已创建（Sandbox/Production）
- [ ] 凭证已配置到 `.env.local`
- [ ] 数据库迁移已执行
- [ ] Webhook已配置并测试
- [ ] Sandbox测试通过
- [ ] 会员页面显示支付方式选择器
- [ ] 订阅创建、取消功能正常
- [ ] Production环境配置完成
- [ ] 真实支付测试通过

完成这些步骤后，PayPal支付集成就完成了！🎉

