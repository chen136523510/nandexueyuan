// L1 大地图 · 手绘渲染引擎（三国群英传7 风格参考：暖色手绘 + 地貌晕染 + 城池图标 + 书法匾额）
// 一次预渲染整幅底图（离屏 2x），主程序只做相机变换 + 少量动态层
import GEO from "./geo-data.js";
import { AU_SHIFT, OCEANIA, FACTIONS, CITIES, LINKS } from "./map-data.js";
import { mulberry32, fbm, mix, rgba, desat, clamp } from "./noise.js";

// ---------- 投影（d3.geoNaturalEarth1 同款公式，离散实现，离线可用） ----------
export const S = 1150;                       // 每弧度像素
export const WORLD = { w: 1880, h: 1720 };   // 逻辑世界尺寸
const CENTER = [126, 10];
const RAD = Math.PI / 180;

function ne1(lam, phi) {
  const p2 = phi * phi, p4 = p2 * p2;
  return [
    lam * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
    phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
  ];
}
const C0 = ne1(CENTER[0] * RAD, CENTER[1] * RAD);

// latShift: 澳洲板块（澳洲/新西兰/巴新）整体北移
export function proj(lon, lat, latShift = 0) {
  const [x, y] = ne1(lon * RAD, (lat + latShift) * RAD);
  return [WORLD.w / 2 + (x - C0[0]) * S, WORLD.h / 2 - (y - C0[1]) * S];
}

// ---------- 地形设定（山脊/孤峰/高原/盆地，经纬度手录，基于现实走向） ----------
const RIDGES = [
  // 中国（w=半衰减宽 px，总宽≈2.4w；对应现实走向）
  { pts: [[122.5, 49], [120.5, 51.5], [119, 53.2]], w: 48, h: 2.0 },   // 大兴安岭
  { pts: [[127.5, 48.5], [129.5, 47.8]], w: 38, h: 1.6 },              // 小兴安岭
  { pts: [[126.8, 41.5], [128.6, 42.3], [130, 42.6]], w: 42, h: 2.2 }, // 长白山
  { pts: [[122.3, 40.3], [124.2, 40.1]], w: 32, h: 1.3 },              // 千山
  { pts: [[107.5, 41], [110.5, 41.2], [113, 41.6]], w: 36, h: 1.5 },   // 阴山
  { pts: [[111, 35.8], [111.6, 38.5]], w: 34, h: 1.7 },                // 吕梁山
  { pts: [[112.7, 35.6], [113.4, 37.5], [114.1, 39.6]], w: 45, h: 2.3 },// 太行山
  { pts: [[105.8, 32.9], [108, 33.2], [110.8, 33.6]], w: 48, h: 2.6 }, // 秦岭
  { pts: [[107.6, 31.6], [110, 31.7], [111.6, 30.9]], w: 38, h: 1.9 }, // 大巴-巫山
  { pts: [[108.6, 29.3], [110.6, 28.2]], w: 32, h: 1.5 },              // 武陵山
  { pts: [[110.4, 27.8], [111.6, 26.6]], w: 28, h: 1.4 },              // 雪峰山
  { pts: [[113.9, 28.9], [114.2, 26.4]], w: 30, h: 1.6 },              // 罗霄山
  { pts: [[116.2, 25.4], [117.6, 27.2], [118.4, 28.6]], w: 38, h: 1.9 },// 武夷山
  { pts: [[110.2, 24.9], [113, 25.1], [115.8, 24.9]], w: 36, h: 1.5 }, // 南岭
  { pts: [[105.5, 22.2], [108, 22.4]], w: 28, h: 1.2 },                // 十万大山
  { pts: [[82, 29], [88, 28.2], [94, 28.3], [97, 28.8]], w: 58, h: 3.3 },// 喜马拉雅
  { pts: [[88, 36], [94, 35.8], [99, 35.5]], w: 55, h: 2.9 },          // 昆仑-唐古拉
  { pts: [[98.5, 28], [100.5, 26], [101.5, 24.5]], w: 42, h: 3.0 },    // 横断山
  { pts: [[76, 42], [82, 42.8], [88, 43.2]], w: 52, h: 3.2 },          // 天山
  { pts: [[88, 48.5], [92, 49.3], [95, 50]], w: 40, h: 2.4 },          // 阿尔泰
  { pts: [[96, 52.5], [101, 52.8]], w: 40, h: 2.4 },                   // 萨彦岭
  { pts: [[108.5, 48], [110, 48.4]], w: 30, h: 1.4 },                  // 肯特山
  { pts: [[97, 47], [100, 47.3], [102.5, 47]], w: 40, h: 1.8 },        // 杭爱山
  { pts: [[69, 36], [72.5, 36.5]], w: 45, h: 3.0 },                    // 兴都库什(边缘)
  // 朝鲜半岛
  { pts: [[129, 38.4], [128.6, 37.2], [128.2, 36.2]], w: 36, h: 1.7 }, // 太白山脉
  { pts: [[126.6, 39.8], [127.6, 40.4]], w: 32, h: 1.5 },              // 狼林山脉
  // 日本
  { pts: [[136.4, 36.3], [137.8, 36.1], [138.5, 35.8]], w: 36, h: 2.2 },// 飞驒山脉
  { pts: [[140.2, 39.3], [140.9, 40.6], [141.3, 41.5]], w: 34, h: 1.8 },// 奥羽山脉
  { pts: [[142.8, 43.2], [142.4, 44.2]], w: 28, h: 1.7 },              // 日高山地
  { pts: [[130.8, 32.4], [131.4, 32.9]], w: 26, h: 1.3 },              // 九州山地
  { pts: [[132.8, 33.6], [134.2, 33.8]], w: 26, h: 1.3 },              // 四国山地
  { pts: [[131.8, 34.9], [133.5, 35.1]], w: 26, h: 1.2 },              // 中国山地
  // 台湾
  { pts: [[121.1, 25.1], [120.9, 23.4], [120.85, 22.2]], w: 26, h: 2.4 },// 中央山脉
  // 澳洲（随 AU_SHIFT 平移）
  { pts: [[145.5, -19.5], [147.5, -24], [149.5, -28.5], [148.8, -33], [146.5, -37]], w: 40, h: 1.1, oc: 1 }, // 大分水岭
  { pts: [[131, -23.6], [134.5, -23.9]], w: 26, h: 0.7, oc: 1 },       // 麦克唐奈山
  { pts: [[169.5, -43.8], [170.5, -42.5], [171.3, -41.5]], w: 28, h: 2.0, oc: 1 }, // 新西兰南阿尔卑斯
];
const CONES = [
  { c: [138.3, 35.2], r: 11, h: 3.7, snow: 1 },      // 富士山
  { c: [128.1, 42.0], r: 11, h: 3.0, snow: 1 },      // 长白山天池
  { c: [120.95, 23.47], r: 9, h: 3.2, snow: 1 },     // 玉山
  { c: [118.2, 30.1], r: 10, h: 1.8 },               // 黄山
  { c: [73.5, 38.5], r: 30, h: 3.8 },                // 帕米尔
];
const DOMES = [ // rx/ry 单位：度
  { c: [90, 32.5], rx: 10, ry: 5.5, h: 2.3 },        // 青藏高原
  { c: [103.5, 26], rx: 3.2, ry: 2.2, h: 1.5 },      // 云贵高原
  { c: [107.5, 36.5], rx: 4, ry: 2.5, h: 0.9 },      // 黄土高原
  { c: [103, 47.5], rx: 7, ry: 3.5, h: 0.9 },        // 蒙古高原
  { c: [104, 30.3], rx: 2.2, ry: 1.6, h: -0.5 },     // 四川盆地(负)
  { c: [116, 36.5], rx: 3.4, ry: 3.4, h: -0.3 },     // 华北平原(负)
  { c: [115.5, 30.5], rx: 4.6, ry: 1.7, h: -0.25 },  // 长江中下游(负)
  { c: [124.5, 44], rx: 3.2, ry: 3, h: -0.2 },       // 东北平原(负)
  { c: [125, -24], rx: 9, ry: 7, h: 0.45, oc: 1 },   // 澳洲西部高原
];
const RIVERS = [
  { name: "黄河", w: 3.2, pts: [[96.5, 35.2], [100.5, 35.9], [103.8, 36.1], [105.8, 37.6], [106.5, 38.8], [108.5, 40.4], [111, 40.3], [110.6, 38.2], [110.4, 35.2], [110.6, 34.7], [113.6, 34.9], [116.5, 35.9], [117.9, 36.8], [119.1, 37.7]] },
  { name: "长江", w: 3.8, pts: [[91.5, 33.3], [97, 32.5], [101, 30.2], [104.6, 28.8], [106.6, 29.6], [108.5, 30.4], [111.3, 30.7], [114.3, 30.6], [116, 29.8], [117.3, 30.9], [118.8, 32.1], [120.5, 31.9], [121.9, 31.5]] },
  { name: "珠江", w: 2.6, pts: [[102.9, 25.1], [105.5, 24.3], [108.3, 22.9], [110.5, 23.3], [111.3, 23.5], [112.5, 23.1], [113.6, 22.75]] },
  { name: "黑龙江", w: 3, pts: [[121.5, 53.3], [124.5, 52.2], [127.5, 50.2], [130.6, 48.9], [134.5, 48.3], [137.5, 48.8]] },
  { name: "墨累河", w: 2.6, oc: 1, pts: [[148.8, -24.6], [146.2, -29], [143.5, -32], [141.3, -34.2], [139.2, -35.3]] },
];
const SEA_LABELS = [
  { name: "渤海", c: [119.8, 38.6], s: 20 },
  { name: "黄海", c: [123.8, 35.2], s: 24 },
  { name: "东海", c: [126.2, 28.8], s: 26 },
  { name: "南海", c: [113.5, 16.5], s: 30 },
  { name: "太平洋", c: [141.5, 24.5], s: 30 },
  { name: "日本海", c: [134.8, 41.5], s: 22 },
  { name: "鄂霍次克海", c: [146.5, 52.8], s: 16 },
  { name: "珊瑚海", c: [151, -14], s: 20, oc: 1 },
];
const LAND_LABELS = [
  { name: "中国", c: [102.5, 34.5], s: 42, col: [92, 78, 52] },
  { name: "蒙古", c: [103.5, 46.2], s: 26, col: [120, 100, 70] },
  { name: "俄罗斯", c: [112, 52.2], s: 26, col: [110, 105, 100] },
  { name: "印度", c: [84, 23.5], s: 30, col: [130, 105, 70] },
  { name: "哈萨克斯坦", c: [70.5, 46.5], s: 18, col: [120, 105, 80] },
  { name: "朝鲜", c: [126.8, 40.6], s: 15, col: [90, 85, 70] },
  { name: "韩国", c: [127.9, 36.2], s: 15, col: [90, 85, 70] },
  { name: "日本", c: [141.6, 39.6], s: 24, col: [90, 85, 75] },
  { name: "澳大利亚", c: [133.5, -25.5], s: 34, col: [96, 58, 34], oc: 1 },
  { name: "新西兰", c: [172.8, -40.5], s: 16, col: [85, 100, 85], oc: 1 },
];
const FONT_KAI = '"KaiTi","STKaiti","BiauKai","DFKai-SB",serif';

