-- =====================================================
-- 添加fishtanks表缺失的字段
-- =====================================================
-- 用于修复已存在的fishtanks表
-- 
-- 问题：原始的create-fishtank-tables.sql缺少了两个字段：
-- 1. is_default - 用于标记用户的默认私人鱼缸
-- 2. background_url - 鱼缸背景图片URL
--
-- 这导致API /api/fishtank/get-or-create-default 返回500错误
-- =====================================================

-- 1. 添加is_default字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fishtanks' 
        AND column_name = 'is_default'
    ) THEN
        ALTER TABLE fishtanks ADD COLUMN is_default BOOLEAN DEFAULT false;
        COMMENT ON COLUMN fishtanks.is_default IS '是否为用户的默认私人鱼缸';
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_fishtanks_is_default ON fishtanks(is_default);
        CREATE INDEX IF NOT EXISTS idx_fishtanks_user_default ON fishtanks(user_id, is_default);
        
        RAISE NOTICE '✅ 已添加 is_default 字段';
    ELSE
        RAISE NOTICE 'ℹ️  is_default 字段已存在，跳过';
    END IF;
END $$;

-- 2. 添加background_url字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fishtanks' 
        AND column_name = 'background_url'
    ) THEN
        ALTER TABLE fishtanks ADD COLUMN background_url TEXT;
        COMMENT ON COLUMN fishtanks.background_url IS '鱼缸背景图片URL';
        
        RAISE NOTICE '✅ 已添加 background_url 字段';
    ELSE
        RAISE NOTICE 'ℹ️  background_url 字段已存在，跳过';
    END IF;
END $$;

-- 3. 验证字段是否存在
DO $$
DECLARE
    has_is_default BOOLEAN;
    has_background_url BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fishtanks' AND column_name = 'is_default'
    ) INTO has_is_default;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fishtanks' AND column_name = 'background_url'
    ) INTO has_background_url;
    
    IF has_is_default AND has_background_url THEN
        RAISE NOTICE '✅ 所有字段验证成功！';
        RAISE NOTICE '   - is_default: ✓';
        RAISE NOTICE '   - background_url: ✓';
    ELSE
        IF NOT has_is_default THEN
            RAISE WARNING '❌ is_default 字段缺失';
        END IF;
        IF NOT has_background_url THEN
            RAISE WARNING '❌ background_url 字段缺失';
        END IF;
    END IF;
END $$;

-- 4. 显示当前表结构
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'fishtanks'
ORDER BY ordinal_position;

