/**
 * 管理后台 - 网站表现页面逻辑
 * 
 * 功能：
 * - 日期区间选择和快速切换
 * - 统计数据加载和显示
 * - 加载状态和错误处理
 * - 使用 Chart.js 绘制数据曲线图
 */

(function() {
  'use strict';

  // DOM 元素
  let startDateInput, endDateInput, refreshBtn, retryBtn;
  let totalUsersEl, userDetailEl, groupChatsEl, userGroupChatsEl, ourTanksEl, paymentsEl, fishCountEl;
  let groupChatsCard, userGroupChatsCard, ourTanksCard;
  let loadingOverlay, errorContainer, errorMessage;
  let trendChart = null;

  // 当前选中的快速选择范围
  let currentRange = 1;

  /**
   * 初始化页面
   */
  async function init() {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    // 等待管理员权限检查
    if (window.adminAuth) {
      await window.adminAuth.requireAdminAccess();
    }

    // 获取 DOM 元素
    startDateInput = document.getElementById('startDate');
    endDateInput = document.getElementById('endDate');
    refreshBtn = document.getElementById('refreshBtn');
    retryBtn = document.getElementById('retryBtn');
    totalUsersEl = document.getElementById('totalUsers');
    userDetailEl = document.getElementById('userDetail');
    groupChatsEl = document.getElementById('groupChats');
    userGroupChatsEl = document.getElementById('userGroupChats');
    groupChatsCard = document.getElementById('groupChatsCard');
    userGroupChatsCard = document.getElementById('userGroupChatsCard');
    ourTanksCard = document.getElementById('ourTanksCard');
    ourTanksEl = document.getElementById('ourTanks');
    paymentsEl = document.getElementById('payments');
    fishCountEl = document.getElementById('fishCount');
    loadingOverlay = document.getElementById('loadingOverlay');
    errorContainer = document.getElementById('errorContainer');
    errorMessage = document.getElementById('errorMessage');

    // 绑定事件
    bindEvents();

    // 设置默认日期范围（24小时）
    setDateRange(1);

    // 加载数据
    await loadAnalytics();
  }

  /**
   * 绑定事件处理器
   */
  function bindEvents() {
    // 快速选择按钮
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const range = parseInt(btn.dataset.range, 10);
        setDateRange(range);
        updateQuickSelectUI(range);
        await loadAnalytics();
      });
    });

    // 刷新按钮
    refreshBtn.addEventListener('click', loadAnalytics);

    // 重试按钮
    retryBtn.addEventListener('click', loadAnalytics);

    // 日期输入变化
    startDateInput.addEventListener('change', () => {
      clearQuickSelectUI();
      loadAnalytics();
    });
    endDateInput.addEventListener('change', () => {
      clearQuickSelectUI();
      loadAnalytics();
    });

    // 群聊卡片点击跳转
    groupChatsCard.addEventListener('click', () => {
      window.location.href = 'admin-chat-viewer.html';
    });
    userGroupChatsCard.addEventListener('click', () => {
      window.location.href = 'admin-chat-viewer.html';
    });

    // Our Tank 卡片点击跳转
    ourTanksCard.addEventListener('click', () => {
      window.location.href = 'admin-our-tank-analytics.html';
    });
  }

  /**
   * 设置日期范围
   * @param {number} days - 天数
   */
  function setDateRange(days) {
    currentRange = days;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    // 格式化为 datetime-local 格式
    startDateInput.value = formatDateTimeLocal(start);
    endDateInput.value = formatDateTimeLocal(now);
  }

  /**
   * 格式化日期为 datetime-local 格式
   * @param {Date} date
   * @returns {string}
   */
  function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * 更新快速选择按钮 UI
   * @param {number} range
   */
  function updateQuickSelectUI(range) {
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.range, 10) === range);
    });
  }

  /**
   * 清除快速选择按钮 UI
   */
  function clearQuickSelectUI() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  /**
   * 显示加载状态
   */
  function showLoading() {
    loadingOverlay.style.display = 'flex';
    errorContainer.style.display = 'none';
  }

  /**
   * 隐藏加载状态
   */
  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  /**
   * 显示错误
   * @param {string} message
   */
  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
  }

  /**
   * 加载统计数据
   */
  async function loadAnalytics() {
    showLoading();

    try {
      const startDate = new Date(startDateInput.value).toISOString();
      const endDate = new Date(endDateInput.value).toISOString();

      const response = await fetch(
        `/api/admin-api?action=analytics&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取数据失败');
      }

      updateStats(result.data);
      updateChart(result.data.timeline);

    } catch (error) {
      console.error('[Analytics] Error:', error);
      showError(`加载失败: ${error.message}`);
    } finally {
      hideLoading();
    }
  }

  /**
   * 更新统计卡片
   * @param {object} data
   */
  function updateStats(data) {
    totalUsersEl.textContent = data.users?.total ?? 0;
    userDetailEl.textContent = `匿名: ${data.users?.anonymous ?? 0} | 注册: ${data.users?.registered ?? 0}`;
    
    // 群聊数据可能是对象或数字（兼容旧格式）
    if (typeof data.groupChats === 'object') {
      groupChatsEl.textContent = data.groupChats?.total ?? 0;
      userGroupChatsEl.textContent = data.groupChats?.userParticipated ?? 0;
    } else {
      groupChatsEl.textContent = data.groupChats ?? 0;
      userGroupChatsEl.textContent = '-';
    }
    
    ourTanksEl.textContent = data.ourTanks ?? 0;
    paymentsEl.textContent = data.payments ?? 0;
    fishCountEl.textContent = data.fish ?? 0;
  }

  /**
   * 更新图表
   * @param {object} timeline
   */
  function updateChart(timeline) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    // 销毁旧图表
    if (trendChart) {
      trendChart.destroy();
    }

    // 格式化标签
    const labels = (timeline?.labels || []).map(label => {
      if (label.includes('T')) {
        // 小时格式
        return label.slice(11, 16);
      }
      // 日期格式
      return label.slice(5);
    });

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '用户',
            data: timeline?.users || [],
            borderColor: '#4299e1',
            backgroundColor: 'rgba(66, 153, 225, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: '群聊',
            data: timeline?.groupChats || [],
            borderColor: '#48bb78',
            backgroundColor: 'rgba(72, 187, 120, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Our Tank',
            data: timeline?.ourTanks || [],
            borderColor: '#ed8936',
            backgroundColor: 'rgba(237, 137, 54, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: '订单',
            data: timeline?.payments || [],
            borderColor: '#9f7aea',
            backgroundColor: 'rgba(159, 122, 234, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: '画鱼',
            data: timeline?.fish || [],
            borderColor: '#f56565',
            backgroundColor: 'rgba(245, 101, 101, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return timeline?.labels?.[index] || '';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  // 启动
  init();
})();
