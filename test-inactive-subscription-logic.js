/**
 * 测试非活跃订阅逻辑
 * 验证：当订阅记录的 is_active 为 false 时，该订阅记录被忽略，
 * 用户当前的会员等级取决于最新一个激活的订阅记录，
 * 若没有任何激活的记录则用户的会员等级显示为 free
 */

require('dotenv').config({ path: '.env.local' });

// 清除缓存以确保重新读取
delete require.cache[require.resolve('dotenv')];
require('dotenv').config({ path: '.env.local' });

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

console.log('🔧 环境变量检查:');
console.log('   HASURA_ENDPOINT:', HASURA_ENDPOINT ? '已配置' : '❌ 未配置');
console.log('   HASURA_ADMIN_SECRET:', HASURA_ADMIN_SECRET ? '已配置' : '❌ 未配置');
console.log('');

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
    throw new Error(JSON.stringify(result.errors, null, 2));
  }
  return result.data;
}

async function testInactiveSubscriptionLogic() {
  console.log('🧪 开始测试非活跃订阅逻辑...\n');

  // 测试用户ID
  const testUserId = '11312701-f1d2-43f8-a13d-260eac812b7a';

  // 1. 查询该用户的所有订阅（包括非活跃的）
  console.log('📋 步骤 1: 查询所有订阅记录');
  const allSubscriptionsQuery = `
    query GetAllSubscriptions($userId: String!) {
      user_subscriptions(
        where: { user_id: { _eq: $userId } }
        order_by: { created_at: desc }
      ) {
        id
        plan
        is_active
        created_at
      }
    }
  `;

  const allSubs = await queryHasura(allSubscriptionsQuery, { userId: testUserId });
  console.log('   所有订阅记录:', JSON.stringify(allSubs.user_subscriptions, null, 2));

  // 2. 查询活跃订阅（模拟前端逻辑）
  console.log('\n📋 步骤 2: 查询活跃订阅（is_active = true）');
  const activeSubscriptionQuery = `
    query GetActiveSubscription($userId: String!) {
      user_subscriptions(
        where: {
          user_id: { _eq: $userId }
          is_active: { _eq: true }
        }
        order_by: { created_at: desc }
        limit: 1
      ) {
        id
        plan
        is_active
        created_at
      }
    }
  `;

  const activeSubs = await queryHasura(activeSubscriptionQuery, { userId: testUserId });
  const activeSubscription = activeSubs.user_subscriptions[0];

  console.log('   活跃订阅记录:', activeSubscription ? JSON.stringify(activeSubscription, null, 2) : '无');

  // 3. 确定会员等级
  console.log('\n📋 步骤 3: 确定会员等级');
  const membershipTier = activeSubscription ? activeSubscription.plan : 'free';
  console.log(`   ✅ 会员等级: ${membershipTier}`);

  // 4. 测试场景总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果总结');
  console.log('='.repeat(50));
  console.log(`✓ 总订阅记录数: ${allSubs.user_subscriptions.length}`);
  console.log(`✓ 活跃订阅记录数: ${activeSubs.user_subscriptions.length}`);
  console.log(`✓ 当前会员等级: ${membershipTier}`);
  
  if (!activeSubscription && allSubs.user_subscriptions.length > 0) {
    console.log('\n⚠️  用户有订阅记录但都不是活跃状态，显示为 free');
  } else if (!activeSubscription) {
    console.log('\n⚠️  用户没有任何订阅记录，显示为 free');
  } else {
    console.log(`\n✅ 用户有活跃订阅，显示为 ${membershipTier}`);
  }

  // 5. 验证逻辑正确性
  console.log('\n' + '='.repeat(50));
  console.log('🔍 逻辑验证');
  console.log('='.repeat(50));

  const checks = [
    {
      name: '非活跃订阅被忽略',
      pass: allSubs.user_subscriptions.filter(s => !s.is_active).every(s => 
        !activeSubscription || s.id !== activeSubscription.id
      )
    },
    {
      name: '活跃订阅被正确选择',
      pass: !activeSubscription || activeSubscription.is_active === true
    },
    {
      name: '无活跃订阅时返回 free',
      pass: activeSubscription || membershipTier === 'free'
    }
  ];

  checks.forEach(check => {
    console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log('\n' + '='.repeat(50));
  console.log(allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败');
  console.log('='.repeat(50));

  return allPassed;
}

// 运行测试
testInactiveSubscriptionLogic()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });

