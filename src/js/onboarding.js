/**
 * FishTalk Onboarding Tutorial Module
 * 使用 Driver.js 实现新手引导功能
 * 支持多页面引导：index.html（绘画页）和 tank.html（鱼缸页�?
 * 
 * 性能优化�?
 * - 只在首次访问时才加载 Driver.js（懒加载�?
 * - 非首次访问用户完全跳过，不加载任何资�?
 */

(function() {
  'use strict';

  // 不同页面使用不同的存储键
  const STORAGE_KEYS = {
    index: 'fishtalk_onboarding_completed',
    tank: 'fishtalk_tank_onboarding_completed',
    ourTankPromo: 'fishtalk_our_tank_promo_shown'
  };
  const STORAGE_VERSION = 1;
  
  // Our Tank 推广教程延迟时间（毫秒）
  // 从全局配置读取，默认 2 分钟
  const OUR_TANK_PROMO_DELAY = window.TANK_PROMOTE_TUTORIAL_TIME || 2 * 60 * 1000;
  
  // Driver.js 是否已加载
  let driverLoaded = false;
  let driverLoading = false;
  
  // Our Tank 推广定时器
  let ourTankPromoTimer = null;

  /**
   * 获取当前页面类型
   * @returns {string} 'index' | 'tank' | 'unknown'
   */
  function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('tank.html') || path.endsWith('/tank')) {
      return 'tank';
    }
    if (path === '/' || path.includes('index.html') || path.endsWith('/')) {
      return 'index';
    }
    return 'unknown';
  }

  /**
   * 检查当前是否是全局鱼缸视图
   * Tank 页面教程只在全局鱼缸时启动，不在 My Tank �?Our Tank 中启�?
   * @returns {boolean}
   */
  function isGlobalTankView() {
    const params = new URLSearchParams(window.location.search);
    // 如果�?view=my 参数，说明是 My Tank
    if (params.get('view') === 'my') {
      return false;
    }
    // 如果�?ourTank �?tankId 参数，说明是 Our Tank
    if (params.has('ourTank') || params.has('tankId')) {
      return false;
    }
    return true;
  }

  /**
   * 获取当前页面的存储键
   * @returns {string}
   */
  function getStorageKey() {
    const page = getCurrentPage();
    return STORAGE_KEYS[page] || STORAGE_KEYS.index;
  }

  /**
   * 检�?localStorage 是否可用
   * @returns {boolean}
   */
  function isLocalStorageAvailable() {
    try {
      const testKey = '__onboarding_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检查是否首次访问当前页�?
   * @param {string} [page] - 可选，指定页面类型
   * @returns {boolean}
   */
  function isFirstVisit(page) {
    if (!isLocalStorageAvailable()) {
      // 无法存储状态时，默认不显示引导（避免每次都显示�?
      return false;
    }
    
    const storageKey = page ? STORAGE_KEYS[page] : getStorageKey();
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return true;
      
      const data = JSON.parse(stored);
      if (!data || typeof data.completed !== 'boolean') return true;
      
      return !data.completed;
    } catch (e) {
      console.warn('[Onboarding] Failed to read localStorage:', e);
      return false;
    }
  }

  /**
   * 标记当前页面引导已完�?
   * @param {string} [page] - 可选，指定页面类型
   */
  function markCompleted(page) {
    if (!isLocalStorageAvailable()) {
      return;
    }
    
    const storageKey = page ? STORAGE_KEYS[page] : getStorageKey();
    
    try {
      const data = {
        completed: true,
        completedAt: new Date().toISOString(),
        version: STORAGE_VERSION
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('[Onboarding] Failed to write localStorage:', e);
    }
  }

  /**
   * 重置引导状态（用于测试�?
   * @param {string} [page] - 可选，指定页面类型，不传则重置所�?
   */
  function reset(page) {
    if (!isLocalStorageAvailable()) return;
    
    try {
      if (page) {
        localStorage.removeItem(STORAGE_KEYS[page]);
      } else {
        // 重置所有页面的引导状�?
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (e) {
      console.warn('[Onboarding] Failed to reset localStorage:', e);
    }
  }
  
  /**
   * 懒加�?Driver.js CSS �?JS
   * @returns {Promise<boolean>}
   */
  async function loadDriverJS() {
    if (driverLoaded) return true;
    if (driverLoading) {
      // 等待加载完成
      return new Promise(resolve => {
        const check = setInterval(() => {
          if (driverLoaded || !driverLoading) {
            clearInterval(check);
            resolve(driverLoaded);
          }
        }, 100);
      });
    }
    
    driverLoading = true;
    
    // 加载 CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css';
    document.head.appendChild(cssLink);
    
    // 加载 JS（带 CDN 回退�?
    const driverSources = [
      'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js',
      'https://unpkg.com/driver.js@1.3.1/dist/driver.js.iife.js',
      'https://fastly.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js'
    ];
    
    for (const src of driverSources) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        console.log('[Onboarding] Driver.js loaded from:', src);
        driverLoaded = true;
        driverLoading = false;
        return true;
      } catch (e) {
        console.warn('[Onboarding] Failed to load Driver.js from:', src);
      }
    }
    
    console.warn('[Onboarding] All Driver.js CDN sources failed');
    driverLoading = false;
    return false;
  }


  /**
   * 获取首页（绘画页）引导步骤配�?
   * 弹窗位置优化：确保不遮挡目标组件
   * - PC端：弹窗尽量放在目标右侧或下�?
   * - 移动端：弹窗放在目标上方或下方，避免左右遮挡
   * @returns {Array}
   */
  function getIndexSteps() {
    const isMobile = window.innerWidth < 768;
    
    return [
      {
        // 1/4 欢迎步骤：无目标元素，居中显示
        // 位置参数：side(top/bottom/left/right/over), align(start/center/end)
        // 偏移参数：onPopoverRender: createPopoverOffsetHook(Y偏移, X偏移)
        popover: {
          title: '🐟 Welcome to FishTalk!',
          description: 'This is a fun global doodle fish tank! Let me show you how to create your first talking fish in just a few steps!',
          side: 'over',
          align: 'center',
          // PC: 无偏移, 移动端: 无偏移
          onPopoverRender: createPopoverOffsetHook(0, 0)
        }
      },
      {
        // 2/4 画布步骤：高亮画布容器（包含canvas的div），弹窗在下方
        // 位置参数：side(top/bottom/left/right), align(start/center/end)
        // 偏移参数：onPopoverRender: createPopoverOffsetHook(Y偏移, X偏移)
        element: '.game-canvas-wrapper',
        popover: {
          title: '🎨 Draw Your Fish',
          description: 'Use your mouse or finger to draw a fish here. Make sure it faces right! →',
          side: 'bottom',
          align: 'center',
          // PC: 向下偏移20px, 移动端: 向下偏移10px
          onPopoverRender: createPopoverOffsetHook(isMobile ? -20 : 20, 0)
        }
      },
      {
        // 3/4 提交按钮：PC端弹窗在左侧，移动端在上方，都不遮挡按钮
        // 位置参数：side(top/bottom/left/right), align(start/center/end)
        // 偏移参数：onPopoverRender: createPopoverOffsetHook(Y偏移, X偏移)
        element: '#swim-btn',
        popover: {
          title: '🌊 Make it Swim!',
          description: 'When you\'re happy with your fish, click here to add it to the global tank!',
          side: isMobile ? 'top' : 'left',
          align: 'center',
          // PC: 向左偏移20px, 移动端: 向上偏移10px
          onPopoverRender: createPopoverOffsetHook(isMobile ? -50 : 0, isMobile ? 0 : -20)
        }
      },
      {
        // 4/4 Global Tank 按钮：引导用户查看全球鱼缸
        // 位置参数：side(top/bottom/left/right), align(start/center/end)
        // 偏移参数：onPopoverRender: createPopoverOffsetHook(Y偏移, X偏移)
        element: '.game-btn-group a[href="tank.html"]',
        popover: {
          title: '🌊 Explore the Tank',
          description: 'Click here to watch fun fish from artists around the world swim together!',
          side: 'top',
          align: 'center',
          // PC: 向上偏移10px, 移动端: 向上偏移5px
          onPopoverRender: createPopoverOffsetHook(isMobile ? -50 : -10, 0)
        }
      }
    ];
  }

  // Feed the Fish 步骤的点击处理器
  let feedFishClickHandler = null;
  // 标记是否正在进行引导（用于禁止 chat panel 自动弹出）
  let isOnboardingActive = false;
  // 保存原始 z-index 值，用于恢复
  let originalZIndexMap = new Map();
  
  /**
   * 检查是否正在进行引导
   * @returns {boolean}
   */
  function isOnboarding() {
    return isOnboardingActive;
  }
  
  /**
   * 提升元素的 z-index 使其高于 Driver.js 蒙板层
   * Driver.js 蒙板层 z-index 约为 10000，高亮元素需要 10001+
   * @param {string} selector - 元素选择器
   */
  function elevateElementZIndex(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    
    // 保存原始 z-index
    if (!originalZIndexMap.has(selector)) {
      originalZIndexMap.set(selector, el.style.zIndex || '');
    }
    
    // 提升 z-index 到蒙板之上
    el.style.zIndex = '10002';
  }
  
  /**
   * 恢复所有元素的原始 z-index
   */
  function restoreAllZIndexes() {
    originalZIndexMap.forEach((originalZIndex, selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.style.zIndex = originalZIndex;
      }
    });
    originalZIndexMap.clear();
  }
  
  /**
   * 调整弹窗位置的辅助函�?
   * 通过 onPopoverRender 钩子实现每个步骤的独立距离控�?
   * @param {number} offsetY - 垂直偏移量（正数向下，负数向上）
   * @param {number} offsetX - 水平偏移量（正数向右，负数向左）
   * @returns {Function} onPopoverRender 回调函数
   */
  function createPopoverOffsetHook(offsetY = 0, offsetX = 0) {
    return (popover) => {
      if (!popover || !popover.wrapper) return;
      const wrapper = popover.wrapper;
      // 获取当前 transform 或设置新�?
      const currentTransform = wrapper.style.transform || '';
      // 添加额外的位�?
      if (offsetY !== 0 || offsetX !== 0) {
        wrapper.style.transform = `${currentTransform} translate(${offsetX}px, ${offsetY}px)`;
      }
    };
  }
  
  /**
   * 获取鱼缸页引导步骤配�?
   * 弹窗位置优化：确保不遮挡目标组件
   * 使用 onPopoverRender 钩子实现每个步骤的独立距离控�?
   * @returns {Array}
   */
  function getTankSteps() {
    const isMobile = window.innerWidth < 768;
    
    return [
      {
        // 1/8 喂鱼指导：高亮整个鱼缸画布，允许用户点击喂鱼
        // 位置参数：side(top/bottom/left/right/over), align(start/center/end)
        // 偏移参数：onPopoverRender: createPopoverOffsetHook(Y偏移, X偏移)
        element: '#swim-canvas',
        popover: {
          title: '🍞 Feed the Fish!',
          description: 'Click anywhere on the tank to drop food! Watch the fish swim over to eat it. Then click "Next" to continue.',
          side: 'bottom',
          align: 'center',
          // PC: 向下偏移, 移动端: 向下偏移
          onPopoverRender: createPopoverOffsetHook(isMobile ? 0 : 0, 0)
        },
        onHighlightStarted: () => {
          // 引导开始时，隐藏 chat panel 和独白
          const chatPanel = document.getElementById('chat-panel');
          if (chatPanel) {
            chatPanel.style.display = 'none';
            chatPanel.style.visibility = 'hidden';
          }
          const chatReopenBtn = document.getElementById('chat-reopen-btn');
          if (chatReopenBtn) {
            chatReopenBtn.style.display = 'none';
          }
          // 禁用独白功能
          if (window.communityChatManager) {
            window._onboardingMonologueState = window.communityChatManager.monologueEnabled;
            window.communityChatManager.setMonologueEnabled(false);
            console.log('[Onboarding] Monologue disabled during tutorial');
          }
          if (window.fishDialogueManager) {
            window.fishDialogueManager.clearAllDialogues && window.fishDialogueManager.clearAllDialogues();
          }
          // 提升鱼缸画布 z-index，使其可以接收点击事件
          elevateElementZIndex('#swim-canvas');
        },
        onDeselected: () => {
          // 离开此步骤时恢复 z-index
          restoreAllZIndexes();
        }
      },
      {
        // 2/8 汉堡菜单按钮：弹窗在下方，侧边栏保持关闭状态
        element: '#hamburger-menu-btn',
        popover: {
          title: '☰ Settings Menu',
          description: 'Click here to open the menu. You can change language, adjust fish count, and more!',
          side: 'bottom',
          align: 'start',
          onPopoverRender: createPopoverOffsetHook(100, 0)
        }
        // 注意：此步骤不打开侧边栏，让用户看到汉堡菜单按钮
      },
      {
        // 3/8 语言选择：弹窗在底部
        // 移动端：不向右偏移，避免超出屏幕
        element: '#language-selection-container',
        popover: {
          title: '🌍 Language Settings',
          description: 'Choose your preferred language for fish conversations. Fish will chat in this language!',
          side: 'bottom',
          align: 'start',
          onPopoverRender: createPopoverOffsetHook(100, isMobile ? 0 : 50)
        },
        onHighlightStarted: () => {
          // 在语言选择步骤时展开侧边栏
          const sidebar = document.getElementById('sidebar-menu');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar && !sidebar.classList.contains('open')) {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
          }
          // 提升侧边栏 z-index 使高亮元素显示在蒙板之上
          elevateElementZIndex('#sidebar-menu');
          elevateElementZIndex('#language-selection-container');
        }
      },
      {
        // 4/8 鱼数量选择：弹窗在底部
        // 移动端：改为底部显示，不向右偏移
        element: '#fish-count-selector-sidebar',
        popover: {
          title: '🐠 Fish Count',
          description: 'Adjust how many fish appear in the tank. More fish = more fun conversations!',
          side: isMobile ? 'bottom' : 'left',
          align: isMobile ? 'start' : 'center',
          onPopoverRender: createPopoverOffsetHook(isMobile ? 100 : 200, isMobile ? 0 : 0)
        },
        onHighlightStarted: () => {
          // 提升侧边栏 z-index 使高亮元素显示在蒙板之上
          elevateElementZIndex('#sidebar-menu');
          elevateElementZIndex('#fish-count-selector-sidebar');
        }
      },
      {
        // 5/8 Refresh 按钮：告诉用户可以刷新看新的鱼
        element: '#refresh-tank-sidebar',
        popover: {
          title: '🔄 Discover New Fish!',
          description: 'Click Refresh to see a new batch of fish you haven\'t seen before!',
          side: 'bottom',
          align: 'start',
          onPopoverRender: createPopoverOffsetHook(50, 0)
        },
        onHighlightStarted: () => {
          // 确保侧边栏打开
          const sidebar = document.getElementById('sidebar-menu');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar && !sidebar.classList.contains('open')) {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
          }
          elevateElementZIndex('#sidebar-menu');
          elevateElementZIndex('#refresh-tank-sidebar');
        }
      },
      {
        // 6/8 Fish Talk 开关：告诉用户可以开启鱼的对话功能
        element: '#fish-talk-toggle',
        popover: {
          title: '💬 Fish Talk',
          description: 'Toggle this switch to enable fish conversations! Watch fish chat with each other in the tank.',
          side: 'bottom',
          align: 'start',
          onPopoverRender: createPopoverOffsetHook(50, 0)
        },
        onHighlightStarted: () => {
          // 确保侧边栏打开，以便用户能看到 Fish Talk 开关
          const sidebar = document.getElementById('sidebar-menu');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar && !sidebar.classList.contains('open')) {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
          }
          // 提升侧边栏 z-index 使高亮元素显示在蒙板之上
          elevateElementZIndex('#sidebar-menu');
          elevateElementZIndex('#fish-talk-toggle');
        }
      },
      {
        // 7/8 聊天输入框：告诉用户可以和鱼对话
        element: '#user-chat-input',
        popover: {
          title: '🗣️ Talk to Fish!',
          description: 'Type a message here to chat with the fish! They will respond to you.',
          side: 'top',
          align: isMobile ? 'center' : 'start',
          onPopoverRender: createPopoverOffsetHook(0, 0)
        },
        onHighlightStarted: () => {
          // 关闭侧边栏
          const sidebar = document.getElementById('sidebar-menu');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
          }
          // 显示 chat panel 并提升其 z-index
          const chatPanel = document.getElementById('chat-panel');
          if (chatPanel) {
            chatPanel.style.display = 'flex';
            chatPanel.style.visibility = 'visible';
            chatPanel.style.right = '0';
          }
          elevateElementZIndex('#chat-panel');
          elevateElementZIndex('#user-chat-input');
        }
      },
      {
        // 8/8 Our Tank：告诉用户可以创建私人鱼缸（最后一步）
        element: 'a[href="our-tank-list.html"]',
        popover: {
          title: '🏠 Create Your Own Tank!',
          description: 'Want a private tank? Create an "Our Tank" to share with friends and family!',
          side: 'top',
          align: 'center',
          onPopoverRender: createPopoverOffsetHook(-40, 0)
        },
        onHighlightStarted: () => {
          // 隐藏 chat panel
          const chatPanel = document.getElementById('chat-panel');
          if (chatPanel) {
            chatPanel.style.display = 'none';
            chatPanel.style.visibility = 'hidden';
          }
          // 展开侧边栏以显示 Our Tank 链接
          const sidebar = document.getElementById('sidebar-menu');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar && !sidebar.classList.contains('open')) {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
          }
          // 提升侧边栏 z-index 使高亮元素显示在蒙板之上
          elevateElementZIndex('#sidebar-menu');
          elevateElementZIndex('a[href="our-tank-list.html"]');
        }
      }
    ];
  }

  /**
   * 获取当前页面的引导步骤配�?
   * @returns {Array}
   */
  function getSteps() {
    const page = getCurrentPage();
    if (page === 'tank') {
      return getTankSteps();
    }
    return getIndexSteps();
  }

  // Driver.js 实例
  let driverInstance = null;
  // ESC 键处理器引用
  let escHandler = null;

  /**
   * 获取 Driver.js 构造函�?
   * @returns {Function|null}
   */
  function getDriverConstructor() {
    // Driver.js IIFE 版本�?API: window.driver.js.driver
    if (window.driver && window.driver.js && typeof window.driver.js.driver === 'function') {
      return window.driver.js.driver;
    }
    // 备用：直接调�?window.driver（某些版本）
    if (typeof window.driver === 'function') {
      return window.driver;
    }
    return null;
  }

  /**
   * 清理引导实例
   */
  function cleanup() {
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
    // 清理 Feed the Fish 步骤的点击处理器
    if (feedFishClickHandler) {
      document.removeEventListener('click', feedFishClickHandler, true);
      feedFishClickHandler = null;
    }
    // 恢复所有被提升的 z-index
    restoreAllZIndexes();
    driverInstance = null;
  }

  /**
   * 启动引导教程
   * @param {boolean} force - 是否强制启动（忽略首次访问检查）
   */
  async function startTutorial(force = false) {
    // 非强制模式下，先检查是否首次访问（避免不必要的加载�?
    if (!force && !isFirstVisit()) {
      console.log('[Onboarding] Not first visit, skipping tutorial');
      return;
    }
    
    // 如果已有实例在运行，先销�?
    if (driverInstance) {
      try {
        driverInstance.destroy();
      } catch (e) {}
      cleanup();
    }

    // 懒加�?Driver.js
    const loaded = await loadDriverJS();
    if (!loaded) {
      console.warn('[Onboarding] Driver.js failed to load');
      return;
    }

    // 获取 Driver.js 构造函�?
    const driverFn = getDriverConstructor();
    if (!driverFn) {
      console.warn('[Onboarding] Driver.js not loaded or invalid API');
      return;
    }

    // 过滤掉目标元素不存在或不可见的步骤
    const steps = getSteps().filter(step => {
      if (!step.element) return true; // 无目标元素的步骤保留
      const el = document.querySelector(step.element);
      if (!el) {
        console.warn('[Onboarding] Element not found:', step.element);
        return false;
      }
      // 检查元素是否可见（对于侧边栏和聊天面板内的元素，跳过可见性检查）
      const isInSidebar = step.element.includes('sidebar') || 
                          step.element.includes('language-selection') ||
                          step.element.includes('fish-count-selector') ||
                          step.element.includes('fish-talk') ||
                          step.element.includes('our-tank');
      const isInChatPanel = step.element.includes('chat') || 
                            step.element.includes('user-chat');
      if (!isInSidebar && !isInChatPanel) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn('[Onboarding] Element not visible:', step.element);
          return false;
        }
      }
      return true;
    });

    if (steps.length === 0) {
      console.warn('[Onboarding] No valid steps found');
      return;
    }

    const page = getCurrentPage();
    const doneBtnText = page === 'tank' ? 'Got it! 🐟' : 'Start Drawing! 🎨';
    
    console.log('[Onboarding] Starting tutorial with', steps.length, 'steps for page:', page);

    // 标记引导开�?
    isOnboardingActive = true;
    
    // Tank 页面：引导开始时隐藏 chat panel
    if (page === 'tank') {
      const chatPanel = document.getElementById('chat-panel');
      if (chatPanel) {
        chatPanel.style.display = 'none';
        chatPanel.style.visibility = 'hidden';
      }
      const chatReopenBtn = document.getElementById('chat-reopen-btn');
      if (chatReopenBtn) {
        chatReopenBtn.style.display = 'none';
      }
    }

    // 创建 Driver 实例
    driverInstance = driverFn({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: doneBtnText,
      progressText: '{{current}} / {{total}}',
      allowClose: true,
      overlayClickNext: false,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      stagePadding: 8,
      stageRadius: 8,
      animate: true,
      smoothScroll: true,
      disableActiveInteraction: false,
      popoverClass: 'fishtalk-popover',
      onDestroyed: () => {
        // 引导完成或关闭时标记完成
        isOnboardingActive = false;
        markCompleted();
        cleanup();
        console.log('[Onboarding] Tutorial completed for page:', page);
        
        // Tank 页面：引导结束后恢复状态
        if (page === 'tank') {
          const chatReopenBtn = document.getElementById('chat-reopen-btn');
          if (chatReopenBtn) {
            chatReopenBtn.style.display = '';
          }
          // 恢复独白状态
          if (window.communityChatManager && window._onboardingMonologueState !== undefined) {
            window.communityChatManager.setMonologueEnabled(window._onboardingMonologueState);
            console.log('[Onboarding] Monologue restored to:', window._onboardingMonologueState);
            delete window._onboardingMonologueState;
          }
          // 新手教程完成后启动推广定时器
          initOurTankPromoTimer();
        }
      },
      steps: steps
    });

    // 添加 ESC 键监�?
    escHandler = (e) => {
      if (e.key === 'Escape' && driverInstance) {
        driverInstance.destroy();
      }
    };
    document.addEventListener('keydown', escHandler);

    // 启动引导
    driverInstance.drive();
  }

  /**
   * 初始化引导系�?
   * 性能优化：非首次访问用户完全跳过，不加载任何资源
   */
  function init() {
    const page = getCurrentPage();
    
    // 只在支持的页面上初始�?
    if (page === 'unknown') {
      return;
    }
    
    // Tank 页面：只在全局鱼缸视图启动教程，不�?My Tank �?Our Tank 中启�?
    if (page === 'tank' && !isGlobalTankView()) {
      console.log('[Onboarding] Skipping tutorial for non-global tank view');
      return;
    }
    
    // 非首次访问时，直接启动推广定时器
    if (!isFirstVisit()) {
      // Tank 页面：启动 Our Tank 推广定时器
      if (page === 'tank') {
        initOurTankPromoTimer();
      }
      return;
    }
    
    // 首次访问时，推广定时器会在新手教程完成后启动（见 onDestroyed 回调）

    console.log('[Onboarding] First visit detected for', page);

    // 延迟启动的函�?
    const startOnboarding = async () => {
      // 根据页面类型检查关键元�?
      if (page === 'index') {
        const canvas = document.querySelector('#draw-canvas');
        if (!canvas) {
          setTimeout(startOnboarding, 500);
          return;
        }
      } else if (page === 'tank') {
        const swimCanvas = document.querySelector('#swim-canvas');
        const hamburgerBtn = document.querySelector('#hamburger-menu-btn');
        
        if (!swimCanvas || !hamburgerBtn) {
          setTimeout(startOnboarding, 500);
          return;
        }
        // 注意：侧边栏会在 Settings Menu 步骤�?onHighlightStarted 中打开
      }

      // 启动引导（会自动懒加�?Driver.js�?
      await startTutorial();
    };

    // 延迟 3 秒启动，确保页面完全渲染
    setTimeout(startOnboarding, 3000);
  }

  /**
   * 获取当前 Driver 实例（用于测试）
   */
  function getDriverInstance() {
    return driverInstance;
  }

  /**
   * 检查 Our Tank 推广是否已显示过
   * @returns {boolean}
   */
  function isOurTankPromoShown() {
    if (!isLocalStorageAvailable()) return true; // 无法存储时默认不显示
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ourTankPromo);
      if (!stored) return false;
      const data = JSON.parse(stored);
      return data && data.shown === true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 标记 Our Tank 推广已显示
   */
  function markOurTankPromoShown() {
    if (!isLocalStorageAvailable()) return;
    try {
      const data = {
        shown: true,
        shownAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.ourTankPromo, JSON.stringify(data));
    } catch (e) {
      console.warn('[Onboarding] Failed to mark Our Tank promo shown:', e);
    }
  }

  /**
   * 获取 Our Tank 推广教程步骤
   * @returns {Array}
   */
  function getOurTankPromoSteps() {
    return [
      {
        // 1/2 欢迎弹窗
        popover: {
          title: '👥 Create Your Own Tank!',
          description: 'Enjoying the Global Tank? Create a private "Our Tank" to share with friends and family!',
          side: 'over',
          align: 'center'
        },
        onHighlightStarted: () => {
          // 隐藏 chat panel
          const chatPanel = document.getElementById('chat-panel');
          if (chatPanel) {
            chatPanel.style.display = 'none';
            chatPanel.style.visibility = 'hidden';
          }
          const chatReopenBtn = document.getElementById('chat-reopen-btn');
          if (chatReopenBtn) {
            chatReopenBtn.style.display = 'none';
          }
          // 禁用独白
          if (window.communityChatManager) {
            window._promoMonologueState = window.communityChatManager.monologueEnabled;
            window.communityChatManager.setMonologueEnabled(false);
          }
        }
      },
      {
        // 2/2 Our Tank 链接
        element: 'a[href="our-tank-list.html"]',
        popover: {
          title: '🏠 Your Private Tank',
          description: 'Click here to create your own tank. Invite friends to add their fish and watch them swim together!',
          side: 'bottom',
          align: 'start',
          onPopoverRender: createPopoverOffsetHook(30, 0)
        },
        onHighlightStarted: () => {
          // 展开侧边栏
          const sidebar = document.getElementById('sidebar-menu');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar && !sidebar.classList.contains('open')) {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
          }
          elevateElementZIndex('#sidebar-menu');
          elevateElementZIndex('a[href="our-tank-list.html"]');
        }
      }
    ];
  }

  /**
   * 启动 Our Tank 推广教程
   */
  async function startOurTankPromo() {
    // 检查是否已显示过
    if (isOurTankPromoShown()) {
      console.log('[Onboarding] Our Tank promo already shown');
      return;
    }

    // 检查是否正在进行其他引导
    if (isOnboardingActive) {
      console.log('[Onboarding] Another tutorial is active, skipping promo');
      return;
    }

    // 检查是否在全局鱼缸视图
    if (!isGlobalTankView()) {
      console.log('[Onboarding] Not in global tank view, skipping promo');
      return;
    }

    // 懒加载 Driver.js
    const loaded = await loadDriverJS();
    if (!loaded) {
      console.warn('[Onboarding] Driver.js failed to load for promo');
      return;
    }

    const driverFn = getDriverConstructor();
    if (!driverFn) {
      console.warn('[Onboarding] Driver.js not available for promo');
      return;
    }

    // 过滤有效步骤
    const steps = getOurTankPromoSteps().filter(step => {
      if (!step.element) return true;
      const el = document.querySelector(step.element);
      return !!el;
    });

    if (steps.length === 0) {
      console.warn('[Onboarding] No valid promo steps found');
      return;
    }

    console.log('[Onboarding] Starting Our Tank promo with', steps.length, 'steps');
    isOnboardingActive = true;

    driverInstance = driverFn({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Create Tank! 🐟',
      progressText: '{{current}} / {{total}}',
      allowClose: true,
      overlayClickNext: false,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      stagePadding: 8,
      stageRadius: 8,
      animate: true,
      smoothScroll: true,
      disableActiveInteraction: false,
      popoverClass: 'fishtalk-popover',
      onDestroyed: () => {
        isOnboardingActive = false;
        markOurTankPromoShown();
        restoreAllZIndexes();
        console.log('[Onboarding] Our Tank promo completed');
        
        // 恢复状态
        const chatReopenBtn = document.getElementById('chat-reopen-btn');
        if (chatReopenBtn) {
          chatReopenBtn.style.display = '';
        }
        if (window.communityChatManager && window._promoMonologueState !== undefined) {
          window.communityChatManager.setMonologueEnabled(window._promoMonologueState);
          delete window._promoMonologueState;
        }
      },
      steps: steps
    });

    escHandler = (e) => {
      if (e.key === 'Escape' && driverInstance) {
        driverInstance.destroy();
      }
    };
    document.addEventListener('keydown', escHandler);

    driverInstance.drive();
  }

  /**
   * 初始化 Our Tank 推广定时器（2分钟后触发）
   */
  function initOurTankPromoTimer() {
    // 只在 tank 页面的全局视图启动
    if (getCurrentPage() !== 'tank' || !isGlobalTankView()) {
      return;
    }

    // 如果已显示过，不启动定时器
    if (isOurTankPromoShown()) {
      return;
    }

    // 清除之前的定时器
    if (ourTankPromoTimer) {
      clearTimeout(ourTankPromoTimer);
    }

    console.log('[Onboarding] Our Tank promo timer started (2 minutes)');
    ourTankPromoTimer = setTimeout(() => {
      startOurTankPromo();
    }, OUR_TANK_PROMO_DELAY);
  }

  // 导出到全局
  window.onboardingManager = {
    STORAGE_KEYS,
    STORAGE_VERSION,
    getCurrentPage,
    isFirstVisit,
    isLocalStorageAvailable,
    markCompleted,
    reset,
    getSteps,
    getIndexSteps,
    getTankSteps,
    startTutorial,
    startOurTankPromo,
    init,
    getDriverInstance,
    isOnboarding
  };

  // 自动初始化：使用 requestIdleCallback 在浏览器空闲时初始化，不阻塞主线�?
  const scheduleInit = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => init(), { timeout: 5000 });
    } else {
      // 降级方案：延迟执�?
      setTimeout(init, 100);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInit);
  } else {
    scheduleInit();
  }

})();
