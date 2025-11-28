# Premium 升级支付记录错误修复

## 🎯 问题
用户选择 Premium 卡片升级后，payment 表里的 plan 字段却是 plus。

## 🔍 问题根源

### 日志分析
从用户日志看到：
- 用户当前订阅：plus (订阅ID: 53)
- 用户操作：点击 Premium 卡片升级
- **结果错误**：payment 表的 plan 字段是 "plus" 而不是 "premium"

### 代码问题
在 `paypal-webhook.js` 和 `paypal-sync-subscription.js` 中：

```javascript
// 原来的代码（有问题）
let memberPlan = 'plus'; // 默认值是 plus！
const planIdLower = planId.toLowerCase();
if (planIdLower.includes('premium')) {
  memberPlan = 'premium';
} else if (planIdLower.includes('plus')) {
  memberPlan = 'plus';
}
```

**问题**:
1. **默认值错误**: 默认值是 'plus' 而不是 'free'
2. **缺少日志**: 没有输出 Plan ID 和匹配过程
3. **没有 fallback 警告**: 如果都不匹配，不会发出警告

这导致如果 PayPal 的 plan_id 不包含 'premium' 或 'plus' 关键词，就会使用错误的默认值。

## ✅ 修复方案

### 1. 改进 Plan ID 匹配逻辑

**文件**: 
- `lib/api_handlers/payment/paypal-webhook.js` (第55-73行)
- `lib/api_handlers/payment/paypal-sync-subscription.js` (第82-102行)

**改进**:
```javascript
// 新代码（已修复）
let memberPlan = 'free'; // 默认值改为 free
const planIdLower = (planId || '').toLowerCase();

// 优先匹配 premium（因为 premium 可能也包含 plus 字样）
if (planIdLower.includes('premium')) {
  memberPlan = 'premium';
  console.log(`   🔍 检测到 Plan ID 包含 "premium" → memberPlan = "premium"`);
} else if (planIdLower.includes('plus')) {
  memberPlan = 'plus';
  console.log(`   🔍 检测到 Plan ID 包含 "plus" → memberPlan = "plus"`);
} else if (planIdLower.includes('free')) {
  memberPlan = 'free';
  console.log(`   🔍 检测到 Plan ID 包含 "free" → memberPlan = "free"`);
} else {
  // 如果都不匹配，记录警告
  console.warn(`   ⚠️ 无法从 Plan ID "${planId}" 识别套餐类型，使用默认值 "free"`);
  memberPlan = 'free';
}

console.log(`   ✅ 最终确定的 memberPlan: "${memberPlan}"`);
```

### 2. 增强调试日志

**新增日志**:
- 显示完整的 PayPal Plan ID
- 显示匹配过程
- 显示最终确定的 memberPlan
- 未匹配时发出警告

## 🔍 诊断步骤

### 步骤 1: 检查 PayPal Plan ID

运行以下查询查看实际的 Plan ID：

```bash
# 检查环境变量中的 PayPal Plan ID
cat .env.local | grep PAYPAL.*PLAN
```

应该看到类似：
```
PAYPAL_PLUS_MONTHLY_PLAN_ID=P-XXX...
PAYPAL_PREMIUM_MONTHLY_PLAN_ID=P-YYY...
```

### 步骤 2: 测试升级流程

1. 使用当前 Plus 用户
2. 点击 Premium 卡片升级
3. 完成 PayPal 支付
4. 查看服务器日志

**预期日志**:
```
✅ Subscription activated: I-XXX for user 029a2488-...
   PayPal Plan ID: "P-YYY..."
   🔍 检测到 Plan ID 包含 "premium" → memberPlan = "premium"
   ✅ 最终确定的 memberPlan: "premium"
✅ Created new subscription (ID: 54) for user ... - premium
✅ Recorded payment transaction (ID: XX) for subscription activation
```

### 步骤 3: 验证数据库

```bash
# 检查最新的订阅记录
node -e "
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
(async () => {
  const res = await fetch(process.env.HASURA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({
      query: \`
        query {
          user_subscriptions(
            where: { user_id: { _eq: \"029a2488-4794-4d25-ae70-7a06a44c1df7\" } }
            order_by: { created_at: desc }
            limit: 2
          ) {
            id plan is_active created_at
            payments { id plan amount }
          }
        }
      \`
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
})();
"
```

**预期结果**:
```json
{
  "data": {
    "user_subscriptions": [
      {
        "id": 54,
        "plan": "premium",  // ← 应该是 premium
        "is_active": true,
        "created_at": "2025-11-28T...",
        "payments": [
          {
            "id": 21,
            "plan": "premium",  // ← 应该是 premium
            "amount": 19.99
          }
        ]
      },
      {
        "id": 53,
        "plan": "plus",
        "is_active": false,  // ← 旧订阅被禁用
        "payments": [...]
      }
    ]
  }
}
```

## 🚀 测试步骤

### 1. 重启服务器
```bash
# 停止服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 2. 测试 Premium 升级
1. 登录 Plus 用户账号
2. 访问 membership.html
3. 点击 Premium 卡片
4. 完成支付流程
5. 查看服务器控制台日志

### 3. 验证结果
- ✅ user_subscriptions 表：plan = "premium", is_active = true
- ✅ payment 表：plan = "premium"
- ✅ 旧的 Plus 订阅：is_active = false

## 📊 可能的问题场景

### 场景 1: Plan ID 不包含关键词

**症状**: 看到警告日志
```
⚠️ 无法从 Plan ID "P-12345..." 识别套餐类型，使用默认值 "free"
```

**原因**: PayPal Plan ID 命名不规范

**解决**:
1. 检查 .env.local 中的 Plan ID
2. 在 PayPal Dashboard 中重命名 Plan
3. 或者改进匹配逻辑使用 Plan ID 映射表

### 场景 2: 仍然记录为 Plus

**症状**: 升级后 payment.plan = "plus"

**原因**: 
- 服务器未重启，仍在使用旧代码
- PayPal webhook 未触发
- 使用了手动同步但代码未更新

**解决**:
1. 确认服务器已重启
2. 检查 PayPal webhook 是否配置正确
3. 查看服务器日志中的 Plan ID

## 📝 修改的文件清单

1. ✅ `lib/api_handlers/payment/paypal-webhook.js` - 改进 plan 识别逻辑
2. ✅ `lib/api_handlers/payment/paypal-sync-subscription.js` - 改进 plan 识别逻辑
3. ✅ `PREMIUM_UPGRADE_FIX.md` - 本文档

## 🆘 如果问题仍然存在

请提供以下信息：
1. 服务器日志中的完整输出（特别是 "PayPal Plan ID" 那一行）
2. .env.local 中的 PAYPAL_PREMIUM_*_PLAN_ID 值
3. payment 表中错误记录的详细信息
4. user_subscriptions 表中的最新记录

这些信息可以帮助进一步诊断问题。

---

**重要**: 请重启服务器后再次测试升级流程，并注意查看服务器日志中的新增调试信息。

