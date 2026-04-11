<template>
  <div class="page">
    <AppHeader title="完善资料" />
    <van-loading v-if="!pageReady" class="page__loading" vertical>加载中…</van-loading>
    <template v-else-if="kycBlocked">
      <van-empty :description="kycBlockedMessage" />
      <div class="blocked__actions">
        <van-button round block type="primary" @click="router.back()">返回</van-button>
      </div>
    </template>
    <template v-else>
      <p class="tip">
        保存后将更新昵称与扩展资料并进入 KYC 审核；<strong>提交成功后至审核结束前不可修改</strong>。
      </p>
      <van-notice-bar v-if="kycRejected" wrapable left-icon="info-o" text="上次审核未通过，请修改后重新提交。" />
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
          <van-button round block type="primary" native-type="submit" :loading="loading">提交审核</van-button>
        </div>
      </van-form>

      <van-dialog
        v-model:show="submitDialogShow"
        title="确认提交资料？"
        show-cancel-button
        confirm-button-text="确认提交"
        cancel-button-text="再检查一下"
        :before-close="onSubmitDialogBeforeClose"
      >
        <p class="submit-dialog-msg">
          提交后将进入 KYC 待审核。在审核结束（通过或拒绝）之前，您将无法再次修改资料。请确认信息填写无误。
        </p>
      </van-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { completeUserProfile, fetchMe } from '@/api/user'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const submitDialogShow = ref(false)
const pageReady = ref(false)
/** 0 未提交 null 未知 1 待审 2 通过 3 拒绝 */
const kycStatus = ref(null)

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

const kycNum = computed(() => {
  const v = kycStatus.value
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
})

/** 待审、已通过：不可再填 */
const kycBlocked = computed(() => kycNum.value === 1 || kycNum.value === 2)

const kycRejected = computed(() => kycNum.value === 3)

const kycBlockedMessage = computed(() => {
  if (kycNum.value === 2) return '资料已通过审核，无需再次提交。'
  if (kycNum.value === 1) return '资料正在审核中，审核完成前不可修改。'
  return ''
})

function parseKycFromUser(u) {
  if (!u) return null
  const raw = u.kycStatus ?? u.kyc_status
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isNaN(n) ? null : n
}

onMounted(async () => {
  pageReady.value = false
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
    kycStatus.value = parseKycFromUser(me)
    if (me?.nickname) form.nickname = String(me.nickname)
  } catch {
    kycStatus.value = parseKycFromUser(auth.userInfo)
    const u = auth.userInfo
    if (u?.nickname) form.nickname = String(u.nickname)
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
    showToast('提交成功，请等待审核')
    try {
      const me = await fetchMe()
      auth.setUserInfo(me)
      kycStatus.value = parseKycFromUser(me)
    } catch {
      /* ignore */
    }
    router.back()
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
.submit-dialog-msg {
  margin: 0;
  padding: 0 24px 20px;
  font-size: 14px;
  line-height: 1.55;
  color: #646566;
}
</style>
