-- ============================================
-- 删除战斗系统相关的数据表
-- ============================================
-- 执行时间: 预计30秒内完成
-- 影响范围: economy_log表、fish_test表、user_economy表
-- 注意: 此操作不可逆，执行前请备份数据

-- 1. 删除 economy_log 表（经济系统日志表）
-- 该表关联到 fish 和 users 表，CASCADE 会自动删除相关的外键引用
DROP TABLE IF EXISTS economy_log CASCADE;

-- 2. 删除 fish_test 表（测试表，包含战斗系统字段）
-- 该表包含 battle_power, experience, health, level, talent, total_wins, total_losses 等战斗字段
DROP TABLE IF EXISTS fish_test CASCADE;

-- 3. 删除 user_economy 表（用户经济数据表）
DROP TABLE IF EXISTS user_economy CASCADE;

-- 4. 提示：如果 fish 表中还有战斗相关字段（battle_power, experience 等），
-- 请在 Hasura Console 或通过以下SQL手动删除这些字段
-- 示例（根据实际情况调整）:
-- ALTER TABLE fish DROP COLUMN IF EXISTS battle_power CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS experience CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS health CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS max_health CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS level CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS talent CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS total_wins CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS total_losses CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS is_in_battle_mode CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS position_row CASCADE;
-- ALTER TABLE fish DROP COLUMN IF EXISTS last_exp_update CASCADE;

COMMIT;
