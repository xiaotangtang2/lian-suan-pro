import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBatchRows,
  calculateLogisticsQuote,
  calculateMonthlyIrr,
  calculateWorkHours,
  convertUnits,
  countWorkdays,
  evaluateExpression,
  evaluateFormula,
  parseBatchNumbers,
  resolveTierFee,
} from '../src/lib/calculations.js'

const tiers = [
  { min: 0, max: 10, fee: 12 },
  { min: 10, max: 50, fee: 45 },
  { min: 50, max: 100, fee: 80 },
]

test('基础计算：四则运算与括号', () => {
  assert.equal(evaluateExpression('2+3*4'), 14)
  assert.equal(evaluateExpression('(2+3)*4'), 20)
  assert.equal(evaluateExpression('10/4'), 2.5)
  assert.equal(evaluateExpression('0.1+0.2'), 0.3)
})

test('基础计算：百分比和链式折扣', () => {
  assert.equal(evaluateExpression('100+10%'), 110)
  assert.equal(evaluateExpression('10-5%'), 9.5)
  assert.equal(evaluateExpression('1000×90%×95%'), 855)
  assert.equal(evaluateExpression('5%'), 0.05)
})

test('基础计算：非法表达式应拒绝', () => {
  assert.throws(() => evaluateExpression('1/0'))
  assert.throws(() => evaluateExpression('(1+2'))
  assert.throws(() => evaluateExpression('abc'))
})

test('物流报价：默认参数结果和毛利率', () => {
  const result = calculateLogisticsQuote({
    purchase: 1000,
    freight: 120,
    packing: 18,
    loss: 2,
    tax: 6,
    profit: 16,
    weight: 0,
  }, tiers)
  assert.ok(Math.abs(result.total - 1160.76) < 1e-9)
  assert.ok(Math.abs(result.tax - 69.6456) < 1e-9)
  assert.ok(Math.abs(result.quote - 1464.7685714285714) < 1e-9)
  assert.ok(Math.abs(result.gross - 234.3629714285714) < 1e-9)
  assert.ok(Math.abs(result.rate - 16) < 1e-9)
})

test('物流报价：阶梯运费按区间取值', () => {
  assert.equal(resolveTierFee(5, tiers), 12)
  assert.equal(resolveTierFee(10, tiers), 12)
  assert.equal(resolveTierFee(50, tiers), 45)
  assert.equal(resolveTierFee(0, tiers), 0)
})

test('物流报价：超出最大档位应沿用最后一档运费', () => {
  assert.equal(resolveTierFee(120, tiers), 80)
})

test('工时：常规、午休和跨夜班', () => {
  assert.deepEqual(calculateWorkHours({ start: '09:00', end: '18:30', breakMin: 60, standard: 8 }), { hours: 8.5, overtime: 0.5 })
  assert.deepEqual(calculateWorkHours({ start: '09:00', end: '12:00', breakMin: 0, standard: 8 }), { hours: 3, overtime: 0 })
  assert.deepEqual(calculateWorkHours({ start: '22:00', end: '06:00', breakMin: 0, standard: 8 }), { hours: 8, overtime: 0 })
})

test('工时：午休超过工作时长时归零', () => {
  assert.deepEqual(calculateWorkHours({ start: '09:00', end: '12:00', breakMin: 240, standard: 8 }), { hours: 0, overtime: 0 })
})

test('工作日：区间包含首尾且排除周末', () => {
  assert.deepEqual(countWorkdays('2026-08-01', '2026-08-31'), { total: 31, weekdays: 21 })
  assert.deepEqual(countWorkdays('2026-08-01', '2026-08-01'), { total: 1, weekdays: 0 })
  assert.deepEqual(countWorkdays('2026-08-03', '2026-08-03'), { total: 1, weekdays: 1 })
})

test('工作日：结束日期早于开始日期时优雅归零', () => {
  assert.deepEqual(countWorkdays('2026-08-31', '2026-08-01'), { total: 0, weekdays: 0 })
})

test('IRR：常规分期结果', () => {
  const rate = calculateMonthlyIrr(1000, 100, 12)
  assert.ok(rate !== null)
  assert.ok(Math.abs(rate - 0.029228540769133615) < 1e-9)
  assert.ok(Math.abs(calculateMonthlyIrr(1200, 100, 12)) < 1e-9)
})

test('IRR：无效现金流返回 null', () => {
  assert.equal(calculateMonthlyIrr(0, 100, 12), null)
  assert.equal(calculateMonthlyIrr(1000, 0, 12), null)
  assert.equal(calculateMonthlyIrr(1000, 100, 0), null)
})

test('IRR：极端高利率现金流不应被拒绝', () => {
  const rate = calculateMonthlyIrr(1, 100, 1)
  assert.ok(rate !== null)
  assert.ok(Math.abs(rate - 99) < 1e-6)
})

test('批量计算：解析常规输入', () => {
  assert.deepEqual(parseBatchNumbers('120\n350.5\n88\n1060'), [120, 350.5, 88, 1060])
  assert.deepEqual(parseBatchNumbers('1,2，3 4'), [1, 2, 3, 4])
  assert.deepEqual(parseBatchNumbers('1,abc,2'), [1, 2])
})

test('批量计算：空输入应得到 0 条', () => {
  assert.deepEqual(parseBatchNumbers(''), [])
  assert.deepEqual(parseBatchNumbers('   \n  '), [])
})

test('批量计算：求和、加价、价税分离', () => {
  const nums = [120, 350.5, 88, 1060]
  assert.equal(buildBatchRows(nums, 'sum', 10).reduce((sum, row) => sum + row.计算结果, 0), 1618.5)
  assert.equal(buildBatchRows(nums, 'markup', 10).reduce((sum, row) => sum + row.计算结果, 0), 1780.35)
  assert.ok(Math.abs(buildBatchRows(nums, 'tax', 13).reduce((sum, row) => sum + row.计算结果, 0) - 1432.3008849557523) < 1e-9)
})

