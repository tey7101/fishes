/**
 * 检查投票状态 API 路由
 * GET /api/vote/check-vote?fishId=xxx&userId=xxx
 */

const checkVoteHandler = require('../../lib/api_handlers/vote/check-vote.js');

module.exports = checkVoteHandler;
