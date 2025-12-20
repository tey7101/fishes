/**
 * 管理后台 - 会话列表 API 处理器
 * 
 * 按 conversation 分组显示群聊：
 * - 每个 conversation 一行
 * - 显示用户昵称、群聊条数、持续时长
 * - 支持日期区间过滤和分页
 */

const { query } = require('../../hasura');

/**
 * 查询会话列表（按 coze_conversation_id 分组）
 * @param {string} startDate - 开始日期 ISO 字符串
 * @param {string} endDate - 结束日期 ISO 字符串
 * @param {number} limit - 每页数量
 * @param {number} offset - 偏移量
 * @param {string} sortOrder - 排序方向 'asc' 或 'desc'
 * @param {boolean} userTalkOnly - 是否只显示有用户参与的会话
 * @returns {Promise<{ conversations: Array, total: number }>}
 */
async function getConversationList(startDate, endDate, limit = 50, offset = 0, sortOrder = 'desc', userTalkOnly = false) {
  // 使用子查询按 coze_conversation_id 分组
  // 对于 NULL 的 coze_conversation_id，每条记录单独显示
  const userTalkFilter = userTalkOnly ? ', user_talk: {_is_null: false, _neq: ""}' : '';
  
  // 查询所有群聊记录，然后在应用层分组
  const queryStrAsc = `
    query ConversationListAsc($startDate: timestamp!, $endDate: timestamp!) {
      group_chat(
        where: {created_at: {_gte: $startDate, _lte: $endDate}${userTalkFilter}},
        order_by: {created_at: asc}
      ) {
        id
        topic
        created_at
        participant_fish_ids
        user_talk
        our_tank_id
        initiator_user_id
        coze_conversation_id
        conversation_id
        dialogues
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
    }
  `;
  
  const queryStrDesc = `
    query ConversationListDesc($startDate: timestamp!, $endDate: timestamp!) {
      group_chat(
        where: {created_at: {_gte: $startDate, _lte: $endDate}${userTalkFilter}},
        order_by: {created_at: desc}
      ) {
        id
        topic
        created_at
        participant_fish_ids
        user_talk
        our_tank_id
        initiator_user_id
        coze_conversation_id
        conversation_id
        dialogues
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
    }
  `;
  
  const queryStr = sortOrder === 'asc' ? queryStrAsc : queryStrDesc;
  const data = await query(queryStr, { startDate, endDate });
  
  const allChats = data.group_chat || [];
  
  // 按 coze_conversation_id 或 conversation_id 分组
  // 优先使用 coze_conversation_id，如果为空则使用 conversation_id
  const conversationMap = new Map();
  let nullConvIndex = 0;
  
  for (const chat of allChats) {
    // 使用 coze_conversation_id 或 conversation_id 作为分组键，都为 NULL 的单独处理
    const convKey = chat.coze_conversation_id || chat.conversation_id || `__null_${nullConvIndex++}`;
    
    if (!conversationMap.has(convKey)) {
      conversationMap.set(convKey, {
        conversation_id: chat.coze_conversation_id || chat.conversation_id,
        coze_conversation_id: chat.coze_conversation_id,
        db_conversation_id: chat.conversation_id,
        chats: [],
        first_chat_at: chat.created_at,
        last_chat_at: chat.created_at,
        user_nickname: chat.user?.nick_name || null,
        user_email: chat.user?.email || null,
        initiator_user_id: chat.initiator_user_id,
        has_user_talk: false,
        our_tank_id: chat.our_tank_id,
        our_tank_name: chat.our_tank?.name || null
      });
    }
    
    const conv = conversationMap.get(convKey);
    conv.chats.push({
      id: chat.id,
      topic: chat.topic,
      created_at: chat.created_at,
      participant_count: chat.participant_fish_ids?.length || 0,
      user_talk: chat.user_talk,
      dialogues: chat.dialogues
    });
    
    // 更新时间范围
    const chatTime = new Date(chat.created_at).getTime();
    const firstTime = new Date(conv.first_chat_at).getTime();
    const lastTime = new Date(conv.last_chat_at).getTime();
    
    if (chatTime < firstTime) conv.first_chat_at = chat.created_at;
    if (chatTime > lastTime) conv.last_chat_at = chat.created_at;
    
    // 检查是否有用户发言
    if (chat.user_talk) conv.has_user_talk = true;
  }
  
  // 转换为数组并计算统计信息
  let conversations = Array.from(conversationMap.values()).map(conv => {
    const firstTime = new Date(conv.first_chat_at).getTime();
    const lastTime = new Date(conv.last_chat_at).getTime();
    const durationMs = lastTime - firstTime;
    
    return {
      conversation_id: conv.conversation_id,
      chat_count: conv.chats.length,
      first_chat_at: conv.first_chat_at,
      last_chat_at: conv.last_chat_at,
      duration_seconds: Math.floor(durationMs / 1000),
      user_nickname: conv.user_nickname,
      user_email: conv.user_email,
      initiator_user_id: conv.initiator_user_id,
      has_user_talk: conv.has_user_talk,
      our_tank_id: conv.our_tank_id,
      our_tank_name: conv.our_tank_name,
      chat_ids: conv.chats.map(c => c.id)
    };
  });
  
  // 按第一条聊天时间排序
  conversations.sort((a, b) => {
    const timeA = new Date(sortOrder === 'desc' ? a.last_chat_at : a.first_chat_at).getTime();
    const timeB = new Date(sortOrder === 'desc' ? b.last_chat_at : b.first_chat_at).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  const total = conversations.length;
  
  // 分页
  conversations = conversations.slice(offset, offset + limit);
  
  return { conversations, total };
}

/**
 * 获取会话详情（包含所有群聊消息）
 * @param {Array<string>} chatIds - 群聊 ID 数组
 * @returns {Promise<Array>}
 */
async function getConversationChats(chatIds) {
  if (!chatIds || chatIds.length === 0) {
    return [];
  }
  
  const queryStr = `
    query GetConversationChats($chatIds: [uuid!]!) {
      group_chat(
        where: {id: {_in: $chatIds}},
        order_by: {created_at: asc}
      ) {
        id
        topic
        created_at
        participant_fish_ids
        user_talk
        dialogues
        user {
          nick_name
        }
      }
    }
  `;
  
  const data = await query(queryStr, { chatIds });
  return data.group_chat || [];
}

/**
 * 格式化持续时长
 * @param {number} seconds - 秒数
 * @returns {string}
 */
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}小时${mins}分`;
}

/**
 * 主处理函数
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { startDate, endDate, limit = '50', offset = '0', sort = 'desc', userTalkOnly = 'false', chatIds } = req.query;
    
    // 如果提供了 chatIds，返回会话详情
    if (chatIds) {
      const ids = chatIds.split(',').filter(id => id.trim());
      const chats = await getConversationChats(ids);
      return res.status(200).json({
        success: true,
        data: { chats }
      });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: startDate and endDate' 
      });
    }
    
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;
    const sortOrder = sort === 'asc' ? 'asc' : 'desc';
    const filterUserTalkOnly = userTalkOnly === 'true';
    
    const result = await getConversationList(startDate, endDate, limitNum, offsetNum, sortOrder, filterUserTalkOnly);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Conversation List API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch conversation list',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 导出函数供测试使用
module.exports = handler;
module.exports.getConversationList = getConversationList;
module.exports.getConversationChats = getConversationChats;
module.exports.formatDuration = formatDuration;

/**
 * 按 conversation 分组群聊记录
 * @param {Array} chats - 群聊记录数组
 * @returns {Map} - 分组后的 Map
 */
function groupChatsByConversation(chats) {
  const conversationMap = new Map();
  let nullConvIndex = 0;
  
  for (const chat of chats) {
    const convKey = chat.coze_conversation_id || `__null_${nullConvIndex++}`;
    
    if (!conversationMap.has(convKey)) {
      conversationMap.set(convKey, {
        conversation_id: chat.coze_conversation_id,
        chats: [],
        first_chat_at: chat.created_at,
        last_chat_at: chat.created_at
      });
    }
    
    const conv = conversationMap.get(convKey);
    conv.chats.push(chat);
    
    const chatTime = new Date(chat.created_at).getTime();
    const firstTime = new Date(conv.first_chat_at).getTime();
    const lastTime = new Date(conv.last_chat_at).getTime();
    
    if (chatTime < firstTime) conv.first_chat_at = chat.created_at;
    if (chatTime > lastTime) conv.last_chat_at = chat.created_at;
  }
  
  return conversationMap;
}

module.exports.groupChatsByConversation = groupChatsByConversation;
