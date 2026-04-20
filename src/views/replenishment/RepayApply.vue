<template>
  <div class="repay-apply-page">
    <AppHeader title="提交归仓申请" />

    <van-notice-bar v-if="loadingList" left-icon="info-o" :scrollable="false" text="加载可归仓补仓单…" />

    <template v-else>
      <van-cell-group inset class="block">
        <van-empty
          v-if="!list.length"
          description="当前没有可归仓的补仓单"
          image="search"
        />
        <van-radio-group v-else v-model="selectedId">
          <van-cell
            v-for="item in list"
            :key="item.id"
            clickable
            @click="selectedId = item.id"
          >
            <template #title>
              <div class="pick-card" @click="selectedId = item.id">
                <!-- <div class="pick-card__head">
                  <span class="pick-card__no">{{ txt(item.applyNo) }}</span>
                  <van-tag plain round :type="replenishmentListStatusTagType(item)" class="pick-card__st">
                    {{ formatReplenishmentListStatus(item) }}
                  </van-tag>
                </div> -->
                <div class="pick-card__grid">
                  <span>补仓申请金额</span><span>{{ formatMoney(num(item.approvedAmount)) }}</span>
                  <span>完成归仓金额</span><span>{{ formatMoney(num(item.repaidAmount)) }}</span>
                  <span>待审归仓金额</span><span>{{ formatMoney(num(item.pendingRepayAmount)) }}</span>
                  <span>剩余归仓金额</span><span class="emph">{{ formatMoney(num(item.remainingAmount)) }}</span>
                  <span>资方执行用户</span><span>{{ txt(item.assignedCapitalUserName) }}</span>
                  <span>资方收款 UID</span><span>{{ txt(item.assignedCapitalExchangeUid) }}</span>
                </div>
              </div>
            </template>
            <template #right-icon>
              <van-radio :name="item.id" @click.stop />
            </template>
          </van-cell>
        </van-radio-group>
      </van-cell-group>

      <template v-if="list.length">
        <p v-if="!selectedItem" class="select-hint">请先选择一笔补仓单，再填写归仓信息</p>

        <van-form
          v-if="selectedItem"
          ref="formRef"
          scroll-to-error
          :show-error-message="true"
          class="form-block"
          @submit="onSubmit"
        >
          <van-cell-group inset title="当前选中补仓单" class="block">
            <van-cell title="补仓单号" :value="txt(selectedItem.applyNo)" />
            <van-cell title="资方执行用户" :value="txt(selectedItem.assignedCapitalUserName)" />
            <van-cell
              title="资方收款 UID"
              title-class="repay-apply-emph"
              value-class="repay-apply-emph"
              :value="txt(selectedItem.assignedCapitalExchangeUid)"
            />
            <van-cell
              title="剩余待归还金额"
              title-class="repay-apply-emph"
              value-class="repay-apply-emph"
              :value="formatMoney(maxRepay)"
            />
          </van-cell-group>

          <van-cell-group inset title="归仓申请" class="block">
            <van-cell title="可申请上限说明" :label="maxHint" />
            <van-field
              v-model="repayAmount"
              name="repayAmount"
              label="归仓金额"
              type="number"
              placeholder="大于 0，不超过可申请上限"
              required
              :rules="amountRules"
            />
            <van-field
              v-model="repayScreenshotUrl"
              name="repayScreenshotUrl"
              label="归仓截图"
              readonly
              required
              :rules="[{ required: true, message: '请上传归仓转账截图' }]"
            >
              <template #input>
                <ImageUploadField
                  v-model="repayScreenshotUrl"
                  upload-type="TRANSFER"
                  hint="上传向资方归仓的转账凭证"
                />
              </template>
            </van-field>
          </van-cell-group>
        </van-form>
      </template>
    </template>

    <van-submit-bar
      v-if="!loadingList && list.length"
      :disabled="submitBarDisabled"
      :loading="loading"
      button-text="提交申请"
      placeholder
      safe-area-inset-bottom
      @submit="onBarSubmit"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { getRepayableReplenishments, submitRepayApply } from '@/api/replenishment'
import { formatMoney, formatReplenishmentListStatus, replenishmentListStatusTagType } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loadingList = ref(true)
const list = ref([])
const selectedId = ref(null)
const repayAmount = ref('')
const repayScreenshotUrl = ref('')
const loading = ref(false)
const formRef = ref(null)

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function num(v, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function asList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && Array.isArray(raw.list)) return raw.list
  if (raw && Array.isArray(raw.records)) return raw.records
  if (raw && Array.isArray(raw.content)) return raw.content
  if (raw && Array.isArray(raw.rows)) return raw.rows
  return []
}

