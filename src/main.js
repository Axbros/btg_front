import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css'
import '@/styles/theme.css'
import { registerLogoutHandler } from '@/utils/session'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const authStore = useAuthStore()
registerLogoutHandler(() => {
  authStore.logout()
})

app.mount('#app')
