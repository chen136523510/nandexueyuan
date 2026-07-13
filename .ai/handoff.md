# AI 交接单

> 最后更新：2026-07-13 19:00
> 提交人：陈梓键
> 所在设备：待确认

---

## 当前任务
- [ ] 完善 AI 跨机协作基础建设（优先级：高）

## 进行中（未完成，切勿遗漏）
- 无

## 已完成（本次会话）
- [x] 项目克隆与依赖安装 - 环境就绪
- [x] 端口从 5173 改为 4396
- [x] 目录结构调整（去掉 nandexueyuan 嵌套层）
- [x] 创建 AI 跨机协作协议 - 文件：`prd/05-开发规范/ai-collab.md`
- [x] 创建初始交接文件 - 文件：`.ai/handoff.md`
- [x] 文档归档：`ai-collab.md`、`git-manage.md` 移入 `prd/05-开发规范/`
- [x] `change-rules.md` 优化（参考 ADR 理念）后移入 `.trae/.rules/`
- [x] 锁定 pnpm 版本：`packageManager: pnpm@11.12.0`
- [x] `.gitignore` 更新：共享 `.trae/.rules/` 和 `.trae/.skills/`

## 环境状态
- 分支：`master`
- 最后提交：待确认（git log -1）
- 数据库：已初始化（4 个迁移已应用，21 个种子账号）
- 依赖：前端 + 后端已安装完毕

## 注意事项
- 端口：前端 4396，后端 3000
- `server/.env` 未配置 VOLC_API_KEY，AI 助手功能不可用
- 预置账号：`chenzijian/admin123456`（院长），其余成员 `用户名/nande666`

## 下一步
- 提交当前所有变更（git add + commit + push）
- 继续原有开发任务