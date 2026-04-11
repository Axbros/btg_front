<template>
  <div>
    <AppHeader title="利润上报" :show-back="false" />
    <van-notice-bar
      v-if="contextLoading"
      left-icon="info-o"
      :scrollable="false"
      text="正在加载分润比例配置…"
    />
    <div v-else-if="contextUnavailable" class="hint-block hint-block--warn">
      <p class="hint-block__text">
        无法获取您在上级处的分润比例配置，暂时不能提交上报（需已加入团队且上级已为您配置子级利润比例）。
      </p>
      <van-button size="small" type="primary" plain @click="loadContext">重新加载</van-button>
    </div>
    <van-form
      v-else
      scroll-to-error
      :show-error-message="true"
      @submit="onSubmit"
      style="padding-top: 12px;"
    >
      <van-cell-group inset>
        <van-cell v-if="contextSummaryText" title="当前分润上下文" :label="contextSummaryText" />
        <van-field
          v-model="profitAmount"
          name="profitAmount"
          label="总利润"
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
          label="利润凭证"
          readonly
          required
          :rules="[{ required: true, message: '请上传利润凭证' }]"
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
          label="划转凭证"
          readonly
          required
          :rules="[{ required: true, message: '请上传划转凭证' }]"
        >
          <template #input>
            <ImageUploadField
              v-model="transferScreenshotUrl"
              upload-type="TRANSFER"
              hint="仅向直属上级划转，拍照或相册上传"
            />
          </template>
        </van-field>
        <div v-if="transferHintAmount" class="transfer-hint">
          <span class="transfer-hint__plain">
            当前结算模式下，请先向直属上级完成划转，再上传凭证。按当前配置，需划转
          </span>
          <span class="transfer-hint__amount">{{ transferHintAmount }}</span>
          <span class="transfer-hint__plain">元（以最终核算为准）。</span>
        </div>
      </van-cell-group>
      <div class="actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">提交上报</van-button>
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
import { submitProfitReport } from '@/api/profitReport'
import { fetchSelfProfitConfigUnderParent } from '@/api/profitConfig'
import { formatMoney, formatRate } from '@/utils/format'

const router = useRouter()
const profitAmount = ref('')
const profitScreenshotUrl = ref('')
const transferScreenshotUrl = ref('')
const loading = ref(false)

const context = ref(null)
const contextLoading = ref(true)
const contextUnavailable = ref(false)

function pickNum(...candidates) {
  for (const v of candidates) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 需转给直属上级的比例：优先用后端字段，否则按「1 − 子级利润比例」估算 */
function payableRatioFromContext(c) {
  if (!c) return null
  const tr = pickNum(c.transferRatio, c.payableToSuperiorRatio, c.payable_ratio)
  if (tr != null) return tr
  const child = pickNum(c.childProfitRatio, c.child_profit_ratio)
  if (child != null) return 1 - child
  return null
}

const payableRatio = computed(() => payableRatioFromContext(context.value))

const contextSummaryText = computed(() => {
  const c = context.value
  if (!c) return ''
  const parts = []
  const child = pickNum(c.childProfitRatio, c.child_profit_ratio)
  if (child != null) parts.push(`子级利润比例 ${formatRate(child)}（您这条线相对总利润的保留比例）`)
  const pr = payableRatio.value
  if (pr != null && Number.isFinite(pr)) parts.push(`本次应向直属上级划转约 ${formatRate(pr)} 的利润部分`)
  return parts.join('；')
})

/** 划转金额提示中的数字部分（加粗红色在模板中） */
const transferHintAmount = computed(() => {
  if (contextUnavailable.value || contextLoading.value) return ''
  const ratio = payableRatio.value
  if (ratio == null || !Number.isFinite(ratio)) return ''
  const p = Number(profitAmount.value)
  if (!Number.isFinite(p) || p < 0.01) return ''
  return formatMoney(p * ratio)
})

async function loadContext() {
  contextLoading.value = true
  contextUnavailable.value = false
  context.value = null
  try {
    context.value = await fetchSelfProfitConfigUnderParent()
    contextUnavailable.value = false
  } catch {
    context.value = null
    contextUnavailable.value = true
  } finally {
    contextLoading.value = false
  }
}

onMounted(loadContext)

async function onSubmit() {
  const amt = Number(profitAmount.value)
  const p = profitScreenshotUrl.value.trim()
  const t = transferScreenshotUrl.value.trim()
  loading.value = true
  try {
    await submitProfitReport({
      profitAmount: amt,
      profitScreenshotUrl: p,
      transferToParentScreenshotUrl: t,
    })
    showToast('提交成功')
    router.push('/profit-report/mine')
  } catch {
    /* */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.hint-block {
  margin: 12px 16px;
  padding: 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: #646566;
}
.hint-block--warn {
  background: #fff7e6;
  border: 1px solid #ffe58f;
}
.hint-block__text {
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
.transfer-hint__plain {
  color: #323233;
}
.transfer-hint__amount {
  margin: 0 2px;
  font-weight: 700;
  color: #ee0a24;
  font-size: 15px;
}
.actions {
  margin: 20px 16px 0;
}
</style>
