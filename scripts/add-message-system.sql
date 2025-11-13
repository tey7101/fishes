-- 鱼留言系统数据库迁移
-- 创建日期: 2025-11-09
-- 功能: 轻社交留言功能

-- ============================================
-- 1. 创建 messages 表
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR(255) NOT NULL,           -- 发送者用户ID
    receiver_id VARCHAR(255),                  -- 接收者用户ID（给主人留言时使用）
    fish_id UUID,                              -- 目标鱼ID（给鱼留言时使用）
    message_type VARCHAR(20) NOT NULL,         -- 'to_fish' 或 'to_owner'
    visibility VARCHAR(20) DEFAULT 'public',   -- 'public' 或 'private'
    content TEXT NOT NULL,                     -- 留言内容
    created_at TIMESTAMP DEFAULT NOW(),        -- 创建时间
    
    -- 外键约束
    CONSTRAINT fk_fish FOREIGN KEY (fish_id) REFERENCES fish(id) ON DELETE CASCADE,
    CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(id),
    CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES users(id),
    
    -- 业务约束
    CONSTRAINT check_target CHECK (
        (message_type = 'to_fish' AND fish_id IS NOT NULL) OR
        (message_type = 'to_owner' AND receiver_id IS NOT NULL)
    ),
    CONSTRAINT check_content_length CHECK (LENGTH(content) <= 50 AND LENGTH(content) >= 1),
    CONSTRAINT check_message_type CHECK (message_type IN ('to_fish', 'to_owner')),
    CONSTRAINT check_visibility CHECK (visibility IN ('public', 'private'))
);

-- ============================================
-- 2. 创建索引（如果不存在）
-- ============================================

-- 发送者索引（查询用户发送的留言）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_sender') THEN
        CREATE INDEX idx_messages_sender ON messages(sender_id);
    END IF;
END $$;

-- 接收者索引（查询用户收到的留言）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_receiver') THEN
        CREATE INDEX idx_messages_receiver ON messages(receiver_id) WHERE receiver_id IS NOT NULL;
    END IF;
END $$;

-- 鱼ID索引（查询鱼收到的留言）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_fish') THEN
        CREATE INDEX idx_messages_fish ON messages(fish_id) WHERE fish_id IS NOT NULL;
    END IF;
END $$;

-- 时间索引（按时间排序）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_created') THEN
        CREATE INDEX idx_messages_created ON messages(created_at DESC);
    END IF;
END $$;

-- 复合索引（发送者+时间，用于频率限制）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_sender_time') THEN
        CREATE INDEX idx_messages_sender_time ON messages(sender_id, created_at DESC);
    END IF;
END $$;

-- ============================================
-- 3. 添加注释
-- ============================================

COMMENT ON TABLE messages IS '用户留言表，支持给鱼和鱼主人留言';
COMMENT ON COLUMN messages.sender_id IS '发送者用户ID（外键关联users表）';
COMMENT ON COLUMN messages.receiver_id IS '接收者用户ID（留言给主人时使用）';
COMMENT ON COLUMN messages.fish_id IS '目标鱼ID（留言给鱼时使用）';
COMMENT ON COLUMN messages.message_type IS '留言类型：to_fish=给鱼留言，to_owner=给主人留言';
COMMENT ON COLUMN messages.visibility IS '可见性：public=公开，private=私密';
COMMENT ON COLUMN messages.content IS '留言内容（1-50字符）';

-- ============================================
-- 4. 权限说明（简化方案：API层控制）
-- ============================================

/*
本方案采用 API 层权限控制，无需配置 Hasura 权限。

推荐配置：
- user 角色：不配置任何权限（Select/Insert/Delete 都设为无权限）
- 所有操作通过 API 进行，API 使用管理员权限访问数据库

详细说明请参考：scripts/SIMPLIFIED_PERMISSIONS.md
*/

-- ============================================
-- 迁移完成
-- ============================================

-- 验证表创建
SELECT 
    'messages' as table_name,
    COUNT(*) as row_count
FROM messages;

