import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { createStore } from './saved.js'

const memStorage = () => {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }
}
beforeEach(() => { globalThis.localStorage = memStorage() })

test('uses default when nothing stored, then persists changes', async () => {
  const { saved } = createStore()
  const r = saved('opex', 6)
  assert.equal(r.value, 6)
  r.value = 9
  await nextTick()
  assert.equal(localStorage.getItem('calc:opex'), '9')
})

test('restores stored value', () => {
  localStorage.setItem('calc:svc', '"pay"')
  assert.equal(createStore().saved('svc', 'both').value, 'pay')
})

test('falls back to default when storage throws (private mode)', async () => {
  globalThis.localStorage = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  const r = createStore().saved('opex', 6)
  assert.equal(r.value, 6)
  r.value = 7 // 寫入失敗不可拋錯
  await nextTick()
  assert.equal(r.value, 7)
})

test('falls back to default on corrupt JSON', () => {
  localStorage.setItem('calc:opex', '{oops')
  assert.equal(createStore().saved('opex', 6).value, 6)
})

test('reset restores defaults, including nested objects edited in place', async () => {
  const { saved, reset } = createStore()
  const n = saved('revenue', 30)
  const parts = saved('opexParts', { 房租: 0, 其他: 0 })
  n.value = 99
  parts.value.房租 = 5
  await nextTick()
  reset()
  assert.equal(n.value, 30)
  assert.deepEqual({ ...parts.value }, { 房租: 0, 其他: 0 })
})
