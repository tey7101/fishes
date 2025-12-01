/**
 * 批量更新 Google Analytics ID
 * 从 G-601YXTKK0L 更新到 G-6FDEBZYFLT
 */

const fs = require('fs');
const path = require('path');

// 需要更新的文件列表
const filesToUpdate = [
    'check-domain-redirect.html',
    'test-ga-tracking.html',
    'tank.html',
    'fish-drawing-game.html',
    'faq.html',
    'weird-fish-drawings.html',
    'tutorials/easy-fish-drawing-ideas.html',
    'index.html',
    'about.html',
    'how-to-draw-a-fish.html',
    'rank.html',
    'ai-fish.html',
    'talking-fish.html',
    'fish-doodle-community.html',
    'myfish.html',
    'profile.html',
    'swipe-moderation.html',
    'share-fish-doodle.html',
    'reset-password.html',
    'moderation.html',
    'login.html',
    'debug.html'
];

const OLD_GA_ID = 'G-601YXTKK0L';
const NEW_GA_ID = 'G-6FDEBZYFLT';

let successCount = 0;
let errorCount = 0;
let notFoundCount = 0;

console.log('🔄 开始更新 Google Analytics ID...');
console.log(`   旧ID: ${OLD_GA_ID}`);
console.log(`   新ID: ${NEW_GA_ID}`);
console.log('');

filesToUpdate.forEach(file => {
    try {
        const filePath = path.join(__dirname, file);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  ${file} - 文件不存在，跳过`);
            notFoundCount++;
            return;
        }
        
        // 读取文件内容
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 检查是否包含旧ID
        if (!content.includes(OLD_GA_ID)) {
            console.log(`ℹ️  ${file} - 未找到旧ID，跳过`);
            notFoundCount++;
            return;
        }
        
        // 替换所有出现的旧ID
        const occurrences = (content.match(new RegExp(OLD_GA_ID, 'g')) || []).length;
        content = content.replace(new RegExp(OLD_GA_ID, 'g'), NEW_GA_ID);
        
        // 写回文件
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`✅ ${file} - 已更新 (${occurrences} 处)`);
        successCount++;
        
    } catch (error) {
        console.error(`❌ ${file} - 错误: ${error.message}`);
        errorCount++;
    }
});

console.log('');
console.log('📊 更新统计:');
console.log(`   ✅ 成功: ${successCount} 个文件`);
console.log(`   ❌ 失败: ${errorCount} 个文件`);
console.log(`   ⚠️  跳过: ${notFoundCount} 个文件`);
console.log('');

if (successCount > 0) {
    console.log('✅ Google Analytics ID 更新完成！');
    console.log('');
    console.log('📋 下一步:');
    console.log('   1. 提交更改到 Git');
    console.log('   2. 部署到 Render');
    console.log('   3. 访问网站测试');
    console.log('   4. 在 GA 实时报告中验证数据');
} else {
    console.log('⚠️  没有文件被更新');
}

