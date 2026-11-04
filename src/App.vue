<script setup>
import { ref, computed } from 'vue'
import { MARGINS, breakeven, svcFixed, ntd, profit, signedNtd } from './calc.js'

const svc = ref('both')
const year = ref('y1')
const opex = ref(0)
const feePct = ref('2.5')
const mode = ref('margin')
const marginPct = ref(30)
const cost = ref(700)
const price = ref(1000)
const revenue = ref(10) // 萬／月

const isM = computed(() => mode.value === 'margin')
const invOnly = computed(() => svc.value === 'inv')
const base = computed(() => svcFixed(year.value, svc.value))
const F = computed(() => base.value + (+opex.value || 0) * 10000)
const fee = computed(() => (invOnly.value ? 0 : +feePct.value / 100))
const m = computed(() =>
  isM.value ? marginPct.value / 100 : price.value > 0 ? (price.value - cost.value) / price.value : 0
)
const R = computed(() => breakeven(m.value, fee.value, F.value))
const P = computed(() => profit((+revenue.value || 0) * 10000 * 12, m.value, fee.value, F.value))
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
    <h1>線上金流＋電子發票：損益兩平試算</h1>
    <p class="sub">費率依 2026/11/04 金流商公版報價單（未稅）。每筆交易都走線上金流並開立電子發票。</p>

    <div class="card">
      <h2>固定成本</h2>
      <div class="grid">
        <div>
          <label for="svc">採用服務</label>
          <select id="svc" v-model="svc">
            <option value="both">電子發票＆金流</option>
            <option value="pay">僅金流</option>
            <option value="inv">僅電子發票</option>
          </select>
        </div>
        <div>
          <label for="year">計算年度</label>
          <select id="year" v-model="year">
            <option value="y1">第一年（含導入費／設定費）</option>
            <option value="y2">第二年起</option>
          </select>
        </div>
        <div>
          <label for="opex">營運成本（水電、房租、人事薪資）萬／年</label>
          <input id="opex" v-model.number="opex" type="number" min="0" step="1">
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
          <label for="revenue">預估月營業額（萬／月）</label>
          <input id="revenue" v-model.number="revenue" type="number" min="0" step="1">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="cols">
        <div>
          <h2>目標損益兩平營業額</h2>
          <div class="big">{{ ntd(R) }}</div>
        </div>
        <div>
          <h2>獲利</h2>
          <div class="big" :class="{ loss: P < 0 }">{{ signedNtd(P) }}</div>
          <p class="note">以月營業額 {{ ntd((+revenue || 0) * 10000) }} 計（年 {{ ntd((+revenue || 0) * 120000) }}），每月約 {{ signedNtd(P / 12) }}</p>
        </div>
      </div>
      <div class="kv" style="margin-top:12px">
        <div><b>每月營業額</b><span>{{ ntd(R / 12) }}</span></div>
        <div><b>實際毛利率</b><span>{{ (m * 100).toFixed(1) }}%</span></div>
        <div><b>年固定成本（金流發票＋營運）</b><span>{{ ntd(F) }}</span></div>
        <div><b>金流發票固定費／年</b><span>{{ ntd(base) }}</span></div>
        <div v-if="!isM"><b>需賣出件數／年</b><span>{{ units }}</span></div>
      </div>
      <p class="note">
        <span v-if="m <= fee" class="warn">毛利率必須高於手續費率 {{ fee * 100 }}%，否則每賣一筆都虧，無法損益兩平。</span>
        <template v-else-if="invOnly">未走線上金流，沒有每筆手續費；毛利全部用來攤固定成本。</template>
        <template v-else>每筆交易先扣 {{ fee * 100 }}% 手續費，剩下 {{ ((m - fee) * 100).toFixed(2) }}% 用來攤固定成本。</template>
      </p>
    </div>

    <div class="card">
      <h2>毛利率對照（同一組固定成本與手續費率）</h2>
      <table>
        <thead><tr><th>毛利率</th><th>年營業額</th><th>月營業額</th><th>金流發票費用佔營收</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.p" :class="{ pick: isM && row.p === marginPct }">
            <td>{{ row.p }}%</td><td>{{ ntd(row.r) }}</td><td>{{ ntd(row.r / 12) }}</td><td>{{ row.share }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">公式：損益兩平營業額 =（金流發票固定費 + 營運成本）÷（毛利率 − 交易手續費率）。未含 5% 營業稅；可扣抵進項者以未稅計。</p>
    </div>
  </main>
</template>
