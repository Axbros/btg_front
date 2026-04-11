<template>
  <div>
    <AppHeader title="策略管理" />
    <div class="toolbar">
      <van-button type="primary" size="small" round icon="plus" @click="openCreate">新增策略</van-button>
      <van-button size="small" round @click="load">刷新</van-button>
    </div>
    <van-loading v-if="loading && !strategies.length" vertical class="pad">加载中…</van-loading>
    <template v-else>
      <van-cell-group v-for="s in strategies" :key="rowKey(s)" inset class="row">
        <van-cell :title="s.strategyName || s.name" :label="s.description || '—'">
          <template #value>
            <StrategyTag :status="s.status" />
          </template>
        </van-cell>
        <van-cell title="编码" :value="String(s.strategyCode || s.code || '—')" />
        <van-cell title="分佣比例" :value="formatRate(s.commissionRate ?? s.rate)" />
        <van-cell title="排序" :value="String(s.sortNo ?? s.sort ?? '—')" />
        <van-cell>
          <van-button size="small" type="primary" plain block @click="openEdit(s)">编辑</van-button>
        </van-cell>
      </van-cell-group>
      <EmptyState v-if="!strategies.length" />
    </template>

    <van-popup v-model:show="showForm" position="bottom" round :style="{ height: '78%' }">
      <div class="form-head">{{ editingId ? '编辑策略' : '新增策略' }}</div>
      <van-form @submit="onSave">
        <van-cell-group inset>
          <van-field v-model="form.strategyCode" label="策略编码" placeholder="strategyCode" required />
          <van-field v-model="form.strategyName" label="策略名称" placeholder="strategyName" required />
          <van-field v-model="form.commissionRate" label="分佣比例" placeholder="如 0.15 或 15" type="number" required />
          <van-field v-model="form.description" label="描述" type="textarea" rows="2" autosize placeholder="可选" />
          <van-cell title="状态（StrategyStatus）">
            <van-radio-group v-model="form.status" direction="horizontal">
              <van-radio :name="1">启用(1)</van-radio>
              <van-radio :name="0">停用(0)</van-radio>
            </van-radio-group>
          </van-cell>
          <van-field v-model="form.sortNo" label="排序号" type="digit" placeholder="必填" required />
        </van-cell-group>
        <div class="form-actions">
          <van-button round block @click="showForm = false">取消</van-button>
          <van-button round block type="primary" native-type="submit" :loading="saving">保存</van-button>
        </div>
      </van-form>
    </van-popup>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StrategyTag from '@/components/StrategyTag.vue'
import { fetchAdminStrategies, createAdminStrategy, updateAdminStrategy } from '@/api/admin'
import { asList } from '@/utils/list'
import { formatRate } from '@/utils/format'

const strategies = ref([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const editingId = ref(null)

const form = reactive({
  strategyCode: '',
  strategyName: '',
  commissionRate: '',
  description: '',
  /** 与后端 StrategyStatus @JsonValue 一致：1=ENABLED, 0=DISABLED */
  status: 1,
  sortNo: '0',
})

function rowKey(s) {
  return String(s.id ?? s.strategyId ?? s.strategyCode ?? Math.random())
}

function resetForm() {
  form.strategyCode = ''
  form.strategyName = ''
  form.commissionRate = ''
  form.description = ''
  form.status = 1
  form.sortNo = '0'
  editingId.value = null
}

async function load() {
  loading.value = true
  try {
    const raw = await fetchAdminStrategies()
    strategies.value = asList(raw)
  } catch {
    strategies.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(s) {
  editingId.value = s.id ?? s.strategyId ?? null
  form.strategyCode = String(s.strategyCode || s.code || '')
  form.strategyName = String(s.strategyName || s.name || '')
  form.commissionRate = String(s.commissionRate ?? s.rate ?? '')
  form.description = String(s.description || '')
  form.status = s.status === 0 || s.status === 1 ? s.status : Number(s.status) === 0 ? 0 : 1
  form.sortNo = String(s.sortNo ?? 0)
  showForm.value = true
}

function parseRate(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return n
}

async function onSave() {
  const rate = parseRate(form.commissionRate)
  if (rate === null || rate < 0) {
    showToast('请填写有效比例（≥0）')
    return
  }
  const sortNo = Number(form.sortNo)
  if (!Number.isFinite(sortNo)) {
    showToast('请填写排序号')
    return
  }
  /** StrategySaveRequest — status 用枚举名，避免仅 @JsonValue 数字时反序列化差异 */
  const body = {
    strategyCode: form.strategyCode.trim(),
    strategyName: form.strategyName.trim(),
    commissionRate: rate,
    description: form.description.trim() || undefined,
    status: form.status === 0 ? 'DISABLED' : 'ENABLED',
    sortNo,
  }
  saving.value = true
  try {
    if (editingId.value != null) await updateAdminStrategy(editingId.value, body)
    else await createAdminStrategy(body)
    showToast('保存成功')
    showForm.value = false
    await load()
  } catch {
    /* */
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  padding: 8px 12px;
}
.pad {
  padding: 40px 0;
}
.row {
  margin-bottom: 10px;
}
.form-head {
  padding: 16px;
  font-weight: 600;
  font-size: 16px;
  text-align: center;
}
.form-actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 24px;
}
</style>
