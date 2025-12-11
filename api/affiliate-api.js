/**
 * Affiliate API - 联盟推广者追踪系统
 * 
 * 支持的 actions:
 * - create: 将用户设为推广者（管理员）
 * - list: 获取所有推广者列表（管理员）
 * - update: 更新推广者佣金比例（管理员）
 * - dashboard: 获取推广者统计数据（推广者本人）
 * - referrals: 获取推荐用户列表（推广者本人）
 * - report: 获取所有推广者汇总报表（管理员）
 * - export: 导出CSV报表（管理员）
 * - validate: 验证推广码是否有效
 */

const { query, mutation } = require('../lib/hasura.js');

/**
 * 生成唯一推广码
 * @returns {string} 8位大写字母数字组合
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 验证管理员权限
 */
async function isAdmin(userId) {
  const result = await query(`
    query CheckAdmin($userId: String!) {
      user_subscriptions(where: { 
        user_id: { _eq: $userId },
        plan: { _eq: "admin" },
        is_active: { _eq: true }
      }) {
        plan
      }
    }
  `, { userId });
  
  return result.user_subscriptions?.length > 0;
}

/**
 * 验证是否为推广者
 */
async function isAffiliate(userId) {
  const result = await query(`
    query CheckAffiliate($userId: String!) {
      users(where: { id: { _eq: $userId }, referral_code: { _is_null: false } }) {
        id
        referral_code
      }
    }
  `, { userId });
  
  return result.users?.length > 0;
}


/**
 * 创建推广者 - 将用户设为推广者并生成推广码
 * 需求: 1.1
 */
async function createAffiliate(userId, commissionRate = 10.00) {
  // 生成唯一推广码，最多尝试5次
  let referralCode;
  let attempts = 0;
  
  while (attempts < 5) {
    referralCode = generateReferralCode();
    
    // 检查是否已存在
    const existing = await query(`
      query CheckCode($code: String!) {
        users(where: { referral_code: { _eq: $code } }) {
          id
        }
      }
    `, { code: referralCode });
    
    if (existing.users.length === 0) break;
    attempts++;
  }
  
  if (attempts >= 5) {
    throw new Error('无法生成唯一推广码，请重试');
  }
  
  // 更新用户为推广者
  const result = await mutation(`
    mutation CreateAffiliate($userId: String!, $code: String!, $rate: numeric!) {
      update_users_by_pk(
        pk_columns: { id: $userId },
        _set: { 
          referral_code: $code,
          commission_rate: $rate
        }
      ) {
        id
        email
        referral_code
        commission_rate
      }
    }
  `, { userId, code: referralCode, rate: commissionRate });
  
  // 同时更新会员类型为 affiliate
  await mutation(`
    mutation UpdateSubscription($userId: String!) {
      update_user_subscriptions(
        where: { user_id: { _eq: $userId } },
        _set: { plan: "affiliate" }
      ) {
        affected_rows
      }
    }
  `, { userId });
  
  return result.update_users_by_pk;
}

/**
 * 获取所有推广者列表
 * 需求: 1.2
 */
async function listAffiliates() {
  const result = await query(`
    query ListAffiliates {
      users(where: { referral_code: { _is_null: false } }) {
        id
        email
        referral_code
        commission_rate
        created_at
        referred_users: affiliate_users_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  `);
  
  // 获取每个推广者的收入统计
  const affiliates = await Promise.all(result.users.map(async (affiliate) => {
    const revenueResult = await query(`
      query GetAffiliateRevenue($affiliateId: String!) {
        payment_aggregate(where: { affiliate_id: { _eq: $affiliateId } }) {
          aggregate {
            sum {
              amount
            }
          }
        }
      }
    `, { affiliateId: affiliate.id });
    
    const totalRevenue = revenueResult.payment_aggregate?.aggregate?.sum?.amount || 0;
    const totalReferrals = affiliate.referred_users?.aggregate?.count || 0;
    const totalCommission = totalRevenue * (affiliate.commission_rate / 100);
    
    return {
      ...affiliate,
      total_referrals: totalReferrals,
      total_revenue: totalRevenue,
      total_commission: totalCommission
    };
  }));
  
  return affiliates;
}

/**
 * 更新推广者佣金比例
 * 需求: 1.3
 */
