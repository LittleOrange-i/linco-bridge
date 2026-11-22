<script setup lang="ts">
// 任务控制台：查看设备上运行中/最近的 Agent 任务，远程继续。
// WorkBuddy 式三层结构中的第二层：设备卡片 → 本页（任务列表）→ 聊天页（继续对话）。
import { onLoad, onShow, onHide, onUnload } from '@/composables/uni-lifecycle'
import { computed, ref } from 'vue'
import AppNavBar from '@/components/AppNavBar.vue'

import { listDeviceThreads, startThreadConversation, type DeviceThreadItem } from '@/api/device-api'
import { fetchConnectedAccounts } from '@/api/accounts-api'
import type { AgentBridgeType } from '@/bridge/types'
import { useSessionStore } from '@/stores'
import { showToast } from '@/utils/format'
import { formatRelativeTime } from '@/utils/format'
import { navigateOnce } from '@/utils/navigate-once'
import { getCustomNavPagePaddingStyle } from '@/utils/page-safe-area'

const pageSafeStyle = getCustomNavPagePaddingStyle()
const sessionStore = useSessionStore()

const agentType = ref<AgentBridgeType>('codex')
const connectionId = ref<string>('')
const deviceName = ref('电脑')
const avatar = ref('💻')

// avatar 是否为图片路径（/static/... 或 http 开头）；路径渲染成 <img>，否则按 emoji 文本展示
const isImageAvatar = computed(
  () => avatar.value.startsWith('/') || avatar.value.startsWith('http'),
)

const threads = ref<DeviceThreadItem[]>([])
const online = ref(true)
const loading = ref(false)
const resumingId = ref<string>('')
const errorMessage = ref('')

const POLL_INTERVAL_MS = 10_000
let pollTimer: ReturnType<typeof setInterval> | null = null

const runningThreads = computed(() => threads.value.filter((item) => item.running))
const recentThreads = computed(() =>
  threads.value
    .filter((item) => !item.running)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
)

function basenameOf(path: string): string {
  const normalized = String(path || '').replace(/[\\/]+$/, '')
  if (!normalized) return ''
  const parts = normalized.split(/[\\/]/)
  return parts[parts.length - 1] || normalized
}

async function loadThreads(options?: { silent?: boolean }) {
  if (!options?.silent) loading.value = true
  try {
    const result = await listDeviceThreads(agentType.value, {
      limit: 50,
      connectionId: connectionId.value || undefined,
    })
    threads.value = result
    errorMessage.value = ''
  } catch (err) {
    // 静默轮询失败不打断界面，只记录最近一次错误供手动刷新时提示
    errorMessage.value = err instanceof Error ? err.message : '加载任务列表失败'
    if (!options?.silent) showToast(errorMessage.value)
  } finally {
    if (!options?.silent) loading.value = false
  }
}