// ---------- 高度场 ----------
const CELL = 3; // 高度场分辨率（世界像素/格）
const GW = Math.ceil(WORLD.w / CELL), GH = Math.ceil(WORLD.h / CELL);
let heightGrid, roleGrid; // role: 0海 1focus 2context 3au

function ridgeGeom() {
  return RIDGES.map(r => {
    const pts = r.pts.map(([lo, la]) => proj(lo, la, r.oc ? AU_SHIFT : 0));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { pts, w: r.w, h: r.h, x0: x0 - r.w * 2, y0: y0 - r.w * 2, x1: x1 + r.w * 2, y1: y1 + r.w * 2 };
  });
}
const RGEOM = ridgeGeom();

function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  let t = L2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / L2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
}

export function heightAt(px, py) {
  let h = 0.12 + fbm(px / 260, py / 260, 4, 11) * 0.38 - fbm(px / 90, py / 90, 3, 23) * 0.06;
  for (const r of RGEOM) {
    if (px < r.x0 || px > r.x1 || py < r.y0 || py > r.y1) continue;
    let d = 1e9;
    for (let i = 0; i < r.pts.length - 1; i++) d = Math.min(d, segDist(px, py, r.pts[i], r.pts[i + 1]));
    if (d < r.w * 1.2) {
      const t = 1 - d / (r.w * 1.2);
      const ridgeNoise = 0.8 + fbm(px / 34, py / 34, 3, 41) * 0.3;
      h += r.h * t * t * (3 - 2 * t) * ridgeNoise;
    }
  }
  for (const c of CONES) {
    const [cx, cy] = proj(c.c[0], c.c[1]);
    const d = Math.hypot(px - cx, py - cy);
    if (d < c.r * 3.2) {
      const t = 1 - d / (c.r * 3.2);
      h += c.h * Math.pow(t, 2.1);
    }
  }
  for (const dme of DOMES) {
    const [cx, cy] = proj(dme.c[0], dme.c[1], dme.oc ? AU_SHIFT : 0);
    const rx = dme.rx * 16.3, ry = dme.ry * 20.3;
    const q = Math.hypot((px - cx) / rx, (py - cy) / ry);
    if (q < 1) h += dme.h * Math.pow(1 - q * q, 1.4) * (0.8 + fbm(px / 150, py / 150, 3, 61) * 0.4);
  }
  return clamp(h, 0, 4.2);
}

function buildGrids() {
  heightGrid = new Float32Array(GW * GH);
  roleGrid = new Uint8Array(GW * GH);
  // 高度场（逐格）
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++)
      heightGrid[gy * GW + gx] = heightAt(gx * CELL + 1.5, gy * CELL + 1.5);
  // 陆地掩膜（用离屏 canvas 一次成型：红=主舞台 绿=澳洲 蓝=陪衬）
  const mc = document.createElement("canvas");
  mc.width = GW; mc.height = GH;
  const m = mc.getContext("2d");
  m.fillStyle = "#000"; m.fillRect(0, 0, GW, GH);
  const drawCountry = (name, color) => {
    const c = GEO[name]; if (!c) return;
    const shift = OCEANIA.has(name) ? AU_SHIFT : 0;
    m.fillStyle = color;
    for (const ring of c.polys) {
      m.beginPath();
      ring.forEach(([lo, la], i) => {
        const [x, y] = proj(lo, la, shift);
        i ? m.lineTo(x / CELL, y / CELL) : m.moveTo(x / CELL, y / CELL);
      });
      m.closePath(); m.fill();
    }
  };
  for (const name of Object.keys(GEO)) drawCountry(name, "#0000ff");
  for (const name of ["China", "Japan", "South Korea", "North Korea", "Taiwan"]) drawCountry(name, "#ff0000");
  for (const name of OCEANIA) drawCountry(name, "#00ff00");
  const d = m.getImageData(0, 0, GW, GH).data;
  for (let i = 0; i < GW * GH; i++) {
    const r = d[i * 4], g = d[i * 4 + 1];
    roleGrid[i] = r > 128 ? 1 : g > 128 ? 3 : d[i * 4 + 2] > 128 ? 2 : 0;
  }
}

// ---------- 色板 ----------
const PAL = {
  plain: [154, 176, 106], farm: [178, 178, 108], dry: [186, 168, 116],
  hill: [124, 154, 86], forest: [92, 126, 74], mount: [138, 132, 116],
  mountHi: [160, 152, 132], snow: [238, 242, 244],
  plateau: [172, 156, 126], desert: [196, 156, 100],
  auRed: [186, 118, 74], auRed2: [206, 146, 92], auGreen: [124, 152, 92],
  sea: [30, 74, 106], seaMid: [44, 100, 136], seaShallow: [88, 152, 168], seaShore: [150, 204, 200],
};
function snowLine(lat) { return lat > 44 ? 2.9 : lat > 36 ? 3.5 : 3.9; }

function biome(px, py, h, role, nearSea) {
  const nx = px / 46, ny = py / 46;
  const moist = fbm(nx, ny, 3, 77);
  let c;
  if (role === 3) { // 澳洲板块：内陆红心用径向渐变（澳本陆限定），新西兰/巴新走常态绿
    const [ax0, ax1] = [proj(116, 0)[0], proj(153.6, 0)[0]];
    const [ay0, ay1] = [proj(0, -12.5)[1], proj(0, -39)[1]];
    const inMainland = px > ax0 && px < ax1 && py > ay0 && py < ay1;
    const green = mix(PAL.auGreen, PAL.hill, clamp(h * 0.9, 0, 1) * 0.8 + moist * 0.2);
    if (inMainland && h < 0.9) {
      const [ccx, ccy] = proj(129, -24.5, AU_SHIFT);
      const eq = Math.hypot((px - ccx) / 430, (py - ccy) / 330);
      const inner = clamp(1 - eq + (fbm(px / 120, py / 120, 3, 91) - 0.5) * 0.9, 0, 1) * clamp(1.1 - h, 0, 1);
      c = mix(green, mix(PAL.auRed, PAL.auRed2, moist * 0.8), inner * 0.85);
    } else c = green;
  } else {
    if (h > snowLine(pyToLat(px, py))) c = PAL.snow;
    else if (h > 1.5) c = mix(PAL.mount, PAL.mountHi, clamp((h - 1.5) / 1.4, 0, 1));
    else if (h > 0.95) c = mix(PAL.forest, PAL.mount, (h - 0.95) / 0.55);
    else if (h > 0.5) c = mix(PAL.hill, PAL.forest, (h - 0.5) / 0.45 * 0.7 + moist * 0.3);
    else c = mix(PAL.plain, PAL.farm, moist * 0.9);
    // 青藏高原整体色（粗略区段：x<约100E 且 26N~38N 且高）
    if (px < proj(100.5, 32)[0] && py > proj(0, 26)[1] && py < proj(0, 38.5)[1] && h > 1.3)
      c = mix(PAL.plateau, PAL.mountHi, clamp((h - 1.3) / 2.2, 0, 1));
    // 黄土高原染色
    const lg = proj(107.5, 36.5), lr = 70;
    if (Math.abs(px - lg[0]) < lr * 1.6 && Math.abs(py - lg[1]) < lr * 1.1 && h < 1.4)
      c = mix(c, PAL.dry, 0.45 * (1 - Math.hypot((px - lg[0]) / lr / 1.6, (py - lg[1]) / lr / 1.1)));
    // 西北干旱区（新疆-蒙古戈壁粗略区段）
    if (px < proj(106, 42)[0] && py > proj(0, 36)[1] && py < proj(0, 50)[1] && h < 1.2)
      c = mix(c, PAL.desert, 0.55 * fbm(px / 200, py / 200, 3, 99));
  }
  if (role === 2) c = desat(c, 0.5, 0.12);
  if (nearSea && h < 0.18) c = mix(c, PAL.seaShore, 0.25); // 仅海岸带湿沙
  return c;
}
function pyToLat(px, py) {
  // 世界 y → 纬度（反投影 y 轴近似，用于雪线）
  const y = C0[1] + (WORLD.h / 2 - py) / S;
  return y / RAD;
}

// 是否近海（供海岸湿沙判定）：邻域 2 格内存在海格
function isNearSea(gx, gy) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const x = gx + dx * 2, y = gy + dy * 2;
      if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
      if (!roleGrid[y * GW + x]) return true;
    }
  return false;
}

