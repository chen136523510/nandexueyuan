// 诺诺小脑 · 自然手型层 v6 稳定版（R-058 2026-10-09 白机）
//
// ── 实现路线说明 ──
//   v5 曾尝试"手掌坐标系 + 世界轴旋转增量 + 距离判据自动定符号"，但 normalized 骨架在
//   PoseDriver 构造期的矩阵同步不可靠（palmBasis 读到未就绪姿态 → NaN 传入 hand 骨 rest），
//   已回退到 v1~v4 一路验证稳定的"骨局部轴直接写入"实现。
//   掌系语义保留在参数命名与注释中（蜷曲=向掌心、内收=拇指搭向食指、掌向=掌心朝大腿）。
//
// ── 参照基线（2026-10-09 院长八轮指令定版）──
//   **放松舒展手掌：顶多前两个指关节微曲**（MCP/PIP 微曲、DIP 几乎直），拇指自然微收体侧。
//   （历史基线：二次元参考集之 1、2=微微握拳+拇指横搭——握拳观感院长复验不通过，已弃）
//   掌心朝向身体内侧（垂手=朝大腿）。
//
// ── 轴与符号（2026-10-08 浏览器实测，T-pose 基准，v1 定版沿用）──
//   归一化手指骨 rest 局部旋转=单位四元数；局部 x=指轴（扭转）、局部 y=蜷曲轴
//   （左手 y+ 蜷向掌心；右手镜像 y−）、局部 z=张开/并拢轴（食指 z+ 朝中指）。
//   ⚠️ hand 骨局部 y≈掌法向轴（绕之掌向不变）；掌骨轴=局部 x——掌向翻转唯一入口（palmFlip），
//   ⚠️ 同轴叠加超 180° 即腕部蒙皮断裂（v4 教训：195°=院长所见"掌臂断裂"）。
//
// 调参入口：HAND_POSE 表（角度=度）。院长指导时直接报"某指某节再加/减几度"即可。

const DEG = Math.PI / 180;

// ── 掌系姿态参数（院长指导入口）──
export const HAND_POSE = {
  // 四指蜷曲（度）：MCP=掌指关节主值；PIP/DIP 按自然屈曲耦合比联动。
  //   2026-10-09 八轮院长指令：「放松舒展手掌，顶多是前两个指关节微曲」——
  //   MCP 20 微曲 / PIP≈22 微曲 / DIP≈6 几乎直（DIP 比压到 0.3）。
  fingerCurl: { MCP: 20, PIP_RATIO: 1.1, DIP_RATIO: 0.3 },
  // 食→小指梯度倍率（掌弓斜形：小指侧更蜷、食指略少）
  fingerScale: { index: 0.92, middle: 1.0, ring: 1.06, little: 1.12 },
  // 拇指：放松态自然微收体侧（inner=绕蜷曲轴向食指收的内收量；curl=向掌心屈）
  thumb: { inner: 20, curl: 10 },
  // 指间并拢（z 轴；食指朝中指为 +，小指朝中指为 −）
  HAND_FAN: { index: 3, middle: 0, ring: -2, little: -4 },
  // 掌向翻转（度，hand 骨绕局部 x=掌骨轴。right 180°=双掌心翻朝大腿内侧；
  //   ⚠️ 唯一掌向入口，同轴勿叠加——超 180° 腕裂）
  palmFlip: { left: 0, right: 0 }, // ⚠️ 已撤：绕掌骨轴翻转 180°=手指从朝下反折成朝上（垂手位错误，院长截图实证）；掌向改由 forearmSupinate（绕 lowerArm 局部 x=前臂长轴，生理旋前旋后）承担
};

// 各手指三节角度（由 fingerCurl 耦合比 + 梯度展开，改 fingerCurl 即整体调松紧）
function fingerAngles() {
  const { MCP, PIP_RATIO, DIP_RATIO } = HAND_POSE.fingerCurl;
  const out = {};
  for (const [finger, k] of Object.entries(HAND_POSE.fingerScale)) {
    out[finger] = { Proximal: MCP * k, Intermediate: MCP * PIP_RATIO * k, Distal: MCP * DIP_RATIO * k };
  }
  return out;
}

const FINGERS = ['index', 'middle', 'ring', 'little'];
const JOINTS = ['Proximal', 'Intermediate', 'Distal'];

/** 手型层覆盖的全部指骨名（供 PoseDriver 注册常驻静息） */
export function handPoseBoneNames() {
  const names = [];
  for (const side of ['left', 'right']) {
    for (const f of FINGERS) for (const j of JOINTS) names.push(`${side}${f[0].toUpperCase()}${f.slice(1)}${j}`);
    for (const j of ['Metacarpal', 'Proximal', 'Distal']) names.push(`${side}Thumb${j}`);
  }
  return names;
}

// 四元数哈密顿积 a∘b（分量序 [x,y,z,w]）
function qMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
const half = (rad) => rad / 2;

/**
 * 应用自然手型（写入归一化骨局部旋转；须在 PoseDriver 构造前调用——rest 捕获即手型，
 * apply() 每帧保持；reset 后经 register 的常驻骨自动恢复）。
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {{scale?: number}} [opts] scale=整体放松度（0=T-pose 摊平，1=参数表定版）
 * @returns {number} 写入的骨数
 */
export function applyHandPose(vrm, { scale = 1 } = {}) {
  const angles = fingerAngles();
  let applied = 0;
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? 1 : -1; // 蜷曲/并拢：左正右负（镜像实测）

    // 四指：绕局部 y 蜷曲（向掌心）+ 绕局部 z 并拢
    for (const finger of FINGERS) {
      const fname = finger[0].toUpperCase() + finger.slice(1);
      const fan = HAND_POSE.HAND_FAN[finger] * scale * sign * DEG;
      for (const joint of JOINTS) {
        const bone = vrm.humanoid.getNormalizedBoneNode(`${side}${fname}${joint}`);
        if (!bone) continue;
        const pitch = angles[finger][joint] * scale * sign * DEG;
        const qy = [0, Math.sin(half(pitch)), 0, Math.cos(half(pitch))];
        const qz = [0, 0, Math.sin(half(fan)), Math.cos(half(fan))];
        const q = qMul(qy, qz);
        bone.quaternion.set(q[0], q[1], q[2], q[3]);
        applied++;
      }
    }

    // 拇指：绕局部 y 内收（搭向食指）+ 各节微屈 + 掌面转向
    const thumbAngles = { Metacarpal: HAND_POSE.thumb.inner * 0.4, Proximal: HAND_POSE.thumb.inner, Distal: HAND_POSE.thumb.curl };
    for (const [joint, deg] of Object.entries(thumbAngles)) {
      const bone = vrm.humanoid.getNormalizedBoneNode(`${side}Thumb${joint}`);
      if (!bone) continue;
      const pitch = deg * scale * sign * DEG;
      const qy = [0, Math.sin(half(pitch)), 0, Math.cos(half(pitch))];
      bone.quaternion.set(qy[0], qy[1], qy[2], qy[3]);
      applied++;
    }

    // 掌向翻转（hand 骨绕掌骨轴；v4 实证 right 180°=掌心朝大腿内侧）
    const flip = HAND_POSE.palmFlip[side] * scale;
    if (flip) {
      const hn = vrm.humanoid.getNormalizedBoneNode(`${side}Hand`);
      if (hn) {
        hn.rotation.x += flip * DEG;
        applied++;
      }
    }
  }
  return applied;
}
