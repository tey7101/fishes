-- ============================================
-- 升级用户到 Plus 会员（迁移后版本）
-- ============================================
-- 用户ID: f4933d0f-35a0-4aa1-8de5-ba407714b65c
-- 注意：此脚本在表结构迁移后使用（id 是主键，user_id 可以有重复值）

-- 确保 member_types 表中有 'plus' 记录
INSERT INTO member_types (
  id, name, max_fish_count, can_self_talk, can_group_chat, 
  can_promote_owner, promote_owner_frequency, lead_topic_frequency
) VALUES (
  'plus', 'Plus', 5, true, true, true, 2, 1
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  max_fish_count = EXCLUDED.max_fish_count,
  can_self_talk = EXCLUDED.can_self_talk,
  can_group_chat = EXCLUDED.can_group_chat,
  can_promote_owner = EXCLUDED.can_promote_owner,
  promote_owner_frequency = EXCLUDED.promote_owner_frequency,
  lead_topic_frequency = EXCLUDED.lead_topic_frequency,
  updated_at = NOW();

-- 将用户的所有活跃订阅设为非活跃（如果有）
UPDATE user_subscriptions 
SET is_active = false, updated_at = NOW()
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c'
  AND is_active = true;

-- 插入新的 Plus 订阅记录
INSERT INTO user_subscriptions (user_id, plan, is_active)
VALUES ('f4933d0f-35a0-4aa1-8de5-ba407714b65c', 'plus', true);

-- 验证结果
SELECT 
  us.id,
  us.user_id,
  us.plan,
  us.is_active,
  us.created_at,
  mt.name as member_type_name,
  mt.max_fish_count,
  mt.can_self_talk,
  mt.can_group_chat
FROM user_subscriptions us
LEFT JOIN member_types mt ON us.plan = mt.id
WHERE us.user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c'
ORDER BY us.created_at DESC;

