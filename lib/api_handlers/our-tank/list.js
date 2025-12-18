/**
 * Our Tank 列表处理器
 * 
 * GET /api/our-tank-api?action=list
 * 
 * Requirements: 7.1, 7.3, 7.4
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const { checkCanCreateTank } = require('./utils');

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
        message: 'Please login to view your tanks'
      });
    }

    const userId = authResult.userId;

    // 查询用户参与的所有鱼缸（包括创建的和加入的）
    // 注意：user_id 是 String 类型（VARCHAR(255)），不是 UUID
    // 注意：Hasura 自动生成的关系名称可能是复数形式
    const query = `
      query GetUserTanks($userId: String!) {
        our_tank_members(
          where: { user_id: { _eq: $userId } }
          order_by: { joined_at: desc }
        ) {
          role
          joined_at
          last_read_at
          our_tank {
            id
            code
            name
            description
            owner_id
            max_fish_count
            created_at
            updated_at
            our_tank_members_aggregate {
              aggregate {
                count
              }
            }
            our_tank_fishes_aggregate {
              aggregate {
                count
              }
            }
            group_chats(
              where: { our_tank_id: { _is_null: false } }
              order_by: { created_at: desc }
              limit: 1
            ) {
              created_at
            }
          }
        }
      }
    `;

    const result = await queryHasura(query, { userId });
    
    // 获取会员限制信息
    const limitInfo = await checkCanCreateTank(userId, queryHasura);

    // 格式化返回数据
    const tanks = result.our_tank_members.map(membership => {
      const tank = membership.our_tank;
      const latestChatTime = tank.group_chats?.[0]?.created_at;
      const lastReadAt = membership.last_read_at;
      
      // 计算未读状态
      let hasUnread = false;
      if (latestChatTime && (!lastReadAt || new Date(latestChatTime) > new Date(lastReadAt))) {
        hasUnread = true;
      }

      return {
        id: tank.id,
        code: tank.code,
        name: tank.name,
        description: tank.description,
        isOwner: membership.role === 'owner',
        role: membership.role,
        memberCount: tank.our_tank_members_aggregate?.aggregate?.count || 0,
        fishCount: tank.our_tank_fishes_aggregate?.aggregate?.count || 0,
        maxFishCount: tank.max_fish_count,
        hasUnread,
        latestChatTime,
        joinedAt: membership.joined_at,
        createdAt: tank.created_at
      };
    });

    return res.status(200).json({
      success: true,
      tanks,
      membership: {
        createdCount: limitInfo.currentCount,
        limit: limitInfo.limit,
        canCreate: limitInfo.canCreate,
        memberType: limitInfo.memberType
      }
    });

  } catch (error) {
    console.error('[Our Tank List] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
