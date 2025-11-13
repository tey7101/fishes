-- ============================================
-- 检查 user_subscriptions 表的约束
-- ============================================

-- 查看所有约束
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
ORDER BY conname;

-- 查看 plan 字段的约束
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
  AND conname LIKE '%plan%';

-- 查看 member_types 表中的所有 id 值
SELECT id, name FROM member_types ORDER BY id;

