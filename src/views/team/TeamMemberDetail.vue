<template>
  <div>
    <AppHeader title="下级详情" />
    <div v-if="loading" class="loading-wrap">
      <van-loading type="spinner" />
    </div>
    <template v-else-if="detail">
      <van-cell-group inset title="账号信息">
        <van-cell title="用户ID" :value="txt(user.id)" />
        <van-cell title="手机号" :value="txt(user.mobile)" />
        <van-cell title="昵称" :value="txt(user.nickname)" />
        <van-cell title="上级用户" :value="referrerNicknameText" />
        <van-cell title="账号状态" :value="formatUserStatus(user.status)" />
      </van-cell-group>

      <van-cell-group v-if="profile" inset title="证件资料">
        <van-cell title="真实姓名" :value="txt(profile.realName)" />
        <van-cell title="身份证号" :value="txt(profile.idCardNo)" />
        <!-- <van-cell title="身份证正面">
          <template v-if="url(profile.idCardFrontUrl)" #value>
            <van-image class="detail-img" fit="cover" :src="url(profile.idCardFrontUrl)" />
          </template>
          <template v-else #value>—</template>
        </van-cell>
        <van-cell title="身份证反面">
          <template v-if="url(profile.idCardBackUrl)" #value>
            <van-image class="detail-img" fit="cover" :src="url(profile.idCardBackUrl)" />
          </template>
          <template v-else #value>—</template>
        </van-cell>
        <van-cell title="人脸照片">
          <template v-if="url(profile.facePhotoUrl)" #value>
            <van-image class="detail-img" fit="cover" :src="url(profile.facePhotoUrl)" />
          </template>
          <template v-else #value>—</template>
        </van-cell> -->
      </van-cell-group>
      <van-cell-group v-if="profile" inset title="交易信息">
        <van-cell title="KYC 状态">
          <template #value>
            <van-tag plain :type="kycTagType">
              {{ formatKycStatus(profile.kycStatus ?? profile.kyc_status) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="服务器名称" :value="txt(profile.serverName)" />
        <van-cell title="交易账号" :value="txt(profile.tradingAccountId)" />
        <van-cell title="交易密码" :value="txt(profile.tradingAccountPassword)" />
        <van-cell title="交易所 UID" :value="txt(profile.exchangeUid)" />
        <van-cell title="本金金额" :value="moneyTxt(profile.principalAmount)" />
      </van-cell-group>
      <van-cell-group v-else inset title="认证与资料">
        <van-cell title="资料" value="尚未录入" />
      </van-cell-group>

      <van-cell-group inset title="直属分佣绑定">
        <!-- <van-cell title="策略 ID" :value="txt(bindingStrategyId)" /> -->
        <van-cell title="策略名称" :value="txt(bindingStrategyName)" />
        <van-cell title="分佣比例" :value="rateTxt(bindingCommissionRate)" />
      </van-cell-group>

      <div v-if="showKycAudit" class="actions actions--audit">
        <van-button round block type="primary" @click="openAudit('approve')">审核通过</van-button>
        <van-button round block type="danger" plain @click="openAudit('reject')">拒绝</van-button>
      </div>

      <div class="actions">
        <van-button
          round
          block
          :type="canBindStrategy ? 'primary' : 'default'"
          @click="onBindClick"
        >
          绑定分佣策略
        </van-button>
        <p v-if="bindHint" class="actions__hint">{{ bindHint }}</p>
      </div>
    </template>
    <EmptyState v-else description="未找到该用户或无权查看" />

    <van-dialog
      v-model:show="auditDialogShow"
      :title="auditTitle"
      show-cancel-button
      confirm-button-text="确定"
      teleport="body"
      :before-close="onAuditDialogBeforeClose"
    >
      <div class="dialog-field-wrap">
        <van-field
          v-model="auditRemark"
          type="textarea"
          rows="4"
          maxlength="500"
          show-word-limit
          placeholder="审核备注（选填）"
          :border="false"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { approveKycAudit, rejectKycAudit } from '@/api/kyc'
import { fetchUserDetail } from '@/api/user'
import {
  formatKycStatus,
  formatMoney,
  formatRate,
  formatUserStatus,
  kycStatusTagType,
} from '@/utils/format'

const route = useRoute()
const router = useRouter()

const detail = ref(null)
const loading = ref(true)

const auditDialogShow = ref(false)
const auditAction = ref('approve')
const auditRemark = ref('')

const user = computed(() => detail.value?.user ?? {})
const profile = computed(() => detail.value?.profile ?? null)

const referrerNicknameText = computed(() => {
  const u = user.value
  const n = u?.referrerNickname ?? u?.referrer_nickname
  if (n == null || String(n).trim() === '') return '—'
  return String(n)
})

/** UserDetailVo 根级：与直属上级 ACTIVE 绑定快照，无则 null */
// const bindingStrategyId = computed(() => {
//   const d = detail.value
//   if (!d) return null
//   return d.strategyId ?? d.strategy_id ?? null
// })

const bindingCommissionRate = computed(() => {
  const d = detail.value
  if (!d) return null
  return d.commissionRate ?? d.commission_rate ?? null
})

/** 有效绑定时来自 btg_commission_strategy.strategy_name；策略行已删则为 null */
const bindingStrategyName = computed(() => {
  const d = detail.value
  if (!d) return null
  const n = d.strategyName ?? d.strategy_name
  return n === undefined || n === null || n === '' ? null : n
})

const kycNum = computed(() => {
  const p = profile.value
  if (!p) return null
  const v = p.kycStatus ?? p.kyc_status
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
})

const kycTagType = computed(() =>
  kycNum.value != null ? kycStatusTagType(kycNum.value) : 'default',
)

/** 仅 KYC=2（通过）可进入绑定策略 */
const canBindStrategy = computed(() => kycNum.value === 2)

const showKycAudit = computed(() => kycNum.value === 1)

const bindHint = computed(() => {
  if (!detail.value) return ''
  if (canBindStrategy.value) return ''
  if (!profile.value) return '下级尚未完善资料，无法绑定分佣策略'
  const k = kycNum.value
  if (k === null) return 'KYC 状态未知，无法绑定分佣策略'
  if (k === 0) return 'KYC 未提交，审核通过后方可绑定分佣策略'
  if (k === 1) return 'KYC 待审核，审核通过后方可绑定分佣策略'
  if (k === 3) return 'KYC 已拒绝，无法绑定分佣策略'
  return 'KYC 未通过，无法绑定分佣策略'
})

const auditTitle = computed(() =>
  auditAction.value === 'approve' ? '通过 KYC 审核' : '拒绝 KYC 审核',
)

function memberIdNum() {
  const n = Number(route.params.memberId)
  return Number.isFinite(n) && n > 0 ? n : null
}

function txt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function url(v) {
  if (v == null || String(v).trim() === '') return ''
  return String(v).trim()
}

function moneyTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return formatMoney(v)
}

function rateTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return formatRate(v)
}

