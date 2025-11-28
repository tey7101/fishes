/**
 * 测试会员计划显示问题
 * 检查为什么 Plus 用户的 "Current Plan" 显示在 Free 卡片上
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

async function testMembershipDisplay() {
  console.log('\n🔍 测试会员计划显示问题...\n');

  try {
    // 1. 查找所有活跃的 Plus 用户
    console.log('1️⃣ 查找活跃的 Plus 用户...\n');
    const query = `
      query GetPlusUsers {
        user_subscriptions(
          where: {
            plan: { _eq: "plus" }
            is_active: { _eq: true }
          }
          limit: 5
        ) {
          id
          user_id
          plan
          is_active
          created_at
          user {
            id
            email
          }
        }
      }
    `;

    const data = await queryHasura(query);
    const plusUsers = data.user_subscriptions || [];

    if (plusUsers.length === 0) {
      console.log('❌ 没有找到活跃的 Plus 用户');
      return;
    }

    console.log(`✅ 找到 ${plusUsers.length} 个 Plus 用户:\n`);

    plusUsers.forEach((sub, index) => {
      console.log(`${index + 1}. 用户ID: ${sub.user_id}`);
      console.log(`   Email: ${sub.user?.email || 'N/A'}`);
      console.log(`   订阅ID: ${sub.id}`);
      console.log(`   Plan字段值: "${sub.plan}" (长度: ${sub.plan.length})`);
      console.log(`   是否活跃: ${sub.is_active}`);
      console.log(`   创建时间: ${sub.created_at}`);
      
      // 检查 plan 值的问题
      if (sub.plan !== 'plus') {
        console.log(`   ⚠️  警告: plan 值不是精确的 "plus"`);
      }
      if (sub.plan.trim() !== sub.plan) {
        console.log(`   ⚠️  警告: plan 值包含空格`);
      }
      if (sub.plan !== sub.plan.toLowerCase()) {
        console.log(`   ⚠️  警告: plan 值包含大写字母`);
      }
      console.log('');
    });

    // 2. 测试前端判断逻辑
    console.log('\n2️⃣ 模拟前端判断逻辑...\n');
    
    const testUser = plusUsers[0];
    const currentPlan = testUser.plan;
    
    console.log(`当前用户计划: "${currentPlan}"`);
    
    const plans = ['free', 'plus', 'premium'];
    plans.forEach(planId => {
      const isCurrentPlan = currentPlan === planId;
      console.log(`  检查 ${planId}: currentPlan === "${planId}" ? ${isCurrentPlan}`);
    });

    // 3. 检查可能的大小写或空格问题
    console.log('\n3️⃣ 检查 plan 值的详细信息...\n');
    console.log(`原始值: "${currentPlan}"`);
    console.log(`小写: "${currentPlan.toLowerCase()}"`);
    console.log(`去除空格: "${currentPlan.trim()}"`);
    console.log(`字符编码:`, Array.from(currentPlan).map(c => c.charCodeAt(0)));
    
    // 4. 查看所有可能的 plan 值
    console.log('\n4️⃣ 检查数据库中所有的 plan 值...\n');
    const allPlansQuery = `
      query GetAllPlans {
        user_subscriptions(distinct_on: plan) {
          plan
        }
      }
    `;
    
    const allPlansData = await queryHasura(allPlansQuery);
    console.log('数据库中存在的 plan 值:');
    allPlansData.user_subscriptions.forEach(sub => {
      console.log(`  - "${sub.plan}" (长度: ${sub.plan.length})`);
    });

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

testMembershipDisplay();

