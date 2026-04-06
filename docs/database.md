
# 数据库设计

## 集合设计

### 1. user_quota (用户配额统计)

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 记录ID |
| openid | string | 用户微信openid |
| date | number | 今日开始时间戳 |
| usedCount | number | 今日已使用次数 |
| createTime | number | 创建时间戳 |
| updateTime | number | 更新时间戳 |

示例记录：
```json
{
  "openid": "xxx",
  "date": 1680028800000,
  "usedCount": 3,
  "createTime": 1680028800000,
  "updateTime": 1680028800000
}
```

### 2. history (历史记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 记录ID |
| openid | string | 用户微信openid |
| originalText | string | 原始文案 |
| polishedResults | array | 润色结果数组 |
| polishedResults[].text | string | 润色后文案 |
| polishedResults[].style | string | 风格ID |
| createTime | number | 创建时间戳 |

示例记录：
```json
{
  "openid": "xxx",
  "originalText": "今天吃了火锅",
  "polishedResults": [
    {
      "text": "火锅到位，快乐翻倍～",
      "style": "casual"
    }
  ],
  "createTime": 1680028800000
}
```

## 权限配置

- `user_quota`: 仅创建者可读写
- `history`: 仅创建者可读写

这样配置保证了用户只能访问自己的配额和历史记录，数据安全。
