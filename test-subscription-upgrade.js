/**
 * 测试订阅升级流程
 * 模拟 Plus 用户升级到 Premium
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function queryHasura(query, variables = {}) {
  if (!HASURA_GRAPHQL_ENDPOINT || !HASURA_ADMIN_SECRET) {
    throw new Error('Hasura configuration missing');
  }

  const response = await fetch(HASURA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
  }

  return result.data;
}

async function testUpgrade() {
  console.log('🧪 测试订阅升级流程...\n');

  try {
    // 1. 查找一个 Plus 用户
    console.log('1️⃣ 查找 Plus 用户...');
    const findUserQuery = `
      query FindPlusUser {
        user_subscriptions(
          where: {
            plan: { _eq: "plus" }
            is_active: { _eq: true }
          }
          limit: 1
        ) {
          id
          user_id
          plan
          paypal_subscription_id
          stripe_subscription_id
          payment_provider
          created_at
        }
      }
    `;

    const userData = await queryHasura(findUserQuery);
    if (!userData.user_subscriptions || userData.user_subscriptions.length === 0) {
      console.log('❌ 没有找到活跃的 Plus 用户');
      console.log('   创建测试用户...');
      
      // 创建测试用户和订阅
      const testUserId = 'test-upgrade-' + Date.now();
      const createUserMutation = `
        mutation CreateTestUser($userId: String!) {
          insert_users_one(
            object: {
              id: $userId
              email: "test-upgrade@example.com"
            }
          ) {
            id
          }
        }
      `;
      
      await queryHasura(createUserMutation, { userId: testUserId });
      
      const createSubMutation = `
        mutation CreateTestSubscription($userId: String!) {
          insert_user_subscriptions_one(
            object: {
              user_id: $userId
              plan: "plus"
              payment_provider: "paypal"
              paypal_subscription_id: "test-plus-sub-${Date.now()}"
              is_active: true
            }
          ) {
            id
            user_id
            plan
          }
        }
      `;
      
      const subData = await queryHasura(createSubMutation, { userId: testUserId });
      console.log(`✅ 创建测试 Plus 用户: ${testUserId}`);
      console.log(`   订阅ID: ${subData.insert_user_subscriptions_one.id}`);
      
      // 重新查询
      const retryData = await queryHasura(findUserQuery);
      if (!retryData.user_subscriptions || retryData.user_subscriptions.length === 0) {
        console.error('❌ 无法创建测试用户');
        return;
      }
      userData.user_subscriptions = retryData.user_subscriptions;
    }

    const plusSub = userData.user_subscriptions[0];
    console.log(`✅ 找到 Plus 用户: ${plusSub.user_id}`);
    console.log(`   当前订阅ID: ${plusSub.id}`);
    console.log(`   Plan: ${plusSub.plan}`);
    console.log(`   Provider: ${plusSub.payment_provider}`);

    // 2. 模拟升级流程
    console.log('\n2️⃣ 模拟升级到 Premium...');
    
    // 步骤1: 禁用旧订阅
    const deactivateMutation = `
      mutation DeactivateOldSubscription($userId: String!) {
        update_user_subscriptions(
          where: {
            user_id: { _eq: $userId }
            is_active: { _eq: true }
          }
          _set: { is_active: false }
        ) {
          affected_rows
          returning {
            id
            plan
          }
        }
      }
    `;

    const deactivateResult = await queryHasura(deactivateMutation, {
      userId: plusSub.user_id
    });
    
    console.log(`   ✅ 禁用了 ${deactivateResult.update_user_subscriptions.affected_rows} 条旧订阅`);
    deactivateResult.update_user_subscriptions.returning.forEach(sub => {
      console.log(`      - 订阅 ID ${sub.id}, Plan: ${sub.plan}`);
    });

    // 步骤2: 创建新的 Premium 订阅
    const newPremiumSubId = 'test-premium-sub-' + Date.now();
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const insertMutation = `
      mutation CreatePremiumSubscription(
        $userId: String!
        $subscriptionId: String!
        $currentPeriodStart: timestamp!
        $currentPeriodEnd: timestamp!
      ) {
        insert_user_subscriptions_one(
          object: {
            user_id: $userId
            plan: "premium"
            payment_provider: "paypal"
            paypal_subscription_id: $subscriptionId
            is_active: true
            current_period_start: $currentPeriodStart
            current_period_end: $currentPeriodEnd
          }
        ) {
          id
          user_id
          plan
          is_active
          paypal_subscription_id
          current_period_start
          current_period_end
        }
      }
    `;

    const insertResult = await queryHasura(insertMutation, {
      userId: plusSub.user_id,
      subscriptionId: newPremiumSubId,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: nextMonth.toISOString()
    });

    console.log(`   ✅ 创建了新的 Premium 订阅:`);
    console.log(`      - 订阅 ID: ${insertResult.insert_user_subscriptions_one.id}`);
    console.log(`      - Plan: ${insertResult.insert_user_subscriptions_one.plan}`);
    console.log(`      - PayPal订阅ID: ${insertResult.insert_user_subscriptions_one.paypal_subscription_id}`);

    // 步骤3: 记录支付
    const paymentMutation = `
      mutation RecordPremiumPayment(
        $userId: String!
        $subscriptionId: Int!
        $providerSubscriptionId: String!
      ) {
        insert_payment_one(
          object: {
            user_id: $userId
            amount: 19.99
            currency: "USD"
            status: "completed"
            payment_provider: "paypal"
            subscription_id: $subscriptionId
            provider_subscription_id: $providerSubscriptionId
            plan: "premium"
            payment_date: "now()"
          }
        ) {
          id
          amount
          plan
          status
        }
      }
    `;

    const paymentResult = await queryHasura(paymentMutation, {
      userId: plusSub.user_id,
      subscriptionId: insertResult.insert_user_subscriptions_one.id,
      providerSubscriptionId: newPremiumSubId
    });

    console.log(`   ✅ 记录了 Premium 支付:`);
    console.log(`      - 支付 ID: ${paymentResult.insert_payment_one.id}`);
    console.log(`      - 金额: ${paymentResult.insert_payment_one.amount} USD`);
    console.log(`      - Plan: ${paymentResult.insert_payment_one.plan}`);

    // 3. 验证升级结果
    console.log('\n3️⃣ 验证升级结果...');
    const verifyQuery = `
      query VerifyUpgrade($userId: String!) {
        user_subscriptions(
          where: { user_id: { _eq: $userId } }
          order_by: { created_at: desc }
        ) {
          id
          plan
          is_active
          paypal_subscription_id
          created_at
          payments {
            id
            amount
            plan
            status
          }
        }
      }
    `;

    const verifyResult = await queryHasura(verifyQuery, {
      userId: plusSub.user_id
    });

    console.log(`   用户 ${plusSub.user_id} 的订阅列表:`);
    verifyResult.user_subscriptions.forEach((sub, index) => {
      console.log(`\n   ${index + 1}. 订阅 ID ${sub.id}:`);
      console.log(`      - Plan: ${sub.plan}`);
      console.log(`      - 活跃: ${sub.is_active}`);
      console.log(`      - PayPal订阅ID: ${sub.paypal_subscription_id}`);
      console.log(`      - 创建时间: ${sub.created_at}`);
      console.log(`      - 支付记录数: ${sub.payments.length}`);
      if (sub.payments.length > 0) {
        sub.payments.forEach((payment, pIndex) => {
          console.log(`        ${pIndex + 1}. 金额: ${payment.amount}, Plan: ${payment.plan}, 状态: ${payment.status}`);
        });
      }
    });

    console.log('\n✅ 升级流程测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
  }
}

testUpgrade();

