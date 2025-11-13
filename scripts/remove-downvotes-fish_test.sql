-- ============================================
-- 移除fish_test表的Downvote相关字段
-- 执行日期: 2025-11-04
-- ============================================

-- 说明：
-- 1. 删除fish_test表的score计算列
-- 2. 删除fish_test表的approval_rate计算列
-- 3. 删除fish_test表的downvotes字段

-- ============================================
-- 步骤 1: 删除依赖downvotes的计算列
-- ============================================
-- 删除score计算列（依赖于downvotes）
ALTER TABLE public.fish_test DROP COLUMN IF EXISTS score;

-- 删除approval_rate计算列（依赖于downvotes）
ALTER TABLE public.fish_test DROP COLUMN IF EXISTS approval_rate;

-- ============================================
-- 步骤 2: 移除fish_test表的downvotes字段
-- ============================================
ALTER TABLE public.fish_test DROP COLUMN IF EXISTS downvotes;

-- ============================================
-- 验证迁移结果
-- ============================================
-- 查看fish_test表结构（应该没有downvotes、score、approval_rate字段）
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'fish_test' AND table_schema = 'public'
-- ORDER BY ordinal_position;







































