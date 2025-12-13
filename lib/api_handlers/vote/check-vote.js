/**
 * 检查用户投票状态 API
 * GET /api/vote/check-vote?fishId=xxx&userId=xxx
 * 
 * 返回：
 * - hasVoted: boolean - 用户是否已经点赞
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

async function queryHasura(query, variables = {}) {
  const response = await fetch(HASURA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });
  
  const result = await response.json();
  
  if (result.errors) {
    console.error('Hasura错误:', result.errors);
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { fishId, userId } = req.query;
    
    // 验证参数
    if (!fishId || !userId) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段 fishId 或 userId'
      });
    }
    
    // 检查是否已经投过票
    const getVoteQuery = `
      query GetVote($fishId: uuid!, $userId: String!) {
        votes(where: { fish_id: { _eq: $fishId }, user_id: { _eq: $userId } }) {
          id
          vote_type
        }
      }
    `;
    
    const voteData = await queryHasura(getVoteQuery, { fishId, userId });
    const existingVote = voteData.votes[0];
    
    return res.json({
      success: true,
      hasVoted: !!existingVote,
      voteType: existingVote ? existingVote.vote_type : null
    });
    
  } catch (error) {
    console.error('检查投票状态失败:', error);
    return res.status(500).json({
      success: false,
      error: '服务器错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
