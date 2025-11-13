-- =====================================================
-- Fish Favorites Table Creation Script
-- =====================================================
-- This script creates the fish_favorites table for storing user's favorite fish
-- Run this script in your PostgreSQL database (Hasura)

-- 1. Create fish_favorites table
CREATE TABLE IF NOT EXISTS fish_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  fish_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_fish_favorite UNIQUE(user_id, fish_id),
  CONSTRAINT fk_favorite_fish FOREIGN KEY (fish_id) REFERENCES fish(id) ON DELETE CASCADE
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_favorites_user ON fish_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_fish ON fish_favorites(fish_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON fish_favorites(created_at DESC);

-- 3. Add comment to table
COMMENT ON TABLE fish_favorites IS 'Stores users favorite fish for their private tank';
COMMENT ON COLUMN fish_favorites.user_id IS 'Supabase Auth user ID';
COMMENT ON COLUMN fish_favorites.fish_id IS 'Reference to fish table';
COMMENT ON COLUMN fish_favorites.created_at IS 'When the fish was favorited';

-- =====================================================
-- Hasura Tracking Instructions
-- =====================================================
-- After running this script, track the table in Hasura Console:
-- 1. Go to Hasura Console > Data > fish_favorites
-- 2. Click "Track Table"
-- 3. Set up relationships:
--    - fish_favorites -> fish (object relationship on fish_id)
--    - fish_favorites -> users (object relationship on user_id if users table exists)
-- 4. Set permissions as needed

-- =====================================================
-- Verification Queries
-- =====================================================
-- Check if table was created successfully:
-- SELECT * FROM information_schema.tables WHERE table_name = 'fish_favorites';

-- Check indexes:
-- SELECT * FROM pg_indexes WHERE tablename = 'fish_favorites';



























