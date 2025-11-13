-- =====================================================
-- 验证 fish_monologues 数据完整性
-- =====================================================

-- 1. 统计总数
SELECT 
    '总自语数量' as 类型,
    COUNT(*) as 数量
FROM fish_monologues

UNION ALL

-- 2. 统计有个性的自语
SELECT 
    '有个性的自语' as 类型,
    COUNT(*) as 数量
FROM fish_monologues
WHERE personality IS NOT NULL

UNION ALL

-- 3. 统计通用自语（NULL）
SELECT 
    '通用自语(NULL)' as 类型,
    COUNT(*) as 数量
FROM fish_monologues
WHERE personality IS NULL;

-- 4. 按个性分组统计
SELECT 
    COALESCE(personality, '(通用自语)') as 个性,
    COUNT(*) as 自语数量
FROM fish_monologues
GROUP BY personality
ORDER BY 
    CASE WHEN personality IS NULL THEN 1 ELSE 0 END,
    personality;

-- 5. 验证每个个性是否都有20条自语
SELECT 
    p.name as 个性名称,
    COUNT(m.id) as 自语数量,
    CASE 
        WHEN COUNT(m.id) = 20 THEN '✅ 正常'
        WHEN COUNT(m.id) < 20 THEN '⚠️  不足20条'
        ELSE '❌ 超过20条'
    END as 状态
FROM fish_personalities p
LEFT JOIN fish_monologues m ON p.name = m.personality
GROUP BY p.name
ORDER BY p.name;
















