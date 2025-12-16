/**
 * 使用 Cursor Browser MCP 进行自动调试
 * 
 * 配置步骤：
 * 1. 在 Cursor 设置中添加 Browser MCP 服务器
 * 2. 重启 Cursor
 * 3. 运行此脚本进行自动调试
 */

// 注意：这个脚本需要在 Cursor 的 MCP 环境中运行
// 实际的浏览器操作需要通过 MCP 工具调用

console.log('🔧 Browser MCP 自动调试工具');
console.log('================================');

// 调试检查清单
const debugChecklist = {
    // 1. 页面加载检查
    pageLoad: {
        check: '检查页面是否正常加载',
        steps: [
            '导航到目标页面',
            '检查页面标题',
            '检查是否有404错误',
            '检查页面加载时间'
        ]
    },
    
    // 2. 控制台错误检查
    consoleErrors: {
        check: '检查控制台错误',
        steps: [
            '获取所有控制台消息',
            '过滤错误和警告',
            '记录错误详情',
            '检查错误来源'
        ]
    },
    
    // 3. 网络请求检查
    networkRequests: {
        check: '检查网络请求',
        steps: [
            '获取所有网络请求',
            '检查失败的请求（4xx, 5xx）',
            '检查请求响应时间',
            '检查API端点状态'
        ]
    },
    
    // 4. 页面元素检查
    pageElements: {
        check: '检查页面元素',
        steps: [
            '获取页面快照',
            '检查关键元素是否存在',
            '检查元素可见性',
            '检查交互元素'
        ]
    },
    
    // 5. 性能检查
    performance: {
        check: '检查页面性能',
        steps: [
            '检查页面加载时间',
            '检查资源加载时间',
            '检查内存使用',
            '检查渲染性能'
        ]
    }
};

// 输出调试检查清单
console.log('\n📋 调试检查清单：\n');
Object.entries(debugChecklist).forEach(([key, item]) => {
    console.log(`${key.toUpperCase()}: ${item.check}`);
    item.steps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step}`);
    });
    console.log('');
});

// MCP 工具调用示例（需要在 Cursor MCP 环境中运行）
const mcpDebugSteps = `
// 步骤1: 导航到页面
await browser_navigate({ url: 'http://localhost:3000/tank.html' });

// 步骤2: 获取页面快照
const snapshot = await browser_snapshot();

// 步骤3: 检查控制台消息
const consoleMessages = await browser_console_messages();
const errors = consoleMessages.filter(msg => msg.level === 'error');

// 步骤4: 检查网络请求
const networkRequests = await browser_network_requests();
const failedRequests = networkRequests.filter(req => req.status >= 400);

// 步骤5: 检查特定元素
// 例如检查聊天面板
const chatPanel = snapshot.find(element => element.text === 'Fish Group Chat');

console.log('调试结果：');
console.log('- 控制台错误数:', errors.length);
console.log('- 失败请求数:', failedRequests.length);
console.log('- 聊天面板存在:', !!chatPanel);
`;

console.log('💡 MCP 工具调用示例：');
console.log(mcpDebugSteps);

// 导出调试函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debugChecklist,
        mcpDebugSteps
    };
}



















