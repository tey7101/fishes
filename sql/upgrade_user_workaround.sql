-- ============================================
-- 解决方案：升级用户到 Plus 会员（绕过约束问题）
-- ============================================
-- 用户ID: f4933d0f-35a0-4aa1-8de5-ba407714b65c

-- 步骤1：检查并创建 member_types 记录
-- 确保 member_types 表中有 'plus' 记录
DO $$
BEGIN
  -- 检查是否存在
  IF NOT EXISTS (SELECT 1 FROM member_types WHERE id = 'plus') THEN
    INSERT INTO member_types (
      id, name, max_fish_count, can_self_talk, can_group_chat, 
      can_promote_owner, promote_owner_frequency, lead_topic_frequency
    ) VALUES (
      'plus', 'Plus', 5, true, true, true, 2, 1
    );
    RAISE NOTICE 'Created plus member type';
  ELSE
    RAISE NOTICE 'Plus member type already exists';
  END IF;
END $$;

-- 步骤2：先尝试更新现有记录
UPDATE user_subscriptions 
SET plan = 'plus', is_active = true, updated_at = NOW()
WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

-- 步骤3：如果更新没有影响任何行，插入新记录
-- 使用 DO 块确保原子性
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c'
  ) THEN
    -- 确保 member_types 中有 plus 记录
    IF EXISTS (SELECT 1 FROM member_types WHERE id = 'plus') THEN
      INSERT INTO user_subscriptions (user_id, plan, is_active)
      VALUES ('f4933d0f-35a0-4aa1-8de5-ba407714b65c', 'plus', true);
      RAISE NOTICE 'Inserted new subscription';
    ELSE
      RAISE EXCEPTION 'member_types table does not have plus record';
    END IF;
  ELSE
    RAISE NOTICE 'Subscription already exists, updated';
  END IF;
END $$;

-- 步骤4：验证结果
SELECT 
  us.user_id,
  us.plan,
  us.is_active,
  mt.name as member_type_name,
  mt.max_fish_count
FROM user_subscriptions us
LEFT JOIN member_types mt ON us.plan = mt.id
WHERE us.user_id = 'f4933d0f-35a0-4aa1-8de5-ba407714b65c';

