// 诺诺小脑 · 自然手型层（R-058 2026-10-08 黑机；院长复验②"手掌不要一直绷住，没有正常人会把手掌一直绷住"）
//
// 问题：VRM 静息手是 T-pose 的平摊手（手指伸直张开）——所有配方/动作都不碰手指骨，
//   于是站/走/坐全程都是"绷直摊开"的僵尸手（BUG-097 的另一半）。
// 方案：把手指骨纳入**静息姿态**的一部分（不用配方、不用 clip）——在 PoseDriver 创建前
//   写入放松手型并注册骨骼，rest 捕获即为手型，之后每帧 apply 保持、reset 后也能自动恢复；
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
//
// —— 解剖依据（v4 精细建模，2026-10-09 院长"调研人类手掌手指关节，进行手部精细建模"）——
// 手指三关节（表键=解剖关节）：MCP=掌指关节 / PIP=近侧指间 / DIP=远侧指间。
// 【自然屈曲耦合】真人屈指时三关节非独立，沿"抓握弧"按近似比联动：
//   PIP ≈ MCP × 1.25，DIP ≈ MCP × 0.55（Kapandji《关节生理学》抓握弧的简化比；
//   本表 v3 定版值即落在此比上：35→44/19、38→48/21 ✓）——手动改值时建议保持比例。
// 【静息域】放松手各关节屈曲：MCP 20~40°/PIP 30~50°/DIP 10~25°（康复医学 functional
//   resting position 共识域；本表取域上沿="微微握拳"）。食→小指梯度递增（掌弓斜形）。
// 【拇指】CMC 腕掌关节（鞍状）对掌在 VRM 无独立骨，以内收(y)+旋前(x)近似——Proximal 45°
//   为 off 通道扫描实证（拇指端距食指中节 ~50mm=轻搭侧面）。
// 【腕】functional position：背伸 ~20°+尺偏 ~10°——垂手位取背伸 15°（WRIST.extend）。
// 【来源说明】数值=公认康复医学参照 + 本模型浏览器实测标定双重来源；最终以院长对照真人验收为准。
//
// v2（2026-10-09 白机，BUG-106：院长复验二轮"手掌的形态不太正常，正常应该是微微抱拳的放松态"）：
//   v1 四指合计 ~90° 微屈实测形态是"手指微弯但掌心仍摊开"的半摊手；按条目修复方向蜷一档到
//   合计 150~180° 的轻握拳 + 拇指跨掌搭向食指近节（y 内收一档 + 新增绕局部 x 的沿掌面转向，
//   x 轴左右不镜像故 TWIST 同号）。
// v3（2026-10-09 白机二轮，院长"手部依旧有问题，去看看具体人的手，尤其是女孩子的手来做比对"）：
//   联网比对真人放松手解剖域——MCP 屈曲 20~40°/PIP 30~50°/DIP 10~25°（小指侧略多），拇指自然
//   内收、指尖对食指/中指侧而非贴掌心。v1 各值恰在域内偏松（观感半摊），v2(55/60/38) 全维超域
//   =用力握拳非放松态。v3=取域上沿（100~119°）"微微抱拳"：蜷而不握、指尖朝掌心不触掌；拇指
//   回调（y 内收 20°+TWIST 20°，v2 的 30/35 过拧成"拧拳"）。要"再松/再紧"仍只改本表。

const HAND_POSE = {
  // 四指：真人放松手参照域（MCP 20~40°/PIP 30~50°/DIP 10~25°）取上沿="微微抱拳"——
  // v1(30/35/18) 偏松被判"半摊手"，v2(55/60/38) 超域成"用力握拳"，v3=域上沿 100~119°
  Index: { Proximal: 35, Intermediate: 45, Distal: 20 },
  Middle: { Proximal: 38, Intermediate: 48, Distal: 22 },
  Ring: { Proximal: 40, Intermediate: 50, Distal: 23 },
  Little: { Proximal: 42, Intermediate: 52, Distal: 25 },
  // 拇指：自然内收微屈，指尖对向食指中节侧（真人放松拇指不贴掌心不跨掌）
  // v3 定版 45°=off 通道扫描实证（Proximal y 45° 时拇指端距食指中节 ~50mm=轻搭侧面的自然距离）
  Thumb: { Metacarpal: 10, Proximal: 45, Distal: 12 },
};
// 拇指沿掌面转向（绕局部 x，度；左右手同号不镜像）
// ⚠️ v3 实测：绕 x 正向=拇指**外张**方向——放松手应为 0（v2 的 35° 与 y 内收互相打架，
//    "又收又拧"的净效果=拇指翘在外面，正是院长二轮看到的形态问题之一）
const THUMB_TWIST = 0;

