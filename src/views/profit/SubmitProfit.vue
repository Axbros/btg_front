<template>
  <div>
    <AppHeader title="收益申报" :show-back="false" />
    <van-notice-bar
      v-if="strategyLoading"
      left-icon="info-o"
      :scrollable="false"
      text="正在加载分佣策略…"
    />
    <div v-else-if="strategyUnavailable" class="strategy-block strategy-block--error">
      <p class="strategy-block__text">无法获取您的分佣策略，暂时不能提交申报（与提交接口规则一致：需有直属推荐人且已绑定策略）。</p>
      <van-button size="small" type="primary" plain @click="loadStrategy">重新加载</van-button>
    </div>
    <van-form
      v-else
      scroll-to-error
      :show-error-message="true"
      @submit="onSubmit"
      style="padding-top: 12px;"
    >
      <van-cell-group inset>
        <van-cell v-if="strategySummaryText" title="当前策略" :label="strategySummaryText" />
        <van-field
          v-model="profitAmount"
          name="profitAmount"
          label="盈利金额"
          type="number"
          placeholder="≥ 0.01"
          required
          :rules="[
            { required: true, message: '请填写金额' },
            { validator: (v) => Number(v) >= 0.01, message: '金额至少 0.01' },
          ]"
        />
        <van-field
          v-model="profitScreenshotUrl"
          name="profitScreenshotUrl"
          label="收益截图"
          readonly
          required
          :rules="[{ required: true, message: '请上传收益截图' }]"
        >
          <template #input>
            <ImageUploadField
              v-model="profitScreenshotUrl"
              upload-type="PROFIT"
              hint="拍照或相册，自动上传"
            />
          </template>
        </van-field>
        <van-field
          v-model="transferScreenshotUrl"
          name="transferScreenshotUrl"
          label="转账截图"
          readonly
          required
          :rules="[{ required: true, message: '请上传转账截图' }]"
        >
          <template #input>
            <ImageUploadField
              v-model="transferScreenshotUrl"
              upload-type="TRANSFER"
              hint="拍照或相册，自动上传"
            />
          </template>
        </van-field>
        <div v-if="transferHintText" class="transfer-hint">
          {{ transferHintText }}
        </div>
      </van-cell-group>
      <div class="actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">提交申报</van-button>
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
import { submitProfit } from '@/api/profit'
import { fetchMyActiveCommissionStrategy } from '@/api/user'
import { formatMoney, formatRate } from '@/utils/format'

const router = useRouter()
const profitAmount = ref('')
const profitScreenshotUrl = ref('')
const transferScreenshotUrl = ref('')
const loading = ref(false)

const strategy = ref(null)
const strategyLoading = ref(true)
const strategyUnavailable = ref(false)

function pickStr(...candidates) {
  for (const v of candidates) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

function effectiveTransferRatio(s) {
  if (!s) return null
  const tr = Number(s.transferRatio)
  if (Number.isFinite(tr)) return tr
  const cr = Number(s.commissionRate)
  if (Number.isFinite(cr)) return 1 - cr
  return null
}

const transferRatio = computed(() => effectiveTransferRatio(strategy.value))

const strategySummaryText = computed(() => {
  const s = strategy.value
  if (!s) return ''
  const parts = []
  const name = pickStr(s.strategyName, s.strategyCode)
  if (name) parts.push(`策略：${name}`)
  // if (s.strategyId != null) parts.push(`策略 ID：${s.strategyId}`)
  if (s.commissionRate != null && Number.isFinite(Number(s.commissionRate))) {
    parts.push(`分佣比例 ${formatRate(s.commissionRate)}（上级抽成）`)
  }
  const tr = transferRatio.value
  if (tr != null && Number.isFinite(tr)) {
    parts.push(`盈利中需转给上级 ${formatRate(tr)}`)
  }
  return parts.join('；')
})

const transferHintText = computed(() => {
  if (strategyUnavailable.value || strategyLoading.value) return ''
  const ratio = transferRatio.value
  if (ratio == null || !Number.isFinite(ratio)) return ''
  const p = Number(profitAmount.value)
  if (!Number.isFinite(p) || p < 0.01) return ''
  const raw = p * ratio
  const amt = formatMoney(raw)
  return `根据上级给您的分佣策略，您应当向上级转账${amt}元`
})

async function loadStrategy() {
  strategyLoading.value = true
  strategyUnavailable.value = false
  strategy.value = null
  try {
    strategy.value = await fetchMyActiveCommissionStrategy()
    strategyUnavailable.value = false
  } catch {
    strategy.value = null
    strategyUnavailable.value = true
  } finally {
    strategyLoading.value = false
  }
}

onMounted(loadStrategy)

async function onSubmit() {
  const amt = Number(profitAmount.value)
  const p = profitScreenshotUrl.value.trim()
  const t = transferScreenshotUrl.value.trim()
  loading.value = true
  try {
    /** ProfitSubmitRequest */
    await submitProfit({
      profitAmount: amt,
      profitScreenshotUrl: p,
      transferScreenshotUrl: t,
    })
    showToast('提交成功')
    router.push('/profit/list')
  } catch {
    /* */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.strategy-block {
  margin: 12px 16px;
  padding: 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: #646566;
}
.strategy-block--error {
  background: #fff7e6;
  border: 1px solid #ffe58f;
}
.strategy-block__text {
  margin: 0 0 12px;
}
.transfer-hint {
  margin: 0 16px 12px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  color: #323233;
  background: #f7f8fa;
  border-radius: 8px;
}
.actions {
  margin: 20px 16px 0;
}
</style>
