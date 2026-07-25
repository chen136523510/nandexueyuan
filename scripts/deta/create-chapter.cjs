/**
 * 德塔世界观创作工具
 * 通过 DeepSeek API 生成内容，并写入 SillyTavern 对话历史供用户验收
 *
 * 工作流程：
 * 1. 读取角色卡人设 + 世界书条目
 * 2. 构造 system prompt（角色设定 + 世界书上下文 + 创作指令）
 * 3. 调用 DeepSeek API 生成内容
 * 4. 把用户指令 + AI回复 写入 ST 对话历史（.jsonl）
 * 5. 用户在酒馆 http://127.0.0.1:8000 即可看到创作结果
 *
 * 用法: node scripts/deta/create-chapter.js "第1章：世界观总纲"
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ===== 字符清洗：替换酒馆无法正常显示的特殊Unicode字符 =====
function cleanText(text) {
  return text
    // 箭头符号替换为 ASCII
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↑/g, '(上)')
    .replace(/↓/g, '(下)')
    .replace(/⇒/g, '=>')
    .replace(/⇐/g, '<=')
    // 数学符号
    .replace(/≈/g, '约')
    .replace(/±/g, '+/-')
    // 特殊引号统一为标准引号
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/〔〕/g, '()')
    // U+FFFD 替换字符（编码损坏）直接删除
    .replace(/\uFFFD/g, '')
    // 零宽字符删除
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    // 其他酒馆可能显示不全的特殊符号
    .replace(/✓/g, '[确认]')
    .replace(/✗/g, '[否]')
    .replace(/[🔴]/g, '[!]')
    .replace(/[→←↑↓⇒⇐]/g, '');
}

// ===== 配置 =====
// 从项目根 .env 读取 DeepSeek key（不硬编码，避免泄露）
// 零依赖解析 .env：dotenv 未安装，用极简实现
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch (e) {
    console.warn('[warn] 未读到 .env（' + envPath + '），将使用环境变量 DEEPSEEK_API_KEY');
  }
}
loadEnv();
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_KEY) {
  console.error('[fatal] 缺少 DeepSeek API Key：请在项目根 .env 设置 DEEPSEEK_API_KEY');
  process.exit(1);
}
const DEEPSEEK_URL = 'https://api.deepseek.com';
const ST_HOST = '127.0.0.1';
const ST_PORT = 8000;
const ST_DATA = 'E:/ai/SillyTavern Launcher GUI/data/st_data/default-user';
const CHARACTER_AVATAR = '德塔世界观架构师.png';
const CHARACTER_NAME = '德塔世界观架构师';

// ===== DeepSeek API 调用 =====
function callDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'deepseek-v4-pro',
      messages,
      max_tokens: 8192,
      temperature: 1.0,
      frequency_penalty: 0.3,
      stream: false
    });
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + DEEPSEEK_KEY,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (j.choices) {
            resolve({
              content: cleanText(j.choices[0].message.content),
              reasoning: j.choices[0].message.reasoning_content || '',
              usage: j.usage
            });
          } else {
            reject(new Error(j.error?.message || body.slice(0, 200)));
          }
        } catch (e) { reject(new Error('解析失败: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ===== ST API 封装（带 CSRF + cookie 鉴权）=====
async function getSTSession() {
  return new Promise((resolve, reject) => {
    http.request({ hostname: ST_HOST, port: ST_PORT, path: '/csrf-token', method: 'GET' }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
        const csrf = JSON.parse(body).token;
        resolve({ cookies, csrf });
      });
    }).on('error', reject).end();
  });
}

function stRequest(session, method, stPath, data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const headers = { 'Cookie': session.cookies, 'X-CSRF-Token': session.csrf };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    http.request({ hostname: ST_HOST, port: ST_PORT, path: stPath, method, headers }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject).end(payload);
  });
}

// ===== 读取角色卡 + 世界书 =====
function loadCharacterCard() {
  const pngPath = path.join(ST_DATA, 'characters', CHARACTER_AVATAR);
  // 用 ST 源码的 read 函数（ESM，这里直接读 png 里的 chara chunk）
  const buf = fs.readFileSync(pngPath);
  // 手动提取 chara tEXt chunk 的 base64 数据
  let pos = 8; // 跳过 PNG 签名
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    if (type === 'tEXt') {
      const kwEnd = buf.indexOf(0, pos + 8);
      const keyword = buf.toString('latin1', pos + 8, kwEnd);
      if (keyword === 'chara') {
        const b64 = buf.toString('latin1', kwEnd + 1, pos + 8 + len);
        return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      }
    }
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  throw new Error('角色卡未找到 chara 数据');
}

function loadWorldBook() {
  const wbPath = path.join(ST_DATA, 'worlds', '德塔设定集.json');
  const wb = JSON.parse(fs.readFileSync(wbPath, 'utf8'));
  // 把世界书条目拼成上下文文本
  const entries = Object.values(wb.entries);
  const lines = entries.map((e, i) => {
    const keys = e.key.filter(k => k).join('/');
    return `【${e.comment}】(关键词:${keys})\n${e.content}`;
  });
  return { raw: wb, context: lines.join('\n\n---\n\n'), count: entries.length };
}

// ===== 写入 ST 对话历史 =====
function readCurrentChat(session) {
  return new Promise(async (resolve) => {
    const r = await stRequest(session, 'POST', '/api/chats/get', {
      avatar_url: CHARACTER_AVATAR,
      file_name: ''  // 最新对话
    });
    // 如果有对话返回 jsonl 内容
    resolve(r);
  });
}

async function appendToChat(session, userMes, charMes) {
  // 通过 ST API 获取对话列表，选最近修改的文件（避免字母序排序错误）
  const listRes = await stRequest(session, 'POST', '/api/characters/chats', {
    avatar_url: CHARACTER_AVATAR
  });
  let chatFiles = [];
  try { chatFiles = JSON.parse(listRes.body); } catch(e) {}
  if (!Array.isArray(chatFiles) || chatFiles.length === 0) {
    throw new Error('没有现有对话文件，请先在酒馆中打开该角色创建对话');
  }
  // 取第一个（ST 返回的最近对话在最前）
  const fileName = chatFiles[0].file_name.replace('.jsonl', '');

  // 通过 ST API 读取现有对话内容
  const chatDir = path.join(ST_DATA, 'chats', CHARACTER_NAME);
  const chatPath = path.join(chatDir, fileName + '.jsonl');
  const existing = fs.readFileSync(chatPath, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  console.log('  当前对话:', fileName);
  console.log('  现有消息数:', existing.length);

  const now = new Date().toISOString();

  // 追加用户消息
  if (userMes) {
    existing.push({
      name: 'unused', is_user: true, is_name: true,
      send_date: now, mes: userMes,
      extra: { api: 'deepseek' },
      force_avatar: 'img/ai4.png'
    });
  }

  // 追加角色回复
  existing.push({
    name: CHARACTER_NAME, is_user: false, is_name: true,
    send_date: now, mes: charMes,
    extra: { model: 'deepseek-v4-pro', api: 'deepseek' },
    title: '', gen_started: now, gen_finished: now,
    swipes: [charMes], swipe_id: 0, swipe_info: [{}]
  });

  // 通过 ST API 保存
  const r = await stRequest(session, 'POST', '/api/chats/save', {
    avatar_url: CHARACTER_AVATAR,
    file_name: fileName,
    chat: existing
  });
  return { status: r.status, body: r.body, fileName };
}

// ===== 主流程 =====
async function main() {
  const chapterTitle = process.argv[2] || '创作任务';
  console.log('═══════════════════════════════════════');
  console.log('  德塔世界观创作工具');
  console.log('  任务: ' + chapterTitle);
  console.log('═══════════════════════════════════════\n');

  // 1. 加载角色卡 + 世界书
  console.log('[1/4] 加载角色卡 + 世界书...');
  const card = loadCharacterCard();
  const wb = loadWorldBook();
  console.log('  角色名:', card.data.name);
  console.log('  世界书条目:', wb.count, '条');
  console.log('  角色人设长度:', card.data.description.length, '字符');

  // 2. 构造 prompt
  console.log('\n[2/4] 构造创作 prompt...');
  const systemPrompt = `${card.data.description}

## 世界书已锁定设定（必须严格遵守，不得矛盾）
${wb.context}

## 创作约束
1. 设定一致性优先：引用世界书已确认的设定，不得自相矛盾
2. 结构化产出：使用清晰的标题层级（##/###）、表格、列表
3. 黑深残但不绝望：外部世界黑暗残酷，但要给玩家"可改变"的希望感
4. 数值锚点不擅改：涉及战斗数值，严格遵循世界书已锁定的数值
5. 怪物行为四类：追击型/远程型/范围型/召唤型，不增加第五类`;

  const userPrompt = `请创作${chapterTitle}。

要求：
- 产出一份完整的、结构化的设计文档
- 使用 Markdown 格式（标题层级、表格、列表）
- 内容要有深度和细节，不能泛泛而谈
- 确保与已锁定的世界书设定一致
- 如果涉及新设定（新地名/新势力/新数值），明确标注为"新增设定"，待确认后锁入世界书`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // 3. 调用 DeepSeek 生成
  console.log('\n[3/4] 调用 DeepSeek API 生成内容...');
  console.log('  模型: deepseek-v4-pro | max_tokens: 8192');
  const startTime = Date.now();
  const result = await callDeepSeek(messages);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✅ 生成完成（${elapsed}s）`);
  console.log('  回复长度:', result.content.length, '字符');
  console.log('  思考过程:', result.reasoning.length, '字符');
  console.log('  token用量:', JSON.stringify(result.usage));

  // 预览前300字
  console.log('\n  --- 内容预览 ---');
  console.log(result.content.slice(0, 300));
  console.log('  --- (仅预览前300字) ---\n');

  // 4. 写入 ST 对话
  console.log('\n[4/4] 写入 SillyTavern 对话历史...');
  const session = await getSTSession();
  const writeResult = await appendToChat(session, userPrompt, result.content);
  console.log('  ST 保存结果: HTTP', writeResult.status);
  console.log('  对话文件:', writeResult.fileName);

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ 创作完成！请打开酒馆验收：');
  console.log('  http://127.0.0.1:8000');
  console.log('  选择「德塔世界观架构师」即可看到最新创作内容');
  console.log('═══════════════════════════════════════\n');

  // 输出完整内容到 stdout（供调用方获取）
  console.log('=== 完整创作内容 ===');
  console.log(result.content);
}

main().catch(e => {
  console.error('❌ 错误:', e.message);
  process.exit(1);
});
