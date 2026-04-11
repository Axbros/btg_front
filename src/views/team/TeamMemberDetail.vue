<template>
  <div>
    <AppHeader title="下级详情" />
    <div v-if="loading" class="loading-wrap">
      <van-loading type="spinner" />
    </div>
    <template v-else-if="detail">
      <van-cell-group inset title="账号信息">
        <!-- <van-cell title="用户ID" :value="txt(user.id)" /> -->
        <van-cell title="手机号" :value="txt(user.mobile)" />
        <van-cell title="昵称" :value="txt(user.nickname)" />
        <van-cell title="上级用户" :value="referrerNicknameText" />
        <van-cell title="账号状态">
          <template #value>
            <van-tag :type="userStatusTagType(user.status)" plain round>
              {{ formatUserStatus(user.status) }}
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group v-if="profile" inset title="证件资料">
        <van-cell title="真实姓名" :value="txt(profile.realName)" />
        <van-cell title="身份证号" :value="txt(profile.idCardNo)" />
      </van-cell-group>
      <van-cell-group v-else inset title="认证与资料">
        <van-cell title="资料" value="尚未录入" />
      </van-cell-group>

      <van-cell-group v-if="profile" inset title="交易信息">
        <van-cell title="服务器名称" :value="txt(profile.serverName)" />
        <van-cell title="交易账号" :value="txt(profile.tradingAccountId)" />
        <van-cell title="交易密码" :value="txt(profile.tradingAccountPassword)" />
        <van-cell title="交易所 UID" :value="txt(profile.exchangeUid)" />
        <van-cell title="本金金额" :value="moneyTxt(profile.principalAmount)" />
      </van-cell-group>

      <van-cell-group  v-if="Number(user.status) === 1"  inset title="分润比例配置">
        <van-cell title="子级总利润占比" :value="rateTxt(childProfitRatioField)" />
      </van-cell-group>

      <div v-if="canReviewProfile" class="actions">
        <van-button
          round
          block
          type="primary"
          :loading="reviewLoading"
          :disabled="reviewLoading"
          @click="onApproveProfile"
        >
          通过审核
        </van-button>
        <van-button
          round
          block
          plain
          type="danger"
          class="actions__btn-spaced"
          :loading="reviewLoading"
          :disabled="reviewLoading"
          @click="onRejectProfile"
        >
          退回待完善
        </van-button>
        <p class="actions__hint">仅直属上级可操作：通过后该下级为正常可用；退回后需重新填写资料。</p>
      </div>

      <div v-if="Number(user.status) === 1" class="actions">
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
import { showConfirmDialog, showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  approveTeamMemberProfile,
  fetchUserDetail,
  rejectTeamMemberProfile,
} from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatRate, formatUserStatus, userStatusTagType } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)

const detail = ref(null)
const loading = ref(true)
const reviewLoading = ref(false)

const user = computed(() => detail.value?.user ?? {})
const profile = computed(() => detail.value?.profile ?? null)

const referrerNicknameText = computed(() => {
  const u = user.value
  const n = u?.referrerNickname ?? u?.referrer_nickname
  if (n == null || String(n).trim() === '') return '—'
  return String(n)
})

const childProfitRatioField = computed(
  () => detail.value?.childLineProfitRatio ?? detail.value?.child_line_profit_ratio ?? null,
)

function pickSelfUserId() {
  const u = userInfo.value
  if (!u) return null
  const v = u.id ?? u.userId ?? u.user_id
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function pickMemberReferrerId(u) {
  if (!u || typeof u !== 'object') return null
  const v = u.referrerUserId ?? u.referrer_user_id ?? u.referrerId ?? u.referrer_id
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 下级 status 为 0（待审核）且当前用户为其直属上级时可审核 */
const canReviewProfile = computed(() => {
  if (Number(user.value.status) !== 0) return false
  const selfId = pickSelfUserId()
  const refId = pickMemberReferrerId(user.value)
  if (selfId == null || refId == null) return false
  return selfId === refId
})

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

async function onApproveProfile() {
  const id = memberIdNum()
  if (id == null) return
  try {
    await showConfirmDialog({
      title: '通过审核',
      message: '确认将该下级设为正常可用？',
    })
  } catch {
    return
  }
  reviewLoading.value = true
  try {
    await approveTeamMemberProfile(id)
    showToast('已通过审核')
    await loadMemberDetail()
  } catch {
    /* 错误由请求拦截器提示 */
  } finally {
    reviewLoading.value = false
  }
}

async function onRejectProfile() {
  const id = memberIdNum()
  if (id == null) return
  try {
    await showConfirmDialog({
      title: '退回待完善',
      message: '确认退回？下级将需重新填写资料后再提交。',
    })
  } catch {
    return
  }
  reviewLoading.value = true
  try {
    await rejectTeamMemberProfile(id)
    showToast('已退回待完善')
    await loadMemberDetail()
  } catch {
    /* 错误由请求拦截器提示 */
  } finally {
    reviewLoading.value = false
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
</style>
