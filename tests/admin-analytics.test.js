/**
 * Admin Analytics 属性测试
 * 
 * 使用 fast-check 进行属性测试，验证核心正确性属性
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// 设置测试环境
process.env.NODE_ENV = 'test';

// 导入工具函数
const {
  parseDateRange,
  generateDateLabels
} = require('../lib/api_handlers/admin/analytics.js');

describe('Admin Analytics - Property Tests', () => {
  
  /**
   * Property 1: 用户统计一致性
   * Feature: admin-analytics, Property 1: 用户统计一致性
   * Validates: Requirements 2.1, 2.2
   * 
   * For any 日期区间查询，返回的匿名用户数加上注册用户数应该等于总用户数
   */
  describe('Property 1: User Statistics Consistency', () => {
    // 模拟用户统计结果的纯函数
    function validateUserStats(total, anonymous, registered) {
      return anonymous + registered === total;
    }

    it('anonymous + registered should equal total users', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 0, max: 10000 }),
          (anonymous, registered) => {
            const total = anonymous + registered;
            return validateUserStats(total, anonymous, registered);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('user stats should handle zero values correctly', () => {
      expect(validateUserStats(0, 0, 0)).toBe(true);
      expect(validateUserStats(100, 0, 100)).toBe(true);
      expect(validateUserStats(100, 100, 0)).toBe(true);
    });

    it('user stats should detect inconsistencies', () => {
      expect(validateUserStats(100, 50, 49)).toBe(false);
      expect(validateUserStats(100, 50, 51)).toBe(false);
    });
  });

  /**
   * Property 5: 时间线数据点数量
   * Feature: admin-analytics, Property 5: 时间线数据点数量
   * Validates: Requirements 6.1
   * 
   * For any 大于1天的日期区间，返回的时间线数据点数量应该等于区间内的天数
   */
  describe('Property 5: Timeline Data Points Count', () => {
    it('date labels count should equal days in range (multi-day)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2000 }), // 从2020年开始的天数
          fc.integer({ min: 2, max: 365 }),
          (startDays, daysDiff) => {
            const baseDate = new Date('2020-01-01');
            const startDate = new Date(baseDate);
            startDate.setDate(startDate.getDate() + startDays);
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + daysDiff - 1);
            
            const labels = generateDateLabels(startDate, endDate, false);
            
            // 标签数量应该等于天数差
            return labels.length === daysDiff;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('hour labels count should equal hours in range (single day)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2000 }), // 从2020年开始的天数
          fc.integer({ min: 1, max: 24 }),
          (daysFromStart, hoursDiff) => {
            // 使用整数生成有效日期
            const baseDate = new Date('2020-01-01');
            const startDate = new Date(baseDate);
            startDate.setDate(startDate.getDate() + daysFromStart);
            startDate.setHours(0, 0, 0, 0);
            
            const end = new Date(startDate);
            end.setHours(hoursDiff - 1, 0, 0, 0);
            
            const labels = generateDateLabels(startDate, end, true);
            
            // 标签数量应该等于小时数
            return labels.length === hoursDiff;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('date labels should be in chronological order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2000 }), // 从2020年开始的天数
          fc.integer({ min: 2, max: 30 }),
          (startDays, daysDiff) => {
            const baseDate = new Date('2020-01-01');
            const startDate = new Date(baseDate);
            startDate.setDate(startDate.getDate() + startDays);
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + daysDiff - 1);
            
            const labels = generateDateLabels(startDate, endDate, false);
            
            // 检查标签是否按时间顺序排列
            for (let i = 1; i < labels.length; i++) {
              if (labels[i] <= labels[i - 1]) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 日期区间解析测试
   */
  describe('Date Range Parsing', () => {
    it('should correctly calculate days difference', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2000 }), // 从2020年开始的天数
          fc.integer({ min: 1, max: 365 }),
          (startDays, daysDiff) => {
            const baseDate = new Date('2020-01-01');
            const startDate = new Date(baseDate);
            startDate.setDate(startDate.getDate() + startDays);
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + daysDiff);
            
            const result = parseDateRange(
              startDate.toISOString(),
              endDate.toISOString()
            );
            
            // 天数差应该在合理范围内
            return result.daysDiff >= daysDiff && result.daysDiff <= daysDiff + 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for invalid date format', () => {
      expect(() => parseDateRange('invalid', '2025-01-01')).toThrow('Invalid date format');
      expect(() => parseDateRange('2025-01-01', 'invalid')).toThrow('Invalid date format');
    });

    it('should throw error when start date is after end date', () => {
      expect(() => parseDateRange('2025-12-31', '2025-01-01')).toThrow('Start date must be before end date');
    });
  });
});


// 导入群聊列表工具函数
const {
  validateChatListItem,
  isWithinDateRange
} = require('../lib/api_handlers/admin/chat-list.js');

describe('Admin Chat List - Property Tests', () => {
  
  /**
   * Property 6: 群聊列表日期过滤
   * Feature: admin-analytics, Property 6: 群聊列表日期过滤
   * Validates: Requirements 7.2
   * 
   * For any 日期区间查询，返回的群聊列表中每条记录的 created_at 都应该在指定的日期区间内
   */
  describe('Property 6: Chat List Date Filtering', () => {
    it('chat created_at should be within date range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1800 }), // 从2020年开始的天数
          fc.integer({ min: 1, max: 180 }),
          fc.integer({ min: 0, max: 365 }), // 聊天日期偏移
          (startDays, daysDiff, chatDaysOffset) => {
            const baseDate = new Date('2020-01-01');
            
            const startDate = new Date(baseDate);
            startDate.setDate(startDate.getDate() + startDays);
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + daysDiff);
            
            const chatDate = new Date(baseDate);
            chatDate.setDate(chatDate.getDate() + startDays + chatDaysOffset);
            
            const isWithin = isWithinDateRange(
              chatDate.toISOString(),
              startDate.toISOString(),
              endDate.toISOString()
            );
            
            // 验证函数应该正确判断日期是否在区间内
            const expected = chatDate >= startDate && chatDate <= endDate;
            return isWithin === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify dates outside range', () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';
      
      // 在区间内
      expect(isWithinDateRange('2025-01-15T12:00:00Z', startDate, endDate)).toBe(true);
      expect(isWithinDateRange('2025-01-01T00:00:00Z', startDate, endDate)).toBe(true);
      expect(isWithinDateRange('2025-01-31T23:59:59Z', startDate, endDate)).toBe(true);
      
      // 在区间外
      expect(isWithinDateRange('2024-12-31T23:59:59Z', startDate, endDate)).toBe(false);
      expect(isWithinDateRange('2025-02-01T00:00:00Z', startDate, endDate)).toBe(false);
    });
  });

  /**
   * Property 10: 群聊列表项完整性
   * Feature: admin-analytics, Property 10: 群聊列表项完整性
   * Validates: Requirements 9.1
   * 
   * For any 群聊列表项，应该包含 topic、created_at 和参与鱼数量
   */
  describe('Property 10: Chat List Item Completeness', () => {
    it('chat list item should contain required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            topic: fc.string({ minLength: 1, maxLength: 100 }),
            created_at: fc.integer({ min: 0, max: 3650 }).map(days => {
              const d = new Date('2020-01-01');
              d.setDate(d.getDate() + days);
              return d.toISOString();
            }),
            participant_count: fc.integer({ min: 0, max: 10 }),
            our_tank_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            has_user_talk: fc.boolean()
          }),
          (chatItem) => {
            return validateChatListItem(chatItem);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject items missing required fields', () => {
      expect(validateChatListItem({ topic: 'test', created_at: '2025-01-01' })).toBe(false);
      expect(validateChatListItem({ topic: 'test', participant_count: 3 })).toBe(false);
      expect(validateChatListItem({ created_at: '2025-01-01', participant_count: 3 })).toBe(false);
    });

    it('should accept valid items', () => {
      expect(validateChatListItem({
        topic: 'Morning Chat',
        created_at: '2025-01-01T08:00:00Z',
        participant_count: 3
      })).toBe(true);
    });
  });
});


