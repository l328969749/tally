<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import type {
  AccountBalanceItem,
  CategoryExpenseItem,
  MonthlyTrendItem,
  NetWorthPoint,
  TagExpenseItem
} from '@shared/types/models'
import { yearStart, monthLabel, monthStart, monthEnd } from '@renderer/utils/date'

const expenseByCategory = ref<CategoryExpenseItem[]>([])
const expenseByTag = ref<TagExpenseItem[]>([])
const monthlyTrend = ref<MonthlyTrendItem[]>([])
const netWorthPoints = ref<NetWorthPoint[]>([])
const accountBalances = ref<AccountBalanceItem[]>([])
const loading = ref(true)

const dateRange = reactive({
  startDate: yearStart(),
  endDate: monthEnd()
})

let pieChart: echarts.ECharts | null = null
let tagChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let netWorthChart: echarts.ECharts | null = null
let balanceChart: echarts.ECharts | null = null
let pieEl: HTMLElement | null = null
let tagEl: HTMLElement | null = null
let trendEl: HTMLElement | null = null
let netWorthEl: HTMLElement | null = null
let balanceEl: HTMLElement | null = null
let disposed = false

onMounted(async () => {
  pieEl = document.getElementById('pie-chart')
  tagEl = document.getElementById('tag-chart')
  trendEl = document.getElementById('trend-chart')
  netWorthEl = document.getElementById('networth-chart')
  balanceEl = document.getElementById('balance-chart')
  await loadData()
  if (disposed) {
    return
  }
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('resize', resizeCharts)
  pieChart?.dispose()
  tagChart?.dispose()
  trendChart?.dispose()
  netWorthChart?.dispose()
  balanceChart?.dispose()
})

async function loadData(): Promise<void> {
  loading.value = true
  try {
    const [category, tag, trend, netWorth, balance] = await Promise.all([
      window.api.analytics.expenseByCategory(dateRange.startDate, dateRange.endDate),
      window.api.analytics.expenseByTag(dateRange.startDate, dateRange.endDate),
      window.api.analytics.monthlyTrend(dateRange.startDate, dateRange.endDate),
      window.api.analytics.netWorth(),
      window.api.analytics.accountBalance()
    ])
    const failed = [category, tag, trend, netWorth, balance].find(
      (result) => result && typeof result === 'object' && 'error' in result
    )
    if (failed) {
      ElMessage.error((failed as { error: string }).error)
      expenseByCategory.value = []
      expenseByTag.value = []
      monthlyTrend.value = []
      netWorthPoints.value = []
      accountBalances.value = []
      return
    }
    expenseByCategory.value = category
    expenseByTag.value = tag
    monthlyTrend.value = trend
    netWorthPoints.value = netWorth
    accountBalances.value = balance
    if (disposed) {
      return
    }
    await renderCharts()
  } finally {
    loading.value = false
  }
}

function resizeCharts(): void {
  pieChart?.resize()
  tagChart?.resize()
  trendChart?.resize()
  netWorthChart?.resize()
  balanceChart?.resize()
}

function renderCharts(): void {
  renderPieChart()
  renderTagChart()
  renderTrendChart()
  renderNetWorthChart()
  renderBalanceChart()
}

function renderPieChart(): void {
  if (!pieEl) {
    return
  }
  pieChart?.dispose()
  pieChart = echarts.init(pieEl)
  const data = expenseByCategory.value.map((item) => ({
    name: item.categoryName,
    value: item.amount
  }))
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        name: '支出分类',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n{d}%' },
        data
      }
    ]
  })
}

function renderTagChart(): void {
  if (!tagEl) {
    return
  }
  tagChart?.dispose()
  tagChart = echarts.init(tagEl)
  tagChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 30, top: 20, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: expenseByTag.value.map((item) => item.tagName),
      inverse: true
    },
    series: [
      {
        name: '支出',
        type: 'bar',
        data: expenseByTag.value.map((item) => item.amount),
        itemStyle: { color: '#f56c6c' },
        label: { show: true, position: 'right', formatter: '¥{c}' }
      }
    ]
  })
}

function renderTrendChart(): void {
  if (!trendEl) {
    return
  }
  trendChart?.dispose()
  trendChart = echarts.init(trendEl)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: monthlyTrend.value.map((item) => monthLabel(item.month))
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: monthlyTrend.value.map((item) => item.income),
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '支出',
        type: 'bar',
        data: monthlyTrend.value.map((item) => item.expense),
        itemStyle: { color: '#f56c6c' }
      }
    ]
  })
}

function renderNetWorthChart(): void {
  if (!netWorthEl) {
    return
  }
  netWorthChart?.dispose()
  netWorthChart = echarts.init(netWorthEl)
  netWorthChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 70, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: netWorthPoints.value.map((point) => point.date)
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '净资产',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: netWorthPoints.value.map((point) => point.value),
        itemStyle: { color: '#2e6df6' }
      }
    ]
  })
}

