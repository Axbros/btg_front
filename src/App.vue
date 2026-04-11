<template>
  <router-view />
</template>

<script setup>
</script>

<style>
html,
body,
#app {
  margin: 0;
  min-height: 100%;
  background: #f5f6f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  -webkit-font-smoothing: antialiased;
}

.page-shell {
  min-height: 100vh;
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.page-shell.no-tab {
  padding-bottom: env(safe-area-inset-bottom);
}

/**
 * 全站 Toast：部分环境/主题会把 --van-toast-* 弄成「浅底 + 白字」，看起来像空白。
 * 统一拉回 Vant 默认语义（深底 + 白字），含 Profile、表单提示与 request 等所有 showToast。
 */
body .van-toast {
  --van-toast-background: rgba(50, 50, 51, 0.92);
  --van-toast-text-color: #fff;
  --van-toast-loading-icon-color: #fff;
  background: var(--van-toast-background) !important;
  color: var(--van-toast-text-color) !important;
}
body .van-toast .van-toast__text {
  color: #fff !important;
}
</style>
