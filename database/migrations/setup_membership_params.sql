-- ============================================
-- 设置会员制度全局参数
-- ============================================
-- 执行时间: 即时完成
-- 功能: 配置三级会员制度（Free/Plus/Premium）的各项限制参数

-- 插入或更新会员制度相关全局参数
INSERT INTO global_params (key, value, description) VALUES
  -- Plus会员最大鱼数量
  ('plus_max_fish', '5', 'Plus会员最大鱼数量'),
  
  -- Premium会员最大鱼数量
  ('premium_max_fish', '20', 'Premium会员最大鱼数量'),
  
  -- Premium会员说话频率范围
  ('premium_chat_frequency_min', '1', 'Premium会员说话频率最小值（每小时）'),
  ('premium_chat_frequency_max', '10', 'Premium会员说话频率最大值（每小时）'),
  
  -- Free会员最大鱼数量（默认1条）
  ('free_max_fish', '1', 'Free会员最大鱼数量'),
  
  -- 默认说话频率（适用于Plus会员）
  ('default_chat_frequency', '5', '默认鱼说话频率（每小时）')

-- 如果参数已存在，则更新其值
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 提示：如果 fish 表中还没有 chat_frequency 字段，请执行以下SQL添加：
-- ALTER TABLE fish ADD COLUMN IF NOT EXISTS chat_frequency INT DEFAULT 5 CHECK (chat_frequency >= 1 AND chat_frequency <= 10);
-- COMMENT ON COLUMN fish.chat_frequency IS '鱼的说话频率（1-10，每小时次数）仅Premium会员可调节';

COMMIT;
