/**
 * 检查今天的群聊记录
 */

require('dotenv').config({ path: '.env.local' });
const { executeGraphQL } = require('./lib/hasura');

async function checkTodayGroupChats() {
    console.log('🔍 检查今天的群聊记录...\n');
    
    // 获取今天的开始时间（00:00:00）- UTC时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUTC = today.toISOString();
    
    // 也计算北京时间今天的开始时间（UTC-8）
    const todayBeijing = new Date();
    todayBeijing.setHours(-8, 0, 0, 0); // 北京时间00:00 = UTC 16:00前一天
    const todayBeijingUTC = todayBeijing.toISOString();
    
    console.log('📅 今天日期范围:');
    console.log('   UTC时间 >= ', todayUTC);
    console.log('   北京时间 >= ', todayBeijingUTC);
    console.log('');
    
    // 查询今天的所有记录（使用UTC时间）
    const query = `
        query GetTodayGroupChats($todayStart: timestamp!) {
            group_chat(
                where: {
                    created_at: { _gte: $todayStart }
                }
                order_by: { created_at: desc }
            ) {
                id
                topic
                created_at
                initiator_user_id
                conversation_id
                user {
                    nick_name
                }
            }
        }
    `;
    
    // 分别查询UTC和北京时间的记录
    console.log('1️⃣ 查询今天（UTC时间）的记录...');
    const utcResult = await executeGraphQL(query, { todayStart: todayUTC });
    const utcRecords = utcResult.data?.group_chat || [];
    console.log(`   找到 ${utcRecords.length} 条记录\n`);
    
    console.log('2️⃣ 查询今天（北京时间）的记录...');
    const beijingResult = await executeGraphQL(query, { todayStart: todayBeijingUTC });
    const beijingRecords = beijingResult.data?.group_chat || [];
    console.log(`   找到 ${beijingRecords.length} 条记录\n`);
    
    if (beijingRecords.length > 0) {
        console.log('📝 今天（北京时间）的群聊记录:\n');
        beijingRecords.forEach((record, index) => {
            const date = new Date(record.created_at);
            const beijingTime = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            console.log(`${index + 1}. ID: ${record.id}`);
            console.log(`   主题: ${record.topic || 'N/A'}`);
            console.log(`   创建时间 (UTC): ${record.created_at}`);
            console.log(`   创建时间 (北京): ${beijingTime}`);
            console.log(`   发起人: ${record.user?.nick_name || record.initiator_user_id || 'N/A'}`);
            console.log(`   Conversation ID: ${record.conversation_id || 'NULL'}`);
            console.log('');
        });
    } else {
        console.log('❌ 今天（北京时间）没有群聊记录');
    }
    
    // 检查 conversations 表今天的记录
    console.log('\n3️⃣ 检查 conversations 表今天的记录...');
    const convQuery = `
        query GetTodayConversations($todayStart: timestamptz!) {
            conversations(
                where: {
                    created_at: { _gte: $todayStart }
                }
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
    const convResult = await executeGraphQL(convQuery, { todayStart: todayBeijingUTC });
    const convRecords = convResult.data?.conversations || [];
    console.log(`   找到 ${convRecords.length} 条记录\n`);
    
    if (convRecords.length > 0) {
        console.log('📝 今天（北京时间）的 conversation 记录:\n');
        convRecords.forEach((record, index) => {
            const date = new Date(record.created_at);
            const beijingTime = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            console.log(`${index + 1}. ID: ${record.id}`);
            console.log(`   Coze ID: ${record.coze_conversation_id || 'N/A'}`);
            console.log(`   主题: ${record.topic || 'N/A'}`);
            console.log(`   创建时间 (北京): ${beijingTime}`);
            console.log(`   User ID: ${record.user_id || 'N/A'}`);
            console.log('');
        });
    }
}

checkTodayGroupChats().catch(console.error);

