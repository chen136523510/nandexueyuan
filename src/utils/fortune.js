/**
 * 今日运势 · 星河问
 *
 * 纯前端确定性生成：同一天 + 同一 seedKey 结果恒定，跨天自动换签。
 * 不调 LLM、零成本、秒开；后续如需 AI 个性化版可在 FortuneCard 换数据源。
 */

// ===== 确定性伪随机 =====

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 本地日期 YYYY-MM-DD（运势按自然日轮换，不以凌晨 UTC 为界）
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pickMany(rng, arr, n) {
  const pool = [...arr]
  const out = []
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  }
  return out
}

// ===== 星座 =====

// 边界日：星座交替月的临界日号（月份 -> 该月起始星座的分界日）
const ZODIAC_CUT = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22]
// 每月最大日号（2月按平年28天收口，登记闰日29按双鱼处理不误伤）
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function zodiacFromMonthDay(month, day) {
  const m = Number(month)
  const d = Number(day)
  if (!m || !d || m < 1 || m > 12 || d < 1 || d > MONTH_DAYS[m - 1]) return -1
  // ZODIACS 顺序从白羊座（3月）起，换算成数组下标（已用 17 个边界日期 node 实测验证）
  return (d < ZODIAC_CUT[m - 1] ? m + 8 : m + 9) % 12
}

export const ZODIACS = [
  { name: '白羊座', range: '3.21 - 4.19', icon: '♈', blurb: '行动力满分，冷静值感人。想到就做，做完就悔。' },
  { name: '金牛座', range: '4.20 - 5.20', icon: '♉', blurb: '稳如老狗，饿如饿狼。为了吃可以奋斗，为了床可以放弃奋斗。' },
  { name: '双子座', range: '5.21 - 6.21', icon: '♊', blurb: '一人分饰两角，自问自答，自洽自和解。' },
  { name: '巨蟹座', range: '6.22 - 7.22', icon: '♋', blurb: '外表硬壳内心软，emo 收集器，深夜重灾户。' },
  { name: '狮子座', range: '7.23 - 8.22', icon: '♌', blurb: '王之自信，朋友圈的主角，群里的气氛担当。' },
  { name: '处女座', range: '8.23 - 9.22', icon: '♍', blurb: '细节控晚期，看到没对齐的东西就想伸手掰正。' },
  { name: '天秤座', range: '9.23 - 10.23', icon: '♎', blurb: '选择困难十级学者，中午吃什么乃人生终极难题。' },
  { name: '天蝎座', range: '10.24 - 11.22', icon: '♏', blurb: '外冷内热，记仇小本本从不离身。' },
  { name: '射手座', range: '11.23 - 12.21', icon: '♐', blurb: '自由是氧气，快乐是主业，其他都是副业。' },
  { name: '摩羯座', range: '12.22 - 1.19', icon: '♑', blurb: '卷王本王，连摸鱼都摸得比别人有规划。' },
  { name: '水瓶座', range: '1.20 - 2.18', icon: '♒', blurb: '脑回路清奇，和地球时差两光年。' },
  { name: '双鱼座', range: '2.19 - 3.20', icon: '♓', blurb: '浪漫过敏体质，梦里啥都有。' },
]

// ===== 文案库（男德学院风味） =====

const YI_POOL = [
  '摸鱼', '开摆', '装死', '水群', '午睡', '点外卖', '泡枸杞', '逛师德墙',
  '找男德通唠嗑', '给院长写信', '看词云', '存档', '原谅自己', '擦桌子', '深呼吸', '早点躺下',
]

const JI_POOL = [
  '上班认真', '秒回"收到"', '开会抢答', '加班', '跑步', '早八', '立 flag', '双排',
  '卸载又重装', '深夜 emo', '和人对线', '查余额', '翻旧账', '熬夜修仙', '空想', '当显眼包',
]

const VERSE_POOL = [
  '今日宜装死，万事皆可拖。',
  '摸鱼不是懈怠，是战略性节能。',
  '大凶之外，皆是坦途。',
  '上班的尽头是下班，下班的尽头是快乐。',
  '别慌，月亮也在白天的天上挂着。',
  '少刷一分钟手机，多睡一分钟觉——做不到就算了。',
  '今天不立 flag，明天不倒 flag。',
  '心静自然凉，心摆自然顺。',
  '遇事不决，先吃顿饭。',
  '贵人就在群里，水两句就出现了。',
  '运势仅供参考，摸鱼全靠自觉。',
  '退一步海阔天空——建议先退一步。',
]

const LUCKY_COLORS = [
  { name: '鼠尾草绿', hex: '#7d9b76' },
  { name: '暖赭金', hex: '#c8a06a' },
  { name: '米白', hex: '#f2ede4' },
  { name: '青灰', hex: '#8a9ba8' },
  { name: '豆沙粉', hex: '#c48f93' },
  { name: '雾霾蓝', hex: '#7f9bb3' },
  { name: '深墨绿', hex: '#35483a' },
  { name: '落日橘', hex: '#d9885f' },
  { name: '藕紫', hex: '#9c8aa5' },
  { name: '石墨灰', hex: '#5a5f5a' },
]

// 星座今日关键词：按综合指数落档，人人都爱"大顺"
const ZODIAC_MOODS = [
  { min: 90, word: '大顺' },
  { min: 75, word: '顺' },
  { min: 60, word: '小顺' },
  { min: 45, word: '平' },
  { min: 30, word: '小起伏' },
  { min: 0, word: '起伏' },
]

// ===== 生成器 =====

/**
 * 个人今日运势（每人每天一份，seed = 日期 + 用户标识）
 */
export function getPersonalFortune(seedKey) {
  const rng = mulberry32(hashString(todayKey() + '|' + (seedKey || 'guest')))
  return {
    date: todayKey(),
    stars: 2 + Math.floor(rng() * 4), // 2~5 星，偏中高更讨喜
    luckyNumber: 1 + Math.floor(rng() * 36),
    luckyColor: LUCKY_COLORS[Math.floor(rng() * LUCKY_COLORS.length)],
    yi: pickMany(rng, YI_POOL, 2),
    ji: pickMany(rng, JI_POOL, 2),
    verse: VERSE_POOL[Math.floor(rng() * VERSE_POOL.length)],
    lucks: [
      { label: '摸鱼运', value: 40 + Math.floor(rng() * 59) },
      { label: '水群运', value: 40 + Math.floor(rng() * 59) },
      { label: '财运', value: 40 + Math.floor(rng() * 59) },
    ],
  }
}

/**
 * 星座今日运势（同星座全站一致，符合"星座运势"的公共属性）
 */
export function getZodiacToday(zodiacIndex) {
  const z = ZODIACS[zodiacIndex]
  const rng = mulberry32(hashString(todayKey() + '|' + z.name))
  const overall = 40 + Math.floor(rng() * 59)
  const mood = ZODIAC_MOODS.find((m) => overall >= m.min)
  return {
    name: z.name,
    icon: z.icon,
    blurb: z.blurb,
    overall,
    moodWord: mood.word,
    lucks: [
      { label: '修仙运', value: 40 + Math.floor(rng() * 59) },
      { label: '桃花运', value: 40 + Math.floor(rng() * 59) },
      { label: '开黑运', value: 40 + Math.floor(rng() * 59) },
    ],
  }
}
