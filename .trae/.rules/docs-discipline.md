---
alwaysApply: true
description: 文档同步纪律 — 所有需求和变更必须在文档中体现
---

# 文档同步纪律（强制执行）

## 一、核心原则

**任何需求实现、功能变更、缺陷修复，必须同步更新对应文档，不得遗漏。**

代码改了但文档没更新 = 任务未完成。

## 二、文档更新映射表

完成以下类型的变更后，必须同步更新对应文档：

| 变更类型 | 需更新的文档 | 说明 |
|---------|-------------|------|
| 新增功能/需求 | `docs/prd/offline/changelog.md` + `docs/prd/offline/system-requirements.md` | changelog 记录变更过程；requirements 补充功能描述（F 编号） |
| 缺陷修复 | `docs/prd/offline/changelog.md` + `docs/prd/offline/bug-log.md` | changelog 记录修复过程；bug-log 记录根因和教训 |
| UI 变更 | `docs/prd/offline/changelog.md` | 记录 UI 元素的增删改 |
| 配置变更 | `docs/prd/offline/changelog.md` | 记录环境变量、参数等变更 |
| 架构变更 | `docs/prd/offline/changelog.md` + `docs/adr/` | changelog 记录变更；ADR 记录架构决策 |
| API 变更 | `docs/prd/offline/changelog.md` + `docs/prd/offline/system-requirements.md` | requirements 中的 API 端点列表同步更新 |
| 文档变更 | `docs/prd/offline/changelog.md` | 文档自身的变更也要记录 |

## 三、变更完成检查清单（每次强制执行）

完成任何代码修改后，必须逐项确认：

```
[ ] 1. changelog.md 是否已更新？（所有变更必须记录）
[ ] 2. 如果是 Bug 修复，bug-log.md 是否已登记？
[ ] 3. 如果涉及功能需求，system-requirements.md 是否已同步？
[ ] 4. 如果涉及架构决策，ADR 是否需要新增？
[ ] 5. changelog 条目是否包含：日期、变更类型、变更人、背景、变更内容、影响范围、验证方式？
```

## 四、changelog 条目格式

```markdown
### [变更类型] 简要标题

- **时间**：YYYY-MM-DD
- **变更人**：姓名
- **背景**：为什么需要这个变更
- **变更内容**：具体改了什么（文件、逻辑、UI）
- **影响范围**：哪些模块/页面受影响
- **验证方式**：如何确认变更生效
```

变更类型：功能增强 / 缺陷修复 / 安全修复 / 重构 / 文档更新 / 环境配置

## 五、bug-log 条目格式

```markdown
### BUG-XXX | 简要标题

- **发现时间**：YYYY-MM-DD HH:MM
- **环境**：本地 / 测试 / 正式
- **现象**：用户看到的具体错误
- **根因**：技术层面的根本原因
- **修复**：具体改了什么
- **教训**：以后如何避免此类问题
```

## 六、执行纪律

1. **不得跳过检查清单**：即使变更很小，也要确认涉及哪些文档
2. **不得事后补记**：变更完成时立即记录，不依赖记忆
3. **不得只改代码不改文档**：代码和文档是同一任务的两面
4. **禁止遗漏 Bug**：任何运行时错误都必须登记 bug-log
