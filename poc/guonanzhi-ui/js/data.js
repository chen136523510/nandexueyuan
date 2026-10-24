// 国男志 UI 雏形 · 深圳首城 · 假数据（全部占位数值，不接任何游戏逻辑）
// 数据源：prd/01-需求文档/08-国男志/07-技术架构/UI雏形施工单-深圳首城v1.md（v1.2）

const CELL = 44;            // 格宽 px
const GRID = 12;            // 总幅面
const INNER = [2, 9];       // 开发区范围（总坐标 x,y ∈ 2..9）

const CAT_COLORS = {
  base: '#64b5f6', heavy: '#8d6e63', hi: '#4dd0e1', energy: '#ffd54f',
  light: '#a5d6a7', ent: '#f48fb1', res: '#80cbc4',
};

const CITY = {
  name: '深圳', faction: 'CN', factionColor: '#e63946',
  sub: '商业/工业 · 玩家老家',
  stocks: { gold: 5000, food: 3000, mil: 500, energy: 0, mat: 1000 },
  baseFlow: { prod: 20, tech: 5 },
  initialBuildings: [
    { catId: 'gov',      x: 5, y: 5, status: 'done' },  // 市政府 2×2（特殊件，不可建不可拆）
    { catId: 'internet', x: 2, y: 2, status: 'done' },
    { catId: 'academy',  x: 8, y: 2, status: 'done' },
    { catId: 'commu',    x: 2, y: 8, status: 'done' },
  ],
};

// 市政府特殊条目（不进 CATALOG，仅预置）
const GOV = { id: 'gov', name: '市政府', icon: '🏛️', w: 2, h: 2, color: '#ffd700', cover: 0, yields: {}, out: '城市核心 / 占领判定锚点' };

// 地形 overlay（v1.2 具名版，总幅面 12×12 坐标 x=列 y=行）
// sea：y=10,11 两整行；x=0~5=伶仃洋、x=6~11=深圳湾（同色，海面小字标注）
const TERRAIN = {
  river: { name: '深圳河', color: '#2a6f8e', cells: [[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9]] },
  mountain: [
    { name: '梧桐山', color: '#55606e', cells: [[4,1],[5,1]] },
    { name: '阳台山', color: '#55606e', cells: [[11,1]] },
  ],
  hill: [
    { name: '塘朗山', color: '#6b7a4f', cells: [[8,1],[9,1]] },
    { name: '莲花山', color: '#6b7a4f', cells: [[7,6]] },   // 紧邻市政府东侧
    { name: '大南山', color: '#6b7a4f', cells: [[7,9]] },
  ],
};

const SEA_TIPS = {
  west: '伶仃洋（珠江口）——深圳西面海域，跨海通道方向；登陆战滩头（二期）',
  east: '深圳湾——深港之间海域，红树林沿岸；登陆战滩头（二期）',
};
const RIVER_TIP = '深圳河——深港界河，过河减速+攻防下降（数值期待战斗细则）';
const MOUNTAIN_TIPS = {
  '梧桐山': '梧桐山——深圳第一峰（944m），不可建，几乎不可通行（工兵开路待兵种专题）',
  '阳台山': '阳台山——西北部山脉，不可建，几乎不可通行',
};
const HILL_TIP = (n, extra) => `${n}——${extra}丘陵：上坡减速/下坡加速/高打低加成（数值期待战斗细则）；雏形不可建`;
const HILL_TIPS = {
  '塘朗山': HILL_TIP('塘朗山', '南山/龙华交界，与梧桐山连成北部山带。'),
  '莲花山': HILL_TIP('莲花山', '市中心公园山（现实紧邻市民中心）。'),
  '大南山': HILL_TIP('大南山', '蛇口，俯瞰深圳湾。'),
};

