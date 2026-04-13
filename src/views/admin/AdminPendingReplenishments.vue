<template>
  <div>
    <AppHeader title="待审核补仓" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="(row, idx) in list" :key="row.id ?? idx" class="card">
          <van-cell-group inset>
            <van-cell title="申请单号" :value="txt(row.applyNo ?? row.apply_no)" />
            <van-cell title="补仓状态">
              <template #value>
                <van-tag :type="replenishmentStatusTagType(row.status)" plain round>
                  {{ formatReplenishmentStatus(row.status) }}
                </van-tag>
              </template>
            </van-cell>
            <van-cell title="申请人" :value="applicantLine(row)" />
            <template v-if="hasWalletRow(row)">
              <van-cell title="交易所名称" :value="walletNameCell(row)" />
              <van-cell
                title="钱包地址"
                :value="walletAddressCell(row)"
                :clickable="walletAddressCell(row) !== '—'"
                class="wallet-address-cell"
                @click="onWalletAddressCellClick(row)"
              />
            </template>
            <van-cell
              v-if="row.acceptedAt ?? row.accepted_at"
              title="受理时间"
              :value="formatDateTime(row.acceptedAt ?? row.accepted_at)"
            />
            <van-cell
              v-if="txt(row.acceptedBy ?? row.accepted_by) !== '—'"
              title="受理人"
              :value="txt(row.acceptedBy ?? row.accepted_by)"
            />
            <van-cell title="底仓本金" :value="formatMoney(row.principalAmount ?? row.principal_amount)" />
            <van-cell title="申报余额" :value="formatMoney(row.balanceAmount ?? row.balance_amount)" />
            <van-cell title="补仓额度" :value="formatMoney(row.replenishAmount ?? row.replenish_amount)" />
            <van-cell title="余额截图">
              <template #value>
                <PreviewableRemoteImage
                  v-if="img(row.balanceScreenshotUrl ?? row.balance_screenshot_url)"
                  :url="img(row.balanceScreenshotUrl ?? row.balance_screenshot_url)"
                  alt="余额截图"
                />
                <span v-else>—</span>
              </template>
            </van-cell>
            <van-cell v-if="img(row.transferScreenshotUrl ?? row.transfer_screenshot_url)" title="资方凭证">
              <template #value>
                <PreviewableRemoteImage
                  :url="img(row.transferScreenshotUrl ?? row.transfer_screenshot_url)"
                  alt="资方凭证"
                />
              </template>
            </van-cell>
            <van-cell
              v-if="txt(row.transferRemark ?? row.transfer_remark) !== '—'"
              title="资方备注"
              :value="txt(row.transferRemark ?? row.transfer_remark)"
            />
            <van-cell title="提交时间" :value="formatDateTime(row.submitTime ?? row.submit_time)" />
            <van-cell v-if="Number(row.status) === 7" title="">
              <template #title>
                <span class="status-hint">待资方上传打款凭证并填写备注，完成后进入终审确认。</span>
              </template>
            </van-cell>
            <van-cell v-if="Number(row.status) === 8" title="">
              <template #title>
                <span class="status-hint">凭证已提交，请核对表单信息后终审确认。</span>
              </template>
            </van-cell>
            <van-cell>
              <div class="card__actions">
                <van-button
                  v-if="canAccept(row)"
                  size="small"
                  type="primary"
                  plain
                  :loading="acceptingId === row.id"
                  @click="onAccept(row)"
                >
                  受理
                </van-button>
                <van-button
                  v-if="canUploadCapitalVoucher(row)"
                  size="small"
                  type="primary"
                  plain
                  @click="openCapitalVoucher(row)"
                >
                  上传资方凭证
                </van-button>
                <van-button
                  v-if="canFinalApprove(row)"
                  size="small"
                  type="primary"
                  plain
                  @click="openApprove(row)"
                >
                  终审确认
                </van-button>
                <van-button v-if="canReject(row)" size="small" type="danger" plain @click="openReject(row)">
                  拒绝
                </van-button>
              </div>
            </van-cell>
          </van-cell-group>
        </div>
        <EmptyState v-if="!loading && !list.length && loaded" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
    </div>

    <van-popup v-model:show="capitalVoucherPopupShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="approve-popup">
        <div class="approve-popup__title">上传资方凭证</div>
        <van-cell-group inset>
          <van-field label="资方凭证" readonly placeholder="请上传">
            <template #input>
              <ImageUploadField
                v-model="capitalVoucherForm.transferScreenshotUrl"
                upload-type="TRANSFER"
                hint="资方给申请人的打款凭证"
              />
            </template>
          </van-field>
          <van-field
            v-model="capitalVoucherForm.transferRemark"
            label="备注"
            type="textarea"
            rows="2"
            autosize
            maxlength="500"
            show-word-limit
            placeholder="选填"
          />
        </van-cell-group>
        <div class="approve-popup__actions">
          <van-button block round @click="closeCapitalVoucherPopup">取消</van-button>
          <van-button
            block
            round
            type="primary"
            :loading="capitalVoucherSubmitting"
            @click="submitCapitalVoucher"
          >
            提交
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="approvePopupShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="approve-popup">
        <div class="approve-popup__title">资方终审确认</div>
        <p class="approve-popup__desc">
          请核对申请信息与已提交的打款凭证、备注一致后，确认通过以完成审核。
        </p>
        <div class="approve-popup__actions">
          <van-button block round @click="closeApprovePopup">取消</van-button>
          <van-button block round type="primary" :loading="approveSubmitting" @click="submitApprove">确认通过</van-button>
        </div>
      </div>
    </van-popup>

    <van-dialog
      v-model:show="rejectShow"
      title="拒绝（请填写备注）"
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
          placeholder="拒绝原因"
          show-word-limit
          :border="false"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import {
  fetchAdminPendingReplenishments,
  approveReplenishmentAdmin,
  rejectReplenishmentAdmin,
  acceptReplenishmentAdmin,
  submitReplenishmentCapitalVoucherAdmin,
} from '@/api/adminReplenishment'
import { parsePageResponse } from '@/utils/pagination'
import {
  formatMoney,
  formatDateTime,
  formatReplenishmentStatus,
  replenishmentStatusTagType,
} from '@/utils/format'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const capitalVoucherPopupShow = ref(false)
const capitalVoucherTarget = ref(null)
const capitalVoucherSubmitting = ref(false)
const capitalVoucherForm = reactive({
  transferScreenshotUrl: '',
  transferRemark: '',
})

