<template>
  <div>
    <AppHeader title="我的补仓记录" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <template v-if="list.length">
          <van-card
            v-for="(row, idx) in list"
            :key="pickApplyId(row) ?? idx"
            class="repl-mine-card repl-mine-card--clickable"
            :title="`单号 ${txt(row.applyNo)}`"
            role="button"
            tabindex="0"
            @click="goDetail(row)"
            @keydown.enter.prevent="goDetail(row)"
          >
            <template #tags>
              <van-tag :type="replenishmentStatusTagType(row.status)" plain round>
                {{ formatReplenishmentStatus(row.status) }}
              </van-tag>
            </template>
            <van-cell-group :border="false" inset>
              <van-cell title="当前余额" :value="moneyTxt(row.balanceAmount)" />
              <van-cell title="补仓额度" :value="moneyTxt(row.replenishAmount)" />
              <van-cell title="当前处理人" :value="handlerLine(row)" />
              <van-cell title="资方执行用户" :value="capitalExecutorLine(row)" />
              <!-- <van-cell title="资方收款 UID" :value="txt(row.capitalReceiverUid)" /> -->
              <van-cell title="到账确认状态">
                <template #value>
                  <van-tag
                    v-if="row.arrivalConfirmStatus != null && String(row.arrivalConfirmStatus) !== ''"
                    :type="arrivalConfirmStatusTagType(row.arrivalConfirmStatus)"
                    plain
                    round
                  >
                    {{ formatArrivalConfirmStatus(row.arrivalConfirmStatus) }}
                  </van-tag>
                  <span v-else>—</span>
                </template>
              </van-cell>
              <van-cell v-if="img(row.transferScreenshotUrl)" title="资方转账凭证">
                <template #value>
                  <PreviewableRemoteImage :url="String(row.transferScreenshotUrl)" alt="资方转账凭证" size="large" />
                </template>
              </van-cell>
              <van-cell v-if="hasTransferRemark(row)" title="资方备注" :value="txt(row.transferRemark)" />
            </van-cell-group>

            <p v-if="hintReturnedToCapital(row)" class="repl-mine-card__hint repl-mine-card__hint--muted">
              已退回资方重新处理
            </p>
            <p v-else-if="hintSuccess(row)" class="repl-mine-card__hint repl-mine-card__hint--ok">补仓成功</p>

            <div v-if="isPendingApplicantConfirm(row)" class="repl-mine-card__actions" @click.stop>
              <van-button size="small" type="primary" plain round @click.stop="openArrivalPopup(row, 'confirm')">
                确认到账
              </van-button>
              <van-button size="small" type="danger" plain round @click.stop="openArrivalPopup(row, 'reject')">
                拒绝到账
              </van-button>
            </div>

            <div class="repl-mine-card__footer" @click.stop>
              <van-button size="small" plain round type="primary" @click.stop="goDetail(row)">查看详情</van-button>
              <van-button size="small" plain round @click.stop="goFlow(row)">状态流</van-button>
            </div>
          </van-card>
        </template>
        <EmptyState v-if="!loading && !list.length && loaded" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
    </div>

    <van-popup v-model:show="arrivalPopupShow" position="bottom" round teleport="body" :style="{ width: '100%' }">
      <div class="repl-mine-popup">
        <div class="repl-mine-popup__title">{{ arrivalPopupTitle }}</div>
        <van-field
          v-model="arrivalRemark"
          type="textarea"
          rows="3"
          autosize
          maxlength="500"
          :placeholder="arrivalRemarkPlaceholder"
          show-word-limit
        />
        <div class="repl-mine-popup__actions">
          <van-button block round @click="closeArrivalPopup">取消</van-button>
          <van-button block round type="primary" :loading="arrivalSubmitting" @click="submitArrivalPopup">
            提交
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import { confirmArrival, fetchReplenishmentMine, rejectArrival } from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import {
  formatArrivalConfirmStatus,
  formatMoney,
  formatReplenishmentStatus,
  arrivalConfirmStatusTagType,
  replenishmentStatusTagType,
} from '@/utils/format'

const router = useRouter()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const arrivalPopupShow = ref(false)
const arrivalMode = ref('confirm')
const arrivalTargetId = ref(null)
const arrivalRemark = ref('')
const arrivalSubmitting = ref(false)

const arrivalPopupTitle = ref('确认到账')
const arrivalRemarkPlaceholder = ref('选填备注，如：已到账')

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

/** 列表项与详情路由共用的申请主键（驼峰；后端可能用 id / replenishmentId / replenishApplyId 之一） */
function pickApplyId(row) {
  if (!row || typeof row !== 'object') return null
  const raw = row.id ?? row.replenishmentId ?? row.replenishApplyId
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function moneyTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return formatMoney(v)
}

function img(u) {
  return u != null && String(u).trim() !== ''
}

function hasTransferRemark(row) {
  const r = row?.transferRemark
  return r != null && String(r).trim() !== ''
}

