// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { message } = vi.hoisted(() => ({
  message: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()
  return { ...actual, ElMessage: message }
})

import TransactionForm from '@renderer/components/TransactionForm.vue'
import type { TransactionWithMeta } from '@shared/types/models'

function buildStubs(): Record<string, unknown> {
  return {
    'el-dialog': {
      name: 'ElDialog',
      template: '<div class="el-dialog-stub"><slot /><slot name="footer" /></div>'
    },
    'el-form': { name: 'ElForm', template: '<div class="el-form-stub"><slot /></div>' },
    'el-form-item': { name: 'ElFormItem', template: '<div class="el-form-item-stub"><slot /></div>' },
    'el-radio-group': { name: 'ElRadioGroup', template: '<div class="el-radio-group-stub"><slot /></div>' },
    'el-radio-button': { name: 'ElRadioButton', template: '<div class="el-radio-button-stub"><slot /></div>' },
    'el-input-number': {
      name: 'ElInputNumber',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<div class="el-input-number-stub" />'
    },
    'el-select': {
      name: 'ElSelect',
      props: ['modelValue', 'multiple', 'filterable', 'allowCreate', 'placeholder'],
      emits: ['update:modelValue'],
      template: '<div class="el-select-stub" />'
    },
    'el-option-group': { name: 'ElOptionGroup', template: '<div class="el-option-group-stub"><slot /></div>' },
    'el-option': { name: 'ElOption', template: '<div class="el-option-stub"><slot /></div>' },
    'el-date-picker': {
      name: 'ElDatePicker',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<div class="el-date-picker-stub" />'
    },
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
    teleport: true
  }
}

function createApi(): {
  transaction: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  tag: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  account: { list: ReturnType<typeof vi.fn> }
  category: { list: ReturnType<typeof vi.fn> }
} {
  const tags = [{ id: 1, name: '工作' }]
  let nextTagId = 2
  const api = {
    transaction: { create: vi.fn(), update: vi.fn() },
    tag: {
      list: vi.fn(async () => [...tags]),
      create: vi.fn(async (name: string) => {
        const tag = { id: nextTagId++, name }
        tags.push(tag)
        return tag
      }),
      update: vi.fn(),
      delete: vi.fn()
    },
    account: {
      list: vi.fn(async () => [
        { id: 1, name: '现金', type: 'cash', initialBalance: 0, sortOrder: 1, archived: 0, createdAt: 0 }
      ])
    },
    category: {
      list: vi.fn(async () => [
        { id: 10, name: '餐饮', type: 'expense', parentId: null, sortOrder: 1 }
      ])
    }
  }
  ;(window as unknown as { api: unknown }).api = api
  return api
}

function mountForm(props: Record<string, unknown>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(TransactionForm, {
    props,
    global: { plugins: [pinia], stubs: buildStubs() }
  })
}

async function openForm(wrapper: ReturnType<typeof mount>, mode: 'create' | 'edit' | 'copy', transaction: TransactionWithMeta | null): Promise<void> {
  await wrapper.setProps({ visible: false })
  await wrapper.setProps({ visible: true, mode, transaction })
  await flushPromises()
}

function selectByName(wrapper: ReturnType<typeof mount>, name: string, placeholder?: string) {
  const selects = wrapper.findAllComponents({ name: 'ElSelect' })
  return placeholder ? selects.find((s) => s.props('placeholder') === placeholder) : selects
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TransactionForm', () => {
  it('5.7-表单校验: 金额为空时阻止保存并提示', async () => {
    const api = createApi()
    const wrapper = mountForm({ visible: true, mode: 'create', transaction: null })
    await flushPromises()

    const confirm = wrapper.findAllComponents({ name: 'ElButton' }).find((b) => b.text().trim() === '确定')!
    await confirm.trigger('click')

    expect(message.warning).toHaveBeenCalledWith('请输入正确的金额')
    expect(api.transaction.create).not.toHaveBeenCalled()
  })

  it('5.7-表单校验: 依次提示缺失的分类与账户', async () => {
    const api = createApi()
    const wrapper = mountForm({ visible: true, mode: 'create', transaction: null })
    await flushPromises()

    await wrapper.findComponent({ name: 'ElInputNumber' }).vm.$emit('update:modelValue', '100')
    let confirm = wrapper.findAllComponents({ name: 'ElButton' }).find((b) => b.text().trim() === '确定')!
    await confirm.trigger('click')
    expect(message.warning).toHaveBeenLastCalledWith('请选择分类')

    await selectByName(wrapper, 'ElSelect', '选择分类')!.vm.$emit('update:modelValue', 10)
    confirm = wrapper.findAllComponents({ name: 'ElButton' }).find((b) => b.text().trim() === '确定')!
    await confirm.trigger('click')
    expect(message.warning).toHaveBeenLastCalledWith('请选择账户')
    expect(api.transaction.create).not.toHaveBeenCalled()
  })

  it('5.7-表单校验: 完整填写后提交正确 payload', async () => {
    const api = createApi()
    const wrapper = mountForm({ visible: false, mode: 'create', transaction: null })
    await openForm(wrapper, 'create', null)

    await wrapper.findComponent({ name: 'ElInputNumber' }).vm.$emit('update:modelValue', 100)
    await selectByName(wrapper, 'ElSelect', '选择分类')!.vm.$emit('update:modelValue', 10)
    await selectByName(wrapper, 'ElSelect', '选择账户')!.vm.$emit('update:modelValue', 1)

    const confirm = wrapper.findAllComponents({ name: 'ElButton' }).find((b) => b.text().trim() === '确定')!
    await confirm.trigger('click')
    await flushPromises()

    expect(api.transaction.create).toHaveBeenCalledTimes(1)
    const payload = api.transaction.create.mock.calls[0][0]
    expect(payload).toMatchObject({ type: 'expense', amount: 100, categoryId: 10, accountId: 1, tagIds: [] })
    expect(message.success).toHaveBeenCalled()
  })

  it('5.7-标签绑定: 输入新标签名自动创建并回填为标签 id', async () => {
    const api = createApi()
    const wrapper = mountForm({ visible: false, mode: 'create', transaction: null })
    await openForm(wrapper, 'create', null)

    const tagSelect = selectByName(wrapper, 'ElSelect', '选择或输入标签')!
    await tagSelect.vm.$emit('update:modelValue', ['午餐'])
    await flushPromises()

    expect(api.tag.create).toHaveBeenCalledWith('午餐')
    const modelValue = tagSelect.props('modelValue') as Array<number | string>
    expect(modelValue).toEqual([2])
  })

  it('5.7-编辑模式: 加载既有流水数据到表单', async () => {
    const api = createApi()
    const transaction: TransactionWithMeta = {
      id: 5,
      type: 'expense',
      amount: 88,
      categoryId: 10,
      accountId: 1,
      note: '打车',
      date: '2026-04-01',
      createdAt: 0,
      updatedAt: 0,
      categoryName: '餐饮',
      accountName: '现金',
      tags: [{ id: 1, name: '工作' }]
    }
    const wrapper = mountForm({ visible: false, mode: 'edit', transaction })
    await openForm(wrapper, 'edit', transaction)

    expect(wrapper.findComponent({ name: 'ElInputNumber' }).props('modelValue')).toBe(88)
    expect(selectByName(wrapper, 'ElSelect', '选择分类')!.props('modelValue')).toBe(10)
    expect(selectByName(wrapper, 'ElSelect', '选择账户')!.props('modelValue')).toBe(1)
    expect(wrapper.findComponent({ name: 'ElDatePicker' }).props('modelValue')).toBe('2026-04-01')
    const tagSelect = selectByName(wrapper, 'ElSelect', '选择或输入标签')!
    expect(tagSelect.props('modelValue')).toEqual([1])
  })
})
