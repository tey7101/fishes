/**
 * 测试PayPal凭证是否有效
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

console.log('🔍 测试PayPal凭证...\n');
console.log('Mode:', PAYPAL_MODE);
console.log('Client ID:', PAYPAL_CLIENT_ID ? `${PAYPAL_CLIENT_ID.substring(0, 20)}...` : '未设置');
console.log('Secret:', PAYPAL_CLIENT_SECRET ? `${PAYPAL_CLIENT_SECRET.substring(0, 20)}...` : '未设置');
console.log('');

async function testCredentials() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error('❌ PayPal凭证未配置');
    return;
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const baseURL = PAYPAL_MODE === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  console.log(`📡 请求: ${baseURL}/v1/oauth2/token\n`);

  try {
    const response = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    console.log(`状态码: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 认证成功！');
      console.log('Access Token:', data.access_token.substring(0, 30) + '...');
      console.log('Token类型:', data.token_type);
      console.log('有效期:', data.expires_in, '秒');
      console.log('\n🎉 PayPal凭证配置正确！');
    } else {
      const errorText = await response.text();
      console.log('❌ 认证失败');
      console.log('错误响应:', errorText);
      console.log('\n💡 可能的原因:');
      console.log('1. Client ID或Secret不正确');
      console.log('2. 凭证来自' + (PAYPAL_MODE === 'sandbox' ? 'Production' : 'Sandbox') + '环境（需要切换MODE）');
      console.log('3. 凭证已过期或被撤销');
      console.log('\n请访问 https://developer.paypal.com/dashboard/ 检查凭证');
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

testCredentials();

