# Stripe 生产环境部署指南

## 🎉 测试模式已成功！

恭喜！Stripe 支付在测试模式下已完全正常工作。现在可以部署到生产环境了。

---

## 📋 部署前检查清单

在切换到生产模式之前，请确认以下事项：

### ✅ 测试模式验证
- [x] Stripe CLI 登录成功
- [x] Webhook 转发正常工作
- [x] 测试卡支付成功
- [x] `user_subscriptions` 表记录正确
- [x] `payment` 表记录正确
- [x] `stripe_customer_id` 和 `stripe_subscription_id` 字段已填充
- [x] 支付成功页面跳转正常
- [x] 会员页面智能重载正常
- [x] "Coming Soon" 角标已移除

---

## 🚀 生产环境部署步骤

### 步骤 1：获取生产模式 API 密钥

1. **访问 Stripe Dashboard**：
   - 打开：https://dashboard.stripe.com/apikeys
   - **确保右上角切换到 "生产模式"（Live mode）**
   - ⚠️ **注意**：不要与测试模式混淆！

2. **复制 Publishable Key**：
   - 格式：`pk_live_...`
   - 这是公开密钥，可以在前端使用

3. **复制 Secret Key**：
   - 点击 "显示" 按钮
   - 输入密码验证
   - 格式：`sk_live_...`
   - ⚠️ **重要**：这是敏感信息，必须保密！

### 步骤 2：配置生产环境 Webhook

#### 2.1 创建 Webhook Endpoint

1. **访问 Webhook 设置**：
   - 打开：https://dashboard.stripe.com/webhooks
   - 确保在 **"生产模式"**
   - 点击 **"添加端点"**（Add endpoint）

2. **配置 Endpoint URL**：
   ```
   https://yourdomain.com/api/payment?action=webhook
   ```
   将 `yourdomain.com` 替换为您的实际域名（例如：`fishart.online`）

3. **选择要监听的事件**：
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

4. **点击 "添加端点"**

#### 2.2 获取 Webhook Signing Secret

1. 创建 endpoint 后，点击进入详情页
2. 在 **"Signing secret"** 部分，点击 **"显示"**
3. 复制密钥（格式：`whsec_...`）

### 步骤 3：更新生产服务器环境变量

**重要**：在服务器上（不是本地）更新 `.env.local` 或环境变量：

```bash
# Stripe 配置（生产模式）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_SECRET_HERE
```

⚠️ **安全提示**：
- 不要将生产密钥提交到 Git
- 使用服务器的环境变量管理系统
- 定期轮换密钥

### 步骤 4：验证生产环境配置

在服务器上运行验证脚本：

```bash
node verify-stripe-config.js
```

**预期输出**：
```
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_live_***
✅ STRIPE_SECRET_KEY: sk_live_***
✅ STRIPE_WEBHOOK_SECRET: whsec_***
⚠️  使用生产模式 Publishable Key - 请确认！
⚠️  使用生产模式 Secret Key - 请确认！
✅ Secret Key 有效
✅ Webhook Secret 格式正确
✅ 所有检查通过！
```

### 步骤 5：重启服务器

```bash
# 停止服务器
pm2 stop fishart-server  # 或您使用的进程管理器

# 重启服务器
pm2 start fishart-server
pm2 logs fishart-server  # 查看日志
```

### 步骤 6：测试 Webhook 连接

1. **访问 Stripe Dashboard Webhook 页面**
2. 点击您的 endpoint
3. 点击 **"发送测试 webhook"**（Send test webhook）
4. 选择 `checkout.session.completed` 事件
5. 点击 **"发送测试 webhook"**

**检查服务器日志**：
```bash
pm2 logs fishart-server
```

应该看到：
```
POST /api/payment?action=webhook
[Server] 为Stripe webhook读取原始Buffer数据
✅ Subscription activated for user xxx
```

---

## 💳 生产环境测试（小额测试）

⚠️ **重要**：生产环境使用真实卡号会产生实际费用！

### 建议测试流程：

1. **创建测试订阅**（建议使用最低价格）：
   - 使用您自己的信用卡
   - 选择最便宜的套餐（如 Plus Monthly $9.99）

2. **完成支付**：
   - 填写真实卡信息
   - 完成支付流程

3. **验证系统**：
   - 检查支付成功页面
   - 检查会员页面显示
   - 检查数据库记录
   - 检查 Stripe Dashboard 中的交易

4. **立即取消订阅**（避免续费）：
   - 访问 Stripe Dashboard → Subscriptions
   - 找到测试订阅
   - 点击 "取消订阅"
   - 或在您的应用中提供取消功能

5. **验证取消流程**：
   - 检查 webhook 是否收到 `customer.subscription.deleted` 事件
   - 检查用户是否降级为 Free

---

## 🔄 从测试模式切换到生产模式

### 方法 1：使用不同的环境文件

**推荐**：在服务器上维护两个环境文件：

```bash
# 测试环境
.env.test
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...(test)

# 生产环境
.env.production
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...(live)
```

