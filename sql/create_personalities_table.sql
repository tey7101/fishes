-- =====================================================
-- 创建鱼个性表及关联关系
-- 
-- 特点：
-- ✅ 幂等性：可以安全地重复运行此脚本
-- ✅ 自动清理：自动处理无效的历史数据
-- ✅ 约束管理：正确处理 NOT NULL 和外键约束
-- =====================================================

-- 1. 创建个性表（如果不存在）
CREATE TABLE IF NOT EXISTS fish_personalities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,  -- 个性名称（英文）
    description TEXT NOT NULL,   -- 个性细节描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE fish_personalities IS '鱼个性类型表 - 预设的个性类型及详细描述';
COMMENT ON COLUMN fish_personalities.name IS '个性名称（英文，唯一标识）';
COMMENT ON COLUMN fish_personalities.description IS '个性细节描述 - 详细说明该个性的特征和行为模式';

-- 2. 插入20种纯粹的个性特征（按美国文化受欢迎程度排序）
-- 使用 ON CONFLICT 避免重复插入
INSERT INTO fish_personalities (name, description) VALUES
('funny', 'Hilarious and always cracking jokes. Makes everyone laugh, finds humor in everything, and believes laughter is the best medicine. Life''s a comedy show and they''re the star comedian.'),
('cheerful', 'Eternally optimistic and upbeat. Sees the bright side of everything, spreads positive vibes, and maintains enthusiasm even in difficult situations. Infectious happiness that lifts others'' spirits.'),
('brave', 'Fearless and bold in the face of danger. Takes risks without hesitation, stands up for what''s right, and never backs down from a challenge. Courage runs deep.'),
('playful', 'Fun-loving and always ready for games. Finds joy in simple pleasures, loves to joke around, and approaches life with childlike wonder. Takes nothing too seriously.'),
('curious', 'Endlessly inquisitive and eager to learn. Questions everything, explores constantly, and fascinated by how things work. Nose in everyone''s business out of genuine interest.'),
('energetic', 'Hyperactive and always buzzing with energy. Constantly moving, can''t sit still, and brings high-octane enthusiasm to everything. Like they''re permanently caffeinated.'),
('calm', 'Serene and unshakeable no matter what happens. Nothing ruffles their composure, maintains inner peace, and brings tranquility to chaotic situations. The eye of any storm.'),
('gentle', 'Kind-hearted and tender in all interactions. Speaks softly, acts with compassion, and wouldn''t hurt a fly. The embodiment of sweetness and care.'),
('sarcastic', 'Sharp-tongued with cutting wit. Communicates primarily through irony and mockery, rarely says what they mean directly, and humor is their defense mechanism. Masters of the eye-roll.'),
('dramatic', 'Theatrical and exaggerates everything for effect. Turns minor events into epic sagas, expresses emotions intensely, and life is their stage. Everything is either amazing or catastrophic.'),
('naive', 'Innocent and believes the best in everyone. Takes things at face value, trusts easily, and oblivious to deception. Sees the world through rose-colored glasses.'),
('shy', 'Timid, reserved, and easily embarrassed. Avoids attention, speaks softly, and takes time to warm up to others. Prefers observing from the sidelines rather than being in the spotlight.'),
('anxious', 'Constantly worried and overthinking everything. Sees potential problems everywhere, nervous about outcomes, and stress is their default state. "What if" is their favorite phrase.'),
('stubborn', 'Inflexible and refuses to change their mind. Digs heels in on every opinion, won''t compromise, and "my way or the highway" is their motto. Immovable as a rock.'),
('serious', 'Solemn and focused on important matters. No time for frivolity, approaches everything with gravitas, and believes fun is a distraction. Life is business, not pleasure.'),
('lazy', 'Unmotivated and energy-conserving to an art form. Avoids effort whenever possible, masters the art of doing nothing, and believes rest is a lifestyle. "Why do today what can be postponed forever?"'),
('grumpy', 'Perpetually irritable and quick to complain. Everything annoys them, always finds something wrong, and expresses displeasure freely. The embodiment of "get off my lawn" energy.'),
('aggressive', 'Confrontational and quick to fight. Challenges others readily, dominates situations, and sees everything as competition. Always ready to throw down.'),
('cynical', 'Disillusioned and expects the worst from everyone. Believes nothing matters, mocks optimism, and finds futility in everything. Hope is for suckers.'),
('crude', 'Crude, vulgar, and unapologetically rude - like a foul-mouthed teddy bear. Swears casually, speaks bluntly without filter, and finds humor in inappropriate things. Zero patience for politeness.')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    created_at = NOW();

