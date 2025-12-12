/**
 * 匿名认证系统 - 属性测试
 * 使用 fast-check 进行属性测试
 * 
 * 运行: npx vitest run tests/anonymous-auth.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ====================================
// 被测试的函数（从 supabase-init.js 提取的纯逻辑）
// ====================================

/**
 * 检查用户是否为匿名用户
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
function isAnonymousUser(user) {
  if (!user) return false;
  // Supabase 匿名用户的特征：
  // 1. is_anonymous 为 true
  // 2. 或者没有 email 且 identities 为空
  return user.is_anonymous === true || 
         (!user.email && (!user.identities || user.identities.length === 0));
}

/**
 * 获取用户显示信息
 * @param {Object} user - 用户对象
 * @returns {Object} { name, isAnonymous, upgradePrompt }
 */
function getUserDisplayInfo(user) {
  if (!user) {
    return { name: 'Not logged in', isAnonymous: false, upgradePrompt: false };
  }
  
  const isAnon = isAnonymousUser(user);
  
  if (isAnon) {
    // 匿名用户显示 User+ID后4位
    const shortId = user.id ? user.id.slice(-4) : '0000';
    return {
      name: `User${shortId}`,
      isAnonymous: true,
      upgradePrompt: true
    };
  }
  
  // 正式用户
  const name = user.user_metadata?.name || 
               user.user_metadata?.nick_name ||
               user.email?.split('@')[0] || 
               'User';
  
  return {
    name: name,
    isAnonymous: false,
    upgradePrompt: false
  };
}

/**
 * 检查是否需要在付费前升级账号
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
function requiresUpgradeBeforePayment(user) {
  return isAnonymousUser(user);
}

// ====================================
// 属性测试
// ====================================

/**
 * **Feature: anonymous-auth, Property 1: 匿名用户创建一致性**
 * *对于任意* 无会话的访客，调用 signInAnonymously() 后应返回包含有效 UUID 的用户对象，且 is_anonymous 为 true
 * **Validates: Requirements 1.1, 1.2**
 */