// ---------- 城市图标画笔（写实小景） ----------
function shadowBlob(c, x, y, w) {
  const g = c.createRadialGradient(x, y, 0, x, y, w);
  g.addColorStop(0, "rgba(30,25,15,0.32)"); g.addColorStop(1, "rgba(30,25,15,0)");
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y + 2, w, w * 0.42, 0, 0, 7); c.fill();
}
function plaza(c, x, y, w) {
  c.fillStyle = "rgba(196,192,168,0.5)";
  c.beginPath(); c.ellipse(x, y, w, w * 0.36, 0, 0, 7); c.fill();
}
// 单体楼：受西北光（左亮右暗），窗带
function tower(c, x, y, w, h, tint = [205, 212, 216], glass = 0.22) {
  x -= w / 2;
  const g = c.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, rgba(tint.map(v => Math.min(255, v + 22))));
  g.addColorStop(0.55, rgba(tint));
  g.addColorStop(1, rgba(tint.map(v => Math.max(0, v - 62))));
  c.fillStyle = g; c.fillRect(x, y - h, w, h);
  c.fillStyle = `rgba(255,255,255,0.5)`; c.fillRect(x, y - h, 1.2, h);      // 左棱高光
  c.fillStyle = `rgba(35,40,45,0.45)`; c.fillRect(x + w - 1.4, y - h, 1.4, h); // 右棱阴影
  c.fillStyle = `rgba(30,45,60,${glass})`;
  for (let wy = y - h + 2.5; wy < y - 2; wy += 3.2) c.fillRect(x + 1.6, wy, w - 3.4, 1.5);
  c.fillStyle = "rgba(60,66,70,0.85)"; c.fillRect(x - 0.5, y - h - 1.4, w + 1, 1.6); // 顶
}
function treeClump(c, x, y, r, col = [70, 108, 58]) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, rgba(col.map(v => Math.min(255, v + 34)))); g.addColorStop(1, rgba(col.map(v => Math.round(v * 0.62))));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
function crane(c, x, y, s, col = [188, 96, 52]) {
  c.strokeStyle = rgba(col); c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - s); c.moveTo(x - s * 0.42, y); c.lineTo(x - s * 0.42, y - s * 0.55); c.lineTo(x + s * 0.42, y - s * 0.55); c.moveTo(x, y - s); c.lineTo(x + s * 0.42, y - s * 0.55); c.stroke();
}
function coneMt(c, x, y, r, h, rock = [128, 120, 104]) {
  const g = c.createLinearGradient(x - r, y - h, x + r * 0.7, y);
  g.addColorStop(0, rgba(rock.map(v => v + 26))); g.addColorStop(1, rgba(rock.map(v => Math.round(v * 0.68))));
  c.fillStyle = g; c.beginPath();
  c.moveTo(x - r, y); c.quadraticCurveTo(x - r * 0.2, y - h * 0.75, x, y - h);
  c.quadraticCurveTo(x + r * 0.3, y - h * 0.7, x + r, y); c.closePath(); c.fill();
  const s = c.createLinearGradient(x - r * 0.4, y - h, x, y - h * 0.35);
  s.addColorStop(0, "rgba(240,245,248,0.95)"); s.addColorStop(1, "rgba(240,245,248,0)");
  c.fillStyle = s; c.beginPath();
  c.moveTo(x - r * 0.42, y - h * 0.62); c.quadraticCurveTo(x - r * 0.15, y - h * 0.86, x, y - h);
  c.quadraticCurveTo(x + r * 0.18, y - h * 0.84, x + r * 0.3, y - h * 0.58); c.closePath(); c.fill();
}

