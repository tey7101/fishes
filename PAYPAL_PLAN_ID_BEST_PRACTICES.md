# PayPal Plan ID 处理最佳实践

## 问题背景

PayPal 自动生成的 Plan ID（如 `P-5ML4271244454362WXNWU5NQ`）是随机字符串，不包含套餐类型信息（如 Plus、Premium），无法直接识别。

## 解决方案

### ✅ 已实现：API 查询 + 映射表组合

创建了专用辅助模块 `lib/api_handlers/payment/paypal-plan-helper.js`，采用多层策略：

#### **策略 1：环境变量映射表（最快）**

```javascript
const PLAN_ID_MAPPING = {
  [process.env.PAYPAL_PREMIUM_MONTHLY_PLAN_ID]: { plan: 'premium', period: 'monthly' },
  [process.env.PAYPAL_PREMIUM_YEARLY_PLAN_ID]: { plan: 'premium', period: 'yearly' },
  [process.env.PAYPAL_PLUS_MONTHLY_PLAN_ID]: { plan: 'plus', period: 'monthly' },
  [process.env.PAYPAL_PLUS_YEARLY_PLAN_ID]: { plan: 'plus', period: 'yearly' },
};
```

**优点**：零 API 调用，响应最快  
**前提**：需要在 `.env.local` 中配置 Plan IDs

#### **策略 2：查询 PayPal API 获取 Plan 详情（自动降级）**

如果映射表未找到，自动调用 PayPal API：

```javascript
GET /v1/billing/plans/{plan_id}
```

从返回的 `name` 或 `description` 字段中提取套餐类型：

```json
{
  "id": "P-5ML4271244454362WXNWU5NQ",
  "name": "FishArt Premium - Monthly",
  "description": "Premium membership with monthly billing",
  "billing_cycles": [...]
}
```

**关键字匹配**：
- 包含 "premium" → `plan: 'premium'`
- 包含 "plus" → `plan: 'plus'`
- 都不匹配 → `plan: 'free'`（默认）

#### **策略 3：提取计费周期**

从 Plan 的 `billing_cycles` 中提取：

```javascript
{
  "billing_cycles": [
    {
      "tenure_type": "REGULAR",
      "frequency": {
        "interval_unit": "MONTH", // 或 "YEAR"
        "interval_count": 1
      }
    }
  ]
}
```

- `interval_unit: "MONTH"` → `period: 'monthly'`
- `interval_unit: "YEAR"` → `period: 'yearly'`

## 使用方法

### 在 Webhook 中使用

```javascript
const { getMemberPlanFromPayPalPlanId } = require('./paypal-plan-helper');

async function handleSubscriptionActivated(event) {
  const planId = event.resource.plan_id;
  
  // 一行代码获取套餐信息
  const planInfo = await getMemberPlanFromPayPalPlanId(planId);
  const memberPlan = planInfo.plan;        // 'premium' | 'plus' | 'free'
  const billingPeriod = planInfo.period;   // 'monthly' | 'yearly'
  
  console.log(`推断结果: plan="${memberPlan}", period="${billingPeriod}"`);
}
```

## 配置建议

### 立即可用（无需配置）

当前实现即可工作，自动调用 PayPal API 查询。

### 性能优化（推荐）

在 `.env.local` 中配置 Plan IDs：

```bash
# 从 PayPal Dashboard 复制创建好的 Plan IDs
PAYPAL_PREMIUM_MONTHLY_PLAN_ID=P-XXXXX...
PAYPAL_PREMIUM_YEARLY_PLAN_ID=P-XXXXX...
PAYPAL_PLUS_MONTHLY_PLAN_ID=P-XXXXX...
PAYPAL_PLUS_YEARLY_PLAN_ID=P-XXXXX...
```

配置后，系统会优先使用映射表，避免 API 调用。

## PayPal API 文档参考

- **Get Plan Details**: `GET /v1/billing/plans/{id}`
- **官方文档**: https://developer.paypal.com/docs/api/subscriptions/v1/#plans_get

### Plan 响应示例

