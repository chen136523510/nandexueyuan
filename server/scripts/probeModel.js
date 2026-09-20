/**
 * 模型探针：换模型 / 切模型前必跑（BUG-78 教训——「只改 env」不等于「切完了」）
 *
 * 用法（在 server/ 目录下运行）：
 *   node scripts/probeModel.js                    # 探测当前 VOLC_MODEL
 *   node scripts/probeModel.js glm-5.3-flash      # 探测指定模型 ID
 *   node scripts/probeModel.js --vision <URL>     # 加跑视觉子项（主模型直识图能力探测，需传图片 URL 或 base64 data URL）
 *
 * 探测五项：
 *   ① 基础连通（能否正常返回内容）
 *   ② thinking:disabled 兼容性（glm 系不支持，llm.js 会自动降级；此处显式报告）
 *   ③ 确定性 JSON 输出（planner/feedback 场景）
 *   ④ 流式输出（最终回答场景）
 *   ⑤ 视觉直识图（主模型多模态能力，院长 2026-09-15 视觉链路动态路由规则启用时必跑；默认不跑，需 --vision 参数）
 *
 * 退出码：0=全部通过，1=有失败项（可据此判断能否切换）
 */
import 'dotenv/config'

// 参数解析：[model-override] 与 --vision <URL> 互不冲突
// 例：
//   node scripts/probeModel.js                    # 探测当前 VOLC_MODEL
//   node scripts/probeModel.js glm-5.3-flash      # 探测指定模型 ID
//   node scripts/probeModel.js --vision <URL>     # 加跑视觉子项（探明主模型多模态能力）
//   node scripts/probeModel.js glm-5.3-flash --vision <URL>  # 探测指定模型 + 加视觉
let override = null
let visionUrl = null
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--vision') {
    visionUrl = argv[++i]
  } else if (!argv[i].startsWith('--')) {
    override = argv[i]
  }
}
// 模型 ID 覆盖同时兼容两通道（DeepSeek 官方 / 火山 ARK）
if (override) {
  process.env.DEEPSEEK_MODEL = override
  process.env.VOLC_MODEL = override
}

const { chatCompletion, chatCompletionStream, PROVIDER, BASE_URL, MODEL } = await import('../src/utils/llm.js')

console.log('=== 模型探针 ===')
console.log('通道:', PROVIDER === 'deepseek' ? 'DeepSeek 官方 (api.deepseek.com)' : '火山方舟 ARK')
console.log('模型:', MODEL)
console.log('端点:', BASE_URL)
console.log('')

const results = []
function record(name, ok, detail) {
  results.push({ name, ok })
  console.log(`${ok ? '✓' : '✗'} ${name}: ${detail}`)
}

// ① 基础连通
try {
  const t0 = Date.now()
  const r = await chatCompletion([{ role: 'user', content: '回复两个字：在的' }], { temperature: 0 })
  const s = (r || '').trim()
  const ms = Date.now() - t0
  if (s) record('基础连通', true, `${ms}ms 返回「${s.slice(0, 20)}」`)
  else record('基础连通', false, `${ms}ms 但返回空内容（推理模型思考链吃满输出预算的典型失败模式）`)
} catch (e) {
  record('基础连通', false, e.message)
}

// ② thinking:disabled 兼容性（llm.js 会自动降级，所以这里以「最终是否成功」为准）
try {
  const t0 = Date.now()
  const r = await chatCompletion(
    [{ role: 'user', content: '回复两个字：好的' }],
    { temperature: 0, thinking: 'disabled' },
  )
  const s = (r || '').trim()
  const ms = Date.now() - t0
  record('thinking:disabled', Boolean(s), s ? `已降级/兼容后正常（${ms}ms）` : `${ms}ms 返回空内容`)
} catch (e) {
  record('thinking:disabled', false, `${e.message}（llm.js 降级未生效？planner/feedback 会受影响）`)
}

// ③ 确定性 JSON 输出（planner 场景）
try {
  const t0 = Date.now()
  const r = await chatCompletion(
    [
      { role: 'system', content: '你是任务规划器。只输出 JSON，不要任何解释或 markdown 包裹。格式：{"tasks":[{"agent":"topic_search","keywords":["关键词"]}]}' },
      { role: 'user', content: '用户问：2026年6月群里聊了什么？请输出 JSON 任务列表。' },
    ],
    { temperature: 0, thinking: 'disabled' },
  )
  const s = (r || '').trim()
  let ok = false
  try {
    const j = JSON.parse(s.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, ''))
    ok = Array.isArray(j.tasks) && j.tasks.length > 0
  } catch { /* 解析失败即判否 */ }
  record('JSON 输出', ok, ok ? `${Date.now() - t0}ms 可解析且含 tasks` : `${Date.now() - t0}ms 返回不可解析: ${JSON.stringify(s.slice(0, 80))}`)
} catch (e) {
  record('JSON 输出', false, e.message)
}

// ④ 流式输出
try {
  const t0 = Date.now()
  let out = ''
  for await (const chunk of chatCompletionStream(
    [{ role: 'user', content: '用一句话回答：群聊数据挖掘是什么？' }],
    { temperature: 0.5 },
  )) {
    out += chunk
  }
  const s = out.trim()
  record('流式输出', Boolean(s), s ? `${Date.now() - t0}ms 累计 ${s.length} 字` : '无内容产出')
} catch (e) {
  record('流式输出', false, e.message)
}

// ⑤ 视觉直识图（主模型多模态能力，院长 2026-09-15 视觉链路动态路由规则启用时必跑；默认不跑，需 --vision 参数）
// visionUrl 已在顶部参数解析处提取
if (visionUrl) {
  try {
    const { chatCompletionWithImages } = await import('../src/utils/llm.js')
    const t0 = Date.now()
    const r = await chatCompletionWithImages(
      [
        {
          role: 'system',
          content: [{ type: 'text', text: '你是图片识别助手。用 50 字内中文描述这张图。' }],
        },
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: visionUrl } }],
        },
      ],
      { temperature: 0.3 },
    )
    const s = (r || '').trim()
    record('视觉直识图（主模型）', Boolean(s), s ? `${Date.now() - t0}ms 描述:「${s.slice(0, 60)}」` : `${Date.now() - t0}ms 空内容（主模型返回空，疑似多模态失败）`)
  } catch (e) {
    record('视觉直识图（主模型）', false, `${e.message.slice(0, 120)}（主模型可能不支持多模态，或图片 URL 不可达）`)
  }
} else {
  console.log('（⑤ 视觉子项未启用：传 --vision <URL> 即可跑，例如 --vision https://... 或 --vision "data:image/png;base64,..."）')
}

const failed = results.filter(r => !r.ok)
console.log('')
if (failed.length === 0) {
  console.log(`=== 探针全部通过（${results.length}/${results.length}），模型可用于切换 ===`)
} else {
  console.log(`=== 探针失败 ${failed.length}/${results.length}：${failed.map(f => f.name).join('、')}——请勿切换 ===`)
  process.exitCode = 1
}
