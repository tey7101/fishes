/**
 * 测试群聊创建流程
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const API_BASE = `http://localhost:${process.env.PORT || 3000}`;
const TEST_USER_ID = '11312701-f1d2-43f8-a13d-260eac812b7a';

async function testGroupChatCreation() {
    console.log('🧪 测试群聊创建流程...\n');
    
    try {
        // 模拟创建群聊请求（使用正确的API路径和action参数）
        const response = await fetch(`${API_BASE}/api/fish?action=group-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer test-token-${TEST_USER_ID}`
            },
            body: JSON.stringify({
                tankFishIds: [] // 空数组表示从所有鱼中选择
            })
        });
        
        const data = await response.json();
        
        console.log('📡 API响应:', {
            status: response.status,
            success: data.success,
            sessionId: data.sessionId,
            conversationId: data.conversation_id
        });
        
        if (data.success && data.sessionId) {
            console.log('✅ 群聊创建成功!');
            console.log('   Session ID:', data.sessionId);
            console.log('   参与鱼数:', data.participants?.length || 0);
            
            // 验证数据库记录
            console.log('\n🔍 验证数据库记录...');
            const { executeGraphQL } = require('./lib/hasura');
            
            // 检查group_chat表
            const checkGroupChat = `
                query CheckGroupChat($sessionId: uuid!) {
                    group_chat_by_pk(id: $sessionId) {
                        id
                        topic
                        created_at
                        initiator_user_id
                        conversation_id
                    }
                }
            `;
            
            const gcResult = await executeGraphQL(checkGroupChat, { sessionId: data.sessionId });
            console.log('\n📝 group_chat记录:', gcResult.data?.group_chat_by_pk);
            
            // 检查conversations表
            if (data.conversation_id) {
                const checkConversation = `
                    query CheckConversation($convId: uuid!) {
                        conversations_by_pk(id: $convId) {
                            id
                            coze_conversation_id
                            user_id
                            participant_fish_ids
                            topic
                            status
                        }
                    }
                `;
                
                const convResult = await executeGraphQL(checkConversation, { convId: data.conversation_id });
                console.log('\n📝 conversations记录:', convResult.data?.conversations_by_pk || '❌ 无记录');
            } else {
                console.log('\n⚠️ 没有conversation_id');
            }
            
        } else {
            console.log('❌ 群聊创建失败:', data.error || data.message);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error(error.stack);
    }
}

testGroupChatCreation();

