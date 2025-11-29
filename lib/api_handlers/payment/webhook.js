/**
 * Stripe Webhook处理器
 * POST /api/payment/webhook
 * 
 * 功能：
 * 1. 验证Stripe webhook签名
 * 2. 处理 checkout.session.completed 事件
 * 3. 更新 user_subscriptions 表
 * 4. 记录 stripe_customer_id 和 stripe_subscription_id
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const Stripe = require('stripe');
const stripeConfig = require('../../stripe-config');

const STRIPE_SECRET_KEY = stripeConfig.secretKey;
const STRIPE_WEBHOOK_SECRET = stripeConfig.webhookSecret;
const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

// 验证环境变量
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set');
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.error('❌ STRIPE_WEBHOOK_SECRET not set');
}

if (!HASURA_GRAPHQL_ENDPOINT || !HASURA_ADMIN_SECRET) {
  console.error('❌ Hasura configuration missing');
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

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

async function updateUserSubscription(userId, planId, stripeCustomerId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd, amount = 0, currency = 'USD') {
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

  const deactivateResult = await queryHasura(deactivateMutation, { userId });
  if (deactivateResult.update_user_subscriptions.affected_rows > 0) {
    console.log(`   Deactivated ${deactivateResult.update_user_subscriptions.affected_rows} old subscription(s)`);
  }

  // 步骤2: 创建新的订阅记录
  const insertMutation = `
    mutation InsertUserSubscription(
      $userId: String!
      $planId: String!
      $stripeCustomerId: String
      $stripeSubscriptionId: String
      $currentPeriodStart: timestamp
      $currentPeriodEnd: timestamp
    ) {
      insert_user_subscriptions_one(
        object: {
          user_id: $userId
          plan: $planId
          is_active: true
          payment_provider: "stripe"
          stripe_customer_id: $stripeCustomerId
          stripe_subscription_id: $stripeSubscriptionId
          current_period_start: $currentPeriodStart
          current_period_end: $currentPeriodEnd
        }
      ) {
        id
        user_id
        plan
        is_active
        stripe_customer_id
        stripe_subscription_id
      }
    }
  `;

  const result = await queryHasura(insertMutation, {
    userId,
    planId,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
  });

  // 步骤3: 记录支付交易
  const paymentMutation = `
    mutation InsertPayment(
      $userId: String!
      $amount: numeric!
      $currency: String!
      $subscriptionId: Int!
      $providerSubscriptionId: String
      $plan: String!
    ) {
      insert_payment_one(
        object: {
          user_id: $userId
          amount: $amount
          currency: $currency
          status: "completed"
          payment_provider: "stripe"
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
    await queryHasura(paymentMutation, {
      userId,
      amount: parseFloat(amount),
      currency,
      subscriptionId: result.insert_user_subscriptions_one.id,
      providerSubscriptionId: stripeSubscriptionId,
      plan: planId
    });
    console.log(`✅ Recorded payment transaction for Stripe subscription`);
  } catch (error) {
    console.error(`⚠️  Failed to record payment: ${error.message}`);
  }

  return result;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // 验证webhook签名
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // 处理事件
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // 获取完整的session对象（包含subscription信息）
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['subscription']
        });

        const userId = session.client_reference_id || session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
          console.error('❌ Missing userId or planId in session metadata');
          return res.status(400).json({ error: 'Missing required metadata' });
        }

        const subscription = fullSession.subscription;
        let stripeCustomerId = session.customer;
        let stripeSubscriptionId = subscription?.id || null;
        let currentPeriodStart = null;
        let currentPeriodEnd = null;
        let amount = session.amount_total ? session.amount_total / 100 : 0;
        let currency = session.currency || 'USD';

        // 如果是订阅，获取订阅详情
        if (subscription && typeof subscription === 'object') {
          stripeSubscriptionId = subscription.id;
          currentPeriodStart = subscription.current_period_start;
          currentPeriodEnd = subscription.current_period_end;
        } else if (typeof subscription === 'string') {
          // 如果subscription是字符串ID，需要获取详情
          const sub = await stripe.subscriptions.retrieve(subscription);
          stripeCustomerId = sub.customer;
          stripeSubscriptionId = sub.id;
          currentPeriodStart = sub.current_period_start;
          currentPeriodEnd = sub.current_period_end;
        }

        // 更新用户订阅（包含支付记录）
        await updateUserSubscription(
          userId,
          planId,
          stripeCustomerId,
          stripeSubscriptionId,
          currentPeriodStart,
          currentPeriodEnd,
          amount,
          currency.toUpperCase()
        );

        console.log(`✅ Subscription activated for user ${userId}, plan: ${planId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        // 查找订阅记录
        const query = `
          query FindSubscriptionByStripeId($stripeSubscriptionId: String!) {
            user_subscriptions(
              where: { 
                stripe_subscription_id: { _eq: $stripeSubscriptionId }
                is_active: { _eq: true }
              }
              order_by: { created_at: desc }
              limit: 1
            ) {
              id
              user_id
              plan
            }
          }
        `;

        const data = await queryHasura(query, { stripeSubscriptionId: invoice.subscription });
        
        if (data.user_subscriptions && data.user_subscriptions.length > 0) {
          const subscription = data.user_subscriptions[0];
          const amount = invoice.amount_paid / 100;
          const currency = invoice.currency.toUpperCase();
          
          // 记录支付交易
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
                  payment_provider: "stripe"
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

          await queryHasura(paymentMutation, {
            userId: subscription.user_id,
            amount: parseFloat(amount),
            currency,
            subscriptionId: subscription.id,
            providerSubscriptionId: invoice.subscription,
            plan: subscription.plan,
            transactionId: invoice.id
          });

          console.log(`✅ Recorded recurring payment for user ${subscription.user_id}, invoice: ${invoice.id}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // 查找用户订阅记录
        const query = `
          query FindSubscriptionByStripeId($stripeSubscriptionId: String!) {
            user_subscriptions(where: { stripe_subscription_id: { _eq: $stripeSubscriptionId } }) {
              user_id
              plan
            }
          }
        `;

        const data = await queryHasura(query, { stripeSubscriptionId: subscription.id });
        
        if (data.user_subscriptions && data.user_subscriptions.length > 0) {
          const userSub = data.user_subscriptions[0];
          
          // 更新订阅信息
          const updateMutation = `
            mutation UpdateSubscription(
              $userId: String!
              $currentPeriodStart: timestamp
              $currentPeriodEnd: timestamp
              $isActive: Boolean
            ) {
              update_user_subscriptions(
                where: { user_id: { _eq: $userId } }
                _set: {
                  current_period_start: $currentPeriodStart
                  current_period_end: $currentPeriodEnd
                  is_active: $isActive
                  updated_at: "now()"
                }
              ) {
                affected_rows
              }
            }
          `;

          await queryHasura(updateMutation, {
            userId: userSub.user_id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            isActive: subscription.status === 'active'
          });

          console.log(`✅ Subscription updated for user ${userSub.user_id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // 查找并停用订阅
        const query = `
          query FindSubscriptionByStripeId($stripeSubscriptionId: String!) {
            user_subscriptions(where: { stripe_subscription_id: { _eq: $stripeSubscriptionId } }) {
              user_id
            }
          }
        `;

        const data = await queryHasura(query, { stripeSubscriptionId: subscription.id });
        
        if (data.user_subscriptions && data.user_subscriptions.length > 0) {
          const userSub = data.user_subscriptions[0];
          
          // 将用户降级为free
          const updateMutation = `
            mutation CancelSubscription($userId: String!) {
              update_user_subscriptions(
                where: { user_id: { _eq: $userId } }
                _set: {
                  plan: "free"
                  is_active: false
                  updated_at: "now()"
                }
              ) {
                affected_rows
              }
            }
          `;

          await queryHasura(updateMutation, { userId: userSub.user_id });
          console.log(`✅ Subscription canceled for user ${userSub.user_id}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

