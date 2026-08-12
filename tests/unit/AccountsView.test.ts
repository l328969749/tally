// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()
  return {
    ...actual,
    ElMessage: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
    ElMessageBox: { confirm: vi.fn(async () => 'confirm') }
  }
})

import AccountsView from '@renderer/views/AccountsView.vue'

const creditAccount = {
  id: 1,
  name: '招行信用卡',
  type: 'credit',
  cardNumber: '6225 8899 0011 2233',
  creditLimit: 20000,
  billDate: 5,
  dueDate: 23,
  initialBalance: 0,
  sortOrder: 0,
  archived: 0,
  createdAt: 0,
  balance: -800,
  availableCredit: 19200
}

const bankAccount = {
  id: 2,
  name: '储蓄卡',
  type: 'bank',
  cardNumber: null,
  creditLimit: 0,
  billDate: null,
  dueDate: null,
  initialBalance: 1000,
  sortOrder: 1,
  archived: 0,
  createdAt: 0,
  balance: 1000,
  availableCredit: 0
}

function createApi() {
  const api = {
    account: {
      list: vi.fn(async () => [creditAccount, bankAccount]),
      create: vi.fn(async () => ({ ...creditAccount, id: 3 })),
      update: vi.fn(async () => ({ ok: true })),
      delete: vi.fn(async () => ({ ok: true })),
      archive: vi.fn(async () => ({ ok: true })),
      reorder: vi.fn(async () => ({ ok: true }))
    },
    credit: {
      repay: vi.fn(async () => ({ ok: true, expense: {}, income: {} }))
    }
  }
  ;(window as unknown as { api: unknown }).api = api
  return api
}

function mountView() {
  return mount(AccountsView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-button': {
          name: 'ElButton',
          emits: ['click'],
          template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>'
        },
        'el-input': { name: 'ElInput', props: ['modelValue'], emits: ['update:modelValue'], template: '<input class="el-input-stub" />' },
        'el-input-number': {
          name: 'ElInputNumber',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input class="el-input-number-stub" />'
        },
        'el-select': {
          name: 'ElSelect',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div class="el-select-stub"><slot /></div>'
        },
        'el-option': { name: 'ElOption', template: '<div class="el-option-stub"><slot /></div>' },
        'el-table': {
          name: 'ElTable',
          props: ['data'],
          template:
            '<div class="el-table-stub"><div v-for="row in data" :key="row.id" class="table-row"><span class="row-name">{{ row.name }}</span></div></div>'
        },
        'el-table-column': { name: 'ElTableColumn', template: '<div class="el-table-column-stub" />' },
        'el-tag': { name: 'ElTag', template: '<span class="el-tag-stub"><slot /></span>' },
        'el-icon': { name: 'ElIcon', template: '<span class="el-icon-stub"><slot /></span>' },
        'el-dialog': { name: 'ElDialog', template: '<div class="el-dialog-stub"><slot /></div>' },
        'el-form': { name: 'ElForm', template: '<form class="el-form-stub"><slot /></form>' },
        'el-form-item': { name: 'ElFormItem', template: '<div class="el-form-item-stub"><slot /></div>' },
        'el-date-picker': { name: 'ElDatePicker', template: '<div class="el-date-picker-stub" />' }
      }
    }
  })
}

type ViewVm = {
  accountStore: { accounts: Array<Record<string, unknown>> }
  cardFilter: string
  showFullCard: boolean
  filteredAccounts: Array<{ id: number; name: string }>
  cardDisplay: (account: Record<string, unknown>) => string
  form: {
    name: string
    type: string
    initialBalance: number
    cardNumber: string
    creditLimit: number
    billDate: number
    dueDate: number
  }
  save: () => Promise<void>
  openEdit: (account: Record<string, unknown>) => void
  openRepay: (account: Record<string, unknown>) => void
  submitRepay: () => Promise<void>
  repayForm: { fundingAccountId: number; amount: number; date: string; note: string }
}

describe('AccountsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('渲染账户列表并载入信用卡数据', async () => {
    createApi()
    const wrapper = mountView()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('招行信用卡')
    expect(text).toContain('储蓄卡')
    expect(text).toContain('¥ 200.00')

    const vm = wrapper.vm as unknown as ViewVm
    expect(vm.accountStore.accounts).toHaveLength(2)
    expect(vm.accountStore.accounts[0].availableCredit).toBe(19200)
  })

  it('卡号默认掩码，切换后显示完整卡号', async () => {
    createApi()
    const wrapper = mountView()
    await flushPromises()

    const vm = wrapper.vm as unknown as ViewVm
    expect(vm.cardDisplay(creditAccount)).toBe('**** **** 2233')

    const buttons = wrapper.findAll('.el-button-stub')
    await buttons.find((b) => b.text().includes('显示完整卡号'))!.trigger('click')

    expect(vm.showFullCard).toBe(true)
    expect(vm.cardDisplay(creditAccount)).toBe('6225 8899 0011 2233')
  })

  it('按卡号末四位筛选账户', async () => {
    createApi()
    const wrapper = mountView()
    await flushPromises()

    const vm = wrapper.vm as unknown as ViewVm
    vm.cardFilter = '2233'
    await wrapper.vm.$nextTick()
    expect(vm.filteredAccounts.map((a) => a.id)).toEqual([1])

    vm.cardFilter = '9999'
    await wrapper.vm.$nextTick()
    expect(vm.filteredAccounts).toHaveLength(0)
  })

  it('新建信用卡账户时提交卡号与额度字段', async () => {
    const api = createApi()
    const wrapper = mountView()
    await flushPromises()

    const buttons = wrapper.findAll('.el-button-stub')
    await buttons.find((b) => b.text().includes('新建账户'))!.trigger('click')

    const vm = wrapper.vm as unknown as ViewVm
    Object.assign(vm.form, {
      name: '新信用卡',
      type: 'credit',
      initialBalance: 0,
      cardNumber: '6225 0000 1111 2222',
      creditLimit: 30000,
      billDate: 8,
      dueDate: 25
    })
    await vm.save()

    expect(api.account.create).toHaveBeenCalledWith({
      name: '新信用卡',
      type: 'credit',
      initialBalance: 0,
      cardNumber: '6225 0000 1111 2222',
      creditLimit: 30000,
      billDate: 8,
      dueDate: 25
    })
  })

  it('编辑账户时回填信用卡字段', async () => {
    createApi()
    const wrapper = mountView()
    await flushPromises()

    const vm = wrapper.vm as unknown as ViewVm
    vm.openEdit(creditAccount)
    expect(vm.form.name).toBe('招行信用卡')
    expect(vm.form.type).toBe('credit')
    expect(vm.form.cardNumber).toBe('6225 8899 0011 2233')
    expect(vm.form.creditLimit).toBe(20000)
    expect(vm.form.billDate).toBe(5)
    expect(vm.form.dueDate).toBe(23)
  })

  it('信用卡还款调用 credit.repay 并提交还款账户与金额', async () => {
    const api = createApi()
    const wrapper = mountView()
    await flushPromises()

    const vm = wrapper.vm as unknown as ViewVm
    vm.openRepay(creditAccount)
    vm.repayForm.amount = 800
    vm.repayForm.fundingAccountId = 2
    vm.repayForm.date = '2026-02-10'
    await vm.submitRepay()

    expect(api.credit.repay).toHaveBeenCalledWith({
      creditAccountId: 1,
      fundingAccountId: 2,
      amount: 800,
      date: '2026-02-10',
      note: null
    })
  })
})
