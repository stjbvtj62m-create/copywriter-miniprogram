
// polish/index.js
// AI文案润色云函数

// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

// 引入根目录配置
const API_CONFIG = require('../../config.js')

// 每日限制次数
const DAILY_LIMIT = API_CONFIG.DAILY_LIMIT || 10

// 风格系统提示词
const stylePrompts = {
  casual: `你是一位朋友圈文案润色专家。请将用户提供的原始文案改写为【日常随意】风格的朋友圈文案。
要求：
1. 口语化，像和朋友聊天一样自然
2. 保持轻松随意的语气
3. 长度适中，适合朋友圈
4. 保留原文核心意思
5. 只输出润色后的文案，不要解释`,
  literary: `你是一位朋友圈文案润色专家。请将用户提供的原始文案改写为【文艺清新】风格的朋友圈文案。
要求：
1. 用词优美，有文艺感
2. 可以适当用一些诗意表达
3. 保持简洁，不冗长
4. 保留原文核心意思
5. 只输出润色后的文案，不要解释`,
  humorous: `你是一位朋友圈文案润色专家。请将用户提供的原始文案改写为【幽默有趣】风格的朋友圈文案。
要求：
1. 用轻松搞笑的语气
2. 适当加入网络热词或梗（不要太生僻）
3. 让人看了想笑
4. 保留原文核心意思
5. 只输出润色后的文案，不要解释`,
  professional: `你是一位朋友圈文案润色专家。请将用户提供的原始文案改写为【简约高级】风格的朋友圈文案。
要求：
1. 用词简洁精炼
2. 干净利落，不啰嗦
3. 高级感，克制不炫耀
4. 保留原文核心意思
5. 只输出润色后的文案，不要解释`,
  emotional: `你是一位朋友圈文案润色专家。请将用户提供的原始文案改写为【感性emo】风格的朋友圈文案。
要求：
1. 带有情绪共鸣
2. 淡淡的伤感或感触
5. 只输出润色后的文案，不要解释`,
  inspiration: `你是一位朋友圈文案润色专家。请将用户提供的原始文案改写为【励志正能量】风格的朋友圈文案。
要求：
1. 积极向上，充满能量
2. 鼓舞人心
3. 不鸡汤，不油腻
4. 保留原文核心意思
5. 只输出润色后的文案，不要解释`
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { originalText, style } = event
  
  try {
    // 1. 检查用户今日配额
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    
    const quotaResult = await db.collection('user_quota')
      .where({
        openid: OPENID,
        date: db.command.gte(todayStart)
      })
      .get()
    
    let userQuota
    let usedCount = 0
    
    if (quotaResult.data.length > 0) {
      userQuota = quotaResult.data[0]
      usedCount = userQuota.usedCount || 0
      
      if (usedCount >= DAILY_LIMIT) {
        return {
          success: false,
          message: '今日次数已用完，明天再来吧'
        }
      }
    }
    
    // 2. 敏感词检测（用户输入）
    const sensitiveCheck = await cloud.callFunction({
      name: 'checkSensitive',
      data: {
        text: originalText
      }
    })
    
    if (sensitiveCheck.result && sensitiveCheck.result.hasSensitive) {
      return {
        success: false,
        message: '内容包含敏感信息，请修改后重试'
      }
    }
    
    // 3. 调用AI API生成文案
    const results = await generatePolishedText(originalText, style)
    
    // 4. 对生成结果进行敏感词检测
    for (const result of results) {
      const checkRes = await cloud.callFunction({
        name: 'checkSensitive',
        data: {
          text: result.text
        }
      })
      if (checkRes.result && checkRes.result.hasSensitive) {
        result.text = '[内容已过滤，请重新生成]'
      }
    }
    
    // 5. 更新用户使用计数
    const newUsedCount = usedCount + 1
    if (userQuota) {
      await db.collection('user_quota').doc(userQuota._id).update({
        data: {
          usedCount: newUsedCount,
          updateTime: Date.now()
        }
      })
    } else {
      await db.collection('user_quota').add({
        data: {
          openid: OPENID,
          date: todayStart,
          usedCount: newUsedCount,
          createTime: Date.now(),
          updateTime: Date.now()
        }
      })
    }
    
    // 6. 保存历史记录
    await db.collection('history').add({
      data: {
        openid: OPENID,
        originalText: originalText,
        polishedResults: results,
        createTime: Date.now()
      }
    })
    
    return {
      success: true,
      data: {
        results: results
      }
    }
    
  } catch (error) {
    console.error('润色失败', error)
    return {
      success: false,
      message: '生成失败: ' + error.message
    }
  }
}

