/**
 * Payment API Router - 合并所有支付相关端点
 * 
 * 支持的 actions:
 * Stripe:
 * - create-checkout: 创建Stripe结账会话
 * - webhook: Stripe webhook
 * PayPal:
 * - paypal-create-subscription: 创建PayPal订阅
 * - paypal-webhook: PayPal webhook
 * 通用:
 * - manage-subscription: 管理订阅（支持Stripe和PayPal）
 */

const createCheckoutHandler = require('../lib/api_handlers/payment/create-checkout.js');
const webhookHandler = require('../lib/api_handlers/payment/webhook.js');
const paypalCreateSubscriptionHandler = require('../lib/api_handlers/payment/paypal-create-subscription.js');
const paypalWebhookHandler = require('../lib/api_handlers/payment/paypal-webhook.js');
const paypalSyncSubscriptionHandler = require('../lib/api_handlers/payment/paypal-sync-subscription.js');
const manageSubscriptionHandler = require('../lib/api_handlers/payment/manage-subscription.js');

module.exports = async function handler(req, res) {
  const { action } = req.query;
  
  try {
    switch (action) {
      // Stripe
      case 'create-checkout':
        return await createCheckoutHandler(req, res);
      case 'webhook':
        return await webhookHandler(req, res);
      
      // PayPal
      case 'paypal-create-subscription':
        return await paypalCreateSubscriptionHandler(req, res);
      case 'paypal-webhook':
        return await paypalWebhookHandler(req, res);
      case 'paypal-sync-subscription':
        return await paypalSyncSubscriptionHandler(req, res);
      
      // 通用
      case 'manage-subscription':
        return await manageSubscriptionHandler(req, res);
        
      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          available: [
            'create-checkout',
            'webhook',
            'paypal-create-subscription',
            'paypal-webhook',
            'paypal-sync-subscription',
            'manage-subscription'
          ]
        });
    }
  } catch (error) {
    console.error('[Payment API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

