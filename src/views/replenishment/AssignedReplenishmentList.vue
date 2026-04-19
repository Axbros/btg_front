<template>
  <div class="assigned-list">
    <AppHeader title="待处理补仓（资方）" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <template v-if="list.length">
          <van-card
            v-for="(row, idx) in list"
            :key="row.id ?? idx"
            class="repl-card"
            :title="`单号 ${txt(row.applyNo, '—')}`"
            :desc="`申请编号 #${row.id ?? '—'}`"
          >
            <template #tags>
              <van-tag :type="replenishmentListStatusTagType(row)" plain round>
                {{ formatReplenishmentListStatus(row) }}
              </van-tag>
            </template>
            <van-cell-group v-if="detailMap[row.id]" inset :border="false" class="repl-card__cells">
              <van-cell title="申请人" :value="applicantLabel(detailMap[row.id])" />
              <van-cell title="补仓额度" :value="formatMoney(detailMap[row.id].replenishAmount ?? 0)" />
              <van-cell v-if="assignLabel(detailMap[row.id])" title="转派信息" :value="assignLabel(detailMap[row.id])" />
              <van-cell title="当前处理人" :value="handlerLabel(detailMap[row.id])" />
              <van-cell title="到账确认" :value="arrivalLabel(detailMap[row.id])" />
            </van-cell-group>
            <van-cell v-else title=" " value="加载详情中…" :border="false" />
            <div class="repl-card__actions">
              <van-button size="small" type="primary" :loading="submittingId === row.id" @click="openCapitalAgree(row)">
                同意
              </van-button>
              <van-button size="small" type="danger" plain :loading="rejectingId === row.id" @click="openCapitalReject(row)">
                拒绝
              </van-button>
              <van-button size="small" plain @click="goDetail(row)">查看详情</van-button>
              <van-button size="small" plain @click="goFlow(row)">查看状态流</van-button>
            </div>
          </van-card>
        </template>
        <van-empty v-if="!loading && !list.length && loaded" description="暂无待处理补仓单" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
    </div>

    <van-popup v-model:show="capitalShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="capital-popup">
        <div class="capital-popup__title">同意补仓</div>
        <p class="capital-popup__hint">请上传转账凭证并填写备注，确认后将提交同意。</p>
        <van-cell-group inset>
          <van-field label="转账凭证" readonly>
            <template #input>
              <ImageUploadField v-model="capitalForm.transferScreenshotUrl" upload-type="TRANSFER" hint="上传转账截图（必填）" />
            </template>
          </van-field>
          <van-field
            v-model="capitalForm.transferRemark"
            label="备注"
            type="textarea"
            rows="2"
            autosize
            maxlength="500"
            placeholder="选填"
            show-word-limit
          />
          <van-field v-model="capitalForm.capitalReceiverUid" label="收款 UID" maxlength="100" placeholder="资方收款 UID（必填）" />
        </van-cell-group>
        <div class="capital-popup__actions">
          <van-button block round @click="capitalShow = false">取消</van-button>
          <van-button block round type="primary" :loading="capitalSubmitting" @click="submitCapitalAgree">确认同意</van-button>
        </div>
      </div>
    </van-popup>

    <van-dialog
      v-model:show="rejectShow"
      title="拒绝补仓"
      show-cancel-button
      confirm-button-text="确认拒绝"
      confirm-button-color="#ee0a24"
      :before-close="onRejectBeforeClose"
    >
      <div class="dialog-field-wrap">
        <van-field
          v-model="rejectRemark"
          rows="3"
          autosize
          type="textarea"
          maxlength="200"
          placeholder="拒绝原因（必填）"
          show-word-limit
          :border="false"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import {
  getAssignedReplenishments,
  capitalSubmitReplenishment,
  capitalRejectReplenishment,
  fetchReplenishmentMineDetail,
} from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import {
  formatArrivalConfirmStatus,
  formatMoney,
  formatReplenishmentListStatus,
  replenishmentListStatusTagType,
} from '@/utils/format'

const router = useRouter()

const list = ref([])
const detailMap = reactive({})
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const capitalShow = ref(false)
const capitalTargetId = ref(null)
const capitalSubmitting = ref(false)
const submittingId = ref(null)
const rejectShow = ref(false)
const rejectRemark = ref('')
const rejectingId = ref(null)

const capitalForm = reactive({
  transferScreenshotUrl: '',
  transferRemark: '',
  capitalReceiverUid: '',
})

function txt(v, fb = '—') {
  if (v == null) return fb
  const s = String(v).trim()
  return s !== '' ? s : fb
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'ReplenishmentMineDetail', params: { id: String(id) } })
}

function goFlow(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'ReplenishmentFlow', params: { id: String(id) } })
}

function applicantLabel(d) {
  if (!d) return '—'
  const nick = txt(d.nickname, '')
  const mob = txt(d.mobile, '')
  if (nick && nick !== '—' && mob && mob !== '—') return `${nick} · ${mob}`
  return nick || mob || '—'
}

