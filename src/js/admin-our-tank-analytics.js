/**
 * 管理后台 - Our Tank 数据分析页面逻辑
 */
(function() {
  'use strict';

  let startDateInput, endDateInput, refreshBtn, retryBtn;
  let tankListContainer, loadingOverlay, errorContainer, errorMessage;
  let totalTanksEl, totalMembersEl, totalFishEl, totalChatsEl;
  let currentRange = 7;
  let tanksData = [];
  let chatCache = {};

  async function init() {
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    if (window.adminAuth) {
      await window.adminAuth.requireAdminAccess();
    }

    startDateInput = document.getElementById('startDate');
    endDateInput = document.getElementById('endDate');
    refreshBtn = document.getElementById('refreshBtn');
    retryBtn = document.getElementById('retryBtn');
    tankListContainer = document.getElementById('tankListContainer');
    loadingOverlay = document.getElementById('loadingOverlay');
    errorContainer = document.getElementById('errorContainer');
    errorMessage = document.getElementById('errorMessage');
    totalTanksEl = document.getElementById('totalTanks');
    totalMembersEl = document.getElementById('totalMembers');
    totalFishEl = document.getElementById('totalFish');
    totalChatsEl = document.getElementById('totalChats');

    bindEvents();
    setDateRange(7);
    await loadData();
  }

  function bindEvents() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const range = parseInt(btn.dataset.range, 10);
        setDateRange(range);
        updateQuickSelectUI(range);
        await loadData();
      });
    });
    refreshBtn.addEventListener('click', loadData);
    retryBtn.addEventListener('click', loadData);
    startDateInput.addEventListener('change', () => { clearQuickSelectUI(); loadData(); });
    endDateInput.addEventListener('change', () => { clearQuickSelectUI(); loadData(); });
  }

  function setDateRange(days) {
    currentRange = days;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    startDateInput.value = formatDateTimeLocal(start);
    endDateInput.value = formatDateTimeLocal(now);
  }

  function formatDateTimeLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  }

  function updateQuickSelectUI(range) {
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.range, 10) === range);
    });
  }

  function clearQuickSelectUI() {
    document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
  }

  function showLoading() {
    loadingOverlay.style.display = 'flex';
    errorContainer.style.display = 'none';
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorContainer.style.display = 'block';
  }

  async function loadData() {
    showLoading();
    chatCache = {};
    try {
      const startDate = new Date(startDateInput.value).toISOString();
      const endDate = new Date(endDateInput.value).toISOString();
      const response = await fetch(
        `/api/admin-api?action=our-tank-analytics&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || '获取数据失败');
      tanksData = result.tanks || [];
      updateStats();
      renderTankList();
    } catch (error) {
      console.error('[Our Tank Analytics] Error:', error);
      showError(`加载失败: ${error.message}`);
    } finally {
      hideLoading();
    }
  }

  function updateStats() {
    let members = 0, fish = 0, chats = 0;
    tanksData.forEach(t => {
      members += t.memberCount || 0;
      fish += t.fishCount || 0;
      chats += t.chatCount || 0;
    });
    totalTanksEl.textContent = tanksData.length;
    totalMembersEl.textContent = members;
    totalFishEl.textContent = fish;
    totalChatsEl.textContent = chats;
  }

  function renderTankList() {
    if (tanksData.length === 0) {
      tankListContainer.innerHTML = '<div style="padding:2rem;text-align:center;color:#718096;">暂无数据</div>';
      return;
    }
    tankListContainer.innerHTML = tanksData.map(tank => `
      <div class="tank-item" data-tank-id="${tank.id}">
        <div class="tank-item-header">
          <div>
            <div class="tank-name">${escapeHtml(tank.name)}</div>
            <div class="tank-code">Code: ${escapeHtml(tank.code)} | Owner: ${escapeHtml(tank.ownerName)}</div>
          </div>
          <div class="tank-stat">
            <div class="tank-stat-value">${tank.memberCount}</div>
            <div class="tank-stat-label">成员</div>
          </div>
          <div class="tank-stat">
            <div class="tank-stat-value">${tank.fishCount}</div>
            <div class="tank-stat-label">鱼</div>
          </div>
          <div class="tank-stat">
            <div class="tank-stat-value">${tank.chatCount}</div>
            <div class="tank-stat-label">聊天</div>
          </div>
          <div class="tank-time">${formatTime(tank.createdAt)}</div>
        </div>
        <div class="chat-history" id="chat-${tank.id}">
          <div class="chat-loading">加载聊天记录...</div>
        </div>
      </div>
    `).join('');

    tankListContainer.querySelectorAll('.tank-item').forEach(item => {
      item.addEventListener('click', () => toggleTankExpand(item));
    });
  }

  async function toggleTankExpand(item) {
    const tankId = item.dataset.tankId;
    const isExpanded = item.classList.contains('expanded');
    
    document.querySelectorAll('.tank-item.expanded').forEach(el => {
      if (el !== item) el.classList.remove('expanded');
    });

    if (isExpanded) {
      item.classList.remove('expanded');
    } else {
      item.classList.add('expanded');
      await loadChatHistory(tankId);
    }
  }

  async function loadChatHistory(tankId) {
    const container = document.getElementById(`chat-${tankId}`);
    if (chatCache[tankId]) {
      renderChatHistory(container, chatCache[tankId]);
      return;
    }
    container.innerHTML = '<div class="chat-loading">加载聊天记录...</div>';
    try {
      const response = await fetch(
        `/api/admin-api?action=our-tank-analytics&subAction=chat-history&tankId=${tankId}&limit=20`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      chatCache[tankId] = result.chats || [];
      renderChatHistory(container, chatCache[tankId]);
    } catch (error) {
      container.innerHTML = `<div class="chat-empty">加载失败: ${error.message}</div>`;
    }
  }

  function renderChatHistory(container, chats) {
    if (chats.length === 0) {
      container.innerHTML = '<div class="chat-empty">暂无聊天记录</div>';
      return;
    }
    container.innerHTML = chats.map(chat => {
      let dialoguesHtml = '';
      if (chat.dialogues && Array.isArray(chat.dialogues)) {
        dialoguesHtml = chat.dialogues.map(d => `
          <div class="dialogue-item">
            <span class="dialogue-speaker">${escapeHtml(d.speaker || d.fish_name || 'Fish')}:</span>
            ${escapeHtml(d.content || d.message || '')}
          </div>
        `).join('');
      }
      return `
        <div class="chat-session">
          <div class="chat-session-header">
            <span class="chat-topic">${escapeHtml(chat.topic || '群聊')}</span>
            <span class="chat-time">${formatTime(chat.createdAt)}</span>
          </div>
          ${chat.userMessage ? `<div class="chat-user-msg">👤 ${escapeHtml(chat.userMessage)}</div>` : ''}
          <div class="chat-dialogues">${dialoguesHtml || '<span style="color:#a0aec0;">无对话内容</span>'}</div>
        </div>
      `;
    }).join('');
  }

  function formatTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  init();
})();
