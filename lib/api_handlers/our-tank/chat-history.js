/**
 * Our Tank 聊天历史处理器
 * 
 * GET /api/our-tank-api?action=chat-history&tankId=xxx&limit=50
 * 
 * Requirements: 4.3
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const { checkMembership } = require('./utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = authResult.userId;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tankId = url.searchParams.get('tankId');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    if (!tankId) {
      return res.status(400).json({ error: 'tankId is required' });
    }

    // 检查用户是否是成员
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 查询聊天历史
    const query = `
      query GetChatHistory($tankId: uuid!, $limit: Int!) {
        group_chat(
          where: { our_tank_id: { _eq: $tankId } }
          order_by: { created_at: desc }
          limit: $limit
        ) {
          id
          topic
          user_talk
          dialogues
          participant_fish_ids
          time_of_day
          display_duration
          created_at
          initiator_user_id
          user {
            nick_name
          }
        }
      }
    `;

    const result = await queryHasura(query, { tankId, limit: Math.min(limit, 100) });

    // 更新用户的 last_read_at
    // 注意：user_id 是 String 类型（VARCHAR(255)）
    const updateReadMutation = `
      mutation UpdateLastRead($tankId: uuid!, $userId: String!) {
        update_our_tank_members(
          where: { tank_id: { _eq: $tankId }, user_id: { _eq: $userId } }
          _set: { last_read_at: "now()" }
        ) {
          affected_rows
        }
      }
    `;
    await queryHasura(updateReadMutation, { tankId, userId });

    // 格式化返回数据
    const sessions = result.group_chat.map(chat => ({
      id: chat.id,
      topic: chat.topic,
      userMessage: chat.user_talk,
      dialogues: chat.dialogues,
      participantFishIds: chat.participant_fish_ids,
      timeOfDay: chat.time_of_day,
      displayDuration: chat.display_duration,
      createdAt: chat.created_at,
      initiatorUserId: chat.initiator_user_id,
      initiatorName: chat.user?.nick_name || 'Anonymous'
    }));

    return res.status(200).json({
      success: true,
      sessions,
      totalCount: sessions.length
    });

  } catch (error) {
    console.error('[Our Tank Chat History] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
