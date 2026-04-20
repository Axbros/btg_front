<template>
  <div class="prw-today">
    <AppHeader title="今日结算" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="prw-today__body">
        <van-loading v-if="loading && !today" class="prw-today__loading" vertical>加载中…</van-loading>
        <template v-else-if="today">
          <van-cell-group inset title="时间窗口" class="prw-today__group">
            <van-cell title="今日业务日期" :value="txt(today.businessDate)" />
            <van-cell title="已有窗口记录" :value="boolTxt(today.recordExists)" />
            <van-cell title="允许成员上报" :value="boolTxt(today.acceptingProfitReport)" />
            <van-cell title="开始结算时间" :value="formatTimeOnly(today.openedAt)" />
            <van-cell title="结束结算时间" :value="formatTimeOnly(today.closedAt)" />
          </van-cell-group>

          <p class="prw-today__hint">
            成员上报利润受「允许成员上报」控制，结束后成员将提示不在规定时间内。
          </p>

          <div class="prw-today__actions">
            <van-button
              block
              round
              :type="startBtnType"
              :loading="starting"
              @click="onStartClick"
            >
              开始结算
            </van-button>
            <van-button
              block
              round
              :type="stopBtnType"
              :disabled="stopDisabled"
              :loading="stopping"
              class="prw-today__btn-stop"
              @click="onStopClick"
            >
              结束结算
            </van-button>
          </div>
        </template>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { showConfirmDialog } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import {
  fetchProfitReportWindowToday,
  postProfitReportWindowStart,
  postProfitReportWindowStop,
} from '@/api/profitReportWindow'

const today = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const starting = ref(false)
const stopping = ref(false)

const accepting = computed(() => Boolean(today.value?.acceptingProfitReport))

/** 进行中：突出结束；开始可点（幂等）但弱化 */
const startBtnType = computed(() => (accepting.value ? 'default' : 'primary'))
const stopBtnType = computed(() => (accepting.value ? 'primary' : 'default'))
const stopDisabled = computed(() => !accepting.value)

function txt(v) {
  if (v == null || String(v).trim() === '') return '—'
  return String(v)
}

function boolTxt(v) {
  if (v === true || v === 1 || v === '1') return '是'
  if (v === false || v === 0 || v === '0') return '否'
  return '—'
}

/** 仅展示本地时分秒 HH:mm:ss */
function formatTimeOnly(v) {
  if (v == null || String(v).trim() === '') return '—'
  const s = String(v).trim()
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  const m = s.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/)
  if (!m) return '—'
  const hh = m[1].padStart(2, '0')
  const mm = m[2]
  const ss = (m[3] ?? '00').padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

async function loadToday() {
  const data = await fetchProfitReportWindowToday()
  today.value = data && typeof data === 'object' ? data : null
}

async function onRefresh() {
  try {
    await loadToday()
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadToday()
  } catch {
    today.value = null
  } finally {
    loading.value = false
  }
})

async function onStartClick() {
  try {
    await showConfirmDialog({
      title: '开始结算',
      message: '确认开启今日利润上报时间窗口？开启后成员将有权进行利润上报。',
      confirmButtonText: '确认开始',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  starting.value = true
  try {
    await postProfitReportWindowStart()
    await loadToday()
  } finally {
    starting.value = false
  }
}

async function onStopClick() {
  try {
    await showConfirmDialog({
      title: '结束结算',
      message: '确认结束今日利润上报时间窗口？结束后成员将无法上报利润。',
      confirmButtonText: '确认结束',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  stopping.value = true
  try {
    await postProfitReportWindowStop()
    await loadToday()
  } finally {
    stopping.value = false
  }
}
</script>

<style scoped>
.prw-today {
  min-width: 0;
}
.prw-today__body {
  padding: 12px 0 calc(16px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}
.prw-today__loading {
  padding: 48px 0;
}
.prw-today__group {
  margin-top: 4px;
}
.prw-today__hint {
  margin: 12px 16px 0;
  font-size: 12px;
  line-height: 1.55;
  color: #969799;
}
.prw-today__actions {
  margin: 20px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.prw-today__btn-stop {
  margin-top: 0;
}
</style>
