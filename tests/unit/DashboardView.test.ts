// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import type { AccountBalanceItem, OverviewData, RentalReminder } from '@shared/types/models'
import DashboardView from '@renderer/views/DashboardView.vue'

const overview: OverviewData = {
  netWorth: 10000,
  totalAssets: 20000,
  totalLiabilities: 10000,
  monthIncome: 3000,
  monthExpense: 1500,
  recentTransactions: []
}

const balanceItems: AccountBalanceItem[] = []

const leaseExpiryReminder: RentalReminder = {
  kind: 'lease_expiry',
  leaseId: 1,
  leaseLabel: '幸福小区 3 栋 502 · 张三',
  date: '2026-12-31',
  daysLeft: 10
}

const rentDueReminder: RentalReminder = {
  kind: 'rent_due',
  leaseId: 1,
  leaseLabel: '幸福小区 3 栋 502 · 张三',
  date: '2026-08-20',
  daysLeft: 3
}

let api: any

async function mountView(): Promise<any> {
  const wrapper = mount(DashboardView, {
    global: { plugins: [ElementPlus] }
  })
  await flushPromises()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('DashboardView 出租提醒区块', () => {
  beforeEach(() => {
    api = {
      analytics: {
        overview: vi.fn().mockResolvedValue(overview),
        accountBalance: vi.fn().mockResolvedValue(balanceItems)
      },
      rental: {
        reminders: vi.fn().mockResolvedValue([])
      }
    }
    vi.stubGlobal('api', api)
  })

  it('无提醒时不渲染出租提醒区块', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('.rental-reminders').exists()).toBe(false)
    wrapper.unmount()
  })

  it('有合同到期与应收租提醒时渲染', async () => {
    api.rental.reminders.mockResolvedValue([leaseExpiryReminder, rentDueReminder])
    const wrapper = await mountView()
    const section = wrapper.find('.rental-reminders')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('出租提醒')
    expect(section.text()).toContain('合同到期')
    expect(section.text()).toContain('应收租')
    expect(section.text()).toContain('幸福小区 3 栋 502 · 张三')
    wrapper.unmount()
  })

  it('仅应收租提醒时渲染对应条目', async () => {
    api.rental.reminders.mockResolvedValue([rentDueReminder])
    const wrapper = await mountView()
    const section = wrapper.find('.rental-reminders')
    expect(section.text()).toContain('应收租')
    expect(section.text()).not.toContain('合同到期')
    wrapper.unmount()
  })

  it('reminders 调用失败时不阻断页面渲染', async () => {
    api.rental.reminders.mockRejectedValue(new Error('table not found'))
    const wrapper = await mountView()
    expect(wrapper.find('.stat-cards').exists()).toBe(true)
    expect(wrapper.find('.rental-reminders').exists()).toBe(false)
    wrapper.unmount()
  })

  it('overview 返回 error 时不渲染统计卡片避免崩溃', async () => {
    api.analytics.overview.mockResolvedValue({ error: 'LEDGER_NOT_OPEN' })
    const wrapper = await mountView()
    expect(wrapper.find('.stat-cards').exists()).toBe(false)
    expect(wrapper.find('.dashboard').exists()).toBe(true)
    wrapper.unmount()
  })
})