function onBindClick() {
  if (!canBindStrategy.value) {
    showToast(bindHint.value || '仅在下级 KYC 审核通过后可绑定分佣策略')
    return
  }
  const id = memberIdNum()
  if (id == null) return
  router.push({ path: `/team/bind/${id}` })
}

function openAudit(action) {
  auditAction.value = action
  auditRemark.value = ''
  auditDialogShow.value = true
}

async function onAuditDialogBeforeClose(action) {
  if (action === 'cancel') return true
  const id = memberIdNum()
  if (id == null) return false
  try {
    const body = { targetUserId: id, remark: auditRemark.value.trim() }
    if (auditAction.value === 'approve') {
      await approveKycAudit(body)
      showToast('已通过审核')
    } else {
      await rejectKycAudit(body)
      showToast('已拒绝')
    }
    await reloadDetail()
    return true
  } catch {
    return false
  }
}

async function reloadDetail() {
  const id = memberIdNum()
  if (id == null) return
  try {
    detail.value = await fetchUserDetail(id)
  } catch {
    /* keep old detail */
  }
}

onMounted(async () => {
  const id = memberIdNum()
  if (id == null) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    detail.value = await fetchUserDetail(id)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.actions {
  margin: 20px 16px 0;
}
.actions--audit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.actions__hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #969799;
  line-height: 1.45;
  text-align: center;
}
.team-path-cell :deep(.van-cell__label) {
  word-break: break-all;
  line-height: 1.45;
  margin-top: 4px;
}
.detail-img {
  width: 88px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
}
.dialog-field-wrap {
  padding: 0 8px 8px;
}
</style>