-- 3. 修改 fish_monologues 表，添加外键关联
-- 3.0 如果 personality 字段不存在，则创建它
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fish_monologues' 
        AND column_name = 'personality'
    ) THEN
        ALTER TABLE fish_monologues 
            ADD COLUMN personality TEXT;
        RAISE NOTICE '✅ 已添加 fish_monologues.personality 字段';
    ELSE
        RAISE NOTICE '⚠️  personality 字段已存在';
    END IF;
END $$;

-- 3.1 先移除 NOT NULL 约束（如果存在），允许 personality 为空
ALTER TABLE fish_monologues 
    ALTER COLUMN personality DROP NOT NULL;

-- 3.2 清理 fish_monologues 中的无效数据
-- 方案A：将无效的 personality 设为 NULL（推荐，保留数据）
UPDATE fish_monologues 
SET personality = NULL 
WHERE personality IS NOT NULL 
AND personality NOT IN (SELECT name FROM fish_personalities);

-- 方案B：删除无效的 personality 记录（可选，如果不需要这些数据）
-- DELETE FROM fish_monologues 
-- WHERE personality IS NOT NULL 
-- AND personality NOT IN (SELECT name FROM fish_personalities);

-- 3.3 删除旧的外键约束（如果存在）
ALTER TABLE fish_monologues 
    DROP CONSTRAINT IF EXISTS fish_monologues_personality_fkey;

-- 3.4 添加新的外键约束
ALTER TABLE fish_monologues 
    ADD CONSTRAINT fish_monologues_personality_fkey 
    FOREIGN KEY (personality) 
    REFERENCES fish_personalities(name) 
    ON UPDATE CASCADE 
    ON DELETE RESTRICT;

-- 4. 修改 fish 表，添加外键关联
-- 注意：由于 fish.personality 可以是自定义输入，这里使用软关联方式
-- 如果想要强制关联，需要先清理或更新现有数据
-- ALTER TABLE fish 
--     ADD CONSTRAINT fish_personality_fkey 
--     FOREIGN KEY (personality) 
--     REFERENCES fish_personalities(name) 
--     ON UPDATE CASCADE 
--     ON DELETE SET NULL;

-- 如果需要建立强约束，先执行以下步骤：
-- 4.1 更新所有现有数据为有效的个性名称或NULL
UPDATE fish 
SET personality = NULL 
WHERE personality IS NOT NULL 
AND personality NOT IN (SELECT name FROM fish_personalities);

-- 4.1.5 为所有没有个性的鱼随机分配一个个性
UPDATE fish 
SET personality = (
    SELECT name 
    FROM fish_personalities 
    ORDER BY RANDOM() 
    LIMIT 1
)
WHERE personality IS NULL;

-- 4.2 删除旧的外键约束（如果存在）
ALTER TABLE fish 
    DROP CONSTRAINT IF EXISTS fish_personality_fkey;

-- 4.3 添加外键约束
ALTER TABLE fish 
    ADD CONSTRAINT fish_personality_fkey 
    FOREIGN KEY (personality) 
    REFERENCES fish_personalities(name) 
    ON UPDATE CASCADE 
    ON DELETE SET NULL;

-- 5. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_fish_personality ON fish(personality);
CREATE INDEX IF NOT EXISTS idx_fish_monologues_personality ON fish_monologues(personality);

-- 6. 授予 Hasura 必要的权限（如果 hasura 角色存在）
DO $$
BEGIN
    -- 检查 hasura 角色是否存在
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hasura') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON fish_personalities TO hasura;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hasura;
        RAISE NOTICE '✅ 已授予 hasura 角色权限';
    ELSE
        RAISE NOTICE '⚠️  hasura 角色不存在，跳过权限授予（如需要，请手动创建角色并授权）';
    END IF;
END $$;

-- =====================================================
-- 完成！现在可以在 Hasura Console 中：
-- 1. Track fish_personalities 表
-- 2. 建立表关系：
--    - fish.personality -> fish_personalities.name (object relationship)
--    - fish_monologues.personality -> fish_personalities.name (object relationship)
--    - fish_personalities.name -> fish (array relationship)
--    - fish_personalities.name -> fish_monologues (array relationship)
-- =====================================================

