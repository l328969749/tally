import { describe, it, expect } from 'vitest'
import {
  isValidNonNegative,
  isValidAddress,
  isValidPhone,
  isValidIdNumber,
  isValidPayCycle,
  isValidLeaseDates
} from '@shared/validation/validators'

describe('isValidNonNegative', () => {
  it('接受 0 与正数', () => {
    expect(isValidNonNegative(0)).toBe(true)
    expect(isValidNonNegative(1.5)).toBe(true)
  })

  it('拒绝负数与非数字', () => {
    expect(isValidNonNegative(-1)).toBe(false)
    expect(isValidNonNegative(Number.NaN)).toBe(false)
    expect(isValidNonNegative(Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('isValidAddress', () => {
  it('接受正常地址并去除首尾空白', () => {
    expect(isValidAddress('幸福小区 3 栋 502')).toBe(true)
    expect(isValidAddress('  幸福小区  ')).toBe(true)
  })

  it('拒绝空地址与超长地址', () => {
    expect(isValidAddress('')).toBe(false)
    expect(isValidAddress('   ')).toBe(false)
    expect(isValidAddress('a'.repeat(201))).toBe(false)
  })

  it('接受 200 字以内地址', () => {
    expect(isValidAddress('a'.repeat(200))).toBe(true)
  })
})

describe('isValidPhone', () => {
  it('空电话视为合法（可选项）', () => {
    expect(isValidPhone('')).toBe(true)
    expect(isValidPhone('   ')).toBe(true)
  })

  it('接受 20 字以内电话', () => {
    expect(isValidPhone('13800000000')).toBe(true)
    expect(isValidPhone('a'.repeat(20))).toBe(true)
  })

  it('拒绝超长电话', () => {
    expect(isValidPhone('a'.repeat(21))).toBe(false)
  })
})

describe('isValidIdNumber', () => {
  it('空证件号视为合法（可选项）', () => {
    expect(isValidIdNumber('')).toBe(true)
  })

  it('接受 30 字以内证件号', () => {
    expect(isValidIdNumber('110101199001010011')).toBe(true)
  })

  it('拒绝超长证件号', () => {
    expect(isValidIdNumber('a'.repeat(31))).toBe(false)
  })
})

describe('isValidPayCycle', () => {
  it('接受三种付租周期', () => {
    expect(isValidPayCycle('monthly')).toBe(true)
    expect(isValidPayCycle('quarterly')).toBe(true)
    expect(isValidPayCycle('yearly')).toBe(true)
  })

  it('拒绝其他取值', () => {
    expect(isValidPayCycle('weekly')).toBe(false)
    expect(isValidPayCycle('')).toBe(false)
  })
})

describe('isValidLeaseDates', () => {
  it('接受结束不早于开始的合法日期', () => {
    expect(isValidLeaseDates('2026-01-01', '2026-12-31')).toBe(true)
    expect(isValidLeaseDates('2026-01-01', '2026-01-01')).toBe(true)
  })

  it('拒绝开始晚于结束', () => {
    expect(isValidLeaseDates('2026-12-31', '2026-01-01')).toBe(false)
  })

  it('拒绝非法日期格式', () => {
    expect(isValidLeaseDates('2026/01/01', '2026-12-31')).toBe(false)
    expect(isValidLeaseDates('2026-1-1', '2026-12-31')).toBe(false)
    expect(isValidLeaseDates('', '2026-12-31')).toBe(false)
  })
})
