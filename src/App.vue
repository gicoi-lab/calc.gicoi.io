<script setup>
import { ref, computed, watch } from 'vue'
import { MARGINS, breakeven, svcFixed, ntd, profit, signedNtd } from './calc.js'

// 輸入值存在 localStorage；隱私模式等無法存取時退回預設值
const defaults = []
const saved = (key, init) => {
  const init0 = init
  try {
    const s = localStorage.getItem('calc:' + key)
    if (s !== null) init = JSON.parse(s)
  } catch {}
  const r = ref(init)
  defaults.push([r, init0])
  watch(r, v => {
    try { localStorage.setItem('calc:' + key, JSON.stringify(v)) } catch {}
  }, { deep: true })
  return r
}

const svc = saved('svc', 'both')
const year = saved('year', 'y1')
const opex = saved('opex', 6)
const feePct = saved('feePct', '2.5')
const mode = saved('mode', 'margin')
const marginPct = saved('marginPct', 30)
const cost = saved('cost', 700)
const price = saved('price', 1000)
const revenue = saved('revenue', 30) // 萬
const revYearly = saved('revYearly', false)
// 營運成本分項（萬，單位同 opex）
const OPEX_ITEMS = ['房租', '水電', '人事', '網路', '記帳', '系統服務（訂閱）', '廣告行銷', '其他']
const opexSplit = saved('opexSplit', false)
const opexParts = saved('opexParts', Object.fromEntries(OPEX_ITEMS.map(k => [k, 0])))
const partsSum = () => Math.round(OPEX_ITEMS.reduce((a, k) => a + (+opexParts.value[k] || 0), 0) * 100) / 100
const opexTotal = computed(() => (opexSplit.value ? partsSum() : +opex.value || 0))
// 展開時若分項全空，先把原總額放進「其他」；收合時總額帶回單一欄位
const toggleSplit = () => {
  if (opexSplit.value) opex.value = partsSum()
  else if (!partsSum()) opexParts.value['其他'] = +opex.value || 0
  opexSplit.value = !opexSplit.value
}
const reset = () => defaults.forEach(([r, d]) => (r.value = structuredClone(d)))

// 營業額與營運成本共用年／月單位（萬）
const perYear = computed(() => (revYearly.value ? 1 : 12))
const annualRev = computed(() => (+revenue.value || 0) * 10000 * perYear.value)
const unit = computed(() => (revYearly.value ? '年' : '月'))
// 切換年／月時換算數值，維持同一個營業規模
const setRevYearly = y => {
  if (y === revYearly.value) return
  const k = y ? 12 : 1 / 12
  revenue.value = Math.round((+revenue.value || 0) * k * 100) / 100
  opex.value = Math.round((+opex.value || 0) * k * 100) / 100
  for (const n of OPEX_ITEMS) opexParts.value[n] = Math.round((+opexParts.value[n] || 0) * k * 100) / 100
  revYearly.value = y
}

const isM = computed(() => mode.value === 'margin')
const none = computed(() => svc.value === 'none')
const invOnly = computed(() => svc.value === 'inv' || none.value) // 沒走線上金流：無手續費
const base = computed(() => svcFixed(year.value, svc.value))
const F = computed(() => base.value + opexTotal.value * 10000 * perYear.value)
const fee = computed(() => (invOnly.value ? 0 : +feePct.value / 100))
const m = computed(() =>
  isM.value ? marginPct.value / 100 : price.value > 0 ? (price.value - cost.value) / price.value : 0
)
const R = computed(() => breakeven(m.value, fee.value, F.value))
const P = computed(() => profit(annualRev.value, m.value, fee.value, F.value))
const units = computed(() =>
  isFinite(R.value) && price.value > 0 ? Math.ceil(R.value / price.value).toLocaleString() + ' 件' : '—'
)
const rows = computed(() =>
  MARGINS.map(p => {
    const r = breakeven(p / 100, fee.value, F.value)
    return { p, r, share: isFinite(r) ? ((fee.value + base.value / r) * 100).toFixed(1) + '%' : '—' }
  })
)
</script>

