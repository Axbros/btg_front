<template>
  <div>
    <AppHeader title="补仓详情" />
    <van-loading v-if="loading" class="repl-mine-detail__loading" vertical>加载中…</van-loading>
    <template v-else>
      <ReplenishmentApplyDetailBody v-if="replenishment" :detail="replenishment" />
      <van-cell-group v-if="showApplicantFundProgressHint" inset class="repl-mine-detail__fund">
        <van-cell title="交易所名称" :value="walletNameText" />
        <van-cell title="钱包地址" :value="walletAddressText" />
        <van-cell title="">
          <template #title>
            <p class="repl-mine-detail__fund-tip">{{ applicantFundProgressTip }}</p>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group v-if="approvedRepays.length"  title="已通过归仓" class="repl-mine-detail__repays">
        <van-cell
          v-for="(row, idx) in approvedRepays"
          :key="row.id ?? idx"
          is-link
          @click="goRepayDetail(row)"
        >
          <template #title>
            <div class="repl-mine-detail__repay-title">
              <span>{{ txt(row.repayNo ?? row.repay_no) }}</span>
              <span class="repl-mine-detail__repay-meta">
                {{ formatDateTime(row.submitTime ?? row.submit_time) }}
               
              </span>
            </div>
          </template>
          <template #value>
            <span class="repl-mine-detail__repay-amt">{{ formatMoney(row.repayAmount ?? row.repay_amount) }}</span>
          </template>
        </van-cell>
      </van-cell-group>
      <EmptyState v-if="!replenishment && !approvedRepays.length" description="未获取到补仓信息" />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ReplenishmentApplyDetailBody from '@/components/ReplenishmentApplyDetailBody.vue'
import { fetchReplenishmentMineDetail } from '@/api/replenishment'
import { formatMoney, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const replenishment = ref(null)
const approvedRepays = ref([])

const applyId = computed(() => {
  const raw = route.params.id
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

/** status 7 / 8：突出打款信息并说明资方侧进度 */
const showApplicantFundProgressHint = computed(() => {
  const r = replenishment.value
  if (!r) return false
  const s = Number(r.status)
  return s === 7 || s === 8
})

const applicantFundProgressTip = computed(() => {
  const r = replenishment.value
  if (!r) return ''
  if (Number(r.status) === 7) {
    return '当前为「待资方补充资料」阶段，资方将上传打款凭证并填写备注；您无需在此提交。请核对打款信息，并留意状态更新。'
  }
  if (Number(r.status) === 8) {
    return '当前为「待资方终审确认」阶段，资方将核对信息后完成终审。请留意状态更新。'
  }
  return ''
})

function pickWallet(r, camel, snake) {
  if (!r || typeof r !== 'object') return ''
  const v = r[camel] ?? r[snake]
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

const walletNameText = computed(() => {
  const t = pickWallet(replenishment.value, 'walletName', 'wallet_name')
  return t || '—'
})

const walletAddressText = computed(() => {
  const t = pickWallet(replenishment.value, 'walletAddress', 'wallet_address')
  return t || '—'
})

/**
 * GET /replenishments/{id} 返回 { replenishment, approvedRepays }；兼容旧版扁平补仓 VO。
 */
function parseReplenishmentDetailPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return { replenishment: null, approvedRepays: [] }
  }
  if (
    'replenishment' in raw ||
    'replenishment_apply' in raw ||
    'approvedRepays' in raw ||
    'approved_repays' in raw
  ) {
    const repl = raw.replenishment ?? raw.replenishment_apply ?? null
    const list = raw.approvedRepays ?? raw.approved_repays
    return {
      replenishment: repl && typeof repl === 'object' ? repl : null,
      approvedRepays: Array.isArray(list) ? list : [],
    }
  }
  if (raw.applyNo != null || raw.apply_no != null || raw.principalAmount != null || raw.principal_amount != null) {
    return { replenishment: raw, approvedRepays: [] }
  }
  return { replenishment: null, approvedRepays: [] }
}

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function goRepayDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayMineDetail', params: { id: String(id) } })
}

async function loadDetail() {
  const id = applyId.value
  if (id == null) {
    loading.value = false
    replenishment.value = null
    approvedRepays.value = []
    return
  }
  loading.value = true
  replenishment.value = null
  approvedRepays.value = []
  try {
    const raw = await fetchReplenishmentMineDetail(id)
    const { replenishment: repl, approvedRepays: repays } = parseReplenishmentDetailPayload(raw)
    replenishment.value = repl
    approvedRepays.value = repays
  } catch {
    replenishment.value = null
    approvedRepays.value = []
    showToast('加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

watch(applyId, () => loadDetail(), { immediate: true })
</script>

<style scoped>
.repl-mine-detail__loading {
  padding: 48px 0;
}
.repl-mine-detail__repays {
  margin-top: 12px;
}
.repl-mine-detail__repay-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.repl-mine-detail__repay-meta {
  font-size: 12px;
  color: #969799;
  font-weight: 400;
}
.repl-mine-detail__repay-amt {
  font-size: 15px;
  color: #323233;
}
.repl-mine-detail__fund {
  margin-top: 12px;
}
.repl-mine-detail__fund-tip {
  margin: 0;
  font-size: 13px;
  color: #646566;
  line-height: 1.55;
}
</style>
