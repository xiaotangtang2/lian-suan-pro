export function evaluateExpression(raw) {
  const safe = String(raw)
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-')
  if (!/^[\d+\-*/().%\s]+$/.test(safe)) throw new Error('invalid')

  // 用一个小型表达式解析器实现计算器百分比语义：
  // 100 + 10% = 110，继续 + 10% = 121；100 × 90% × 95% = 85.5。
  let index = 0
  const skip = () => { while (/\s/.test(safe[index] || '')) index += 1 }
  const primary = () => {
    skip()
    let value
    if (safe[index] === '(') {
      index += 1
      value = addition()
      skip()
      if (safe[index] !== ')') throw new Error('invalid')
      index += 1
    } else {
      const match = safe.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)
      if (!match) throw new Error('invalid')
      value = Number(match[0])
      index += match[0].length
    }
    skip()
    if (safe[index] === '%') {
      index += 1
      return { value: value / 100, percent: true }
    }
    return { value, percent: false }
  }
  const unary = () => {
    skip()
    if (safe[index] === '+' || safe[index] === '-') {
      const sign = safe[index++] === '-' ? -1 : 1
      const item = unary()
      return { value: sign * item.value, percent: item.percent }
    }
    return primary()
  }
  const multiplication = () => {
    let left = unary()
    while (true) {
      skip()
      const operator = safe[index]
      if (operator !== '*' && operator !== '/') break
      index += 1
      const right = unary()
      left = { value: operator === '*' ? left.value * right.value : left.value / right.value, percent: false }
    }
    return left
  }
  const addition = () => {
    let left = multiplication()
    while (true) {
      skip()
      const operator = safe[index]
      if (operator !== '+' && operator !== '-') break
      index += 1
      const right = multiplication()
      const delta = right.percent ? left.value * right.value : right.value
      left = { value: operator === '+' ? left.value + delta : left.value - delta, percent: false }
    }
    return left.value
  }
  const value = addition()
  skip()
  if (index !== safe.length) throw new Error('invalid')
  if (!Number.isFinite(value)) throw new Error('invalid')
  return Number(value.toFixed(10))
}

export function normalizeTiers(tiers) {
  return (tiers || [])
    .map((t, i) => ({
      min: Number(t.min) || 0,
      max: Number(t.max) || 0,
      fee: Number(t.fee) || 0,
      index: i,
    }))
    .filter(t => Number.isFinite(t.min) && Number.isFinite(t.max) && t.max > t.min)
    .sort((a, b) => a.min - b.min || a.max - b.max)
}

export function inspectTierFee(weight, tiers) {
  const sorted = normalizeTiers(tiers)
  const result = { fee: 0, overflow: false, gap: false, belowRange: false, matched: false }
  if (!weight || !sorted.length) return result
  const tier = sorted.find(({ min, max }) => weight > min && weight <= max)
  if (tier) {
    result.fee = tier.fee
    result.matched = true
    return result
  }
  const last = sorted[sorted.length - 1]
  if (weight > last.max) {
    const unitRate = last.fee / (last.max - last.min)
    result.fee = last.fee + (weight - last.max) * unitRate
    result.overflow = true
    return result
  }
  const prev = [...sorted].reverse().find(({ max }) => max < weight)
  if (prev) {
    result.fee = prev.fee
    result.gap = true
    return result
  }
  result.belowRange = true
  return result
}

export function resolveTierFee(weight, tiers) {
  return inspectTierFee(weight, tiers).fee
}

export function calculateLogisticsQuote(form, tiers) {
  const purchase = Number(form.purchase) || 0
  const baseFreight = Number(form.freight) || 0
  const packing = Number(form.packing) || 0
  const actualWeight = Number(form.weight) || 0
  const volumeWeight = Number(form.volumeWeight) || 0
  const chargeWeight = Math.max(actualWeight, volumeWeight)
  const tier = inspectTierFee(chargeWeight, tiers)
  const lossRate = Math.min(Math.max(Number(form.loss) || 0, 0), 99) / 100
  const taxRate = Math.min(Math.max(Number(form.tax) || 0, 0), 100) / 100
  const profitRate = Math.min(Math.max(Number(form.profit) || 0, 0), 99) / 100
  const base = purchase + baseFreight + tier.fee + packing
  const total = base / (1 - lossRate)
  const taxShare = taxRate / (1 + taxRate)
  const denominator = 1 - profitRate - taxShare
  const result = {
    total,
    tax: 0,
    quote: 0,
    gross: 0,
    rate: 0,
    valid: denominator > 0,
    chargeWeight,
    tierFee: tier.fee,
    overflow: tier.overflow,
    gap: tier.gap,
    belowRange: tier.belowRange,
  }
  if (!result.valid) return result
  const quote = total / denominator
  const tax = quote * taxShare
  result.tax = tax
  result.quote = quote
  result.gross = quote - total - tax
  result.rate = quote ? result.gross / quote * 100 : 0
  return result
}

