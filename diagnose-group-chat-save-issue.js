/**
 * 诊断群聊保存问题
 * 模拟完整的群聊创建流程，捕获详细错误信息
 */

require('dotenv').config({ path: '.env.local' });
const { executeGraphQL } = require('./lib/hasura');
const { generateGroupChat, selectRandomFish } = require('./lib/api_handlers/fish/chat/group').generateGroupChat;

const TEST_USER_ID = '11312701-f1d2-43f8-a13d-260eac812b7a';

async function diagnoseGroupChatSave() {
    console.log('🔧 开始诊断群聊保存问题...\n');
    
    try {
        // 步骤1: 检查数据库连接
        console.log('1️⃣ 检查数据库连接...');
        const testQuery = `query { users(limit: 1) { id } }`;
        const testResult = await executeGraphQL(testQuery, {});
        if (testResult.errors) {
            console.error('❌ 数据库连接失败:', testResult.errors);
            return;
        }
        console.log('✅ 数据库连接正常\n');
        
        // 步骤2: 检查用户是否存在
        console.log('2️⃣ 检查用户...', TEST_USER_ID);
        const userQuery = `
            query CheckUser($userId: String!) {
                users_by_pk(id: $userId) {
                    id
                    nick_name
                    user_subscriptions(limit: 1) {
                        plan
                    }
                }
            }
        `;
        const userResult = await executeGraphQL(userQuery, { userId: TEST_USER_ID });
        if (!userResult.data?.users_by_pk) {
            console.error('❌ 用户不存在');
            return;
        }
        console.log('✅ 用户存在:', userResult.data.users_by_pk.nick_name);
        console.log('   订阅计划:', userResult.data.users_by_pk.user_subscriptions[0]?.plan || 'free');
        console.log('');
        
        // 步骤3: 检查鱼数据
        console.log('3️⃣ 检查可用鱼...');
        const fishQuery = `
            query GetFish {
                fish(
                    where: { 
                        is_approved: { _eq: true },
                        personality: { _is_null: false }
                    }
                    limit: 5
                ) {
                    id
                    fish_name
                    personality
                }
            }
        `;
        const fishResult = await executeGraphQL(fishQuery, {});
        if (!fishResult.data?.fish || fishResult.data.fish.length === 0) {
            console.error('❌ 没有可用的鱼');
            return;
        }
        console.log(`✅ 找到 ${fishResult.data.fish.length} 条可用鱼\n`);
        
        // 步骤4: 测试插入 group_chat 记录
        console.log('4️⃣ 测试插入 group_chat 记录...');
        const testFishIds = fishResult.data.fish.map(f => f.id);
        const testDialogues = {
            messages: [
                { fishId: testFishIds[0], fishName: fishResult.data.fish[0].fish_name, message: '测试消息1', sequence: 1 },
                { fishId: testFishIds[1], fishName: fishResult.data.fish[1].fish_name, message: '测试消息2', sequence: 2 }
            ]
        };
        
        const insertMutation = `
            mutation TestInsertGroupChat(
                $topic: String!
                $time_of_day: String
                $participant_fish_ids: [uuid!]!
                $dialogues: jsonb!
                $display_duration: Int!
                $expires_at: timestamp!
                $initiator_user_id: String
                $conversation_id: uuid
            ) {
                insert_group_chat_one(
                    object: {
                        topic: $topic
                        time_of_day: $time_of_day
                        participant_fish_ids: $participant_fish_ids
                        dialogues: $dialogues
                        display_duration: $display_duration
                        expires_at: $expires_at
                        initiator_user_id: $initiator_user_id
                        conversation_id: $conversation_id
                    }
                ) {
                    id
                    created_at
                    initiator_user_id
                    conversation_id
                }
            }
        `;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        const variables = {
            topic: '测试群聊 - ' + new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
            time_of_day: 'morning',
            participant_fish_ids: testFishIds,
            dialogues: testDialogues,
            display_duration: 12,
            expires_at: expiresAt.toISOString(),
            initiator_user_id: TEST_USER_ID,
            conversation_id: null  // 测试时设为null
        };
        
        console.log('   插入变量:', {
            topic: variables.topic,
            fishCount: testFishIds.length,
            initiator_user_id: variables.initiator_user_id,
            conversation_id: variables.conversation_id
        });
        
        const insertResult = await executeGraphQL(insertMutation, variables);
        
        if (insertResult.errors) {
            console.error('❌ 插入失败:', JSON.stringify(insertResult.errors, null, 2));
            console.error('\n完整错误信息:');
            console.error(JSON.stringify(insertResult, null, 2));
            return;
        }
        
        if (!insertResult.data?.insert_group_chat_one) {
            console.error('❌ insert_group_chat_one 返回 null');
            console.error('   返回数据:', insertResult.data);
            return;
        }
        
        const savedSession = insertResult.data.insert_group_chat_one;
        console.log('✅ 插入成功!');
        console.log('   Session ID:', savedSession.id);
        console.log('   创建时间:', savedSession.created_at);
        console.log('   发起人:', savedSession.initiator_user_id);
        console.log('   Conversation ID:', savedSession.conversation_id);
        console.log('');
        
        // 步骤5: 验证记录是否存在
        console.log('5️⃣ 验证记录...');
        const verifyQuery = `
            query VerifySession($sessionId: uuid!) {
                group_chat_by_pk(id: $sessionId) {
                    id
                    topic
                    created_at
                    initiator_user_id
                }
            }
        `;
        const verifyResult = await executeGraphQL(verifyQuery, { sessionId: savedSession.id });
        
        if (!verifyResult.data?.group_chat_by_pk) {
            console.error('❌ 无法读取刚插入的记录!');
            return;
        }
        
        console.log('✅ 记录存在:', verifyResult.data.group_chat_by_pk.topic);
        console.log('');
        
        // 步骤6: 检查 conversations 表
        console.log('6️⃣ 检查 conversations 表...');
        const conversationsQuery = `
            query GetConversations {
                conversations(limit: 5, order_by: { created_at: desc }) {
                    id
                    coze_conversation_id
                    user_id
                    topic
                    created_at
                }
            }
        `;
        const conversationsResult = await executeGraphQL(conversationsQuery, {});
        console.log('   conversations 表记录数:', conversationsResult.data?.conversations?.length || 0);
        if (conversationsResult.data?.conversations?.length > 0) {
            console.log('   最近的 conversation:');
            conversationsResult.data.conversations.forEach((conv, i) => {
                console.log(`   ${i + 1}. ID: ${conv.id}, Topic: ${conv.topic || 'N/A'}, Created: ${conv.created_at}`);
            });
        } else {
            console.log('   ⚠️ conversations 表为空');
        }
        
        console.log('\n✅ 诊断完成!');
        console.log('\n📝 总结:');
        console.log('   - group_chat 表可以正常插入记录');
        console.log('   - conversations 表需要单独插入');
        console.log('   - 目前 group_chat.conversation_id 字段为可选');
        
    } catch (error) {
        console.error('\n❌ 诊断过程中出错:', error.message);
        console.error('   错误堆栈:', error.stack);
    }
}

diagnoseGroupChatSave();

