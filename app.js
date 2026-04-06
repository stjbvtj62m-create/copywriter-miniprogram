
// app.js
const API_CONFIG = require('./config.js')

// OpenAI是否支持Vision（仅当配置了GPT-4V时使用）
const openaiSupportsVision = true

// 基础风格提示词模板
const baseStylePrompts = {
  casual: `【日常随意】风格：
- 口语化，像和朋友聊天一样自然
- 保持轻松随意的语气
- 长度适中，适合朋友圈`,
  literary: `【文艺清新】风格：
- 用词优美，有文艺感
- 可以适当用一些诗意表达
- 保持简洁，不冗长`,
  humorous: `【幽默有趣】风格：
- 用轻松搞笑的语气
- 适当加入网络热词或梗（不要太生僻）
- 让人看了想笑`,
  professional: `【简约高级】风格：
- 用词简洁精炼
- 干净利落，不啰嗦
- 高级感，克制不炫耀`,
  emotional: `【感性emo】风格：
- 带有情绪共鸣
- 淡淡的伤感或感触`,
  inspiration: `【励志正能量】风格：
- 积极向上，充满能量
- 鼓舞人心
- 不鸡汤，不油腻`
}

// 构建系统提示词
function buildSystemPrompt(styleId, hasImage) {
  const styleDesc = baseStylePrompts[styleId] || baseStylePrompts.casual
  
  let prompt = `你是一位朋友圈文案专家。`
  
  if (hasImage) {
    prompt += `用户上传了一张图片，并提供了一些文字描述。请你结合图片内容和文字信息，生成符合${styleDesc}的朋友圈文案。
要求：
1. 先理解图片内容，结合图片场景生成
2. 结合用户提供的文字描述（地点、想法、意图等）
3. 保留用户想要表达的核心意思
4. 请给我3个不同的文案结果，每个结果之间用"---"分隔
5. 只输出文案内容，不要解释图片或说明`
  } else {
    prompt += `请将用户提供的原始文案/意图改写成符合${styleDesc}的朋友圈文案。
要求：
1. 保留用户想要表达的核心意思
2. 请给我3个不同的文案结果，每个结果之间用"---"分隔
3. 只输出文案内容，不要解释`
  }
  
  return prompt
}

