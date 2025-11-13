-- ============================================
-- 添加用户语言字段
-- ============================================
-- 执行时间: 即时完成
-- 功能: 在users表中添加user_language字段，用于存储用户选择的语言（英文全称）
-- 用途: 决定群聊模式中采用的语言，后续还有其他用途

-- 添加 user_language 字段（VARCHAR类型，可为空）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_language VARCHAR(50);

COMMENT ON COLUMN users.user_language IS '用户选择的语言（英文全称），用于群聊模式等场景。支持：English, French, Spanish, Chinese, Traditional Chinese, Japanese, Korean';

COMMIT;

