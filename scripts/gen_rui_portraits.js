/**
 * 睿帝形象批量生图脚本 v2
 * 底模: novaAnimeXL (设定还原最佳)
 * LoRA: epic_oil_painting_slider (w2.0, 增加油画厚涂感)
 * 8个角度/表情/动作变体
 *
 * 用法：node scripts/gen_rui_portraits.js
 * 前置：ComfyUI 在线（127.0.0.1:8188）
 * 输出：ComfyUI output/ 目录 + 复制到 .ai/comfyui-output/rui_poc/
 */
import http from 'http'
import fs from 'fs'
import path from 'path'

const COMFYUI_HOST = '127.0.0.1'
const COMFYUI_PORT = 8188
const COMFYUI_OUTPUT = 'E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/output'
const LOCAL_OUTPUT = 'G:/UGit/nandexueyuan/.ai/comfyui-output/rui_poc'

// === 睿帝形象提示词（基于形象设计文档 + 银灰发色）===
const BASE = {
  identity: '1man, handsome, sharp jawline, mature male, 45 years old, silver grey hair, swept back',
  outfit: 'ivory white hooded robe, warm ivory tone, heavy linen fabric, ankle-length, A-line silhouette, narrow cuffs with dark charcoal trim, side slits to knee',
  sash: 'smoke grey leather obi belt, matte silver buckle, distressed silver',
  inner: 'grey-white stand collar shirt, collar open one button, silver chain with black obsidian pendant',
  boots: 'dark grey suede ankle boots, square toe, thick sole',
  ring: 'matte silver wide ring on index finger, black agate stone',
  style: 'thick oil painting, impasto, painterly, bold brush strokes, dramatic lighting, rim light, high contrast, western comic illustration style, hades game art style, official illustration, masterpiece, best quality, detailed',
  negative: 'low quality, worst quality, bad anatomy, deformed, extra limbs, blurry, watermark, text, signature, jpeg artifacts, child, teenager, cute, moe, anime eyes, flat color, sketch, rough, 3d render, plastic, cgi, doll, photograph, photorealistic, skull, mask, beard, facial hair, holding object, weapon'
}

// === 变体定义 (v2: 修复骷髅面具/自由发挥问题) ===
const VARIANTS = [
  {
    id: '01_front_hood_down_ruler',
    name: '正面-执政者-兜帽放下',
    pose: 'standing, facing viewer, front view, hands at sides, hood down resting on shoulders, composed posture',
    expression: 'calm confident expression, slight smile, gentle authority',
    extra: 'warm ambient lighting, throne room background, soft golden light from behind'
  },
  {
    id: '02_front_hood_up_judge',
    name: '正面-审判者-兜帽戴上',
    pose: 'standing, facing viewer, front view, hood up covering hair, face fully visible, hands clasped in front',
    expression: 'cold stern expression, unreadable, judging',
    extra: 'harsh dramatic lighting from below, dark stone hall background, cold blue rim light'
  },
  {
    id: '03_side_hood_down',
    name: '侧面-兜帽放下',
    pose: 'side profile view, standing, looking into distance, hood down, wind blowing robe slightly, empty hands',
    expression: 'contemplative, distant gaze',
    extra: 'golden hour backlight, mountain landscape background, rim light on hair'
  },
  {
    id: '04_casting_hood_up',
    name: '施法-兜帽戴上-前襟扯开',
    pose: 'dynamic casting pose, hood up, robe front pulled open, one hand raised palm forward casting magic, dark purple energy swirling around hand',
    expression: 'focused, cold fury',
    extra: 'magic particles, dark purple energy, dark background, strong rim light, dramatic shadows'
  },
  {
    id: '05_threequarter_seated',
    name: '三分之二-坐姿-王座',
    pose: 'seated on ornate throne, three-quarter view, one hand on armrest, hood down, legs crossed, relaxed authority',
    expression: 'composed, slight knowing smile, looking at viewer',
    extra: 'grand throne room, ornate architecture, warm candlelight, volumetric light'
  },
  {
    id: '06_closeup_portrait',
    name: '特写-肖像',
    pose: 'close-up portrait, head and shoulders, facing viewer slightly turned, hood down',
    expression: 'calm, intelligent eyes, faint smile, dignified',
    extra: 'soft studio lighting, dark gradient background, detailed face texture'
  },
  {
    id: '07_back_hood_up',
    name: '背面-兜帽戴上-走动',
    pose: 'back view, walking away from viewer, hood up, robe flowing behind, empty hands at sides',
    expression: 'n/a',
    extra: 'long corridor, dramatic perspective, cold light from ahead, robe trailing on floor'
  },
  {
    id: '08_battle_ready',
    name: '战斗准备-拔势',
    pose: 'combat stance, hood up, robe open, one hand forward casting dark purple magic, other hand at waist, wide stance',
    expression: 'cold, lethal calm, sharp eyes',
    extra: 'storm sky, wind, dark purple magic aura, dynamic angle from below, epic'
  }
]

