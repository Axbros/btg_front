<template>
  <div>
    <AppHeader title="调整分润比例" style="margin-bottom: 12px;"/>
 
    <van-loading v-if="loading" class="pad" vertical>加载中…</van-loading>
    <template v-else-if="childUserId && userDetail">
      <van-cell-group inset>
        <van-cell title="当前用户" :value="displayUser" />
        <van-cell title="当前分润模式" :value="commissionModeDisplay" />
        <van-cell title="当前兜底分润比例" :value="currentGuaranteeRatioLineDisplay" />
        <van-cell title="当前不兜底分润比例" :value="currentNonGuaranteeRatioLineDisplay" />
      </van-cell-group>
      <!-- <van-notice-bar
        v-if="maxAssignableRatio != null"
        left-icon="info-o"
        color="#646566"
        background="#f7f8fa"
        class="ratio-cap-notice"
        :scrollable="false"
        wrapable
        :text="maxAssignableNotice"
      /> -->
      <van-form class="form" @submit="onSubmit">
        <van-cell-group inset title="比例配置">
          <van-field
            v-model="ratioGuaranteeInput"
            name="childProfitPercentGuarantee"
            label="兜底"
            placeholder="0～100，如 20 表示 20%"
            type="number"
            required
            :rules="percentRulesGuarantee"
          >
            <template #extra>
              <span class="pct-suffix">%</span>
            </template>
          </van-field>
          <van-field
            v-model="ratioNonGuaranteeInput"
            name="childProfitPercentNonGuarantee"
            label="不兜底"
            placeholder="0～100，如 15 表示 15%"
            type="number"
            required
            :rules="percentRulesNonGuarantee"
          >
            <template #extra>
              <span class="pct-suffix">%</span>
            </template>
          </van-field>
          <van-field
            v-model="commissionModeInput"
            name="commissionMode"
            label="分润模式"
            label-width="5em"
            required
            :rules="commissionModeRules"
            class="mode-field"
          >
            <template #input>
              <van-radio-group v-model="commissionModeInput" direction="horizontal" class="mode-radios">
                <van-radio name="GUARANTEE">兜底</van-radio>
                <van-radio name="NON_GUARANTEE">不兜底</van-radio>
              </van-radio-group>
            </template>
          </van-field>
        </van-cell-group>
        <div class="actions">
          <van-button round block type="primary" native-type="submit" :loading="saving">保存</van-button>
        </div>
      </van-form>
    </template>
    <EmptyState v-else-if="!loading" description="无效的下级、未找到用户或无权操作" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchUserDetail } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { canAdjustChildProfitRatioOnFrontend } from '@/utils/teamDirectRelation'
import { fetchMyChildProfitConfigs, createProfitConfig, updateProfitConfig } from '@/api/profitConfig'
import { formatRate } from '@/utils/format'
import { normalizeProfitReport } from '@/utils/profitReportNormalize'
import {
  pickGuaranteeChildProfitRatio,
  pickNonGuaranteeChildProfitRatio,
  pickMaxAssignableGuarantee,
  pickMaxAssignableNonGuarantee,
  pickChildRatioAcross,
  pickCommissionModeAcross,
} from '@/utils/profitChildRatioPick'

const route = useRoute()
const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())

const loading = ref(true)
const saving = ref(false)
const userDetail = ref(null)
const configRows = ref([])

const childUserId = computed(() => {
  const n = Number(route.params.memberId)
  return Number.isFinite(n) && n > 0 ? n : null
})

const user = computed(() => userDetail.value?.user ?? {})

const viewerProfitConfig = computed(() => {
  const d = userDetail.value
  const v = d?.viewerProfitConfig
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null
})

const displayUser = computed(() => {
  const nick = user.value.nickname != null && String(user.value.nickname).trim() !== '' ? String(user.value.nickname) : ''
  const m = user.value.mobile != null ? String(user.value.mobile) : ''
  if (nick && m) return `${nick}（${m}）`
  return nick || m || `用户 ${childUserId.value ?? '—'}`
})

const matchedConfig = computed(() => {
  const id = childUserId.value
  if (id == null) return null
  return (
    configRows.value.find((c) => Number(c.childUserId) === id) ?? null
  )
})

