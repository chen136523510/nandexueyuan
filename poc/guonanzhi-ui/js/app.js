// 国男志 UI 雏形 · 深圳首城 · Vue 应用（假逻辑）
const { createApp } = Vue;

// ---- 地形查找表 ----
const terrainAt = (() => {
  const map = {};
  // 海：y=10,11 全行
  for (let y = 10; y <= 11; y++) for (let x = 0; x <= 11; x++) {
    const west = x <= 5;
    map[x + ',' + y] = { type: 'sea', name: west ? '伶仃洋' : '深圳湾', tip: west ? SEA_TIPS.west : SEA_TIPS.east };
  }
  TERRAIN.river.cells.forEach(([x, y]) => { map[x + ',' + y] = { type: 'river', name: '深圳河', tip: RIVER_TIP }; });
  TERRAIN.mountain.forEach(m => m.cells.forEach(([x, y]) => { map[x + ',' + y] = { type: 'mountain', name: m.name, tip: MOUNTAIN_TIPS[m.name] }; }));
  TERRAIN.hill.forEach(h => h.cells.forEach(([x, y]) => { map[x + ',' + y] = { type: 'hill', name: h.name, tip: HILL_TIPS[h.name] }; }));
  return (x, y) => map[x + ',' + y] || null;
})();

const OUTER_TIP = '边界外土地——城市发育后可扩张（雏形仅示意）';
const catById = id => id === 'gov' ? GOV : CATALOG.find(c => c.id === id);

