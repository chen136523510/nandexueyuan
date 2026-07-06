/**
 * 知识库：成员信息 + 昵称→真名映射
 * 数据来源: prd/01-需求调研/members.json
 */

// 成员列表
const members = [
  { name: '陈梓键', role: '院长', aliases: ['蛋哥', 'mico', '魔弹', 'modan'], status: '', nicknames: ['我'] },
  { name: '卢沐阳', role: '成员', aliases: ['一哥'], status: '上班', nicknames: ['酸角洲balabala老奴', '卢沐阳'] },
  { name: '陆城锟', role: '成员', aliases: [], status: '', nicknames: ['陆城锟'] },
  { name: '陈楠', role: '成员', aliases: ['波比', '吵闹波比'], status: '', nicknames: ['陈楠'] },
  { name: '庞楷垒', role: '成员', aliases: ['嫖哥', '阿嫖'], status: '', nicknames: ['庞楷垒'] },
  { name: '陈睿', role: '成员', aliases: ['re哥', '睿哥', '睿总'], status: '', nicknames: ['玩洲的下辈子也完了', '准研究生'] },
  { name: '饶志锐', role: '成员', aliases: ['饶哥', '情书'], status: '', nicknames: ['饶志锐', '蛋克蛋尼克'] },
  { name: '陈俊杰', role: '成员', aliases: ['班长', '班大哥'], status: '', nicknames: ['人间猫猫黄礼志', '陈俊杰'] },
  { name: '宁浩然', role: '成员', aliases: ['宁总'], status: '', nicknames: ['宁浩然'] },
  { name: '汪煜坤', role: '成员', aliases: ['汪哥', '路明明', '🦌将军'], status: '', nicknames: ['睿爹小儿', '汪煜坤'] },
  { name: '袁崇轩', role: '成员', aliases: ['b哥', 'b大哥'], status: '', nicknames: ['袁崇轩'] },
  { name: '邹志华', role: '成员', aliases: ['华哥'], status: '', nicknames: ['邹志华'] },
  { name: '丘序明', role: '成员', aliases: ['丘哥', '丘比', '禀心寒霜', '四季'], status: '本科山大，现待业在家，在北京逗留一段时间，现在在深圳，预计读港科', nicknames: ['蒸糯re鸽', '不玩游戏', '魔弹仙君'] },
  { name: '徐浩森', role: '成员', aliases: [], status: '', nicknames: ['徐浩森'] },
  { name: '谌礼鹏', role: '成员', aliases: [], status: '', nicknames: ['两弹元勋林黛玉'] },
  { name: '朱宇涵', role: '成员', aliases: ['朱哥'], status: '', nicknames: ['朱宇涵'] },
  { name: '王乐添', role: '成员', aliases: ['体委'], status: '香港就业', nicknames: ['优质单马', '优质单男'] },
  { name: '黄学远', role: '成员', aliases: ['冷发'], status: '', nicknames: ['失败的人生', '🤡'] },
  { name: '马逸杰', role: '成员', aliases: ['马哥', '巴拉巴拉', 'balabala'], status: '澳洲留学', nicknames: ['马逸杰'] },
  { name: '张迅', role: '成员', aliases: [], status: '迅宝', nicknames: ['张迅'] },
  { name: '魏嘉豪', role: '成员', aliases: ['wjh', '天空蓝'], status: '', nicknames: ['魏嘉豪'] },
]

// 昵称→真名 映射表
const nicknameToName = {}
for (const m of members) {
  for (const nick of m.nicknames) {
    nicknameToName[nick] = m.name
  }
  // 真名也映射到自己
  nicknameToName[m.name] = m.name
}

/**
 * 将群昵称转换为真名
 * @param {string} nickname 群昵称
 * @returns {string} 真名（未找到则返回原昵称）
 */
export function resolveName(nickname) {
  if (!nickname) return nickname
  return nicknameToName[nickname] || nickname
}

/**
 * 构建成员知识库文本（注入 system prompt）
 */
export function buildMemberKnowledge() {
  const lines = members.map((m, i) => {
    const parts = [`${i + 1}. ${m.name}（${m.role}）`]
    if (m.aliases.length) parts.push(`外号：${m.aliases.join('、')}`)
    if (m.status) parts.push(`现状：${m.status}`)
    if (m.nicknames.length && m.nicknames[0] !== m.name) {
      parts.push(`群昵称：${m.nicknames.join('、')}`)
    }
    return parts.join('。')
  })
  return lines.join('\n')
}

export { members }
