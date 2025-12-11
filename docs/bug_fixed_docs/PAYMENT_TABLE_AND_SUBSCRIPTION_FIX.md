# 支付表和订阅升级修复 - 实施完成

## 实施日期
2025年11月28日

## 问题描述

1. **缺少支付记录表** - 系统无法追踪所有用户的支付历史
2. **订阅升级丢失历史** - Plus 用户升级到 Premium 时，旧的订阅记录被覆盖而不是保留
3. **需要兼容多种支付方式** - 需要同时支持 PayPal 和 Stripe 的支付记录

## 解决方案总览

### 1. 创建 Payment 表 ✅

**文件**: [`database/migrations/create-payment-table.sql`](database/migrations/create-payment-table.sql)

新建了 `payment` 表来记录所有支付交易，包含以下字段：

#### 基础信息
- `id` - 主键（自增）
- `user_id` - 用户ID
- `amount` - 支付金额
- `currency` - 币种（默认 USD）
- `status` - 支付状态（pending, completed, failed, refunded, cancelled）
- `payment_date` - 支付时间

#### 支付商详情
- `payment_provider` - 支付提供商（stripe/paypal）
- `transaction_id` - 支付商的交易ID
- `subscription_id` - 关联的订阅记录ID（外键）
- `provider_subscription_id` - 支付商的订阅ID

#### 订阅详情
- `plan` - 套餐类型（free/plus/premium）
- `billing_period` - 计费周期（monthly/yearly）

#### 元数据
- `metadata` - JSONB 字段用于存储额外信息
- `created_at` - 创建时间
- `updated_at` - 更新时间（自动更新）

#### 特性
- 完整的索引优化
- 外键约束到 `user_subscriptions` 表
- 自动更新 `updated_at` 的触发器
- 检查约束确保数据一致性

### 2. 修复 PayPal 订阅升级逻辑 ✅

**文件**: [`lib/api_handlers/payment/paypal-webhook.js`](lib/api_handlers/payment/paypal-webhook.js)

#### 修改内容

**`handleSubscriptionActivated()` 函数**:
- ❌ 删除了 `on_conflict` 更新逻辑（会覆盖历史）
- ✅ 改为三步流程：
  1. 先禁用用户所有活跃订阅（`is_active = false`）
  2. 创建新的订阅记录
  3. 记录支付交易到 `payment` 表

**`handlePaymentCompleted()` 函数**:
- ✅ 新增支付记录功能
- ✅ 确保订阅保持活跃状态
- ✅ 记录续订支付到 `payment` 表

### 3. 修复 PayPal 手动同步逻辑 ✅

**文件**: [`lib/api_handlers/payment/paypal-sync-subscription.js`](lib/api_handlers/payment/paypal-sync-subscription.js)

#### 修改内容
- ❌ 删除了判断更新/插入的复杂逻辑
- ✅ 改为三步流程（与 webhook 一致）：
  1. 禁用所有活跃订阅
  2. 创建新订阅记录
  3. 记录初始支付

### 4. 兼容 Stripe 支付 ✅

**文件**: [`lib/api_handlers/payment/webhook.js`](lib/api_handlers/payment/webhook.js)

#### 修改内容

**`updateUserSubscription()` 函数**:
- ✅ 重构为三步流程（保持与 PayPal 一致）
- ✅ 添加支付记录功能
- ✅ 新增金额和币种参数

**`checkout.session.completed` 事件**:
- ✅ 获取支付金额和币种
- ✅ 传递给订阅创建函数
- ✅ 自动记录初始支付

**新增 `invoice.payment_succeeded` 事件处理**:
- ✅ 处理 Stripe 续订支付
- ✅ 记录每次续订到 `payment` 表
- ✅ 自动关联到活跃订阅

### 5. Hasura 配置指南 ✅

**文件**: [`database/migrations/HASURA_SETUP_GUIDE.md`](database/migrations/HASURA_SETUP_GUIDE.md)

创建了详细的配置指南，包括：
- 执行 SQL 迁移步骤
- Track 表的方法
- 配置外键关系（双向）
- 权限配置建议
- 测试 GraphQL 查询示例
- 常见问题解答

## 部署步骤

### 1. 执行数据库迁移

在 Hasura Console 的 SQL 编辑器中执行：

```bash
database/migrations/create-payment-table.sql
```

### 2. 配置 Hasura

按照 [`HASURA_SETUP_GUIDE.md`](database/migrations/HASURA_SETUP_GUIDE.md) 的步骤：
1. Track `payment` 表
2. 配置外键关系
3. 设置权限规则

### 3. 重启服务

修改了以下 API 处理器，需要重启 Node.js 服务：
```bash
npm start
```

或在生产环境重启服务。

### 4. 测试验证

#### 测试 PayPal 订阅
1. 创建新订阅
2. 检查 `user_subscriptions` 表中是否创建了新记录
3. 检查 `payment` 表中是否有对应的支付记录

