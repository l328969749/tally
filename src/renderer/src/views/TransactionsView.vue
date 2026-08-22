<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type {
  TransactionFilter,
  TransactionWithMeta
} from '@shared/types/models'
import TransactionForm from '@renderer/components/TransactionForm.vue'
import { mapErrorCode } from '@renderer/utils/error-messages'
import { useAccountStore } from '@renderer/stores/account'
import { useCategoryStore } from '@renderer/stores/category'
import { useTagStore } from '@renderer/stores/tag'
import { formatAmount } from '@renderer/utils/date'

const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

const items = ref<TransactionWithMeta[]>([])
const total = ref(0)
const loading = ref(false)

const formVisible = ref(false)
const formMode = ref<'create' | 'edit' | 'copy'>('create')
const editingTransaction = ref<TransactionWithMeta | null>(null)

const filter = reactive<TransactionFilter>({
  type: undefined,
  startDate: undefined,
  endDate: undefined,
  categoryIds: [] as number[],
  accountIds: [] as number[],
  keyword: '',
  tagIds: [] as number[],
  page: 1,
  pageSize: 20
})

const categoryOptions = computed(() => {
  const roots = categoryStore.categories.filter((c) => c.parentId === null)
  return roots.map((root) => ({
    id: root.id,
    name: root.name,
    children: categoryStore.categories.filter((c) => c.parentId === root.id)
  }))
})

const typeOptions = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' }
]

onMounted(async () => {
  await Promise.all([
    accountStore.fetch(),
    categoryStore.fetch(),
    tagStore.fetch()
  ])
  await load()
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const cleanFilter: TransactionFilter = {
      type: filter.type,
      startDate: filter.startDate || undefined,
      endDate: filter.endDate || undefined,
      categoryIds: (filter.categoryIds ?? []).length ? filter.categoryIds : undefined,
      accountIds: (filter.accountIds ?? []).length ? filter.accountIds : undefined,
      keyword: filter.keyword || undefined,
      tagIds: (filter.tagIds ?? []).length ? filter.tagIds : undefined,
      page: filter.page,
      pageSize: filter.pageSize
    }
    const result = await window.api.transaction.list(cleanFilter)
    if ('error' in result) {
      items.value = []
      total.value = 0
      return
    }
    items.value = result.items
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function search(): void {
  filter.page = 1
  load()
}

function resetFilter(): void {
  Object.assign(filter, {
    type: undefined,
    startDate: undefined,
    endDate: undefined,
    categoryIds: [],
    accountIds: [],
    keyword: '',
    tagIds: [],
    page: 1
  })
  load()
}

function openCreate(): void {
  formMode.value = 'create'
  editingTransaction.value = null
  formVisible.value = true
}

function openEdit(transaction: TransactionWithMeta): void {
  formMode.value = 'edit'
  editingTransaction.value = transaction
  formVisible.value = true
}

function openCopy(transaction: TransactionWithMeta): void {
  formMode.value = 'copy'
  editingTransaction.value = transaction
  formVisible.value = true
}

async function removeTransaction(transaction: TransactionWithMeta): Promise<void> {
  try {
    await ElMessageBox.confirm('确定删除这笔流水吗？删除后不可恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  const result = await window.api.transaction.delete(transaction.id)
  if ('error' in result) {
    ElMessage.error(mapErrorCode(result.error))
    return
  }
  ElMessage.success('已删除')
  await load()
}

function onSaved(): void {
  load()
}

function categoryLabel(id: number): string {
  return categoryStore.categoryName(id)
}
</script>

<template>
  <div class="transactions">
    <div class="page-header">
      <h2 class="page-title">流水</h2>
      <el-button type="primary" @click="openCreate">
        <el-icon><component :is="'Plus'" /></el-icon>
        记一笔
      </el-button>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="filter.type" @change="search">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
      <el-date-picker
        v-model="filter.startDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="开始日期"
        :clearable="true"
      />
      <el-date-picker
        v-model="filter.endDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="结束日期"
        :clearable="true"
      />
      <el-select
        v-model="filter.categoryIds"
        multiple
        collapse-tags
        placeholder="分类"
        style="width: 180px"
        :clearable="true"
      >
        <el-option-group v-for="group in categoryOptions" :key="group.id" :label="group.name">
          <el-option :label="group.name" :value="group.id" />
          <el-option v-for="child in group.children" :key="child.id" :label="`  ${child.name}`" :value="child.id" />
        </el-option-group>
      </el-select>
      <el-select
        v-model="filter.accountIds"
        multiple
        collapse-tags
        placeholder="账户"
        style="width: 160px"
        :clearable="true"
      >
        <el-option v-for="acc in accountStore.accounts" :key="acc.id" :label="acc.name" :value="acc.id" />
      </el-select>
      <el-select
        v-model="filter.tagIds"
        multiple
        collapse-tags
        placeholder="标签"
        style="width: 160px"
        :clearable="true"
      >
        <el-option v-for="tag in tagStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
      </el-select>
      <el-input
        v-model="filter.keyword"
        placeholder="备注关键词"
        style="width: 140px"
        clearable
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilter">重置</el-button>
    </div>

    <div class="table-card">
      <el-table v-loading="loading" :data="items" size="default" style="width: 100%">
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="type" label="类型" width="70">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ categoryLabel(row.categoryId) }}
          </template>
        </el-table-column>
        <el-table-column prop="accountName" label="账户" width="110" />
        <el-table-column prop="note" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="标签" width="140">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag.id"
              size="small"
              type="info"
              class="tag-item"
            >
              {{ tag.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="140" align="right">
          <template #default="{ row }">
            <span :class="row.type">
              {{ row.type === 'income' ? '+' : '-' }}¥ {{ formatAmount(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="openCopy(row)">复制</el-button>
            <el-button link type="danger" size="small" @click="removeTransaction(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="filter.page"
          v-model:page-size="filter.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="load"
          @size-change="search"
        />
      </div>
    </div>

    <TransactionForm
      v-model:visible="formVisible"
      :mode="formMode"
      :transaction="editingTransaction"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.transactions {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: #fff;
  padding: 14px;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  margin-bottom: 16px;
}

.table-card {
  background: #fff;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  padding: 16px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.tag-item {
  margin-right: 4px;
}

.income {
  color: #67c23a;
}

.expense {
  color: #f56c6c;
}
</style>
