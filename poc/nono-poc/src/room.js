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
  monitor: { cx: 0.30, cy: 3.60, screenW: 0.62, screenH: 0.37, centerY: 1.127, tiltDeg: 15 },
  keyboard: { cx: 0.52, cy: 3.05, w: 0.13, l: 0.32 },
  mouse: { cx: 0.53, cy: 3.42 },
  pc: { cx: 0.27, cy: 2.895, w: 0.26, h: 0.50, d: 0.55 },
  chair: { cx: 1.05, cy: 3.25, seatH: 0.556, faceDeg: 205 },
  bed: { cx: 3.50, cy: 3.80, l: 2.00, w: 1.40, h: 0.45, headboardH: 1.10 }, // v2：南移 0.5m，床沿北墙留 0.5m 过道（未来通阳台）
  window: { x0: 0.65, x1: 3.85, top: 2.80 }, // v2：落地窗，居中 3.2m，左右各留 0.65m 北墙
  doors: { west: { y0: 0.35, y1: 1.25, h: 2.05 }, east: { y0: 0.35, y1: 1.25, h: 2.05 } },
  poster: { cy: 4.25, w: 0.60, h: 0.80, z0: 1.30 }, // 不随床移动（院长裁决）
  switchPanel: { cx: 4.12, cy: 4.62, z: 1.15 }, // 开关面板：北墙东段（床头北边），与天花板灯同区
  lamp: { cx: 2.25, cy: 2.50 },
};

// —— 光效档案（灯位恒定；方法论：院长 idle-game room-lighting-profiles.md §三/§六）——
// 一态一签名：正午=硬窗格亮白 / 黄昏=蓝橙对撞 / 傍晚=暖光池浮在深蓝 / 深夜=屏幕微光
export const LIGHTING_PROFILES = {
  noon:    { label: '正午·硬窗光', sun: { i: 1.7, c: 0xfff6e6 }, lamp: { i: 0,  c: 0xffd9a0 }, hemi: 0.55, seaTint: 0xffffff, glass: 0.35, monitor: 0.30, bg: 0x9fb8cc, idColor: '#F6F3E7' },
  dusk:    { label: '黄昏·蓝橙对撞', sun: { i: 1.05, c: 0xffab5e }, lamp: { i: 9,  c: 0xffc088 }, hemi: 0.4,  seaTint: 0xd9a06a, glass: 0.4,  monitor: 0.45, bg: 0x6a5a7a, idColor: '#FF9E4F' },
  evening: { label: '傍晚·暖光池', sun: { i: 0.22, c: 0x8fa3c8 }, lamp: { i: 14, c: 0xffd9a0 }, hemi: 0.3,  seaTint: 0x5a6c96, glass: 0.5,  monitor: 0.55, bg: 0x24324e, idColor: '#FFB168' },
  night:   { label: '深夜·屏幕微光', sun: { i: 0.05, c: 0x9db8de }, lamp: { i: 2.5, c: 0xffc890 }, hemi: 0.18, seaTint: 0x2c3d5e, glass: 0.55, monitor: 0.95, bg: 0x0f1524, idColor: '#E9A85B' },
};

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
    profile: 'noon',
    lampOn: false,        // 正午默认关灯（档案驱动）
    curtainOpen: true,    // 帘默认开
    // 当前插值值（向目标 lerp）
    cur: { sunI: 1.7, sunC: 0xfff6e6, lampI: 0, lampC: 0xffd9a0, hemi: 0.55, seaTint: 0xffffff, glass: 0.35, monitor: 0.30, bg: 0x9fb8cc, curtain: 1, sunFactor: 1 },
  };
  const target = { ...state.cur };
  const hemi = new THREE.HemisphereLight(0xfff2e2, 0x8a7a66, 0.55);
  g.add(hemi);
  const sceneBg = new THREE.Color(0x9fb8cc);

  function applyTargets() {
    const p = LIGHTING_PROFILES[state.profile];
    target.sunI = p.sun.i * (state.curtainOpen ? 1 : 0.22); // 帘遮挡：窗光 ×0.22
    target.sunC = p.sun.c;
    target.lampI = state.lampOn ? p.lamp.i : 0;
    target.lampC = p.lamp.c;
    target.hemi = p.hemi;
    target.seaTint = p.seaTint;
    target.glass = p.glass;
    target.monitor = p.monitor;
    target.bg = p.bg;
    target.curtain = state.curtainOpen ? 1 : 0;
    target.sunFactor = state.curtainOpen ? 1 : 0.22;
  }

  function setProfile(name, { instant = false } = {}) {
    if (!LIGHTING_PROFILES[name]) return false;
    state.profile = name;
    state.lampOn = LIGHTING_PROFILES[name].lamp.i > 4; // 档案决定默认灯态（可再手动开关）
    applyTargets();
    if (instant) stepLerp(1);
    return true;
  }
  function toggleLamp() { state.lampOn = !state.lampOn; applyTargets(); return state.lampOn; }
  function toggleCurtain() { state.curtainOpen = !state.curtainOpen; applyTargets(); return state.curtainOpen; }

  function stepLerp(k) {
    const c = state.cur, t = target;
    c.sunI += (t.sunI - c.sunI) * k;
    c.lampI += (t.lampI - c.lampI) * k;
    c.hemi += (t.hemi - c.hemi) * k;
    c.glass += (t.glass - c.glass) * k;
    c.monitor += (t.monitor - c.monitor) * k;
    c.curtain += (t.curtain - c.curtain) * k;
    c.sunFactor += (t.sunFactor - c.sunFactor) * k;
    c.sunC = lerpColor(c.sunC, t.sunC, k);
    c.lampC = lerpColor(c.lampC, t.lampC, k);
    c.seaTint = lerpColor(c.seaTint, t.seaTint, k);
    c.bg = lerpColor(c.bg, t.bg, k);
  }

  // 每帧：把当前值写到对象上（0.5~2s 混合过渡 → k≈dt*3.5）
  function update(dt, bg) {
    stepLerp(Math.min(1, dt * 3.5));
    sun.intensity = state.cur.sunI;
    sun.color.set(state.cur.sunC);
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
  }

  setProfile('noon', { instant: true });

  const api = {
    group: g,
    update,
    setProfile,
    toggleLamp,
    toggleCurtain,
    profiles: Object.keys(LIGHTING_PROFILES),
    get state() { return { ...state, cur: { ...state.cur } }; },
    switches: [btnLamp, btnCur], // 点击拾取用：0=灯 1=帘
    sea, glass, faceMat, dome, hemiLight: hemi,
  };
  return api;
}
