// 诺诺渲染管线 PoC · R-058
// 方案：prd/01-需求文档/07-自习室/诺诺Web渲染管线PoC方案.md
// 验收：1 上屏 / 2 眨眼呼吸 / 3 lookAt / 4 表情切换 / 5 SpringBone / 6 60fps / 7 沉淀
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import Stats from 'three/addons/libs/stats.module.js';
// 模型原地引用（不复制进 PoC）：Vite assetsInclude+?url 生成 /@fs/ 资源地址
import vrmUrl from '../../prd/01-需求文档/05-美术设计/诺诺/nonono_v5.vrm?url';

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
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

loader.load(
  vrmUrl,
  (gltf) => {
    vrm = gltf.userData.vrm;
    scene.add(vrm.scene);

    // 阴影 + 剔除自阴影面（three-vrm 官方推荐）
    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
      }
    });
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);

    // 视线目标绑定（验收 3）
    vrm.lookAt.target = lookAtTarget;

    // 直播间初始姿态：双手自然下垂（左臂负角度/右臂正角度=从 T-pose 收拢）
    const leftArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (leftArm) leftArm.rotation.z = -0.75;
    if (rightArm) rightArm.rotation.z = 0.75;

    statusEl.textContent = '✅ 诺诺上屏';
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

// ---------- 主循环（验收 2/3/5 在这里驱动） ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  stats.begin();
  const delta = clock.getDelta();

  if (vrm) {
    // 验收 3：视线跟随鼠标（移动目标点，lookAt 自动追踪）
    const px = (pointer.x + 1) / 2;
    const py = (pointer.y + 1) / 2; // 鼠标屏幕顶=1 → 目标 y 高=抬头（修复上下反转）
    lookAtTarget.position.set(px * 1.2 - 0.6, 1.25 + py * 0.5, 0.8);

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

    // 验收 2：眨眼（每 ~3.6s 一次，闭 0.12s）
    const t = clock.elapsedTime % 3.6;
    const blink = t < 0.12 ? 1.0 : 0.0;
    const emBlink = vrm.expressionManager;
    if (emBlink) emBlink.setValue('blink', blink);

    vrm.update(delta);
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

// ---------- 自适应 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
