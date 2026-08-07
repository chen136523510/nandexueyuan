import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'

// ===== 德塔视觉小说 存档/进度 =====

// 默认全局进度
function defaultProgress() {
  return {
    unlockedChapters: ['prologue'],
    unlockedCGs: [],
    affinity: {},
    storyVariables: {},
    inventory: [],
  }
}

// 获取全局进度（登录时下发）
export async function getProgress(req, res) {
  try {
    let record = await prisma.gameProgress.findUnique({
      where: { userId: req.user.id },
    })
    if (!record) {
      // 首次进入，自动创建默认进度
      record = await prisma.gameProgress.create({
        data: { userId: req.user.id },
      })
    }
    success(res, {
      unlockedChapters: JSON.parse(record.unlockedChapters),
      unlockedCGs: JSON.parse(record.unlockedCGs),
      affinity: JSON.parse(record.affinity),
      storyVariables: JSON.parse(record.storyVariables),
      inventory: JSON.parse(record.inventory),
      updatedAt: record.updatedAt,
    })
  } catch (err) {
    console.error('[VisualNovel] getProgress error:', err)
    fail(res, ErrorCode.SERVER_ERROR.code, '获取进度失败', ErrorCode.SERVER_ERROR.httpStatus)
  }
}

// 更新全局进度
export async function updateProgress(req, res) {
  try {
    const { unlockedChapters, unlockedCGs, affinity, storyVariables, inventory } = req.body
    const data = {}
    if (Array.isArray(unlockedChapters)) data.unlockedChapters = JSON.stringify(unlockedChapters)
    if (Array.isArray(unlockedCGs)) data.unlockedCGs = JSON.stringify(unlockedCGs)
    if (affinity && typeof affinity === 'object') data.affinity = JSON.stringify(affinity)
    if (storyVariables && typeof storyVariables === 'object') data.storyVariables = JSON.stringify(storyVariables)
    if (Array.isArray(inventory)) data.inventory = JSON.stringify(inventory)

    const record = await prisma.gameProgress.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v])) },
    })
    success(res, {
      unlockedChapters: JSON.parse(record.unlockedChapters),
      unlockedCGs: JSON.parse(record.unlockedCGs),
      affinity: JSON.parse(record.affinity),
      storyVariables: JSON.parse(record.storyVariables),
      inventory: JSON.parse(record.inventory),
      updatedAt: record.updatedAt,
    })
  } catch (err) {
    console.error('[VisualNovel] updateProgress error:', err)
    fail(res, ErrorCode.SERVER_ERROR.code, '更新进度失败', ErrorCode.SERVER_ERROR.httpStatus)
  }
}

// 获取所有存档列表
export async function listSaves(req, res) {
  try {
    const saves = await prisma.gameSave.findMany({
      where: { userId: req.user.id },
      orderBy: { slot: 'asc' },
    })
    success(res, saves.map((s) => ({
      slot: s.slot,
      node: s.node,
      chapter: s.chapter,
      affinity: JSON.parse(s.affinity),
      variables: JSON.parse(s.variables),
      inventory: JSON.parse(s.inventory),
      thumbnail: s.thumbnail,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })))
  } catch (err) {
    console.error('[VisualNovel] listSaves error:', err)
    fail(res, ErrorCode.SERVER_ERROR.code, '获取存档列表失败', ErrorCode.SERVER_ERROR.httpStatus)
  }
}

// 读取指定槽位存档
export async function getSave(req, res) {
  try {
    const slot = parseInt(req.params.slot, 10)
    if (isNaN(slot) || slot < 0 || slot > 10) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '槽位号无效（0-10）', ErrorCode.PARAM_ERROR.httpStatus)
    }
    const save = await prisma.gameSave.findUnique({
      where: { userId_slot: { userId: req.user.id, slot } },
    })
    if (!save) {
      return fail(res, ErrorCode.NOT_FOUND.code, '该槽位无存档', ErrorCode.NOT_FOUND.httpStatus)
    }
    success(res, {
      slot: save.slot,
      node: save.node,
      chapter: save.chapter,
      affinity: JSON.parse(save.affinity),
      variables: JSON.parse(save.variables),
      inventory: JSON.parse(save.inventory),
      thumbnail: save.thumbnail,
      spaceState: JSON.parse(save.spaceState || '{}'), // 空间状态快照（R-035）
      createdAt: save.createdAt,
      updatedAt: save.updatedAt,
    })
  } catch (err) {
    console.error('[VisualNovel] getSave error:', err)
    fail(res, ErrorCode.SERVER_ERROR.code, '读取存档失败', ErrorCode.SERVER_ERROR.httpStatus)
  }
}

// 写入存档（upsert）
export async function writeSave(req, res) {
  try {
    const slot = parseInt(req.params.slot, 10)
    if (isNaN(slot) || slot < 0 || slot > 10) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '槽位号无效（0-10）', ErrorCode.PARAM_ERROR.httpStatus)
    }
    const { node, chapter, affinity, variables, inventory, thumbnail, spaceState } = req.body
    if (!node || !chapter) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '缺少 node 或 chapter', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const save = await prisma.gameSave.upsert({
      where: { userId_slot: { userId: req.user.id, slot } },
      update: {
        node,
        chapter,
        affinity: JSON.stringify(affinity || {}),
        variables: JSON.stringify(variables || {}),
        inventory: JSON.stringify(inventory || []),
        thumbnail: thumbnail || null,
        spaceState: JSON.stringify(spaceState || {}), // 空间状态快照（R-035）
      },
      create: {
        userId: req.user.id,
        slot,
        node,
        chapter,
        affinity: JSON.stringify(affinity || {}),
        variables: JSON.stringify(variables || {}),
        inventory: JSON.stringify(inventory || []),
        thumbnail: thumbnail || null,
        spaceState: JSON.stringify(spaceState || {}), // 空间状态快照（R-035）
      },
    })
    success(res, {
      slot: save.slot,
      node: save.node,
      chapter: save.chapter,
      updatedAt: save.updatedAt,
    }, '存档成功')
  } catch (err) {
    console.error('[VisualNovel] writeSave error:', err)
    fail(res, ErrorCode.SERVER_ERROR.code, '存档失败', ErrorCode.SERVER_ERROR.httpStatus)
  }
}

// 删除存档
export async function deleteSave(req, res) {
  try {
    const slot = parseInt(req.params.slot, 10)
    if (isNaN(slot) || slot < 0 || slot > 10) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '槽位号无效（0-10）', ErrorCode.PARAM_ERROR.httpStatus)
    }
    await prisma.gameSave.deleteMany({
      where: { userId: req.user.id, slot },
    })
    success(res, null, '删除成功')
  } catch (err) {
    console.error('[VisualNovel] deleteSave error:', err)
    fail(res, ErrorCode.SERVER_ERROR.code, '删除存档失败', ErrorCode.SERVER_ERROR.httpStatus)
  }
}
