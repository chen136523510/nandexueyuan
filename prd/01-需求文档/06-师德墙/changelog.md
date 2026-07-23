# 师德墙（Wall）Changelog

> 倒序排列，最新在最上方。涵盖前端（WallView.vue）、后端（wallController.js）、数据库、部署。

---

### [refactor] 抽取公共 TopBar 组件，统一三页导航（BUG-W04）

- **时间**：2026-07-23
- **变更人**：陈梓键
- **背景**：用户反馈进入男通讯录（/admin）后导航页签左对齐、师德墙和德塔入口消失。排查发现导航栏在 MainView、AdminView、WallView 三处各自硬编码，新增师德墙模块时只改了 MainView 和 WallView，漏改 AdminView——典型的重复代码技术债
- **变更内容**：
  1. **新增** `src/components/TopBar.vue`：公共导航组件，含5项菜单（首页/男德通/师德墙/男通讯录[管理员可见]/德塔）+ 品牌标题 + UserAvatar + ProfileDialog，样式沿用 MainView 原版（`justify-content: space-between` 三栏布局）
  2. **MainView.vue**（改）：删除内联导航 template + 旧 topbar CSS，改为 `<TopBar />`；移除不再需要的 `useRouter`/`UserAvatar`/`ProfileDialog` import 和 `handleLogout`/`showProfile` 逻辑（已收敛到 TopBar）
  3. **AdminView.vue**（改）：删除只有3项的内联导航（缺师德墙+德塔）+ 缺 `justify-content: space-between` 的旧 topbar CSS，改为 `<TopBar />`；移除不再需要的 `useRouter` import
  4. **WallView.vue**（改）：删除内联导航（含"← 返回首页"链接）+ 旧 topbar CSS，改为 `<TopBar />`
- **文件**：`src/components/TopBar.vue`（新增）、`src/views/MainView.vue`（改）、`src/views/AdminView.vue`（改）、`src/views/WallView.vue`（改）
- **验证**：`npm run build` 构建通过 + 浏览器实测三页（/home、/admin、/wall）导航栏均显示完整5项且右对齐头像，不再左对齐
- **关联文档**：`bug-log.md` BUG-W04
- **教训**：多处复制的 UI 片段应抽公共组件，避免"改一处漏其他"

---

### [fix] 发帖后自动滚动到最左侧展示新动态（BUG-W03）

- **时间**：2026-07-23
- **变更人**：陈梓键
- **背景**：用户反馈发帖后新卡片只露出半张，需手动滚动或刷新才能看到完整内容
- **变更内容**：`handlePublish()` 中 `posts.value.unshift()` 后，新增 `await nextTick()` + `gallery-track.scrollTo({ left: 0, behavior: 'smooth' })`，平滑滚动到最左侧展示新动态
- **文件**：`src/views/WallView.vue`（改）
- **验证**：线上发帖测试通过，新卡片完整展示在最左侧
- **关联文档**：`bug-log.md` BUG-W03

---

### [deploy] v2.0.0 线上部署 + Nginx /uploads/ 代理

- **时间**：2026-07-23
- **变更人**：陈梓键
- **变更内容**：
  1. **Nginx**（`/etc/nginx/sites-enabled/default`）：新增 `location ^~ /uploads/` 代理到后端 3000，服务师德墙图片静态资源。注意必须用 `^~` 前缀修饰符提升优先级，否则会被 `.jpg` 正则 location 截获导致 404
  2. **deploy.sh**：步骤从 9 步扩展到 11 步，新增 `seed.js`（系统管理员）→ `seedWall.js`（种子动态）→ `seedVersion.js`（版本公告）三个脚本执行环节；验证步骤新增师德墙 API 和版本公告检查
  3. **seedVersion.js**（新增）：v2.0.0 版本公告，幂等写入（已存在则 update）
  4. **deploy-production.md**：补充 v2.0.0 部署记录和 Nginx 变更说明
