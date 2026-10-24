// L1 大地图 · 主程序：相机 / 悬停 / 选中面板 / 动态层（云影·海光）/ 加载序幕
import { buildBase, WORLD, cityAnchor, linkCurve } from "./paint-map.js";
import { CITIES, LINKS, FACTIONS } from "./map-data.js";
import { mulberry32 } from "./noise.js";

const canvas = document.getElementById("l1canvas");
const ctx = canvas.getContext("2d");
const veil = document.getElementById("veil");
const veilBar = document.getElementById("veil-bar");
const veilText = document.getElementById("veil-text");
const tooltip = document.getElementById("tooltip");
const panel = document.getElementById("city-panel");

const dpr = Math.min(window.devicePixelRatio || 1, 2);
let vw = 0, vh = 0;
const cam = { x: 0, y: 0, scale: 1 };
let base = null;
let hoverCity = null, selectedCity = null;
let hoverLink = -1;

// ---------- 相机 ----------
function resize() {
  vw = window.innerWidth; vh = window.innerHeight;
  canvas.width = vw * dpr; canvas.height = vh * dpr;
  canvas.style.width = vw + "px"; canvas.style.height = vh + "px";
  clampCam();
  render();
}
function fitAll() {
  const s = Math.min(vw / WORLD.w, vh / WORLD.h) * 0.96;
  cam.scale = s;
  cam.x = (vw - WORLD.w * s) / 2;
  cam.y = (vh - WORLD.h * s) / 2;
}
function minScale() { return Math.min(vw / WORLD.w, vh / WORLD.h) * 0.5; }
function clampCam() {
  cam.scale = Math.max(minScale(), Math.min(4.5, cam.scale));
  // 允许越界 120px 缓冲；图小于视口时仍可小幅拖动
  const R = (dim, view) => Math.abs(dim * cam.scale - view) / 2 + 120;
  cam.x = Math.max(vw - WORLD.w * cam.scale - R(WORLD.w, vw), Math.min(R(WORLD.w, vw), cam.x));
  cam.y = Math.max(vh - WORLD.h * cam.scale - R(WORLD.h, vh), Math.min(R(WORLD.h, vh), cam.y));
}
const toWorld = (sx, sy) => [(sx - cam.x) / cam.scale, (sy - cam.y) / cam.scale];

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const [wx, wy] = toWorld(e.offsetX, e.offsetY);
  const k = Math.exp(-e.deltaY * 0.0014);
  cam.scale = Math.max(minScale(), Math.min(4.5, cam.scale * k));
  cam.x = e.offsetX - wx * cam.scale;
  cam.y = e.offsetY - wy * cam.scale;
  clampCam(); render();
}, { passive: false });

let dragging = false, dragMoved = 0, last = null;
canvas.addEventListener("pointerdown", e => {
  dragging = true; dragMoved = 0; last = [e.clientX, e.clientY];
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", e => {
  if (dragging) {
    dragMoved += Math.abs(e.clientX - last[0]) + Math.abs(e.clientY - last[1]);
    cam.x += e.clientX - last[0]; cam.y += e.clientY - last[1];
    last = [e.clientX, e.clientY];
    clampCam(); render();
  } else {
    updateHover(e.offsetX, e.offsetY);
  }
});
canvas.addEventListener("pointerup", e => {
  dragging = false;
  if (dragMoved < 6) handleClick(e.offsetX, e.offsetY);
});
canvas.addEventListener("pointerleave", () => { if (!dragging) setHover(null); });

