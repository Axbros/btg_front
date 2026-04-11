<template>
  <div class="nf">
    <van-empty description="页面不存在">
      <van-button type="primary" round @click="$router.replace('/home')">回首页</van-button>
    </van-empty>
  </div>
</template>

<style scoped>
.nf {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6f8;
}
</style>
