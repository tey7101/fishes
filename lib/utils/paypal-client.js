/**
 * PayPal API 客户端工具
 * 使用 PayPal REST API
 */

const fetch = require('node-fetch');
const paypalConfig = require('../paypal-config');

/**
 * 获取访问令牌（用于REST API调用）
 */
async function getAccessToken() {
  const auth = Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64');

  const response = await fetch(`${paypalConfig.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 获取PayPal API基础URL
 */
function getPayPalBaseURL() {
  return paypalConfig.baseUrl;
}

/**
 * 调用PayPal REST API
 */
async function callPayPalAPI(endpoint, method = 'GET', body = null) {
  const accessToken = await getAccessToken();
  const baseURL = getPayPalBaseURL();
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseURL}${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal API error: ${response.status} - ${errorText}`);
  }

  // 某些API返回空响应
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return null;
}

/**
 * 验证webhook签名
 */
async function verifyWebhookSignature(headers, body) {
  const webhookId = paypalConfig.webhookId;
  if (!webhookId) {
    console.warn('⚠️  PAYPAL_WEBHOOK_ID not set, skipping signature verification');
    return true; // 开发模式下允许跳过验证
  }

  try {
    const accessToken = await getAccessToken();
    const baseURL = getPayPalBaseURL();

    const verifyBody = {
      transmission_id: headers['paypal-transmission-id'],
      transmission_time: headers['paypal-transmission-time'],
      cert_url: headers['paypal-cert-url'],
      auth_algo: headers['paypal-auth-algo'],
      transmission_sig: headers['paypal-transmission-sig'],
      webhook_id: webhookId,
      webhook_event: body
    };

    const response = await fetch(`${baseURL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verifyBody)
    });

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return false;
  }
}

module.exports = {
  getAccessToken,
  getPayPalBaseURL,
  callPayPalAPI,
  verifyWebhookSignature,
  isConfigured: () => !!(paypalConfig.clientId && paypalConfig.clientSecret),
  getMode: () => paypalConfig.mode
};

