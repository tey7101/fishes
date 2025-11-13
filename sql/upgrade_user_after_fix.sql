-- ============================================
-- 升级用户到 Plus 会员（约束修复后）
-- ============================================
-- 用户ID: f4933d0f-35a0-4aa1-8de5-ba407714b65c
-- 注意：请先执行 fix_subscription_plan_constraint.sql 修复约束

-- 更新或插入用户订阅
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

-- 验证结果
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

