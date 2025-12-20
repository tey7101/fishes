/**
 * 管理后台 - 群聊信息页面逻辑
 * 
 * 功能：
 * - 按 conversation 分组显示
 * - 显示群聊条数和持续时长
 * - 展开查看对话详情
 * - 聊天气泡样式消息渲染
 */

(function() {
  'use strict';

  // DOM 元素
  let startDateInput, endDateInput, refreshBtn, retryBtn;
  let chatList, chatCount, loadingOverlay, errorContainer, errorMessage;
  let pagination, prevBtn, nextBtn, pageInfo;
  let userTalkOnlyFilter;

  // 分页状态
  let currentPage = 0;
  let totalConversations = 0;
  const pageSize = 20;

  // 排序状态
  let currentSort = 'desc';

  // 筛选状态
  let userTalkOnly = false;

  // 展开的会话
  let expandedConvId = null;

  // 鱼名称到颜色索引的映射
  const fishColorMap = new Map();
  let colorIndex = 0;

  /**
   * 初始化页面
   */
  async function init() {
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    if (window.adminAuth) {
      await window.adminAuth.requireAdminAccess();
    }

    // 获取 DOM 元素
    startDateInput = document.getElementById('startDate');
    endDateInput = document.getElementById('endDate');
    refreshBtn = document.getElementById('refreshBtn');
    retryBtn = document.getElementById('retryBtn');
    chatList = document.getElementById('chatList');
    chatCount = document.getElementById('chatCount');
    loadingOverlay = document.getElementById('loadingOverlay');
    errorContainer = document.getElementById('errorContainer');
    errorMessage = document.getElementById('errorMessage');
    pagination = document.getElementById('pagination');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    pageInfo = document.getElementById('pageInfo');
    userTalkOnlyFilter = document.getElementById('userTalkOnlyFilter');

    bindEvents();
    setDateRange(1);
    await loadConversationList();
  }

  /**
   * 绑定事件处理器
   */
  function bindEvents() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const range = parseInt(btn.dataset.range, 10);
        setDateRange(range);
        updateQuickSelectUI(range);
        currentPage = 0;
        await loadConversationList();
      });
    });

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sort = btn.dataset.sort;
        if (sort !== currentSort) {
          currentSort = sort;
          updateSortUI(sort);
          currentPage = 0;
          await loadConversationList();
        }
      });
    });

    userTalkOnlyFilter.addEventListener('change', async () => {
      userTalkOnly = userTalkOnlyFilter.checked;
      currentPage = 0;
      await loadConversationList();
    });

    refreshBtn.addEventListener('click', () => {
      currentPage = 0;
      loadConversationList();
    });

    retryBtn.addEventListener('click', loadConversationList);

    startDateInput.addEventListener('change', () => {
      clearQuickSelectUI();
      currentPage = 0;
      loadConversationList();
    });
    endDateInput.addEventListener('change', () => {
      clearQuickSelectUI();
      currentPage = 0;
      loadConversationList();
    });

    prevBtn.addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        loadConversationList();
      }
    });
    nextBtn.addEventListener('click', () => {
      if ((currentPage + 1) * pageSize < totalConversations) {
        currentPage++;
        loadConversationList();
      }
    });
  }

  function updateSortUI(sort) {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === sort);
    });
  }

  function setDateRange(days) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    startDateInput.value = formatDateTimeLocal(start);
    endDateInput.value = formatDateTimeLocal(now);
  }

  function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function updateQuickSelectUI(range) {
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.range, 10) === range);
    });
  }

  function clearQuickSelectUI() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  function showLoading() {
    loadingOverlay.style.display = 'flex';
    errorContainer.style.display = 'none';
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
  }

  /**
   * 加载会话列表
   */
  async function loadConversationList() {
    showLoading();

    try {
      const startDate = new Date(startDateInput.value).toISOString();
      const endDate = new Date(endDateInput.value).toISOString();
      const offset = currentPage * pageSize;

      const response = await fetch(
        `/api/admin-api?action=conversation-list&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=${pageSize}&offset=${offset}&sort=${currentSort}&userTalkOnly=${userTalkOnly}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取数据失败');
      }

      totalConversations = result.data.total;
      renderConversationList(result.data.conversations);
      updatePagination();

    } catch (error) {
      console.error('[Chat Viewer] Error:', error);
      showError(`加载失败: ${error.message}`);
    } finally {
      hideLoading();
    }
  }

  /**
   * 格式化持续时长
   */
  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
  }

  /**
   * 渲染会话列表
   */
  function renderConversationList(conversations) {
    chatCount.textContent = `共 ${totalConversations} 个会话`;

    if (!conversations || conversations.length === 0) {
      chatList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <p>暂无群聊记录</p>
        </div>
      `;
      return;
    }

    chatList.innerHTML = conversations.map((conv, index) => {
      const userDisplay = conv.user_nickname || (conv.user_email ? conv.user_email.split('@')[0] : null);
      const chatIcon = conv.has_user_talk ? '👤' : '🐠';
      const displayName = userDisplay ? `${chatIcon} ${userDisplay}` : `${chatIcon} AI 群聊`;
      const convKey = conv.conversation_id || `null_${index}`;
      
      return `
      <div class="chat-item" data-conv-key="${convKey}" data-chat-ids="${conv.chat_ids.join(',')}">
        <div class="chat-item-header">
          <span class="chat-topic">${escapeHtml(displayName)}</span>
          <span class="chat-time">${formatTime(conv.first_chat_at)}</span>
        </div>
        <div class="chat-meta">
          <span class="chat-meta-item">💬 ${conv.chat_count} 条对话</span>
          <span class="chat-meta-item">⏱️ ${formatDuration(conv.duration_seconds)}</span>
          ${conv.our_tank_name ? `<span class="tank-badge">${escapeHtml(conv.our_tank_name)}</span>` : ''}
          ${conv.has_user_talk ? '<span class="user-talk-badge">有用户发言</span>' : ''}
        </div>
        <div class="chat-detail" id="detail-${convKey}">
          <div class="messages-container">
            <div class="loading">
              <div class="loading-spinner"></div>
              <span>加载对话...</span>
            </div>
          </div>
        </div>
      </div>
    `}).join('');

    chatList.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-detail')) return;
        toggleConversationDetail(item.dataset.convKey, item.dataset.chatIds);
      });
    });
  }

  /**
   * 切换会话详情展开/折叠
   */
  async function toggleConversationDetail(convKey, chatIdsStr) {
    const detailEl = document.getElementById(`detail-${convKey}`);
    const itemEl = detailEl.closest('.chat-item');

    if (expandedConvId === convKey) {
      detailEl.classList.remove('show');
      itemEl.classList.remove('expanded');
      expandedConvId = null;
    } else {
      if (expandedConvId) {
        const prevDetail = document.getElementById(`detail-${expandedConvId}`);
        const prevItem = prevDetail?.closest('.chat-item');
        prevDetail?.classList.remove('show');
        prevItem?.classList.remove('expanded');
      }

      detailEl.classList.add('show');
      itemEl.classList.add('expanded');
      expandedConvId = convKey;

      await loadConversationDetail(convKey, chatIdsStr);
    }
  }

  /**
   * 加载会话详情
   */
  async function loadConversationDetail(convKey, chatIdsStr) {
    const detailEl = document.getElementById(`detail-${convKey}`);
    const container = detailEl.querySelector('.messages-container');

    try {
      const response = await fetch(
        `/api/admin-api?action=conversation-list&chatIds=${encodeURIComponent(chatIdsStr)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取详情失败');
      }

      renderConversationMessages(container, result.data.chats);

    } catch (error) {
      console.error('[Conversation Detail] Error:', error);
      container.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
    }
  }

  /**
   * 渲染会话消息
   */
  function renderConversationMessages(container, chats) {
    if (!chats || chats.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无消息</div>';
      return;
    }

    fishColorMap.clear();
    colorIndex = 0;

    let html = '';

    for (const chat of chats) {
      // 添加时间分隔
      html += `<div class="chat-time-divider">${formatTime(chat.created_at)}</div>`;

      // 用户发言
      if (chat.user_talk) {
        html += `
          <div class="message-bubble user">
            <div class="message-sender">👤 用户</div>
            <div class="message-content">${escapeHtml(chat.user_talk)}</div>
          </div>
        `;
      }

      // 鱼的消息
      const dialogues = parseDialogues(chat.dialogues);
      for (const msg of dialogues) {
        const colorClass = `fish-color-${getFishColorIndex(msg.fishName)}`;
        html += `
          <div class="message-bubble fish ${colorClass}">
            <div class="message-sender">🐠 ${escapeHtml(msg.fishName)}</div>
            <div class="message-content">${escapeHtml(msg.message)}</div>
          </div>
        `;
      }
    }

    container.innerHTML = html;
  }

  /**
   * 解析对话数据
   */
  function parseDialogues(dialogues) {
    if (!dialogues) return [];
    
    try {
      let data = dialogues;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      
      const messages = data.messages || data || [];
      if (!Array.isArray(messages)) return [];
      
      return messages.map(m => ({
        fishName: m.fishName || m.fish_name || 'Fish',
        message: m.message || m.talk || ''
      })).filter(m => m.message);
    } catch (e) {
      return [];
    }
  }

  function getFishColorIndex(fishName) {
    if (!fishColorMap.has(fishName)) {
      fishColorMap.set(fishName, colorIndex % 6);
      colorIndex++;
    }
    return fishColorMap.get(fishName);
  }

  function updatePagination() {
    const totalPages = Math.ceil(totalConversations / pageSize);
    
    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    pageInfo.textContent = `第 ${currentPage + 1} / ${totalPages} 页`;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
