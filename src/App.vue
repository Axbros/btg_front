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
  /* 配合 viewport：抑制双击缩放、避免部分 WebKit 自动调字号 */
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
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
 * 锁定主布局高度为视口，禁止外层（document）纵向滚动。
 * router-view 的宿主不参与高度传递，故用 .page-shell__view 包住再 flex:1。
 */
.page-shell__view {
  min-width: 0;
}

.page-shell.page-shell--fill {
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  overscroll-behavior: none;
}

.page-shell.page-shell--fill .page-shell__view {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/**
 * 带 Tab 时 van-tabbar 已用 placeholder 占位，若再保留 .page-shell 的 padding-bottom，
 * 会在 Tab 占位下方多出一条空白，子页面里的「贴底」栏会看起来不在屏幕最底部。
 */
.page-shell.page-shell--fill:not(.no-tab) {
  padding-bottom: 0;
}

/**
 * 利润上报等：子路由 root 用此类占满 .page-shell__view（flex 子项），中间区域可纵向滚动。
 */
.profit-report-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}
.profit-report-shell__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
}
.profit-report-shell__list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.profit-report-shell__pull {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

/**
 * 函数式 Dialog / ImagePreview 等挂载在 body 下；若构建产物中 Vant 片段加载顺序异常，保底可读宽度。
 */
body .van-dialog {
  width: var(--van-dialog-width, 320px);
  max-width: min(320px, calc(100vw - 32px));
  box-sizing: border-box;
}
</style>
