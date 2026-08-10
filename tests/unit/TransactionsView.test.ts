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

import TransactionsView from '@renderer/views/TransactionsView.vue'

const txItems = [
  {
    id: 1,
    type: 'expense',
    amount: 50,
    categoryId: 10,
    accountId: 1,
    note: '午餐',
    date: '2026-04-01',
    createdAt: 0,
    updatedAt: 0,
    categoryName: '餐饮',
    accountName: '现金',
    tags: [{ id: 1, name: '工作' }]
  },
  {
    id: 2,
    type: 'income',
    amount: 5000,
    categoryId: 20,
    accountId: 1,
    note: '工资',
    date: '2026-04-02',
    createdAt: 0,
    updatedAt: 0,
    categoryName: '工资',
    accountName: '现金',
    tags: []
  }
]

function buildStubs(): Record<string, unknown> {
  return {
    'el-radio-group': { name: 'ElRadioGroup', template: '<div class="el-radio-group-stub"><slot /></div>' },
    'el-radio-button': { name: 'ElRadioButton', template: '<div class="el-radio-button-stub"><slot /></div>' },
    'el-date-picker': {
      name: 'ElDatePicker',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<div class="el-date-picker-stub" />'
    },
    'el-select': {
      name: 'ElSelect',
      props: ['modelValue', 'multiple', 'placeholder'],
      emits: ['update:modelValue'],
      template: '<div class="el-select-stub" />'
    },
    'el-option-group': { name: 'ElOptionGroup', template: '<div class="el-option-group-stub"><slot /></div>' },
    'el-option': { name: 'ElOption', template: '<div class="el-option-stub"><slot /></div>' },
    'el-input': {
      name: 'ElInput',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<div class="el-input-stub" />'
    },
    'el-button': {
      name: 'ElButton',
      emits: ['click'],
      template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>'
    },
    'el-table': {
      name: 'ElTable',
      props: ['data'],
      template: '<div class="el-table-stub"><div v-for="row in data" :key="row.id" class="table-row" /></div>'
    },
    'el-table-column': { name: 'ElTableColumn', template: '<div class="el-table-column-stub" />' },
    'el-pagination': {
      name: 'ElPagination',
      props: ['total', 'currentPage', 'pageSize'],
      template: '<div class="el-pagination-stub" />'
    },
    'el-tag': { name: 'ElTag', template: '<span class="el-tag-stub"><slot /></span>' },
    'el-icon': { name: 'ElIcon', template: '<span class="el-icon-stub"><slot /></span>' },
    TransactionForm: { name: 'TransactionForm', template: '<div class="transaction-form-stub" />' },
    teleport: true
  }
}

function createApi() {
  const list = vi.fn(async (filter: { page?: number; pageSize?: number }) => ({
    items: txItems,
    total: txItems.length,
    page: filter.page ?? 1,
    pageSize: filter.pageSize ?? 20
  }))
  const api = {
    transaction: { list, create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    account: {
      list: vi.fn(async () => [
        { id: 1, name: '现金', type: 'cash', initialBalance: 0, sortOrder: 1, archived: 0, createdAt: 0 }
      ])
    },
    category: {
      list: vi.fn(async () => [
        { id: 10, name: '餐饮', type: 'expense', parentId: null, sortOrder: 1 },
        { id: 20, name: '工资', type: 'income', parentId: null, sortOrder: 1 }
      ])
    },
    tag: { list: vi.fn(async () => [{ id: 1, name: '工作' }]) }
  }
  ;(window as unknown as { api: unknown }).api = api
  return api
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(TransactionsView, {
    global: { plugins: [pinia], stubs: buildStubs() }
  })
}

async function clickButton(wrapper: ReturnType<typeof mount>, text: string): Promise<void> {
  const button = wrapper.findAllComponents({ name: 'ElButton' }).find((b) => b.text().trim() === text)
  expect(button, `未找到按钮「${text}」`).toBeTruthy()
  await button!.trigger('click')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TransactionsView', () => {
  it('5.7-列表渲染: 挂载后按默认分页加载并渲染流水行', async () => {
    const api = createApi()
    const wrapper = mountView()
    await flushPromises()

    expect(api.transaction.list).toHaveBeenCalledTimes(1)
    expect(api.transaction.list.mock.calls[0][0]).toMatchObject({ page: 1, pageSize: 20 })
    expect(wrapper.findAll('.table-row')).toHaveLength(2)
  })

  it('5.7-组合筛选: 关键词与分类筛选触发重新查询', async () => {
    const api = createApi()
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElInput' }).vm.$emit('update:modelValue', '午餐')
    await clickButton(wrapper, '查询')
    expect(api.transaction.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: '午餐', page: 1 })
    )

    const categorySelect = wrapper
      .findAllComponents({ name: 'ElSelect' })
      .find((s) => s.props('placeholder') === '分类')!
    await categorySelect.vm.$emit('update:modelValue', [10])
    await clickButton(wrapper, '查询')
    expect(api.transaction.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryIds: [10], page: 1 })
    )
  })

  it('5.7-筛选重置: 重置后以空条件重新加载', async () => {
    const api = createApi()
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElInput' }).vm.$emit('update:modelValue', '午餐')
    await clickButton(wrapper, '重置')
    await flushPromises()

    const lastCall = api.transaction.list.mock.calls.at(-1)![0]
    expect(lastCall.keyword).toBeUndefined()
    expect(lastCall.categoryIds).toBeUndefined()
  })
})