- **验证**：线上 `http://www.nandexueyuan.top/wall` 页面三条种子动态图片加载正常，控制台零报错

---

### [refactor] 男德墙改名为师德墙 + 种子动态作者统一为系统管理员

- **时间**：2026-07-23
- **变更人**：陈梓键
- **背景**：
  1. "男德墙"改名为"师德墙"，全局替换（前端导航/侧边栏/CSS 伪元素、后端注释/日志、PRD 文档/目录名）
  2. 种子动态不应挂在具体用户头上（陈梓键既是开发者又是用户，引起误解），统一改为系统管理员 `_system`
- **变更内容**：
  1. **seed.js**：新增系统管理员账号创建逻辑（username=`_system`，nickname=`系统管理员`，role=`super_admin`，status=`disabled`，随机密码不可登录）
  2. **seedWall.js**：3 条种子动态作者全部改为 `_system`
  3. **数据库迁移脚本**：已将 post #1 #2 从 chenzijian 迁移到 _system，post #3 从 qiuxuming 迁移到 _system
  4. **全局改名**（共 9 个文件）：`WallView.vue`、`MainView.vue`、`schema.prisma`、`index.js`、`api.js`、`seedWall.js`、`需求池.md`、PRD 目录 `06-男德墙/` → `06-师德墙/`
- **规则约定**：以后系统的默认数据（种子动态、公告发版等）统一使用系统管理员账号

---

### [feat] 师德墙模块完整实现（R-008）

- **时间**：2026-07-23
- **变更人**：陈梓键
- **背景**：男德学院现有功能偏工具向（聊天检索、游戏世界），缺少用户之间的轻社交互动。需要一个类似校园墙 / 朋友圈的模块
- **变更内容**：
  1. **数据库**（`schema.prisma` + 迁移 `20260723020354_add_wall_tables`）：新增 `Post`（动态）、`Comment`（评论）、`Like`（点赞）三张表，Post/Comment 与 User 关联并级联删除，Like 有 `[postId, userId]` 唯一约束
  2. **后端 API**（`wallController.js` 新增 + `api.js` 路由）：7 个 RESTful 接口
     - `GET /api/wall/posts` — 动态列表（倒序，含作者/评论/点赞数/是否已赞）
     - `POST /api/wall/posts` — 发帖（multipart/form-data，multer 图片上传，5MB 限制）
     - `DELETE /api/wall/posts/:id` — 删帖（作者或管理员，同步删图片文件）
     - `POST /api/wall/posts/:id/comments` — 评论
     - `DELETE /api/wall/comments/:id` — 删评论（作者或管理员）
     - `POST /api/wall/posts/:id/like` — 点赞（upsert）
     - `DELETE /api/wall/posts/:id/like` — 取消点赞
  3. **前端**（`WallView.vue` 新增 + `wall.js` API 封装 + `MainView.vue` 导航 + `router/index.js` 路由）：
     - 横向画展布局：左侧竖排标题栏 + 中间卡片从左到右滚动浏览
     - 展品风格卡片：编号 + 作者头像 + 大图 + 文字说明牌 + 点赞/评论互动栏
     - 发帖浮层（从顶部滑下）、评论展开/收起、点赞 toggle
     - 导航入口在男德通与男通讯录之间
  4. **种子数据**（`seedWall.js` + 3 张图片）：爱因斯坦名言、牛顿名言、丘序明"低迷"，图片来自 Wikimedia Commons 公共领域（压缩至 800×800）
- **验证**：`npm run build` 构建通过 + 浏览器全链路实测（发帖/评论/点赞/删除）
- **文件**：`schema.prisma`（改）、迁移（新增）、`wallController.js`（新增）、`api.js`/`index.js`（改）、`WallView.vue`/`wall.js`（新增）、`MainView.vue`/`router/index.js`（改）、`seedWall.js`（新增）、`wall-seed/*.jpg`（新增）
- **状态**：✅ 验收通过 + 线上部署完成
- **关联文档**：`需求池.md` R-008、`师德墙.md` PRD
