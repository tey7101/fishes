# 🐟 批量更新鱼名脚本使用指南

## 功能说明

这个脚本会自动为数据库中没有名字的鱼（`fish_name`为空或null）生成合理的鱼名，让它们看起来像是用户自己取的名字。

## 名字风格

脚本包含200+个精心挑选的鱼名，分为多个类别：

- **可爱系列**: Bubbles, Nemo, Dory, Goldie, Lucky...
- **颜色系列**: Blue, Rainbow, Gold, Ruby, Sapphire...
- **速度系列**: Flash, Dash, Speedy, Turbo, Lightning...
- **性格系列**: Sassy, Brave, Cheeky, Grumpy, Jolly...
- **食物系列**: Cookie, Sushi, Mochi, Taco, Waffle...
- **神话系列**: Zeus, Neptune, Phoenix, Dragon, Thor...
- **可爱英文名**: Charlie, Max, Lily, Oliver, Bella...

名字会随机组合：
- 30%概率只用基础名字（如 "Bubbles"）
- 40%概率加数字（如 "Nemo42", "Flash789"）
- 30%概率加罗马数字（如 "Lucky III", "Dragon V"）

## 使用方法

### 1. 确保环境配置

确保`.env.local`文件包含以下配置：
```env
HASURA_GRAPHQL_ENDPOINT=https://your-hasura-endpoint/v1/graphql
HASURA_ADMIN_SECRET=your-admin-secret
```

### 2. 运行脚本

```bash
node update-fish-names.js
```

### 3. 查看结果

脚本会显示：
- 找到多少条需要更新的鱼
- 更新进度（每50条显示一次）
- 成功和失败的统计
- 10个名字示例

## 示例输出

```
🐟 开始批量更新鱼名...

🔍 查询需要更新名字的鱼...

📊 找到 1234 条需要更新的鱼

开始更新...

✓ 已更新 50 条...
✓ 已更新 100 条...
✓ 已更新 150 条...
...

==================================================
📊 更新完成！
✅ 成功: 1234 条
❌ 失败: 0 条
==================================================

📝 名字示例:
   1. Bubbles
   2. Nemo42
   3. Rainbow III
   4. Flash789
   5. Lucky V
   6. Sushi123
   7. Dragon
   8. Charlie456
   9. Thunder II
   10. Pearl99
```

## 注意事项

1. **批量操作**: 脚本会一次性处理所有没有名字的鱼（最多2000条）
2. **速度限制**: 每10条更新后会暂停100ms，避免请求过快
3. **幂等性**: 已有名字的鱼不会被修改
4. **安全性**: 使用GraphQL mutation，保证数据完整性

## 效果展示

更新前（弹窗显示）：
```
Fish #b12ab97d by mike_johnson
```

更新后（弹窗显示）：
```
Nemo by mike_johnson
```

或

```
Rainbow III by mike_johnson
```

## 自定义名字列表

如果想修改名字列表，编辑`update-fish-names.js`中的`FISH_NAMES`数组即可。

## 故障排除

**问题**: 提示查询失败
- 检查`.env.local`配置是否正确
- 确认Hasura服务是否运行
- 确认admin secret是否正确

**问题**: 全部更新成功但看不到效果
- 清除浏览器缓存
- 检查前端是否正确读取`fish_name`字段

