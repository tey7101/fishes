/**
 * Our Tank 移除成员处理器
 * 
 * POST /api/our-tank-api?action=remove-member
 * Body: { tankId, memberId }
 * 
 * Requirements: 5.2
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
    const { tankId, memberId } = req.body;

    if (!tankId || !memberId) {
      return res.status(400).json({ error: 'tankId and memberId are required' });
    }

    // 检查操作者是否是主人
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember || membership.role !== 'owner') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only the tank owner can remove members'
      });
    }

    // 不能移除自己（主人）
    if (memberId === userId) {
      return res.status(403).json({ 
        error: 'Cannot remove self',
        message: 'You cannot remove yourself. Delete the tank instead.'
      });
    }

    // 检查目标用户是否是成员
    const targetMembership = await checkMembership(tankId, memberId, queryHasura);
    if (!targetMembership.isMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 先删除该成员添加的所有鱼
    const deleteFishMutation = `
      mutation DeleteMemberFish($tankId: uuid!, $memberId: uuid!) {
        delete_our_tank_fish(where: { 
          tank_id: { _eq: $tankId }, 
          added_by: { _eq: $memberId } 
        }) {
          affected_rows
        }
      }
    `;
    const fishResult = await queryHasura(deleteFishMutation, { tankId, memberId });

    // 删除成员记录
    const deleteMemberMutation = `
      mutation DeleteMember($tankId: uuid!, $memberId: uuid!) {
        delete_our_tank_members(where: { 
          tank_id: { _eq: $tankId }, 
          user_id: { _eq: $memberId } 
        }) {
          affected_rows
        }
      }
    `;
    await queryHasura(deleteMemberMutation, { tankId, memberId });

    console.log(`[Our Tank] Member ${memberId} removed from tank ${tankId} by owner ${userId}`);

    return res.status(200).json({ 
      success: true,
      removedFishCount: fishResult.delete_our_tank_fish?.affected_rows || 0
    });

  } catch (error) {
    console.error('[Our Tank Remove Member] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
