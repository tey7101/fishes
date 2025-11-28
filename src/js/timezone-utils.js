/**
 * 时区转换工具
 * 将 UTC 时间转换为北京时间（Asia/Shanghai, UTC+8）
 */

/**
 * 将 UTC 时间戳转换为北京时间字符串
 * @param {string|Date} utcTimestamp - UTC 时间戳
 * @param {Object} options - 格式化选项
 * @returns {string} 北京时间字符串
 */
export function formatBeijingTime(utcTimestamp, options = {}) {
  if (!utcTimestamp) return '-';
  
  try {
    const date = new Date(utcTimestamp);
    
    // 默认选项
    const defaultOptions = {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    return date.toLocaleString('zh-CN', formatOptions);
  } catch (error) {
    console.error('时间转换错误:', error);
    return utcTimestamp.toString();
  }
}

/**
 * 将 UTC 时间戳转换为北京时间（仅日期）
 * @param {string|Date} utcTimestamp - UTC 时间戳
 * @returns {string} 北京日期字符串
 */
export function formatBeijingDate(utcTimestamp) {
  if (!utcTimestamp) return '-';
  
  try {
    const date = new Date(utcTimestamp);
    return date.toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('日期转换错误:', error);
    return utcTimestamp.toString();
  }
}

/**
 * 将 UTC 时间戳转换为北京时间（仅时间）
 * @param {string|Date} utcTimestamp - UTC 时间戳
 * @returns {string} 北京时间字符串
 */
export function formatBeijingTimeOnly(utcTimestamp) {
  if (!utcTimestamp) return '-';
  
  try {
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('时间转换错误:', error);
    return utcTimestamp.toString();
  }
}

/**
 * 将 UTC 时间戳转换为相对时间（例如："2 小时前"）
 * @param {string|Date} utcTimestamp - UTC 时间戳
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(utcTimestamp) {
  if (!utcTimestamp) return '-';
  
  try {
    const date = new Date(utcTimestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return `${diffSec} 秒前`;
    } else if (diffMin < 60) {
      return `${diffMin} 分钟前`;
    } else if (diffHour < 24) {
      return `${diffHour} 小时前`;
    } else if (diffDay < 7) {
      return `${diffDay} 天前`;
    } else {
      return formatBeijingDate(utcTimestamp);
    }
  } catch (error) {
    console.error('相对时间转换错误:', error);
    return utcTimestamp.toString();
  }
}

/**
 * 自动转换页面中所有的时间戳
 * 使用 data-utc-time 属性标记需要转换的元素
 * 
 * 用法:
 * <span data-utc-time="2025-11-28T07:00:00Z" data-time-format="datetime"></span>
 * 
 * data-time-format 可选值:
 * - datetime: 完整日期时间（默认）
 * - date: 仅日期
 * - time: 仅时间
 * - relative: 相对时间
 */
export function convertPageTimes() {
  const elements = document.querySelectorAll('[data-utc-time]');
  
  elements.forEach(element => {
    const utcTime = element.getAttribute('data-utc-time');
    const format = element.getAttribute('data-time-format') || 'datetime';
    
    let beijingTime;
    switch (format) {
      case 'date':
        beijingTime = formatBeijingDate(utcTime);
        break;
      case 'time':
        beijingTime = formatBeijingTimeOnly(utcTime);
        break;
      case 'relative':
        beijingTime = formatRelativeTime(utcTime);
        break;
      case 'datetime':
      default:
        beijingTime = formatBeijingTime(utcTime);
    }
    
    element.textContent = beijingTime;
  });
}

// 如果不是模块化环境，将函数挂载到全局
if (typeof window !== 'undefined' && !window.TimezoneUtils) {
  window.TimezoneUtils = {
    formatBeijingTime,
    formatBeijingDate,
    formatBeijingTimeOnly,
    formatRelativeTime,
    convertPageTimes
  };
}

