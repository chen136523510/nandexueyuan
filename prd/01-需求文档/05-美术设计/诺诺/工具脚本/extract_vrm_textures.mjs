// VRM(glTF-binary) 贴图字节级提取 · R-058 Krita 手绘轮备料
// 用法：node extract_vrm_textures.mjs <in.vrm> <outDir>
// 原理：glTF 二进制里贴图以原始 PNG/JPEG 字节内嵌（bufferView），按 JSON chunk 的
// images[] 索引直接切片落盘——零重编码，与文件内字节完全一致，供 Krita 手绘源稿。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const [, , vrmPath, outDir] = process.argv;
if (!vrmPath || !outDir) {
  console.error('用法: node extract_vrm_textures.mjs <in.vrm> <outDir>');
  process.exit(1);
}

const buf = readFileSync(vrmPath);
// glTF 容器头：magic u32 / version u32 / totalLength u32
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('不是 glTF-binary');
let off = 12;
let json = null;
let bin = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off);
  const type = buf.readUInt32LE(off + 4);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
  else if (type === 0x004e4942) bin = data;
  off += 8 + len;
}
if (!json || !bin) throw new Error('JSON/BIN chunk 缺失');

const views = json.bufferViews ?? [];
const extOf = (bytes, mime) => {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  if (mime?.includes('/')) return mime.split('/')[1].replace('+xml', ''); // ktx2 等如实报出
  return 'bin';
};

mkdirSync(outDir, { recursive: true });
const images = json.images ?? [];
const report = [];
images.forEach((img, i) => {
  if (img.uri != null) {
    report.push(`#${i} ${img.name ?? ''} 外部 URI 引用（VRM 内嵌模型不应出现）: ${img.uri}`);
    return;
  }
  const v = views[img.bufferView];
  const bytes = bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
  const ext = extOf(bytes, img.mimeType);
  const safeName = (img.name ?? `img${i}`).replace(/[\\/:*?"<>|]/g, '_');
  const file = join(outDir, `${String(i).padStart(2, '0')}_${safeName}.${ext}`);
  writeFileSync(file, bytes);
  report.push(`#${i} ${img.name ?? '(无名)'} ${bytes.length} 字节 .${ext} -> ${basename(file)}`);
});
console.log(`提取 ${report.length} 张贴图 -> ${outDir}`);
console.log(report.join('\n'));
