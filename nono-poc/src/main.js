// 诺诺渲染管线 PoC · R-058
// 方案：prd/01-需求文档/07-自习室/诺诺Web渲染管线PoC方案.md
// 验收：1 上屏 / 2 眨眼呼吸 / 3 lookAt / 4 表情切换 / 5 SpringBone / 6 60fps / 7 沉淀
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './mixamoAnimation.js';
import Stats from 'three/addons/libs/stats.module.js';
// 模型原地引用（不复制进 PoC）：Vite assetsInclude+?url 生成 /@fs/ 资源地址
// ?model=v5 可对照旧贴片眼版；默认 v6（3D 眼球总成）
import vrm5Url from '../../prd/01-需求文档/05-美术设计/诺诺/nonono_v5.vrm?url';
import vrm7Url from '../../prd/01-需求文档/05-美术设计/诺诺/nonono_v7_vroid_eye.vrm?url';
import vrm6Url from '../../prd/01-需求文档/05-美术设计/诺诺/nonono_v6_eyeball_v1.vrm?url';

const params = new URLSearchParams(location.search);
const MODEL = { v5: { url: vrm5Url, label: 'v5·原生对照' }, v6: { url: vrm6Url, label: 'v6·3D眼球' }, v7: { url: vrm7Url + '?v=8', label: 'v7·贴片眼优化' } }[params.get('model') ?? 'v7']; // 导出同名 v7 文件时递增 ?v= 参数击穿浏览器缓存（v8=眉毛纯黑染色）

const statusEl = document.getElementById('status');

// ---------- 渲染器 / 场景 / 相机 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // three-vrm 官方推荐，防 MToon 发灰
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 40);
// 直播间机位：正面半身（头胸构图）
camera.position.set(0, 1.35, 1.6);
camera.lookAt(0, 1.25, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.25, 0);
controls.enableDamping = true;
controls.minDistance = 0.6;
controls.maxDistance = 5;

// ---------- 灯光三件套（主光+补光+rim，番剧感） ----------
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.5); // 环境底光，防阴影区纯黑
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff2e8, 1.1); // 暖白主光
keyLight.position.set(1.2, 2.2, 1.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xbfd4ff, 0.35); // 冷色补光
fillLight.position.set(-1.5, 1.0, 0.8);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x8fb0ff, 0.8); // 背光轮廓
rimLight.position.set(-0.6, 1.8, -1.6);
scene.add(rimLight);

// 地面（接收阴影，校准空间感）
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 48),
  new THREE.MeshStandardMaterial({ color: 0x24243e, roughness: 0.9 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Stats 性能面板（验收 6） ----------
const stats = new Stats();
document.body.appendChild(stats.dom);
stats.dom.style.position = 'fixed';
stats.dom.style.right = '12px';
stats.dom.style.top = '12px';
stats.dom.style.left = 'auto';

// ---------- VRM 加载 ----------
let vrm = null;
let eyeRig = null;
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

loader.load(
  MODEL.url,
  (gltf) => {
    vrm = gltf.userData.vrm;
    scene.add(vrm.scene);

    // 阴影 + 剔除自阴影面（three-vrm 官方推荐）
    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
      }
    });
    // 眼部件关投影：眼球嵌在眼窝里，会被头部投影罩住（PBR 无环境光时纯黑=黑墨镜根因）
    for (const base of ['Eyeball', 'Iris', 'Pupil', 'Highlight', 'EyeSocketBack']) {
      for (const side of ['L', 'R']) {
        const o = vrm.scene.getObjectByName(`${base}_${side}`);
        if (o) {
          o.castShadow = false;
          o.receiveShadow = false;
        }
      }
    }
    // 眉毛压刘海画法（BUG-086）：眉毛条静息高度本就在刘海后方，表情 +16mm 上移后整个没入
    // 刘海（平视 7/14 采样点被 Hair 先挡），院长复验"眉毛直接不见了"。动漫画法标准解（MyGO/GBC
    // 式眉上发）：眉毛最后画且不测深度，盖过刘海/眼睑——BUG-085 的"眼皮覆盖截断"也同根根治。
    // 白块雾状带已由贴图 alpha 逐列裁剪移除，此处不会复活 BUG-083。
    vrm.scene.traverse((obj) => {
      if (obj.isMesh || obj.isSkinnedMesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        if (mats.some((m) => m && m.name.startsWith('N00_000_00_FaceBrow'))) {
          obj.renderOrder = 10;
          for (const m of mats) m.depthTest = false;
        }
      }
    });
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);

    // 3D 眼球枢轴（v6）：EyePivot_L/R 旋转=lookAt，眨眼后移规避悬浮盘
    eyeRig = setupEyeRig(vrm);

    // 视线目标绑定（验收 3）
    vrm.lookAt.target = lookAtTarget;

    // 直播间初始姿态：双手自然下垂（左臂负角度/右臂正角度=从 T-pose 收拢）
    const leftArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (leftArm) leftArm.rotation.z = -0.75;
    if (rightArm) rightArm.rotation.z = 0.75;

    statusEl.textContent = `✅ 诺诺上屏（${MODEL.label}${eyeRig ? ' · EyePivot接管' : ''}）`;
    console.log('[nono-poc] VRM loaded:', vrm.meta?.meta?.name ?? '(unnamed)');

    // 动作管线 PoC（Step 2，方案：07-自习室/诺诺动作管线PoC方案.md）——放在上屏状态之后，
    // 否则自动播放的"动作播放中"状态会被上屏文案覆盖
    setupAnimations();
  },
  (progress) => {
    if (progress.total > 0) {
      const pct = Math.round((progress.loaded / progress.total) * 100);
      statusEl.textContent = `加载中 ${pct}%`;
    }
  },
  (err) => {
    console.error(err);
    statusEl.textContent = '❌ 加载失败（看控制台）';
  },
);

