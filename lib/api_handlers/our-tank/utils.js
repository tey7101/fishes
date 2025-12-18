/**
 * Our Tank 工具函数
 * 
 * 包含邀请码生成、密码哈希等通用功能
 */

const crypto = require('crypto');

// 邀请码字符集（排除容易混淆的字符：0, O, I, l）
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 6;

/**
 * 生成随机邀请码
 * @param {number} length - 邀请码长度，默认6位
 * @returns {string} - 生成的邀请码
 */
function generateInviteCode(length = INVITE_CODE_LENGTH) {
  let code = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_CHARS[randomBytes[i] % INVITE_CODE_CHARS.length];
  }
  return code;
}

// PBKDF2 迭代次数（生产环境使用更高的值）
const PBKDF2_ITERATIONS = process.env.NODE_ENV === 'test' ? 1000 : 100000;

/**
 * 使用 bcrypt 风格的密码哈希（使用 crypto 实现）
 * @param {string} password - 原始密码
 * @returns {Promise<string>} - 哈希后的密码
 */
async function hashPassword(password) {
  // 生成随机盐值
  const salt = crypto.randomBytes(16).toString('hex');
  
  // 使用 PBKDF2 进行哈希
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      // 格式：salt:hash
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * 验证密码
 * @param {string} password - 用户输入的密码
 * @param {string} storedHash - 存储的哈希值
 * @returns {Promise<boolean>} - 是否匹配
 */
async function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

/**
 * 获取用户的会员类型和 Our Tank 限制
 * @param {string} userId - 用户 ID
 * @param {Function} queryHasura - Hasura 查询函数
 * @returns {Promise<{memberType: string, ourTankLimit: number}>}
 */
async function getUserMembershipLimit(userId, queryHasura) {
  // 注意：user_id 是 String 类型（VARCHAR(255)）
  const query = `
    query GetUserMembership($userId: String!) {
      user_subscriptions(
        where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
        limit: 1
      ) {
        plan
        member_type {
          id
          our_tank_limit
        }
      }
    }
  `;

  const result = await queryHasura(query, { userId });
  
  if (result.user_subscriptions && result.user_subscriptions.length > 0) {
    const subscription = result.user_subscriptions[0];
    return {
      memberType: subscription.plan,
      ourTankLimit: subscription.member_type?.our_tank_limit || 1
    };
  }

  // 默认免费用户
  return {
    memberType: 'free',
    ourTankLimit: 1
  };
}

/**
 * 获取用户已创建的 Our Tank 数量
 * @param {string} userId - 用户 ID
 * @param {Function} queryHasura - Hasura 查询函数
 * @returns {Promise<number>}
 */
async function getUserCreatedTankCount(userId, queryHasura) {
  // 注意：owner_id 是 String 类型（VARCHAR(255)）
  const query = `
    query GetUserTankCount($userId: String!) {
      our_tanks_aggregate(where: { owner_id: { _eq: $userId } }) {
        aggregate {
          count
        }
      }
    }
  `;

  const result = await queryHasura(query, { userId });
  return result.our_tanks_aggregate?.aggregate?.count || 0;
}

/**
 * 检查用户是否可以创建新的 Our Tank
 * @param {string} userId - 用户 ID
 * @param {Function} queryHasura - Hasura 查询函数
 * @returns {Promise<{canCreate: boolean, currentCount: number, limit: number, memberType: string}>}
 */
async function checkCanCreateTank(userId, queryHasura) {
  const [membership, currentCount] = await Promise.all([
    getUserMembershipLimit(userId, queryHasura),
    getUserCreatedTankCount(userId, queryHasura)
  ]);

  return {
    canCreate: currentCount < membership.ourTankLimit,
    currentCount,
    limit: membership.ourTankLimit,
    memberType: membership.memberType
  };
}

/**
 * 检查用户是否是鱼缸成员
 * @param {string} tankId - 鱼缸 ID
 * @param {string} userId - 用户 ID
 * @param {Function} queryHasura - Hasura 查询函数
 * @returns {Promise<{isMember: boolean, role: string|null}>}
 */
async function checkMembership(tankId, userId, queryHasura) {
  // 注意：user_id 是 String 类型（VARCHAR(255)）
  const query = `
    query CheckMembership($tankId: uuid!, $userId: String!) {
      our_tank_members(
        where: { tank_id: { _eq: $tankId }, user_id: { _eq: $userId } }
        limit: 1
      ) {
        role
      }
    }
  `;

  const result = await queryHasura(query, { tankId, userId });
  
  if (result.our_tank_members && result.our_tank_members.length > 0) {
    return {
      isMember: true,
      role: result.our_tank_members[0].role
    };
  }

  return {
    isMember: false,
    role: null
  };
}

/**
 * 获取鱼缸信息
 * @param {string} tankId - 鱼缸 ID
 * @param {Function} queryHasura - Hasura 查询函数
 * @returns {Promise<Object|null>}
 */
async function getTankById(tankId, queryHasura) {
  const query = `
    query GetTank($tankId: uuid!) {
      our_tanks_by_pk(id: $tankId) {
        id
        code
        name
        description
        password_hash
        owner_id
        max_fish_count
        created_at
        updated_at
      }
    }
  `;

  const result = await queryHasura(query, { tankId });
  return result.our_tanks_by_pk || null;
}

/**
 * 通过邀请码获取鱼缸信息
 * @param {string} code - 邀请码
 * @param {Function} queryHasura - Hasura 查询函数
 * @returns {Promise<Object|null>}
 */
async function getTankByCode(code, queryHasura) {
  const query = `
    query GetTankByCode($code: String!) {
      our_tanks(where: { code: { _eq: $code } }, limit: 1) {
        id
        code
        name
        description
        password_hash
        owner_id
        max_fish_count
        created_at
        updated_at
      }
    }
  `;

  const result = await queryHasura(query, { code: code.toUpperCase() });
  return result.our_tanks?.[0] || null;
}

module.exports = {
  generateInviteCode,
  hashPassword,
  verifyPassword,
  getUserMembershipLimit,
  getUserCreatedTankCount,
  checkCanCreateTank,
  checkMembership,
  getTankById,
  getTankByCode,
  INVITE_CODE_CHARS,
  INVITE_CODE_LENGTH
};
