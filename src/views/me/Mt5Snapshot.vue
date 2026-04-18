<template>
  <div class="mt5-full">
    <AppHeader title="账户快照" />
    <van-loading v-if="loading" class="mt5-full__loading" vertical>加载中…</van-loading>
    <template v-else-if="mt5Rows.length">
      <div class="mt5-full__stack">
        <div class="mt5-full__body">
          <section class="mt5-snap" aria-label="MT5 账户快照">
            <div class="mt5-snap__glow" aria-hidden="true" />
            <header class="mt5-snap__head">
              <span class="mt5-snap__badge">MT5</span>
              <h2 class="mt5-snap__title">吞金授·账户资金快照</h2>
              <p class="mt5-snap__meta">{{ mt5AccountMeta }}</p>
              <div v-if="lastFetchedAtText" class="mt5-snap__live" role="status" aria-live="polite">
                <span class="mt5-snap__live-dot" aria-hidden="true" />
                <span class="mt5-snap__live-text">数据更新于 {{ lastFetchedAtText }}</span>
              </div>
            </header>

            <div v-if="mt5HeroRow" class="mt5-snap__hero">
              <span class="mt5-snap__hero-label">{{ mt5HeroRow.label }}</span>
              <div class="mt5-snap__hero-line">
                <span
                  class="mt5-snap__hero-value"
                  :class="{ 'mt5-snap__hero-value--flash': equityFlashActive }"
                  @animationend="onEquityFlashEnd"
                >{{ mt5HeroRow.display }}</span>
                <span class="mt5-snap__hero-unit">USD</span>
              </div>
            </div>

            <div v-if="mt5ProfitRow" class="mt5-snap__profit">
              <span class="mt5-snap__profit-label">{{ mt5ProfitRow.label }}</span>
              <span class="mt5-snap__profit-pill" :class="mt5ProfitRow.valueClass">{{ mt5ProfitRow.display }}</span>
            </div>

            <div v-if="mt5TileRows.length" class="mt5-snap__tiles">
              <div v-for="t in mt5TileRows" :key="t.key" class="mt5-snap__tile">
                <span class="mt5-snap__tile-label">{{ t.label }}</span>
                <span class="mt5-snap__tile-value">{{ t.display }}</span>
              </div>
            </div>

            <dl v-if="mt5DetailRows.length" class="mt5-snap__dl">
              <template v-for="r in mt5DetailRows" :key="r.key">
                <dt class="mt5-snap__dt">{{ r.label }}</dt>
                <dd class="mt5-snap__dd" :class="r.valueClass">{{ r.display }}</dd>
              </template>
            </dl>
          </section>
        </div>
        <footer v-if="mt5FooterRow" class="mt5-snap-bar">
          <van-icon name="clock-o" class="mt5-snap-bar__icon" />
          <span>{{ mt5FooterRow.label }} · {{ mt5FooterRow.display }}</span>
        </footer>
      </div>
    </template>
    <div v-else class="mt5-full__empty">
      <EmptyState description="暂无 MT5 快照数据" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { fetchLatestMt5Snapshot } from '@/api/mt5'
import { fetchMe } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { mt5SnapshotDisplayRows } from '@/utils/mt5SnapshotDisplay'
import { formatDateTime } from '@/utils/format'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'

const MT5_TILE_KEYS = new Set([
  'balance',
  'lastBalance',
  'lastEquity',
  'marginAmount',
  'freeMargin',
  'marginLevel',
])

const MT5_FOOTER_KEYS = new Set(['snapshotTime'])
const MT5_META_KEYS = new Set(['accountId', 'serverName'])

const auth = useAuthStore()

const mt5Snapshot = ref(null)
/** GET /me 的 profile.principalAmount，用于 浮动盈亏 = MT5余额 − 底仓本金 */
const principalAmount = ref(0)
/** pending：未拉完；ok：可计算；error：/me 失败，不覆盖接口 profit */
const principalState = ref('pending')
const loading = ref(true)
/** 最近一次拉取 MT5 快照完成时间（含轮询），用于提示页面非静态 */
const lastFetchedAt = ref(null)
/** 净值（equity）数值变化时的主数字强调动画 */
const equityFlashActive = ref(false)
let pollTimer = null

