<template>
  <div class="page">
    <AppHeader title="更新资料" />
    <van-loading v-if="!pageReady" class="page__loading" vertical>加载中…</van-loading>
    <template v-else>
      <van-notice-bar
        v-if="auth.isProfileOnlyLocked"
        left-icon="warning-o"
        color="#ed6a0c"
        background="#fff7e6"
        :scrollable="false"
        wrapable
        text="您的账户当前为待完善状态，请补全资料并提交，待直属团队长审核通过后方可使用其它功能。"
      />
      <van-notice-bar
        v-else-if="auth.isProfilePendingReview"
        left-icon="info-o"
        color="#1989fa"
        background="#ecf9ff"
        :scrollable="false"
        wrapable
        text="资料正在等待系统管理员审核，请耐心等待。审核完成之前您只能查看或修改资料，无法使用系统其它功能。"
      />
      <p v-if="!auth.isProfilePendingReview" class="tip">
        保存后将更新真实姓名与扩展资料。登录手机号以注册账号为准，不可在此修改。
      </p>
      <p v-else class="tip tip--pending">
        审核期间仍可修改并保存资料；如需更换账号请至「等待审核」页退出登录。
      </p>
      <van-form scroll-to-error :show-error-message="true" @submit="onSubmit">
        <van-cell-group inset title="账号信息">
          <van-cell title="登录手机" :value="mobileDisplay" />
        </van-cell-group>

        <van-cell-group inset title="基本资料">
          <van-field
            v-model="form.nickname"
            name="nickname"
            label="真实姓名"
            placeholder="必填"
            
            required
            :rules="nicknameRules"
          />
          <!-- <van-field
            v-model="form.realName"
            name="realName"
            label="真实姓名"
            placeholder="必填"
            required
            :rules="[{ required: true, message: '请填写真实姓名' }]"
          />
          <van-field
            v-model="form.idCardNo"
            name="idCardNo"
            label="身份证号"
            placeholder="必填"
            required
            :rules="[
              {
                validator: (v) =>
                  String(v || '').trim().length > 0 || '请填写身份证号',
              },
            ]"
          /> -->
        </van-cell-group>

        <van-cell-group inset title="交易信息">
          <van-field
            v-model="form.serverName"
            name="serverName"
            label="服务器名称"
            placeholder="必填"
            required
            :rules="[{ required: true, message: '请填写服务器名称' }]"
          />
          <van-field
            v-model="form.tradingAccountId"
            name="tradingAccountId"
            label="账户ID"
            placeholder="必填"
            required
            :rules="[{ required: true, message: '请填写交易账户 ID' }]"
          />
          <van-field
            v-model="form.tradingAccountPassword"
            type="password"
            name="tradingAccountPassword"
            label="账户密码"
            placeholder="首次须填；仅修改资料时可留空"
            :rules="passwordRules"
          />
          <van-field
            v-model="form.exchangeUid"
            name="exchangeUid"
            label="交易所 UID"
            placeholder="必填"
            required
            :rules="[{ required: true, message: '请填写交易所 UID' }]"
          />
          <van-field
            v-model="form.principalAmount"
            name="principalAmount"
            label="底仓本金"
            type="number"
            placeholder="必填，大于等于 0"
            required
            :rules="principalRules"
          >
            <template #extra>
              <span class="principal-suffix">USD</span>
            </template>
          </van-field>
        </van-cell-group>

        <van-cell-group inset title="钱包信息">
          <van-field
            v-model="form.walletName"
            name="walletName"
            label="券商名称"
            placeholder="必填"
            required
            :rules="[{ required: true, message: '请填写券商名称' }]"
          />
          <van-field
            v-model="form.walletAddress"
            name="walletAddress"
            label="钱包地址"
            placeholder="必填，交易所 TRC20 地址"
            required
            :rules="[{ required: true, message: '请填写钱包地址（TRC20）' }]"
          />
        </van-cell-group>

        <!-- <van-cell-group inset title="证件与照片（选填）">
          <van-field v-model="form.idCardFrontUrl" name="idCardFrontUrl" label="身份证正面" readonly>
            <template #input>
              <ImageUploadField
                v-model="form.idCardFrontUrl"
                upload-type="ID_CARD_FRONT"
                hint="选填，拍照或相册自动上传"
              />
            </template>
          </van-field>
          <van-field v-model="form.idCardBackUrl" name="idCardBackUrl" label="身份证反面" readonly>
            <template #input>
              <ImageUploadField
                v-model="form.idCardBackUrl"
                upload-type="ID_CARD_BACK"
                hint="选填，拍照或相册自动上传"
              />
            </template>
          </van-field>
          <van-field v-model="form.facePhotoUrl" name="facePhotoUrl" label="人脸照片" readonly>
            <template #input>
              <ImageUploadField
                v-model="form.facePhotoUrl"
                upload-type="FACE"
                hint="选填，拍照或相册自动上传"
              />
            </template>
          </van-field>
        </van-cell-group> -->

        <div class="actions">
          <van-button round block type="primary" native-type="submit" :loading="loading">保存资料</van-button>
        </div>
      </van-form>

      <van-dialog
        v-model:show="submitDialogShow"
        title="确认保存资料？"
        show-cancel-button
        confirm-button-text="确认保存"
        cancel-button-text="再检查一下"
        :before-close="onSubmitDialogBeforeClose"
      >
        <p class="submit-dialog-msg">请确认信息填写无误。</p>
      </van-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import { completeUserProfile, fetchMe } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { isQualificationApprovedValue } from '@/utils/qualification'

