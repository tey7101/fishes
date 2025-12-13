/**
 * Misc API Router - 合并杂项端点
 * 
 * 支持的 actions:
 * - profile: 用户资料
 * - report: 举报
 * - vote: 投票
 * - check-vote: 检查用户投票状态
 */

const profileHandler = require('../lib/api_handlers/profile/[userId].js');
const reportHandler = require('../lib/api_handlers/report/submit.js');
const voteHandler = require('../lib/api_handlers/vote/vote.js');
const checkVoteHandler = require('../lib/api_handlers/vote/check-vote.js');

module.exports = async function handler(req, res) {
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'profile':
        return await profileHandler(req, res);
      case 'report':
        return await reportHandler(req, res);
      case 'vote':
        return await voteHandler(req, res);
      case 'check-vote':
        return await checkVoteHandler(req, res);
      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          available: ['profile', 'report', 'vote', 'check-vote']
        });
    }
  } catch (error) {
    console.error('[Misc API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

