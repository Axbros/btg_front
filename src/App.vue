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
</style>
