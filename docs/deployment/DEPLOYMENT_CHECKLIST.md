# 生产环境部署检查清单

## 部署前准备

- [ ] 本地代码已提交到 Git
- [ ] 已获取 PayPal Production 凭证
- [ ] 已获取 Stripe Production 凭证
- [ ] 数据库 test_plus/test_premium 套餐已更新（$0.50）

---

## Render 环境变量配置

访问：https://dashboard.render.com/ → 您的服务 → Environment

### Stripe 配置
- [ ] `STRIPE_MODE=live`
- [ ] `STRIPE_LIVE_PUBLISHABLE_KEY` 已配置
- [ ] `STRIPE_LIVE_SECRET_KEY` 已配置
- [ ] `STRIPE_TEST_PUBLISHABLE_KEY` 已配置（保留）
- [ ] `STRIPE_TEST_SECRET_KEY` 已配置（保留）

### PayPal 配置
- [ ] `PAYPAL_MODE=production`
- [ ] `PAYPAL_PRODUCTION_CLIENT_ID` 已配置
- [ ] `PAYPAL_PRODUCTION_CLIENT_SECRET` 已配置
- [ ] `PAYPAL_CLIENT_ID` 已配置（sandbox，保留）
- [ ] `PAYPAL_CLIENT_SECRET` 已配置（sandbox，保留）

### 数据库和认证
- [ ] `HASURA_GRAPHQL_ENDPOINT` 已配置
- [ ] `HASURA_ADMIN_SECRET` 已配置
- [ ] `SUPABASE_URL` 已配置
- [ ] `SUPABASE_ANON_KEY` 已配置
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 已配置

### 其他
- [ ] `JWT_SECRET` 已配置
- [ ] `PORT=3000` 已配置

- [ ] **点击 "Save Changes"**

---

## Stripe Webhook 配置

访问：https://dashboard.stripe.com/webhooks （切换到 Live 模式）

- [ ] 点击 "Add endpoint"
- [ ] Endpoint URL: `https://fishtalk.app/api/payment?action=webhook`
- [ ] 选择事件：
  - [ ] `checkout.session.completed`
  - [ ] `invoice.payment_succeeded`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] 点击 "Add endpoint"
- [ ] 复制 Signing secret（whsec_xxx）
- [ ] 更新 Render 环境变量：`STRIPE_LIVE_WEBHOOK_SECRET=whsec_xxx`
- [ ] 保存并等待 Render 重新部署

---

## PayPal Webhook 配置

访问：https://developer.paypal.com/dashboard/ （切换到 Live 模式）

- [ ] 左侧菜单 → Webhooks
- [ ] 点击 "Create Webhook"
- [ ] Webhook URL: `https://fishtalk.app/api/payment?action=paypal-webhook`
- [ ] 选择事件：
  - [ ] `BILLING.SUBSCRIPTION.CREATED`
  - [ ] `BILLING.SUBSCRIPTION.ACTIVATED`
  - [ ] `BILLING.SUBSCRIPTION.UPDATED`
  - [ ] `BILLING.SUBSCRIPTION.CANCELLED`
  - [ ] `BILLING.SUBSCRIPTION.SUSPENDED`
  - [ ] `PAYMENT.SALE.COMPLETED`
- [ ] 点击 "Save"
- [ ] 复制 Webhook ID
- [ ] 更新 Render 环境变量：`PAYPAL_PRODUCTION_WEBHOOK_ID=xxx`
- [ ] 保存并等待 Render 重新部署

---

## 部署代码

### Git 自动部署
- [ ] 运行：`git add .`
- [ ] 运行：`git commit -m "Production deployment with live payment"`
- [ ] 运行：`git push origin main`
- [ ] 在 Render Dashboard → Logs 查看部署进度

### 或手动部署
- [ ] Render Dashboard → 服务 → Manual Deploy
- [ ] 点击 "Deploy latest commit"

---

## 部署验证

### 基础验证
- [ ] Render Logs 显示：`💳 PayPal 模式: PRODUCTION`
- [ ] Render Logs 显示：`🚀 Stripe 模式: LIVE`
- [ ] Render Logs 显示：`🚀 Server running...`
- [ ] Render Service 状态显示 "Live" (绿色)

### 访问测试
- [ ] 访问 `https://fishtalk.app` 正常加载
- [ ] 访问 `https://fishtalk.app/membership.html` 正常显示套餐

### API 测试
- [ ] 运行：`curl https://fishtalk.app/api/payment?action=webhook`
- [ ] 返回 400/401 错误（正常，说明端点存在）

---

## 支付功能测试

