# 德塔（NDO）

> 2D 虚拟世界模块。玩家在德塔中探索地图、与 NPC 交互、进行战斗、获取装备与技能。

## 文档索引

| 文档 | 说明 |
|------|------|
| [MVP需求文档](01-需求/MVP需求文档.md) | 功能需求详述（地图/角色/NPC/战斗/HUD） |
| [德塔战斗数值设计文档](01-需求/德塔战斗数值设计文档.md) | 战斗数值平衡（属性/伤害公式/装备/技能） |
| [德塔战斗系统调研方案](01-需求/德塔战斗系统调研方案.md) | 战斗系统技术选型与调研 |
| [德塔男德通交互需求](01-需求/德塔男德通交互需求.md) | NPC AI 对话交互需求 |
| [changelog.md](./changelog.md) | 德塔变更记录 |
| [bug-log.md](./bug-log.md) | Bug 记录 |

## 技术栈

| 层 | 文件/技术 |
|----|----------|
| 前端视图 | `src/views/GameView.vue` |
| 顶部导航 | `src/components/TopBar.vue` + `src/components/UserAvatar.vue` |
| 游戏引擎 | Phaser 3（`game/` 目录） |
| 状态管理 | `src/stores/auth.js` |
| 前端 API | `src/api/user.js` |

## 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| TopBar | `src/components/TopBar.vue` | 德塔页面顶部导航（返回学院 + 标题） |
| UserAvatar | `src/components/UserAvatar.vue` | 头像 + 下拉菜单（个人中心 / 德塔相关设置 / 退出登录） |
| ProfileDialog | `src/components/ProfileDialog.vue` | 个人中心弹窗（昵称/头像/修改密码） |
| NdeSettingsDialog | `src/components/NdeSettingsDialog.vue` | 德塔相关设置弹窗（形象选择：立绘 + 精灵预览） |

## HUD 布局（R-010 五栏）

```
[角色信息 180px] [装备+技能槽 160px] [背包 160px] [聊天 flex:1] [小地图 146px]
```

- **角色信息**：头像（点击打开角色面板弹窗）/ 昵称 / HP 条 / MP 条 / buff 槽
- **装备+技能槽**：2行×4列 → 第一行装备（头/胸/腿/靴），第二行技能（1/2/3/4）
- **背包**：4列×2行 = 8 格
- **聊天**：消息列表 + 输入框
- **小地图**：130×90 canvas

## 角色面板弹窗（博德之门风格）

点击 HUD 头像打开，三栏布局：
- **左侧**：当前形象完整立绘
- **中间**：5 格装备栏（武/头/胸/腿/靴）+ 属性面板（基础值）
- **右侧**：8 格背包网格

## 部署注意

1. Nginx 需配置 WebSocket 代理（`/search-hub` 用于黑机检索算力）
2. 部署脚本：`deploy.sh`（种子数据 + 版本公告）
