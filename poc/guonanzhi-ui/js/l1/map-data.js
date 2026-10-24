// 国男志 L1 大地图 · 游戏数据（13 城 / 15 条邻接线）
// 继承自 原型预览/大地图总览-v1.html（真实经纬度定案），dx/dy 为屏幕像素微调（近邻城错位）
// 澳洲整体北移 AU_SHIFT（黑机协作-地图美术.md #1，院长定过"可上挪"，幅度待院长确认）

export const AU_SHIFT = 18; // 澳洲/新西兰/巴新统一北移纬度；设 0 = 真实位置
export const OCEANIA = new Set(["Australia", "Papua New Guinea", "New Zealand"]);

export const FACTIONS = {
  CN: { name: "中国", color: "#d8564e", dark: "#8f3230" },
  JP: { name: "日本", color: "#e0913c", dark: "#9c5f22" },
  KR: { name: "韩国", color: "#4f9fd8", dark: "#2d6b96" },
  AU: { name: "澳洲", color: "#5fbf7f", dark: "#33794a" },
};

// dx/dy 已按 S=1150 重标（原 v1 为 430 缩放档）
export const CITIES = [
  { id: "beijing", name: "北京", faction: "CN", lon: 116.4, lat: 39.9, dx: 0, dy: 0, lp: "tr", capital: false,
    note: "大都市 · 沙尘暴(二期)", generals: ["丘序明", "陆城锟"], init: "3 件+市政府" },
  { id: "shanghai", name: "上海", faction: "CN", lon: 121.5, lat: 31.2, dx: 0, dy: 0, lp: "r", capital: false,
    note: "商业都市 · 沿海", generals: ["魏嘉豪"], init: "3 件+市政府" },
  { id: "shenzhen", name: "深圳", faction: "CN", lon: 114.1, lat: 22.5, dx: -26, dy: -20, lp: "tl", capital: false,
    note: "中央军团 · 远洋起点", generals: ["陈梓键", "饶志锐", "袁崇轩", "朱宇涵"], init: "3 件+市政府" },
  { id: "xian", name: "西安", faction: "CN", lon: 108.9, lat: 34.3, dx: 0, dy: 0, lp: "l", capital: false,
    note: "内陆边城 · 异族方向(二期)", generals: ["陈俊杰"], init: "3 件+市政府" },
  { id: "hongkong", name: "香港", faction: "CN", lon: 114.2, lat: 22.3, dx: 26, dy: -2, lp: "br", capital: false,
    note: "商业都市", generals: ["汪煜坤", "宁浩然"], init: "3 件+市政府" },
  { id: "taibei", name: "台北", faction: "CN", lon: 121.5, lat: 25.0, dx: 34, dy: 14, lp: "br", capital: false,
    note: "富士康工业 · 低忠诚高自立风险", generals: ["王乐添"], init: "3 件+市政府" },
  { id: "tokyo", name: "东京", faction: "JP", lon: 139.7, lat: 35.7, dx: 0, dy: 0, lp: "tr", capital: true,
    note: "首都 · 秋叶原/银座/富士山", generals: ["陈睿", "谌礼鹏"], init: "3 件+市政府" },
  { id: "nagoya", name: "名古屋", faction: "JP", lon: 136.9, lat: 35.2, dx: 0, dy: 0, lp: "br", capital: false,
    note: "丰田城 · 无人驾驶梗", generals: ["卢沐阳"], init: "3 件+市政府" },
  { id: "nagasaki", name: "长崎", faction: "JP", lon: 129.9, lat: 32.8, dx: 0, dy: 0, lp: "bl", capital: false,
    note: "开港边港 · 对马岛属此", generals: ["张迅"], init: "3 件+市政府" },
  { id: "seoul", name: "首尔", faction: "KR", lon: 127.0, lat: 37.6, dx: -18, dy: -22, lp: "tl", capital: true,
    note: "首都 · 直连北京/东京", generals: ["徐浩森", "陈楠"], init: "3 件+市政府" },
  { id: "incheon", name: "仁川", faction: "KR", lon: 126.6, lat: 37.5, dx: 24, dy: 30, lp: "bl", capital: false,
    note: "登陆战代言城", generals: ["黄学远"], init: "3 件+市政府" },
  { id: "sydney", name: "悉尼", faction: "AU", lon: 151.2, lat: -33.9, dx: 0, dy: 0, lp: "r", capital: false, oc: true,
    note: "沿海 · 远洋终点", generals: ["马逸杰"], init: "3 件+市政府" },
  { id: "melbourne", name: "墨尔本", faction: "AU", lon: 144.96, lat: -37.8, dx: 0, dy: 0, lp: "r", capital: false, oc: true,
    note: "沿海", generals: ["邹志华", "庞楷垒"], init: "3 件+市政府" },
];

// 连线类型：land 内陆实线 / sea 跨海蓝虚线(登陆战) / fake 架空红虚线 / ocean 远洋金点线
export const LINKS = [
  { a: "beijing", b: "seoul", type: "fake" },
  { a: "beijing", b: "incheon", type: "fake" },
  { a: "seoul", b: "tokyo", type: "sea" },
  { a: "beijing", b: "xian", type: "land" },
  { a: "beijing", b: "shanghai", type: "land" },
  { a: "shanghai", b: "shenzhen", type: "land" },
  { a: "shenzhen", b: "hongkong", type: "land" },
  { a: "shanghai", b: "taibei", type: "sea" },
  { a: "shenzhen", b: "taibei", type: "sea" },
  { a: "tokyo", b: "nagoya", type: "land" },
  { a: "nagoya", b: "nagasaki", type: "land" },
  { a: "seoul", b: "incheon", type: "land" },
  { a: "sydney", b: "melbourne", type: "land" },
  { a: "shenzhen", b: "sydney", type: "ocean" },
  { a: "tokyo", b: "sydney", type: "ocean" },
];
