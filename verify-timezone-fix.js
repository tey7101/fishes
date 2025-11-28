/**
 * 验证时区修复
 * 模拟 admin-table-editor.js 的时间转换逻辑
 */

function formatValue(value, column) {
  if (column.includes('_at') && value) {
    // 显示为北京时间 (UTC+8)
    // 数据库存储的是UTC时间，但PostgreSQL返回的时间字符串没有Z后缀
    // 需要手动添加Z来标记为UTC时间
    let timeStr = value;
    
    // 如果时间字符串没有Z后缀且不包含时区信息，添加Z
    if (typeof timeStr === 'string' && 
        !timeStr.endsWith('Z') && 
        !timeStr.includes('+') && 
        !timeStr.includes(' ')) {
      timeStr = timeStr + 'Z';
    }
    
    const date = new Date(timeStr);
    
    // 检查时间是否合理
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // 转换为北京时间显示
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
  
  return value;
}

console.log('\n✅ 验证时区修复...\n');

// 测试各种数据库可能返回的时间格式
const testCases = [
  { value: '2025-11-28T07:19:09.123642', column: 'created_at', expected: '2025/11/28 15:19:09' },
  { value: '2025-11-28T07:19:09.123642Z', column: 'updated_at', expected: '2025/11/28 15:19:09' },
  { value: '2025-11-28T07:19:09', column: 'payment_date', expected: '2025/11/28 15:19:09' },
  { value: '2025-11-28 07:19:09', column: 'created_at', expected: '2025/11/28 07:19:09' }, // 带空格的不转换
];

let passCount = 0;
let failCount = 0;

testCases.forEach((test, index) => {
  const result = formatValue(test.value, test.column);
  const pass = result === test.expected;
  
  console.log(`测试 ${index + 1}: ${pass ? '✅' : '❌'}`);
  console.log(`  输入: ${test.value}`);
  console.log(`  字段: ${test.column}`);
  console.log(`  期望: ${test.expected}`);
  console.log(`  实际: ${result}`);
  console.log('');
  
  if (pass) passCount++;
  else failCount++;
});

console.log(`\n📊 测试结果: ${passCount} 通过, ${failCount} 失败\n`);

// 测试实际的数据库时间
console.log('🔍 实际数据库时间测试:\n');
const dbTime = '2025-11-28T07:19:09.123642'; // 这是用户报告的时间
console.log(`数据库时间: ${dbTime}`);
console.log(`显示时间: ${formatValue(dbTime, 'created_at')}`);
console.log(`\n说明: 如果用户在15:19操作，这个转换是正确的`);
console.log(`      因为UTC 07:19 + 8小时 = 北京 15:19\n`);

