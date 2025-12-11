# Render 生产环境部署指南

## 阶段 1：配置 Render 环境变量

### 1. 访问 Render Dashboard

访问：https://dashboard.render.com/

找到您的服务（Web Service）

### 2. 进入环境变量设置

点击服务 → **Environment** 标签页

### 3. 添加/更新以下环境变量

#### Stripe 配置
```bash
STRIPE_MODE=live
STRIPE_LIVE_PUBLISHABLE_KEY=从本地.env.local复制（pk_live_开头）
STRIPE_LIVE_SECRET_KEY=从本地.env.local复制（sk_live_开头）
STRIPE_LIVE_WEBHOOK_SECRET=稍后从Dashboard获取（whsec_开头）

# 测试模式密钥（保留，便于切换）
STRIPE_TEST_PUBLISHABLE_KEY=从本地.env.local复制（pk_test_开头）
STRIPE_TEST_SECRET_KEY=从本地.env.local复制（sk_test_开头）
STRIPE_TEST_WEBHOOK_SECRET=从本地.env.local复制（whsec_开头）
```

#### PayPal 配置
```bash
PAYPAL_MODE=production
PAYPAL_PRODUCTION_CLIENT_ID=从本地.env.local复制
PAYPAL_PRODUCTION_CLIENT_SECRET=从本地.env.local复制
PAYPAL_PRODUCTION_WEBHOOK_ID=稍后配置webhook后获取

# Sandbox 配置（保留，便于切换）
PAYPAL_CLIENT_ID=从本地.env.local复制（sandbox）
PAYPAL_CLIENT_SECRET=从本地.env.local复制（sandbox）
PAYPAL_WEBHOOK_ID=从本地.env.local复制（sandbox）
```

#### Hasura 配置
```bash
HASURA_GRAPHQL_ENDPOINT=从本地.env.local复制
HASURA_ADMIN_SECRET=从本地.env.local复制
```

#### Supabase 配置
```bash
SUPABASE_URL=从本地.env.local复制
SUPABASE_ANON_KEY=从本地.env.local复制
SUPABASE_SERVICE_ROLE_KEY=从本地.env.local复制
```

#### 其他必要配置
```bash
JWT_SECRET=your-jwt-secret-key
PORT=3000
```

**注意**：
- 点击 "Add Environment Variable" 添加每个变量
- 添加完成后点击 "Save Changes"
- Render 会自动重新部署服务

---

## 阶段 2：配置 Stripe Production Webhook

### 1. 访问 Stripe Dashboard

访问：https://dashboard.stripe.com/webhooks

确保已切换到 **Live** 模式（右上角）

### 2. 创建新的 Webhook Endpoint

点击 **"Add endpoint"** 按钮

### 3. 配置 Endpoint

- **Endpoint URL**: `https://fishtalk.app/api/payment?action=webhook`
- **Description**: Production webhook for fishtalk.app
- **Version**: 使用最新 API 版本

### 4. 选择事件

在 "Select events to listen to" 中选择：
- ✅ `checkout.session.completed`
- ✅ `invoice.payment_succeeded`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

或者选择 **"Select all events"** 然后手动取消不需要的。

### 5. 创建并获取 Signing Secret

1. 点击 **"Add endpoint"**
2. 创建完成后，在 Endpoint 详情页找到 **"Signing secret"**
3. 点击 **"Reveal"** 显示 secret（格式：`whsec_xxx`）
4. **复制这个 secret**

### 6. 更新 Render 环境变量

1. 回到 Render Dashboard → 您的服务 → Environment
2. 找到 `STRIPE_LIVE_WEBHOOK_SECRET`
3. 粘贴刚才复制的 secret
4. 点击 "Save Changes"

---

## 阶段 3：配置 PayPal Production Webhook

### 1. 访问 PayPal Developer Dashboard

访问：https://developer.paypal.com/dashboard/

确保已切换到 **Live** 模式（右上角）

### 2. 进入 Webhooks 设置

左侧菜单 → **"Webhooks"**

### 3. 创建新 Webhook

点击 **"Create Webhook"** 按钮

### 4. 配置 Webhook

- **Webhook URL**: `https://fishtalk.app/api/payment?action=paypal-webhook`
- **Event types**: 点击 "Event types" 展开

### 5. 选择事件类型

勾选以下事件：
- ✅ `BILLING.SUBSCRIPTION.CREATED`
- ✅ `BILLING.SUBSCRIPTION.ACTIVATED`
- ✅ `BILLING.SUBSCRIPTION.UPDATED`
- ✅ `BILLING.SUBSCRIPTION.CANCELLED`
- ✅ `BILLING.SUBSCRIPTION.SUSPENDED`
- ✅ `PAYMENT.SALE.COMPLETED`

### 6. 保存并获取 Webhook ID

1. 点击 **"Save"**
2. 创建完成后，在 Webhook 列表中找到刚创建的 webhook
3. 点击进入详情页
4. **复制 Webhook ID**（一串字符，如 `5XU92468CJ716884J`）

### 7. 更新 Render 环境变量

