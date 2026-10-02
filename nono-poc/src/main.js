// 诺诺渲染管线 PoC · R-058
// 方案：prd/01-需求文档/07-自习室/诺诺Web渲染管线PoC方案.md
// 验收：1 上屏 / 2 眨眼呼吸 / 3 lookAt / 4 表情切换 / 5 SpringBone / 6 60fps / 7 沉淀
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import Stats from 'three/addons/libs/stats.module.js';
// 模型原地引用（不复制进 PoC）：Vite assetsInclude+?url 生成 /@fs/ 资源地址
// ?model=v5 可对照旧贴片眼版；默认 v6（3D 眼球总成）
import vrm5Url from '../../prd/01-需求文档/05-美术设计/诺诺/nonono_v5.vrm?url';
import vrm6Url from '../../prd/01-需求文档/05-美术设计/诺诺/nonono_v6_eyeball_v1.vrm?url';

const params = new URLSearchParams(location.search);
const MODEL = params.get('model') === 'v5'
  ? { url: vrm5Url, label: 'v5·贴片眼对照' }
  : { url: vrm6Url, label: 'v6·3D眼球' };

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
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();

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
      });
    }
    const iris = parts.find((x) => x.obj.name.startsWith('Iris'));
    const nRest = new THREE.Vector3(0, 0, 1).applyQuaternion(iris.restQuat).normalize();
    rig.sides[side] = { parts, ballC: parts[0].restPos.clone(), nRest };
  }
  return rig;
}

function driveEyes(rig, blinkVal) {
  if (!rig) return;
  for (const key of ['L', 'R']) {
    const e = rig.sides[key];
    const parent = e.parts[0].obj.parent;
    parent.updateWorldMatrix(true, false);
    const parentQInv = parent.getWorldQuaternion(_q1).invert();
    const parentPos = _v3.setFromMatrixPosition(parent.matrixWorld);
    // 视线方向 → 旋转增量（绕眼球中心）
    const eyePos = _v0.copy(e.ballC);
    const dir = _v1.copy(lookAtTarget.position).sub(eyePos).normalize();
    // 限位：人眼可达 ~±15°，超出即穿帮（翻白眼/露底）
    if (e.nRest.angleTo(dir) > 0.26) {
      const axis = _v4.copy(e.nRest).cross(dir).normalize();
      if (axis.lengthSq() < 1e-6) axis.set(0, 1, 0);
      dir.copy(e.nRest).applyAxisAngle(axis, 0.26);
    }
    const qDelta = _q0.setFromUnitVectors(e.nRest, dir);
    const recess = _v2.copy(e.nRest).multiplyScalar(-blinkVal * 0.005);
    for (const part of e.parts) {
      // world = ballC + qΔ*(rest-ballC) + recess
      const worldPos = part.restPos.clone().sub(e.ballC).applyQuaternion(qDelta).add(e.ballC).add(recess);
      part.obj.position.copy(worldPos.sub(parentPos).applyQuaternion(parentQInv));
      part.obj.quaternion.copy(parentQInv).multiply(qDelta).multiply(part.restQuat);
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

    // 验收 2：呼吸（胸口微起伏，4s 周期）
    const breath = Math.sin(clock.elapsedTime * (Math.PI * 2 / 4)) * 0.008;
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    if (chest) chest.rotation.x = breath;

    // 验收 2：眨眼（每 ~3.6s 一次，三角波快闭快开 ~0.24s；?blink=1 强制闭眼调试）
    const t = clock.elapsedTime % 3.6;
    let blink = t < 0.24 ? (t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.12)) : 0;
    if (params.get('blink') === '1') blink = 1.0;
    if (vrm.expressionManager) vrm.expressionManager.setValue('blink', blink);

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
    location.search = `?model=${btn.dataset.model}`;
  });
});

// ---------- 调试钩子（Playwright/控制台验收用） ----------
window.__poc = {
  get vrm() { return vrm; },
  get eyeRig() { return eyeRig; },
  camera,
  controls,
  scene,
  lookAtTarget,
  THREE,
};

// ---------- 自适应 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
