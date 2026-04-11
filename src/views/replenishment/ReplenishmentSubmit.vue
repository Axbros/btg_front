<template>
  <div>
    <AppHeader title="提交补仓申请" />
    <van-notice-bar v-if="profileLoading" left-icon="info-o" :scrollable="false" text="正在加载资料…" />
    <van-form v-else scroll-to-error :show-error-message="true" @submit="onSubmit" style="padding-top: 12px;">
      <van-cell-group inset>
        <van-cell title="底仓本金（资料）" :value="formatMoney(principalNum)" />
        <van-field
          v-model="balanceAmount"
          name="balanceAmount"
          label="当前余额"
          type="number"
          placeholder="填写账户当前余额"
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
            <ImageUploadField
              v-model="balanceScreenshotUrl"
              upload-type="OTHER"
              hint="上传交易所或账户余额截图"
            />
          </template>
        </van-field>
      </van-cell-group>
      <div class="actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">提交申请</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { fetchUserProfile } from '@/api/user'
import { submitReplenishment } from '@/api/replenishment'
import { formatMoney } from '@/utils/format'

const router = useRouter()
const profileLoading = ref(true)
const principalNum = ref(0)
const balanceAmount = ref('')
const balanceScreenshotUrl = ref('')
const loading = ref(false)

const previewReplenish = computed(() => {
  const p = Number(principalNum.value)
  const b = Number(balanceAmount.value)
  if (!Number.isFinite(p) || !Number.isFinite(b)) return 0
  const d = p - b
  return d > 0 ? d : 0
})

const previewHint = computed(() => {
  if (previewReplenish.value <= 0) return '补仓额度须大于 0 才能提交（本金应大于当前余额）'
  return '实际额度以服务端校验为准'
})

onMounted(async () => {
  profileLoading.value = true
  try {
    const prof = await fetchUserProfile()
    const raw = prof?.principalAmount ?? prof?.principal_amount ?? 0
    principalNum.value = Number(raw)
    if (Number.isNaN(principalNum.value)) principalNum.value = 0
  } catch {
    principalNum.value = 0
  } finally {
    profileLoading.value = false
  }
})

async function onSubmit() {
  loading.value = true
  try {
    await submitReplenishment({
      balanceAmount: Number(balanceAmount.value),
      balanceScreenshotUrl: balanceScreenshotUrl.value.trim(),
    })
    showToast('已提交，请等待审核')
    router.replace({ name: 'ReplenishmentMine' })
  } catch {
    /* Toast 由请求层处理 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.actions {
  padding: 16px 12px 24px;
}
</style>
