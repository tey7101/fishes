/**
 * Helper function to save conversation record
 * 用于在创建群聊时同步创建 conversations 表记录
 */

const { executeGraphQL } = require('../../../hasura');

/**
 * Save conversation record to database
 * @param {Object} params - Conversation parameters
 * @param {string} params.cozeConversationId - Coze API返回的conversation ID
 * @param {string} params.userId - 发起用户ID
 * @param {Array<string>} params.participantFishIds - 参与鱼的ID数组
 * @param {string} params.topic - 对话主题
 * @returns {Promise<string|null>} - Conversation UUID or null if failed
 */
async function saveConversationRecord({
    cozeConversationId,
    userId,
    participantFishIds,
    topic = 'Fish Tank Chat'
}) {
    // 如果没有cozeConversationId，跳过（不报错）
    if (!cozeConversationId) {
        console.log('[Conversation Helper] ⚠️ No cozeConversationId provided, skipping conversation record creation');
        return null;
    }

    const mutation = `
        mutation CreateConversation(
            $coze_conversation_id: String!
            $user_id: String
            $participant_fish_ids: [uuid!]!
            $topic: String
        ) {
            insert_conversations_one(
                object: {
                    coze_conversation_id: $coze_conversation_id
                    user_id: $user_id
                    participant_fish_ids: $participant_fish_ids
                    topic: $topic
                    status: "active"
                    message_count: 0
                }
                on_conflict: {
                    constraint: conversations_coze_conversation_id_key
                    update_columns: [updated_at]
                }
            ) {
                id
                coze_conversation_id
                user_id
                topic
                created_at
            }
        }
    `;

    const variables = {
        coze_conversation_id: cozeConversationId,
        user_id: userId || null,
        participant_fish_ids: participantFishIds,
        topic: topic
    };

    try {
        console.log('[Conversation Helper] 💾 Saving conversation record:', {
            coze_conversation_id: cozeConversationId,
            user_id: userId,
            participant_count: participantFishIds.length,
            topic
        });

        const result = await executeGraphQL(mutation, variables);

        if (result.errors) {
            console.error('[Conversation Helper] ❌ GraphQL errors:', result.errors);
            // 不抛出错误，只记录日志
            return null;
        }

        if (!result.data?.insert_conversations_one) {
            console.error('[Conversation Helper] ❌ No data returned');
            return null;
        }

        const conversation = result.data.insert_conversations_one;
        console.log('[Conversation Helper] ✅ Conversation record saved:', {
            id: conversation.id,
            coze_conversation_id: conversation.coze_conversation_id
        });

        return conversation.id;

    } catch (error) {
        console.error('[Conversation Helper] ❌ Failed to save conversation record:', error.message);
        // 不抛出错误，只记录日志
        return null;
    }
}

module.exports = {
    saveConversationRecord
};

