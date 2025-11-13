-- Fish Art Dialogue System Database Migration
-- Date: 2025-11-05
-- Purpose: Add support for fish names, personalities, and dialogue features

-- ==================================================================
-- STEP 1: Extend fish table with new fields
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

-- ==================================================================
-- STEP 2: Create user_subscriptions table
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
ALTER TABLE user_subscriptions 
ADD CONSTRAINT IF NOT EXISTS subscription_plan_check 
CHECK (plan IN ('free', 'basic', 'premium'));

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

-- ==================================================================
-- STEP 3: Create fish_messages table (for owner messages)
-- ==================================================================

CREATE TABLE IF NOT EXISTS fish_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fish_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'general',
    content TEXT NOT NULL,
    ai_generated BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    display_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraint for message_type
ALTER TABLE fish_messages 
ADD CONSTRAINT IF NOT EXISTS message_type_check 
CHECK (message_type IN ('general', 'looking_for_friends', 'share_art', 'announcement'));

-- Add foreign key to fish table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_message_fish'
    ) THEN
        ALTER TABLE fish_messages 
        ADD CONSTRAINT fk_message_fish 
        FOREIGN KEY (fish_id) REFERENCES fish(id) ON DELETE CASCADE;
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_fish ON fish_messages(fish_id);
CREATE INDEX IF NOT EXISTS idx_message_user ON fish_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_message_approved ON fish_messages(is_approved) WHERE is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_message_created ON fish_messages(created_at DESC);

-- ==================================================================
-- STEP 4: Create fish_dialogue_cache table (for COZE AI caching)
-- ==================================================================

CREATE TABLE IF NOT EXISTS fish_dialogue_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fish_id UUID NOT NULL,
    personality VARCHAR(20) NOT NULL,
    context_hash VARCHAR(64) NOT NULL,
    dialogue TEXT NOT NULL,
    use_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key to fish table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_cache_fish'
    ) THEN
        ALTER TABLE fish_dialogue_cache 
        ADD CONSTRAINT fk_cache_fish 
        FOREIGN KEY (fish_id) REFERENCES fish(id) ON DELETE CASCADE;
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cache_fish ON fish_dialogue_cache(fish_id);
CREATE INDEX IF NOT EXISTS idx_cache_context ON fish_dialogue_cache(context_hash);
CREATE INDEX IF NOT EXISTS idx_cache_personality ON fish_dialogue_cache(personality);
CREATE INDEX IF NOT EXISTS idx_cache_created ON fish_dialogue_cache(created_at DESC);

-- Create unique index to prevent duplicate cache entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_unique 
ON fish_dialogue_cache(fish_id, context_hash);

-- ==================================================================
-- STEP 5: Create subscription_history table (for tracking changes)
-- ==================================================================

CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    from_plan VARCHAR(20),
    to_plan VARCHAR(20),
    stripe_event_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key to user_subscriptions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_history_subscription'
    ) THEN
        ALTER TABLE subscription_history 
        ADD CONSTRAINT fk_history_subscription 
        FOREIGN KEY (user_id) REFERENCES user_subscriptions(user_id) ON DELETE CASCADE;
    END IF;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_event ON subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_history_created ON subscription_history(created_at DESC);

-- ==================================================================
-- STEP 6: Update trigger for user_subscriptions updated_at
-- ==================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_subscription_updated_at ON user_subscriptions;
DROP TRIGGER IF EXISTS update_message_updated_at ON fish_messages;

-- Create triggers
CREATE TRIGGER update_subscription_updated_at 
BEFORE UPDATE ON user_subscriptions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_updated_at 
BEFORE UPDATE ON fish_messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================
-- STEP 7: Grant permissions (adjust as needed for your setup)
-- ==================================================================

-- Grant permissions to authenticated users (Hasura role)
-- GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON fish_messages TO authenticated;
-- GRANT SELECT ON fish_dialogue_cache TO authenticated;
-- GRANT SELECT ON subscription_history TO authenticated;

-- ==================================================================
-- STEP 8: Insert default data (optional)
-- ==================================================================

-- Insert default subscription for existing users (if users table exists)
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

-- ==================================================================
-- MIGRATION COMPLETE
-- ==================================================================

-- Display summary
DO $$
DECLARE
    fish_count INT;
    subscription_count INT;
    message_count INT;
    cache_count INT;
BEGIN
    SELECT COUNT(*) INTO fish_count FROM fish;
    SELECT COUNT(*) INTO subscription_count FROM user_subscriptions;
    SELECT COUNT(*) INTO message_count FROM fish_messages;
    SELECT COUNT(*) INTO cache_count FROM fish_dialogue_cache;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'fish table: % rows (with new fields: fish_name, personality_type)', fish_count;
    RAISE NOTICE 'user_subscriptions table: % rows', subscription_count;
    RAISE NOTICE 'fish_messages table: % rows', message_count;
    RAISE NOTICE 'fish_dialogue_cache table: % rows', cache_count;
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Track these tables in Hasura console';
    RAISE NOTICE '2. Configure permissions for each table';
    RAISE NOTICE '3. Test the API endpoints';
    RAISE NOTICE '======================================';
END$$;

