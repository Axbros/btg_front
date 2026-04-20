<template>
  <van-cell-group v-if="hasData" inset title="MT5 快照" class="repl-mt5-snap">
    <van-cell title="账户号" :value="txt(snap.accountId)" />
    <van-cell title="服务器" :value="txt(snap.serverName)" />
    <van-cell title="余额" :value="money(snap.balance)" />
    <van-cell title="净值" :value="money(snap.equity)" />
    <van-cell title="快照时间" :value="timeTxt(snap.snapshotTime)" />
  </van-cell-group>
</template>

<script setup>
import { computed } from 'vue'
import { formatMoney, formatDateTime } from '@/utils/format'

const props = defineProps({
  /** replenishment.submitMt5Snapshot */
  snapshot: { type: Object, default: null },
})

const snap = computed(() =>
  props.snapshot && typeof props.snapshot === 'object' ? props.snapshot : null,
)

const hasData = computed(() => {
  const s = snap.value
  if (!s) return false
  const checks = [
    () => txtVal(s.accountId) !== '—',
    () => txtVal(s.serverName) !== '—',
    () => numOk(s.balance),
    () => numOk(s.equity),
    () => txtVal(s.snapshotTime) !== '—',
  ]
  return checks.some((fn) => fn())
})

function txtVal(v) {
  if (v == null) return ''
  return String(v).trim()
}

function txt(v) {
  const t = txtVal(v)
  return t !== '' ? t : '—'
}

function numOk(v) {
  const n = Number(v)
  return Number.isFinite(n)
}

function money(v) {
  if (!numOk(v)) return '—'
  return formatMoney(v)
}

function timeTxt(v) {
  const t = txtVal(v)
  if (!t) return '—'
  const f = formatDateTime(v)
  if (f === '-' || f === '') return '—'
  return f
}
</script>

<style scoped>
.repl-mt5-snap {
  margin-top: 12px;
}
</style>
