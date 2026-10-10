// 法线状态诊断（R-058 白机 2026-10-10，BUG-111 决定性判据工具）
// 用途：判定目标网格的法线是 smooth 还是已退化 flat/硬边——BUG-111（手指加密后观感粗糙）两条根因假设的
//       分流判据：若 v11 检出 flat ⇒ 法线在 bmesh 细分中丢失 → 修法①=重建平滑法线；
//       若 v11 也是 smooth ⇒ 粗糙来自线性细分"棱面感放大"本身 → 修法②=Catmull-Clark 真细分。
// 用法：PoC 打开 ?model=v7（基线）或 ?vrm=<候选> → 控制台粘贴运行 → 读 result.verdict。
// 判据三层（均在几何/材质属性层面，与渲染器无关）：
//   1. 位置重合顶点对中"法线冲突"比例——glTF flat 化的痕迹是顶点沿面法线拆分（UV 缝也拆顶点，但
//      缝两侧法线一致，dot≥0.98 不计冲突）；
//   2. 面平坦度——面几何法线与三顶点平均法线夹角 >20° 的面占比（"细碎棱面"观感的直接来源）；
//   3. 材质 flatShading 标志（应为 false/undefined）。
// 分区：全身 + 手部区（按主导骨骼名匹配 *Hand/*Thumb/*Index/*Middle/*Ring/*Little 的顶点，面=≥2 顶点在手区）。
// 基线（v7，细分前）：手 1117 tri/手，预期 smooth（冲突对≈0、平坦面占比≈0）——2026-10-10 白机实测见
//       blender_normal_probe_log.txt 的 three 节。黑机对 v11/v12 跑同一脚本对照即得判据。
// 注意：本脚本只读，不改任何状态；蒙皮网格顶点/法线是绑定姿态数据，但 smooth/flat 属性是其固有属性，
//   无需蒙皮变换即可判定（对比：朝向判断才必须蒙皮后算，见 poc_hand_orient_check.js 头注）。
(() => {
  const p = window.__poc, vrm = p && p.vrm;
  if (!vrm) return 'VRM 未加载';
  const CONFLICT_DOT = 0.98;    // 位置重合顶点法线 dot 低于此 = 法线冲突（约 >11° 差异）
  const FLAT_ANGLE_DEG = 20;    // 面法线与顶点均值的夹角超过此 = 该面读作平的
  const FLAT_COS = Math.cos(FLAT_ANGLE_DEG * Math.PI / 180);
  // 手区骨骼名：兼容 VRM 标准名（leftHand/rightIndex2）与 VRoid 原名（J_Bip_L_Hand/J_Bip_R_Thumb1）——
  //   2026-10-10 实测 v7 骨骼为 J_Bip_* 格式，仅按 left/right 前缀匹配会漏光（手区=0 的坑）
  const HAND_RE = /^(?:j_bip_)?(?:l|r|left|right)[_\-]?(?:hand|thumb|index|middle|ring|little)/i;

  const report = { meshes: [], totals: null };
  const acc = {}; // 全局累加器

  vrm.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.normal) return;
    const g = o.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const si = g.attributes.skinIndex;
    const bones = o.skeleton ? o.skeleton.bones : null;
    const mats = Array.isArray(o.material) ? o.material : [o.material];

    // 顶点 → 是否手区（按主导骨骼名；无骨骼信息则全 false）
    const nVerts = pos.count;
    const isHand = new Uint8Array(nVerts);
    if (bones && si) {
      for (let vi = 0; vi < nVerts; vi++) {
        for (let k = 0; k < 4; k++) {
          const w = g.attributes.skinWeight.getComponent(vi, k);
          if (w >= 0.5 && HAND_RE.test(bones[si.getComponent(vi, k)].name)) { isHand[vi] = 1; break; }
        }
      }
    }

    // 判据1：位置重合顶点的法线冲突（量化到 0.1mm 网格做 key）
    const buckets = new Map();
    for (let vi = 0; vi < nVerts; vi++) {
      const key = `${Math.round(pos.getX(vi) * 1e4)},${Math.round(pos.getY(vi) * 1e4)},${Math.round(pos.getZ(vi) * 1e4)}`;
      let arr = buckets.get(key);
      if (!arr) { arr = { n: [], hand: 0 }; buckets.set(key, arr); }
      arr.n.push([nor.getX(vi), nor.getY(vi), nor.getZ(vi)]);
      if (isHand[vi]) arr.hand = 1;
    }
    let dupPos = 0, conflict = 0, dupPosHand = 0, conflictHand = 0;
    for (const arr of buckets.values()) {
      if (arr.n.length < 2) continue;
      dupPos++; dupPosHand += arr.hand;
      let bad = false;
      for (let i = 0; i < arr.n.length && !bad; i++)
        for (let j = i + 1; j < arr.n.length; j++) {
          const d = arr.n[i][0] * arr.n[j][0] + arr.n[i][1] * arr.n[j][1] + arr.n[i][2] * arr.n[j][2];
          if (d < CONFLICT_DOT) { bad = true; break; }
        }
      if (bad) { conflict++; conflictHand += arr.hand; }
    }

    // 判据2：面平坦度（面几何法线 vs 三顶点法线均值）
    let tris = 0, flatTris = 0, trisHand = 0, flatTrisHand = 0;
    const idxOf = (corner) => g.index ? g.index.getX(corner) : corner;
    for (let f = 0; f < (g.index ? g.index.count : nVerts); f += 3) {
      const i0 = idxOf(f), i1 = idxOf(f + 1), i2 = idxOf(f + 2);
      // 叉积（局部空间，不蒙皮——smooth/flat 是几何固有属性）
      const e1x = pos.getX(i1) - pos.getX(i0), e1y = pos.getY(i1) - pos.getY(i0), e1z = pos.getZ(i1) - pos.getZ(i0);
      const e2x = pos.getX(i2) - pos.getX(i0), e2y = pos.getY(i2) - pos.getY(i0), e2z = pos.getZ(i2) - pos.getZ(i0);
      const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
      const fl = Math.hypot(fx, fy, fz) || 1;
      let nx = 0, ny = 0, nz = 0;
      for (const vi of [i0, i1, i2]) { nx += nor.getX(vi); ny += nor.getY(vi); nz += nor.getZ(vi); }
      const nl = Math.hypot(nx, ny, nz) || 1;
      const dot = Math.abs((fx * nx + fy * ny + fz * nz) / (fl * nl)); // abs：绕向不一致时取等价法线
      const flat = dot < FLAT_COS;
      tris++; flatTris += flat;
      const handFace = (isHand[i0] + isHand[i1] + isHand[i2]) >= 2;
      if (handFace) { trisHand++; flatTrisHand += flat; }
    }

    const m = {
      name: o.name || '(unnamed)',
      materials: mats.map((mt) => `${mt.name || '?'}/${mt.type}${mt.flatShading === true ? '/FLATSHADING' : ''}`),
      tris, trisHand,
      dupPositions: dupPos, normalConflicts: conflict,
      handDupPositions: dupPosHand, handNormalConflicts: conflictHand,
      flatFaceRatio: +(flatTris / (tris || 1)).toFixed(4),
      handFlatFaceRatio: +(flatTrisHand / (trisHand || 1)).toFixed(4),
    };
    report.meshes.push(m);
    acc.dupPos = (acc.dupPos || 0) + dupPos; acc.conflict = (acc.conflict || 0) + conflict;
    acc.dupPosHand = (acc.dupPosHand || 0) + dupPosHand; acc.conflictHand = (acc.conflictHand || 0) + conflictHand;
    acc.tris = (acc.tris || 0) + tris; acc.flatTris = (acc.flatTris || 0) + flatTris;
    acc.trisHand = (acc.trisHand || 0) + trisHand; acc.flatTrisHand = (acc.flatTrisHand || 0) + flatTrisHand;
  });

  const conflictRatioBody = +(acc.conflict / (acc.dupPos || 1)).toFixed(4);
  const conflictRatioHand = +(acc.conflictHand / (acc.dupPosHand || 1)).toFixed(4);
  const flatRatioBody = +(acc.flatTris / (acc.tris || 1)).toFixed(4);
  const flatRatioHand = +(acc.flatTrisHand / (acc.trisHand || 1)).toFixed(4);
  // 判定只用**手区**且要求双指标同时恶化：v7 基线证明低模卡通手本就带 ~43% 造型硬边冲突（有意设计，
  //   指头棱柱分面）+ ~8.5% flat 面，单看冲突率会把正常基线误判成 flat；全身占比受头发（~100% flat，
  //   卡通常规）污染，仅作参考。对比法：黑机对 v11 跑本脚本，与下方 v7 基线数字对照读。
  const FLAT_DECLINE = (flatRatioHand > 0.25 && conflictRatioHand > 0.60);
  report.totals = {
    tris: acc.tris, trisHand: acc.trisHand,
    conflictRatioBody, conflictRatioHand, flatRatioBody, flatRatioHand,
    baselineV7: { handConflictRatio: 0.4268, handFlatRatio: 0.0849, note: 'v7 细分前基线（2026-10-10 白机实测）：冲突=VRoid 有意造型硬边，非缺陷' },
    verdict: FLAT_DECLINE
      ? `❌ 手区法线显著 flat 化（flat=${(flatRatioHand * 100).toFixed(1)}%>25% 且冲突=${(conflictRatioHand * 100).toFixed(1)}%>60%，基线 8.5%/42.7%）→ 修法①=细分后重建平滑法线`
      : `✅ 手区 smooth 特征与基线同量级（flat=${(flatRatioHand * 100).toFixed(1)}%/冲突=${(conflictRatioHand * 100).toFixed(1)}% vs 基线 8.5%/42.7%）——粗糙感若仍在，指向线性细分棱面放大 → 修法②=Catmull-Clark 真细分`,
  };
  console.log('[normalDiag]', JSON.stringify(report, null, 1));
  return report;
})();
