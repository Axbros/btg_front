import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const pageTitle = ref('推荐分佣')

  function setPageTitle(t) {
    pageTitle.value = t || '推荐分佣'
  }

  return {
    pageTitle,
    setPageTitle,
  }
})
