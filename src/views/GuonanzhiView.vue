<template>
  <div class="gnz-l1">
    <canvas ref="canvasRef" class="g-map"></canvas>

    <!-- 加载序幕 -->
    <div v-if="!ready" class="g-veil">
      <div class="g-veil-inner">
        <div class="g-veil-title">国 男 志</div>
        <div class="g-veil-sub">东亚 · 群雄逐鹿十三城</div>
        <div class="g-veil-barbox"><div class="g-veil-bar" :style="{ width: progressPct + '%' }"></div></div>
        <div class="g-veil-text">{{ progressLabel }}</div>
      </div>
    </div>

    <!-- 顶部题匾 -->
    <header class="g-topbar">
      <div class="g-plaque">
        <span class="g-seal">國男志</span>
        <span class="g-divider"></span>
        <span class="g-title">战略大地图 · L1</span>
      </div>
      <div class="g-factions">
        <span v-for="f in factionChips" :key="f.name" class="g-fac" :style="{ '--fc': f.color }">{{ f.label }}</span>
      </div>
    </header>

    <!-- 右下控件 -->
    <div class="g-ctrl">
      <button title="放大" @click="engine?.controls.zoom(1.3)">＋</button>
      <button title="缩小" @click="engine?.controls.zoom(1 / 1.3)">－</button>
      <button class="g-fit" title="全景" @click="engine?.controls.fit()">全景</button>
    </div>

    <!-- 左下图例 -->
    <div class="g-legend">
      <div class="g-lg-title">由外及里 · 点击城市进入</div>
      <div class="g-lg-row"><i class="g-ls land"></i>内陆邻接</div>
      <div class="g-lg-row"><i class="g-ls sea"></i>跨海登陆</div>
      <div class="g-lg-row"><i class="g-ls fake"></i>架空直连</div>
      <div class="g-lg-row"><i class="g-ls ocean"></i>远洋航线</div>
    </div>

    <!-- 城市面板（内容由引擎填充） -->
    <aside ref="panelRef" class="g-panel"></aside>

    <!-- 悬浮提示 -->
    <div ref="tooltipRef" class="g-tooltip"></div>
  </div>
</template>

<script setup>
// 国男志 R-059 · L1 战略大地图（手绘雏形）
// 引擎本体在 src/guonanzhi/l1/（纯 Canvas，Vue 只做挂载/卸载壳）
import { onBeforeUnmount, onMounted, ref } from "vue";
import { mountL1 } from "../guonanzhi/l1/main.js";
import "./../guonanzhi/l1/l1.css";

const canvasRef = ref(null);
const panelRef = ref(null);
const tooltipRef = ref(null);
const ready = ref(false);
const progressPct = ref(0);
const progressLabel = ref("铺陈沧海…");
const engine = ref(null);

const factionChips = [
  { name: "CN", color: "#d8564e", label: "中国 6城" },
  { name: "JP", color: "#e0913c", label: "日本 3城" },
  { name: "KR", color: "#4f9fd8", label: "韩国 2城" },
  { name: "AU", color: "#5fbf7f", label: "澳洲 2城" },
];

let dispose = null;

onMounted(() => {
  dispose = mountL1({
    canvas: canvasRef.value,
    tooltip: tooltipRef.value,
    panel: panelRef.value,
    onProgress: p => {
      progressPct.value = Math.round(p * 100);
      progressLabel.value = p < 0.42 ? "铺陈沧海…" : p < 0.6 ? "皴染山川…" : p < 0.84 ? "落笔城郭…" : "钤印题跋…";
    },
    onReady: stats => {
      ready.value = true;
      // 资源数据采集口（控制台可查；正式版接入性能面板）
      console.info("[gnz-l1] ready", stats);
    },
  });
  engine.value = dispose;
  window.__gnzL1 = dispose; // 自动化测试/资源采集句柄
});

onBeforeUnmount(() => {
  dispose?.dispose();
  dispose = null;
  delete window.__gnzL1;
});
</script>
