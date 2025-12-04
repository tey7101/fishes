/**
 * Tank Chat Panel Manager
 * 根据Fish Talk开关状态控制聊天面板的显示和隐藏
 */

// 根据fish_talk字段直接控制聊天面板的显示
window.updateChatPanelVisibility = async function() {
  console.log('🔍 updateChatPanelVisibility 被调用');
  const chatPanel = document.getElementById('chat-panel');
  const chatReopenBtn = document.getElementById('chat-reopen-btn');
  
  if (!chatPanel) {
    console.error('❌ 找不到聊天面板元素 chat-panel');
    return;
  }
  console.log('✅ 找到聊天面板元素');
  
  let fishTalkEnabled = false;
  
  try {
    // 检查用户是否已登录
    if (window.supabaseAuth && typeof window.supabaseAuth.getCurrentUser === 'function') {
      const user = await window.supabaseAuth.getCurrentUser();
      if (user) {
        // 从数据库获取fish_talk状态
        const backendUrl = window.BACKEND_URL || '';
        const token = localStorage.getItem('userToken');
        if (token) {
          const profileResponse = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(user.id)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            fishTalkEnabled = profileData.user?.fish_talk || false;
            console.log('🔄 从数据库加载Fish Talk状态用于聊天面板显示:', fishTalkEnabled);
          }
        }
      }
    }
  } catch (error) {
    console.error('获取Fish Talk状态时出错:', error);
    // 回退到localStorage
    const savedPreference = localStorage.getItem('groupChatEnabled');
    fishTalkEnabled = savedPreference === 'true';
    console.log('🔄 回退到localStorage，Fish Talk状态:', fishTalkEnabled);
  }
  
  // 根据fish_talk状态显示或隐藏聊天面板
  if (fishTalkEnabled) {
    // Fish Talk启用时，根据localStorage中保存的状态决定是否展开
    const chatPanelOpen = localStorage.getItem('chatPanelOpen');
    const shouldOpen = chatPanelOpen !== 'false'; // 默认展开，除非用户明确关闭过
    
    if (shouldOpen) {
      // 显示聊天面板
      chatPanel.style.display = 'flex';
      chatPanel.style.visibility = 'visible';
      // 使用setTimeout确保display先生效
      setTimeout(() => {
        chatPanel.style.right = '0';
      }, 10);
      // 隐藏重新打开按钮
      if (chatReopenBtn) {
        chatReopenBtn.style.display = 'none';
      }
      // 同步更新全局状态变量
      if (window.isChatPanelOpen !== undefined) {
        window.isChatPanelOpen = true;
      }
      console.log('✅ 聊天面板已显示（Fish Talk已启用，用户之前打开）');
      
      // 滚动到底部
      setTimeout(() => {
        if (typeof scrollChatToBottom === 'function') {
          scrollChatToBottom();
        }
      }, 100);
    } else {
      // 用户之前关闭了聊天面板，保持关闭状态但显示重新打开按钮
      chatPanel.style.right = '-420px';
      chatPanel.style.display = 'none';
      chatPanel.style.visibility = 'hidden';
      if (chatReopenBtn) {
        chatReopenBtn.style.display = 'flex';
      }
      // 同步更新全局状态变量
      if (window.isChatPanelOpen !== undefined) {
        window.isChatPanelOpen = false;
      }
      console.log('✅ 聊天面板已隐藏（Fish Talk已启用，但用户之前关闭）');
    }
  } else {
    // Fish Talk禁用时，隐藏聊天面板和重新打开按钮
    chatPanel.style.right = '-420px';
    if (chatReopenBtn) {
      chatReopenBtn.style.display = 'none';
    }
    // 延迟隐藏，等待动画完成
    setTimeout(() => {
      chatPanel.style.display = 'none';
      chatPanel.style.visibility = 'hidden';
    }, 400);
    // 同步更新全局状态变量
    if (window.isChatPanelOpen !== undefined) {
      window.isChatPanelOpen = false;
    }
    console.log('✅ 聊天面板已隐藏（Fish Talk未启用）');
  }
};

// 提供手动触发函数用于调试
window.debugChatPanel = function() {
  console.log('🔧 手动触发聊天面板显示检查');
  const chatPanel = document.getElementById('chat-panel');
  if (chatPanel) {
    console.log('当前聊天面板样式:', {
      display: chatPanel.style.display,
      visibility: chatPanel.style.visibility,
      right: chatPanel.style.right,
      computedDisplay: window.getComputedStyle(chatPanel).display
    });
  }
  window.updateChatPanelVisibility();
};

// 监听Fish Talk状态变化事件
window.addEventListener('groupChatEnabledChanged', function(event) {
  console.log('🔄 检测到Fish Talk状态变化，更新聊天面板显示:', event.detail?.enabled);
  setTimeout(() => {
    window.updateChatPanelVisibility();
  }, 100);
});

// DOMContentLoaded后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      console.log('🔄 DOMContentLoaded完成，开始检查聊天面板显示状态');
      window.updateChatPanelVisibility();
    }, 1000);
  });
} else {
  // DOM已经加载完成
  setTimeout(() => {
    console.log('🔄 DOM已就绪，开始检查聊天面板显示状态');
    window.updateChatPanelVisibility();
  }, 500);
}

// window.onload后再次检查
window.addEventListener('load', function() {
  setTimeout(() => {
    console.log('🔄 window.load完成，再次检查聊天面板显示状态');
    window.updateChatPanelVisibility();
  }, 1500);
});






