# 支付记录缺失问题修复

## 问题描述

订阅升级后，`payment` 表中没有出现对应的支付记录。

## 问题原因

1. **历史订阅记录** - 在添加支付记录功能之前创建的订阅没有支付记录
2. **错误被静默捕获** - 支付记录插入失败时，错误被 catch 但没有详细日志
3. **可能的原因** - GraphQL mutation 执行失败但没有抛出错误

## 已实施的修复

### 1. ✅ 改进错误处理和日志

**文件**: 
- `lib/api_handlers/payment/paypal-webhook.js`
- `lib/api_handlers/payment/paypal-sync-subscription.js`

**改进**:
- 添加了详细的日志输出
- 改进了错误处理，输出完整的错误信息
- 验证支付记录插入是否成功返回 ID

### 2. ✅ 改进支付金额获取

**文件**: `lib/api_handlers/payment/paypal-sync-subscription.js`

**改进**:
- 从 PayPal 订阅的 `billing_info.last_payment` 获取金额
- 如果无法获取，尝试从 `outstanding_balance` 获取
- 如果还是无法获取，尝试从 Plan API 获取
- 最后使用默认金额（Premium: 19.99, Plus: 9.99）

### 3. ✅ 创建数据补充脚本

**文件**: `backfill-payment-records.js`

**功能**:
- 为现有订阅补充支付记录
- 自动从 PayPal API 获取真实金额
- 跳过 free 和 admin 套餐

## 使用方法

### 为现有订阅补充支付记录

```bash
node backfill-payment-records.js
```

### 检查支付记录

```bash
node check-payment-records.js
```

## 验证修复

运行以下命令验证：

```bash
# 1. 检查支付记录
node check-payment-records.js

# 2. 测试支付记录插入
node test-payment-insert.js
```

## 后续测试

1. **测试新订阅创建**
   - 创建新的 PayPal 订阅
   - 检查 `payment` 表中是否有对应记录
   - 查看服务器日志确认是否有错误

2. **测试订阅升级**
   - Plus 用户升级到 Premium
   - 检查新的 Premium 订阅是否有支付记录
   - 检查旧的 Plus 订阅的支付记录是否保留

3. **检查服务器日志**
   - 查看是否有 "❌ 记录支付失败" 的错误
   - 如果有，查看详细的错误信息

## 注意事项

1. **PayPal 订阅ID格式** - 测试环境的订阅ID（如 `test-link-sub-*`）无法从 PayPal API 查询，会使用默认金额
2. **错误处理** - 支付记录插入失败不会影响订阅创建，但会在日志中记录详细错误
3. **历史数据** - 使用 `backfill-payment-records.js` 可以为历史订阅补充支付记录

## 如果问题仍然存在

1. **检查服务器日志** - 查看是否有支付记录插入的错误信息
2. **检查 Hasura 权限** - 确保 API 有权限插入 `payment` 表
3. **手动测试** - 使用 `test-payment-insert.js` 测试支付记录插入是否正常
4. **检查 GraphQL Schema** - 确保 `payment` 表已正确 Track 并配置关系


