-- ============================================
-- 简单版本：升级用户到 Plus 会员
-- ============================================
-- 在 Hasura Console 的 SQL 编辑器中执行此 SQL

-- 方法1：使用 INSERT ... ON CONFLICT（推荐，一条语句完成）
INSERT INTO user_subscriptions (user_id, plan, is_active)
VALUES ('f4933d0f-35a0-4aa1-8de5-ba407714b65c', 'plus', true)
ON CONFLICT (user_id) DO UPDATE SET 
  plan = EXCLUDED.plan,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 验证结果
SELECT 
  user_id,
  plan,
  is_active,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