```json
{
  "id": "P-5ML4271244454362WXNWU5NQ",
  "product_id": "PROD-XXXXXXXXXXXX",
  "name": "FishArt Premium - Monthly",
  "description": "Premium membership with monthly billing",
  "status": "ACTIVE",
  "billing_cycles": [
    {
      "frequency": {
        "interval_unit": "MONTH",
        "interval_count": 1
      },
      "tenure_type": "REGULAR",
      "sequence": 1,
      "total_cycles": 0,
      "pricing_scheme": {
        "fixed_price": {
          "value": "9.99",
          "currency_code": "USD"
        }
      }
    }
  ],
  "payment_preferences": {...},
  "taxes": {...}
}
```

## 创建 Plan 时的命名规范（推荐）

在创建 PayPal Plan 时，遵循以下命名规范：

```javascript
// ✅ 推荐格式
name: "FishArt Premium - Monthly"
name: "FishArt Plus - Yearly"

// ❌ 避免模糊命名
name: "Subscription Plan A"
name: "Monthly Plan"
```

**关键点**：
1. 在 `name` 中明确包含套餐类型（Premium/Plus）
2. 包含计费周期（Monthly/Yearly）
3. 使用一致的命名格式

## 已更新的文件

1. **新建**: `lib/api_handlers/payment/paypal-plan-helper.js`
   - 核心辅助模块
   - 导出 `getMemberPlanFromPayPalPlanId` 函数

2. **更新**: `lib/api_handlers/payment/paypal-webhook.js`
   - 使用新的辅助函数替换原有的内联逻辑
   - 代码更简洁，逻辑复用

3. **更新**: `lib/api_handlers/payment/paypal-sync-subscription.js`
   - 使用相同的辅助函数
   - 确保 webhook 和手动同步使用统一逻辑

## 测试建议

1. **测试映射表（如果已配置）**：
   ```bash
   # 配置好环境变量后测试
   node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.PAYPAL_PREMIUM_MONTHLY_PLAN_ID)"
   ```

2. **测试 API 查询**：
   ```javascript
   const { getMemberPlanFromPayPalPlanId } = require('./lib/api_handlers/payment/paypal-plan-helper');
   
   (async () => {
     const result = await getMemberPlanFromPayPalPlanId('P-5ML4271244454362WXNWU5NQ');
     console.log(result); // { plan: 'premium', period: 'monthly' }
   })();
   ```

3. **实际升级测试**：
   - Plus 用户升级到 Premium
   - 检查服务器日志，查看推断结果
   - 验证 `payment` 表的 `plan` 字段是否正确

## 预期日志输出

```bash
✅ Subscription activated: I-XXXXX for user 029a2488-4794-4d25-ae70-7a06a44c1df7
   PayPal Plan ID: "P-5ML4271244454362WXNWU5NQ"
🔍 开始推断 PayPal Plan ID: "P-5ML4271244454362WXNWU5NQ"
⚠️  映射表中未找到 Plan ID，尝试查询 PayPal API...
📦 PayPal Plan 详情: {
  "id": "P-5ML4271244454362WXNWU5NQ",
  "name": "FishArt Premium - Monthly",
  "description": "Premium membership",
  "status": "ACTIVE"
}
✅ 从 Plan Name "FishArt Premium - Monthly" 推断出: "premium"
✅ 推断出计费周期: "monthly"
   ✅ 推断结果: memberPlan="premium", billingPeriod="monthly"
```

## 优势总结

✅ **零配置可用**：默认调用 API，无需手动维护映射  
✅ **性能可优化**：配置环境变量后使用映射表，避免 API 调用  
✅ **自动降级**：映射表失败时自动切换到 API 查询  
✅ **代码复用**：统一逻辑，webhook 和手动同步共享  
✅ **扩展性强**：新增套餐时只需在 Plan Name 中包含关键字  
✅ **调试友好**：详细的日志输出，易于排查问题

## 注意事项

1. **PayPal API 速率限制**：频繁调用可能受限，建议配置映射表
2. **命名规范一致性**：创建新 Plan 时务必遵循命名规范
3. **错误处理**：API 调用失败时会降级到默认值 `'free'`
4. **日志监控**：注意观察推断结果是否符合预期

---

**最后更新**: 2025-11-28

