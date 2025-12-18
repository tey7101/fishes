/**
 * Our Tank 详情处理器
 * 
 * GET /api/our-tank-api?action=detail&tankId=xxx
 * 
 * Requirements: 5.1
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const { checkMembership } = require('./utils');

module.exports = async function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 验证用户登录
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please login to view tank details'
      });
    }

    const userId = authResult.userId;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tankId = url.searchParams.get('tankId');

    if (!tankId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'tankId is required'
      });
    }

    // 检查用户是否是成员
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this tank'
      });
    }

    // 查询鱼缸详情（分开查询，避免关系配置问题）
    const tankQuery = `
      query GetTankDetail($tankId: uuid!) {
        our_tanks_by_pk(id: $tankId) {
          id
          code
          name
          description
          owner_id
          max_fish_count
          created_at
          updated_at
        }
        # 成员列表
        our_tank_members(where: { tank_id: { _eq: $tankId } }, order_by: { joined_at: asc }) {
          id
          user_id
          role
          joined_at
        }
        # 鱼列表
        our_tank_fish(where: { tank_id: { _eq: $tankId } }, order_by: { added_at: desc }) {
          id
          fish_id
          added_by
          added_at
        }
      }
    `;

    const result = await queryHasura(tankQuery, { tankId });
    const tank = result.our_tanks_by_pk;
    const members = result.our_tank_members || [];
    const tankFish = result.our_tank_fish || [];

    if (!tank) {
      return res.status(404).json({
        error: 'Tank not found',
        message: 'The requested tank does not exist'
      });
    }

    // 查询鱼的详细信息
    let fishDetails = {};
    if (tankFish.length > 0) {
      const fishIds = tankFish.map(f => f.fish_id);
      const fishQuery = `
        query GetFishDetails($fishIds: [uuid!]!) {
          fish(where: { id: { _in: $fishIds } }) {
            id
            image_url
            fish_name
            personality
            user_id
            created_at
          }
        }
      `;
      const fishResult = await queryHasura(fishQuery, { fishIds });
      (fishResult.fish || []).forEach(f => {
        fishDetails[f.id] = f;
      });
    }

    // 收集所有需要查询的用户 ID
    const userIds = new Set();
    members.forEach(m => userIds.add(m.user_id));
    Object.values(fishDetails).forEach(f => {
      if (f.user_id) userIds.add(f.user_id);
    });

    // 批量查询用户信息
    let usersMap = {};
    if (userIds.size > 0) {
      const usersQuery = `
        query GetUsers($userIds: [String!]!) {
          users(where: { id: { _in: $userIds } }) {
            id
            nick_name
            avatar_url
          }
        }
      `;
      const usersResult = await queryHasura(usersQuery, { userIds: Array.from(userIds) });
      usersResult.users.forEach(u => {
        usersMap[u.id] = u;
      });
    }

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
    return res.status(200).json({
      success: true,
      tank: {
        id: tank.id,
        code: tank.code,
        name: tank.name,
        description: tank.description,
        ownerId: tank.owner_id,
        maxFishCount: tank.max_fish_count,
        createdAt: tank.created_at,
        updatedAt: tank.updated_at
      },
      members: members.map(m => {
        const user = usersMap[m.user_id];
        return {
          id: m.id,
          userId: m.user_id,
          role: m.role,
          joinedAt: m.joined_at,
          displayName: user?.nick_name || 'Anonymous',
          avatarUrl: user?.avatar_url
        };
      }),
      fish: tankFish.map(f => {
        const fishInfo = fishDetails[f.fish_id];
        const artistUser = fishInfo?.user_id ? usersMap[fishInfo.user_id] : null;
        return {
          id: f.id,
          fishId: f.fish_id,
          addedBy: f.added_by,
          addedAt: f.added_at,
          imageUrl: fishInfo?.image_url,
          fishName: fishInfo?.fish_name,
          personality: fishInfo?.personality,
          artistName: artistUser?.nick_name || 'Anonymous'
        };
      }),
      currentUserRole: membership.role,
      isOwner: membership.role === 'owner'
    });

  } catch (error) {
    console.error('[Our Tank Detail] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
