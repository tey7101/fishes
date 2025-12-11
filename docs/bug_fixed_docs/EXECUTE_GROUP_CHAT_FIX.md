# 群聊保存问题 - 立即执行修复步骤

## 问题总结

今天创建的群聊无法保存到数据库，错误：`invalid input syntax for type uuid: "7578731396383096847"`

**原因**：Coze API返回的conversation_id是字符串，但数据库字段类型是UUID。

## 立即执行的修复步骤

### 步骤1: 执行数据库SQL（必需）⭐

打开Hasura Console: https://your-hasura-url/console

进入 **Data → SQL**，执行以下SQL：

```sql
-- 添加新字段 coze_conversation_id 用于保存 Coze API 返回的字符串 ID
ALTER TABLE group_chat 
ADD COLUMN IF NOT EXISTS coze_conversation_id TEXT;

-- 添加注释说明字段用途
COMMENT ON COLUMN group_chat.coze_conversation_id IS 'Coze API返回的conversation ID（字符串类型）';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_group_chat_coze_conversation_id 
ON group_chat(coze_conversation_id);

-- 验证字段是否添加成功
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'group_chat'
AND column_name IN ('conversation_id', 'coze_conversation_id')
ORDER BY column_name;
```

### 步骤2: 刷新Hasura Metadata

在Hasura Console中：
1. 点击右上角的 **Track** 图标（如果出现）
2. 或者进入 **Data → group_chat → Modify**
3. 点击 **Reload** 按钮

### 步骤3: 下载更新后的GraphQL Schema

```bash
npm run download:schema
```

### 步骤4: 重启服务器

服务器会自动重新加载代码（如果使用nodemon），或者手动重启：

```bash
# 停止服务器 (Ctrl+C)
# 然后重启
npm start
```

### 步骤5: 测试群聊创建

```bash
# 测试群聊创建
node diagnose-group-chat-save-issue.js

# 或者直接在浏览器中测试
# 打开 http://localhost:3000/tank.html
# 点击"随机群聊"按钮
```

### 步骤6: 验证记录

```bash
# 检查今天的群聊记录
node check-today-group-chats.js
```

## 完成后的状态

✅ `group_chat`表可以保存记录  
✅ 新字段`coze_conversation_id`保存Coze API的conversation ID  
✅ 群聊功能正常工作  
❌ `conversations`表仍然为空（需要后续单独处理）

## 代码变更说明

已修改文件：
- ✅ `lib/api_handlers/fish/chat/group.js` - 使用新字段`coze_conversation_id`
- ✅ `sql/fix-group-chat-conversation-id.sql` - 数据库迁移SQL
- ✅ `FIX_GROUP_CHAT_CONVERSATION_ID.md` - 详细文档

## 后续TODO

- [ ] 实现`conversations`表的记录创建逻辑
- [ ] 更新前端代码使用新字段
- [ ] 更新相关查询/mutation

## 问题排查

如果执行后仍然报错：

1. **检查字段是否添加成功**
```sql
\d group_chat;
```

2. **检查Hasura是否识别新字段**
在Hasura Console的GraphiQL中执行：
```graphql
query {
  __type(name: "group_chat") {
    fields {
      name
      type { name }
    }
  }
}
```

3. **查看服务器日志**
检查是否还有UUID相关错误

4. **清除GraphQL缓存**
```bash
npm run download:schema
```

## 联系

如有问题请检查：
- 服务器日志：terminal 5
- Hasura Console SQL执行结果
- `check-today-group-chats.js`输出

