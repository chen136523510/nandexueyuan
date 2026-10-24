// 确定性噪声/随机工具（L1 大地图手绘渲染用）
// 全部带种子 —— 同参数重渲染结果一致，便于逐轮微调画质

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2i(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = t => t * t * (3 - 2 * t);

// 值噪声：返回 [0,1]
export function valueNoise(x, y, seed = 7) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2i(xi, yi, seed), b = hash2i(xi + 1, yi, seed);
  const c = hash2i(xi, yi + 1, seed), d = hash2i(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// 分形布朗运动：返回 [0,1]
export function fbm(x, y, octaves = 4, seed = 7) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * f, y * f, seed + i * 101);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return v / norm;
}

// 颜色工具
export function mix(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}
export const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export function desat(c, k = 0.45, dark = 0.1) {
  const g = c[0] * 0.3 + c[1] * 0.5 + c[2] * 0.2;
  return [
    Math.round((c[0] + (g - c[0]) * k) * (1 - dark)),
    Math.round((c[1] + (g - c[1]) * k) * (1 - dark)),
    Math.round((c[2] + (g - c[2]) * k) * (1 - dark)),
  ];
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
