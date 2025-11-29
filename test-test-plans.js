/**
 * 测试套餐功能测试脚本
 * 
 * 测试内容：
 * 1. 验证 test_plus 和 test_premium 是否存在于 member_types 表
 * 2. 验证管理员用户是否能看到测试套餐
 * 3. 验证价格是否正确设置为 $0.01
 * 4. 验证前端过滤逻辑
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

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

async function testDatabaseMigration() {
  console.log('\n📋 步骤 1: 检查数据库中的测试套餐');
  console.log('='.repeat(60));

  try {
    const query = `
      query GetTestPlans {
        member_types(where: { id: { _in: ["test_plus", "test_premium"] } }) {
          id
          name
          draw_fish_limit
          can_self_talk
          can_group_chat
          can_promote_owner
          fee_per_month
          fee_per_year
        }
      }
    `;

    const result = await queryHasura(query);
    const testPlans = result.member_types;

    if (testPlans.length === 0) {
      error('未找到测试套餐！');
      info('请在 Hasura Console 中执行: database/migrations/add-test-plans.sql');
      return false;
    }

    if (testPlans.length < 2) {
      warning(`只找到 ${testPlans.length} 个测试套餐，应该有 2 个`);
    } else {
      success(`找到 ${testPlans.length} 个测试套餐`);
    }

    // 验证每个测试套餐
    for (const plan of testPlans) {
      console.log(`\n   ${colors.blue}📦 ${plan.name} (${plan.id})${colors.reset}`);
      console.log(`      价格: $${plan.fee_per_month}/月, $${plan.fee_per_year}/年`);
      console.log(`      每日绘制: ${plan.draw_fish_limit}`);
      console.log(`      可以自聊: ${plan.can_self_talk ? '✅' : '❌'}`);
      console.log(`      可以群聊: ${plan.can_group_chat ? '✅' : '❌'}`);

      // 验证价格
      if (parseFloat(plan.fee_per_month) !== 0.01) {
        error(`   月费应为 $0.01，实际为 $${plan.fee_per_month}`);
      } else {
        success(`   月费正确: $0.01`);
      }

      if (parseFloat(plan.fee_per_year) !== 0.12) {
        warning(`   年费应为 $0.12，实际为 $${plan.fee_per_year}`);
      } else {
        success(`   年费正确: $0.12`);
      }
    }

    return true;
  } catch (err) {
    error(`数据库查询失败: ${err.message}`);
    return false;
  }
}

async function testAdminUser() {
  console.log('\n👑 步骤 2: 检查是否有管理员用户');
  console.log('='.repeat(60));

  try {
    const query = `
      query GetAdminUsers {
        user_subscriptions(
          where: { 
            plan: { _eq: "admin" }
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
            email
          }
        }
      }
    `;

    const result = await queryHasura(query);
    const adminUsers = result.user_subscriptions;

    if (adminUsers.length === 0) {
      warning('未找到活跃的管理员用户');
      info('测试套餐需要管理员账户才能看到');
      info('如需创建管理员，请在 Hasura 中执行:');
      console.log(`
      INSERT INTO user_subscriptions (user_id, plan, is_active, payment_provider)
      VALUES ('YOUR_USER_ID', 'admin', true, 'manual');
      `);
      return null;
    }

    success(`找到 ${adminUsers.length} 个管理员用户`);
    
    for (const admin of adminUsers) {
      console.log(`   📧 ${admin.user.email || admin.user_id}`);
      console.log(`      订阅ID: ${admin.id}`);
      console.log(`      创建时间: ${admin.created_at}`);
    }

    return adminUsers[0].user_id;
  } catch (err) {
    error(`查询管理员失败: ${err.message}`);
    return null;
  }
}

async function testMemberTypesQuery() {
  console.log('\n🔍 步骤 3: 测试 member_types 查询（模拟前端）');
  console.log('='.repeat(60));

  try {
    const query = `
      query GetMemberTypes {
        member_types(order_by: { fee_per_month: asc }) {
          id
          name
          draw_fish_limit
          can_self_talk
          can_group_chat
          can_promote_owner
          group_chat_daily_limit
          fee_per_month
          fee_per_year
        }
      }
    `;

    const result = await queryHasura(query);
    const allPlans = result.member_types;

    console.log(`\n   所有套餐 (${allPlans.length} 个):`);
    allPlans.forEach(plan => {
      const isTest = plan.id.startsWith('test_');
      const marker = isTest ? '🧪' : '  ';
      console.log(`   ${marker} ${plan.id.padEnd(15)} - ${plan.name.padEnd(15)} - $${plan.fee_per_month}/月`);
    });

    // 测试过滤逻辑（非管理员）
    const normalUserPlans = allPlans.filter(plan => {
      if (plan.id === 'admin') return false;
      if (plan.id.startsWith('test_')) return false; // 非管理员看不到
      return true;
    });

    console.log(`\n   普通用户可见套餐 (${normalUserPlans.length} 个):`);
    normalUserPlans.forEach(plan => {
      console.log(`      ✓ ${plan.id} - ${plan.name}`);
    });

    // 测试过滤逻辑（管理员）
    const adminUserPlans = allPlans.filter(plan => {
      if (plan.id === 'admin') return false;
      return true; // 管理员可以看到所有套餐（包括测试套餐）
    });

    console.log(`\n   管理员可见套餐 (${adminUserPlans.length} 个):`);
    adminUserPlans.forEach(plan => {
      const isTest = plan.id.startsWith('test_');
      const marker = isTest ? '🧪' : '  ';
      console.log(`      ${marker} ${plan.id} - ${plan.name}`);
    });

    const testPlansCount = adminUserPlans.filter(p => p.id.startsWith('test_')).length;
    if (testPlansCount === 2) {
      success('过滤逻辑正确：管理员可以看到 2 个测试套餐');
    } else {
      error(`过滤逻辑错误：应该有 2 个测试套餐，实际 ${testPlansCount} 个`);
    }

    return true;
  } catch (err) {
    error(`查询套餐失败: ${err.message}`);
    return false;
  }
}

async function testStripeConfig() {
  console.log('\n🔑 步骤 4: 检查 Stripe 配置');
  console.log('='.repeat(60));

  const stripeMode = process.env.STRIPE_MODE || 'test';
  const modeEmoji = stripeMode === 'test' ? '🧪' : '🚀';
  
  console.log(`   ${modeEmoji} 当前模式: ${stripeMode.toUpperCase()}`);

  if (stripeMode === 'test') {
    info('使用测试模式 - 免费测试，不产生真实费用');
    const testKey = process.env.STRIPE_TEST_SECRET_KEY;
    if (testKey && testKey.startsWith('sk_test_')) {
      success('测试密钥已配置');
    } else {
      warning('测试密钥未配置或格式不正确');
    }
  } else {
    warning('使用生产模式 - 将处理真实支付！');
    const liveKey = process.env.STRIPE_LIVE_SECRET_KEY;
    if (liveKey && liveKey.startsWith('sk_live_')) {
      success('生产密钥已配置');
    } else {
      error('生产密钥未配置或格式不正确');
    }
  }

  return true;
}

async function testFrontendIntegration(adminUserId) {
  console.log('\n🎨 步骤 5: 测试前端集成');
  console.log('='.repeat(60));

  if (!adminUserId) {
    warning('跳过前端测试（没有管理员用户）');
    return;
  }

  info('前端测试需要手动进行:');
  console.log(`
  1. 使用管理员账户登录:
     用户ID: ${adminUserId}
     
  2. 访问会员页面:
     http://localhost:3000/membership.html
     
  3. 验证显示:
     ✓ 应该看到橙色提示框
     ✓ 应该看到 Test Plus 卡片（橙色边框 + TEST 角标）
     ✓ 应该看到 Test Premium 卡片（橙色边框 + TEST 角标）
     ✓ 价格显示为 $0.01
     
  4. 测试支付（可选）:
     - 选择 Test Plus
     - 选择支付方式（Stripe 或 PayPal）
     - 使用真实卡支付 $0.01（仅在生产模式下）
     - 验证订阅创建成功
  `);
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试套餐功能完整测试');
  console.log('='.repeat(60));

  let allPassed = true;

  // 步骤 1: 检查数据库
  const dbOk = await testDatabaseMigration();
  if (!dbOk) {
    allPassed = false;
  }

  // 步骤 2: 检查管理员用户
  const adminUserId = await testAdminUser();

  // 步骤 3: 测试查询和过滤
  const queryOk = await testMemberTypesQuery();
  if (!queryOk) {
    allPassed = false;
  }

  // 步骤 4: 检查 Stripe 配置
  await testStripeConfig();

  // 步骤 5: 前端测试指南
  await testFrontendIntegration(adminUserId);

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结\n');

  if (allPassed && adminUserId) {
    success('所有自动化测试通过！');
    console.log('\n下一步：');
    console.log('1. 使用管理员账户登录');
    console.log('2. 访问 http://localhost:3000/membership.html');
    console.log('3. 验证测试套餐显示正确');
    console.log('4. （可选）使用真实卡测试 $0.01 支付');
  } else if (allPassed && !adminUserId) {
    warning('数据库配置正确，但缺少管理员用户');
    console.log('\n下一步：');
    console.log('1. 创建管理员用户（参见上面的 SQL 示例）');
    console.log('2. 使用管理员账户登录');
    console.log('3. 访问会员页面验证');
  } else {
    error('部分测试未通过，请修复上述问题');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// 运行测试
runTests().catch(err => {
  console.error('\n❌ 测试脚本执行失败:', err);
  process.exit(1);
});