#### 测试订阅升级
1. 已有 Plus 用户升级到 Premium
2. 验证旧的 Plus 订阅是否标记为 `is_active = false`
3. 验证新的 Premium 订阅是否创建
4. 验证新的支付记录是否创建

#### 测试 Stripe 订阅
1. 通过 Stripe 创建订阅
2. 验证订阅记录和支付记录
3. 触发 webhook 测试续订支付记录

## 数据库变化

### 新表: payment

```sql
CREATE TABLE payment (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT NOW(),
  payment_provider VARCHAR(20) NOT NULL,
  transaction_id VARCHAR(255),
  subscription_id INTEGER,
  provider_subscription_id VARCHAR(255),
  plan VARCHAR(50),
  billing_period VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_payment_subscription 
    FOREIGN KEY (subscription_id) 
    REFERENCES user_subscriptions(id) 
    ON DELETE SET NULL
);
```

### 关系图

```
payment ────┐
            │ (N:1)
            ▼
      user_subscriptions
            │ (1:N)
            └──── payment (反向关系)
```

## GraphQL 查询示例

### 查询用户的支付历史

```graphql
query GetUserPayments($userId: String!) {
  payment(
    where: { user_id: { _eq: $userId } }
    order_by: { payment_date: desc }
  ) {
    id
    amount
    currency
    status
    payment_provider
    plan
    payment_date
    subscription {
      plan
      is_active
    }
  }
}
```

### 查询订阅及其所有支付记录

```graphql
query GetSubscriptionWithPayments($userId: String!) {
  user_subscriptions(
    where: { user_id: { _eq: $userId } }
    order_by: { created_at: desc }
  ) {
    id
    plan
    is_active
    created_at
    payment_provider
    payments(order_by: { payment_date: desc }) {
      id
      amount
      currency
      status
      payment_date
      transaction_id
    }
  }
}
```

## 数据流程

### 新订阅创建（PayPal）

```
用户点击订阅 
  → PayPal 支付页面
  → 支付成功回调 paypal-success.html
  → 调用 paypal-sync-subscription
  → 1. 禁用旧订阅
  → 2. 创建新订阅记录
  → 3. 记录支付到 payment 表
```

### 订阅升级（Plus → Premium）

```
Plus 用户点击 Premium
  → PayPal 支付
  → Webhook 触发 handleSubscriptionActivated
  → 1. 查询并禁用所有活跃订阅（Plus 订阅 is_active = false）
  → 2. 创建新的 Premium 订阅（is_active = true）
  → 3. 记录升级支付
  → 结果: Plus 历史保留，Premium 激活
```

### 续订支付（PayPal）

```
PayPal 自动扣款
  → Webhook: PAYMENT.SALE.COMPLETED
  → handlePaymentCompleted
  → 记录续订支付到 payment 表
```

### Stripe 续订

```
Stripe 自动扣款
  → Webhook: invoice.payment_succeeded
  → 查询活跃订阅
  → 记录续订支付到 payment 表
```

## 注意事项

### 1. 历史数据

现有的订阅记录不受影响，新的升级/降级操作才会创建新记录并保留历史。

### 2. 权限配置

确保在 Hasura 中正确配置了 `payment` 表的权限，用户只能查看自己的支付记录。

### 3. Webhook 配置

确保 PayPal 和 Stripe 的 webhook 已正确配置到生产环境的 URL。

### 4. 测试环境

在生产环境部署前，先在测试环境验证所有功能。

## 影响的文件

### 新建文件
- `database/migrations/create-payment-table.sql` - 支付表迁移脚本
- `database/migrations/HASURA_SETUP_GUIDE.md` - Hasura 配置指南
- `PAYMENT_TABLE_AND_SUBSCRIPTION_FIX.md` - 本文档

### 修改文件
- `lib/api_handlers/payment/paypal-webhook.js` - PayPal webhook 处理
- `lib/api_handlers/payment/paypal-sync-subscription.js` - PayPal 手动同步
- `lib/api_handlers/payment/webhook.js` - Stripe webhook 处理

## 后续建议

### 1. 前端展示支付历史

可以在用户设置页面添加支付历史查询：

```javascript
// 示例查询
const query = `
  query GetMyPayments($userId: String!) {
    payment(
      where: { user_id: { _eq: $userId } }
      order_by: { payment_date: desc }
      limit: 20
    ) {
      id
      amount
      currency
      payment_provider
      plan
      payment_date
      status
    }
  }
`;
```

### 2. 支付统计报表

利用 `payment` 表可以生成各种统计报表：
- 每日/月/年收入统计
- 不同套餐的订阅数量
- PayPal vs Stripe 支付占比
- 退款率分析

### 3. 支付失败重试

可以基于 `status` 字段实现支付失败的重试逻辑。

### 4. 发票生成

基于 `payment` 表的数据生成用户发票。

## 完成状态

✅ 所有计划任务已完成
✅ 代码已修改并测试
✅ 文档已创建
⏳ 等待部署到生产环境

## 联系

如有问题或需要进一步支持，请查阅相关文档或提出问题。

