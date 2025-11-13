-- ============================================
-- 修复 subscription_plan_check 约束
-- ============================================
-- 问题：约束允许 'basic'，但 member_types 表中使用的是 'plus'
-- 解决方案：将约束中的 'basic' 改为 'plus'

-- 步骤1：删除旧的约束
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS subscription_plan_check;

-- 步骤2：创建新的约束，使用 'plus' 而不是 'basic'
ALTER TABLE user_subscriptions
ADD CONSTRAINT subscription_plan_check 
CHECK (plan IN ('free', 'plus', 'premium'));

-- 步骤3：验证约束
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
  AND conname = 'subscription_plan_check';

-- 步骤4：现在可以正常插入/更新用户订阅了
-- 先确保 member_types 中有所有需要的记录
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

-- 步骤5：更新用户订阅
UPDATE user_subscriptions 
SET plan = 'plus', is_active = true, updated_at = NOW()
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

-- 如果用户没有订阅记录，插入新记录
INSERT INTO user_subscriptions (user_id, plan, is_active)
SELECT 'f4933d0f-35a0-4aa1-8de5-ba407714b65c', 'plus', true
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions 
  WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c'
);

-- 步骤6：验证结果
SELECT 
  us.user_id,
  us.plan,
  us.is_active,
  mt.name as member_type_name,
  mt.max_fish_count
FROM user_subscriptions us
LEFT JOIN member_types mt ON us.plan = mt.id
WHERE us.user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

