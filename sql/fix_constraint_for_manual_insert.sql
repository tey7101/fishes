-- ============================================
-- 修复约束以支持手动添加订阅记录
-- ============================================
-- 问题：约束允许 'basic'，但 member_types 表使用 'plus'
-- 修复后：约束允许 'free', 'plus', 'premium'，与 member_types 表一致

-- 步骤1：删除旧的约束
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS subscription_plan_check;

-- 步骤2：创建新的约束，使用 'plus' 而不是 'basic'
ALTER TABLE user_subscriptions
ADD CONSTRAINT subscription_plan_check 
CHECK (plan IN ('free', 'plus', 'premium'));

-- 步骤3：验证约束已更新
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
  AND conname = 'subscription_plan_check';

-- 步骤4：确保 member_types 表中有所有需要的记录
INSERT INTO member_types (
  id, name, max_fish_count, can_self_talk, can_group_chat, 
  can_promote_owner, promote_owner_frequency, lead_topic_frequency
) VALUES 
  ('free', 'Free', 1, false, false, false, 0, 0),
  ('plus', 'Plus', 5, true, true, true, 2, 1),
  ('premium', 'Premium', 20, true, true, true, 5, 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  max_fish_count = EXCLUDED.max_fish_count,
  can_self_talk = EXCLUDED.can_self_talk,
  can_group_chat = EXCLUDED.can_group_chat,
  can_promote_owner = EXCLUDED.can_promote_owner,
  promote_owner_frequency = EXCLUDED.promote_owner_frequency,
  lead_topic_frequency = EXCLUDED.lead_topic_frequency,
  updated_at = NOW();

-- 完成！现在可以在 Hasura Console 中手动添加订阅记录了
-- plan 字段可以设置为：'free', 'plus', 或 'premium'

