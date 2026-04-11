<template>
  <div class="auth-page">
    <div class="auth-brand">
      <div class="auth-brand__title">金砖·佣金系统</div>
      <div class="auth-brand__sub">打造一流现货系统</div>
    </div>
    <van-form scroll-to-error :show-error-message="true" @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="mobile"
          name="mobile"
          label="手机"
          placeholder="11 位手机号"
          type="tel"
          maxlength="11"
          required
          :rules="mobileRules"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          required
          :rules="loginPasswordRules"
        />
      </van-cell-group>
      <div class="auth-actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          登录
        </van-button>
        <van-button round block plain type="primary" class="auth-actions__link" @click="goRegister">
          没有账号？去注册
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { login } from '@/api/auth'
import { fetchMe } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { pickTokenFromLoginData, pickUserFromLoginData } from '@/utils/token'
import { mobileRules, loginPasswordRules } from '@/utils/formRules'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mobile = ref('')
const password = ref('')
const loading = ref(false)

function goRegister() {
  router.push('/register')
}

async function onSubmit() {
  loading.value = true
  try {
    /** LoginRequest：mobile + password */
    const data = await login({
      mobile: mobile.value.trim(),
      password: password.value,
    })
    const token = pickTokenFromLoginData(data)
    if (!token) {
      
      showToast('登录成功但未返回 token')
      return
    }
    auth.setToken(token)
    let user = pickUserFromLoginData(data)
    if (!user) {
      try {
        user = await fetchMe()
      } catch {
        user = null
      }
    }
    if (user) auth.setUserInfo(user)
    showToast('登录成功')
    const redirect = route.query.redirect || '/home'
    router.replace(String(redirect))
  } catch {
    /* interceptor toast */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  padding: 32px 0 24px;
  background: linear-gradient(180deg, #e8f3ff 0%, #f5f6f8 40%);
}
.auth-brand {
  text-align: center;
  margin-bottom: 28px;
  padding: 0 24px;
}
.auth-brand__title {
  font-size: 22px;
  font-weight: 700;
  color: #323233;
}
.auth-brand__sub {
  margin-top: 8px;
  font-size: 12px;
  color: #969799;
}
.auth-actions {
  margin-top: 24px;
  padding: 0 16px;
}
.auth-actions__link {
  margin-top: 14px;
}
</style>
