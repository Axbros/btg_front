import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const pageTitle = ref('金砖分润')

  function setPageTitle(t) {
    pageTitle.value = t || '金砖分润'
  }

  return {
    pageTitle,
    setPageTitle,
  }
})
