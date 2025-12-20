/**
 * 检查 group_chat 表中 coze_conversation_id 为 NULL 的记录
 */

require('dotenv').config({ path: '.env.local' });
const { query } = require('./lib/hasura');

async function checkConversationIds() {
  console.log('查询最新的 group_chat 记录...\n');
  
  // 查询最新 20 条记录
  const queryStr = `
    query GetRecentGroupChats {
      group_chat(
        order_by: {created_at: desc},
        limit: 20
      ) {
        id
        topic
        created_at
        coze_conversation_id
        conversation_id
        initiator_user_id
        user_talk
      }
    }
  `;
  
  const data = await query(queryStr);
  const chats = data.group_chat || [];
  
  console.log(`找到 ${chats.length} 条记录:\n`);
  
  let nullCozeCount = 0;
  let nullConvCount = 0;
  
  for (const chat of chats) {
    const hasCozeId = !!chat.coze_conversation_id;
    const hasConvId = !!chat.conversation_id;
    const hasUserTalk = !!chat.user_talk;
    
    if (!hasCozeId) nullCozeCount++;
    if (!hasConvId) nullConvCount++;
    
    console.log(`ID: ${chat.id.substring(0, 8)}...`);
    console.log(`  创建时间: ${chat.created_at}`);
    console.log(`  coze_conversation_id: ${chat.coze_conversation_id || 'NULL ❌'}`);
    console.log(`  conversation_id: ${chat.conversation_id || 'NULL ❌'}`);
    console.log(`  initiator_user_id: ${chat.initiator_user_id || 'NULL'}`);
    console.log(`  user_talk: ${hasUserTalk ? '有' : '无'}`);
    console.log('');
  }
  
  console.log('=== 统计 ===');
  console.log(`coze_conversation_id 为 NULL: ${nullCozeCount}/${chats.length}`);
  console.log(`conversation_id 为 NULL: ${nullConvCount}/${chats.length}`);
}

checkConversationIds().catch(console.error);
