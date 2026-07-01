import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma.js'

// 成员名册：username 全拼，密码统一 nande666
const members = [
  { username: 'chenzijian',  nickname: '陈梓键', role: 'super_admin' },
  { username: 'lumuyang',    nickname: '卢沐阳', role: 'member' },
  { username: 'luchengkun',  nickname: '陆城锟', role: 'member' },
  { username: 'chennan',     nickname: '陈楠',   role: 'member' },
  { username: 'pangkailei',  nickname: '庞楷垒', role: 'member' },
  { username: 'qiuxuming',   nickname: '丘序明', role: 'member' },
  { username: 'raozhirui',   nickname: '饶志锐', role: 'member' },
  { username: 'chenjunjie',  nickname: '陈俊杰', role: 'member' },
  { username: 'ninghaoran',  nickname: '宁浩然', role: 'member' },
  { username: 'wangyukun',   nickname: '汪煜坤', role: 'member' },
  { username: 'yuanchongxuan', nickname: '袁崇轩', role: 'member' },
  { username: 'zouzhihua',   nickname: '邹志华', role: 'member' },
  { username: 'chenrui',     nickname: '陈睿',   role: 'member' },
  { username: 'xuhaosen',    nickname: '徐浩森', role: 'member' },
  { username: 'shenlipeng',  nickname: '谌礼鹏', role: 'member' },
  { username: 'zhuyuhan',    nickname: '朱宇涵', role: 'member' },
  { username: 'wangletian',  nickname: '王乐添', role: 'member' },
  { username: 'huangxueyuan', nickname: '黄学远', role: 'member' },
  { username: 'mayijie',     nickname: '马逸杰', role: 'member' },
  { username: 'zhangxun',    nickname: '张迅',   role: 'member' },
  { username: 'weijiahao',   nickname: '魏嘉豪', role: 'member' },
]

async function main() {
  const passwordHash = bcrypt.hashSync('nande666', 10)

  for (const m of members) {
    await prisma.user.upsert({
      where: { username: m.username },
      update: {}, // 已存在不改动（保留院长原密码）
      create: {
        username: m.username,
        passwordHash: m.role === 'super_admin' ? bcrypt.hashSync('admin123456', 10) : passwordHash,
        nickname: m.nickname,
        role: m.role,
        status: 'active',
      },
    })
  }

  console.log(`Seed 完成: ${members.length} 个账号已就绪`)
  console.log('  院长: chenzijian / admin123456')
  console.log('  其余成员: 对应用户名 / nande666')
}

main()
  .catch((e) => {
    console.error('Seed 失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
