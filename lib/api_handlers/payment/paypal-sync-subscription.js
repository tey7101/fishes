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
      // 先确保用户存在
      const userCheckQuery = `
        query CheckUser($userId: String!) {
          users(where: {id: {_eq: $userId}}) {
            id
            email
          }
        }
      `;

      const userData = await queryHasura(userCheckQuery, { userId });
      
      if (userData.users.length === 0) {
        // 用户不存在，创建测试用户
        console.log(`🔧 用户 ${userId} 不存在，创建测试用户...`);
        
        const createUserMutation = `
          mutation CreateTestUser($userId: String!) {
            insert_users_one(
              object: {
                id: $userId
                email: $userId
                nick_name: $userId
                user_language: "English"
                fish_talk: false
                is_banned: false
                reputation_score: 0
                total_fish_created: 0
                total_votes_received: 0
                created_at: "now()"
              }
            ) {
              id
              email
              nick_name
              fish_talk
            }
          }
        `;
        
        await mutateHasura(createUserMutation, { userId });
        console.log(`✅ 测试用户 ${userId} 已创建`);
      }

      // 然后检查用户是否已有订阅记录
      const checkQuery = `
        query CheckUserSubscription($userId: String!) {
          user_subscriptions(where: {user_id: {_eq: $userId}}) {
            id
            user_id
            plan
            payment_provider
            is_active
          }
        }
      `;

      const existingData = await queryHasura(checkQuery, { userId });
      
      let mutation, variables;
      
      if (existingData.user_subscriptions.length > 0) {
        // 更新现有订阅
        const existingId = existingData.user_subscriptions[0].id;
        mutation = `
          mutation UpdateSubscription($id: uuid!, $plan: String!, $subscriptionId: String!) {
            update_user_subscriptions_by_pk(
              pk_columns: {id: $id}
              _set: {
                plan: $plan
                payment_provider: "paypal"
                paypal_subscription_id: $subscriptionId
                is_active: true
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
        variables = { id: existingId, plan: memberPlan, subscriptionId };
      } else {
        // 创建新订阅
        mutation = `
          mutation CreateSubscription($userId: String!, $plan: String!, $subscriptionId: String!) {
            insert_user_subscriptions_one(
              object: {
                user_id: $userId
                plan: $plan
                payment_provider: "paypal"
                paypal_subscription_id: $subscriptionId
                is_active: true
                created_at: "now()"
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
        variables = { userId, plan: memberPlan, subscriptionId };
      }

      const data = await mutateHasura(mutation, variables);

      console.log('✅ 订阅已同步到数据库');

      // 获取结果数据（处理更新和插入的不同返回结构）
      const resultData = data.update_user_subscriptions_by_pk || data.insert_user_subscriptions_one;
      
      return res.status(200).json({
        success: true,
        message: 'Subscription synced successfully',
        subscription: {
          id: resultData.id,
          userId: resultData.user_id,
          plan: resultData.plan,
          provider: resultData.payment_provider,
          subscriptionId: resultData.paypal_subscription_id,
          isActive: resultData.is_active
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

