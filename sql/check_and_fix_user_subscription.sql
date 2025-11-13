-- ============================================
-- 检查并修复用户订阅记录
-- ============================================
-- 用户ID: f4933d0f-35a0-4aa1-8de5-ba407714b65c

-- 步骤1：检查用户是否已有订阅记录
SELECT 
  user_id,
  plan,
  is_active,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

-- 步骤2：如果用户已有记录，更新为 plus
UPDATE user_subscriptions 
SET 
  plan = 'plus',
  is_active = true,
  updated_at = NOW()
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

-- 步骤3：验证更新结果
SELECT 
  us.user_id,
  us.plan,
  us.is_active,
  mt.name as member_type_name,
  mt.max_fish_count,
  mt.can_self_talk,
  mt.can_group_chat
FROM user_subscriptions us
LEFT JOIN member_types mt ON us.plan = mt.id
WHERE us.user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

