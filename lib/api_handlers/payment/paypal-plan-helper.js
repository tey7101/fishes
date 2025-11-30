/**
 * PayPal Plan 辅助函数
 * 用于从 PayPal Plan ID 推断套餐类型
 */

const fetch = require('node-fetch');
const paypalConfig = require('../../paypal-config');

/**
 * 获取 PayPal Access Token
 */
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64');

  const response = await fetch(`${paypalConfig.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 从 PayPal 获取 Plan 详情
 */
async function getPayPalPlanDetails(planId) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${paypalConfig.baseUrl}/v1/billing/plans/${planId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error(`❌ Failed to get PayPal plan details for ${planId}: ${response.status}`);
    return null;
  }

  return await response.json();
}

/**
 * Plan ID 映射表（可选，如果环境变量已配置）
 * 注意：现在套餐是动态创建的，所以这个映射表主要用于向后兼容
 */
const PLAN_ID_MAPPING = {};

/**
 * 从 Plan 名称或描述中推断套餐类型
 */
function extractPlanFromText(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('premium')) return 'premium';
  if (lowerText.includes('plus')) return 'plus';
  
  return null;
}

/**
 * 从 Plan 详情中提取计费周期
 */
function extractBillingPeriod(planDetails) {
  if (!planDetails?.billing_cycles || planDetails.billing_cycles.length === 0) {
    return 'monthly'; // 默认
  }

  const regularCycle = planDetails.billing_cycles.find(
    cycle => cycle.tenure_type === 'REGULAR'
  );

  if (!regularCycle) return 'monthly';

  const frequency = regularCycle.frequency?.interval_unit?.toLowerCase();
  if (frequency === 'year') return 'yearly';
  if (frequency === 'month') return 'monthly';
  
  return 'monthly';
}

/**
 * 主函数：从 PayPal Plan ID 推断会员套餐和计费周期
 * 
 * 优先级：
 * 1. 环境变量映射表（最快，但需要配置）
 * 2. 查询 PayPal API，从 name 推断
 * 3. 查询 PayPal API，从 description 推断
 * 4. 默认返回 'free'
 */
async function getMemberPlanFromPayPalPlanId(planId) {
  console.log(`🔍 开始推断 PayPal Plan ID: "${planId}"`);

  // 策略 1: 检查映射表
  if (PLAN_ID_MAPPING[planId]) {
    const mapping = PLAN_ID_MAPPING[planId];
    console.log(`✅ 从映射表找到: plan="${mapping.plan}", period="${mapping.period}"`);
    return mapping;
  }
  console.log(`⚠️  映射表中未找到 Plan ID，尝试查询 PayPal API...`);

  // 策略 2: 查询 PayPal API
  try {
    const planDetails = await getPayPalPlanDetails(planId);
    
    if (!planDetails) {
      console.warn(`⚠️  无法从 PayPal API 获取 Plan 详情，使用默认值`);
      return { plan: 'free', period: 'monthly' };
    }

    console.log(`📦 PayPal Plan 详情:`, JSON.stringify({
      id: planDetails.id,
      name: planDetails.name,
      description: planDetails.description,
      status: planDetails.status
    }, null, 2));

    // 从 name 推断
    let memberPlan = extractPlanFromText(planDetails.name);
    if (memberPlan) {
      console.log(`✅ 从 Plan Name "${planDetails.name}" 推断出: "${memberPlan}"`);
    } else {
      // 从 description 推断
      memberPlan = extractPlanFromText(planDetails.description);
      if (memberPlan) {
        console.log(`✅ 从 Plan Description "${planDetails.description}" 推断出: "${memberPlan}"`);
      } else {
        console.warn(`⚠️  无法从 name/description 推断套餐类型，使用默认值 "free"`);
        memberPlan = 'free';
      }
    }

    // 提取计费周期
    const billingPeriod = extractBillingPeriod(planDetails);
    console.log(`✅ 推断出计费周期: "${billingPeriod}"`);

    return { plan: memberPlan, period: billingPeriod };

  } catch (error) {
    console.error(`❌ 查询 PayPal Plan API 失败:`, error.message);
    return { plan: 'free', period: 'monthly' };
  }
}

module.exports = {
  getMemberPlanFromPayPalPlanId,
  getPayPalPlanDetails,
  getPayPalAccessToken
};


