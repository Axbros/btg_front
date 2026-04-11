<template>
  <div>
    <AppHeader title="调整子级利润比例" />
    <van-notice-bar
      left-icon="info-o"
      wrapable
      :scrollable="false"
      text="子级利润比例为该直属下级整条线相对「总利润」可保留的绝对比例，须沿链路单调不增（1≥r1≥r2≥…≥0），由后端校验。"
    />
    <van-loading v-if="loading" class="pad" vertical>加载中…</van-loading>
    <template v-else-if="childUserId && userDetail">
      <van-cell-group inset>
        <van-cell title="下级" :value="displayUser" />
        <van-cell title="当前子级利润比例" :value="ratioText(currentRatio)" />
        <!-- <van-cell title="约束上限（参考）" :value="ratioText(ceilingRatio)" /> -->
      </van-cell-group>
      <van-form class="form" @submit="onSubmit">
        <van-cell-group inset title="新比例">
          <van-field
            v-model="ratioInput"
            name="childProfitPercent"
            label="子级利润比"
            placeholder="0～100，如 20 表示 20%"
            type="number"
            required
            :rules="percentRules"
          >
            <template #extra>
              <span class="pct-suffix">%</span>
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
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchUserDetail } from '@/api/user'
import { fetchMyChildProfitConfigs, createProfitConfig, updateProfitConfig } from '@/api/profitConfig'
import { formatRate } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const userDetail = ref(null)
const configRows = ref([])

const childUserId = computed(() => {
  const n = Number(route.params.memberId)
  return Number.isFinite(n) && n > 0 ? n : null
})

const user = computed(() => userDetail.value?.user ?? {})

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
    configRows.value.find((c) => Number(c.childUserId ?? c.child_user_id) === id) ?? null
  )
})

const configId = computed(() => matchedConfig.value?.id ?? null)

const currentRatio = computed(() => {
  const fromCfg =
    matchedConfig.value?.childProfitRatio ?? matchedConfig.value?.child_profit_ratio
  if (fromCfg != null && Number.isFinite(Number(fromCfg))) return Number(fromCfg)
  const d = userDetail.value
  const fromUser = d?.childLineProfitRatio ?? d?.child_line_profit_ratio
  if (fromUser != null && Number.isFinite(Number(fromUser))) return Number(fromUser)
  return null
})

const ceilingRatio = computed(() => {
  const c = matchedConfig.value
  if (!c) return null
  return c.maxChildProfitRatio ?? c.parentCeilingRatio ?? null
})

const ratioInput = ref('')

/** 后端为小数 0～1，表单为百分比 0～100 */
function decimalToPercentInput(dec) {
  if (!Number.isFinite(dec)) return ''
  const p = dec * 100
  return String(Number(p.toFixed(4)))
}

const percentRules = [
  { required: true, message: '请填写比例' },
  {
    validator: (v) => {
      const n = Number(String(v).trim())
      return Number.isFinite(n) && n >= 0 && n <= 100
    },
    message: '请输入 0～100 之间的数字（百分比）',
  },
]

function ratioText(v) {
  if (v === null || v === undefined || v === '') return '未配置'
  return formatRate(v)
}

async function load() {
  const id = childUserId.value
  if (id == null) {
    userDetail.value = null
    configRows.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [detail, cfgRaw] = await Promise.all([
      fetchUserDetail(id),
      fetchMyChildProfitConfigs().catch(() => []),
    ])
    userDetail.value = detail
    configRows.value = Array.isArray(cfgRaw) ? cfgRaw : []
    const cur = currentRatio.value
    ratioInput.value = cur != null && Number.isFinite(Number(cur)) ? decimalToPercentInput(Number(cur)) : ''
  } catch {
    userDetail.value = null
    configRows.value = []
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
  const pct = Number(String(ratioInput.value).trim())
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    showToast('请输入 0～100 之间的百分比')
    return
  }
  const childProfitRatio = pct / 100
  saving.value = true
  try {
    if (configId.value != null) {
      await updateProfitConfig(configId.value, { childProfitRatio })
    } else {
      await createProfitConfig({ childUserId: id, childProfitRatio })
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
</style>
