// 诺诺渲染管线 PoC · R-058
// 方案：prd/01-需求文档/07-自习室/诺诺Web渲染管线PoC方案.md
// 验收：1 上屏 / 2 眨眼呼吸 / 3 lookAt / 4 表情切换 / 5 SpringBone / 6 60fps / 7 沉淀
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { loadMixamoAnimation } from './mixamoAnimation.js';
// 小脑 Phase A（施工图：prd/01-需求文档/07-自习室/诺诺小脑架构设计.md）
import { PoseDriver } from './poseDriver.js';
import { RecipeExecutor } from './recipeExecutor.js';
import { computeHeartbeat } from './heartbeat.js';
import { applyHandPose, handPoseBoneNames } from './handPose.js';
import { buildRoom } from './room.js';
import Stats from 'three/addons/libs/stats.module.js';
// 模型原地引用（不复制进 PoC）：Vite assetsInclude+?url 生成 /@fs/ 资源地址
// ?model=v5 可对照旧贴片眼版；默认 v6（3D 眼球总成）
import vrm5Url from '../../../prd/01-需求文档/05-美术设计/诺诺/模型/nonono_v5.vrm?url';
import vrm7Url from '../../../prd/01-需求文档/05-美术设计/诺诺/模型/nonono_v7_vroid_eye.vrm?url';
import vrm6Url from '../../../prd/01-需求文档/05-美术设计/诺诺/模型/nonono_v6_eyeball_v1.vrm?url';

const params = new URLSearchParams(location.search);
const MODEL = { v5: { url: vrm5Url, label: 'v5·原生对照' }, v6: { url: vrm6Url, label: 'v6·3D眼球' }, v7: { url: vrm7Url + '?v=14', label: 'v7·贴片眼优化' } }[params.get('model') ?? 'v7']; // 导出同名 v7 文件时递增 ?v= 参数击穿浏览器缓存（v9=虹膜round1，v10=round2 Krita 轮，v11=远距可读性提亮+开心表情收敛·均待院长定版）

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
// 开发调试机位：正面半身（头胸构图）——产品直播间机位=全景全身出境（院长 2026-10-04 裁决，见 诺诺动作库规划.md）
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

// ---------- 诺诺房间白盒（场景设计 v1.1：?room=1 开启，坐标=场景设计/诺诺房间场景设计方案.md §三） ----------
const ROOM_MODE = params.get('room') === '1';
let roomApi = null;
if (ROOM_MODE) {
  ground.visible = false;
  roomApi = buildRoom(scene, { posterUrl: 'room/poster_mygo.jpg' });
  // 全景机位：南墙外上空朝北看（一点透视=上短下长梯形，院长 2026-10-04 裁决语义）
  camera.fov = 55;
  camera.updateProjectionMatrix();
  camera.position.set(2.25, 1.62, 2.55);
  controls.target.set(2.25, 0.95, -2.9);
  controls.maxDistance = 12;
  // 灯光调和：房间档案灯光为主，三件套降为补光
  hemiLight.intensity = 0.25;
  keyLight.intensity = 0.4;
  fillLight.intensity = 0.22;
  rimLight.intensity = 0.35;
  // 光效档案：?time=时相名 / ?hours=0~24 连续小时（v4）/ ?weather / ?season（默认正午·晴·春）；开关=墙上按钮点击或控制台 API
  const t0 = params.get('time'), h0 = params.get('hours'), w0 = params.get('weather'), se0 = params.get('season');
  if (t0) roomApi.setTime(t0, { instant: true });
  if (h0) roomApi.setTimeHours(parseFloat(h0), { instant: true });
  if (w0) roomApi.setWeather(w0, { instant: true });
  if (se0) roomApi.setSeason(se0, { instant: true });
}
// 房间开关点击（墙上按钮：灯/帘）
if (ROOM_MODE) {
  const raycaster = new THREE.Raycaster();
  const pv = new THREE.Vector2();
  window.addEventListener('pointerdown', (e) => {
    if (!roomApi) return;
    pv.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pv, camera);
    const hits = raycaster.intersectObjects(roomApi.switches, false);
    if (!hits.length) return;
    const [lampOn, curOpen] = hits[0].object === roomApi.switches[0]
      ? [roomApi.toggleLamp(), roomApi.state.curtainOpen]
      : [roomApi.state.lampOn, roomApi.toggleCurtain()];
    statusEl.textContent = `🎚 墙上开关：灯=${lampOn ? '开' : '关'} 帘=${curOpen ? '开' : '合'}`;
    setupRoomHud();
  });
}

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
let poseDriver = null;      // 基元层：骨骼补间引擎
let recipeExecutor = null;  // 配方层：配方执行/打断/安全点
let sitState = null;        // 当前坐姿配方 id（'sit_chair'/'sit_bed'）——交互锚点编排用
let sitAnchorKey = null;    // 坐在哪个锚点上（起立离位滑步取该锚点 standExit，避免站进家具里）
let walkSeq = 0;            // 锚点任务序号（新点击作废旧异步链，防双击竞态）
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