async function updateAffiliate(userId, commissionRate) {
  const result = await mutation(`
    mutation UpdateAffiliate($userId: String!, $rate: numeric!) {
      update_users_by_pk(
        pk_columns: { id: $userId },
        _set: { commission_rate: $rate }
      ) {
        id
        email
        referral_code
        commission_rate
      }
    }
  `, { userId, rate: commissionRate });
  
  return result.update_users_by_pk;
}


/**
 * 获取推广者面板统计数据
 * 需求: 3.1, 3.2
 * @param {string} userId - 推广者用户ID
 * @param {string} startDate - 开始日期 (可选)
 * @param {string} endDate - 结束日期 (可选)
 */
async function getDashboard(userId, startDate = null, endDate = null) {
  // 获取推广者信息
  const userResult = await query(`
    query GetAffiliateInfo($userId: String!) {
      users_by_pk(id: $userId) {
        id
        email
        referral_code
        commission_rate
      }
    }
  `, { userId });
  
  if (!userResult.users_by_pk?.referral_code) {
    throw new Error('用户不是推广者');
  }
  
  // 构建日期筛选条件
  let dateFilter = '';
  let paymentDateFilter = '';
  const variables = { userId };
  
  if (startDate && endDate) {
    dateFilter = ', created_at: { _gte: $startDate, _lte: $endDate }';
    paymentDateFilter = ', created_at: { _gte: $startDate, _lte: $endDate }';
    variables.startDate = startDate + 'T00:00:00Z';
    variables.endDate = endDate + 'T23:59:59Z';
  }
  
  // 获取推荐用户数量（带日期筛选）
  const referralsQuery = startDate && endDate ? `
    query GetReferralCount($userId: String!, $startDate: timestamp!, $endDate: timestamp!) {
      users_aggregate(where: { referred_by: { _eq: $userId }, created_at: { _gte: $startDate, _lte: $endDate } }) {
        aggregate { count }
      }
    }
  ` : `
    query GetReferralCount($userId: String!) {
      users_aggregate(where: { referred_by: { _eq: $userId } }) {
        aggregate { count }
      }
    }
  `;
  const referralsResult = await query(referralsQuery, variables);
  
  // 获取收入统计（带日期筛选）
  const revenueQuery = startDate && endDate ? `
    query GetAffiliateRevenue($userId: String!, $startDate: timestamp!, $endDate: timestamp!) {
      payment_aggregate(where: { affiliate_id: { _eq: $userId }, created_at: { _gte: $startDate, _lte: $endDate } }) {
        aggregate { sum { amount } count }
      }
    }
  ` : `
    query GetAffiliateRevenue($userId: String!) {
      payment_aggregate(where: { affiliate_id: { _eq: $userId } }) {
        aggregate { sum { amount } count }
      }
    }
  `;
  const revenueResult = await query(revenueQuery, variables);
  
  const totalReferrals = referralsResult.users_aggregate?.aggregate?.count || 0;
  const totalRevenue = revenueResult.payment_aggregate?.aggregate?.sum?.amount || 0;
  const totalPayments = revenueResult.payment_aggregate?.aggregate?.count || 0;
  const commissionRate = userResult.users_by_pk.commission_rate || 10;
  const totalCommission = totalRevenue * (commissionRate / 100);
  
  return {
    affiliate: userResult.users_by_pk,
    stats: {
      total_referrals: totalReferrals,
      total_revenue: totalRevenue,
      total_payments: totalPayments,
      total_commission: totalCommission,
      commission_rate: commissionRate
    }
  };
}

/**
 * 获取推荐用户列表
 * 需求: 3.3
 * @param {string} userId - 推广者用户ID
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 * @param {string} startDate - 开始日期 (可选)
 * @param {string} endDate - 结束日期 (可选)
 */
