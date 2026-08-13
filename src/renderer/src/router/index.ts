import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useLedgerStore } from '@renderer/stores/ledger'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/welcome'
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: () => import('@renderer/views/LedgerWelcome.vue'),
    meta: { title: '打开账本' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@renderer/views/DashboardView.vue'),
    meta: { title: '仪表盘', requiresLedger: true }
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: () => import('@renderer/views/TransactionsView.vue'),
    meta: { title: '流水', requiresLedger: true }
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: () => import('@renderer/views/AccountsView.vue'),
    meta: { title: '账户', requiresLedger: true }
  },
  {
    path: '/assets',
    name: 'assets',
    component: () => import('@renderer/views/AssetsView.vue'),
    meta: { title: '资产', requiresLedger: true }
  },
  {
    path: '/rentals',
    name: 'rentals',
    component: () => import('@renderer/views/RentalsView.vue'),
    meta: { title: '出租', requiresLedger: true }
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import('@renderer/views/AnalyticsView.vue'),
    meta: { title: '分析', requiresLedger: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@renderer/views/SettingsView.vue'),
    meta: { title: '设置', requiresLedger: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  const ledgerStore = useLedgerStore()
  if (to.meta.requiresLedger && !ledgerStore.isOpen) {
    return { path: '/welcome' }
  }
  if (to.path === '/welcome' && ledgerStore.isOpen) {
    return { path: '/dashboard' }
  }
  return true
})

export default router