// 统一播放入口：维护坐姿状态（配方 HUD / 交互锚点 / ?sit=1 三路共用）
function playRecipe(rc) {
  if (!recipeExecutor) return { ok: false, msg: '引擎未就绪' };
  walkSettle = null; // 配方接管：取消步态收势过渡（骨架写入互斥）
  const ret = recipeExecutor.play(rc);
  if (ret.ok) {
    if (typeof rc?.id === 'string' && rc.id.startsWith('sit_')) sitState = rc.id;
    else if (rc?.id === 'stand_up') { sitState = null; sitAnchorKey = null; }
  }
  return ret;
}
const fetchRecipe = (name) => fetch(`/recipes/${name}.json?t=${Date.now()}`).then((r) => r.json());

// 交互锚点编排（BUG-095，院长："移动不要平移，搞一点正常的行走动作"+"切换交互选项身体穿过家具"）：
//   坐姿 → 先起立+离位滑步（standExit）→ 寻路行走（路点图绕家具 + walk_loop 步态循环）→ 到位收势：
//   坐姿锚点=短滑上座面+播落座配方；站立锚点=转向锚点朝向。Phase B 正式步态 clip 只需替换 walk_loop 的播放源
function goToAnchor(key) {
  if (!roomApi || animPlaying || !recipeExecutor) return Promise.resolve(false);
  const a = roomApi.anchors[key];
  if (!a) return Promise.resolve(false);
  const seq = ++walkSeq;
  const whenRc = a.recipe ? fetchRecipe(a.recipe).catch(() => null) : Promise.resolve(null);
  return whenRc.then((rc) => {
    if (seq !== walkSeq || !roomApi) return false;
    if (rc && rc.id === sitState && sitAnchorKey === key) return true; // 已坐在目标位
    const depart = () => {
      if (seq !== walkSeq) return;
      if (walkClip && walkClipStatus === 'ready') {
        playWalkClip(); // mixer 路径：循环播放 + 淡入（骨骼由 clip 独占）
        walkSource = 'clip';
      } else {
        fetchRecipe('walk_loop').then(playRecipe).catch(() => {}); // 回退：配方步态（姿态层不受影响）
        walkSource = 'recipe';
      }
    };
    const arrive = () => {
      if (seq !== walkSeq) return;
      if (walkSource === 'clip') settleWalkToRest(); // 收势：slerp 回静息（0.25s），防定格跳变
      else recipeExecutor.stop(); // 收势：步态骨 150ms 滑变回中立
      walkSource = null;
      if (rc) {
        // 落座短滑：下车站点→座面（≤0.5m）；椅子组带抬弧=脚部跨过 8cm 底盘边缘（不抬=脚穿盘）
        roomApi.moveTo(a.pos, a.yawDeg, { dur: 0.5, arc: a.group === 'chair' ? 0.10 : 0 });
        playRecipe(rc);
        sitAnchorKey = key;
      } else {
        roomApi.moveTo(a.pos, a.yawDeg, { dur: 0.35 }); // 原地转向锚点朝向
      }
    };
    if (sitState) {
      // 先起立+离位滑步（从座面滑到 standExit 站点，避免起立后站进椅盘/床箱）
      // 注意：必须先捕获当前锚点——playRecipe(stand_up) 会把 sitAnchorKey 清空（BUG-095 排障发现：读序反了→离位滑步从未执行）
      fetchRecipe('stand_up').then((su) => {
        if (seq !== walkSeq) return;
        const cur = roomApi.anchors[sitAnchorKey];
        playRecipe(su);
        const exit = cur?.standExit ?? cur?.pos;
        if (exit) roomApi.moveTo(exit, null, { dur: 0.55, arc: cur?.group === 'chair' ? 0.09 : 0 });
      }).catch(() => {});
      return sleepMs(950).then(() => { if (seq !== walkSeq) return false; roomApi.walkTo(key, { onDepart: depart, onArrive: arrive }); return true; });
    }
    roomApi.walkTo(key, { onDepart: depart, onArrive: arrive });
    return true;
  });
}
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
loader.register((parser) => new VRMAnimationLoaderPlugin(parser)); // .vrma 步态 clip

