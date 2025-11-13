-- ============================================
-- 留言系统权限配置 SQL 脚本
-- ============================================
-- 说明：Hasura 权限主要通过 Console UI 配置
-- 本脚本提供一些辅助 SQL 和配置说明
-- ============================================

-- ============================================
-- 1. 验证表结构
-- ============================================

-- 检查 messages 表是否存在
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 检查外键约束
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
    AND tc.table_name = 'messages';

-- ============================================
-- 2. 创建用于权限测试的视图（可选）
-- ============================================

-- 创建公开留言视图（用于测试）
CREATE OR REPLACE VIEW public_messages_view AS
SELECT 
    id,
    sender_id,
    receiver_id,
    fish_id,
    message_type,
    visibility,
    content,
    created_at
FROM messages
WHERE visibility = 'public'
ORDER BY created_at DESC;

-- 创建用户可查看的留言视图（用于测试）
-- 注意：这个视图在实际使用中可能不需要，因为 Hasura 权限会自动过滤
CREATE OR REPLACE VIEW user_visible_messages_view AS
SELECT 
    m.*
FROM messages m
WHERE 
    m.visibility = 'public'
    OR m.sender_id = current_setting('hasura.user_id', true)::text
    OR m.receiver_id = current_setting('hasura.user_id', true)::text;

-- ============================================
-- 3. 权限配置说明（需要在 Hasura Console 中配置）
-- ============================================

/*
============================================
Hasura Console 配置步骤
============================================

1. 登录 Hasura Console
2. 进入 Data → messages 表
3. 点击 "Permissions" 标签
4. 为 "user" 角色配置以下权限：

--------------------------------------------
SELECT 权限配置
--------------------------------------------
在 Hasura Console 中：
1. 点击 "user" 角色旁边的 "+" 按钮
2. 选择 "Select" 权限
3. 在 "Row select permissions" 中，选择 "With custom check"
4. 粘贴以下 JSON：

{
  "_or": [
    {
      "sender_id": {
        "_eq": "X-Hasura-User-Id"
      }
    },
    {
      "receiver_id": {
        "_eq": "X-Hasura-User-Id"
      }
    },
    {
      "visibility": {
        "_eq": "public"
      }
    }
  ]
}

5. 在 "Columns select permissions" 中，选择以下列：
   - id
   - sender_id
   - receiver_id
   - fish_id
   - message_type
   - visibility
   - content
   - created_at

--------------------------------------------
INSERT 权限配置
--------------------------------------------
1. 点击 "user" 角色旁边的 "+" 按钮
2. 选择 "Insert" 权限
3. 在 "Row insert permissions" 中，选择 "With custom check"
4. 粘贴以下 JSON：

{
  "sender_id": {
    "_eq": "X-Hasura-User-Id"
  }
}

5. 在 "Columns insert permissions" 中，选择以下列：
   - sender_id (预设值: X-Hasura-User-Id)
   - receiver_id
   - fish_id
   - message_type
   - visibility
   - content

6. 在 "Column presets" 中设置：
   sender_id = X-Hasura-User-Id

--------------------------------------------
DELETE 权限配置
--------------------------------------------
1. 点击 "user" 角色旁边的 "+" 按钮
2. 选择 "Delete" 权限
3. 在 "Row delete permissions" 中，选择 "With custom check"
4. 粘贴以下 JSON：

{
  "_or": [
    {
      "sender_id": {
        "_eq": "X-Hasura-User-Id"
      }
    },
    {
      "receiver_id": {
        "_eq": "X-Hasura-User-Id"
      }
    }
  ]
}

--------------------------------------------
关系配置（Relationships）
--------------------------------------------
1. 在 messages 表的 "Relationships" 标签中
2. 添加以下 Object Relationships：

关系名: sender
类型: Object Relationship
引用表: users
从: sender_id
到: id

关系名: receiver
类型: Object Relationship
引用表: users
从: receiver_id
到: id

关系名: fish
类型: Object Relationship
引用表: fish
从: fish_id
到: id

3. 在 users 表的 "Relationships" 标签中，添加：

关系名: sent_messages
类型: Array Relationship
引用表: messages
从: id
到: sender_id

关系名: received_messages
类型: Array Relationship
引用表: messages
从: id
到: receiver_id

4. 在 fish 表的 "Relationships" 标签中，添加：

关系名: messages
类型: Array Relationship
引用表: messages
从: id
到: fish_id

============================================
*/

-- ============================================
-- 4. 测试查询（在配置权限后使用）
-- ============================================

-- 测试：查询所有公开留言
-- SELECT * FROM messages WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 10;

-- 测试：查询特定鱼的留言
-- SELECT * FROM messages WHERE fish_id = 'your-fish-uuid' AND visibility = 'public' ORDER BY created_at DESC;

-- 测试：统计留言数量
-- SELECT 
--     COUNT(*) as total_messages,
--     COUNT(*) FILTER (WHERE visibility = 'public') as public_messages,
--     COUNT(*) FILTER (WHERE visibility = 'private') as private_messages
-- FROM messages;

-- ============================================
-- 5. 清理脚本（如果需要）
-- ============================================

-- 删除测试视图（如果需要）
-- DROP VIEW IF EXISTS public_messages_view;
-- DROP VIEW IF EXISTS user_visible_messages_view;

-- ============================================
-- 配置完成检查清单
-- ============================================

/*
✅ 1. 执行了 add-message-system.sql 创建 messages 表
✅ 2. 在 Hasura Console 中配置了 Select 权限
✅ 3. 在 Hasura Console 中配置了 Insert 权限
✅ 4. 在 Hasura Console 中配置了 Delete 权限
✅ 5. 配置了 sender → users 关系
✅ 6. 配置了 receiver → users 关系
✅ 7. 配置了 fish → fish 关系
✅ 8. 在 users 表中配置了 sent_messages 关系
✅ 9. 在 users 表中配置了 received_messages 关系
✅ 10. 在 fish 表中配置了 messages 关系
✅ 11. 测试了权限配置是否生效
*/

