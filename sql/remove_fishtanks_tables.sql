-- =====================================================
-- 删除fishtanks相关表
-- =====================================================
-- 此脚本删除多鱼缸系统相关的表
-- 新架构只使用fish表和fish_favorites表
--
-- ⚠️ 警告：此操作不可逆！请先备份数据！
-- =====================================================

-- 1. 备份提示
DO $$
BEGIN
    RAISE NOTICE '⚠️  开始删除fishtanks相关表';
    RAISE NOTICE '    请确保已备份以下表的数据：';
    RAISE NOTICE '    - fishtanks';
    RAISE NOTICE '    - fishtank_fish';
    RAISE NOTICE '    - fishtank_views';
    RAISE NOTICE '';
END $$;

-- 2. 删除视图记录表（如果存在）
DROP TABLE IF EXISTS fishtank_views CASCADE;
RAISE NOTICE '✅ 已删除 fishtank_views 表';

-- 3. 删除鱼缸-鱼关联表（如果存在）
DROP TABLE IF EXISTS fishtank_fish CASCADE;
RAISE NOTICE '✅ 已删除 fishtank_fish 表';

-- 4. 删除鱼缸表（如果存在）
DROP TABLE IF EXISTS fishtanks CASCADE;
RAISE NOTICE '✅ 已删除 fishtanks 表';

-- 5. 删除相关函数
DROP FUNCTION IF EXISTS update_fishtank_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_fishtank_fish_count() CASCADE;
DROP FUNCTION IF EXISTS generate_share_id() CASCADE;
DROP FUNCTION IF EXISTS set_fishtank_share_id() CASCADE;
RAISE NOTICE '✅ 已删除相关触发器函数';

-- 6. 验证删除结果
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN ('fishtanks', 'fishtank_fish', 'fishtank_views')
    AND table_schema = 'public';
    
    IF table_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ 验证成功：所有fishtanks相关表已删除';
        RAISE NOTICE '';
        RAISE NOTICE '📋 保留的表：';
        RAISE NOTICE '   - fish (主表)';
        RAISE NOTICE '   - fish_favorites (收藏)';
    ELSE
        RAISE WARNING '⚠️  仍有 % 个相关表存在', table_count;
    END IF;
END $$;

-- 7. 显示当前数据库表列表
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN tablename LIKE 'fish%' THEN '🐟 Fish相关'
        ELSE '📦 其他'
    END as category
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename LIKE '%fish%'
ORDER BY tablename;

