/**
 * 自动配置 Payment 表的 Hasura 关系
 * 
 * 使用方法：
 * node setup-payment-relationships.js
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

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
// 配置关系 1: Payment → User Subscriptions (Object Relationship)
// ============================================
async function setupPaymentToSubscriptionRelation() {
  log('\n🔗 配置关系: payment → user_subscriptions (Object Relationship)', 'cyan');

  const mutation = `
    mutation CreatePaymentSubscriptionRelation {
      pg_create_object_relationship(
        source: "default"
        table: "payment"
        name: "subscription"
        using: {
          foreign_key_constraint_on: "subscription_id"
        }
      ) {
        message
      }
    }
  `;

  try {
    const result = await queryHasura(mutation);
    log('  ✅ payment.subscription 关系已创建', 'green');
    return true;
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      log('  ℹ️  payment.subscription 关系已存在', 'yellow');
      return true;
    } else if (error.message && error.message.includes('constraint')) {
      log('  ⚠️  外键约束可能不存在，尝试手动创建...', 'yellow');
      log('  错误: ' + error.message, 'red');
      return false;
    } else {
      log('  ❌ 创建关系失败: ' + error.message, 'red');
      return false;
    }
  }
}

// ============================================
// 配置关系 2: User Subscriptions → Payment (Array Relationship)
// ============================================
async function setupSubscriptionToPaymentRelation() {
  log('\n🔗 配置关系: user_subscriptions → payment (Array Relationship)', 'cyan');

  const mutation = `
    mutation CreateSubscriptionPaymentRelation {
      pg_create_array_relationship(
        source: "default"
        table: "user_subscriptions"
        name: "payments"
        using: {
          foreign_key_constraint_on: {
            table: "payment"
            columns: ["subscription_id"]
          }
        }
      ) {
        message
      }
    }
  `;

  try {
    const result = await queryHasura(mutation);
    log('  ✅ user_subscriptions.payments 关系已创建', 'green');
    return true;
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      log('  ℹ️  user_subscriptions.payments 关系已存在', 'yellow');
      return true;
    } else {
      log('  ❌ 创建关系失败: ' + error.message, 'red');
      return false;
    }
  }
}

// ============================================
// 验证关系是否已配置
// ============================================
async function verifyRelations() {
  log('\n🔍 验证关系配置...', 'cyan');

  try {
    // 测试 payment.subscription 关系
    const testPaymentQuery = `
      query TestPaymentRelation {
        payment(limit: 1) {
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

    try {
      const paymentResult = await queryHasura(testPaymentQuery);
      if (paymentResult.payment && paymentResult.payment.length > 0) {
        if (paymentResult.payment[0].subscription !== null) {
          log('  ✅ payment.subscription 关系工作正常', 'green');
        } else {
          log('  ⚠️  payment.subscription 关系存在但无数据', 'yellow');
        }
      } else {
        log('  ℹ️  payment 表无数据，无法测试关系', 'yellow');
      }
    } catch (error) {
      if (error.message && error.message.includes('field') && error.message.includes('subscription')) {
        log('  ❌ payment.subscription 关系未配置', 'red');
      } else {
        log('  ⚠️  测试 payment.subscription 关系时出错: ' + error.message, 'yellow');
      }
    }

    // 测试 user_subscriptions.payments 关系
    const testSubscriptionQuery = `
      query TestSubscriptionRelation {
        user_subscriptions(limit: 1) {
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

    try {
      const subscriptionResult = await queryHasura(testSubscriptionQuery);
      if (subscriptionResult.user_subscriptions && subscriptionResult.user_subscriptions.length > 0) {
        log('  ✅ user_subscriptions.payments 关系工作正常', 'green');
      } else {
        log('  ℹ️  user_subscriptions 表无数据，无法测试关系', 'yellow');
      }
    } catch (error) {
      if (error.message && error.message.includes('field') && error.message.includes('payments')) {
        log('  ❌ user_subscriptions.payments 关系未配置', 'red');
      } else {
        log('  ⚠️  测试 user_subscriptions.payments 关系时出错: ' + error.message, 'yellow');
      }
    }
  } catch (error) {
    log('  ⚠️  验证过程出错: ' + error.message, 'yellow');
  }
}

// ============================================
// 主函数
// ============================================
async function setupRelations() {
  log('\n🚀 开始配置 Payment 表的关系\n', 'blue');
  log('='.repeat(60), 'blue');

  // 检查配置
  if (!HASURA_GRAPHQL_ENDPOINT || !HASURA_ADMIN_SECRET) {
    log('❌ Hasura 配置缺失，请检查 .env.local 文件', 'red');
    log('需要设置: HASURA_GRAPHQL_ENDPOINT 和 HASURA_ADMIN_SECRET', 'yellow');
    process.exit(1);
  }

  log('✅ Hasura 配置检查通过\n', 'green');

  // 配置关系
  const result1 = await setupPaymentToSubscriptionRelation();
  const result2 = await setupSubscriptionToPaymentRelation();

  // 验证
  await verifyRelations();

  // 总结
  log('\n' + '='.repeat(60), 'blue');
  log('\n📊 配置结果\n', 'blue');

  if (result1 && result2) {
    log('✅ 所有关系配置完成！', 'green');
    log('\n现在可以使用以下 GraphQL 查询：\n', 'cyan');
    log('```graphql', 'cyan');
    log('query GetPaymentWithSubscription {', 'cyan');
    log('  payment {', 'cyan');
    log('    id', 'cyan');
    log('    amount', 'cyan');
    log('    subscription {', 'cyan');
    log('      plan', 'cyan');
    log('      is_active', 'cyan');
    log('    }', 'cyan');
    log('  }', 'cyan');
    log('}', 'cyan');
    log('```\n', 'cyan');
    log('```graphql', 'cyan');
    log('query GetSubscriptionWithPayments {', 'cyan');
    log('  user_subscriptions {', 'cyan');
    log('    id', 'cyan');
    log('    plan', 'cyan');
    log('    payments {', 'cyan');
    log('      id', 'cyan');
    log('      amount', 'cyan');
    log('      status', 'cyan');
    log('    }', 'cyan');
    log('  }', 'cyan');
    log('}\n', 'cyan');
    log('```\n', 'cyan');
    process.exit(0);
  } else {
    log('⚠️  部分关系配置失败，请检查上述错误', 'yellow');
    log('\n💡 提示：如果自动配置失败，可以手动在 Hasura Console 中配置：', 'yellow');
    log('   1. 进入 Data → payment 表 → Relationships', 'yellow');
    log('   2. 点击 Add 创建 Object Relationship: subscription', 'yellow');
    log('   3. 进入 Data → user_subscriptions 表 → Relationships', 'yellow');
    log('   4. 点击 Add 创建 Array Relationship: payments', 'yellow');
    process.exit(1);
  }
}

// 运行
setupRelations().catch(error => {
  log('\n❌ 配置失败: ' + error.message, 'red');
  console.error(error);
  process.exit(1);
});