async function getReferrals(userId, limit = 50, offset = 0, startDate = null, endDate = null) {
  const variables = { userId, limit, offset };
  
  // 构建查询（带日期筛选）
  let referralsQuery;
  if (startDate && endDate) {
    variables.startDate = startDate + 'T00:00:00Z';
    variables.endDate = endDate + 'T23:59:59Z';
    referralsQuery = `
      query GetReferrals($userId: String!, $limit: Int!, $offset: Int!, $startDate: timestamp!, $endDate: timestamp!) {
        users(
          where: { referred_by: { _eq: $userId }, created_at: { _gte: $startDate, _lte: $endDate } },
          limit: $limit,
          offset: $offset,
          order_by: { created_at: desc }
        ) {
          id
          email
          nick_name
          created_at
        }
        users_aggregate(where: { referred_by: { _eq: $userId }, created_at: { _gte: $startDate, _lte: $endDate } }) {
          aggregate { count }
        }
      }
    `;
  } else {
    referralsQuery = `
      query GetReferrals($userId: String!, $limit: Int!, $offset: Int!) {
        users(
          where: { referred_by: { _eq: $userId } },
          limit: $limit,
          offset: $offset,
          order_by: { created_at: desc }
        ) {
          id
          email
          nick_name
          created_at
        }
        users_aggregate(where: { referred_by: { _eq: $userId } }) {
          aggregate { count }
        }
      }
    `;
  }
  
  const result = await query(referralsQuery, variables);
  
  // 为每个推荐用户获取支付记录
  const referralsWithPayments = await Promise.all(
    (result.users || []).map(async (user) => {
      const paymentResult = await query(`
        query GetUserPayments($userId: String!) {
          payment(
            where: { user_id: { _eq: $userId } },
            order_by: { created_at: desc }
          ) {
            id
            amount
            created_at
            status
          }
        }
      `, { userId: user.id });
      
      return {
        ...user,
        payments: paymentResult.payment || []
      };
    })
  );
  
  return {
    referrals: referralsWithPayments,
    total: result.users_aggregate?.aggregate?.count || 0
  };
}

/**
 * 获取推荐订单列表
 * @param {string} userId - 推广者用户ID
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 * @param {string} startDate - 开始日期 (可选)
 * @param {string} endDate - 结束日期 (可选)
 */
async function getOrders(userId, limit = 50, offset = 0, startDate = null, endDate = null) {
  const variables = { affiliateId: userId, limit, offset };
  
  let ordersQuery;
  if (startDate && endDate) {
    variables.startDate = startDate + 'T00:00:00Z';
    variables.endDate = endDate + 'T23:59:59Z';
    ordersQuery = `
      query GetAffiliateOrders($affiliateId: String!, $limit: Int!, $offset: Int!, $startDate: timestamp!, $endDate: timestamp!) {
        payment(
          where: { affiliate_id: { _eq: $affiliateId }, created_at: { _gte: $startDate, _lte: $endDate } },
          limit: $limit,
          offset: $offset,
          order_by: { created_at: desc }
        ) {
          id
          user_id
          amount
          currency
          plan
          status
          payment_provider
          created_at
          user {
            email
            nick_name
          }
        }
        payment_aggregate(where: { affiliate_id: { _eq: $affiliateId }, created_at: { _gte: $startDate, _lte: $endDate } }) {
          aggregate { count }
        }
      }
    `;
  } else {
    ordersQuery = `
      query GetAffiliateOrders($affiliateId: String!, $limit: Int!, $offset: Int!) {
        payment(
          where: { affiliate_id: { _eq: $affiliateId } },
          limit: $limit,
          offset: $offset,
          order_by: { created_at: desc }
        ) {
          id
          user_id
          amount
          currency
          plan
          status
          payment_provider
          created_at
          user {
            email
            nick_name
          }
        }
        payment_aggregate(where: { affiliate_id: { _eq: $affiliateId } }) {
          aggregate { count }
        }
      }
    `;
  }
  
  const result = await query(ordersQuery, variables);
  
  return {
    orders: result.payment || [],
    total: result.payment_aggregate?.aggregate?.count || 0
  };
}

/**
 * 获取所有推荐用户（管理员用）
 */
