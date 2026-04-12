<template>
  <span v-if="src" class="previewable-remote-image" :class="`previewable-remote-image--${size}`">
    <img
      v-if="showAsImage"
      :src="src"
      :alt="effectiveAlt"
      class="previewable-remote-image__img"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @click="previewImage"
    />
    <van-button v-else type="primary" size="small" plain class="previewable-remote-image__pdf" @click="openPdf">
      查看 PDF
    </van-button>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { showImagePreview } from 'vant'

const props = defineProps({
  url: { type: String, default: '' },
  alt: { type: String, default: '图片' },
  /** thumb：列表/单元格；large：详情区大图 */
  size: { type: String, default: 'thumb' },
})

const src = computed(() => String(props.url || '').trim())

function isPdfUrl(u) {
  const base = String(u || '').split('?')[0].split('#')[0].toLowerCase()
  return base.endsWith('.pdf')
}

const showAsImage = computed(() => src.value && !isPdfUrl(src.value))

const effectiveAlt = computed(() => {
  const a = String(props.alt || '').trim()
  return a || '图片'
})

function previewImage() {
  if (!src.value || !showAsImage.value) return
  showImagePreview([src.value])
}

function openPdf() {
  if (!src.value) return
  window.open(src.value, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.previewable-remote-image {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}
.previewable-remote-image__img {
  display: block;
  max-width: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 6px;
  cursor: pointer;
  vertical-align: middle;
}
.previewable-remote-image--thumb .previewable-remote-image__img {
  max-height: 72px;
  max-width: min(100%, 220px);
}
.previewable-remote-image--large .previewable-remote-image__img {
  max-height: 240px;
}
.previewable-remote-image__pdf {
  vertical-align: middle;
}
</style>