// 生成润色文案 - 根据配置选择不同AI
async function generatePolishedText(originalText, style) {
  const model = API_CONFIG.activeModel
  
  switch (model) {
    case 'doubao':
      return generateByDoubao(originalText, style)
    case 'openai':
      return generateByOpenAI(originalText, style)
    case 'qwen':
      return generateByQwen(originalText, style)
    case 'ernie':
      return generateByErnie(originalText, style)
    default:
      throw new Error('未选择有效的AI模型，请检查配置')
  }
}

// 豆包（字节跳动）生成
async function generateByDoubao(originalText, style) {
  const apiKey = API_CONFIG.doubaoApiKey
  if (!apiKey) {
    throw new Error('请先配置豆包API Key')
  }
  
  const systemPrompt = stylePrompts[style] || stylePrompts.casual
  const userPrompt = `原始文案：${originalText}\n\n请帮我润色`
  
  // 火山引擎豆包 API endpoint (v3) - 修复后的正确地址
  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'doubao-lite-32k',
      messages: messages,
      temperature: 0.8
    })
  })
  
  if (!response.ok) {
    throw new Error(`AI API调用失败: ${response.status}`)
  }
  
  const data = await response.json()
  const content = data.choices[0].message.content
  
  // 分割成多条结果（豆包会生成多个选项）
  return splitIntoMultipleResults(content, style)
}

// OpenAI 生成
async function generateByOpenAI(originalText, style) {
  const apiKey = API_CONFIG.openaiApiKey
  if (!apiKey) {
    throw new Error('请先配置OpenAI API Key')
  }
  
  const systemPrompt = `${stylePrompts[style] || stylePrompts.casual}
请给我3个不同的润色结果，每个结果之间用"---"分隔。`
  const userPrompt = `原始文案：${originalText}\n\n请帮我润色出3个不同的版本`
  
  const url = 'https://api.openai.com/v1/chat/completions'
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.8
    })
  })
  
  if (!response.ok) {
    throw new Error(`OpenAI API调用失败: ${response.status}`)
  }
  
  const data = await response.json()
  const content = data.choices[0].message.content
  
  return splitIntoMultipleResults(content, style)
}

// 通义千问（阿里）生成
async function generateByQwen(originalText, style) {
  const apiKey = API_CONFIG.qwenApiKey
  if (!apiKey) {
    throw new Error('请先配置通义千问API Key')
  }
  
  const systemPrompt = `${stylePrompts[style] || stylePrompts.casual}
请给我3个不同的润色结果，每个结果之间用"---"分隔。`
  const userPrompt = `原始文案：${originalText}\n\n请帮我润色出3个不同的版本`
  
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      input: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      },
      parameters: {
        temperature: 0.8
      }
    })
  })
  
  if (!response.ok) {
    throw new Error(`通义千问API调用失败: ${response.status}`)
  }
  
  const data = await response.json()
  const content = data.output.text
  
  return splitIntoMultipleResults(content, style)
}

// 文心一言（百度）生成
async function generateByErnie(originalText, style) {
  const apiKey = API_CONFIG.ernieApiKey
  if (!apiKey) {
    throw new Error('请先配置文心一言API Key')
  }
  
  // 注意：文心一言需要先获取access_token
  // 这里简化处理，实际使用需要参考百度文档进行鉴权
  const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${apiKey}`
  
  const systemPrompt = `${stylePrompts[style] || stylePrompts.casual}
请给我3个不同的润色结果，每个结果之间用"---"分隔。`
  const userPrompt = `原始文案：${originalText}\n\n请帮我润色出3个不同的版本`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8
    })
  })
  
  if (!response.ok) {
    throw new Error(`文心一言API调用失败: ${response.status}`)
  }
  
  const data = await response.json()
  const content = data.result
  
  return splitIntoMultipleResults(content, style)
}

// 将AI输出分割成多个结果
function splitIntoMultipleResults(content, style) {
  // 按分隔符分割
  let splits = content.split(/---|\n\n(?=\d|\[)/)
  
  // 如果没有分隔，尝试按换行分割
  if (splits.length <= 1) {
    splits = content.split(/\n+/)
  }
  
  // 过滤空行，清理每个结果
  const results = splits
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      // 去除编号（如 "1. xxx", "1) xxx", "① xxx"）
      s = s.replace(/^[\d][\.\)\s]*/, '').replace(/^[①②③]\s*/, '')
      return {
        text: s,
        style: style
      }
    })
  
  // 保证最多返回3个结果
  return results.slice(0, 3)
}
