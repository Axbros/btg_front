import { computed, ref } from 'vue'
import { fetchAdminUserPickerOptions } from '@/api/admin'

function pickerLabel(o) {
  const nick = o?.nickname
  if (nick != null && String(nick).trim() !== '') return String(nick).trim()
  const id = o?.id
  if (id != null && String(id).trim() !== '') return `用户 #${id}`
  return '—'
}

/**
 * 补仓转派：加载 /admin/users/picker-options，供 van-picker columns 使用。
 */
export function useAdminReplenishmentAssignPicker() {
  const rawOptions = ref([])
  const pickerLoading = ref(false)
  const assignSelectedUserId = ref(null)

  const pickerColumns = computed(() =>
    rawOptions.value.map((o) => ({
      text: pickerLabel(o),
      value: Number(o.id),
    })),
  )

  const assignExecutorDisplay = computed(() => {
    const id = assignSelectedUserId.value
    if (id == null || !Number.isFinite(id) || id <= 0) return ''
    const hit = pickerColumns.value.find((c) => c.value === id)
    return hit?.text ?? `用户 #${id}`
  })

  async function loadExecutorPickerOptions() {
    pickerLoading.value = true
    try {
      const data = await fetchAdminUserPickerOptions()
      const list = Array.isArray(data) ? data : []
      rawOptions.value = list.filter((o) => {
        const n = Number(o?.id)
        return o != null && Number.isFinite(n) && n > 0
      })
    } finally {
      pickerLoading.value = false
    }
  }

  function resetAssignSelection() {
    assignSelectedUserId.value = null
  }

  /** @param {Array<{ value?: number }>} selectedOptions van-picker @confirm */
  function applyPickerConfirm(selectedOptions) {
    const first = selectedOptions?.[0]
    const n = Number(first?.value)
    assignSelectedUserId.value = Number.isFinite(n) && n > 0 ? n : null
  }

  return {
    rawOptions,
    pickerLoading,
    assignSelectedUserId,
    pickerColumns,
    assignExecutorDisplay,
    loadExecutorPickerOptions,
    resetAssignSelection,
    applyPickerConfirm,
  }
}
