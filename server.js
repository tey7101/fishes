const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const net = require('net');
require('dotenv').config({ path: '.env.local' });

const app = express();

// 从 .env.local 读取 PORT，如果没有则使用默认值 5000
let PORT = parseInt(process.env.PORT) || 5000;

// 静态文件服务
app.use(express.static(__dirname));

// 处理所有路由，返回对应的 HTML 文件
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path === '/' ? 'index.html' : req.path);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
  } else if (fs.existsSync(filePath + '.html')) {
    res.sendFile(filePath + '.html');
  } else {
    res.status(404).send('Page not found');
  }
});

/**
 * 检查端口是否被占用
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

/**
 * 获取占用端口的进程 PID (Windows)
 */
function getProcessUsingPort(port) {
  return new Promise((resolve, reject) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          resolve(pid);
          return;
        }
      }
      resolve(null);
    });
  });
}

/**
 * 尝试关闭占用端口的进程
 */
function killProcess(pid) {
  return new Promise((resolve) => {
    console.log(`\n尝试关闭占用端口的进程 PID: ${pid}`);
    exec(`taskkill /PID ${pid} /F`, (error, stdout) => {
      if (error) {
        console.log(`❌ 无法关闭进程 ${pid}:`, error.message);
        resolve(false);
      } else {
        console.log(`✅ 成功关闭进程 ${pid}`);
        // 等待一下让端口释放
        setTimeout(() => resolve(true), 1000);
      }
    });
  });
}

/**
 * 查找可用端口
 */
async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < startPort + 100) {
    if (!(await isPortInUse(port))) {
      return port;
    }
    port++;
  }
  throw new Error('无法找到可用端口');
}

/**
 * 启动服务器的主函数
 */
async function startServer() {
  console.log('\n🐟 Fish Art 本地开发服务器启动中...\n');
  console.log(`📋 配置的端口: ${PORT} (来自 .env.local)`);
  
  // 检查端口是否被占用
  const portInUse = await isPortInUse(PORT);
  
  if (portInUse) {
    console.log(`\n⚠️  端口 ${PORT} 已被占用`);
    
    // 尝试获取占用端口的进程
    const pid = await getProcessUsingPort(PORT);
    
    if (pid) {
      console.log(`📌 占用进程 PID: ${pid}`);
      
      // 尝试关闭进程
      const killed = await killProcess(pid);
      
      if (killed) {
        // 再次检查端口是否可用
        const stillInUse = await isPortInUse(PORT);
        if (!stillInUse) {
          console.log(`✅ 端口 ${PORT} 已释放，使用原端口启动`);
        } else {
          console.log(`⚠️  端口 ${PORT} 仍然被占用，寻找新端口...`);
          PORT = await findAvailablePort(PORT + 1);
          console.log(`✅ 找到可用端口: ${PORT}`);
        }
      } else {
        // 无法关闭进程，寻找新端口
        console.log(`⚠️  无法关闭占用进程，寻找新端口...`);
        PORT = await findAvailablePort(PORT + 1);
        console.log(`✅ 找到可用端口: ${PORT}`);
      }
    } else {
      // 无法获取进程信息，直接寻找新端口
      console.log(`⚠️  无法获取占用进程信息，寻找新端口...`);
      PORT = await findAvailablePort(PORT + 1);
      console.log(`✅ 找到可用端口: ${PORT}`);
    }
  } else {
    console.log(`✅ 端口 ${PORT} 可用`);
  }
  
  // 启动服务器
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 服务器已启动！`);
    console.log(`📍 本地访问: http://localhost:${PORT}`);
    console.log(`📍 网络访问: http://127.0.0.1:${PORT}`);
    console.log('='.repeat(50) + '\n');
    console.log('按 Ctrl+C 停止服务器');
  });
}

// 启动服务器
startServer().catch(err => {
  console.error('❌ 服务器启动失败:', err);
  process.exit(1);
});

