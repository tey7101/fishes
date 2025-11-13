-- ============================================
-- 重构 user_subscriptions 表主键
-- ============================================
-- 目标：将主键从 user_id 改为自增 id 字段
-- 原因：用户可能多次订阅，需要支持多条记录

-- 步骤1：检查当前表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 步骤2：检查现有约束
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
ORDER BY conname;

-- 步骤3：添加新的 id 字段（自增主键）
-- 使用 SERIAL 类型（自动创建序列）
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS id SERIAL;

-- 步骤4：为现有记录填充 id 值（如果表中有数据）
-- 注意：SERIAL 类型会自动处理，但为了安全，我们显式设置
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM user_subscriptions;
    IF max_id = 0 THEN
        -- 如果所有记录的 id 都是 NULL，设置初始值
        PERFORM setval('user_subscriptions_id_seq', 1, false);
        UPDATE user_subscriptions SET id = nextval('user_subscriptions_id_seq') WHERE id IS NULL;
    END IF;
END $$;

-- 步骤5：删除旧的唯一约束（如果存在）
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_pkey;

ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_key;

-- 步骤6：设置 id 字段为 NOT NULL
ALTER TABLE user_subscriptions
ALTER COLUMN id SET NOT NULL;

-- 步骤7：创建新的主键约束
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);

-- 步骤8：在 user_id 上创建索引（提高查询性能，但不唯一）
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
ON user_subscriptions(user_id);

-- 步骤9：添加注释说明
COMMENT ON COLUMN user_subscriptions.id IS 'Primary key, auto-incrementing ID';
COMMENT ON COLUMN user_subscriptions.user_id IS 'User ID (can have multiple subscriptions per user)';

-- 步骤10：验证新结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'id' THEN 'PRIMARY KEY'
        ELSE ''
    END AS key_type
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 步骤11：显示新的约束
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
ORDER BY conname;

-- 完成！
-- 现在 user_subscriptions 表支持：
-- 1. 每个用户可以有多个订阅记录
-- 2. id 字段是自增主键
-- 3. user_id 可以有重复值

