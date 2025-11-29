/**
 * Stripe 配置验证脚本
 * 检查所有必需的配置是否正确设置
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const fetch = require('node-fetch');
const stripeConfig = require('./lib/stripe-config');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function success(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

async function verifyStripeConfig() {
  console.log('\n🔍 Stripe 配置验证\n');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // 0. 显示当前模式
  console.log('\n🎯 当前 Stripe 模式');
  console.log('-'.repeat(60));
  const mode = stripeConfig.mode.toUpperCase();
  const modeEmoji = stripeConfig.mode === 'test' ? '🧪' : '🚀';
  console.log(`${colors.cyan}${modeEmoji} STRIPE_MODE: ${mode}${colors.reset}`);
  if (stripeConfig.mode === 'test') {
    info('使用测试模式（Test Mode）- 可安全测试，不产生真实费用');
  } else {
    warning('使用生产模式（Live Mode）- 将处理真实支付！');
  }
  
  // 1. 检查当前模式的环境变量
  console.log(`\n📋 1. 检查 ${mode} 模式环境变量`);
  console.log('-'.repeat(60));
  
  const currentVars = {
    'Publishable Key': stripeConfig.publishableKey,
    'Secret Key': stripeConfig.secretKey,
    'Webhook Secret': stripeConfig.webhookSecret
  };
  
  for (const [varName, value] of Object.entries(currentVars)) {
    if (!value || value.includes('your_') || value.includes('YOUR_')) {
      error(`${varName} 未配置或使用占位符`);
      allPassed = false;
    } else {
      // 隐藏大部分密钥内容
      const displayValue = value.substring(0, 12) + '***';
      success(`${varName}: ${displayValue}`);
    }
  }
  
  // 1.5 检查另一个模式的配置状态
  console.log(`\n📝 备用模式配置状态`);
  console.log('-'.repeat(60));
  const otherMode = stripeConfig.mode === 'test' ? 'LIVE' : 'TEST';
  const otherModeVars = stripeConfig.mode === 'test' ? {
    'STRIPE_LIVE_PUBLISHABLE_KEY': process.env.STRIPE_LIVE_PUBLISHABLE_KEY,
    'STRIPE_LIVE_SECRET_KEY': process.env.STRIPE_LIVE_SECRET_KEY,
    'STRIPE_LIVE_WEBHOOK_SECRET': process.env.STRIPE_LIVE_WEBHOOK_SECRET
  } : {
    'STRIPE_TEST_PUBLISHABLE_KEY': process.env.STRIPE_TEST_PUBLISHABLE_KEY,
    'STRIPE_TEST_SECRET_KEY': process.env.STRIPE_TEST_SECRET_KEY,
    'STRIPE_TEST_WEBHOOK_SECRET': process.env.STRIPE_TEST_WEBHOOK_SECRET
  };
  
  let otherModeConfigured = true;
  for (const [varName, value] of Object.entries(otherModeVars)) {
    if (!value || value.includes('your_') || value.includes('YOUR_')) {
      info(`${varName}: 未配置`);
      otherModeConfigured = false;
    } else {
      const displayValue = value.substring(0, 12) + '***';
      success(`${varName}: ${displayValue}`);
    }
  }
  
  if (!otherModeConfigured) {
    info(`提示：${otherMode} 模式密钥未配置，切换模式前请先配置`);
  }
  
  // 2. 检查 Stripe API 密钥有效性
  console.log(`\n🔑 2. 验证 ${mode} 模式 Stripe API 密钥`);
  console.log('-'.repeat(60));
  
  const publishableKey = stripeConfig.publishableKey;
  const secretKey = stripeConfig.secretKey;
  
  // 检查密钥格式
  if (publishableKey) {
    const expectedPrefix = stripeConfig.mode === 'test' ? 'pk_test_' : 'pk_live_';
    if (publishableKey.startsWith(expectedPrefix)) {
      success(`Publishable Key 格式正确（${expectedPrefix}***）`);
    } else {
      error(`Publishable Key 格式不正确（期望 ${expectedPrefix}，实际 ${publishableKey.substring(0, 8)}***）`);
      allPassed = false;
    }
  }
  
  if (secretKey) {
    const expectedPrefix = stripeConfig.mode === 'test' ? 'sk_test_' : 'sk_live_';
    if (secretKey.startsWith(expectedPrefix)) {
      success(`Secret Key 格式正确（${expectedPrefix}***）`);
    } else {
      error(`Secret Key 格式不正确（期望 ${expectedPrefix}，实际 ${secretKey.substring(0, 8)}***）`);
      allPassed = false;
    }
  }
  
  // 测试 Secret Key 是否有效
  if (secretKey && (secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_'))) {
    try {
      const stripe = new Stripe(secretKey);
      const balance = await stripe.balance.retrieve();
      success(`Secret Key 有效（余额：${balance.available.length} 个币种可用）`);
    } catch (err) {
      error(`Secret Key 无效：${err.message}`);
      allPassed = false;
    }
  }
  
  // 3. 检查 Webhook Secret 格式
  console.log(`\n🔔 3. 验证 ${mode} 模式 Webhook Secret`);
  console.log('-'.repeat(60));
  
  const webhookSecret = stripeConfig.webhookSecret;
  if (webhookSecret) {
    if (webhookSecret.trim().startsWith('whsec_')) {
      success('Webhook Secret 格式正确');
      
      // 提示如何测试 webhook
      if (stripeConfig.mode === 'test') {
        info('本地测试 Webhook:');
        console.log('   1. 安装 Stripe CLI: https://stripe.com/docs/stripe-cli');
        console.log('   2. 运行: stripe listen --forward-to "localhost:3000/api/payment?action=webhook"');
        console.log('   3. 复制命令输出的 webhook secret 并更新到 .env.local 的 STRIPE_TEST_WEBHOOK_SECRET');
        console.log('   4. 测试: stripe trigger checkout.session.completed');
      } else {
        info('生产环境 Webhook:');
        console.log('   1. 访问: https://dashboard.stripe.com/webhooks');
        console.log('   2. 添加端点: https://yourdomain.com/api/payment?action=webhook');
        console.log('   3. 选择事件: checkout.session.completed, invoice.payment_succeeded, 等');
        console.log('   4. 复制 Signing secret 到 STRIPE_LIVE_WEBHOOK_SECRET');
      }
    } else {
      error('Webhook Secret 格式不正确（应以 whsec_ 开头）');
      allPassed = false;
    }
  }
  
  // 4. 检查 Hasura 配置
  console.log('\n🗄️  4. 验证 Hasura 配置');
  console.log('-'.repeat(60));
  
  const hasuraEndpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
  const hasuraSecret = process.env.HASURA_ADMIN_SECRET;
  
  if (!hasuraEndpoint) {
    error('HASURA_GRAPHQL_ENDPOINT 未配置');
    allPassed = false;
  } else if (!hasuraSecret) {
    error('HASURA_ADMIN_SECRET 未配置');
    allPassed = false;
  } else {
    // 测试 Hasura 连接
    try {
      const response = await fetch(hasuraEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': hasuraSecret
        },
        body: JSON.stringify({
          query: '{ __typename }'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.__typename === 'query_root') {
          success('Hasura 连接成功');
        } else {
          error('Hasura 响应异常');
          allPassed = false;
        }
      } else {
        error(`Hasura 连接失败：HTTP ${response.status}`);
        allPassed = false;
      }
    } catch (err) {
      error(`Hasura 连接失败：${err.message}`);
      allPassed = false;
    }
  }
  
  // 5. 检查数据库表结构
  console.log('\n📊 5. 验证数据库表');
  console.log('-'.repeat(60));
  
  if (hasuraEndpoint && hasuraSecret) {
    try {
      // 检查 user_subscriptions 表
      const query = `
        query CheckTables {
          user_subscriptions(limit: 1) {
            id
            stripe_customer_id
            stripe_subscription_id
          }
          payment(limit: 1) {
            id
            payment_provider
          }
        }
      `;
      
      const response = await fetch(hasuraEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': hasuraSecret
        },
        body: JSON.stringify({ query })
      });
      
      const result = await response.json();
      
      if (result.errors) {
        error('数据库表查询失败');
        console.log('   错误:', result.errors[0].message);
        allPassed = false;
      } else {
        success('user_subscriptions 表存在（包含 Stripe 字段）');
        success('payment 表存在');
      }
    } catch (err) {
      error(`数据库表检查失败：${err.message}`);
      allPassed = false;
    }
  }
  
  // 6. 检查文件存在性
  console.log('\n📁 6. 验证文件结构');
  console.log('-'.repeat(60));
  
  const fs = require('fs');
  const requiredFiles = [
    'lib/api_handlers/payment/create-checkout.js',
    'lib/api_handlers/payment/webhook.js',
    'lib/api_handlers/payment/stripe-verify-session.js',
    'api/payment-api.js',
    'stripe-success.html',
    'src/js/membership.js',
    'STRIPE_SETUP_GUIDE.md'
  ];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      success(`${file} 存在`);
    } else {
      error(`${file} 不存在`);
      allPassed = false;
    }
  }
  
  // 7. 总结
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 验证总结\n');
  
  if (allPassed) {
    success(`所有检查通过！Stripe ${mode} 模式配置正确。`);
    
    // 模式切换提示
    console.log(`\n💡 模式切换提示：`);
    console.log(`   当前模式：${colors.cyan}${mode}${colors.reset}`);
    if (stripeConfig.mode === 'test') {
      console.log(`   切换到生产模式：在 .env.local 中设置 ${colors.yellow}STRIPE_MODE=live${colors.reset}`);
      console.log(`   ${colors.yellow}⚠️  切换前请确保已配置 STRIPE_LIVE_* 密钥${colors.reset}`);
    } else {
      console.log(`   切换到测试模式：在 .env.local 中设置 ${colors.cyan}STRIPE_MODE=test${colors.reset}`);
      console.log(`   ${colors.green}✅ 测试模式可安全调试，不产生真实费用${colors.reset}`);
    }
    
    console.log('\n下一步：');
    console.log('1. 启动服务器: npm start');
    if (stripeConfig.mode === 'test') {
      console.log('2. 启动 Stripe CLI 转发（新终端）:');
      console.log('   stripe listen --forward-to "localhost:3000/api/payment?action=webhook"');
      console.log('3. 访问: http://localhost:3000/membership.html');
      console.log('4. 测试支付流程（使用测试卡号 4242 4242 4242 4242）');
      console.log('5. 查看 Stripe Dashboard: https://dashboard.stripe.com/test/payments');
    } else {
      console.log('2. 确认 Webhook 已在 Stripe Dashboard 配置');
      console.log('3. 访问您的域名进行测试');
      console.log('4. 使用真实卡号进行小额测试（会产生实际费用）');
      console.log('5. 查看 Stripe Dashboard: https://dashboard.stripe.com/payments');
    }
  } else {
    error('部分检查未通过，请修复上述问题。');
    console.log('\n请参考: STRIPE_SETUP_GUIDE.md');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// 运行验证
verifyStripeConfig().catch(err => {
  error('验证过程出错：' + err.message);
  console.error(err);
  process.exit(1);
});

