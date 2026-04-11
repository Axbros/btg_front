import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const pageTitle = ref('吞金授')

  function setPageTitle(t) {
    pageTitle.value = t || '吞金授'
  }

  return {
    pageTitle,
    setPageTitle,
  }
})
