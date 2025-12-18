/**
 * Our Tank 创建处理器
 * 
 * POST /api/our-tank-api?action=create
 * Body: { name, description?, password? }
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const {
  generateInviteCode,
  checkCanCreateTank,
  getTankByCode
} = require('./utils');

// 最大重试次数（邀请码冲突时）
const MAX_CODE_RETRIES = 5;

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
        message: 'Please login to create a tank'
      });
    }

    const userId = authResult.userId;
    const { name, description } = req.body;

    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Tank name is required'
      });
    }

    // 验证名称长度
    if (name.trim().length > 100) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Tank name must be 100 characters or less'
      });
    }

    // 检查会员创建限制
    const limitCheck = await checkCanCreateTank(userId, queryHasura);
    if (!limitCheck.canCreate) {
      return res.status(403).json({
        error: 'Limit reached',
        message: `You have reached your limit of ${limitCheck.limit} tanks. Upgrade your membership to create more.`,
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        memberType: limitCheck.memberType
      });
    }

    // 生成唯一邀请码（带重试）
    let code = null;
    let retries = 0;
    while (!code && retries < MAX_CODE_RETRIES) {
      const candidateCode = generateInviteCode();
      const existingTank = await getTankByCode(candidateCode, queryHasura);
      if (!existingTank) {
        code = candidateCode;
      }
      retries++;
    }

    if (!code) {
      return res.status(500).json({
        error: 'Code generation failed',
        message: 'Failed to generate unique invite code. Please try again.'
      });
    }

    // 创建鱼缸（密码功能已移除，CODE 即为访问凭证）
    const createMutation = `
      mutation CreateOurTank(
        $code: String!,
        $name: String!,
        $description: String,
        $ownerId: String!
      ) {
        insert_our_tanks_one(object: {
          code: $code,
          name: $name,
          description: $description,
          owner_id: $ownerId
        }) {
          id
          code
          name
          description
          max_fish_count
          created_at
        }
      }
    `;

    const tankResult = await queryHasura(createMutation, {
      code,
      name: name.trim(),
      description: description?.trim() || null,
      ownerId: userId
    });

    const tank = tankResult.insert_our_tanks_one;

    // 将创建者添加为 owner 成员
    // 注意：user_id 是 String 类型（VARCHAR(255)）
    const addMemberMutation = `
      mutation AddOwnerMember($tankId: uuid!, $userId: String!) {
        insert_our_tank_members_one(object: {
          tank_id: $tankId,
          user_id: $userId,
          role: "owner"
        }) {
          id
          role
          joined_at
        }
      }
    `;

    await queryHasura(addMemberMutation, {
      tankId: tank.id,
      userId
    });

    console.log(`[Our Tank] Created tank: ${tank.id} (code: ${tank.code}) by user: ${userId}`);

    return res.status(201).json({
      success: true,
      tank: {
        id: tank.id,
        code: tank.code,
        name: tank.name,
        description: tank.description,
        maxFishCount: tank.max_fish_count,
        createdAt: tank.created_at
      },
      membership: {
        currentCount: limitCheck.currentCount + 1,
        limit: limitCheck.limit,
        memberType: limitCheck.memberType
      }
    });

  } catch (error) {
    console.error('[Our Tank Create] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
