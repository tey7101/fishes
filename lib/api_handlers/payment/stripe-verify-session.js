/**
 * Stripe Session 验证处理器
 * POST /api/payment?action=stripe-verify-session
 * Body: { userId, sessionId }
 * 
 * 功能：
 * 1. 验证 Stripe Checkout Session
 * 2. 获取订阅信息
 * 3. 返回支付状态
 * 
 * 注意：实际的订阅创建由 webhook 处理，这里只是验证 Session 状态
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripeConfig = require('../../stripe-config');

const STRIPE_SECRET_KEY = stripeConfig.secretKey;

// 验证环境变量
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set');
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    const { userId, sessionId } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({ error: 'Missing userId or sessionId' });
    }

    console.log('🔍 Verifying Stripe session:', sessionId, 'for user:', userId);

    // 获取 Checkout Session 详情
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items']
    });

    console.log('📦 Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      customer: session.customer,
      subscription: session.subscription?.id || session.subscription,
      metadata: session.metadata
    });

    // 验证 Session 属于该用户
    if (session.client_reference_id !== userId && session.metadata?.userId !== userId) {
      console.error('❌ Session does not belong to user');
      return res.status(403).json({ error: 'Session does not belong to user' });
    }

    // 检查支付状态
    if (session.payment_status !== 'paid') {
      console.warn('⚠️ Payment not completed:', session.payment_status);
      return res.status(400).json({ 
        error: 'Payment not completed',
        status: session.payment_status
      });
    }

    // 获取订阅信息
    let subscriptionInfo = null;
    if (session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;
      
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      subscriptionInfo = {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        customer: subscription.customer
      };
      
      console.log('✅ Subscription info:', subscriptionInfo);
    }

    // 返回验证结果
    const planId = session.metadata?.planId || 'unknown';
    const billingPeriod = session.metadata?.billingPeriod || 'monthly';

    const result = {
      success: true,
      verified: true,
      plan: planId,
      billingPeriod: billingPeriod,
      paymentStatus: session.payment_status,
      subscription: subscriptionInfo,
      message: 'Payment verified successfully. Your subscription will be activated shortly.'
    };

    console.log('✅ Session verified successfully for user:', userId);
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Stripe session verification error:', error);
    
    // 区分不同的错误类型
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Invalid session ID',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to verify session',
      message: error.message
    });
  }
};