// 每城一段小景（锚点=地面中心，尺寸≈36px 宽）
const CITY_PAINTERS = {
  beijing(c, x, y) {
    plaza(c, x, y, 26); shadowBlob(c, x, y, 30);
    tower(c, x - 16, y + 3, 8, 16, [172, 178, 184]); tower(c, x + 15, y + 2, 9, 20, [188, 194, 198]);
    // 天安门式红墙金顶
    c.fillStyle = "#a83228"; c.fillRect(x - 13, y - 12, 26, 12);
    c.fillStyle = "rgba(255,255,255,0.75)"; c.fillRect(x - 13, y - 3, 26, 3);
    c.fillStyle = "#c8912e"; c.beginPath();
    c.moveTo(x - 16, y - 12); c.quadraticCurveTo(x, y - 19, x + 16, y - 12);
    c.lineTo(x + 14, y - 10.5); c.quadraticCurveTo(x, y - 16.5, x - 14, y - 10.5); c.closePath(); c.fill();
    c.fillStyle = "rgba(40,25,15,0.5)"; c.fillRect(x - 2.5, y - 9, 5, 9);
    treeClump(c, x - 24, y + 5, 6); treeClump(c, x + 24, y + 4, 5);
  },
  shanghai(c, x, y) {
    plaza(c, x, y, 26); shadowBlob(c, x, y, 32);
    tower(c, x - 18, y + 3, 7, 14, [190, 180, 168]);
    tower(c, x - 8, y + 2, 9, 24, [200, 190, 178]);      // 金茂
    tower(c, x + 3, y + 3, 8, 30, [208, 214, 220]);      // 上海中心(扭转收分)
    tower(c, x + 14, y + 2, 8, 18, [190, 196, 200]);
    // 东方明珠
    c.strokeStyle = "#9aa4ac"; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(x + 24, y + 2); c.lineTo(x + 24, y - 24); c.stroke();
    c.fillStyle = "#c47a8a"; c.beginPath(); c.arc(x + 24, y - 17, 3.4, 0, 7); c.fill();
    c.beginPath(); c.arc(x + 24, y - 8, 2.4, 0, 7); c.fill();
  },
  shenzhen(c, x, y) {
    plaza(c, x, y, 26); shadowBlob(c, x, y, 32);
    tower(c, x - 15, y + 3, 7, 15, [196, 202, 208]);
    tower(c, x - 6, y + 2, 8, 20, [186, 194, 202]);
    tower(c, x + 4, y + 3, 9, 34, [210, 218, 226]);      // 平安金融中心
    c.fillStyle = "#8fa0ae"; c.beginPath(); c.moveTo(x + 4, y - 34); c.lineTo(x + 8.5, y - 27); c.lineTo(x - 0.5, y - 27); c.closePath(); c.fill();
    tower(c, x + 16, y + 2, 7, 17, [200, 206, 212]);
    treeClump(c, x - 24, y + 5, 5);
  },
  xian(c, x, y) {
    plaza(c, x, y, 24); shadowBlob(c, x, y, 28);
    // 城墙段 + 钟楼（内陆古都意象）
    c.fillStyle = "#b3a184"; c.fillRect(x - 22, y - 6, 44, 6);
    c.fillStyle = "rgba(70,58,40,0.55)";
    for (let i = 0; i < 6; i++) c.fillRect(x - 22 + i * 8, y - 8.5, 4.5, 2.8);
    c.fillStyle = "#8c6239"; c.fillRect(x - 5, y - 16, 10, 10);
    c.fillStyle = "#4f7a52"; c.beginPath();
    c.moveTo(x - 8, y - 16); c.quadraticCurveTo(x, y - 23, x + 8, y - 16); c.lineTo(x + 6.5, y - 14.5); c.quadraticCurveTo(x, y - 20, x - 6.5, y - 14.5); c.closePath(); c.fill();
    treeClump(c, x - 27, y + 4, 5); treeClump(c, x + 26, y + 5, 5);
  },
  hongkong(c, x, y) {
    shadowBlob(c, x, y, 30);
    tower(c, x - 17, y + 1, 6, 14, [196, 200, 206]); tower(c, x - 9, y, 7, 22, [206, 210, 216]);
    tower(c, x, y + 1, 7, 26, [214, 220, 226]); tower(c, x + 9, y, 7, 20, [200, 206, 212]);
    tower(c, x + 17, y + 1, 6, 15, [192, 198, 204]);
    coneMt(c, x + 1, y - 18, 14, 12, [96, 118, 82]);      // 太平山
    treeClump(c, x - 24, y + 4, 5);
  },
  taibei(c, x, y) {
    plaza(c, x, y, 22); shadowBlob(c, x, y, 26);
    tower(c, x - 14, y + 2, 7, 14, [198, 202, 208]); tower(c, x + 12, y + 2, 7, 15, [198, 204, 210]);
    // 101：节节收分 + 长针
    let wy = y, ww = 13;
    for (let i = 0; i < 6; i++) { tower(c, x - 2, wy, ww, 6.5, [214, 220, 226]); wy -= 6.5; ww -= 1.9; }
    c.strokeStyle = "#9aa6b0"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x - 2, wy); c.lineTo(x - 2, wy - 9); c.stroke();
  },
  tokyo(c, x, y) {
    plaza(c, x, y, 28); shadowBlob(c, x, y, 34);
    tower(c, x - 19, y + 3, 7, 16, [202, 206, 212]); tower(c, x - 10, y + 2, 8, 22, [196, 202, 208]);
    tower(c, x + 8, y + 2, 8, 20, [208, 212, 218]); tower(c, x + 17, y + 3, 7, 14, [198, 204, 210]);
    // 东京塔（红白铁塔）
    c.fillStyle = "#c2503c";
    c.beginPath(); c.moveTo(x + 1, y - 26); c.lineTo(x + 6, y + 2); c.lineTo(x - 4, y + 2); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,0.8)"; c.fillRect(x - 3.4, y - 14, 6.8, 2.6); c.fillRect(x - 2, y - 6, 4, 2.4);
    coneMt(c, x + 40, y - 14, 26, 30, [118, 112, 106]);   // 富士山（雪顶）
    treeClump(c, x - 27, y + 5, 5); treeClump(c, x + 28, y + 4, 4);
  },
  nagoya(c, x, y) {
    plaza(c, x, y, 24); shadowBlob(c, x, y, 28);
    // 名古屋城（天守）+ 丰田厂房（锯齿顶+烟囱）
    c.fillStyle = "#d8d2c4"; c.fillRect(x - 12, y - 9, 10, 9);
    c.fillStyle = "#c9c2b2"; c.fillRect(x - 10, y - 15, 6, 6);
    c.fillStyle = "#3c4448"; c.beginPath();
    c.moveTo(x - 14, y - 9); c.lineTo(x - 7, y - 13); c.lineTo(x, y - 9); c.lineTo(x - 7, y - 7.4); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - 11.5, y - 15); c.lineTo(x - 7, y - 18.5); c.lineTo(x - 2.5, y - 15); c.lineTo(x - 7, y - 14); c.closePath(); c.fill();
    c.fillStyle = "#a8a294"; c.fillRect(x + 6, y - 8, 16, 8);
    c.fillStyle = "rgba(60,68,72,0.7)";
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + 6 + i * 4, y - 8); c.lineTo(x + 8 + i * 4, y - 11.5); c.lineTo(x + 10 + i * 4, y - 8); c.closePath(); c.fill(); }
    c.fillStyle = "#8a8f92"; c.fillRect(x + 20, y - 16, 2.6, 8);
    c.fillStyle = "rgba(200,205,210,0.5)"; c.beginPath(); c.arc(x + 21.3, y - 18, 3, 0, 7); c.fill();
  },
  nagasaki(c, x, y) {
    shadowBlob(c, x, y, 24);
    // 港城坡地屋群 + 橙瓦
    const roofs = [[-18, 0], [-10, 3], [-2, 1], [6, 4], [13, 0], [-6, -8], [2, -7], [10, -9]];
    for (const [dx, dy] of roofs) {
      c.fillStyle = "#cfc4ae"; c.fillRect(x + dx, y + dy - 5, 7, 5);
      c.fillStyle = "#b05a38"; c.beginPath();
      c.moveTo(x + dx - 1, y + dy - 5); c.lineTo(x + dx + 3.5, y + dy - 8.4); c.lineTo(x + dx + 8, y + dy - 5); c.closePath(); c.fill();
    }
    crane(c, x + 18, y + 3, 12);
    coneMt(c, x - 20, y - 12, 15, 13, [100, 116, 88]);
  },
  seoul(c, x, y) {
    plaza(c, x, y, 24); shadowBlob(c, x, y, 28);
    tower(c, x - 16, y + 2, 8, 13, [186, 190, 184]); tower(c, x - 7, y + 1, 8, 17, [196, 200, 194]);
    tower(c, x + 2, y + 2, 8, 14, [190, 196, 190]); tower(c, x + 11, y + 1, 8, 18, [200, 204, 198]);
    // 南山 + N首尔塔
    coneMt(c, x - 1, y - 12, 12, 9, [104, 124, 84]);
    c.strokeStyle = "#8c96a0"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x - 1, y - 21); c.lineTo(x - 1, y - 27); c.stroke();
    c.fillStyle = "#c2503c"; c.beginPath(); c.arc(x - 1, y - 27.5, 2.2, 0, 7); c.fill();
  },
  incheon(c, x, y) {
    shadowBlob(c, x, y, 26);
    tower(c, x - 14, y + 1, 7, 12, [196, 200, 206]); tower(c, x - 5, y, 7, 16, [204, 208, 214]);
    // 集装箱堆场 + 双吊机（登陆战代言）
    const boxCols = ["#b8563e", "#3e7ea8", "#c8912e", "#4f8a5c", "#b8563e"];
    for (let i = 0; i < 5; i++) { c.fillStyle = boxCols[i]; c.fillRect(x + 3 + (i % 3) * 5, y + 1 - Math.floor(i / 3) * 3.2, 4.6, 3); }
    crane(c, x + 16, y + 2, 13); crane(c, x + 23, y + 3, 10);
  },
  sydney(c, x, y) {
    plaza(c, x, y, 24); shadowBlob(c, x, y, 28);
    tower(c, x - 14, y + 2, 7, 15, [206, 208, 210]); tower(c, x - 5, y + 1, 7, 19, [214, 216, 218]);
    tower(c, x + 4, y + 2, 7, 13, [200, 204, 208]);
    // 歌剧院白贝 + 海港大桥拱
    c.fillStyle = "#f2efe6";
    c.beginPath(); c.moveTo(x + 12, y); c.quadraticCurveTo(x + 13, y - 12, x + 20, y - 9); c.quadraticCurveTo(x + 15, y - 4, x + 12, y); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + 19, y); c.quadraticCurveTo(x + 20, y - 9, x + 26, y - 6.5); c.quadraticCurveTo(x + 21.5, y - 3, x + 19, y); c.closePath(); c.fill();
    c.strokeStyle = "#8a949c"; c.lineWidth = 2.4;
    c.beginPath(); c.arc(x + 30, y - 2, 8, Math.PI, 0); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 22, y - 2); c.lineTo(x + 38, y - 2); c.stroke();
  },
  melbourne(c, x, y) {
    plaza(c, x, y, 22); shadowBlob(c, x, y, 26);
    tower(c, x - 15, y + 2, 7, 13, [204, 200, 194]); tower(c, x - 6, y + 1, 7, 17, [212, 208, 202]);
    tower(c, x + 3, y + 2, 7, 12, [200, 198, 192]); tower(c, x + 11, y + 1, 7, 15, [210, 206, 200]);
    // 艺术中心尖塔
    c.strokeStyle = "#a8b2ba"; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(x + 19, y + 1); c.lineTo(x + 23, y - 20); c.stroke();
    c.fillStyle = "#c8ccd0"; c.beginPath(); c.arc(x + 22.2, y - 15, 2.6, 0, 7); c.fill();
    treeClump(c, x - 22, y + 4, 5);
  },
};

