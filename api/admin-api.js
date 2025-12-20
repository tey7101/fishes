/**
 * Admin API Router - 合并所有管理员相关端点
 * 
 * 支持的 actions:
 * - tables: 表管理
 * - table-detail: 表详情（动态路由）
 * - analytics: 网站表现统计数据
 * - chat-list: 群聊列表
 * - chat-detail: 群聊详情
 * - conversation-list: 会话列表（按 conversation 分组）
 */

const tablesHandler = require('../lib/api_handlers/admin/tables.js');
const analyticsHandler = require('../lib/api_handlers/admin/analytics.js');
const chatListHandler = require('../lib/api_handlers/admin/chat-list.js');
const chatDetailHandler = require('../lib/api_handlers/admin/chat-detail.js');
const conversationListHandler = require('../lib/api_handlers/admin/conversation-list.js');

module.exports = async function handler(req, res) {
  const { action, tableName } = req.query;
  
  try {
    if (action === 'tables') {
      return await tablesHandler(req, res);
    } else if (action === 'table-detail' && tableName) {
      // 动态加载表详情处理器
      const tableDetailHandler = require(`../lib/api_handlers/admin/tables/${tableName}.js`);
      return await tableDetailHandler(req, res);
    } else if (action === 'analytics') {
      return await analyticsHandler(req, res);
    } else if (action === 'chat-list') {
      return await chatListHandler(req, res);
    } else if (action === 'chat-detail') {
      return await chatDetailHandler(req, res);
    } else if (action === 'conversation-list') {
      return await conversationListHandler(req, res);
    } else {
      return res.status(400).json({ 
        error: 'Invalid action',
        available: ['tables', 'table-detail (requires tableName parameter)', 'analytics', 'chat-list', 'chat-detail', 'conversation-list']
      });
    }
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