const router = useRouter()
const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)

const mobileDisplay = computed(() => {
  const m = userInfo.value?.mobile
  return m != null && String(m).trim() !== '' ? String(m).trim() : '—'
})

const loading = ref(false)
const submitDialogShow = ref(false)
const pageReady = ref(false)
const nicknameRules = [
  { required: true, message: '请填写真实姓名' },
  {
    validator: (v) => {
      if ((v || '').length > 100) return '真实姓名最长 100 字'
      return true
    },
  },
]

const principalRules = [
  { required: true, message: '请填写底仓本金' },
  {
    validator: (v) => {
      if (v === '' || v === null || v === undefined) return '请填写底仓本金'
      const n = Number(v)
      if (Number.isNaN(n) || n < 0) return '须为大于等于 0 的数字'
      return true
    },
  },
]

/** 待完善（status -1）首次提交须填交易密码；已激活用户再次修改可留空 */
const passwordRules = [
  {
    validator: (v) => {
      if (!auth.isProfileOnlyLocked) return true
      if (String(v || '').trim().length > 0) return true
      return '待完善账号请填写交易账户密码'
    },
  },
]

const form = reactive({
  nickname: '',
  realName: '',
  idCardNo: '',
  idCardFrontUrl: '',
  idCardBackUrl: '',
  facePhotoUrl: '',
  serverName: '',
  tradingAccountId: '',
  tradingAccountPassword: '',
  exchangeUid: '',
  principalAmount: '',
  walletName: '',
  walletAddress: '',
})

function applyMeProfileToForm(me) {
  if (!me || typeof me !== 'object') return
  if (me.nickname != null && String(me.nickname).trim() !== '') {
    form.nickname = String(me.nickname)
  }
  const p = me.profile
  if (!p || typeof p !== 'object') return
  const rs = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '')
  const r = p.realName
  if (r) form.realName = rs(r)
  const idc = p.idCardNo
  if (idc) form.idCardNo = rs(idc)
  const sn = p.serverName
  if (sn) form.serverName = rs(sn)
  const tid = p.tradingAccountId
  if (tid) form.tradingAccountId = rs(tid)
  const ex = p.exchangeUid
  if (ex) form.exchangeUid = rs(ex)
  const pr = p.principalAmount
  if (pr !== '' && pr != null && !Number.isNaN(Number(pr))) {
    form.principalAmount = String(pr)
  }
  const wn = p.walletName
  if (wn) form.walletName = rs(wn)
  const wa = p.walletAddress
  if (wa) form.walletAddress = rs(wa)
}

onMounted(async () => {
  pageReady.value = false
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
    applyMeProfileToForm(me)
  } catch {
    const u = auth.userInfo
    if (u) applyMeProfileToForm(u)
  } finally {
    pageReady.value = true
  }
})

function onSubmit() {
  submitDialogShow.value = true
}

async function onSubmitDialogBeforeClose(action) {
  if (action === 'cancel') return true
  const principal = Number(form.principalAmount)
  loading.value = true
  try {
    const body = {
      nickname: form.nickname.trim(),
      serverName: form.serverName.trim(),
      tradingAccountId: form.tradingAccountId.trim(),
      exchangeUid: form.exchangeUid.trim(),
      principalAmount: principal,
      walletName: form.walletName.trim(),
      walletAddress: form.walletAddress.trim(),
    }
    const realName = String(form.realName || '').trim()
    if (realName) body.realName = realName
    const idCardNo = String(form.idCardNo || '').trim()
    if (idCardNo) body.idCardNo = idCardNo
    const idCardFrontUrl = String(form.idCardFrontUrl || '').trim()
    if (idCardFrontUrl) body.idCardFrontUrl = idCardFrontUrl
    const idCardBackUrl = String(form.idCardBackUrl || '').trim()
    if (idCardBackUrl) body.idCardBackUrl = idCardBackUrl
    const facePhotoUrl = String(form.facePhotoUrl || '').trim()
    if (facePhotoUrl) body.facePhotoUrl = facePhotoUrl
    const pwd = String(form.tradingAccountPassword || '').trim()
    if (pwd) body.tradingAccountPassword = pwd

    await completeUserProfile(body)
    try {
      const me = await fetchMe()
      auth.setUserInfo(me)
      const qual = me?.profile?.qualificationStatus ?? me?.qualificationStatus
      if (!isQualificationApprovedValue(qual)) {
        showToast('资料已提交，请等待审核')
        router.replace({ name: 'QualificationPending' })
      } else {
        const st = Number(me?.status)
        if (st === 1) {
          showToast('保存成功')
          router.replace('/home')
        } else {
          showToast('资料已保存')
          router.replace('/me/profile-complete')
        }
      }
    } catch {
      showToast('保存成功')
      router.replace('/me/profile-complete')
    }
    return true
  } catch {
    return false
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  padding-bottom: 32px;
}
.tip--pending {
  color: #646566;
}
.page__loading {
  padding: 48px 0;
}
.tip {
  margin: 8px 16px 4px;
  font-size: 12px;
  color: #969799;
  line-height: 1.5;
}
.tip strong {
  color: #646566;
  font-weight: 600;
}
.actions {
  margin: 20px 16px 0;
}
.blocked__actions {
  margin: 16px 24px 0;
}
.submit-dialog-msg {
  margin: 0;
  padding: 0 24px 20px;
  font-size: 14px;
  line-height: 1.55;
  color: #646566;
}
.principal-suffix {
  margin-left: 4px;
  color: #646566;
  font-size: 14px;
  flex-shrink: 0;
}
</style>
