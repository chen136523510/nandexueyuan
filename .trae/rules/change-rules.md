# Changelog 规范（强制）

## 层级结构
变更记录分两层管理：

1. **根 CHANGELOG.md** — 记录**架构级改动**：新增/删除目录层、技术栈变更、跨层重构、项目级配置变更。
2. **各层 changelog.md** — 记录该层**内部所有改动**：文件新增/修改/删除、接口变更、逻辑调整。

## 各层 changelog 位置
- `src/api/changelog.md`
- `src/router/changelog.md`
- `src/stores/changelog.md`
- `src/views/changelog.md`
- `src/components/changelog.md`
- `src/styles/changelog.md`
- `src/utils/changelog.md`（如有）
- `server/src/routes/changelog.md`
- `server/src/controllers/changelog.md`
- `server/src/middleware/changelog.md`
- 新增层时必须同步创建该层的 `changelog.md`，并在根 `CHANGELOG.md` 登记架构变更。

## 记录要求
- 所有 changelog 按倒序排列（最新在最上方）。
- 每条记录包含：日期、变更动作（[新增]/[修改]/[删除]）、文件名、说明。
- commit hash 如有则标注，无则标注「未提交」。
- 会话结束前必须确认相关 changelog 已更新。
- 若用户未要求提交，仅更新文件不自动 commit。

## 格式模板

### 根 CHANGELOG.md
```markdown
# Changelog

> 架构级改动记录，倒序排列。

---

## YYYY-MM-DD 架构变更主题
- [新增/删除] 层名称 — 说明
- commit: <hash>（如有）
```

### 各层 changelog.md
```markdown
# <层名> Changelog

> 倒序排列，最新在最上方。

---

## YYYY-MM-DD
- [新增/修改/删除] 文件名 — 说明
- commit: <hash>（如有）
```
