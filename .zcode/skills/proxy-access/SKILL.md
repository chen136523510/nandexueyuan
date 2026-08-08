---
name: proxy-access
description: GitHub SSH 超时时用 ZodAccess 代理推送。当 git push/fetch/ls-remote 遇到 "ssh: connect to host ssh.github.com port 443: Connection timed out" 或 "Could not read from remote repository" 时触发。检测 ZodAccess 代理端口并走 HTTP 代理完成 git 操作。
---

# Proxy Access - GitHub 代理推送技能

> **适用设备**：黑机（RTX 4070 主力机，安装了 ZodAccess 代理客户端）
> **白机不可用**（白机无 ZodAccess，白机遇到网络问题只能等网络恢复或换网络环境）

## 触发条件

当 git push / fetch / pull / ls-remote 遇到以下错误之一时触发：

```
ssh: connect to host ssh.github.com port 443: Connection timed out
fatal: Could not read from remote repository.
```

## 前提：ZodAccess 已运行并已连接节点

ZodAccess 是 Flutter + sing-box 的 GUI 代理客户端，路径 `E:\ZodAccess\zodaccess.exe`。

**必须手动在 GUI 中选择节点并连接**，AI 无法通过 CLI 控制节点选择。
如果 ZodAccess 未运行，提示用户：「请手动启动 ZodAccess 并连接节点，完成后告诉我」。

## 工作流

### Step 1: 确认 ZodAccess 运行中

```bash
tasklist | grep -i zodaccess
```

- 有输出 = 运行中，继续 Step 2
- 无输出 = 未运行，提示用户手动启动

### Step 2: 检测代理端口

ZodAccess 连接节点后会监听本地端口，端口可能变化（不固定），需要实测检测：

```bash
# 获取 zodaccess PID
PID=$(tasklist | grep -i zodaccess | awk '{print $2}' | head -1)

# 查看该 PID 的 LISTENING 端口
netstat -ano | grep "$PID" | grep "LISTENING"
```

历史记录端口（仅供参考，以实测为准）：
- `10081`：混合代理（HTTP + SOCKS5）
- `9090`：sing-box clash API（控制接口，不是代理端口）

### Step 3: 验证代理可用

用 curl 通过代理访问 github.com 确认连通：

```bash
# 假设检测到的端口是 10081
curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --proxy http://127.0.0.1:10081 https://github.com
# 返回 200 = 代理可用
```

### Step 4: 通过代理执行 git 操作（核心方法）

**SSH 代理方式不可靠**（SOCKS5 + connect.exe 对 SSH 长连接不稳定，实测会卡住超时）。

**可靠方案：临时改 HTTPS + HTTP 代理**，操作完成后立即恢复 SSH：

```bash
# 1. 临时把 origin 改成 HTTPS
git remote set-url origin https://github.com/chen136523510/nandexueyuan.git

# 2. 通过 HTTP 代理 push（端口号替换为 Step 2 检测到的实际端口）
git -c http.proxy=http://127.0.0.1:10081 -c https.proxy=http://127.0.0.1:10081 push origin master

# 3. 立即恢复 SSH remote
git remote set-url origin git@github.com:chen136523510/nandexueyuan.git

# 4. 验证恢复
git remote get-url origin
# 应输出: git@github.com:chen136523510/nandexueyuan.git
```

> **原理**：HTTPS 协议走标准 HTTP CONNECT 代理非常稳定，而 SSH over SOCKS5 容易卡住。
> HTTPS 方式需要 GitHub Personal Access Token 认证（如果仓库配了 credential helper，会自动用缓存的 token；如果提示输入密码，用 token 而非密码）。

### Step 5: 其他 git 操作同理

fetch / pull / ls-remote / clone 同样适用，只需替换最后一步的 git 命令：

```bash
git -c http.proxy=http://127.0.0.1:<端口> -c https.proxy=http://127.0.0.1:<端口> fetch origin
git -c http.proxy=http://127.0.0.1:<端口> -c https.proxy=http://127.0.0.1:<端口> pull origin master
```

## 完整一键脚本

如果确认 ZodAccess 已连接且端口已知（假设 10081），可直接执行：

```bash
git remote set-url origin https://github.com/chen136523510/nandexueyuan.git && \
git -c http.proxy=http://127.0.0.1:10081 -c https.proxy=http://127.0.0.1:10081 push origin master && \
git remote set-url origin git@github.com:chen136523510/nandexueyuan.git && \
echo "✅ push 完成，remote 已恢复 SSH"
```

## 注意事项

1. **操作完必须恢复 SSH remote** -- HTTPS 方式在日常操作中不便捷（可能反复要 token），SSH 是项目默认
2. **端口不固定** -- ZodAccess 每次启动端口可能变化，必须实测检测，不能硬编码
3. **白机无此工具** -- 白机遇到网络超时只能：等待恢复 / 换网络 / 改用手机热点
4. **ZodAccess 需要 GUI 操作** -- AI 无法自动选节点连接，必须用户手动在界面操作
5. **不是所有 git 问题都能用代理解决** -- 如果是 SSH key 认证失败、仓库权限问题，代理无效

## 排查记录

| 日期 | 问题 | 解决 |
|------|------|------|
| 2026-08-09 | SSH over SOCKS5（connect.exe）push 卡住超时 | 放弃 SSH 代理，改用临时 HTTPS + HTTP 代理，稳定成功 |
