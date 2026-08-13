// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import type { LeaseWithMeta, RentalProperty, RentRecord, Tenant } from '@shared/types/models'
import RentalsView from '@renderer/views/RentalsView.vue'

const properties: RentalProperty[] = [
  { id: 1, address: '幸福小区 3 栋 502', area: 60, monthlyRent: 2500, deposit: 5000, assetId: null, note: null }
]

const tenants: Tenant[] = [
  { id: 1, name: '张三', phone: '13800000000', idNumber: '110101199001010011' }
]

const leases: LeaseWithMeta[] = [
  {
    id: 1,
    propertyId: 1,
    tenantId: 1,
    propertyAddress: '幸福小区 3 栋 502',
    tenantName: '张三',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    monthlyRent: 2500,
    payCycle: 'monthly',
    status: 'active',
    note: null,
    totalRent: 2500,
    rentCount: 1,
    nextDueDate: '2025-03-01'
  }
]

const rentRecords: RentRecord[] = [
  { id: 1, leaseId: 1, amount: 2500, date: '2025-02-01', accountId: 1, note: null }
]

const accounts = [{ id: 1, name: '现金', type: 'debit' }]

let api: any

async function mountView(): Promise<any> {
  const wrapper = mount(RentalsView, {
    global: { plugins: [ElementPlus] }
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('RentalsView', () => {
  beforeEach(() => {
    api = {
      rental: {
        listProperties: vi.fn().mockResolvedValue(properties),
        createProperty: vi.fn().mockResolvedValue({ id: 2 }),
        updateProperty: vi.fn().mockResolvedValue({ id: 1 }),
        deleteProperty: vi.fn().mockResolvedValue({ ok: true }),
        listTenants: vi.fn().mockResolvedValue(tenants),
        createTenant: vi.fn().mockResolvedValue({ id: 2 }),
        updateTenant: vi.fn().mockResolvedValue({ id: 1 }),
        deleteTenant: vi.fn().mockResolvedValue({ ok: true }),
        listLeases: vi.fn().mockResolvedValue(leases),
        createLease: vi.fn().mockResolvedValue({ id: 2 }),
        updateLease: vi.fn().mockResolvedValue({ id: 1 }),
        terminateLease: vi.fn().mockResolvedValue({ ok: true }),
        listRentRecords: vi.fn().mockResolvedValue(rentRecords),
        recordRent: vi.fn().mockResolvedValue({ ok: true }),
        deleteRentRecord: vi.fn().mockResolvedValue({ ok: true }),
        reminders: vi.fn().mockResolvedValue([])
      },
      asset: { list: vi.fn().mockResolvedValue([]) },
      account: { list: vi.fn().mockResolvedValue(accounts) }
    }
    vi.stubGlobal('api', api)
  })

  it('挂载时加载出租房、租户、合同、收租数据', async () => {
    const wrapper = await mountView()
    expect(api.rental.listProperties).toHaveBeenCalled()
    expect(api.rental.listTenants).toHaveBeenCalled()
    expect(api.rental.listLeases).toHaveBeenCalled()
    expect(api.rental.listRentRecords).toHaveBeenCalled()
    expect(wrapper.vm.properties).toHaveLength(1)
    expect(wrapper.vm.tenants).toHaveLength(1)
    expect(wrapper.vm.leases).toHaveLength(1)
    expect(wrapper.vm.rentRecords).toHaveLength(1)
    wrapper.unmount()
  })

  it('登记出租房并调用 createProperty', async () => {
    const wrapper = await mountView()
    wrapper.vm.openCreateProperty()
    wrapper.vm.propertyForm.address = '新地址 1 号'
    wrapper.vm.propertyForm.monthlyRent = 3000
    await wrapper.vm.saveProperty()
    expect(api.rental.createProperty).toHaveBeenCalledWith(
      expect.objectContaining({ address: '新地址 1 号', monthlyRent: 3000 })
    )
    expect(wrapper.vm.propertyDialog).toBe(false)
    wrapper.unmount()
  })

  it('登记租户并调用 createTenant', async () => {
    const wrapper = await mountView()
    wrapper.vm.openCreateTenant()
    wrapper.vm.tenantForm.name = '李四'
    await wrapper.vm.saveTenant()
    expect(api.rental.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({ name: '李四', phone: null, idNumber: null })
    )
    wrapper.unmount()
  })

  it('租户存在关联合同时删除被拦截', async () => {
    api.rental.deleteTenant.mockResolvedValue({ error: 'TENANT_HAS_LEASES' })
    const { ElMessageBox } = await import('element-plus')
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as any)
    const wrapper = await mountView()
    await wrapper.vm.removeTenant(tenants[0])
    expect(api.rental.deleteTenant).toHaveBeenCalledWith(1)
    expect(wrapper.vm.tenants).toHaveLength(1)
    wrapper.unmount()
  })

  it('记录收租并调用 recordRent', async () => {
    const wrapper = await mountView()
    wrapper.vm.openRentDialog()
    wrapper.vm.rentForm.leaseId = 1
    wrapper.vm.rentForm.amount = 2500
    wrapper.vm.rentForm.date = '2025-03-01'
    wrapper.vm.rentForm.accountId = 1
    await wrapper.vm.recordRent()
    expect(api.rental.recordRent).toHaveBeenCalledWith({
      leaseId: 1,
      amount: 2500,
      date: '2025-03-01',
      accountId: 1,
      note: null
    })
    expect(wrapper.vm.rentDialog).toBe(false)
    wrapper.unmount()
  })
})
