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
