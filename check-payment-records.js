/**
 * 检查订阅记录和支付记录的关联情况
 * 用于诊断为什么 payment 表没有记录
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

async function checkPaymentRecords() {
  console.log('🔍 检查订阅记录和支付记录关联情况...\n');

  try {
    // 1. 查询最近的订阅记录
    console.log('1️⃣ 查询最近的订阅记录（最近10条）...');
    const subscriptionsQuery = `
      query GetRecentSubscriptions {
        user_subscriptions(
          order_by: { created_at: desc }
          limit: 10
        ) {
          id
          user_id
          plan
          payment_provider
          paypal_subscription_id
          stripe_subscription_id
          is_active
          created_at
          updated_at
          current_period_start
          current_period_end
          payments {
            id
            amount
            currency
            status
            payment_date
            created_at
          }
        }
      }
    `;

    const subsData = await queryHasura(subscriptionsQuery);
    const subscriptions = subsData.user_subscriptions || [];

    console.log(`✅ 找到 ${subscriptions.length} 条订阅记录\n`);

    // 2. 分析每条订阅记录
    let subscriptionsWithPayments = 0;
    let subscriptionsWithoutPayments = 0;

    subscriptions.forEach((sub, index) => {
      console.log(`\n📋 订阅记录 #${index + 1}:`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   用户ID: ${sub.user_id}`);
      console.log(`   套餐: ${sub.plan}`);
      console.log(`   支付商: ${sub.payment_provider}`);
      console.log(`   PayPal订阅ID: ${sub.paypal_subscription_id || 'NULL'}`);
      console.log(`   是否活跃: ${sub.is_active}`);
      console.log(`   创建时间: ${sub.created_at}`);
      console.log(`   支付记录数: ${sub.payments ? sub.payments.length : 0}`);

      if (sub.payments && sub.payments.length > 0) {
        subscriptionsWithPayments++;
        console.log(`   ✅ 有支付记录:`);
        sub.payments.forEach((payment, pIndex) => {
          console.log(`      ${pIndex + 1}. ID=${payment.id}, 金额=${payment.amount} ${payment.currency}, 状态=${payment.status}, 时间=${payment.payment_date || payment.created_at}`);
        });
      } else {
        subscriptionsWithoutPayments++;
        console.log(`   ❌ 没有支付记录`);
      }
    });

    // 3. 统计支付记录总数
    console.log(`\n\n📊 统计结果:`);
    console.log(`   总订阅数: ${subscriptions.length}`);
    console.log(`   有支付记录的订阅: ${subscriptionsWithPayments}`);
    console.log(`   没有支付记录的订阅: ${subscriptionsWithoutPayments}`);

    // 4. 查询所有支付记录
    console.log(`\n\n2️⃣ 查询所有支付记录...`);
    const paymentsQuery = `
      query GetAllPayments {
        payment(
          order_by: { created_at: desc }
          limit: 20
        ) {
          id
          user_id
          amount
          currency
          status
          payment_provider
          plan
          subscription_id
          provider_subscription_id
          payment_date
          created_at
          subscription {
            id
            plan
            is_active
          }
        }
      }
    `;

    const paymentsData = await queryHasura(paymentsQuery);
    const payments = paymentsData.payment || [];

    console.log(`✅ 找到 ${payments.length} 条支付记录\n`);

    if (payments.length > 0) {
      console.log(`最近的支付记录:`);
      payments.slice(0, 5).forEach((payment, index) => {
        console.log(`\n   ${index + 1}. ID=${payment.id}`);
        console.log(`      用户ID: ${payment.user_id}`);
        console.log(`      金额: ${payment.amount} ${payment.currency}`);
        console.log(`      状态: ${payment.status}`);
        console.log(`      支付商: ${payment.payment_provider}`);
        console.log(`      套餐: ${payment.plan}`);
        console.log(`      订阅ID: ${payment.subscription_id || 'NULL'}`);
        console.log(`      创建时间: ${payment.created_at}`);
      });
    } else {
      console.log(`❌ 没有找到任何支付记录！`);
    }

    // 5. 检查没有支付记录的订阅
    if (subscriptionsWithoutPayments > 0) {
      console.log(`\n\n⚠️  发现 ${subscriptionsWithoutPayments} 条订阅没有支付记录:`);
      subscriptions.forEach((sub, index) => {
        if (!sub.payments || sub.payments.length === 0) {
          console.log(`\n   订阅 ID ${sub.id}:`);
          console.log(`      - 用户: ${sub.user_id}`);
          console.log(`      - 套餐: ${sub.plan}`);
          console.log(`      - 支付商: ${sub.payment_provider}`);
          console.log(`      - PayPal订阅ID: ${sub.paypal_subscription_id || 'NULL'}`);
          console.log(`      - 创建时间: ${sub.created_at}`);
          console.log(`      - 是否活跃: ${sub.is_active}`);
        }
      });
    }

  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
  }
}

checkPaymentRecords();


