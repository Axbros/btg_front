<template>
  <div>
    <AppHeader title="归仓·重新提交" />
    <van-loading v-if="pageLoading" class="repay-rs__loading" vertical>加载中…</van-loading>
    <van-empty v-else-if="!canResubmit" description="当前记录不可重提或不存在" />
    <van-form v-else scroll-to-error :show-error-message="true" @submit="onSubmit" style="padding-top: 12px">
      <van-cell-group inset>
        <van-notice-bar left-icon="info-o" :scrollable="false" text="已退回待修改：请核对归仓金额与截图后重新提交。" />
        <template v-if="replBlock">
          <van-cell title="补仓单号" :value="txt(replBlock.applyNo ?? replBlock.apply_no)" />
          <van-cell title="审核通过金额" :value="formatMoney(num(replBlock.approvedAmount ?? replBlock.approved_amount))" />
          <van-cell title="已归还金额" :value="formatMoney(num(replBlock.repaidAmount ?? replBlock.repaid_amount))" />
          <van-cell title="待审归仓金额" :value="formatMoney(num(replBlock.pendingRepayAmount ?? replBlock.pending_repay_amount))" />
          <van-cell title="剩余金额" :value="formatMoney(num(replBlock.remainingAmount ?? replBlock.remaining_amount))" />
        </template>
        <van-field
          v-model="repayAmount"
          name="repayAmount"
          label="归仓金额"
          type="number"
          required
          :rules="[
            { required: true, message: '请填写归仓金额' },
            { validator: (v) => Number(v) > 0, message: '金额须大于 0' },
          ]"
        />
        <van-field
          v-model="repayScreenshotUrl"
          name="repayScreenshotUrl"
          label="归仓截图"
          readonly
          required
          :rules="[{ required: true, message: '请上传归仓截图' }]"
        >
          <template #input>
            <ImageUploadField v-model="repayScreenshotUrl" upload-type="TRANSFER" hint="上传归仓转账截图" />
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
import { fetchRepayMineDetail, resubmitRepayApply } from '@/api/replenishment'
import { formatMoney } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const pageLoading = ref(true)
const submitting = ref(false)
const detail = ref(null)
const repayAmount = ref('')
const repayScreenshotUrl = ref('')

const repayId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : null
})

const replBlock = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return null
  return d.replenishmentApply ?? d.replenishment_apply ?? null
})

const canResubmit = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return false
  return Number(d.status) === 4
})

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

async function load() {
  const id = repayId.value
  pageLoading.value = true
  detail.value = null
  if (id == null) {
    pageLoading.value = false
    return
  }
  try {
    const d = await fetchRepayMineDetail(id)
    detail.value = d && typeof d === 'object' ? d : null
    if (!canResubmit.value) {
      showToast('当前状态不可重提')
      return
    }
    const ra = d.repayAmount ?? d.repay_amount
    repayAmount.value = ra != null && String(ra) !== '' ? String(ra) : ''
    repayScreenshotUrl.value = String(d.repayScreenshotUrl ?? d.repay_screenshot_url ?? '').trim()
  } catch {
    detail.value = null
  } finally {
    pageLoading.value = false
  }
}

watch(repayId, () => load(), { immediate: true })

async function onSubmit() {
  const id = repayId.value
  if (id == null) return
  submitting.value = true
  try {
    await resubmitRepayApply(id, {
      repayAmount: Number(repayAmount.value),
      repayScreenshotUrl: repayScreenshotUrl.value.trim(),
    })
    showToast('已重新提交')
    router.replace({ name: 'RepayMine' })
  } catch {
    /* */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.repay-rs__loading {
  padding: 48px 0;
}
.actions {
  margin: 20px 16px 0;
}
</style>
