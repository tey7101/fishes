/**
 * 检查 Cursor MCP 配置的辅助脚本
 * 运行此脚本可以帮助诊断 MCP 配置问题
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 Cursor MCP 配置检查工具\n');
console.log('================================\n');

// 获取配置文件路径
function getConfigPath() {
    const platform = os.platform();
    let configPath;
    
    if (platform === 'win32') {
        configPath = path.join(
            process.env.APPDATA,
            'Cursor',
            'User',
            'globalStorage',
            'saoudrizwan.claude-dev',
            'settings',
            'cline_mcp_settings.json'
        );
    } else if (platform === 'darwin') {
        configPath = path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Cursor',
            'User',
            'globalStorage',
            'saoudrizwan.claude-dev',
            'settings',
            'cline_mcp_settings.json'
        );
    } else {
        configPath = path.join(
            os.homedir(),
            '.config',
            'Cursor',
            'User',
            'globalStorage',
            'saoudrizwan.claude-dev',
            'settings',
            'cline_mcp_settings.json'
        );
    }
    
    return configPath;
}

// 检查配置文件
function checkConfig() {
    const configPath = getConfigPath();
    console.log(`📁 配置文件路径: ${configPath}\n`);
    
    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
        console.log('❌ 配置文件不存在！');
        console.log('\n📝 请创建配置文件并添加以下内容：\n');
        console.log(JSON.stringify({
            mcpServers: {
                "cursor-ide-browser": {
                    command: "npx",
                    args: ["-y", "@cursor-ide/browser-mcp"],
                    env: {
                        BROWSER_HEADLESS: "false"
                    }
                }
            }
        }, null, 2));
        return false;
    }
    
    console.log('✅ 配置文件存在\n');
    
    // 读取并验证配置
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        console.log('📋 当前配置：');
        console.log(JSON.stringify(config, null, 2));
        console.log('\n');
        
        // 检查 Browser MCP 配置
        if (!config.mcpServers) {
            console.log('❌ 配置中没有 mcpServers 字段');
            return false;
        }
        
        if (!config.mcpServers['cursor-ide-browser']) {
            console.log('❌ 配置中没有 cursor-ide-browser 服务器');
            console.log('\n📝 请添加以下配置：\n');
            console.log(JSON.stringify({
                "cursor-ide-browser": {
                    command: "npx",
                    args: ["-y", "@cursor-ide/browser-mcp"],
                    env: {
                        BROWSER_HEADLESS: "false"
                    }
                }
            }, null, 2));
            return false;
        }
        
        const browserMCP = config.mcpServers['cursor-ide-browser'];
        
        console.log('✅ Browser MCP 配置存在');
        console.log(`   命令: ${browserMCP.command}`);
        console.log(`   参数: ${browserMCP.args?.join(' ') || '无'}`);
        console.log(`   环境变量: ${JSON.stringify(browserMCP.env || {})}`);
        
        return true;
        
    } catch (error) {
        console.log('❌ 配置文件格式错误：');
        console.log(`   ${error.message}`);
        return false;
    }
}

// 检查依赖
function checkDependencies() {
    console.log('\n📦 检查依赖...\n');
    
    const { execSync } = require('child_process');
    
    try {
        // 检查 Node.js
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        console.log(`✅ Node.js: ${nodeVersion}`);
    } catch (error) {
        console.log('❌ Node.js 未安装或不在 PATH 中');
        return false;
    }
    
    try {
        // 检查 npm
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        console.log(`✅ npm: ${npmVersion}`);
    } catch (error) {
        console.log('❌ npm 未安装或不在 PATH 中');
        return false;
    }
    
    try {
        // 检查 npx
        const npxVersion = execSync('npx --version', { encoding: 'utf8' }).trim();
        console.log(`✅ npx: ${npxVersion}`);
    } catch (error) {
        console.log('❌ npx 未安装或不在 PATH 中');
        return false;
    }
    
    return true;
}

// 主函数
function main() {
    console.log('开始检查...\n');
    
    const configOk = checkConfig();
    const depsOk = checkDependencies();
    
    console.log('\n================================\n');
    
    if (configOk && depsOk) {
        console.log('✅ 配置检查通过！');
        console.log('\n下一步：');
        console.log('1. 重启 Cursor');
        console.log('2. 等待 MCP 服务器启动');
        console.log('3. 在对话中测试："请使用浏览器MCP导航到 http://localhost:3000"');
    } else {
        console.log('❌ 配置检查未通过');
        console.log('\n请根据上述提示修复配置后重新运行此脚本');
    }
}

// 运行检查
main();



