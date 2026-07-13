---
alwaysApply: true
description: 禁止 TRAE SOLO 徽章 — 永久禁止注入 vite-plugin-trae-solo-badge
---

# 禁止 TRAE SOLO 徽章注入

## 禁止事项

1. **禁止**在 `package.json` 中添加 `vite-plugin-trae-solo-badge` 依赖
2. **禁止**在 `vite.config.ts` 中 import 或使用 `traeBadgePlugin`
3. **禁止**在 `index.html` 中注入任何 TRAE SOLO 相关的 script 标签或样式
4. 如果发现以上内容已被注入，**立即删除**

## 原因

TRAE SOLO 是 Trae IDE 平台的推广徽章，不属于本项目产品功能。项目使用自己的官方 LOGO（`web/public/logo.png`），不需要第三方品牌植入。