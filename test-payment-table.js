/**
 * 自动测试 Payment 表和订阅升级功能
 * 
 * 使用方法：
 * node test-payment-table.js
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

// 测试结果统计
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n🧪 测试: ${name}`, 'cyan');
}

function logPass(message) {
  log(`  ✅ ${message}`, 'green');
  testResults.passed++;
}

function logFail(message, error = null) {
  log(`  ❌ ${message}`, 'red');
  testResults.failed++;
  if (error) {
    testResults.errors.push({ message, error: error.message || error });
  }
}

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
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

// ============================================
// 测试 1: 验证表结构
// ============================================
async function testTableStructure() {
  logTest('1. 验证 payment 表结构');

  try {
    const query = `
      query {
        __type(name: "payment") {
          name
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    `;

    const data = await queryHasura(query);

    if (!data.__type) {
      logFail('payment 表未在 GraphQL schema 中找到（可能未 Track）');
      return false;
    }

    const fields = data.__type.fields.map(f => f.name);
    const requiredFields = [
      'id', 'user_id', 'amount', 'currency', 'status',
      'payment_provider', 'subscription_id', 'plan', 'payment_date'
    ];

    const missingFields = requiredFields.filter(f => !fields.includes(f));

    if (missingFields.length > 0) {
      logFail(`缺少字段: ${missingFields.join(', ')}`);
      return false;
    }

    logPass(`表结构正确，包含 ${fields.length} 个字段`);
    return true;
  } catch (error) {
    logFail('验证表结构失败', error);
    return false;
  }
}

// ============================================
// 测试 2: 测试插入支付记录
// ============================================
async function testInsertPayment() {
  logTest('2. 测试插入支付记录');

  try {
    // 先获取一个测试用户ID（如果存在）
    const getUserQuery = `
      query {
        users(limit: 1) {
          id
        }
      }
    `;

    let testUserId = 'test-user-' + Date.now();
    try {
      const userData = await queryHasura(getUserQuery);
      if (userData.users && userData.users.length > 0) {
        testUserId = userData.users[0].id;
      }
    } catch (e) {
      // 使用生成的测试ID
    }

    const insertMutation = `
      mutation InsertTestPayment($userId: String!, $amount: numeric!, $currency: String!, $status: String!, $paymentProvider: String!, $plan: String!) {
        insert_payment_one(
          object: {
            user_id: $userId
            amount: $amount
            currency: $currency
            status: $status
            payment_provider: $paymentProvider
            plan: $plan
            payment_date: "now()"
          }
        ) {
          id
          user_id
          amount
          currency
          status
          payment_provider
          plan
          created_at
        }
      }
    `;

    const result = await queryHasura(insertMutation, {
      userId: testUserId,
      amount: 9.99,
      currency: 'USD',
      status: 'completed',
      paymentProvider: 'paypal',
      plan: 'plus'
    });

    if (!result.insert_payment_one || !result.insert_payment_one.id) {
      logFail('插入支付记录失败，未返回ID');
      return null;
    }

    const paymentId = result.insert_payment_one.id;
    logPass(`支付记录已插入，ID: ${paymentId}`);

    // 清理测试数据
    const deleteMutation = `
      mutation DeleteTestPayment($id: Int!) {
        delete_payment_by_pk(id: $id) {
          id
        }
      }
    `;

    await queryHasura(deleteMutation, { id: paymentId });
    logPass('测试数据已清理');

    return paymentId;
  } catch (error) {
    logFail('插入支付记录失败', error);
    return null;
  }
}

// ============================================
// 辅助函数: 创建测试用户
// ============================================
async function createTestUser(userId) {
  const email = `${userId}@test.com`;
  const createUserMutation = `
    mutation CreateTestUser($userId: String!, $email: String!) {
      insert_users_one(
        object: {
          id: $userId
          email: $email
          nick_name: $userId
          user_language: "English"
          fish_talk: false
          is_banned: false
          reputation_score: 0
          total_fish_created: 0
          total_votes_received: 0
          created_at: "now()"
        }
        on_conflict: {
          constraint: users_pkey
          update_columns: [email, nick_name]
        }
      ) {
        id
        email
      }
    }
  `;

  try {
    const result = await queryHasura(createUserMutation, { userId, email });
    // 验证用户确实创建了
    if (!result.insert_users_one || !result.insert_users_one.id) {
      throw new Error('用户创建失败');
    }
    return result.insert_users_one.id;
  } catch (error) {
    // 如果是因为 email 冲突，尝试查询现有用户
    if (error.message && error.message.includes('email')) {
      const queryUser = `
        query GetUser($userId: String!) {
          users_by_pk(id: $userId) {
            id
            email
          }
        }
      `;
      try {
        const userData = await queryHasura(queryUser, { userId });
        if (userData.users_by_pk) {
          return userData.users_by_pk.id;
        }
      } catch (e) {
        // 忽略查询错误
      }
    }
    throw error;
  }
}

// ============================================
// 测试 3: 测试订阅升级逻辑（先禁用后创建）
// ============================================
async function testSubscriptionUpgrade() {
  logTest('3. 测试订阅升级逻辑（Plus → Premium）');

  try {
    // 创建测试用户
    const testUserId = 'test-upgrade-user-' + Date.now();
    const createdUserId = await createTestUser(testUserId);
    if (createdUserId !== testUserId) {
      logFail(`用户ID不匹配: 期望 ${testUserId}, 实际 ${createdUserId}`);
      return false;
    }
    logPass(`测试用户已创建: ${testUserId}`);

    // 步骤1: 创建初始 Plus 订阅
    const createPlusMutation = `
      mutation CreatePlusSubscription($userId: String!) {
        insert_user_subscriptions_one(
          object: {
            user_id: $userId
            plan: "plus"
            payment_provider: "paypal"
            paypal_subscription_id: "test-sub-plus-${Date.now()}"
            is_active: true
            created_at: "now()"
          }
        ) {
          id
          user_id
          plan
          is_active
        }
      }
    `;

    const plusResult = await queryHasura(createPlusMutation, { userId: testUserId });
    const plusSubscriptionId = plusResult.insert_user_subscriptions_one.id;
    logPass(`创建 Plus 订阅，ID: ${plusSubscriptionId}`);

    // 步骤2: 模拟升级到 Premium（先禁用后创建）
    // 禁用所有活跃订阅
    const deactivateMutation = `
      mutation DeactivateSubscriptions($userId: String!) {
        update_user_subscriptions(
          where: { 
            user_id: { _eq: $userId }
            is_active: { _eq: true }
          }
          _set: { is_active: false }
        ) {
          affected_rows
          returning {
            id
            plan
            is_active
          }
        }
      }
    `;

    const deactivateResult = await queryHasura(deactivateMutation, { userId: testUserId });
    
    if (deactivateResult.update_user_subscriptions.affected_rows !== 1) {
      logFail(`期望禁用 1 条订阅，实际禁用 ${deactivateResult.affected_rows} 条`);
      return false;
    }

    if (!deactivateResult.update_user_subscriptions.returning[0].is_active === false) {
      logFail('Plus 订阅未正确禁用');
      return false;
    }

    logPass(`Plus 订阅已禁用（ID: ${plusSubscriptionId}）`);

    // 步骤3: 创建新的 Premium 订阅
    const createPremiumMutation = `
      mutation CreatePremiumSubscription($userId: String!) {
        insert_user_subscriptions_one(
          object: {
            user_id: $userId
            plan: "premium"
            payment_provider: "paypal"
            paypal_subscription_id: "test-sub-premium-${Date.now()}"
            is_active: true
            created_at: "now()"
          }
        ) {
          id
          user_id
          plan
          is_active
        }
      }
    `;

    const premiumResult = await queryHasura(createPremiumMutation, { userId: testUserId });
    const premiumSubscriptionId = premiumResult.insert_user_subscriptions_one.id;
    logPass(`创建 Premium 订阅，ID: ${premiumSubscriptionId}`);

    // 步骤4: 验证历史记录保留
    const verifyQuery = `
      query VerifySubscriptions($userId: String!) {
        user_subscriptions(
          where: { user_id: { _eq: $userId } }
          order_by: { created_at: asc }
        ) {
          id
          plan
          is_active
          created_at
        }
      }
    `;

    const verifyResult = await queryHasura(verifyQuery, { userId: testUserId });
    
    if (verifyResult.user_subscriptions.length !== 2) {
      logFail(`期望 2 条订阅记录，实际 ${verifyResult.user_subscriptions.length} 条`);
      return false;
    }

    const plusSub = verifyResult.user_subscriptions.find(s => s.plan === 'plus');
    const premiumSub = verifyResult.user_subscriptions.find(s => s.plan === 'premium');

    if (!plusSub || plusSub.is_active !== false) {
      logFail('Plus 订阅历史记录未正确保留或未禁用');
      return false;
    }

    if (!premiumSub || premiumSub.is_active !== true) {
      logFail('Premium 订阅未正确创建或未激活');
      return false;
    }

    logPass('订阅升级逻辑正确：历史记录保留，新订阅激活');

    // 清理测试数据
    const deleteSubMutation = `
      mutation DeleteTestSubscriptions($userId: String!) {
        delete_user_subscriptions(where: { user_id: { _eq: $userId } }) {
          affected_rows
        }
      }
    `;

    await queryHasura(deleteSubMutation, { userId: testUserId });

    const deleteUserMutation = `
      mutation DeleteTestUser($userId: String!) {
        delete_users_by_pk(id: $userId) {
          id
        }
      }
    `;

    try {
      await queryHasura(deleteUserMutation, { userId: testUserId });
    } catch (e) {
      // 忽略删除用户错误
    }

    logPass('测试数据已清理');

    return true;
  } catch (error) {
    logFail('订阅升级测试失败', error);
    return false;
  }
}

// ============================================
// 测试 4: 测试支付记录关联订阅
// ============================================
async function testPaymentSubscriptionLink() {
  logTest('4. 测试支付记录关联订阅');

  try {
    const testUserId = 'test-link-user-' + Date.now();
    
    // 创建测试用户
    const createdUserId = await createTestUser(testUserId);
    if (createdUserId !== testUserId) {
      logFail(`用户ID不匹配: 期望 ${testUserId}, 实际 ${createdUserId}`);
      return false;
    }
    logPass(`测试用户已创建: ${testUserId}`);

    // 创建测试订阅
    const createSubMutation = `
      mutation CreateTestSubscription($userId: String!) {
        insert_user_subscriptions_one(
          object: {
            user_id: $userId
            plan: "plus"
            payment_provider: "paypal"
            paypal_subscription_id: "test-link-sub-${Date.now()}"
            is_active: true
            created_at: "now()"
          }
        ) {
          id
        }
      }
    `;

    const subResult = await queryHasura(createSubMutation, { userId: testUserId });
    const subscriptionId = subResult.insert_user_subscriptions_one.id;

    // 创建关联的支付记录
    const createPaymentMutation = `
      mutation CreateLinkedPayment($userId: String!, $subscriptionId: Int!) {
        insert_payment_one(
          object: {
            user_id: $userId
            amount: 9.99
            currency: "USD"
            status: "completed"
            payment_provider: "paypal"
            subscription_id: $subscriptionId
            provider_subscription_id: "test-link-sub-${Date.now()}"
            plan: "plus"
            payment_date: "now()"
          }
        ) {
          id
          subscription_id
        }
      }
    `;

    const paymentResult = await queryHasura(createPaymentMutation, {
      userId: testUserId,
      subscriptionId: subscriptionId
    });

    const paymentId = paymentResult.insert_payment_one.id;

    if (paymentResult.insert_payment_one.subscription_id !== subscriptionId) {
      logFail('支付记录的 subscription_id 不正确');
      return false;
    }

    logPass('支付记录已创建并关联到订阅（subscription_id 正确）');

    // 测试关系查询（如果已配置）
    try {
      const relationQuery = `
        query GetPaymentWithSubscription($paymentId: Int!) {
          payment_by_pk(id: $paymentId) {
            id
            subscription_id
            subscription {
              id
              plan
              is_active
            }
          }
        }
      `;

      const relationResult = await queryHasura(relationQuery, { paymentId: paymentId });

      if (relationResult.payment_by_pk && relationResult.payment_by_pk.subscription) {
        if (relationResult.payment_by_pk.subscription.id !== subscriptionId) {
          logFail('通过关系查询的订阅ID不正确');
          return false;
        }
        logPass('payment.subscription 关系查询正常');
      } else {
        log('  ⚠️  payment.subscription 关系未配置', 'yellow');
        log('  提示: 在 Hasura Console 中配置 payment → user_subscriptions 关系', 'yellow');
      }
    } catch (error) {
      if (error.message && error.message.includes('field') && error.message.includes('subscription')) {
        log('  ⚠️  payment.subscription 关系未配置', 'yellow');
        log('  提示: 在 Hasura Console 中配置 payment → user_subscriptions 关系', 'yellow');
      } else {
        throw error;
      }
    }

    // 测试反向查询（订阅 → 支付）
    try {
      const reverseQuery = `
        query GetSubscriptionPayments($subscriptionId: Int!) {
          user_subscriptions_by_pk(id: $subscriptionId) {
            id
            plan
            payments {
              id
              amount
              status
            }
          }
        }
      `;

      const reverseResult = await queryHasura(reverseQuery, { subscriptionId });

      if (!reverseResult.user_subscriptions_by_pk.payments || 
          reverseResult.user_subscriptions_by_pk.payments.length === 0) {
        log('  ⚠️  user_subscriptions.payments 关系未配置或未返回数据', 'yellow');
        log('  提示: 在 Hasura Console 中配置 user_subscriptions → payment 关系', 'yellow');
      } else {
        logPass('反向查询正常：可通过订阅查询支付记录');
      }
    } catch (error) {
      if (error.message && error.message.includes('field') && error.message.includes('payments')) {
        log('  ⚠️  user_subscriptions.payments 关系未配置', 'yellow');
        log('  提示: 在 Hasura Console 中配置 user_subscriptions → payment 关系', 'yellow');
      } else {
        throw error;
      }
    }

    // 清理
    const deletePaymentMutation = `
      mutation DeleteTestPayment($id: Int!) {
        delete_payment_by_pk(id: $id) {
          id
        }
      }
    `;

    await queryHasura(deletePaymentMutation, { id: paymentId });

    const deleteSubMutation = `
      mutation DeleteTestSubscription($id: Int!) {
        delete_user_subscriptions_by_pk(id: $id) {
          id
        }
      }
    `;

    await queryHasura(deleteSubMutation, { id: subscriptionId });

    const deleteUserMutation = `
      mutation DeleteTestUser($userId: String!) {
        delete_users_by_pk(id: $userId) {
          id
        }
      }
    `;

    try {
      await queryHasura(deleteUserMutation, { userId: testUserId });
    } catch (e) {
      // 忽略删除用户错误
    }

    logPass('测试数据已清理');

    return true;
  } catch (error) {
    logFail('支付记录关联测试失败', error);
    return false;
  }
}

// ============================================
// 测试 5: 测试触发器（updated_at 自动更新）
// ============================================
async function testTrigger() {
  logTest('5. 测试 updated_at 触发器');

  try {
    const testUserId = 'test-trigger-user-' + Date.now();

    // 插入测试支付记录
    const insertMutation = `
      mutation InsertTestPayment($userId: String!) {
        insert_payment_one(
          object: {
            user_id: $userId
            amount: 9.99
            currency: "USD"
            status: "pending"
            payment_provider: "paypal"
            plan: "plus"
            payment_date: "now()"
          }
        ) {
          id
          created_at
          updated_at
        }
      }
    `;

    const insertResult = await queryHasura(insertMutation, { userId: testUserId });
    const paymentId = insertResult.insert_payment_one.id;
    const initialUpdatedAt = insertResult.insert_payment_one.updated_at;

    // 等待一秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 更新支付记录
    const updateMutation = `
      mutation UpdateTestPayment($id: Int!) {
        update_payment_by_pk(
          pk_columns: { id: $id }
          _set: { status: "completed" }
        ) {
          id
          updated_at
        }
      }
    `;

    const updateResult = await queryHasura(updateMutation, { id: paymentId });
    const newUpdatedAt = updateResult.update_payment_by_pk.updated_at;

    if (newUpdatedAt === initialUpdatedAt) {
      logFail('updated_at 未自动更新');
      return false;
    }

    logPass('触发器工作正常：updated_at 自动更新');

    // 清理
    const deleteMutation = `
      mutation DeleteTestPayment($id: Int!) {
        delete_payment_by_pk(id: $id) {
          id
        }
      }
    `;

    await queryHasura(deleteMutation, { id: paymentId });
    logPass('测试数据已清理');

    return true;
  } catch (error) {
    logFail('触发器测试失败', error);
    return false;
  }
}

// ============================================
// 主测试函数
// ============================================
async function runAllTests() {
  log('\n🚀 开始自动测试 Payment 表和订阅升级功能\n', 'blue');
  log('=' .repeat(60), 'blue');

  // 检查配置
  if (!HASURA_GRAPHQL_ENDPOINT || !HASURA_ADMIN_SECRET) {
    logFail('Hasura 配置缺失，请检查 .env.local 文件');
    log('需要设置: HASURA_GRAPHQL_ENDPOINT 和 HASURA_ADMIN_SECRET', 'yellow');
    return;
  }

  logPass('Hasura 配置检查通过');

  // 运行所有测试
  await testTableStructure();
  await testInsertPayment();
  await testSubscriptionUpgrade();
  await testPaymentSubscriptionLink();
  await testTrigger();

  // 输出测试结果
  log('\n' + '='.repeat(60), 'blue');
  log('\n📊 测试结果汇总\n', 'blue');
  log(`✅ 通过: ${testResults.passed}`, 'green');
  log(`❌ 失败: ${testResults.failed}`, 'red');
  log(`📈 总计: ${testResults.passed + testResults.failed}\n`, 'cyan');

  if (testResults.errors.length > 0) {
    log('\n❌ 错误详情:\n', 'red');
    testResults.errors.forEach((err, index) => {
      log(`${index + 1}. ${err.message}`, 'red');
      if (err.error) {
        log(`   错误: ${err.error}`, 'yellow');
      }
    });
  }

  if (testResults.failed === 0) {
    log('\n🎉 所有测试通过！', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  部分测试失败，请检查上述错误', 'yellow');
    process.exit(1);
  }
}

// 运行测试
runAllTests().catch(error => {
  logFail('测试执行失败', error);
  console.error(error);
  process.exit(1);
});

