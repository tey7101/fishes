/**
 * Our Tank 移除鱼处理器
 * 
 * POST /api/our-tank-api?action=remove-fish
 * Body: { tankId, fishId }
 * 
 * Requirements: 3.3
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const { checkMembership } = require('./utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = authResult.userId;
    const { tankId, fishId } = req.body;

    if (!tankId || !fishId) {
      return res.status(400).json({ error: 'tankId and fishId are required' });
    }

    // 检查用户是否是成员
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 查找鱼缸中的鱼记录
    const fishQuery = `
      query GetTankFish($tankId: uuid!, $fishId: uuid!) {
        our_tank_fish(where: { tank_id: { _eq: $tankId }, fish_id: { _eq: $fishId } }) {
          id
          added_by
        }
      }
    `;
    const fishResult = await queryHasura(fishQuery, { tankId, fishId });
    const tankFish = fishResult.our_tank_fish?.[0];

    if (!tankFish) {
      return res.status(404).json({ error: 'Fish not found in this tank' });
    }

    // 只有添加者或鱼缸主人可以移除
    if (tankFish.added_by !== userId && membership.role !== 'owner') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only the fish owner or tank owner can remove this fish'
      });
    }

    // 删除关联记录（不影响原始鱼）
    const deleteMutation = `
      mutation RemoveFishFromTank($id: uuid!) {
        delete_our_tank_fish_by_pk(id: $id) {
          id
        }
      }
    `;
    await queryHasura(deleteMutation, { id: tankFish.id });

    console.log(`[Our Tank] Fish ${fishId} removed from tank ${tankId}`);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Our Tank Remove Fish] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
