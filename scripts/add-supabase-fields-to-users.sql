-- ============================================
-- 为users表添加必要的Supabase字段（MVP精简版）
-- ============================================
-- 参照AIGF_web的做法，只添加当前必需的字段
-- ============================================

-- 添加最后登录时间（用于追踪用户活跃度）
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP;

-- 添加注释
COMMENT ON COLUMN users.last_sign_in_at IS '最后登录时间（从Supabase Auth同步）';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_last_sign_in ON users(last_sign_in_at DESC);

-- 完成提示
DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Supabase字段添加完成（MVP精简版）！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '已添加的字段：';
  RAISE NOTICE '  - last_sign_in_at (最后登录时间)';
  RAISE NOTICE '';
  RAISE NOTICE '已添加的索引：';
  RAISE NOTICE '  - idx_users_last_sign_in';
  RAISE NOTICE '';
  RAISE NOTICE '📝 说明：';
  RAISE NOTICE '  参照AIGF_web的做法，MVP阶段只添加必需字段';
  RAISE NOTICE '  其他Supabase字段可在需要时再添加：';
  RAISE NOTICE '    - email_confirmed_at';
  RAISE NOTICE '    - phone, phone_confirmed_at';
  RAISE NOTICE '    - raw_user_meta_data, raw_app_meta_data';
  RAISE NOTICE '========================================';
END $$;