### 测试用户登录
- [ ] 访问 `https://fishtalk.app/membership.html`
- [ ] 使用测试用户登录：
  - User ID: `11312701-f1d2-43f8-a13d-260eac812b7a`
  - 或使用邮箱/密码登录

### Stripe Test Premium 测试（$0.50）
- [ ] 选择 "Test Premium" 套餐
- [ ] 选择月付或年付
- [ ] 选择 "Stripe" 支付方式
- [ ] 点击 "Subscribe Now"
- [ ] 使用真实信用卡完成支付（$0.50）
- [ ] 支付成功后跳转到 `stripe-success.html`
- [ ] 3秒后自动跳转回 `membership.html`
- [ ] 页面显示用户为 Premium 会员

### PayPal Test Plus 测试（$0.50）
- [ ] 注销当前用户或使用另一个账户
- [ ] 选择 "Test Plus" 套餐
- [ ] 选择 "PayPal" 支付方式
- [ ] 使用真实 PayPal 账户完成支付（$0.50）
- [ ] 支付成功后跳转回网站
- [ ] 页面显示用户为 Plus 会员

### 数据库验证
- [ ] 本地运行：`node check-test-payments.js`
- [ ] 确认 `user_subscriptions` 表有新记录
- [ ] 确认 `payment` 表有支付记录
- [ ] 确认金额为 $0.50

### Dashboard 验证

#### Stripe Dashboard
- [ ] 访问：https://dashboard.stripe.com/payments
- [ ] 确认显示 $0.50 支付记录
- [ ] 访问：https://dashboard.stripe.com/webhooks
- [ ] 选择 fishtalk.app endpoint
- [ ] 查看 "Recent deliveries"
- [ ] 确认 webhook 返回 **200 OK**

#### PayPal Dashboard
- [ ] 访问：https://www.paypal.com/billing/subscriptions
- [ ] 确认显示新订阅
- [ ] 访问：https://developer.paypal.com/dashboard/ → Webhooks
- [ ] 选择 fishtalk.app webhook
- [ ] 查看 Events/Recent deliveries
- [ ] 确认 webhook 触发成功

### Render Logs 验证
- [ ] Render Dashboard → Logs 标签
- [ ] 搜索 "webhook"
- [ ] 确认看到：`✅ Webhook 签名验证成功`
- [ ] 确认看到：`✅ 订阅记录已创建`
- [ ] 无 ERROR 级别日志

---

## 问题排查

如果测试失败，检查：

### Webhook 返回 400/401
- [ ] 检查 Render 环境变量中的 webhook secret
- [ ] 确认已保存并重新部署
- [ ] 从 Dashboard 重新复制 secret

### Webhook 返回 404
- [ ] 确认 URL 包含 `?action=webhook` 或 `?action=paypal-webhook`
- [ ] 检查 Render 服务是否正常运行

### 支付成功但无记录
- [ ] 查看 Render Event Logs
- [ ] 查看 Dashboard webhook 日志
- [ ] 检查数据库连接配置

### 无法访问 fishtalk.app
- [ ] 检查 Render 服务状态
- [ ] 确认域名 DNS 解析
- [ ] 检查 HTTPS 证书

---

## 回滚准备

如果需要回滚：

### 快速切换回测试模式
在 Render Environment 中修改：
- [ ] `STRIPE_MODE=test`
- [ ] `PAYPAL_MODE=sandbox`
- [ ] 保存并重新部署

### 回滚代码版本
- [ ] Render Dashboard → Deploys
- [ ] 找到上一个稳定版本
- [ ] 点击 "Redeploy"

---

## 生产环境正式测试

测试套餐测试成功后，进行正式测试：

### Plus 套餐测试（$4.99）
- [ ] 使用新账户测试 Plus 月付（Stripe）
- [ ] 验证支付和订阅记录

### Premium 套餐测试（$9.99）
- [ ] 使用新账户测试 Premium 月付（PayPal）
- [ ] 验证支付和订阅记录

### 升级流程测试
- [ ] Free 用户 → Plus（验证升级）
- [ ] Plus 用户 → Premium（验证旧订阅被禁用）

---

## 最终确认

- [ ] 所有测试支付成功
- [ ] 所有 webhook 返回 200
- [ ] 数据库记录完整
- [ ] Render Logs 无错误
- [ ] 用户体验流畅
- [ ] Dashboard 数据一致

---

## 部署完成！

✅ 支付系统已成功部署到生产环境

下一步：
- 监控支付成功率
- 定期检查 webhook 日志
- 处理用户反馈
- 准备运维文档

---

**祝贺！您的支付系统现在已经上线运行了！** 🎉

