-- ============================================
-- Fish Chat Features Database Migration
-- ============================================
-- 添加鱼聊天功能所需的数据库结构
-- 包括：用户表扩展、鱼个性字段重命名、自语表、全局参数表

-- ============================================
-- 1. 扩展 users 表
-- ============================================
-- 添加主人信息字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS feeder_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS feeder_info TEXT;

COMMENT ON COLUMN users.feeder_name IS '主人昵称 - 用于鱼聊天时提及主人';
COMMENT ON COLUMN users.feeder_info IS '主人信息描述 - 用于鱼聊天时了解主人背景';

-- ============================================
-- 2. 重命名 fish 表的 personality_type 字段
-- ============================================
-- 将 personality_type 重命名为 personality，并允许更长的自定义内容
ALTER TABLE fish 
RENAME COLUMN personality_type TO personality;

ALTER TABLE fish 
ALTER COLUMN personality TYPE VARCHAR(100);

COMMENT ON COLUMN fish.personality IS '鱼的个性描述 - 支持自定义输入（如cheerful, shy, brave, lazy或其他）';

-- ============================================
-- 3. 创建自语数据表 (fish_monologues)
-- ============================================
CREATE TABLE IF NOT EXISTS fish_monologues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personality VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE fish_monologues IS '鱼自语内容表 - 存储按个性分类的预设自语内容（英文美式幽默风格）';
COMMENT ON COLUMN fish_monologues.personality IS '个性类型（可扩展）';
COMMENT ON COLUMN fish_monologues.content IS '自语内容（英文）';

CREATE INDEX IF NOT EXISTS idx_fish_monologues_personality ON fish_monologues(personality);

