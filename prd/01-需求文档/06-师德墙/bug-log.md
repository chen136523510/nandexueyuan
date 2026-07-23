# 师德墙（Wall）Bug Log

> 倒序排列，最新在最上方。记录开发与部署过程中遇到的 bug 及修复方式。

---

## 2026-07-23（导航栏统一重构）

### BUG-W04：进入男通讯录后导航页签左对齐、师德墙和德塔入口消失

- **现象**：管理员用户进入男通讯录（/admin）后，顶部导航栏页签突然全部挤到左侧，且师德墙、德塔两个入口消失，只剩首页、男德通、男通讯录三项
- **排查过程**：
  1. 对比 `/home` 和 `/admin` 两页的导航 snapshot，确认 /admin 少了两项且布局不同
  2. 检查 `src/router/index.js`，/admin 是独立路由（非 MainView 子路由），各自渲染自己的导航
  3. 读 `AdminView.vue` template，发现其导航只有3项硬编码，缺师德墙和德塔；且 `.topbar` CSS 缺 `justify-content: space-between`（MainView 有），导致页签全挤左边
  4. grep 确认导航在 MainView、AdminView、WallView 三处各自硬编码，新增师德墙模块时漏改 AdminView
- **根因**：导航栏代码在3个视图各自复制粘贴，新增模块时只改了2处，漏了 AdminView。这是重复代码技术债导致的典型漏改
- **修复方式**：抽取公共组件 `src/components/TopBar.vue`，三页统一引用 `<TopBar />`，导航菜单只维护一处
- **修复文件**：`src/components/TopBar.vue`（新增）、`src/views/MainView.vue`、`src/views/AdminView.vue`、`src/views/WallView.vue`（改）
- **验证**：浏览器实测 /home、/admin、/wall 三页导航栏均显示完整5项（首页/男德通/师德墙/男通讯录/德塔）+ 右侧头像，布局一致不再左对齐
- **教训**：多处复制的 UI 片段必须抽公共组件，否则每次新增模块都要手动同步多处，极易漏改

---

## 2026-07-23（师德墙线上问题修复）

### BUG-W03：发帖后新动态只露出半张卡片，无法滚动到完整位置

- **现象**：用户发帖后，新卡片插入到最左侧（`unshift` 到数组开头），但横向滚动条停在原位，导致新卡片只露出半张，需手动滚动或刷新才能看到完整内容
- **根因**：`handlePublish()` 中 `posts.value.unshift(res.data)` 后只做了 `showPostForm.value = false`，没有同步滚动 `gallery-track` 容器到最左侧
- **修复方式**：`unshift` 后用 `await nextTick()` 等 DOM 更新完成，再 `track.scrollTo({ left: 0, behavior: 'smooth' })` 平滑滚动到最左侧
- **修复文件**：`src/views/WallView.vue`（`handlePublish` 函数）
- **验证**：线上发帖后新卡片 #5 完整展示在最左侧（`scrollLeft: 32`，卡片 left=160 right=520 均在容器 876px 内），无需刷新

---

## 2026-07-23（师德墙部署）

### BUG-W01：线上种子动态图片 404（Nginx 正则 location 优先级问题）

- **现象**：线上访问 `/wall`，三条种子动态的图片均返回 404，控制台报错 `Failed to load resource: 404`
- **排查过程**：
  1. 直接请求后端 `curl -sI http://localhost:3000/uploads/wall/seed_xxx.jpg` 返回 200 -> **后端 Express 静态文件正常**
  2. 通过 Nginx 请求 `curl -sI http://localhost/uploads/wall/seed_xxx.jpg` 返回 404 -> **Nginx 层面问题**
  3. 检查 Nginx 配置，已添加 `location /uploads/ { proxy_pass http://localhost:3000; }`，但仍然 404
  4. 定位根因：Nginx 有一个 `location ~* \.(?:js|css|png|jpg|...)$` 正则 location 用于静态资源长缓存，**正则 location 的优先级高于普通前缀 location**，导致 `.jpg` 请求被正则 location 截获，走 `try_files $uri =404` 在 `dist/` 目录下找不到图片
- **修复方式**：将 `location /uploads/` 改为 `location ^~ /uploads/`，`^~` 前缀修饰符优先级高于正则，确保图片请求走 uploads 代理而非静态缓存规则
- **修复文件**：`/etc/nginx/sites-enabled/default`（服务器 Nginx 配置）
- **验证**：修改后 `curl -sI http://localhost/uploads/wall/seed_xxx.jpg` 返回 200，浏览器页面图片加载正常，控制台零报错
- **经验**：Nginx location 匹配优先级：`=` 精确 > `^~` 前缀 > `~`/`~*` 正则 > 普通前缀。当有正则 location 时，新增的前缀 location 需加 `^~` 提升优先级

---

### BUG-W02：sed 插入 Nginx 配置时换行符丢失

- **现象**：通过 `sed -i` 向 Nginx 配置文件插入 `/uploads/` location 块后，配置全部挤在一行，Nginx 无法正确解析
- **修复方式**：放弃 sed 增量修改，直接用 heredoc 重写完整的 Nginx 配置文件
- **经验**：多行 Nginx 配置块不要用 sed 插入，容易丢换行符。直接重写整个文件更可靠
