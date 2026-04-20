<template>
  <div class="qual-pending">
    <AppHeader title="待审核资格" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="qual-pending-wrap" :class="{ 'qual-pending-wrap--docked': loaded }">
        <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <template v-if="list.length">
            <van-card
              v-for="(row, idx) in list"
              :key="rowKey(row, idx)"
              class="qual-pending__card"
            >
              <template #title>
                <div class="qual-pending__card-head">
                  <span class="qual-pending__title">#{{ rowKey(row, idx) }}</span>
                  <van-tag :type="qualificationStatusTagType(rowQualDisplay(row))" plain round>
                    {{ formatQualificationStatus(rowQualDisplay(row)) }}
                  </van-tag>
                </div>
              </template>
              <template #desc>
                <van-cell-group inset :border="false" class="qual-pending__cells">
                  <van-cell title="手机" :value="txt(row.mobile)" />
                  <van-cell title="昵称" :value="txt(row.nickname)" />
                  <van-cell title="真实姓名" :value="txt(row.realName)" />
                  <van-cell title="服务器" :value="txt(row.serverName)" />
                  <van-cell title="交易账户" :value="txt(row.tradingAccountId)" />
                  <van-cell title="交易所 UID" :value="txt(row.exchangeUid)" />
                  <van-cell title="底仓本金" :value="moneyTxt(row.principalAmount)" />
                  <van-cell title="注册时间" :value="formatDateTime(row.createdAt)" />
                </van-cell-group>
                <div class="qual-pending__btns">
                  <van-button size="small" type="success" plain @click="openApprove(row)">通过</van-button>
                  <van-button size="small" type="danger" plain @click="openReject(row)">拒绝</van-button>
                  <van-button size="small" type="primary" plain @click="openDetail(row)">查看资料</van-button>
                </div>
              </template>
            </van-card>
          </template>
          <van-empty v-if="!loading && !list.length && loaded" description="暂无待审核用户" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="qual-pending-bottom-dock" aria-label="底部统计与分页">
      <footer v-if="recordsTotal > 0 || list.length" class="qual-pending-footer-sum" aria-label="待审核汇总">
        <div class="qual-pending-footer-sum__row">
          <span class="qual-pending-footer-sum__label">{{ pageCountLabel }}</span>
          <span class="qual-pending-footer-sum__value">{{ list.length }} 人</span>
        </div>
        <p v-if="recordsTotal > 0" class="qual-pending-footer-sum__meta">共 {{ recordsTotal }} 条</p>
      </footer>
      <div class="qual-pending-pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
        <span class="qual-pending-pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
      </div>
    </div>

    <van-dialog
      v-model:show="approveShow"
      title="通过资格审核"
      show-cancel-button
      confirm-button-text="确认通过"
      :before-close="onApproveBeforeClose"
    >
      <div class="qual-pending__dialog-pad">
        <van-field v-model="approveRemark" rows="2" autosize type="textarea" label="备注" placeholder="可选" />
      </div>
    </van-dialog>

    <van-dialog
      v-model:show="rejectShow"
      title="拒绝资格审核"
      show-cancel-button
      confirm-button-text="确认拒绝"
      :before-close="onRejectBeforeClose"
    >
      <div class="qual-pending__dialog-pad">
        <van-field
          v-model="rejectRemark"
          rows="3"
          autosize
          type="textarea"
          label="拒绝原因"
          placeholder="必填"
          required
        />
      </div>
    </van-dialog>

    <van-popup v-model:show="detailShow" position="bottom" round :style="{ height: '78%' }" closeable>
      <div v-if="detailRow" class="qual-detail">
        <h3 class="qual-detail__h">用户资料</h3>
        <van-cell-group inset>
          <van-cell title="用户 ID" :value="txt(userIdOf(detailRow))" />
          <van-cell title="手机" :value="txt(detailRow.mobile)" />
          <van-cell title="昵称" :value="txt(detailRow.nickname)" />
          <van-cell title="真实姓名" :value="txt(detailRow.realName)" />
          <van-cell title="身份证号" :value="txt(detailRow.idCardNo)" />
          <van-cell title="服务器" :value="txt(detailRow.serverName)" />
          <van-cell title="交易账户" :value="txt(detailRow.tradingAccountId)" />
          <van-cell title="交易所 UID" :value="txt(detailRow.exchangeUid)" />
          <van-cell title="底仓本金" :value="moneyTxt(detailRow.principalAmount)" />
        </van-cell-group>
        <div v-if="detailImages.length" class="qual-detail__imgs">
          <div v-for="(im, i) in detailImages" :key="i" class="qual-detail__img-block">
            <p class="qual-detail__img-label">{{ im.label }}</p>
            <PreviewableRemoteImage :url="im.url" :alt="im.label" size="large" />
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import {
  approveQualification,
  getPendingQualificationUsers,
  rejectQualification,
} from '@/api/userQualification'
import { parsePageResponse } from '@/utils/pagination'
import {
  formatDateTime,
  formatMoney,
  formatQualificationStatus,
  qualificationStatusTagType,
} from '@/utils/format'
import { effectiveQualificationStatusForDisplay } from '@/utils/qualification'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)
const recordsTotal = ref(0)

const pageCountLabel = computed(() => {
  if (!hasMore.value && recordsTotal.value > 0 && list.value.length === recordsTotal.value) {
    return '待审核用户（本页）'
  }
  return '本页待审核用户'
})

