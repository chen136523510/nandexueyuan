// 诺诺房间 · 白盒场景 v2（R-058 场景设计 v1.1）
// 坐标唯一来源：prd/01-需求文档/07-自习室/场景设计/诺诺房间场景设计方案.md §三（与 画场景设计图.py §布局参数区同源）
// v2 变更（院长 2026-10-06 四轮）：床南移留过道 / 落地窗居中（左右留墙）+ 帘子左右开合 + 墙面开关（灯/帘）/
//   光效档案系统（方法论移植自院长 idle-game 项目 room-lighting-profiles.md：灯位恒定·一态一签名·状态=参数预设·0.5~2s 混合过渡）
// 世界系：x=东，z=南（+）/北（-）=平面图 y 取反，y=高。四墙单面朝内：墙外相机透视穿墙（娃娃屋画法）。
import * as THREE from 'three';

// —— 设计方案 §三 坐标（plan：x 向东 / y 向北，米）——
export const ROOM = {
  size: { w: 4.5, d: 5.0, h: 2.8 },
  desk: { cx: 0.36, cy: 3.25, w: 0.72, l: 1.40, h: 0.72 },
  monitor: { cx: 0.36, cy: 3.25, screenW: 0.62, screenH: 0.37, centerY: 1.127, tiltDeg: 0 }, // v3：桌面居中正对诺诺
  keyboard: { cx: 0.52, cy: 3.05, w: 0.13, l: 0.32 },
  mouse: { cx: 0.53, cy: 3.42 },
  pc: { cx: 0.27, cy: 2.895, w: 0.26, h: 0.50, d: 0.55 },
  chair: { cx: 1.05, cy: 3.25, seatH: 0.556, faceDeg: 205 },
  bed: { cx: 3.50, cy: 3.80, l: 2.00, w: 1.40, h: 0.45, headboardH: 1.10 }, // v2：南移 0.5m，床沿北墙留 0.5m 过道（未来通阳台）
  window: { x0: 0.65, x1: 3.85, top: 2.80 }, // v2：落地窗，居中 3.2m，左右各留 0.65m 北墙
  doors: { west: { y0: 0.35, y1: 1.25, h: 2.05 }, east: { y0: 0.35, y1: 1.25, h: 2.05 } },
  poster: { cy: 4.25, w: 0.60, h: 0.80, z0: 1.30 }, // 不随床移动（院长裁决）
  switchPanel: { cx: 4.12, cy: 1.75, z: 1.15 }, // 开关面板：东墙东南段（门旁——F1「走过去按」可达位）。2026-10-10 场景变更：原北段 (cy 4.62) 位于床区上方，站立位在床面/北过道内不可达（床垫膨胀盒 y 0.2~0.7 覆盖躯干采样高 0.5，寻路过不去）→ 挪门旁（生活逻辑同款：进门顺手按灯）
  lamp: { cx: 2.25, cy: 2.50 },
};

// —— 光效档案 v4（2026-10-07 院长问题清单：变化不明显 → 连续时间轴 + 对比度增强）——
// 纪律一：**主光=窗口天光**，一天的情绪由太阳的强度/色温/角度自然变化承担——房间主调慵懒随意，
//   靠灯营造氛围太刻意不自然；吸顶灯从全部档案退出（默认关），只作为"生活动作"由 HUD/大脑手动开关。
// 纪律二：深夜是"舒服的暗"不是黑屋——月光+屏幕微光够看清轮廓（屏幕微光=深夜签名）。
// 纪律三：调研文档只作美学指导；过渡放慢像自然变化。
// v4 关键变化（院长 2026-10-07 两问）：
//   ①【离散→连续】24h 时间轴关键帧插值，7 时相降级为「验收采样点」（院长裁决：只针对几个时间验收，
//     中间视为过渡态）——state.hours 连续取值，相邻关键帧线性混合，天气/季节仍作乘法叠层。
//   ②【维度可感】新增太阳方位角 sunX（光斑东→西扫过地板=最直观的维度变化）+ studio 系数
//     （主.js 棚灯三件套随档案缩放——v3 恒定补光把昼夜差稀释掉了，是"变化不明显"的主因之一）；
//     对比度整体加大（正午更亮/深夜更暗/黄昏更橙/太阳更低=长影）。
// 一态一签名：凌晨=月色与屏光/清晨=初阳长斑/正午=白昼硬光/下午=斜阳金色/黄昏=蜜橙天光/傍晚=蓝调残光/深夜=月与屏
export const LIGHTING_PROFILES = {
  dawn:      { label: '凌晨·月色',   hour: 2.5,  sun: { i: 0.040, c: 0xa8c4e8 }, sunY: 2.40, sunX: 3.0,  hemi: 0.10, seaTint: 0x141d30, glass: 0.55, monitor: 0.85, bg: 0x0c1018, studio: 0.15, idColor: '#E8B36A' },
  morning:   { label: '清晨·初阳',   hour: 7.0,  sun: { i: 1.000, c: 0xffd9a0 }, sunY: 1.50, sunX: 4.6,  hemi: 0.48, seaTint: 0xd8d2c0, glass: 0.35, monitor: 0.30, bg: 0xa8c0d8, studio: 0.85, idColor: '#FFD9A0' },
  noon:      { label: '正午·白昼',   hour: 12.5, sun: { i: 2.000, c: 0xfff6e6 }, sunY: 2.90, sunX: 2.25, hemi: 0.62, seaTint: 0xdfe8e2, glass: 0.32, monitor: 0.25, bg: 0x9fb8cc, studio: 1.00, idColor: '#F6F3E7' },
  afternoon: { label: '下午·斜阳',   hour: 15.5, sun: { i: 1.150, c: 0xffe0a8 }, sunY: 2.10, sunX: 0.4,  hemi: 0.45, seaTint: 0xd8c8a0, glass: 0.35, monitor: 0.35, bg: 0x9fa8b8, studio: 0.80, idColor: '#F0C489' },
  dusk:      { label: '黄昏·蜜橙',   hour: 18.0, sun: { i: 0.850, c: 0xff8438 }, sunY: 1.15, sunX: -1.6, hemi: 0.32, seaTint: 0xd98a50, glass: 0.42, monitor: 0.55, bg: 0x5a4a6a, studio: 0.50, idColor: '#FF9E4F' },
  evening:   { label: '傍晚·蓝调',   hour: 19.5, sun: { i: 0.160, c: 0x7a8cc0 }, sunY: 1.10, sunX: -2.4, hemi: 0.20, seaTint: 0x3d4c78, glass: 0.50, monitor: 0.70, bg: 0x1a2438, studio: 0.30, idColor: '#6E6FA3' },
  night:     { label: '深夜·月与屏', hour: 23.0, sun: { i: 0.045, c: 0x9db8de }, sunY: 2.50, sunX: 3.2,  hemi: 0.10, seaTint: 0x223052, glass: 0.55, monitor: 0.95, bg: 0x0a0e1c, studio: 0.15, idColor: '#E9A85B' },
};

// 天气叠层（调研 §四 美学指导）：作用于天光——窗光倍率 + 全局色偏 + 手动灯的补偿系数
export const WEATHERS = {
  sunny:  { label: '晴', mul: 1.00, tint: null,     k: 0,    hemiMul: 1.00, lampBoost: 0    },
  cloudy: { label: '阴', mul: 0.35, tint: 0x8fa3b8, k: 0.50, hemiMul: 0.70, lampBoost: 0.25 },
  rain:   { label: '雨', mul: 0.25, tint: 0x5e7fa6, k: 0.55, hemiMul: 0.55, lampBoost: 0.40 },
  storm:  { label: '暴雨', mul: 0.12, tint: 0x46584e, k: 0.60, hemiMul: 0.45, lampBoost: 0.80 },
};

