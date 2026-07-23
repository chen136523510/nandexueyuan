# 师德墙（Wall）

> 校园墙 / 朋友圈模块。用户可发布图文动态、评论、点赞，横向画展式浏览。

## 文档索引

| 文档 | 说明 |
|------|------|
| [师德墙.md](师德墙.md) | PRD 需求文档（数据模型 / 功能详述 / 接口契约 / 权限矩阵） |
| [changelog.md](changelog.md) | 变更记录 |
| [bug-log.md](bug-log.md) | Bug 记录 |

## 快速概览

- **入口**：导航栏「师德墙」，位于男德通与男通讯录之间
- **路由**：`/wall`
- **布局**：横向画展 -- 左侧竖排标题栏 + 中间卡片从左到右滚动
- **功能**：发帖（文字+图片）、评论、点赞、删除

## 技术栈

| 层 | 文件 |
|----|------|
| 数据库 | `server/prisma/schema.prisma`（Post / Comment / Like 三表） |
| 后端 | `server/src/controllers/wallController.js` + `server/src/routes/api.js` |
| 种子数据 | `server/prisma/seedWall.js` + `server/uploads/wall-seed/` |
| 前端 API | `src/api/wall.js` |
| 前端页面 | `src/views/WallView.vue` |
| 导航入口 | `src/views/MainView.vue` + `src/router/index.js` |

## 部署注意

1. Nginx 需配置 `location ^~ /uploads/` 代理（`^~` 优先级高于正则，否则图片 404）
2. `deploy.sh` 会自动执行：`seed.js`（系统管理员）-> `seedWall.js`（种子动态）-> `seedVersion.js`（版本公告）
3. 种子图片在 `server/uploads/wall-seed/` 已随 git 仓库提交
