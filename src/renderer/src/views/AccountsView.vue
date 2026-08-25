<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AccountType, AccountWithBalance } from '@shared/types/models'
import { useAccountStore } from '@renderer/stores/account'
import { formatAmount } from '@renderer/utils/date'
import { isDueReminder, maskCardNumber } from '@renderer/utils/credit'
import { mapErrorCode } from '@renderer/utils/error-messages'

const accountStore = useAccountStore()

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const repayDialogVisible = ref(false)
const repayTarget = ref<AccountWithBalance | null>(null)
const repayForm = reactive({
  fundingAccountId: 0,
  amount: 0,
  date: '',
  note: ''
})

const form = reactive({
  name: '',
  type: 'bank' as AccountType,
  initialBalance: 0,
  cardNumber: '',
  creditLimit: 0,
  billDate: 1,
  dueDate: 1
})

const typeOptions = [
  { label: '现金', value: 'cash' },
  { label: '银行卡', value: 'bank' },
  { label: '支付宝', value: 'alipay' },
  { label: '微信', value: 'wechat' },
  { label: '信用卡', value: 'credit' },
  { label: '其他', value: 'other' }
]

const cardFilter = ref('')
const showFullCard = ref(false)

const totalBalance = computed(() => accountStore.totalBalance)

const fundingAccounts = computed(() =>
  accountStore.accounts.filter((account) => account.type !== 'credit' && !account.archived)
)

const filteredAccounts = computed(() => {
  const keyword = cardFilter.value.trim()
  if (!keyword) {
    return accountStore.accounts
  }
  return accountStore.accounts.filter((account) => {
    const digits = (account.cardNumber ?? '').replace(/\s+/g, '')
    return digits.endsWith(keyword)
  })
})

onMounted(() => {
  accountStore.fetch()
})

function openCreate(): void {
  editingId.value = null
  Object.assign(form, {
    name: '',
    type: 'bank',
    initialBalance: 0,
    cardNumber: '',
    creditLimit: 0,
    billDate: 1,
    dueDate: 1
  })
  dialogVisible.value = true
}

function openEdit(account: AccountWithBalance): void {
  editingId.value = account.id
  Object.assign(form, {
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalance,
    cardNumber: account.cardNumber ?? '',
    creditLimit: account.creditLimit ?? 0,
    billDate: account.billDate ?? 1,
    dueDate: account.dueDate ?? 1
  })
  dialogVisible.value = true
}

