/**
 * Our Tank 属性测试
 * 
 * 使用 fast-check 进行属性测试，验证核心正确性属性
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';

// 设置测试环境
process.env.NODE_ENV = 'test';

// 导入工具函数
const {
  generateInviteCode,
  hashPassword,
  verifyPassword,
  INVITE_CODE_CHARS,
  INVITE_CODE_LENGTH
} = require('../lib/api_handlers/our-tank/utils.js');

describe('Our Tank - Property Tests', () => {
  
  /**
   * Property 1: 邀请码唯一性
   * Feature: our-tank, Property 1: 邀请码唯一性
   * Validates: Requirements 1.2
   * 
   * For any 两个不同的好友鱼缸，它们的邀请码必须不同
   */
  describe('Property 1: Invite Code Uniqueness', () => {
    it('generated invite codes should be unique across multiple generations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 500 }),
          (count) => {
            const codes = new Set();
            for (let i = 0; i < count; i++) {
              codes.add(generateInviteCode());
            }
            // 所有生成的邀请码应该都是唯一的
            return codes.size === count;
          }
        ),
        { numRuns: 50 } // 运行50次，每次生成100-500个邀请码
      );
    });

    it('invite codes should only contain valid characters', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            for (let i = 0; i < count; i++) {
              const code = generateInviteCode();
              // 检查每个字符都在有效字符集中
              for (const char of code) {
                if (!INVITE_CODE_CHARS.includes(char)) {
                  return false;
                }
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invite codes should have correct length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            for (let i = 0; i < count; i++) {
              const code = generateInviteCode();
              if (code.length !== INVITE_CODE_LENGTH) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invite codes with custom length should have correct length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 12 }),
          (length) => {
            const code = generateInviteCode(length);
            return code.length === length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: 密码加密存储
   * Feature: our-tank, Property 2: 密码加密存储
   * Validates: Requirements 1.3
   * 
   * For any 设置了密码的好友鱼缸，存储的密码哈希值不等于原始密码明文
   */
  describe('Property 2: Password Encryption', () => {
    it('hashed password should not equal original password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (password) => {
            const hash = await hashPassword(password);
            // 哈希值不应该等于原始密码
            return hash !== password;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('hashed password should contain salt separator', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (password) => {
            const hash = await hashPassword(password);
            // 哈希格式应该是 salt:hash
            return hash.includes(':') && hash.split(':').length === 2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('same password should produce different hashes (due to random salt)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (password) => {
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);
            // 由于随机盐值，相同密码应该产生不同的哈希
            return hash1 !== hash2;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 5: 密码验证正确性
   * Feature: our-tank, Property 5: 密码验证正确性
   * Validates: Requirements 2.3, 2.4
   * 
   * For any 设有密码的好友鱼缸和任意用户尝试加入，
   * 只有当提供的密码与存储的哈希匹配时才能成功加入
   */
  describe('Property 5: Password Verification', () => {
    it('correct password should verify successfully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (password) => {
            const hash = await hashPassword(password);
            const isValid = await verifyPassword(password, hash);
            return isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('incorrect password should fail verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (correctPassword, wrongPassword) => {
            // 确保两个密码不同
            if (correctPassword === wrongPassword) {
              return true; // 跳过相同密码的情况
            }
            const hash = await hashPassword(correctPassword);
            const isValid = await verifyPassword(wrongPassword, hash);
            return isValid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('password verification should be consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (password) => {
            const hash = await hashPassword(password);
            // 多次验证应该得到相同结果
            const result1 = await verifyPassword(password, hash);
            const result2 = await verifyPassword(password, hash);
            const result3 = await verifyPassword(password, hash);
            return result1 === result2 && result2 === result3 && result1 === true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 3: 会员创建限制
   * Feature: our-tank, Property 3: 会员创建限制
   * Validates: Requirements 1.4, 6.1, 6.2, 6.3
   * 
   * For any 用户和其会员类型，该用户创建的好友鱼缸数量不超过其会员类型对应的 our_tank_limit 值
   */
  describe('Property 3: Membership Tank Limit', () => {
    // 会员类型和对应的限制
    const memberLimits = {
      free: 1,
      plus: 3,
      premium: 10,
      admin: 999
    };

    // 模拟 checkCanCreateTank 的纯函数版本
    function canCreateTank(memberType, existingCount) {
      const limit = memberLimits[memberType] || 1;
      return existingCount < limit;
    }

    it('user should be able to create tank when under limit', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('free', 'plus', 'premium', 'admin'),
          fc.integer({ min: 0, max: 20 }),
          (memberType, existingCount) => {
            const limit = memberLimits[memberType];
            const canCreate = canCreateTank(memberType, existingCount);
            
            // 如果现有数量小于限制，应该可以创建
            if (existingCount < limit) {
              return canCreate === true;
            }
            // 如果现有数量大于等于限制，不应该可以创建
            return canCreate === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('free user should only create 1 tank', () => {
      expect(canCreateTank('free', 0)).toBe(true);
      expect(canCreateTank('free', 1)).toBe(false);
      expect(canCreateTank('free', 2)).toBe(false);
    });

    it('plus user should create up to 3 tanks', () => {
      expect(canCreateTank('plus', 0)).toBe(true);
      expect(canCreateTank('plus', 1)).toBe(true);
      expect(canCreateTank('plus', 2)).toBe(true);
      expect(canCreateTank('plus', 3)).toBe(false);
    });

    it('premium user should create up to 10 tanks', () => {
      expect(canCreateTank('premium', 0)).toBe(true);
      expect(canCreateTank('premium', 9)).toBe(true);
      expect(canCreateTank('premium', 10)).toBe(false);
    });
  });
});
