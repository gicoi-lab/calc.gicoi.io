import { test } from 'node:test'
import assert from 'node:assert/strict'
import { breakeven, svcFixed } from './calc.js'

test('svcFixed', () => {
  assert.equal(svcFixed('y1', 'both'), 24600)
  assert.equal(svcFixed('y2', 'pay'), 8000)
  assert.equal(svcFixed('y2', 'inv'), 9600)
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