async function getAllReferrals(limit = 200, startDate = null, endDate = null) {
  const variables = { limit };
  
  let referralsQuery;
  if (startDate && endDate) {
    variables.startDate = startDate + 'T00:00:00Z';
    variables.endDate = endDate + 'T23:59:59Z';
    referralsQuery = `
      query GetAllReferrals($limit: Int!, $startDate: timestamp!, $endDate: timestamp!) {
        users(
          where: { referred_by: { _is_null: false }, created_at: { _gte: $startDate, _lte: $endDate } },
          limit: $limit,
          order_by: { created_at: desc }
        ) {
          id
          email
          nick_name
          referred_by
          created_at
        }
      }
    `;
  } else {
    referralsQuery = `
      query GetAllReferrals($limit: Int!) {
        users(
          where: { referred_by: { _is_null: false } },
          limit: $limit,
          order_by: { created_at: desc }
        ) {
          id
          email
          nick_name
          referred_by
          created_at
        }
      }
    `;
  }
  
  const result = await query(referralsQuery, variables);
  const users = result.users || [];
  
  // 获取所有推广者信息
  const affiliateIds = [...new Set(users.map(u => u.referred_by).filter(Boolean))];
  let affiliatesMap = {};
  
  if (affiliateIds.length > 0) {
    const affiliatesResult = await query(`
      query GetAffiliates($ids: [String!]!) {
        users(where: { id: { _in: $ids } }) {
          id
          email
          nick_name
          referral_code
        }
      }
    `, { ids: affiliateIds });
    
    (affiliatesResult.users || []).forEach(a => {
      affiliatesMap[a.id] = a;
    });
  }
  
  // 获取每个用户的付费总额
  const referrals = await Promise.all(users.map(async (u) => {
    const paymentResult = await query(`
      query GetUserPayments($userId: String!) {
        payment_aggregate(where: { user_id: { _eq: $userId } }) {
          aggregate { sum { amount } }
        }
      }
    `, { userId: u.id });
    
    return {
      ...u,
      affiliate: affiliatesMap[u.referred_by] || null,
      total_paid: paymentResult.payment_aggregate?.aggregate?.sum?.amount || 0
    };
  }));
  
  return { referrals, total: referrals.length };
}

/**
 * 获取所有推荐订单（管理员用）
 */
async function getAllOrders(limit = 200, startDate = null, endDate = null) {
  const variables = { limit };
  
  let ordersQuery;
  if (startDate && endDate) {
    variables.startDate = startDate + 'T00:00:00Z';
    variables.endDate = endDate + 'T23:59:59Z';
    ordersQuery = `
      query GetAllAffiliateOrders($limit: Int!, $startDate: timestamp!, $endDate: timestamp!) {
        payment(
          where: { affiliate_id: { _is_null: false }, created_at: { _gte: $startDate, _lte: $endDate } },
          limit: $limit,
          order_by: { created_at: desc }
        ) {
          id
          user_id
          affiliate_id
          amount
          currency
          plan
          status
          payment_provider
          created_at
          user { email nick_name }
        }
      }
    `;
  } else {
    ordersQuery = `
      query GetAllAffiliateOrders($limit: Int!) {
        payment(
          where: { affiliate_id: { _is_null: false } },
          limit: $limit,
          order_by: { created_at: desc }
        ) {
          id
          user_id
          affiliate_id
          amount
          currency
          plan
          status
          payment_provider
          created_at
          user { email nick_name }
        }
      }
    `;
  }
  
  const result = await query(ordersQuery, variables);
  const orders = result.payment || [];
  
  // 获取所有推广者信息
  const affiliateIds = [...new Set(orders.map(o => o.affiliate_id).filter(Boolean))];
  let affiliatesMap = {};
  
  if (affiliateIds.length > 0) {
    const affiliatesResult = await query(`
      query GetAffiliates($ids: [String!]!) {
        users(where: { id: { _in: $ids } }) {
          id
          email
          nick_name
          referral_code
        }
      }
    `, { ids: affiliateIds });
    
    (affiliatesResult.users || []).forEach(a => {
      affiliatesMap[a.id] = a;
    });
  }
  
  // 为每个订单添加推广者信息
  const ordersWithAffiliate = orders.map(o => ({
    ...o,
    affiliate: affiliatesMap[o.affiliate_id] || null
  }));
  
  return { orders: ordersWithAffiliate, total: ordersWithAffiliate.length };
}

/**
 * 获取推广者汇总报表
 * 需求: 4.1, 4.2
 */
