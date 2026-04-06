
// getUserQuota/index.js
// 获取用户今日使用配额

// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

// 引入统一配置
const API_CONFIG = require('../../config.js')

// 每日免费使用次数限制
const DAILY_LIMIT = API_CONFIG.DAILY_LIMIT || 10

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 获取今天的开始时间戳
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    
    // 查找用户今天的记录
    const result = await db.collection('user_quota')
      .where({
        openid: OPENID,
        date: db.command.gte(todayStart)
      })
      .get()
    
    let userQuota
    if (result.data.length > 0) {
      // 已有今日记录
      userQuota = result.data[0]
    } else {
      // 创建新记录
      const addResult = await db.collection('user_quota').add({
        data: {
          openid: OPENID,
          date: todayStart,
          usedCount: 0,
          createTime: Date.now(),
          updateTime: Date.now()
        }
      })
      userQuota = {
        _id: addResult._id,
        openid: OPENID,
        date: todayStart,
        usedCount: 0
      }
    }
    
    const remaining = DAILY_LIMIT - (userQuota.usedCount || 0)
    
    return {
      success: true,
      data: {
        dailyLimit: DAILY_LIMIT,
        usedCount: userQuota.usedCount || 0,
        remaining: remaining > 0 ? remaining : 0,
        date: userQuota.date
      }
    }
    
  } catch (error) {
    console.error('获取配额失败', error)
    return {
      success: false,
      message: '获取配额失败: ' + error.message
    }
  }
}
