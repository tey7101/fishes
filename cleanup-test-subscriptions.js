/**
 * 清理测试订阅记录
 * 用于清理测试过程中创建的错误数据
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function queryHasura(query, variables = {}) {
  const response = await fetch(HASURA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
  }

  return result.data;
}

async function cleanup() {
  console.log('\n🧹 清理测试订阅记录...\n');
  
  const userId = '029a2488-4794-4d25-ae70-7a06a44c1df7'; // 用户的ID
  
  try {
    // 1. 查看当前订阅
    console.log('1️⃣ 查看用户当前的订阅记录...\n');
    const viewQuery = `
      query ViewSubscriptions($userId: String!) {
        user_subscriptions(
          where: { user_id: { _eq: $userId } }
          order_by: { created_at: desc }
        ) {
          id
          plan
          is_active
          paypal_subscription_id
          created_at
          payments {
            id
            plan
            amount
          }
        }
      }
    `;
    
    const viewData = await queryHasura(viewQuery, { userId });
    const subs = viewData.user_subscriptions || [];
    
    console.log(`找到 ${subs.length} 条订阅记录:\n`);
    subs.forEach((sub, index) => {
      console.log(`${index + 1}. 订阅ID: ${sub.id}`);
      console.log(`   Plan: ${sub.plan}`);
      console.log(`   活跃: ${sub.is_active}`);
      console.log(`   PayPal订阅ID: ${sub.paypal_subscription_id || 'NULL'}`);
      console.log(`   创建时间: ${sub.created_at}`);
      console.log(`   支付记录: ${sub.payments ? sub.payments.length : 0} 条`);
      console.log('');
    });
    
    // 2. 只保留最新的活跃订阅
    console.log('2️⃣ 建议的清理操作:\n');
    
    const activeSubs = subs.filter(s => s.is_active);
    const inactiveSubs = subs.filter(s => !s.is_active);
    
    if (activeSubs.length > 1) {
      console.log(`⚠️ 发现 ${activeSubs.length} 个活跃订阅，应该只有1个`);
      console.log(`   建议：禁用除最新订阅外的所有订阅\n`);
    }
    
    if (activeSubs.length === 0) {
      console.log('⚠️ 没有活跃订阅，用户将显示为 Free');
      console.log('   建议：激活一个订阅\n');
    }
    
    // 3. 查找 plan='free' 的付费订阅（错误数据）
    const wrongSubs = subs.filter(s => s.plan === 'free' && s.paypal_subscription_id);
    if (wrongSubs.length > 0) {
      console.log(`❌ 发现 ${wrongSubs.length} 条错误的订阅记录 (plan='free' 但有PayPal订阅ID):\n`);
      wrongSubs.forEach(sub => {
        console.log(`   订阅ID: ${sub.id}, PayPal ID: ${sub.paypal_subscription_id}`);
      });
      console.log('\n   这些记录应该被删除或修正\n');
    }
    
    // 4. 建议的操作
    console.log('3️⃣ 建议的修复操作:\n');
    
    if (activeSubs.length === 1 && activeSubs[0].plan === 'plus') {
      console.log('✅ 当前状态正常：1个活跃的 Plus 订阅');
      console.log('   如果需要升级到 Premium，请：');
      console.log('   1. 重启服务器（确保使用最新代码）');
      console.log('   2. 点击 Premium 卡片升级');
      console.log('   3. 查看服务器日志确认 Plan Name 识别正确\n');
    } else if (wrongSubs.length > 0) {
      console.log('⚠️ 需要清理错误的订阅记录');
      console.log('   执行以下操作：');
      console.log('   - 删除 plan="free" 但有 PayPal 订阅ID 的记录');
      console.log('   - 或手动修正 plan 字段\n');
    }
    
    console.log('4️⃣ 是否执行清理？\n');
    console.log('  本脚本当前只是诊断模式，不会修改数据');
    console.log('  如需清理，请手动在 Hasura Console 或数据库中操作\n');
    
  } catch (error) {
    console.error('\n❌ 清理失败:', error.message);
  }
}

cleanup();

