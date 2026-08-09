<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { TransactionInput, TransactionWithMeta } from '@shared/types/models'
import { useAccountStore } from '@renderer/stores/account'
import { useCategoryStore } from '@renderer/stores/category'
import { useTagStore } from '@renderer/stores/tag'
import { today } from '@renderer/utils/date'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit' | 'copy'
  transaction?: TransactionWithMeta | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

const saving = ref(false)

const form = reactive({
  type: 'expense' as 'income' | 'expense',
  amount: null as number | null,
  categoryId: null as number | null,
  accountId: null as number | null,
  date: today(),
  note: '',
  tagIds: [] as number[]
})

const visibleModel = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const filteredCategories = computed(() =>
  categoryStore.categories.filter((c) => c.type === form.type && c.parentId === null)
)

const amountDisplay = computed({
  get: () => (form.amount === null ? '' : String(form.amount)),
  set: (value: string) => {
    const num = parseFloat(value)
    form.amount = Number.isFinite(num) ? num : null
  }
})

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (!accountStore.loaded) {
        accountStore.fetch()
      }
      if (!categoryStore.loaded) {
        categoryStore.fetch()
      }
      if (!tagStore.loaded) {
        tagStore.fetch()
      }
      if (props.mode === 'create') {
        Object.assign(form, {
          type: 'expense',
          amount: null,
          categoryId: null,
          accountId: accountStore.accounts[0]?.id ?? null,
          date: today(),
          note: '',
          tagIds: []
        })
      } else if (props.transaction) {
        Object.assign(form, {
          type: props.transaction.type,
          amount: props.transaction.amount,
          categoryId: props.transaction.categoryId,
          accountId: props.transaction.accountId,
          date: props.transaction.date,
          note: props.transaction.note ?? '',
          tagIds: props.transaction.tags.map((tag) => tag.id)
        })
      }
    }
  }
)

watch(
  () => form.type,
  () => {
    form.categoryId = null
  }
)

async function save(): Promise<void> {
  if (form.amount === null || form.amount <= 0) {
    ElMessage.warning('请输入正确的金额')
    return
  }
  if (!form.categoryId) {
    ElMessage.warning('请选择分类')
    return
  }
  if (!form.accountId) {
    ElMessage.warning('请选择账户')
    return
  }
  const payload: TransactionInput = {
    type: form.type,
    amount: form.amount,
    categoryId: form.categoryId,
    accountId: form.accountId,
    date: form.date,
    note: form.note || null,
    tagIds: form.tagIds
  }
  saving.value = true
  try {
    if (props.mode === 'edit' && props.transaction) {
      await window.api.transaction.update(props.transaction.id, payload)
    } else {
      await window.api.transaction.create(payload)
    }
    ElMessage.success(props.mode === 'edit' ? '流水已更新' : '流水已记录')
    visibleModel.value = false
    emit('saved')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visibleModel"
    :title="
      mode === 'create'
        ? '记一笔'
        : mode === 'edit'
          ? '编辑流水'
          : '复制并记账'
    "
    width="480px"
    @update:model-value="visibleModel = $event"
  >
    <el-form label-width="70px">
      <el-form-item label="类型">
        <el-radio-group v-model="form.type">
          <el-radio-button value="expense">支出</el-radio-button>
          <el-radio-button value="income">收入</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="金额">
        <el-input-number
          v-model="form.amount"
          :min="0.01"
          :precision="2"
          :step="1"
          :controls="false"
          style="width: 100%"
          placeholder="0.00"
        />
      </el-form-item>
      <el-form-item label="分类">
        <el-select
          v-model="form.categoryId"
          placeholder="选择分类"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="category in filteredCategories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="账户">
        <el-select
          v-model="form.accountId"
          placeholder="选择账户"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="account in accountStore.accounts"
            :key="account.id"
            :label="account.name"
            :value="account.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="日期">
        <el-date-picker
          v-model="form.date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="标签">
        <el-select
          v-model="form.tagIds"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="选择或输入标签"
          style="width: 100%"
        >
          <el-option
            v-for="tag in tagStore.tags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="2"
          placeholder="备注（可选）"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ mode === 'edit' ? '保存' : '确定' }}
      </el-button>
    </template>
  </el-dialog>
</template>
