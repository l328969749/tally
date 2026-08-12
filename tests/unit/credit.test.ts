import { describe, it, expect } from 'vitest'
import { daysUntilDue, isDueReminder, maskCardNumber } from '../../src/renderer/src/utils/credit'

describe('maskCardNumber', () => {
  it('掩码后仅显示后四位', () => {
    expect(maskCardNumber('6225 8899 0011 2233')).toBe('**** **** 2233')
  })

  it('去除空格后按数字掩码', () => {
    expect(maskCardNumber('6225889900112233')).toBe('**** **** 2233')
  })

  it('空卡号返回空串', () => {
    expect(maskCardNumber(null)).toBe('')
    expect(maskCardNumber(undefined)).toBe('')
    expect(maskCardNumber('')).toBe('')
  })

  it('位数不足 4 时原样返回', () => {
    expect(maskCardNumber('123')).toBe('123')
  })
})

describe('isDueReminder', () => {
  it('还款日当天且存在欠款时提醒', () => {
    expect(isDueReminder(15, -500, new Date(2026, 1, 15))).toBe(true)
  })

  it('还款日前 3 天内提醒', () => {
    expect(isDueReminder(15, -500, new Date(2026, 1, 12))).toBe(true)
  })

  it('还款日前超过 3 天不提醒', () => {
    expect(isDueReminder(15, -500, new Date(2026, 1, 11))).toBe(false)
  })

  it('还款日后一天不提醒', () => {
    expect(isDueReminder(15, -500, new Date(2026, 1, 16))).toBe(false)
  })

  it('无欠款时不提醒', () => {
    expect(isDueReminder(15, 0, new Date(2026, 1, 15))).toBe(false)
    expect(isDueReminder(15, 300, new Date(2026, 1, 15))).toBe(false)
  })

  it('未设置还款日不提醒', () => {
    expect(isDueReminder(null, -500, new Date(2026, 1, 15))).toBe(false)
  })

  it('跨月时按下个还款日计算', () => {
    expect(isDueReminder(1, -500, new Date(2026, 1, 28))).toBe(true)
    expect(isDueReminder(1, -500, new Date(2026, 1, 27))).toBe(true)
    expect(isDueReminder(1, -500, new Date(2026, 2, 4))).toBe(false)
  })
})

describe('daysUntilDue', () => {
  it('计算距离还款日天数', () => {
    expect(daysUntilDue(20, new Date(2026, 1, 15))).toBe(5)
  })

  it('当天为 0', () => {
    expect(daysUntilDue(15, new Date(2026, 1, 15))).toBe(0)
  })

  it('已过还款日则计入下月', () => {
    expect(daysUntilDue(10, new Date(2026, 1, 15))).toBe(23)
  })

  it('未设置返回 Infinity', () => {
    expect(daysUntilDue(null, new Date(2026, 1, 15))).toBe(Infinity)
  })
})
