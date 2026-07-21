/**
 * 黑机检索性能基准测试
 * 目标：测试黑机全量 nickname LIKE 查询耗时
 * 对比云端：2核 磁盘 IO 全表扫描需要 10-20+ 秒，还会爆 IO OOM
 */

import { PrismaClient } from '@prisma/client';
import { statSync } from 'fs';

const prisma = new PrismaClient();

async function benchQuery(targetName) {
  console.log(`[bench] 全量检索 '${targetName}' 开始...`);
  const startTime = Date.now();

  // 执行与生产完全一致的查询（无 LIMIT，就是要测全表扫描）
  // 和 personMessagesAgent.js 逻辑完全相同
  const querySql = `SELECT id, nickname, msgTime, content FROM group_messages WHERE nickname LIKE '%${targetName.replace(/'/g, "''")}%' ORDER BY msgTime DESC`;
  
  const result = await prisma.$queryRawUnsafe(querySql).catch((err) => {
    console.error(`[bench] 查询失败:`, err.message);
    return [];
  });

  const endTime = Date.now();
  const elapsed = ((endTime - startTime) / 1000).toFixed(2);

  const safe = JSON.parse(JSON.stringify(result, (k, v) => typeof v === 'bigint' ? Number(v) : v));

  console.log(`[bench] 全量检索 '${targetName}' 完成: ${safe.length} 条记录，耗时 ${elapsed} 秒`);
  
  // 也测 COUNT
  const countStart = Date.now();
  const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM group_messages WHERE nickname LIKE '%${targetName.replace(/'/g, "''")}%'`);
  const countEnd = Date.now();
  const countElapsed = ((countEnd - countStart) / 1000).toFixed(2);
  const countNum = JSON.parse(JSON.stringify(countResult, (k,v) => typeof v === 'bigint' ? Number(v) : v))[0]?.total || 0;
  console.log(`[bench] COUNT 查询 '${targetName}' 完成: ${countNum} 条，耗时 ${countElapsed} 秒`);

  return { elapsed: Number(elapsed), rows: safe.length, count: countNum };
}

async function benchFetchWithContext() {
  console.log(`\n[bench] 测试 fetchWithContext（IN 查询）...`);

  // 取一批随机 ID
  const idsStart = Date.now();
  // 先取 50 个随机 ID 模拟查询
  const randomIds = await prisma.$queryRawUnsafe(`SELECT id FROM group_messages ORDER BY RANDOM() LIMIT 50`);
  const targetIds = randomIds.map(r => JSON.parse(JSON.stringify(r, (k,v) => typeof v === 'bigint' ? Number(v) : v)).id);
  const idsTime = ((Date.now() - idsStart) / 1000).toFixed(2);

  // 调用 fetchWithContext（和 production 一样 IN 查询， 300 条最多）
  const fetchStart = Date.now();
  const placeholders = targetIds.map(() => '?').join(',');
  const queryIds = targetIds.slice(0, 50);
  const rows = await prisma.$queryRawUnsafe(`SELECT id, nickname, msgTime, content FROM group_messages WHERE id IN (${placeholders}) ORDER BY id ASC`, ...queryIds);
  const fetchTime = ((Date.now() - fetchStart) / 1000).toFixed(2);

  const safeRows = JSON.parse(JSON.stringify(rows, (k, v) => typeof v === 'bigint' ? Number(v) : v));

  console.log(`[bench] fetchWithContext: ${targetIds.length} 随机 ID -> ${safeRows.length} 行，获取 ID ${idsTime}s，查询 ${fetchTime}s`);

  return { elapsed: Number(fetchTime), rows: safeRows.length };
}

async function benchFTSSearch() {
  console.log(`\n[bench] 测试 FTS5 全文检索...`);

  const keywords = ['篮球', '游戏', '吃饭', '陈梓键'];
  for (const kw of keywords) {
    const start = Date.now();
    const result = await prisma.$queryRawUnsafe(`SELECT m.id, m.nickname, m.msgTime, m.content FROM group_messages m JOIN group_messages_fts f ON m.id = f.rowid WHERE group_messages_fts MATCH ? ORDER BY rank LIMIT 50`, kw).catch((err) => {
      console.error(`[bench] FTS5 '${kw}' 失败:`, err.message);
      return [];
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    const safe = JSON.parse(JSON.stringify(result, (k, v) => typeof v === 'bigint' ? Number(v) : v));
    console.log(`[bench] FTS5 '${kw}': ${safe.length} 条，耗时 ${elapsed} 秒`);
  }
}

async function applyPragmas() {
  // 黑机 32GB 内存，给 SQLite 2GB cache，让 700MB 数据库完全常驻内存
  try {
    await prisma.$queryRawUnsafe('PRAGMA cache_size = -2000000'); // 2GB (negative = KB)
    await prisma.$queryRawUnsafe('PRAGMA mmap_size = 536870912'); // 512MB mmap
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL');
    await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY');
    console.log('[bench] PRAGMA 调优已应用: cache 2GB, mmap 512MB, WAL, temp in memory\n');
  } catch (err) {
    console.log('[bench] PRAGMA 调优失败（可能 Prisma 不支持）:', err.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log(`黑机检索性能基准测试`);
  console.log(`黑机硬件: R7 9700X / 32GB DDR5 / 3TB NVMe`);
  const stat = statSync('prisma/dev.db');
  console.log(`数据库大小: ${(stat.size / (1024 * 1024)).toFixed(1)} MB`);
  const c = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM group_messages');
  const total = JSON.parse(JSON.stringify(c, (k,v) => typeof v === 'bigint' ? Number(v) : v))[0].c;
  console.log(`总行数: ${total} rows`);
  console.log('='.repeat(60));

  // ========== 第一轮：默认配置（模拟云端现状） ==========
  console.log('\n【第一轮：默认配置（SQLite cache 2MB）】\n');

  // 测试几个典型查询（按数据量从大到小）
  await benchQuery('陈梓键'); // 应该很多，测大数据量
  await benchQuery('丘序明'); // 中等，BUG-36 就是这个查询爆了
  await benchQuery('马逸杰'); // 中等
  await benchQuery('黄浩宇'); // 中等
  await benchQuery('张冠群'); // 小
  await benchQuery('不存在的人'); // 0 行，最坏情况全表扫

  // 测试 fetchWithContext 性能
  await benchFetchWithContext();

  // 测试 FTS5
  await benchFTSSearch();

  // ========== 第二轮：PRAGMA 调优后（黑机方案核心优势） ==========
  console.log('\n【第二轮：PRAGMA 调优后（cache 2GB + mmap + WAL）】\n');
  await applyPragmas();

  // 第二次查询同样的（数据已常驻内存，应该更快）
  await benchQuery('陈梓键');
  await benchQuery('丘序明');
  await benchQuery('马逸杰');
  await benchQuery('黄浩宇');
  await benchQuery('张冠群');
  await benchQuery('不存在的人');

  await benchFetchWithContext();
  await benchFTSSearch();

  console.log('\n' + '='.repeat(60));
  console.log('基准测试完成');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[bench] 脚本错误:', err);
  process.exit(1);
});
