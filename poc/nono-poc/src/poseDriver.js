// 诺诺小脑 · 基元层：骨骼补间引擎（Phase A 施工）
// 施工图：prd/01-需求文档/07-自习室/诺诺小脑架构设计.md §4.1（基元表）/§5.1（执行模型）
// 基元 = 旋转（球窝自由）/ 弯曲（铰链限位）/ 平移（hips 根位移）；mirror/intensity/loop/delay 由执行器展开
// 核心语义（§5.1）：补间永远"从当前值出发"——打断时用短滑变滑向新目标，数学上天然无残姿
import * as THREE from 'three';

const DEG = Math.PI / 180;

// 铰链限位表（度）：bend 超限钳制，防弯错方向鬼畜。
// Phase A 先给保守宽带兜底，逐关节精调 = 施工图 §十一 开放问题#1（HUD 实测后定版）
const BEND_LIMITS_DEG = {
  leftLowerArm: [-165, 165],
  rightLowerArm: [-165, 165],
  leftUpperLeg: [-140, 140],
  rightUpperLeg: [-140, 140],
  neck: [-70, 70],
};

export function clampBendDeg(bone, deg) {
  const lim = BEND_LIMITS_DEG[bone];
  if (!lim) return deg;
  return Math.min(lim[1], Math.max(lim[0], deg));
}

const EASINGS = {
  linear: (t) => t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  // 坐立运动学耦合专用（BUG-092）：腿匀速弯 (α=90t) 时髋高必须按 1-cos(α) 走才贴地——
  // 下落用 easeInSine（=1-cos(πt/2)），起升用 easeOutSine（=sin(πt/2)），二者互为时间反演
  easeInSine: (t) => 1 - Math.cos((Math.PI / 2) * t),
  easeOutSine: (t) => Math.sin((Math.PI / 2) * t),
};

// 引擎构造时一次性注册的全部人形骨（2026-10-08 步态轮修 BUG-104）：
// 原实现 rest 为**懒捕获**（首次 _bone() 时记录当前值）——若首次触摸发生在走路/坐姿过程中，
// 捕获到的是"被摆过的姿态"而非真静息，此后所有姿势都带固定偏差（实测：全零偏移下踝高 0.169 而非
// 0.099，坐姿腿角整体漂移 12~16cm，是"坐下手腿穿模"报告的真根因）。构造时统一注册=rest 必为静息。
export const DEFAULT_BONES = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
  'leftEye', 'rightEye',
];

export class PoseDriver {
  constructor(vrm) {
    this.vrm = vrm;
    this.time = 0;          // 引擎时钟（秒），与主循环 delta 累加
    this.bones = new Map(); // name -> { node, rest:{x,y,z}, restPos, off:{x,y,z}, offPos }
    this.tweens = [];       // 活跃补间（含 delay 排队中）
    this.touched = new Map(); // name -> { axes:Set, pos:bool }——配方碰过的骨，stop/interrupt 归位范围
    this.batch = 0;         // 补间批次（每次配方 play 递增；同批 op 共存，跨批同频道互清——BUG-103/105）
    // 心跳层每帧对 chest/hips 叠加（+=），若不被 apply 每帧复位会累积漂移——创建时先注册
    for (const n of DEFAULT_BONES) this._bone(n);
  }

  _bone(name) {
    if (!this.bones.has(name)) {
      const node = this.vrm.humanoid.getNormalizedBoneNode(name);
      if (!node) return null;
      this.bones.set(name, {
        node,
        rest: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
        restPos: node.position.clone(),
        off: { x: 0, y: 0, z: 0 },
        offPos: new THREE.Vector3(),
      });
    }
    return this.bones.get(name);
  }

  // 注册骨骼为"常驻静息骨"（rest 捕获当前姿态）：apply() 每帧写回 rest+offset，
  // 于是 resetNormalizedPose() 之后也能自动恢复——自然手型层用（2026-10-08 步态轮）
  register(names) {
    let n = 0;
    for (const name of names) if (this._bone(name)) n++;
    return n;
  }

  _touch(name, axis = null, pos = false) {
    if (!this.touched.has(name)) this.touched.set(name, { axes: new Set(), pos: false });
    const t = this.touched.get(name);
    if (axis) t.axes.add(axis);
    if (pos) t.pos = true;
  }

  _dropTweens(name, { axis = null, pos = null, batch = null } = {}) {
    this.tweens = this.tweens.filter(
      (tw) => !(tw.name === name
        && (axis === null || tw.axis === axis)
        && (pos === null || tw.pos === pos)
        && (batch === null || tw.batch !== batch)), // batch：保留本批（同一次 play 的 op 共存，按推入顺序覆盖）
    );
  }

  // 批次：每次配方 play 前调用，同批 op 互不吞噬（脉冲两段式），跨批同频道才互清（BUG-103/105 修复）
  beginBatch() {
    this.batch = (this.batch ?? 0) + 1;
    return this.batch;
  }

