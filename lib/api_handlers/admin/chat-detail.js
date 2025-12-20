/**
 * 管理后台 - 群聊详情 API 处理器
 * 
 * 提供群聊详情查询：
 * - 根据 chatId 查询群聊记录
 * - 解析 dialogues JSON 字段提取消息列表
 * - 按 sequence 排序消息
 * - 返回完整对话内容
 */

const { query } = require('../../hasura');

/**
 * 解析 dialogues JSON 并提取消息列表
 * @param {object|string} dialogues - dialogues 字段值
 * @returns {Array} 消息列表
 */
function parseDialogues(dialogues) {
  if (!dialogues) return [];
  
  try {
    const data = typeof dialogues === 'string' ? JSON.parse(dialogues) : dialogues;
    return data.messages || [];
  } catch (error) {
    console.error('[Chat Detail] Failed to parse dialogues:', error);
    return [];
  }
}

/**
 * 按 sequence 排序消息
 * @param {Array} messages - 消息列表
 * @returns {Array} 排序后的消息列表
 */
function sortMessagesBySequence(messages) {
  if (!Array.isArray(messages)) return [];
  return [...messages].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
}

/**
 * 验证消息是否包含必需字段
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function validateMessage(message) {
  return (
    message &&
    'fishName' in message &&
    'message' in message &&
    'sequence' in message
  );
}

/**
 * 检查消息列表是否按 sequence 升序排列
 * @param {Array} messages - 消息列表
 * @returns {boolean}
 */
function isMessagesSorted(messages) {
  if (!Array.isArray(messages) || messages.length <= 1) return true;
  
  for (let i = 1; i < messages.length; i++) {
    if ((messages[i].sequence || 0) < (messages[i - 1].sequence || 0)) {
      return false;
    }
  }
  return true;
}

/**
 * 识别用户消息
 * @param {string} userTalk - 用户发言内容
 * @param {Array} messages - 消息列表
 * @returns {Array} 带有 isUserMessage 标记的消息列表
 */
function markUserMessages(userTalk, messages) {
  if (!userTalk || !Array.isArray(messages)) return messages;
  
  return messages.map(msg => ({
    ...msg,
    isUserMessage: msg.message === userTalk || msg.fishName === 'User'
  }));
}

/**
 * 查询群聊详情
 * @param {string} chatId - 群聊 ID
 * @returns {Promise<object|null>}
 */
async function getChatDetail(chatId) {
  const queryStr = `
    query ChatDetail($chatId: uuid!) {
      group_chat_by_pk(id: $chatId) {
        id
        topic
        created_at
        dialogues
        user_talk
        participant_fish_ids
        our_tank_id
        our_tank {
          id
          name
        }
      }
    }
  `;
  
  const data = await query(queryStr, { chatId });
  
  if (!data.group_chat_by_pk) {
    return null;
  }
  
  const chat = data.group_chat_by_pk;
  const messages = parseDialogues(chat.dialogues);
  const sortedMessages = sortMessagesBySequence(messages);
  const markedMessages = markUserMessages(chat.user_talk, sortedMessages);
  
  return {
    id: chat.id,
    topic: chat.topic,
    created_at: chat.created_at,
    user_talk: chat.user_talk,
    participant_count: chat.participant_fish_ids?.length || 0,
    our_tank_id: chat.our_tank_id,
    our_tank_name: chat.our_tank?.name || null,
    messages: markedMessages
  };
}

/**
 * 主处理函数
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { chatId } = req.query;
    
    if (!chatId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: chatId' 
      });
    }
    
    const result = await getChatDetail(chatId);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Chat not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Chat Detail API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch chat detail',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 导出函数供测试使用
module.exports = handler;
module.exports.getChatDetail = getChatDetail;
module.exports.parseDialogues = parseDialogues;
module.exports.sortMessagesBySequence = sortMessagesBySequence;
module.exports.validateMessage = validateMessage;
module.exports.isMessagesSorted = isMessagesSorted;
module.exports.markUserMessages = markUserMessages;