// === ComfyUI API 工具函数 ===
function comfyPost(pathStr, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request({
      hostname: COMFYUI_HOST, port: COMFYUI_PORT, path: pathStr, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let buf = ''
      res.on('data', c => buf += c)
      res.on('end', () => resolve({ status: res.statusCode, body: buf }))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function comfyGet(pathStr) {
  return new Promise((resolve, reject) => {
    http.request({ hostname: COMFYUI_HOST, port: COMFYUI_PORT, path: pathStr, method: 'GET' }, (res) => {
      let buf = ''
      res.on('data', c => buf += c)
      res.on('end', () => resolve({ status: res.statusCode, body: buf }))
    }).on('error', reject).end()
  })
}

function buildWorkflow(variant, seed) {
  const prompt = [
    BASE.identity, BASE.outfit, BASE.sash, BASE.inner, BASE.boots, BASE.ring,
    variant.pose, variant.expression, variant.extra, BASE.style
  ].join(', ')

  // novaAnimeXL + epic_oil_painting LoRA (w2.0)
  return {
    "3": { "class_type": "KSampler", "inputs": {
      "seed": seed, "steps": 30, "cfg": 7, "sampler_name": "dpmpp_2m",
      "scheduler": "karras", "denoise": 1,
      "model": ["11", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]
    }},
    "4": { "class_type": "CheckpointLoaderSimple", "inputs": {
      "ckpt_name": "Qpipi.com_novaAnimeXL_xlV10.safetensors"
    }},
    "11": { "class_type": "LoraLoader", "inputs": {
      "model": ["4", 0], "clip": ["4", 1],
      "lora_name": "epic_oil_painting_slider.safetensors",
      "strength_model": 2.0, "strength_clip": 2.0
    }},
    "5": { "class_type": "EmptyLatentImage", "inputs": {
      "width": 832, "height": 1216, "batch_size": 1
    }},
    "6": { "class_type": "CLIPTextEncode", "inputs": { "text": prompt, "clip": ["11", 1] }},
    "7": { "class_type": "CLIPTextEncode", "inputs": { "text": BASE.negative, "clip": ["11", 1] }},
    "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] }},
    "9": { "class_type": "SaveImage", "inputs": {
      "filename_prefix": `rui_v2_${variant.id}`, "images": ["8", 0]
    }}
  }
}

async function waitForCompletion(promptId, label, maxWait = 180000) {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 3000))
    const r = await comfyGet(`/history/${promptId}`)
    if (r.body && r.body.length > 5) {
      const hist = JSON.parse(r.body)
      const entry = hist[promptId]
      if (entry && entry.status && entry.status.completed) {
        const images = []
        if (entry.outputs) {
          for (const nid in entry.outputs) {
            const out = entry.outputs[nid]
            if (out.images) out.images.forEach(img => images.push(img))
          }
        }
        return { success: entry.status.status_str === 'success', images }
      }
    }
    process.stdout.write('.')
  }
  return { success: false, images: [], timeout: true }
}

// === 主流程 ===
async function main() {
  console.log('=== 睿帝形象 PoC 批量生图 ===')
  console.log(`变体数: ${VARIANTS.length}`)
  console.log('')

  // 确保输出目录
  fs.mkdirSync(LOCAL_OUTPUT, { recursive: true })

  const results = []

  for (let i = 0; i < VARIANTS.length; i++) {
    const v = VARIANTS[i]
    const seed = Math.floor(Math.random() * 1000000000)
    const wf = buildWorkflow(v, seed)

    console.log(`[${i+1}/${VARIANTS.length}] 提交: ${v.name}`)
    const resp = await comfyPost('/prompt', { prompt: wf })
    const data = JSON.parse(resp.body)

    if (data.error) {
      console.log(`  ❌ 提交失败: ${JSON.stringify(data.error)}`)
      results.push({ variant: v, success: false })
      continue
    }

    const promptId = data.prompt_id
    console.log(`  等待生成 (prompt_id: ${promptId.substring(0, 8)}...)`)

    const result = await waitForCompletion(promptId, v.name)
    if (result.success && result.images.length > 0) {
      const img = result.images[0]
      const srcPath = path.join(COMFYUI_OUTPUT, img.subfolder || '', img.filename)
      const dstPath = path.join(LOCAL_OUTPUT, `rui_v2_${v.id}.png`)
      fs.copyFileSync(srcPath, dstPath)
      console.log(`  ✅ 完成: ${img.filename} -> ${path.basename(dstPath)}`)
      results.push({ variant: v, success: true, file: dstPath })
    } else {
      console.log(`  ❌ ${result.timeout ? '超时' : '失败'}`)
      results.push({ variant: v, success: false })
    }
  }

  // 汇总
  console.log('\n=== 汇总 ===')
  const ok = results.filter(r => r.success).length
  console.log(`成功: ${ok}/${VARIANTS.length}`)
  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.variant.name} -> ${r.success ? path.basename(r.file) : '失败'}`)
  })
}

main().catch(e => { console.error('致命错误:', e); process.exit(1) })
