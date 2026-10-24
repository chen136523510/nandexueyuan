// 一次性烘焙脚本：world-atlas 110m → 国男志 L1 大地图海岸线数据
// 产物: ../js/l1/geo-data.js （离线可用，渲染时不依赖 CDN）
// 用法: curl world-atlas@2/countries-110m.json 后 node bake-geo.mjs <输入json>
import { readFileSync, writeFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(process.argv[2], "utf8"));
const tr = raw.transform, sx = tr.scale[0], sy = tr.scale[1], tx = tr.translate[0], ty = tr.translate[1];
const arcs = raw.arcs.map(a => {
  let x = 0, y = 0;
  return a.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * sx + tx, y * sy + ty];
  });
});
const ringOf = idxs => {
  const pts = [];
  for (const i of idxs) {
    let a = i >= 0 ? arcs[i] : [...arcs[~i]].reverse();
    if (pts.length) a = a.slice(1);
    pts.push(...a);
  }
  return pts;
};
const ringsOfGeom = g => {
  if (g.type === "Polygon") return g.arcs.map(ringOf);
  if (g.type === "MultiPolygon") return g.arcs.flat().map(ringOf);
  return [];
};

// role: focus=主舞台写实渲染 / context=周边陪衬(去饱和) / au=澳洲(渲染器可整体平移)
const ROLES = {
  China: "focus", Japan: "focus", "South Korea": "focus", "North Korea": "focus",
  Taiwan: "focus", Australia: "au",
  Mongolia: "context", Russia: "context", India: "context", Nepal: "context",
  Bhutan: "context", Bangladesh: "context", Myanmar: "context", Laos: "context",
  Vietnam: "context", Thailand: "context", Cambodia: "context",
  Kazakhstan: "context", Kyrgyzstan: "context", Tajikistan: "context",
  Uzbekistan: "context", Afghanistan: "context", Pakistan: "context",
  "Papua New Guinea": "context", "New Zealand": "context",
};
const EXCLUDE = new Set(["Philippines", "Indonesia", "Malaysia", "Brunei", "Antarctica", "Sri Lanka"]);

const FRAME = { lon0: 68, lon1: 190, lat0: -48, lat1: 58 };
const keep = {};
for (const g of raw.objects.countries.geometries) {
  const name = g.properties?.name;
  const role = ROLES[name];
  if (!role || EXCLUDE.has(name)) continue;
  const polys = ringsOfGeom(g).filter(r => {
    let lo0 = 180, lo1 = -180, la0 = 90, la1 = -90, area = 0;
    for (let i = 0; i < r.length; i++) {
      const [lo, la] = r[i];
      if (lo < lo0) lo0 = lo; if (lo > lo1) lo1 = lo;
      if (la < la0) la0 = la; if (la > la1) la1 = la;
      const j = (i + 1) % r.length;
      area += r[i][0] * r[j][1] - r[j][0] * r[i][1];
    }
    if (lo1 < FRAME.lon0 || lo0 > FRAME.lon1 || la1 < FRAME.lat0 || la0 > FRAME.lat1) return false;
    return Math.abs(area / 2) > 0.02;
  });
  if (!polys.length) continue;
  // 抽稀：相邻点距 < 0.05° 丢弃（110m 本身已简化，够用）
  const slim = polys.map(r => {
    const out = [r[0]];
    for (let i = 1; i < r.length; i++) {
      const p = out[out.length - 1], q = r[i];
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) >= 0.05) out.push(q);
    }
    return out.map(([lo, la]) => [Math.round(lo * 100) / 100, Math.round(la * 100) / 100]);
  });
  (keep[name] ??= { role, polys: [] }).polys.push(...slim);
}

const total = Object.values(keep).reduce((n, c) => n + c.polys.reduce((m, r) => m + r.length, 0), 0);
const header = `// L1 大地图海岸线数据（机器烘焙，勿手改）
// 来源: world-atlas@2 countries-110m (Natural Earth 110m, 公有领域)
// 烘焙: poc/guonanzhi-ui/tools/bake-geo.mjs（区域筛选+抽稀0.05°，保留顶点 ${total} 个）
// role: focus=主舞台 / context=周边陪衬 / au=澳洲（渲染器 AU_SHIFT 可整体北移）
export default ${JSON.stringify(keep)}`;
writeFileSync(new URL("../js/l1/geo-data.js", import.meta.url), header + ";\n");
console.log("baked:", Object.keys(keep).join(", "), "| points:", total);
