<template>
  <div>
    <AppHeader title="调整用户利润比例" style="margin-bottom: 12px;"/>
 
    <van-loading v-if="loading" class="pad" vertical>加载中…</van-loading>
    <template v-else-if="childUserId && userDetail">
      <van-cell-group inset>
        <van-cell title="当前用户" :value="displayUser" />
        <van-cell title="当前用户利润比例" :value="ratioText(currentRatio)" />
        <van-cell title="最大可分配比例" :value="maxAssignableValueDisplay" />
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
        <van-cell-group inset title="新比例">
          <van-field
            v-model="ratioInput"
            name="childProfitPercent"
            label="调整利润比"
            placeholder="0～100，如 20 表示 20%"
            type="number"
            required
            :rules="percentRulesComputed"
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
    configRows.value.find((c) => Number(c.childUserId) === id) ?? null
  )
})

const configId = computed(() => matchedConfig.value?.id ?? null)

const currentRatio = computed(() => {
  const fromCfg =
    matchedConfig.value?.childProfitRatio
  if (fromCfg != null && Number.isFinite(Number(fromCfg))) return Number(fromCfg)
  const d = userDetail.value
  const fromUser = d?.childLineProfitRatio
  if (fromUser != null && Number.isFinite(Number(fromUser))) return Number(fromUser)
  return null
})

const ratioInput = ref('')

/** 接口返回：当前直属下级可设置的子级利润比例上限（小数 0～1） */
const maxAssignableRatio = computed(() => {
  const d = userDetail.value
  if (!d || typeof d !== 'object') return null
  const v = d.maxAssignableChildProfitRatio
  const n = Number(v)
  return Number.isFinite(n) ? n : null
})

/** 上限对应的百分比数值，用于输入校验 */
const maxAssignablePercent = computed(() => {
  const r = maxAssignableRatio.value
  if (r == null || !Number.isFinite(r)) return null
  return r > 1 ? r : r * 100
})

const maxAssignableValueDisplay = computed(() => {
  if (maxAssignableRatio.value == null) return '—'
  return ratioText(maxAssignableRatio.value)
})

const maxAssignableNotice = computed(() => {
  if (maxAssignableRatio.value == null) return ''
  const t = ratioText(maxAssignableRatio.value)
  return `新比例为 0～100 的百分数；不可超过最大可分配比例 ${t}，保存时由服务端再次校验。`
})

/** 后端为小数 0～1，表单为百分比 0～100 */
function decimalToPercentInput(dec) {
  if (!Number.isFinite(dec)) return ''
  const p = dec * 100
  return String(Number(p.toFixed(4)))
}

const percentRulesComputed = computed(() => [
  { required: true, message: '请填写比例' },
  {
    validator: (v) => {
      const n = Number(String(v).trim())
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return '请输入 0～100 之间的数字（百分比）'
      }
      const cap = maxAssignablePercent.value
      if (cap != null && n > cap + 1e-6) {
        return `不可超过最大可分配比例 ${Number(cap.toFixed(4))}%`
      }
      return true
    },
  },
])

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
.ratio-cap-notice {
  margin: 8px 16px 0;
  border-radius: 8px;
}
</style>
