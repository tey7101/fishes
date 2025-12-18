/**
 * Our Tank 删除处理器
 * 
 * POST /api/our-tank-api?action=delete
 * Body: { tankId }
 * 
 * Requirements: 5.4
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
    const { tankId } = req.body;

    if (!tankId) {
      return res.status(400).json({ error: 'tankId is required' });
    }

    // 检查操作者是否是主人
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember || membership.role !== 'owner') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only the tank owner can delete the tank'
      });
    }

    // 删除鱼缸（级联删除会自动删除 members, fish, 和关联的 group_chat）
    const deleteMutation = `
      mutation DeleteTank($tankId: uuid!) {
        delete_our_tanks_by_pk(id: $tankId) {
          id
          name
        }
      }
    `;

    const result = await queryHasura(deleteMutation, { tankId });

    if (!result.delete_our_tanks_by_pk) {
      return res.status(404).json({ error: 'Tank not found' });
    }

    console.log(`[Our Tank] Tank ${tankId} (${result.delete_our_tanks_by_pk.name}) deleted by owner ${userId}`);

    return res.status(200).json({
      success: true,
      deletedTank: {
        id: result.delete_our_tanks_by_pk.id,
        name: result.delete_our_tanks_by_pk.name
      }
    });

  } catch (error) {
    console.error('[Our Tank Delete] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