// 可建目录（38 条）。yields 键：gold|food|energy|prod|tech|liv|cap|def|poll
const CATALOG = [
  // ---- 基础（base）----
  { id: 'academy', cat: 'base', name: '学院', icon: '🏫', w: 2, h: 2, gold: 800, mat: 200, turns: 3, cover: 0, yields: { tech: 10 }, out: '科技值 +10/回' },
  { id: 'market', cat: 'base', name: '商业中心', icon: '💰', w: 2, h: 2, gold: 1000, mat: 250, turns: 3, cover: 0, yields: { gold: 30 }, out: '金 +30/回' },
  { id: 'milbase', cat: 'base', name: '军事基地', icon: '🎖️', w: 3, h: 2, gold: 1200, mat: 300, turns: 4, cover: 3, yields: { cap: 200 }, out: '军力上限 +200 · 练兵加成（数值期）' },
  { id: 'farm', cat: 'base', name: '农田', icon: '🌾', w: 2, h: 2, gold: 300, mat: 80, turns: 2, cover: 0, yields: { food: 40 }, out: '粮 +40/回' },
  { id: 'wall', cat: 'base', name: '城墙', icon: '🧱', w: 1, h: 1, gold: 200, mat: 60, turns: 1, cover: 0, yields: { def: 10 }, out: '城防 +10（可多件连放）' },
  // ---- 产业 · 重工业（heavy）----
  { id: 'mine', cat: 'heavy', name: '矿采场', icon: '⛏️', w: 2, h: 2, gold: 400, mat: 100, turns: 2, cover: 0, yields: { prod: 8, poll: 2 }, out: '生产力 +8/回 · 污染 +2' },
  { id: 'steel', cat: 'heavy', name: '钢铁冶炼厂', icon: '🏭', w: 3, h: 2, gold: 900, mat: 220, turns: 3, cover: 0, yields: { prod: 18, poll: 4 }, out: '生产力 +18/回 · 污染 +4' },
  { id: 'chem', cat: 'heavy', name: '化工厂', icon: '🧪', w: 3, h: 2, gold: 1100, mat: 260, turns: 3, cover: 0, yields: { prod: 24, poll: 6 }, out: '生产力 +24/回 · 污染 +6' },
  { id: 'milfab', cat: 'heavy', name: '军工厂', icon: '🔧', w: 2, h: 2, gold: 1000, mat: 240, turns: 3, cover: 0, yields: { prod: 12 }, out: '生产力 +12/回 · 装备生产方向' },
  { id: 'shipyard', cat: 'heavy', name: '造船厂', icon: '⚓', w: 3, h: 2, gold: 1000, mat: 240, turns: 3, cover: 0, yields: { prod: 10 }, out: '生产力 +10/回 · 登陆投送方向' },
  // ---- 产业 · 高新技术（hi）----
  { id: 'internet', cat: 'hi', name: '互联网产业园', icon: '💻', w: 2, h: 2, gold: 800, mat: 200, turns: 3, cover: 0, yields: { prod: 8, tech: 6 }, out: '生产力 +8/回 · 科技 +6/回' },
  { id: 'semi', cat: 'hi', name: '半导体厂', icon: '🔬', w: 2, h: 2, gold: 1200, mat: 300, turns: 4, cover: 0, yields: { tech: 14 }, out: '科技值 +14/回' },
  { id: 'ai', cat: 'hi', name: 'AI 算力中心', icon: '🤖', w: 2, h: 2, gold: 1500, mat: 350, turns: 4, cover: 0, yields: { tech: 18 }, out: '科技值 +18/回' },
  // ---- 产业 · 能源（energy）----
  { id: 'thermal', cat: 'energy', name: '火力发电站', icon: '🔥', w: 2, h: 2, gold: 600, mat: 150, turns: 2, cover: 0, yields: { energy: 20, poll: 3 }, out: '能源 +20/回 · 污染 +3' },
  { id: 'hydro', cat: 'energy', name: '水力发电站', icon: '💧', w: 2, h: 2, gold: 700, mat: 180, turns: 3, cover: 0, yields: { energy: 16 }, out: '能源 +16/回（清洁）' },
  { id: 'nuclear', cat: 'energy', name: '核电站', icon: '☢️', w: 3, h: 3, gold: 2000, mat: 500, turns: 5, cover: 0, yields: { energy: 60 }, out: '能源 +60/回（核污染天灾变体：二期）' },
  { id: 'solar', cat: 'energy', name: '光伏/风电场', icon: '☀️', w: 2, h: 2, gold: 400, mat: 100, turns: 2, cover: 0, yields: { energy: 8 }, out: '能源 +8/回（清洁）' },
  // ---- 产业 · 轻工业（light）----
  { id: 'foodfab', cat: 'light', name: '食品加工厂', icon: '🍜', w: 2, h: 2, gold: 400, mat: 100, turns: 2, cover: 0, yields: { prod: 6, food: 8 }, out: '生产力 +6/回 · 粮 +8/回' },
  { id: 'textile', cat: 'light', name: '纺织服装厂', icon: '🧵', w: 2, h: 2, gold: 400, mat: 100, turns: 2, cover: 0, yields: { prod: 7 }, out: '生产力 +7/回' },
  { id: 'appliance', cat: 'light', name: '家电制造厂', icon: '📺', w: 2, h: 2, gold: 500, mat: 120, turns: 2, cover: 0, yields: { prod: 8 }, out: '生产力 +8/回 · 民生小加成' },
  // ---- 娱乐（ent，均有覆盖圈）----
  { id: 'park', cat: 'ent', name: '公园', icon: '🌳', w: 1, h: 1, gold: 150, mat: 40, turns: 1, cover: 1, yields: { liv: 2 }, out: '宜居 +2' },
  { id: 'stadium', cat: 'ent', name: '体育馆', icon: '🏟️', w: 2, h: 2, gold: 800, mat: 200, turns: 3, cover: 2, yields: { liv: 5 }, out: '宜居 +5' },
  { id: 'scenic', cat: 'ent', name: '名胜古迹景区', icon: '🏯', w: 2, h: 2, gold: 1000, mat: 250, turns: 3, cover: 3, yields: { liv: 8 }, out: '宜居 +8（挂城市地标）' },
  { id: 'beach', cat: 'ent', name: '海滨浴场', icon: '🏖️', w: 2, h: 2, gold: 500, mat: 120, turns: 2, cover: 2, coastal: true, yields: { liv: 5 }, out: '宜居 +5（沿海城限定）' },
  { id: 'funfair', cat: 'ent', name: '游乐园', icon: '🎡', w: 3, h: 2, gold: 1200, mat: 300, turns: 4, cover: 3, yields: { liv: 8 }, out: '宜居 +8' },
  { id: 'museum', cat: 'ent', name: '博物馆/美术馆', icon: '🖼️', w: 1, h: 1, gold: 300, mat: 80, turns: 1, cover: 1, yields: { liv: 2, tech: 2 }, out: '宜居 +2 · 科技 +2/回' },
  { id: 'cinema', cat: 'ent', name: '电影院/剧院', icon: '🎭', w: 1, h: 1, gold: 250, mat: 60, turns: 1, cover: 1, yields: { liv: 2 }, out: '宜居 +2' },
  { id: 'redlight', cat: 'ent', name: '红灯区', icon: '🔞', w: 2, h: 2, gold: 600, mat: 150, turns: 2, cover: 2, yields: { liv: 6 }, out: '宜居 +6 · 外交小减益（数值期）' },
  { id: 'esports', cat: 'ent', name: '电竞馆/网吧', icon: '🎮', w: 1, h: 1, gold: 200, mat: 50, turns: 1, cover: 1, yields: { liv: 2 }, out: '宜居 +2' },
  { id: 'onsen', cat: 'ent', name: '温泉', icon: '♨️', w: 1, h: 1, gold: 350, mat: 90, turns: 2, cover: 1, yields: { liv: 3 }, out: '宜居 +3', limit: '东京/名古屋/长崎' },
  // ---- 居民楼（res）----
  { id: 'cage', cat: 'res', name: '鸽子笼', icon: '🏚️', w: 1, h: 1, gold: 200, mat: 50, turns: 1, cover: 0, yields: { liv: -1 }, out: '承载 +高 · 宜居 -1' },
  { id: 'apt', cat: 'res', name: '密集型公寓', icon: '🏢', w: 1, h: 1, gold: 300, mat: 80, turns: 1, cover: 0, yields: {}, out: '承载 +中高' },
  { id: 'commu', cat: 'res', name: '小区', icon: '🏘️', w: 2, h: 2, gold: 600, mat: 150, turns: 2, cover: 0, yields: { liv: 3 }, out: '承载 +中 · 宜居 +3' },
  { id: 'villa', cat: 'res', name: '别墅', icon: '🏡', w: 2, h: 2, gold: 900, mat: 220, turns: 2, cover: 0, yields: { liv: 6 }, out: '承载 +低 · 宜居 +6' },
  { id: 'tongzilou', cat: 'res', name: '筒子楼/城中村', icon: '🏙️', w: 1, h: 1, gold: 150, mat: 40, turns: 1, cover: 0, yields: { liv: -2 }, out: '承载 +最高 · 宜居 -2' },
  { id: 'talent', cat: 'res', name: '人才公寓', icon: '🎓', w: 1, h: 1, gold: 400, mat: 100, turns: 1, cover: 0, yields: { tech: 2 }, out: '承载 +中 · 科技 +2/回', badge: '深圳特色' },
  { id: 'luxury', cat: 'res', name: '高级公寓', icon: '🌆', w: 1, h: 1, gold: 500, mat: 120, turns: 2, cover: 0, yields: { liv: 4 }, out: '承载 +中 · 宜居 +4' },
  { id: 'tonglou', cat: 'res', name: '唐楼', icon: '🏮', w: 1, h: 1, gold: 250, mat: 60, turns: 1, cover: 0, yields: {}, out: '鸽子笼变体', limit: '香港' },
];

// 城市下拉（本雏形仅深圳可选）
const ALL_CITIES = ['深圳', '北京', '上海', '西安', '香港', '台北', '东京', '名古屋', '长崎', '首尔', '仁川', '悉尼', '墨尔本'];