function handlerLine(row) {
  if (!row) return '—'
  const name = row.currentHandlerUserName
  const hid = row.currentHandlerUserId
  const parts = []
  if (name != null && String(name).trim() !== '') parts.push(String(name).trim())
  if (hid != null && String(hid).trim() !== '') parts.push(`#${String(hid).trim()}`)
  return parts.length ? parts.join(' ') : '—'
}

function capitalExecutorLine(row) {
  if (!row) return '—'
  const a = row.assignedCapitalNickname
  const b = row.assignedCapitalUserName
  const s = (a != null && String(a).trim() !== '' ? String(a).trim() : '') || (b != null && String(b).trim() !== '' ? String(b).trim() : '')
  const uid = row.assignedCapitalUserId
  if (s && uid != null) return `${s}（#${uid}）`
  if (s) return s
  if (uid != null) return `用户 #${uid}`
  return '—'
}

function isPendingApplicantConfirm(row) {
  const s = row?.status
  if (typeof s === 'string' && s.trim().toUpperCase().replace(/-/g, '_') === 'PENDING_APPLICANT_CONFIRM') return true
  return Number(s) === 4
}

function hintReturnedToCapital(row) {
  const s = row?.status
  if (typeof s === 'string' && s.trim().toUpperCase().replace(/-/g, '_') === 'RETURNED_TO_CAPITAL') return true
  return Number(s) === 5
}

function hintSuccess(row) {
  const s = row?.status
  if (typeof s === 'string' && s.trim().toUpperCase() === 'SUCCESS') return true
  return Number(s) === 6
}

function goDetail(row) {
  const id = pickApplyId(row)
  if (id == null) {
    showToast('缺少单号，无法打开详情')
    return
  }
  router.push({ name: 'ReplenishmentMineDetail', params: { id: String(id) } })
}

function goFlow(row) {
  const id = pickApplyId(row)
  if (id == null) {
    showToast('缺少单号')
    return
  }
  router.push({ name: 'ReplenishmentFlow', params: { id: String(id) } })
}

function openArrivalPopup(row, mode) {
  const id = pickApplyId(row)
  if (id == null) {
    showToast('缺少单号')
    return
  }
  arrivalTargetId.value = id
  arrivalMode.value = mode
  arrivalRemark.value = ''
  if (mode === 'reject') {
    arrivalPopupTitle.value = '拒绝到账'
    arrivalRemarkPlaceholder.value = '请填写原因（必填），如：未到账，请重新提交凭证'
  } else {
    arrivalPopupTitle.value = '确认到账'
    arrivalRemarkPlaceholder.value = '选填备注，如：已到账'
  }
  arrivalPopupShow.value = true
}

function closeArrivalPopup() {
  arrivalPopupShow.value = false
  arrivalSubmitting.value = false
}

async function submitArrivalPopup() {
  const id = arrivalTargetId.value
  if (id == null || !Number.isFinite(id)) {
    showToast('无效单号')
    return
  }
  const remark = String(arrivalRemark.value ?? '').trim()
  if (arrivalMode.value === 'reject' && remark === '') {
    showToast('请填写拒绝原因')
    return
  }
  arrivalSubmitting.value = true
  try {
    if (arrivalMode.value === 'reject') {
      await rejectArrival(id, { remark })
      showToast('已提交拒绝到账')
    } else {
      await confirmArrival(id, remark ? { remark } : {})
      showToast('已确认到账')
    }
    closeArrivalPopup()
    await fetchPage(page.value)
  } catch {
    /* 错误由拦截器提示 */
  } finally {
    arrivalSubmitting.value = false
  }
}

async function fetchPage(p) {
  const raw = await fetchReplenishmentMine({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more } = parsePageResponse(raw, pageSize.value)
  list.value = Array.isArray(rows) ? rows : []
  hasMore.value = more
  finished.value = !more
  loaded.value = true
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
  try {
    await fetchPage(1)
  } finally {
    refreshing.value = false
  }
}

function prev() {
  if (page.value <= 1) return
  page.value -= 1
  fetchPage(page.value)
}

function next() {
  if (!hasMore.value) return
  page.value += 1
  fetchPage(page.value)
}
</script>

<style scoped>
.repl-mine-card {
  margin: 10px 12px 0;
  overflow: hidden;
}
.repl-mine-card--clickable {
  cursor: pointer;
}
.repl-mine-card--clickable :deep(.van-card__header) {
  cursor: pointer;
}
.repl-mine-card__hint {
  margin: 8px 16px 0;
  font-size: 13px;
  line-height: 1.45;
}
.repl-mine-card__hint--muted {
  color: #646566;
}
.repl-mine-card__hint--ok {
  color: #07c160;
  font-weight: 600;
}
.repl-mine-card__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
  flex-wrap: wrap;
}
.repl-mine-card__footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px 14px;
  flex-wrap: wrap;
}
.repl-mine-popup {
  padding: 16px 16px calc(12px + env(safe-area-inset-bottom, 0px));
}
.repl-mine-popup__title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #323233;
}
.repl-mine-popup__actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0 20px;
}
.pager__text {
  font-size: 13px;
  color: #646566;
}
</style>
