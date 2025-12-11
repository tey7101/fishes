/**
 * 联盟推广者追踪系统 - 属性测试
 * 使用 fast-check 进行属性测试
 * 
 * 运行: npx vitest run tests/affiliate.test.js
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// 导入被测试的函数
const { generateReferralCode } = require('../api/affiliate-api.js');

/**
 * **Feature: affiliate-tracking, Property 1: 推广码唯一性**
 * *对于任意*新创建的推广者，其推广码在整个系统中应该是唯一的，不与任何现有推广码重复
 * **Validates: Requirements 1.1**
 */
describe('Property 1: 推广码唯一性', () => {
  it('生成的推广码应该是8位大写字母数字组合', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), () => {
        const code = generateReferralCode();
        
        // 验证长度为8
        expect(code.length).toBe(8);
        
        // 验证只包含大写字母和数字
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      }),
      { numRuns: 100 }
    );
  });

  it('多次生成的推广码应该具有高唯一性', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (count) => {
        const codes = new Set();
        
        for (let i = 0; i < count; i++) {
          codes.add(generateReferralCode());
        }
        
        // 由于是随机生成，允许极小概率的重复（36^8 = 2.8万亿种可能）
        // 在100次生成中，重复概率极低
        // 我们期望至少95%的唯一性
        expect(codes.size).toBeGreaterThanOrEqual(Math.floor(count * 0.95));
      }),
      { numRuns: 50 }
    );
  });

  it('推广码字符集应该只包含有效字符', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), () => {
        const code = generateReferralCode();
        const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        for (const char of code) {
          expect(validChars.includes(char)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: affiliate-tracking, Property 2: 推荐关系正确性**
 * *对于任意*带有有效推广码注册的用户，其 referred_by 字段应正确指向该推广码对应的推广者用户ID
 * **Validates: Requirements 2.2**
 * 
 * 注意：此属性测试需要数据库连接，在集成测试中验证
 */
describe('Property 2: 推荐关系正确性', () => {
  // 模拟推广码到用户ID的映射
  const mockAffiliateMap = new Map();
  
  // 模拟验证推广码函数
  function mockValidateReferralCode(code) {
    if (mockAffiliateMap.has(code)) {
      return { valid: true, affiliate_id: mockAffiliateMap.get(code) };
    }
    return { valid: false };
  }
  
  // 模拟关联推荐人函数
  function mockLinkReferral(userId, referralCode, userReferredBy) {
    const validation = mockValidateReferralCode(referralCode);
    if (!validation.valid) {
      return { success: false, error: '无效的推广码' };
    }
    if (userReferredBy) {
      return { success: false, error: '用户已有推荐人' };
    }
    return { success: true, affiliate_id: validation.affiliate_id };
  }

  it('有效推广码应该正确关联到推广者', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 8 }),  // 推广码
        fc.uuid(),  // 推广者ID
        fc.uuid(),  // 新用户ID
        (code, affiliateId, userId) => {
          // 设置推广者
          mockAffiliateMap.set(code, affiliateId);
          
          // 关联推荐人
          const result = mockLinkReferral(userId, code, null);
          
          // 验证关联成功且指向正确的推广者
          expect(result.success).toBe(true);
          expect(result.affiliate_id).toBe(affiliateId);
          
          // 清理
          mockAffiliateMap.delete(code);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('无效推广码不应该关联成功', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 8 }),  // 无效推广码
        fc.uuid(),  // 新用户ID
        (code, userId) => {
          // 确保推广码不存在
          mockAffiliateMap.delete(code);
          
          // 尝试关联
          const result = mockLinkReferral(userId, code, null);
          
          // 验证关联失败
          expect(result.success).toBe(false);
          expect(result.error).toBe('无效的推广码');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('已有推荐人的用户不应该被重复关联', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 8 }),  // 推广码
        fc.uuid(),  // 推广者ID
        fc.uuid(),  // 用户ID
        fc.uuid(),  // 已有的推荐人ID
        (code, affiliateId, userId, existingReferrer) => {
          // 设置推广者
          mockAffiliateMap.set(code, affiliateId);
          
          // 尝试关联（用户已有推荐人）
          const result = mockLinkReferral(userId, code, existingReferrer);
          
          // 验证关联失败
          expect(result.success).toBe(false);
          expect(result.error).toBe('用户已有推荐人');
          
          // 清理
          mockAffiliateMap.delete(code);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: affiliate-tracking, Property 3: 付费归属正确性**
 * *对于任意*被推荐用户完成的付费，payment 表中的 affiliate_id 应等于该用户的 referred_by 值
 * **Validates: Requirements 2.3**
 */
describe('Property 3: 付费归属正确性', () => {
  // 模拟用户数据
  const mockUsers = new Map();
  
  // 模拟获取用户推荐人
  function getUserReferredBy(userId) {
    return mockUsers.get(userId)?.referred_by || null;
  }
  
  // 模拟创建付费记录
  function createPayment(userId, amount) {
    const referredBy = getUserReferredBy(userId);
    return {
      user_id: userId,
      amount: amount,
      affiliate_id: referredBy  // 付费归属到推荐人
    };
  }

  it('被推荐用户的付费应该归属到推荐人', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // 用户ID
        fc.uuid(),  // 推荐人ID
        fc.float({ min: 1, max: 1000 }),  // 付费金额
        (userId, referrerId, amount) => {
          // 设置用户的推荐人
          mockUsers.set(userId, { referred_by: referrerId });
          
          // 创建付费记录
          const payment = createPayment(userId, amount);
          
          // 验证付费归属正确
          expect(payment.affiliate_id).toBe(referrerId);
          
          // 清理
          mockUsers.delete(userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('无推荐人的用户付费不应该有归属', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // 用户ID
        fc.float({ min: 1, max: 1000 }),  // 付费金额
        (userId, amount) => {
          // 确保用户没有推荐人
          mockUsers.delete(userId);
          
          // 创建付费记录
          const payment = createPayment(userId, amount);
          
          // 验证没有归属
          expect(payment.affiliate_id).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: affiliate-tracking, Property 4: 统计数据准确性**
 * *对于任意*推广者，其统计数据（总推荐数、总收入、总佣金）应等于 users 表中 referred_by 指向该推广者的用户数量，
 * 以及这些用户的 payment 记录聚合值
 * **Validates: Requirements 3.2, 4.1**
 */
describe('Property 4: 统计数据准确性', () => {
  // 模拟数据存储
  const mockUsers = [];
  const mockPayments = [];
  
  // 计算推广者统计数据
  function calculateAffiliateStats(affiliateId, commissionRate) {
    // 计算总推荐数
    const referrals = mockUsers.filter(u => u.referred_by === affiliateId);
    const totalReferrals = referrals.length;
    
    // 计算总收入（推荐用户的付费总额）
    const referralIds = referrals.map(u => u.id);
    const affiliatePayments = mockPayments.filter(p => 
      p.affiliate_id === affiliateId || referralIds.includes(p.user_id)
    );
    const totalRevenue = affiliatePayments.reduce((sum, p) => sum + p.amount, 0);
    
    // 计算总佣金
    const totalCommission = totalRevenue * (commissionRate / 100);
    
    return {
      total_referrals: totalReferrals,
      total_revenue: totalRevenue,
      total_commission: totalCommission
    };
  }

  beforeEach(() => {
    mockUsers.length = 0;
    mockPayments.length = 0;
  });

  it('统计数据应该准确反映推荐用户和付费记录', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // 推广者ID
        fc.integer({ min: 1, max: 50 }),  // 佣金比例（使用整数避免 NaN）
        fc.array(fc.record({
          id: fc.uuid(),
          referred_by: fc.option(fc.uuid(), { nil: null })
        }), { minLength: 0, maxLength: 20 }),  // 用户列表
        fc.array(fc.record({
          user_id: fc.uuid(),
          amount: fc.integer({ min: 1, max: 1000 }),  // 使用整数避免 NaN
          affiliate_id: fc.option(fc.uuid(), { nil: null })
        }), { minLength: 0, maxLength: 30 }),  // 付费记录
        (affiliateId, commissionRate, users, payments) => {
          // 设置测试数据
          mockUsers.push(...users);
          mockPayments.push(...payments);
          
          // 计算统计数据
          const stats = calculateAffiliateStats(affiliateId, commissionRate);
          
          // 手动验证计算
          const expectedReferrals = users.filter(u => u.referred_by === affiliateId).length;
          const referralIds = users.filter(u => u.referred_by === affiliateId).map(u => u.id);
          const expectedRevenue = payments
            .filter(p => p.affiliate_id === affiliateId || referralIds.includes(p.user_id))
            .reduce((sum, p) => sum + p.amount, 0);
          const expectedCommission = expectedRevenue * (commissionRate / 100);
          
          // 验证统计数据准确性
          expect(stats.total_referrals).toBe(expectedReferrals);
          expect(stats.total_revenue).toBeCloseTo(expectedRevenue, 2);
          expect(stats.total_commission).toBeCloseTo(expectedCommission, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: affiliate-tracking, Property 5: 日期筛选正确性**
 * *对于任意*日期范围筛选，返回的记录应仅包含 created_at 在指定范围内的数据
 * **Validates: Requirements 4.2**
 */
describe('Property 5: 日期筛选正确性', () => {
  // 模拟数据
  const mockRecords = [];
  
  // 日期筛选函数
  function filterByDateRange(records, startDate, endDate) {
    return records.filter(r => {
      const recordDate = new Date(r.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return recordDate >= start && recordDate <= end;
    });
  }

  beforeEach(() => {
    mockRecords.length = 0;
  });

  it('筛选结果应该只包含指定日期范围内的记录', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
        }), { minLength: 1, maxLength: 50 }),  // 记录列表
        fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),  // 开始日期
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),  // 结束日期
        (records, startDate, endDate) => {
          // 确保开始日期小于结束日期
          const [start, end] = startDate < endDate 
            ? [startDate, endDate] 
            : [endDate, startDate];
          
          // 执行筛选
          const filtered = filterByDateRange(records, start, end);
          
          // 验证所有筛选结果都在日期范围内
          for (const record of filtered) {
            const recordDate = new Date(record.created_at);
            expect(recordDate >= start).toBe(true);
            expect(recordDate <= end).toBe(true);
          }
          
          // 验证没有遗漏符合条件的记录
          const expectedCount = records.filter(r => {
            const d = new Date(r.created_at);
            return d >= start && d <= end;
          }).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('空日期范围应该返回空结果', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          created_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
        }), { minLength: 1, maxLength: 20 }),
        (records) => {
          // 使用一个不包含任何记录的日期范围
          const startDate = new Date('2020-01-01');
          const endDate = new Date('2020-01-02');
          
          const filtered = filterByDateRange(records, startDate, endDate);
          
          // 验证结果为空（因为所有记录都在2024年）
          expect(filtered.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
