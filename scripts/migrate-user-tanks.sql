-- =====================================================
-- User Tanks Migration Script
-- =====================================================
-- This script migrates existing multi-tank system to single private tank per user
-- WARNING: This will DELETE all existing tanks except the default one
-- BACKUP YOUR DATA BEFORE RUNNING THIS SCRIPT!

-- =====================================================
-- Step 1: Create default tanks for users who don't have any
-- =====================================================

-- Insert a default tank for each user who has created fish but has no tank
INSERT INTO fishtanks (user_id, name, description, is_public, is_default, share_id, fish_count, view_count, created_at, updated_at)
SELECT DISTINCT 
  f.user_id,
  'My Private Tank' as name,
  'My personal fish collection' as description,
  FALSE as is_public,
  TRUE as is_default,
  SUBSTRING(MD5(RANDOM()::TEXT || f.user_id) FROM 1 FOR 16) as share_id,
  0 as fish_count,
  0 as view_count,
  NOW() as created_at,
  NOW() as updated_at
FROM fish f
WHERE f.user_id NOT IN (SELECT DISTINCT user_id FROM fishtanks)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Step 2: For users with existing tanks, mark the first one as default
-- =====================================================

-- Mark the oldest tank of each user as the default tank
WITH ranked_tanks AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
  FROM fishtanks
)
UPDATE fishtanks ft
SET is_default = TRUE
FROM ranked_tanks rt
WHERE ft.id = rt.id AND rt.rn = 1;

-- =====================================================
-- Step 3: Move all fish from non-default tanks to default tank
-- =====================================================

-- First, get the default tank for each user and move fish from other tanks
WITH user_default_tanks AS (
  SELECT user_id, id as default_tank_id
  FROM fishtanks
  WHERE is_default = TRUE
)
UPDATE fishtank_fish ff
SET fishtank_id = udt.default_tank_id
FROM user_default_tanks udt
JOIN fishtanks ft ON ff.fishtank_id = ft.id AND ft.user_id = udt.user_id
WHERE ft.is_default = FALSE
  AND ff.fishtank_id != udt.default_tank_id;

-- Remove duplicate fish entries in the same tank (keep earliest)
DELETE FROM fishtank_fish ff1
WHERE EXISTS (
  SELECT 1 FROM fishtank_fish ff2
  WHERE ff1.fishtank_id = ff2.fishtank_id
    AND ff1.fish_id = ff2.fish_id
    AND ff1.added_at > ff2.added_at
);

-- =====================================================
-- Step 4: Update fish counts for default tanks
-- =====================================================

-- Recalculate fish_count for all tanks
UPDATE fishtanks ft
SET fish_count = (
  SELECT COUNT(*) 
  FROM fishtank_fish ff 
  WHERE ff.fishtank_id = ft.id
);

-- =====================================================
-- Step 5: DELETE all non-default tanks
-- =====================================================

-- WARNING: This permanently deletes tanks!
-- Make sure you've backed up your data!

DELETE FROM fishtank_views 
WHERE fishtank_id IN (
  SELECT id FROM fishtanks WHERE is_default = FALSE
);

DELETE FROM fishtanks 
WHERE is_default = FALSE OR is_default IS NULL;

-- =====================================================
-- Step 6: Ensure all remaining tanks are set to private
-- =====================================================

UPDATE fishtanks 
SET is_public = FALSE 
WHERE is_default = TRUE;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check number of tanks per user (should be 1 or 0)
-- SELECT user_id, COUNT(*) as tank_count
-- FROM fishtanks
-- GROUP BY user_id
-- HAVING COUNT(*) > 1;

-- Check that all remaining tanks are default
-- SELECT COUNT(*) FROM fishtanks WHERE is_default = FALSE;

-- Check fish distribution
-- SELECT ft.user_id, ft.name, COUNT(ff.fish_id) as fish_count
-- FROM fishtanks ft
-- LEFT JOIN fishtank_fish ff ON ft.id = ff.fishtank_id
-- GROUP BY ft.id, ft.user_id, ft.name
-- ORDER BY ft.user_id;

-- Summary statistics
-- SELECT 
--   (SELECT COUNT(*) FROM fishtanks) as total_tanks,
--   (SELECT COUNT(*) FROM fishtanks WHERE is_default = TRUE) as default_tanks,
--   (SELECT COUNT(DISTINCT user_id) FROM fishtanks) as users_with_tanks,
--   (SELECT COUNT(*) FROM fish_favorites) as total_favorites;
































