/**
 * 诊断订阅升级问题
 * 检查用户报告的三个问题：
 * 1. 时间显示问题
 * 2. payment 表 plan 字段错误
 * 3. user_subscriptions 表没有记录
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
  }

  return result.data;
}

async function diagnose() {
  console.log('🔍 诊断订阅升级问题...\n');

  try {
    // 查询最近创建的支付记录
    console.log('1️⃣ 检查最近的支付记录...\n');
    const paymentsQuery = `
      query GetRecentPayments {
        payment(
          order_by: { created_at: desc }
          limit: 10
        ) {
          id
          user_id
          amount
          currency
          plan
          status
          payment_provider
          subscription_id
          provider_subscription_id
          payment_date
          created_at
          updated_at
          subscription {
            id
            plan
            is_active
            paypal_subscription_id
            created_at
          }
        }
      }
    `;

    const paymentsData = await queryHasura(paymentsQuery);
    const payments = paymentsData.payment || [];

    console.log(`找到 ${payments.length} 条最近的支付记录:\n`);

    payments.forEach((payment, index) => {
      console.log(`📋 支付记录 #${index + 1}:`);
      console.log(`   ID: ${payment.id}`);
      console.log(`   用户: ${payment.user_id}`);
      console.log(`   金额: ${payment.amount} ${payment.currency}`);
      console.log(`   ⚠️  支付记录的 Plan: ${payment.plan}`);
      console.log(`   状态: ${payment.status}`);
      console.log(`   支付商: ${payment.payment_provider}`);
      console.log(`   关联订阅ID: ${payment.subscription_id || 'NULL'}`);
      
      if (payment.subscription) {
        console.log(`   ✓ 关联的订阅:`);
        console.log(`      - 订阅ID: ${payment.subscription.id}`);
        console.log(`      - ⚠️  订阅的 Plan: ${payment.subscription.plan}`);
        console.log(`      - 活跃: ${payment.subscription.is_active}`);
        console.log(`      - PayPal订阅ID: ${payment.subscription.paypal_subscription_id || 'NULL'}`);
        console.log(`      - 订阅创建时间: ${payment.subscription.created_at}`);
        
        // 检查 plan 不一致的情况
        if (payment.plan !== payment.subscription.plan) {
          console.log(`   ❌ 问题: 支付记录的 plan (${payment.plan}) 与订阅的 plan (${payment.subscription.plan}) 不一致！`);
        }
      } else {
        console.log(`   ❌ 问题: 支付记录未关联到任何订阅！`);
      }
      
      // 时间格式检查（修复：添加Z后缀确保正确识别为UTC时间）
      console.log(`   创建时间 (UTC): ${payment.created_at}`);
      let timeStr = payment.created_at;
      if (!timeStr.endsWith('Z') && !timeStr.includes('+')) {
        timeStr = timeStr + 'Z';
      }
      const beijingTime = new Date(timeStr).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      console.log(`   创建时间 (北京): ${beijingTime}`);
      console.log('');
    });

    // 2. 查询最近的订阅记录
    console.log('\n2️⃣ 检查最近的订阅记录...\n');
    const subscriptionsQuery = `
      query GetRecentSubscriptions {
        user_subscriptions(
          order_by: { created_at: desc }
          limit: 10
        ) {
          id
          user_id
          plan
          payment_provider
          paypal_subscription_id
          is_active
          current_period_start
          current_period_end
          created_at
          updated_at
          payments {
            id
            amount
            plan
            status
          }
        }
      }
    `;

    const subscriptionsData = await queryHasura(subscriptionsQuery);
    const subscriptions = subscriptionsData.user_subscriptions || [];

    console.log(`找到 ${subscriptions.length} 条最近的订阅记录:\n`);

    subscriptions.forEach((sub, index) => {
      console.log(`📋 订阅记录 #${index + 1}:`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   用户: ${sub.user_id}`);
      console.log(`   Plan: ${sub.plan}`);
      console.log(`   活跃: ${sub.is_active}`);
      console.log(`   支付商: ${sub.payment_provider}`);
      console.log(`   PayPal订阅ID: ${sub.paypal_subscription_id || 'NULL'}`);
      console.log(`   计费周期: ${sub.billing_period || 'NULL'}`);
      console.log(`   创建时间 (UTC): ${sub.created_at}`);
      
      // 修复：添加Z后缀确保正确识别为UTC时间
      let subTimeStr = sub.created_at;
      if (!subTimeStr.endsWith('Z') && !subTimeStr.includes('+')) {
        subTimeStr = subTimeStr + 'Z';
      }
      const beijingTime = new Date(subTimeStr).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai'
      });
      console.log(`   创建时间 (北京): ${beijingTime}`);
      
      console.log(`   支付记录数: ${sub.payments ? sub.payments.length : 0}`);
      if (sub.payments && sub.payments.length > 0) {
        sub.payments.forEach((payment, pIndex) => {
          console.log(`      ${pIndex + 1}. 金额: ${payment.amount}, Plan: ${payment.plan}, 状态: ${payment.status}`);
          if (payment.plan !== sub.plan) {
            console.log(`         ❌ 问题: 支付记录的 plan (${payment.plan}) 与订阅的 plan (${sub.plan}) 不一致！`);
          }
        });
      }
      console.log('');
    });

    // 3. 检查是否有 premium 订阅
    console.log('\n3️⃣ 检查 Premium 订阅...\n');
    const premiumQuery = `
      query GetPremiumSubscriptions {
        user_subscriptions(
          where: { plan: { _eq: "premium" } }
          order_by: { created_at: desc }
        ) {
          id
          user_id
          plan
          is_active
          created_at
          payments {
            id
            plan
            amount
          }
        }
      }
    `;

    const premiumData = await queryHasura(premiumQuery);
    const premiumSubs = premiumData.user_subscriptions || [];

    if (premiumSubs.length === 0) {
      console.log('❌ 没有找到任何 Premium 订阅记录！');
      console.log('   这可能是问题所在：升级操作可能没有成功创建新的 Premium 订阅。');
    } else {
      console.log(`✅ 找到 ${premiumSubs.length} 条 Premium 订阅:`);
      premiumSubs.forEach((sub, index) => {
        console.log(`\n   ${index + 1}. 订阅 ID: ${sub.id}`);
        console.log(`      用户: ${sub.user_id}`);
        console.log(`      活跃: ${sub.is_active}`);
        console.log(`      创建时间: ${sub.created_at}`);
        console.log(`      支付记录: ${sub.payments ? sub.payments.length : 0} 条`);
      });
    }

    // 4. 生成诊断报告
    console.log('\n\n📊 诊断总结:\n');
    
    console.log('问题1 - 时间显示:');
    console.log('  ✅ 数据库存储的是 UTC 时间（正确）');
    console.log('  ✅ 已提供前端转换函数（src/js/timezone-utils.js）');
    console.log('  ✅ 已修改 admin-table-editor.js 自动转换时间显示');
    console.log('  ℹ️  刷新表格管理页面即可看到北京时间\n');
    
    const planMismatches = payments.filter(p => 
      p.subscription && p.plan !== p.subscription.plan
    );
    
    console.log('问题2 - Payment 表 Plan 字段错误:');
    if (planMismatches.length > 0) {
      console.log(`  ❌ 发现 ${planMismatches.length} 条支付记录的 plan 与订阅不一致`);
      planMismatches.forEach(p => {
        console.log(`     - 支付ID ${p.id}: payment.plan="${p.plan}" vs subscription.plan="${p.subscription.plan}"`);
      });
      console.log('  ℹ️  这说明升级时使用了旧的 plan 值');
    } else {
      console.log('  ✅ 没有发现 plan 不一致的问题');
    }
    
    console.log('\n问题3 - User_subscriptions 表没有记录:');
    if (premiumSubs.length === 0) {
      console.log('  ❌ 没有找到 Premium 订阅记录');
      console.log('  ℹ️  可能的原因:');
      console.log('     1. 升级操作没有触发');
      console.log('     2. PayPal webhook 没有收到');
      console.log('     3. API 调用失败但错误被忽略');
      console.log('  ℹ️  建议:');
      console.log('     1. 检查服务器日志');
      console.log('     2. 手动同步 PayPal 订阅');
      console.log('     3. 使用 test-subscription-upgrade.js 测试升级流程');
    } else {
      console.log('  ✅ 找到 Premium 订阅记录');
    }

  } catch (error) {
    console.error('\n❌ 诊断失败:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
  }
}

diagnose();

