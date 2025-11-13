-- ============================================
-- 关联 member_types 表和 users 表
-- ============================================
-- 功能: 通过 user_subscriptions.plan 字段建立外键关联到 member_types.id
-- 这样可以在 GraphQL 中直接通过关联查询获取会员类型信息

-- 1. 确保 member_types 表存在且数据完整
-- (如果 member_types 表还未创建，请先运行 create_member_types_table.sql)

-- 2. 添加外键约束：user_subscriptions.plan -> member_types.id
-- 注意：如果表中已有数据，需要确保所有 plan 值都在 member_types 表中存在

-- 检查并添加外键约束
DO $$
BEGIN
    -- 检查外键是否已存在
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_subscriptions_plan_fkey'
        AND table_name = 'user_subscriptions'
    ) THEN
        -- 添加外键约束
        ALTER TABLE user_subscriptions
        ADD CONSTRAINT user_subscriptions_plan_fkey
        FOREIGN KEY (plan) 
        REFERENCES member_types(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint added: user_subscriptions.plan -> member_types.id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- 3. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan 
ON user_subscriptions(plan);

-- 4. 添加注释说明关联关系
COMMENT ON CONSTRAINT user_subscriptions_plan_fkey ON user_subscriptions 
IS 'Foreign key to member_types table. Links user subscription plan to member type configuration.';

-- 说明：
-- 1. 外键约束确保 user_subscriptions.plan 的值必须是 member_types.id 中存在的值
-- 2. ON DELETE RESTRICT: 如果尝试删除 member_types 中的记录，且该记录被 user_subscriptions 引用，则拒绝删除
-- 3. ON UPDATE CASCADE: 如果 member_types.id 更新，自动更新 user_subscriptions.plan
-- 4. Hasura 会自动检测这个外键关系，并在 GraphQL schema 中生成关联查询
-- 5. 查询示例（GraphQL）:
--    query {
--      users_by_pk(id: "user_id") {
--        user_subscription {
--          plan
--          member_type {  # 这个关联会自动生成
--            id
--            name
--            max_fish_count
--            can_self_talk
--            can_group_chat
--            can_promote_owner
--            promote_owner_frequency
--            lead_topic_frequency
--          }
--        }
--      }
--    }

COMMIT;

