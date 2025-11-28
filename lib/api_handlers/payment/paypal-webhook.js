/**
 * PayPal Webhook 处理器
 * POST /api/payment?action=paypal-webhook
 * 
 * 处理的事件类型：
 * - BILLING.SUBSCRIPTION.ACTIVATED: 订阅激活
 * - BILLING.SUBSCRIPTION.CANCELLED: 订阅取消
 * - BILLING.SUBSCRIPTION.SUSPENDED: 订阅暂停
 * - BILLING.SUBSCRIPTION.EXPIRED: 订阅过期
 * - PAYMENT.SALE.COMPLETED: 支付完成
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const paypalClient = require('../../utils/paypal-client');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function mutateHasura(query, variables = {}) {
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
    throw new Error(`Hasura mutation failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * 处理订阅激活事件
 */
async function handleSubscriptionActivated(event) {
  const subscription = event.resource;
  const userId = subscription.custom_id;
  const subscriptionId = subscription.id;
  const planId = subscription.plan_id;

  console.log(`✅ Subscription activated: ${subscriptionId} for user ${userId}`);
  console.log(`   Plan ID: ${planId}`);

  // 从订阅信息推断套餐类型（更精确的匹配）
  let memberPlan = 'plus'; // 默认
  const planIdLower = planId.toLowerCase();
  if (planIdLower.includes('premium')) {
    memberPlan = 'premium';
  } else if (planIdLower.includes('plus')) {
    memberPlan = 'plus';
  }

  // 获取 billing cycle 信息
  let currentPeriodStart = null;
  let currentPeriodEnd = null;
  
  // 尝试从 billing_info 获取
  if (subscription.billing_info) {
    // PayPal 使用 ISO 8601 格式的时间戳
    if (subscription.billing_info.next_billing_time) {
      currentPeriodEnd = subscription.billing_info.next_billing_time;
    }
    if (subscription.billing_info.last_payment?.time) {
      currentPeriodStart = subscription.billing_info.last_payment.time;
    }
  }
  
  // 如果没有，尝试从 cycle_executions 获取
  if (!currentPeriodStart && subscription.billing_info?.cycle_executions) {
    const cycles = subscription.billing_info.cycle_executions;
    if (cycles.length > 0 && cycles[0].cycle_executed) {
      currentPeriodStart = cycles[0].cycle_executed;
    }
  }
  
  // 如果还是没有，使用当前时间作为开始时间
  if (!currentPeriodStart) {
    currentPeriodStart = new Date().toISOString();
  }
  
  // 如果没有结束时间，根据计费周期计算（默认按月）
  if (!currentPeriodEnd) {
    const startDate = new Date(currentPeriodStart);
    startDate.setMonth(startDate.getMonth() + 1);
    currentPeriodEnd = startDate.toISOString();
  }
  
  console.log(`   Plan: ${memberPlan}, Period: ${currentPeriodStart} to ${currentPeriodEnd}`);

  // 步骤1: 先禁用用户的所有活跃订阅（保留历史记录）
  const deactivateMutation = `
    mutation DeactivateUserSubscriptions($userId: String!) {
      update_user_subscriptions(
        where: { 
          user_id: { _eq: $userId }
          is_active: { _eq: true }
        }
        _set: { is_active: false }
      ) {
        affected_rows
      }
    }
  `;

  const deactivateResult = await mutateHasura(deactivateMutation, { userId });
  if (deactivateResult.update_user_subscriptions.affected_rows > 0) {
    console.log(`   Deactivated ${deactivateResult.update_user_subscriptions.affected_rows} old subscription(s)`);
  }

  // 步骤2: 创建新的订阅记录
  const insertMutation = `
    mutation InsertSubscription(
      $userId: String!
      $plan: String!
      $subscriptionId: String!
      $currentPeriodStart: timestamp
      $currentPeriodEnd: timestamp
    ) {
      insert_user_subscriptions_one(
        object: {
          user_id: $userId
          plan: $plan
          payment_provider: "paypal"
          paypal_subscription_id: $subscriptionId
          is_active: true
          current_period_start: $currentPeriodStart
          current_period_end: $currentPeriodEnd
          created_at: "now()"
        }
      ) {
        id
        user_id
        plan
        paypal_subscription_id
        current_period_start
        current_period_end
      }
    }
  `;

  const insertResult = await mutateHasura(insertMutation, {
    userId,
    plan: memberPlan,
    subscriptionId,
    currentPeriodStart: currentPeriodStart,
    currentPeriodEnd: currentPeriodEnd
  });

  console.log(`✅ Created new subscription (ID: ${insertResult.insert_user_subscriptions_one.id}) for user ${userId} - ${memberPlan}`);

  // 步骤3: 记录支付交易
  const amount = subscription.billing_info?.last_payment?.amount?.value || 0;
  const currency = subscription.billing_info?.last_payment?.amount?.currency_code || 'USD';
  
  const paymentMutation = `
    mutation InsertPayment(
      $userId: String!
      $amount: numeric!
      $currency: String!
      $subscriptionId: Int!
      $providerSubscriptionId: String!
      $plan: String!
      $transactionId: String
    ) {
      insert_payment_one(
        object: {
          user_id: $userId
          amount: $amount
          currency: $currency
          status: "completed"
          payment_provider: "paypal"
          transaction_id: $transactionId
          subscription_id: $subscriptionId
          provider_subscription_id: $providerSubscriptionId
          plan: $plan
          payment_date: "now()"
        }
      ) {
        id
      }
    }
  `;

  try {
    const paymentResult = await mutateHasura(paymentMutation, {
      userId,
      amount: parseFloat(amount),
      currency,
      subscriptionId: insertResult.insert_user_subscriptions_one.id,
      providerSubscriptionId: subscriptionId,
      plan: memberPlan,
      transactionId: null
    });
    
    if (paymentResult.insert_payment_one && paymentResult.insert_payment_one.id) {
      console.log(`✅ Recorded payment transaction (ID: ${paymentResult.insert_payment_one.id}) for subscription activation`);
    } else {
      console.error(`⚠️  Payment record insertion returned no ID:`, paymentResult);
    }
  } catch (error) {
    console.error(`❌ Failed to record payment:`, error);
    console.error(`   Error details:`, JSON.stringify(error, null, 2));
    // 不抛出错误，避免影响订阅创建流程
  }
}

