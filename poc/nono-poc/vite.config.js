import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// 仓库根（放行 dev server 读取诺诺目录的 VRM：模型原地引用不复制，省 15MB 双份入库）
const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

export default defineConfig({
  assetsInclude: ['**/*.vrm'], // 让 .vrm 走 asset URL 通道
  server: {
    port: 5175,
    fs: {
      allow: [repoRoot],
    },
  },
});
