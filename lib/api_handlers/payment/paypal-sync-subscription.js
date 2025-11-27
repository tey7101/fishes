/**
 * 手动同步PayPal订阅状态
 * POST /api/payment?action=paypal-sync-subscription
 * Body: { subscriptionId, userId }
 * 
 * 用于本地开发环境，当webhook无法访问时手动同步订阅状态
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const paypalClient = require('../../utils/paypal-client');

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
    throw new Error(`Hasura query failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

async function mutateHasura(query, variables = {}) {
  return queryHasura(query, variables);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId, userId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!paypalClient.isConfigured()) {
      return res.status(500).json({ error: 'PayPal not configured' });
    }

    console.log(`🔄 同步PayPal订阅: ${subscriptionId} for user ${userId}`);

    // 从PayPal获取订阅详情
    const subscription = await paypalClient.callPayPalAPI(
      `/v1/billing/subscriptions/${subscriptionId}`,
      'GET'
    );

    console.log('📦 PayPal订阅状态:', subscription.status);

    // 从订阅信息推断套餐类型
    let memberPlan = 'plus'; // 默认
    const planId = subscription.plan_id || '';
    
    if (planId.includes('PREMIUM') || planId.toLowerCase().includes('premium')) {
      memberPlan = 'premium';
    } else if (planId.includes('PLUS') || planId.toLowerCase().includes('plus')) {
      memberPlan = 'plus';
    }

    // 检查订阅状态
    if (subscription.status === 'ACTIVE' || subscription.status === 'APPROVED') {
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
            payment_provider
            paypal_subscription_id
            is_active
          }
        }
      `;

      const data = await mutateHasura(mutation, {
        userId,
        plan: memberPlan,
        subscriptionId
      });

      console.log('✅ 订阅已同步到数据库');

      return res.status(200).json({
        success: true,
        message: 'Subscription synced successfully',
        subscription: {
          id: data.insert_user_subscriptions_one.id,
          userId: data.insert_user_subscriptions_one.user_id,
          plan: data.insert_user_subscriptions_one.plan,
          provider: data.insert_user_subscriptions_one.payment_provider,
          subscriptionId: data.insert_user_subscriptions_one.paypal_subscription_id,
          isActive: data.insert_user_subscriptions_one.is_active
        },
        paypalStatus: subscription.status
      });
    } else {
      return res.status(400).json({
        error: 'Subscription not active',
        paypalStatus: subscription.status,
        message: `Subscription status is ${subscription.status}, expected ACTIVE or APPROVED`
      });
    }

  } catch (error) {
    console.error('❌ Sync subscription error:', error);
    return res.status(500).json({
      error: 'Failed to sync subscription',
      message: error.message
    });
  }
};

