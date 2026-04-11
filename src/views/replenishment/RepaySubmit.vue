<template>
  <div>
    <AppHeader title="提交归仓申请" />
    <van-notice-bar v-if="loadingCtx" left-icon="info-o" :scrollable="false" text="加载中…" />
    <div v-else-if="!current" class="hint-block">
      <p class="hint-block__text">当前无未结清补仓单，请先完成补仓审核通过后再申请归仓。</p>
      <van-button type="primary" block round plain @click="goReplenish">去提交补仓</van-button>
    </div>
    <van-form v-else scroll-to-error :show-error-message="true" @submit="onSubmit" style="padding-top: 12px;">
      <van-cell-group inset>
        <van-cell title="关联补仓单号" :value="txt(current.applyNo ?? current.apply_no)" />
        <van-cell title="剩余待归还" :value="formatMoney(remaining)" />
        <van-cell title="待审核归仓占用" :value="formatMoney(pending)" />
        <van-cell title="本次最多可填" :value="formatMoney(maxRepay)" />
        <van-field
          v-model="repayAmount"
          name="repayAmount"
          label="归还金额"
          type="number"
          placeholder="大于 0，不超过可归还上限"
          required
          :rules="amountRules"
        />
        <van-field
          v-model="repayScreenshotUrl"
          name="repayScreenshotUrl"
          label="转账截图"
          readonly
          required
          :rules="[{ required: true, message: '请上传归仓转账截图' }]"
        >
          <template #input>
            <ImageUploadField
              v-model="repayScreenshotUrl"
              upload-type="TRANSFER"
              hint="上传向资方归仓的转账凭证"
            />
          </template>
        </van-field>
      </van-cell-group>
      <div class="actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">提交归仓</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { fetchReplenishmentCurrent, submitRepay } from '@/api/replenishment'
import { formatMoney } from '@/utils/format'

const router = useRouter()
const loadingCtx = ref(true)
const current = ref(null)
const repayAmount = ref('')
const repayScreenshotUrl = ref('')
const loading = ref(false)

const remaining = computed(() => {
  const c = current.value
  if (!c) return 0
  return Number(c.remainingAmount ?? c.remaining_amount ?? 0) || 0
})

const pending = computed(() => {
  const c = current.value
  if (!c) return 0
  return Number(c.pendingRepayAmount ?? c.pending_repay_amount ?? 0) || 0
})

const maxRepay = computed(() => {
  const m = remaining.value - pending.value
  return m > 0 ? m : 0
})

const amountRules = computed(() => [
  { required: true, message: '请填写归还金额' },
  {
    validator: (v) => {
      const n = Number(v)
      if (!Number.isFinite(n) || n <= 0) return false
      return n <= maxRepay.value + 1e-9
    },
    message: `归还金额须大于 0 且不超过 ${formatMoney(maxRepay.value)}`,
  },
])

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function goReplenish() {
  router.push({ name: 'ReplenishmentSubmit' })
}

onMounted(async () => {
  loadingCtx.value = true
  try {
    current.value = await fetchReplenishmentCurrent()
  } catch {
    current.value = null
  } finally {
    loadingCtx.value = false
  }
})

async function onSubmit() {
  loading.value = true
  try {
    await submitRepay({
      repayAmount: Number(repayAmount.value),
      repayScreenshotUrl: repayScreenshotUrl.value.trim(),
    })
    showToast('已提交，请等待审核')
    router.replace({ name: 'RepayMine' })
  } catch {
    /* Toast 请求层 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.actions {
  padding: 16px 12px 24px;
}
.hint-block {
  padding: 24px 16px;
}
.hint-block__text {
  font-size: 14px;
  color: #646566;
  line-height: 1.6;
  margin-bottom: 16px;
}
</style>