function renderBalanceChart(): void {
  if (!balanceEl) {
    return
  }
  balanceChart?.dispose()
  balanceChart = echarts.init(balanceEl)
  balanceChart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: ¥{c}' },
    grid: { left: 80, right: 40, top: 20, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: accountBalances.value.map((item) => item.accountName),
      inverse: true
    },
    series: [
      {
        name: '账户余额',
        type: 'bar',
        data: accountBalances.value.map((item) => item.balance),
        itemStyle: { color: '#2e6df6' },
        label: { show: true, position: 'right', formatter: '¥{c}' }
      }
    ]
  })
}

async function exportBalance(): Promise<void> {
  if (!balanceChart) {
    return
  }
  const url = balanceChart.getDataURL({ type: 'png', pixelRatio: 2 })
  await exportImage(url, '账户余额分布.png')
}

const summaryByMonth = computed(() => {
  const result: Record<string, { income: number; expense: number }> = {}
  monthlyTrend.value.forEach((item) => {
    result[item.month] = { income: item.income, expense: item.expense }
  })
  return Object.entries(result).map(([month, values]) => ({
    month: monthLabel(month),
    ...values
  }))
})

async function exportPie(): Promise<void> {
  if (!pieChart) {
    return
  }
  const url = pieChart.getDataURL({ type: 'png', pixelRatio: 2 })
  await exportImage(url, '支出分类.png')
}

async function exportTag(): Promise<void> {
  if (!tagChart) {
    return
  }
  const url = tagChart.getDataURL({ type: 'png', pixelRatio: 2 })
  await exportImage(url, '标签支出.png')
}

async function exportTrend(): Promise<void> {
  if (!trendChart) {
    return
  }
  const url = trendChart.getDataURL({ type: 'png', pixelRatio: 2 })
  await exportImage(url, '收支趋势.png')
}

async function exportNetWorth(): Promise<void> {
  if (!netWorthChart) {
    return
  }
  const url = netWorthChart.getDataURL({ type: 'png', pixelRatio: 2 })
  await exportImage(url, '净资产趋势.png')
}

function exportImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
  ElMessage.success('图表已导出')
}
</script>

<template>
  <div class="analytics">
    <div class="page-header">
      <h2 class="page-title">分析</h2>
      <div class="filter-row">
        <el-date-picker
          v-model="dateRange.startDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
        />
        <el-date-picker
          v-model="dateRange.endDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
        />
        <el-button type="primary" @click="loadData">应用筛选</el-button>
      </div>
    </div>

    <div v-loading="loading" class="chart-grid">
      <div class="chart-card">
        <div class="chart-header">
          <h3>支出分类占比</h3>
          <el-button link type="primary" size="small" @click="exportPie">导出图片</el-button>
        </div>
        <div id="pie-chart" class="chart"></div>
        <div v-if="expenseByCategory.length === 0" class="empty-chart">暂无支出数据</div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>月度收支趋势</h3>
          <el-button link type="primary" size="small" @click="exportTrend">导出图片</el-button>
        </div>
        <div id="trend-chart" class="chart"></div>
        <div v-if="monthlyTrend.length === 0" class="empty-chart">暂无收支数据</div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>标签支出排行</h3>
          <el-button link type="primary" size="small" @click="exportTag">导出图片</el-button>
        </div>
        <div id="tag-chart" class="chart"></div>
        <div v-if="expenseByTag.length === 0" class="empty-chart">暂无标签支出数据</div>
      </div>

      <div class="chart-card full">
        <div class="chart-header">
          <h3>净资产变化趋势</h3>
          <el-button link type="primary" size="small" @click="exportNetWorth">导出图片</el-button>
        </div>
        <div id="networth-chart" class="chart tall"></div>
        <div v-if="netWorthPoints.length === 0" class="empty-chart">暂无数据</div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>账户余额分布</h3>
          <el-button link type="primary" size="small" @click="exportBalance">导出图片</el-button>
        </div>
        <div id="balance-chart" class="chart"></div>
        <div v-if="accountBalances.length === 0" class="empty-chart">暂无账户</div>
      </div>

      <div class="chart-card full">
        <h3>月度/年度收支汇总</h3>
        <el-table :data="summaryByMonth" size="small" style="width: 100%">
          <el-table-column prop="month" label="月份" />
          <el-table-column prop="income" label="收入" align="right" />
          <el-table-column prop="expense" label="支出" align="right" />
          <el-table-column label="结余" align="right">
            <template #default="{ row }">
              ¥ {{ (row.income - row.expense).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-row {
  display: flex;
  gap: 10px;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  background: #fff;
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  padding: 16px;
}

.chart-card.full {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chart-card h3 {
  font-size: 15px;
  margin-bottom: 12px;
}

.chart {
  height: 320px;
}

.chart.tall {
  height: 360px;
}

.empty-chart {
  position: relative;
  margin-top: -320px;
  text-align: center;
  padding: 140px 0;
  color: var(--app-text-secondary);
  pointer-events: none;
}
</style>
