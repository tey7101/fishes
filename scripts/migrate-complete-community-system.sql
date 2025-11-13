-- Fish Art Complete Community Chat System Migration
-- Date: 2025-11-06
-- Purpose: Complete migration from battle system to community chat system
-- 
-- ⚠️ IMPORTANT: Execute these steps IN ORDER:
-- 
-- STEP 1: In Hasura Console (MUST DO FIRST!)
--   1. Go to Hasura Console → Data → battle_log table
--   2. Click "Modify" tab → Scroll down → Click "Untrack Table"
--   3. Go to battle_config table → Click "Untrack Table"
--   4. Go to user_fish_summary view → Click "Untrack View"
--   5. Go to fish table → "Relationships" tab:
--      - Delete relationship: battle_logs
--      - Delete relationship: battleLogsByDefenderId
-- 
-- STEP 2: Run this SQL script in Hasura Console → Data → SQL
-- 
-- STEP 3: After script completes successfully:
--   1. Track new tables: community_chat_sessions, user_subscriptions
--   2. Track new view: recent_chat_sessions
--   3. Set up permissions for new tables
-- 
-- This script performs:
-- 1. Adding fish_name and personality_type fields
-- 2. Removing battle system (fields, tables, views)
-- 3. Creating subscription tables
-- 4. Adding community chat sessions tables

-- ==================================================================
-- PART 1: Add fish_name and personality_type to fish table
-- ==================================================================

-- Add fish_name column (optional, max 50 characters)
ALTER TABLE fish 
ADD COLUMN IF NOT EXISTS fish_name VARCHAR(50);

-- Add personality_type column (cheerful, shy, brave, lazy)
ALTER TABLE fish 
ADD COLUMN IF NOT EXISTS personality_type VARCHAR(20);

-- Add index for fish_name for searching
CREATE INDEX IF NOT EXISTS idx_fish_name ON fish(fish_name);

-- Add index for personality_type for filtering
CREATE INDEX IF NOT EXISTS idx_fish_personality ON fish(personality_type);

-- Add check constraint for personality_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fish_personality_check'
    ) THEN
        ALTER TABLE fish 
        ADD CONSTRAINT fish_personality_check 
        CHECK (personality_type IS NULL OR personality_type IN ('cheerful', 'shy', 'brave', 'lazy'));
    END IF;
END$$;

-- Part 1 Complete: Added fish_name and personality_type fields

-- ==================================================================
-- PART 2: Drop battle-related views and tables first
-- ==================================================================

-- Drop all views that depend on battle fields
-- (Must be done before dropping columns they reference)
DROP VIEW IF EXISTS fish_rank CASCADE;
DROP VIEW IF EXISTS fish_battle CASCADE;
DROP VIEW IF EXISTS battle_stats CASCADE;
DROP VIEW IF EXISTS fish_leaderboard CASCADE;
DROP VIEW IF EXISTS user_fish_summary CASCADE;
DROP VIEW IF EXISTS fish_stats CASCADE;
DROP VIEW IF EXISTS fish_with_level CASCADE;
DROP VIEW IF EXISTS fish_with_talent CASCADE;
DROP VIEW IF EXISTS fish_with_health CASCADE;
DROP VIEW IF EXISTS fish_with_battle_power CASCADE;

-- Part 2a Complete: Dropped battle-related views

-- ==================================================================
-- PART 3: Remove battle-related fields from fish table
-- ==================================================================

-- Drop battle-related columns
ALTER TABLE fish 
DROP COLUMN IF EXISTS talent,
DROP COLUMN IF EXISTS level,
DROP COLUMN IF EXISTS experience,
DROP COLUMN IF EXISTS health,
DROP COLUMN IF EXISTS max_health,
DROP COLUMN IF EXISTS battle_power,
DROP COLUMN IF EXISTS last_exp_update,
DROP COLUMN IF EXISTS is_in_battle_mode,
DROP COLUMN IF EXISTS position_row,
DROP COLUMN IF EXISTS total_wins,
DROP COLUMN IF EXISTS total_losses;

