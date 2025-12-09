/**
 * 在 Cursor 中打开内置浏览器标签页进行自动调试
 * 
 * 使用方法：
 * 1. 在 Cursor 中按 Ctrl+Shift+P (Windows) 或 Cmd+Shift+P (Mac)
 * 2. 输入 "Simple Browser" 或 "Preview"
 * 3. 或使用此脚本自动打开
 */

// Cursor 内置浏览器标签页的打开方式

console.log('🔧 Cursor 内置浏览器标签页调试工具\n');
console.log('================================\n');

// 方法1: 使用命令面板
console.log('📋 方法1: 使用命令面板\n');
console.log('1. 按 Ctrl+Shift+P (Windows) 或 Cmd+Shift+P (Mac)');
console.log('2. 输入以下命令之一：');
console.log('   - "Simple Browser: Show"');
console.log('   - "Preview: Open Preview"');
console.log('   - "Live Preview: Show Preview"');
console.log('   - "Browser Preview: Open Preview"');
console.log('3. 输入 URL: http://localhost:3000/tank.html\n');

// 方法2: 使用快捷键
console.log('⌨️  方法2: 使用快捷键\n');
console.log('Windows/Linux:');
console.log('  - Ctrl+Shift+V: 打开 Markdown 预览');
console.log('  - Ctrl+K V: 打开侧边预览');
console.log('  - Ctrl+Shift+P 然后输入 "Simple Browser"\n');

console.log('Mac:');
console.log('  - Cmd+Shift+V: 打开 Markdown 预览');
console.log('  - Cmd+K V: 打开侧边预览');
console.log('  - Cmd+Shift+P 然后输入 "Simple Browser"\n');

// 方法3: 使用 VS Code 的 Simple Browser 扩展
console.log('🌐 方法3: 使用 Simple Browser 扩展\n');
console.log('1. 打开命令面板 (Ctrl+Shift+P / Cmd+Shift+P)');
console.log('2. 输入 "Simple Browser: Show"');
console.log('3. 输入 URL: http://localhost:3000/tank.html');
console.log('4. 浏览器标签页会在 Cursor 内打开\n');

// 自动打开脚本（如果支持）
const autoOpenScript = `
// 在 Cursor 的命令面板中运行以下命令：
// 1. 打开命令面板: Ctrl+Shift+P (Windows) 或 Cmd+Shift+P (Mac)
// 2. 输入: Simple Browser: Show
// 3. 输入 URL: http://localhost:3000/tank.html

// 或者使用 VS Code API（如果可用）
if (typeof vscode !== 'undefined') {
    vscode.commands.executeCommand('simpleBrowser.show', 'http://localhost:3000/tank.html');
}
`;

console.log('💡 自动打开脚本：\n');
console.log(autoOpenScript);

// 调试检查清单
const debugChecklist = {
    '打开浏览器标签页': [
        '使用命令面板打开 Simple Browser',
        '输入目标 URL',
        '等待页面加载'
    ],
    '检查页面状态': [
        '查看页面是否正常加载',
        '检查是否有错误提示',
        '查看页面标题是否正确'
    ],
    '检查控制台': [
        '打开开发者工具 (F12)',
        '查看 Console 标签页',
        '检查是否有错误消息',
        '查看警告信息'
    ],
    '检查网络请求': [
        '打开 Network 标签页',
        '刷新页面',
        '检查 API 请求状态',
        '查看失败的请求 (红色)'
    ],
    '检查页面元素': [
        '使用 Elements 标签页',
        '检查聊天面板元素',
        '检查 Test 按钮元素',
        '验证元素可见性'
    ]
};

console.log('\n📋 调试检查清单：\n');
Object.entries(debugChecklist).forEach(([title, steps]) => {
    console.log(`${title}:`);
    steps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step}`);
    });
    console.log('');
});

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debugChecklist,
        autoOpenScript
    };
}















