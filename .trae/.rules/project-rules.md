---
alwaysApply: true
description: AI 部门 PM 工作区纪律底线
---

# AI 部门 PM 工作区底线

**[核心定位]** 产出 AI 产品 PRD、评测方案与模型需求。

**[最高纪律]** SSOT 在 `/docs/`；命名强制 `kebab-case`；PRD 强制 YAML 头（`title, author, date, status, version`）。

**[底线约束]**
- PRD 包含：模型能力边界、评测指标、Bad Case 处理
- 评测文档包含测试集规模和通过率
- 需求评审必须有AI算法与应用工程师参与
- 禁止提出"100%准确率"等不切实际指标、禁止忽略模型失败场景、禁止在没有基线对比的情况下发布模型

**[目录红线]**
- `/docs/prd/`: PRD 核心区，强制同名绑定（`名.md` + `名.html` + `名/`）
- `/docs/assets/rmp-ui-spec/`: 全局 UI 规范，仅限 master 分支修改
- `/docs/guides/`: 系统指南
- `/assets/`: 通用脚本与手册
- `/outputs/`: 调试暂存区，Git 已忽略
