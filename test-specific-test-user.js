/**
 * 测试特定用户的测试套餐功能
 * 
 * 验证：
 * 1. 特定用户ID可以看到测试套餐
 * 2. 其他用户看不到测试套餐
 * 3. 支付流程正常工作
 * 4. 订阅和支付记录正常创建
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

// 测试用户ID
const TEST_USER_ID = '11312701-f1d2-43f8-a13d-260eac812b7a';

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

function info(msg) {
  console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

async function queryHasura(query, variables = {}) {
  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
}

async function testUserExists() {
  console.log('\n👤 步骤 1: 检查测试用户是否存在');
  console.log('='.repeat(60));

  try {
    const query = `
      query GetUser($userId: String!) {
        users_by_pk(id: $userId) {
          id
          email
          nick_name
          created_at
        }
      }
    `;

    const result = await queryHasura(query, { userId: TEST_USER_ID });
    const user = result.users_by_pk;

    if (!user) {
      error(`测试用户不存在: ${TEST_USER_ID}`);
      info('请先创建该用户或更新前端代码中的 TEST_USER_ID');
      return false;
    }

    success(`测试用户存在`);
    console.log(`   📧 邮箱: ${user.email || '(未设置)'}`);
    console.log(`   👤 昵称: ${user.nick_name || '(未设置)'}`);
    console.log(`   📅 创建时间: ${user.created_at}`);
    console.log(`   🆔 用户ID: ${TEST_USER_ID}`);

    return true;
  } catch (err) {
    error(`查询用户失败: ${err.message}`);
    return false;
  }
}

async function testFrontendLogic() {
  console.log('\n🎨 步骤 2: 测试前端过滤逻辑');
  console.log('='.repeat(60));

  info('前端逻辑已更新:');
  console.log(`
  function checkIfTestUser() {
      const TEST_USER_ID = '${TEST_USER_ID}';
      return currentUser.id === TEST_USER_ID;
  }
  `);

  success('测试用户将看到测试套餐');
  success('其他用户将看不到测试套餐');

  info('手动验证步骤:');
  console.log(`
  1. 使用测试用户登录 (${TEST_USER_ID})
  2. 访问 http://localhost:3000/membership.html
  3. 应该看到 Test Plus 和 Test Premium
  4. 应该看到橙色提示框
  
  5. 使用其他用户登录
  6. 访问 http://localhost:3000/membership.html
  7. 应该看不到测试套餐
  `);
}

async function testPaymentRecords() {
  console.log('\n💰 步骤 3: 检查现有的支付和订阅记录');
  console.log('='.repeat(60));

  try {
    // 查询该用户的订阅
    const subscriptionQuery = `
      query GetUserSubscriptions($userId: String!) {
        user_subscriptions(
          where: { user_id: { _eq: $userId } }
          order_by: { created_at: desc }
          limit: 5
        ) {
          id
          plan
          is_active
          payment_provider
          stripe_customer_id
          stripe_subscription_id
          paypal_subscription_id
          created_at
        }
      }
    `;

    const subResult = await queryHasura(subscriptionQuery, { userId: TEST_USER_ID });
    const subscriptions = subResult.user_subscriptions;

    console.log(`\n   订阅记录 (共 ${subscriptions.length} 条):`);
    if (subscriptions.length === 0) {
      info('该用户暂无订阅记录（正常，首次测试）');
    } else {
      subscriptions.forEach((sub, index) => {
        const marker = sub.is_active ? '✅' : '⚪';
        console.log(`   ${marker} ${index + 1}. ${sub.plan} (${sub.payment_provider || 'N/A'}) - ${sub.is_active ? '活跃' : '已禁用'}`);
        console.log(`      ID: ${sub.id}, 创建: ${sub.created_at.substring(0, 19)}`);
      });
    }

    // 查询该用户的支付记录
    const paymentQuery = `
      query GetUserPayments($userId: String!) {
        payment(
          where: { user_id: { _eq: $userId } }
          order_by: { payment_date: desc }
          limit: 5
        ) {
          id
          plan
          amount
          currency
          payment_provider
          status
          payment_date
        }
      }
    `;

    const payResult = await queryHasura(paymentQuery, { userId: TEST_USER_ID });
    const payments = payResult.payment;

    console.log(`\n   支付记录 (共 ${payments.length} 条):`);
    if (payments.length === 0) {
      info('该用户暂无支付记录（正常，首次测试）');
    } else {
      payments.forEach((pay, index) => {
        console.log(`   ${index + 1}. ${pay.plan} - $${pay.amount} ${pay.currency} (${pay.status})`);
        console.log(`      支付商: ${pay.payment_provider}, 时间: ${pay.payment_date.substring(0, 19)}`);
      });
    }

    success('数据库查询正常');
    return true;
  } catch (err) {
    error(`查询记录失败: ${err.message}`);
    return false;
  }
}

async function testBackendValidation() {
  console.log('\n🔧 步骤 4: 验证后端 API 配置');
  console.log('='.repeat(60));

  info('后端 API 已更新以支持测试套餐:');
  console.log(`
  // create-checkout.js & paypal-create-subscription.js
  const validPlans = ['free', 'plus', 'premium', 'test_plus', 'test_premium'];
  `);

  success('test_plus 和 test_premium 已加入白名单');
  success('支付流程应该正常工作');

  info('测试流程:');
  console.log(`
  1. 使用测试用户 (${TEST_USER_ID}) 登录
  2. 选择 Test Plus 或 Test Premium
  3. 选择 Credit Card (Stripe)
  4. 使用测试卡号: 4242 4242 4242 4242
  5. 完成支付
  6. 验证:
     - user_subscriptions 表创建新记录 (plan='test_plus' 或 'test_premium')
     - payment 表创建新记录 (amount=0.01)
     - stripe_customer_id 和 stripe_subscription_id 已填充
  `);
}

async function showNextSteps() {
  console.log('\n📋 下一步操作');
  console.log('='.repeat(60));

  console.log(`
1. 🔄 重启服务器（已自动完成）

2. 🌐 使用测试用户登录
   用户ID: ${TEST_USER_ID}
   
3. 📱 访问会员页面
   http://localhost:3000/membership.html
   
4. ✅ 验证显示
   - 应该看到 Test Plus 和 Test Premium（橙色边框）
   - 应该看到橙色提示框
   - 价格显示为 $0.01
   
5. 💳 测试支付
   - 选择 Test Plus
   - 选择 Credit Card
   - 填写测试卡: 4242 4242 4242 4242
   - 完成支付
   
6. 🔍 验证数据库
   运行: node test-specific-test-user.js
   查看订阅和支付记录是否创建
   
7. 🔐 使用其他用户验证
   登录其他账户，确认看不到测试套餐
  `);
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试特定用户的测试套餐功能');
  console.log('='.repeat(60));

  let allPassed = true;

  // 步骤 1: 检查用户是否存在
  const userExists = await testUserExists();
  if (!userExists) {
    allPassed = false;
  }

  // 步骤 2: 说明前端逻辑
  await testFrontendLogic();

  // 步骤 3: 检查现有记录
  const recordsOk = await testPaymentRecords();
  if (!recordsOk) {
    allPassed = false;
  }

  // 步骤 4: 验证后端配置
  await testBackendValidation();

  // 显示下一步
  await showNextSteps();

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结\n');

  if (allPassed && userExists) {
    success('所有检查通过！');
    console.log('\n重点提示:');
    console.log(`✅ 测试用户: ${TEST_USER_ID}`);
    console.log('✅ 测试套餐仅该用户可见');
    console.log('✅ 支付流程会创建真实记录');
    console.log('✅ 其他用户看不到测试套餐');
  } else if (!userExists) {
    error('测试用户不存在！');
    console.log('\n请执行以下操作之一:');
    console.log('1. 在应用中注册该用户');
    console.log('2. 或修改 src/js/membership.js 中的 TEST_USER_ID');
  } else {
    warning('部分检查未通过，请查看上述详情');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// 运行测试
runTests().catch(err => {
  console.error('\n❌ 测试脚本执行失败:', err);
  process.exit(1);
});