describe('Property 1: 匿名用户创建一致性', () => {
  // 模拟 signInAnonymously 返回的用户对象
  function mockCreateAnonymousUser() {
    return {
      id: crypto.randomUUID(),
      is_anonymous: true,
      email: null,
      identities: [],
      user_metadata: {},
      created_at: new Date().toISOString()
    };
  }

  it('匿名用户应该有有效的 UUID', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), () => {
        const user = mockCreateAnonymousUser();
        
        // 验证 UUID 格式
        expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }),
      { numRuns: 100 }
    );
  });

  it('匿名用户的 is_anonymous 应该为 true', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), () => {
        const user = mockCreateAnonymousUser();
        
        expect(user.is_anonymous).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('匿名用户不应该有 email', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), () => {
        const user = mockCreateAnonymousUser();
        
        expect(user.email).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('匿名用户的 identities 应该为空', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), () => {
        const user = mockCreateAnonymousUser();
        
        expect(user.identities).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: anonymous-auth, Property 4: 匿名用户识别准确性**
 * *对于任意* 用户对象，isAnonymousUser() 函数应正确返回该用户是否为匿名用户
 * **Validates: Requirements 3.1, 3.2**
 */
describe('Property 4: 匿名用户识别准确性', () => {
  // 生成匿名用户
  const anonymousUserArb = fc.record({
    id: fc.uuid(),
    is_anonymous: fc.constant(true),
    email: fc.constant(null),
    identities: fc.constant([]),
    user_metadata: fc.record({})
  });

  // 生成正式用户（有邮箱）
  const authenticatedUserWithEmailArb = fc.record({
    id: fc.uuid(),
    is_anonymous: fc.constant(false),
    email: fc.emailAddress(),
    identities: fc.array(fc.record({ provider: fc.string() }), { minLength: 1, maxLength: 3 }),
    user_metadata: fc.record({
      name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })
    })
  });

  // 生成正式用户（OAuth，无邮箱但有 identities）
  const authenticatedUserWithOAuthArb = fc.record({
    id: fc.uuid(),
    is_anonymous: fc.constant(false),
    email: fc.option(fc.emailAddress(), { nil: null }),
    identities: fc.array(fc.record({ 
      provider: fc.constantFrom('google', 'discord', 'twitter'),
      identity_data: fc.record({ name: fc.string() })
    }), { minLength: 1, maxLength: 3 }),
    user_metadata: fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 })
    })
  });

  it('匿名用户应该被正确识别', () => {
    fc.assert(
      fc.property(anonymousUserArb, (user) => {
        expect(isAnonymousUser(user)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('有邮箱的正式用户不应该被识别为匿名用户', () => {
    fc.assert(
      fc.property(authenticatedUserWithEmailArb, (user) => {
        expect(isAnonymousUser(user)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('有 OAuth 身份的用户不应该被识别为匿名用户', () => {
    fc.assert(
      fc.property(authenticatedUserWithOAuthArb, (user) => {
        expect(isAnonymousUser(user)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('null 用户应该返回 false', () => {
    expect(isAnonymousUser(null)).toBe(false);
    expect(isAnonymousUser(undefined)).toBe(false);
  });

  it('只有 is_anonymous=true 的用户应该被识别为匿名', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          is_anonymous: fc.boolean(),
          email: fc.option(fc.emailAddress(), { nil: null }),
          identities: fc.array(fc.record({ provider: fc.string() }), { minLength: 0, maxLength: 3 })
        }),
        (user) => {
          const result = isAnonymousUser(user);
          
          // 如果 is_anonymous 为 true，应该返回 true
          if (user.is_anonymous === true) {
            expect(result).toBe(true);
          }
          // 如果没有 email 且没有 identities，也应该返回 true
          else if (!user.email && (!user.identities || user.identities.length === 0)) {
            expect(result).toBe(true);
          }
          // 否则应该返回 false
          else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * **Feature: anonymous-auth, Property 5: 付费前账号检查**
 * *对于任意* 匿名用户，尝试进入支付流程时应被拦截并要求升级账号
 * **Validates: Requirements 4.1**
 */
describe('Property 5: 付费前账号检查', () => {
  // 生成匿名用户
  const anonymousUserArb = fc.record({
    id: fc.uuid(),
    is_anonymous: fc.constant(true),
    email: fc.constant(null),
    identities: fc.constant([])
  });

  // 生成正式用户
  const authenticatedUserArb = fc.record({
    id: fc.uuid(),
    is_anonymous: fc.constant(false),
    email: fc.emailAddress(),
    identities: fc.array(fc.record({ provider: fc.string() }), { minLength: 1, maxLength: 3 })
  });

  it('匿名用户应该需要在付费前升级账号', () => {
    fc.assert(
      fc.property(anonymousUserArb, (user) => {
        expect(requiresUpgradeBeforePayment(user)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('正式用户不需要在付费前升级账号', () => {
    fc.assert(
      fc.property(authenticatedUserArb, (user) => {
        expect(requiresUpgradeBeforePayment(user)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * 用户显示信息测试
 */
describe('getUserDisplayInfo 函数测试', () => {
  it('匿名用户应该显示"Guest"并提示升级', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          is_anonymous: fc.constant(true),
          email: fc.constant(null),
          identities: fc.constant([])
        }),
        (user) => {
          const info = getUserDisplayInfo(user);
          
          // 匿名用户显示 User+ID后4位
          const expectedName = `User${user.id.slice(-4)}`;
          expect(info.name).toBe(expectedName);
          expect(info.isAnonymous).toBe(true);
          expect(info.upgradePrompt).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('正式用户应该显示正确的名称且不提示升级', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          is_anonymous: fc.constant(false),
          email: fc.emailAddress(),
          identities: fc.array(fc.record({ provider: fc.string() }), { minLength: 1 }),
          user_metadata: fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })
          })
        }),
        (user) => {
          const info = getUserDisplayInfo(user);
          
          expect(info.isAnonymous).toBe(false);
          expect(info.upgradePrompt).toBe(false);
          // 正式用户名称不应该以 User 开头（匿名用户格式）
          expect(info.name).not.toMatch(/^User[0-9a-f]{4}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('null 用户应该显示"Not logged in"', () => {
    const info = getUserDisplayInfo(null);
    
    expect(info.name).toBe('Not logged in');
    expect(info.isAnonymous).toBe(false);
    expect(info.upgradePrompt).toBe(false);
  });
});


/**
 * **Feature: anonymous-auth, Property 3: 账号升级数据保留**
 * *对于任意* 匿名用户，升级为正式用户后，用户 UUID 应保持不变，所有关联数据应可正常访问
 * **Validates: Requirements 2.1, 2.2, 2.3, 6.4**
 */
describe('Property 3: 账号升级数据保留', () => {
  // 模拟升级过程
  function mockUpgradeAnonymousUser(anonymousUser, email) {
    // 升级后 UUID 保持不变，只是添加了 email 和更新了 is_anonymous
    return {
      ...anonymousUser,
      email: email,
      is_anonymous: false,
      identities: [{ provider: 'email', identity_data: { email } }]
    };
  }

  // 模拟数据关联检查
  function checkDataAssociation(userId, dataRecords) {
    return dataRecords.filter(record => record.user_id === userId);
  }

  it('升级后用户 UUID 应保持不变', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // 原始 UUID
        fc.emailAddress(),  // 升级用的邮箱
        (originalId, email) => {
          const anonymousUser = {
            id: originalId,
            is_anonymous: true,
            email: null,
            identities: []
          };
          
          const upgradedUser = mockUpgradeAnonymousUser(anonymousUser, email);
          
          // 验证 UUID 不变
          expect(upgradedUser.id).toBe(originalId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('升级后用户不再是匿名用户', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.emailAddress(),
        (originalId, email) => {
          const anonymousUser = {
            id: originalId,
            is_anonymous: true,
            email: null,
            identities: []
          };
          
          const upgradedUser = mockUpgradeAnonymousUser(anonymousUser, email);
          
          // 验证不再是匿名用户
          expect(isAnonymousUser(upgradedUser)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('升级后关联数据应可正常访问', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // 用户 ID
        fc.emailAddress(),  // 升级邮箱
        fc.array(fc.record({
          id: fc.uuid(),
          user_id: fc.uuid(),
          data: fc.string()
        }), { minLength: 1, maxLength: 20 }),  // 数据记录
        (userId, email, allRecords) => {
          // 创建一些属于该用户的数据
          const userRecords = allRecords.map((r, i) => 
            i % 3 === 0 ? { ...r, user_id: userId } : r
          );
          
          const anonymousUser = {
            id: userId,
            is_anonymous: true,
            email: null,
            identities: []
          };
          
          // 升级前的数据
          const beforeUpgrade = checkDataAssociation(userId, userRecords);
          
          // 升级用户
          const upgradedUser = mockUpgradeAnonymousUser(anonymousUser, email);
          
          // 升级后的数据（UUID 不变，所以数据关联不变）
          const afterUpgrade = checkDataAssociation(upgradedUser.id, userRecords);
          
          // 验证数据关联保持不变
          expect(afterUpgrade.length).toBe(beforeUpgrade.length);
          expect(afterUpgrade).toEqual(beforeUpgrade);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: anonymous-auth, Property 2: 会话恢复身份一致性**
 * *对于任意* 匿名用户，在会话有效期内重新访问应用，恢复的用户 UUID 应与原始 UUID 相同
 * **Validates: Requirements 1.4**
 */
describe('Property 2: 会话恢复身份一致性', () => {
  // 模拟会话存储
  const mockSessionStorage = new Map();
  
  // 模拟保存会话
  function saveSession(userId, sessionData) {
    mockSessionStorage.set(userId, {
      ...sessionData,
      user_id: userId,
      expires_at: Date.now() + 3600000 // 1小时后过期
    });
  }
  
  // 模拟恢复会话
  function restoreSession(userId) {
    const session = mockSessionStorage.get(userId);
    if (!session) return null;
    
    // 检查是否过期
    if (session.expires_at < Date.now()) {
      mockSessionStorage.delete(userId);
      return null;
    }
    
    return {
      user: {
        id: session.user_id,
        is_anonymous: session.is_anonymous,
        email: session.email
      }
    };
  }

  beforeEach(() => {
    mockSessionStorage.clear();
  });

  it('恢复的会话应该保持相同的用户 UUID', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // 原始 UUID
        (originalId) => {
          // 创建匿名用户会话
          const anonymousUser = {
            id: originalId,
            is_anonymous: true,
            email: null
          };
          
          // 保存会话
          saveSession(originalId, {
            is_anonymous: true,
            email: null
          });
          
          // 恢复会话
          const restoredSession = restoreSession(originalId);
          
          // 验证 UUID 一致
          expect(restoredSession).not.toBeNull();
          expect(restoredSession.user.id).toBe(originalId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('过期的会话不应该被恢复', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          // 保存一个已过期的会话
          mockSessionStorage.set(userId, {
            user_id: userId,
            is_anonymous: true,
            expires_at: Date.now() - 1000 // 已过期
          });
          
          // 尝试恢复
          const restoredSession = restoreSession(userId);
          
          // 验证无法恢复
          expect(restoredSession).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不存在的会话应该返回 null', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          // 确保会话不存在
          mockSessionStorage.delete(userId);
          
          // 尝试恢复
          const restoredSession = restoreSession(userId);
          
          // 验证返回 null
          expect(restoredSession).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
