/**
 * 自动诊断会员计划显示问题
 * 模拟前端逻辑，找出问题所在
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
  return result;
}

// 模拟前端的 loadCurrentMembership 函数
async function loadCurrentMembership(userId) {
  console.log(`\n🔍 模拟 loadCurrentMembership(${userId})...\n`);
  
  const query = `
    query GetUserMembership($userId: String!) {
      users_by_pk(id: $userId) {
        user_subscriptions(
          where: { is_active: { _eq: true } }
          order_by: { created_at: desc }
          limit: 1
        ) {
          plan
          is_active
          id
        }
      }
    }
  `;
  
  const result = await queryHasura(query, { userId });
  
  console.log('📦 GraphQL 响应:');
  console.log(JSON.stringify(result, null, 2));
  
  let currentPlan = 'free'; // 默认值
  
  if (result.errors) {
    console.error('❌ GraphQL 错误:', result.errors);
    return currentPlan;
  }
  
  if (result.data?.users_by_pk?.user_subscriptions?.[0]) {
    const subscription = result.data.users_by_pk.user_subscriptions[0];
    currentPlan = subscription.plan;
    console.log(`\n✅ 找到活跃订阅: plan="${currentPlan}", id=${subscription.id}, active=${subscription.is_active}`);
  } else {
    console.log('\n⚠️ 没有找到活跃订阅，使用默认值 "free"');
    if (!result.data?.users_by_pk) {
      console.log('   原因: 用户不存在于 users_by_pk');
    } else if (!result.data.users_by_pk.user_subscriptions) {
      console.log('   原因: user_subscriptions 为空或 null');
    } else {
      console.log('   原因: user_subscriptions 数组为空');
    }
  }
  
  return currentPlan;
}

// 模拟前端的卡片渲染逻辑
function simulateCardRendering(currentPlan, plans) {
  console.log(`\n\n🎨 模拟卡片渲染...\n`);
  console.log(`当前计划: "${currentPlan}"\n`);
  
  const issues = [];
  
  plans.forEach(plan => {
    const isCurrentPlan = currentPlan === plan.id;
    const buttonText = isCurrentPlan ? 'Current Plan' : (plan.id === 'free' ? 'Get Started' : 'Upgrade Now ✨');
    
    console.log(`📋 ${plan.name} 卡片:`);
    console.log(`   计划ID: "${plan.id}"`);
    console.log(`   比较: "${currentPlan}" === "${plan.id}" ? ${isCurrentPlan}`);
    console.log(`   按钮文本: "${buttonText}"`);
    
    if (isCurrentPlan) {
      console.log(`   ✅ 这张卡片会显示 "Current Plan"`);
      
      if (plan.id !== currentPlan) {
        issues.push(`警告: 卡片 ${plan.id} 显示为当前计划，但 currentPlan="${currentPlan}"`);
      }
    }
    console.log('');
  });
  
  return issues;
}

async function autoDiagnose() {
  console.log('\n'.repeat(2));
  console.log('='.repeat(60));
  console.log('  自动诊断会员计划显示问题');
  console.log('='.repeat(60));
  
  try {
    // 1. 查找所有活跃的 Plus 用户
    console.log('\n\n第1步: 查找 Plus 用户...\n');
    
    const findUsersQuery = `
      query FindPlusUsers {
        user_subscriptions(
          where: {
            plan: { _eq: "plus" }
            is_active: { _eq: true }
          }
          limit: 3
        ) {
          user_id
          plan
          id
        }
      }
    `;
    
    const usersResult = await queryHasura(findUsersQuery);
    
    if (usersResult.errors) {
      console.error('❌ 查询失败:', usersResult.errors);
      return;
    }
    
    const plusUsers = usersResult.data.user_subscriptions || [];
    
    if (plusUsers.length === 0) {
      console.log('❌ 没有找到活跃的 Plus 用户');
      console.log('   请先创建一个 Plus 订阅进行测试');
      return;
    }
    
    console.log(`✅ 找到 ${plusUsers.length} 个 Plus 用户\n`);
    
    // 2. 对每个用户进行诊断
    for (let i = 0; i < Math.min(plusUsers.length, 2); i++) {
      const user = plusUsers[i];
      
      console.log('\n' + '='.repeat(60));
      console.log(`  测试用户 ${i + 1}: ${user.user_id}`);
      console.log('='.repeat(60));
      
      // 模拟前端加载会员信息
      const currentPlan = await loadCurrentMembership(user.user_id);
      
      // 模拟套餐列表
      const plans = [
        { id: 'free', name: 'Free' },
        { id: 'plus', name: 'Plus' },
        { id: 'premium', name: 'Premium' }
      ];
      
      // 模拟卡片渲染
      const issues = simulateCardRendering(currentPlan, plans);
      
      // 诊断结果
      console.log('\n' + '-'.repeat(60));
      console.log('  诊断结果');
      console.log('-'.repeat(60) + '\n');
      
      if (currentPlan === 'plus') {
        console.log('✅ currentPlan 值正确: "plus"');
      } else {
        console.log(`❌ 问题: currentPlan="${currentPlan}"，应该是 "plus"`);
        console.log('   这会导致 "Current Plan" 显示在错误的卡片上！');
      }
      
      if (issues.length > 0) {
        console.log('\n⚠️ 发现的问题:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('\n✅ 没有发现逻辑问题');
      }
      
      // 给出建议
      console.log('\n💡 建议:');
      if (currentPlan !== 'plus') {
        console.log('   1. 检查数据库中该用户的 user_subscriptions 记录');
        console.log('   2. 确认 is_active = true');
        console.log('   3. 确认 plan = "plus" (无空格、无大写)');
        console.log('   4. 检查前端是否正确调用了 loadCurrentMembership()');
      } else {
        console.log('   数据加载正常，问题可能在于:');
        console.log('   1. 浏览器缓存 - 尝试硬刷新 (Ctrl+Shift+R)');
        console.log('   2. 前端代码未更新 - 确认服务器已重启');
        console.log('   3. JavaScript 执行顺序问题 - 查看浏览器控制台日志');
      }
    }
    
    // 3. 检查是否有数据不一致的情况
    console.log('\n\n' + '='.repeat(60));
    console.log('  数据一致性检查');
    console.log('='.repeat(60) + '\n');
    
    const checkQuery = `
      query CheckDataConsistency {
        user_subscriptions(
          where: {
            is_active: { _eq: true }
          }
        ) {
          user_id
          plan
          is_active
          id
        }
      }
    `;
    
    const checkResult = await queryHasura(checkQuery);
    const allActiveSubs = checkResult.data.user_subscriptions || [];
    
    // 检查每个用户是否有多个活跃订阅
    const userSubCounts = {};
    allActiveSubs.forEach(sub => {
      userSubCounts[sub.user_id] = (userSubCounts[sub.user_id] || 0) + 1;
    });
    
    const duplicateUsers = Object.entries(userSubCounts).filter(([_, count]) => count > 1);
    
    if (duplicateUsers.length > 0) {
      console.log('⚠️ 发现用户有多个活跃订阅:');
      duplicateUsers.forEach(([userId, count]) => {
        console.log(`   用户 ${userId}: ${count} 个活跃订阅`);
      });
      console.log('\n   建议: 运行以下查询检查详细情况');
      console.log('   并确保每个用户只有一个活跃订阅\n');
    } else {
      console.log('✅ 数据一致性正常，每个用户最多一个活跃订阅\n');
    }
    
  } catch (error) {
    console.error('\n❌ 诊断失败:', error.message);
    console.error('   详细错误:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('  诊断完成');
  console.log('='.repeat(60) + '\n');
}

autoDiagnose();