-- Drop battle-related indexes (if they exist)
DROP INDEX IF EXISTS idx_fish_battle;
DROP INDEX IF EXISTS idx_fish_battle_power;
DROP INDEX IF EXISTS idx_fish_level;

-- Part 3 Complete: Removed battle fields from fish table

-- ==================================================================
-- PART 4: Drop battle-related tables
-- ==================================================================

DROP TABLE IF EXISTS battle_log CASCADE;
DROP TABLE IF EXISTS battle_config CASCADE;

-- Part 4 Complete: Dropped battle tables

-- ==================================================================
-- PART 5: Create user_subscriptions table
-- ==================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id VARCHAR(255) PRIMARY KEY,
    plan VARCHAR(20) NOT NULL DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraint for plan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subscription_plan_check'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT subscription_plan_check 
        CHECK (plan IN ('free', 'basic', 'premium'));
    END IF;
END$$;

-- Add foreign key to users table (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_subscription_user'
        ) THEN
            ALTER TABLE user_subscriptions 
            ADD CONSTRAINT fk_subscription_user 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_customer 
ON user_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscription_stripe_subscription 
ON user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_active 
ON user_subscriptions(is_active) WHERE is_active = TRUE;

-- Insert default subscription for existing users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO user_subscriptions (user_id, plan, is_active)
        SELECT id, 'free', FALSE 
        FROM users 
        WHERE NOT EXISTS (
            SELECT 1 FROM user_subscriptions WHERE user_id = users.id
        );
    END IF;
END$$;

-- Part 5 Complete: Created user_subscriptions table

-- ==================================================================
-- PART 6: Create community_chat_sessions table (批次存储对话)
-- ==================================================================

CREATE TABLE IF NOT EXISTS community_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(100) NOT NULL,
    time_of_day VARCHAR(20),
    participant_fish_ids UUID[] NOT NULL,
    dialogues JSONB NOT NULL,
    display_duration INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- Add comments for documentation
COMMENT ON TABLE community_chat_sessions IS 'Stores batch dialogues generated by COZE AI for community chat';
COMMENT ON COLUMN community_chat_sessions.topic IS 'Chat topic, e.g., "Morning Greetings", "Swimming Fun"';
COMMENT ON COLUMN community_chat_sessions.time_of_day IS 'Time period: morning, afternoon, evening, night';
COMMENT ON COLUMN community_chat_sessions.participant_fish_ids IS 'Array of fish IDs that participated in this chat';
COMMENT ON COLUMN community_chat_sessions.dialogues IS 'Full dialogue JSON: {messages: [{fishId, fishName, message, sequence}]}';
COMMENT ON COLUMN community_chat_sessions.display_duration IS 'Total playback duration in seconds (messages × 6)';
COMMENT ON COLUMN community_chat_sessions.expires_at IS 'Auto-cleanup date (7 days from creation)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_created 
ON community_chat_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_expires 
ON community_chat_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_session_topic 
ON community_chat_sessions(topic);

CREATE INDEX IF NOT EXISTS idx_session_time 
ON community_chat_sessions(time_of_day);

-- Create GIN index for participant_fish_ids array (for efficient querying)
CREATE INDEX IF NOT EXISTS idx_session_participants 
ON community_chat_sessions USING GIN(participant_fish_ids);

-- Part 6 Complete: Created community_chat_sessions table

-- ==================================================================
-- PART 7: Create utility functions and views
-- ==================================================================

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_chat_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM community_chat_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_chat_sessions IS 
'Deletes expired chat sessions (older than 7 days). Can be called by a cron job.';

