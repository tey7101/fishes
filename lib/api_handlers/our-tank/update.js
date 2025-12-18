/**
 * Our Tank 更新设置处理器
 * 
 * POST /api/our-tank-api?action=update
 * Body: { tankId, name?, description?, password?, removePassword? }
 * 
 * Requirements: 5.3
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const { checkMembership, hashPassword } = require('./utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = authResult.userId;
    const { tankId, name, description, password, removePassword } = req.body;

    if (!tankId) {
      return res.status(400).json({ error: 'tankId is required' });
    }

    // 检查操作者是否是主人
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember || membership.role !== 'owner') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only the tank owner can update settings'
      });
    }

    // 构建更新字段
    const updates = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({ error: 'Name must be 100 characters or less' });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (removePassword) {
      updates.password_hash = null;
    } else if (password !== undefined && password !== null && password.length > 0) {
      updates.password_hash = await hashPassword(password);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // 执行更新
    const setClause = Object.entries(updates)
      .map(([key, _]) => `${key}: $${key}`)
      .join(', ');

    const updateMutation = `
      mutation UpdateTank($tankId: uuid!, ${Object.keys(updates).map(k => `$${k}: ${k === 'password_hash' ? 'String' : k === 'name' ? 'String!' : 'String'}`).join(', ')}) {
        update_our_tanks_by_pk(
          pk_columns: { id: $tankId }
          _set: { ${setClause} }
        ) {
          id
          name
          description
          updated_at
        }
      }
    `;

    const result = await queryHasura(updateMutation, { tankId, ...updates });

    console.log(`[Our Tank] Tank ${tankId} updated by owner ${userId}`);

    return res.status(200).json({
      success: true,
      tank: {
        id: result.update_our_tanks_by_pk.id,
        name: result.update_our_tanks_by_pk.name,
        description: result.update_our_tanks_by_pk.description,
        updatedAt: result.update_our_tanks_by_pk.updated_at,
        hasPassword: updates.password_hash !== null && updates.password_hash !== undefined ? true : undefined
      }
    });

  } catch (error) {
    console.error('[Our Tank Update] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