function coerceId(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const selectedItem = computed(() => {
  const id = selectedId.value
  if (id == null || id === '') return null
  return list.value.find((x) => Number(x.id) === Number(id)) ?? null
})

const remaining = computed(() => (selectedItem.value ? num(selectedItem.value.remainingAmount) : 0))
const pending = computed(() => (selectedItem.value ? num(selectedItem.value.pendingRepayAmount) : 0))

const maxRepay = computed(() => {
  const m = remaining.value - pending.value
  return m > 0 ? m : 0
})

const maxHint = computed(
  () =>
    `剩余 ${formatMoney(remaining.value)}，待审归仓 ${formatMoney(pending.value)}；本次最多可申请 ${formatMoney(maxRepay.value)}。`,
)

const amountRules = computed(() => {
  const cap = maxRepay.value
  const rem = remaining.value
  const pend = pending.value
  return [
    { required: true, message: '请填写归仓金额' },
    {
      validator: (v) => {
        const n = Number(v)
        if (!Number.isFinite(n) || n <= 0) return false
        if (!selectedItem.value) return false
        if (n > rem + 1e-9) return false
        if (n > rem - pend + 1e-9) return false
        return n <= cap + 1e-9
      },
      message: `归仓金额须大于 0，且不超过 ${formatMoney(cap)}（剩余 ${formatMoney(rem)} 减待审 ${formatMoney(pend)}）`,
    },
  ]
})

const submitBarDisabled = computed(() => !selectedItem.value || loadingList.value)

watch(selectedId, () => {
  repayAmount.value = ''
  repayScreenshotUrl.value = ''
})

function applyDefaultSelection(rows) {
  const q = coerceId(route.query.replenishApplyId)
  if (q != null && rows.some((r) => Number(r.id) === q)) {
    selectedId.value = q
    return
  }
  if (rows.length === 1) {
    selectedId.value = Number(rows[0].id)
  }
}

async function loadRepayable() {
  loadingList.value = true
  try {
    const raw = await getRepayableReplenishments()
    list.value = asList(raw)
    selectedId.value = null
    applyDefaultSelection(list.value)
  } catch {
    list.value = []
    selectedId.value = null
  } finally {
    loadingList.value = false
  }
}

onMounted(() => {
  loadRepayable()
})

function onBarSubmit() {
  if (!selectedItem.value) {
    showToast('请先选择补仓单')
    return
  }
  formRef.value?.submit()
}

async function onSubmit() {
  const item = selectedItem.value
  if (!item) {
    showToast('请先选择补仓单')
    return
  }
  const rid = num(item.id)
  const amt = num(repayAmount.value)
  const rem = num(item.remainingAmount)
  const pend = num(item.pendingRepayAmount)
  const cap = rem - pend
  const url = repayScreenshotUrl.value.trim()
  if (!Number.isFinite(rid) || rid <= 0) {
    showToast('补仓单无效')
    return
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    showToast('归仓金额须大于 0')
    return
  }
  if (amt > rem + 1e-9) {
    showToast(`归仓金额不能超过剩余归仓金额 ${formatMoney(rem)}`)
    return
  }
  if (amt > cap + 1e-9) {
    showToast(`归仓金额不能超过可申请额度 ${formatMoney(cap)}（剩余减待审归仓）`)
    return
  }
  if (!url) {
    showToast('请上传归仓转账截图')
    return
  }

  loading.value = true
  try {
    await submitRepayApply({
      replenishApplyId: rid,
      repayAmount: amt,
      repayScreenshotUrl: url,
    })
    showToast({ type: 'success', message: '归仓申请提交成功' })
    router.replace({ name: 'RepayMine' })
  } catch {
    /* 请求层已 Toast */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.repay-apply-page {
  padding-bottom: calc(50px + env(safe-area-inset-bottom, 0px));
}
.block {
  margin-top: 12px;
}
.form-block {
  padding-top: 0;
}
.pick-card {
  width: 100%;
  padding-right: 4px;
  box-sizing: border-box;
}
.pick-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.pick-card__no {
  font-weight: 600;
  font-size: 15px;
  color: #323233;
  word-break: break-all;
}
.pick-card__st {
  flex-shrink: 0;
}
.pick-card__grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
}
.pick-card__grid .emph {
  color: #ee0a24;
  font-weight: 500;
}
.select-hint {
  margin: 12px 16px;
  font-size: 13px;
  color: #969799;
  line-height: 1.5;
}
:deep(.repay-apply-emph) {
  color: #ee0a24;
  font-weight: 700;
}
</style>
