/**
 * 自动调试工具
 * 在页面加载时自动打开浏览器开发者工具（如果可能）
 * 
 * 使用方法：
 * 1. 在HTML中添加: <script src="auto-debug.js"></script>
 * 2. 或者在控制台运行此代码
 */

(function() {
    'use strict';

    console.log('%c🔧 自动调试工具已加载', 'font-size: 16px; color: #4CAF50; font-weight: bold;');

    // 检测是否已打开开发者工具
    function isDevToolsOpen() {
        const threshold = 160;
        return window.outerHeight - window.innerHeight > threshold ||
               window.outerWidth - window.innerWidth > threshold;
    }

    // 尝试打开开发者工具的方法
    function tryOpenDevTools() {
        // 方法1: 触发debugger（如果开发者工具已打开会暂停）
        try {
            debugger;
        } catch (e) {
            // 忽略错误
        }

        // 方法2: 创建一个错误来吸引注意力
        setTimeout(() => {
            console.error('%c⚠️ 请按 F12 打开开发者工具', 'font-size: 18px; color: #FF5722; font-weight: bold;');
        }, 100);

        // 方法3: 显示提示
        console.log('%c📋 快捷键提示：', 'font-size: 14px; color: #2196F3; font-weight: bold;');
        console.log('%c  Windows/Linux: F12 或 Ctrl+Shift+I', 'font-size: 12px; color: #666;');
        console.log('%c  Mac: Cmd+Option+I', 'font-size: 12px; color: #666;');
    }

    // 检查开发者工具状态
    function checkDevTools() {
        if (isDevToolsOpen()) {
            console.log('%c✅ 开发者工具已打开！', 'font-size: 16px; color: #4CAF50; font-weight: bold;');
            return true;
        } else {
            console.log('%cℹ️ 开发者工具未打开，请按 F12', 'font-size: 14px; color: #FF9800;');
            return false;
        }
    }

    // 添加键盘快捷键提示
    function setupKeyboardHints() {
        document.addEventListener('keydown', function(e) {
            // F12
            if (e.keyCode === 123) {
                e.preventDefault();
                console.log('%c✅ F12 - 开发者工具快捷键', 'font-size: 14px; color: #4CAF50;');
                setTimeout(() => {
                    console.log('%c🔍 开发者工具应该已打开', 'font-size: 12px; color: #666;');
                }, 500);
            }
        }, true);
    }

    // 自动检测并提示
    function autoDetect() {
        // 延迟检查，给页面时间加载
        setTimeout(() => {
            if (!checkDevTools()) {
                tryOpenDevTools();
            }
        }, 1000);
    }

    // 导出到全局
    window.autoDebug = {
        open: tryOpenDevTools,
        check: checkDevTools,
        isOpen: isDevToolsOpen
    };

    // 自动执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupKeyboardHints();
            autoDetect();
        });
    } else {
        setupKeyboardHints();
        autoDetect();
    }

    // 定期检查（每5秒）
    setInterval(checkDevTools, 5000);

    console.log('%c💡 提示：使用 window.autoDebug.open() 尝试打开开发者工具', 'font-size: 12px; color: #666;');
})();


















