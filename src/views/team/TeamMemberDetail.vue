<template>
  <div>
    <AppHeader title="下级详情" />
    <div v-if="loading" class="loading-wrap">
      <van-loading type="spinner" />
    </div>
    <template v-else-if="detail">
      <van-cell-group inset title="基本信息">
        <!-- <van-cell title="用户ID" :value="txt(user.id)" /> -->
        <van-cell title="手机号码" :value="txt(user.mobile)" />
        <van-cell title="用户姓名" :value="txt(user.nickname)" />
        <van-cell title="所属团队长" :value="referrerNicknameText" />
        <van-cell title="注册时间" :value="formatDateTime(user.createdAt)" />
        <!-- <van-cell title="账号状态">
          <template #value>
            <van-tag :type="userStatusTagType(user.status)" plain round>
              {{ formatUserStatus(user.status) }}
            </van-tag>
          </template>
        </van-cell> -->
      </van-cell-group>

      <van-cell-group v-if="showBrokerSection" inset title="券商资料">
        <van-cell title="券商名称" :value="txt(profile.walletName)" />
        <van-cell title="钱包地址（TRC20）" :value="txt(profile.walletAddress)" />
      </van-cell-group>
      <van-cell-group v-else-if="profile" inset title="券商资料">
        <van-cell title="资料" value="尚未录入" />
      </van-cell-group>
      <van-cell-group v-else inset title="券商资料">
        <van-cell title="资料" value="尚未录入" />
      </van-cell-group>

      <van-cell-group v-if="showTradingSection" inset title="交易信息">
        <van-cell title="服务器名称" :value="txt(profile.serverName)" />
        <van-cell title="交易账号" :value="txt(profile.tradingAccountId)" />
        <van-cell title="交易密码">
          <template #value>
            <template v-if="isViewerRoot">{{ txt(profile.tradingAccountPassword) }}</template>
            <span v-else class="member-detail-field-hint">********</span>
          </template>
        </van-cell>
        <van-cell title="交易所UID" :value="txt(profile.exchangeUid)" />
        <van-cell title="本金金额" :value="moneyTxt(profile.principalAmount)" />
      </van-cell-group>

      <van-cell-group v-if="qualificationSectionVisible" inset title="用户状态">
        <van-cell title="当前状态">
          <template #value>
            <van-tag :type="qualificationStatusTagType(qualStatusForDisplay)" plain round>
              {{ formatQualificationStatus(qualStatusForDisplay) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell
          v-if="showServerNameInQualificationSlice"
          title="服务器名称"
          :value="txtCell(profile.serverName)"
        />
        <van-cell
          v-if="qualificationAuditRemarkPresent"
          title="审核备注"
          :value="txtCell(qualificationAuditRemark)"
        />
      </van-cell-group>

      <van-cell-group v-if="canAdjustChildProfitRatio" inset title="分润比例配置">
        
        <van-cell title="当前分润比例" :value="rateTxt(childProfitRatioField)" />

        <van-cell title="最大可分润比例" :value="rateTxt(maxAssignableChildProfitRatio)" />
      </van-cell-group>

      <div v-if="canAdjustChildProfitRatio" class="actions">
        <van-button round block type="primary" @click="onRatioConfigClick">调整分润比例</van-button>
        <p class="actions__hint">仅可为直属下级设置</p>
      </div>
    </template>
    <EmptyState v-else description="未找到该用户或无权查看" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchUserDetail } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { canAdjustChildProfitRatioOnFrontend } from '@/utils/teamDirectRelation'
import { isUserRoot } from '@/utils/permission'
import { effectiveQualificationStatusForDisplay } from '@/utils/qualification'
import {
  formatMoney,
  formatQualificationStatus,
  formatRate,
  formatUserStatus,
  qualificationStatusTagType,
  userStatusTagType,
  formatDateTime,
} from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())

const detail = ref(null)
const loading = ref(true)

const user = computed(() => detail.value?.user ?? {})
const profile = computed(() => detail.value?.profile ?? null)

/** 与后端一致：仅根用户接口会返回 tradingAccountPassword */
const isViewerRoot = computed(() => isUserRoot(userInfo.value))

function hasTextField(v) {
  return v != null && String(v).trim() !== ''
}

/** 后端对非根「团队长看下级」返回资料切片时无钱包字段；不展示空券商/交易区块，避免误显敏感结构 */
const showBrokerSection = computed(() => {
  const p = profile.value
  if (!p || typeof p !== 'object') return false
  return hasTextField(p.walletName) || hasTextField(p.walletAddress)
})

const showTradingSection = computed(() => {
  const p = profile.value
  if (!p || typeof p !== 'object') return false
  if (hasTextField(p.tradingAccountId) || hasTextField(p.exchangeUid)) return true
  const amt = p.principalAmount
  if (amt == null || amt === '') return false
  const n = Number(amt)
  return Number.isFinite(n) && n > 0
})

/** 仅切片场景：有服务器名但无完整交易信息时，放在资格区只读展示 */
const showServerNameInQualificationSlice = computed(() => {
  if (!showTradingSection.value) return hasTextField(profile.value?.serverName)
  return false
})

const qualificationSectionVisible = computed(() => {
  const p = profile.value
  if (!p || typeof p !== 'object') return false
  const st = p.qualificationStatus
  if (st != null && st !== '') return true
  return qualificationAuditRemarkPresent.value
})

const qualStatusForDisplay = computed(() =>
  effectiveQualificationStatusForDisplay({
    status: user.value?.status,
    profile: profile.value ?? undefined,
  }),
)

const qualificationAuditRemark = computed(() => profile.value?.qualificationAuditRemark)

const qualificationAuditRemarkPresent = computed(() => {
  const r = qualificationAuditRemark.value
  return r != null && String(r).trim() !== ''
})

function txtCell(v) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

const referrerNicknameText = computed(() => {
  const u = user.value
  const n = u?.referrerNickname
  if (n == null || String(n).trim() === '') return '—'
  return String(n)
})

const childProfitRatioField = computed(
  () => detail.value?.childLineProfitRatio ?? null,
)

const maxAssignableChildProfitRatio = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return null
  const v = d.maxAssignableChildProfitRatio
  const n = Number(v)
  return Number.isFinite(n) ? n : null
})

/** 分润比例：仅非根、直属团队长、下级已激活；从「全部下级」打开非直属详情时为 false */
const canAdjustChildProfitRatio = computed(() =>
  canAdjustChildProfitRatioOnFrontend(userInfo.value, user.value),
)

function memberIdNum() {
  const n = Number(route.params.memberId)
  return Number.isFinite(n) && n > 0 ? n : null
}

function txt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function moneyTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return formatMoney(v)
}

function rateTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return formatRate(v)
}

function onRatioConfigClick() {
  const id = memberIdNum()
  if (id == null) return
  router.push({ name: 'ChildProfitRatioEdit', params: { memberId: String(id) } })
}

async function loadMemberDetail() {
  const id = memberIdNum()
  if (id == null) {
    detail.value = null
    return
  }
  detail.value = await fetchUserDetail(id)
}

onMounted(async () => {
  const id = memberIdNum()
  if (id == null) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    await loadMemberDetail()
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
.actions__btn-spaced {
  margin-top: 12px;
}
.actions__hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #969799;
  line-height: 1.45;
  text-align: center;
}
.member-detail-field-hint {
  font-size: 13px;
  color: #969799;
  line-height: 1.45;
  text-align: right;
}
</style>
