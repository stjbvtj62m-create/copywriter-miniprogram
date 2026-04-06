
// my.js
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    userInfo: {},
    quotaInfo: null,
    remaining: 0
  },

  onLoad: function () {
    // 获取用户信息
    this.getUserInfo()
  },

  onShow: function () {
    // 刷新配额
    this.loadUserQuota()
  },

  // 获取用户信息
  getUserInfo: function () {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: res => {
        this.setData({
          userInfo: res.userInfo
        })
      },
      fail: () => {
        // 用户拒绝授权，使用默认信息
        this.setData({
          userInfo: {
            nickName: '微信用户',
            avatarUrl: ''
          }
        })
      }
    })
  },

  // 加载用户配额
  loadUserQuota: function () {
    app.getUserQuota().then(res => {
      this.setData({
        quotaInfo: res,
        remaining: res.remaining
      })
    }).catch(err => {
      console.error('获取配额失败', err)
    })
  },

  // 打开使用帮助
  openHelp: function () {
    wx.showModal({
      title: '使用帮助',
      content: '1. 在首页输入文案，选择喜欢的风格\n2. 点击开始润色，等待AI生成\n3. 点击你喜欢的文案即可复制\n4. 打开朋友圈，长按相机粘贴发表\n\n每日免费使用 10 次，次日重置',
      showCancel: false
    })
  },

  // 打开API配置说明
  openConfig: function () {
    wx.showModal({
      title: '配置说明',
      content: '需要配置自己的大模型API Key才能使用。\n\n目前支持：豆包、通义千问、文心一言、OpenAI。\n\n配置位置：请打开 miniprogram/config.js 文件，填入你的 API Key 并选择要使用的模型。',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})
