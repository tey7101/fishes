-- ============================================
-- 最简单版本：升级用户到 Plus 会员
-- ============================================
-- 在 Hasura Console 的 SQL 编辑器中执行此 SQL
-- 用户ID: f4933d0f-35a0-4aa1-8de5-ba407714b65c

-- 确保 member_types 表中有 'plus' 记录（如果还没有）
INSERT INTO member_types (
  id, name, max_fish_count, can_self_talk, can_group_chat, 
  can_promote_owner, promote_owner_frequency, lead_topic_frequency
) VALUES (
  'plus', 'Plus', 5, true, true, true, 2, 1
)
ON CONFLICT (id) DO NOTHING;

-- 更新或插入用户订阅
-- 先更新（如果记录存在）
UPDATE user_subscriptions 
SET plan = 'plus', is_active = true, updated_at = NOW()
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

-- 如果更新没有影响任何行，插入新记录
INSERT INTO user_subscriptions (user_id, plan, is_active)
SELECT 'f4933d0f-35a0-4aa1-8de5-ba407714b65c', 'plus', true
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions 
  WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c'
);

-- 验证
SELECT user_id, plan, is_active 
FROM user_subscriptions 
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

