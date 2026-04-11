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
 * 接口错误 Toast（request.js）：部分环境下 Vant 变量被覆盖会出现「白底 + 白字、宽度随文案」。
 * 与官方默认语义一致：深底浅色字。
 */
body .van-toast.toast-api-error {
  --van-toast-background: rgba(50, 50, 51, 0.92);
  --van-toast-text-color: #fff;
  background: var(--van-toast-background) !important;
  color: var(--van-toast-text-color) !important;
}
body .van-toast.toast-api-error .van-toast__text {
  color: #fff !important;
}
</style>
