/**
 * 管理后台 - Our Tank 数据分析 API 处理器
 * 
 * 提供 Our Tank 列表和详情数据：
 * - 按时间筛选的 Our Tank 列表
 * - 每个 Tank 的成员数、鱼数、聊天数
 * - Tank 的聊天历史详情
 */

const { query } = require('../../hasura');

/**
 * 获取 Our Tank 列表（带统计数据）
 */
async function getOurTankList(startDate, endDate) {
  const queryStr = `
    query OurTankList($startDate: timestamptz!, $endDate: timestamptz!) {
      our_tanks(
        where: { created_at: { _gte: $startDate, _lte: $endDate } }
        order_by: { created_at: desc }
      ) {
        id
        code
        name
        description
        owner_id
        created_at
        our_tank_members_aggregate {
          aggregate { count }
        }
        our_tank_fishes_aggregate {
          aggregate { count }
        }
        group_chats_aggregate {
          aggregate { count }
        }
      }
    }
  `;

  const data = await query(queryStr, { startDate, endDate });

  return (data.our_tanks || []).map(tank => ({
    id: tank.id,
    code: tank.code,
    name: tank.name,
    description: tank.description,
    ownerId: tank.owner_id,
    ownerName: tank.owner_id || 'Unknown',
    createdAt: tank.created_at,
    memberCount: tank.our_tank_members_aggregate?.aggregate?.count || 0,
    fishCount: tank.our_tank_fishes_aggregate?.aggregate?.count || 0,
    chatCount: tank.group_chats_aggregate?.aggregate?.count || 0
  }));
}

/**
 * 获取指定 Tank 的聊天历史
 */
async function getTankChatHistory(tankId, limit = 50) {
  const queryStr = `
    query TankChatHistory($tankId: uuid!, $limit: Int!) {
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
        created_at
        initiator_user_id
        user {
          nick_name
          email
        }
      }
    }
  `;

  const data = await query(queryStr, { tankId, limit });

  return (data.group_chat || []).map(chat => ({
    id: chat.id,
    topic: chat.topic,
    userMessage: chat.user_talk,
    dialogues: chat.dialogues,
    participantFishIds: chat.participant_fish_ids,
    timeOfDay: chat.time_of_day,
    createdAt: chat.created_at,
    initiatorUserId: chat.initiator_user_id,
    initiatorName: chat.user?.nick_name || chat.user?.email || 'Anonymous'
  }));
}

/**
 * 主处理函数
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const subAction = url.searchParams.get('subAction');

    if (subAction === 'chat-history') {
      // 获取指定 Tank 的聊天历史
      const tankId = url.searchParams.get('tankId');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);

      if (!tankId) {
        return res.status(400).json({ error: 'tankId is required' });
      }

      const chats = await getTankChatHistory(tankId, limit);
      return res.status(200).json({ success: true, chats });
    }

    // 默认：获取 Tank 列表
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate and endDate'
      });
    }

    const tanks = await getOurTankList(startDate, endDate);

    return res.status(200).json({
      success: true,
      tanks,
      totalCount: tanks.length
    });

  } catch (error) {
    console.error('[Our Tank Analytics API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch our tank data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = handler;
