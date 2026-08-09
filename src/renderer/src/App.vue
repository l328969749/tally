<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLedgerStore } from '@renderer/stores/ledger'

const route = useRoute()
const router = useRouter()
const ledgerStore = useLedgerStore()

const isWelcome = computed(() => route.path === '/welcome')

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: 'DataAnalysis' },
  { path: '/transactions', label: '流水', icon: 'Tickets' },
  { path: '/accounts', label: '账户', icon: 'Wallet' },
  { path: '/assets', label: '资产', icon: 'PieChart' },
  { path: '/analytics', label: '分析', icon: 'TrendCharts' },
  { path: '/settings', label: '设置', icon: 'Setting' }
]

function navigate(path: string): void {
  router.push(path)
}
</script>

<template>
  <div class="app-layout">
    <aside v-if="!isWelcome" class="app-sidebar">
      <div class="app-logo" @click="navigate('/dashboard')">
        <span class="logo-mark">T</span>
        <span class="logo-text">Tally</span>
      </div>
      <nav class="app-nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
          @click="navigate(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="app-sidebar-footer">
        <button
          class="nav-item"
          @click="ledgerStore.close(); router.push('/welcome')"
        >
          <el-icon><component :is="'SwitchButton'" /></el-icon>
          <span>关闭账本</span>
        </button>
      </div>
    </aside>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100%;
  width: 100%;
}

.app-sidebar {
  width: var(--app-sidebar-width);
  min-width: var(--app-sidebar-width);
  background: var(--app-sidebar-bg);
  border-right: 1px solid var(--app-border);
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 20px;
  cursor: pointer;
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
}

.app-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--app-radius);
  font-size: 14px;
  color: var(--app-text);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.nav-item:hover {
  background: #f0f2f5;
}

.nav-item.active {
  background: rgba(46, 109, 246, 0.1);
  color: var(--el-color-primary);
  font-weight: 500;
}

.app-sidebar-footer {
  padding: 0 8px;
}

.app-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 24px;
}
</style>