// ---------- 表情切换（验收 4） ----------
let currentExpr = '';
document.querySelectorAll('#hud button[data-expr]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!vrm) return;
    currentExpr = btn.dataset.expr;
    document.querySelectorAll('#hud button[data-expr]').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
  });
});

// ---------- 视线目标（验收 3：lookAt） ----------
const lookAtTarget = new THREE.Object3D();
scene.add(lookAtTarget);

// ---------- 3D 眼球驱动（v6 扁平结构：绕 ballC 旋转各部件=lookAt，眨眼=整体后退） ----------
// 注：VRM 导出器会把嵌套在骨骼父级空物体下的子物体双重烘焙，故眼部件直挂 head 骨、
// 枢轴变换在运行时计算（v1 教训，登记 nono_build_eyes_v1.py）。
// v2 修复（院长实测：呼吸头动时眼球周期性穿出眼眶）：v1 的 restPos/ballC/nRest 是加载时的
// 固定世界坐标——呼吸/动作让头部移动后基准失效，眼部件被钉死在世界空间不跟头。现把全部
// 静息基准转存为父骨（原始 head 骨）局部坐标，每帧从父骨当前世界矩阵重投影——眼球与眼皮
// （头部蒙皮）刚性一体，头部怎么动眼球跟怎么动；眨眼眼皮变化+眼球沿法向后退联动不变。
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _v5 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();

function setupEyeRig(v) {
  if (!v.scene.getObjectByName('Iris_L')) return null;
  v.scene.updateMatrixWorld(true);
  const rig = { sides: {} };
  for (const side of ['L', 'R']) {
    const parts = [];
    for (const base of ['Eyeball', 'Iris', 'Pupil', 'Highlight']) {
      const o = v.scene.getObjectByName(`${base}_${side}`);
      if (!o) return null;
      parts.push({
        obj: o,
        restPos: o.getWorldPosition(new THREE.Vector3()),
        restQuat: o.getWorldQuaternion(new THREE.Quaternion()),
        restScale: o.scale.clone(),
      });
    }
    const parent = parts[0].obj.parent; // 眼部件直挂的原始 head 骨（非 normalized 骨）
    parent.updateWorldMatrix(true, false);
    const parentQInv0 = parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const p of parts) {
      p.restPosLocal = parent.worldToLocal(p.restPos.clone());
      p.restQuatLocal = parentQInv0.clone().multiply(p.restQuat);
    }
    const iris = parts.find((x) => x.obj.name.startsWith('Iris'));
    const nRest = new THREE.Vector3(0, 0, 1).applyQuaternion(iris.restQuat).normalize();
    rig.sides[side] = {
      parts,
      parent,
      ballCLocal: parent.worldToLocal(parts[0].restPos.clone()),
      nRestLocal: nRest.applyQuaternion(parentQInv0),
    };
  }
  return rig;
}

