<template>
  <div class="profit-report-shell">
    <AppHeader title="利润上报" />
    <div class="profit-report-shell__scroll">
      <van-notice-bar
        v-if="contextLoading"
        left-icon="info-o"
        :scrollable="false"
        text="正在加载分润比例配置…"
      />
      <div v-else-if="needsParentProfitConfig" class="profit-report-submit__state">
        <van-empty image="default" :description="''">
          <template #description>
            <p class="state-page__lead">{{ parentConfigBlockText }}</p>
            <p class="state-page__hint">
              暂时无法进行利润上报。请主动联系直属团队长，请其在系统中为您配置「用户总利润占比」后再返回本页操作。
            </p>
          </template>
        </van-empty>
        <div class="state-page__actions">
          <van-button round block type="primary" plain @click="loadContext">重新检测配置</van-button>
        </div>
      </div>
      <div v-else-if="contextUnavailable" class="hint-block hint-block--warn">
        <p class="hint-block__text">
          无法获取您在团队长处的分润比例配置，暂时不能提交上报（需已加入团队且团队长已为您配置用户利润比例）。
        </p>
        <van-button size="small" type="primary" plain @click="loadContext">重新加载</van-button>
      </div>
      <van-form
        v-else
        scroll-to-error
        :show-error-message="true"
        @submit="onSubmit"
        class="profit-report-submit__form"
      >
      <van-cell-group inset>
        <van-cell v-if="contextSummaryText" title="当前分润信息" :label="contextSummaryText" />
        <van-field
          v-model="profitAmount"
          name="profitAmount"
          label="今日盈利"
          type="number"
          :placeholder="profitAmountPlaceholder"
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
              hint="仅向直属团队长划转，拍照或相册上传"
            />
          </template>
        </van-field>
        <div v-if="transferHintAmount" class="transfer-hint">  
          <span class="transfer-hint__plain">按当前配置，需向直属团队长</span>
          <template v-if="parentExchangeUid">
            <span class="transfer-hint__plain">（交易所 UID：</span>
            <span class="transfer-hint__emph">{{ parentExchangeUid }}</span>
            <span class="transfer-hint__plain">）</span>
          </template>
          <span class="transfer-hint__plain">划转</span>
          <span class="transfer-hint__amount">{{ transferHintAmount }}</span>
          <span class="transfer-hint__plain">元。</span>
        </div>
      </van-cell-group>
      <div class="actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">上报</van-button>
      </div>
    </van-form>
    </div>
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
import { fetchLatestMt5Snapshot } from '@/api/mt5'
import { fetchMe } from '@/api/user'
import { formatMoney, formatRate } from '@/utils/format'

const router = useRouter()
const profitAmount = ref('')
const profitScreenshotUrl = ref('')
const transferScreenshotUrl = ref('')
const loading = ref(false)

const context = ref(null)
const contextLoading = ref(true)
const contextUnavailable = ref(false)
/** 团队长未配置用户总利润占比（接口业务码或 HTTP 409） */
const needsParentProfitConfig = ref(false)
const parentConfigBlockText = ref('')

const PROFIT_CONFIG_PARENT_PENDING_CODE = 409

/** MT5：equity≠0 时 净值−底仓本金，供「总利润」占位参考（可能即今日盈利） */
const mt5EquityMinusPrincipal = ref(null)

const profitAmountPlaceholder = computed(() => {
  const n = mt5EquityMinusPrincipal.value
  if (n == null || !Number.isFinite(n)) return '≥ 0.01'
  return `≥ 0.01，今日盈利（MT5）约 ${formatMoney(n)} USD`
})

