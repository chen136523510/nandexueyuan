# 师德墙（Wall）Bug Log

> 倒序排列，最新在最上方。记录开发与部署过程中遇到的 bug 及修复方式。

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
