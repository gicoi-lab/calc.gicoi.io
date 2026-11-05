import { test } from 'node:test'
import assert from 'node:assert/strict'
import { breakeven, svcFixed } from './calc.js'

test('svcFixed', () => {
  assert.equal(svcFixed('y1', 'both'), 24600)
  assert.equal(svcFixed('y2', 'pay'), 8000)
  assert.equal(svcFixed('y2', 'inv'), 9600)
  assert.equal(svcFixed('y1', 'none'), 0)
})

test('breakeven', () => {
  assert.equal(Math.round(breakeven(0.3, 0.025, 24600)), 89455)
  assert.equal(breakeven(0.02, 0.025, 1000), Infinity)
})

test('profit is zero at breakeven, sign flips around it', async () => {
  const { profit } = await import('./calc.js')
  const R = breakeven(0.3, 0.025, 24600)
  assert.ok(Math.abs(profit(R, 0.3, 0.025, 24600)) < 1e-6)
  assert.equal(Math.round(profit(1000000, 0.3, 0.025, 24600)), 250400)
  assert.equal(profit(0, 0.3, 0.025, 24600), -24600)
})

test('corpTax', async () => {
  const { corpTax } = await import('./calc.js')
  assert.equal(corpTax(-5000), 0)
  assert.equal(corpTax(120000), 0)
  assert.equal(corpTax(150000), 15000) // 半數上限
  assert.equal(corpTax(200000), 40000) // 兩式交會
  assert.equal(corpTax(1000000), 200000)
})

test('breakeven with 營業稅 counted in cut (2.5% fee + 5% VAT)', () => {
  assert.equal(Math.round(breakeven(0.3, 0.075, 744600)), 3309333)
  assert.equal(breakeven(0.075, 0.075, 744600), Infinity) // 毛利率 = 扣除率：無法平衡
})

test('afterTax', async () => {
  const { afterTax: raw } = await import('./calc.js')
  const afterTax = (...a) => Object.fromEntries(Object.entries(raw(...a)).map(([k, v]) => [k, Math.round(v)])) // 去除浮點誤差
  // 預設值：月 30 萬、毛利 30%、扣 7.5%、固定成本 744,600 → 所得 ≤12 萬免營所稅
  assert.deepEqual(afterTax(3600000, 0.3, 0.075, 744600), { pre: 65400, cit: 0, net: 65400 })
  // 所得 605,400 → 20% = 121,080（低於半數上限 242,700）
  assert.deepEqual(afterTax(6000000, 0.3, 0.075, 744600), { pre: 605400, cit: 121080, net: 484320 })
  // 虧損不課營所稅
  assert.deepEqual(afterTax(0, 0.3, 0.075, 744600), { pre: -744600, cit: 0, net: -744600 })
})

test('svcFixed covers every year × service', () => {
  assert.equal(svcFixed('y1', 'inv'), 12600)
  assert.equal(svcFixed('y1', 'pay'), 12000)
  assert.equal(svcFixed('y2', 'both'), 17600)
  assert.equal(svcFixed('y2', 'none'), 0)
})

test('ntd / signedNtd formatting', async () => {
  const { ntd, signedNtd } = await import('./calc.js')
  assert.equal(ntd(1234.5), 'NT$ 1,235')
  assert.equal(ntd(0), 'NT$ 0')
  assert.equal(ntd(Infinity), '—')
  assert.equal(ntd(-1), '—')
  assert.equal(signedNtd(-1500), '−NT$ 1,500')
  assert.equal(signedNtd(2000), 'NT$ 2,000')
})

test('MARGINS ascending and include the added options', async () => {
  const { MARGINS } = await import('./calc.js')
  assert.deepEqual(MARGINS, [...MARGINS].sort((a, b) => a - b))
  for (const p of [5, 7.5, 15]) assert.ok(MARGINS.includes(p))
})

test('scale (年／月切換)', async () => {
  const { scale } = await import('./calc.js')
  assert.equal(scale(30, 12), 360)
  assert.equal(scale(360, 1 / 12), 30)
  assert.equal(scale(10, 1 / 12), 0.83)
  assert.equal(scale('', 12), 0)
  assert.equal(scale(scale(6, 12), 1 / 12), 6) // 來回切換不漂移
})

test('sumParts', async () => {
  const { sumParts } = await import('./calc.js')
  const items = ['房租', '水電', '其他']
  assert.equal(sumParts({ 房租: 0.1, 水電: 0.2, 其他: 0 }, items), 0.3)
  assert.equal(sumParts({ 房租: 3, 水電: '', 其他: undefined }, items), 3)
  assert.equal(sumParts({ 房租: 3, 舊項目: 100 }, items), 3) // 只算目前的分項
})
