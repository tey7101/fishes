/**
 * 检查最近的 Stripe 支付记录
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function queryHasura(query, variables = {}) {
  const response = await fetch(HASURA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

async function checkRecentPayments() {
  console.log('\n🔍 检查最近的 Stripe 支付记录\n');
  console.log('='.repeat(60));
  
  // 查询最近 5 条 Stripe 订阅
  const subscriptionsQuery = `
    query GetRecentStripeSubscriptions {
      user_subscriptions(
        where: { payment_provider: { _eq: "stripe" } }
        order_by: { created_at: desc }
        limit: 5
      ) {
        id
        user_id
        plan
        is_active
        payment_provider
        stripe_customer_id
        stripe_subscription_id
        current_period_start
        current_period_end
        created_at
      }
    }
  `;
  
  const subscriptions = await queryHasura(subscriptionsQuery);
  
  console.log('\n📋 最近的 Stripe 订阅记录：\n');
  
  if (subscriptions.user_subscriptions.length === 0) {
    console.log('   ❌ 未找到任何 Stripe 订阅记录');
  } else {
    subscriptions.user_subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. 订阅 ID: ${sub.id}`);
      console.log(`   用户 ID: ${sub.user_id}`);
      console.log(`   套餐: ${sub.plan}`);
      console.log(`   状态: ${sub.is_active ? '✅ 活跃' : '❌ 未激活'}`);
      console.log(`   Stripe Customer ID: ${sub.stripe_customer_id || '(未设置)'}`);
      console.log(`   Stripe Subscription ID: ${sub.stripe_subscription_id || '(未设置)'}`);
      console.log(`   创建时间: ${sub.created_at}`);
      console.log('');
    });
  }
  
  // 查询最近 5 条 Stripe 支付记录
  const paymentsQuery = `
    query GetRecentStripePayments {
      payment(
        where: { payment_provider: { _eq: "stripe" } }
        order_by: { payment_date: desc }
        limit: 5
      ) {
        id
        user_id
        amount
        currency
        status
        payment_provider
        plan
        billing_period
        transaction_id
        provider_subscription_id
        payment_date
      }
    }
  `;
  
  const payments = await queryHasura(paymentsQuery);
  
  console.log('='.repeat(60));
  console.log('\n💰 最近的 Stripe 支付记录：\n');
  
  if (payments.payment.length === 0) {
    console.log('   ❌ 未找到任何 Stripe 支付记录');
  } else {
    payments.payment.forEach((payment, index) => {
      console.log(`${index + 1}. 支付 ID: ${payment.id}`);
      console.log(`   用户 ID: ${payment.user_id}`);
      console.log(`   金额: ${payment.currency} ${payment.amount}`);
      console.log(`   状态: ${payment.status}`);
      console.log(`   套餐: ${payment.plan}`);
      console.log(`   周期: ${payment.billing_period || '(未设置)'}`);
      console.log(`   Transaction ID: ${payment.transaction_id || '(未设置)'}`);
      console.log(`   支付时间: ${payment.payment_date}`);
      console.log('');
    });
  }
  
  console.log('='.repeat(60) + '\n');
}

checkRecentPayments().catch(err => {
  console.error('❌ 查询失败:', err.message);
  process.exit(1);
});

