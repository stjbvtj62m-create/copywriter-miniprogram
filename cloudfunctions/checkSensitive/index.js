
// checkSensitive/index.js
// 敏感词检测

// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 基础敏感词列表（可以后续扩展）
const sensitiveWords = [
  // 这里添加敏感词，实际使用可以接入微信内容安全接口
]

// 云函数入口函数
exports.main = async (event, context) => {
  const { text } = event
  
  if (!text) {
    return {
      success: true,
      hasSensitive: false
    }
  }
  
  // 基础敏感词检测
  let hasSensitive = false
  for (const word of sensitiveWords) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      hasSensitive = true
      break
    }
  }
  
  // 如果开启了微信内容安全，调用微信接口进行检测
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: text
    })
    
    // 如果微信检测不通过
    if (result && result.errCode === 87014) {
      hasSensitive = true
    }
  } catch (error) {
    console.error('调用内容安全接口失败', error)
    // 接口调用失败时，不阻断，依赖本地检测
  }
  
  return {
    success: true,
    hasSensitive: hasSensitive
  }
}
