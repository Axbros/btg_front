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
        <van-cell title="账号状态" :value="formatUserStatus(user.status)" />
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

      <van-cell-group inset title="分润比例配置">
        <van-cell title="子级总利润占比" :value="rateTxt(childProfitRatioField)" />
      </van-cell-group>

      <div class="actions">
        <van-button round block type="primary" @click="onRatioConfigClick">调整分润比例</van-button>
        <p class="actions__hint">仅可为直属下级设置</p>
      </div>
    </template>
    <EmptyState v-else description="未找到该用户或无权查看" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchUserDetail } from '@/api/user'
import { formatMoney, formatRate, formatUserStatus } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const detail = ref(null)
const loading = ref(true)

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
.actions__hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #969799;
  line-height: 1.45;
  text-align: center;
}
</style>
