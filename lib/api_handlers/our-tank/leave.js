/**
 * Our Tank 退出处理器
 * 
 * POST /api/our-tank-api?action=leave
 * Body: { tankId }
 * 
 * Requirements: 5.5
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const { checkMembership } = require('./utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = authResult.userId;
    const { tankId } = req.body;

    if (!tankId) {
      return res.status(400).json({ error: 'tankId is required' });
    }

    // 检查用户是否是成员
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember) {
      return res.status(404).json({ error: 'You are not a member of this tank' });
    }

    // 主人不能退出，只能删除鱼缸
    if (membership.role === 'owner') {
      return res.status(403).json({ 
        error: 'Owner cannot leave',
        message: 'As the owner, you cannot leave. You can delete the tank instead.'
      });
    }

    // 先删除该成员添加的所有鱼
    // 注意：user_id/added_by 是 String 类型（VARCHAR(255)）
    const deleteFishMutation = `
      mutation DeleteMemberFish($tankId: uuid!, $userId: String!) {
        delete_our_tank_fish(where: { 
          tank_id: { _eq: $tankId }, 
          added_by: { _eq: $userId } 
        }) {
          affected_rows
        }
      }
    `;
    const fishResult = await queryHasura(deleteFishMutation, { tankId, userId });

    // 删除成员记录
    const deleteMemberMutation = `
      mutation DeleteMember($tankId: uuid!, $userId: String!) {
        delete_our_tank_members(where: { 
          tank_id: { _eq: $tankId }, 
          user_id: { _eq: $userId } 
        }) {
          affected_rows
        }
      }
    `;
    await queryHasura(deleteMemberMutation, { tankId, userId });

    console.log(`[Our Tank] User ${userId} left tank ${tankId}, removed ${fishResult.delete_our_tank_fish?.affected_rows || 0} fish`);

    return res.status(200).json({ 
      success: true,
      removedFishCount: fishResult.delete_our_tank_fish?.affected_rows || 0
    });

  } catch (error) {
    console.error('[Our Tank Leave] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