1. 回到 Render Dashboard → 您的服务 → Environment
2. 找到 `PAYPAL_PRODUCTION_WEBHOOK_ID`
3. 粘贴刚才复制的 Webhook ID
4. 点击 "Save Changes"

---

## 阶段 4：部署代码到 Render

### 方式 1：自动部署（Git 连接，推荐）

如果您的 Render 服务连接了 Git：

1. 提交代码到 Git：
   ```bash
   git add .
   git commit -m "Add PayPal production config and complete payment system"
   git push origin main
   ```

2. Render 会自动检测到 push 并开始部署

3. 在 Render Dashboard → **Logs** 标签页查看部署进度

### 方式 2：手动部署

如果使用手动部署：

1. 在 Render Dashboard → 您的服务
2. 点击右上角 **"Manual Deploy"** 按钮
3. 选择 **"Deploy latest commit"**
4. 等待部署完成

### 验证部署成功

1. **查看 Logs**：
   ```
   💳 PayPal 模式: PRODUCTION
   🚀 Stripe 模式: LIVE
   🚀 Server running at http://localhost:3000/
   ```

2. **访问服务**：
   打开 `https://fishtalk.app`，确保页面正常加载

3. **测试 API 健康检查**：
   ```bash
   curl https://fishtalk.app/api/payment?action=webhook
   # 应返回 400 或 401 错误（正常，因为没有签名）
   ```

---

## 阶段 5：测试支付流程

### 测试 1：Stripe Test Premium ($0.50)

1. 访问 `https://fishtalk.app/membership.html`
2. 使用测试用户登录（ID: `11312701-f1d2-43f8-a13d-260eac812b7a`）
3. 选择 **Test Premium**，选择 **Stripe** 支付
4. 使用真实信用卡完成 $0.50 支付
5. 验证：
   - 支付成功后跳转到 `stripe-success.html`
   - 自动重定向回 `membership.html`
   - 用户显示为 Premium 会员
   - Stripe Dashboard 显示支付记录
   - Render Logs 显示 webhook 处理成功

### 测试 2：PayPal Test Plus ($0.50)

1. 使用另一个账户（或先取消上一个订阅）
2. 选择 **Test Plus**，选择 **PayPal** 支付
3. 使用真实 PayPal 账户完成 $0.50 支付
4. 验证同上

### 测试 3：检查数据库

运行检查脚本（本地）：
```bash
node check-test-payments.js
```

应该看到：
- `user_subscriptions` 表有新记录（is_active=true）
- `payment` 表有支付记录
- 金额为 $0.50

### 测试 4：检查 Webhook 日志

**Stripe Dashboard**:
1. https://dashboard.stripe.com/webhooks
2. 选择刚创建的 endpoint
3. 查看 "Recent deliveries"
4. 确认返回 **200 OK**

**PayPal Dashboard**:
1. https://developer.paypal.com/dashboard/
2. Webhooks → 选择刚创建的 webhook
3. 查看 "Events" 或 "Recent deliveries"
4. 确认 webhook 触发成功

---

## 常见问题排查

### Webhook 返回 400/401

**原因**：Webhook secret 不匹配

**解决**：
1. 检查 Render 环境变量中的 secret 是否正确
2. 确认是否保存并重新部署
3. 重新复制 Dashboard 中的 secret

### Webhook 返回 404

**原因**：URL 配置错误

**解决**：
1. 确认 URL 包含正确的参数：
   - Stripe: `?action=webhook`
   - PayPal: `?action=paypal-webhook`
2. 检查 Render 服务是否正常运行

### 支付成功但没有创建记录

**原因**：Webhook 未触发或处理失败

**解决**：
1. 查看 Render Logs（Event logs）
2. 查看 Dashboard webhook 日志
3. 检查数据库连接配置
4. 手动触发 webhook 测试

### 域名无法访问

**原因**：Render 服务未启动或域名配置错误

**解决**：
1. 检查 Render Dashboard 服务状态
2. 确认域名 DNS 解析正确
3. 检查 HTTPS 证书状态

---

## 回滚计划

如果部署出现问题，可以快速回滚：

### 方法 1：切换回测试模式

在 Render Environment 中：
```bash
STRIPE_MODE=test
PAYPAL_MODE=sandbox
```
保存后服务会切换到测试模式，不影响真实支付。

### 方法 2：回滚代码版本

1. Render Dashboard → **Deploys** 标签页
2. 找到上一个稳定版本
3. 点击右侧菜单 → **"Redeploy"**

### 方法 3：Git 回滚

```bash
git revert <commit_hash>
git push origin main
```

---

## 下一步

完成测试后：
- [ ] 测试正常价格套餐（Plus $4.99, Premium $9.99）
- [ ] 测试升级流程（Free → Plus → Premium）
- [ ] 设置监控和告警
- [ ] 创建运维文档
- [ ] 清理测试数据

---

## 需要帮助？

- Stripe Support: https://support.stripe.com/
- PayPal Support: https://developer.paypal.com/support/
- Render Support: https://render.com/docs

