<template>
  <section class="profit-trend" aria-labelledby="profit-trend-title">
    <template v-if="hasData">
      <div class="profit-trend__card">
        <h2 id="profit-trend-title" class="profit-trend__title">近7日收益</h2>

        <div ref="chartRef" class="profit-trend__chart" role="img" aria-label="近7日收益折线图" />

        <div class="profit-trend__kpis">
          <div class="profit-trend__kpi">
            <span class="profit-trend__kpi-label">本周累计</span>
            <span :class="['profit-trend__kpi-val', valToneClass(weekTotal)]">
              {{ formatMoney(weekTotal) }}
            </span>
          </div>
          <div class="profit-trend__kpi">
            <span class="profit-trend__kpi-label">最高收益</span>
            <span class="profit-trend__kpi-val profit-trend__kpi-val--emph">
              {{ formatMoney(maxProfit) }}
            </span>
          </div>
          <div class="profit-trend__kpi">
            <span class="profit-trend__kpi-label">最低收益</span>
            <span :class="['profit-trend__kpi-val', valToneClass(minProfit)]">
              {{ formatMoney(minProfit) }}
            </span>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="profit-trend__empty">
      <van-empty image="search" description="暂无近7日收益数据" />
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatMoney } from '@/utils/format'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

/**
 * Mock：与后端对齐时可改为同结构数组，方便直接替换。
 * @typedef {{ date: string, dateKey: string, profit: number }} SevenDayProfitRow
 */
const MOCK_SEVEN_DAY_PROFIT = [
  { date: '周一', dateKey: '2026-04-14', profit: -20 },
  { date: '周二', dateKey: '2026-04-15', profit: 35 },
  { date: '周三', dateKey: '2026-04-16', profit: 68 },
  { date: '周四', dateKey: '2026-04-17', profit: 42 },
  { date: '周五', dateKey: '2026-04-18', profit: 105 },
  { date: '周六', dateKey: '2026-04-19', profit: 88 },
  { date: '周日', dateKey: '2026-04-20', profit: 126 },
]

/** 后续接接口时改为 ref + 赋值即可 */
const rows = shallowRef(MOCK_SEVEN_DAY_PROFIT)

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

const hasData = computed(() => Array.isArray(rows.value) && rows.value.length > 0)

const profits = computed(() => rows.value.map((r) => Number(r.profit)).filter((n) => Number.isFinite(n)))

const weekTotal = computed(() => profits.value.reduce((a, b) => a + b, 0))

const maxProfit = computed(() => (profits.value.length ? Math.max(...profits.value) : 0))

const minProfit = computed(() => (profits.value.length ? Math.min(...profits.value) : 0))

function valToneClass(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v === 0) return ''
  return v > 0 ? 'profit-trend__kpi-val--up' : 'profit-trend__kpi-val--down'
}

function getChartOption() {
  const list = rows.value
  const labels = list.map((r) => r.date)
  const values = list.map((r) => Number(r.profit))
  const brand = '#1a5cff'

  return {
    backgroundColor: '#ffffff',
    animationDuration: 480,
    grid: {
      left: 4,
      right: 8,
      top: 26,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(45, 125, 255, 0.18)',
      borderWidth: 1,
      textStyle: { color: '#323233', fontSize: 12 },
      formatter(params) {
        const p = Array.isArray(params) ? params[0] : params
        if (!p) return ''
        const v = p.value
        const n = Number(v)
        const s = Number.isFinite(n) ? formatMoney(n) : String(v)
        return `${p.axisValue}<br/>收益 ${s}`
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLabel: { color: '#969799', fontSize: 11, margin: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitNumber: 4,
      splitLine: {
        show: true,
        lineStyle: { color: 'rgba(0,0,0,0.05)', type: 'solid' },
      },
      axisLabel: {
        color: '#969799',
        fontSize: 11,
        formatter: (val) => {
          const n = Number(val)
          if (!Number.isFinite(n)) return val
          return n >= 1000 || n <= -1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
        },
      },
    },
    series: [
      {
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { width: 2, color: brand },
        itemStyle: { color: brand, borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(26, 92, 255, 0.22)' },
              { offset: 1, color: 'rgba(26, 92, 255, 0.03)' },
            ],
          },
        },
        data: values,
      },
    ],
  }
}

function disposeChart() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

function renderChart() {
  const el = chartRef.value
  if (!el || !hasData.value) return
  disposeChart()
  chartInstance = echarts.init(el, undefined, { renderer: 'canvas' })
  chartInstance.setOption(getChartOption(), true)
  resizeObserver = new ResizeObserver(() => {
    chartInstance?.resize()
  })
  resizeObserver.observe(el)
  queueMicrotask(() => chartInstance?.resize())
}

function onWinResize() {
  chartInstance?.resize()
}

onMounted(async () => {
  await nextTick()
  await nextTick()
  if (!hasData.value) return
  renderChart()
  requestAnimationFrame(() => chartInstance?.resize())
  window.addEventListener('resize', onWinResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWinResize)
  disposeChart()
})
</script>

<style lang="scss" scoped>
.profit-trend {
  margin-top: 0;
}

.profit-trend__card {
  padding: 18px 18px 20px;
  border-radius: 22px;
  background-color: var(--home-card-surface, #ffffff);
  border: none;
  overflow: hidden;
  isolation: isolate;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.profit-trend__title {
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #1c2331;
}

.profit-trend__kpis {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.profit-trend__kpi {
  flex: 1;
  min-width: 0;
  padding: 12px 10px;
  text-align: center;
  border-radius: 14px;
  background-color: var(--home-card-inner, #f5f6f8);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.profit-trend__kpi-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--app-text-tertiary, #969799);
  margin-bottom: 6px;
}

.profit-trend__kpi-val {
  display: block;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: var(--app-text-primary, #323233);
  line-height: 1.2;
}

.profit-trend__kpi-val--emph {
  color: #1a5cff;
}

.profit-trend__kpi-val--up {
  color: #07c160;
}

.profit-trend__kpi-val--down {
  color: #ee4d4d;
}

.profit-trend__chart {
  width: 100%;
  height: 196px;
  position: relative;
  background-color: var(--home-card-surface, #ffffff);
  overflow: hidden;
  border-radius: 14px;
  isolation: isolate;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

/** 首页：与 lockViewport 下整页滚动配合，使用固定图表高度（小屏可滚到底） */
.profit-trend.chart-card {
  flex: 0 0 auto;
  overflow: visible;
}

.profit-trend.chart-card .profit-trend__card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  isolation: isolate;
  background-color: var(--home-card-surface, #ffffff);
  border-radius: 22px;
  padding: 12px 14px 14px;
}

.profit-trend.chart-card .profit-trend__title {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.profit-trend.chart-card .profit-trend__chart {
  flex: 0 0 auto;
  width: 100%;
  height: 196px;
  min-height: 196px;
  position: relative;
  background-color: var(--home-card-surface, #ffffff);
  overflow: hidden;
  border-radius: 12px;
  isolation: isolate;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.profit-trend.chart-card .profit-trend__kpis {
  flex-shrink: 0;
  margin-top: 10px;
  gap: 8px;
}

.profit-trend.chart-card .profit-trend__empty {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0 28px;
  min-height: 200px;
}

.profit-trend__empty {
  padding: 28px 0 32px;
  border-radius: 22px;
  background-color: var(--home-card-surface, #ffffff);
  border: none;
  overflow: hidden;
  isolation: isolate;
}
</style>
