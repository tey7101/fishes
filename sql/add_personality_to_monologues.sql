-- =====================================================
-- 为 fish_monologues 表添加 personality 字段
-- =====================================================

-- 1. 添加 personality 字段（可为空，允许通用自语）
ALTER TABLE fish_monologues 
    ADD COLUMN IF NOT EXISTS personality TEXT;

-- 2. 添加注释
COMMENT ON COLUMN fish_monologues.personality IS '个性类型（关联 fish_personalities.name）- NULL表示通用自语';

-- 3. 清理无效数据（如果有的话）
UPDATE fish_monologues 
SET personality = NULL 
WHERE personality IS NOT NULL 
AND personality NOT IN (SELECT name FROM fish_personalities);

-- 4. 删除旧的外键约束（如果存在）
ALTER TABLE fish_monologues 
    DROP CONSTRAINT IF EXISTS fish_monologues_personality_fkey;

-- 5. 添加外键约束
ALTER TABLE fish_monologues 
    ADD CONSTRAINT fish_monologues_personality_fkey 
    FOREIGN KEY (personality) 
    REFERENCES fish_personalities(name) 
    ON UPDATE CASCADE 
    ON DELETE RESTRICT;

-- 6. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_fish_monologues_personality 
    ON fish_monologues(personality);

-- 7. 验证结果
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'fish_monologues' 
AND column_name = 'personality';

-- =====================================================
-- 完成！现在可以：
-- 1. 在 Hasura Console 中刷新 metadata
-- 2. 运行自语插入脚本
-- =====================================================

