function cityAt(sx, sy) {
  const [wx, wy] = toWorld(sx, sy);
  let best = null, bd = 30;
  for (const c of CITIES) {
    const [x, y] = cityAnchor(c);
    const d = Math.hypot(wx - x, wy - y + 18);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function setHover(c) {
  if (hoverCity === c) return;
  hoverCity = c;
  canvas.style.cursor = c ? "pointer" : "grab";
  if (!c) { tooltip.style.opacity = 0; } else {
    const f = FACTIONS[c.faction];
    tooltip.innerHTML = `<b style="color:${f.color}">${c.name}</b> · ${f.name}阵营${c.capital ? " · <span style='color:#ffd76a'>首都</span>" : ""}<br>${c.note}<br><span style="color:#b8b2a4">驻守：${c.generals.join("、")}</span>`;
    tooltip.style.opacity = 1;
  }
  render();
}
function updateHover(sx, sy) {
  const c = cityAt(sx, sy);
  setHover(c);
  if (c) {
    tooltip.style.left = Math.min(sx + 16, vw - 250) + "px";
    tooltip.style.top = Math.min(sy + 16, vh - 110) + "px";
  }
  // 悬停连线（端点任一为悬停城）
  hoverLink = LINKS.findIndex(l => hoverCity && (l.a === hoverCity.id || l.b === hoverCity.id));
}
function handleClick(sx, sy) {
  const c = cityAt(sx, sy);
  selectedCity = c || null;
  renderPanel(); render();
}
window.addEventListener("keydown", e => {
  if (e.key === "Escape") { selectedCity = null; renderPanel(); render(); }
});

// ---------- 侧栏 ----------
function renderPanel() {
  if (!selectedCity) { panel.classList.remove("open"); return; }
  const c = selectedCity, f = FACTIONS[c.faction];
  panel.innerHTML = `
    <div class="cp-head" style="--fc:${f.color}">
      <span class="cp-faction">${f.name}${c.capital ? " · 首都" : ""}</span>
      <h2>${c.name}</h2>
      <button id="cp-close" title="关闭">×</button>
    </div>
    <p class="cp-note">${c.note}</p>
    <div class="cp-sec"><label>驻守武将 · ${c.generals.length} 员</label>
      <div class="cp-gens">${c.generals.map(g => `<span class="gen">${g}</span>`).join("")}</div>
    </div>
    <div class="cp-sec"><label>初始建筑</label><p>${c.init}</p></div>
    <button id="cp-enter">进入城市内景（L2 雏形）→</button>
    <p class="cp-hint">由外及里：L1 战略 → L2 城内网格 → L3 战斗</p>`;
  panel.classList.add("open");
  document.getElementById("cp-close").onclick = () => { selectedCity = null; renderPanel(); render(); };
  document.getElementById("cp-enter").onclick = () => { location.href = "index.html"; };
}

// ---------- 动态层素材 ----------
const clouds = [];
{
  const r = mulberry32(99);
  for (let i = 0; i < 5; i++) clouds.push({ x: r() * WORLD.w, y: r() * WORLD.h, r: 130 + r() * 180, v: 6 + r() * 10 });
}
let SPARKLES = [];

// ---------- 渲染循环 ----------
let t0 = performance.now();
function render(now = performance.now()) {
  if (!base) return;
  const t = (now - t0) / 1000;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#10151b";
  ctx.fillRect(0, 0, vw, vh);
  ctx.setTransform(dpr * cam.scale, 0, 0, dpr * cam.scale, dpr * cam.x, dpr * cam.y);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(base, 0, 0, WORLD.w, WORLD.h);

  // 海光闪点
  ctx.save();
  for (const s of SPARKLES) {
    const a = (Math.sin(t * s.v + s.p) * 0.5 + 0.5) * 0.5;
    if (a < 0.06) continue;
    ctx.fillStyle = `rgba(225,245,250,${a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  }
  ctx.restore();

  // 云影
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (const cl of clouds) {
    const x = ((cl.x + t * cl.v) % (WORLD.w + 600)) - 300;
    const g = ctx.createRadialGradient(x, cl.y, 0, x, cl.y, cl.r);
    g.addColorStop(0, "rgba(58,64,74,0.10)"); g.addColorStop(1, "rgba(58,64,74,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, cl.y, cl.r, cl.r * 0.62, 0, 0, 7); ctx.fill();
  }
  ctx.restore();

  // 悬停连线高亮
  if (hoverLink >= 0) {
    const byId = Object.fromEntries(CITIES.map(cc => [cc.id, cc]));
    const l = LINKS[hoverLink];
    const { x1, y1, x2, y2, cx, cy } = linkCurve(byId[l.a], byId[l.b]);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.strokeStyle = "rgba(255,238,170,0.55)"; ctx.lineWidth = 8; ctx.stroke();
    ctx.restore();
  }

  // 城市：悬停/选中光圈
  for (const c of CITIES) {
    if (c !== hoverCity && c !== selectedCity) continue;
    const [x, y] = cityAnchor(c);
    const f = FACTIONS[c.faction];
    const pulse = c === selectedCity ? (Math.sin(t * 3) * 0.5 + 0.5) : 0.75;
    ctx.save();
    const g = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 42);
    g.addColorStop(0, hexA(f.color, 0.55 * pulse + 0.2)); g.addColorStop(1, hexA(f.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y - 6, 42, 0, 7); ctx.fill();
    if (c === selectedCity) {
      ctx.strokeStyle = hexA("#ffd76a", 0.9); ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 14;
      ctx.beginPath(); ctx.arc(x, y - 8, 34, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }
  requestAnimationFrame(render);
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- 控件 ----------
document.getElementById("btn-fit").onclick = () => { fitAll(); clampCam(); render(); };
document.getElementById("btn-zin").onclick = () => { zoomCenter(1.3); };
document.getElementById("btn-zout").onclick = () => { zoomCenter(1 / 1.3); };
function zoomCenter(k) {
  const cx = vw / 2, cy = vh / 2;
  const [wx, wy] = toWorld(cx, cy);
  cam.scale = Math.max(minScale(), Math.min(4.5, cam.scale * k));
  cam.x = cx - wx * cam.scale; cam.y = cy - wy * cam.scale;
  clampCam(); render();
}

// ---------- 启动 ----------
async function boot() {
  resize(); fitAll(); render();
  window.addEventListener("resize", resize);
  const built = await buildBase(2, p => {
    veilBar.style.width = Math.round(p * 100) + "%";
    veilText.textContent = p < 0.42 ? "铺陈沧海…" : p < 0.6 ? "皴染山川…" : p < 0.84 ? "落笔城郭…" : "钤印题跋…";
  });
  base = built.canvas;
  SPARKLES = built.sparkles;
  window.__l1 = { cam, CITIES, cityAnchor, WORLD }; // 自动化测试句柄
  veil.classList.add("done");
  setTimeout(() => veil.remove(), 900);
  render();
}
boot();