// 基础敏感词列表（简化版）
const sensitiveWords = [
  '违禁词', '敏感词', '色情', '赌博', '毒品', '暴力', '恐怖',
  '邪教', '反动', '台独', '港独', '分裂',
  // 用户可以在这里添加更多敏感词
]

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  
  globalData: {
    userInfo: null
  },

  // 获取用户今日剩余次数（本地存储版本）
  getUserQuota: function() {
    return new Promise((resolve, reject) => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().split('T')[0]
        
        // 从本地存储获取今日使用情况
        const quotaKey = `copywriter_quota_${todayStr}`
        const quota = wx.getStorageSync(quotaKey) || { usedCount: 0 }
        
        const remaining = Math.max(0, API_CONFIG.DAILY_LIMIT - (quota.usedCount || 0))
        
        resolve({
          usedCount: quota.usedCount || 0,
          remaining: remaining,
          limit: API_CONFIG.DAILY_LIMIT
        })
      } catch (err) {
        reject(err)
      }
    })
  },

  // 增加使用计数（本地存储版本）
  incrementQuota: function() {
    return new Promise((resolve, reject) => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().split('T')[0]
        
        const quotaKey = `copywriter_quota_${todayStr}`
        const quota = wx.getStorageSync(quotaKey) || { usedCount: 0 }
        
        quota.usedCount = (quota.usedCount || 0) + 1
        quota.updateTime = Date.now()
        
        wx.setStorageSync(quotaKey, quota)
        
        const remaining = Math.max(0, API_CONFIG.DAILY_LIMIT - quota.usedCount)
        
        resolve({
          usedCount: quota.usedCount,
          remaining: remaining,
          limit: API_CONFIG.DAILY_LIMIT
        })
      } catch (err) {
        reject(err)
      }
    })
  },

  // 敏感词检测（前端简化版）
  checkSensitive: function(text) {
    const lowerText = text.toLowerCase()
    for (const word of sensitiveWords) {
      if (lowerText.includes(word.toLowerCase())) {
        return {
          hasSensitive: true,
          word: word
        }
      }
    }
    return {
      hasSensitive: false
    }
  },

  // 调用AI润色文案（前端直接调用版本）
  polishCopy: function(originalText, style, imageBase64 = '') {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. 检查配额
        const quota = await this.getUserQuota()
        if (quota.remaining <= 0) {
          reject('今日次数已用完，明天再来吧')
          return
        }

        // 2. 敏感词检测（用户输入）
        const sensitiveCheck = this.checkSensitive(originalText)
        if (sensitiveCheck.hasSensitive) {
          reject('内容包含敏感信息，请修改后重试')
          return
        }

        // 3. 调用AI API生成文案
        let results
        try {
          results = await this.generatePolishedText(originalText, style, imageBase64)
        } catch (apiErr) {
          reject(apiErr.message || 'API调用失败: ' + apiErr)
          return
        }

        // 4. 对生成结果进行敏感词检测
        for (const result of results) {
          const checkRes = this.checkSensitive(result.text)
          if (checkRes.hasSensitive) {
            result.text = '[内容已过滤，请重新生成]'
          }
        }

        // 5. 更新用户使用计数
        await this.incrementQuota()

        resolve({
          results: results
        })

      } catch (error) {
        console.error('润色失败', error)
        reject(typeof error === 'string' ? error : '生成失败: ' + error.message)
      }
    })
  },

  // 生成润色文案 - 根据配置选择不同AI
  async generatePolishedText(originalText, style, imageBase64 = '') {
    const model = API_CONFIG.activeModel
    
    switch (model) {
      case 'doubao':
        return this.generateByDoubao(originalText, style, imageBase64)
      case 'openai':
        return this.generateByOpenAI(originalText, style, imageBase64)
      case 'qwen':
        return this.generateByQwen(originalText, style, imageBase64)
      case 'ernie':
        return this.generateByErnie(originalText, style, imageBase64)
      default:
        throw new Error('未选择有效的AI模型，请检查config.js配置')
    }
  },

  // 豆包（字节跳动）生成 - 支持多模态图片输入
  async generateByDoubao(originalText, style, imageBase64 = '') {
    const apiKey = API_CONFIG.doubaoApiKey
    if (!apiKey) {
      throw new Error('请先在config.js中配置豆包API Key')
    }
    
    const systemPrompt = this.buildSystemPromptWithImage(style, !!imageBase64)
    
    // 豆包 API endpoint (火山引擎) - coding plan
    const url = 'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions'
    
    let messages
    let modelId
    if (imageBase64) {
      // 多模态消息格式 - 包含图片和文本，使用vision模型
      modelId = 'Doubao-Seed-2.0-pro'
      const textContent = originalText 
        ? `请根据这张图片和我的描述生成朋友圈文案：${originalText}`
        : '请根据这张图片生成合适的朋友圈文案'
      
      // 检查base64是否已经有data前缀
      let imageUrl = imageBase64
      if (!imageBase64.startsWith('data:')) {
        imageUrl = `data:image/jpeg;base64,${imageBase64}`
      }
      
      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            {
              type: 'text',
              text: textContent
            },
            {
              type: 'image_url',
              image_url: imageUrl
            }
          ]
        }
      ]
    } else {
      // 纯文本模式，使用文本模型
      modelId = 'doubao-seed-2.0-code'
      const userPrompt = originalText 
        ? `原始文案/意图：${originalText}\n\n请帮我润色生成`
        : '请帮我生成朋友圈文案'
      
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
    
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: 'POST',
        data: {
          model: modelId,
          messages: messages,
          temperature: 0.8
        },
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            console.error('API错误响应', res)
            reject(new Error(`AI API调用失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error('网络请求失败: ' + err.errMsg))
        }
      })
    })
    
    const data = await response
    const content = data.choices[0].message.content
    
    // 分割成多条结果
    return this.splitIntoMultipleResults(content, style)
  },

  // OpenAI 生成
  async generateByOpenAI(originalText, style, imageBase64 = '') {
    const apiKey = API_CONFIG.openaiApiKey
    if (!apiKey) {
      throw new Error('请先在config.js中配置OpenAI API Key')
    }
    
    const systemPrompt = this.buildSystemPromptWithImage(style, !!imageBase64)
    const hasImage = !!imageBase64
    
    let messages
    if (imageBase64 && openaiSupportsVision) {
      // 支持Vision模型的多模态调用
      const textContent = originalText 
        ? `请根据这张图片和描述生成朋友圈文案：${originalText}`
        : '请根据这张图片生成朋友圈文案'
      
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: textContent },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ]
    } else {
      // 纯文本模式
      const userPrompt = originalText 
        ? `原始文案/意图：${originalText}\n\n请帮我润色生成`
        : '请帮我生成朋友圈文案'
      
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
    
    const url = 'https://api.openai.com/v1/chat/completions'
    
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: 'POST',
        data: {
          model: imageBase64 ? 'gpt-4-vision-preview' : 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.8,
          max_tokens: 1000
        },
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(`OpenAI API调用失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error('网络请求失败: ' + err.errMsg))
        }
      })
    })
    
    const data = await response
    const content = data.choices[0].message.content
    
    return this.splitIntoMultipleResults(content, style)
  },

  // 通义千问（阿里）生成
  async generateByQwen(originalText, style, imageBase64 = '') {
    const apiKey = API_CONFIG.qwenApiKey
    if (!apiKey) {
      throw new Error('请先在config.js中配置通义千问API Key')
    }
    
    const systemPrompt = this.buildSystemPromptWithImage(style, !!imageBase64)
    const userPrompt = originalText 
      ? `原始文案/意图：${originalText}\n\n请帮我润色生成`
      : '请帮我生成朋友圈文案'
    
    const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: 'POST',
        data: {
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
        },
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
              reject(new Error(`通义千问API调用失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error('网络请求失败: ' + err.errMsg))
        }
      })
    })
    
    const data = await response
    const content = data.output.text
    
    return this.splitIntoMultipleResults(content, style)
  },

  // 文心一言（百度）生成
  async generateByErnie(originalText, style, imageBase64 = '') {
    const apiKey = API_CONFIG.ernieApiKey
    if (!apiKey) {
      throw new Error('请先在config.js中配置文心一言API Key')
    }
    
    const systemPrompt = this.buildSystemPromptWithImage(style, !!imageBase64)
    const userPrompt = originalText 
      ? `原始文案/意图：${originalText}\n\n请帮我润色生成`
      : '请帮我生成朋友圈文案'
    
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${apiKey}`
    
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: 'POST',
        data: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8
        },
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(`文心一言API调用失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error('网络请求失败: ' + err.errMsg))
        }
      })
    })
    
    const data = await response
    const content = data.result
    
    return this.splitIntoMultipleResults(content, style)
  },

  // 构建带图片支持的系统提示词
  buildSystemPromptWithImage: function(style, hasImage) {
    return buildSystemPrompt(style, hasImage)
  },

  // 将AI输出分割成多个结果
  splitIntoMultipleResults(content, style) {
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
})