async function save(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请输入账户名称')
    return
  }
  const payload = {
    name: form.name.trim(),
    type: form.type,
    initialBalance: form.initialBalance
  }
  const creditPayload =
    form.type === 'credit'
      ? {
          ...payload,
          cardNumber: form.cardNumber.trim() || null,
          creditLimit: form.creditLimit,
          billDate: form.billDate,
          dueDate: form.dueDate
        }
      : payload
  try {
    if (editingId.value) {
      await accountStore.update(editingId.value, creditPayload)
      ElMessage.success('账户已更新')
    } else {
      await accountStore.create(creditPayload)
      ElMessage.success('账户已创建')
    }
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(mapErrorCode(error instanceof Error ? error.message : undefined))
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
      ElMessage.error(mapErrorCode(result.error))
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

function cardDisplay(account: AccountWithBalance): string {
  if (!account.cardNumber) {
    return '-'
  }
  return showFullCard.value ? account.cardNumber : maskCardNumber(account.cardNumber)
}

function dueReminder(account: AccountWithBalance): boolean {
  return isDueReminder(account.dueDate, account.balance, new Date())
}

function openRepay(account: AccountWithBalance): void {
  repayTarget.value = account
  repayForm.fundingAccountId = fundingAccounts.value[0]?.id ?? 0
  repayForm.amount = Math.abs(account.balance)
  repayForm.date = new Date().toISOString().slice(0, 10)
  repayForm.note = ''
  repayDialogVisible.value = true
}

async function submitRepay(): Promise<void> {
  if (!repayTarget.value) {
    return
  }
  if (!repayForm.fundingAccountId) {
    ElMessage.warning('请选择还款账户')
    return
  }
  if (!(repayForm.amount > 0)) {
    ElMessage.warning('请输入有效的还款金额')
    return
  }
  if (!repayForm.date) {
    ElMessage.warning('请选择还款日期')
    return
  }
  const result = await window.api.credit.repay({
    creditAccountId: repayTarget.value.id,
    fundingAccountId: repayForm.fundingAccountId,
    amount: repayForm.amount,
    date: repayForm.date,
    note: repayForm.note.trim() || null
  })
  if ('error' in result) {
    ElMessage.error(mapErrorCode(result.error))
    return
  }
  ElMessage.success('还款成功')
  repayDialogVisible.value = false
  await accountStore.fetch()
}
</script>

<template>
  <div class="accounts">
    <div class="page-header">
      <h2 class="page-title">账户</h2>
      <div class="header-actions">
        <el-input
          v-model="cardFilter"
          placeholder="按卡号末四位筛选"
          clearable
          style="width: 180px"
        />
        <el-button @click="showFullCard = !showFullCard">
          {{ showFullCard ? '隐藏完整卡号' : '显示完整卡号' }}
        </el-button>
        <el-button type="primary" @click="openCreate">
          <el-icon><component :is="'Plus'" /></el-icon>
          新建账户
        </el-button>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-label">总余额</div>
      <div class="summary-value">¥ {{ formatAmount(totalBalance) }}</div>
    </div>

    <div class="table-card">
      <el-table :data="filteredAccounts" style="width: 100%">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="name" label="名称" min-width="130" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            {{ typeLabel(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="卡号" width="150">
          <template #default="{ row }">
            <span class="mono">{{ cardDisplay(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="当前余额" width="130" align="right">
          <template #default="{ row }">
            <span :class="['balance', { 'credit-debt': row.balance < 0 }]">
              ¥ {{ formatAmount(row.balance) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="剩余额度" width="110" align="right">
          <template #default="{ row }">
            <template v-if="row.type === 'credit'">
              ¥ {{ formatAmount(row.availableCredit ?? 0) }}
            </template>
            <template v-else>-</template>
          </template>
        </el-table-column>
        <el-table-column label="还款日" width="120">
          <template #default="{ row }">
            <template v-if="row.type === 'credit' && row.dueDate">
              <el-tag v-if="dueReminder(row)" type="danger" size="small">提醒</el-tag>
              {{ row.dueDate }} 日
            </template>
            <template v-else>-</template>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.archived" type="info" size="small">已归档</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center">
          <template #default="{ row, $index }">
            <el-button
              v-if="row.type === 'credit' && !row.archived && row.balance < 0"
              link
              type="warning"
              size="small"
              @click="openRepay(row)"
            >
              还款
            </el-button>
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑账户' : '新建账户'" width="460px">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="例如：招商银行信用卡" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <template v-if="form.type === 'credit'">
          <el-form-item label="卡号">
            <el-input v-model="form.cardNumber" placeholder="银行卡卡号" />
          </el-form-item>
          <el-form-item label="信用额度">
            <el-input-number
              v-model="form.creditLimit"
              :precision="2"
              :step="1000"
              :controls="false"
              :min="0"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="账单日">
            <el-input-number v-model="form.billDate" :min="1" :max="31" :controls="false" style="width: 100%" />
          </el-form-item>
          <el-form-item label="还款日">
            <el-input-number v-model="form.dueDate" :min="1" :max="31" :controls="false" style="width: 100%" />
          </el-form-item>
        </template>
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

    <el-dialog v-model="repayDialogVisible" title="信用卡还款" width="440px">
      <el-form label-width="80px">
        <el-form-item label="信用卡">
          <span>{{ repayTarget?.name }}</span>
        </el-form-item>
        <el-form-item label="当前欠款">
          <span class="credit-debt">¥ {{ formatAmount(repayTarget?.balance ?? 0) }}</span>
        </el-form-item>
        <el-form-item label="还款账户">
          <el-select v-model="repayForm.fundingAccountId" style="width: 100%">
            <el-option v-for="acc in fundingAccounts" :key="acc.id" :label="acc.name" :value="acc.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="还款金额">
          <el-input-number
            v-model="repayForm.amount"
            :precision="2"
            :min="0.01"
            :controls="false"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="还款日期">
          <el-date-picker v-model="repayForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="repayForm.note" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="repayDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRepay">确认还款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.accounts {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
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

.credit-debt {
  font-weight: 600;
  color: var(--el-color-danger);
}

.mono {
  font-family: 'SFMono-Regular', Consolas, monospace;
}
</style>
