-- 为 member_types 表添加价格字段
-- 用于存储会员套餐的月度和年度价格，以及Stripe价格ID

ALTER TABLE member_types 
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly VARCHAR(255);

-- 添加字段注释
COMMENT ON COLUMN member_types.monthly_price IS '月度订阅价格（美元）';
COMMENT ON COLUMN member_types.yearly_price IS '年度订阅价格（美元）';
COMMENT ON COLUMN member_types.stripe_price_id_monthly IS 'Stripe月度价格ID';
COMMENT ON COLUMN member_types.stripe_price_id_yearly IS 'Stripe年度价格ID';

-- 更新会员类型价格数据
-- Free会员：免费
UPDATE member_types 
SET monthly_price = 0, yearly_price = 0 
WHERE id = 'free';

-- Plus会员：$9.99/月，$99.99/年（约8.3折）
UPDATE member_types 
SET monthly_price = 9.99, yearly_price = 99.99 
WHERE id = 'plus';

-- Premium会员：$19.99/月，$199.99/年（约8.3折）
UPDATE member_types 
SET monthly_price = 19.99, yearly_price = 199.99 
WHERE id = 'premium';

-- 验证更新结果
SELECT id, name, monthly_price, yearly_price 
FROM member_types 
ORDER BY monthly_price;