-- View for recent chats (last 24 hours)
CREATE OR REPLACE VIEW recent_chat_sessions AS
SELECT 
    id,
    topic,
    time_of_day,
    participant_fish_ids,
    jsonb_array_length(dialogues->'messages') as message_count,
    display_duration,
    created_at
FROM community_chat_sessions
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

COMMENT ON VIEW recent_chat_sessions IS 
'Shows chat sessions from the last 24 hours with message counts';

-- Update trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create update trigger for user_subscriptions
DROP TRIGGER IF EXISTS update_subscription_updated_at ON user_subscriptions;
CREATE TRIGGER update_subscription_updated_at 
BEFORE UPDATE ON user_subscriptions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Part 7 Complete: Created utility functions and views

-- ==================================================================
-- MIGRATION COMPLETE - Display Summary
-- ==================================================================

DO $$
DECLARE
    fish_count INT;
    fish_with_names INT;
    fish_with_personality INT;
    subscription_count INT;
    session_count INT;
    battle_log_exists BOOLEAN;
    battle_config_exists BOOLEAN;
    fish_name_exists BOOLEAN;
    personality_exists BOOLEAN;
BEGIN
    -- Check what exists
    SELECT COUNT(*) INTO fish_count FROM fish;
    
    -- Check if columns exist before querying
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fish' AND column_name = 'fish_name'
    ) INTO fish_name_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fish' AND column_name = 'personality_type'
    ) INTO personality_exists;
    
    IF fish_name_exists THEN
        SELECT COUNT(*) INTO fish_with_names FROM fish WHERE fish_name IS NOT NULL;
    ELSE
        fish_with_names := 0;
    END IF;
    
    IF personality_exists THEN
        SELECT COUNT(*) INTO fish_with_personality FROM fish WHERE personality_type IS NOT NULL;
    ELSE
        fish_with_personality := 0;
    END IF;
    
    SELECT COUNT(*) INTO subscription_count FROM user_subscriptions;
    SELECT COUNT(*) INTO session_count FROM community_chat_sessions;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'battle_log'
    ) INTO battle_log_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'battle_config'
    ) INTO battle_config_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '🎉 Community Chat System Migration Completed Successfully!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Database Changes:';
    RAISE NOTICE '  ✅ Added fish_name field to fish table';
    RAISE NOTICE '  ✅ Added personality_type field to fish table';
    RAISE NOTICE '  ✅ Removed all battle fields from fish table';
    RAISE NOTICE '  ✅ Dropped battle_log table: %', NOT battle_log_exists;
    RAISE NOTICE '  ✅ Dropped battle_config table: %', NOT battle_config_exists;
    RAISE NOTICE '  ✅ Created user_subscriptions table';
    RAISE NOTICE '  ✅ Created community_chat_sessions table';
    RAISE NOTICE '  ✅ Created cleanup function and views';
    RAISE NOTICE '';
    RAISE NOTICE 'Current Data:';
    RAISE NOTICE '  📊 Total fish: %', fish_count;
    RAISE NOTICE '  🐟 Fish with names: %', fish_with_names;
    RAISE NOTICE '  🎭 Fish with personalities: %', fish_with_personality;
    RAISE NOTICE '  👥 User subscriptions: %', subscription_count;
    RAISE NOTICE '  💬 Chat sessions: %', session_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Track new tables in Hasura console:';
    RAISE NOTICE '     • community_chat_sessions';
    RAISE NOTICE '     • user_subscriptions';
    RAISE NOTICE '     • recent_chat_sessions (view)';
    RAISE NOTICE '  2. Untrack old battle tables in Hasura (if still tracked)';
    RAISE NOTICE '  3. Configure table permissions in Hasura';
    RAISE NOTICE '  4. Set up cron job to call cleanup_expired_chat_sessions()';
    RAISE NOTICE '  5. Reload Hasura metadata';
    RAISE NOTICE '  6. Test GraphQL queries';
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '✨ Ready for Phase 2: COZE AI Integration';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';
END$$;