// 季节偏置（调研 §五 美学指导）：只动两样——窗外的世界（色）与太阳高度角增量（光斑形态）
export const SEASONS = {
  spring: { label: '春', tint: 0xc9d6a0, k: 0.15, sunYDelta: 0.00, hemiMul: 1.00 },
  summer: { label: '夏', tint: 0xcfe8e6, k: 0.15, sunYDelta: 0.40, hemiMul: 1.05 },
  autumn: { label: '秋', tint: 0xd9a05b, k: 0.20, sunYDelta: -0.20, hemiMul: 1.00 },
  winter: { label: '冬', tint: 0xafc6d9, k: 0.18, sunYDelta: -0.70, hemiMul: 1.08 }, // 低角度=光斑铺到房间中段 + 雪光填充
};
const LAMP_MANUAL_I = 11; // 手动开灯时的吸顶灯强度（生活动作，非氛围机器）

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...opts });
const box = (w, h, d, mat, x, y, z, ry = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const plane = (w, h, mat, x, y, z, rx = 0, ry = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  m.receiveShadow = true;
  return m;
};

// 窗外海景幕布：Canvas 竖向渐变（天空→海→沙滩），MeshBasic 不受光照；档案只做整体染色
function seaBackdrop() {
  const cv = document.createElement('canvas');
  cv.width = 2;
  cv.height = 512;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, '#8ec8e8');
  grad.addColorStop(0.42, '#cfe6ee');
  grad.addColorStop(0.46, '#4f8fb8');
  grad.addColorStop(0.78, '#5f9fc4');
  grad.addColorStop(0.82, '#dcc8a0');
  grad.addColorStop(1.00, '#d2bd92');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.8), mat);
  return { mesh, mat };
}

// —— 光效档案运行时（当前值 lerp 到目标值；0.5~2s 混合过渡）——
const cA = new THREE.Color(), cB = new THREE.Color();
function lerpColor(cur, target, k) { cA.set(cur); cB.set(target); cA.lerp(cB, k); return cA.getHex(); }

