---
alwaysApply: false
description: |
  AI部门 PM Git 协同底线（主观规范）。单人文档仓库，客观检查由 Git Hooks 硬拦截。
  触发词：commit、push、add、checkout、branch、merge、提MR、提PR、切分支、bug修复、hotfix、问题修复、重构、优化。
---

# 全员 Git 协同底线 (Pipeline)

## 🔒 Git Hooks 硬拦截（模板: base，已生效）

> 以下检查由 Hook **硬拦截**，AI 在 commit/push 流程中**无需审查**，本规则只承载 **hook 管不了的主观协同**——AI 行为指导、流程编排、MR 协议探测。
> - ✅ 主干保护（禁止直推 `master`，强制走 MR）
> - ✅ 禁 `update/fix` 等模糊提交语义
> - ✅ Diff 熔断（`console.log` / 硬编码凭证）
> - ✅ force push 拦截（覆盖远端历史，不可逆）+ 删远程分支拦截
> - ✅ 变基已推送分支保护
> - ✅ 冲突标记残留检测 + 敏感文件（`.env`）拦截
>
> ⊘ 完整 commit 格式（`[类型](模块): 描述`）**不强制**——措辞规范交 `git-commit-message.md`（scene:git_message）引导。有专属 git-workflow.md 的角色，其模板按各自 md 承诺配置（见各角色 `.githooks.yml`）。

## 👁️ 前置探针 (Read-Before-Write)
- **绝对禁猜**：拒绝推测上下文。任何 Git 写入/分支操作前，静默执行 `git status` & `git branch --show-current`。
- **主干寻址**：执行 `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'` 动态获取主干（Fallback: `main/master`）。

## 🔄 提交闭环 (Commit Flow)

1. **本地固化**：先执行 `git commit`（措辞见 `git-commit-message.md`）
2. **强制同步**（如有多人协作）：`git fetch origin <主干>` ➜ `git merge origin/<主干>`（遇冲突挂起交权）
3. **物理推送**：校验全过执行 `git push`

## 🚨 分支路由 (Routing)

- master 可直接操作，不设主干保护（单人仓）
- 🛑 **UI 规范最高保护**：`docs/assets/rmp-ui-spec/` 为全局资产。**仅允许在 `master` 分支上修改此目录**。若在个人工作分支发现该目录被篡改，必须拒绝提交，并强制恢复（`git checkout -- docs/assets/rmp-ui-spec/`）

## 🚀 自动化 MR (GitLab)

触发提 MR/PR 意图时，注入 Push Options：

1. **协议探测**：先执行 `git remote get-url origin` 确认协议
2. **链接生成**：保持与探测到的协议一致，禁止将 `http` 升级为 `https`

```bash
git push -o merge_request.create \
         -o merge_request.target=<主干名> \
         -o merge_request.title="<符合角色规范的标题>" \
         -o merge_request.remove_source_branch \
         origin <当前分支>
```

## 🔒 Git Hooks 硬拦截（模板: ai-dept-pm，已生效）

> 以下客观检查由 Hook 硬拦截，AI 在 commit/push 流程中**无需审查**：
> - ✅ 提交信息非空 / 禁 `update/fix` 等模糊语义 / 无乱码
> - ⊘ 完整 commit 格式（`[类型](模块): 描述`）**不强制**——措辞规范交 `git-commit-message.md`（scene:git_message）引导
> - ✅ 冲突标记残留检测
> - ✅ 敏感文件拦截（`.env`）
> - ✅ force push 拦截 + 删分支拦截 + 变基已推送分支保护
>
> 本模板（单人仓）已关闭：❌ 主干保护（master 可直接操作）· ❌ Diff 熔断 · ❌ 版本落后检查

### 动态工作分支命名公式

公式：`<类型>/<版本>-<模块>-<描述>`（版本号如 v1.5，模块名必须是简短英文）

**类型字典：**
- `feature/` : 全新功能或大模块规划（例: `feature/v2.0-user-system`)
- `change/` : 现有功能的逻辑变更/优化（例: `change/v1.5-cart-checkout`)
- `fix/` : 修复 PRD 中的错漏（例: `fix/v1.4-payment-typo`)
- `release/` : 发版归档分支（例: `release/v1.5.0`）

### MR 标题格式

公式：`[类型标识](模块): <动作及意图>`（类型字典见 `git-commit-message.md`）

**示例**：`[文档](算法模型): 新增 v1.5 推荐算法优化 PRD`

### MR 描述模板

MR 描述必须包含：
- 需求背景与目标
- 核心变更点摘要
- 评审要点（如 AI 算法与应用工程师关注点）
- 测试验证情况
