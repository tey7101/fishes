/**
 * 为现有订阅记录补充支付记录
 * 用于修复历史数据
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const paypalClient = require('./lib/utils/paypal-client');

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

async function backfillPaymentRecords() {
  console.log('🔄 开始为现有订阅补充支付记录...\n');

  try {
    // 1. 查询所有活跃订阅
    const subscriptionsQuery = `
      query GetActiveSubscriptions {
        user_subscriptions(
          where: {
            is_active: { _eq: true }
          }
          order_by: { created_at: desc }
        ) {
          id
          user_id
          plan
          payment_provider
          paypal_subscription_id
          stripe_subscription_id
          created_at
          current_period_start
          current_period_end
          payments {
            id
          }
        }
      }
    `;

    const subsData = await queryHasura(subscriptionsQuery);
    const subscriptions = subsData.user_subscriptions || [];

    console.log(`✅ 找到 ${subscriptions.length} 条需要补充支付记录的订阅\n`);

    if (subscriptions.length === 0) {
      console.log('✅ 所有订阅都有支付记录，无需补充');
      return;
    }

    // 2. 过滤出没有支付记录的订阅
    const subscriptionsWithoutPayments = subscriptions.filter(
      sub => !sub.payments || sub.payments.length === 0
    );

    console.log(`   其中 ${subscriptionsWithoutPayments.length} 条没有支付记录\n`);

    if (subscriptionsWithoutPayments.length === 0) {
      console.log('✅ 所有活跃订阅都有支付记录，无需补充');
      return;
    }

    // 3. 为每条订阅创建支付记录
    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptionsWithoutPayments) {
      console.log(`\n📋 处理订阅 ID ${sub.id}:`);
      console.log(`   用户: ${sub.user_id}`);
      console.log(`   套餐: ${sub.plan}`);
      console.log(`   支付商: ${sub.payment_provider}`);

      // 跳过 free 套餐
      if (sub.plan === 'free' || sub.plan === 'admin') {
        console.log(`   ⏭️  跳过 ${sub.plan} 套餐（无需支付）`);
        continue;
      }

      let amount = 0;
      let currency = 'USD';

      // 如果是 PayPal，尝试从 PayPal API 获取金额
      if (sub.payment_provider === 'paypal' && sub.paypal_subscription_id) {
        try {
          console.log(`   🔍 查询 PayPal 订阅信息: ${sub.paypal_subscription_id}`);
          const paypalSub = await paypalClient.callPayPalAPI(
            `/v1/billing/subscriptions/${sub.paypal_subscription_id}`,
            'GET'
          );

          // 从 PayPal 订阅信息获取金额
          if (paypalSub.billing_info?.last_payment?.amount) {
            amount = parseFloat(paypalSub.billing_info.last_payment.amount.value || 0);
            currency = paypalSub.billing_info.last_payment.amount.currency_code || 'USD';
          } else if (paypalSub.plan_id) {
            // 尝试从 plan 获取
            const planDetails = await paypalClient.callPayPalAPI(
              `/v1/billing/plans/${paypalSub.plan_id}`,
              'GET'
            );
            if (planDetails.billing_cycles && planDetails.billing_cycles.length > 0) {
              const cycle = planDetails.billing_cycles[0];
              if (cycle.pricing_scheme?.fixed_price) {
                amount = parseFloat(cycle.pricing_scheme.fixed_price.value || 0);
                currency = cycle.pricing_scheme.fixed_price.currency_code || 'USD';
              }
            }
          }

          console.log(`   💰 从 PayPal 获取金额: ${amount} ${currency}`);
        } catch (paypalError) {
          console.log(`   ⚠️  无法从 PayPal 获取金额: ${paypalError.message}`);
          // 使用默认金额
          amount = sub.plan === 'premium' ? 19.99 : 9.99;
        }
      } else {
        // 使用默认金额
        amount = sub.plan === 'premium' ? 19.99 : 9.99;
        console.log(`   💰 使用默认金额: ${amount} ${currency}`);
      }

      // 创建支付记录
      const paymentMutation = `
        mutation InsertPayment(
          $userId: String!
          $amount: numeric!
          $currency: String!
          $subscriptionId: Int!
          $providerSubscriptionId: String
          $plan: String!
          $paymentProvider: String!
          $paymentDate: timestamp
        ) {
          insert_payment_one(
            object: {
              user_id: $userId
              amount: $amount
              currency: $currency
              status: "completed"
              payment_provider: $paymentProvider
              subscription_id: $subscriptionId
              provider_subscription_id: $providerSubscriptionId
              plan: $plan
              payment_date: $paymentDate
            }
          ) {
            id
            amount
            currency
            status
            payment_provider
          }
        }
      `;

      try {
        const paymentResult = await queryHasura(paymentMutation, {
          userId: sub.user_id,
          amount: amount,
          currency: currency,
          subscriptionId: sub.id,
          providerSubscriptionId: sub.paypal_subscription_id || sub.stripe_subscription_id || null,
          plan: sub.plan,
          paymentProvider: sub.payment_provider,
          paymentDate: sub.current_period_start || sub.created_at
        });

        if (paymentResult.insert_payment_one && paymentResult.insert_payment_one.id) {
          console.log(`   ✅ 支付记录已创建 (ID: ${paymentResult.insert_payment_one.id})`);
          successCount++;
        } else {
          console.error(`   ❌ 支付记录创建失败，未返回ID`);
          failCount++;
        }
      } catch (error) {
        console.error(`   ❌ 创建支付记录失败: ${error.message}`);
        console.error(`   错误详情:`, error);
        failCount++;
      }
    }

    console.log(`\n\n📊 补充完成:`);
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失败: ${failCount}`);
    console.log(`   📈 总计: ${subscriptions.length}`);

  } catch (error) {
    console.error('\n❌ 补充失败:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
  }
}

backfillPaymentRecords();

