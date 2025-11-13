-- ============================================
-- 创建会员类型表 (member_types)
-- ============================================
-- 功能: 定义 free、plus、premium 三种会员类型及其权益配置
-- 与 users 表通过 user_subscriptions.plan 字段关联

-- 创建 member_types 表
CREATE TABLE IF NOT EXISTS member_types (
  -- 主键：会员类型标识（'free', 'plus', 'premium'）
  id VARCHAR(20) PRIMARY KEY,
  
  -- 会员类型名称（显示用）
  name VARCHAR(50) NOT NULL UNIQUE,
  
  -- 可创建的鱼数量
  max_fish_count INT NOT NULL DEFAULT 1 CHECK (max_fish_count >= 0),
  
  -- 自己的鱼是否可自语
  can_self_talk BOOLEAN NOT NULL DEFAULT false,
  
  -- 自己的鱼是否可参与群聊
  can_group_chat BOOLEAN NOT NULL DEFAULT false,
  
  -- 自己的鱼是否可宣传主人
  can_promote_owner BOOLEAN NOT NULL DEFAULT false,
  
  -- 自己的鱼宣传主人的频率（每小时次数，0表示不宣传）
  promote_owner_frequency INT NOT NULL DEFAULT 0 CHECK (promote_owner_frequency >= 0),
  
  -- 自己的鱼主导话题的频率（每小时次数，0表示不主导）
  lead_topic_frequency INT NOT NULL DEFAULT 0 CHECK (lead_topic_frequency >= 0),
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE member_types IS '会员类型表，定义不同会员类型的权益配置';

-- 添加字段注释
COMMENT ON COLUMN member_types.id IS '会员类型标识：free, plus, premium';
COMMENT ON COLUMN member_types.name IS '会员类型名称（显示用）';
COMMENT ON COLUMN member_types.max_fish_count IS '该会员类型可创建的最大鱼数量';
COMMENT ON COLUMN member_types.can_self_talk IS '该会员类型的鱼是否可以自语';
COMMENT ON COLUMN member_types.can_group_chat IS '该会员类型的鱼是否可以参与群聊';
COMMENT ON COLUMN member_types.can_promote_owner IS '该会员类型的鱼是否可以宣传主人';
COMMENT ON COLUMN member_types.promote_owner_frequency IS '该会员类型的鱼宣传主人的频率（每小时次数）';
COMMENT ON COLUMN member_types.lead_topic_frequency IS '该会员类型的鱼主导话题的频率（每小时次数）';

-- 插入初始数据：三种会员类型
INSERT INTO member_types (
  id, 
  name, 
  max_fish_count, 
  can_self_talk, 
  can_group_chat, 
  can_promote_owner, 
  promote_owner_frequency, 
  lead_topic_frequency
) VALUES
  -- Free 会员（免费会员）
  (
    'free',
    'Free',
    1,                    -- 最多创建1条鱼
    false,                -- 不可自语
    false,                -- 不可参与群聊
    false,                -- 不可宣传主人
    0,                    -- 不宣传主人
    0                     -- 不主导话题
  ),
  -- Plus 会员
  (
    'plus',
    'Plus',
    5,                    -- 最多创建5条鱼
    true,                 -- 可以自语
    true,                 -- 可以参与群聊
    true,                 -- 可以宣传主人
    2,                    -- 每小时宣传主人2次
    1                     -- 每小时主导话题1次
  ),
  -- Premium 会员
  (
    'premium',
    'Premium',
    20,                   -- 最多创建20条鱼
    true,                  -- 可以自语
    true,                  -- 可以参与群聊
    true,                  -- 可以宣传主人
    5,                     -- 每小时宣传主人5次
    3                      -- 每小时主导话题3次
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

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_member_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER member_types_updated_at_trigger
  BEFORE UPDATE ON member_types
  FOR EACH ROW
  EXECUTE FUNCTION update_member_types_updated_at();

-- 说明：与 users 表的关联方式
-- member_types.id 通过 user_subscriptions.plan 字段与 users 表关联
-- 查询示例：
-- SELECT mt.* 
-- FROM users u
-- JOIN user_subscriptions us ON u.id = us.user_id
-- JOIN member_types mt ON us.plan = mt.id
-- WHERE u.id = 'user_id_here';

COMMIT;