const approveShow = ref(false)
const rejectShow = ref(false)
const approveRemark = ref('')
const rejectRemark = ref('')
const actionRow = ref(null)

const detailShow = ref(false)
const detailRow = ref(null)

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function moneyTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? `${formatMoney(n)} USD` : String(v)
}

function rowKey(row, idx) {
  return row.userId ?? row.id ?? idx
}

function userIdOf(row) {
  return row.userId ?? row.id
}

function mergeRow(row) {
  const u = row.user && typeof row.user === 'object' ? row.user : {}
  const p = row.profile && typeof row.profile === 'object' ? row.profile : {}
  return { ...row, ...u, ...p }
}

function rowQualDisplay(row) {
  return effectiveQualificationStatusForDisplay(row)
}

const detailImages = computed(() => {
  const r = detailRow.value
  if (!r) return []
  const out = []
  const push = (label, url) => {
    const u = url != null && String(url).trim() !== '' ? String(url).trim() : ''
    if (u) out.push({ label, url: u })
  }
  push('身份证正面', r.idCardFrontUrl ?? r.idCardFront)
  push('身份证反面', r.idCardBackUrl ?? r.idCardBack)
  push('人脸照片', r.faceImageUrl ?? r.facePhotoUrl ?? r.faceUrl)
  return out
})

async function applyListFromRaw(raw) {
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = (parsed.list || []).map(mergeRow)
  hasMore.value = parsed.hasMore
  finished.value = !parsed.hasMore
  loaded.value = true
  const t = parsed.total != null ? Number(parsed.total) : 0
  recordsTotal.value = Number.isFinite(t) && t >= 0 ? t : 0
}

async function onLoad() {
  if (refreshing.value) return
  loading.value = true
  try {
    const raw = await getPendingQualificationUsers({ page: page.value, size: pageSize.value })
    await applyListFromRaw(raw)
  } catch {
    finished.value = true
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  page.value = 1
  try {
    const raw = await getPendingQualificationUsers({ page: 1, size: pageSize.value })
    await applyListFromRaw(raw)
  } finally {
    refreshing.value = false
  }
}

async function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  try {
    const raw = await getPendingQualificationUsers({ page: page.value, size: pageSize.value })
    await applyListFromRaw(raw)
  } catch {
    /* 拦截器 Toast */
  }
}

function openApprove(row) {
  actionRow.value = row
  approveRemark.value = ''
  approveShow.value = true
}

function openReject(row) {
  actionRow.value = row
  rejectRemark.value = ''
  rejectShow.value = true
}

function openDetail(row) {
  detailRow.value = mergeRow(row)
  detailShow.value = true
}

async function onApproveBeforeClose(action) {
  if (action === 'cancel') return true
  const id = userIdOf(actionRow.value || {})
  if (id == null || id === '') {
    showToast('缺少用户 ID')
    return false
  }
  try {
    const remark = approveRemark.value.trim()
    await approveQualification(String(id), remark ? { remark } : {})
    showToast({ type: 'success', message: '已通过' })
    approveRemark.value = ''
    page.value = 1
    const raw = await getPendingQualificationUsers({ page: 1, size: pageSize.value })
    await applyListFromRaw(raw)
    return true
  } catch {
    return false
  }
}

async function onRejectBeforeClose(action) {
  if (action === 'cancel') return true
  const remark = rejectRemark.value.trim()
  if (!remark) {
    showToast('请填写拒绝原因')
    return false
  }
  const id = userIdOf(actionRow.value || {})
  if (id == null || id === '') {
    showToast('缺少用户 ID')
    return false
  }
  try {
    await rejectQualification(String(id), { remark })
    showToast({ type: 'success', message: '已拒绝' })
    rejectRemark.value = ''
    page.value = 1
    const raw = await getPendingQualificationUsers({ page: 1, size: pageSize.value })
    await applyListFromRaw(raw)
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.qual-pending {
  min-width: 0;
}
.qual-pending-wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.qual-pending-wrap--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.qual-pending-bottom-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.qual-pending-footer-sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
}
.qual-pending-footer-sum__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.qual-pending-footer-sum__label {
  font-size: 14px;
  color: #646566;
}
.qual-pending-footer-sum__value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.qual-pending-footer-sum__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
.qual-pending-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.qual-pending-pager__text {
  font-size: 13px;
  color: #646566;
}
.qual-pending__card {
  margin: 10px 12px 0;
  overflow: hidden;
}
.qual-pending__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.qual-pending__title {
  font-weight: 600;
  font-size: 15px;
  color: #323233;
}
.qual-pending__cells {
  margin-top: 8px;
}
.qual-pending__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 0 4px 4px;
}
.qual-pending__dialog-pad {
  padding: 12px 16px 8px;
}
.qual-detail {
  padding: 16px 0 24px;
  overflow-y: auto;
  max-height: 100%;
  box-sizing: border-box;
}
.qual-detail__h {
  margin: 0 16px 12px;
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}
.qual-detail__imgs {
  margin-top: 16px;
  padding: 0 16px;
}
.qual-detail__img-block {
  margin-bottom: 16px;
}
.qual-detail__img-label {
  margin: 0 0 8px;
  font-size: 13px;
  color: #646566;
}
</style>
