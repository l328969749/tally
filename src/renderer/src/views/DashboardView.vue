<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { OverviewData } from '@shared/types/models'
import { formatAmount, monthStart, monthEnd } from '@renderer/utils/date'

const overview = ref<OverviewData | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    overview.value = await window.api.analytics.overview()
  } finally {
    loading.value = false
  }
})

const monthRange = computed(() => `${monthStart()} ~ ${monthEnd()}`)
</script>

<template>
  <div class="dashboard">
    <h2 class="page-title">仪表盘</h2>
    <div v-loading="loading" class="dashboard-content">
      <template v-if="overview">
        <div class="stat-cards">
          <div class="stat-card net-worth">
            <div class="stat-label">净资产</div>
            <div class="stat-value">¥ {{ formatAmount(overview.netWorth) }}</div>
            <div class="stat-sub">
              总资产 ¥ {{ formatAmount(overview.totalAssets) }} · 总负债 ¥ {{ formatAmount(overview.totalLiabilities) }}
            </div>
          </div>
          <div class="stat-card income">
            <div class="stat-label">本月收入</div>
            <div class="stat-value">¥ {{ formatAmount(overview.monthIncome) }}</div>
            <div class="stat-sub">{{ monthRange }}</div>
          </div>
          <div class="stat-card expense">
            <div class="stat-label">本月支出</div>
            <div class="stat-value">¥ {{ formatAmount(overview.monthExpense) }}</div>
            <div class="stat-sub">{{ monthRange }}</div>
          </div>
          <div class="stat-card balance">
            <div class="stat-label">本月结余</div>
            <div class="stat-value">¥ {{ formatAmount(overview.monthIncome - overview.monthExpense) }}</div>
            <div class="stat-sub">收入 - 支出</div>
          </div>
        </div>

        <div class="recent-section">
          <h3>最近流水</h3>
          <el-table :data="overview.recentTransactions" size="small" style="width: 100%">
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="categoryName" label="分类" width="120" />
            <el-table-column prop="accountName" label="账户" width="120" />
            <el-table-column prop="note" label="备注" min-width="120" show-overflow-tooltip />
            <el-table-column label="金额" width="140" align="right">
              <template #default="{ row }">
                <span :class="row.type">
                  {{ row.type === 'income' ? '+' : '-' }}¥ {{ formatAmount(row.amount) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="overview.recentTransactions.length === 0" class="empty-tip">
            暂无流水，去「流水」页面记一笔吧
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1100px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 20px;
  font-size: 20px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: var(--app-radius);
  padding: 20px;
  border: 1px solid var(--app-border);
}

.stat-label {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.stat-sub {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.net-worth .stat-value {
  color: var(--el-color-primary);
}

.income .stat-value {
  color: #67c23a;
}

.expense .stat-value {
  color: #f56c6c;
}

.recent-section {
  background: #fff;
  border-radius: var(--app-radius);
  padding: 20px;
  border: 1px solid var(--app-border);
}

.recent-section h3 {
  margin-bottom: 12px;
  font-size: 15px;
}

.income {
  color: #67c23a;
}

.expense {
  color: #f56c6c;
}

.empty-tip {
  padding: 32px 0;
  text-align: center;
  color: var(--app-text-secondary);
  font-size: 14px;
}

@media (max-width: 1200px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
