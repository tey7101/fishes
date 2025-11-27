-- 为 user_subscriptions 表添加 PayPal 支付支持
-- 此迁移添加支付提供商和PayPal订阅ID字段

-- 1. 添加 payment_provider 字段（stripe/paypal）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'payment_provider'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN payment_provider VARCHAR(20) DEFAULT 'stripe';
    END IF;
END $$;

-- 2. 添加 paypal_subscription_id 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'paypal_subscription_id'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN paypal_subscription_id VARCHAR(255);
    END IF;
END $$;

-- 3. 添加约束：payment_provider 必须是 'stripe' 或 'paypal'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payment_provider_check'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT payment_provider_check 
        CHECK (payment_provider IN ('stripe', 'paypal'));
    END IF;
END $$;

-- 4. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paypal_id 
  ON user_subscriptions(paypal_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_provider 
  ON user_subscriptions(payment_provider);

-- 5. 更新现有记录的 payment_provider 为 'stripe'（如果有Stripe相关字段）
UPDATE user_subscriptions 
SET payment_provider = 'stripe' 
WHERE payment_provider IS NULL;

-- 验证更改
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subscriptions' 
  AND column_name IN ('payment_provider', 'paypal_subscription_id')
ORDER BY ordinal_position;

-- 验证约束
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
  AND conname = 'payment_provider_check';

-- 验证索引
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions' 
  AND (indexname LIKE '%paypal%' OR indexname LIKE '%provider%');

