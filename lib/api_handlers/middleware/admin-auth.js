/**
 * 管理员身份验证中间件
 * 验证用户是否具有管理员权限
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

/**
 * 查询 Hasura 检查用户是否为管理员
 */
async function queryHasura(query, variables = {}) {
  const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
  const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
  
  if (!HASURA_ENDPOINT) {
    throw new Error('HASURA_GRAPHQL_ENDPOINT not configured');
  }

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(HASURA_ADMIN_SECRET ? { 'x-hasura-admin-secret': HASURA_ADMIN_SECRET } : {})
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  
  if (result.errors) {
    console.error('[Admin Auth] GraphQL errors:', result.errors);
    throw new Error(result.errors[0]?.message || 'GraphQL query failed');
  }

  return result.data;
}

/**
 * 检查用户是否为管理员
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} - 是否为管理员
 */
async function checkIsAdmin(userId) {
  if (!userId) {
    return false;
  }

  try {
    const query = `
      query CheckAdmin($userId: String!) {
        users_by_pk(id: $userId) {
          id
          email
          user_subscriptions(
            where: { is_active: { _eq: true } }
            order_by: { created_at: desc }
            limit: 1
          ) {
            plan
            member_type {
              id
              name
            }
          }
        }
      }
    `;

    const data = await queryHasura(query, { userId });
    const userData = data?.users_by_pk;
    
    if (!userData) {
      return false;
    }

    const subscription = userData.user_subscriptions?.[0];
    
    // 检查是否为管理员：plan === 'admin'
    const isAdmin = subscription?.plan === 'admin';
    
    console.log('[Admin Auth] Check result:', {
      userId,
      email: userData.email,
      plan: subscription?.plan,
      isAdmin
    });

    return isAdmin;

  } catch (error) {
    console.error('[Admin Auth] Check failed:', error);
    return false;
  }
}

/**
 * 从请求中提取用户ID
 * 支持多种方式：query参数、body、headers
 */
function extractUserId(req) {
  // 优先从 query 参数获取
  if (req.query?.userId) {
    return req.query.userId;
  }
  
  // 从 body 获取
  if (req.body?.userId) {
    return req.body.userId;
  }
  
  // 从 headers 获取
  if (req.headers['x-user-id']) {
    return req.headers['x-user-id'];
  }
  
  return null;
}

/**
 * 管理员身份验证中间件
 * 验证请求者是否为管理员
 */
async function requireAdmin(req, res) {
  const userId = extractUserId(req);
  
  if (!userId) {
    res.status(401).json({
      success: false,
      error: '未提供用户身份信息'
    });
    return null;
  }

  const isAdmin = await checkIsAdmin(userId);
  
  if (!isAdmin) {
    res.status(403).json({
      success: false,
      error: '需要管理员权限才能执行此操作'
    });
    return null;
  }

  return userId;
}

module.exports = {
  checkIsAdmin,
  requireAdmin,
  extractUserId
};

