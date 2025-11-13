-- 添加 initiator_user_id 字段到 group_chat 表
-- Add initiator_user_id field to group_chat table to track who initiated each chat session

-- Add the column
ALTER TABLE group_chat 
ADD COLUMN IF NOT EXISTS initiator_user_id TEXT;

-- Add comment
COMMENT ON COLUMN group_chat.initiator_user_id IS '发起群聊的用户ID (User ID who initiated this group chat)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_group_chat_initiator_user_id 
ON group_chat(initiator_user_id);

-- Create index for daily usage queries
CREATE INDEX IF NOT EXISTS idx_group_chat_created_at_initiator 
ON group_chat(created_at, initiator_user_id);

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'group_chat' 
AND column_name = 'initiator_user_id';

