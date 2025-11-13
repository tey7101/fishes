-- ============================================
-- Fish Art MVP 数据库优化脚本
-- 优化1: 创建users表
-- 优化2: 优化fish表（保守方案）
-- ============================================
-- 执行前请备份数据库！
-- ============================================

-- ============================================
-- 第1步：创建users表
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  -- Supabase Auth 基础字段
  id VARCHAR(255) PRIMARY KEY,              -- Supabase Auth ID (UUID)
  email VARCHAR(255) UNIQUE NOT NULL,       -- 用户邮箱
  email_confirmed_at TIMESTAMP,             -- 邮箱确认时间
  phone VARCHAR(50),                        -- 手机号
  phone_confirmed_at TIMESTAMP,             -- 手机确认时间
  
  -- 用户个人信息
  display_name VARCHAR(100),                -- 显示名称
  avatar_url TEXT,                          -- 头像URL
  raw_user_meta_data JSONB,                 -- Supabase用户元数据
  raw_app_meta_data JSONB,                  -- Supabase应用元数据
  
  -- 用户状态
  user_level INT DEFAULT 1,                 -- 用户等级
  reputation_score INT DEFAULT 0,           -- 声望值
  is_banned BOOLEAN DEFAULT FALSE,          -- 是否被封禁
  banned_until TIMESTAMP,                   -- 封禁截止时间
  ban_reason TEXT,                          -- 封禁原因
  
  -- 统计数据（冗余，但提升查询性能）
  total_fish_created INT DEFAULT 0,         -- 创建的鱼总数
  total_votes_received INT DEFAULT 0,       -- 收到的投票总数
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),       -- 用户创建时间
  last_sign_in_at TIMESTAMP,                -- 最后登录时间
  last_active TIMESTAMP DEFAULT NOW(),      -- 最后活跃时间
  updated_at TIMESTAMP DEFAULT NOW()        -- 更新时间
);

-- users表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_sign_in ON users(last_sign_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation_score DESC);

-- 自动更新updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第2步：从Supabase Auth同步用户数据
-- ============================================

-- 方案A: 手动从现有数据中提取唯一用户
-- 注意：email字段需要从Supabase Auth获取，这里先用user_id作为占位
INSERT INTO users (id, email, display_name)
SELECT DISTINCT 
  f.user_id,
  f.user_id || '@temp.local' as email,  -- 临时邮箱，后续需要更新
  f.artist as display_name               -- 使用artist作为默认显示名
FROM fish f
WHERE f.user_id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING;

-- 方案B: 如果有user_economy表的用户
INSERT INTO users (id, email)
SELECT DISTINCT 
  ue.user_id,
  ue.user_id || '@temp.local' as email
FROM user_economy ue
WHERE ue.user_id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 第3步：为fish表添加外键约束
-- ============================================

-- 注意：这会检查所有现有数据的完整性
-- 如果有孤立的user_id，会失败
ALTER TABLE fish
  ADD CONSTRAINT fk_fish_user 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;  -- 删除用户时级联删除其鱼

-- ============================================
-- 第4步：为其他表添加外键约束
-- ============================================

-- votes表
ALTER TABLE votes
  ADD CONSTRAINT fk_votes_user 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- user_economy表
ALTER TABLE user_economy
  ADD CONSTRAINT fk_economy_user 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- economy_log表
ALTER TABLE economy_log
  ADD CONSTRAINT fk_economy_log_user 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- battle_log表 (moderator_id)
