// 诺诺小脑 · 配方层：配方执行器（Phase A 施工 / Phase B 场景化修订）
// 施工图：prd/01-需求文档/07-自习室/诺诺小脑架构设计.md §4.2（配方 schema）/§5.2（中断机制）
// 配方 = 可取消的程序：打断=旧配方**自己 touched 的骨**短滑变回中立，新旧交集由新 tween 从当前值接管；
//   （2026-10-06 院长修订：动作分层——姿态层（坐下/起立，layer:'posture'）与手势层（歪头/伸懒腰…）可叠加，
//    打断/自动回归只清当前配方自己的骨，姿态不被手势打断抹掉）
// 安全点 = 关键过渡的中断保护（未到安全点的打断请求排队，到点执行）；
// hold = 保持型配方（背手/坐下等，播完保持直到打断）；hold=false 播完 autoReturn 秒后自动回归。
// 大脑自中断在本 Phase 由 HUD/控制台代理（Phase C 接 nonoAgent）。
import { clampBendDeg } from './poseDriver.js';

const DEG = Math.PI / 180;
const DEFAULT_BLEND = 0.15; // 施工图 §5.2：打断滑变 150ms

// 镜像展开：左右骨名互换，y/z 轴角度取反（x 轴=前后向，镜像不变），平移 x 取反
function mirrorOp(op) {
  let bone = op.bone;
  if (bone.startsWith('left')) bone = 'right' + bone.slice(4);
  else if (bone.startsWith('right')) bone = 'left' + bone.slice(5);
  const out = { ...op, bone };
  if ((op.op === 'rotate' || op.op === 'bend') && (op.axis === 'y' || op.axis === 'z')) out.deg = -(op.deg ?? 0);
  if (op.op === 'translate') out.x = -(op.x ?? 0);
  return out;
}

export class RecipeExecutor {
  constructor(poseDriver, { blend = DEFAULT_BLEND } = {}) {
    this.driver = poseDriver;
    this.blend = blend;
    this.state = 'idle';   // idle | playing | stopping
    this.current = null;   // { recipe, startedAt, seqEnd, hold, autoReturn }
    this.pending = null;   // 安全点前排队的中断请求 { recipe?, opts?, stop? }
    this.listeners = new Set();
  }

  onState(cb) {
    this.listeners.add(cb);
  }

  _emit(detail) {
    for (const cb of this.listeners) cb(this.state, this.current?.recipe?.label ?? '', detail);
  }

  // 播放配方。recipe = 施工图 §4.2 schema 的 JSON 对象（可选 layer:'posture' 声明姿态层）
  play(recipe, opts = {}) {
    if (!recipe || !Array.isArray(recipe.sequence) || recipe.sequence.length === 0) {
      return { ok: false, msg: '配方缺少非空 sequence 数组' };
    }
    if (!recipe.sequence.every((op) => op && op.bone && (op.op === 'translate' ? true : op.axis))) {
      return { ok: false, msg: 'sequence 条目缺少 bone（或 rotate/bend 缺 axis）' };
    }
    const now = this.driver.time;

    if (this.state === 'playing' && this.current) {
      const c = this.current;
      const firstSafe = c.recipe.safePoints?.[0] ?? Infinity;
      if (c.recipe.interruptible === false && now - c.startedAt < firstSafe) {
        this.pending = { recipe, opts }; // 关键过渡未到安全点：排队，update() 到点执行
        this._emit('queued');
        return { ok: true, queued: true };
      }
      // 打断（动作分层修订）：只把旧配方**自己 touched 的骨**滑回中立——
      // 旧配方若是姿态层（坐下），其骨不归位=坐姿保持，新配方手势直接从当前值叠加；
      // 旧配方若是手势层，只清它的手势骨，不波及姿态
      if (c.layer !== 'posture') this.driver.blendBonesTo(c.touchedBones, this.blend);
    } else if (this.state === 'stopping') {
      // 回归途中接新配方：清回归 tween（当前值保留），为旧骨重排回归 tween，
      // 再让新配方 tween 按骨+轴覆盖——两路各管各骨，互不抢写
      this.driver.cancelAllTweens();
      if (this.current && this.current.layer !== 'posture') {
        this.driver.blendBonesTo(this.current.touchedBones, this.blend);
      }
    }

    const intensity = opts.intensity ?? recipe.intensityDefault ?? 1;
    const mirror = !!opts.mirror && recipe.mirrorable !== false;
    const touchedBones = new Map(); // 本配方自己碰的骨（打断/回归只清这里，动作分层的关键）
    const seqEnd = this._schedule(recipe.sequence, { intensity, mirror, touchedBones });
    this.current = {
      recipe,
      startedAt: now,
      seqEnd,
      hold: recipe.hold === true,
      autoReturn: recipe.autoReturn ?? 0.6,
      layer: recipe.layer ?? 'gesture',
      touchedBones,
    };
    this.state = 'playing';
    this.pending = null;
    this._emit('play');
    return { ok: true };
  }

