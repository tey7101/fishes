/**
 * 测试支付记录插入
 * 用于调试 payment 表没有记录的问题
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

async function testPaymentInsert() {
  console.log('🧪 测试支付记录插入...\n');

  try {
    // 1. 检查 payment 表是否存在且已 Track
    console.log('1️⃣ 检查 payment 表...');
    const checkTableQuery = `
      query {
        __type(name: "payment") {
          name
          fields {
            name
            type {
              name
            }
          }
        }
      }
    `;

    try {
      const tableCheck = await queryHasura(checkTableQuery);
      if (!tableCheck.__type) {
        console.error('❌ payment 表未在 GraphQL schema 中找到！');
        console.log('   请在 Hasura Console 中 Track payment 表');
        return;
      }
      console.log('✅ payment 表已 Track，包含字段:', tableCheck.__type.fields.map(f => f.name).join(', '));
    } catch (error) {
      console.error('❌ 检查 payment 表失败:', error.message);
      return;
    }

    // 2. 获取一个测试订阅ID
    console.log('\n2️⃣ 查找测试订阅...');
    const getSubscriptionQuery = `
      query {
        user_subscriptions(limit: 1, order_by: { created_at: desc }) {
          id
          user_id
          plan
          paypal_subscription_id
        }
      }
    `;

    const subData = await queryHasura(getSubscriptionQuery);
    if (!subData.user_subscriptions || subData.user_subscriptions.length === 0) {
      console.error('❌ 没有找到订阅记录，无法测试');
      return;
    }

    const testSub = subData.user_subscriptions[0];
    console.log(`✅ 找到测试订阅: ID=${testSub.id}, Plan=${testSub.plan}, User=${testSub.user_id}`);

    // 3. 尝试插入支付记录
    console.log('\n3️⃣ 测试插入支付记录...');
    const insertMutation = `
      mutation InsertTestPayment(
        $userId: String!
        $amount: numeric!
        $currency: String!
        $subscriptionId: Int!
        $providerSubscriptionId: String!
        $plan: String!
      ) {
        insert_payment_one(
          object: {
            user_id: $userId
            amount: $amount
            currency: $currency
            status: "completed"
            payment_provider: "paypal"
            subscription_id: $subscriptionId
            provider_subscription_id: $providerSubscriptionId
            plan: $plan
            payment_date: "now()"
          }
        ) {
          id
          user_id
          amount
          currency
          status
          payment_provider
          subscription_id
          plan
          created_at
        }
      }
    `;

    const insertResult = await queryHasura(insertMutation, {
      userId: testSub.user_id,
      amount: 9.99,
      currency: 'USD',
      subscriptionId: testSub.id,
      providerSubscriptionId: testSub.paypal_subscription_id || 'test-sub-' + Date.now(),
      plan: testSub.plan
    });

    if (insertResult.insert_payment_one) {
      console.log('✅ 支付记录插入成功！');
      console.log('   记录详情:', JSON.stringify(insertResult.insert_payment_one, null, 2));

      // 4. 验证记录是否存在
      console.log('\n4️⃣ 验证记录是否存在...');
      const verifyQuery = `
        query VerifyPayment($paymentId: Int!) {
          payment_by_pk(id: $paymentId) {
            id
            user_id
            amount
            plan
            status
            created_at
          }
        }
      `;

      const verifyResult = await queryHasura(verifyQuery, {
        paymentId: insertResult.insert_payment_one.id
      });

      if (verifyResult.payment_by_pk) {
        console.log('✅ 验证成功，记录存在于数据库中');
        console.log('   记录:', JSON.stringify(verifyResult.payment_by_pk, null, 2));
      } else {
        console.error('❌ 验证失败，记录不存在');
      }

      // 5. 清理测试数据
      console.log('\n5️⃣ 清理测试数据...');
      const deleteMutation = `
        mutation DeleteTestPayment($paymentId: Int!) {
          delete_payment_by_pk(id: $paymentId) {
            id
          }
        }
      `;

      await queryHasura(deleteMutation, { paymentId: insertResult.insert_payment_one.id });
      console.log('✅ 测试数据已清理');
    } else {
      console.error('❌ 支付记录插入失败，未返回数据');
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('   堆栈:', error.stack);
    }
  }
}

testPaymentInsert();


