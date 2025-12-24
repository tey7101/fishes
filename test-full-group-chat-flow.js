/**
 * 测试完整的群聊创建流程
 * 验证 group_chat 和 conversations 两个表都有记录
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { executeGraphQL } = require('./lib/hasura');

const API_BASE = `http://localhost:${process.env.PORT || 3000}`;
const TEST_USER_ID = '11312701-f1d2-43f8-a13d-260eac812b7a';

async function testFullGroupChatFlow() {
    console.log('🧪 测试完整的群聊创建流程...\n');
    
    try {
        // 记录创建前的记录数
        const todayStart = new Date();
        todayStart.setHours(-8, 0, 0, 0); // 北京时间今天00:00
        const todayISO = todayStart.toISOString();
        
        console.log('1️⃣ 检查创建前的记录数...');
        
        // 分开查询两个表（类型不同）
        const gcQuery = `
            query CheckGroupChat($todayStart: timestamp!) {
                group_chat_aggregate(
                    where: { created_at: { _gte: $todayStart } }
                ) {
                    aggregate { count }
                }
            }
        `;
        const convQuery = `
            query CheckConversations($todayStart: timestamptz!) {
                conversations_aggregate(
                    where: { created_at: { _gte: $todayStart } }
                ) {
                    aggregate { count }
                }
            }
        `;
        
        const gcResult = await executeGraphQL(gcQuery, { todayStart: todayISO });
        const convResult = await executeGraphQL(convQuery, { todayStart: todayISO });
        
        if (gcResult.errors || convResult.errors) {
            console.error('❌ GraphQL 查询错误:', gcResult.errors || convResult.errors);
            return;
        }
        
        const beforeGroupChatCount = gcResult.data?.group_chat_aggregate?.aggregate?.count || 0;
        const beforeConversationsCount = convResult.data?.conversations_aggregate?.aggregate?.count || 0;
        
        console.log('   group_chat 记录数:', beforeGroupChatCount);
        console.log('   conversations 记录数:', beforeConversationsCount);
        console.log('');
        
        // 创建群聊
        console.log('2️⃣ 创建群聊...');
        const response = await fetch(`${API_BASE}/api/fish-api?action=group-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: TEST_USER_ID,
                tankFishIds: [] // 从所有鱼中随机选择
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ 群聊创建失败:', data.error || data.message);
            return;
        }
        
        console.log('✅ 群聊创建成功!');
        console.log('   Session ID:', data.sessionId);
        console.log('   Conversation ID:', data.conversation_id);
        console.log('   参与鱼数:', data.participants?.length || 0);
        console.log('');
        
        // 等待一下让conversations记录也保存完成
        console.log('3️⃣ 等待2秒后验证...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查创建后的记录数
        console.log('\n4️⃣ 检查创建后的记录数...');
        const afterGcResult = await executeGraphQL(gcQuery, { todayStart: todayISO });
        const afterConvResult = await executeGraphQL(convQuery, { todayStart: todayISO });
        const afterGroupChatCount = afterGcResult.data?.group_chat_aggregate?.aggregate?.count || 0;
        const afterConversationsCount = afterConvResult.data?.conversations_aggregate?.aggregate?.count || 0;
        
        console.log('   group_chat 记录数:', afterGroupChatCount, `(+${afterGroupChatCount - beforeGroupChatCount})`);
        console.log('   conversations 记录数:', afterConversationsCount, `(+${afterConversationsCount - beforeConversationsCount})`);
        console.log('');
        
        // 验证具体记录
        console.log('5️⃣ 验证 group_chat 记录...');
        const gcDetailQuery = `
            query GetGroupChat($sessionId: uuid!) {
                group_chat_by_pk(id: $sessionId) {
                    id
                    topic
                    created_at
                    initiator_user_id
                    coze_conversation_id
                }
            }
        `;
        const gcDetailResult = await executeGraphQL(gcDetailQuery, { sessionId: data.sessionId });
        const gcRecord = gcDetailResult.data?.group_chat_by_pk;
        
        if (gcRecord) {
            console.log('✅ group_chat 记录存在:');
            console.log('   ID:', gcRecord.id);
            console.log('   Topic:', gcRecord.topic);
            console.log('   Coze Conversation ID:', gcRecord.coze_conversation_id || 'NULL');
            console.log('   Initiator:', gcRecord.initiator_user_id);
        } else {
            console.error('❌ group_chat 记录不存在!');
        }
        console.log('');
        
        // 验证conversations记录
        if (gcRecord?.coze_conversation_id) {
            console.log('6️⃣ 验证 conversations 记录...');
            const convDetailQuery = `
                query GetConversation($cozeId: String!) {
                    conversations(
                        where: { coze_conversation_id: { _eq: $cozeId } }
                        limit: 1
                    ) {
                        id
                        coze_conversation_id
                        topic
                        status
                        user_id
                        created_at
                    }
                }
            `;
            const convDetailResult = await executeGraphQL(convDetailQuery, { cozeId: gcRecord.coze_conversation_id });
            const convRecord = convDetailResult.data?.conversations?.[0];
            
            if (convRecord) {
                console.log('✅ conversations 记录存在:');
                console.log('   ID:', convRecord.id);
                console.log('   Coze ID:', convRecord.coze_conversation_id);
                console.log('   Topic:', convRecord.topic);
                console.log('   Status:', convRecord.status);
                console.log('   User ID:', convRecord.user_id);
            } else {
                console.log('⚠️ conversations 记录不存在（可能还在异步保存中）');
            }
        } else {
            console.log('6️⃣ ⚠️ 没有 coze_conversation_id，跳过 conversations 验证');
        }
        
        console.log('\n✅ 测试完成!');
        
        // 总结
        console.log('\n📊 总结:');
        console.log(`   group_chat: ${beforeGroupChatCount} → ${afterGroupChatCount} ${afterGroupChatCount > beforeGroupChatCount ? '✅' : '❌'}`);
        console.log(`   conversations: ${beforeConversationsCount} → ${afterConversationsCount} ${afterConversationsCount > beforeConversationsCount ? '✅' : '⚠️'}`);
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
    }
}

testFullGroupChatFlow();

