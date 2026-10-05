// 诺诺小脑 · 心跳层：常驻循环配方（呼吸/眨眼/idle 微晃）
// 施工图：prd/01-需求文档/07-自习室/诺诺小脑架构设计.md §4.4
// 心跳永远在跑，上层配方只是"临时覆盖+回归"（叠加而非抢占）——诺诺没有静止帧。
// 呼吸/眨眼参数与原 PoC 验收 2 完全一致（回归基线不改动），idle 微晃为 Phase A 新增。
// Mixamo mixer 播放时呼吸让位（原方案验收 5 语义保留）；配方播放期间呼吸继续（叠加模型下无冲突）。

export function computeHeartbeat(t, { breathEnabled = true, blinkSuppressed = false, forceBlink = false } = {}) {
  // 呼吸：胸口微起伏，4s 周期（原 PoC 参数）
  const breath = breathEnabled ? Math.sin((t * Math.PI * 2) / 4) * 0.008 : 0;

  // 眨眼：每 ~3.6s 一次，三角波快闭快开 ~0.24s（原 PoC 参数）
  const bt = t % 3.6;
  let blink = bt < 0.24 ? (bt < 0.12 ? bt / 0.12 : Math.max(0, 1 - (bt - 0.12) / 0.12)) : 0;
  if (blinkSuppressed) blink = 0; // 闭眼系表情不叠眨眼（院长验收反馈）
  if (forceBlink) blink = 1.0;    // ?blink=1 强制闭眼调试

  // idle 微晃：重心极缓慢摆动（Phase A 新增）。幅度 <0.5°，远低于穿模/lookAt 干扰阈值；
  // 周期取互质数（9s/13s）避免"机械循环感"
  const swayX = Math.sin((t * Math.PI * 2) / 9) * 0.006;
  const swayZ = Math.sin((t * Math.PI * 2) / 13 + 1.3) * 0.008;

  return { breath, blink, swayX, swayZ };
}
