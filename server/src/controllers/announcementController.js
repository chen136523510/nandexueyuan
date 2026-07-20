import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'

// GET /api/announcement - 获取最新版本公告（公开，向后兼容旧 { content, updatedAt } 格式）
export async function getAnnouncement(req, res, next) {
  try {
    const latest = await prisma.version.findFirst({
      orderBy: { date: 'desc' },
    })

    if (!latest) {
      // 无版本记录时返回默认公告
      return success(res, {
        content: '欢迎来到男德学院',
        updatedAt: new Date().toISOString(),
        version: null,
        date: null,
        summary: '',
        updates: [],
        plans: [],
      })
    }

    success(res, {
      content: latest.summary, // 向后兼容：旧前端读 content
      updatedAt: latest.updatedAt,
      version: latest.version,
      date: latest.date,
      summary: latest.summary,
      updates: JSON.parse(latest.updates || '[]'),
      plans: JSON.parse(latest.plans || '[]'),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/announcement/versions - 获取全部版本列表（公开，倒序）
export async function getVersions(req, res, next) {
  try {
    const versions = await prisma.version.findMany({
      orderBy: { date: 'desc' },
    })

    const result = versions.map((v) => ({
      id: v.id,
      version: v.version,
      date: v.date,
      summary: v.summary,
      updates: JSON.parse(v.updates || '[]'),
      plans: JSON.parse(v.plans || '[]'),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }))

    success(res, { versions: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/announcement/versions - 创建新版本（admin+）
export async function createVersion(req, res, next) {
  try {
    const { version, date, summary, updates, plans } = req.body

    if (!version || !version.trim()) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '版本号不能为空', ErrorCode.PARAM_ERROR.httpStatus)
    }
    if (!date) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '日期不能为空', ErrorCode.PARAM_ERROR.httpStatus)
    }

    // 检查版本号唯一
    const exists = await prisma.version.findUnique({ where: { version: version.trim() } })
    if (exists) {
      return fail(res, ErrorCode.PARAM_ERROR.code, `版本号 ${version} 已存在`, ErrorCode.PARAM_ERROR.httpStatus)
    }

    const created = await prisma.version.create({
      data: {
        version: version.trim(),
        date: new Date(date),
        summary: (summary || '').trim(),
        updates: JSON.stringify(updates || []),
        plans: JSON.stringify(plans || []),
      },
    })

    success(res, {
      id: created.id,
      version: created.version,
      date: created.date,
      summary: created.summary,
      updates: JSON.parse(created.updates),
      plans: JSON.parse(created.plans),
    }, '版本已创建')
  } catch (err) {
    next(err)
  }
}

// PUT /api/announcement/versions/:id - 编辑版本（admin+）
export async function updateVersion(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const { version, date, summary, updates, plans } = req.body

    const existing = await prisma.version.findUnique({ where: { id } })
    if (!existing) {
      return fail(res, ErrorCode.NOT_FOUND.code, '版本不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    // 如果改了版本号，检查唯一性
    if (version && version.trim() !== existing.version) {
      const dup = await prisma.version.findUnique({ where: { version: version.trim() } })
      if (dup) {
        return fail(res, ErrorCode.PARAM_ERROR.code, `版本号 ${version} 已存在`, ErrorCode.PARAM_ERROR.httpStatus)
      }
    }

    const updated = await prisma.version.update({
      where: { id },
      data: {
        version: version ? version.trim() : undefined,
        date: date ? new Date(date) : undefined,
        summary: summary !== undefined ? summary.trim() : undefined,
        updates: updates ? JSON.stringify(updates) : undefined,
        plans: plans ? JSON.stringify(plans) : undefined,
      },
    })

    success(res, {
      id: updated.id,
      version: updated.version,
      date: updated.date,
      summary: updated.summary,
      updates: JSON.parse(updated.updates),
      plans: JSON.parse(updated.plans),
    }, '版本已更新')
  } catch (err) {
    next(err)
  }
}

// DELETE /api/announcement/versions/:id - 删除版本（admin+）
export async function deleteVersion(req, res, next) {
  try {
    const id = parseInt(req.params.id)

    const existing = await prisma.version.findUnique({ where: { id } })
    if (!existing) {
      return fail(res, ErrorCode.NOT_FOUND.code, '版本不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    await prisma.version.delete({ where: { id } })
    success(res, null, '版本已删除')
  } catch (err) {
    next(err)
  }
}
