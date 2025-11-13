-- =====================================================
-- 修复 fish 表的 personality CHECK 约束问题
-- =====================================================

-- 1. 查看当前的 CHECK 约束定义
SELECT 
    conname AS 约束名称,
    pg_get_constraintdef(oid) AS 约束定义
FROM pg_constraint
WHERE conrelid = 'fish'::regclass
AND contype = 'c'  -- CHECK 约束
AND conname = 'fish_personality_check';

-- 2. 删除旧的 CHECK 约束
ALTER TABLE fish 
    DROP CONSTRAINT IF EXISTS fish_personality_check;

-- 3. 确认约束已删除
SELECT 
    '✅ fish_personality_check 约束已删除' AS 状态
WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'fish'::regclass
    AND conname = 'fish_personality_check'
);

-- 4. 为所有个性为空的鱼随机分配个性
UPDATE fish 
SET personality = (
    SELECT name 
    FROM fish_personalities 
    ORDER BY RANDOM() 
    LIMIT 1
)
WHERE personality IS NULL;

-- 5. 验证结果
SELECT 
    '没有个性的鱼数量' as 统计,
    COUNT(*) as 数量
FROM fish
WHERE personality IS NULL;

-- 6. 查看个性分布
SELECT 
    personality as 个性,
    COUNT(*) as 鱼的数量
FROM fish
WHERE personality IS NOT NULL
GROUP BY personality
ORDER BY COUNT(*) DESC;

-- =====================================================
-- 完成！
-- 说明：
-- - 删除了限制性的 CHECK 约束
-- - 所有鱼现在都有个性
-- - 外键约束仍然生效，确保个性值有效
-- =====================================================















