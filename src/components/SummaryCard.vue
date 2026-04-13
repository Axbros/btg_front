<template>
  <div class="summary-card">
    <div class="summary-card__label">{{ label }}</div>
    <div class="summary-card__value" :class="valueClass">{{ value }}</div>
    <div v-if="hint" class="summary-card__hint">{{ hint }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  hint: { type: String, default: '' },
  /** 附加在数值上的 class，例如盈亏颜色 */
  valueClass: { type: String, default: '' },
})
</script>

<style scoped>
.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.summary-card__label {
  font-size: 13px;
  color: #969799;
}
.summary-card__value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 600;
  color: #323233;
  font-variant-numeric: tabular-nums;
}
.summary-card__value--profit-up {
  color: #07c160;
}
.summary-card__value--profit-down {
  color: #ee0a24;
}
.summary-card__value--profit-flat {
  color: #323233;
}
.summary-card__hint {
  margin-top: 6px;
  font-size: 12px;
  color: #c8c9cc;
}
</style>