// ---------- 匾额 ----------
function banner(c, city, x, y, iconW) {
  const f = FACTIONS[city.faction];
  const fs = city.capital ? 16 : 14;
  c.font = `bold ${fs}px ${FONT_KAI}`;
  const tw = c.measureText(city.name).width;
  const bw = tw + (city.capital ? 30 : 24), bh = city.capital ? 22 : 19;
  let bx = x - bw / 2, by = y - 46;
  if (city.lp === "br" || city.lp === "bl") by = y + 14;
  if (city.lp === "r") { bx = x + iconW; by = y - 12; }
  if (city.lp === "l") { bx = x - iconW - bw; by = y - 12; }
  // 底
  c.fillStyle = "rgba(20,16,10,0.35)";
  c.fillRect(bx + 2, by + 2.5, bw, bh);
  const g = c.createLinearGradient(bx, by, bx, by + bh);
  g.addColorStop(0, "#3a3126"); g.addColorStop(1, "#241d14");
  c.fillStyle = g; c.fillRect(bx, by, bw, bh);
  c.strokeStyle = f.color; c.lineWidth = city.capital ? 2.2 : 1.4;
  c.strokeRect(bx + 0.8, by + 0.8, bw - 1.6, bh - 1.6);
  c.strokeStyle = "rgba(222,186,110,0.9)"; c.lineWidth = 1;
  c.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
  // 阵营徽点
  c.fillStyle = f.color; c.beginPath(); c.arc(bx + 10.5, by + bh / 2, 3.1, 0, 7); c.fill();
  c.strokeStyle = "rgba(255,235,190,0.85)"; c.lineWidth = 0.8; c.stroke();
  c.fillStyle = "#f3e8c8"; c.textBaseline = "middle"; c.textAlign = "left";
  c.fillText(city.name, bx + 17, by + bh / 2 + 1);
  if (city.capital) {
    c.fillStyle = "#ffd76a"; c.font = `11px ${FONT_KAI}`;
    c.fillText("★", bx + bw - 11, by + bh / 2 + 1);
  }
  c.textBaseline = "alphabetic";
  return { bx, by, bw, bh };
}

// ---------- 主渲染 ----------
const tick = () => new Promise(r => setTimeout(r, 0));