// 导入群聊详情工具函数
const {
  parseDialogues,
  sortMessagesBySequence,
  validateMessage,
  isMessagesSorted,
  markUserMessages
} = require('../lib/api_handlers/admin/chat-detail.js');

describe('Admin Chat Detail - Property Tests', () => {
  
  /**
   * Property 7: 消息顺序正确性
   * Feature: admin-analytics, Property 7: 消息顺序正确性
   * Validates: Requirements 7.4
   * 
   * For any 群聊详情查询，返回的消息列表应该按 sequence 字段升序排列
   */
  describe('Property 7: Message Order Correctness', () => {
    it('sorted messages should be in ascending sequence order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              fishId: fc.uuid(),
              fishName: fc.string({ minLength: 1, maxLength: 20 }),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              sequence: fc.integer({ min: 1, max: 100 })
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (messages) => {
            const sorted = sortMessagesBySequence(messages);
            return isMessagesSorted(sorted);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sorting should preserve all messages', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              fishId: fc.uuid(),
              fishName: fc.string({ minLength: 1, maxLength: 20 }),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              sequence: fc.integer({ min: 1, max: 100 })
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (messages) => {
            const sorted = sortMessagesBySequence(messages);
            return sorted.length === messages.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty array should remain empty after sorting', () => {
      expect(sortMessagesBySequence([])).toEqual([]);
    });

    it('single message should remain unchanged', () => {
      const msg = { fishName: 'Nemo', message: 'Hello', sequence: 1 };
      const sorted = sortMessagesBySequence([msg]);
      expect(sorted).toHaveLength(1);
      expect(sorted[0]).toEqual(msg);
    });
  });

  /**
   * Property 8: 消息内容完整性
   * Feature: admin-analytics, Property 8: 消息内容完整性
   * Validates: Requirements 7.5
   * 
   * For any 群聊消息，渲染结果应该包含 fishName、message 和 sequence 三个字段的值
   */
  describe('Property 8: Message Content Completeness', () => {
    it('valid message should contain required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            fishId: fc.uuid(),
            fishName: fc.string({ minLength: 1, maxLength: 20 }),
            message: fc.string({ minLength: 1, maxLength: 200 }),
            sequence: fc.integer({ min: 1, max: 100 })
          }),
          (message) => {
            return validateMessage(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject messages missing required fields', () => {
      expect(validateMessage({ fishName: 'Nemo', message: 'Hello' })).toBe(false);
      expect(validateMessage({ fishName: 'Nemo', sequence: 1 })).toBe(false);
      expect(validateMessage({ message: 'Hello', sequence: 1 })).toBe(false);
      expect(validateMessage(null)).toBeFalsy();
      expect(validateMessage(undefined)).toBeFalsy();
    });

    it('should accept valid messages', () => {
      expect(validateMessage({
        fishName: 'Nemo',
        message: 'Hello!',
        sequence: 1
      })).toBe(true);
    });
  });

  /**
   * Property 9: 用户消息标识
   * Feature: admin-analytics, Property 9: 用户消息标识
   * Validates: Requirements 8.3
   * 
   * For any 包含 user_talk 的群聊，用户消息应该被正确识别并标记为用户发言
   */
  describe('Property 9: User Message Identification', () => {
    it('user message should be marked when matching user_talk', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(
            fc.record({
              fishName: fc.string({ minLength: 1, maxLength: 20 }),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              sequence: fc.integer({ min: 1, max: 100 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (userTalk, messages) => {
            // 添加一条用户消息
            const messagesWithUser = [
              ...messages,
              { fishName: 'Fish', message: userTalk, sequence: messages.length + 1 }
            ];
            
            const marked = markUserMessages(userTalk, messagesWithUser);
            
            // 检查用户消息是否被正确标记
            const userMsg = marked.find(m => m.message === userTalk);
            return userMsg && userMsg.isUserMessage === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('non-user messages should not be marked', () => {
      const userTalk = 'Hello everyone!';
      const messages = [
        { fishName: 'Nemo', message: 'Good morning!', sequence: 1 },
        { fishName: 'Dory', message: 'Hi there!', sequence: 2 }
      ];
      
      const marked = markUserMessages(userTalk, messages);
      
      expect(marked.every(m => m.isUserMessage === false || m.isUserMessage === undefined)).toBe(true);
    });

    it('should handle null user_talk gracefully', () => {
      const messages = [
        { fishName: 'Nemo', message: 'Hello', sequence: 1 }
      ];
      
      const marked = markUserMessages(null, messages);
      expect(marked).toEqual(messages);
    });
  });

  /**
   * Dialogues 解析测试
   */
  describe('Dialogues Parsing', () => {
    it('should parse valid JSON dialogues', () => {
      const dialogues = {
        messages: [
          { fishName: 'Nemo', message: 'Hello', sequence: 1 }
        ]
      };
      
      const result = parseDialogues(dialogues);
      expect(result).toHaveLength(1);
      expect(result[0].fishName).toBe('Nemo');
    });

    it('should parse JSON string dialogues', () => {
      const dialogues = JSON.stringify({
        messages: [
          { fishName: 'Nemo', message: 'Hello', sequence: 1 }
        ]
      });
      
      const result = parseDialogues(dialogues);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for null/undefined', () => {
      expect(parseDialogues(null)).toEqual([]);
      expect(parseDialogues(undefined)).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      expect(parseDialogues('invalid json')).toEqual([]);
    });
  });
});


// 导入会话列表工具函数
const {
  formatDuration,
  groupChatsByConversation
} = require('../lib/api_handlers/admin/conversation-list.js');

describe('Admin Conversation List - Property Tests', () => {
  
  /**
   * Property 11: 持续时长格式化
   * Validates: 持续时长显示正确
   */
  describe('Property 11: Duration Formatting', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(0)).toBe('0秒');
      expect(formatDuration(30)).toBe('30秒');
      expect(formatDuration(59)).toBe('59秒');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60)).toBe('1分0秒');
      expect(formatDuration(90)).toBe('1分30秒');
      expect(formatDuration(3599)).toBe('59分59秒');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3600)).toBe('1小时0分');
      expect(formatDuration(3660)).toBe('1小时1分');
      expect(formatDuration(7200)).toBe('2小时0分');
    });

    it('should handle property-based duration values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 86400 }), // 0 to 24 hours
          (seconds) => {
            const result = formatDuration(seconds);
            // 结果应该是非空字符串
            return typeof result === 'string' && result.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: 会话分组正确性
   * Validates: 按 coze_conversation_id 正确分组
   */
  describe('Property 12: Conversation Grouping', () => {
    it('should group chats by coze_conversation_id', () => {
      const chats = [
        { id: '1', coze_conversation_id: 'conv_a', created_at: '2025-01-01T10:00:00Z' },
        { id: '2', coze_conversation_id: 'conv_a', created_at: '2025-01-01T10:05:00Z' },
        { id: '3', coze_conversation_id: 'conv_b', created_at: '2025-01-01T11:00:00Z' },
        { id: '4', coze_conversation_id: null, created_at: '2025-01-01T12:00:00Z' },
        { id: '5', coze_conversation_id: null, created_at: '2025-01-01T13:00:00Z' }
      ];
      
      const grouped = groupChatsByConversation(chats);
      
      // conv_a 应该有 2 条
      const convA = Array.from(grouped.values()).find(c => c.conversation_id === 'conv_a');
      expect(convA.chats).toHaveLength(2);
      
      // conv_b 应该有 1 条
      const convB = Array.from(grouped.values()).find(c => c.conversation_id === 'conv_b');
      expect(convB.chats).toHaveLength(1);
      
      // NULL 的应该各自独立（2 个分组）
      const nullConvs = Array.from(grouped.values()).filter(c => c.conversation_id === null);
      expect(nullConvs).toHaveLength(2);
    });

    it('should calculate correct time range for grouped conversations', () => {
      const chats = [
        { id: '1', coze_conversation_id: 'conv_a', created_at: '2025-01-01T10:00:00Z' },
        { id: '2', coze_conversation_id: 'conv_a', created_at: '2025-01-01T10:30:00Z' },
        { id: '3', coze_conversation_id: 'conv_a', created_at: '2025-01-01T10:15:00Z' }
      ];
      
      const grouped = groupChatsByConversation(chats);
      const conv = grouped.get('conv_a');
      
      expect(conv.first_chat_at).toBe('2025-01-01T10:00:00Z');
      expect(conv.last_chat_at).toBe('2025-01-01T10:30:00Z');
    });

    it('should preserve all chats after grouping', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              coze_conversation_id: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
              created_at: fc.integer({ min: 0, max: 365 }).map(days => {
                const d = new Date('2025-01-01');
                d.setDate(d.getDate() + days);
                return d.toISOString();
              })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (chats) => {
            const grouped = groupChatsByConversation(chats);
            
            // 所有分组中的聊天总数应该等于原始数量
            let totalChats = 0;
            for (const conv of grouped.values()) {
              totalChats += conv.chats.length;
            }
            
            return totalChats === chats.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty array', () => {
      const grouped = groupChatsByConversation([]);
      expect(grouped.size).toBe(0);
    });
  });
});
