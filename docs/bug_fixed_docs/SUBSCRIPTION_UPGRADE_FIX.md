# 订阅升级修复总结

## 修复的问题

### 1. ✅ 修复 billing cycle 信息缺失
**问题**: `current_period_start` 和 `current_period_end` 显示为 NULL

**修复**:
- 在 `paypal-webhook.js` 和 `paypal-sync-subscription.js` 中添加了从 PayPal 订阅信息中提取 billing cycle 的逻辑
- 从 `billing_info.next_billing_time` 获取结束时间
- 从 `billing_info.last_payment.time` 或 `cycle_executions` 获取开始时间
- 如果无法获取，使用当前时间并计算下一个月

### 2. ✅ 改进套餐类型识别
**问题**: Premium 订阅被识别为 Plus

**修复**:
- 改进了套餐类型识别逻辑，使用更精确的字符串匹配
- 添加了详细的日志输出，便于调试

### 3. ✅ 确保使用真实的 PayPal 订阅ID
**问题**: 显示测试ID而不是真实的 PayPal 订阅ID

**修复**:
- 确保从 PayPal webhook 事件或 API 响应中获取真实的 `subscription.id`
- 在创建订阅记录时正确传递 `paypal_subscription_id`

### 4. ⏳ 时间显示为北京时间
**问题**: 时间字段显示为 UTC 时间

**解决方案**:
- 创建了 `database/migrations/set-timezone-beijing.sql` 脚本
- 提供了时区转换函数 `to_beijing_time()`
- 可以在 Hasura Console 中执行 SQL 设置时区

## 修改的文件

1. **`lib/api_handlers/payment/paypal-webhook.js`**
   - 添加 billing cycle 信息提取
   - 改进套餐类型识别
   - 在创建订阅时包含 `current_period_start` 和 `current_period_end`

2. **`lib/api_handlers/payment/paypal-sync-subscription.js`**
   - 添加 billing cycle 信息提取
   - 改进套餐类型识别
   - 在创建订阅时包含 `current_period_start` 和 `current_period_end`

3. **`database/migrations/set-timezone-beijing.sql`** (新建)
   - 设置数据库时区为北京时间
   - 创建时区转换函数

## 使用方法

### 设置时区（在 Hasura Console 的 SQL 编辑器中执行）

```sql
-- 执行 database/migrations/set-timezone-beijing.sql
```

或者手动执行：

```sql
-- 设置会话时区
SET timezone = 'Asia/Shanghai';

-- 创建时区转换函数
CREATE OR REPLACE FUNCTION to_beijing_time(timestamp_value timestamp)
RETURNS timestamp AS $$
BEGIN
  RETURN timestamp_value AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 在查询中使用时区转换

```sql
-- 查询订阅记录，时间显示为北京时间
SELECT 
  id,
  plan,
  to_beijing_time(created_at) AS created_at_beijing,
  to_beijing_time(updated_at) AS updated_at_beijing,
  to_beijing_time(current_period_start) AS period_start_beijing,
  to_beijing_time(current_period_end) AS period_end_beijing
FROM user_subscriptions;
```

## 测试建议

1. **测试订阅升级**:
   - Plus 用户升级到 Premium
   - 验证 `plan` 字段显示为 "premium"
   - 验证 `paypal_subscription_id` 是真实的 PayPal ID
   - 验证 `current_period_start` 和 `current_period_end` 有值

2. **测试时间显示**:
   - 在 Hasura Console 中查看订阅记录
   - 验证时间显示为北京时间（UTC+8）

## 注意事项

1. **时区设置**: 数据库时区设置是会话级别的，如果需要永久设置，需要数据库管理员权限
2. **PayPal API**: 确保 PayPal webhook 正确配置，以便获取完整的订阅信息
3. **套餐识别**: 如果 PayPal Plan ID 命名不规范，可能需要手动调整识别逻辑

## 后续优化建议

1. 在 Hasura 中创建计算字段（Computed Field）自动转换时区
2. 在前端显示时统一转换为北京时间
3. 添加更多日志以便调试套餐类型识别问题

