<template>
  <div>
    <AppHeader title="账户" :show-back="false" />
    <van-loading v-if="loading" class="mt5-page__loading" vertical>加载中…</van-loading>
    <div v-else class="mt5-page">
      <section v-if="mt5Rows.length" class="mt5-snap" aria-label="MT5 账户快照">
        <div class="mt5-snap__glow" aria-hidden="true" />
        <header class="mt5-snap__head">
          <span class="mt5-snap__badge">MT5</span>
          <h2 class="mt5-snap__title">账户资金快照</h2>
          <p class="mt5-snap__meta">{{ mt5AccountMeta }}</p>
        </header>

        <div v-if="mt5HeroRow" class="mt5-snap__hero">
          <span class="mt5-snap__hero-label">{{ mt5HeroRow.label }}</span>
          <div class="mt5-snap__hero-line">
            <span class="mt5-snap__hero-value">{{ mt5HeroRow.display }}</span>
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

        <footer v-if="mt5FooterRow" class="mt5-snap__foot">
          <van-icon name="clock-o" class="mt5-snap__foot-icon" />
          <span>{{ mt5FooterRow.label }} · {{ mt5FooterRow.display }}</span>
        </footer>
      </section>
      <EmptyState v-else description="暂无 MT5 快照数据" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchLatestMt5Snapshot } from '@/api/mt5'
import { mt5SnapshotDisplayRows } from '@/utils/mt5SnapshotDisplay'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'

const MT5_TILE_KEYS = new Set([
  'balance',
  'lastBalance',
  'lastEquity',
  'marginAmount',
  'freeMargin',
  'marginLevel',
  'last_balance',
  'last_equity',
  'margin_amount',
  'free_margin',
  'margin_level',
])

const MT5_FOOTER_KEYS = new Set(['snapshotTime', 'snapshot_time'])
const MT5_META_KEYS = new Set(['accountId', 'account_id', 'serverName', 'server_name'])

const mt5Snapshot = ref(null)
const loading = ref(true)

const mt5Rows = computed(() => mt5SnapshotDisplayRows(mt5Snapshot.value))

const mt5AccountMeta = computed(() => {
  const s = mt5Snapshot.value
  if (!s || typeof s !== 'object') return '—'
  const id = s.accountId ?? s.account_id
  const srv = s.serverName ?? s.server_name
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
  mt5Rows.value.find((r) => r.key === 'profit' || r.key === 'floating_profit'),
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

onMounted(async () => {
  loading.value = true
  try {
    const mt5 = await fetchLatestMt5Snapshot().catch(() => null)
    mt5Snapshot.value =
      mt5 != null && typeof mt5 === 'object' && !Array.isArray(mt5) ? mt5 : null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.mt5-page {
  padding: 12px;
  padding-top: 8px;
}
.mt5-page__loading {
  padding: 48px 0;
}

.mt5-snap {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  padding: 20px 18px 16px;
  background: linear-gradient(155deg, #0f172a 0%, #1e293b 38%, #172554 100%);
  box-shadow:
    0 12px 40px rgba(15, 23, 42, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
  padding-top: 14px;
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
.mt5-snap__foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: rgba(148, 163, 184, 0.9);
}
.mt5-snap__foot-icon {
  flex-shrink: 0;
  font-size: 14px;
  opacity: 0.85;
}
</style>