test('公式模板：参数计算与缺省参数', () => {
  assert.equal(evaluateFormula('(cost + freight) * (1 + tax / 100)', ['cost', 'freight', 'tax'], { cost: 1000, freight: 120, tax: 6 }), 1187.2)
  assert.equal(evaluateFormula('cost * 2', ['cost'], {}), 0)
})

test('公式模板：非法公式应报错', () => {
  assert.throws(() => evaluateFormula('1 +', ['cost'], { cost: 1 }))
  assert.throws(() => evaluateFormula('1;alert(1)', [], {}))
})

test('单位换算：体积与重量基准', () => {
  const volume = Object.fromEntries(convertUnits('volume', 1, 'm3').map(item => [item.unit, item.value]))
  assert.equal(volume.m3, 1)
  assert.equal(volume.L, 1000)
  assert.equal(volume.cm3, 1000000)

  const weight = Object.fromEntries(convertUnits('weight', 1, 'kg').map(item => [item.unit, item.value]))
  assert.equal(weight.g, 1000)
  assert.equal(weight.t, 0.001)
  assert.ok(Math.abs(weight.lb - 2.2046226218487757) < 1e-9)
})

test('单位换算：零值与其他原始单位', () => {
  const zero = Object.fromEntries(convertUnits('volume', 0, 'm3').map(item => [item.unit, item.value]))
  assert.equal(zero.m3, 0)
  assert.equal(zero.L, 0)

  const lb = Object.fromEntries(convertUnits('weight', 1, 'lb').map(item => [item.unit, item.value]))
  assert.ok(Math.abs(lb.kg - 0.45359237) < 1e-9)
})

test('压力：随机四则运算与参考结果一致', () => {
  for (let i = 0; i < 200; i += 1) {
    const a = Math.floor(Math.random() * 1000)
    const b = Math.floor(Math.random() * 1000)
    const c = Math.floor(Math.random() * 100) + 1
    const expr = `${a}+${b}*${c}-${a % (c || 1)}`
    const expected = a + b * c - (a % c)
    assert.equal(evaluateExpression(expr), Number(expected.toFixed(10)))
  }
})

test('压力：物流报价随机参数下毛利率恒等于目标利润率', () => {
  for (let i = 0; i < 100; i += 1) {
    const profit = 1 + Math.floor(Math.random() * 98)
    const result = calculateLogisticsQuote({
      purchase: Math.random() * 10000,
      freight: Math.random() * 1000,
      packing: Math.random() * 500,
      loss: Math.random() * 100,
      tax: Math.random() * 100,
      profit,
      weight: Math.random() * 200,
    }, [{ min: 0, max: 100000, fee: 80 }])
    assert.ok(Math.abs(result.rate - profit) < 1e-6)
  }
})

test('压力：工作日随机区间与独立暴力计数一致', () => {
  const reference = (startDate, endDate) => {
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
  for (let i = 0; i < 80; i += 1) {
    const start = new Date(2020 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28))
    const end = new Date(start.getTime() + Math.floor(Math.random() * 400) * 86400000)
    const s = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const e = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    assert.deepEqual(countWorkdays(s, e), reference(s, e))
  }
})

test('压力：IRR 求解结果让 NPV 归零', () => {
  const npv = (principal, payment, periods, rate) => {
    let value = -principal
    for (let i = 1; i <= periods; i += 1) value += payment / ((1 + rate) ** i)
    return value
  }
  const cases = [
    [1000, 100, 12],
    [10000, 950, 24],
    [1200, 100, 12],
    [1, 100, 1],
    [1, 2, 600],
  ]
  for (const [principal, payment, periods] of cases) {
    const rate = calculateMonthlyIrr(principal, payment, periods)
    assert.ok(rate !== null)
    assert.ok(Math.abs(npv(principal, payment, periods, rate)) < 1e-6)
  }
})

test('压力：批量加价和扣税的总量守恒', () => {
  for (let i = 0; i < 50; i += 1) {
    const nums = Array.from({ length: 5 + Math.floor(Math.random() * 20) }, () => Math.random() * 10000)
    const sum = nums.reduce((total, value) => total + value, 0)
    const rate = Math.random() * 100
    const markupTotal = buildBatchRows(nums, 'markup', rate).reduce((total, row) => total + row.计算结果, 0)
    const taxTotal = buildBatchRows(nums, 'tax', rate).reduce((total, row) => total + row.计算结果, 0)
    assert.ok(Math.abs(markupTotal - sum * (1 + rate / 100)) < 1e-6)
    assert.ok(Math.abs(taxTotal - sum / (1 + rate / 100)) < 1e-6)
  }
})

test('公式模板：非有限结果应被拦截', () => {
  assert.throws(() => evaluateFormula('1 / 0', [], {}))
  assert.throws(() => evaluateFormula('0 / 0', [], {}))
})

test('单位换算：随机数值往返一致', () => {
  for (const type of ['volume', 'weight', 'cargo']) {
    const units = Object.keys(type === 'volume' ? { m3: 1, L: 1, cm3: 1 } : type === 'weight' ? { kg: 1, g: 1, t: 1, lb: 1 } : { m3: 1, cbm: 1, '材(台制)': 1 })
    for (const from of units) {
      for (let i = 0; i < 20; i += 1) {
        const value = Math.random() * 1000
        const converted = convertUnits(type, value, from)
        const back = Object.fromEntries(converted.map(item => [item.unit, item.value]))
        assert.ok(Math.abs(back[from] - value) < 1e-6 * Math.max(1, value))
      }
    }
  }
})
