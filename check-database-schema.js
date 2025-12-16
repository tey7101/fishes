/**
 * 检查数据库是否已执行PayPal迁移
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function checkSchema() {
  console.log('🔍 检查数据库结构...\n');

  const query = `
    query CheckColumns {
      __type(name: "user_subscriptions") {
        fields {
          name
          type {
            name
          }
        }
      }
    }
  `;

  // 更简单的方法：直接查询表结构
  const sqlQuery = `
    SELECT 
      column_name, 
      data_type, 
      column_default,
      is_nullable
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' 
      AND column_name IN ('payment_provider', 'paypal_subscription_id')
    ORDER BY ordinal_position;
  `;

  try {
    // 使用Hasura的run_sql查询
    const response = await fetch(HASURA_GRAPHQL_ENDPOINT.replace('/v1/graphql', '/v2/query'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        type: 'run_sql',
        args: {
          sql: sqlQuery
        }
      })
    });

    const result = await response.json();
    
    if (result.result_type === 'TuplesOk') {
      const columns = result.result;
      
      console.log('📊 检查结果:\n');
      
      const hasPaymentProvider = columns.some(col => col[0] === 'payment_provider');
      const hasPaypalId = columns.some(col => col[0] === 'paypal_subscription_id');
      
      if (hasPaymentProvider && hasPaypalId) {
        console.log('✅ 数据库迁移已完成！');
        console.log('   - payment_provider 字段存在');
        console.log('   - paypal_subscription_id 字段存在\n');
        
        // 检查是否有订阅记录
        const checkSubQuery = `
          SELECT 
            user_id,
            plan,
            payment_provider,
            paypal_subscription_id,
            is_active
          FROM user_subscriptions
          WHERE paypal_subscription_id IS NOT NULL
          LIMIT 5;
        `;
        
        const subResponse = await fetch(HASURA_GRAPHQL_ENDPOINT.replace('/v1/graphql', '/v2/query'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            type: 'run_sql',
            args: {
              sql: checkSubQuery
            }
          })
        });
        
        const subResult = await subResponse.json();
        if (subResult.result_type === 'TuplesOk' && subResult.result.length > 0) {
          console.log('📋 找到PayPal订阅记录:');
          subResult.result.forEach(row => {
            console.log(`   - User: ${row[0]}, Plan: ${row[1]}, Subscription: ${row[3]}`);
          });
        } else {
          console.log('⚠️  未找到PayPal订阅记录');
        }
        
      } else {
        console.log('❌ 数据库迁移未执行！');
        console.log('   缺少字段:');
        if (!hasPaymentProvider) console.log('   - payment_provider');
        if (!hasPaypalId) console.log('   - paypal_subscription_id');
        console.log('\n💡 请在Hasura Console执行: database/migrations/add-paypal-support.sql');
      }
    } else {
      console.log('❌ 查询失败:', result);
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

checkSchema();

