const app = createApp({
  data() {
    return {
      CAT_COLORS,
      turn: 1,
      stocks: { ...CITY.stocks },
      buildings: CITY.initialBuildings.map((b, i) => ({
        uid: i + 1, catId: b.catId, x: b.x, y: b.y,
        status: 'done', remaining: 0, total: 0, builtTurn: 0,
      })),
      nextUid: 5,
      gridOn: true, panelOpen: true, activeTab: 'base',
      placingCatId: null, hoverCell: null, hoverBldUid: null,
      modal: null,            // {type:'preview',catId,x,y} | {type:'detail',uid} | {type:'gov'}
      confirmDel: false,      // 拆除二次确认
      toast: '', toastTimer: null,
      tip: null,              // {text,left,top}
      flashKeys: [],
    };
  },
  computed: {
    cells() {
      const out = [];
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
        const t = terrainAt(x, y);
        const inner = x >= INNER[0] && x <= INNER[1] && y >= INNER[0] && y <= INNER[1];
        let tip = t ? t.tip : (inner ? null : OUTER_TIP);
        out.push({ x, y, inner, terrain: t, tip, cls: [inner ? 'inner' : 'outer', t ? t.type : ''] });
      }
      return out;
    },
    placingCat() { return this.placingCatId ? catById(this.placingCatId) : null; },
    flows() {
      const f = { prod: CITY.baseFlow.prod, tech: CITY.baseFlow.tech };
      this.buildings.filter(b => b.status === 'done').forEach(b => {
        const y = catById(b.catId).yields || {};
        f.prod += y.prod || 0; f.tech += y.tech || 0;
      });
      return f;
    },
    ghost() {
      if (!this.placingCat || !this.hoverCell) return null;
      const c = this.placingCat, { x, y } = this.hoverCell;
      return { x, y, w: c.w, h: c.h, valid: this.validPlace(x, y, c.w, c.h) };
    },
    coverCircle() {
      let src = null;
      if (this.modal && this.modal.type === 'preview') {
        const c = catById(this.modal.catId);
        if (c.cover > 0) src = { x: this.modal.x, y: this.modal.y, w: c.w, h: c.h, cover: c.cover };
      } else if (this.hoverBldUid && !this.placingCatId) {
        const b = this.buildings.find(v => v.uid === this.hoverBldUid);
        const c = b && catById(b.catId);
        if (c && c.cover > 0 && b.status === 'done') src = { x: b.x, y: b.y, w: c.w, h: c.h, cover: c.cover };
      }
      if (!src) return null;
      const cx = (src.x + src.w / 2) * CELL, cy = (src.y + src.h / 2) * CELL, r = src.cover * CELL;
      return { left: cx - r, top: cy - r, size: r * 2 };
    },
    tabCards() {
      if (this.activeTab === 'base') return [[null, CATALOG.filter(c => c.cat === 'base')]];
      if (this.activeTab === 'ind') return [
        ['重工业', CATALOG.filter(c => c.cat === 'heavy')],
        ['高新技术', CATALOG.filter(c => c.cat === 'hi')],
        ['能源', CATALOG.filter(c => c.cat === 'energy')],
        ['轻工业', CATALOG.filter(c => c.cat === 'light')],
      ];
      if (this.activeTab === 'ent') return [[null, CATALOG.filter(c => c.cat === 'ent')]];
      return [[null, CATALOG.filter(c => c.cat === 'res')]];
    },
    msgBar() {
      if (this.toast) return { text: this.toast, cls: 'toast' };
      if (this.placingCat) return { text: `放置模式：${this.placingCat.name}——点击开发区内空地放置，右键 / Esc 取消`, cls: 'toast' };
      return { text: '点击建筑查看详情 · 在右侧目录选卡进入放置模式', cls: '' };
    },
  },
  methods: {
    catById,
    px: v => v * CELL,
    bldStyle(b) {
      const c = catById(b.catId);
      return {
        left: this.px(b.x) + 'px', top: this.px(b.y) + 'px',
        width: this.px(c.w) + 'px', height: this.px(c.h) + 'px',
        background: c.color,
      };
    },
    validPlace(x, y, w, h) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (xx < INNER[0] || xx > INNER[1] || yy < INNER[0] || yy > INNER[1]) return false;
        if (terrainAt(xx, yy)) return false;
        if (this.buildings.some(b => xx >= b.x && xx < b.x + catById(b.catId).w && yy >= b.y && yy < b.y + catById(b.catId).h)) return false;
      }
      return true;
    },
    lockedCard(c) { return !!c.limit && c.limit.indexOf('深圳') < 0; },
    limitText(c) {
      if (c.limit) return '限定：' + c.limit;
      if (c.coastal) return '沿海限定·深圳✓';
      return null;
    },
    selectCard(c) {
      if (this.lockedCard(c)) { this.showToast(`「${c.name}」不在深圳可建范围（${c.limit}）`); return; }
      this.placingCatId = this.placingCatId === c.id ? null : c.id;
    },
    cellEnter(cell, e) {
      this.hoverCell = { x: cell.x, y: cell.y };
      if (cell.tip) this.showTip(cell.tip, e);
    },
    cellClick(cell) {
      if (!this.placingCat) return;
      const c = this.placingCat;
      if (!this.validPlace(cell.x, cell.y, c.w, c.h)) { this.showToast('此处不可放置'); return; }
      this.modal = { type: 'preview', catId: c.id, x: cell.x, y: cell.y };
      this.confirmDel = false;
      // 资源条受影响 chip 闪烁一次
      const keys = Object.keys(c.yields || {}).filter(k => ['gold', 'food', 'energy', 'prod', 'tech'].includes(k));
      this.flashKeys = keys; setTimeout(() => { this.flashKeys = []; }, 1200);
    },
    previewInfo() {
      const c = catById(this.modal.catId);
      return {
        cat: c,
        size: `${c.w}×${c.h}`,
        cost: `金 ${c.gold} · 生产资料 ${c.mat}`,
        turns: `${c.turns} 回合`,
        list: (c.out || '').split('·').map(s => s.trim()).filter(Boolean),
        cover: c.cover > 0 ? `半径 ${c.cover} 格` : '—',
        deficitGold: Math.max(0, c.gold - this.stocks.gold),
        deficitMat: Math.max(0, c.mat - this.stocks.mat),
      };
    },
    confirmBuild() {
      const m = this.modal, c = catById(m.catId);
      if (this.stocks.gold < c.gold || this.stocks.mat < c.mat) return;
      this.stocks.gold -= c.gold; this.stocks.mat -= c.mat;
      this.buildings.push({
        uid: this.nextUid++, catId: c.id, x: m.x, y: m.y,
        status: 'building', remaining: c.turns, total: c.turns, builtTurn: null,
      });
      this.showToast(`已开始建造：${c.name}（${c.turns} 回合）`);
      this.modal = null; this.placingCatId = null;
    },
    bldClick(b) {
      if (this.placingCatId) { this.showToast('此处不可放置'); return; }
      this.confirmDel = false;
      this.modal = b.catId === 'gov' ? { type: 'gov' } : { type: 'detail', uid: b.uid };
    },
    detailB() { return this.buildings.find(b => b.uid === this.modal.uid); },
    statusText(b) {
      if (b.status === 'building') return `建造中 ${b.total - b.remaining}/${b.total} 回合`;
      if (b.status === 'paused') return `停工（进度保留 ${b.total - b.remaining}/${b.total}）`;
      return '已建成';
    },
    refund(b) {
      const c = catById(b.catId);
      if (b.status === 'done' && b.builtTurn === this.turn) return { gold: c.gold, mat: c.mat, full: true };
      return { gold: c.gold, mat: Math.floor(c.mat * 0.9), full: false };
    },
    refundTip(b) {
      const r = this.refund(b);
      return r.full
        ? `无损拆除：全额返还 金 ${r.gold} · 生产资料 ${r.mat}`
        : `返还 金 ${r.gold} · 生产资料 ${r.mat}（9 成）`;
    },
    doDemolish(b) {
      if (!this.confirmDel) { this.confirmDel = true; return; }
      const r = this.refund(b);
      this.stocks.gold += r.gold; this.stocks.mat += r.mat;
      this.buildings = this.buildings.filter(v => v.uid !== b.uid);
      this.showToast(`已拆除 ${catById(b.catId).name}：返还 金 ${r.gold} · 生产资料 ${r.mat}`);
      this.modal = null;
    },
    pauseB(b) { b.status = 'paused'; this.modal = null; this.showToast('已停工（进度保留，可随时复工）'); },
    resumeB(b) { b.status = 'building'; this.modal = null; this.showToast('已复工'); },
    nextTurn() {
      this.turn++;
      this.buildings.forEach(b => {
        if (b.status === 'building') {
          b.remaining--;
          if (b.remaining <= 0) { b.status = 'done'; b.builtTurn = this.turn; this.showToast(`${catById(b.catId).name} 建成`); }
        }
      });
      let food = 0, gold = 0, energy = 0;
      this.buildings.filter(b => b.status === 'done').forEach(b => {
        const y = catById(b.catId).yields || {};
        food += y.food || 0; gold += y.gold || 0; energy += y.energy || 0;
      });
      this.stocks.food += food; this.stocks.gold += gold; this.stocks.energy += energy;
    },
    toggleGrid() { this.gridOn = !this.gridOn; },
    backToMap() { this.showToast('L1 大地图不在本雏形范围'); },
    showToast(t) {
      this.toast = t; clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toast = ''; }, 2600);
    },
    showTip(text, e) {
      const x = Math.min(e.clientX + 14, window.innerWidth - 280);
      this.tip = { text, left: x + 'px', top: (e.clientY + 16) + 'px' };
    },
    hideTip() { this.tip = null; },
    closeModal() { this.modal = null; this.confirmDel = false; },
    chipFlash(key) { return this.flashKeys.includes(key); },
  },
  mounted() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.placingCatId = null; this.closeModal(); this.hideTip(); }
    });
  },
  template: `
<div id="app">
  <!-- 顶栏 HUD -->
  <div class="hud">
    <div class="faction-badge">CN</div>
    <div class="city-title"><div class="name">深圳</div><div class="sub">商业/工业 · 玩家老家</div></div>
    <select class="city-select">
      <option v-for="c in ['深圳'].concat(['北京','上海','西安','香港','台北','东京','名古屋','长崎','首尔','仁川','悉尼','墨尔本'])"
              :key="c" :value="c" :disabled="c!=='深圳'">{{ c }}{{ c!=='深圳' ? '（未开发·试点首城）' : '' }}</option>
    </select>
    <div class="res-bar">
      <div class="chip" :class="{flash:chipFlash('gold')}">💰 金 <b>{{ stocks.gold }}</b></div>
      <div class="chip" :class="{flash:chipFlash('food')}">🌾 粮 <b>{{ stocks.food }}</b></div>
      <div class="chip">🎖️ 军力 <b>{{ stocks.mil }}</b></div>
      <div class="chip" :class="{flash:chipFlash('energy')}">⚡ 能源 <b>{{ stocks.energy }}</b></div>
      <div class="chip">📦 生产资料 <b>{{ stocks.mat }}</b></div>
      <div class="chip flow" :class="{flash:chipFlash('prod')}">🔨 生产力 <b>+{{ flows.prod }}/回</b></div>
      <div class="chip flow" :class="{flash:chipFlash('tech')}">🔬 科技值 <b>+{{ flows.tech }}/回</b></div>
    </div>
    <div class="turn-box">回合 <b style="color:#ffd700">{{ turn }}</b></div>
    <button class="btn" @click="nextTurn">下一回合 ▶</button>
    <button class="btn ghost" :class="{on:gridOn}" @click="toggleGrid">👁 网格</button>
    <button class="btn ghost" @click="backToMap">返回大地图</button>
  </div>

  <!-- 主区 -->
  <div class="main">
    <div class="stage">
      <div class="board" :class="{'no-grid':!gridOn}" @contextmenu.prevent="placingCatId=null"
           @mouseleave="hoverCell=null;hoverBldUid=null">
        <div v-for="cell in cells" :key="cell.x+'-'+cell.y" class="cell"
             :class="cell.cls" :style="{left:px(cell.x)+'px',top:px(cell.y)+'px'}"
             @mouseenter="cellEnter(cell,$event)" @mouseleave="hideTip" @click="cellClick(cell)">
          <template v-if="cell.terrain">
            <span v-if="cell.terrain.type==='mountain'">⛰️</span>
            <span v-else-if="cell.terrain.type==='hill'" style="font-size:13px;opacity:.8">⛰️</span>
          </template>
        </div>
        <!-- 海面/河流标注 -->
        <div class="sea-label" :style="{left:'0px',top:'462px',width:px(6)+'px'}">伶仃洋 · 珠江口</div>
        <div class="sea-label" :style="{left:px(6)+'px',top:'462px',width:px(6)+'px'}">深 圳 湾</div>
        <div class="river-label" :style="{left:'450px',top:'100px',height:px(8)+'px'}">深 圳 河</div>
        <!-- 覆盖圈 -->
        <div v-if="coverCircle" class="cover-circle"
             :style="{left:coverCircle.left+'px',top:coverCircle.top+'px',width:coverCircle.size+'px',height:coverCircle.size+'px'}"></div>
        <!-- 幽灵建筑（放置模式） -->
        <div v-if="ghost" class="ghost" :class="ghost.valid?'ok':'bad'"
             :style="{left:px(ghost.x)+'px',top:px(ghost.y)+'px',width:px(ghost.w)+'px',height:px(ghost.h)+'px'}"></div>
        <!-- 建筑 -->
        <div v-for="b in buildings" :key="b.uid" class="bld" :class="[b.catId==='gov'?'gov':'', b.status]"
             :style="bldStyle(b)" :data-tip="b.catId==='gov'?'市政府——城市核心/占领判定锚点':null"
             @mouseenter="hoverBldUid=b.uid" @mouseleave="hoverBldUid=null" @click="bldClick(b)">
          <template v-if="b.catId==='gov'">
            <div class="hpbar"><i></i></div>
            <span class="icon">🏛️</span><span class="bname">市政府</span>
          </template>
          <template v-else>
            <template v-if="b.status==='building'">
              <span class="icon">{{ catById(b.catId).icon }}</span>
              <span class="bname">{{ catById(b.catId).name }}</span>
              <div class="prog" :style="{width:((b.total-b.remaining)/b.total*100)+'%'}"></div>
              <span class="prog-label">{{ b.total-b.remaining }}/{{ b.total }}</span>
            </template>
            <template v-else-if="b.status==='paused'">
              <span class="paused-tag">停工</span>
              <span class="icon">{{ catById(b.catId).icon }}</span>
              <span class="bname">{{ catById(b.catId).name }}</span>
            </template>
            <template v-else>
              <span class="icon">{{ catById(b.catId).icon }}</span>
              <span class="bname">{{ catById(b.catId).name }}</span>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 右侧建造面板 -->
    <div class="panel" :class="{closed:!panelOpen}">
      <div class="panel-head">
        <span class="t">建造</span>
        <button class="btn ghost small" @click="panelOpen=!panelOpen">{{ panelOpen ? '收起 »' : '« 展开' }}</button>
      </div>
      <div class="tabs">
        <div v-for="t in [{k:'base',l:'基础'},{k:'ind',l:'产业'},{k:'ent',l:'娱乐'},{k:'res',l:'居民楼'}]"
             :key="t.k" class="tab" :class="{active:activeTab===t.k}" @click="activeTab=t.k">{{ t.l }}</div>
      </div>
      <div class="cards">
        <template v-for="([g, list]) in tabCards">
          <div v-if="g" class="group-title">{{ g }}</div>
          <div v-for="c in list" :key="c.id" class="card"
               :class="{locked:lockedCard(c), selected:placingCatId===c.id}" @click="selectCard(c)"
               @mouseenter="c.limit||c.coastal ? showTip(limitText(c),$event) : null" @mouseleave="hideTip">
            <span class="cicon">{{ c.icon }}</span>
            <div class="cinfo">
              <div class="cname"><i class="cat-dot" :style="{background:CAT_COLORS[c.cat]}"></i>{{ c.name }}</div>
              <div class="cline">占地 {{ c.w }}×{{ c.h }} · 金 {{ c.gold }} · 资料 {{ c.mat }} · {{ c.turns }} 回合</div>
              <div class="cline">{{ c.out }}<template v-if="c.cover"> · 覆盖 {{ c.cover }} 格</template></div>
            </div>
            <span v-if="lockedCard(c)" class="lock-tag">限定：{{ c.limit }}</span>
            <span v-else-if="c.badge" class="badge-tag">{{ c.badge }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- 底部消息条 -->
  <div class="msgbar" :class="msgBar.cls">💡 {{ msgBar.text }}</div>

  <!-- 弹窗：建造预览 -->
  <div v-if="modal && modal.type==='preview'" class="mask" @click.self="closeModal">
    <div class="modal">
      <h3>{{ previewInfo().cat.icon }} {{ previewInfo().cat.name }} · 建造预览</h3>
      <div class="mrow"><span>占地</span><span>{{ previewInfo().size }}</span></div>
      <div class="mrow"><span>造价</span><span>{{ previewInfo().cost }}</span></div>
      <div class="mrow"><span>建造周期</span><span>{{ previewInfo().turns }}</span></div>
      <div class="mrow"><span>生效范围</span><span>{{ previewInfo().cover }}</span></div>
      <div class="mlist">
        <li v-for="(it,i) in previewInfo().list" :key="i">{{ it }}</li>
      </div>
      <div v-if="previewInfo().deficitGold>0 || previewInfo().deficitMat>0" class="deficit">
        资源不足：<template v-if="previewInfo().deficitGold>0">金不足 {{ previewInfo().deficitGold }} </template>
        <template v-if="previewInfo().deficitMat>0">· 生产资料不足 {{ previewInfo().deficitMat }}</template>
      </div>
      <div class="mfoot">
        <button class="btn ghost" @click="closeModal">取消</button>
        <button class="btn" :disabled="previewInfo().deficitGold>0 || previewInfo().deficitMat>0" @click="confirmBuild">确认建造</button>
      </div>
    </div>
  </div>

  <!-- 弹窗：建筑详情（拆除三分法） -->
  <div v-if="modal && modal.type==='detail' && detailB()" class="mask" @click.self="closeModal">
    <div class="modal">
      <h3>{{ catById(detailB().catId).icon }} {{ catById(detailB().catId).name }}</h3>
      <div class="status-line">{{ statusText(detailB()) }}</div>
      <div class="mrow"><span>占地</span><span>{{ catById(detailB().catId).w }}×{{ catById(detailB().catId).h }}</span></div>
      <div class="mrow"><span>产出/效果</span><span>{{ catById(detailB().catId).out }}</span></div>
      <div class="mrow"><span>生效范围</span><span>{{ catById(detailB().catId).cover>0 ? '半径 '+catById(detailB().catId).cover+' 格' : '—' }}</span></div>
      <div class="mfoot">
        <template v-if="detailB().status==='building'">
          <button class="btn ghost" @click="pauseB(detailB())">停工</button>
          <button class="btn ghost" :data-tip="refundTip(detailB())" @mouseenter="showTip(refundTip(detailB()),$event)" @mouseleave="hideTip"
                  @click="doDemolish(detailB())">{{ confirmDel ? '确认拆除？' : '拆除' }}</button>
        </template>
        <template v-else-if="detailB().status==='paused'">
          <button class="btn ghost" @click="resumeB(detailB())">复工</button>
          <button class="btn ghost" @mouseenter="showTip(refundTip(detailB()),$event)" @mouseleave="hideTip"
                  @click="doDemolish(detailB())">{{ confirmDel ? '确认拆除？' : '拆除' }}</button>
        </template>
        <template v-else>
          <button class="btn ghost" @mouseenter="showTip(refundTip(detailB()),$event)" @mouseleave="hideTip"
                  @click="doDemolish(detailB())">{{ confirmDel ? '确认拆除？' : (detailB().builtTurn===turn ? '拆除（本回合无损）' : '拆除') }}</button>
        </template>
      </div>
    </div>
  </div>

  <!-- 弹窗：市政府 -->
  <div v-if="modal && modal.type==='gov'" class="mask" @click.self="closeModal">
    <div class="modal">
      <h3>🏛️ 市政府</h3>
      <div class="hp-big"><i></i></div>
      <div class="mrow"><span>血条</span><span>100%</span></div>
      <div class="gov-note">城市核心 / 占领判定锚点——战斗中血条清零 + 陆战驻留占领才破城（R13 机制，雏形仅展示）。不可拆除。</div>
      <div class="mfoot"><button class="btn ghost" @click="closeModal">关闭</button></div>
    </div>
  </div>

  <!-- tooltip -->
  <div v-if="tip" class="tipbox" :style="{left:tip.left, top:tip.top}">{{ tip.text }}</div>
</div>
`,
});
const vm = app.mount('#app');
window.__vm = vm;  // 调试手柄：浏览器控制台可直接改假数据（雏形专用）
