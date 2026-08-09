<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AccountType, AccountWithBalance } from '@shared/types/models'
import { useAccountStore } from '@renderer/stores/account'
import { formatAmount } from '@renderer/utils/date'

const accountStore = useAccountStore()

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  type: 'bank' as AccountType,
  initialBalance: 0
})

const typeOptions = [
  { label: '现金', value: 'cash' },
  { label: '银行卡', value: 'bank' },
  { label: '支付宝', value: 'alipay' },
  { label: '微信', value: 'wechat' },
  { label: '其他', value: 'other' }
]

const totalBalance = computed(() => accountStore.totalBalance)

onMounted(() => {
  accountStore.fetch()
})

function openCreate(): void {
  editingId.value = null
  Object.assign(form, { name: '', type: 'bank', initialBalance: 0 })
  dialogVisible.value = true
}

function openEdit(account: AccountWithBalance): void {
  editingId.value = account.id
  Object.assign(form, {
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalance
  })
  dialogVisible.value = true
}

async function save(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请输入账户名称')
    return
  }
  try {
    if (editingId.value) {
      await accountStore.update(editingId.value, {
        name: form.name.trim(),
        type: form.type,
        initialBalance: form.initialBalance
      })
      ElMessage.success('账户已更新')
    } else {
      await accountStore.create({
        name: form.name.trim(),
        type: form.type,
        initialBalance: form.initialBalance
      })
      ElMessage.success('账户已创建')
    }
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function removeAccount(account: AccountWithBalance): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除账户「${account.name}」吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  const result = await window.api.account.delete(account.id)
  if ('error' in result) {
    if (result.error === 'ACCOUNT_HAS_TRANSACTIONS') {
      ElMessage.warning('该账户存在关联流水，不能删除，可选择归档')
    } else {
      ElMessage.error(result.error)
    }
    return
  }
  ElMessage.success('已删除')
  await accountStore.fetch()
}

async function toggleArchive(account: AccountWithBalance): Promise<void> {
  await accountStore.archive(account.id, !account.archived)
  ElMessage.success(account.archived ? '已恢复' : '已归档')
}

async function moveUp(account: AccountWithBalance, index: number): Promise<void> {
  if (index === 0) {
    return
  }
  const prev = accountStore.accounts[index - 1]
  await accountStore.reorder(account.id, prev.sortOrder)
  await accountStore.reorder(prev.id, account.sortOrder)
  await accountStore.fetch()
}

function typeLabel(type: AccountType): string {
  return typeOptions.find((opt) => opt.value === type)?.label ?? type
}
</script>

<template>
  <div class="accounts">
    <div class="page-header">
      <h2 class="page-title">账户</h2>
      <el-button type="primary" @click="openCreate">
        <el-icon><component :is="'Plus'" /></el-icon>
        新建账户
      </el-button>
    </div>

    <div class="summary-card">
      <div class="summary-label">总余额</div>
      <div class="summary-value">¥ {{ formatAmount(totalBalance) }}</div>
    </div>

    <div class="table-card">
      <el-table :data="accountStore.accounts" style="width: 100%">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ typeLabel(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="初始余额" width="120" align="right">
          <template #default="{ row }">
            ¥ {{ formatAmount(row.initialBalance) }}
          </template>
        </el-table-column>
        <el-table-column label="当前余额" width="140" align="right">
          <template #default="{ row }">
            <span class="balance">¥ {{ formatAmount(row.balance) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.archived" type="info" size="small">已归档</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row, $index }">
            <el-button link type="primary" size="small" :disabled="$index === 0" @click="moveUp(row, $index)">
              上移
            </el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="toggleArchive(row)">
              {{ row.archived ? '恢复' : '归档' }}
            </el-button>
            <el-button link type="danger" size="small" @click="removeAccount(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑账户' : '新建账户'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="例如：招商银行储蓄卡" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始余额">
          <el-input-number
            v-model="form.initialBalance"
            :precision="2"
            :step="100"
            :controls="false"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.accounts {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.summary-card {
  background: linear-gradient(135deg, var(--el-color-primary), #5b8cff);
  color: #fff;
  border-radius: var(--app-radius);
  padding: 20px 24px;
  margin-bottom: 16px;
}

.summary-label {
  font-size: 13px;
  opacity: 0.85;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
}

.table-card {
  background: #fff;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  padding: 16px;
}

.balance {
  font-weight: 600;
}
</style>