  // 基元序列 → 补间队列，返回序列结束时刻（引擎时钟）
  _schedule(sequence, { intensity, mirror, touchedBones }) {
    let end = this.driver.time;
    const touch = (name, axis = null, pos = false) => {
      if (!touchedBones.has(name)) touchedBones.set(name, { axes: new Set(), pos: false });
      const t = touchedBones.get(name);
      if (axis) t.axes.add(axis);
      if (pos) t.pos = true;
    };
    for (const raw of sequence) {
      const op = mirror ? mirrorOp(raw) : raw;
      const dur = op.dur ?? 0.5;
      const delay = op.delay ?? 0;
      const t0 = this.driver.time + delay;
      if (op.op === 'translate') {
        for (const axis of ['x', 'y', 'z']) {
          if (op[axis] == null) continue; // 未声明的轴跳过；显式 0 也调度（起立=hips 归位目标恰为 0）
          const v = (op[axis]) * intensity; // 平移单位=米，intensity 整体缩放
          this.driver.tweenPos(op.bone, axis, v, dur, { delay, easing: op.easing });
          touch(op.bone, null, true);
          end = Math.max(end, t0 + dur);
        }
      } else {
        // rotate / bend：deg→rad，intensity 缩放幅度（清冷人格=整体 intensity 上限，施工图 §4.3）
        let deg = (op.deg ?? 0) * intensity;
        if (op.op === 'bend') deg = clampBendDeg(op.bone, deg);
        const axis = op.axis ?? 'x';
        const loop = op.loop;
        this.driver.tweenTo(op.bone, axis, deg * DEG, dur, {
          delay,
          easing: op.easing,
          pingPong: loop != null,
          until: loop != null ? t0 + dur * 2 * (loop === -1 ? 1e9 : loop) : Infinity,
        });
        touch(op.bone, axis);
        end = Math.max(end, t0 + dur * (loop != null && loop !== -1 ? 2 * loop : 1));
      }
    }
    return end;
  }

  stop() {
    if (this.state === 'idle') return;
    const c = this.current;
    if (this.state === 'playing' && c && c.recipe.interruptible === false) {
      const firstSafe = c.recipe.safePoints?.[0] ?? Infinity;
      if (this.driver.time - c.startedAt < firstSafe) {
        this.pending = { stop: true }; // 关键过渡：排队到安全点
        this._emit('queued');
        return;
      }
    }
    if (c && c.layer === 'posture') {
      // 姿态层停 = 冻结当前姿态（坐姿保持），不再滑回中立——起立配方负责姿态切换
      this.driver.cancelAllTweens();
      this.current = null;
      this.state = 'idle';
      this.driver.touched.clear();
      this.pending = null;
      this._emit('idle');
      return;
    }
    this._blendAllBack();
    this.pending = null;
  }

  _blendAllBack() {
    // 只回归当前配方自己碰的骨（动作分层）：手势结束归手势位，姿态保持
    if (this.current) this.driver.blendBonesTo(this.current.touchedBones, this.blend);
    this.current = null;
    this.state = 'stopping';
    this._emit('stopping');
  }

  // 每帧调用（driver.update 之后）：安全点放行 / 自动回归 / 归位完成判定
  update() {
    const now = this.driver.time;
    if (this.pending && this.state === 'playing' && this.current) {
      const firstSafe = this.current.recipe.safePoints?.[0] ?? 0;
      if (now - this.current.startedAt >= firstSafe) {
        const req = this.pending;
        this.pending = null;
        if (req.stop) this._blendAllBack();
        else this.play(req.recipe, req.opts);
      }
    } else if (this.state === 'playing' && this.current && !this.current.hold) {
      if (now >= this.current.seqEnd + this.current.autoReturn) this._blendAllBack();
    } else if (this.state === 'stopping' && this.driver.settled()) {
      this.state = 'idle';
      this.driver.touched.clear();
      this._emit('idle');
    }
  }
}