function driveEyes(rig, blinkVal) {
  if (!rig) return;
  for (const key of ['L', 'R']) {
    const e = rig.sides[key];
    const parent = e.parent;
    parent.updateWorldMatrix(true, false);
    const parentQInv = parent.getWorldQuaternion(_q1).invert();
    const parentQ = parent.getWorldQuaternion(_q2);
    const parentPos = _v3.setFromMatrixPosition(parent.matrixWorld);
    // 静息基准从父骨局部系重投影到当前世界系（跟随头部移动与俯仰）
    const eyePos = _v0.copy(e.ballCLocal).applyMatrix4(parent.matrixWorld);
    const nRest = _v5.copy(e.nRestLocal).transformDirection(parent.matrixWorld);
    // 视线方向 → 旋转增量（绕眼球中心）
    const dir = _v1.copy(lookAtTarget.position).sub(eyePos).normalize();
    // 限位：人眼可达 ~±15°，超出即穿帮（翻白眼/露底）
    if (nRest.angleTo(dir) > 0.26) {
      const axis = _v4.copy(nRest).cross(dir).normalize();
      if (axis.lengthSq() < 1e-6) axis.set(0, 1, 0);
      dir.copy(nRest).applyAxisAngle(axis, 0.26);
    }
    const qDelta = _q0.setFromUnitVectors(nRest, dir);
    const recess = nRest.clone().multiplyScalar(-blinkVal * 0.005);
    for (const part of e.parts) {
      const restWorld = part.restPosLocal.clone().applyMatrix4(parent.matrixWorld);
      // world = ballC + qΔ*(rest-ballC) + recess
      const worldPos = restWorld.sub(eyePos).applyQuaternion(qDelta).add(eyePos).add(recess);
      part.obj.position.copy(worldPos.sub(parentPos).applyQuaternion(parentQInv));
      const restQuatWorld = _q3.copy(parentQ).multiply(part.restQuatLocal);
      part.obj.quaternion.copy(parentQInv).multiply(qDelta).multiply(restQuatWorld);
      const sc = Math.max(0.12, 1 - blinkVal * 0.88);
      part.obj.scale.copy(part.restScale).multiplyScalar(sc);
    }
  }
}

// ---------- 主循环（验收 2/3/5 在这里驱动） ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  stats.begin();
  const delta = clock.getDelta();

  if (vrm) {
    // 验收 3：视线跟随鼠标（移动目标点，lookAt 自动追踪）
    const px = (pointer.x + 1) / 2;
    const py = (pointer.y + 1) / 2; // 鼠标屏幕顶=1 → 目标 y 高=抬头（修复上下反转）
    lookAtTarget.position.set(px * 0.9 - 0.45, 1.45 + py * 0.35, 0.8); // 默认平视：目标基线=眼高 1.45（原 1.25 会让眼球永远朝下=翻白眼根因）

    // 验收 4：表情权重（瞬时切换，无过渡——PoC 只验证通路）
    const em = vrm.expressionManager;
    if (em) {
      for (const name of ['happy', 'relaxed', 'sad', 'angry']) {
        em.setValue(name, currentExpr === name ? 1.0 : 0.0);
      }
    }

    // 验收 2：呼吸（胸口微起伏，4s 周期；?breath=0 禁用；动作播放中强制 0=呼吸让位，方案验收 5）
    const breath = animPlaying || params.get('breath') === '0' ? 0 : Math.sin(clock.elapsedTime * (Math.PI * 2 / 4)) * 0.008;
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    if (chest) chest.rotation.x = breath;

    // 验收 2：眨眼（每 ~3.6s 一次，三角波快闭快开 ~0.24s；?blink=1 强制闭眼调试）
    const t = clock.elapsedTime % 3.6;
    let blink = t < 0.24 ? (t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.12)) : 0;
    if (currentExpr === 'happy' || currentExpr === 'relaxed') blink = 0; // 闭眼系表情不叠眨眼（院长验收反馈）
    if (params.get('blink') === '1') blink = 1.0;
    if (vrm.expressionManager) vrm.expressionManager.setValue('blink', blink);

    // 动作 mixer 先于 vrm.update：骨骼动画 → vrm.update 传播到原始骨+SpringBone/lookAt 模拟
    if (animMixer && animPlaying) animMixer.update(delta);
    vrm.update(delta);
    driveEyes(eyeRig, blink);
  }

  controls.update();
  renderer.render(scene, camera);
  stats.end();
});

