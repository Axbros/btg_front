<template>
  <div>
    <AppHeader title="我的团队" :show-back="false" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" style="margin-top: 10px;">
      <div v-if="loading && !tree.length" class="team-loading">
        <van-loading type="spinner" vertical>加载中…</van-loading>
      </div>
      <van-cell-group v-else-if="tree.length" inset>
        <TeamTreeList :nodes="tree" :depth="0" />
      </van-cell-group>
      <EmptyState v-else-if="loaded" description="暂无下级成员" />
      <p v-if="loaded" class="team-page-meta">共 {{ total }} 人</p>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { computed, onMounted, provide, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import TeamTreeList from '@/components/TeamTreeList.vue'
import { fetchDescendantsTeam } from '@/api/user'

const router = useRouter()

const tree = ref([])
const loading = ref(false)
const loaded = ref(false)
const refreshing = ref(false)

const expanded = reactive({})

function countTreeNodes(nodes) {
  let c = 0
  if (!Array.isArray(nodes)) return c
  for (const n of nodes) {
    if (!n || n.id == null) continue
    c += 1
    if (Array.isArray(n.children) && n.children.length) {
      c += countTreeNodes(n.children)
    }
  }
  return c
}

const total = computed(() => countTreeNodes(tree.value))

function normalizeRoots(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && Array.isArray(raw.data)) return raw.data
  return []
}

function toggleExpand(id) {
  const k = String(id)
  expanded[k] = !expanded[k]
}

function isExpanded(id) {
  return expanded[String(id)] === true
}

function openMember(node) {
  const id = node?.id
  if (id == null) return
  router.push({
    name: 'TeamMemberDetail',
    params: { memberId: String(id) },
  })
}

provide('teamTreeCtx', {
  toggleExpand,
  isExpanded,
  openMember,
})

async function loadTree() {
  loading.value = true
  try {
    const raw = await fetchDescendantsTeam()
    tree.value = normalizeRoots(raw)
  } catch {
    tree.value = []
  } finally {
    loading.value = false
    loaded.value = true
    refreshing.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  await loadTree()
}

onMounted(() => {
  loadTree()
})
</script>

<style scoped>
.team-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.team-page-meta {
  margin: 12px 16px 8px;
  font-size: 13px;
  color: #969799;
  text-align: center;
}
</style>
