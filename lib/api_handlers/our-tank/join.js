/**
 * Our Tank 加入处理器
 * 
 * POST /api/our-tank-api?action=join
 * Body: { code, password? }
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const {
  getTankByCode,
  checkMembership
} = require('./utils');

module.exports = async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 验证用户登录
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please login to join a tank'
      });
    }

    const userId = authResult.userId;
    const { code } = req.body;

    // 验证邀请码
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Invite code is required'
      });
    }

    // 查找鱼缸
    const tank = await getTankByCode(code.trim().toUpperCase(), queryHasura);
    if (!tank) {
      return res.status(404).json({
        error: 'Tank not found',
        message: 'Invalid invite code. Please check and try again.'
      });
    }

    // 检查是否已是成员（幂等处理）
    const membership = await checkMembership(tank.id, userId, queryHasura);
    if (membership.isMember) {
      // 已是成员，直接返回成功
      return res.status(200).json({
        success: true,
        alreadyMember: true,
        tank: {
          id: tank.id,
          code: tank.code,
          name: tank.name,
          description: tank.description,
          maxFishCount: tank.max_fish_count
        },
        role: membership.role
      });
    }

    // 添加成员（密码功能已移除，CODE 即为访问凭证）
    // 注意：user_id 是 String 类型（VARCHAR(255)）
    const addMemberMutation = `
      mutation AddMember($tankId: uuid!, $userId: String!) {
        insert_our_tank_members_one(object: {
          tank_id: $tankId,
          user_id: $userId,
          role: "member"
        }) {
          id
          role
          joined_at
        }
      }
    `;

    const memberResult = await queryHasura(addMemberMutation, {
      tankId: tank.id,
      userId
    });

    console.log(`[Our Tank] User ${userId} joined tank: ${tank.id} (code: ${tank.code})`);

    return res.status(200).json({
      success: true,
      alreadyMember: false,
      tank: {
        id: tank.id,
        code: tank.code,
        name: tank.name,
        description: tank.description,
        maxFishCount: tank.max_fish_count
      },
      role: memberResult.insert_our_tank_members_one.role,
      joinedAt: memberResult.insert_our_tank_members_one.joined_at
    });

  } catch (error) {
    console.error('[Our Tank Join] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
