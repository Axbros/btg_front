<template>
  <van-cell-group class="comm-card">
    <!-- <van-cell title="流水ID" :value="String(item.id ?? '—')" /> -->
    <van-cell title="申报单号" :value="profitRefMain(item)" :label="profitRefLabel(item)" />
    <van-cell title="用户昵称" :value="fromNick(item) || '—'" />
    <van-cell title="用户手机" :value="fromMobile(item) || '—'" />
    <!-- <van-cell title="来源用户ID" :value="String(item.fromUserId ?? '—')" /> -->
    <van-cell title="策略名称" :value="strategyLine(item)" />
    <van-cell title="佣金状态" :value="formatCommissionRecordStatus(item.status)" />
    <van-cell title="分佣比例" :value="formatRate(item.commissionRate)" />
    <van-cell title="盈利金额" :value="formatMoney(item.profitAmount)" />
    <van-cell title="佣金金额" :value="formatMoney(item.commissionAmount)" />
    <van-cell title="确认时间" :value="formatDateTime(item.confirmedTime)" />
  </van-cell-group>
</template>

<script setup>
import { formatMoney, formatDateTime, formatRate, formatCommissionRecordStatus } from '@/utils/format'

defineProps({
  item: { type: Object, required: true },
})

function pickStr(...candidates) {
  for (const v of candidates) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

function profitRefMain(item) {
  const no = pickStr(item.profitRecordNo, item.recordNo, item.profit_record_no)
  if (no) return no
  return item.profitRecordId != null ? `#${item.profitRecordId}` : '—'
}

function profitRefLabel(item) {
  const no = pickStr(item.profitRecordNo, item.recordNo, item.profit_record_no)
  if (no && item.profitRecordId != null) return `申报 ID：${item.profitRecordId}`
  return ''
}

function fromNick(item) {
  return pickStr(item.fromNickname, item.fromUserNickname, item.from_user_nickname)
}

function fromMobile(item) {
  return pickStr(item.fromMobile, item.fromUserMobile, item.from_user_mobile)
}

function strategyLine(item) {
  const name = pickStr(item.strategyName, item.strategy_name)
  const id = item.strategyId
  if (name && id != null) return `${name}`
  if (name) return name
  if (id != null) return `ID ${id}`
  return '—'
}
</script>

<style scoped>
.comm-card {
  margin-bottom: 10px;
}
</style>
