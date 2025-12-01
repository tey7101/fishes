/**
 * 测试conversations表记录创建
 */

require('dotenv').config({ path: '.env.local' });
const { executeGraphQL } = require('./lib/hasura');
const { saveConversationRecord } = require('./lib/api_handlers/fish/chat/save-conversation-helper');

const TEST_USER_ID = '11312701-f1d2-43f8-a13d-260eac812b7a';

async function testConversationCreation() {
    console.log('🧪 测试 conversations 表记录创建...\n');
    
    try {
        // 步骤1: 获取测试用的鱼ID
        console.log('1️⃣ 获取测试鱼...');
        const fishQuery = `
            query GetTestFish {
                fish(
                    where: { 
                        is_approved: { _eq: true },
                        personality: { _is_null: false }
                    }
                    limit: 3
                ) {
                    id
                    fish_name
                }
            }
        `;
        const fishResult = await executeGraphQL(fishQuery, {});
        const fishIds = fishResult.data.fish.map(f => f.id);
        console.log(`✅ 找到 ${fishIds.length} 条鱼\n`);
        
        // 步骤2: 模拟Coze API返回的conversation_id
        const testCozeConversationId = 'test_conv_' + Date.now();
        console.log('2️⃣ 测试 conversation_id:', testCozeConversationId);
        
        // 步骤3: 保存conversation记录
        console.log('\n3️⃣ 保存 conversation 记录...');
        const conversationId = await saveConversationRecord({
            cozeConversationId: testCozeConversationId,
            userId: TEST_USER_ID,
            participantFishIds: fishIds,
            topic: '测试 Conversation - ' + new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})
        });
        
        if (!conversationId) {
            console.error('❌ 保存失败');
            return;
        }
        
        console.log('✅ Conversation记录已保存, ID:', conversationId);
        
        // 步骤4: 验证记录
        console.log('\n4️⃣ 验证记录...');
        const verifyQuery = `
            query VerifyConversation($id: uuid!) {
                conversations_by_pk(id: $id) {
                    id
                    coze_conversation_id
                    user_id
                    topic
                    status
                    participant_fish_ids
                    created_at
                }
            }
        `;
        const verifyResult = await executeGraphQL(verifyQuery, { id: conversationId });
        
        if (verifyResult.data?.conversations_by_pk) {
            const record = verifyResult.data.conversations_by_pk;
            console.log('✅ 记录验证成功:');
            console.log('   ID:', record.id);
            console.log('   Coze ID:', record.coze_conversation_id);
            console.log('   Topic:', record.topic);
            console.log('   Status:', record.status);
            console.log('   User ID:', record.user_id);
            console.log('   Participant Fish Count:', record.participant_fish_ids.length);
            console.log('   Created:', record.created_at);
        } else {
            console.error('❌ 无法读取记录');
        }
        
        // 步骤5: 检查今天所有记录
        console.log('\n5️⃣ 检查今天的所有 conversations 记录...');
        const today = new Date();
        today.setHours(-8, 0, 0, 0); // 北京时间今天00:00
        
        const listQuery = `
            query ListTodayConversations($todayStart: timestamptz!) {
                conversations(
                    where: { created_at: { _gte: $todayStart } }
                    order_by: { created_at: desc }
                ) {
                    id
                    coze_conversation_id
                    topic
                    created_at
                    user_id
                }
            }
        `;
        const listResult = await executeGraphQL(listQuery, { todayStart: today.toISOString() });
        const todayRecords = listResult.data?.conversations || [];
        
        console.log(`   今天共有 ${todayRecords.length} 条 conversations 记录`);
        todayRecords.forEach((record, i) => {
            const beijingTime = new Date(record.created_at).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
            console.log(`   ${i + 1}. ${record.topic} (${beijingTime})`);
        });
        
        console.log('\n✅ 测试完成!');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
    }
}

testConversationCreation();