// ---------- 步态 clip（.vrma · Blender 授权 → 替换 walk_loop 播放源，walkTo 接口不变） ----------
// 路线（R-058 黑机 2026-10-08）：Blender 手调步态 → export_scene.vrma（VRMC_vrm_animation 1.0）
//   → createVRMAnimationClip 生成归一化骨轨道 → mixer 播放（走同理 Mixamo 路径，独占骨骼）
// 加载失败自动回退配方步态（walk_loop.json），两种源对外都只是 walkTo 的 onDepart/onArrive 回调
const WALK_CLIP_URL = params.get('walkclip') ?? 'anims/walk_loop.vrma';
let walkClip = null;
let walkClipStatus = 'idle'; // idle | loading | ready | failed
let walkSource = null;       // 本轮行走实际使用的源：'clip' | 'recipe'
let walkClipNodes = [];      // 步态 clip 覆盖的归一化骨节点（收势过渡用）
let walkSettle = null;       // 收势过渡：{ items:[{node,from,to,fromP,toP}], t, dur }

function loadWalkClip() {
  if (walkClipStatus !== 'idle') return;
  walkClipStatus = 'loading';
  loader.load(
    WALK_CLIP_URL,
    (gltf) => {
      const va = gltf.userData.vrmAnimations?.[0];
      if (!va) {
        walkClipStatus = 'failed';
        console.warn('[walk] .vrma 里没有 vrmAnimations（回退配方步态）');
        return;
      }
      walkClip = createVRMAnimationClip(va, vrm);
      const names = new Set(walkClip.tracks.map((t) => t.name.split('.')[0]));
      walkClipNodes = [...names].map((n) => vrm.scene.getObjectByName(n)).filter(Boolean);
      walkClipStatus = 'ready';
      console.log(`[walk] 步态 clip 就绪：${WALK_CLIP_URL} · ${walkClip.duration.toFixed(3)}s · ${walkClip.tracks.length} tracks · ${walkClipNodes.length} bones`);
    },
    undefined,
    (err) => {
      walkClipStatus = 'failed';
      console.warn('[walk] .vrma 加载失败（回退配方步态）', err);
    },
  );
}

// 步态起步：mixer 循环播放 + 权重淡入（从当前静息姿态滑入，避免"立正→触地"硬切跳变）
const WALK_FADE_IN = 0.18;
function playWalkClip() {
  if (!walkClip || !vrm) return false;
  if (!animMixer) animMixer = new THREE.AnimationMixer(vrm.scene);
  walkSettle = null;
  animMixer.stopAllAction();
  const action = animMixer.clipAction(walkClip);
  action.reset().play();
  action.fadeIn(WALK_FADE_IN);
  animPlaying = true;
  recipeExecutor?.stop(); // mixer 独占骨骼：配方退场（同 Mixamo 路径）
  document.querySelectorAll('#animHud button').forEach((b) => b.classList.toggle('on', false));
  statusEl.textContent = `🚶 步态 clip 播放中（${(walkClip.duration).toFixed(2)}s 循环）`;
  return true;
}

