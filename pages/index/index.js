
// index.js
const app = getApp()
const util = require('../../utils/util')

// 预设风格列表
const defaultStyles = [
  { id: 'casual', name: '日常随意', checked: true },
  { id: 'literary', name: '文艺清新', checked: false },
  { id: 'humorous', name: '幽默有趣', checked: false },
  { id: 'professional', name: '简约高级', checked: false },
  { id: 'emotional', name: '伤感文案', checked: false },
  { id: 'inspiration', name: '励志正能量', checked: false }
]

// 风格名称映射
const styleNameMap = {
  casual: '日常随意',
  literary: '文艺清新',
  humorous: '幽默有趣',
  professional: '简约高级',
  emotional: '伤感文案',
  inspiration: '励志正能量'
}

Page({
  data: {
    originalText: '',
    currentLength: 0,
    styles: defaultStyles,
    results: [],
    generating: false,
    quotaInfo: null,
    remaining: 0,
    styleNameMap: styleNameMap
  },

  onLoad: function () {
    this.loadUserQuota()
  },

  onShow: function () {
    // 每次显示页面刷新配额
    this.loadUserQuota()
  },

  // 加载用户配额信息
  loadUserQuota: function() {
    app.getUserQuota().then(res => {
      this.setData({
        quotaInfo: res,
        remaining: res.remaining
      })
    }).catch(err => {
      console.error('获取配额失败', err)
      util.showToast('获取用户信息失败')
    })
  },

  // 监听输入变化
  onInputChange: function(e) {
    const value = e.detail.value
    this.setData({
      originalText: value,
      currentLength: value.length
    })
  },

  // 选择风格
  selectStyle: function(e) {
    const selectedId = e.currentTarget.dataset.id
    const styles = this.data.styles.map(item => {
      item.checked = item.id === selectedId
      return item
    })
    this.setData({
      styles
    })
  },

  // 获取当前选中的风格
  getSelectedStyle: function() {
    const selected = this.data.styles.find(item => item.checked)
    return selected ? selected.id : 'casual'
  },

  // 生成润色文案
  generatePolish: function() {
    const originalText = this.data.originalText.trim()
    if (!originalText) {
      util.showToast('请输入需要润色的文案')
      return
    }

    if (originalText.length < 2) {
      util.showToast('文案太短了，输入多一些吧')
      return
    }

    if (this.data.remaining <= 0) {
      util.showToast('今日次数已用完，明天再来吧')
      return
    }

    const selectedStyle = this.getSelectedStyle()
    
    this.setData({
      generating: true
    })
    util.showLoading('AI生成中...')

    app.polishCopy(originalText, selectedStyle).then(res => {
      util.hideLoading()
      this.setData({
        generating: false,
        results: res.results
      })
      // 刷新配额
      this.loadUserQuota()
      util.showToast('生成成功，点击文案复制', 'success')
    }).catch(err => {
      util.hideLoading()
      this.setData({
        generating: false
      })
      console.error('生成失败', err)
      util.showToast(typeof err === 'string' ? err : '生成失败，请稍后重试')
    })
  },

  // 复制结果
  copyResult: function(e) {
    const text = e.currentTarget.dataset.text
    util.copyToClipboard(text).then(() => {
      util.showToast('复制成功！快去朋友圈粘贴吧', 'success')
      
      // 提示用户跳转到朋友圈
      wx.showModal({
        title: '复制成功',
        content: '已复制到剪贴板，是否打开朋友圈发表？',
        success: (res) => {
          if (res.confirm) {
            // 跳转到朋友圈
            wx.switchTab({
              url: '/pages/my/my'
            })
            // 提示用户操作步骤
            setTimeout(() => {
              util.showToast('点击发现 -> 朋友圈 -> 长按相机发表')
            }, 1000)
          }
        }
      })
    }).catch(() => {
      util.showToast('复制失败，请手动复制')
    })
  }
})
