/**
 * 迁移用户数据 Handler
 * 将匿名用户的鱼数据迁移到新用户账号
 */

const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

module.exports = async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fromUserId, toUserId } = req.body;

  // 验证参数
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters: fromUserId and toUserId' 
    });
  }

  if (fromUserId === toUserId) {
    return res.status(200).json({ 
      success: true, 
      message: 'Same user ID, no migration needed',
      migratedCount: 0 
    });
  }

  console.log('[Migrate User] 开始迁移用户数据');
  console.log('[Migrate User] 从:', fromUserId);
  console.log('[Migrate User] 到:', toUserId);

  try {
    // 使用 GraphQL API 更新鱼的 user_id
    const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || process.env.HASURA_ENDPOINT;
    const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

    if (!HASURA_ENDPOINT || !HASURA_ADMIN_SECRET) {
      console.error('[Migrate User] Missing Hasura configuration');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    // 首先查询匿名用户有多少条鱼
    const countQuery = `
      query CountUserFish($userId: String!) {
        fish_aggregate(where: { user_id: { _eq: $userId } }) {
          aggregate {
            count
          }
        }
      }
    `;

    const countResponse = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query: countQuery,
        variables: { userId: fromUserId }
      })
    });

    const countResult = await countResponse.json();
    const fishCount = countResult.data?.fish_aggregate?.aggregate?.count || 0;

    console.log(`[Migrate User] 找到 ${fishCount} 条鱼需要迁移`);

    if (fishCount === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No fish to migrate',
        migratedCount: 0 
      });
    }

    // 执行迁移：更新鱼的 user_id
    const migrateQuery = `
      mutation MigrateUserFish($fromUserId: String!, $toUserId: String!) {
        update_fish(
          where: { user_id: { _eq: $fromUserId } },
          _set: { user_id: $toUserId }
        ) {
          affected_rows
        }
      }
    `;

    const migrateResponse = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query: migrateQuery,
        variables: { fromUserId, toUserId }
      })
    });

    const migrateResult = await migrateResponse.json();

    if (migrateResult.errors) {
      console.error('[Migrate User] GraphQL 错误:', migrateResult.errors);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to migrate fish data',
        details: migrateResult.errors[0]?.message 
      });
    }

    const migratedCount = migrateResult.data?.update_fish?.affected_rows || 0;
    console.log(`[Migrate User] ✅ 成功迁移 ${migratedCount} 条鱼`);

    // 同时迁移收藏数据
    const migrateFavoritesQuery = `
      mutation MigrateUserFavorites($fromUserId: String!, $toUserId: String!) {
        update_fish_favorites(
          where: { user_id: { _eq: $fromUserId } },
          _set: { user_id: $toUserId }
        ) {
          affected_rows
        }
      }
    `;

    try {
      const favResponse = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
          query: migrateFavoritesQuery,
          variables: { fromUserId, toUserId }
        })
      });

      const favResult = await favResponse.json();
      const migratedFavorites = favResult.data?.update_fish_favorites?.affected_rows || 0;
      console.log(`[Migrate User] ✅ 成功迁移 ${migratedFavorites} 条收藏`);
    } catch (favError) {
      console.warn('[Migrate User] 迁移收藏数据时出错（非致命）:', favError.message);
    }

    return res.status(200).json({ 
      success: true, 
      message: `Successfully migrated ${migratedCount} fish`,
      migratedCount 
    });

  } catch (error) {
    console.error('[Migrate User] 迁移失败:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Migration failed',
      details: error.message 
    });
  }
};
