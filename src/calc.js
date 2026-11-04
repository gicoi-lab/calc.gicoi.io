// 未稅：發票 導入 3000 + 800×12；金流 設定 4000 + 年費 8000
export const COST = { y1: { inv: 12600, pay: 12000 }, y2: { inv: 9600, pay: 8000 } }

export const MARGINS = [5, 7.5, 10, 15, 20, 30, 40, 50, 60]

export const breakeven = (m, fee, F) => (m > fee ? F / (m - fee) : Infinity)

export const svcFixed = (year, svc) => {
  if (svc === 'none') return 0
  const c = COST[year]
  return (svc !== 'pay' ? c.inv : 0) + (svc !== 'inv' ? c.pay : 0)
}

export const ntd = n => (isFinite(n) && n >= 0 ? 'NT$ ' + Math.round(n).toLocaleString() : '—')

// 獲利 = 營業額 ×（毛利率 − 手續費率）− 年固定成本
export const profit = (rev, m, fee, F) => rev * (m - fee) - F

export const signedNtd = n => (n < 0 ? '−' : '') + 'NT$ ' + Math.round(Math.abs(n)).toLocaleString()

// 營所稅（所得稅法§5）：課稅所得 ≤12 萬免徵；超過者 20%，但稅額不超過（所得 − 12 萬）÷ 2
export const corpTax = i => (i > 120000 ? Math.min(i * 0.2, (i - 120000) / 2) : 0)
