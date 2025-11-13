-- ============================================
-- 完整重构 user_subscriptions 表主键
-- ============================================
-- 目标：将主键从 user_id 改为自增 id 字段
-- 原因：用户可能多次订阅，需要支持多条记录
-- 
-- 注意：执行此脚本后，需要：
-- 1. 刷新 Hasura 元数据
-- 2. 更新代码中使用 user_subscriptions_by_pk(user_id) 的地方

BEGIN;

-- 步骤1：检查当前表结构
SELECT 'Current table structure:' AS info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 步骤2：检查现有约束和索引
SELECT 'Current constraints:' AS info;
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
ORDER BY conname;

-- 步骤3：添加新的 id 字段（自增主键）
-- 如果字段已存在，跳过
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'id'
    ) THEN
        ALTER TABLE user_subscriptions
        ADD COLUMN id SERIAL;
        
        RAISE NOTICE 'Added id column';
    ELSE
        RAISE NOTICE 'id column already exists';
    END IF;
END $$;

-- 步骤4：为现有记录填充 id 值（如果 id 为 NULL）
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM user_subscriptions 
    WHERE id IS NULL;
    
    IF null_count > 0 THEN
        -- 设置序列的起始值
        PERFORM setval(
            'user_subscriptions_id_seq', 
            COALESCE((SELECT MAX(id) FROM user_subscriptions), 0) + 1, 
            false
        );
        
        -- 为 NULL 的记录填充 id
        UPDATE user_subscriptions 
        SET id = nextval('user_subscriptions_id_seq') 
        WHERE id IS NULL;
        
        RAISE NOTICE 'Filled % NULL id values', null_count;
    END IF;
END $$;

-- 步骤5：删除旧的约束
-- 删除主键约束
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_pkey;

-- 删除 user_id 的唯一约束（如果存在）
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_key;

-- 步骤6：设置 id 字段为 NOT NULL
ALTER TABLE user_subscriptions
ALTER COLUMN id SET NOT NULL;

-- 步骤7：创建新的主键约束
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);

-- 步骤8：在 user_id 上创建索引（提高查询性能，但不唯一）
DROP INDEX IF EXISTS idx_user_subscriptions_user_id;
CREATE INDEX idx_user_subscriptions_user_id 
ON user_subscriptions(user_id);

-- 步骤9：在 user_id + is_active 上创建复合索引（常用查询）
DROP INDEX IF EXISTS idx_user_subscriptions_user_active;
CREATE INDEX idx_user_subscriptions_user_active 
ON user_subscriptions(user_id, is_active) 
WHERE is_active = true;

-- 步骤10：添加注释说明
COMMENT ON COLUMN user_subscriptions.id IS 'Primary key, auto-incrementing ID. Allows multiple subscriptions per user.';
COMMENT ON COLUMN user_subscriptions.user_id IS 'User ID. Can have multiple subscriptions per user. Use this field to query user subscriptions.';

-- 步骤11：验证新结构
SELECT 'New table structure:' AS info;
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

-- 步骤12：显示新的约束
SELECT 'New constraints:' AS info;
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
ORDER BY conname;

-- 步骤13：显示索引
SELECT 'Indexes:' AS info;
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
ORDER BY indexname;

COMMIT;

-- ============================================
-- 迁移完成后的操作
-- ============================================
-- 1. 在 Hasura Console 中：
--    - 进入 Data → user_subscriptions
--    - 点击 "Track All" 或刷新元数据
--    - 检查 Relationships，确保关联关系正确
--
-- 2. 更新代码：
--    - 将 user_subscriptions_by_pk(user_id) 改为 user_subscriptions(where: {user_id: {_eq: $userId}})
--    - 查询时获取最新的活跃订阅：WHERE user_id = ? AND is_active = true ORDER BY created_at DESC LIMIT 1
--
-- 3. 现在可以：
--    - 为同一用户创建多条订阅记录
--    - 每条记录都有唯一的 id
--    - 通过 user_id 查询用户的所有订阅