async function getReport(startDate, endDate) {
  let dateFilter = {};
  
  if (startDate && endDate) {
    dateFilter = {
      created_at: {
        _gte: startDate,
        _lte: endDate
      }
    };
  }
  
  // 获取所有推广者
  const affiliatesResult = await query(`
    query GetAffiliates {
      users(where: { referral_code: { _is_null: false } }) {
        id
        email
        referral_code
        commission_rate
      }
    }
  `);
  
  // 为每个推广者计算统计数据
  const report = await Promise.all(affiliatesResult.users.map(async (affiliate) => {
    // 获取指定日期范围内的推荐用户
    const referralsQuery = startDate && endDate ? `
      query GetReferralsInRange($userId: String!, $startDate: timestamp!, $endDate: timestamp!) {
        users_aggregate(where: { 
          referred_by: { _eq: $userId },
          created_at: { _gte: $startDate, _lte: $endDate }
        }) {
          aggregate { count }
        }
      }
    ` : `
      query GetAllReferrals($userId: String!) {
        users_aggregate(where: { referred_by: { _eq: $userId } }) {
          aggregate { count }
        }
      }
    `;
    
    const referralsResult = await query(referralsQuery, 
      startDate && endDate 
        ? { userId: affiliate.id, startDate, endDate }
        : { userId: affiliate.id }
    );
    
    // 获取指定日期范围内的收入
    const revenueQuery = startDate && endDate ? `
      query GetRevenueInRange($affiliateId: String!, $startDate: timestamp!, $endDate: timestamp!) {
        payment_aggregate(where: { 
          affiliate_id: { _eq: $affiliateId },
          created_at: { _gte: $startDate, _lte: $endDate }
        }) {
          aggregate {
            sum { amount }
            count
          }
        }
      }
    ` : `
      query GetAllRevenue($affiliateId: String!) {
        payment_aggregate(where: { affiliate_id: { _eq: $affiliateId } }) {
          aggregate {
            sum { amount }
            count
          }
        }
      }
    `;
    
    const revenueResult = await query(revenueQuery,
      startDate && endDate
        ? { affiliateId: affiliate.id, startDate, endDate }
        : { affiliateId: affiliate.id }
    );
    
    const totalReferrals = referralsResult.users_aggregate?.aggregate?.count || 0;
    const totalRevenue = revenueResult.payment_aggregate?.aggregate?.sum?.amount || 0;
    const totalCommission = totalRevenue * (affiliate.commission_rate / 100);
    
    return {
      id: affiliate.id,
      email: affiliate.email,
      referral_code: affiliate.referral_code,
      commission_rate: affiliate.commission_rate,
      total_referrals: totalReferrals,
      total_revenue: totalRevenue,
      total_commission: totalCommission
    };
  }));
  
  return report;
}


/**
 * 导出CSV报表
 * 需求: 4.3
 */
