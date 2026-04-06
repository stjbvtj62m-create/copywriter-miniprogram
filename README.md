
# 朋友圈文案润色小程序 (纯前端无云开发版)

基于纯前端微信小程序的AI朋友圈文案润色，不需要云开发，不需要后端服务器，直接配置API Key即可使用。

## 📋 项目介绍

这是一个MVP版本，只包含P0核心功能：
- 用户输入原始文案，选择风格
- AI生成多个润色结果
- 点击复制，直接提示跳转到朋友圈
- 每日免费使用限制（10次，本地存储）
- 敏感词过滤（前端基础版）

**本版本改造说明：** 由于用户无法开通微信云开发，改造为纯前端版本，直接在前端调用AI API，不需要任何后端服务。

## 🚀 快速开始

### 1. 环境准备

1. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 你需要有一个微信小程序账号，AppID已经配置：`wxfd03c690687b9ce6`
3. **不需要开通云开发**，纯前端运行

### 2. 导入项目

1. 打开微信开发者工具
2. 选择「导入项目」
3. 选择本项目目录：`copywriter-miniprogram`
4. AppID 已经自动配置好，点击导入

### 3. 配置AI API Key

打开 `miniprogram/config.js` 文件，找到配置区域：

```javascript
// ======================================
// ===== 用户需要在这里配置API Key ======
// ======================================
const API_CONFIG = {
  // 可选：字节跳动豆包 API Key
  doubaoApiKey: '',
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
```

填写你自己的 API Key，并选择要使用的 `activeModel`。

**推荐：** 使用字节跳动豆包，价格便宜，速度快，适合国内网络环境。

### 4. 配置服务器域名

在微信公众平台 → 开发 → 开发设置 → 服务器域名，添加以下域名（根据你使用的模型添加）：

- **豆包：** `https://aquasearch.ai.bytedance.net`
- **OpenAI：** `https://api.openai.com`
- **通义千问：** `https://dashscope.aliyuncs.com`
- **文心一言：** `https://aip.baidubce.com`

添加request合法域名之后，就可以正常使用了。

完成！不需要其他任何配置，直接编译运行即可。

## 🏗️ 项目结构

```
copywriter-miniprogram/
├── miniprogram/                  # 小程序前端代码
│   ├── pages/
│   │   ├── index/              # 首页（润色功能）
│   │   └── my/                # 我的页面
│   ├── utils/                   # 工具函数
│   ├── config.js               # API配置文件（用户需要修改这里）
│   ├── app.js                  # 小程序入口（包含完整AI调用逻辑）
│   ├── app.json                # 小程序配置
│   └── app.wxss                # 全局样式
├── cloudfunctions/              # 云函数目录（已不再需要，保留仅供参考）
├── project.config.json         # 项目配置
└── README.md                   # 说明文档
```

## ✨ 功能说明

### P0功能（已全部保留）
- [x] 首页文案输入，字数统计
- [x] **六种风格选择保持不变：** 日常随意、文艺清新、幽默有趣、简约高级、伤感文案、励志正能量
- [x] AI生成多个润色结果
- [x] 点击文案一键复制
- [x] 复制后提示跳转到朋友圈
- [x] 每日次数限制（10次/天）→ 改用本地存储（wx.setStorageSync）
- [x] 敏感词过滤（前端基础版）
- [x] 支持多种大模型API（豆包/OpenAI/通义千问/文心一言）

### 已移除的功能（MVP不需要）
- ❌ 历史记录（需要数据库，纯前端版本移除）
- ❌ 云开发依赖（完全移除）

## 📋 改造要点（已完成）

1. ✅ 去掉云数据库和云函数，直接在前端调用火山引擎API
2. ✅ 每日次数限制改用wx.setStorageSync存在本地，按日期存储
3. ✅ 保留所有P0功能不变：输入、风格选择、AI生成、复制、跳转朋友圈
4. ✅ 敏感词过滤简化，前端做基础判断
5. ✅ 移除历史记录功能
6. ✅ 保持原有的6种风格选择，API调用逻辑不变
7. ✅ API Key配置放到config.js，方便用户配置

## 💰 成本说明

- **微信小程序：** 个人开发者可以免费使用
- **AI API费用：** 按调用次数计费，一般来说每调用一次几分钱到一毛钱
- **总体：** 零成本搭建，只有AI API调用费用，非常便宜

## 🌐 支持的AI模型

| 模型 | 厂商 | 获取方式 | 推荐指数 |
|------|------|----------|---------|
| 豆包 | 字节跳动 | https://www.doubao.com/ | ⭐⭐⭐⭐⭐ |
| 通义千问 | 阿里 | https://dashscope.aliyun.com/ | ⭐⭐⭐⭐ |
| 文心一言 | 百度 | https://cloud.baidu.com/ | ⭐⭐⭐⭐ |
| OpenAI | OpenAI | https://platform.openai.com/ | ⭐⭐⭐ |

## 📝 更新日志

- v2.0.0 (纯前端版): 改造为无云开发纯前端版本，移除所有后端依赖
- v1.0.0 (云开发MVP): 完成所有P0核心功能开发（基于云开发）

## 📄 License

MIT
