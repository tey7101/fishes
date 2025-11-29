/**
 * Stripe 升级流程端到端测试
 * 
 * 测试场景：
 * 1. Free → Plus（新用户首次升级）
 * 2. Free → Premium（新用户直接升级高级版）
 * 3. Plus → Premium（已有用户升级）
 * 
 * 注意：此脚本不会真正调用 Stripe，只验证数据库状态
 * 需要手动在浏览器中完成 Stripe Checkout 支付流程
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

async function queryHasura(query, variables = {}) {
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

async function createTestUser(email) {
  const userId = uuidv4();
  
  const mutation = `
    mutation CreateUser($userId: String!, $email: String!) {
      insert_users_one(object: { id: $userId, email: $email }) {
        id
        email
      }
    }
  `;

  const data = await queryHasura(mutation, { userId, email });
  return data.insert_users_one;
}

async function getCheckoutUrl(userId, planId, billingPeriod = 'monthly') {
  info(`获取 Stripe Checkout URL: ${planId} (${billingPeriod})`);
  
  const response = await fetch(`${BACKEND_URL}/api/payment?action=create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      planId,
      billingPeriod
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Create checkout failed: ${error.error || response.statusText}`);
  }

  const result = await response.json();
  return result;
}

async function checkSubscription(userId) {
  const query = `
    query GetUserSubscription($userId: String!) {
      user_subscriptions(
        where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
        order_by: { created_at: desc }
        limit: 1
      ) {
        id
        plan
        is_active
        payment_provider
        stripe_customer_id
        stripe_subscription_id
        current_period_start
        current_period_end
        created_at
      }
    }
  `;

  const data = await queryHasura(query, { userId });
  return data.user_subscriptions[0] || null;
}

async function checkPaymentRecords(userId) {
  const query = `
    query GetPaymentRecords($userId: String!) {
      payment(
        where: { user_id: { _eq: $userId } }
        order_by: { payment_date: desc }
      ) {
        id
        amount
        currency
        status
        payment_provider
        plan
        billing_period
        transaction_id
        provider_subscription_id
        payment_date
      }
    }
  `;

  const data = await queryHasura(query, { userId });
  return data.payment || [];
}

async function testScenario(scenarioName, userId, planId, billingPeriod = 'monthly') {
  console.log('\n' + '='.repeat(60));
  console.log(`\n📋 测试场景: ${scenarioName}`);
  console.log(`   用户ID: ${userId}`);
  console.log(`   套餐: ${planId}`);
  console.log(`   周期: ${billingPeriod}`);
  console.log('');
  console.log('-'.repeat(60));
  
  try {
    // 1. 获取 Checkout URL
    const checkoutData = await getCheckoutUrl(userId, planId, billingPeriod);
    success(`Checkout URL 创建成功`);
    console.log(`   URL: ${checkoutData.url}`);
    console.log(`   Session ID: ${checkoutData.sessionId}`);
    
    // 2. 提示用户完成支付
    console.log('\n⏸️  请在浏览器中完成支付：');
    console.log(`   1. 打开: ${checkoutData.url}`);
    console.log('   2. 使用测试卡号: 4242 4242 4242 4242');
    console.log('   3. 到期日期: 任意未来日期（如 12/34）');
    console.log('   4. CVC: 任意 3 位数字（如 123）');
    console.log('   5. 完成支付后，按回车继续...');
    
    await waitForEnter();
    
    // 3. 检查订阅状态
    info('等待 webhook 处理（5 秒）...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📊 验证数据库记录：\n');
    
    const subscription = await checkSubscription(userId);
    if (!subscription) {
      error('未找到订阅记录');
      return false;
    }
    
    success(`订阅记录已创建 (ID: ${subscription.id})`);
    console.log(`   Plan: ${subscription.plan}`);
    console.log(`   Provider: ${subscription.payment_provider}`);
    console.log(`   Active: ${subscription.is_active}`);
    console.log(`   Stripe Customer ID: ${subscription.stripe_customer_id || '(未设置)'}`);
    console.log(`   Stripe Subscription ID: ${subscription.stripe_subscription_id || '(未设置)'}`);
    
    // 验证字段
    let hasError = false;
    
    if (subscription.plan !== planId) {
      error(`套餐不匹配：期望 "${planId}"，实际 "${subscription.plan}"`);
      hasError = true;
    } else {
      success(`套餐正确: ${subscription.plan}`);
    }
    
    if (subscription.payment_provider !== 'stripe') {
      error(`支付提供商不匹配：期望 "stripe"，实际 "${subscription.payment_provider}"`);
      hasError = true;
    } else {
      success(`支付提供商正确: ${subscription.payment_provider}`);
    }
    
    if (!subscription.stripe_customer_id) {
      warning('stripe_customer_id 未设置');
      hasError = true;
    } else {
      success(`stripe_customer_id: ${subscription.stripe_customer_id}`);
    }
    
    if (!subscription.stripe_subscription_id) {
      warning('stripe_subscription_id 未设置');
      hasError = true;
    } else {
      success(`stripe_subscription_id: ${subscription.stripe_subscription_id}`);
    }
    
    // 4. 检查支付记录
    const payments = await checkPaymentRecords(userId);
    if (payments.length === 0) {
      warning('未找到支付记录');
    } else {
      success(`找到 ${payments.length} 条支付记录`);
      payments.forEach((payment, index) => {
        console.log(`\n   支付记录 ${index + 1}:`);
        console.log(`     金额: ${payment.currency} ${payment.amount}`);
        console.log(`     状态: ${payment.status}`);
        console.log(`     套餐: ${payment.plan}`);
        console.log(`     周期: ${payment.billing_period || '(未设置)'}`);
        console.log(`     Transaction ID: ${payment.transaction_id || '(未设置)'}`);
        console.log(`     时间: ${payment.payment_date}`);
        
        if (payment.plan !== planId) {
          warning(`     ⚠️ 套餐不匹配：期望 "${planId}"，实际 "${payment.plan}"`);
          hasError = true;
        }
        
        if (payment.payment_provider !== 'stripe') {
          warning(`     ⚠️ 支付提供商不匹配：期望 "stripe"，实际 "${payment.payment_provider}"`);
          hasError = true;
        }
      });
    }
    
    console.log('\n' + '-'.repeat(60));
    
    if (hasError) {
      error(`${scenarioName} 测试失败`);
      return false;
    } else {
      success(`${scenarioName} 测试通过`);
      return true;
    }
    
  } catch (err) {
    error(`测试失败: ${err.message}`);
    console.error(err);
    return false;
  }
}

function waitForEnter() {
  return new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('\n🧪 Stripe 升级流程测试\n');
  console.log('='.repeat(60));
  
  const results = [];
  
  try {
    // 场景 1: Free → Plus
    console.log('\n📌 场景 1: 新用户升级到 Plus');
    const user1Email = `test-stripe-plus-${Date.now()}@test.com`;
    const user1 = await createTestUser(user1Email);
    success(`测试用户 1 已创建: ${user1Email}`);
    
    const result1 = await testScenario(
      'Free → Plus (Monthly)',
      user1.id,
      'plus',
      'monthly'
    );
    results.push({ scenario: 'Free → Plus', passed: result1 });
    
    // 场景 2: Free → Premium
    console.log('\n📌 场景 2: 新用户升级到 Premium');
    const user2Email = `test-stripe-premium-${Date.now()}@test.com`;
    const user2 = await createTestUser(user2Email);
    success(`测试用户 2 已创建: ${user2Email}`);
    
    const result2 = await testScenario(
      'Free → Premium (Monthly)',
      user2.id,
      'premium',
      'monthly'
    );
    results.push({ scenario: 'Free → Premium', passed: result2 });
    
    // 场景 3: Plus → Premium（手动设置）
    info('\n📌 场景 3: Plus 用户升级到 Premium');
    info('请使用已有的 Plus 用户进行测试，或跳过此场景');
    console.log('如需测试，请输入 Plus 用户的 UUID（直接回车跳过）:');
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 测试总结\n');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(r => {
      if (r.passed) {
        success(`${r.scenario}`);
      } else {
        error(`${r.scenario}`);
      }
    });
    
    console.log(`\n总计: ${passed}/${total} 测试通过`);
    
    if (passed === total) {
      success('所有测试通过！');
    } else {
      warning('部分测试未通过，请检查日志');
    }
    
  } catch (err) {
    error('测试过程出错：' + err.message);
    console.error(err);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(0);
}

// 运行测试
runAllTests();

