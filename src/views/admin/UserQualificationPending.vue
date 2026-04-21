<template>
  <div class="qual-pending">
    <AppHeader title="待审核资格" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="qual-pending-wrap" :class="{ 'qual-pending-wrap--docked': loaded }">
        <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <van-cell-group v-if="list.length" inset :border="false" class="prev-mine-list-group">
            <van-cell
              v-for="(row, idx) in list"
              :key="rowKey(row, idx)"
              :title="cellTitle(row)"
              :label="listRowLabel(row)"
              :border="false"
              is-link
              role="button"
              tabindex="0"
              @click="goMemberDetail(row)"
              @keydown.enter.prevent="goMemberDetail(row)"
              @keydown.space.prevent="goMemberDetail(row)"
            >
              <!-- <template #value>
                <van-tag :type="qualificationStatusTagType(rowQualDisplay(row))" plain round>
                  {{ formatQualificationStatus(rowQualDisplay(row)) }}
                </van-tag>
              </template> -->
            </van-cell>
          </van-cell-group>
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
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import {
  approveQualification,
  getPendingQualificationUsers,
  rejectQualification,
} from '@/api/userQualification'
import { parsePageResponse } from '@/utils/pagination'
import { formatDateTime, formatQualificationStatus, qualificationStatusTagType } from '@/utils/format'
import { effectiveQualificationStatusForDisplay } from '@/utils/qualification'

const router = useRouter()

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

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
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

/** 与 PendingReviewList 首行 title 类似：优先昵称 */
function cellTitle(row) {
  const nick = String(row?.nickname ?? '').trim()
  if (nick) return nick
  
}

/** 与 PendingReviewList 的 label 行：副文案一行 */
function listRowLabel(row) {
  const parts = []
  const mob = txt(row?.mobile)
  if (mob !== '—') parts.push(`${mob}`)
  const name = String(row?.realName ?? '').trim()
  const nick = String(row?.nickname ?? '').trim()
  if (name && name !== nick) parts.push(`真实姓名：${name}`)
  const uid = userIdOf(row)
  // if (uid != null && String(uid).trim() !== '') parts.push(`用户 ID：${uid}`)
  const t = row?.submitTime ?? row?.createdAt ?? row?.updatedAt
  if (t) parts.push(`提交时间：${formatDateTime(t)}`)
  return parts.length ? parts.join(' · ') : '点击查看资料'
}

function goMemberDetail(row) {
  const id = userIdOf(row)
  const n = Number(id)
  if (id == null || String(id).trim() === '' || !Number.isFinite(n) || n <= 0) {
    showToast('无法打开：缺少用户 ID')
    return
  }
  router.push({ name: 'TeamMemberDetail', params: { memberId: String(n) } })
}

async function applyListFromRaw(raw) {
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = (parsed.list || []).map(mergeRow)
  hasMore.value = parsed.hasMore
  // 翻页由底部按钮驱动，勿让 van-list 在 hasMore 时反复 @load 同一页
  finished.value = true
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
/** 与 settlement/pending-review 列表同款扁平 cell */
.prev-mine-list-group {
  margin-top: 4px;
  background: transparent;
}
.prev-mine-list-group :deep(.van-cell) {
  margin: 0 0 8px;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}
.prev-mine-list-group :deep(.van-cell:last-of-type) {
  margin-bottom: 0;
}
.prev-mine-list-group :deep(.van-cell__title) {
  flex: 1.2;
  min-width: 0;
  font-weight: 500;
}
.prev-mine-list-group :deep(.van-cell__value) {
  flex-shrink: 0;
  padding-right: 22px;
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
</style>
