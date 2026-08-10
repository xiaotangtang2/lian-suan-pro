export function evaluateExpression(raw) {
  let safe = String(raw)
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-')
  safe = safe.replace(/(\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)%/g, '($1$2($1*$3/100))')
  safe = safe.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
  if (!/^[\d+\-*/().\s]+$/.test(safe)) throw new Error('invalid')
  const value = Function(`"use strict";return (${safe})`)()
  if (!Number.isFinite(value)) throw new Error('invalid')
  return Number(value.toFixed(10))
}

export function resolveTierFee(weight, tiers) {
  if (!weight || !tiers?.length) return 0
  const tier = tiers.find(({ min, max }) => weight > min && weight <= max)
  if (tier) return Number(tier.fee || 0)
  const last = tiers.reduce((a, b) => Number(b.max) > Number(a.max) ? b : a)
  return weight > Number(last.max) ? Number(last.fee || 0) : 0
}

export function calculateLogisticsQuote(form, tiers) {
  const freight = Number(form.freight) + resolveTierFee(Number(form.weight), tiers)
  const base = Number(form.purchase) + freight + Number(form.packing)
  const total = base * (1 + Number(form.loss) / 100)
  const tax = total * Number(form.tax) / 100
  const quote = (total + tax) / (1 - Number(form.profit) / 100)
  const gross = quote - total - tax
  return {
    total,
    tax,
    quote,
    gross,
    rate: quote ? gross / quote * 100 : 0,
  }
}

export function calculateWorkHours({ start, end, breakMin, standard }) {
  const toMin = time => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  const startMin = toMin(start)
  const endMin = toMin(end)
  const span = (endMin < startMin ? endMin + 1440 : endMin) - startMin
  const hours = Math.max(0, (span - Number(breakMin)) / 60)
  return {
    hours,
    overtime: Math.max(0, hours - Number(standard)),
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
  if (principal <= 0 || payment <= 0 || periods < 1) return null
  const npv = rate => {
    let value = -principal
    for (let i = 1; i <= periods; i += 1) value += payment / ((1 + rate) ** i)
    return value
  }
  let low = -0.9999
  let high = 10
  while (npv(high) > 0 && high < 1e9) high *= 10
  if (npv(low) * npv(high) > 0) return null
  for (let n = 0; n < 200; n += 1) {
    const rate = (low + high) / 2
    if (npv(rate) > 0) low = rate
    else high = rate
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
  const args = safeParams.map(name => Number(values[name] || 0))
  return Function(...safeParams, `"use strict";return (${formula})`)(...args)
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
  return Object.entries(config).map(([unit, factor]) => ({
    unit,
    value: Number(value) * config[from] / factor,
  }))
}

export function formatUnitValue(value) {
  return Number(value.toFixed(8)).toLocaleString('zh-CN', { maximumFractionDigits: 8 })
}
