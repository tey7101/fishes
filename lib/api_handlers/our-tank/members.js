/**
 * Our Tank 成员列表处理器
 * 
 * GET /api/our-tank-api?action=members&tankId=xxx
 * 
 * Requirements: 5.1
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

    if (!tankId) {
      return res.status(400).json({ error: 'tankId is required' });
    }

    // 检查用户是否是成员
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 查询成员列表
    const query = `
      query GetMembers($tankId: uuid!) {
        our_tank_members(
          where: { tank_id: { _eq: $tankId } }
          order_by: [{ role: asc }, { joined_at: asc }]
        ) {
          id
          user_id
          role
          joined_at
          user {
            id
            nick_name
            avatar_url
          }
        }
        # 每个成员添加的鱼数量
        our_tank_fish(where: { tank_id: { _eq: $tankId } }) {
          added_by
        }
      }
    `;

    const result = await queryHasura(query, { tankId });

    // 计算每个成员的鱼数量
    const fishCountByUser = {};
    result.our_tank_fish?.forEach(f => {
      fishCountByUser[f.added_by] = (fishCountByUser[f.added_by] || 0) + 1;
    });

    const members = result.our_tank_members.map(m => ({
      id: m.id,
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      displayName: m.user?.nick_name || 'Anonymous',
      avatarUrl: m.user?.avatar_url,
      fishCount: fishCountByUser[m.user_id] || 0
    }));

    return res.status(200).json({
      success: true,
      members,
      totalMembers: members.length,
      currentUserRole: membership.role
    });

  } catch (error) {
    console.error('[Our Tank Members] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