/** 仅展示：优先 viewerProfitConfig，再 my-children 行 / 详情体 */
const commissionModeDisplay = computed(() => {
  const vpc = viewerProfitConfig.value
  if (vpc) {
    const desc = String(vpc.commissionModeDesc ?? '').trim()
    if (desc) return desc
    const n = normalizeProfitReport(vpc)
    const t = String(n.commissionModeDesc ?? '').trim()
    if (t) return t
  }
  const cfg = matchedConfig.value
  const d = userDetail.value
  const candidates = [cfg, d?.user, d].filter((x) => x && typeof x === 'object')
  for (const obj of candidates) {
    const n = normalizeProfitReport(obj)
    const t = String(n.commissionModeDesc ?? '').trim()
    if (t) return t
  }
  return '-'
})

const configId = computed(() => matchedConfig.value?.id ?? null)

function ratioSources() {
  const cfg = matchedConfig.value
  const d = userDetail.value
  const vpc = viewerProfitConfig.value
  const u = d?.user
  return [cfg, vpc, d, u].filter((x) => x && typeof x === 'object' && !Array.isArray(x))
}

const currentGuaranteeRatio = computed(() =>
  pickChildRatioAcross(ratioSources(), pickGuaranteeChildProfitRatio),
)

const currentNonGuaranteeRatio = computed(() =>
  pickChildRatioAcross(ratioSources(), pickNonGuaranteeChildProfitRatio),
)

const ratioGuaranteeInput = ref('')
const ratioNonGuaranteeInput = ref('')
/** 与 ProfitConfigUpdateRequest.commissionMode 一致；新建无配置时默认兜底 */
const commissionModeInput = ref('GUARANTEE')

const maxAssignableRatioGuarantee = computed(() => {
  const d = userDetail.value
  if (!d || typeof d !== 'object') return null
  for (const o of [viewerProfitConfig.value, d].filter(Boolean)) {
    const v = pickMaxAssignableGuarantee(o)
    if (v != null && Number.isFinite(v)) return v
  }
  return null
})

const maxAssignableRatioNonGuarantee = computed(() => {
  const d = userDetail.value
  if (!d || typeof d !== 'object') return null
  for (const o of [viewerProfitConfig.value, d].filter(Boolean)) {
    const v = pickMaxAssignableNonGuarantee(o)
    if (v != null && Number.isFinite(v)) return v
  }
  return null
})

function ratioToPercentCap(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return null
  return ratio > 1 ? ratio : ratio * 100
}

/** 后端为小数 0～1，表单为百分比 0～100 */
function decimalToPercentInput(dec) {
  if (!Number.isFinite(dec)) return ''
  const p = dec * 100
  return String(Number(p.toFixed(4)))
}

function buildPercentRules(capPercent) {
  return [
    { required: true, message: '请填写比例' },
    {
      validator: (v) => {
        const n = Number(String(v).trim())
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return '请输入 0～100 之间的数字（百分比）'
        }
        const cap = capPercent
        if (cap != null && Number.isFinite(cap) && n > cap + 1e-6) {
          return `不可超过上限 ${Number(cap.toFixed(4))}%`
        }
        return true
      },
    },
  ]
}

const percentRulesGuarantee = computed(() =>
  buildPercentRules(ratioToPercentCap(maxAssignableRatioGuarantee.value)),
)

const percentRulesNonGuarantee = computed(() =>
  buildPercentRules(ratioToPercentCap(maxAssignableRatioNonGuarantee.value)),
)

const commissionModeRules = [
  { required: true, message: '请选择分润模式' },
  {
    validator: (v) =>
      v === 'GUARANTEE' || v === 'NON_GUARANTEE' ? true : '请选择分润模式',
  },
]

function ratioText(v) {
  if (v === null || v === undefined || v === '') return '未配置'
  return formatRate(v)
}

function ratioTextWithMaxSuffix(ratio, maxRatio) {
  const main = ratioText(ratio)
  if (maxRatio == null || !Number.isFinite(Number(maxRatio))) return main
  return `${main}（~${formatRate(maxRatio)}）`
}

const currentGuaranteeRatioLineDisplay = computed(() =>
  ratioTextWithMaxSuffix(currentGuaranteeRatio.value, maxAssignableRatioGuarantee.value),
)

const currentNonGuaranteeRatioLineDisplay = computed(() =>
  ratioTextWithMaxSuffix(currentNonGuaranteeRatio.value, maxAssignableRatioNonGuarantee.value),
)

