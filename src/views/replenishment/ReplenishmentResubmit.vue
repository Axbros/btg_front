<template>
  <div>
    <AppHeader title="补仓·重新提交" />
    <van-loading v-if="pageLoading" class="repl-rs__loading" vertical>加载中…</van-loading>
    <van-empty v-else-if="!canResubmit" description="当前记录不可重提或不存在" />
    <van-form v-else scroll-to-error :show-error-message="true" @submit="onSubmit" style="padding-top: 12px">
      <van-cell-group inset>
        <van-notice-bar left-icon="info-o" :scrollable="false" text="已退回待修改：请核对余额与截图后重新提交。" />
        <van-cell title="底仓本金" :value="formatMoney(principalNum)" />
        <van-field
          v-model="balanceAmount"
          name="balanceAmount"
          label="当前余额"
          type="number"
          required
          :rules="[
            { required: true, message: '请填写当前余额' },
            { validator: (v) => Number(v) >= 0, message: '余额不能为负' },
          ]"
        />
        <van-cell title="预计补仓额度" :value="formatMoney(previewReplenish)" :label="previewHint" />
        <van-field
          v-model="balanceScreenshotUrl"
          name="balanceScreenshotUrl"
          label="余额截图"
          readonly
          required
          :rules="[{ required: true, message: '请上传余额截图' }]"
        >
          <template #input>
            <ImageUploadField v-model="balanceScreenshotUrl" upload-type="OTHER" hint="上传交易所或账户余额截图" />
          </template>
        </van-field>
      </van-cell-group>
      <div class="actions">
        <van-button round block type="primary" native-type="submit" :loading="submitting">重新提交</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { fetchReplenishmentMineDetail, resubmitReplenishment } from '@/api/replenishment'
import { formatMoney } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const pageLoading = ref(true)
const submitting = ref(false)
const replenishment = ref(null)
const balanceAmount = ref('')
const balanceScreenshotUrl = ref('')

const applyId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : null
})

const principalNum = computed(() => {
  const r = replenishment.value
  if (!r) return 0
  const v = Number(r.principalAmount ?? r.principal_amount ?? 0)
  return Number.isFinite(v) ? v : 0
})

const previewReplenish = computed(() => {
  const p = principalNum.value
  const b = Number(balanceAmount.value)
  if (!Number.isFinite(p) || !Number.isFinite(b)) return 0
  const d = p - b
  return d > 0 ? d : 0
})

const previewHint = computed(() => {
  if (previewReplenish.value <= 0) return '补仓额度须大于 0 才能提交（本金应大于当前余额）'
  return '实际额度以服务端校验为准'
})

const canResubmit = computed(() => {
  const r = replenishment.value
  if (!r || typeof r !== 'object') return false
  return Number(r.status) === 9
})

async function load() {
  const id = applyId.value
  pageLoading.value = true
  replenishment.value = null
  if (id == null) {
    pageLoading.value = false
    return
  }
  try {
    const pack = await fetchReplenishmentMineDetail(id)
    const r = pack?.replenishment ?? pack?.data?.replenishment ?? pack
    replenishment.value = r && typeof r === 'object' ? r : null
    if (!canResubmit.value) {
      showToast('当前状态不可重提')
      return
    }
    const bal = r.balanceAmount ?? r.balance_amount
    balanceAmount.value = bal != null && String(bal) !== '' ? String(bal) : ''
    balanceScreenshotUrl.value = String(r.balanceScreenshotUrl ?? r.balance_screenshot_url ?? '').trim()
  } catch {
    replenishment.value = null
  } finally {
    pageLoading.value = false
  }
}

watch(applyId, () => load(), { immediate: true })

async function onSubmit() {
  const id = applyId.value
  if (id == null) return
  submitting.value = true
  try {
    await resubmitReplenishment(id, {
      balanceAmount: Number(balanceAmount.value),
      balanceScreenshotUrl: balanceScreenshotUrl.value.trim(),
    })
    showToast('已重新提交')
    router.replace({ name: 'ReplenishmentMine' })
  } catch {
    /* */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.repl-rs__loading {
  padding: 48px 0;
}
.actions {
  padding: 16px 12px 24px;
}
</style>
