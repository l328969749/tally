<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type {
  Asset,
  LeaseWithMeta,
  PayCycle,
  RentalProperty,
  RentRecord,
  Tenant
} from '@shared/types/models'
import { formatAmount } from '@renderer/utils/date'
import { mapErrorCode } from '@renderer/utils/error-messages'

const activeTab = ref('properties')

const properties = ref<RentalProperty[]>([])
const tenants = ref<Tenant[]>([])
const leases = ref<LeaseWithMeta[]>([])
const rentRecords = ref<RentRecord[]>([])
const assets = ref<Asset[]>([])
const accounts = ref<Array<{ id: number; name: string; type: string }>>([])

const propertyDialog = ref(false)
const editingPropertyId = ref<number | null>(null)
const propertyForm = reactive({
  address: '',
  area: 0,
  monthlyRent: 0,
  deposit: 0,
  note: '',
  assetId: null as number | null
})

const tenantDialog = ref(false)
const editingTenantId = ref<number | null>(null)
const tenantForm = reactive({ name: '', phone: '', idNumber: '' })

const leaseDialog = ref(false)
const editingLeaseId = ref<number | null>(null)
const leaseForm = reactive({
  propertyId: 0,
  tenantId: 0,
  startDate: '',
  endDate: '',
  monthlyRent: 0,
  payCycle: 'monthly' as PayCycle,
  note: ''
})

const rentDialog = ref(false)
const rentForm = reactive({
  leaseId: 0,
  amount: 0,
  date: '',
  accountId: 0,
  note: ''
})

const payCycleOptions = [
  { label: '月付', value: 'monthly' },
  { label: '季付', value: 'quarterly' },
  { label: '年付', value: 'yearly' }
]

const activeLeases = leases

async function fetchAll(): Promise<void> {
  const [p, t, l, r, a, acc] = await Promise.all([
    window.api.rental.listProperties(),
    window.api.rental.listTenants(),
    window.api.rental.listLeases(),
    window.api.rental.listRentRecords(),
    window.api.asset.list(),
    window.api.account.list()
  ])
  properties.value = 'error' in p ? [] : p
  tenants.value = 'error' in t ? [] : t
  leases.value = 'error' in l ? [] : l
  rentRecords.value = 'error' in r ? [] : r
  assets.value = 'error' in a ? [] : a
  accounts.value = 'error' in acc ? [] : acc
}

onMounted(fetchAll)

function openCreateProperty(): void {
  editingPropertyId.value = null
  Object.assign(propertyForm, { address: '', area: 0, monthlyRent: 0, deposit: 0, note: '', assetId: null })
  propertyDialog.value = true
}

function openEditProperty(property: RentalProperty): void {
  editingPropertyId.value = property.id
  Object.assign(propertyForm, {
    address: property.address,
    area: property.area,
    monthlyRent: property.monthlyRent,
    deposit: property.deposit,
    note: property.note ?? '',
    assetId: property.assetId
  })
  propertyDialog.value = true
}