// 掌向与腕位（v4，2026-10-09 院长三轮"微微握拳，掌心朝向身体内侧而不是后方"）：
//   垂手位掌法向实测（raw 骨，世界系，模型面朝 -x）：左掌 (0,-0.17,-0.98)=恰朝大腿 ✓，
//   右掌 (0,+0.17,-0.98)=朝外侧 ✗——两手掌向相同未镜像（四指蜷曲轴镜像不保证掌向镜像），
//   从常见机位看右手即"掌心朝后"。VRM 无桡尺关节，以 hand 骨绕局部 x（掌骨轴）旋转近似前臂
//   旋后（supinate）。⚠️ 轴实测：hand 局部 y≈掌法向轴（绕之掌向不变），翻掌轴=x。
//   supinate=翻掌（右 180° 后掌法向翻转至与左镜像对称，双掌均朝大腿）；extend=腕背伸
//   （functional position ~15°，垂手更自然）。写入 applyHandPose、PoseDriver 构造捕获进 rest。
const WRIST = {
  left:  { supinate: 0, extend: 15 },
  right: { supinate: 180, extend: 15 },
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
  // 四元数哈密顿积 a∘b（分量序 [x,y,z,w]）
  const qMul = ([ax, ay, az, aw], [bx, by, bz, bw]) => [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
  const half = (rad) => rad / 2;
  let applied = 0;
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? 1 : -1; // 蜷曲/并拢：左正右负（镜像实测）
    for (const [finger, joints] of Object.entries(HAND_POSE)) {
      for (const [joint, deg] of Object.entries(joints)) {
        const bone = vrm.humanoid.getNormalizedBoneNode(`${side}${finger}${joint}`);
        if (!bone) continue;
        const pitch = deg * scale * sign * DEG; // 绕局部 y：蜷曲
        const fan = (finger === 'Thumb' ? 0 : (HAND_FAN[finger] ?? 0)) * scale * sign * DEG; // 绕局部 z：并拢
        // q = Ry(pitch) ∘ Rz(fan)（先并拢再蜷曲；角度小，次序影响可忽略）
        const qy = [0, Math.sin(half(pitch)), 0, Math.cos(half(pitch))];
        const qz = [0, 0, Math.sin(half(fan)), Math.cos(half(fan))];
        let q = qMul(qy, qz);
        // 拇指腹转向：绕局部 x（左右同号，不乘 sign）——拇指腹搭向食指近节（BUG-106）
        if (finger === 'Thumb') {
          const tw = THUMB_TWIST * scale * DEG;
          q = qMul(q, [Math.sin(half(tw)), 0, 0, Math.cos(half(tw))]);
        }
        bone.quaternion.set(q[0], q[1], q[2], q[3]);
        applied++;
      }
    }
  }
  // 掌向与腕位：hand 骨绕局部 x（掌骨轴）附加旋后+背伸——必须在 PoseDriver 构造前生效，
  // rest 捕获即含掌向，apply() 每帧保持（与手型同套路）
  for (const side of ['left', 'right']) {
    const w = WRIST[side] ?? { supinate: 0, extend: 0 };
    const deg = (w.supinate ?? 0) + (w.extend ?? 0);
    if (!deg) continue;
    const node = vrm.humanoid.getNormalizedBoneNode(`${side}Hand`);
    if (node) {
      node.rotation.x += deg * DEG;
      applied++;
    }
  }
  return applied;
}