async function exportReport(startDate, endDate) {
  const report = await getReport(startDate, endDate);
  
  // 生成CSV内容
  const headers = ['推广者ID', '邮箱', '推广码', '佣金比例(%)', '总推荐数', '总收入', '总佣金'];
  const rows = report.map(r => [
    r.id,
    r.email,
    r.referral_code,
    r.commission_rate,
    r.total_referrals,
    r.total_revenue,
    r.total_commission.toFixed(2)
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csv;
}

/**
 * 验证推广码是否有效
 */
async function validateReferralCode(code) {
  const result = await query(`
    query ValidateCode($code: String!) {
      users(where: { referral_code: { _eq: $code } }) {
        id
        referral_code
      }
    }
  `, { code });
  
  if (result.users.length === 0) {
    return { valid: false };
  }
  
  return { 
    valid: true, 
    affiliate_id: result.users[0].id 
  };
}

/**
 * 关联推荐人（注册时调用）
 * 需求: 2.2
 */
async function linkReferral(userId, referralCode) {
  console.log('[linkReferral] 开始关联, userId:', userId, 'referralCode:', referralCode);
  
  // 验证推广码
  const validation = await validateReferralCode(referralCode);
  console.log('[linkReferral] 推广码验证结果:', validation);
  
  if (!validation.valid) {
    return { success: false, error: '无效的推广码' };
  }
  
  // 检查用户是否已有推荐人
  const userResult = await query(`
    query CheckUser($userId: String!) {
      users_by_pk(id: $userId) {
        id
        referred_by
      }
    }
  `, { userId });
  
  console.log('[linkReferral] 用户查询结果:', userResult);
  
  // 如果用户记录不存在，可能是新注册用户还没有同步到数据库
  // 最多重试5次，每次等待1秒
  let currentUserResult = userResult;
  let retryCount = 0;
  const maxRetries = 5;
  
  while (!currentUserResult.users_by_pk && retryCount < maxRetries) {
    retryCount++;
    console.log(`[linkReferral] 用户记录不存在，等待1秒后重试 (${retryCount}/${maxRetries})...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    currentUserResult = await query(`
      query CheckUser($userId: String!) {
        users_by_pk(id: $userId) {
          id
          referred_by
        }
      }
    `, { userId });
    
    console.log(`[linkReferral] 重试 ${retryCount} 查询结果:`, currentUserResult);
  }
  
  if (!currentUserResult.users_by_pk) {
    console.error('[linkReferral] 用户记录在多次重试后仍不存在');
    return { success: false, error: '用户记录尚未创建，请稍后重试' };
  }
  
  if (currentUserResult.users_by_pk.referred_by) {
    return { success: false, error: '用户已有推荐人' };
  }
  
  // 设置推荐人
  const updateResult = await mutation(`
    mutation LinkReferral($userId: String!, $affiliateId: String!) {
      update_users_by_pk(
        pk_columns: { id: $userId },
        _set: { referred_by: $affiliateId }
      ) {
        id
        referred_by
      }
    }
  `, { userId, affiliateId: validation.affiliate_id });
  
  console.log('[linkReferral] 更新结果:', updateResult);
  
  // 验证更新是否成功
  if (!updateResult.update_users_by_pk) {
    console.error('[linkReferral] 更新失败，返回结果为空');
    return { success: false, error: '更新用户记录失败' };
  }
  
  if (updateResult.update_users_by_pk.referred_by !== validation.affiliate_id) {
    console.error('[linkReferral] 更新后的 referred_by 不匹配:', updateResult.update_users_by_pk.referred_by);
    return { success: false, error: '更新验证失败' };
  }
  
  console.log('[linkReferral] ✅ 成功关联推广者');
  return { success: true, affiliate_id: validation.affiliate_id };
}

/**
 * 主处理函数
 */
module.exports = async function handler(req, res) {
  // 支持从 query 或 body 获取 action
  const action = req.query.action || req.body?.action;
  const userId = req.headers['x-user-id'] || req.query.userId;
  
  try {
    switch (action) {
      case 'create': {
        // 管理员权限验证
        if (!await isAdmin(userId)) {
          return res.status(403).json({ error: '需要管理员权限' });
        }
        
        let { targetUserId, targetEmail, commissionRate } = req.body || {};
        
        // 如果提供了邮箱，通过邮箱查找用户ID
        if (targetEmail && !targetUserId) {
          const findUserQuery = `
            query FindUserByEmail($email: String!) {
              users(where: { email: { _ilike: $email } }, limit: 1) {
                id
              }
            }
          `;
          const userData = await query(findUserQuery, { email: targetEmail.trim() });
          
          if (!userData?.users || userData.users.length === 0) {
            return res.status(404).json({ error: '未找到该邮箱对应的用户' });
          }
          targetUserId = userData.users[0].id;
        }
        
        if (!targetUserId) {
          return res.status(400).json({ error: '缺少目标用户ID或邮箱' });
        }
        
        const result = await createAffiliate(targetUserId, commissionRate);
        return res.status(200).json({ success: true, affiliate: result });
      }
      
      case 'list': {
        if (!await isAdmin(userId)) {
          return res.status(403).json({ error: '需要管理员权限' });
        }
        
        const affiliates = await listAffiliates();
        return res.status(200).json({ success: true, affiliates });
      }
      
      case 'update': {
        if (!await isAdmin(userId)) {
          return res.status(403).json({ error: '需要管理员权限' });
        }
        
        const { targetUserId, commissionRate } = req.body || {};
        if (!targetUserId || commissionRate === undefined) {
          return res.status(400).json({ error: '缺少必要参数' });
        }
        
        const result = await updateAffiliate(targetUserId, commissionRate);
        return res.status(200).json({ success: true, affiliate: result });
      }
      
      case 'dashboard': {
        if (!userId) {
          return res.status(401).json({ error: '未登录' });
        }
        
        try {
          const { startDate, endDate } = req.query;
          const dashboard = await getDashboard(userId, startDate, endDate);
          return res.status(200).json({ success: true, ...dashboard });
        } catch (error) {
          // 用户不是推广者是正常的业务逻辑，返回 200 而不是 500
          if (error.message === '用户不是推广者') {
            return res.status(200).json({ success: false, error: error.message });
          }
          throw error;
        }
      }
      
      case 'referrals': {
        if (!userId) {
          return res.status(401).json({ error: '未登录' });
        }
        
        const { limit, offset, startDate, endDate } = req.query;
        const result = await getReferrals(userId, parseInt(limit) || 50, parseInt(offset) || 0, startDate, endDate);
        return res.status(200).json({ success: true, ...result });
      }
      
      case 'orders': {
        if (!userId) {
          return res.status(401).json({ error: '未登录' });
        }
        
        const { limit: ordersLimit, offset: ordersOffset, startDate: ordersStartDate, endDate: ordersEndDate } = req.query;
        const ordersResult = await getOrders(userId, parseInt(ordersLimit) || 50, parseInt(ordersOffset) || 0, ordersStartDate, ordersEndDate);
        return res.status(200).json({ success: true, ...ordersResult });
      }
      
      case 'report': {
        if (!await isAdmin(userId)) {
          return res.status(403).json({ error: '需要管理员权限' });
        }
        
        const { startDate, endDate } = req.query;
        const report = await getReport(startDate, endDate);
        return res.status(200).json({ success: true, report });
      }
      
      case 'export': {
        if (!await isAdmin(userId)) {
          return res.status(403).json({ error: '需要管理员权限' });
        }
        
        const { startDate, endDate } = req.query;
        const csv = await exportReport(startDate, endDate);
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=affiliate-report-${new Date().toISOString().split('T')[0]}.csv`);
        return res.status(200).send('\uFEFF' + csv); // BOM for Excel UTF-8
      }
      
      case 'validate': {
        const { code } = req.query;
        if (!code) {
          return res.status(400).json({ error: '缺少推广码' });
        }
        
        const result = await validateReferralCode(code);
        return res.status(200).json(result);
      }
      
      case 'link': {
        if (!userId) {
          return res.status(401).json({ error: '未登录' });
        }
        
        const { referralCode } = req.body || {};
        if (!referralCode) {
          return res.status(400).json({ error: '缺少推广码' });
        }
        
        const result = await linkReferral(userId, referralCode);
        return res.status(200).json(result);
      }
      
      case 'self-register': {
        // 用户自助注册成为推广者
        if (!userId) {
          return res.status(401).json({ error: 'Please log in first' });
        }
        
        // 检查是否已经是推广者
        if (await isAffiliate(userId)) {
          return res.status(400).json({ error: 'You are already an affiliate' });
        }
        
        // 创建推广者（默认10%佣金）
        const result = await createAffiliate(userId, 10.00);
        return res.status(200).json({ success: true, affiliate: result });
      }
      
      case 'allReferrals': {
        // 管理员查看所有推荐用户
        if (!await isAdmin(userId)) {
          return res.status(403).json({ error: '需要管理员权限' });
        }
        
        const { limit: refLimit, startDate: refStartDate, endDate: refEndDate } = req.query;
        const allReferrals = await getAllReferrals(parseInt(refLimit) || 200, refStartDate, refEndDate);
        return res.status(200).json({ success: true, ...allReferrals });
      }
      
      case 'allOrders': {
        // 管理员查看所有推荐订单
        if (!await isAdmin(userId)) {
          return res.status(403).json({ error: '需要管理员权限' });
        }
        
        const { limit: orderLimit, startDate: orderStartDate, endDate: orderEndDate } = req.query;
        const allOrders = await getAllOrders(parseInt(orderLimit) || 200, orderStartDate, orderEndDate);
        return res.status(200).json({ success: true, ...allOrders });
      }
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          available: ['create', 'list', 'update', 'dashboard', 'referrals', 'orders', 'report', 'export', 'validate', 'link', 'self-register', 'allReferrals', 'allOrders']
        });
    }
  } catch (error) {
    console.error('[Affiliate API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 导出辅助函数供其他模块使用
module.exports.generateReferralCode = generateReferralCode;
module.exports.validateReferralCode = validateReferralCode;
module.exports.linkReferral = linkReferral;
