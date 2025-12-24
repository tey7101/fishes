/**
 * 管理后台 - 网站表现统计数据 API 处理器
 * 
 * 提供指定日期区间内的业务指标统计：
 * - 用户数（总数、匿名用户、注册用户）
 * - 群聊数
 * - Our Tank 数
 * - 支付订单数
 * - 按日期/小时分组的时间线数据
 */

const { query } = require('../../hasura');

/**
 * 解析日期区间参数
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @returns {{ startDate: Date, endDate: Date, daysDiff: number }}
 */
function parseDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (start > end) {
    throw new Error('Start date must be before end date');
  }
  
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  return { startDate: start, endDate: end, daysDiff };
}

/**
 * 生成日期标签数组
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @param {boolean} byHour - 是否按小时分组
 * @returns {string[]} 日期/小时标签数组
 */
function generateDateLabels(startDate, endDate, byHour = false) {
  const labels = [];
  const current = new Date(startDate);
  
  if (byHour) {
    // 按小时分组（单日）
    while (current <= endDate) {
      labels.push(current.toISOString().slice(0, 13) + ':00');
      current.setHours(current.getHours() + 1);
    }
  } else {
    // 按日期分组
    while (current <= endDate) {
      labels.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
  }
  
  return labels;
}

/**
 * 查询用户统计数据
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @returns {Promise<{ total: number, anonymous: number, registered: number }>}
 */
async function getUserStats(startDate, endDate) {
  const queryStr = `
    query UserStats($startDate: timestamp!, $endDate: timestamp!) {
      total: users_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        aggregate { count }
      }
      anonymous: users_aggregate(where: {
        created_at: {_gte: $startDate, _lte: $endDate},
        _or: [
          {email: {_is_null: true}},
          {email: {_eq: ""}},
          {email: {_like: "%@anonymous.%"}}
        ]
      }) {
        aggregate { count }
      }
    }
  `;
  
  const data = await query(queryStr, { startDate, endDate });
  
  const total = data.total?.aggregate?.count || 0;
  const anonymous = data.anonymous?.aggregate?.count || 0;
  const registered = total - anonymous;
  
  return { total, anonymous, registered };
}

/**
 * 查询群聊统计数据
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @returns {Promise<{ total: number, userParticipated: number }>}
 */
async function getGroupChatStats(startDate, endDate) {
  const queryStr = `
    query GroupChatStats($startDate: timestamp!, $endDate: timestamp!) {
      total: group_chat_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        aggregate { count }
      }
      userParticipated: group_chat_aggregate(where: {
        created_at: {_gte: $startDate, _lte: $endDate},
        user_talk: {_is_null: false, _neq: ""}
      }) {
        aggregate { count }
      }
    }
  `;
  
  const data = await query(queryStr, { startDate, endDate });
  return {
    total: data.total?.aggregate?.count || 0,
    userParticipated: data.userParticipated?.aggregate?.count || 0
  };
}

/**
 * 查询 Our Tank 统计数据
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @returns {Promise<number>}
 */
async function getOurTankStats(startDate, endDate) {
  const queryStr = `
    query OurTankStats($startDate: timestamptz!, $endDate: timestamptz!) {
      our_tanks_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        aggregate { count }
      }
    }
  `;
  
  const data = await query(queryStr, { startDate, endDate });
  return data.our_tanks_aggregate?.aggregate?.count || 0;
}

/**
 * 查询支付订单统计数据
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @returns {Promise<number>}
 */
async function getPaymentStats(startDate, endDate) {
  const queryStr = `
    query PaymentStats($startDate: timestamp!, $endDate: timestamp!) {
      payment_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        aggregate { count }
      }
    }
  `;
  
  const data = await query(queryStr, { startDate, endDate });
  return data.payment_aggregate?.aggregate?.count || 0;
}

/**
 * 查询画鱼数统计数据
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @returns {Promise<number>}
 */
async function getFishStats(startDate, endDate) {
  const queryStr = `
    query FishStats($startDate: timestamp!, $endDate: timestamp!) {
      fish_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        aggregate { count }
      }
    }
  `;
  
  const data = await query(queryStr, { startDate, endDate });
  return data.fish_aggregate?.aggregate?.count || 0;
}


/**
 * 查询时间线数据（按日期或小时分组）
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @param {boolean} byHour - 是否按小时分组
 * @returns {Promise<object>} 时间线数据
 */
async function getTimelineData(startDate, endDate, byHour = false) {
  const labels = generateDateLabels(new Date(startDate), new Date(endDate), byHour);
  
  // 初始化数据数组
  const users = new Array(labels.length).fill(0);
  const groupChats = new Array(labels.length).fill(0);
  const ourTanks = new Array(labels.length).fill(0);
  const payments = new Array(labels.length).fill(0);
  const fish = new Array(labels.length).fill(0);
  
  // 查询所有记录并按日期/小时分组
  const queryStr = `
    query TimelineData($startDate: timestamp!, $endDate: timestamp!, $startDateTz: timestamptz!, $endDateTz: timestamptz!) {
      users(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        created_at
      }
      group_chat(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        created_at
      }
      our_tanks(where: {created_at: {_gte: $startDateTz, _lte: $endDateTz}}) {
        created_at
      }
      payment(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        created_at
      }
      fish(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
        created_at
      }
    }
  `;
  
  const data = await query(queryStr, {
    startDate,
    endDate,
    startDateTz: startDate,
    endDateTz: endDate
  });
  
  // 辅助函数：获取日期/小时键
  const getKey = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (byHour) {
      return date.toISOString().slice(0, 13) + ':00';
    }
    return date.toISOString().slice(0, 10);
  };
  
  // 统计用户
  (data.users || []).forEach(item => {
    const key = getKey(item.created_at);
    const index = labels.indexOf(key);
    if (index !== -1) users[index]++;
  });
  
  // 统计群聊
  (data.group_chat || []).forEach(item => {
    const key = getKey(item.created_at);
    const index = labels.indexOf(key);
    if (index !== -1) groupChats[index]++;
  });
  
  // 统计 Our Tank
  (data.our_tanks || []).forEach(item => {
    const key = getKey(item.created_at);
    const index = labels.indexOf(key);
    if (index !== -1) ourTanks[index]++;
  });
  
  // 统计支付
  (data.payment || []).forEach(item => {
    const key = getKey(item.created_at);
    const index = labels.indexOf(key);
    if (index !== -1) payments[index]++;
  });
  
  // 统计画鱼
  (data.fish || []).forEach(item => {
    const key = getKey(item.created_at);
    const index = labels.indexOf(key);
    if (index !== -1) fish[index]++;
  });
  
  return { labels, users, groupChats, ourTanks, payments, fish };
}

/**
 * 主处理函数
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: startDate and endDate' 
      });
    }
    
    // 解析日期区间
    const { daysDiff } = parseDateRange(startDate, endDate);
    const byHour = daysDiff <= 1;
    
    // 并行查询所有统计数据
    const [userStats, groupChats, ourTanks, payments, fishCount, timeline] = await Promise.all([
      getUserStats(startDate, endDate),
      getGroupChatStats(startDate, endDate),
      getOurTankStats(startDate, endDate),
      getPaymentStats(startDate, endDate),
      getFishStats(startDate, endDate),
      getTimelineData(startDate, endDate, byHour)
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        users: userStats,
        groupChats,
        ourTanks,
        payments,
        fish: fishCount,
        timeline
      }
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 导出函数供测试使用
module.exports = handler;
module.exports.parseDateRange = parseDateRange;
module.exports.generateDateLabels = generateDateLabels;
module.exports.getUserStats = getUserStats;
module.exports.getGroupChatStats = getGroupChatStats;
module.exports.getOurTankStats = getOurTankStats;
module.exports.getPaymentStats = getPaymentStats;
module.exports.getFishStats = getFishStats;
module.exports.getTimelineData = getTimelineData;
