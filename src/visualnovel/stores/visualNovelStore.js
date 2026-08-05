import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildIndex, getNode, getStartNode, applyEffects, getNextNodeId, executeEvent, mergeScript, interpolate } from '../engine/engine.js'
import { NodeType, ChoiceImpact, SPEAKER_TO_ID } from '../engine/types.js'
import { getProgress, updateProgress, listSaves, getSave, writeSave, deleteSave } from '../../api/visualNovel.js'

// 章节注册表（章节 id -> 剧本数据加载器）
// 用动态 import 避免一次性加载所有章节。
// 每个加载器返回 { default: nodes }，其中 nodes 是「逻辑骨架 + 文案」合并后的完整节点数组。
// 文案拆分在 data/scripts/ 下，按幕维护，院长改台词只动 scripts，不碰本目录的逻辑文件。
const CHAPTER_LOADERS = {
  prologue: async () => {
    const [{ default: skeleton }, s1, s2, s3, s4] = await Promise.all([
      import('../data/prologue.js'),
      import('../data/scripts/序章-第一幕-降临.script.js'),
      import('../data/scripts/序章-第二幕-法刺来访.script.js'),
      import('../data/scripts/序章-第三幕-储物发放.script.js'),
      import('../data/scripts/序章-第四幕-自由探索.script.js'),
    ])
    const allScripts = [s1.default, s2.default, s3.default, s4.default].flat()
    return { default: mergeScript(skeleton, allScripts) }
  },
  chapter1: async () => {
    const [{ default: skeleton }, s1] = await Promise.all([
      import('../data/chapter1.js'),
      import('../data/scripts/第一章-幕间-德塔日常.script.js'),
    ])
    const allScripts = [s1.default].flat()
    return { default: mergeScript(skeleton, allScripts) }
  },
}

