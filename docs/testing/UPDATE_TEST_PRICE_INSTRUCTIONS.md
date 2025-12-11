# 更新测试套餐价格说明

## 📋 需要执行的操作

### 1️⃣ 在 Hasura Console 执行 SQL

请访问 Hasura Console 的 SQL 页面并执行以下 SQL：

```sql
UPDATE member_types 
SET 
  fee_per_month = 0.50,  -- $0.50/月
  fee_per_year = 6.00    -- $6.00/年
WHERE id IN ('test_plus', 'test_premium');

-- 查询确认
SELECT id, name, fee_per_month, fee_per_year 
FROM member_types 
WHERE id IN ('test_plus', 'test_premium');
```

### 2️⃣ 确认执行结果

执行后应该看到：

| id           | name         | fee_per_month | fee_per_year |
|--------------|--------------|---------------|--------------|
| test_plus    | Test Plus    | 0.50          | 6.00         |
| test_premium | Test Premium | 0.50          | 6.00         |

### 3️⃣ 刷新页面测试

- 打开 `http://localhost:3000/membership.html`
- 硬刷新（Ctrl+Shift+R）
- 检查 Test Plus 和 Test Premium 显示价格为 **$0.50/月** 或 **$6.00/年**
- 橙色警告框 "🧪 测试套餐" 应该已消失

## ✅ 已完成的修改

1. ✅ 移除前端警告框代码
2. ✅ 移除相关 CSS 样式
3. ✅ 更新 `membership.js` 版本到 v3.5
4. ✅ 创建数据库更新 SQL 脚本

## 📝 注意事项

- 新价格 $0.50 在 Stripe Dashboard 后台可见
- 测试套餐仍然只对特定用户可见（`11312701-f1d2-43f8-a13d-260eac812b7a`）
- 橙色边框和 TEST 角标样式保留，仅移除顶部警告文本框