function numericEquity(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null
  const v = snapshot.equity
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** 与 mt5HeroRow 一致：优先净值行，否则余额 */
function mt5HeroKey(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null
  const rows = mt5SnapshotDisplayRows(snapshot)
  if (rows.some((r) => r.key === 'equity')) return 'equity'
  if (rows.some((r) => r.key === 'balance')) return 'balance'
  return null
}

function triggerEquityFlash() {
  equityFlashActive.value = false
  void nextTick(() => {
    equityFlashActive.value = true
  })
}

function onEquityFlashEnd() {
  equityFlashActive.value = false
}

async function loadMt5Snapshot({ initial = false } = {}) {
  if (initial) loading.value = true
  try {
    const mt5 = await fetchLatestMt5Snapshot().catch(() => null)
    const next = mt5 != null && typeof mt5 === 'object' && !Array.isArray(mt5) ? mt5 : null
    if (!initial) {
      const prev = mt5Snapshot.value
      const oldEq = numericEquity(prev)
      const newEq = numericEquity(next)
      if (
        oldEq !== null &&
        newEq !== null &&
        oldEq !== newEq &&
        mt5HeroKey(prev) === 'equity' &&
        mt5HeroKey(next) === 'equity'
      ) {
        triggerEquityFlash()
      }
    }
    mt5Snapshot.value = next
  } finally {
    lastFetchedAt.value = Date.now()
    if (initial) loading.value = false
  }
}

async function loadPrincipalFromMe() {
  principalState.value = 'pending'
  try {
    const me = await fetchMe()
    if (me) auth.setUserInfo(me)
    const v = me?.profile?.principalAmount ?? 0
    const n = Number(v)
    principalAmount.value = Number.isFinite(n) ? n : 0
    principalState.value = 'ok'
  } catch {
    principalState.value = 'error'
  }
}

/**
 * 展示用快照：在拿到 /me 本金后，用 MT5 余额 − 底仓本金 写入 profit，供「浮动盈亏」行展示。
 */
const snapshotForDisplay = computed(() => {
  const s = mt5Snapshot.value
  if (!s || typeof s !== 'object') return null
  if (principalState.value !== 'ok') return s
  const p = principalAmount.value
  const out = { ...s, lastEquity: p }
  const balRaw = s.balance ?? s.lastBalance
  const bal = Number(balRaw)
  if (Number.isFinite(bal)) out.profit = bal - p
  return out
})

const mt5Rows = computed(() => mt5SnapshotDisplayRows(snapshotForDisplay.value))

const lastFetchedAtText = computed(() => {
  const t = lastFetchedAt.value
  if (t == null) return ''
  const s = formatDateTime(t)
  return s === '-' ? '' : s
})

const mt5AccountMeta = computed(() => {
  const s = mt5Snapshot.value
  if (!s || typeof s !== 'object') return '—'
  const id = s.accountId
  const srv = s.serverName
  const parts = [id, srv]
    .map((x) => (x != null && String(x).trim() !== '' ? String(x).trim() : ''))
    .filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
})

const mt5HeroRow = computed(() => {
  const rows = mt5Rows.value
  return rows.find((r) => r.key === 'equity') || rows.find((r) => r.key === 'balance') || null
})

const mt5ProfitRow = computed(() =>
  mt5Rows.value.find((r) => r.key === 'profit' || r.key === 'floatingProfit'),
)

const mt5FooterRow = computed(() => mt5Rows.value.find((r) => MT5_FOOTER_KEYS.has(r.key)))

const mt5TileRows = computed(() => {
  const heroKey = mt5HeroRow.value?.key
  const profitKey = mt5ProfitRow.value?.key
  return mt5Rows.value.filter(
    (r) => MT5_TILE_KEYS.has(r.key) && r.key !== heroKey && r.key !== profitKey,
  )
})

const mt5DetailRows = computed(() => {
  const used = new Set()
  if (mt5HeroRow.value) used.add(mt5HeroRow.value.key)
  if (mt5ProfitRow.value) used.add(mt5ProfitRow.value.key)
  mt5TileRows.value.forEach((r) => used.add(r.key))
  if (mt5FooterRow.value) used.add(mt5FooterRow.value.key)
  MT5_META_KEYS.forEach((k) => used.add(k))
  return mt5Rows.value.filter((r) => !used.has(r.key))
})

onMounted(() => {
  void Promise.all([loadPrincipalFromMe(), loadMt5Snapshot({ initial: true })])
  pollTimer = window.setInterval(() => {
    void loadMt5Snapshot({ initial: false })
  }, 3000)
})

onUnmounted(() => {
  if (pollTimer != null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style scoped>
/**
 * 全屏铺满（无页边距）：与 Tab 栏之间的区域纵向 flex，
 * 主内容不滚动；最后更新时间固定在视口最底部（Tab 之上）。
 */
.mt5-full {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  /* 填满 .page-shell__view（flex 子项），才能把底部时间栏顶到 Tab 占位之上） */
  flex: 1;
  min-height: 0;
  width: 100%;
}
.mt5-full__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 48px 0;
}
.mt5-full__stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 0;
  padding: 0;
  /* 与时间栏同色底，避免 flex 留白透出页面浅灰 */
  background: #0f172a;
}
.mt5-full__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* 主区不足一屏时，此处仍会增高；无底色会露出 body 的 #f5f6f8 */
  background: linear-gradient(155deg, #0f172a 0%, #1e293b 38%, #172554 100%);
}
.mt5-full__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.mt5-snap {
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 20px 16px 20px;
  border-radius: 0;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  background: linear-gradient(155deg, #0f172a 0%, #1e293b 38%, #172554 100%);
  color: #e2e8f0;
}
.mt5-snap__glow {
  pointer-events: none;
  position: absolute;
  right: -30%;
  top: -40%;
  width: 70%;
  height: 80%;
  background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.22) 0%, transparent 70%);
  opacity: 0.9;
}
.mt5-snap__head {
  position: relative;
  z-index: 1;
  margin-bottom: 18px;
}
.mt5-snap__badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #0c1222;
  background: linear-gradient(90deg, #38bdf8, #a78bfa);
}
.mt5-snap__title {
  margin: 10px 0 6px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f8fafc;
  line-height: 1.25;
}
.mt5-snap__meta {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.65);
  word-break: break-all;
}
.mt5-snap__live {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(226, 232, 240, 0.72);
}
.mt5-snap__live-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  animation: mt5-live-breathe 2.2s ease-in-out infinite;
}
.mt5-snap__live-text {
  flex: 1;
  min-width: 0;
}
@keyframes mt5-live-breathe {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.88;
    transform: scale(1.2);
  }
}
.mt5-snap__hero {
  position: relative;
  z-index: 1;
  padding: 16px 0 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.mt5-snap__hero-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
  margin-bottom: 8px;
}
.mt5-snap__hero-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}
.mt5-snap__hero-value {
  font-size: 36px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1;
  text-shadow: 0 2px 24px rgba(56, 189, 248, 0.25);
  display: inline-block;
  transform-origin: left center;
}
.mt5-snap__hero-value--flash {
  animation: mt5-equity-flash 0.7s ease-out;
}
@keyframes mt5-equity-flash {
  0% {
    transform: scale(1);
    color: #fff;
    text-shadow: 0 2px 24px rgba(56, 189, 248, 0.25);
  }
  40% {
    transform: scale(1.07);
    color: #7dd3fc;
    text-shadow: 0 0 28px rgba(56, 189, 248, 0.55);
  }
  100% {
    transform: scale(1);
    color: #fff;
    text-shadow: 0 2px 24px rgba(56, 189, 248, 0.25);
  }
}
.mt5-snap__hero-unit {
  font-size: 14px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.9);
}
.mt5-snap__profit {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.mt5-snap__profit-label {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.75);
  flex-shrink: 0;
}
.mt5-snap__profit-pill {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.9);
}
.mt5-snap__num--up {
  color: #4ade80;
}
.mt5-snap__num--down {
  color: #fb7185;
}
.mt5-snap__num--flat {
  color: #e2e8f0;
}
.mt5-snap__tiles {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.mt5-snap__tile {
  padding: 12px 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.mt5-snap__tile-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.95);
  margin-bottom: 6px;
  line-height: 1.3;
}
.mt5-snap__tile-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #f1f5f9;
}
.mt5-snap__dl {
  position: relative;
  z-index: 1;
  margin: 16px 0 0;
  padding: 14px 0 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  grid-template-columns: minmax(0, 42%) 1fr;
  gap: 10px 12px;
  font-size: 13px;
}
.mt5-snap__dt {
  margin: 0;
  color: rgba(148, 163, 184, 0.95);
  line-height: 1.45;
}
.mt5-snap__dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #f1f5f9;
  line-height: 1.45;
  word-break: break-all;
}
.mt5-snap-bar {
  flex-shrink: 0;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-left: 0;
  margin-right: 0;
  margin-bottom: 0;
  padding: 12px 16px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.88);
  background: #0f172a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}
.mt5-snap-bar__icon {
  flex-shrink: 0;
  font-size: 15px;
  opacity: 0.9;
}
</style>