-- ============================================
-- 4. 创建全局参数表 (global_params)
-- ============================================
CREATE TABLE IF NOT EXISTS global_params (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE global_params IS '全局参数配置表 - 存储系统级可调整参数';
COMMENT ON COLUMN global_params.key IS '参数键名';
COMMENT ON COLUMN global_params.value IS '参数值';
COMMENT ON COLUMN global_params.description IS '参数说明';

-- ============================================
-- 5. 插入全局参数默认值
-- ============================================
INSERT INTO global_params (key, value, description) VALUES
  ('fish_chat_participant_count', '5', 'Number of fish participating in group chat'),
  ('group_chat_interval_ms', '30000', 'Group chat interval in milliseconds (30 seconds)'),
  ('monologue_interval_ms', '10000', 'Monologue interval in milliseconds (10 seconds)')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 6. 插入预设自语内容 - Cheerful (开朗的)
-- ============================================
-- 美式动画风格：积极向上、充满活力、喜欢互动
INSERT INTO fish_monologues (personality, content) VALUES
  ('cheerful', 'Oh boy, oh boy! Today is going to be AMAZING! I can feel it in my fins!'),
  ('cheerful', 'You know what? Life underwater is pretty sweet. No complaints here!'),
  ('cheerful', 'Just keep swimming, just keep swimming! Wait, that''s already taken... but it''s still true!'),
  ('cheerful', 'Hey there, invisible friend! Wanna hear a joke? What do you call a fish with no eyes? Fsh! Haha!'),
  ('cheerful', 'I''m not just any fish, I''m a HAPPY fish! And proud of it!'),
  ('cheerful', 'Is it just me, or does this water taste extra fresh today? Mmm, refreshing!'),
  ('cheerful', 'You know what makes me smile? Everything! Literally everything!'),
  ('cheerful', 'I wonder if other fish dream about flying... because I totally do! Whoosh!'),
  ('cheerful', 'High five! Oh wait, I don''t have hands. High fin? Yeah, that works!'),
  ('cheerful', 'Another day in paradise! And by paradise, I mean this awesome tank!'),
  ('cheerful', 'If happiness was a sport, I''d be an Olympic champion! Gold medal material right here!'),
  ('cheerful', 'Life hack: Be a fish. It''s literally just swimming and eating. Best. Job. Ever.'),
  ('cheerful', 'I''m like a bubble - I just float around spreading joy! Pop pop!'),
  ('cheerful', 'Today''s forecast: 100% chance of AWESOME with scattered bubbles!'),
  ('cheerful', 'Who needs legs when you''ve got fins this fabulous? Work it, work it!');

-- ============================================
-- 7. 插入预设自语内容 - Shy (害羞的)
-- ============================================
-- 美式动画风格：腼腆但可爱、偶尔有小勇气、自我对话居多
INSERT INTO fish_monologues (personality, content) VALUES
  ('shy', 'Um... is anyone watching me? I hope not. *hides behind plant*'),
  ('shy', 'Maybe if I stay really still, nobody will notice me... Shhh.'),
  ('shy', 'I... I wanted to say something, but... never mind. It wasn''t important.'),
  ('shy', 'Being invisible would be nice. Not that I''m asking for it or anything...'),
  ('shy', 'Deep breaths... you can do this... or maybe not. That''s okay too.'),
  ('shy', 'Sometimes I practice talking to other fish... when they''re not around.'),
  ('shy', '...Hi. Oh wait, nobody''s there. That''s... that''s actually better.'),
  ('shy', 'Is it weird that I talk to myself? Probably. But it''s less scary this way.'),
  ('shy', 'I''m not antisocial, I''m just... selectively social. Very selective.'),
  ('shy', 'One day I''ll be brave. Just... not today. Maybe tomorrow?'),
  ('shy', '*whispers* I''m actually pretty cool. Just saying. To myself.'),
  ('shy', 'What if I just... stayed right here... forever? Would that be so bad?'),
  ('shy', 'Small steps. Tiny steps. Microscopic steps. I''ll get there. Eventually.'),
  ('shy', 'Being quiet is underrated. All the cool fish are doing it. Probably.'),
  ('shy', 'I have so many thoughts... but they''re all staying right here. In my head. Safe.');

-- ============================================
-- 8. 插入预设自语内容 - Brave (勇敢的)
-- ============================================
-- 美式动画风格：英雄气概、鼓舞人心、有时过于自信
INSERT INTO fish_monologues (personality, content) VALUES
  ('brave', 'Fear? Never heard of it. I only know ADVENTURE!'),
  ('brave', 'Today, I shall explore the far corner of this tank! No reef is too dangerous!'),
  ('brave', 'They say heroes are born, not made. Well, I was DEFINITELY born ready!'),
  ('brave', 'I''m not just swimming, I''m CONQUERING these waters! Watch out, bubbles!'),
  ('brave', 'What''s that? Danger? Ha! Danger is just opportunity in disguise!'),
  ('brave', 'A true hero doesn''t wait for the perfect moment - they CREATE it!'),
  ('brave', 'I once stared down a filter current. And I WON. True story.'),
  ('brave', 'Courage isn''t about being fearless. It''s about being a fish and doing it anyway!'),
  ('brave', 'Who needs a cape when you''ve got fins like these? I''m basically a superhero!'),
  ('brave', 'If there''s a challenge in this tank, I''ll find it. And I''ll face it. Head on!'),
  ('brave', 'Remember: It''s not the size of the fish in the fight, it''s the size of the fight in the fish!'),
  ('brave', 'Some fish dream of glory. I LIVE it. Every. Single. Day.'),
  ('brave', 'That rock over there? I''m gonna swim RIGHT past it. No hesitation!'),
  ('brave', 'They call me reckless. I call it LIVING ON THE EDGE! The edge of this tank, but still!'),
  ('brave', 'Fortune favors the bold. And buddy, I''m the boldest fish in this whole aquarium!');

-- ============================================
-- 9. 插入预设自语内容 - Lazy (懒惰的)
-- ============================================
-- 美式动画风格：慵懒幽默、找借口高手、热爱放松
INSERT INTO fish_monologues (personality, content) VALUES
  ('lazy', 'Zzz... Oh, did I doze off again? My bad. Zzz...'),
  ('lazy', 'Why swim when you can just... float? Floating is underrated.'),
  ('lazy', 'I''m not lazy, I''m energy efficient. Big difference.'),
  ('lazy', 'Today''s to-do list: 1. Float. 2. Nap. 3. Maybe eat something. 4. More floating.'),
  ('lazy', '*yawn* Is it nap time yet? It feels like nap time. It''s always nap time.'),
  ('lazy', 'Exercise? I thought you said "extra fries." Now I''m disappointed.'),
  ('lazy', 'I''m not procrastinating, I''m just giving this rock some company. It looks lonely.'),
  ('lazy', 'They say the early fish gets the worm. But the late fish gets extra sleep. Worth it.'),
  ('lazy', 'I''ve mastered the art of doing nothing. It''s harder than it looks. Trust me.'),
  ('lazy', 'Why rush? The tank isn''t going anywhere. Neither am I, for that matter.'),
  ('lazy', 'Hustle culture? Never heard of it. I''m more of a "float culture" kind of fish.'),
  ('lazy', 'I''m conserving my energy... for later. Much, much later.'),
  ('lazy', 'Some fish carpe diem. I carpe nap-iem. Seize the nap!'),
  ('lazy', '*slowly drifts by* This is my maximum speed. Enjoy the show.'),
  ('lazy', 'I''m living my best life, which involves minimal movement. And I''m okay with that.');

-- ============================================
-- 10. 插入通用自语内容 (default)
-- ============================================
-- 适用于自定义个性或未分类的鱼
INSERT INTO fish_monologues (personality, content) VALUES
  ('default', 'Just another day being a fish. Could be worse, could be on a plate!'),
  ('default', 'I wonder what''s for dinner... Please not flakes again.'),
  ('default', 'Life in a tank isn''t so bad. Free food, no predators, sweet deal!'),
  ('default', 'Sometimes I wonder what it''s like in the ocean... Then I remember: sharks. No thanks.'),
  ('default', 'Is that my reflection or another fish? Oh, it''s me. Looking good!'),
  ('default', 'You know, being a fish is pretty chill once you get used to it.'),
  ('default', 'I should probably exercise more. But also, why though?'),
  ('default', 'Note to self: remember to breathe. Wait, I do that automatically. Cool.'),
  ('default', 'If I had a dollar for every bubble I''ve seen... I''d have no dollars because I''m a fish.'),
  ('default', 'Tank life: 10/10 would recommend. Plenty of water, good company.');

-- ============================================
-- 11. 创建自语日志表 (fish_monologue_logs)
-- ============================================
-- 用于保存鱼的自语记录（实际发生的自语）
CREATE TABLE IF NOT EXISTS fish_monologue_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fish_id UUID NOT NULL REFERENCES fish(id) ON DELETE CASCADE,
  fish_name VARCHAR(100),
  personality VARCHAR(100),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

COMMENT ON TABLE fish_monologue_logs IS '鱼自语日志 - 记录鱼实际说出的自语（保留30天）';
COMMENT ON COLUMN fish_monologue_logs.fish_id IS '鱼的UUID';
COMMENT ON COLUMN fish_monologue_logs.fish_name IS '鱼的名称（冗余存储，避免join）';
COMMENT ON COLUMN fish_monologue_logs.personality IS '鱼的个性';
COMMENT ON COLUMN fish_monologue_logs.message IS '自语内容';
COMMENT ON COLUMN fish_monologue_logs.expires_at IS '过期时间（30天后自动清理）';

CREATE INDEX IF NOT EXISTS idx_monologue_logs_fish_id ON fish_monologue_logs(fish_id);
CREATE INDEX IF NOT EXISTS idx_monologue_logs_created ON fish_monologue_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_monologue_logs_expires ON fish_monologue_logs(expires_at);

-- ============================================
-- 12. 更新group_chat的默认过期时间为30天
-- ============================================
-- 修改expires_at默认值为30天（原来是7天）
-- 注意：community_chat_sessions已改名为group_chat
ALTER TABLE group_chat 
ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '30 days';

COMMENT ON COLUMN group_chat.expires_at IS 'Auto-cleanup date (30 days from creation)';

-- ============================================
-- 验证数据插入
-- ============================================
-- 查看每种个性的自语数量
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Monologue counts by personality:';
  RAISE NOTICE '  cheerful: % entries', (SELECT COUNT(*) FROM fish_monologues WHERE personality = 'cheerful');
  RAISE NOTICE '  shy: % entries', (SELECT COUNT(*) FROM fish_monologues WHERE personality = 'shy');
  RAISE NOTICE '  brave: % entries', (SELECT COUNT(*) FROM fish_monologues WHERE personality = 'brave');
  RAISE NOTICE '  lazy: % entries', (SELECT COUNT(*) FROM fish_monologues WHERE personality = 'lazy');
  RAISE NOTICE '  default: % entries', (SELECT COUNT(*) FROM fish_monologues WHERE personality = 'default');
  RAISE NOTICE '  Total: % entries', (SELECT COUNT(*) FROM fish_monologues);
  RAISE NOTICE 'New tables created: fish_monologue_logs';
END $$;

