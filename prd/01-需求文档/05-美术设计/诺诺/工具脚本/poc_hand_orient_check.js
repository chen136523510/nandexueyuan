// 手部朝向自检（R-058 黑机 2026-10-09）
// 用途：PoC 浏览器控制台/Playwright 一次性判定"两只手的指甲是否互为镜像、是否朝手背外侧"。
// 由来：院长 PoC 验收发现"站立态两只手指甲朝同一方向"——根因=指甲符号只在左手标定（右手薄轴镜像 →
//       右手甲面建到掌侧）。此脚本把该检查固化，避免同类错误再靠肉眼发现。
// 用法：打开 ?vrm=<候选> → 控制台粘贴运行 → 读 verdict。
//   ✅ 两手镜像 = 侧向分量反号（L.z * R.z < 0）；❌ 同向 = 未镜像。
// 注意：必须用**蒙皮后**法向（three.js 蒙皮网格的 geometry 顶点是绑定姿态，直接读 attributes.normal 得到的是
//   T-pose 朝向，会误判为"两手都朝上"——2026-10-09 踩过此坑）。
(() => {
  const p = window.__poc, vrm = p.vrm, THREE = p.THREE;
  if (!vrm) return 'VRM 未加载';
  vrm.scene.updateMatrixWorld(true);
  const hp = {};
  for (const k of ['L', 'R']) {
    const b = vrm.humanoid.getNormalizedBoneNode(k === 'L' ? 'leftHand' : 'rightHand');
    const v = new THREE.Vector3(); b.getWorldPosition(v); hp[k] = v;
  }
  let result = null;
  vrm.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!mats.some((m) => m && m.name === 'Nail')) return;   // 无 Nail 材质（未做指甲的手部资产）→ 跳过
    const g = o.geometry, sk = o.skeleton;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const acc = { L: new THREE.Vector3(), R: new THREE.Vector3() };
    const cnt = { L: 0, R: 0 };
    const v = new THREE.Vector3(), n = new THREE.Vector3(), m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
    for (let i = 0; i < g.index.count; i++) {
      const vi = g.index.getX(i);
      v.set(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
      n.set(nor.getX(vi), nor.getY(vi), nor.getZ(vi));
      const sv = new THREE.Vector3(), sn = new THREE.Vector3();
      for (let k = 0; k < 4; k++) {
        const bi = si.getComponent(vi, k), w = sw.getComponent(vi, k);
        if (!w) continue;
        m4.multiplyMatrices(sk.bones[bi].matrixWorld, sk.boneInverses[bi]);
        nm.getNormalMatrix(m4);
        sv.add(t1.copy(v).applyMatrix4(m4).multiplyScalar(w));
        sn.add(t2.copy(n).applyMatrix3(nm).normalize().multiplyScalar(w));
      }
      const key = sv.distanceTo(hp.L) < sv.distanceTo(hp.R) ? 'L' : 'R';
      acc[key].add(sn); cnt[key]++;
    }
    const L = acc.L.clone().normalize(), R = acc.R.clone().normalize();
    result = {
      nailTris: g.index.count / 3,
      L: { verts: cnt.L, dorsal: [+L.x.toFixed(3), +L.y.toFixed(3), +L.z.toFixed(3)] },
      R: { verts: cnt.R, dorsal: [+R.x.toFixed(3), +R.y.toFixed(3), +R.z.toFixed(3)] },
      lateralProduct: +(L.z * R.z).toFixed(3),
      verdict: L.z * R.z < 0 ? '✅ 两手镜像（侧向分量反号）' : '❌ 两手同向（未镜像）——需检查指甲符号/姿态',
    };
  });
  console.log('[handOrientCheck]', result);
  return result || '未找到 Nail 材质（该模型未做指甲）';
})();
