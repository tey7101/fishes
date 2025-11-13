-- 创建 fish_test 表用于测试
-- 与 fish 表结构完全相同，但不包含外键关系

CREATE TABLE IF NOT EXISTS fish_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  artist VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 战斗系统字段
  talent INT NOT NULL DEFAULT 50,           -- 天赋值 (25-75)
  level INT NOT NULL DEFAULT 1,             -- 等级
  experience INT NOT NULL DEFAULT 0,        -- 经验值
  health INT NOT NULL DEFAULT 10,           -- 当前血量
  max_health INT NOT NULL DEFAULT 10,       -- 最大血量
  battle_power DECIMAL(10,2) DEFAULT 0,     -- 计算后的战斗力
  last_exp_update TIMESTAMP DEFAULT NOW(),  -- 最后经验增长时间
  is_alive BOOLEAN DEFAULT TRUE,            -- 是否存活
  is_in_battle_mode BOOLEAN DEFAULT FALSE,  -- 是否在战斗模式
  position_row INT DEFAULT 0,               -- Y轴位置（用于防重复遭遇）
  total_wins INT DEFAULT 0,                 -- 总胜场
  total_losses INT DEFAULT 0,               -- 总败场
  
  -- 原功能字段（点赞、举报等）
  upvotes INT NOT NULL DEFAULT 0,           -- 点赞数
  downvotes INT NOT NULL DEFAULT 0,         -- 点踩数
  reported BOOLEAN DEFAULT FALSE,           -- 是否被举报
  report_count INT DEFAULT 0,               -- 举报次数
  is_approved BOOLEAN DEFAULT TRUE,         -- 是否通过审核
  moderator_notes TEXT                      -- 管理员备注
);

-- fish_test 表索引
CREATE INDEX IF NOT EXISTS idx_fish_test_user_id ON fish_test(user_id);
CREATE INDEX IF NOT EXISTS idx_fish_test_created_at ON fish_test(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fish_test_level ON fish_test(level DESC);
CREATE INDEX IF NOT EXISTS idx_fish_test_score ON fish_test((upvotes - downvotes) DESC);
CREATE INDEX IF NOT EXISTS idx_fish_test_is_approved ON fish_test(is_approved);

-- 添加注释
COMMENT ON TABLE fish_test IS '测试鱼数据表，用于存储从原作者后端下载的鱼数据';
COMMENT ON COLUMN fish_test.id IS '鱼的唯一标识符 (UUID)';
COMMENT ON COLUMN fish_test.user_id IS '创建该鱼的用户ID';
COMMENT ON COLUMN fish_test.image_url IS '鱼的图片URL（七牛云存储）';
COMMENT ON COLUMN fish_test.artist IS '作者名称';
COMMENT ON COLUMN fish_test.talent IS '天赋值，影响战斗力';
COMMENT ON COLUMN fish_test.battle_power IS '计算后的战斗力';

