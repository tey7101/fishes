# Hasura 配置指南 - Payment 表

## 概述

本指南说明如何在 Hasura Console 中配置新创建的 `payment` 表，包括追踪表和设置关系。

## 步骤 1: 执行 SQL 迁移

1. 打开 Hasura Console（通常是 `https://your-hasura-instance.com/console`）
2. 进入 **Data** 标签页
3. 选择你的数据库（通常是 `default`）
4. 点击 **SQL** 按钮
5. 复制 [`database/migrations/create-payment-table.sql`](../migrations/create-payment-table.sql) 的内容
6. 粘贴到 SQL 编辑器中
7. 点击 **Run!** 按钮执行

执行后应该看到成功消息和表结构验证结果。

## 步骤 2: Track Payment 表

1. 在 Hasura Console 的 **Data** 标签页
2. 在左侧边栏的 **Untracked tables or views** 区域，应该看到 `payment` 表
3. 点击 `payment` 表旁边的 **Track** 按钮
4. 表会被添加到 **Tracked tables** 列表中

如果没有看到 `payment` 表：
- 点击 **Reload** 按钮刷新数据库元数据
- 或者点击 **Track All** 追踪所有未追踪的表

## 步骤 3: 配置外键关系

### 3.1 Payment → User Subscriptions (多对一)

1. 在左侧边栏点击 `payment` 表
2. 点击 **Relationships** 标签
3. 在 **Object Relationships** 部分，点击 **Add** 按钮
4. 填写：
   - **Relationship Name**: `subscription`
   - **Reference Schema**: `public`
   - **Reference Table**: `user_subscriptions`
   - **From**: `subscription_id`
   - **To**: `id`
5. 点击 **Save** 按钮

### 3.2 User Subscriptions → Payment (一对多)

1. 在左侧边栏点击 `user_subscriptions` 表
2. 点击 **Relationships** 标签
3. 在 **Array Relationships** 部分，点击 **Add** 按钮
4. 填写：
   - **Relationship Name**: `payments`
   - **Reference Schema**: `public`
   - **Reference Table**: `payment`
   - **From**: `id`
   - **To**: `subscription_id`
5. 点击 **Save** 按钮

## 步骤 4: 配置权限（可选但推荐）

### 为 `user` 角色配置权限

#### Payment 表 - SELECT 权限

1. 点击 `payment` 表
2. 点击 **Permissions** 标签
3. 在 `user` 行点击 **Select** 的编辑图标（或插入按钮）
4. 配置：
   - **Row select permissions**: 
     ```json
     {
       "user_id": {
         "_eq": "X-Hasura-User-Id"
       }
     }
     ```
   - **Column select permissions**: 选择所有列（或排除敏感列如 `metadata`）
5. 点击 **Save Permissions**

#### User Subscriptions 表 - SELECT 权限（如果尚未配置）

1. 点击 `user_subscriptions` 表
2. 点击 **Permissions** 标签
3. 配置类似的权限，确保用户只能查看自己的订阅记录

## 步骤 5: 测试配置

### 在 GraphiQL 中测试查询

进入 **API** 标签页，执行以下查询测试：

```graphql
# 查询支付记录
query GetPayments {
  payment(limit: 10, order_by: { created_at: desc }) {
    id
    user_id
    amount
    currency
    status
    payment_provider
    plan
    payment_date
    subscription {
      id
      plan
      is_active
    }
  }
}

# 查询用户订阅及其支付历史
query GetUserSubscriptionWithPayments($userId: String!) {
  user_subscriptions(
    where: { user_id: { _eq: $userId } }
    order_by: { created_at: desc }
  ) {
    id
    plan
    is_active
    payment_provider
    created_at
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

测试变量：
```json
{
  "userId": "your-test-user-id"
}
```

## 步骤 6: 验证外键约束

在 **SQL** 标签页执行以下查询验证外键：

```sql
-- 验证外键约束
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'payment';
```

应该看到 `payment` 表有一个外键指向 `user_subscriptions` 表。

## 常见问题

### Q: Track 按钮不可用或表未出现？
**A**: 刷新浏览器或点击 **Reload** 按钮重新加载数据库元数据。

### Q: 外键关系配置失败？
**A**: 确保已执行 SQL 迁移且外键约束已创建。检查 `payment.subscription_id` 字段的数据类型与 `user_subscriptions.id` 一致。

### Q: 权限配置后查询失败？
**A**: 确保在请求头中正确传递了 `X-Hasura-User-Id`。在测试时可以在 GraphiQL 的 **Request Headers** 中添加：
```json
{
  "X-Hasura-User-Id": "test-user-id",
  "X-Hasura-Role": "user"
}
```

## 下一步

配置完成后：
1. 测试 PayPal 订阅创建和支付记录
2. 测试 Stripe 订阅创建和支付记录
3. 验证订阅升级时历史记录是否正确保留
4. 检查支付记录是否正确关联到订阅

## 相关文件

- SQL 迁移: [`database/migrations/create-payment-table.sql`](../migrations/create-payment-table.sql)
- PayPal Webhook: [`lib/api_handlers/payment/paypal-webhook.js`](../../lib/api_handlers/payment/paypal-webhook.js)
- PayPal 同步: [`lib/api_handlers/payment/paypal-sync-subscription.js`](../../lib/api_handlers/payment/paypal-sync-subscription.js)
- Stripe Webhook: [`lib/api_handlers/payment/webhook.js`](../../lib/api_handlers/payment/webhook.js)

