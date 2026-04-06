// ======================================
// ===== 用户需要在这里配置API Key ======
// ======================================
const API_CONFIG = {
  // 可选：字节跳动豆包 API Key（推荐，价格便宜，国内访问快）
  doubaoApiKey: '$OPENCLAW_VOLC_API_KEY',
  // 可选：OpenAI API Key
  openaiApiKey: '',
  // 可选：通义千问 API Key（阿里）
  qwenApiKey: '',
  // 可选：文心一言 API Key（百度）
  ernieApiKey: '',
  // 当前选择使用的AI模型
  // 可选值: doubao, openai, qwen, ernie
  activeModel: 'doubao',
  // 每日免费使用次数限制
  DAILY_LIMIT: 10
}

module.exports = API_CONFIG