  // 低层原语：某骨某轴补间到目标偏移（rad）。from 在启动瞬间从当前值捕获——打断平滑性的来源。
  // 显式传 from（rad）则跳过捕获=pingPong 两侧振荡的起点（步态腿摆 +18↔−26 用）。
  // 清除范围＝同骨同轴**其他批次**的补间（2026-10-08 步态轮 BUG-103/105：原按骨/按骨+轴无批次清除，
  // 使同一次 play 内的两段式脉冲（前倾 0→12°→0、髋 y 升+z 前移）互相吞噬，前倾从未生效）
  tweenTo(name, axis, target, dur, { delay = 0, easing = 'easeInOutQuad', pingPong = false, until = Infinity, from = null, batch = null } = {}) {
    if (!this._bone(name)) return false;
    const b = batch ?? this.batch ?? 0;
    this._dropTweens(name, { axis, pos: false, batch: b });
    this.tweens.push({ name, axis, pos: false, from: from !== null ? from : null, to: target, t0: this.time + delay, dur, ease: EASINGS[easing] ?? EASINGS.easeInOutQuad, pingPong, until, batch: b });
    this._touch(name, axis);
    return true;
  }

  tweenPos(name, axis, target, dur, { delay = 0, easing = 'easeInOutQuad', pingPong = false, until = Infinity, batch = null } = {}) {
    if (!this._bone(name)) return false;
    const b = batch ?? this.batch ?? 0;
    this._dropTweens(name, { axis, pos: true, batch: b });
    this.tweens.push({ name, axis, pos: true, from: null, to: target, t0: this.time + delay, dur, ease: EASINGS[easing] ?? EASINGS.easeInOutQuad, pingPong, until, batch: b });
    this._touch(name, null, true);
    return true;
  }

  // 把一组骨（Map(name -> {axes,pos})）的偏移补回 0——打断/停止的滑变执行体
  blendBonesTo(boneMap, dur = 0.15) {
    for (const [name, t] of boneMap) {
      const b = this._bone(name);
      if (!b) continue;
      for (const axis of t.axes) {
        this._dropTweens(name, { axis, pos: false });
        const cur = b.off[axis];
        if (Math.abs(cur) > 1e-4) {
          this.tweens.push({ name, axis, pos: false, from: cur, to: 0, t0: this.time, dur, ease: EASINGS.easeOutQuad, pingPong: false, until: Infinity, batch: null });
        } else {
          b.off[axis] = 0;
        }
      }
      if (t.pos && b.offPos.lengthSq() > 1e-8) {
        this._dropTweens(name, { pos: true });
        for (const axis of ['x', 'y', 'z']) {
          this.tweens.push({ name, axis, pos: true, from: b.offPos[axis], to: 0, t0: this.time, dur, ease: EASINGS.easeOutQuad, pingPong: false, until: Infinity, batch: null });
        }
      }
    }
  }

  cancelAllTweens() {
    this.tweens = [];
  }

  settled() {
    return this.tweens.length === 0;
  }

  update(dt) {
    this.time += dt;
    const now = this.time;
    const keep = [];
    for (const tw of this.tweens) {
      if (now < tw.t0) { keep.push(tw); continue; }
      const b = this._bone(tw.name);
      if (!b) continue;
      if (tw.from === null) tw.from = tw.pos ? b.offPos[tw.axis] : b.off[tw.axis]; // 启动瞬间捕获当前值
      if (now >= tw.until) { this._write(b, tw, tw.to); continue; }                // 循环到期：停在终点
      const p = (now - tw.t0) / tw.dur;
      let val;
      if (tw.pingPong) {
        const c = p % 2;
        const osc = tw.from + (tw.to - tw.from) * (c < 1 ? tw.ease(c) : tw.ease(2 - c));
        val = osc * Math.min(1, p / 2); // 首周期振幅渐入：从静息平滑起摆（显式 from 振荡起步无跳变）
      } else if (p >= 1) {
        val = tw.to;
      } else {
        val = tw.from + (tw.to - tw.from) * tw.ease(p);
      }
      this._write(b, tw, val);
      if (p < 1 || (tw.pingPong && now < tw.until)) keep.push(tw);
    }
    this.tweens = keep;
  }

  _write(b, tw, val) {
    if (tw.pos) b.offPos[tw.axis] = val;
    else b.off[tw.axis] = val;
  }

  // 每帧把注册骨写回 静息+偏移（先于心跳层叠加；Mixamo mixer 播放时调用方跳过本方法）
  apply() {
    for (const [, b] of this.bones) {
      b.node.rotation.set(b.rest.x + b.off.x, b.rest.y + b.off.y, b.rest.z + b.off.z);
      if (b.offPos.lengthSq() > 0) {
        b.node.position.set(b.restPos.x + b.offPos.x, b.restPos.y + b.offPos.y, b.restPos.z + b.offPos.z);
      } else {
        b.node.position.copy(b.restPos);
      }
    }
  }
}
