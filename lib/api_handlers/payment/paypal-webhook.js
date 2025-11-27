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

  // 从订阅信息推断套餐类型
  let memberPlan = 'plus'; // 默认
  if (planId.includes('PREMIUM') || subscription.plan_id.toLowerCase().includes('premium')) {
    memberPlan = 'premium';
  } else if (planId.includes('PLUS') || subscription.plan_id.toLowerCase().includes('plus')) {
    memberPlan = 'plus';
  }

  // 在数据库中创建或更新订阅记录
  const mutation = `
    mutation UpsertSubscription($userId: String!, $plan: String!, $subscriptionId: String!) {
      insert_user_subscriptions_one(
        object: {
          user_id: $userId
          plan: $plan
          payment_provider: "paypal"
          paypal_subscription_id: $subscriptionId
          is_active: true
          created_at: "now()"
        }
        on_conflict: {
          constraint: user_subscriptions_user_id_key
          update_columns: [plan, payment_provider, paypal_subscription_id, is_active]
        }
      ) {
        id
        user_id
        plan
      }
    }
  `;

  await mutateHasura(mutation, {
    userId,
    plan: memberPlan,
    subscriptionId
  });

  console.log(`✅ Updated subscription for user ${userId} to ${memberPlan}`);
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
      }
    }
  `;

  await mutateHasura(mutation, { subscriptionId });
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

