<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Asset, AssetType, Liability } from '@shared/types/models'
import { useAssetStore } from '@renderer/stores/asset'
import { useAccountStore } from '@renderer/stores/account'
import { formatAmount } from '@renderer/utils/date'
import { mapErrorCode } from '@renderer/utils/error-messages'

const assetStore = useAssetStore()
const accountStore = useAccountStore()

const dialogVisible = ref(false)
const assetMode = ref<AssetType>('fixed')
const editingId = ref<number | null>(null)
const assetForm = reactive({
  name: '',
  type: 'fixed' as AssetType,
  value: 0,
  unit: '',
  note: ''
})

const liabilityDialogVisible = ref(false)
const editingLiabilityId = ref<number | null>(null)
const liabilityForm = reactive({
  name: '',
  totalAmount: 0,
  paidAmount: 0,
  interestRate: 0,
  note: ''
})

const valueDialogVisible = ref(false)
const currentAsset = ref<Asset | null>(null)
const valueForm = reactive({ value: 0, date: '' })

const typeOptions = [
  { label: '固定资产', value: 'fixed' },
  { label: '投资资产', value: 'investment' },
  { label: '流动资产', value: 'liquid' }
]

const liquidTotal = computed(() => accountStore.totalBalance)
const netWorth = computed(
  () => liquidTotal.value + assetStore.fixedTotal + assetStore.investmentTotal - assetStore.liabilityTotal
)
const totalAssets = computed(() => liquidTotal.value + assetStore.fixedTotal + assetStore.investmentTotal)

function assetRatio(value: number): string {
  if (totalAssets.value <= 0) {
    return '-'
  }
  return `${((value / totalAssets.value) * 100).toFixed(1)}%`
}

onMounted(() => {
  assetStore.fetch()
  accountStore.fetch()
})

function openCreateAsset(type: AssetType = 'fixed'): void {
  editingId.value = null
  Object.assign(assetForm, {
    name: '',
    type,
    value: 0,
    unit: type === 'investment' ? '元' : '',
    note: ''
  })
  dialogVisible.value = true
}

function openEditAsset(asset: Asset): void {
  editingId.value = asset.id
  Object.assign(assetForm, {
    name: asset.name,
    type: asset.type,
    value: asset.value,
    unit: asset.unit ?? '',
    note: asset.note ?? ''
  })
  dialogVisible.value = true
}

async function saveAsset(): Promise<void> {
  if (!assetForm.name.trim()) {
    ElMessage.warning('请输入资产名称')
    return
  }
  try {
    if (editingId.value) {
      await assetStore.update(editingId.value, {
        name: assetForm.name.trim(),
        type: assetForm.type,
        value: assetForm.value,
        unit: assetForm.unit || null,
        note: assetForm.note || null
      })
      ElMessage.success('资产已更新')
    } else {
      await assetStore.create({
        name: assetForm.name.trim(),
        type: assetForm.type,
        value: assetForm.value,
        unit: assetForm.unit || null,
        note: assetForm.note || null
      })
      ElMessage.success('资产已添加')
    }
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(mapErrorCode(error instanceof Error ? error.message : undefined))
  }
}

async function removeAsset(asset: Asset): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除资产「${asset.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await assetStore.remove(asset.id)
  ElMessage.success('已删除')
}

function openValueDialog(asset: Asset): void {
  currentAsset.value = asset
  Object.assign(valueForm, { value: asset.value, date: new Date().toISOString().slice(0, 10) })
  valueDialogVisible.value = true
}

async function saveValue(): Promise<void> {
  if (!currentAsset.value || !valueForm.date) {
    return
  }
  await assetStore.addValue(currentAsset.value.id, valueForm.value, valueForm.date)
  ElMessage.success('估值已更新')
  valueDialogVisible.value = false
}

function openCreateLiability(): void {
  editingLiabilityId.value = null
  Object.assign(liabilityForm, { name: '', totalAmount: 0, paidAmount: 0, interestRate: 0, note: '' })
  liabilityDialogVisible.value = true
}

function openEditLiability(liability: Liability): void {
  editingLiabilityId.value = liability.id
  Object.assign(liabilityForm, {
    name: liability.name,
    totalAmount: liability.totalAmount,
    paidAmount: liability.paidAmount,
    interestRate: liability.interestRate,
    note: liability.note ?? ''
  })
  liabilityDialogVisible.value = true
}

