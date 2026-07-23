import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// ===== 图片上传配置（磁盘存储）=====
const uploadDir = path.resolve('uploads/wall')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

export const wallUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `wall_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 jpg/png/webp/gif 格式'))
    }
  },
})

// ===== 辅助函数 =====

// 查单条动态并附带关联数据
async function buildPost(postId, currentUserId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, username: true, nickname: true, avatar: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, username: true, nickname: true, avatar: true } } },
      },
      likes: { select: { userId: true } },
    },
  })
  if (!post) return null

  return {
    id: post.id,
    content: post.content,
    image: post.image,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    commentCount: post.comments.length,
    likeCount: post.likes.length,
    liked: currentUserId ? post.likes.some((l) => l.userId === currentUserId) : false,
    comments: post.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: c.author,
    })),
  }
}

// ===== API =====

// GET /api/wall/posts - 动态列表（倒序）
export async function listPosts(req, res, next) {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, nickname: true, avatar: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, username: true, nickname: true, avatar: true } } },
        },
        likes: { select: { userId: true } },
      },
    })

    const result = posts.map((post) => ({
      id: post.id,
      content: post.content,
      image: post.image,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      commentCount: post.comments.length,
      likeCount: post.likes.length,
      liked: req.user ? post.likes.some((l) => l.userId === req.user.id) : false,
      comments: post.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: c.author,
      })),
    }))

    success(res, { posts: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/wall/posts - 发布动态（需登录）
export async function createPost(req, res, next) {
  try {
    const content = (req.body.content || '').trim()
    const image = req.file ? `/uploads/wall/${req.file.filename}` : null

    if (!content && !image) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '请输入文字或上传图片', ErrorCode.PARAM_ERROR.httpStatus)
    }
    if (content.length > 500) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '文字不能超过 500 字', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const post = await prisma.post.create({
      data: { authorId: req.user.id, content, image },
    })

    const result = await buildPost(post.id, req.user.id)
    success(res, result, '发布成功')
  } catch (err) {
    next(err)
  }
}

// DELETE /api/wall/posts/:id - 删除动态（作者或管理员）
export async function deletePost(req, res, next) {
  try {
    const post = await prisma.post.findUnique({ where: { id: Number(req.params.id) } })
    if (!post) {
      return fail(res, ErrorCode.NOT_FOUND.code, '动态不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    const isAuthor = post.authorId === req.user.id
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role)
    if (!isAuthor && !isAdmin) {
      return fail(res, ErrorCode.FORBIDDEN.code, '无权删除他人的动态', ErrorCode.FORBIDDEN.httpStatus)
    }

    // 删除关联图片文件
    if (post.image) {
      const filePath = path.resolve(`.${post.image}`)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    await prisma.post.delete({ where: { id: post.id } })
    success(res, null, '删除成功')
  } catch (err) {
    next(err)
  }
}

// POST /api/wall/posts/:id/comments - 发表评论（需登录）
export async function createComment(req, res, next) {
  try {
    const content = (req.body.content || '').trim()
    if (!content) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '评论内容不能为空', ErrorCode.PARAM_ERROR.httpStatus)
    }
    if (content.length > 500) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '评论不能超过 500 字', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const postId = Number(req.params.id)
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return fail(res, ErrorCode.NOT_FOUND.code, '动态不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    const comment = await prisma.comment.create({
      data: { postId, authorId: req.user.id, content },
      include: { author: { select: { id: true, username: true, nickname: true, avatar: true } } },
    })

    success(res, {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.author,
    }, '评论成功')
  } catch (err) {
    next(err)
  }
}

// DELETE /api/wall/comments/:id - 删除评论（作者或管理员）
export async function deleteComment(req, res, next) {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: Number(req.params.id) } })
    if (!comment) {
      return fail(res, ErrorCode.NOT_FOUND.code, '评论不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    const isAuthor = comment.authorId === req.user.id
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role)
    if (!isAuthor && !isAdmin) {
      return fail(res, ErrorCode.FORBIDDEN.code, '无权删除他人的评论', ErrorCode.FORBIDDEN.httpStatus)
    }

    await prisma.comment.delete({ where: { id: comment.id } })
    success(res, null, '删除成功')
  } catch (err) {
    next(err)
  }
}

// POST /api/wall/posts/:id/like - 点赞（需登录）
export async function likePost(req, res, next) {
  try {
    const postId = Number(req.params.id)
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return fail(res, ErrorCode.NOT_FOUND.code, '动态不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    await prisma.like.upsert({
      where: { postId_userId: { postId, userId: req.user.id } },
      update: {},
      create: { postId, userId: req.user.id },
    })

    const likeCount = await prisma.like.count({ where: { postId } })
    success(res, { liked: true, likeCount }, '点赞成功')
  } catch (err) {
    next(err)
  }
}

// DELETE /api/wall/posts/:id/like - 取消点赞（需登录）
export async function unlikePost(req, res, next) {
  try {
    const postId = Number(req.params.id)

    await prisma.like.deleteMany({
      where: { postId, userId: req.user.id },
    })

    const likeCount = await prisma.like.count({ where: { postId } })
    success(res, { liked: false, likeCount }, '取消点赞')
  } catch (err) {
    next(err)
  }
}
