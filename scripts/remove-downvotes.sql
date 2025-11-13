-- ============================================
-- 移除Downvote功能的数据库迁移
-- 执行日期: 2025-11-04
-- ============================================

-- 说明：
-- 1. 删除所有downvote类型的投票记录
-- 2. 移除fish表的downvotes字段
-- 3. 添加约束确保只有'up'类型的投票

-- ============================================
-- 步骤 1: 删除所有downvote类型的投票记录
-- ============================================
DELETE FROM public.votes WHERE vote_type = 'down';

-- ============================================
-- 步骤 2: 删除依赖的视图（必须先删除视图）
-- ============================================
-- 删除fish_rank视图（依赖于score和downvotes）
DROP VIEW IF EXISTS public.fish_rank;

-- 删除fish_battle视图（依赖于score和downvotes）
DROP VIEW IF EXISTS public.fish_battle;

-- ============================================
-- 步骤 3: 删除依赖downvotes的计算列
-- ============================================
-- 删除score计算列（依赖于downvotes）
ALTER TABLE public.fish DROP COLUMN IF EXISTS score;

-- 删除approval_rate计算列（依赖于downvotes）
ALTER TABLE public.fish DROP COLUMN IF EXISTS approval_rate;

-- ============================================
-- 步骤 4: 移除fish表的downvotes字段
-- ============================================
ALTER TABLE public.fish DROP COLUMN IF EXISTS downvotes;

-- ============================================
-- 步骤 5: 重建fish_rank视图（不使用downvotes和score）
-- ============================================
CREATE OR REPLACE VIEW public.fish_rank AS
SELECT 
    id,
    user_id,
    artist,
    image_url,
    created_at,
    talent,
    upvotes,
    level,
    experience,
    health,
    max_health,
    is_approved,
    reported
FROM public.fish
WHERE is_approved = true
ORDER BY upvotes DESC;

-- ============================================
-- 步骤 6: 重建fish_battle视图（不使用downvotes和score）
-- ============================================
CREATE OR REPLACE VIEW public.fish_battle AS
SELECT 
    id,
    user_id,
    artist,
    image_url,
    created_at,
    talent,
    upvotes,
    level,
    experience,
    health,
    max_health,
    is_approved
FROM public.fish
WHERE is_approved = true AND reported = false
ORDER BY upvotes DESC;

-- ============================================
-- 步骤 7: 添加约束确保只有'up'类型的投票
-- ============================================
-- 先检查约束是否存在，如果存在则删除后重建
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'votes_type_check'
    ) THEN
        ALTER TABLE public.votes DROP CONSTRAINT votes_type_check;
    END IF;
END $$;

-- 添加新约束
ALTER TABLE public.votes ADD CONSTRAINT votes_type_check CHECK (vote_type = 'up');

-- ============================================
-- 验证迁移结果
-- ============================================
-- 查看fish表结构（应该没有downvotes字段）
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'fish' AND table_schema = 'public';

-- 查看votes表的约束
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.votes'::regclass;

-- 确认没有down类型的投票
-- SELECT COUNT(*) FROM public.votes WHERE vote_type = 'down';


