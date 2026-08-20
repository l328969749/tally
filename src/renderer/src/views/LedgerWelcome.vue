<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLedgerStore } from '@renderer/stores/ledger'

const router = useRouter()
const ledgerStore = useLedgerStore()

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'open'>('create')
const form = ref({
  name: '',
  password: '',
  confirmPassword: ''
})

const errorMessages: Record<string, string> = {
  FILE_NOT_FOUND: '账本文件不存在',
  FILE_EXISTS: '该路径已存在文件，请选择其他位置',
  INVALID_PASSWORD: '密码错误，请重试',
  TOO_MANY_ATTEMPTS: '连续 5 次密码错误，已锁定本次会话',
  CORRUPTED_FILE: '账本文件已损坏，无法打开'
}

const lastUsedPath = ref<string | null>(null)

onMounted(async () => {
  lastUsedPath.value = await ledgerStore.getLastUsedPath()
  const autoOpen = await ledgerStore.getAutoOpenLastLedger()
  if (lastUsedPath.value && autoOpen) {
    dialogMode.value = 'open'
    dialogVisible.value = true
  }
})

function openCreateDialog(): void {
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openOpenDialog(): void {
  dialogMode.value = 'open'
  dialogVisible.value = true
}

async function submitCreate(): Promise<void> {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入账本名称')
    return
  }
  if (!form.value.password) {
    ElMessage.warning('请设置加密密码')
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  if (form.value.password.length < 6) {
    ElMessage.warning('密码长度至少 6 位')
    return
  }
  const { path } = await window.api.ledger.chooseCreatePath()
  if (!path) {
    return
  }
  try {
    await ledgerStore.create(path, form.value.password, form.value.name.trim())
    ElMessage.success('账本创建成功')
    dialogVisible.value = false
    router.push('/dashboard').catch(() => {
      // 忽略重复导航错误
    })
  } catch (error) {
    ElMessage.error(mapError(error))
  }
}

async function submitOpen(): Promise<void> {
  if (!form.value.password) {
    ElMessage.warning('请输入加密密码')
    return
  }
  let path = lastUsedPath.value
  if (!path) {
    const chosen = await window.api.ledger.chooseOpenPath()
    path = chosen.path
    if (!path) {
      return
    }
  }
  try {
    await ledgerStore.open(path, form.value.password)
    ElMessage.success('账本打开成功')
    dialogVisible.value = false
    router.push('/dashboard').catch(() => {
      // 忽略重复导航错误
    })
  } catch (error) {
    ElMessage.error(mapError(error))
  }
}

function mapError(error: unknown): string {
  const code = error instanceof Error ? error.message : String(error)
  return errorMessages[code] ?? '操作失败，请重试'
}

async function deleteLedger(): Promise<void> {
  if (!lastUsedPath.value) {
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除账本「${lastUsedPath.value}」吗？删除后文件不可恢复。`,
      '删除账本',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  try {
    await ledgerStore.remove()
    ElMessage.success('账本已删除')
    lastUsedPath.value = null
  } catch (error) {
    ElMessage.error(mapError(error))
  }
}
</script>

<template>
  <div class="welcome">
    <div class="welcome-card">
      <div class="welcome-logo">
        <span class="logo-mark">T</span>
      </div>
      <h1>Tally</h1>
      <p class="welcome-desc">本地加密存储的桌面财务工具</p>
      <div class="welcome-actions">
        <el-button type="primary" size="large" @click="openCreateDialog">
          新建账本
        </el-button>
        <el-button size="large" @click="openOpenDialog">打开账本</el-button>
      </div>
      <p v-if="lastUsedPath" class="welcome-hint last-used">
        上次使用：{{ lastUsedPath }}
        <el-button size="small" type="danger" link @click="deleteLedger">删除账本</el-button>
      </p>
      <p class="welcome-hint">数据完全存储在本地，使用 SQLCipher 加密保护</p>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建账本' : '打开账本'"
      width="420px"
    >
      <el-form label-width="80px">
        <el-form-item v-if="dialogMode === 'create'" label="账本名称">
          <el-input v-model="form.name" placeholder="例如：我的家庭账本" />
        </el-form-item>
        <el-form-item label="加密密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'create'" label="确认密码">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="再次输入密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogMode === 'create' ? submitCreate() : submitOpen()">
          {{ dialogMode === 'create' ? '创建' : '打开' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.welcome {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2ff 0%, #f5f6fa 100%);
}

.welcome-card {
  text-align: center;
  padding: 48px 64px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.welcome-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.logo-mark {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--el-color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}

h1 {
  font-size: 26px;
  margin-bottom: 8px;
}

.welcome-desc {
  color: var(--app-text-secondary);
  margin-bottom: 32px;
}

.welcome-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
}

.welcome-hint {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 4px;
}

.last-used {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