function pickNum(...candidates) {
  for (const v of candidates) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 需转给直属团队长的比例：优先用后端字段，否则按「1 − 用户利润比例」估算 */
function payableRatioFromContext(c) {
  if (!c) return null
  const tr = pickNum(c.transferRatio, c.payableToSuperiorRatio)
  if (tr != null) return tr
  const child = pickNum(c.childProfitRatio)
  if (child != null) return 1 - child
  return null
}

const payableRatio = computed(() => payableRatioFromContext(context.value))

/** 直属团队长交易所 UID，用于划转提示 */
const parentExchangeUid = computed(() => {
  const c = context.value
  if (!c) return ''
  const uid = c.parentExchangeUid
  if (uid == null) return ''
  const s = String(uid).trim()
  return s
})

const contextSummaryText = computed(() => {
  const c = context.value
  if (!c) return ''
  const parts = []
  const child = pickNum(c.childProfitRatio)
  if (child != null) parts.push(`用户利润比例 ${formatRate(child)}（您这条线相对总利润的保留比例）`)
  const pr = payableRatio.value
  if (pr != null && Number.isFinite(pr)) parts.push(`本次应向直属团队长划转 ${formatRate(pr)} 的利润部分`)
  // if (parentExchangeUid.value) {
  //   parts.push(`直属团队长交易所 UID：${parentExchangeUid.value}`)
  // }
  return parts.join('；')
})

/** 划转金额提示中的数字部分（加粗红色在模板中） */
const transferHintAmount = computed(() => {
  if (contextUnavailable.value || contextLoading.value || needsParentProfitConfig.value) return ''
  const ratio = payableRatio.value
  if (ratio == null || !Number.isFinite(ratio)) return ''
  const p = Number(profitAmount.value)
  if (!Number.isFinite(p) || p < 0.01) return ''
  return formatMoney(p * ratio)
})

async function loadContext() {
  contextLoading.value = true
  contextUnavailable.value = false
  needsParentProfitConfig.value = false
  parentConfigBlockText.value = ''
  context.value = null
  mt5EquityMinusPrincipal.value = null
  try {
    context.value = await fetchSelfProfitConfigUnderParent({ skipGlobalToast: true })
    contextUnavailable.value = false
    void loadMt5TodayProfitHint()
  } catch (e) {
    context.value = null
    if (String(e?.message) === 'unauthorized') {
      return
    }
    const code = Number(e?.code)
    if (code === PROFIT_CONFIG_PARENT_PENDING_CODE) {
      needsParentProfitConfig.value = true
      const m = typeof e?.message === 'string' ? e.message.trim() : ''
      parentConfigBlockText.value =
        m.length > 0 ? m : '直属团队长尚未为您配置分润比例'
    } else {
      contextUnavailable.value = true
      const m = typeof e?.message === 'string' ? e.message.trim() : ''
      showToast(m.length > 0 ? m : '加载分润配置失败')
    }
  } finally {
    contextLoading.value = false
  }
}

async function loadMt5TodayProfitHint() {
  try {
    const snap = await fetchLatestMt5Snapshot()
    if (!snap || typeof snap !== 'object' || Array.isArray(snap)) {
      mt5EquityMinusPrincipal.value = null
      return
    }
    const eq = Number(snap.equity)
    if (!Number.isFinite(eq) || eq === 0) {
      mt5EquityMinusPrincipal.value = null
      return
    }
    let principal = pickNum(snap.principalAmount)
    if (principal == null) {
      try {
        const me = await fetchMe()
        const v = me?.profile?.principalAmount ?? 0
        const p = Number(v)
        principal = Number.isFinite(p) ? p : 0
      } catch {
        principal = 0
      }
    }
    mt5EquityMinusPrincipal.value = eq - principal
  } catch {
    mt5EquityMinusPrincipal.value = null
  }
}

onMounted(() => {
  void loadContext()
})

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
.transfer-hint__emph {
  font-weight: 700;
  color: #ee0a24;
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
.profit-report-submit__form {
  padding-top: 12px;
  padding-bottom: env(safe-area-inset-bottom);
}

.profit-report-submit__state {
  padding: 24px 16px 32px;
  padding-bottom: calc(32px + env(safe-area-inset-bottom, 0px));
}

.state-page__lead {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--app-text-primary, #323233);
}

.state-page__hint {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.55;
  color: var(--app-text-secondary, #646566);
  text-align: left;
}

.state-page__actions {
  margin: 24px 16px 0;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}
</style>
