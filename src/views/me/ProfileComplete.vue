<template>
  <div class="page">
    <AppHeader title="完善资料" />
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
      <p class="tip">保存后将更新昵称与扩展资料。</p>
      <van-form scroll-to-error :show-error-message="true" @submit="onSubmit">
        <van-cell-group inset title="基本资料">
          <van-field
            v-model="form.nickname"
            name="nickname"
            label="用户名"
            placeholder="必填，最长 100 字"
            maxlength="100"
            show-word-limit
            required
            :rules="nicknameRules"
          />
          <van-field
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
          />
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
            placeholder="必填，仅提交存库"
            required
            :rules="[{ required: true, message: '请填写交易账户密码' }]"
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
            placeholder="必填，大于等于 0，货币单位USD"
            required
            :rules="principalRules"
          />
        </van-cell-group>

        <van-cell-group inset title="证件与照片（选填）">
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
        </van-cell-group>

        <div class="actions">
          <van-button round block type="primary" native-type="submit" :loading="loading">保存资料</van-button>
        </div>
        <div v-if="auth.isProfileOnlyLocked" class="locked-exit">
          <van-button block round plain type="danger" @click="onLogout">退出登录</van-button>
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
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { completeUserProfile, fetchMe } from '@/api/user'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
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
})

function applyMeProfileToForm(me) {
  if (!me || typeof me !== 'object') return
  if (me.nickname != null && String(me.nickname).trim() !== '') {
    form.nickname = String(me.nickname)
  }
  const p = me.profile
  if (!p || typeof p !== 'object') return
  const g = (a, b) => p[a] ?? p[b]
  const rs = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '')
  const r = g('realName', 'real_name')
  if (r) form.realName = rs(r)
  const idc = g('idCardNo', 'id_card_no')
  if (idc) form.idCardNo = rs(idc)
  const sn = g('serverName', 'server_name')
  if (sn) form.serverName = rs(sn)
  const tid = g('tradingAccountId', 'trading_account_id')
  if (tid) form.tradingAccountId = rs(tid)
  const ex = g('exchangeUid', 'exchange_uid')
  if (ex) form.exchangeUid = rs(ex)
  const pr = g('principalAmount', 'principal_amount')
  if (pr !== '' && pr != null && !Number.isNaN(Number(pr))) {
    form.principalAmount = String(pr)
  }
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
      realName: form.realName.trim(),
      idCardNo: form.idCardNo.trim(),
      idCardFrontUrl: form.idCardFrontUrl.trim(),
      idCardBackUrl: form.idCardBackUrl.trim(),
      facePhotoUrl: form.facePhotoUrl.trim(),
      serverName: form.serverName.trim(),
      tradingAccountId: form.tradingAccountId.trim(),
      tradingAccountPassword: form.tradingAccountPassword,
      exchangeUid: form.exchangeUid.trim(),
      principalAmount: principal,
    }

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
</style>
