-- ============================================
-- AI Fish Group Chat 数据库更新脚本
-- Database Update Script for AI Fish Group Chat
-- ============================================

-- 1. 添加 initiator_user_id 字段到 group_chat 表
--    Add initiator_user_id field to track who initiated each chat
-- ============================================

ALTER TABLE group_chat 
ADD COLUMN IF NOT EXISTS initiator_user_id TEXT;

COMMENT ON COLUMN group_chat.initiator_user_id IS '发起群聊的用户ID (User ID who initiated this group chat)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_group_chat_initiator_user_id 
ON group_chat(initiator_user_id);

-- Create composite index for daily usage queries
CREATE INDEX IF NOT EXISTS idx_group_chat_created_at_initiator 
ON group_chat(created_at, initiator_user_id);

-- 2. 添加全局参数：免费用户每日限制
--    Add global parameter for free users' daily limit
-- ============================================

INSERT INTO global_params (key, value, description, updated_at)
VALUES (
    'free_daily_group_chat_limit',
    '5',
    '免费用户每天可使用 AI Fish Group Chat 的最大次数',
    NOW()
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- 验证更新 (Verification)
-- ============================================

-- 验证 initiator_user_id 字段
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'group_chat' 
AND column_name = 'initiator_user_id';

-- 验证全局参数
SELECT * FROM global_params WHERE key = 'free_daily_group_chat_limit';

-- 验证索引
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'group_chat'
AND indexname IN ('idx_group_chat_initiator_user_id', 'idx_group_chat_created_at_initiator');

-- ============================================
-- 完成提示
-- ============================================
SELECT 
    '✅ 数据库更新完成！' as status,
    'Database update completed!' as message;

