/**
 * Dashboard 下拉菜单功能
 * 管理导航栏中的 Dashboard 下拉菜单交互
 */

(function() {
  'use strict';

  /**
   * 切换下拉菜单显示状态
   */
  function toggleDashboardMenu(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const dropdown = document.querySelector('.dashboard-dropdown');
    if (dropdown) {
      const isOpen = dropdown.classList.contains('open');
      dropdown.classList.toggle('open');
      console.log('🔽 Dashboard dropdown toggled:', !isOpen ? 'open' : 'closed');
    }
  }

  /**
   * 关闭下拉菜单
   */
  function closeDashboardMenu() {
    const dropdown = document.querySelector('.dashboard-dropdown');
    if (dropdown && dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      console.log('🔽 Dashboard dropdown closed');
    }
  }

  /**
   * 初始化下拉菜单事件（使用事件委托）
   */
  function initDashboardDropdown() {
    // 使用事件委托，在 document 上监听点击事件
    document.addEventListener('click', function(event) {
      const dropdownBtn = event.target.closest('.dashboard-dropdown-btn');
      const dropdown = document.querySelector('.dashboard-dropdown');
      
      if (dropdownBtn) {
        // 点击了下拉按钮
        toggleDashboardMenu(event);
      } else if (dropdown && !dropdown.contains(event.target)) {
        // 点击了下拉菜单外部
        closeDashboardMenu();
      }
    });

    // ESC 键关闭菜单
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeDashboardMenu();
      }
    });

    console.log('✅ Dashboard dropdown initialized (event delegation)');
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardDropdown);
  } else {
    initDashboardDropdown();
  }

  // 导出全局函数
  window.toggleDashboardMenu = toggleDashboardMenu;
  window.closeDashboardMenu = closeDashboardMenu;

})();
