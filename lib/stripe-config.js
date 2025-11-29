/**
 * Stripe 配置模块
 * 根据 STRIPE_MODE 环境变量自动选择测试或生产模式的密钥
 */

require('dotenv').config({ path: '.env.local' });

const STRIPE_MODE = process.env.STRIPE_MODE || 'test';

// 验证模式
if (STRIPE_MODE !== 'test' && STRIPE_MODE !== 'live') {
  console.error(`❌ 无效的 STRIPE_MODE: "${STRIPE_MODE}". 必须是 "test" 或 "live"`);
  process.exit(1);
}

// 根据模式选择密钥
const config = {
  mode: STRIPE_MODE,
  publishableKey: STRIPE_MODE === 'test' 
    ? process.env.STRIPE_TEST_PUBLISHABLE_KEY 
    : process.env.STRIPE_LIVE_PUBLISHABLE_KEY,
  secretKey: STRIPE_MODE === 'test' 
    ? process.env.STRIPE_TEST_SECRET_KEY 
    : process.env.STRIPE_LIVE_SECRET_KEY,
  webhookSecret: STRIPE_MODE === 'test' 
    ? process.env.STRIPE_TEST_WEBHOOK_SECRET 
    : process.env.STRIPE_LIVE_WEBHOOK_SECRET
};

// 验证密钥是否配置
const missingKeys = [];
if (!config.publishableKey || config.publishableKey.includes('your_')) {
  missingKeys.push(`STRIPE_${STRIPE_MODE.toUpperCase()}_PUBLISHABLE_KEY`);
}
if (!config.secretKey || config.secretKey.includes('your_')) {
  missingKeys.push(`STRIPE_${STRIPE_MODE.toUpperCase()}_SECRET_KEY`);
}
if (!config.webhookSecret || config.webhookSecret.includes('your_')) {
  missingKeys.push(`STRIPE_${STRIPE_MODE.toUpperCase()}_WEBHOOK_SECRET`);
}

if (missingKeys.length > 0) {
  console.error(`❌ Stripe ${STRIPE_MODE} 模式密钥未配置:`);
  missingKeys.forEach(key => console.error(`   - ${key}`));
  console.error(`\n请在 .env.local 中配置这些密钥`);
}

// 显示当前模式（仅在开发环境）
if (process.env.NODE_ENV !== 'production') {
  const modeEmoji = STRIPE_MODE === 'test' ? '🧪' : '🚀';
  console.log(`${modeEmoji} Stripe 模式: ${STRIPE_MODE.toUpperCase()}`);
  if (config.publishableKey) {
    console.log(`   Publishable Key: ${config.publishableKey.substring(0, 20)}***`);
  }
  if (missingKeys.length === 0) {
    console.log(`   ✅ 所有密钥已配置`);
  }
}

module.exports = config;

