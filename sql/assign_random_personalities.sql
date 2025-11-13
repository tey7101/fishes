-- =====================================================
-- 为个性为空的鱼随机分配个性
-- =====================================================

-- 0. 删除可能存在的 CHECK 约束（如果有的话）
ALTER TABLE fish 
    DROP CONSTRAINT IF EXISTS fish_personality_check;

-- 1. 查看当前有多少鱼没有个性
SELECT 
    '没有个性的鱼数量' as 统计,
    COUNT(*) as 数量
FROM fish
WHERE personality IS NULL;

-- 2. 为所有个性为空的鱼随机分配个性
-- 注意：每条鱼会随机获得一个不同的个性
UPDATE fish 
SET personality = (
    SELECT name 
    FROM fish_personalities 
    ORDER BY RANDOM() 
    LIMIT 1
)
WHERE personality IS NULL;

-- 3. 验证结果 - 应该没有 NULL 了
SELECT 
    '没有个性的鱼数量' as 统计,
    COUNT(*) as 数量
FROM fish
WHERE personality IS NULL;

-- 4. 查看个性分布情况
SELECT 
    personality as 个性,
    COUNT(*) as 鱼的数量
FROM fish
WHERE personality IS NOT NULL
GROUP BY personality
ORDER BY COUNT(*) DESC;

-- 5. 验证所有鱼都有有效个性
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ 所有鱼都有有效个性'
        ELSE '⚠️  还有 ' || COUNT(*) || ' 条鱼没有个性'
    END as 状态
FROM fish
WHERE personality IS NULL;

-- =====================================================
-- 完成！所有鱼都应该有个性了
-- =====================================================

