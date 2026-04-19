<template>
  <div>
    <AppHeader title="我的团队" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <section v-if="loading" class="team-initial-loading">
        <van-loading type="spinner" vertical>加载中…</van-loading>
      </section>
      <template v-else>
        <section class="team-stats" aria-label="团队统计">
          <van-row v-if="stats" :gutter="10">
            <van-col span="12">
              <div class="team-stats__card">
                <div class="team-stats__label">直属下级人数</div>
                <div class="team-stats__value">{{ displayCount(stats.directCount) }}</div>
              </div>
            </van-col>
            <van-col span="12">
              <div class="team-stats__card">
                <div class="team-stats__label">全部下级人数</div>
                <div class="team-stats__value">{{ displayCount(stats.allDescendantCount) }}</div>
              </div>
            </van-col>
          </van-row>
        </section>

        <van-cell-group inset title="下级成员" v-if="tree.length" class="team-tree-cells">
          <TeamTreeList :nodes="tree" :depth="0" />
        </van-cell-group>
        <EmptyState v-else-if="treeLoaded" description="暂无下级成员" />
        <p v-if="treeLoaded" class="team-page-meta">共 {{ displayTotal }} 人</p>
      </template>
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
import { parseDescendantsResponse } from '@/utils/teamDescendants'

const router = useRouter()

const stats = ref({ directCount: null, allDescendantCount: null })
const tree = ref([])
const loading = ref(true)
const treeLoaded = ref(false)
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

const treeNodeCount = computed(() => countTreeNodes(tree.value))

const displayTotal = computed(() => {
  const n = stats.value?.allDescendantCount
  if (n != null && Number.isFinite(n)) return n
  return treeNodeCount.value
})

function displayCount(n) {
  if (n === null || n === undefined || n === '' || (typeof n === 'number' && !Number.isFinite(n)))
    return '—'
  return n
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

async function loadTeam() {
  if (!refreshing.value) {
    loading.value = true
  }
  try {
    const raw = await fetchDescendantsTeam()
    const { stats: s, tree: t } = parseDescendantsResponse(raw)
    stats.value = s && typeof s === 'object' ? s : { directCount: null, allDescendantCount: null }
    tree.value = t
  } catch {
    stats.value = { directCount: null, allDescendantCount: null }
    tree.value = []
  } finally {
    loading.value = false
    treeLoaded.value = true
    refreshing.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  await loadTeam()
}

onMounted(() => {
  void loadTeam()
})
</script>

<style scoped>
.team-initial-loading {
  display: flex;
  justify-content: center;
  min-height: 200px;
  padding: 48px 0;
  align-items: center;
}
.team-stats {
  padding: 12px 12px 0;
  box-sizing: border-box;
}
.team-stats__card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
  box-sizing: border-box;
}
.team-stats__label {
  font-size: 13px;
  color: #969799;
}
.team-stats__value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1989fa;
}
.team-tree-cells {
  margin-top: 4px;
}
.team-page-meta {
  margin: 12px 16px 8px;
  font-size: 13px;
  color: #969799;
  text-align: center;
}
</style>
