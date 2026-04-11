<template>
  <div>
    <AppHeader title="我的直属下级" :show-back="false" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <van-cell-group v-if="list.length">
          <van-cell
            v-for="(row, i) in list"
            :key="rowKey(row, i)"
            :title="String(row.mobile ?? '—')"
            icon="user-o"
            is-link
            @click="openDetail(row)"
          >
            <template #value>
              <van-tag :type="userStatusTagType(row.status)" plain round>
                {{ formatUserStatus(row.status) }}
              </van-tag>
            </template>
          </van-cell>
        </van-cell-group>
        <EmptyState v-else-if="!loading && loadedOnce" description="暂无直属下级" />
        <p v-if="loadedOnce" class="team-page-meta">共 {{ total }} 人</p>
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchDirectTeam } from '@/api/user'
import { usePagedTeamList } from '@/composables/usePagedTeamList'
import { formatUserStatus, userStatusTagType } from '@/utils/format'
const router = useRouter()

const { list, total, loading, finished, refreshing, loadedOnce, onLoad, onRefresh } = usePagedTeamList(
  (params) => fetchDirectTeam(params),
)

function rowKey(row, i) {
  return String(row.id ?? `i-${i}`)
}

function openDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({
    name: 'TeamMemberDetail',
    params: { memberId: String(id) },
  })
}
</script>

<style scoped>
.team-page-meta {
  margin: 12px 16px 8px;
  font-size: 13px;
  color: #969799;
  text-align: center;
}
</style>
