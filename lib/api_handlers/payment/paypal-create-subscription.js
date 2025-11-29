/**
 * 创建PayPal订阅
 * POST /api/payment?action=paypal-create-subscription
 * Body: { userId, planId, billingPeriod }
 * 
 * 功能：
 * 1. 验证用户身份和套餐信息
 * 2. 获取或创建PayPal计划
 * 3. 创建PayPal订阅
 * 4. 返回订阅批准URL
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

/**
 * 获取或创建PayPal产品
 */
async function getOrCreateProduct(planId, planName) {
  try {
    // 尝试获取现有产品（使用固定的产品ID）
    const productId = `FISHTALK_${planId.toUpperCase()}`;
    
    try {
      const product = await paypalClient.callPayPalAPI(`/v1/catalogs/products/${productId}`, 'GET');
      console.log(`✅ Found existing product: ${productId}`);
      return product.id;
    } catch (error) {
      // 产品不存在，创建新产品
      console.log(`🔨 Creating new product: ${productId}`);
    }

    const productData = {
      id: productId,
      name: `FishTalk ${planName} Membership`,
      description: `${planName} tier membership for FishTalk.app`,
      type: 'SERVICE',
      category: 'SOFTWARE'
    };

    const product = await paypalClient.callPayPalAPI('/v1/catalogs/products', 'POST', productData);
    console.log(`✅ Created product: ${product.id}`);
    return product.id;
  } catch (error) {
    console.error('❌ Product creation error:', error);
    throw error;
  }
}

/**
 * 获取或创建PayPal订阅计划
 */
async function getOrCreatePlan(planId, billingPeriod, productId, price) {
  try {
    // 检查环境变量中是否已有计划ID
    const envKey = `PAYPAL_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}_PLAN_ID`;
    const existingPlanId = process.env[envKey];
    
    if (existingPlanId) {
      try {
        const plan = await paypalClient.callPayPalAPI(`/v1/billing/plans/${existingPlanId}`, 'GET');
        console.log(`✅ Found existing plan: ${existingPlanId}`);
        return plan.id;
      } catch (error) {
        console.log(`⚠️  Stored plan ID ${existingPlanId} not found, creating new plan`);
      }
    }

    // 创建新计划
    const interval = billingPeriod === 'yearly' ? 'YEAR' : 'MONTH';
    const planData = {
      product_id: productId,
      name: `FishTalk ${planId} - ${billingPeriod}`,
      description: `${planId} membership billed ${billingPeriod}`,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: interval,
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = 无限续订
          pricing_scheme: {
            fixed_price: {
              value: price.toFixed(2),
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    };

    const plan = await paypalClient.callPayPalAPI('/v1/billing/plans', 'POST', planData);
    console.log(`✅ Created plan: ${plan.id}`);
    console.log(`💡 Add this to .env.local: ${envKey}=${plan.id}`);
    return plan.id;
  } catch (error) {
    console.error('❌ Plan creation error:', error);
    throw error;
  }
}

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

  try {
    const { userId, planId, billingPeriod = 'monthly' } = req.body;

    // 验证输入
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // 允许的 planId：正式套餐 + 测试套餐
    const validPlans = ['free', 'plus', 'premium', 'test_plus', 'test_premium'];
    if (!validPlans.includes(planId)) {
      return res.status(400).json({ error: 'Invalid planId' });
    }

    if (planId === 'free') {
      return res.status(400).json({ error: 'Free plan does not require payment' });
    }

    if (!paypalClient.isConfigured()) {
      return res.status(500).json({ 
        error: 'PayPal not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables.' 
      });
    }

    // 查询会员类型和价格信息
    const query = `
      query GetMemberType($planId: String!) {
        member_types_by_pk(id: $planId) {
          id
          name
          fee_per_month
          fee_per_year
        }
      }
    `;

    const data = await queryHasura(query, { planId });
    const memberType = data.member_types_by_pk;

    if (!memberType) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // 获取价格
    const monthlyPrice = parseFloat(memberType.fee_per_month) || 0;
    const yearlyPrice = parseFloat(memberType.fee_per_year) || 0;
    const price = billingPeriod === 'yearly' ? yearlyPrice : monthlyPrice;

    if (price <= 0) {
      return res.status(400).json({ error: 'Invalid price for selected plan' });
    }

    // 创建PayPal产品和计划
    const productId = await getOrCreateProduct(planId, memberType.name);
    const paypalPlanId = await getOrCreatePlan(planId, billingPeriod, productId, price);

    // 创建订阅
    const origin = req.headers.origin || req.headers.referer || 'https://fishtalk.app';
    const baseUrl = origin.replace(/\/$/, '');
    
    const subscriptionData = {
      plan_id: paypalPlanId,
      application_context: {
        brand_name: 'FishTalk.app',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${baseUrl}/paypal-success.html`,
        cancel_url: `${baseUrl}/membership.html?canceled=true`
      },
      custom_id: userId, // 用于关联用户
      subscriber: {
        name: {
          given_name: 'User'
        }
      }
    };

    const subscription = await paypalClient.callPayPalAPI('/v1/billing/subscriptions', 'POST', subscriptionData);

    // 获取批准链接
    const approveLink = subscription.links.find(link => link.rel === 'approve');
    
    if (!approveLink) {
      throw new Error('No approval link found in subscription response');
    }

    // 在批准链接中添加subscription_id参数
    const approveUrl = new URL(approveLink.href);
    approveUrl.searchParams.set('subscription_id', subscription.id);

    return res.status(200).json({
      success: true,
      url: approveUrl.toString(),
      subscriptionId: subscription.id,
      provider: 'paypal'
    });

  } catch (error) {
    console.error('❌ Create PayPal subscription error:', error);
    return res.status(500).json({
      error: 'Failed to create PayPal subscription',
      message: error.message
    });
  }
};

