import { describe, it, expect } from 'vitest'
import {
  buildRentalReminders,
  daysUntilDate,
  nextDueDate
} from '../../src/shared/rental-utils'
import type { LeaseWithMeta } from '../../src/shared/types/models'

function makeLease(overrides: Partial<LeaseWithMeta>): LeaseWithMeta {
  return {
    id: 1,
    propertyId: 1,
    tenantId: 1,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    monthlyRent: 3200,
    payCycle: 'monthly',
    status: 'active',
    terminatedAt: null,
    note: null,
    createdAt: 0,
    propertyAddress: '幸福小区 3 栋 502',
    tenantName: '张三',
    totalRent: 0,
    rentCount: 0,
    nextDueDate: null,
    ...overrides
  }
}

describe('nextDueDate', () => {
  it('当月应收租日已过时推进到下月', () => {
    expect(nextDueDate('2026-01-10', 'monthly', new Date(2026, 0, 15))).toBe('2026-02-10')
  })

  it('应收租日未到时返回当月', () => {
    expect(nextDueDate('2026-01-20', 'monthly', new Date(2026, 0, 15))).toBe('2026-01-20')
  })

  it('季度付租按季度推进', () => {
    expect(nextDueDate('2026-01-01', 'quarterly', new Date(2026, 1, 1))).toBe('2026-04-01')
  })

  it('年付租按年推进', () => {
    expect(nextDueDate('2026-01-01', 'yearly', new Date(2026, 5, 1))).toBe('2027-01-01')
  })

  it('跨年推进', () => {
    expect(nextDueDate('2026-12-15', 'monthly', new Date(2027, 0, 1))).toBe('2027-01-15')
  })

  it('非法起始日期返回 null', () => {
    expect(nextDueDate('invalid', 'monthly', new Date(2026, 0, 15))).toBeNull()
  })
})

describe('daysUntilDate', () => {
  it('计算剩余天数', () => {
    expect(daysUntilDate('2026-02-20', new Date(2026, 1, 15))).toBe(5)
  })

  it('当天为 0', () => {
    expect(daysUntilDate('2026-02-15', new Date(2026, 1, 15))).toBe(0)
  })

  it('已过日期返回 0', () => {
    expect(daysUntilDate('2026-02-10', new Date(2026, 1, 15))).toBe(0)
  })
})

describe('buildRentalReminders', () => {
  it('合同剩余 30 天内提醒到期', () => {
    const today = new Date(2026, 11, 10)
    const reminders = buildRentalReminders([makeLease({ endDate: '2026-12-31' })], today)
    expect(reminders.some((r) => r.kind === 'lease_expiry' && r.daysLeft === 21)).toBe(true)
  })

  it('合同剩余超过 30 天不提醒', () => {
    const today = new Date(2026, 9, 1)
    const reminders = buildRentalReminders([makeLease({ endDate: '2026-12-31' })], today)
    expect(reminders.some((r) => r.kind === 'lease_expiry')).toBe(false)
  })

  it('已终止合同不提醒', () => {
    const today = new Date(2026, 11, 10)
    const reminders = buildRentalReminders(
      [makeLease({ endDate: '2026-12-31', status: 'terminated', nextDueDate: null })],
      today
    )
    expect(reminders).toHaveLength(0)
  })

  it('应收租日前 3 天内提醒', () => {
    const today = new Date(2026, 1, 8)
    const reminders = buildRentalReminders(
      [makeLease({ startDate: '2026-01-10', nextDueDate: '2026-02-10' })],
      today
    )
    expect(reminders.some((r) => r.kind === 'rent_due' && r.daysLeft === 2)).toBe(true)
  })

  it('应收租日前超过 3 天不提醒', () => {
    const today = new Date(2026, 1, 1)
    const reminders = buildRentalReminders(
      [makeLease({ startDate: '2026-01-10', nextDueDate: '2026-02-10' })],
      today
    )
    expect(reminders.some((r) => r.kind === 'rent_due')).toBe(false)
  })
})
