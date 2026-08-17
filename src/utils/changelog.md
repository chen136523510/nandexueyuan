# Utils Changelog

> 倒序排列，最新在最上方。utils 层首个 changelog（2026-08-17 创建，历史 utils 变更散记在 views/changelog.md）。

---

## 2026-08-17（白机·星河问运势模块）
- [新增] `fortune.js` - 今日运势/星座分析纯前端生成器：FNV-1a 哈希 + mulberry32 确定性伪随机（同人同天恒定、跨天自动换签）；12 星座数据（名称/区间/图标/梗文案）+ `zodiacFromMonthDay` 月日换算（17 个边界日期 node 实测验证，含每月最大日号拦截 2.30 类非法日期）；男德风味文案池（宜/忌/签语/幸运色，色值取自莫兰迪体系）；`getPersonalFortune`（seed=用户标识）/ `getZodiacToday`（同星座全站一致）
- commit: 待提交 [feat](门户): 星河问运势模块

---
