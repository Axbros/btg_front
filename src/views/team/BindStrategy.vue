<template>
  <div>
    <AppHeader title="绑定策略" />
    <div v-if="childUserIdNum != null" class="bind">
      <van-cell-group inset title="当前下级">
        <van-cell title="用户ID" :value="String(childUserIdNum)" />
        <van-cell v-if="childHint" title="备注" :label="childHint" />
      </van-cell-group>

      <van-radio-group v-model="strategyId">
        <van-cell-group inset title="选择分佣策略">
          <van-cell
            v-for="s in strategies"
            :key="s.id"
            clickable
            @click="strategyId = s.id"
          >
            <template #title>
              <div class="str-line">
                <span class="str-name">{{ s.strategyName }}</span>
                <StrategyTag :status="s.status" />
              </div>
              <div class="str-sub">{{ s.strategyCode }} · 比例 {{ formatRate(s.commissionRate) }}</div>
            </template>
            <template #right-icon>
              <van-radio :name="s.id" />
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>

      <div class="bind__actions">
        <van-button
          round
          block
          type="primary"
          :loading="submitting"
          :disabled="strategyId == null"
          @click="onSubmit"
        >
          提交绑定
        </van-button>
      </div>
    </div>
    <EmptyState v-else description="缺少合法的下级用户ID" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StrategyTag from '@/components/StrategyTag.vue'
import { fetchStrategies } from '@/api/strategy'
import { bindStrategy } from '@/api/binding'
import { asList } from '@/utils/list'
import { formatRate } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const childUserIdNum = computed(() => {
  const n = Number(route.params.childUserId)
  return Number.isFinite(n) && n > 0 ? n : null
})

const childHint = computed(() => route.query.hint || '')

const strategies = ref([])
const strategyId = ref(null)
const submitting = ref(false)

onMounted(async () => {
  try {
    const raw = await fetchStrategies()
    strategies.value = asList(raw)
  } catch {
    strategies.value = []
  }
})

async function onSubmit() {
  if (childUserIdNum.value == null || strategyId.value == null) {
    showToast('请选择策略')
    return
  }
  submitting.value = true
  try {
    /** BindingCreateRequest */
    await bindStrategy({
      childUserId: childUserIdNum.value,
      strategyId: strategyId.value,
    })
    showToast('绑定成功')
    router.replace('/team/direct')
  } catch {
    /* interceptor */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.bind {
  padding-bottom: 24px;
}
.str-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.str-name {
  font-weight: 600;
}
.str-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
}
.bind__actions {
  margin: 20px 16px 0;
}
</style>
