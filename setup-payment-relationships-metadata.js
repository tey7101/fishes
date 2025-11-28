/**
 * 使用 Hasura Metadata API 自动配置 Payment 表的关系
 * 
 * 使用方法：
 * node setup-payment-relationships-metadata.js
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

// 获取 Hasura Metadata API 端点
function getMetadataEndpoint() {
  if (!HASURA_GRAPHQL_ENDPOINT) {
    throw new Error('HASURA_GRAPHQL_ENDPOINT not set');
  }
  // 从 GraphQL 端点推导 Metadata API 端点
  return HASURA_GRAPHQL_ENDPOINT.replace('/v1/graphql', '/v1/metadata');
}

async function callMetadataAPI(payload) {
  const metadataEndpoint = getMetadataEndpoint();
  
  if (!HASURA_ADMIN_SECRET) {
    throw new Error('HASURA_ADMIN_SECRET not set');
  }

  const response = await fetch(metadataEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Metadata API error: ${JSON.stringify(result.error)}`);
  }

  return result;
}

// ============================================
// 导出当前元数据
// ============================================
async function exportMetadata() {
  log('\n📥 导出当前元数据...', 'cyan');
  
  try {
    const result = await callMetadataAPI({
      type: 'export_metadata',
      args: {}
    });
    log('  ✅ 元数据导出成功', 'green');
    return result;
  } catch (error) {
    log('  ❌ 导出元数据失败: ' + error.message, 'red');
    throw error;
  }
}

// ============================================
// 配置关系 1: Payment → User Subscriptions
// ============================================
async function addPaymentSubscriptionRelation() {
  log('\n🔗 配置关系: payment → user_subscriptions (Object Relationship)', 'cyan');

  const payload = {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'payment',
      name: 'subscription',
      using: {
        foreign_key_constraint_on: 'subscription_id'
      }
    }
  };

  try {
    await callMetadataAPI(payload);
    log('  ✅ payment.subscription 关系已创建', 'green');
    return true;
  } catch (error) {
    if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
      log('  ℹ️  payment.subscription 关系已存在', 'yellow');
      return true;
    } else {
      log('  ❌ 创建关系失败: ' + error.message, 'red');
      return false;
    }
  }
}

// ============================================
// 配置关系 2: User Subscriptions → Payment
// ============================================
async function addSubscriptionPaymentRelation() {
  log('\n🔗 配置关系: user_subscriptions → payment (Array Relationship)', 'cyan');

  const payload = {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'user_subscriptions',
      name: 'payments',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'public',
            name: 'payment'
          },
          columns: ['subscription_id']
        }
      }
    }
  };

  try {
    await callMetadataAPI(payload);
    log('  ✅ user_subscriptions.payments 关系已创建', 'green');
    return true;
  } catch (error) {
    if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
      log('  ℹ️  user_subscriptions.payments 关系已存在', 'yellow');
      return true;
    } else {
      log('  ❌ 创建关系失败: ' + error.message, 'red');
      return false;
    }
  }
}

// ============================================
// 应用元数据
// ============================================
async function applyMetadata(metadata) {
  log('\n💾 应用元数据...', 'cyan');
  
  try {
    await callMetadataAPI({
      type: 'replace_metadata',
      args: {
        metadata: metadata
      }
    });
    log('  ✅ 元数据应用成功', 'green');
    return true;
  } catch (error) {
    log('  ❌ 应用元数据失败: ' + error.message, 'red');
    return false;
  }
}

// ============================================
// 验证关系
// ============================================
async function verifyRelations() {
  log('\n🔍 验证关系配置...', 'cyan');

  const queryHasura = async (query, variables = {}) => {
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
  };

  // 测试 payment.subscription 关系
  try {
    const testQuery = `
      query TestPaymentRelation {
        payment(limit: 1) {
          id
          subscription_id
          subscription {
            id
            plan
          }
        }
      }
    `;

    await queryHasura(testQuery);
    log('  ✅ payment.subscription 关系工作正常', 'green');
  } catch (error) {
    if (error.message && error.message.includes('field') && error.message.includes('subscription')) {
      log('  ❌ payment.subscription 关系未配置', 'red');
    } else {
      log('  ⚠️  测试 payment.subscription 关系时出错: ' + error.message, 'yellow');
    }
  }

  // 测试 user_subscriptions.payments 关系
  try {
    const testQuery = `
      query TestSubscriptionRelation {
        user_subscriptions(limit: 1) {
          id
          plan
          payments {
            id
            amount
          }
        }
      }
    `;

    await queryHasura(testQuery);
    log('  ✅ user_subscriptions.payments 关系工作正常', 'green');
  } catch (error) {
    if (error.message && error.message.includes('field') && error.message.includes('payments')) {
      log('  ❌ user_subscriptions.payments 关系未配置', 'red');
    } else {
      log('  ⚠️  测试 user_subscriptions.payments 关系时出错: ' + error.message, 'yellow');
    }
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

  try {
    // 配置关系
    const result1 = await addPaymentSubscriptionRelation();
    const result2 = await addSubscriptionPaymentRelation();

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
      log('⚠️  部分关系配置失败', 'yellow');
      log('\n💡 如果自动配置失败，请手动在 Hasura Console 中配置：', 'yellow');
      log('   1. 进入 Data → payment 表 → Relationships', 'yellow');
      log('   2. 点击 Add → Object Relationship', 'yellow');
      log('      - Name: subscription', 'yellow');
      log('      - Reference Schema: public', 'yellow');
      log('      - Reference Table: user_subscriptions', 'yellow');
      log('      - From: subscription_id', 'yellow');
      log('      - To: id', 'yellow');
      log('   3. 进入 Data → user_subscriptions 表 → Relationships', 'yellow');
      log('   4. 点击 Add → Array Relationship', 'yellow');
      log('      - Name: payments', 'yellow');
      log('      - Reference Schema: public', 'yellow');
      log('      - Reference Table: payment', 'yellow');
      log('      - From: id', 'yellow');
      log('      - To: subscription_id', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    log('\n❌ 配置过程出错: ' + error.message, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行
setupRelations().catch(error => {
  log('\n❌ 配置失败: ' + error.message, 'red');
  console.error(error);
  process.exit(1);
});