// ---------- 指针追踪（lookAt 用） ----------
const pointer = new THREE.Vector2(0, 0);
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ---------- 模型切换（v6 默认 / v5 对照） ----------
document.querySelectorAll('#hud button[data-model]').forEach((btn) => {
  btn.classList.toggle('on', (params.get('model') ?? 'v6') === btn.dataset.model);
  btn.addEventListener('click', () => {
    const sp = new URLSearchParams(location.search);
    sp.set('model', btn.dataset.model); // 保留 anim/breath/blink 等其余参数
    location.search = '?' + sp.toString();
  });
});

// ---------- 动作管线 PoC（Step 2，方案：07-自习室/诺诺动作管线PoC方案.md） ----------
// ?anim=builtin    内置"点头"测试 clip（不依赖 Mixamo 资产，验证 mixer 生命周期/呼吸让位/表情共存）
// ?anim=<url,...>  逗号分隔 Mixamo FBX 地址（运行时重定向），文件放 nono-poc/public/anims/（不入库）
// ?anim=stop       只显示"停动作"按钮，不加载任何动作；不带参数=旧行为不变
const animParam = params.get('anim');
let animMixer = null;
let animPlaying = false;

function stopAnimation() {
  if (animMixer) animMixer.stopAllAction();
  animPlaying = false;
  if (vrm) {
    vrm.humanoid.resetNormalizedPose?.(); // 复位归一化静息（mixer 停后骨骼停在最后帧）
    const l = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const r = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (l) l.rotation.set(0, 0, -0.75); // 恢复直播间静息臂姿（收拢下垂）
    if (r) r.rotation.set(0, 0, 0.75);
  }
  document.querySelectorAll('#animHud button').forEach((b) => b.classList.toggle('on', b.dataset.anim === 'none'));
  statusEl.textContent = '⏹ 动作停止，呼吸恢复';
}

function playClip(name, clip) {
  if (!animMixer) animMixer = new THREE.AnimationMixer(vrm.scene);
  animMixer.stopAllAction(); // 切换防残姿：先停旧轨再播新轨
  animMixer.clipAction(clip).reset().play();
  animPlaying = true;
  document.querySelectorAll('#animHud button').forEach((b) => b.classList.toggle('on', b.dataset.anim === name));
  statusEl.textContent = `✅ 动作播放中：${name}`;
}

// 内置"点头"测试 clip：只动 head（视觉明确、不碰手臂静息），验证管线通路
function buildBuiltinNodClip() {
  const bone = vrm.humanoid.getNormalizedBoneNode('head');
  const times = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2];
  const angles = [0, 0.22, 0.02, 0.22, 0.02, 0.22, 0.02, 0, 0]; // 低头回正×3（+x=低头）
  const rest = bone.quaternion.clone();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const values = [];
  for (const a of angles) {
    e.set(a, 0, 0);
    q.setFromEuler(e).premultiply(rest);
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.AnimationClip('builtin_nod', 3.2,
    [new THREE.QuaternionKeyframeTrack(bone.name + '.quaternion', times, values)]);
}

function setupAnimations() {
  const hud = document.getElementById('animHud');
  const clipCache = new Map(); // name -> AnimationClip
  let played = false;
  const tryPlay = (name, clip) => {
    clipCache.set(name, clip);
    if (played) return;
    played = true;
    playClip(name, clip);
  };
  const addBtn = (name, label) => {
    const b = document.createElement('button');
    b.dataset.anim = name;
    b.textContent = label;
    b.addEventListener('click', () => {
      if (name === 'none') { stopAnimation(); return; }
      const clip = clipCache.get(name);
      if (clip) playClip(name, clip);
    });
    hud.appendChild(b);
  };
  addBtn('none', '停动作');
  if (!animParam || animParam === 'stop') return;

  animParam.split(',').forEach((item) => {
    if (item === 'builtin') {
      addBtn('builtin', '点头·内置');
      tryPlay('builtin', buildBuiltinNodClip());
    } else {
      const url = item;
      const label = decodeURIComponent((url.split('/').pop() || 'FBX').replace(/\.(fbx|glb)$/i, ''));
      addBtn(url, label);
      loadMixamoAnimation(url, vrm)
        .then((clip) => tryPlay(url, clip))
        .catch((err) => {
          console.error('[anim]', err);
          statusEl.textContent = '❌ 动作加载失败（看控制台）';
        });
    }
  });
}

// ---------- 调试钩子（Playwright/控制台验收用） ----------
window.__poc = {
  get vrm() { return vrm; },
  get eyeRig() { return eyeRig; },
  camera,
  controls,
  scene,
  lookAtTarget,
  THREE,
  renderer, // 调试用：窗格被遮挡 rAF 节流时可手动 render 取证
};

// ---------- 自适应 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