-- 注意：reports表的moderator_id可能为NULL
ALTER TABLE reports
  ADD CONSTRAINT fk_reports_moderator 
  FOREIGN KEY (moderator_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- ============================================
-- 第5步：优化fish表（保守方案 - 只添加计算列）
-- ============================================

-- 先删除依赖fish表的视图，避免类型冲突
DROP VIEW IF EXISTS fish_with_scores CASCADE;
DROP VIEW IF EXISTS battle_fish CASCADE;

-- 添加计算列（虚拟列，不占用存储空间，实时计算）
-- PostgreSQL 12+ 支持GENERATED ALWAYS AS

-- 评分（score）
ALTER TABLE fish 
  ADD COLUMN IF NOT EXISTS score INT 
  GENERATED ALWAYS AS (upvotes - downvotes) STORED;

-- 通过率（approval_rate）
-- 使用 float8 (double precision) 类型，与原视图保持一致
ALTER TABLE fish 
  ADD COLUMN IF NOT EXISTS approval_rate float8
  GENERATED ALWAYS AS (
    CASE 
      WHEN (upvotes + downvotes) > 0 
      THEN upvotes::float / (upvotes + downvotes)
      ELSE 0.5 
    END
  ) STORED;

-- 添加索引以优化排序查询
CREATE INDEX IF NOT EXISTS idx_fish_score ON fish(score DESC) 
  WHERE is_approved = true AND reported = false;

CREATE INDEX IF NOT EXISTS idx_fish_approval_rate ON fish(approval_rate DESC)
  WHERE is_approved = true AND reported = false;

-- ============================================
-- 第6步：重新创建视图以使用新的users表和计算列
-- ============================================

-- 删除可能存在的旧视图（避免列结构冲突）
DROP VIEW IF EXISTS user_fish_summary CASCADE;

-- 增强fish_with_scores视图，关联用户信息
-- 注意：fish表现在已经有score和approval_rate列了
CREATE VIEW fish_with_scores AS
SELECT 
  f.*,
  u.display_name as user_display_name,
  u.avatar_url as user_avatar_url,
  u.reputation_score as user_reputation
FROM fish f
LEFT JOIN users u ON f.user_id = u.id
WHERE f.is_approved = true AND f.reported = false;

-- 重新创建battle_fish视图
CREATE VIEW battle_fish AS
SELECT 
  f.*
FROM fish f
WHERE f.is_in_battle_mode = true 
  AND f.is_alive = true 
  AND f.is_approved = true;

-- 增强user_fish_summary视图
CREATE VIEW user_fish_summary AS
SELECT 
  u.id as user_id,
  u.display_name,
  u.avatar_url,
  u.reputation_score,
  COUNT(f.id) as total_fish,
  SUM(CASE WHEN f.is_alive THEN 1 ELSE 0 END) as alive_fish,
  SUM(f.total_wins) as total_wins,
  SUM(f.total_losses) as total_losses,
  AVG(f.level) as avg_level,
  MAX(f.level) as max_level,
  SUM(f.upvotes) as total_upvotes
FROM users u
LEFT JOIN fish f ON u.id = f.user_id
GROUP BY u.id, u.display_name, u.avatar_url, u.reputation_score;

-- ============================================
-- 第7步：创建用户统计更新函数（可选，提升性能）
-- ============================================

-- 自动更新users表的统计数据
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 新增鱼时，更新用户的鱼数量
    UPDATE users 
    SET total_fish_created = total_fish_created + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- 删除鱼时，减少计数
    UPDATE users 
    SET total_fish_created = GREATEST(0, total_fish_created - 1)
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_fish_count ON fish;
CREATE TRIGGER update_user_fish_count
  AFTER INSERT OR DELETE ON fish
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

-- 更新投票统计
CREATE OR REPLACE FUNCTION update_user_vote_stats()
RETURNS TRIGGER AS $$
DECLARE
  fish_owner_id VARCHAR(255);
BEGIN
  -- 获取鱼的所有者
  SELECT user_id INTO fish_owner_id FROM fish WHERE id = NEW.fish_id;
  
  IF fish_owner_id IS NOT NULL THEN
    -- 更新鱼所有者收到的投票总数
    UPDATE users 
    SET total_votes_received = (
      SELECT COUNT(*) FROM votes v
      JOIN fish f ON v.fish_id = f.id
      WHERE f.user_id = fish_owner_id
    )
    WHERE id = fish_owner_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_vote_count ON votes;
CREATE TRIGGER update_user_vote_count
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_vote_stats();

-- ============================================
-- 第8步：数据完整性检查
-- ============================================

-- 检查是否有孤立的user_id（不在users表中的）
DO $$ 
DECLARE
  orphan_count INT;
BEGIN
  -- 检查fish表
  SELECT COUNT(DISTINCT user_id) INTO orphan_count
  FROM fish 
  WHERE user_id NOT IN (SELECT id FROM users);
  
  IF orphan_count > 0 THEN
    RAISE NOTICE '警告: fish表中有 % 个孤立的user_id', orphan_count;
  ELSE
    RAISE NOTICE '✅ fish表数据完整性检查通过';
  END IF;
  
  -- 检查votes表
  SELECT COUNT(DISTINCT user_id) INTO orphan_count
  FROM votes 
  WHERE user_id NOT IN (SELECT id FROM users);
  
  IF orphan_count > 0 THEN
    RAISE NOTICE '警告: votes表中有 % 个孤立的user_id', orphan_count;
  ELSE
    RAISE NOTICE '✅ votes表数据完整性检查通过';
  END IF;
  
  -- 检查user_economy表
  SELECT COUNT(user_id) INTO orphan_count
  FROM user_economy 
  WHERE user_id NOT IN (SELECT id FROM users);
  
  IF orphan_count > 0 THEN
    RAISE NOTICE '警告: user_economy表中有 % 个孤立的user_id', orphan_count;
  ELSE
    RAISE NOTICE '✅ user_economy表数据完整性检查通过';
  END IF;
END $$;

-- ============================================
-- 第9步：更新统计信息（PostgreSQL优化器）
-- ============================================

ANALYZE users;
ANALYZE fish;
ANALYZE votes;
ANALYZE user_economy;

-- ============================================
-- 迁移完成提示
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ MVP数据库优化完成！';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '已完成的优化：';
  RAISE NOTICE '  1. ✅ 创建users表';
  RAISE NOTICE '  2. ✅ 添加外键约束';
  RAISE NOTICE '  3. ✅ 为fish表添加计算列(score, approval_rate)';
  RAISE NOTICE '  4. ✅ 优化视图（关联用户信息）';
  RAISE NOTICE '  5. ✅ 自动统计触发器';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 后续步骤：';
  RAISE NOTICE '  1. 在Hasura中Track新的users表';
  RAISE NOTICE '  2. 配置users表的权限规则';
  RAISE NOTICE '  3. 更新API代码中的用户查询';
  RAISE NOTICE '  4. 测试所有现有功能';
  RAISE NOTICE '==========================================';
END $$;