const approvePopupShow = ref(false)
const approveTarget = ref(null)
const approveSubmitting = ref(false)

const rejectShow = ref(false)
const rejectTarget = ref(null)
const rejectRemark = ref('')
const acceptingId = ref(null)

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function img(u) {
  return u ? String(u) : ''
}

function applicantLine(row) {
  const nick = txt(row.userNickname ?? row.user_nickname)
  const mobile = txt(row.userMobile ?? row.user_mobile)
  if (nick !== '—' && mobile !== '—') return `${nick}#${mobile}`
  if (nick !== '—') return nick
  if (mobile !== '—') return mobile
  const uid = row.userId ?? row.user_id
  return uid != null ? `用户 ${uid}` : '—'
}

function walletNameCell(row) {
  return txt(row?.walletName ?? row?.wallet_name)
}

function walletAddressCell(row) {
  return txt(row?.walletAddress ?? row?.wallet_address)
}

function hasWalletRow(row) {
  return walletNameCell(row) !== '—' || walletAddressCell(row) !== '—'
}

async function copyTextToClipboard(text) {
  if (!text || text === '—') return false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

async function onWalletAddressCellClick(row) {
  const t = walletAddressCell(row)
  if (t === '—') return
  const ok = await copyTextToClipboard(t)
  if (ok) {
    showToast({ type: 'success', message: '已复制到剪贴板' })
  } else {
    showToast('复制失败')
  }
}

function statusNum(row) {
  const n = Number(row?.status)
  return Number.isFinite(n) ? n : NaN
}

function canAccept(row) {
  return statusNum(row) === 1
}

function canFinalApprove(row) {
  return statusNum(row) === 8
}

function canUploadCapitalVoucher(row) {
  return statusNum(row) === 7
}

function canReject(row) {
  const s = statusNum(row)
  return s === 1 || s === 7 || s === 8
}

async function onAccept(row) {
  const id = row?.id
  if (id == null) return
  acceptingId.value = id
  try {
    await acceptReplenishmentAdmin(id)
    showToast({ type: 'success', message: '已受理' })
    await fetchPage(page.value)
  } catch {
    /* 请求层 */
  } finally {
    acceptingId.value = null
  }
}

function resetCapitalVoucherForm() {
  capitalVoucherForm.transferScreenshotUrl = ''
  capitalVoucherForm.transferRemark = ''
}

function openCapitalVoucher(row) {
  capitalVoucherTarget.value = row
  resetCapitalVoucherForm()
  capitalVoucherPopupShow.value = true
}

function closeCapitalVoucherPopup() {
  capitalVoucherPopupShow.value = false
  capitalVoucherTarget.value = null
  resetCapitalVoucherForm()
}

async function submitCapitalVoucher() {
  const url = capitalVoucherForm.transferScreenshotUrl?.trim()
  if (!url) {
    showToast('请上传资方凭证')
    return
  }
  const id = capitalVoucherTarget.value?.id
  if (id == null) return
  capitalVoucherSubmitting.value = true
  try {
    await submitReplenishmentCapitalVoucherAdmin(id, {
      transferScreenshotUrl: url,
      transferRemark: capitalVoucherForm.transferRemark?.trim() || undefined,
    })
    showToast({ type: 'success', message: '已提交，待终审确认' })
    closeCapitalVoucherPopup()
    await fetchPage(page.value)
  } catch {
    /* 请求层 */
  } finally {
    capitalVoucherSubmitting.value = false
  }
}

function openApprove(row) {
  approveTarget.value = row
  approvePopupShow.value = true
}

function closeApprovePopup() {
  approvePopupShow.value = false
  approveTarget.value = null
}

async function submitApprove() {
  const id = approveTarget.value?.id
  if (id == null) return
  approveSubmitting.value = true
  try {
    await approveReplenishmentAdmin(id)
    showToast({ type: 'success', message: '审核通过' })
    closeApprovePopup()
    await fetchPage(page.value)
  } catch {
    /* Toast 由请求层 */
  } finally {
    approveSubmitting.value = false
  }
}

async function fetchPage(p) {
  const raw = await fetchAdminPendingReplenishments({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more } = parsePageResponse(raw, pageSize.value)
  list.value = rows
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
    showToast('加载失败，请稍后重试')
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

function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  fetchPage(page.value)
}

function openReject(row) {
  rejectTarget.value = row
  rejectRemark.value = ''
  rejectShow.value = true
}

async function onRejectBeforeClose(action) {
  if (action === 'cancel') {
    rejectTarget.value = null
    return true
  }
  const id = rejectTarget.value?.id
  const remark = rejectRemark.value.trim()
  if (id == null) return false
  if (!remark) {
    showToast('请填写拒绝备注')
    return false
  }
  try {
    await rejectReplenishmentAdmin(id, remark)
    showToast('已拒绝')
    rejectTarget.value = null
    await fetchPage(page.value)
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.card {
  margin-bottom: 8px;
}
.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
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
.dialog-field-wrap {
  padding: 0 8px 8px;
}
.approve-popup {
  padding: 16px 0 20px;
}
.approve-popup__title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  padding: 0 16px 12px;
}
.approve-popup__desc {
  margin: 0 16px 4px;
  font-size: 14px;
  color: #646566;
  line-height: 1.55;
  text-align: center;
}
.approve-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
.status-hint {
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
}
.wallet-address-cell :deep(.van-cell__value) {
  word-break: break-all;
}
</style>
