/**
 * 测试时区转换
 */

// 测试 UTC 时间 2025-11-28T07:19:09（这应该是北京时间15:19:09）
const utcTime = '2025-11-28T07:19:09.123642';

console.log('\n🧪 测试时区转换...\n');

// 测试1: 不带Z的UTC时间字符串
const date1 = new Date(utcTime);
console.log('测试1: 不带Z的时间字符串');
console.log('  输入:', utcTime);
console.log('  Date对象:', date1.toISOString());
console.log('  转换为北京时间:', date1.toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}));

// 测试2: 带Z的UTC时间字符串
const utcTimeWithZ = utcTime + 'Z';
const date2 = new Date(utcTimeWithZ);
console.log('\n测试2: 带Z的时间字符串');
console.log('  输入:', utcTimeWithZ);
console.log('  Date对象:', date2.toISOString());
console.log('  转换为北京时间:', date2.toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}));

// 测试3: 当前时间
const now = new Date();
console.log('\n测试3: 当前时间');
console.log('  UTC时间:', now.toISOString());
console.log('  本地时间:', now.toLocaleString());
console.log('  北京时间:', now.toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}));

// 测试4: 检查数据库返回的时间格式
console.log('\n测试4: 数据库可能的时间格式');
const formats = [
  '2025-11-28T07:19:09.123642',
  '2025-11-28T07:19:09.123642Z',
  '2025-11-28T07:19:09',
  '2025-11-28 07:19:09',
  '2025-11-28 07:19:09.123642'
];

formats.forEach(format => {
  const d = new Date(format);
  const beijing = d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false
  });
  console.log(`  ${format} -> ${beijing}`);
});

// 测试5: 时区偏移
console.log('\n测试5: 时区信息');
const testDate = new Date('2025-11-28T07:19:09Z');
console.log('  时区偏移（分钟）:', testDate.getTimezoneOffset());
console.log('  说明: 负值表示比UTC早，正值表示比UTC晚');
console.log('  北京应该是 -480（早8小时）');

