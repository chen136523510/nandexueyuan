import 'dotenv/config'

const BASE_URL = process.env.VOLC_BASE_URL
const API_KEY = process.env.VOLC_API_KEY
const MODEL = process.env.VOLC_MODEL

console.log('URL:', BASE_URL)
console.log('Model:', MODEL)
console.log('Key:', API_KEY ? '已配置' : '未配置')
console.log('---')

// 测试 chat/completions
console.log('测试 chat/completions:')
const resp1 = await fetch(`${BASE_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
    temperature: 0.7,
    max_tokens: 200,
    thinking: { type: 'disabled' },
  }),
})
console.log('Status:', resp1.status)
const data1 = await resp1.json()
console.log('Response:', JSON.stringify(data1, null, 2))
