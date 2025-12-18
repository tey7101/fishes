/**
 * Our Tank API - 好友鱼缸 API 入口
 * 
 * 支持的 actions:
 * - create: 创建鱼缸
 * - join: 加入鱼缸
 * - leave: 退出鱼缸
 * - list: 获取鱼缸列表
 * - detail: 获取鱼缸详情
 * - add-fish: 添加鱼到鱼缸
 * - remove-fish: 从鱼缸移除鱼
 * - update: 更新鱼缸设置
 * - delete: 删除鱼缸
 * - members: 获取成员列表
 * - remove-member: 移除成员
 * - chat-history: 获取聊天历史
 */

// 延迟加载处理器
let createHandler, joinHandler, leaveHandler, listHandler, detailHandler;
let addFishHandler, removeFishHandler, updateHandler, deleteHandler;
let membersHandler, removeMemberHandler, chatHistoryHandler;

function loadHandler(path) {
  try {
    return require(path);
  } catch (error) {
    console.error(`Failed to load handler: ${path}`, error.message);
    return null;
  }
}

function initHandlers() {
  if (!createHandler) {
    createHandler = loadHandler('../lib/api_handlers/our-tank/create.js');
    joinHandler = loadHandler('../lib/api_handlers/our-tank/join.js');
    leaveHandler = loadHandler('../lib/api_handlers/our-tank/leave.js');
    listHandler = loadHandler('../lib/api_handlers/our-tank/list.js');
    detailHandler = loadHandler('../lib/api_handlers/our-tank/detail.js');
    addFishHandler = loadHandler('../lib/api_handlers/our-tank/add-fish.js');
    removeFishHandler = loadHandler('../lib/api_handlers/our-tank/remove-fish.js');
    updateHandler = loadHandler('../lib/api_handlers/our-tank/update.js');
    deleteHandler = loadHandler('../lib/api_handlers/our-tank/delete.js');
    membersHandler = loadHandler('../lib/api_handlers/our-tank/members.js');
    removeMemberHandler = loadHandler('../lib/api_handlers/our-tank/remove-member.js');
    chatHistoryHandler = loadHandler('../lib/api_handlers/our-tank/chat-history.js');
  }
}

module.exports = async function handler(req, res) {
  // 初始化处理器
  initHandlers();

  // 获取 action 参数
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action');

  console.log(`[Our Tank API] Action: ${action}, Method: ${req.method}`);

  try {
    switch (action) {
      case 'create':
        if (!createHandler) return res.status(500).json({ error: 'Create handler not available' });
        return await createHandler(req, res);

      case 'join':
        if (!joinHandler) return res.status(500).json({ error: 'Join handler not available' });
        return await joinHandler(req, res);

      case 'leave':
        if (!leaveHandler) return res.status(500).json({ error: 'Leave handler not available' });
        return await leaveHandler(req, res);

      case 'list':
        if (!listHandler) return res.status(500).json({ error: 'List handler not available' });
        return await listHandler(req, res);

      case 'detail':
        if (!detailHandler) return res.status(500).json({ error: 'Detail handler not available' });
        return await detailHandler(req, res);

      case 'add-fish':
        if (!addFishHandler) return res.status(500).json({ error: 'Add fish handler not available' });
        return await addFishHandler(req, res);

      case 'remove-fish':
        if (!removeFishHandler) return res.status(500).json({ error: 'Remove fish handler not available' });
        return await removeFishHandler(req, res);

      case 'update':
        if (!updateHandler) return res.status(500).json({ error: 'Update handler not available' });
        return await updateHandler(req, res);

      case 'delete':
        if (!deleteHandler) return res.status(500).json({ error: 'Delete handler not available' });
        return await deleteHandler(req, res);

      case 'members':
        if (!membersHandler) return res.status(500).json({ error: 'Members handler not available' });
        return await membersHandler(req, res);

      case 'remove-member':
        if (!removeMemberHandler) return res.status(500).json({ error: 'Remove member handler not available' });
        return await removeMemberHandler(req, res);

      case 'chat-history':
        if (!chatHistoryHandler) return res.status(500).json({ error: 'Chat history handler not available' });
        return await chatHistoryHandler(req, res);

      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: `Unknown action: ${action}`,
          available: [
            'create', 'join', 'leave', 'list', 'detail',
            'add-fish', 'remove-fish', 'update', 'delete',
            'members', 'remove-member', 'chat-history'
          ]
        });
    }
  } catch (error) {
    console.error(`[Our Tank API] Error:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