export function buildRoom(scene, { posterUrl } = {}) {
  const g = new THREE.Group();
  g.name = 'nonoRoom';
  const { w, d, h } = ROOM.size;
  const wallMat = M(0xf2e8d8, { side: THREE.FrontSide });
  const woodMat = M(0xd7a86e);
  const darkWood = M(0x6d4c41);
  const win = ROOM.window;
  const winW = win.x1 - win.x0, winCx = (win.x0 + win.x1) / 2;

  // 地板 / 天花板
  g.add(plane(w, d, M(0xe0cda6), w / 2, 0, -d / 2, -Math.PI / 2));
  g.add(plane(w, d, M(0xf7f2e8), w / 2, h, -d / 2, Math.PI / 2));

  // 北墙（落地窗：左段 / 右段；玻璃+竖向中梃全高）
  g.add(plane(win.x0, h, wallMat, win.x0 / 2, h / 2, -d));
  g.add(plane(w - win.x1, h, wallMat, (w + win.x1) / 2, h / 2, -d));
  const frame = M(0xf5f5f0);
  // 落地窗框：上下轨 + 左右边梃 + 竖向中梃（参考图竖向节奏）
  g.add(box(winW + 0.10, 0.08, 0.10, frame, winCx, 0.04, -d + 0.03));
  g.add(box(winW + 0.10, 0.10, 0.10, frame, winCx, h - 0.03, -d + 0.03));
  const mullions = [win.x0, winCx - winW * 0.25, winCx, winCx + winW * 0.25, win.x1];
  for (const mx of mullions) g.add(box(0.06, h, 0.09, frame, mx, h / 2, -d + 0.03));
  const glass = plane(winW - 0.05, h - 0.10,
    new THREE.MeshStandardMaterial({ color: 0xbfe0f2, transparent: true, opacity: 0.35, roughness: 0.15, depthWrite: false }),
    winCx, h / 2, -d + 0.01);
  g.add(glass);
  // 海景幕布（窗外 3.5m）
  const sea = seaBackdrop();
  sea.mesh.position.set(winCx, h / 2 - 0.2, -d - 3.5);
  g.add(sea.mesh);

  // 帘子（左右两片，开合=沿滑轨平移+收拢缩放；帘轨=窗宽同长，帘大小=窗大小）
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, winW + 0.3, 12), M(0xb8a888, { metalness: 0.4, roughness: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(winCx, h - 0.12, -d + 0.09);
  g.add(rod);
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.95, side: THREE.DoubleSide });
  const curtainGeo = new THREE.PlaneGeometry(winW * 0.55, h - 0.25, 24, 1);
  // 顶点做竖向褶皱（参考图的百褶帘意象）
  {
    const pos = curtainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((x / winW) * Math.PI * 12) * 0.018);
    }
    curtainGeo.computeVertexNormals();
  }
  const curtainL = new THREE.Mesh(curtainGeo, curtainMat);
  const curtainR = new THREE.Mesh(curtainGeo, curtainMat);
  curtainL.position.set(win.x0 + winW * 0.275, (h - 0.25) / 2 + 0.03, -d + 0.12);
  curtainR.position.copy(curtainL.position);
  curtainL.castShadow = curtainR.castShadow = true;
  g.add(curtainL, curtainR);

  // 西墙 / 东墙 / 南墙
  g.add(plane(d, h, wallMat, 0, h / 2, -d / 2, 0, Math.PI / 2));
  g.add(plane(d, h, wallMat, w, h / 2, -d / 2, 0, -Math.PI / 2));
  g.add(plane(w, h, wallMat, w / 2, h / 2, 0, 0, Math.PI));

  // 门（西=出房间 / 东=独立卫浴）
  for (const [side, door] of Object.entries(ROOM.doors)) {
    const x = side === 'west' ? 0.015 : w - 0.015;
    const dw = door.y1 - door.y0, cy = (door.y0 + door.y1) / 2;
    g.add(plane(dw, door.h, M(0xd8d2c4), x, door.h / 2, -cy, 0, side === 'west' ? Math.PI / 2 : -Math.PI / 2));
    const fx = side === 'west' ? 0.03 : w - 0.03;
    g.add(box(0.05, door.h + 0.08, 0.06, frame, fx, (door.h + 0.08) / 2 - 0.02, -door.y0 - 0.02));
    g.add(box(0.05, door.h + 0.08, 0.06, frame, fx, (door.h + 0.08) / 2 - 0.02, -door.y1 + 0.02));
    g.add(box(0.05, 0.05, dw + 0.08, frame, fx, door.h + 0.03, -cy));
  }

  // 开关面板（北墙东段，床头北边）：灯 / 帘 两键
  const sw = ROOM.switchPanel;
  const plate = box(0.03, 0.16, 0.11, M(0xf5f5f0), w - 0.06, sw.z, -sw.cy);
  g.add(plate);
  const btnLamp = box(0.02, 0.055, 0.075, M(0xd8d2c4), w - 0.078, sw.z + 0.032, -sw.cy);
  const btnCur = box(0.02, 0.055, 0.075, M(0xd8d2c4), w - 0.078, sw.z - 0.032, -sw.cy);
  g.add(btnLamp, btnCur);
  const switchBoxes = [btnLamp, btnCur].map((m) => new THREE.Box3().setFromObject(m)); // F1 接触判定用（switchHitTest）

  // —— F5 桌面物件：杯子（拿放/携带态地基，2026-10-10）——
  // 位置=桌面南端 (0.69, 桌面+0.045, -2.75)：站位 desk.item 面北(yawDeg=90)时**右手**在东侧
  //   （VRM 局部 +x=左手！面北时右肩 x=0.69——v1 放 0.35 左肩线导致差 0.35 够不着，实测修正）
  const dk0 = ROOM.desk;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 16), M(0xe8e4da, { roughness: 0.4 }));
  cup.castShadow = true;
  const CUP_HOME = new THREE.Vector3(0.69, dk0.h + 0.045, -2.75);
  cup.position.copy(CUP_HOME);
  g.add(cup);
  const cupCenter = CUP_HOME.clone(); // 静态杯中心（携带后不参与 hitTest）

  // —— F5b 抽屉（桌**东面**朝椅，坐姿开启——2026-10-10 实测定案）——
  // 站姿开桌下抽屉（把手 0.59）物理不可达：前倾极限后肩高 ~1.2，垂直缺口 0.5>臂长 0.49，真人需蹲
  // （蹲姿基元属 Phase B）。改坐姿开启（现实中更自然）：坐姿肩 ~0.94，把手 0.59 在正前下方，可及
  const drawer = new THREE.Group();
  const dPanel = box(0.02, 0.10, 0.30, M(0x8a6a4a), 0, 0, 0);
  const dBody = box(0.20, 0.08, 0.26, M(0xa8825a), -0.11, -0.01, 0); // 盒体藏桌内
  drawer.add(dPanel, dBody);
  const DRAWER_HOME_X = 0.72 + 0.015; // 面板凸出桌东面 1.5cm
  drawer.position.set(DRAWER_HOME_X, dk0.h - 0.13, -dk0.cy);
  g.add(drawer);
  let drawerOpen = false, drawerT = 0; // 插值 0=关 1=开（update 驱动；拉出=沿 +x 东滑 0.18m）

  // 桌（西墙）
  const dk = ROOM.desk;
  g.add(box(dk.w, 0.05, dk.l, woodMat, dk.cx, dk.h - 0.025, -dk.cy));
  g.add(box(0.60, dk.h - 0.05, 0.06, woodMat, dk.cx, (dk.h - 0.05) / 2, -(dk.cy - dk.l / 2 + 0.03)));
  g.add(box(0.60, dk.h - 0.05, 0.06, woodMat, dk.cx, (dk.h - 0.05) / 2, -(dk.cy + dk.l / 2 - 0.03)));

  // 显示屏 + 机械臂（屏中心=坐姿眼高 1.127，法向朝东微侧 15°）
  const mo = ROOM.monitor;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 12), M(0x546e7a, { metalness: 0.5, roughness: 0.4 }));
  pole.position.set(mo.cx - 0.06, dk.h + 0.23, -(mo.cy + 0.04));
  pole.castShadow = true;
  g.add(pole);
  g.add(box(0.18, 0.03, 0.03, M(0x546e7a, { metalness: 0.5, roughness: 0.4 }), mo.cx + 0.02, dk.h + 0.465, -mo.cy));
  const yaw = Math.atan2(1, Math.tan((mo.tiltDeg * Math.PI) / 180));
  const screen = box(mo.screenW, mo.screenH, 0.025, M(0x10151c), mo.cx + 0.10, mo.centerY, -mo.cy, yaw);
  g.add(screen);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x16232f, emissive: 0x2a4a63, emissiveIntensity: 0.55, roughness: 0.3 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(mo.screenW - 0.04, mo.screenH - 0.05), faceMat);
  const foff = new THREE.Vector3(0, 0, 0.014).applyEuler(new THREE.Euler(0, yaw, 0));
  face.position.set(screen.position.x + foff.x, screen.position.y, screen.position.z + foff.z);
  face.rotation.y = yaw;
  g.add(face);

  // 键盘 / 鼠标 / 主机机箱
  const kb = ROOM.keyboard;
  g.add(box(kb.w, 0.015, kb.l, M(0xb8c4cc, { roughness: 0.6 }), kb.cx, dk.h + 0.008, -kb.cy));
  const ms = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), M(0xb8c4cc, { roughness: 0.6 }));
  ms.scale.set(0.65, 0.42, 1);
  ms.position.set(ROOM.mouse.cx, dk.h + 0.014, -ROOM.mouse.cy);
  ms.castShadow = true;
  g.add(ms);
  const pc = ROOM.pc;
  g.add(box(pc.w, pc.h, pc.d, M(0x2a3038, { roughness: 0.5, metalness: 0.3 }), pc.cx, pc.h / 2, -pc.cy));
  g.add(box(0.012, pc.h - 0.10, pc.d - 0.10, M(0x332211, { emissive: 0xff8c42, emissiveIntensity: 0.65 }), pc.cx + pc.w / 2 + 0.007, pc.h / 2, -pc.cy));

  // 人体工学椅（面朝 faceDeg：180=正西，205=西偏南 20°）
  const ch = ROOM.chair;
  const chair = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.32, 0.04, 24), M(0x37474f, { metalness: 0.3, roughness: 0.5 }));
  disc.position.y = 0.04;
  disc.castShadow = true;
  chair.add(disc);
  const poleC = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.44, 12), M(0x546e7a, { metalness: 0.5, roughness: 0.4 }));
  poleC.position.y = 0.27;
  poleC.castShadow = true;
  chair.add(poleC);
  chair.add(box(0.48, 0.07, 0.46, M(0x37474f, { roughness: 0.7 }), 0, ch.seatH - 0.035, 0));
  const back = box(0.46, 0.62, 0.07, M(0x37474f, { roughness: 0.7 }), 0, ch.seatH + 0.30, -0.245);
  back.rotation.x = -0.08;
  chair.add(back);
  chair.add(box(0.05, 0.04, 0.32, M(0x263238), 0.265, ch.seatH + 0.12, 0.02));
  chair.add(box(0.05, 0.04, 0.32, M(0x263238), -0.265, ch.seatH + 0.12, 0.02));
  chair.position.set(ch.cx, 0, -ch.cy);
  const fr = (ch.faceDeg * Math.PI) / 180;
  chair.rotation.y = Math.atan2(Math.cos(fr), -Math.sin(fr));
  g.add(chair);

  // 床（床头贴东墙，v2 南移留过道）
  const bd = ROOM.bed;
  g.add(box(bd.l, bd.h - 0.10, bd.w, M(0xc9b28f), bd.cx, (bd.h - 0.10) / 2, -bd.cy));
  g.add(box(bd.l - 0.06, 0.10, bd.w - 0.06, M(0xf6efe6, { roughness: 0.95 }), bd.cx, bd.h - 0.05, -bd.cy));
  g.add(box(bd.l - 0.60, 0.07, bd.w - 0.12, M(0xef9fb4, { roughness: 0.95 }), bd.cx - 0.24, bd.h + 0.01, -bd.cy));
  g.add(box(0.40, 0.09, 0.55, M(0xfdfdf8, { roughness: 0.95 }), bd.cx + bd.l / 2 - 0.28, bd.h + 0.045, -bd.cy + 0.33));
  g.add(box(0.40, 0.09, 0.55, M(0xfdfdf8, { roughness: 0.95 }), bd.cx + bd.l / 2 - 0.28, bd.h + 0.045, -bd.cy - 0.33));
  g.add(box(0.08, bd.headboardH, bd.w + 0.04, darkWood, w - 0.04, bd.headboardH / 2, -bd.cy));

  // MyGO 海报（东墙，位置不随床移动）
  if (posterUrl) {
    const tex = new THREE.TextureLoader().load(posterUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    const po = ROOM.poster;
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(po.w, po.h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    poster.position.set(w - 0.012, po.z0 + po.h / 2, -po.cy);
    poster.rotation.y = -Math.PI / 2;
    g.add(poster);
  }

  // —— 灯位（恒定，档案只改强度/色温）——
  const lp = ROOM.lamp;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    M(0xfff3d6, { emissive: 0xffe0a8, emissiveIntensity: 0.85 }));
  dome.rotation.x = Math.PI;
  dome.position.set(lp.cx, h - 0.02, -lp.cy);
  g.add(dome);
  const lampLight = new THREE.PointLight(0xffd9a0, 14, 10, 2);
  lampLight.position.set(lp.cx, h - 0.25, -lp.cy);
  g.add(lampLight);
  const sun = new THREE.DirectionalLight(0xfff0dd, 1.7);
  sun.position.set(3.5, 2.6, -9);
  sun.target.position.set(2.25, 0.6, -2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -4;
  sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -4;
  sun.shadow.camera.far = 20;
  g.add(sun, sun.target);

  scene.add(g);

  // —— 运行时状态与 API（后台开关功能）——
  const state = {
    time: 'noon', weather: 'sunny', season: 'spring',
    hours: 12.5,          // v4 连续时间轴：0~24 浮点小时（7 时相=关键帧验收点）
    timePlay: false,      // 时间流动开关（HUD ▶：一小时约 2 秒，一昼夜 48s）
    timeSpeed: 0.5,       // 小时/秒
    lampOn: false,        // 灯态（生活动作，纯手动）
    curtainOpen: true,    // 帘默认开
    occupiedFurniture: null, // 被诺诺占用的家具组名（'chair'=坐着；main.js playRecipe/goToAnchor 维护）——
                             // moveChair 守卫「坐着挪椅」+ snapshot 报告家具占用态（实体化 v1，2026-10-10）
    // 当前插值值（向目标 lerp；sunX/sunY=太阳方位/高度角也走混合，影子扫掠连续）
    cur: { sunI: 1.7, sunC: 0xfff6e6, lampI: 0, lampC: 0xffd9a0, hemi: 0.55, seaTint: 0xffffff, glass: 0.35, monitor: 0.30, bg: 0x9fb8cc, curtain: 1, studio: 1, sunX: 2.25, sunY: 2.9 },
  };
  const target = { ...state.cur };
  const hemi = new THREE.HemisphereLight(0xfff2e2, 0x8a7a66, 0.55);
  g.add(hemi);
  const sceneBg = new THREE.Color(0x9fb8cc);

  // —— 24h 时间轴采样（v4 核心）：相邻关键帧线性混合，环形处理跨午夜 ——
  const TIMELINE = Object.entries(LIGHTING_PROFILES)
    .map(([name, p]) => ({ name, hour: p.hour, p }))
    .sort((a, b) => a.hour - b.hour);
  function sampleTimeline(hours) {
    const h = ((hours % 24) + 24) % 24;
    let a = TIMELINE[TIMELINE.length - 1], b = TIMELINE[0], end = TIMELINE[0].hour + 24;
    for (let i = 0; i < TIMELINE.length; i++) {
      const cur = TIMELINE[i], nxt = TIMELINE[(i + 1) % TIMELINE.length];
      const segEnd = i === TIMELINE.length - 1 ? nxt.hour + 24 : nxt.hour;
      if (h >= cur.hour && h < segEnd) { a = cur; b = nxt; end = segEnd; break; }
    }
    const k = Math.min(1, Math.max(0, (((h - a.hour) % 24) + 24) % 24 / (end - a.hour)));
    const pa = a.p, pb = b.p;
    const lerp = (x, y) => x + (y - x) * k;
    return {
      name: k < 0.5 ? a.name : b.name, // 就近签名（HUD 高亮用）
      sunI: lerp(pa.sun.i, pb.sun.i), sunC: lerpColor(pa.sun.c, pb.sun.c, k),
      sunY: lerp(pa.sunY, pb.sunY), sunX: lerp(pa.sunX, pb.sunX),
      hemi: lerp(pa.hemi, pb.hemi), seaTint: lerpColor(pa.seaTint, pb.seaTint, k),
      glass: lerp(pa.glass, pb.glass), monitor: lerp(pa.monitor, pb.monitor),
      bg: lerpColor(pa.bg, pb.bg, k), studio: lerp(pa.studio ?? 1, pb.studio ?? 1),
    };
  }

  function applyTargets() {
    const p = sampleTimeline(state.hours);
    const wt = WEATHERS[state.weather];
    const se = SEASONS[state.season];
    state.time = p.name; // 就近时相签名（兼容 state.time 旧读取方）
    target.sunI = p.sunI * wt.mul * (state.curtainOpen ? 1 : 0.22); // 天气叠层 × 帘遮挡
    target.sunC = p.sunC;
    target.lampI = state.lampOn ? LAMP_MANUAL_I * (1 + wt.lampBoost) : 0; // 灯=手动生活动作，雨夜开灯更亮合理
    target.lampC = 0xffd9a0;
    // 海景/背景：档案基色 → 天气色偏 → 季节色偏
    cA.set(p.seaTint); if (wt.tint) cA.lerp(cB.set(wt.tint), wt.k); cA.lerp(cB.set(se.tint), se.k);
    target.seaTint = cA.getHex();
    cA.set(p.bg); if (wt.tint) cA.lerp(cB.set(wt.tint), wt.k * 0.8); cA.lerp(cB.set(se.tint), se.k * 0.8);
    target.bg = cA.getHex();
    target.hemi = p.hemi * wt.hemiMul * (se.hemiMul ?? 1);
    target.glass = p.glass;
    target.monitor = p.monitor;
    target.curtain = state.curtainOpen ? 1 : 0;
    target.studio = p.studio; // 主.js 棚灯三件套系数（v3 恒定补光稀释昼夜差的根因修复）
    target.sunX = p.sunX;     // 方位角（光斑东西扫掠）——走 cur 混合，影子移动连续
    target.sunY = p.sunY + se.sunYDelta; // 高度角=时相基线+季节增量
  }

  function setTimeHours(h, { instant = false } = {}) {
    state.hours = ((h % 24) + 24) % 24;
    applyTargets();
    if (instant) stepLerp(1);
    return true;
  }
  function setTime(name, { instant = false } = {}) {
    if (!LIGHTING_PROFILES[name]) return false;
    state.hours = LIGHTING_PROFILES[name].hour; // 时相名 → 验收点小时
    applyTargets();
    if (instant) stepLerp(1);
    return true;
  }
  function setWeather(name, { instant = false } = {}) {
    if (!WEATHERS[name]) return false;
    state.weather = name;
    applyTargets();
    if (instant) stepLerp(1);
    return true;
  }
  function setSeason(name, { instant = false } = {}) {
    if (!SEASONS[name]) return false;
    state.season = name;
    applyTargets();
    if (instant) stepLerp(1);
    return true;
  }
  const setProfile = setTime; // 兼容旧调用
  function toggleLamp() { state.lampOn = !state.lampOn; applyTargets(); return state.lampOn; }
  function toggleCurtain() { state.curtainOpen = !state.curtainOpen; applyTargets(); return state.curtainOpen; }
  function toggleTimePlay() { state.timePlay = !state.timePlay; return state.timePlay; }

  function stepLerp(k) {
    const c = state.cur, t = target;
    c.sunI += (t.sunI - c.sunI) * k;
    c.lampI += (t.lampI - c.lampI) * k;
    c.hemi += (t.hemi - c.hemi) * k;
    c.glass += (t.glass - c.glass) * k;
    c.monitor += (t.monitor - c.monitor) * k;
    c.curtain += (t.curtain - c.curtain) * k;
    c.studio += (t.studio - c.studio) * k;
    c.sunX += (t.sunX - c.sunX) * k;
    c.sunY += (t.sunY - c.sunY) * k;
    c.sunC = lerpColor(c.sunC, t.sunC, k);
    c.lampC = lerpColor(c.lampC, t.lampC, k);
    c.seaTint = lerpColor(c.seaTint, t.seaTint, k);
    c.bg = lerpColor(c.bg, t.bg, k);
  }

  // 每帧：时间流动推进 + 把当前值写到对象上（2~4s 混合过渡 → k≈dt*1.6，光像自然变化不像切开关）
  let elapsed = 0;   // 房间内部时钟（秒）
  let moveAnim = null; // 锚点滑步动画 { fromPos, toPos, fromYaw, dYaw, t0, dur, onDone }
  function update(dt, bg) {
    elapsed += dt;
    // F5b 抽屉滑轨插值（开/关目标间平滑过渡；拉出=东滑）
    drawerT += ((drawerOpen ? 1 : 0) - drawerT) * Math.min(1, dt * 6);
    drawer.position.x = DRAWER_HOME_X + drawerT * 0.18;
    if (state.timePlay) {
      state.hours = (state.hours + dt * state.timeSpeed) % 24;
      applyTargets();
    }
    stepLerp(Math.min(1, dt * 1.6));
    sun.intensity = state.cur.sunI;
    sun.color.set(state.cur.sunC);
    sun.position.set(state.cur.sunX, state.cur.sunY, -9);
    lampLight.intensity = state.cur.lampI;
    lampLight.color.set(state.cur.lampC);
    dome.material.emissiveIntensity = state.cur.lampI > 1 ? 0.85 : 0.08;
    hemi.intensity = state.cur.hemi;
    sea.mat.color.set(state.cur.seaTint);
    glass.material.opacity = state.cur.glass;
    faceMat.emissiveIntensity = state.cur.monitor;
    if (bg) bg.set(state.cur.bg);
    // 帘子：开=收拢到两侧（scale 0.34），关=中缝合拢（scale 1）
    const openK = state.cur.curtain;
    const halfW = winW * 0.55;
    const closedL = win.x0 + halfW / 2;
    const openL = win.x0 + (halfW * 0.34) / 2 + 0.05;
    curtainL.scale.x = 1 - openK * 0.66;
    curtainR.scale.x = curtainL.scale.x;
    curtainL.position.x = closedL + (openL - closedL) * openK;
    curtainR.position.x = 2 * winCx - curtainL.position.x;
    // 锚点滑步移动（落座短滑/起立离位：缓动直线，距离 ≤0.7m 不经过家具；arc=正弦抬弧）
    if (moveAnim && modelScene) {
      const e = Math.min(1, (elapsed - moveAnim.t0) / moveAnim.dur);
      const s = e < 0.5 ? 2 * e * e : -1 + (4 - 2 * e) * e; // easeInOutQuad
      modelScene.position.x = moveAnim.fromPos.x + (moveAnim.toPos.x - moveAnim.fromPos.x) * s;
      modelScene.position.z = moveAnim.fromPos.z + (moveAnim.toPos.z - moveAnim.fromPos.z) * s;
      modelScene.position.y = moveAnim.fromPos.y + (moveAnim.toPos.y - moveAnim.fromPos.y) * s + Math.sin(e * Math.PI) * (moveAnim.arc ?? 0);
      modelScene.rotation.y = moveAnim.fromYaw + moveAnim.dYaw * s;
      modelScene.updateMatrixWorld(true);
      if (e >= 1) {
        const done = moveAnim.onDone;
        moveAnim = null;
        done?.();
      }
    }
    // 行走（BUG-095 导航层）：恒速逐段推进+朝向滑向路段方向；配 walk_loop 步态循环食用
    if (walkAnim && modelScene && !moveAnim) {
      let step = WALK_SPEED * dt;
      while (step > 0 && walkAnim.queue.length) {
        const tgt = walkAnim.queue[0];
        const dx = tgt.x - modelScene.position.x, dz = tgt.z - modelScene.position.z;
        const remain = Math.hypot(dx, dz);
        if (remain <= step) { // 本段走完：落点、出队、下一段朝向
          modelScene.position.x = tgt.x; modelScene.position.z = tgt.z;
          walkAnim.queue.shift();
          step -= remain;
        } else {
          modelScene.position.x += (dx / remain) * step;
          modelScene.position.z += (dz / remain) * step;
          walkAnim.faceYaw = Math.atan2(dx, dz); // 朝行进方向（+z 前向基准）
          step = 0;
        }
        if (walkAnim.queue.length) {
          const n = walkAnim.queue[0];
          const ndx = n.x - modelScene.position.x, ndz = n.z - modelScene.position.z;
          if (Math.hypot(ndx, ndz) > 1e-4) walkAnim.faceYaw = Math.atan2(ndx, ndz);
        }
      }
      // 朝向滑变（最短路径，k=dt*10≈180ms 转完 90°）
      const dYaw = ((walkAnim.faceYaw - modelScene.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      modelScene.rotation.y += dYaw * Math.min(1, dt * 10);
      modelScene.updateMatrixWorld(true);
      if (!walkAnim.queue.length) {
        const done = walkAnim.onArrive;
        walkAnim = null;
        done?.();
      }
    }
  }

  setProfile('noon', { instant: true });

  // —— 穿模体检（白盒版 gate④：AABB 碰撞盒 + 关键骨骼点穿入检测）——
  // 检测点=手/肘/膝/脚等"应该悬空"的末端骨骼；点在盒内（缩 1cm 容差）即违例——
  // 臀部贴座面这类"合法接触"不检测（髋点在座面上方）
  const colliders = [];
  function addCollider(name, mesh, group = null) {
    if (!mesh) return null;
    const bx = new THREE.Box3().setFromObject(mesh);
    bx.expandByScalar(-0.01); // 1cm 容差：贴面接触不算穿入
    const c = { name, group, box: bx };
    colliders.push(c);
    return c; // 返回引用：实体化轮 moveChair 后按 mesh 重算盒（syncChairColliders）
  }
  // 圆盘碰撞体（BUG-107 修复方向②补充）：五星脚底盘是圆柱而非方块——AABB 会把"盒角区"误报成
  // 穿入（实测坐姿脚趾 (0.66,-2.99) 距盘心 0.47m > 盘半径 0.32m，AABB 却报在盒内）。圆盘判定消除该假阳性。
  // box 字段=盘的 AABB，仅供寻路膨胀（segClear/routeTo 消费 .box）；穿入检测走 circle 精确判定
  function addCircleCollider(name, group, cx, cz, r, y0, y1) {
    const c = {
      name, group,
      circle: { cx, cz, r, y0, y1 },
      box: new THREE.Box3(new THREE.Vector3(cx - r, y0, cz - r), new THREE.Vector3(cx + r, y1, cz + r)),
    };
    colliders.push(c);
    return c;
  }
  const findMesh = (px, py, pz) => {
    let best = null, bd = 1e9;
    g.traverse((m) => {   // 递归遍历：椅子等家具是 Group 嵌套，直接 children 拿不到座面/扶手
      if (!m.isMesh) return;
      const c = new THREE.Vector3();
      m.getWorldPosition(c);
      const dist = (c.x - px) ** 2 + (c.y - py) ** 2 + (c.z - pz) ** 2;
      if (dist < bd) { bd = dist; best = m; }
    });
    return best;
  };
  // 椅子碰撞体绑定（实体化 v1，2026-10-10）：保存 {collider, mesh} 引用——moveChair 后按 mesh
  // 重算世界盒（syncChairColliders），锚点/圆盘随动，寻路（segClear 每次现读 colliders）自动生效
  const chairColBindings = [];
  const chairSeatMesh = findMesh(ch.cx, ch.seatH - 0.035, -ch.cy);
  chairColBindings.push({ c: addCollider('椅座', chairSeatMesh, 'chair'), mesh: chairSeatMesh });
  const CHAIR_DISC_R = 0.32;
  const chairDisc = addCircleCollider('椅底座', 'chair', ch.cx, -ch.cy, CHAIR_DISC_R, 0.0, 0.06); // 五星脚圆盘：r=盘半径（0.30~0.32 锥），y=盘厚区间
  // 扶手/椅背随椅身旋转（205°）：局部坐标 → 世界坐标后匹配
  const chRot = Math.atan2(Math.cos((ch.faceDeg * Math.PI) / 180), -Math.sin((ch.faceDeg * Math.PI) / 180));
  const chLocal = (lx, ly, lz) => new THREE.Vector3(
    ch.cx + lx * Math.cos(chRot) + lz * Math.sin(chRot),
    ly,
    -ch.cy - lx * Math.sin(chRot) + lz * Math.cos(chRot),
  );
  for (const sgn of [1, -1]) {
    const c = chLocal(sgn * 0.265, ch.seatH + 0.12, 0.02);
    const m = findMesh(c.x, c.y, c.z);
    chairColBindings.push({ c: addCollider('扶手', m, 'chair'), mesh: m });
  }
  const backC = chLocal(0, ch.seatH + 0.30, -0.245);
  const chairBackMesh = findMesh(backC.x, backC.y, backC.z);
  chairColBindings.push({ c: addCollider('椅背', chairBackMesh, 'chair'), mesh: chairBackMesh });
  addCollider('桌板', findMesh(dk.cx, dk.h - 0.025, -dk.cy), 'desk');
  addCollider('床垫', findMesh(bd.cx, bd.h - 0.05, -bd.cy), 'bed');
  addCollider('床箱', findMesh(bd.cx, (bd.h - 0.10) / 2, -bd.cy), 'bed');
  addCollider('床头板', findMesh(w - 0.04, bd.headboardH / 2, -bd.cy), 'bed');
  addCollider('主机', findMesh(pc.cx, pc.h / 2, -pc.cy), 'pc');

  // 穿入检测：points = { 骨名: Vector3 }，返回违例列表。
  // BUG-107 修复方向③（半径膨胀）：roomCheck 检测点=末端骨心，腿/手网格半径未计入时"点净空充足"
  // 但网格仍可能相交。检测端按骨分档补半径（腿 60mm/脚 45mm/手与前臂 40mm），pen=膨胀后穿透深度。
  // BUG-110（2026-10-09 黑机）：圆盘碰撞体（椅底座）此前只做"骨点入盘"判定、未叠加骨半径——
  //   与 AABB 分支口径不一致，脚网格边缘搭上盘缘 ≤4.5cm 的接触漏报。改球-实心圆柱相交
  //   （水平超出 hEx + 垂直超出 vEx 合成距离 < 骨半径），两分支同口径；AABB 角区假阳性不会回归
  //   （旧假阳性点距盘心 0.47m，hEx=0.15m > 任何骨半径）。
  const BONE_RADIUS = {
    UpperLeg: 0.06, LowerLeg: 0.05, Foot: 0.045, Toes: 0.04, Hand: 0.04, LowerArm: 0.04,
    // 手部代理档 B（2026-10-10 院长裁决「体检代理要达到手掌」）：指骨分档半径（VRoid 指径 12~16mm
    //  → 半径 6~8mm，取微胖值防漏报；拇指最粗）。30 根手型骨全部入检——指尖伸进家具/指节擦碰可报
    Metacarpal: 0.014, Proximal: 0.011, Intermediate: 0.010, Distal: 0.009,
  };
  const boneRadius = (bone) => { for (const k in BONE_RADIUS) if (bone.endsWith(k)) return BONE_RADIUS[k]; return 0; };
  // points 值：Vector3（半径=boneRadius(骨名)）或 { p:Vector3, r }（胶囊采样点显式携带半径——
  //   main.js roomCheck 把指骨链按 12mm 步长插值采样，键名 `A~B#i` 不落在 BONE_RADIUS 分档里）
  function checkCollisions(points) {
    const out = [];
    for (const [bone, pv] of Object.entries(points)) {
      const p = pv.isVector3 ? pv : pv.p;
      const r = pv.isVector3 ? boneRadius(bone) : pv.r;
      for (const c of colliders) {
        if (c.circle) {
          const dRz = Math.hypot(p.x - c.circle.cx, p.z - c.circle.cz);
          const hEx = Math.max(0, dRz - c.circle.r);
          const vEx = Math.max(0, c.circle.y0 - p.y, p.y - c.circle.y1);
          const gap = Math.hypot(hEx, vEx);
          if (gap < r) out.push({ bone, collider: c.name, pen: +(r - gap).toFixed(3), at: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)] });
        } else {
          const d = c.box.distanceToPoint(p);
          if (d < r) out.push({ bone, collider: c.name, pen: +(r - d).toFixed(3), at: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)] });
        }
      }
    }
    return out;
  }

  // 模型引用（buildRoom 先于 VRM 加载完成，由 main.js 加载后回填）
  let modelScene = null;

  // —— 交互锚点（affordance）：物体声明"可怎么用"，大脑/遥控调用=走到锚点+播配方 ——
  // 坐姿锚点数值=场景设计 §二实测推导（椅面 0.556/床沿 0.45），默认姿势零穿模由 checkCollisions 把关
  // v4.1 字段：group=所属家具碰撞组（寻路豁免：走向该家具的最后一程允许贴近）；
  //   approachWay=下车站点（行走终点，落座时再短滑上座面）；standExit=起立离位滑步点（避免站进家具里）
  const anchors = {
    'chair.sit':   { label: '椅子坐',   pos: [1.05, 0, -3.25], yawDeg: 205, recipe: 'sit_chair', group: 'chair', approachWay: 'chairNear', standExit: [1.05, 0, -2.72] },
    'chair.stand': { label: '椅旁站立', pos: [1.62, 0, -2.72], yawDeg: 150 },
    'bed.sit':     { label: '床沿坐',   pos: [3.50, 0, -3.18], yawDeg: 250, recipe: 'sit_bed',   group: 'bed',   approachWay: 'bedSide',   standExit: [3.50, 0, -2.72] },
    'room.center': { label: '活动区',   pos: [2.10, 0, -2.05], yawDeg: 180 },
    // F1 关灯（2026-10-10）：站位=开关面板（东墙东南段，btnLamp 世界 (4.42,1.18,-1.75)）西侧，
    //   右肩正对按钮（面东 yawDeg=0 时右手侧=南，站位 z 取 -1.92 使右肩 z≈-1.75 对准面板）；
    //   x=4.00 为 v2 标定值（配方 upperArm -58 时指尖 x≈4.40 贴按钮不越墙，v1 站 4.10 指尖戳墙 9cm）；
    //   contact=配方到位后的指尖接触判定（main.js goToAnchor 消费：够到→toggleLamp）
    'switch.operate': { label: '开关灯', pos: [4.00, 0, -1.92], yawDeg: 0, recipe: 'operate_switch', approachWay: 'switchFront',
      contact: { bone: 'rightIndexDistal', switchIdx: 0, threshold: 0.15 } },
    // F5 桌面物件站位（2026-10-10）：桌南缘前，面北（yawDeg=90）时右肩（西侧）正对杯位/抽屉把手；
    //   pick/place 配方由 main.js 编排播（共用伸手配方 pick_cup），contact 判定在编排层做（拿/放/抽屉判定对象不同）
    'desk.item': { label: '桌前', pos: [0.52, 0, -2.47], yawDeg: 90, group: 'desk' },
  };

  // —— 导航路点图（BUG-095：滑步直线穿越家具——白盒导航层：手铺路点 + 线段×膨胀盒 clearance 校验 + Dijkstra）——
  // Phase B 可平滑升级 navmesh：routeTo 接口不变只换实现；行走视觉=walkTo（恒速逐段+朝向滑向路段方向）
  const BODY_R = 0.20;    // 体半径：碰撞盒膨胀量（行走擦边留隙）
  // 行走速度 = 步态 clip 固有速度（Blender 步态 v1：步长 0.44m × 2 / 周期 1.0s = 0.88 m/s，见 blender_walk_gait.py）
  // 两者必须一致，否则脚底打滑（配方步态时代 1.05 为近似值，2026-10-08 步态 clip 轮按几何精确值定）
  const WALK_SPEED = 0.88; // m/s
  const WAYPOINTS = {
    center:      { pos: [2.10, -2.05] },
    southMid:    { pos: [2.25, -1.30] },
    chairNear:   { pos: [1.05, -2.72] }, // 下车站点=椅正南（滑座线 x 恒 1.05 全程椅背西缘外 9cm——垂落手臂包络不擦椅背；离位同点北出）。实体化 v1 起由 deriveChairAnchors() 随椅自动更新
    bedSide:     { pos: [3.50, -2.72] }, // 床沿下车站点（床缘外 0.38m）
    westDoor:    { pos: [0.70, -0.80] },
    eastDoor:    { pos: [3.80, -0.80] },
    switchFront: { pos: [4.00, -1.92] }, // 开关面板站位（F1，2026-10-10；=锚点 'switch.operate'.pos）
  };
  const WAYPOINT_EDGES = [
    ['center', 'southMid'], ['center', 'chairNear'], ['center', 'bedSide'],
    ['southMid', 'westDoor'], ['southMid', 'eastDoor'], ['southMid', 'chairNear'],
    ['bedSide', 'eastDoor'], ['bedSide', 'chairNear'], ['bedSide', 'southMid'],
    ['chairNear', 'westDoor'], ['eastDoor', 'switchFront'],
  ];

  // —— 家具实体化 v1（2026-10-10 院长裁决，动作库规划 §六）：椅子从「静态 collider + 手铺锚点」
  // 升级为可动实体——碰撞盒随动（syncChairColliders）+ 锚点/下车站从实体派生（deriveChairAnchors）
  // + 寻路即时生效（segClear/routeTo 每次现读 colliders）。人椅刚体联动（推椅/滑椅时人随椅动）
  // 属 F2~F4，不在本版——moveChair 以 state.occupiedFurniture 守卫「坐着挪椅」。 ——
  const chairYaw0 = Math.atan2(Math.cos((ch.faceDeg * Math.PI) / 180), -Math.sin((ch.faceDeg * Math.PI) / 180));
  const CHAIR_EXIT_OFFSET = [0, 0.53]; // 离位站点相对椅心的世界偏移（初始布局实测：[1.05,-3.25]→[1.05,-2.72]）
  function deriveChairAnchors() {
    const a = anchors['chair.sit'];
    a.pos = [chair.position.x, 0, chair.position.z];
    const dy = chair.rotation.y - chairYaw0; // 相对初始朝向的增量（绕 y）
    const cos = Math.cos(dy), sin = Math.sin(dy);
    const [ox, oz] = CHAIR_EXIT_OFFSET;
    a.standExit = [a.pos[0] + ox * cos + oz * sin, 0, a.pos[2] - ox * sin + oz * cos];
    a.yawDeg = ((Math.round(Math.atan2(-Math.cos(chair.rotation.y), Math.sin(chair.rotation.y)) * 180 / Math.PI) % 360) + 360) % 360; // 坐姿朝向随椅（rotation.y→yawDeg 语义反推，同 snapshot）
    WAYPOINTS.chairNear.pos = [a.standExit[0], a.standExit[2]];
  }
  function syncChairColliders() {
    chair.updateMatrixWorld(true);
    for (const b of chairColBindings) {
      if (!b.c || !b.mesh) continue;
      b.c.box.setFromObject(b.mesh);
      b.c.box.expandByScalar(-0.01);
    }
    chairDisc.circle.cx = chair.position.x;
    chairDisc.circle.cz = chair.position.z;
    chairDisc.box.min.set(chair.position.x - CHAIR_DISC_R, 0.0, chair.position.z - CHAIR_DISC_R);
    chairDisc.box.max.set(chair.position.x + CHAIR_DISC_R, 0.06, chair.position.z + CHAIR_DISC_R);
  }
  function moveChair(x, z, yawDeg = null, { withRider = false } = {}) {
    if (state.occupiedFurniture === 'chair' && !withRider) {
      return { ok: false, msg: '诺诺正坐在椅子上（坐姿挪椅须走 withRider 人椅滑移——F2/F3/F4 编排层负责同步移人）' };
    }
    const px = Math.min(w - 0.45, Math.max(0.45, x));
    const pz = Math.min(-(0.45), Math.max(-(d - 0.45), z));
    chair.position.set(px, 0, pz);
    if (yawDeg != null) {
      const fr2 = (yawDeg * Math.PI) / 180;
      chair.rotation.y = Math.atan2(Math.cos(fr2), -Math.sin(fr2));
    }
    syncChairColliders();
    deriveChairAnchors();
    return { ok: true, anchor: { ...anchors['chair.sit'] }, disc: { ...chairDisc.circle } };
  }
  // 线段是否全程避开碰撞盒（逐 5cm 采样点对膨胀盒做 containsPoint；exemptGroups=目的地家具豁免）
  function segClear(ax, az, bx, bz, exemptGroups) {
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    const steps = Math.max(2, Math.ceil(len / 0.05));
    const p = new THREE.Vector3();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      p.set(ax + dx * t, 0.5, az + dz * t); // y=0.5：躯干高度扫一遍（家具全在 0~1.3m 高）
      for (const c of colliders) {
        if (exemptGroups?.includes(c.group)) continue;
        const e = c.box.clone().expandByScalar(BODY_R);
        if (e.containsPoint(p)) return false;
      }
    }
    return true;
  }
  // 寻路：虚拟起点（诺诺当前位置）→ 路点图 Dijkstra → 目标 approach 点；返回途经点数组（不含起点，空数组=原地）
  // 豁免策略（v4.1 教训：整条路线豁免目的地家具会让路径擦着床沿走）：
  //   最后一程（进 goal）豁免目的地家具组；首段豁免"起点所站家具组"（从椅/床边起身离开）；
  //   中间段一律不豁免——路点图的存在意义就是绕开家具
  function routeTo(key) {
    const a = anchors[key];
    if (!a || !modelScene) return null;
    const start = [modelScene.position.x, modelScene.position.z];
    const goal = a.approachWay ? WAYPOINTS[a.approachWay].pos : [a.pos[0], a.pos[2]];
    if (Math.hypot(goal[0] - start[0], goal[1] - start[1]) < 0.08) return []; // 已在原地
    // 起点所站家具组（起点在膨胀盒内=刚从该家具起身/站位贴着它）
    const startGroups = [];
    const sp = new THREE.Vector3(start[0], 0.5, start[1]);
    for (const c of colliders) {
      if (!c.group || startGroups.includes(c.group)) continue;
      if (c.box.clone().expandByScalar(BODY_R).containsPoint(sp)) startGroups.push(c.group);
    }
    const directExempt = [...new Set([...startGroups, ...(a.group ? [a.group] : [])])];
    if (segClear(start[0], start[1], goal[0], goal[1], directExempt)) return [goal]; // 直达可见
    // Dijkstra（7 节点暴力足够）：起点/终点作虚拟节点挂进图
    const startKey = '__start', goalKey = a.approachWay ?? '__goal';
    const adj = new Map([[startKey, []], [goalKey, []]]);
    for (const k of Object.keys(WAYPOINTS)) adj.set(k, []);
    adj.get(startKey).push(goalKey); adj.get(goalKey).push(startKey);
    for (const [u, v] of WAYPOINT_EDGES) { adj.get(u).push(v); adj.get(v).push(u); }
    const pt = (k) => (k === startKey ? start : k === goalKey ? goal : WAYPOINTS[k].pos);
    const edgeExempt = (u, v) => {
      if (u === goalKey || v === goalKey) return a.group ? [a.group] : null;
      if (u === startKey || v === startKey) return startGroups.length ? startGroups : null;
      return null;
    };
    const dist = new Map(), prev = new Map(), visit = new Set();
    for (const k of adj.keys()) dist.set(k, Infinity);
    dist.set(startKey, 0);
    while (true) {
      let cur = null, cd = Infinity;
      for (const [k, dv] of dist) if (!visit.has(k) && dv < cd) { cur = k; cd = dv; }
      if (cur === null || cd === Infinity) break;
      visit.add(cur);
      if (cur === goalKey) break;
      for (const v of adj.get(cur)) {
        if (visit.has(v)) continue;
        const pu = pt(cur), pv = pt(v);
        if (!segClear(pu[0], pu[1], pv[0], pv[1], edgeExempt(cur, v))) continue;
        const nd = cd + Math.hypot(pv[0] - pu[0], pv[1] - pu[1]);
        if (nd < dist.get(v)) { dist.set(v, nd); prev.set(v, cur); }
      }
    }
    if (!visit.has(goalKey) || dist.get(goalKey) === Infinity) return [goal]; // 图不通兜底直走（白盒期可接受）
    const path = [];
    for (let k = goalKey; k !== startKey; k = prev.get(k)) path.unshift(k === goalKey ? [...goal] : [...WAYPOINTS[k].pos]);
    return path;
  }

  // 行走动画状态：逐段线性推进（恒速）+ 朝向每帧滑向路段方向（转弯自然）
  let walkAnim = null; // { queue:[{x,z}...], faceYaw, onArrive }

  const api = {
    group: g,
    update,
    setProfile,
    setTime,
    setTimeHours,
    setWeather,
    setSeason,
    toggleLamp,   // v3 曾遗漏导出：HUD/墙上开关的灯按钮一直 TypeError（BUG-094）
    toggleCurtain,
    toggleTimePlay,
    profiles: Object.keys(LIGHTING_PROFILES),
    weathers: Object.keys(WEATHERS),
    seasons: Object.keys(SEASONS),
    labels: { time: LIGHTING_PROFILES, weather: WEATHERS, season: SEASONS },
    timeHours: Object.fromEntries(Object.entries(LIGHTING_PROFILES).map(([k, p]) => [k, p.hour])),
    anchors,
    colliders,
    checkCollisions,
    setModel(s) { modelScene = s; },
    // 滑步移动：根位置+朝向缓动（落座短滑/起立离位专用，距离 ≤0.7m 不经过家具）；yawDeg=null=保持当前朝向；
    // arc=中途抬升高度（米，正弦弧）——椅子落座滑步时脚部抬过 8cm 底盘边缘（不抬=脚穿盘，实测 toe 入盘 70 采样）
    moveTo(pos, yawDeg, { dur = 0.9, onDone, arc = 0 } = {}) {
      if (!modelScene) return false;
      walkAnim = null; // 滑步接管：进行中的行走作废（互斥）
      const fromYaw = modelScene.rotation.y;
      let dYaw = 0;
      if (yawDeg != null) {
        const fr2 = (yawDeg * Math.PI) / 180;
        const toYaw = Math.atan2(Math.cos(fr2), -Math.sin(fr2));
        dYaw = ((toYaw - fromYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; // 最短路径
      }
      moveAnim = {
        fromPos: modelScene.position.clone(),
        toPos: new THREE.Vector3(pos[0], pos[1] ?? 0, pos[2]),
        fromYaw, dYaw, t0: elapsed, dur, onDone, arc,
      };
      return true;
    },
    gotoAnchor(key, { moveModel = true, smooth = false, dur = 0.9, onArrive } = {}) {
      const a = anchors[key];
      if (!a) return false;
      if (moveModel && modelScene) {
        if (smooth) {
          this.moveTo(a.pos, a.yawDeg, { dur, onDone: onArrive });
          return true;
        }
        modelScene.position.set(a.pos[0], a.pos[1], a.pos[2]);
        const fr2 = (a.yawDeg * Math.PI) / 180;
        modelScene.rotation.y = Math.atan2(Math.cos(fr2), -Math.sin(fr2));
        modelScene.updateMatrixWorld(true);
        moveAnim = null; // 瞬移接管：进行中的滑步作废
        onArrive?.();
      }
      return true;
    },
    // 行走（导航层入口）：寻路→恒速逐段走→到位回调。main.js 配 walk_loop 步态循环：onDepart 起步/onArrive 收势
    walkTo(key, { onDepart = null, onArrive = null } = {}) {
      const a = anchors[key];
      if (!a || !modelScene) return false;
      const path = routeTo(key);
      if (path === null) return false;
      moveAnim = null; // 行走接管：进行中的滑步作废
      if (path.length === 0) { onArrive?.(); return true; } // 已在原地
      walkAnim = {
        queue: path.map((p) => ({ x: p[0], z: p[1] })),
        faceYaw: modelScene.rotation.y,
        onArrive,
      };
      onDepart?.();
      return true;
    },
    cancelWalk() { walkAnim = null; },
    routeTo, // 调试：查看寻路结果（途经点数组）
    // —— 家具实体化 v1（2026-10-10）——
    moveChair, // 挪椅（引擎能力，F2~F4 地基）：碰撞盒/锚点/下车站随动；坐着挪椅被守卫拒绝
    // 家具占用态 setter（实体化 v1）：state 是 getter 每次返回浅拷贝，外部直接对 roomApi.state.x 赋值
    //   落不到内部 state（2026-10-10 实测踩坑）——occupy 必须走本入口；main.js playRecipe 消费
    setFurnitureOccupied(group) { state.occupiedFurniture = group; },
    // F1 接触判定：指尖点与开关按钮的距离与命中（threshold 默认 15cm=「按到」白盒口径）
    switchHitTest(p, idx = 0, threshold = 0.15) {
      const bx = switchBoxes[idx];
      if (!bx) return { ok: false, msg: `开关按钮 #${idx} 不存在` };
      const c = bx.getCenter(new THREE.Vector3());
      const dist = p.distanceTo(c);
      return { ok: true, dist: +dist.toFixed(3), hit: dist <= threshold, center: [+c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3)] };
    },
    boneRadiusFor: (name) => boneRadius(name), // 手部代理档 B：main.js 胶囊采样点取两端均值半径（单一真源防漂移）
    // F1 v3：开关按钮世界坐标（视线锁用——到位后诺诺注视按钮）
    switchCenter(idx = 0) {
      const bx = switchBoxes[idx];
      return bx ? bx.getCenter(new THREE.Vector3()) : null;
    },
    // —— F5 桌面物件/抽屉（2026-10-10）——
    cup: { mesh: cup, home: CUP_HOME }, // 杯子引用：携带态由 main.js rAF 同步到手骨；home=归位点
    cupHitTest(p, threshold = 0.12) {
      const dist = p.distanceTo(cupCenter);
      return { ok: true, dist: +dist.toFixed(3), hit: dist <= threshold, center: [+cupCenter.x.toFixed(3), +cupCenter.y.toFixed(3), +cupCenter.z.toFixed(3)] };
    },
    toggleDrawer() { drawerOpen = !drawerOpen; return drawerOpen; },
    drawerHitTest(p, threshold = 0.15, useHome = false) {
      // useHome=true=对关合位面板中心判定（开关抽屉编排恒用——开着的抽屉腔会被手伸入，
      //   对「当前中心」判定会错位 0.19m，2026-10-10 实测踩坑）
      const c = new THREE.Vector3(DRAWER_HOME_X, drawer.position.y, drawer.position.z);
      if (!useHome) dPanel.getWorldPosition(c);
      const dist = p.distanceTo(c);
      return { ok: true, dist: +dist.toFixed(3), hit: dist <= threshold, center: [+c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3)] };
    },
    // L1 场景状态快照（感官架构设计 §三；预算 ≤200 token 的浓缩 JSON）——前端侧只读适配器。
    // 跨进程形态（大脑在后端）由 main.js 经 WebSocket 上报身体态后端拼装，本函数只管前端权威的一半：
    //   环境全局量 + 家具位姿 + 自身位置；诺诺姿态（坐/站/动作）由 main.js 的 nonoSnapshot() 合入。
    snapshot() {
      // rotation.y → 锚点 yawDeg 语义（前向=(cosY,-sinY)）的反推：Y=atan2(-cos(ry), sin(ry))
      const rawDeg = Math.atan2(-Math.cos(chair.rotation.y), Math.sin(chair.rotation.y)) * 180 / Math.PI;
      const chairYawDeg = ((Math.round(rawDeg) % 360) + 360) % 360;
      const ms = modelScene;
      return {
        time: { name: state.time, hours: +state.hours.toFixed(2) },
        weather: state.weather,
        season: state.season,
        lampOn: state.lampOn,
        curtainOpen: state.curtainOpen,
        furniture: [
          { name: 'chair', x: +chair.position.x.toFixed(3), z: +chair.position.z.toFixed(3), yawDeg: chairYawDeg, occupiedBy: state.occupiedFurniture === 'chair' ? 'nono' : null },
        ],
        nono: ms ? { x: +ms.position.x.toFixed(3), z: +ms.position.z.toFixed(3), rotY: +ms.rotation.y.toFixed(3) } : null,
        // onIdle 事件位预留（感官架构 §增强4 self-prompting）：大脑 idle 自主决策触发器挂点，v2 接
      };
    },
    get state() { return { ...state, cur: { ...state.cur } }; },
    switches: [btnLamp, btnCur], // 点击拾取用：0=灯 1=帘
    sea, glass, faceMat, dome, hemiLight: hemi,
  };
  return api;
}
