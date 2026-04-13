<template>
  <div class="page" :class="{ 'page--pending-footer': auth.isProfilePendingReview }">
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
        text="您的账户当前为待完善状态，请补全资料并提交，待直属上级审核通过后方可使用其它功能。"
      />
      <van-notice-bar
        v-else-if="auth.isProfilePendingReview"
        left-icon="info-o"
        color="#1989fa"
        background="#ecf9ff"
        :scrollable="false"
        wrapable
        text="资料正在等待直属上级审核，请耐心等待。审核完成之前您只能在本页面查看或修改资料，无法使用系统其它功能。"
      />
      <p v-if="!auth.isProfilePendingReview" class="tip">
        保存后将更新昵称与扩展资料。登录手机号以注册账号为准，不可在此修改。
      </p>
      <p v-else class="tip tip--pending">
        审核期间仍可修改并保存资料；如需更换账号请使用底部「退出登录」。
      </p>
      <van-form scroll-to-error :show-error-message="true" @submit="onSubmit">
        <van-cell-group inset title="账号信息">
          <van-cell title="登录手机" :value="mobileDisplay" />
        </van-cell-group>

        <van-cell-group inset title="基本资料">
          <van-field
            v-model="form.nickname"
            name="nickname"
            label="用户名"
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

        <van-cell-group inset title="Bitget API（可选）">
          <van-cell title="Bitget 绑定" :value="bitgetBindStatusLabel" />
          <van-cell title="API Key 标识" :value="accessKeyMaskedDisplay" />
          <p class="tip tip--bitget">
            三项密钥仅随本次保存提交至服务端，接口不会回显明文；留空表示不修改该项；先点下方「清空」再点「保存资料」可从服务端删除该项已保存值。
          </p>
          <div class="bitget-field-wrap">
            <van-field
              v-model="form.bitgetAccessKey"
              type="password"
              name="bitgetAccessKey"
              label="Access Key"
              placeholder="留空则不修改"
              autocomplete="off"
            />
           
          </div>
          <div class="bitget-field-wrap">
            <van-field
              v-model="form.bitgetSecretKey"
              type="password"
              name="bitgetSecretKey"
              label="Secret Key"
              placeholder="留空则不修改"
              autocomplete="off"
            />
            
          </div>
          <div class="bitget-field-wrap">
            <van-field
              v-model="form.bitgetPassphrase"
              type="password"
              name="bitgetPassphrase"
              label="Passphrase"
              placeholder="留空则不修改"
              autocomplete="off"
            />
            
          </div>
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
        <div v-if="auth.isProfileOnlyLocked" class="locked-exit">
          <van-button block round plain type="danger" @click="onLogout">退出登录</van-button>
        </div>
      </van-form>

      <div v-if="auth.isProfilePendingReview" class="page__pending-bar">
        <van-button block round plain type="danger" @click="onLogout">退出登录</van-button>
      </div>

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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { showConfirmDialog, showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import { completeUserProfile, fetchMe } from '@/api/user'
import { appendBitgetKeysToProfileBody } from '@/utils/bitgetProfilePut'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)

const mobileDisplay = computed(() => {
  const m = userInfo.value?.mobile
  return m != null && String(m).trim() !== '' ? String(m).trim() : '—'
})

const bitgetBindStatusLabel = computed(() => {
  const p = userInfo.value?.profile
  if (!p || typeof p !== 'object') return '—'
  const bc = p.bitgetConfigured === true || p.bitget_configured === true
  return bc ? '已绑定' : '未绑定'
})

const accessKeyMaskedDisplay = computed(() => {
  const p = userInfo.value?.profile
  if (!p || typeof p !== 'object') return '—'
  const mask = p.accessKeyMasked ?? p.access_key_masked
  return mask != null && String(mask).trim() !== '' ? String(mask).trim() : '—'
})
const loading = ref(false)
const submitDialogShow = ref(false)
const pageReady = ref(false)
const nicknameRules = [
  { required: true, message: '请填写用户名' },
  {
    validator: (v) => {
      if ((v || '').length > 100) return '用户名最长 100 字'
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
  bitgetAccessKey: '',
  bitgetSecretKey: '',
  bitgetPassphrase: '',
})

/** 为 true 时对该项 PUT 传 "" 以清空服务端已保存值 */
const bitgetClearFlags = reactive({
  bitgetAccessKey: false,
  bitgetSecretKey: false,
  bitgetPassphrase: false,
})

function markClearBitget(key) {
  if (!Object.prototype.hasOwnProperty.call(bitgetClearFlags, key)) return
  form[key] = ''
  bitgetClearFlags[key] = true
}

watch(
  () => [form.bitgetAccessKey, form.bitgetSecretKey, form.bitgetPassphrase],
  ([a, b, c]) => {
    if (String(a || '').trim() !== '') bitgetClearFlags.bitgetAccessKey = false
    if (String(b || '').trim() !== '') bitgetClearFlags.bitgetSecretKey = false
    if (String(c || '').trim() !== '') bitgetClearFlags.bitgetPassphrase = false
  },
)

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

async function onLogout() {
  try {
    await showConfirmDialog({ title: '确认退出登录？' })
    auth.logout()
    router.replace('/login')
  } catch {
    /* 取消 */
  }
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

    appendBitgetKeysToProfileBody(body, form, bitgetClearFlags)

    await completeUserProfile(body)
    try {
      const me = await fetchMe()
      auth.setUserInfo(me)
      if (Number(me?.status) === -1) {
        showToast('资料已保存，请等待审核')
        router.replace('/me/profile-complete')
      } else {
        showToast('保存成功')
        router.replace('/home')
      }
    } catch {
      showToast('保存成功')
      router.replace('/home')
    }
    form.bitgetAccessKey = ''
    form.bitgetSecretKey = ''
    form.bitgetPassphrase = ''
    bitgetClearFlags.bitgetAccessKey = false
    bitgetClearFlags.bitgetSecretKey = false
    bitgetClearFlags.bitgetPassphrase = false
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
.page--pending-footer {
  padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
}
.page__pending-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
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
.tip--bitget {
  margin: 8px 16px 12px;
}
.actions {
  margin: 20px 16px 0;
}
.blocked__actions {
  margin: 16px 24px 0;
}
.locked-exit {
  margin: 16px 16px 0;
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
.bitget-field-wrap {
  margin-bottom: 4px;
}
.bitget-clear-actions {
  padding: 0 16px 12px;
}
</style>
