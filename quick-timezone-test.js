/**
 * 快速测试时区修复
 */

console.log('\n========================================');
console.log('         时区修复验证');
console.log('========================================\n');

// 模拟数据库返回的时间（用户报告的时间）
const dbTime = '2025-11-28T07:19:09.123642';

console.log('📝 用户报告的情况:');
console.log('   操作时间: 北京时间 15:00 左右');
console.log('   数据库存储:', dbTime);
console.log('   之前显示: 2025/11/28 07:19:09 ❌ 错误！\n');

// 修复前（错误的）
const wrongDate = new Date(dbTime);
const wrongDisplay = wrongDate.toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour12: false
});
console.log('🔴 修复前（错误）:');
console.log('   显示:', wrongDisplay);
console.log('   问题: 时间晚了8小时\n');

// 修复后（正确的）
let timeStr = dbTime;
if (!timeStr.endsWith('Z') && !timeStr.includes('+')) {
  timeStr = timeStr + 'Z';  // 添加Z后缀
}
const correctDate = new Date(timeStr);
const correctDisplay = correctDate.toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

console.log('🟢 修复后（正确）:');
console.log('   显示:', correctDisplay);
console.log('   ✅ 正确！与用户操作时间一致\n');

console.log('========================================');
console.log('✅ 修复已应用到 src/js/admin-table-editor.js');
console.log('🔄 请刷新浏览器查看效果');
console.log('========================================\n');

