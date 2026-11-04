// 未稅：發票 導入 3000 + 800×12；金流 設定 4000 + 年費 8000
export const COST = { y1: { inv: 12600, pay: 12000 }, y2: { inv: 9600, pay: 8000 } }

export const MARGINS = [10, 20, 30, 40, 50, 60]

export const breakeven = (m, fee, F) => (m > fee ? F / (m - fee) : Infinity)

export const svcFixed = (year, svc) => {
  const c = COST[year]
  return (svc !== 'pay' ? c.inv : 0) + (svc !== 'inv' ? c.pay : 0)
}

export const ntd = n => (isFinite(n) && n >= 0 ? 'NT$ ' + Math.round(n).toLocaleString() : '—')