<template>
  <main>
    <div class="head">
      <h1 class="brand"><img src="/favicon-192.png" alt="" width="52" height="52"><span>開店損益試算<span class="colon">：</span><small>營業額要做多少才賺錢</small></span></h1>
      <button class="reset" @click="reset">重設為預設值</button>
    </div>
    <p class="sub">輸入營運成本、毛利率與預估營業額，算出損益平衡點與獲利。可加入線上金流與電子發票費用（2026/11/04 費率，未稅）。</p>

    <div class="card">
      <h2>固定成本</h2>
      <div class="grid">
        <div>
          <label for="svc">採用服務</label>
          <select id="svc" v-model="svc">
            <option value="both">電子發票＆金流</option>
            <option value="pay">僅金流</option>
            <option value="inv">僅電子發票</option>
            <option value="none">無（純營運試算）</option>
          </select>
        </div>
        <div>
          <label for="year">計算年度</label>
          <select id="year" v-model="year" :disabled="none">
            <option value="y1">第一年（含導入費／設定費）</option>
            <option value="y2">第二年起</option>
          </select>
        </div>
        <div>
          <label for="fee">平均交易手續費率 %</label>
          <select id="fee" v-model="feePct" :disabled="invOnly">
            <option value="2.5">2.5（國內信用卡／Apple Pay／街口）</option>
            <option value="2.51">2.51（LINE Pay 含閘道費）</option>
            <option value="3.5">3.5（國外信用卡）</option>
            <option value="1">1（WebATM／虛擬帳號，每筆最低 15 元）</option>
          </select>
        </div>
        <div>
          <label for="opex">營運成本（萬／{{ unit }}）
            <button class="reset split" @click="toggleSplit">{{ opexSplit ? '合併算' : '分開算' }}</button>
          </label>
          <input v-if="opexSplit" id="opex" :value="opexTotal" type="number" readonly>
          <input v-else id="opex" v-model.number="opex" type="number" min="0" step="1">
        </div>
        <div v-if="opexSplit" class="grid parts">
          <div v-for="n in OPEX_ITEMS" :key="n">
            <label :for="'opex-' + n">{{ n }}</label>
            <input :id="'opex-' + n" v-model.number="opexParts[n]" type="number" min="0" step="0.1">
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="cols">
        <div>
          <h2>試算模式</h2>
          <div class="seg">
            <button :class="{ on: isM }" @click="mode = 'margin'">毛利率</button>
            <button :class="{ on: !isM }" @click="mode = 'item'">商品服務</button>
          </div>
          <div v-if="isM" class="grid">
            <div>
              <label for="margin">商品服務毛利率 %</label>
              <select id="margin" v-model.number="marginPct">
                <option v-for="p in MARGINS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
          <div v-else class="grid">
            <div>
              <label for="cost">商品服務成本（元／件）</label>
              <input id="cost" v-model.number="cost" type="number" min="0" step="1">
            </div>
            <div>
              <label for="price">商品服務單價（元／件）</label>
              <input id="price" v-model.number="price" type="number" min="0" step="1">
            </div>
          </div>
        </div>
        <div>
          <h2>估算營業額</h2>
          <div class="seg">
            <button :class="{ on: revYearly }" @click="setRevYearly(true)">年營業額</button>
            <button :class="{ on: !revYearly }" @click="setRevYearly(false)">月營業額</button>
          </div>
          <label for="revenue">預估{{ unit }}營業額（萬／{{ unit }}）</label>
          <input id="revenue" v-model.number="revenue" type="number" min="0" step="1">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="cols">
        <div>
          <h2>目標損益平衡營業額</h2>
          <div class="big">{{ ntd(R) }}</div>
        </div>
        <div>
          <h2>預估獲利</h2>
          <div class="big" :class="{ loss: P < 0 }">{{ signedNtd(P) }}</div>
          <p class="note">以年營業額 {{ ntd(annualRev) }}（月 {{ ntd(annualRev / 12) }}）計，<br/>每月約 {{ signedNtd(P / 12) }}</p>
        </div>
      </div>
      <div class="kv" style="margin-top:12px">
        <div><b>每月營業額（損益平衡）</b><span>{{ ntd(R / 12) }}</span></div>
        <div><b>毛利率</b><span>{{ (m * 100).toFixed(1) }}%</span></div>
        <div><b>年固定成本（金流發票＋營運）</b><span>{{ ntd(F) }}</span></div>
        <div v-if="!none"><b>金流發票固定費／年</b><span>{{ ntd(base) }}</span></div>
        <div v-if="!isM"><b>需賣出件數／年</b><span>{{ units }}</span></div>
      </div>
      <p class="note">
        <span v-if="m <= fee" class="warn">毛利率必須高於手續費率 {{ fee * 100 }}%，否則每賣一筆都虧，無法損益平衡。</span>
        <template v-else-if="none">未使用金流與電子發票；毛利全部用來攤營運成本。</template>
        <template v-else-if="invOnly">未走線上金流，沒有每筆手續費；毛利全部用來攤固定成本。</template>
        <template v-else>每筆交易先扣 {{ fee * 100 }}% 手續費，剩下 {{ ((m - fee) * 100).toFixed(2) }}% 用來攤固定成本。</template>
      </p>
    </div>

    <div class="card">
      <h2>毛利率對照（同一組固定成本與手續費率）</h2>
      <table>
        <thead><tr><th>毛利率</th><th>年營業額</th><th>月營業額</th><th v-if="!none">金流發票費用佔營收</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.p" :class="{ pick: isM && row.p === marginPct }">
            <td>{{ row.p }}%</td><td>{{ ntd(row.r) }}</td><td>{{ ntd(row.r / 12) }}</td><td v-if="!none">{{ row.share }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">公式：損益平衡營業額 =（金流發票固定費 + 營運成本）÷（毛利率 − 交易手續費率）。未含 5% 營業稅；可扣抵進項者以未稅計。</p>
    </div>
    <footer class="foot">
      <span>＊ Powered by <a href="https://gicoi.io" target="_blank" rel="noopener">GICOI.IO</a></span>
      <span class="foot-meta">
        <span>Made with ☕️ and ❤️</span>
        <a class="reset issue" href="https://github.com/gicoi-lab/calc.gicoi.io/issues" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.060 8.060 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.830 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.680 9.680 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.370 0 9.760 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.060 9.060 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/></svg>
          提出 Issue
        </a>
      </span>
    </footer>
  </main>
</template>