export const useVisualNovelStore = defineStore('visualNovel', () => {
  // ===== 运行时状态 =====
  const currentIndex = ref(null)       // 当前章节的节点索引 Map
  const currentChapter = ref('prologue')
  const currentNodeId = ref(null)       // 当前节点 id
  const affinity = ref({})              // 好感度 { rui: 0, qiu: 0, ... }
  const storyVariables = ref({})        // 剧情变量
  const unlockedChapters = ref(['prologue'])
  const unlockedCGs = ref([])
  const history = ref([])               // 文本回看历史 [{ speaker, text, nodeId }]
  const choicesMade = ref({})           // 已选过的选项 { nodeId: [choiceIndex, ...] }
  const inventory = ref([])             // 背包物品 id 列表

  // ===== 舞台状态（立绘演出核心） =====
  // 当前「舞台上」在场的角色，跨节点持久化。
  // 解决问题：原方案逐节点独立取 node.characters，导致多人对话时一个出现一个消失。
  // 现在规则：角色登场后持续在场（dim/narrator），直到显式 exit 退场。
  const stage = ref([])                 // [{ id, portrait, position }]，当前在场的角色

  // ===== UI 状态 =====
  const isTyping = ref(false)           // 打字机是否正在播放
  const fullText = ref('')              // 当前节点的完整文本
  const displayedText = ref('')         // 已显示的文本（打字机效果）
  const activePanel = ref(null)         // 当前打开的面板: null | 'save' | 'load' | 'settings' | 'history' | 'map'
  const hideUI = ref(false)             // 是否隐藏界面（按 H 键）
  const isEnded = ref(false)            // 当前章节是否结束
  const isLoading = ref(false)          // 加载状态
  const preloadProgress = ref(0)        // 预加载进度 0~100
  const triggeredCG = ref(null)         // 当前触发的 CG（非 null 时全屏展示）
  const noticeMessage = ref(null)       // 轻提示弹窗消息（非 null 时显示弹窗）

  // ===== 设置 =====
  const textSpeed = ref(30)             // 打字速度（ms/字），越小越快
  const autoMode = ref(false)           // 自动播放
  const autoDelay = ref(2000)           // 自动播放延迟（ms）

  // ===== 计算属性 =====
  const currentNode = computed(() => {
    if (!currentIndex.value || !currentNodeId.value) return null
    return getNode(currentIndex.value, currentNodeId.value)
  })

  // 立绘三态推导（narrator/active/dim），由 speaker 驱动，不依赖数据手写 active
  // 关键：基于「舞台状态」stage（跨节点持久化），而非逐节点 node.characters。
  // 角色一旦登场就持续在场，说话人切换只影响 active/dim，不再一个出现一个消失。
  const currentCharacters = computed(() => {
    const chars = stage.value
    if (chars.length === 0) return []

    const node = currentNode.value
    const speaker = node ? (node.speaker || '') : ''
    const isNarrator = speaker === '旁白'

    const result = chars.map((char) => {
      let state
      if (isNarrator) {
        state = 'narrator'  // 旁白：所有立绘对齐，正常亮度
      } else {
        const speakerId = SPEAKER_TO_ID[speaker]
        state = char.id === speakerId ? 'active' : 'dim'
      }
      return { ...char, state }
    })

    // 按角色 id 固定排序，保证同一场景内角色在 DOM 中的位置恒定
    result.sort((a, b) => a.id.localeCompare(b.id))
    return result
  })

  const currentSpeaker = computed(() => {
    return currentNode.value?.speaker || ''
  })

  const currentBackground = computed(() => {
    return currentNode.value?.background || ''
  })

  const currentBGM = computed(() => {
    return currentNode.value?.bgm || ''
  })

  // 热点区域（仅 end 节点有 hotspots 字段）
  const currentHotspots = computed(() => {
    return currentNode.value?.hotspots || []
  })

  // 地图演出高亮（dialogue 节点的 mapHighlight 字段，值为 locations.js 的地点 key）
  // 有值时 MapPanel 自动弹出并高亮该地点，null 时自动收起
  const currentMapHighlight = computed(() => {
    return currentNode.value?.mapHighlight || null
  })

  // 玩家名称（从剧情变量取，默认"漂泊者"）
  const playerName = computed(() => {
    return storyVariables.value.playerName || '漂泊者'
  })

  // ===== 章节加载 =====

  /**
   * 加载章节剧本数据
   */
  async function loadChapter(chapterId) {
    const loader = CHAPTER_LOADERS[chapterId]
    if (!loader) {
      console.error(`[VisualNovelStore] 未知章节: ${chapterId}`)
      return false
    }
    try {
      const module = await loader()
      const nodes = module.default || module.nodes
      currentIndex.value = buildIndex(nodes)
      currentChapter.value = chapterId
      return true
    } catch (err) {
      console.error(`[VisualNovelStore] 加载章节失败: ${chapterId}`, err)
      return false
    }
  }

  /**
   * 初始化游戏（优先恢复自动存档 slot=0，无则从头开始）
   */
  async function initGame() {
    isLoading.value = true
    try {
      // 拉取服务端进度（好感度/CG/章节解锁/背包，跨存档持久化）
      const res = await getProgress()
      const progress = res.data
      affinity.value = progress.affinity || {}
      storyVariables.value = progress.storyVariables || {}
      unlockedChapters.value = progress.unlockedChapters || ['prologue']
      unlockedCGs.value = progress.unlockedCGs || []
      inventory.value = progress.inventory || []
      stage.value = [] // 重置舞台状态（新开游戏）

      // 加载章节
      await loadChapter('prologue')

      // 预加载所有图片资源（首次进入加载，浏览器缓存后秒出）
      await preloadAssets([...currentIndex.value.values()])

      // 优先读自动存档（slot=0），恢复到上一次进度
      let autoLoaded = false
      try {
        const saveRes = await getSave(0)
        const data = saveRes.data
        // 用存档快照覆盖（存档值比全局进度更精确，是该存档当时的完整状态）
        affinity.value = data.affinity || {}
        storyVariables.value = data.variables || {}
        inventory.value = data.inventory || []
        // 恢复舞台状态（与 loadFromSlot 一致，旧存档无 stage 字段则置空）
        stage.value = Array.isArray(data.stage)
          ? data.stage.map(c => ({ ...c }))
          : []

        // 容错：存档的章节可能跟当前加载的 prologue 不同（如上次玩到第一章）
        let effectiveChapter = 'prologue' // 实际加载的章节（用于日志和提示）
        if (data.chapter && data.chapter !== 'prologue') {
          const chapterLoaded = await loadChapter(data.chapter)
          if (chapterLoaded) {
            currentChapter.value = data.chapter
            effectiveChapter = data.chapter
          } else {
            // 章节加载失败（被删/重命名），留在 prologue
            console.warn(`[VisualNovelStore] 存档章节 ${data.chapter} 不存在，回退到 prologue`)
          }
        }

        // 安全解析节点（存档节点可能在新版中被删/改名，增量更新容错）
        if (currentIndex.value) {
          const safeNode = resolveNodeSafe(currentIndex.value, data.node, effectiveChapter)
          if (safeNode) {
            goToNode(safeNode)
            if (safeNode !== data.node) {
              showNotice('剧本已更新，已从本章开头继续')
            }
            autoLoaded = true
          }
        }
      } catch (e) {
        // 404 无自动存档，走从头开始
      }

      // 无自动存档则定位到章节起始节点
      if (!autoLoaded) {
        const startId = getStartNode([...currentIndex.value.values()])
        if (startId) {
          goToNode(startId)
        }
      }
    } catch (err) {
      console.error('[VisualNovelStore] initGame 失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 预加载章节所有图片资源
   * 遍历节点收集 background + portrait，用 new Image() 预热到浏览器缓存
   * 加载完成后浏览器 HTTP 缓存命中，后续场景切换瞬间显示
   */
  async function preloadAssets(nodes) {
    // 背景图别名映射（与 BackgroundLayer.vue 的 REAL_BG_MAP 一致）
    const BG_ALIAS = { 'bg/tower_lobby': 'bg/tower_interior_hall' }
    const urls = new Set()
    for (const node of nodes) {
      // 收集背景图
      if (node.background) {
        const key = BG_ALIAS[node.background] || node.background
        urls.add(`/visualnovel/${key}.png`)
      }
      // 收集立绘
      if (node.enter && Array.isArray(node.enter)) {
        for (const c of node.enter) {
          const portrait = c.portrait || (c.id + '/normal')
          urls.add(`/visualnovel/portraits/${portrait}.png`)
        }
      }
    }
    // 地图（固定资源）
    urls.add('/visualnovel/map/world_map.png')

    const total = urls.size
    let loaded = 0
    preloadProgress.value = 0

    const loadOne = (url) => new Promise((resolve) => {
      const img = new Image()
      img.onload = img.onerror = () => {
        loaded++
        preloadProgress.value = Math.round((loaded / total) * 100)
        resolve()
      }
      img.src = url
    })

    // 并发预加载（浏览器对同一域名并发限制会自动排队，无需手动分批）
    await Promise.all([...urls].map(loadOne))
  }

  // ===== 节点导航 =====

  /**
   * 应用节点的舞台变更（立绘演出核心）
   *
   * 数据约定（三种写法，向后兼容）：
   *   - node.characters：绝对声明（旧格式）→ stage 重置为该数组，覆盖之前的舞台
   *   - node.enter：增量登场 [{ id, portrait, position }] → 合并入 stage（已有则更新表情/位置）
   *   - node.exit：增量退场 [id] → 从 stage 移除
   *   - 三者都没有 → stage 延续不变（✨核心：解决多人对话来回消失）
   *
   * active 字段忽略（三态由 speaker 运行时推导，见 currentCharacters）
   *
   * @param {object} node - 当前进入的节点
   */
  function applyStageChange(node) {
    // exit 退场优先处理（先退再进，避免同帧进出同角色闪烁）
    if (node.exit && Array.isArray(node.exit) && node.exit.length) {
      const exitSet = new Set(node.exit)
      stage.value = stage.value.filter(c => !exitSet.has(c.id))
    }

    // enter 增量登场：合并入 stage，已有角色更新表情/位置
    if (node.enter && Array.isArray(node.enter) && node.enter.length) {
      const enters = node.enter.map(c => ({
        id: c.id,
        portrait: c.portrait || (c.id + '/normal'),
        position: c.position || 'center',
      }))
      const map = new Map(stage.value.map(c => [c.id, c]))
      for (const c of enters) {
        map.set(c.id, c) // 已有则覆盖（更新表情/位置），没有则新增
      }
      stage.value = [...map.values()]
      return
    }

    // characters 绝对声明（旧格式兼容）：重置 stage
    // 注意：空数组 [] 也视为显式清空舞台（如纯旁白节点需要清场）
    if (Array.isArray(node.characters)) {
      if (node.characters.length === 0) {
        stage.value = []
      } else {
        stage.value = node.characters.map(c => ({
          id: c.id,
          portrait: c.portrait || (c.id + '/normal'),
          position: c.position || 'center',
        }))
      }
    }
    // 三者都没有：stage 延续不变
  }

  // ===== 节点安全解析（增量更新容错核心） =====

  /**
   * 安全解析存档节点：找不到时回退到章节起始节点
   *
   * 增量更新场景：用户存档里的 nodeId 在新版剧本中被删/改名，
   * goToNode 直接跳会白屏卡死。此函数检测到节点不存在时回退到章节起始。
   *
   * @param {Map} index - 章节节点索引
   * @param {string} nodeId - 存档里的节点 id
   * @param {string} chapterId - 章节名（仅用于日志）
   * @returns {string|null} 可用的节点 id，或 null（章节为空）
   */
  function resolveNodeSafe(index, nodeId, chapterId) {
    if (nodeId && getNode(index, nodeId)) return nodeId
    console.warn(`[VisualNovelStore] 存档节点 ${nodeId} 不存在于章节 ${chapterId}，回退到起始节点`)
    return index.keys().next().value || null
  }

  /**
   * 跳转到指定节点（核心方法）
   * 处理 event/condition 的自动跳转链
   */
  async function goToNode(nodeId) {
    if (!nodeId || !currentIndex.value) return
    const node = getNode(currentIndex.value, nodeId)
    if (!node) {
      // 兜底：正常流程不应触发（resolveNodeSafe 已提前拦截），此处防数据异常
      console.error(`[VisualNovelStore] 节点不存在: ${nodeId}`)
      isEnded.value = true
      showNotice('剧本数据异常，请联系管理员')
      return
    }

    isEnded.value = false
    triggeredCG.value = null

    // 处理 event 节点：执行副作用后自动跳转
    if (node.type === NodeType.EVENT) {
      const result = executeEvent(node, storyVariables.value, unlockedCGs.value)
      storyVariables.value = result.variables
      unlockedCGs.value = result.unlockedCGs
      if (result.cg) {
        triggeredCG.value = result.cg
      }
      // 发放物品
      if (result.grantedItem && !inventory.value.includes(result.grantedItem)) {
        inventory.value = [...inventory.value, result.grantedItem]
      }
      // 解锁并跳转新章节（event 节点带 unlockChapter 且无 next）
      // result.unlockedChapter 由 executeEvent 从 node.unlockChapter 提取（见 engine.js）
      if (result.unlockedChapter) {
        const chapterId = result.unlockedChapter
        if (!unlockedChapters.value.includes(chapterId)) {
          unlockedChapters.value = [...unlockedChapters.value, chapterId]
        }
        // 同步进度
        syncProgress()
        // 加载新章节并跳转到起始节点
        const loaded = await loadChapter(chapterId)
        if (loaded) {
          const startId = getStartNode([...currentIndex.value.values()])
          stage.value = [] // 切章节清空舞台
          if (startId) {
            goToNode(startId)
          } else {
            console.error(`[VisualNovelStore] 章节 ${chapterId} 无起始节点`)
            isEnded.value = true
          }
        } else {
          console.error(`[VisualNovelStore] 章节 ${chapterId} 加载失败`)
          isEnded.value = true
        }
        return
      }
      // 同步进度
      syncProgress()
      // event 节点自动跳到 next
      const nextId = node.next
      if (nextId) {
        goToNode(nextId)
      } else {
        isEnded.value = true
      }
      return
    }

    // 处理 condition 节点：评估条件后跳转
    if (node.type === NodeType.CONDITION) {
      const nextId = getNextNodeId(node, currentIndex.value, affinity.value, storyVariables.value)
      if (nextId) {
        goToNode(nextId)
      } else {
        console.warn('[VisualNovelStore] condition 节点无后续:', nodeId)
        isEnded.value = true
      }
      return
    }

    // 处理 end 节点
    if (node.type === NodeType.END) {
      currentNodeId.value = nodeId
      isEnded.value = true
      stage.value = [] // 章节结束，舞台清空
      // 同步最终进度
      syncProgress()
      return
    }

    // dialogue / choice / input 节点：正常设置当前节点
    currentNodeId.value = nodeId

    // 应用舞台变更（立绘演出：登退场 / 表情切换 / 位置）
    applyStageChange(node)

    // 应用好感度效果
    if (node.effects) {
      affinity.value = applyEffects(affinity.value, node.effects)
    }

    // 设置文本（dialogue / input 节点）
    if (node.type === NodeType.DIALOGUE || node.type === NodeType.INPUT) {
      // 文本插值：把 {playerName} 等占位符替换为实际值（通用，支持任意变量名）
      const rawText = node.text || ''
      fullText.value = interpolate(rawText, { playerName: playerName.value, ...storyVariables.value })
      displayedText.value = ''
      startTypewriter()

      // 记录历史
      if (rawText) {
        history.value.push({
          speaker: node.speaker || '',
          text: fullText.value,
          nodeId: nodeId,
        })
        // 限制历史长度，避免内存膨胀
        if (history.value.length > 500) {
          history.value = history.value.slice(-500)
        }
      }
    }

    // 同步进度（每次进入新节点都同步好感度/变量）
    syncProgress()
  }

  /**
   * 推进到下一节点（用户点击/空格/回车时调用）
   */
  function advance() {
    // 如果打字机还在播放，先完成显示
    if (isTyping.value) {
      completeTypewriter()
      return
    }

    // 如果有 CG 正在展示，关闭它
    if (triggeredCG.value) {
      triggeredCG.value = null
      return
    }

    // 如果章节已结束，不推进
    if (isEnded.value) return

    const node = currentNode.value
    if (!node) return

    // 只有 dialogue 和 event 节点可以自动推进
    if (node.type === NodeType.DIALOGUE || node.type === NodeType.EVENT) {
      const nextId = getNextNodeId(node, currentIndex.value, affinity.value, storyVariables.value)
      if (nextId) {
        goToNode(nextId)
      } else {
        isEnded.value = true
      }
    }
    // choice 节点不自动推进，等待用户选择
  }

  /**
   * 处理选项选择
   */
  function selectChoice(choiceIndex) {
    const node = currentNode.value
    if (!node || node.type !== NodeType.CHOICE) return

    const choice = node.choices[choiceIndex]
    if (!choice) return

    // 记录已选
    if (!choicesMade.value[node.id]) {
      choicesMade.value[node.id] = []
    }
    if (!choicesMade.value[node.id].includes(choiceIndex)) {
      choicesMade.value[node.id].push(choiceIndex)
    }

    // 应用好感度效果
    if (choice.effects) {
      affinity.value = applyEffects(affinity.value, choice.effects)
    }

    // 关键选项（critical）触发自动存档到 slot=0
    if (choice.impact === ChoiceImpact.CRITICAL) {
      // 异步写入，不阻塞跳转
      saveToSlot(0).catch(err => console.error('[VisualNovelStore] 自动存档失败:', err))
    }

    // 跳转到选项指定的节点
    if (choice.next) {
      goToNode(choice.next)
    }
  }

  /**
   * 处理输入节点提交（玩家命名等）
   * @param {string} value - 用户输入的值
   */
  function submitInput(value) {
    const node = currentNode.value
    if (!node || node.type !== NodeType.INPUT) return

    const trimmed = (value || '').trim()
    if (!trimmed) return

    // 写入剧情变量
    const varKey = node.variable || 'playerName'
    storyVariables.value = { ...storyVariables.value, [varKey]: trimmed }

    // 同步进度
    syncProgress()

    // 跳转到下一节点
    if (node.next) {
      goToNode(node.next)
    }
  }

  /**
   * 检查背包中是否拥有某物品
   * @param {string} itemId
   * @returns {boolean}
   */
  function hasItem(itemId) {
    return inventory.value.includes(itemId)
  }

  // ===== 打字机效果 =====

  let typewriterTimer = null

  function startTypewriter() {
    stopTypewriter()
    if (!fullText.value) {
      displayedText.value = ''
      return
    }
    isTyping.value = true
    displayedText.value = ''
    let i = 0
    const tick = () => {
      if (i < fullText.value.length) {
        displayedText.value = fullText.value.slice(0, i + 1)
        i++
        typewriterTimer = setTimeout(tick, textSpeed.value)
      } else {
        isTyping.value = false
        // 自动模式：延迟后自动推进
        if (autoMode.value) {
          typewriterTimer = setTimeout(() => {
            advance()
          }, autoDelay.value)
        }
      }
    }
    tick()
  }

  function stopTypewriter() {
    if (typewriterTimer) {
      clearTimeout(typewriterTimer)
      typewriterTimer = null
    }
    isTyping.value = false
  }

  function completeTypewriter() {
    stopTypewriter()
    displayedText.value = fullText.value
  }

  // ===== 存档系统 =====

  /**
   * 获取存档快照数据
   */
  function getSnapshot() {
    return {
      node: currentNodeId.value,
      chapter: currentChapter.value,
      affinity: { ...affinity.value },
      variables: { ...storyVariables.value },
      inventory: [...inventory.value],
      stage: stage.value.map(c => ({ ...c })), // 舞台状态（立绘演出）
    }
  }

  /**
   * 存档到指定槽位
   */
  async function saveToSlot(slot, thumbnail = null) {
    const snapshot = getSnapshot()
    try {
      await writeSave(slot, {
        ...snapshot,
        thumbnail,
      })
      return true
    } catch (err) {
      console.error('[VisualNovelStore] 存档失败:', err)
      return false
    }
  }

  /**
   * 存档到指定槽位（外部传入自定义快照，如"新建存档"写入从头开始的状态）
   */
  async function saveSnapshotToSlot(slot, snapshot) {
    try {
      await writeSave(slot, {
        ...snapshot,
        thumbnail: null,
      })
      return true
    } catch (err) {
      console.error('[VisualNovelStore] 存档失败:', err)
      return false
    }
  }

  /**
   * 获取指定章节的起始节点 id（用于"新建存档"等场景）
   */
  function getChapterStartNode(chapterId = 'prologue') {
    const index = currentIndex.value
    if (!index) return null
    return getStartNode([...index.values()])
  }

  /**
   * 从指定槽位读档（含增量更新容错）
   *
   * 容错策略（三层回退）：
   *   1. 存档节点存在 -> 正常跳转
   *   2. 存档节点不存在但章节存在 -> 回退到章节起始节点 + 轻提示
   *   3. 章节也不存在（被删/重命名）-> 回退到最新已解锁章节起始 + 轻提示
   */
  async function loadFromSlot(slot) {
    try {
      const res = await getSave(slot)
      const data = res.data
      // 恢复状态
      affinity.value = data.affinity || {}
      storyVariables.value = data.variables || {}
      inventory.value = data.inventory || []
      currentChapter.value = data.chapter

      // 恢复舞台状态（旧存档无此字段则置空，由 goToNode 重新推导）
      stage.value = Array.isArray(data.stage)
        ? data.stage.map(c => ({ ...c }))
        : []

      // 重新加载章节
      const loaded = await loadChapter(data.chapter)
      if (loaded && currentIndex.value) {
        // 章节加载成功：安全解析节点（第一层容错）
        const safeNode = resolveNodeSafe(currentIndex.value, data.node, data.chapter)
        if (safeNode) {
          stage.value = [] // 读档时由 goToNode 重新推导舞台
          goToNode(safeNode)
          if (safeNode !== data.node) {
            showNotice('剧本已更新，已从本章开头继续')
          }
        } else {
          isEnded.value = true
        }
      } else {
        // 章节加载失败（被删/重命名）：回退到最新已解锁章节（第二层容错）
        const fallbackChapter = [...unlockedChapters.value].reverse()
          .find(id => CHAPTER_LOADERS[id])
        if (fallbackChapter && fallbackChapter !== data.chapter) {
          console.warn(`[VisualNovelStore] 章节 ${data.chapter} 不存在，回退到 ${fallbackChapter}`)
          currentChapter.value = fallbackChapter
          const fallbackLoaded = await loadChapter(fallbackChapter)
          if (fallbackLoaded && currentIndex.value) {
            stage.value = []
            const startNode = currentIndex.value.keys().next().value
            if (startNode) {
              goToNode(startNode)
              showNotice('剧本已更新，已从最近章节继续')
            } else {
              isEnded.value = true
            }
          } else {
            isEnded.value = true
          }
        } else {
          isEnded.value = true
        }
      }
      return true
    } catch (err) {
      console.error('[VisualNovelStore] 读档失败:', err)
      return false
    }
  }

  /**
   * 获取存档列表
   */
  async function fetchSaves() {
    try {
      const res = await listSaves()
      return res.data || []
    } catch (err) {
      console.error('[VisualNovelStore] 获取存档列表失败:', err)
      return []
    }
  }

  /**
   * 删除存档
   */
  async function removeSave(slot) {
    try {
      await deleteSave(slot)
      return true
    } catch (err) {
      console.error('[VisualNovelStore] 删除存档失败:', err)
      return false
    }
  }

  // ===== 进度同步 =====

  let syncTimer = null

  /**
   * 同步进度到服务端（防抖，避免频繁请求）
   */
  function syncProgress() {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(async () => {
      try {
        await updateProgress({
          unlockedChapters: unlockedChapters.value,
          unlockedCGs: unlockedCGs.value,
          affinity: affinity.value,
          storyVariables: storyVariables.value,
          inventory: inventory.value,
        })
      } catch (err) {
        console.error('[VisualNovelStore] 同步进度失败:', err)
      }
    }, 2000)
  }

  // ===== UI 控制 =====

  function togglePanel(panel) {
    activePanel.value = activePanel.value === panel ? null : panel
  }

  function closePanel() {
    activePanel.value = null
  }

  function toggleHideUI() {
    hideUI.value = !hideUI.value
  }

  function toggleAutoMode() {
    autoMode.value = !autoMode.value
  }

  function closeCG() {
    triggeredCG.value = null
  }

  // 轻提示弹窗（"敬请期待"等）
  function showNotice(msg) {
    noticeMessage.value = msg
  }

  function closeNotice() {
    noticeMessage.value = null
  }

  return {
    // 状态
    currentNode, currentChapter, currentNodeId,
    affinity, storyVariables, unlockedChapters, unlockedCGs,
    history, choicesMade, inventory, stage,
    isTyping, fullText, displayedText,
    activePanel, hideUI, isEnded, isLoading, preloadProgress, triggeredCG, noticeMessage,
    currentCharacters, currentSpeaker, currentBackground, currentBGM, currentHotspots,
    currentMapHighlight,
    playerName,
    textSpeed, autoMode, autoDelay,
    // 方法
    initGame, loadChapter, goToNode, advance, selectChoice,
    submitInput, hasItem,
    startTypewriter, stopTypewriter, completeTypewriter,
    saveToSlot, saveSnapshotToSlot, getChapterStartNode,
    loadFromSlot, fetchSaves, removeSave, getSnapshot,
    togglePanel, closePanel, toggleHideUI, toggleAutoMode, closeCG,
    showNotice, closeNotice,
  }
})
