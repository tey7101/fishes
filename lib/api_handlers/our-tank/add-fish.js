/**
 * Our Tank 添加鱼处理器
 * 
 * POST /api/our-tank-api?action=add-fish
 * Body: { tankId, fishId }
 * 
 * Requirements: 3.1, 3.2, 3.5
 */

const { queryHasura } = require('../../hasura');
const { verifyAuth } = require('../middleware/auth');
const { checkMembership, getTankById } = require('./utils');

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
        message: 'Please login to add fish'
      });
    }

    const userId = authResult.userId;
    const { tankId, fishId } = req.body;

    // 验证必填字段
    if (!tankId || !fishId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'tankId and fishId are required'
      });
    }

    // 检查用户是否是成员
    const membership = await checkMembership(tankId, userId, queryHasura);
    if (!membership.isMember) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a member to add fish to this tank'
      });
    }

    // 验证鱼属于该用户
    const fishQuery = `
      query GetFish($fishId: uuid!) {
        fish_by_pk(id: $fishId) {
          id
          user_id
          image_url
          fish_name
        }
      }
    `;
    const fishResult = await queryHasura(fishQuery, { fishId });
    const fish = fishResult.fish_by_pk;

    if (!fish) {
      return res.status(404).json({
        error: 'Fish not found',
        message: 'The specified fish does not exist'
      });
    }

    if (fish.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only add your own fish to the tank'
      });
    }

    // 检查鱼缸容量
    const tank = await getTankById(tankId, queryHasura);
    if (!tank) {
      return res.status(404).json({
        error: 'Tank not found',
        message: 'The specified tank does not exist'
      });
    }

    const countQuery = `
      query GetFishCount($tankId: uuid!) {
        our_tank_fish_aggregate(where: { tank_id: { _eq: $tankId } }) {
          aggregate {
            count
          }
        }
      }
    `;
    const countResult = await queryHasura(countQuery, { tankId });
    const currentCount = countResult.our_tank_fish_aggregate?.aggregate?.count || 0;

    if (currentCount >= tank.max_fish_count) {
      return res.status(403).json({
        error: 'Tank full',
        message: `This tank is full (${currentCount}/${tank.max_fish_count} fish)`
      });
    }

    // 检查鱼是否已在鱼缸中
    const existingQuery = `
      query CheckExisting($tankId: uuid!, $fishId: uuid!) {
        our_tank_fish(where: { tank_id: { _eq: $tankId }, fish_id: { _eq: $fishId } }) {
          id
        }
      }
    `;
    const existingResult = await queryHasura(existingQuery, { tankId, fishId });
    
    if (existingResult.our_tank_fish && existingResult.our_tank_fish.length > 0) {
      return res.status(409).json({
        error: 'Already added',
        message: 'This fish is already in the tank'
      });
    }

    // 添加鱼到鱼缸
    // 注意：added_by 是 String 类型（VARCHAR(255)）
    const addMutation = `
      mutation AddFishToTank($tankId: uuid!, $fishId: uuid!, $addedBy: String!) {
        insert_our_tank_fish_one(object: {
          tank_id: $tankId,
          fish_id: $fishId,
          added_by: $addedBy
        }) {
          id
          added_at
        }
      }
    `;

    const addResult = await queryHasura(addMutation, {
      tankId,
      fishId,
      addedBy: userId
    });

    console.log(`[Our Tank] Fish ${fishId} added to tank ${tankId} by user ${userId}`);

    return res.status(200).json({
      success: true,
      fishInTank: {
        id: addResult.insert_our_tank_fish_one.id,
        fishId,
        tankId,
        addedAt: addResult.insert_our_tank_fish_one.added_at,
        fishName: fish.fish_name,
        imageUrl: fish.image_url
      },
      tankFishCount: currentCount + 1,
      maxFishCount: tank.max_fish_count
    });

  } catch (error) {
    console.error('[Our Tank Add Fish] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
