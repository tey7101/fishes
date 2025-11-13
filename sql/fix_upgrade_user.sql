-- ============================================
-- 修复：升级用户到 Plus 会员
-- ============================================
-- 用户ID: f4933d0f-35a0-4aa1-8de5-ba407714b65c
-- 会员类型: plus

-- 步骤1：确保 member_types 表中有 'plus' 记录
INSERT INTO member_types (
  id, 
  name, 
  max_fish_count, 
  can_self_talk, 
  can_group_chat, 
  can_promote_owner, 
  promote_owner_frequency, 
  lead_topic_frequency
) VALUES (
  'plus',
  'Plus',
  5,
  true,
  true,
  true,
  2,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 步骤2：检查约束允许的值（如果需要）
-- 如果约束检查的是 member_types.id，那么上面的插入应该足够了

-- 步骤3：更新或插入用户订阅
-- 使用 UPDATE 而不是 INSERT，避免约束检查问题
UPDATE user_subscriptions 
SET plan = 'plus', is_active = true, updated_at = NOW()
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

-- 如果用户没有订阅记录，插入新记录
-- 注意：如果约束仍然失败，可能需要先检查约束定义
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
  mt.max_fish_count
FROM user_subscriptions us
LEFT JOIN member_types mt ON us.plan = mt.id
WHERE us.user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

