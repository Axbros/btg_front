<template>
  <div class="image-upload-field">
    <van-uploader
      v-model="fileList"
      :max-count="1"
      accept="image/*"
      :max-size="maxSize"
      :preview-size="previewSize"
      :after-read="afterRead"
      @oversize="onOversize"
    />
    <p v-if="hint" class="image-upload-field__hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { showToast } from 'vant'
import { uploadFile } from '@/api/files'

const props = defineProps({
  modelValue: { type: String, default: '' },
  /** 查询参数 type，与后端一致 */
  uploadType: { type: String, default: 'OTHER' },
  hint: { type: String, default: '' },
  /** 单文件最大字节，默认 10MB */
  maxSize: { type: Number, default: 10 * 1024 * 1024 },
  previewSize: { type: [Number, String], default: 88 },
})

const emit = defineEmits(['update:modelValue'])

const fileList = ref([])

watch(
  () => props.modelValue,
  (url) => {
    const u = String(url || '').trim()
    if (u) {
      const cur = fileList.value[0]
      if (cur?.url === u && cur?.status === 'done') return
      fileList.value = [{ url: u, isImage: true, status: 'done' }]
    } else {
      fileList.value = []
    }
  },
  { immediate: true },
)

watch(
  fileList,
  (list) => {
    if (!list.length) emit('update:modelValue', '')
  },
  { deep: true },
)

function onOversize() {
  showToast(`图片过大，请选小于 ${Math.round(props.maxSize / 1024 / 1024)}MB 的文件`)
}

async function afterRead(item) {
  const raw = Array.isArray(item) ? item[0] : item
  if (!raw?.file) return
  raw.status = 'uploading'
  raw.message = '上传中…'
  try {
    const vo = await uploadFile(raw.file, props.uploadType)
    const url = vo?.url
    if (!url) throw new Error('no url')
    raw.url = url
    raw.isImage = true
    raw.status = 'done'
    emit('update:modelValue', url)
  } catch {
    raw.status = 'failed'
    raw.message = '失败'
    showToast('上传失败')
  }
}
</script>

<style scoped>
.image-upload-field {
  width: 100%;
}
.image-upload-field__hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #969799;
  line-height: 1.4;
}
</style>
