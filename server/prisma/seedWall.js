import prisma from '../src/lib/prisma.js'
import fs from 'fs'
import path from 'path'

// 师德墙默认动态：名人名言 + 丘序明
// 图片从 uploads/wall-seed/ 复制到 uploads/wall/
// 作者统一使用系统管理员（_system），避免误认为某个具体用户
const seedPosts = [
  {
    author: '_system',
    content: '想象力比知识更重要。知识是有限的，而想象力概括着世界上的一切，推动着进步，并且是知识进化的源泉。',
    imageSrc: 'wall-seed/einstein.jpg',
  },
  {
    author: '_system',
    content: '如果我看得更远，那是因为我站在巨人的肩膀上。',
    imageSrc: 'wall-seed/newton.jpg',
  },
  {
    author: '_system',
    content: '低迷。',
    imageSrc: 'wall-seed/qiuming.jpg',
  },
]

async function main() {
  const wallDir = path.resolve('uploads/wall')
  if (!fs.existsSync(wallDir)) {
    fs.mkdirSync(wallDir, { recursive: true })
  }

  // 检查是否已有种子数据（防止重复插入）
  const existing = await prisma.post.count()
  if (existing > 0) {
    console.log(`师德墙已有 ${existing} 条动态，跳过种子数据`)
    return
  }

  for (const item of seedPosts) {
    const user = await prisma.user.findUnique({ where: { username: item.author } })
    if (!user) {
      console.log(`用户 ${item.author} 不存在，跳过`)
      continue
    }

    // 复制图片
    const srcPath = path.resolve('uploads', item.imageSrc)
    let imagePath = null
    if (fs.existsSync(srcPath)) {
      const ext = path.extname(item.imageSrc)
      const filename = `seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      const destPath = path.join(wallDir, filename)
      fs.copyFileSync(srcPath, destPath)
      imagePath = `/uploads/wall/${filename}`
    }

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        content: item.content,
        image: imagePath,
      },
    })
    console.log(`  ✓ ${item.author}: "${item.content.slice(0, 20)}..." -> post #${post.id}`)
  }

  console.log('师德墙种子数据完成')
}

main()
  .catch((e) => {
    console.error('种子数据失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