// 步态收势：mixer 停用瞬间从当前帧姿态 slerp 回静息（0.25s），避免"定格帧→立正"跳变
// 做法：先捕获当前骨姿态 → stopAnimation 复位并读取目标姿态 → 用捕获值覆盖回去 → 渲染循环逐帧 slerp
function settleWalkToRest(dur = 0.25) {
  if (!vrm || walkClipNodes.length === 0) { stopAnimation({ quiet: true }); return; }
  const items = walkClipNodes.map((node) => ({
    node,
    from: node.quaternion.clone(),
    fromP: node.position.clone(),
  }));
  stopAnimation({ quiet: true });
  for (const it of items) {
    it.to = it.node.quaternion.clone();
    it.toP = it.node.position.clone();
    it.node.quaternion.copy(it.from);
    it.node.position.copy(it.fromP);
  }
  walkSettle = { items, t: 0, dur };
}

loader.load(
  MODEL.url,
  (gltf) => {
    vrm = gltf.userData.vrm;
    scene.add(vrm.scene);

    // 阴影 + 剔除自阴影面（three-vrm 官方推荐）
    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        // 蒙皮网格视锥剔除用绑定姿态包围球（BUG-091：坐姿/大位移后头部偏离绑定位 0.4m+，
        // 近距窄视锥下眼贴片等小包围球出锥=整片消失）——角色直播间常驻画面内，直接关剔除
        obj.frustumCulled = false;
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

    // 直播间初始姿态：双手自然垂落体侧（BUG-096：v1 z±0.75=从 T-pose 只压 43°→手臂斜 45° 非自然体态；
    // ±1.40=离垂直 10° 自然间隙防穿体；手臂配方 z 偏移已按净角守恒同步补偿）
    const leftArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (leftArm) leftArm.rotation.z = -1.40;
    if (rightArm) rightArm.rotation.z = 1.40;

    // 自然手型（院长复验②"手掌不要一直绷住"）：手指放松微屈，作为静息姿态的一部分；
    // 必须先写入再建引擎——PoseDriver 在首次注册时捕获当前值为 rest（与静息臂姿同套路）
    const handBones = applyHandPose(vrm);
    console.log(`[hand] 自然手型已应用：${handBones} 骨`);

    // 小脑（Phase A）：静息臂姿/手型定稿后创建引擎（rest 捕获含双臂 z±1.40=中立姿势 + 手型）
    poseDriver = new PoseDriver(vrm);
    poseDriver.register(handPoseBoneNames()); // 手指骨纳入常驻静息（每帧保持 / reset 后可恢复）
    recipeExecutor = new RecipeExecutor(poseDriver);
    recipeExecutor.onState((state, label) => {
      document.querySelectorAll('#recipeHud button[data-recipe]').forEach((b) => {
        b.classList.toggle('on', state === 'playing' && b.dataset.recipe === recipeExecutor.current?.recipe?.id);
      });
      if (state === 'playing') statusEl.textContent = `🎬 配方播放中：${label}`;
      else if (state === 'stopping') statusEl.textContent = '↩ 回归中立…';
      else if (state === 'idle') statusEl.textContent = '🧠 待命（idle）';
    });
    setupRecipeHud();

    // 步态 clip 预载（.vrma；加载失败自动回退配方步态，不阻塞上屏）
    loadWalkClip();

    // 房间模式：诺诺入房——默认站位=中央活动区锚点（不与家具重叠）；?sit=1 走完整编排（行走去椅子落座）
    if (ROOM_MODE) {
      roomApi.setModel(vrm.scene);
      roomApi.gotoAnchor('room.center');
      if (params.get('sit') === '1') goToAnchor('chair.sit');
      setupRoomHud();
    }

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

    // 小脑 Phase A（施工图 §5）：心跳层 → 配方执行 → 补间 → apply(静息+偏移) → 心跳叠加
    // Mixamo mixer 播放期间整段让位（mixer 独占骨骼，原方案验收 5 语义保留）
    const hb = computeHeartbeat(clock.elapsedTime, {
      breathEnabled: !animPlaying && params.get('breath') !== '0',
      blinkSuppressed: currentExpr === 'happy' || currentExpr === 'relaxed', // 闭眼系表情不叠眨眼（院长验收反馈）
      forceBlink: params.get('blink') === '1',
    });
    if (vrm.expressionManager) vrm.expressionManager.setValue('blink', hb.blink);

    if (!animPlaying) {
      poseDriver?.update(delta);
      recipeExecutor?.update();
      poseDriver?.apply();
      // 心跳叠加（additive，配方播放期间呼吸继续=诺诺没有静止帧）
      const chest = vrm.humanoid.getNormalizedBoneNode('chest');
      if (chest) chest.rotation.x += hb.breath;
      const hips = vrm.humanoid.getNormalizedBoneNode('hips');
      if (hips) { hips.rotation.x += hb.swayX; hips.rotation.z += hb.swayZ; }
    }

    // 房间光效档案插值（灯位恒定，只动强度/色温/帘）——mixer 播放（步态 clip）期间也必须继续，
    // 否则走路几十秒里昼夜/帘灯全部冻结（2026-10-08 步态轮：原被 !animPlaying 一并挡掉）
    roomApi?.update(delta, scene.background);
    if (roomApi) {
      // 棚灯三件套随档案 studio 系数缩放（院长问题①"变化不明显"主因之一：v3 恒定补光把昼夜差稀释掉了）
      const st = roomApi.state.cur.studio;
      hemiLight.intensity = 0.25 * st;
      keyLight.intensity = 0.4 * st;
      fillLight.intensity = 0.22 * st;
      rimLight.intensity = 0.35 * st;
    }

    // 步态收势过渡（覆盖式写入：在配方/心跳之后、mixer 之前——0.25s slerp 回静息）
    if (walkSettle) {
      walkSettle.t += delta;
      const p = Math.min(1, walkSettle.t / walkSettle.dur);
      const e = p * p * (3 - 2 * p);
      for (const it of walkSettle.items) {
        it.node.quaternion.slerpQuaternions(it.from, it.to, e);
        it.node.position.lerpVectors(it.fromP, it.toP, e);
      }
      if (p >= 1) walkSettle = null;
    }

    // 动作 mixer 先于 vrm.update：骨骼动画 → vrm.update 传播到原始骨+SpringBone/lookAt 模拟
    if (animMixer && animPlaying) animMixer.update(delta);
    vrm.update(delta);
    driveEyes(eyeRig, hb.blink);
  }

  controls.update();
  updateRoomClock();
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

function stopAnimation({ quiet = false } = {}) {
  if (animMixer) animMixer.stopAllAction();
  animPlaying = false;
  if (vrm) {
    vrm.humanoid.resetNormalizedPose?.(); // 复位归一化静息（mixer 停后骨骼停在最后帧）
    const l = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const r = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (l) l.rotation.set(0, 0, -1.40); // 恢复自然垂落静息臂姿（BUG-096 同步）
    if (r) r.rotation.set(0, 0, 1.40);
    applyHandPose(vrm); // 恢复自然手型（resetNormalizedPose 会把手指打回 T-pose 摊平手）
  }
  document.querySelectorAll('#animHud button').forEach((b) => b.classList.toggle('on', b.dataset.anim === 'none'));
  if (!quiet) statusEl.textContent = '⏹ 动作停止，呼吸恢复';
}

function playClip(name, clip, label = name) {
  if (!animMixer) animMixer = new THREE.AnimationMixer(vrm.scene);
  animMixer.stopAllAction(); // 切换防残姿：先停旧轨再播新轨
  animMixer.clipAction(clip).reset().play();
  animPlaying = true;
  recipeExecutor?.stop(); // mixer 即将独占骨骼：配方先退场（回归 tween 会被 mixer 覆盖，停止后 apply 接管）
  document.querySelectorAll('#animHud button').forEach((b) => b.classList.toggle('on', b.dataset.anim === name));
  statusEl.textContent = `✅ 动作播放中：${label}`;
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

// ---------- 小脑 HUD（Phase A 测试台：配方按钮 + JSON 免刷新即播） ----------
function setupRecipeHud() {
  const guard = () => {
    if (animPlaying) {
      statusEl.textContent = '⚠️ Mixamo 动作播放中，配方引擎已让位——先点"停动作"';
      return true;
    }
    return false;
  };
  document.querySelectorAll('#recipeHud button[data-recipe]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!vrm || !recipeExecutor || guard()) return;
      const name = btn.dataset.recipe;
      if (name === '__stop') { recipeExecutor.stop(); return; }
      // ?t= 击穿缓存：改 JSON 免刷新即生效（调参工作流）
      fetchRecipe(name)
        .then((recipe) => {
          const ret = playRecipe(recipe);
          if (!ret.ok) statusEl.textContent = `❌ 配方无效：${ret.msg}`;
        })
        .catch((err) => {
          console.error('[recipe]', err);
          statusEl.textContent = '❌ 配方加载失败（看控制台）';
        });
    });
  });
  document.getElementById('recipePlayJson').addEventListener('click', () => {
    if (!recipeExecutor || guard()) return;
    try {
      const recipe = JSON.parse(document.getElementById('recipeJson').value);
      const ret = playRecipe(recipe);
      if (!ret.ok) statusEl.textContent = `❌ 配方无效：${ret.msg}`;
    } catch (err) {
      console.error('[recipe]', err);
      statusEl.textContent = '❌ JSON 解析失败（看控制台）';
    }
  });
}

