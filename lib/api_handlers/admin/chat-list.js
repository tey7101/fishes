/**
 * 管理后台 - 群聊列表 API 处理器
 * 
 * 提供指定日期区间内的群聊列表：
 * - 支持日期区间过滤
 * - 支持分页（limit/offset）
 * - 关联查询 our_tanks 获取鱼缸名称
 * - 返回群聊基本信息（topic、created_at、参与鱼数量）
 */

const { query } = require('../../hasura');

/**
 * 查询群聊列表
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @param {number} limit - 每页数量
 * @param {number} offset - 偏移量
 * @param {string} sortOrder - 排序方向 'asc' 或 'desc'
 * @param {boolean} userTalkOnly - 是否只显示有用户参与的群聊
 * @returns {Promise<{ chats: Array, total: number }>}
 */
async function getChatList(startDate, endDate, limit = 50, offset = 0, sortOrder = 'desc', userTalkOnly = false) {
  // 构建 where 条件
  const userTalkFilter = userTalkOnly ? ', user_talk: {_is_null: false, _neq: ""}' : '';
  
  // 根据排序方向和筛选条件选择不同的查询
  const queryStrAsc = `
    query ChatListAsc($startDate: timestamp!, $endDate: timestamp!, $limit: Int!, $offset: Int!) {
      group_chat(
        where: {created_at: {_gte: $startDate, _lte: $endDate}${userTalkFilter}},
        order_by: {created_at: asc},
        limit: $limit,
        offset: $offset
      ) {
        id
        topic
        created_at
        participant_fish_ids
        user_talk
        our_tank_id
        initiator_user_id
        our_tank {
          id
          name
        }
        user {
          id
          nick_name
          email
        }
      }
      group_chat_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}${userTalkFilter}}) {
        aggregate {
          count
        }
      }
    }
  `;
  
  const queryStrDesc = `
    query ChatListDesc($startDate: timestamp!, $endDate: timestamp!, $limit: Int!, $offset: Int!) {
      group_chat(
        where: {created_at: {_gte: $startDate, _lte: $endDate}${userTalkFilter}},
        order_by: {created_at: desc},
        limit: $limit,
        offset: $offset
      ) {
        id
        topic
        created_at
        participant_fish_ids
        user_talk
        our_tank_id
        initiator_user_id
        our_tank {
          id
          name
        }
        user {
          id
          nick_name
          email
        }
      }
      group_chat_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}${userTalkFilter}}) {
        aggregate {
          count
        }
      }
    }
  `;
  
  const queryStr = sortOrder === 'asc' ? queryStrAsc : queryStrDesc;
  const data = await query(queryStr, { startDate, endDate, limit, offset });
  
  const chats = (data.group_chat || []).map(chat => ({
    id: chat.id,
    topic: chat.topic,
    created_at: chat.created_at,
    participant_count: chat.participant_fish_ids?.length || 0,
    our_tank_id: chat.our_tank_id,
    our_tank_name: chat.our_tank?.name || null,
    has_user_talk: !!chat.user_talk,
    initiator_user_id: chat.initiator_user_id,
    user_nickname: chat.user?.nick_name || null,
    user_email: chat.user?.email || null
  }));
  
  const total = data.group_chat_aggregate?.aggregate?.count || 0;
  
  return { chats, total };
}

/**
 * 验证群聊列表项是否包含必需字段
 * @param {object} chatItem - 群聊列表项
 * @returns {boolean}
 */
function validateChatListItem(chatItem) {
  return (
    'topic' in chatItem &&
    'created_at' in chatItem &&
    'participant_count' in chatItem &&
    typeof chatItem.participant_count === 'number'
  );
}

/**
 * 验证群聊是否在日期区间内
 * @param {string} createdAt - 创建时间
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {boolean}
 */
function isWithinDateRange(createdAt, startDate, endDate) {
  const created = new Date(createdAt);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return created >= start && created <= end;
}

/**
 * 主处理函数
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { startDate, endDate, limit = '50', offset = '0', sort = 'desc', userTalkOnly = 'false' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: startDate and endDate' 
      });
    }
    
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;
    const sortOrder = sort === 'asc' ? 'asc' : 'desc';
    const filterUserTalkOnly = userTalkOnly === 'true';
    
    const result = await getChatList(startDate, endDate, limitNum, offsetNum, sortOrder, filterUserTalkOnly);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Chat List API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch chat list',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 导出函数供测试使用
module.exports = handler;
module.exports.getChatList = getChatList;
module.exports.validateChatListItem = validateChatListItem;
module.exports.isWithinDateRange = isWithinDateRange;