function assignLabel(d) {
  if (!d) return ''
  const remark = txt(d.assignRemark, '')
  const by = d.assignedBy
  const parts = []
  if (by != null) parts.push(`指派人 #${by}`)
  if (remark && remark !== '—') parts.push(remark)
  return parts.join('；') || ''
}

function handlerLabel(d) {
  if (!d) return '—'
  const nick = txt(d.assignedCapitalNickname, '')
  const hid = d.currentHandlerUserId
  if (nick && nick !== '—') return `${nick}${hid != null ? ` (#${hid})` : ''}`
  if (hid != null) return `用户 #${hid}`
  return '—'
}

function arrivalLabel(d) {
  if (!d) return '—'
  const s = d.arrivalConfirmStatus
  if (s == null || s === '') return '—'
  return formatArrivalConfirmStatus(s)
}

function parseReplenishmentRoot(raw) {
  if (!raw || typeof raw !== 'object') return null
  if ('replenishment' in raw || 'replenishmentApply' in raw) {
    return raw.replenishment ?? raw.replenishmentApply ?? null
  }
  if (raw.applyNo != null || raw.principalAmount != null) {
    return raw
  }
  return null
}

async function ensureDetail(id) {
  if (id == null || detailMap[id]) return
  try {
    const raw = await fetchReplenishmentMineDetail(id)
    const root = parseReplenishmentRoot(raw)
    detailMap[id] = root && typeof root === 'object' ? root : {}
  } catch {
    detailMap[id] = {}
  }
}

async function fetchPage(p) {
  const raw = await getAssignedReplenishments({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more } = parsePageResponse(raw, pageSize.value)
  list.value = rows
  hasMore.value = more
  finished.value = !more
  loaded.value = true
  await Promise.all(rows.map((r) => ensureDetail(r.id)))
}

async function onLoad() {
  if (refreshing.value) return
  loading.value = true
  try {
    await fetchPage(page.value)
  } catch {
    finished.value = true
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  page.value = 1
  Object.keys(detailMap).forEach((k) => delete detailMap[k])
  try {
    await fetchPage(1)
  } finally {
    refreshing.value = false
  }
}

function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  fetchPage(page.value)
}

async function openCapitalAgree(row) {
  capitalTargetId.value = row?.id ?? null
  if (capitalTargetId.value == null) return
  await ensureDetail(capitalTargetId.value)
  capitalForm.transferScreenshotUrl = ''
  capitalForm.transferRemark = ''
  capitalForm.capitalReceiverUid = ''
  const d = detailMap[capitalTargetId.value]
  const preset = d?.capitalReceiverUid
  if (preset) capitalForm.capitalReceiverUid = String(preset)
  capitalShow.value = true
}

function openCapitalReject(row) {
  const id = row?.id
  if (id == null) return
  capitalTargetId.value = id
  rejectRemark.value = ''
  rejectShow.value = true
}

async function submitCapitalAgree() {
  const id = capitalTargetId.value
  if (id == null) return
  const url = (capitalForm.transferScreenshotUrl || '').trim()
  const uid = (capitalForm.capitalReceiverUid || '').trim()
  if (!url) {
    showToast('请上传转账凭证')
    return
  }
  if (!uid) {
    showToast('请填写收款 UID')
    return
  }
  capitalSubmitting.value = true
  submittingId.value = id
  try {
    await capitalSubmitReplenishment(id, {
      transferScreenshotUrl: url,
      transferRemark: (capitalForm.transferRemark || '').trim() || undefined,
      capitalReceiverUid: uid,
    })
    showToast({ type: 'success', message: '已提交同意' })
    capitalShow.value = false
    delete detailMap[id]
    await fetchPage(page.value)
  } finally {
    capitalSubmitting.value = false
    submittingId.value = null
  }
}

async function onRejectBeforeClose(action) {
  if (action === 'cancel') return true
  const id = capitalTargetId.value
  const remark = rejectRemark.value.trim()
  if (id == null) return false
  if (!remark) {
    showToast('请填写拒绝原因')
    return false
  }
  rejectingId.value = id
  try {
    await capitalRejectReplenishment(id, { remark })
    showToast('已拒绝')
    delete detailMap[id]
    await fetchPage(page.value)
    return true
  } catch {
    return false
  } finally {
    rejectingId.value = null
  }
}
</script>

<style scoped>
.assigned-list {
  padding-bottom: 8px;
}
.repl-card {
  margin: 10px 12px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}
.repl-card__cells {
  margin-top: 4px;
}
.repl-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px 12px;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0 24px;
}
.pager__text {
  font-size: 13px;
  color: #646566;
}
.capital-popup {
  padding: 12px 0 20px;
}
.capital-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 4px;
}
.capital-popup__hint {
  margin: 0 16px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  text-align: center;
}
.dialog-field-wrap {
  padding: 0 8px 8px;
}
.capital-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
</style>
