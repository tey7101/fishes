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
    console.log('   Plan ID:', subscription.plan_id);

    // 从订阅信息推断套餐类型（更精确的匹配）
    let memberPlan = 'plus'; // 默认
    const planId = subscription.plan_id || '';
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
        console.log(`   禁用了 ${deactivateResult.update_user_subscriptions.affected_rows} 条旧订阅记录`);
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
            payment_provider
            paypal_subscription_id
            is_active
            current_period_start
            current_period_end
          }
        }
      `;

      const data = await mutateHasura(insertMutation, {
        userId,
        plan: memberPlan,
        subscriptionId,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd
      });

      console.log('✅ 订阅已同步到数据库');

      // 获取结果数据
      const resultData = data.insert_user_subscriptions_one;

      // 步骤3: 记录支付交易
      // 从 PayPal 订阅信息中获取支付金额
      let amount = 0;
      let currency = 'USD';
      
      if (subscription.billing_info?.last_payment?.amount) {
        amount = parseFloat(subscription.billing_info.last_payment.amount.value || 0);
        currency = subscription.billing_info.last_payment.amount.currency_code || 'USD';
      } else if (subscription.billing_info?.outstanding_balance?.value) {
        // 如果没有 last_payment，尝试从 outstanding_balance 获取
        amount = parseFloat(subscription.billing_info.outstanding_balance.value || 0);
        currency = subscription.billing_info.outstanding_balance.currency_code || 'USD';
      }
      
      // 如果还是没有金额，尝试从 plan 信息获取（需要额外 API 调用）
      if (amount === 0 && subscription.plan_id) {
        try {
          const planDetails = await paypalClient.callPayPalAPI(
            `/v1/billing/plans/${subscription.plan_id}`,
            'GET'
          );
          if (planDetails.billing_cycles && planDetails.billing_cycles.length > 0) {
            const cycle = planDetails.billing_cycles[0];
            if (cycle.pricing_scheme?.fixed_price) {
              amount = parseFloat(cycle.pricing_scheme.fixed_price.value || 0);
              currency = cycle.pricing_scheme.fixed_price.currency_code || 'USD';
            }
          }
        } catch (planError) {
          console.log(`   ⚠️  无法获取计划详情，使用默认金额 0: ${planError.message}`);
        }
      }
      
      console.log(`   💰 支付金额: ${amount} ${currency}`);

      const paymentMutation = `
        mutation InsertPayment(
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
            plan
          }
        }
      `;

      try {
        console.log(`   📝 准备插入支付记录: userId=${userId}, subscriptionId=${resultData.id}, amount=${amount}, currency=${currency}`);
        
        const paymentResult = await mutateHasura(paymentMutation, {
          userId,
          amount: amount,
          currency: currency,
          subscriptionId: resultData.id,
          providerSubscriptionId: subscriptionId,
          plan: memberPlan
        });
        
        if (paymentResult && paymentResult.insert_payment_one) {
          if (paymentResult.insert_payment_one.id) {
            console.log(`✅ 记录了支付交易 (ID: ${paymentResult.insert_payment_one.id}, Amount: ${amount} ${currency})`);
          } else {
            console.error(`⚠️  支付记录插入未返回ID:`, JSON.stringify(paymentResult, null, 2));
          }
        } else {
          console.error(`⚠️  支付记录插入返回空结果:`, JSON.stringify(paymentResult, null, 2));
        }
      } catch (error) {
        console.error(`❌ 记录支付失败:`, error);
        console.error(`   错误消息: ${error.message}`);
        console.error(`   错误堆栈:`, error.stack);
        // 尝试输出更详细的错误信息
        if (error.message) {
          console.error(`   完整错误:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        }
        // 不抛出错误，避免影响订阅同步流程
      }
      
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