/**
 * 处理订阅取消事件
 */
async function handleSubscriptionCancelled(event) {
  const subscription = event.resource;
  const userId = subscription.custom_id;
  const subscriptionId = subscription.id;

  console.log(`❌ Subscription cancelled: ${subscriptionId} for user ${userId}`);

  // 将订阅标记为不活跃
  const mutation = `
    mutation DeactivateSubscription($subscriptionId: String!) {
      update_user_subscriptions(
        where: { paypal_subscription_id: { _eq: $subscriptionId } }
        _set: { is_active: false }
      ) {
        affected_rows
      }
    }
  `;

  await mutateHasura(mutation, { subscriptionId });

  console.log(`✅ Deactivated subscription ${subscriptionId}`);
}

/**
 * 处理订阅暂停事件
 */
async function handleSubscriptionSuspended(event) {
  const subscription = event.resource;
  const subscriptionId = subscription.id;

  console.log(`⏸️  Subscription suspended: ${subscriptionId}`);

  // 将订阅标记为不活跃
  const mutation = `
    mutation SuspendSubscription($subscriptionId: String!) {
      update_user_subscriptions(
        where: { paypal_subscription_id: { _eq: $subscriptionId } }
        _set: { is_active: false }
      ) {
        affected_rows
      }
    }
  `;

  await mutateHasura(mutation, { subscriptionId });
}

/**
 * 处理订阅过期事件
 */
async function handleSubscriptionExpired(event) {
  const subscription = event.resource;
  const subscriptionId = subscription.id;

  console.log(`⏰ Subscription expired: ${subscriptionId}`);

  // 将订阅标记为不活跃
  const mutation = `
    mutation ExpireSubscription($subscriptionId: String!) {
      update_user_subscriptions(
        where: { paypal_subscription_id: { _eq: $subscriptionId } }
        _set: { is_active: false }
      ) {
        affected_rows
      }
    }
  `;

  await mutateHasura(mutation, { subscriptionId });
}

/**
 * 处理支付完成事件（续订）
 */
async function handlePaymentCompleted(event) {
  const payment = event.resource;
  const subscriptionId = payment.billing_agreement_id;

  if (!subscriptionId) {
    console.log('⚠️  Payment not linked to subscription, skipping');
    return;
  }

  console.log(`💰 Payment completed for subscription: ${subscriptionId}`);

  // 确保订阅是活跃的（处理暂停后恢复的情况）
  const mutation = `
    mutation ActivateSubscription($subscriptionId: String!) {
      update_user_subscriptions(
        where: { paypal_subscription_id: { _eq: $subscriptionId } }
        _set: { is_active: true }
      ) {
        affected_rows
        returning {
          id
          user_id
          plan
        }
      }
    }
  `;

  const result = await mutateHasura(mutation, { subscriptionId });

  // 记录支付交易
  if (result.update_user_subscriptions.returning.length > 0) {
    const subscription = result.update_user_subscriptions.returning[0];
    const amount = payment.amount?.total || 0;
    const currency = payment.amount?.currency || 'USD';
    const transactionId = payment.id;

    const paymentMutation = `
      mutation InsertPayment(
        $userId: String!
        $amount: numeric!
        $currency: String!
        $subscriptionId: Int!
        $providerSubscriptionId: String!
        $plan: String!
        $transactionId: String!
      ) {
        insert_payment_one(
          object: {
            user_id: $userId
            amount: $amount
            currency: $currency
            status: "completed"
            payment_provider: "paypal"
            transaction_id: $transactionId
            subscription_id: $subscriptionId
            provider_subscription_id: $providerSubscriptionId
            plan: $plan
            payment_date: "now()"
          }
        ) {
          id
        }
      }
    `;

    try {
      await mutateHasura(paymentMutation, {
        userId: subscription.user_id,
        amount: parseFloat(amount),
        currency,
        subscriptionId: subscription.id,
        providerSubscriptionId: subscriptionId,
        plan: subscription.plan,
        transactionId
      });
      console.log(`✅ Recorded payment transaction (${transactionId})`);
    } catch (error) {
      console.error(`⚠️  Failed to record payment: ${error.message}`);
    }
  }
}

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!paypalClient.isConfigured()) {
      return res.status(500).json({ error: 'PayPal not configured' });
    }

    const event = req.body;
    
    // 验证webhook签名
    const isValid = await paypalClient.verifyWebhookSignature(req.headers, event);
    
    if (!isValid && paypalClient.getMode() === 'production') {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log(`📨 Received PayPal webhook: ${event.event_type}`);

    // 根据事件类型处理
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(event);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(event);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(event);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(event);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(event);
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.event_type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ PayPal webhook error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

