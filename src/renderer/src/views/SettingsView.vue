<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Category, Tag } from '@shared/types/models'
import { useTagStore } from '@renderer/stores/tag'
import { useCategoryStore } from '@renderer/stores/category'

const tagStore = useTagStore()
const categoryStore = useCategoryStore()

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const backupReminder = ref(false)
const activeTab = ref('tags')

const newTagName = ref('')
const editingTag = ref<Tag | null>(null)
const tagEditName = ref('')

const newCategory = reactive({
  name: '',
  type: 'expense' as 'income' | 'expense',
  parentId: null as number | null
})

const editingCategory = ref<Category | null>(null)
const categoryEditForm = reactive({ name: '', parentId: null as number | null })

onMounted(async () => {
  await Promise.all([tagStore.fetch(), categoryStore.fetch()])
})

const rootCategories = computed(() =>
  categoryStore.categories.filter((c) => c.parentId === null)
)

function categoryChildren(parentId: number): Category[] {
  return categoryStore.categories.filter((c) => c.parentId === parentId)
}

async function addTag(): Promise<void> {
  if (!newTagName.value.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  try {
    await tagStore.create(newTagName.value.trim())
    newTagName.value = ''
    ElMessage.success('标签已创建')
  } catch (error) {
    ElMessage.error(mapTagError(error))
  }
}

function startEditTag(tag: Tag): void {
  editingTag.value = tag
  tagEditName.value = tag.name
}

async function saveTagEdit(): Promise<void> {
  if (!editingTag.value) {
    return
  }
  if (!tagEditName.value.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  try {
    await tagStore.update(editingTag.value.id, tagEditName.value.trim())
    editingTag.value = null
    ElMessage.success('标签已更新')
  } catch (error) {
    ElMessage.error(mapTagError(error))
  }
}

async function removeTag(tag: Tag): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除标签「${tag.name}」吗？将同时解除与所有流水的关联。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  await tagStore.remove(tag.id)
  ElMessage.success('标签已删除')
}

async function addCategory(): Promise<void> {
  if (!newCategory.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  try {
    await categoryStore.create({
      name: newCategory.name.trim(),
      type: newCategory.type,
      parentId: newCategory.parentId
    })
    Object.assign(newCategory, { name: '', type: 'expense', parentId: null })
    ElMessage.success('分类已创建')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建失败')
  }
}

function startEditCategory(category: Category): void {
  editingCategory.value = category
  Object.assign(categoryEditForm, { name: category.name, parentId: category.parentId })
}

async function saveCategoryEdit(): Promise<void> {
  if (!editingCategory.value) {
    return
  }
  if (!categoryEditForm.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  try {
    await categoryStore.update(editingCategory.value.id, {
      name: categoryEditForm.name.trim(),
      parentId: categoryEditForm.parentId
    })
    editingCategory.value = null
    ElMessage.success('分类已更新')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function removeCategory(category: Category): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除分类「${category.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  const result = await window.api.category.delete(category.id)
  if ('error' in result) {
    ElMessage.error(result.error === 'CATEGORY_HAS_TRANSACTIONS' ? '该分类下存在流水，不能删除' : result.error)
    return
  }
  await categoryStore.fetch()
  ElMessage.success('分类已删除')
}

async function changePassword(): Promise<void> {
  if (!passwordForm.oldPassword) {
    ElMessage.warning('请输入当前密码')
    return
  }
  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码长度至少 6 位')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  const result = await window.api.ledger.changePassword(
    passwordForm.oldPassword,
    passwordForm.newPassword
  )
  if ('error' in result) {
    ElMessage.error(mapPasswordError(result.error ?? ''))
    return
  }
  ElMessage.success('密码已修改')
  Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
}

function mapPasswordError(code: string): string {
  if (code === 'INVALID_PASSWORD') {
    return '当前密码错误'
  }
  return '修改失败，请重试'
}

function mapTagError(error: unknown): string {
  const code = error instanceof Error ? error.message : String(error)
  if (code === 'TAG_EXISTS') {
    return '该标签已存在'
  }
  if (code === 'INVALID_NAME') {
    return '标签名称需为 1-30 个字符'
  }
  return '操作失败'
}

async function createBackup(): Promise<void> {
  const result = await window.api.backup.create()
  if ('error' in result) {
    ElMessage.error(result.error)
    return
  }
  if (result.canceled) {
    return
  }
  ElMessage.success('备份成功')
}

async function restoreBackup(): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt('请输入备份文件的加密密码', '恢复备份', {
      inputType: 'password',
      confirmButtonText: '恢复',
      cancelButtonText: '取消'
    })
    if (!value) {
      return
    }
    const result = await window.api.backup.restore(value)
    if ('error' in result) {
      ElMessage.error(result.error === 'INVALID_PASSWORD' ? '备份文件密码错误' : result.error)
      return
    }
    if (result.canceled) {
      return
    }
    ElMessage.success('恢复成功，请重新打开恢复后的账本')
  } catch {
    // user canceled
  }
}

async function exportCsv(scope: 'transactions' | 'accounts' | 'assets' | 'all'): Promise<void> {
  const result = await window.api.export.toCsv(scope)
  if ('error' in result) {
    ElMessage.error(result.error)
    return
  }
  if (result.canceled) {
    return
  }
  ElMessage.success('导出成功')
}

async function exportJson(): Promise<void> {
  const result = await window.api.export.toJson()
  if ('error' in result) {
    ElMessage.error(result.error)
    return
  }
  if (result.canceled) {
    return
  }
  ElMessage.success('导出成功')
}

async function toggleBackupReminder(): Promise<void> {
  const result = await window.api.ledger.setBackupReminder(backupReminder.value)
  if ('error' in result) {
    ElMessage.error(result.error)
    return
  }
  ElMessage.success(backupReminder.value ? '已开启退出前备份提示' : '已关闭退出前备份提示')
}
</script>

<template>
  <div class="settings">
    <h2 class="page-title">设置</h2>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="标签管理" name="tags">
        <div class="settings-card">
          <div class="inline-form">
            <el-input
              v-model="newTagName"
              placeholder="输入新标签名称"
              style="width: 220px"
              @keyup.enter="addTag"
            />
            <el-button type="primary" @click="addTag">添加标签</el-button>
          </div>
          <div class="tag-list">
            <div v-for="tag in tagStore.tags" :key="tag.id" class="tag-row">
              <template v-if="editingTag?.id === tag.id">
                <el-input v-model="tagEditName" size="small" style="width: 180px" @keyup.enter="saveTagEdit" />
                <el-button size="small" type="primary" @click="saveTagEdit">保存</el-button>
                <el-button size="small" @click="editingTag = null">取消</el-button>
              </template>
              <template v-else>
                <el-tag size="default">{{ tag.name }}</el-tag>
                <div class="tag-actions">
                  <el-button link type="primary" size="small" @click="startEditTag(tag)">重命名</el-button>
                  <el-button link type="danger" size="small" @click="removeTag(tag)">删除</el-button>
                </div>
              </template>
            </div>
            <div v-if="tagStore.tags.length === 0" class="empty-tip">暂无标签，添加一个吧</div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="分类管理" name="categories">
        <div class="settings-card">
          <div class="inline-form">
            <el-input
              v-model="newCategory.name"
              placeholder="分类名称"
              style="width: 180px"
              @keyup.enter="addCategory"
            />
            <el-select v-model="newCategory.type" style="width: 100px">
              <el-option label="支出" value="expense" />
              <el-option label="收入" value="income" />
            </el-select>
            <el-select
              v-model="newCategory.parentId"
              placeholder="上级分类（可选）"
              style="width: 160px"
              clearable
            >
              <el-option v-for="cat in rootCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
            <el-button type="primary" @click="addCategory">添加分类</el-button>
          </div>
          <div class="category-tree">
            <div v-for="root in rootCategories" :key="root.id" class="category-root">
              <div class="category-row">
                <el-tag :type="root.type === 'income' ? 'success' : 'danger'" effect="light">
                  {{ root.name }}
                </el-tag>
                <div class="tag-actions">
                  <el-button link type="primary" size="small" @click="startEditCategory(root)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="removeCategory(root)">删除</el-button>
                </div>
              </div>
              <div v-for="child in categoryChildren(root.id)" :key="child.id" class="category-child">
                <span class="child-name">{{ child.name }}</span>
                <div class="tag-actions">
                  <el-button link type="primary" size="small" @click="startEditCategory(child)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="removeCategory(child)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <el-dialog
          :model-value="editingCategory !== null"
          title="编辑分类"
          width="360px"
          @update:model-value="editingCategory = null"
        >
          <el-form label-width="80px">
            <el-form-item label="名称">
              <el-input v-model="categoryEditForm.name" />
            </el-form-item>
            <el-form-item label="上级分类">
              <el-select
                v-model="categoryEditForm.parentId"
                placeholder="无（一级分类）"
                style="width: 100%"
                clearable
              >
                <el-option
                  v-for="cat in rootCategories.filter((c) => c.id !== editingCategory?.id)"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="editingCategory = null">取消</el-button>
            <el-button type="primary" @click="saveCategoryEdit">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="数据管理" name="backup">
        <div class="settings-card">
          <h3>备份与恢复</h3>
          <div class="action-row">
            <el-button type="primary" @click="createBackup">备份当前账本</el-button>
            <el-button @click="restoreBackup">从备份恢复</el-button>
          </div>
          <p class="hint-text">备份文件与源文件使用相同的加密保护，请妥善保管密码。</p>

          <h3 style="margin-top: 24px">数据导出</h3>
          <div class="action-row">
            <el-button @click="exportCsv('transactions')">导出流水 CSV</el-button>
            <el-button @click="exportCsv('accounts')">导出账户 CSV</el-button>
            <el-button @click="exportCsv('assets')">导出资产 CSV</el-button>
            <el-button @click="exportCsv('all')">导出全部 CSV</el-button>
            <el-button @click="exportJson">导出全部 JSON</el-button>
          </div>
          <p class="hint-text">导出文件为明文，请自行保管，谨防泄露。</p>

          <h3 style="margin-top: 24px">退出前备份提示</h3>
          <el-switch v-model="backupReminder" @change="toggleBackupReminder" />
          <span class="hint-text">开启后，退出应用时会询问是否备份账本。</span>
        </div>
      </el-tab-pane>

      <el-tab-pane label="安全设置" name="security">
        <div class="settings-card">
          <h3>修改加密密码</h3>
          <el-form label-width="100px" style="max-width: 420px">
            <el-form-item label="当前密码">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="passwordForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认新密码">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.settings {
  max-width: 900px;
  margin: 0 auto;
}

.settings-card {
  background: #fff;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  padding: 20px;
}

.inline-form {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tag-actions {
  display: flex;
  gap: 4px;
}

.category-tree {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-root {
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  padding: 12px;
}

.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.category-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border-left: 2px solid var(--app-border);
  margin-left: 12px;
}

.child-name {
  color: var(--app-text-secondary);
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.hint-text {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 8px;
}

.empty-tip {
  padding: 24px 0;
  text-align: center;
  color: var(--app-text-secondary);
}
</style>