// ---------- 房间 HUD（时间/天气/季节 + 灯/帘，room 模式；遥控=宇树式人工代理，Phase C 接大脑） ----------
function setupRoomHud() {
  if (!roomApi) return;
  const mkRow = (spanId, keys, labels, cur, setFn) => {
    const span = document.getElementById(spanId);
    if (!span) return;
    span.innerHTML = '';
    for (const key of keys) {
      const b = document.createElement('button');
      b.textContent = labels[key]?.label ?? key;
      b.classList.toggle('on', key === cur);
      b.addEventListener('click', () => { setFn(key); syncRoomHud(); });
      span.appendChild(b);
    }
  };
  const syncRoomHud = () => {
    const s = roomApi.state;
    mkRow('timeHud', roomApi.profiles, roomApi.labels.time, s.time, (k) => roomApi.setTime(k));
    mkRow('weatherHud', roomApi.weathers, roomApi.labels.weather, s.weather, (k) => roomApi.setWeather(k));
    mkRow('seasonHud', roomApi.seasons, roomApi.labels.season, s.season, (k) => roomApi.setSeason(k));
    const lb = document.getElementById('roomLampBtn'), cb = document.getElementById('roomCurBtn');
    if (lb) lb.classList.toggle('on', s.lampOn);
    if (cb) cb.classList.toggle('on', !s.curtainOpen); // 帘合上=高亮
  };
  syncRoomHud();
  // 交互锚点行：行走编排入口（模块级 goToAnchor：起立离位→寻路行走→到位收势落座）
  const anchorSpan = document.getElementById('anchorHud');
  if (anchorSpan) {
    anchorSpan.innerHTML = '';
    for (const [key, a] of Object.entries(roomApi.anchors)) {
      const b = document.createElement('button');
      b.textContent = a.label;
      b.addEventListener('click', () => {
        if (animPlaying) { statusEl.textContent = '⚠️ Mixamo 动作播放中，先点"停动作"'; return; }
        goToAnchor(key);
      });
      anchorSpan.appendChild(b);
    }
  }
  document.getElementById('roomHud').style.display = 'block';
  const lb = document.getElementById('roomLampBtn'), cb = document.getElementById('roomCurBtn'), pb = document.getElementById('roomPlayBtn');
  if (lb) lb.addEventListener('click', () => { roomApi.toggleLamp(); syncRoomHud(); });
  if (cb) cb.addEventListener('click', () => { roomApi.toggleCurtain(); syncRoomHud(); });
  if (pb) pb.addEventListener('click', () => {
    const on = roomApi.toggleTimePlay();
    pb.classList.toggle('on', on);
    pb.textContent = on ? '⏸ 流动中' : '▶ 流动';
  });
}

