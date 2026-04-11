<template>
  <div class="auth-page">
    <AppHeader title="注册账号" />
    <van-form scroll-to-error :show-error-message="true" @submit="onSubmit">
      <van-cell-group inset title="注册信息">
        <van-field
          v-model="form.mobile"
          name="mobile"
          label="手机"
          placeholder="11 位手机号"
          type="tel"
          maxlength="11"
          required
          :rules="mobileRules"
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="6～64 位"
          maxlength="64"
          required
          :rules="registerPasswordRules"
        />
        <van-field
          v-model="form.confirmPassword"
          type="password"
          name="confirmPassword"
          label="确认密码"
          placeholder="请再次输入密码"
          maxlength="64"
          required
          :rules="confirmPasswordRules"
        />
        <van-field
          v-model="form.invitationCode"
          name="invitationCode"
          label="邀请码"
          placeholder="必填"
          required
          disabled
          :rules="invitationCodeRules"
        />
      </van-cell-group>
   
      <div class="auth-actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">注册</van-button>
        <van-button round block plain type="primary" class="auth-actions__link" @click="goLogin">已有账号去登录</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { register } from '@/api/auth'
import AppHeader from '@/components/AppHeader.vue'
import {
  mobileRules,
  registerPasswordRules,
  invitationCodeRules,
  createConfirmPasswordRules,
} from '@/utils/formRules'

const route = useRoute()
const router = useRouter()
const loading = ref(false)

const form = reactive({
  mobile: '',
  password: '',
  confirmPassword: '',
  invitationCode: '',
})

const confirmPasswordRules = createConfirmPasswordRules(() => form.password)

function pickInvitationCodeFromQuery() {
  const q = route.query
  const raw = q.invitationCode ?? q.inviteCode ?? q.code ?? ''
  return Array.isArray(raw) ? String(raw[0] ?? '').trim() : String(raw).trim()
}

onMounted(() => {
  const fromUrl = pickInvitationCodeFromQuery()
  if (fromUrl) form.invitationCode = fromUrl
})

function goLogin() {
  router.push('/login')
}

/** 校验由 van-form 在触发 submit 前完成，此处只做 trim 后请求 */
async function onSubmit() {
  const m = form.mobile.trim()
  const code = form.invitationCode.trim()
  loading.value = true
  try {
    const body = {
      mobile: m,
      password: form.password,
      invitationCode: code,
    }
    await register(body)
    showToast('注册成功，请登录')
    router.replace('/login')
  } catch {
    /* interceptor */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  padding-bottom: 32px;
}
.hint {
  margin: 12px 20px;
  font-size: 12px;
  color: #969799;
  line-height: 1.6;
}
.auth-actions {
  margin-top: 20px;
  padding: 0 16px;
}
.auth-actions__link {
  margin-top: 14px;
}
</style>
