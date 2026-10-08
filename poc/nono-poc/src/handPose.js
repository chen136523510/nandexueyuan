// 诺诺小脑 · 自然手型层（R-058 2026-10-08 黑机；院长复验②"手掌不要一直绷住，没有正常人会把手掌一直绷住"）
//
// 问题：VRM 静息手是 T-pose 的平摊手（手指伸直张开）——所有配方/动作都不碰手指骨，
//   于是站/走/坐全程都是"绷直摊开"的僵尸手（BUG-097 的另一半）。
// 方案：把手指骨纳入**静息姿态**的一部分（不用配方、不用 clip）——在 PoseDriver 创建前
//   写入放松手型并注册骨骼，rest 捕获即为手型，之后每帧 apply 保持、resetNormalizedPose 后也能自动恢复；
//   走路 clip 不含手指轨道故手型不受影响；Mixamo 动作自带手指轨道时会覆盖（合理：外来动作的手型优先）。
//
// 轴与符号（2026-10-08 浏览器实测，T-pose 基准）：
//   归一化手指骨 rest 局部旋转=单位四元数；局部 x=手指自身方向（绕它转指尖不动，
//   等于沿指轴扭转），**局部 y=蜷曲轴**（左手 y+45° 使食指尖距腕 112→85mm 朝掌心移动；
//   右手镜像取 y−45° 同样 112→85mm——左右手 y/z 轴镜像、x 轴不镜像），局部 z=张开/并拢轴
//   （食指 z+ → 朝中指方向，小指 z− → 朝中指方向）。
//   判据：左臂恢复 T-pose（掌心朝 -Z）后指尖应向 -Z 移动且远离指轴——实测 y 轴唯一满足。
//
// 调参入口：HAND_POSE 表（角度=度，蜷曲为正）。要"再放松/再收一点"只改这张表。

const HAND_POSE = {
  // 四指：近节/中节/远节逐步蜷曲（真人放松手 ≈ 近 30°/中 35°/远 18°；小指略多、食指略少）
  Index: { Proximal: 30, Intermediate: 35, Distal: 18 },
  Middle: { Proximal: 33, Intermediate: 38, Distal: 20 },
  Ring: { Proximal: 34, Intermediate: 39, Distal: 20 },
  Little: { Proximal: 36, Intermediate: 42, Distal: 22 },
  // 拇指：轻度内收（靠向食指侧）+ 指节微屈——"搭在拳侧"而非贴死或张开
  Thumb: { Metacarpal: 10, Proximal: 16, Distal: 12 },
};
// 指间轻微并拢（z 轴；食指朝中指为 +，小指朝中指为 −，中指/无名指居中）
const HAND_FAN = { Index: 3, Middle: 0, Ring: -2, Little: -4 };

const DEG = Math.PI / 180;

/** 全部手工覆盖的手指骨名（供 PoseDriver 注册） */
export function handPoseBoneNames() {
  const names = [];
  for (const side of ['left', 'right']) {
    for (const f of ['Index', 'Middle', 'Ring', 'Little']) for (const j of ['Proximal', 'Intermediate', 'Distal']) names.push(`${side}${f}${j}`);
    for (const j of ['Metacarpal', 'Proximal', 'Distal']) names.push(`${side}Thumb${j}`);
  }
  return names;
}

/**
 * 应用自然手型（写归一化骨局部旋转）。
 * @param {import('@pixiv/three-vrm').VRM} vrm
 * @param {{scale?: number}} [opts] scale=整体放松度（0=摊平原状，1=表内定版值）
 */
export function applyHandPose(vrm, { scale = 1 } = {}) {
  let applied = 0;
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? 1 : -1; // 蜷曲：左正右负（镜像实测）
    for (const [finger, joints] of Object.entries(HAND_POSE)) {
      for (const [joint, deg] of Object.entries(joints)) {
        const bone = vrm.humanoid.getNormalizedBoneNode(`${side}${finger}${joint}`);
        if (!bone) continue;
        const pitch = deg * scale * sign * DEG; // 绕局部 y：蜷曲
        const fan = (finger === 'Thumb' ? 0 : (HAND_FAN[finger] ?? 0)) * scale * sign * DEG; // 绕局部 z：并拢
        // q = Ry(pitch) * Rz(fan)（先并拢再蜷曲；角度小，次序影响可忽略）
        const cy = Math.cos(pitch / 2), sy = Math.sin(pitch / 2);
        const cz = Math.cos(fan / 2), sz = Math.sin(fan / 2);
        const qy = [0, sy, 0, cy];
        const qz = [0, 0, sz, cz];
        // qy ∘ qz
        const [x1, y1, z1, w1] = qy;
        const [x2, y2, z2, w2] = qz;
        bone.quaternion.set(
          w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
          w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
          w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
          w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        );
        applied++;
      }
    }
  }
  return applied;
}