async function saveProperty(): Promise<void> {
  if (!propertyForm.address.trim()) {
    ElMessage.warning('请输入房屋地址')
    return
  }
  const payload = {
    address: propertyForm.address.trim(),
    area: propertyForm.area,
    monthlyRent: propertyForm.monthlyRent,
    deposit: propertyForm.deposit,
    note: propertyForm.note.trim() || null,
    assetId: propertyForm.assetId
  }
  try {
    if (editingPropertyId.value) {
      const result = await window.api.rental.updateProperty(editingPropertyId.value, payload)
      if ('error' in result) {
        ElMessage.error(mapErrorCode(result.error))
        return
      }
      ElMessage.success('出租房已更新')
    } else {
      const result = await window.api.rental.createProperty(payload)
      if ('error' in result) {
        ElMessage.error(mapErrorCode(result.error))
        return
      }
      ElMessage.success('出租房已登记')
    }
    propertyDialog.value = false
    await fetchAll()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function removeProperty(property: RentalProperty): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除出租房「${property.address}」吗？关联合同与收租记录将一并删除。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  const result = await window.api.rental.deleteProperty(property.id)
  if ('error' in result) {
    ElMessage.error(mapErrorCode(result.error))
    return
  }
  ElMessage.success('已删除')
  await fetchAll()
}

function openCreateTenant(): void {
  editingTenantId.value = null
  Object.assign(tenantForm, { name: '', phone: '', idNumber: '' })
  tenantDialog.value = true
}

function openEditTenant(tenant: Tenant): void {
  editingTenantId.value = tenant.id
  Object.assign(tenantForm, { name: tenant.name, phone: tenant.phone ?? '', idNumber: tenant.idNumber ?? '' })
  tenantDialog.value = true
}

async function saveTenant(): Promise<void> {
  if (!tenantForm.name.trim()) {
    ElMessage.warning('请输入租户姓名')
    return
  }
  const payload = {
    name: tenantForm.name.trim(),
    phone: tenantForm.phone.trim() || null,
    idNumber: tenantForm.idNumber.trim() || null
  }
  try {
    if (editingTenantId.value) {
      const result = await window.api.rental.updateTenant(editingTenantId.value, payload)
      if ('error' in result) {
        ElMessage.error(mapErrorCode(result.error))
        return
      }
      ElMessage.success('租户已更新')
    } else {
      const result = await window.api.rental.createTenant(payload)
      if ('error' in result) {
        ElMessage.error(mapErrorCode(result.error))
        return
      }
      ElMessage.success('租户已登记')
    }
    tenantDialog.value = false
    await fetchAll()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function removeTenant(tenant: Tenant): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除租户「${tenant.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  const result = await window.api.rental.deleteTenant(tenant.id)
  if ('error' in result) {
    if (result.error === 'TENANT_HAS_LEASES') {
      ElMessage.warning('该租户存在关联合同，请先终止合同')
    } else {
      ElMessage.error(mapErrorCode(result.error))
    }
    return
  }
  ElMessage.success('已删除')
  await fetchAll()
}

function openCreateLease(): void {
  editingLeaseId.value = null
  Object.assign(leaseForm, {
    propertyId: 0,
    tenantId: 0,
    startDate: '',
    endDate: '',
    monthlyRent: 0,
    payCycle: 'monthly',
    note: ''
  })
  leaseDialog.value = true
}

function openEditLease(lease: LeaseWithMeta): void {
  editingLeaseId.value = lease.id
  Object.assign(leaseForm, {
    propertyId: lease.propertyId,
    tenantId: lease.tenantId,
    startDate: lease.startDate,
    endDate: lease.endDate,
    monthlyRent: lease.monthlyRent,
    payCycle: lease.payCycle,
    note: lease.note ?? ''
  })
  leaseDialog.value = true
}

async function saveLease(): Promise<void> {
  if (!leaseForm.propertyId || !leaseForm.tenantId) {
    ElMessage.warning('请选择出租房与租户')
    return
  }
  if (!leaseForm.startDate || !leaseForm.endDate) {
    ElMessage.warning('请选择合同起止日期')
    return
  }
  if (leaseForm.startDate > leaseForm.endDate) {
    ElMessage.warning('合同开始日期不能晚于结束日期')
    return
  }
  if (!(leaseForm.monthlyRent > 0)) {
    ElMessage.warning('请输入有效的月租金')
    return
  }
  const payload = {
    propertyId: leaseForm.propertyId,
    tenantId: leaseForm.tenantId,
    startDate: leaseForm.startDate,
    endDate: leaseForm.endDate,
    monthlyRent: leaseForm.monthlyRent,
    payCycle: leaseForm.payCycle,
    note: leaseForm.note.trim() || null
  }
  try {
    if (editingLeaseId.value) {
      const result = await window.api.rental.updateLease(editingLeaseId.value, payload)
      if ('error' in result) {
        ElMessage.error(mapErrorCode(result.error ?? ''))
        return
      }
      ElMessage.success('合同已更新')
    } else {
      const result = await window.api.rental.createLease(payload)
      if ('error' in result) {
        ElMessage.error(mapErrorCode(result.error))
        return
      }
      ElMessage.success('合同已创建')
    }
    leaseDialog.value = false
    await fetchAll()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function terminateLease(lease: LeaseWithMeta): Promise<void> {
  if (lease.status !== 'active') {
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定终止合同（${lease.propertyAddress} · ${lease.tenantName}）吗？`,
      '终止确认',
      { type: 'warning', confirmButtonText: '终止', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  const result = await window.api.rental.terminateLease(lease.id, new Date().toISOString().slice(0, 10))
  if ('error' in result) {
    ElMessage.error(mapErrorCode(result.error))
    return
  }
  ElMessage.success('合同已终止')
  await fetchAll()
}

function openRentDialog(): void {
  Object.assign(rentForm, {
    leaseId: leases.value.find((l) => l.status === 'active')?.id ?? 0,
    amount: leases.value.find((l) => l.status === 'active')?.monthlyRent ?? 0,
    date: new Date().toISOString().slice(0, 10),
    accountId: accounts.value.find((a) => a.type !== 'credit')?.id ?? 0,
    note: ''
  })
  rentDialog.value = true
}

async function recordRent(): Promise<void> {
  if (!rentForm.leaseId) {
    ElMessage.warning('请选择合同')
    return
  }
  if (!(rentForm.amount > 0)) {
    ElMessage.warning('请输入有效的收租金额')
    return
  }
  if (!rentForm.date) {
    ElMessage.warning('请选择收租日期')
    return
  }
  if (!rentForm.accountId) {
    ElMessage.warning('请选择收入账户')
    return
  }
  const result = await window.api.rental.recordRent({
    leaseId: rentForm.leaseId,
    amount: rentForm.amount,
    date: rentForm.date,
    accountId: rentForm.accountId,
    note: rentForm.note.trim() || null
  })
  if ('error' in result) {
    ElMessage.error(mapErrorCode(result.error))
    return
  }
  ElMessage.success('收租已记录，已生成收入流水')
  rentDialog.value = false
  await fetchAll()
}

async function removeRentRecord(record: RentRecord): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除这笔收租记录吗？关联的收入流水将一并删除。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  const result = await window.api.rental.deleteRentRecord(record.id)
  if ('error' in result) {
    ElMessage.error(mapErrorCode(result.error))
    return
  }
  ElMessage.success('已删除')
  await fetchAll()
}

function leaseLabel(leaseId: number): string {
  const lease = leases.value.find((l) => l.id === leaseId)
  if (!lease) {
    return `合同 #${leaseId}`
  }
  return `${lease.propertyAddress} · ${lease.tenantName}`
}

function payCycleLabel(cycle: PayCycle): string {
  return payCycleOptions.find((opt) => opt.value === cycle)?.label ?? cycle
}

function assetName(assetId: number | null): string {
  if (assetId === null) {
    return '-'
  }
  return assets.value.find((a) => a.id === assetId)?.name ?? '-'
}

function accountName(id: number): string {
  return accounts.value.find((a) => a.id === id)?.name ?? `账户 #${id}`
}
</script>

<template>
  <div class="rentals">
    <h2 class="page-title">出租管理</h2>

    <el-tabs v-model="activeTab" class="rental-tabs">
      <!-- 出租房 -->
      <el-tab-pane label="出租房" name="properties">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateProperty">登记出租房</el-button>
        </div>
        <div class="table-card">
          <el-table :data="properties" style="width: 100%">
            <el-table-column prop="address" label="地址" min-width="180" />
            <el-table-column prop="area" label="面积(m²)" width="100" align="right" />
            <el-table-column label="月租金" width="120" align="right">
              <template #default="{ row }">¥ {{ formatAmount(row.monthlyRent) }}</template>
            </el-table-column>
            <el-table-column label="押金" width="120" align="right">
              <template #default="{ row }">¥ {{ formatAmount(row.deposit) }}</template>
            </el-table-column>
            <el-table-column label="关联资产" width="120">
              <template #default="{ row }">{{ assetName(row.assetId) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditProperty(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="removeProperty(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="properties.length === 0" class="empty-tip">暂无出租房，点击右上角登记</div>
        </div>
      </el-tab-pane>

      <!-- 租户 -->
      <el-tab-pane label="租户" name="tenants">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateTenant">登记租户</el-button>
        </div>
        <div class="table-card">
          <el-table :data="tenants" style="width: 100%">
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="phone" label="联系电话" width="150" />
            <el-table-column prop="idNumber" label="证件号码" min-width="180" />
            <el-table-column label="操作" width="140" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditTenant(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="removeTenant(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="tenants.length === 0" class="empty-tip">暂无租户，点击右上角登记</div>
        </div>
      </el-tab-pane>

      <!-- 合同 -->
      <el-tab-pane label="合同" name="leases">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateLease">新建合同</el-button>
        </div>
        <div class="table-card">
          <el-table :data="leases" style="width: 100%">
            <el-table-column prop="propertyAddress" label="出租房" min-width="150" />
            <el-table-column prop="tenantName" label="租户" width="100" />
            <el-table-column prop="startDate" label="开始" width="100" />
            <el-table-column prop="endDate" label="结束" width="100" />
            <el-table-column label="月租金" width="100" align="right">
              <template #default="{ row }">¥ {{ formatAmount(row.monthlyRent) }}</template>
            </el-table-column>
            <el-table-column label="付租" width="80">
              <template #default="{ row }">{{ payCycleLabel(row.payCycle) }}</template>
            </el-table-column>
            <el-table-column label="累计租金" width="110" align="right">
              <template #default="{ row }">¥ {{ formatAmount(row.totalRent) }}</template>
            </el-table-column>
            <el-table-column label="下一应收租日" width="120">
              <template #default="{ row }">{{ row.nextDueDate ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'active'" type="success" size="small">生效中</el-tag>
                <el-tag v-else type="info" size="small">已终止</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditLease(row)">编辑</el-button>
                <el-button
                  v-if="row.status === 'active'"
                  link
                  type="warning"
                  size="small"
                  @click="terminateLease(row)"
                >
                  终止
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="leases.length === 0" class="empty-tip">暂无合同，点击右上角新建</div>
        </div>
      </el-tab-pane>

      <!-- 收租 -->
      <el-tab-pane label="收租" name="rents">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openRentDialog">记录收租</el-button>
        </div>
        <div class="table-card">
          <el-table :data="rentRecords" style="width: 100%">
            <el-table-column label="合同" min-width="220">
              <template #default="{ row }">{{ leaseLabel(row.leaseId) }}</template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column label="金额" width="120" align="right">
              <template #default="{ row }">¥ {{ formatAmount(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="关联流水" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.transactionId" size="small" type="info">#{{ row.transactionId }}</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注" min-width="120" show-overflow-tooltip />
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="removeRentRecord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="rentRecords.length === 0" class="empty-tip">暂无收租记录</div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 出租房对话框 -->
    <el-dialog v-model="propertyDialog" :title="editingPropertyId ? '编辑出租房' : '登记出租房'" width="460px">
      <el-form label-width="90px">
        <el-form-item label="地址">
          <el-input v-model="propertyForm.address" placeholder="例如：幸福小区 3 栋 502" />
        </el-form-item>
        <el-form-item label="面积">
          <el-input-number v-model="propertyForm.area" :min="0" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="月租金">
          <el-input-number v-model="propertyForm.monthlyRent" :min="0" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="押金">
          <el-input-number v-model="propertyForm.deposit" :min="0" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="关联资产">
          <el-select v-model="propertyForm.assetId" clearable style="width: 100%">
            <el-option v-for="asset in assets" :key="asset.id" :label="asset.name" :value="asset.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="propertyForm.note" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="propertyDialog = false">取消</el-button>
        <el-button type="primary" @click="saveProperty">保存</el-button>
      </template>
    </el-dialog>

    <!-- 租户对话框 -->
    <el-dialog v-model="tenantDialog" :title="editingTenantId ? '编辑租户' : '登记租户'" width="440px">
      <el-form label-width="90px">
        <el-form-item label="姓名">
          <el-input v-model="tenantForm.name" placeholder="租户姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="tenantForm.phone" />
        </el-form-item>
        <el-form-item label="证件号码">
          <el-input v-model="tenantForm.idNumber" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tenantDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTenant">保存</el-button>
      </template>
    </el-dialog>

    <!-- 合同对话框 -->
    <el-dialog v-model="leaseDialog" :title="editingLeaseId ? '编辑合同' : '新建合同'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="出租房">
          <el-select v-model="leaseForm.propertyId" style="width: 100%">
            <el-option v-for="property in properties" :key="property.id" :label="property.address" :value="property.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="租户">
          <el-select v-model="leaseForm.tenantId" style="width: 100%">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="leaseForm.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="leaseForm.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="月租金">
          <el-input-number v-model="leaseForm.monthlyRent" :min="0.01" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="付租周期">
          <el-select v-model="leaseForm.payCycle" style="width: 100%">
            <el-option v-for="opt in payCycleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="leaseForm.note" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="leaseDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLease">保存</el-button>
      </template>
    </el-dialog>

    <!-- 收租对话框 -->
    <el-dialog v-model="rentDialog" title="记录收租" width="440px">
      <el-form label-width="90px">
        <el-form-item label="合同">
          <el-select v-model="rentForm.leaseId" style="width: 100%">
            <el-option
              v-for="lease in activeLeases.filter((l) => l.status === 'active')"
              :key="lease.id"
              :label="leaseLabel(lease.id)"
              :value="lease.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="rentForm.amount" :min="0.01" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="rentForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="收入账户">
          <el-select v-model="rentForm.accountId" style="width: 100%">
            <el-option
              v-for="account in accounts.filter((a) => a.type !== 'credit')"
              :key="account.id"
              :label="account.name"
              :value="account.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="rentForm.note" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rentDialog = false">取消</el-button>
        <el-button type="primary" @click="recordRent">确认收租</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.rentals {
  max-width: 1100px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 20px;
  font-size: 20px;
}

.tab-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.table-card {
  background: #fff;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  padding: 16px;
}

.empty-tip {
  padding: 24px 0;
  text-align: center;
  color: var(--app-text-secondary);
  font-size: 13px;
}
</style>
