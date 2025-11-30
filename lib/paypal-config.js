/**
 * PayPal 配置管理
 * 根据 PAYPAL_MODE 环境变量动态加载 sandbox 或 production 配置
 */

require('dotenv').config({ path: '.env.local' });

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';

// 验证模式
if (PAYPAL_MODE !== 'sandbox' && PAYPAL_MODE !== 'production') {
  console.error(`❌ Invalid PAYPAL_MODE: "${PAYPAL_MODE}". Must be "sandbox" or "production"`);
  process.exit(1);
}

// 根据模式加载对应的配置
const config = {
  mode: PAYPAL_MODE,
  clientId: PAYPAL_MODE === 'sandbox'
    ? process.env.PAYPAL_CLIENT_ID
    : process.env.PAYPAL_PRODUCTION_CLIENT_ID,
  clientSecret: PAYPAL_MODE === 'sandbox'
    ? process.env.PAYPAL_CLIENT_SECRET
    : process.env.PAYPAL_PRODUCTION_CLIENT_SECRET,
  webhookId: PAYPAL_MODE === 'sandbox'
    ? process.env.PAYPAL_WEBHOOK_ID
    : process.env.PAYPAL_PRODUCTION_WEBHOOK_ID,
  baseUrl: PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
};

// 验证必需的配置
if (!config.clientId || !config.clientSecret) {
  console.error('❌ PayPal credentials missing');
  console.error(`   Mode: ${PAYPAL_MODE}`);
  console.error(`   Client ID: ${config.clientId ? 'Set' : 'MISSING'}`);
  console.error(`   Client Secret: ${config.clientSecret ? 'Set' : 'MISSING'}`);
  process.exit(1);
}

// 成功加载配置，输出日志
console.log(`💳 PayPal 模式: ${PAYPAL_MODE.toUpperCase()}`);
console.log(`   Base URL: ${config.baseUrl}`);
console.log(`   Client ID: ${config.clientId.substring(0, 20)}***`);
if (config.webhookId) {
  console.log(`   Webhook ID: ${config.webhookId}`);
} else {
  console.log(`   ⚠️  Webhook ID not configured`);
}

module.exports = config;

