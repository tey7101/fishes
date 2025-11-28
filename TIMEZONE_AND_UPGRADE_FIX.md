# 时区显示和订阅升级问题修复

## 问题汇总

1. **Hasura 时间显示问题** - 所有表的日期时间字段需要显示北京时间
2. **payment 表 plan 字段错误** - Plus 升级 Premium 后，payment 表的 plan 显示为 plus
3. **user_subscriptions 表没有记录** - 升级后没有创建新的订阅记录

## 问题1: Hasura 时区显示

### 原因
- 数据库存储的是 UTC 时间（这是正确的）
- Hasura Console 默认显示 UTC 时间
- 需要在前端转换或配置 Hasura 显示时区

### 解决方案

#### 方案A: 前端转换（推荐）
在前端显示时自动转换为北京时间：

```javascript
// 在 src/js/admin-table-editor.js 或其他前端代码中
function formatBeijingTime(utcTimestamp) {
  if (!utcTimestamp) return '-';
  const date = new Date(utcTimestamp);
  // 转换为北京时间（UTC+8）
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
```

#### 方案B: 数据库视图（备选）
创建视图在数据库层面转换时区：

```sql
-- 创建视图显示北京时间
CREATE OR REPLACE VIEW payment_beijing_time AS
SELECT 
  id,
  user_id,
  amount,
  currency,
  status,
  payment_provider,
  plan,
  (payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai') as payment_date_beijing,
  (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai') as created_at_beijing,
  (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai') as updated_at_beijing
FROM payment;
```

### 注意事项
- **不要修改数据库时区设置** - 这会影响所有时间存储
- **数据库应该始终存储 UTC 时间** - 这是最佳实践
- **只在显示层转换时区** - 保持数据层的一致性

## 问题2 & 3: 订阅升级逻辑问题

### 诊断
用户升级时，系统应该：
1. 禁用旧的 Plus 订阅（`is_active = false`）
2. 创建新的 Premium 订阅（`is_active = true`）
3. 在 payment 表中记录 Premium 支付

### 可能的原因
1. PayPal webhook 没有触发
2. 升级使用了同一个 subscription_id（没有创建新订阅）
3. 前端或 API 逻辑错误

### 需要检查
1. 用户是如何升级的？（通过 membership.html 页面？）
2. PayPal 订阅 ID 是否变了？
3. 服务器日志中是否有错误？

