-- ============================================
-- 升级用户到 Plus 会员
-- ============================================
-- 用户ID: f4933d0f-35a0-4aa1-8de5-ba407714b65c
-- 会员类型: plus

-- 先尝试更新现有订阅
UPDATE user_subscriptions 
SET plan = 'plus', is_active = true, updated_at = NOW()
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

-- 如果没有记录被更新（用户没有订阅记录），则插入新记录
-- 使用 INSERT ... ON CONFLICT 确保幂等性
INSERT INTO user_subscriptions (user_id, plan, is_active)
VALUES ('f4933d0f-35a0-4aa1-8de5-ba407714b65c', 'plus', true)
ON CONFLICT (user_id) DO UPDATE SET 
  plan = 'plus',
  is_active = true,
  updated_at = NOW();

-- 验证更新结果
SELECT 
  us.user_id,
  us.plan,
  us.is_active,
  us.created_at,
  us.updated_at,
  mt.name as member_type_name,
  mt.max_fish_count,
  mt.can_self_talk,
  mt.can_group_chat,
  mt.can_promote_owner
FROM user_subscriptions us
LEFT JOIN member_types mt ON us.plan = mt.id
WHERE us.user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';