async function load() {
  const id = childUserId.value
  if (id == null) {
    userDetail.value = null
    configRows.value = []
    ratioGuaranteeInput.value = ''
    ratioNonGuaranteeInput.value = ''
    commissionModeInput.value = 'GUARANTEE'
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [detail, cfgRaw] = await Promise.all([
      fetchUserDetail(id),
      fetchMyChildProfitConfigs().catch(() => []),
    ])
    const child = detail?.user
    if (!canAdjustChildProfitRatioOnFrontend(userInfo.value, child)) {
      userDetail.value = null
      configRows.value = []
      ratioGuaranteeInput.value = ''
      ratioNonGuaranteeInput.value = ''
      commissionModeInput.value = 'GUARANTEE'
      return
    }
    userDetail.value = detail
    configRows.value = Array.isArray(cfgRaw) ? cfgRaw : []
    const g = currentGuaranteeRatio.value
    const ng = currentNonGuaranteeRatio.value
    ratioGuaranteeInput.value =
      g != null && Number.isFinite(Number(g)) ? decimalToPercentInput(Number(g)) : ''
    ratioNonGuaranteeInput.value =
      ng != null && Number.isFinite(Number(ng)) ? decimalToPercentInput(Number(ng)) : ''
    commissionModeInput.value = pickCommissionModeAcross(ratioSources()) ?? 'GUARANTEE'
  } catch {
    userDetail.value = null
    configRows.value = []
    ratioGuaranteeInput.value = ''
    ratioNonGuaranteeInput.value = ''
    commissionModeInput.value = 'GUARANTEE'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(
  () => route.params.memberId,
  () => load(),
)

async function onSubmit() {
  const id = childUserId.value
  if (id == null) return
  const child = userDetail.value?.user
  if (!canAdjustChildProfitRatioOnFrontend(userInfo.value, child)) {
    showToast('仅可为直属且已激活的下级调整分润比例')
    return
  }
  const pctG = Number(String(ratioGuaranteeInput.value).trim())
  const pctNg = Number(String(ratioNonGuaranteeInput.value).trim())
  if (!Number.isFinite(pctG) || pctG < 0 || pctG > 100 || !Number.isFinite(pctNg) || pctNg < 0 || pctNg > 100) {
    showToast('请为兜底、不兜底分别填写 0～100 之间的百分比')
    return
  }
  const capG = ratioToPercentCap(maxAssignableRatioGuarantee.value)
  const capNg = ratioToPercentCap(maxAssignableRatioNonGuarantee.value)
  if (capG != null && pctG > capG + 1e-6) {
    showToast(`兜底比例不可超过上限 ${Number(capG.toFixed(4))}%`)
    return
  }
  if (capNg != null && pctNg > capNg + 1e-6) {
    showToast(`不兜底比例不可超过上限 ${Number(capNg.toFixed(4))}%`)
    return
  }
  const mode = commissionModeInput.value
  if (mode !== 'GUARANTEE' && mode !== 'NON_GUARANTEE') {
    showToast('请选择当前生效分润模式（兜底 / 不兜底）')
    return
  }
  const guaranteeRatio = pctG / 100
  const nonGuaranteeRatio = pctNg / 100
  const commissionMode = mode
  saving.value = true
  try {
    const body = { guaranteeRatio, nonGuaranteeRatio, commissionMode }
    if (configId.value != null) {
      await updateProfitConfig(configId.value, body)
    } else {
      await createProfitConfig({ childUserId: id, ...body })
    }
    showToast('已保存')
    router.replace({
      name: 'TeamMemberDetail',
      params: { memberId: String(id) },
    })
  } catch {
    /* request 已 Toast */
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.pad {
  padding: 48px 0;
}
.form {
  margin-top: 8px;
}
.actions {
  margin: 20px 16px 24px;
}
.pct-suffix {
  margin-left: 4px;
  color: #646566;
  font-size: 14px;
  flex-shrink: 0;
}
.ratio-cap-notice {
  margin: 8px 16px 0;
  border-radius: 8px;
}
.mode-cell :deep(.van-cell__value) {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.mode-radios {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
}
.mode-radios :deep(.van-radio) {
  margin: 0;
}
.mode-radios :deep(.van-radio__label) {
  margin-left: 6px;
}
</style>