async function loadOnlineStatus() {
  try {
    const result = await fetchConnectedAccounts()
    const matched = result.items.find(
      (item) =>
        (connectionId.value && item.connectionId === connectionId.value) ||
        (!connectionId.value && item.agentType === agentType.value),
    )
    if (matched) {
      online.value = matched.status === 'online'
      if (matched.deviceName) deviceName.value = matched.deviceName
    }
  } catch {
    // 状态获取失败时保持现状
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    void loadThreads({ silent: true })
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onLoad((query) => {
  agentType.value = (String(query?.agentType ?? 'codex') || 'codex') as AgentBridgeType
  connectionId.value = String(query?.connectionId ?? '')
  if (query?.deviceName) deviceName.value = String(query.deviceName)
  if (query?.avatar) avatar.value = String(query.avatar)
})

onShow(() => {
  void loadThreads()
  void loadOnlineStatus()
  startPolling()
})

onHide(() => {
  stopPolling()
})

onUnload(() => {
  stopPolling()
})

async function handleRefresh() {
  await Promise.all([loadThreads(), loadOnlineStatus()])
}

async function resumeThread(item: DeviceThreadItem) {
  if (resumingId.value) return
  resumingId.value = item.id
  try {
    const { sessionId } = await startThreadConversation(agentType.value, {
      threadId: item.id,
      title: item.title,
      workspace: item.workspace,
      connectionId: connectionId.value || undefined,
    })
    // 刷新会话缓存后再进入聊天页，保证聊天页能取到会话元数据
    await sessionStore.loadSessions().catch(() => undefined)
    navigateOnce(`/pages/chat/index?sessionId=${encodeURIComponent(sessionId)}`)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '继续任务失败')
  } finally {
    resumingId.value = ''
  }
}

function openLanding() {
  navigateOnce(
    `/pages/chat/landing?agentType=${encodeURIComponent(agentType.value)}${
      connectionId.value ? `&connectionId=${encodeURIComponent(connectionId.value)}` : ''
    }`,
  )
}
</script>

<template>
  <div class="page-container console-page" :style="pageSafeStyle">
    <AppNavBar :title="deviceName" :show-back="true" />

    <div class="console-page__scroll">
      <!-- 设备状态卡 -->
      <div class="device-card">
        <!-- avatar 可能是图标路径（/static/...）或 emoji：路径渲染成图片，否则按文本展示 -->
        <img
          v-if="isImageAvatar"
          class="device-card__avatar-img"
          :src="avatar"
          alt=""
        />
        <div v-else class="device-card__avatar">{{ avatar }}</div>
        <div class="device-card__info">
          <div class="device-card__name">{{ deviceName }}</div>
          <div class="device-card__meta">
            <span class="device-card__status" :class="{ 'device-card__status--online': online }">
              {{ online ? '● 在线' : '○ 离线' }}
            </span>
            <span class="device-card__agent">{{ agentType }}</span>
          </div>
        </div>
        <div class="device-card__action" @click="openLanding">新任务</div>
      </div>

      <!-- 运行中任务 -->
      <div class="section">
        <div class="section__header">
          <span class="section__title">运行中</span>
          <span v-if="runningThreads.length" class="section__badge">{{
            runningThreads.length
          }}</span>
          <span class="section__refresh" @click="handleRefresh">刷新</span>
        </div>
        <div v-if="runningThreads.length === 0" class="section__empty">暂无运行中的任务</div>
        <div
          v-for="item in runningThreads"
          :key="item.id"
          class="task-row task-row--running"
          @click="resumeThread(item)"
        >
          <div class="task-row__pulse" />
          <div class="task-row__body">
            <div class="task-row__title text-ellipsis">{{ item.title }}</div>
            <div class="task-row__meta">
              <span v-if="item.workspace" class="task-row__workspace text-ellipsis">{{
                basenameOf(item.workspace)
              }}</span>
              <span class="task-row__time">{{ formatRelativeTime(item.updatedAt) }}</span>
            </div>
          </div>
          <div
            class="task-row__btn"
            :class="{ 'task-row__btn--busy': resumingId === item.id }"
            @click.stop="resumeThread(item)"
          >
            {{ resumingId === item.id ? '连接中…' : '继续' }}
          </div>
        </div>
      </div>

      <!-- 最近任务 -->
      <div class="section">
        <div class="section__header">
          <span class="section__title">最近任务</span>
        </div>
        <div v-if="loading && threads.length === 0" class="section__empty">加载中…</div>
        <div v-else-if="recentThreads.length === 0" class="section__empty">暂无历史任务</div>
        <div
          v-for="item in recentThreads"
          :key="item.id"
          class="task-row"
          @click="resumeThread(item)"
        >
          <div class="task-row__body">
            <div class="task-row__title text-ellipsis">{{ item.title }}</div>
            <div class="task-row__meta">
              <span v-if="item.workspace" class="task-row__workspace text-ellipsis">{{
                basenameOf(item.workspace)
              }}</span>
              <span class="task-row__time">{{ formatRelativeTime(item.updatedAt) }}</span>
            </div>
          </div>
          <div class="task-row__btn task-row__btn--ghost" @click.stop="resumeThread(item)">
            {{ resumingId === item.id ? '连接中…' : '继续' }}
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="console-error">{{ errorMessage }}（点击「刷新」重试）</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.console-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f7;
}

.console-page__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16rpx 30rpx 48rpx;
}

.device-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.device-card__avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 20rpx;
  background: #eef4f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  margin-right: 20rpx;
}

/* avatar 为图片路径时的占位样式，与 emoji 版本保持同尺寸圆角 */
.device-card__avatar-img {
  width: 84rpx;
  height: 84rpx;
  border-radius: 20rpx;
  background: #eef4f0;
  margin-right: 20rpx;
}

.device-card__info {
  flex: 1;
  min-width: 0;
}

.device-card__name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.device-card__meta {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.device-card__status {
  color: #b0b0b0;
}

.device-card__status--online {
  color: #0f9d58;
}

.device-card__action {
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  background: #00754a;
  color: #ffffff;
  font-size: 26rpx;
}

.section {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section__header {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.section__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.section__badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #ff4d4f;
  color: #ffffff;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section__refresh {
  margin-left: auto;
  font-size: 24rpx;
  color: #00754a;
}

.section__empty {
  padding: 32rpx 0;
  font-size: 26rpx;
  color: #b0b0b0;
  text-align: center;
}

.task-row {
  display: flex;
  align-items: center;
  padding: 20rpx 8rpx;
  border-radius: 16rpx;
}

.task-row--running {
  background: #fff7f6;
}

.task-row__pulse {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ff4d4f;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.task-row__body {
  flex: 1;
  min-width: 0;
}

.task-row__title {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.task-row__meta {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 22rpx;
  color: #9c9c9c;
}

.task-row__workspace {
  max-width: 60%;
}

.task-row__btn {
  margin-left: 16rpx;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: #00754a;
  color: #ffffff;
  font-size: 24rpx;
  flex-shrink: 0;
}

.task-row__btn--ghost {
  background: #f0f2f1;
  color: #00754a;
}

.task-row__btn--busy {
  opacity: 0.6;
}

.console-error {
  margin-top: 8rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #fff2f0;
  color: #d4380d;
  font-size: 24rpx;
  text-align: center;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