export async function buildBase(scale = 2, onProgress = () => {}) {
  buildGrids();
  onProgress(0.2);
  await tick();

  const cv = document.createElement("canvas");
  cv.width = WORLD.w * scale; cv.height = WORLD.h * scale;
  const c = cv.getContext("2d");
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.lineJoin = "round"; c.lineCap = "round";

  // --- 1. 海洋基底 ---
  const sg = c.createLinearGradient(0, 0, 0, WORLD.h);
  sg.addColorStop(0, "#2a5f80"); sg.addColorStop(0.45, "#27608a"); sg.addColorStop(1, "#2b5f86");
  c.fillStyle = sg; c.fillRect(0, 0, WORLD.w, WORLD.h);
  const rng1 = mulberry32(1337);
  for (let i = 0; i < 2200; i++) { // 海体云斑（低频柔和）
    const x = rng1() * WORLD.w, y = rng1() * WORLD.h, r = 16 + rng1() * 66;
    const light = fbm(x / 220, y / 220, 3, 17) > 0.52;
    c.fillStyle = light ? "rgba(120,180,200,0.035)" : "rgba(10,30,52,0.045)";
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  onProgress(0.3); await tick();

  // --- 2. 陆地岸线（浅海光环 → 陆地底色） ---
  const fillCountry = (name, color) => {
    const geo = GEO[name]; if (!geo) return;
    const shift = OCEANIA.has(name) ? AU_SHIFT : 0;
    c.fillStyle = color;
    for (const ring of geo.polys) {
      c.beginPath();
      ring.forEach(([lo, la], i) => { const [x, y] = proj(lo, la, shift); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath(); c.fill();
      c.strokeStyle = "rgba(120,190,195,0.3)"; c.lineWidth = 7; c.stroke();
      c.strokeStyle = "rgba(190,235,230,0.35)"; c.lineWidth = 2.2; c.stroke();
    }
  };
  for (const name of Object.keys(GEO)) if (!OCEANIA.has(name)) fillCountry(name, GEO[name].role === "focus" ? "#94a862" : "#8d917e");
  for (const name of OCEANIA) fillCountry(name, "#94a862");
  onProgress(0.42); await tick();

  // --- 3. 地貌晕染（逐格 + 晕光；画在 1x 离屏，再用陆地剪影裁切，杜绝格子溢出海面） ---
  const landCv = document.createElement("canvas");
  landCv.width = WORLD.w; landCv.height = WORLD.h;
  const lc = landCv.getContext("2d");
  lc.fillStyle = "#fff";
  for (const name of Object.keys(GEO)) {
    const geo = GEO[name];
    const shift = OCEANIA.has(name) ? AU_SHIFT : 0;
    for (const ring of geo.polys) {
      lc.beginPath();
      ring.forEach(([lo, la], i) => { const [x, y] = proj(lo, la, shift); i ? lc.lineTo(x, y) : lc.moveTo(x, y); });
      lc.closePath(); lc.fill();
    }
  }
  const cellCv = document.createElement("canvas");
  cellCv.width = WORLD.w; cellCv.height = WORLD.h;
  const cc = cellCv.getContext("2d");
  for (let gy = 1; gy < GH - 1; gy++) {
    for (let gx = 1; gx < GW - 1; gx++) {
      const role = roleGrid[gy * GW + gx];
      if (!role) continue;
      const h = heightGrid[gy * GW + gx];
      const gx1 = (heightGrid[gy * GW + gx + 1] - heightGrid[gy * GW + gx - 1]) / (2 * CELL);
      const gy1 = (heightGrid[(gy + 1) * GW + gx] - heightGrid[(gy - 1) * GW + gx]) / (2 * CELL);
      const nl = Math.hypot(gx1, gy1, 1);
      const dot = clamp((0.5 * (gx1 + gy1) + 0.7071) / nl, -1, 1); // 法线·光(西北光)
      const shade = clamp(0.42 + 0.82 * dot, 0.42, 1.22);
      let col = biome(gx * CELL, gy * CELL, h, role, isNearSea(gx, gy));
      col = col.map(v => clamp(Math.round(v * shade), 0, 255));
      cc.fillStyle = rgba(col);
      cc.fillRect(gx * CELL - 0.4, gy * CELL - 0.4, CELL + 0.8, CELL + 0.8);
    }
  }
  cc.globalCompositeOperation = "destination-in";
  cc.drawImage(landCv, 0, 0);
  cc.globalCompositeOperation = "source-over";
  c.drawImage(cellCv, 0, 0);
  onProgress(0.6); await tick();

  // --- 4. 手绘笔触层 ---
  const rng2 = mulberry32(4242);
  // 4a. 草地/农田短笔触
  for (let i = 0; i < 52000; i++) {
    const x = rng2() * WORLD.w, y = rng2() * WORLD.h;
    const gx = (x / CELL) | 0, gy = (y / CELL) | 0;
    const role = roleGrid[gy * GW + gx]; if (!role) continue;
    const h = heightGrid[gy * GW + gx];
    const dn = fbm(x / 30, y / 30, 2, 55);
    if (role === 2 && rng2() < 0.55) continue;
    let col;
    if (h < 0.5) col = dn > 0.5 ? [122, 142, 84] : [186, 188, 128];
    else if (h < 1.0) col = dn > 0.5 ? [86, 116, 70] : [110, 138, 82];
    else col = dn > 0.5 ? [104, 100, 90] : [150, 144, 128];
    if (role === 3) col = dn > 0.5 ? [150, 96, 60] : [170, 130, 84];
    if (role === 2) col = desat(col, 0.5, 0.12);
    c.strokeStyle = rgba(col, 0.34);
    c.lineWidth = 1.1;
    const a = rng2() * Math.PI, l = 2 + rng2() * 4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5); c.stroke();
  }
  onProgress(0.7); await tick();
  // 4b. 森林团
  for (let i = 0; i < 15000; i++) {
    const x = rng2() * WORLD.w, y = rng2() * WORLD.h;
    const gx = (x / CELL) | 0, gy = (y / CELL) | 0;
    const role = roleGrid[gy * GW + gx]; if (!role || role === 3) continue;
    const h = heightGrid[gy * GW + gx];
    if (h < 0.35 || h > 1.35 || fbm(x / 60, y / 60, 2, 66) < 0.55) continue;
    const col = role === 2 ? desat([58, 92, 56], 0.5, 0.1) : [58, 92, 56];
    c.fillStyle = rgba(col, 0.30);
    c.beginPath(); c.arc(x, y, 1.6 + rng2() * 2.6, 0, 7); c.fill();
  }
  // 4c. 山地岩石皴
  for (let i = 0; i < 22000; i++) {
    const x = rng2() * WORLD.w, y = rng2() * WORLD.h;
    const gx = (x / CELL) | 0, gy = (y / CELL) | 0;
    const role = roleGrid[gy * GW + gx]; if (!role) continue;
    const h = heightGrid[gy * GW + gx];
    if (h < 1.05) continue;
    const gxa = (heightGrid[gy * GW + Math.min(GW - 1, gx + 1)] - heightGrid[gy * GW + Math.max(0, gx - 1)]) / (2 * CELL);
    const gya = (heightGrid[Math.min(GH - 1, gy + 1) * GW + gx] - heightGrid[Math.max(0, gy - 1) * GW + gx]) / (2 * CELL);
    const dark = gxa + gya < 0; // 背光坡（东南朝向）加深
    let col = dark ? [72, 68, 60] : [176, 172, 158];
    if (role === 2) col = desat(col, 0.5, 0.12);
    c.strokeStyle = rgba(col, 0.24);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - gxa * 3 - 1.2, y - gya * 3 - 0.8); c.stroke();
  }
  onProgress(0.78); await tick();

  // --- 5. 河流（过中点二次曲线，柔化折角） ---
  for (const rv of RIVERS) {
    const pts = rv.pts.map(([lo, la]) => proj(lo, la, rv.oc ? AU_SHIFT : 0));
    const draw = () => {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++)
        c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
      c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      c.stroke();
    };
    c.strokeStyle = "rgba(30,60,80,0.28)"; c.lineWidth = rv.w + 1.6; draw();
    c.strokeStyle = "rgba(92,148,176,0.9)"; c.lineWidth = rv.w; draw();
    c.strokeStyle = "rgba(168,214,230,0.45)"; c.lineWidth = rv.w * 0.34; draw();
  }

  // --- 6. 海浪线 + 海面闪点 ---
  const rng3 = mulberry32(8801);
  const sparkles = [];
  for (let i = 0; i < 1400; i++) {
    const x = rng3() * WORLD.w, y = rng3() * WORLD.h;
    if (roleGrid[((y / CELL) | 0) * GW + ((x / CELL) | 0)]) continue;
    if (sparkles.length < 420 && rng3() < 0.45)
      sparkles.push({ x, y, r: 0.7 + rng3() * 1.3, p: rng3() * 7, v: 0.6 + rng3() * 1.6 });
    const l = 4 + rng3() * 12;
    c.strokeStyle = `rgba(200,235,245,${0.05 + rng3() * 0.09})`;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 1.2, x + l, y); c.stroke();
  }

  // --- 7. 邻接线（游戏道路） ---
  const byId = Object.fromEntries(CITIES.map(cc => [cc.id, cc]));
  for (const lk of LINKS) drawLink(c, byId[lk.a], byId[lk.b], lk.type, false);
  onProgress(0.84); await tick();

  // --- 8. 城市图标 + 匾额 + 地名 ---
  for (const city of CITIES) {
    const [x, y] = cityAnchor(city);
    CITY_PAINTERS[city.id](c, x, y);
  }
  for (const city of CITIES) {
    const [x, y] = cityAnchor(city);
    banner(c, city, x, y, 22);
  }
  // 海名（疏散排布）
  for (const s of SEA_LABELS) drawSpaced(c, s.name, proj(s.c[0], s.c[1], s.oc ? AU_SHIFT : 0), s.s, "rgba(235,244,248,0.62)", FONT_KAI);
  // 陆名
  for (const s of LAND_LABELS) drawSpaced(c, s.name, proj(s.c[0], s.c[1], s.oc ? AU_SHIFT : 0), s.s, rgba(s.col, 0.5), FONT_KAI, 1.4);
  onProgress(0.92); await tick();

  // --- 9. 画布颗粒 + 暗角 ---
  const grain = document.createElement("canvas");
  grain.width = grain.height = 160;
  const gc = grain.getContext("2d");
  const gd = gc.createImageData(160, 160);
  const rng4 = mulberry32(555);
  for (let i = 0; i < 160 * 160; i++) {
    const v = 118 + (rng4() - 0.5) * 74;
    gd.data[i * 4] = gd.data[i * 4 + 1] = gd.data[i * 4 + 2] = v; gd.data[i * 4 + 3] = 255;
  }
  gc.putImageData(gd, 0, 0);
  c.save();
  c.globalCompositeOperation = "overlay"; c.globalAlpha = 0.07;
  c.fillStyle = c.createPattern(grain, "repeat");
  c.fillRect(0, 0, WORLD.w, WORLD.h);
  c.restore();
  const vg = c.createRadialGradient(WORLD.w / 2, WORLD.h / 2, Math.min(WORLD.w, WORLD.h) * 0.42, WORLD.w / 2, WORLD.h / 2, Math.max(WORLD.w, WORLD.h) * 0.72);
  vg.addColorStop(0, "rgba(25,18,10,0)"); vg.addColorStop(1, "rgba(25,18,10,0.24)");
  c.fillStyle = vg; c.fillRect(0, 0, WORLD.w, WORLD.h);
  // 暖色调（三国群英传7 式暖底）
  c.save();
  c.globalCompositeOperation = "overlay";
  const warm = c.createLinearGradient(0, 0, WORLD.w * 0.4, WORLD.h);
  warm.addColorStop(0, "rgba(255,196,120,0.10)"); warm.addColorStop(1, "rgba(255,170,90,0.04)");
  c.fillStyle = warm; c.fillRect(0, 0, WORLD.w, WORLD.h);
  c.restore();
  onProgress(1);
  return { canvas: cv, sparkles };
}