export function calculateWorkHours({ start, end, breakMin, standard }) {
  const toMin = time => {
    if (!/^\d{2}:\d{2}$/.test(String(time || ''))) return null
    const [h, m] = time.split(':').map(Number)
    return h >= 0 && h < 24 && m >= 0 && m < 60 ? h * 60 + m : null
  }
  const startMin = toMin(start)
  const endMin = toMin(end)
  if (startMin === null || endMin === null) return { hours: 0, overtime: 0 }
  const span = (endMin < startMin ? endMin + 1440 : endMin) - startMin
  const safeBreak = Math.max(0, Number(breakMin) || 0)
  const safeStandard = Math.max(0, Number(standard) || 0)
  const hours = Math.max(0, (span - safeBreak) / 60)
  return {
    hours,
    overtime: Math.max(0, hours - safeStandard),
  }
}

export function countWorkdays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (end < start) return { total: 0, weekdays: 0 }
  let total = 0
  let weekdays = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    total += 1
    if (d.getDay() !== 0 && d.getDay() !== 6) weekdays += 1
  }
  return { total, weekdays }
}

export function calculateMonthlyIrr(principal, payment, periods) {
  const p = Number(principal)
  const a = Number(payment)
  const n = Math.floor(Number(periods))
  if (!Number.isFinite(p) || !Number.isFinite(a) || !Number.isFinite(n) || p <= 0 || a <= 0 || n < 1) return null
  const total = a * n
  if (total < p - 1e-9) return null
  if (Math.abs(total - p) < 1e-9) return 0
  const npv = rate => {
    let value = -p
    let pow = 1 + rate
    for (let i = 1; i <= n; i += 1) {
      value += a / pow
      pow *= 1 + rate
    }
    return value
  }
  let low = -0.9999
  let high = 10
  while (npv(high) > 0 && high < 1e9) high *= 10
  const lowValue = npv(low)
  const highValue = npv(high)
  if ((lowValue > 0 && highValue > 0) || (lowValue < 0 && highValue < 0)) return null
  if (Math.abs(lowValue) < 1e-12) return low
  if (Math.abs(highValue) < 1e-12) return high
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2
    const midValue = npv(mid)
    if (midValue > 0) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export function parseBatchNumbers(text) {
  if (!text || !text.trim()) return []
  return text.split(/[\n,，\s]+/).map(Number).filter(Number.isFinite)
}

export function buildBatchRows(nums, mode, rate) {
  return nums.map((value, i) => ({
    序号: i + 1,
    原始值: value,
    计算结果: mode === 'markup' ? value * (1 + Number(rate) / 100)
      : mode === 'tax' ? value / (1 + Number(rate) / 100)
        : value,
  }))
}

export function evaluateFormula(formula, params, values) {
  if (!/^[\w\d+\-*/().\s]+$/.test(String(formula))) throw new Error('formula illegal')
  const safeParams = (params || []).map(name => String(name).trim()).filter(Boolean)
  if (safeParams.some(name => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) || new Set(safeParams).size !== safeParams.length) {
    throw new Error('parameter illegal')
  }
  const args = safeParams.map(name => Number(values[name] || 0))
  const value = Function(...safeParams, `"use strict";return (${formula})`)(...args)
  if (!Number.isFinite(value)) throw new Error('non-finite result')
  return value
}

export const unitConfigs = {
  volume: { m3: 1, L: 0.001, cm3: 0.000001 },
  weight: { kg: 1, g: 0.001, t: 1000, lb: 0.45359237 },
  cargo: { m3: 1, cbm: 1, '材(台制)': 0.003305785 },
}

export const unitLabels = {
  m3: '立方米',
  L: '升',
  cm3: '立方厘米',
  kg: '千克',
  g: '克',
  t: '吨',
  lb: '磅',
  cbm: 'CBM',
  '材(台制)': '材（台制）',
}

export function convertUnits(type, value, from) {
  const config = unitConfigs[type]
  if (!config || !(from in config) || !Number.isFinite(Number(value))) return []
  return Object.entries(config).map(([unit, factor]) => ({
    unit,
    value: Number(value) * config[from] / factor,
  }))
}

export function formatUnitValue(value) {
  return Number(value.toFixed(8)).toLocaleString('zh-CN', { maximumFractionDigits: 8 })
}