启动时指定：
```bash
# 测试
NODE_ENV=test node server.js

# 生产
NODE_ENV=production node server.js
```

### 方法 2：使用环境变量管理工具

如果使用云服务商（如 Vercel, Heroku, Railway）：
1. 在平台的环境变量设置中配置生产密钥
2. 不要在代码中硬编码密钥

---

## 📊 监控和日志

### Stripe Dashboard 监控

定期检查：
1. **Payments**（支付）：https://dashboard.stripe.com/payments
2. **Subscriptions**（订阅）：https://dashboard.stripe.com/subscriptions
3. **Customers**（客户）：https://dashboard.stripe.com/customers
4. **Webhooks**（Webhook 日志）：https://dashboard.stripe.com/webhooks

### 应用日志监控

检查以下日志：
- Webhook 接收日志
- 订阅创建日志
- 支付记录插入日志
- 错误和异常日志

### 设置告警

在 Stripe Dashboard 中设置邮件告警：
1. 支付失败
2. 订阅取消
3. Webhook 错误
4. 异常活动

---

## 🔒 安全最佳实践

### 1. 密钥管理
- ✅ 使用环境变量存储密钥
- ✅ 不要提交密钥到 Git
- ✅ 定期轮换密钥（每 3-6 个月）
- ✅ 使用不同的密钥用于测试和生产

### 2. Webhook 安全
- ✅ 始终验证 webhook 签名（已实现）
- ✅ 使用 HTTPS（生产环境必须）
- ✅ 记录所有 webhook 事件
- ✅ 实现重试机制处理失败

### 3. 用户数据保护
- ✅ 不要存储完整的卡号
- ✅ 使用 Stripe 的 Customer ID 关联用户
- ✅ 遵守 PCI DSS 合规要求
- ✅ 定期审计数据访问日志

---

## 🐛 常见问题排查

### 问题 1：Webhook 未收到

**检查步骤**：
1. 确认 endpoint URL 正确（包含 `?action=webhook`）
2. 确认服务器可从公网访问
3. 确认防火墙允许 Stripe IP
4. 检查 Stripe Dashboard 的 webhook 日志

### 问题 2：签名验证失败

**解决方案**：
1. 确认 `STRIPE_WEBHOOK_SECRET` 使用的是对应环境的密钥
2. 确认服务器正确读取原始 Buffer 数据（已实现）
3. 检查是否有代理或中间件修改了请求体

### 问题 3：订阅未激活

**检查**：
1. Stripe Dashboard → Payments：是否有支付记录？
2. Stripe Dashboard → Subscriptions：是否有订阅记录？
3. 数据库：`user_subscriptions` 表是否有记录？
4. 服务器日志：webhook 处理是否有错误？

### 问题 4：支付成功但用户未升级

**检查**：
1. 查看 `user_subscriptions` 表的 `is_active` 字段
2. 查看 `payment_provider` 字段是否为 `'stripe'`
3. 检查前端是否正确重载会员信息
4. 清除浏览器缓存并刷新

---

## 📈 性能优化建议

### 1. Webhook 处理优化
- 使用队列处理 webhook（如 Redis + Bull）
- 快速响应 Stripe（200 OK），然后异步处理
- 实现幂等性处理重复事件

### 2. 数据库优化
- 为 `stripe_customer_id` 和 `stripe_subscription_id` 添加索引
- 定期清理旧的 payment 记录
- 使用数据库连接池

### 3. 缓存优化
- 缓存用户的订阅状态
- 缓存 Stripe 产品和价格信息
- 使用 CDN 加速静态资源

---

## 📞 需要帮助？

### Stripe 官方资源
- **文档**：https://stripe.com/docs
- **支持**：https://support.stripe.com/
- **社区**：https://stripe.com/community
- **状态页**：https://status.stripe.com/

### 紧急问题
1. 检查 Stripe Dashboard 的 webhook 日志
2. 查看服务器错误日志
3. 联系 Stripe 支持（响应快）
4. 临时切回测试模式调试

---

## ✅ 部署完成检查清单

部署到生产环境后，请验证：

- [ ] 生产环境 API 密钥已配置
- [ ] Webhook endpoint 已创建并验证
- [ ] 服务器环境变量已更新
- [ ] 服务器已重启
- [ ] Webhook 连接测试成功
- [ ] 小额支付测试成功
- [ ] 数据库记录验证通过
- [ ] 用户界面显示正确
- [ ] 监控和告警已设置
- [ ] 安全措施已实施
- [ ] 文档已更新
- [ ] 团队已培训

---

## 🎊 恭喜！

您的 Stripe 支付集成已准备好上线了！

**下一步**：
1. 监控前几笔交易
2. 收集用户反馈
3. 持续优化用户体验
4. 考虑添加更多支付方式

**祝生意兴隆！** 💰

---

**最后更新**：2025-11-29  
**版本**：v1.0  
**适用范围**：FishTalk.app Stripe 支付集成