async function saveLiability(): Promise<void> {
  if (!liabilityForm.name.trim()) {
    ElMessage.warning('请输入负债名称')
    return
  }
  try {
    if (editingLiabilityId.value) {
      await assetStore.updateLiability(editingLiabilityId.value, {
        name: liabilityForm.name.trim(),
        totalAmount: liabilityForm.totalAmount,
        paidAmount: liabilityForm.paidAmount,
        interestRate: liabilityForm.interestRate,
        note: liabilityForm.note || null
      })
      ElMessage.success('负债已更新')
    } else {
      await assetStore.createLiability({
        name: liabilityForm.name.trim(),
        totalAmount: liabilityForm.totalAmount,
        paidAmount: liabilityForm.paidAmount,
        interestRate: liabilityForm.interestRate,
        note: liabilityForm.note || null
      })
      ElMessage.success('负债已添加')
    }
    liabilityDialogVisible.value = false
  } catch (error) {
    ElMessage.error(mapErrorCode(error instanceof Error ? error.message : undefined))
  }
}

async function removeLiability(liability: Liability): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除负债「${liability.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await assetStore.removeLiability(liability.id)
  ElMessage.success('已删除')
}

function assetTypeLabel(type: AssetType): string {
  return typeOptions.find((opt) => opt.value === type)?.label ?? type
}

function liabilityRemaining(liability: Liability): number {
  return liability.totalAmount - liability.paidAmount
}
</script>

<template>
  <div class="assets">
    <div class="page-header">
      <h2 class="page-title">资产</h2>
      <div>
        <el-button type="primary" @click="openCreateAsset('fixed')">添加资产</el-button>
        <el-button @click="openCreateLiability">添加负债</el-button>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-label">流动资产</div>
          <div class="summary-value">¥ {{ formatAmount(liquidTotal) }}</div>
          <div class="summary-ratio">{{ assetRatio(liquidTotal) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">固定资产</div>
          <div class="summary-value">¥ {{ formatAmount(assetStore.fixedTotal) }}</div>
          <div class="summary-ratio">{{ assetRatio(assetStore.fixedTotal) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">投资资产</div>
          <div class="summary-value">¥ {{ formatAmount(assetStore.investmentTotal) }}</div>
          <div class="summary-ratio">{{ assetRatio(assetStore.investmentTotal) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">总负债</div>
          <div class="summary-value">¥ {{ formatAmount(assetStore.liabilityTotal) }}</div>
        </div>
        <div class="summary-item highlight">
          <div class="summary-label">净资产</div>
          <div class="summary-value">¥ {{ formatAmount(netWorth) }}</div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <h3>资产明细</h3>
      <el-table :data="assetStore.assets" style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ assetTypeLabel(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="估值" width="140" align="right">
          <template #default="{ row }">
            ¥ {{ formatAmount(row.value) }} {{ row.unit ?? '' }}
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openValueDialog(row)">更新估值</el-button>
            <el-button link type="primary" size="small" @click="openEditAsset(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="removeAsset(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="section-card">
      <h3>负债明细</h3>
      <el-table :data="assetStore.liabilities" style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="总额" width="140" align="right">
          <template #default="{ row }">
            ¥ {{ formatAmount(row.totalAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="已还" width="140" align="right">
          <template #default="{ row }">
            ¥ {{ formatAmount(row.paidAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="剩余" width="140" align="right">
          <template #default="{ row }">
            ¥ {{ formatAmount(liabilityRemaining(row)) }}
          </template>
        </el-table-column>
        <el-table-column label="利率" width="90" align="right">
          <template #default="{ row }">
            {{ row.interestRate }}%
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEditLiability(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="removeLiability(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑资产' : '添加资产'" width="460px">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="assetForm.name" placeholder="例如：自住房产 / 股票基金" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="assetForm.type" style="width: 100%">
            <el-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="估值">
          <el-input-number
            v-model="assetForm.value"
            :precision="2"
            :controls="false"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="assetForm.unit" placeholder="元 / 股等（可选）" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assetForm.note" type="textarea" :rows="2" placeholder="备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAsset">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="valueDialogVisible"
      :title="`更新「${currentAsset?.name ?? ''}」估值`"
      width="360px"
    >
      <el-form label-width="70px">
        <el-form-item label="估值">
          <el-input-number v-model="valueForm.value" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="valueForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="valueDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveValue">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="liabilityDialogVisible"
      :title="editingLiabilityId ? '编辑负债' : '添加负债'"
      width="460px"
    >
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="liabilityForm.name" placeholder="例如：房贷 / 车贷" />
        </el-form-item>
        <el-form-item label="总额">
          <el-input-number v-model="liabilityForm.totalAmount" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="已还金额">
          <el-input-number v-model="liabilityForm.paidAmount" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="利率(%)">
          <el-input-number v-model="liabilityForm.interestRate" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="liabilityForm.note" type="textarea" :rows="2" placeholder="备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="liabilityDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLiability">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.assets {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  padding: 20px 24px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.summary-label {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
}

.summary-ratio {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 2px;
}

.summary-item.highlight .summary-value {
  color: var(--el-color-primary);
}

.section-card {
  background: #fff;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  padding: 20px;
  margin-bottom: 16px;
}

.section-card h3 {
  font-size: 15px;
  margin-bottom: 12px;
}
</style>
