/**
 * 检查测试用户的支付记录
 */

require('dotenv').config({ path: '.env.local' });
delete require.cache[require.resolve('dotenv')];
require('dotenv').config({ path: '.env.local' });

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function queryHasura(query, variables = {}) {
  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }
  return result.data;
}

async function checkPayments() {
  const testUserId = '11312701-f1d2-43f8-a13d-260eac812b7a';

  console.log('🔍 检查测试用户的支付记录...\n');

  // 查询订阅记录
  const subscriptionsQuery = `
    query GetSubscriptions($userId: String!) {
      user_subscriptions(
        where: { user_id: { _eq: $userId } }
        order_by: { created_at: desc }
      ) {
        id
        plan
        is_active
        created_at
        stripe_customer_id
        stripe_subscription_id
      }
    }
  `;

  const subsData = await queryHasura(subscriptionsQuery, { userId: testUserId });
  
  console.log('📋 订阅记录:');
  if (subsData.user_subscriptions.length === 0) {
    console.log('   ❌ 没有找到任何订阅记录');
  } else {
    subsData.user_subscriptions.forEach((sub, index) => {
      console.log(`\n   ${index + 1}. 订阅 ID: ${sub.id}`);
      console.log(`      Plan: ${sub.plan}`);
      console.log(`      Active: ${sub.is_active ? '✅' : '❌'}`);
      console.log(`      Created: ${sub.created_at}`);
      console.log(`      Stripe Customer: ${sub.stripe_customer_id || 'N/A'}`);
      console.log(`      Stripe Subscription: ${sub.stripe_subscription_id || 'N/A'}`);
    });
  }

  // 查询支付记录
  const paymentsQuery = `
    query GetPayments($userId: String!) {
      payment(
        where: { user_id: { _eq: $userId } }
        order_by: { created_at: desc }
      ) {
        id
        plan
        amount
        currency
        status
        payment_provider
        transaction_id
        created_at
      }
    }
  `;

  const paymentsData = await queryHasura(paymentsQuery, { userId: testUserId });
  
  console.log('\n\n💳 支付记录:');
  if (paymentsData.payment.length === 0) {
    console.log('   ❌ 没有找到任何支付记录');
  } else {
    paymentsData.payment.forEach((payment, index) => {
      console.log(`\n   ${index + 1}. 支付 ID: ${payment.id}`);
      console.log(`      Plan: ${payment.plan}`);
      console.log(`      Amount: ${payment.amount} ${payment.currency}`);
      console.log(`      Status: ${payment.status}`);
      console.log(`      Provider: ${payment.payment_provider}`);
      console.log(`      Transaction: ${payment.transaction_id}`);
      console.log(`      Created: ${payment.created_at}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 总结');
  console.log('='.repeat(50));
  console.log(`订阅记录总数: ${subsData.user_subscriptions.length}`);
  console.log(`支付记录总数: ${paymentsData.payment.length}`);
  console.log(`活跃订阅: ${subsData.user_subscriptions.filter(s => s.is_active).length}`);
}

checkPayments()
  .catch(error => {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  });


