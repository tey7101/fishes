# 群聊 Conversation ID 类型不匹配修复

## 问题描述

今天创建的群聊无法保存到数据库，错误信息：
```
invalid input syntax for type uuid: "7578731396383096847"
```

## 根本原因

1. Coze API返回的`conversation_id`是字符串类型：`"7578731396383096847"`
2. 数据库中`group_chat.conversation_id`字段类型是`uuid`
3. PostgreSQL的UUID类型无法接受普通数字字符串

## 解决方案

### 1. 数据库修改

执行SQL文件：`sql/fix-group-chat-conversation-id.sql`

```bash
# 在Hasura Console的SQL页面执行
cat sql/fix-group-chat-conversation-id.sql
```

这将：
- 添加新字段`coze_conversation_id` (TEXT类型)保存Coze API的conversation ID
- 保留`conversation_id` (UUID类型)用于关联`conversations`表
- 添加索引提高查询性能

### 2. 更新Hasura Schema

在Hasura Console中：
1. 进入 Data -> group_chat -> Modify
2. 点击"Reload"刷新schema
3. 验证新字段`coze_conversation_id`是否出现

### 3. 更新GraphQL Schema

```bash
npm run download:schema
```

### 4. 代码修改

修改`lib/api_handlers/fish/chat/group.js`中的`saveGroupChatSession`函数：

- 将`conversation_id`参数改为`coze_conversation_id`
- 移除UUID验证逻辑
- 更新mutation使用新字段

## 字段说明

- **`coze_conversation_id`** (TEXT): Coze API返回的conversation ID字符串
- **`conversation_id`** (UUID): 用于关联`conversations`表的UUID(未来使用)

## 测试

```bash
# 测试群聊创建
node diagnose-group-chat-save-issue.js

# 检查今天的记录
node check-today-group-chats.js
```

## 数据迁移

如果需要迁移旧数据，暂时不需要，因为：
1. 旧记录的`conversation_id`已经是NULL
2. 新字段`coze_conversation_id`允许NULL

## 注意事项

- 不要删除`conversation_id`字段，它将用于未来的`conversations`表关联
- Coze API的conversation_id是临时的，不保证永久有效
- `conversations`表需要单独的逻辑来创建和管理记录