export function linkCurve(A, B) {
  const [x1, y1] = [proj(A.lon, A.lat)[0] + A.dx, proj(A.lon, A.lat)[1] + A.dy];
  const [x2, y2] = [proj(B.lon, B.lat)[0] + B.dx, proj(B.lon, B.lat)[1] + B.dy];
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const bend = A.faction === B.faction && (A.faction === "CN" || A.faction === "JP") ? 0 : Math.min(L * 0.18, 52);
  const cx = mx + (-dy / L) * bend, cy = my + (dx / L) * bend;
  return { x1, y1, x2, y2, cx, cy };
}

function drawLink(c, A, B, type, glow) {
  const { x1, y1, x2, y2, cx, cy } = linkCurve(A, B);
  const path = () => { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); };
  c.save();
  if (glow) { path(); c.strokeStyle = "rgba(255,240,180,0.5)"; c.lineWidth = 9; c.stroke(); }
  path(); c.strokeStyle = "rgba(20,16,8,0.28)"; c.lineWidth = type === "land" ? 4.6 : 4; c.stroke();
  const styles = {
    land: () => { path(); c.strokeStyle = "#d9c9a2"; c.lineWidth = 3; c.globalAlpha = 0.92; c.stroke(); },
    sea: () => { path(); c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 4.4; c.setLineDash([9, 7]); c.stroke(); c.strokeStyle = "#7fc0e4"; c.lineWidth = 2.6; c.stroke(); },
    fake: () => { path(); c.strokeStyle = "#d86458"; c.lineWidth = 2.4; c.setLineDash([9, 6]); c.stroke(); },
    ocean: () => { path(); c.strokeStyle = "#e9c56e"; c.lineWidth = 2.2; c.setLineDash([1.6, 7]); c.lineCap = "round"; c.stroke(); },
  };
  styles[type]();
  c.restore();
}

function drawSpaced(c, text, [x, y], size, fill, font, spread = 1.7) {
  c.save();
  c.font = `${size}px ${font}`;
  c.textAlign = "center";
  const step = size * spread;
  const total = (text.length - 1) * step;
  c.shadowColor = "rgba(20,20,25,0.35)"; c.shadowBlur = 3; c.shadowOffsetY = 1.5;
  [...text].forEach((ch, i) => {
    c.fillStyle = fill;
    c.fillText(ch, x - total / 2 + i * step, y);
  });
  c.restore();
}

// 供主程序用的城市屏幕锚点（含 dx/dy；澳洲城市随板块北移）
export function cityAnchor(city) {
  const [x, y] = proj(city.lon, city.lat, city.oc ? AU_SHIFT : 0);
  return [x + (city.dx || 0), y + (city.dy || 0)];
}