// 时钟显示（rAF 每帧刷新；流动模式下跟着走）+ 高亮轻量同步（API setTime 不走 syncRoomHud， classes 每 10 帧对齐一次）
let hudSyncCounter = 0;
function updateRoomClock() {
  if (!roomApi) return;
  const el = document.getElementById('roomClock');
  if (el) {
    const h = roomApi.state.hours;
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    el.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  if (++hudSyncCounter % 10 === 0) {
    const s = roomApi.state;
    const mark = (spanId, keys, cur) => {
      const span = document.getElementById(spanId);
      if (span) [...span.children].forEach((b, i) => b.classList.toggle('on', keys[i] === cur));
    };
    mark('timeHud', roomApi.profiles, s.time);
    mark('weatherHud', roomApi.weathers, s.weather);
    mark('seasonHud', roomApi.seasons, s.season);
  }
}

// ---------- 坐姿白盒预览（?sit=1）----------
// v4：数值统一走 sit_chair.json（v2 运动学耦合版），滑步到位后播放——旧内联副本删除（双源易漂移）

// 穿模体检：采样末端骨骼世界坐标 → 房间碰撞盒检测（白盒版 gate④，调配方时看违例数）
function roomCheck() {
  if (!vrm || !roomApi) return null;
  scene.updateMatrixWorld(true);
  const V = new THREE.Vector3();
  const pts = {};
  for (const n of ['leftHand', 'rightHand', 'leftLowerArm', 'rightLowerArm', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot', 'leftToes', 'rightToes']) {
    const node = vrm.humanoid.getNormalizedBoneNode(n);
    if (node) {
      node.getWorldPosition(V);
      pts[n] = V.clone();
    }
  }
  return roomApi.checkCollisions(pts);
}

// ---------- 调试钩子（Playwright/控制台验收用） ----------
window.__poc = {
  get vrm() { return vrm; },
  get eyeRig() { return eyeRig; },
  get poseDriver() { return poseDriver; },
  get recipeExecutor() { return recipeExecutor; },
  camera,
  controls,
  scene,
  lookAtTarget,
  THREE,
  renderer, // 调试用：窗格被遮挡 rAF 节流时可手动 render 取证
  get room() { return roomApi; }, // 房间后台开关：room.toggleLamp()/toggleCurtain()/setTime('night')/gotoAnchor('chair.sit')/state
  roomCheck, // 穿模体检：末端骨骼 × 家具碰撞盒违例列表（白盒版 gate④）
  // 步态 clip 调试（2026-10-08 步态轮）：验收脚本采样用
  get walkClip() { return walkClip; },
  get walkInfo() { return { status: walkClipStatus, url: WALK_CLIP_URL, source: walkSource, duration: walkClip?.duration ?? null }; },
  get walkPlaying() { return walkSource === 'clip' && animPlaying; },
  playWalkClip() { return playWalkClip(); },
  stopWalk() { walkSettle = null; stopAnimation(); walkSource = null; },
  settleWalk: (dur) => settleWalkToRest(dur),
  goAnchor: (key) => goToAnchor(key), // 行走全流程编排（起立/寻路/落座）单一入口
  get animPlaying() { return animPlaying; },
  get mixer() { return animMixer; },
  boneWorld(name) { // 骨骼世界坐标（归一化骨；验收采样）
    const n = vrm?.humanoid.getNormalizedBoneNode(name);
    if (!n) return null;
    scene.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    n.getWorldPosition(v);
    return v;
  },
};

// ---------- 自适应 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
