
// 工具函数库

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatDate = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${[year, month, day].map(formatNumber).join('-')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 获取今天的开始时间戳
const getTodayStartTimestamp = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

// 敏感词过滤（基础版）
const sensitiveWordFilter = (text, wordList) => {
  if (!wordList || wordList.length === 0) {
    return {
      hasSensitive: false,
      filteredText: text
    }
  }
  
  let hasSensitive = false
  let filteredText = text
  wordList.forEach(word => {
    if (filteredText.includes(word)) {
      hasSensitive = true
      const replacement = '*'.repeat(word.length)
      filteredText = filteredText.replace(new RegExp(word, 'g'), replacement)
    }
  })
  
  return {
    hasSensitive,
    filteredText
  }
}

// 复制文本到剪贴板
const copyToClipboard = (text) => {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: () => {
        resolve(true)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// 显示提示信息
const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon
  })
}

// 显示加载中
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title
  })
}

// 隐藏加载中
const hideLoading = () => {
  wx.hideLoading()
}

module.exports = {
  formatTime,
  formatDate,
  formatNumber,
  getTodayStartTimestamp,
  sensitiveWordFilter,
  copyToClipboard,
  showToast,
  showLoading,
  hideLoading
}
