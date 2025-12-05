/**
 * 在 Cursor 中打开内置浏览器标签页进行自动调试
 * 
 * 使用方法：
 * node open-browser-debug.js
 * 
 * 或者直接在 Cursor 中：
 * 1. 按 Ctrl+Shift+P (Windows) 或 Cmd+Shift+P (Mac)
 * 2. 输入 "Simple Browser: Show"
 * 3. 输入 URL: http://localhost:3000/open-debug.html
 */

const { exec } = require('child_process');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DEBUG_URL = `http://localhost:${PORT}/open-debug.html`;
const TANK_URL = `http://localhost:${PORT}/tank.html`;

console.log('🔧 Cursor 内置浏览器调试工具\n');
console.log('================================\n');

// 检查服务器是否运行
const http = require('http');
const checkServer = () => {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${PORT}`, (res) => {
            resolve(true);
        });
        req.on('error', () => {
            resolve(false);
        });
        req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
        });
    });
};

(async () => {
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('⚠️  服务器未运行！');
        console.log(`请先启动服务器：node server.js\n`);
        console.log('然后使用以下方法打开浏览器：\n');
    } else {
        console.log('✅ 服务器正在运行\n');
    }

    console.log('📋 方法1: 使用命令面板（推荐）\n');
    console.log('1. 按 Ctrl+Shift+P (Windows) 或 Cmd+Shift+P (Mac)');
    console.log('2. 输入以下命令之一：');
    console.log('   - "Simple Browser: Show"');
    console.log('   - "Preview: Open Preview"');
    console.log('3. 输入 URL:');
    console.log(`   ${DEBUG_URL}`);
    console.log(`   或 ${TANK_URL}\n`);

    console.log('📋 方法2: 使用快捷键\n');
    if (os.platform() === 'win32') {
        console.log('Windows:');
        console.log('  - Ctrl+Shift+P 然后输入 "Simple Browser"\n');
    } else if (os.platform() === 'darwin') {
        console.log('Mac:');
        console.log('  - Cmd+Shift+P 然后输入 "Simple Browser"\n');
    } else {
        console.log('Linux:');
        console.log('  - Ctrl+Shift+P 然后输入 "Simple Browser"\n');
    }

    // 尝试使用系统默认浏览器打开（作为备选方案）
    console.log('📋 方法3: 使用系统浏览器（备选）\n');
    console.log('如果内置浏览器不可用，可以使用系统浏览器：\n');
    
    let openCommand;
    if (os.platform() === 'win32') {
        openCommand = `start ${DEBUG_URL}`;
    } else if (os.platform() === 'darwin') {
        openCommand = `open ${DEBUG_URL}`;
    } else {
        openCommand = `xdg-open ${DEBUG_URL}`;
    }

    console.log(`执行命令: ${openCommand}\n`);

    // 询问是否使用系统浏览器打开
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('是否使用系统浏览器打开调试页面？(y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            exec(openCommand, (error) => {
                if (error) {
                    console.error('❌ 打开浏览器失败:', error.message);
                } else {
                    console.log('✅ 已在系统浏览器中打开');
                }
            });
        }
        rl.close();
    });

    console.log('\n💡 调试提示：');
    console.log('- 打开开发者工具：F12 或 Ctrl+Shift+I');
    console.log('- 查看控制台：Console 标签页');
    console.log('- 查看网络请求：Network 标签页');
    console.log('- 检查元素：Elements 标签页\n');
})();













