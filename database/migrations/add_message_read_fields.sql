-- ============================================
-- 添加消息已读字段
-- ============================================
-- 执行时间: 即时完成
-- 功能: 在messages表中添加is_read和read_at字段，用于跟踪消息的已读状态

-- 添加 is_read 字段（布尔值，默认false）
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN messages.is_read IS '消息是否已读，默认false';

-- 添加 read_at 字段（时间戳，可为空）
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

COMMENT ON COLUMN messages.read_at IS '消息被标记为已读的时间戳';

-- 为已读字段创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
ON messages(receiver_id, is_read) 
WHERE is_read = FALSE;

COMMIT;

