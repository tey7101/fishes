-- ====================================
-- 更新 battle_config 表
-- 添加缺失的字段
-- ====================================

-- 添加max_battle_users字段（如果不存在）
ALTER TABLE battle_config
ADD COLUMN IF NOT EXISTS max_battle_users INT DEFAULT 50;

-- 添加battle_cooldown_seconds字段（如果不存在）
ALTER TABLE battle_config
ADD COLUMN IF NOT EXISTS battle_cooldown_seconds INT DEFAULT 30;

-- 验证更新
SELECT * FROM battle_config WHERE id = 1;

-- 显示结果
DO $$ 
BEGIN
    RAISE NOTICE '✅ battle_config表已更新！';
    RAISE NOTICE '新增字段：';
    RAISE NOTICE '  - max_battle_users (默认值: 50)';
    RAISE NOTICE '  - battle_cooldown_seconds (默认值: 30)';
END $$;



