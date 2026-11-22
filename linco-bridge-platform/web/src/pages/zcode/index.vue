<script setup lang="ts">
// ZCode 实例管理：扫码 / 粘贴官方「移动端远程控制」链接，收藏为实例卡片，
// 点卡片用应用内原生浏览器打开官方页（不外跳浏览器、不内嵌网页、不走自建中继）。
import { computed, ref } from 'vue'
import AppNavBar from '@/components/AppNavBar.vue'
import ZcodeScannerOverlay from '@/components/ZcodeScannerOverlay.vue'
import { Browser } from '@capacitor/browser'
import { isNativePlatform } from '@/utils/uni-compat'

interface ZcodeInstance {
  /** 实例别名，默认「ZCode 实例 N」 */
  alias: string
  /** 官方远程控制页完整链接（https://zcode.z.ai/remote/v4?...） */
  url: string
  /** 链接内远程会话 id 摘要，用于区分卡片 */
  remoteId: string
  createdAt: number
}

const STORAGE_KEY = 'zcode-instances'

const instances = ref<ZcodeInstance[]>(loadInstances())

// —— 添加面板 ——
const showAddPanel = ref(false)
const aliasInput = ref('')
const urlInput = ref('')
const urlError = ref('')

// —— 扫码 ——
const showScanner = ref(false)

function loadInstances(): ZcodeInstance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? (JSON.parse(raw) as ZcodeInstance[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveInstances(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances.value))
}

/** 从链接里提取远程会话 id 摘要（优先取 query 里最长的参数值） */
function extractRemoteId(url: string): string {
  try {
    const parsed = new URL(url)
    const values = [...parsed.searchParams.values()].filter((v) => v.length > 4)
    if (values.length > 0) {
      const longest = values.sort((a, b) => b.length - a.length)[0]
      return longest.slice(0, 12)
    }
    return parsed.pathname.split('/').filter(Boolean).pop() ?? ''
  } catch {
    return ''
  }
}

/** 校验并规范化链接：ZCode 官方远程控制链接（域名 zcode.*，如 zcode.z.ai / zcode.chatglm.site） */
function normalizeRemoteUrl(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  try {
    const url = new URL(text)
    if (!/(^|\.)zcode\./i.test(url.hostname)) return null
    if (!url.pathname.startsWith('/remote')) return null
    return url.toString()
  } catch {
    return null
  }
}

function submitUrlInput(): void {
  urlError.value = ''
  const url = normalizeRemoteUrl(urlInput.value)
  if (!url) {
    urlError.value = '请粘贴 ZCode「移动端远程控制」生成的链接（https://zcode.z.ai/remote/...）'
    return
  }
  createInstance(url)
}

function createInstance(url: string): void {
  instances.value.unshift({
    alias: aliasInput.value.trim() || `ZCode 实例 ${instances.value.length + 1}`,
    url,
    remoteId: extractRemoteId(url),
    createdAt: Date.now(),
  })
  saveInstances()
  resetAddPanel()
}

function resetAddPanel(): void {
  showAddPanel.value = false
  aliasInput.value = ''
  urlInput.value = ''
  urlError.value = ''
}

function removeInstance(index: number): void {
  instances.value.splice(index, 1)
  saveInstances()
}

/** 应用内原生浏览器打开官方页（系统级浏览器组件，关闭即回 App；H5 开发态回退 window.open） */
async function openInstance(url: string): Promise<void> {
  if (isNativePlatform) {
    await Browser.open({ url }).catch(() => undefined)
    return
  }
  window.open(url, '_blank', 'noopener')
}

async function pasteFromClipboard(): Promise<void> {
  try {
    const { Clipboard } = await import('@capacitor/clipboard')
    const { value } = await Clipboard.read()
    if (value) urlInput.value = value.trim()
    urlError.value = ''
  } catch {
    urlError.value = '读取剪贴板失败，请手动粘贴链接'
  }
}

/** 扫码识别结果：ZCode 链接直接填入输入框，其余内容提示无效 */
function handleScanDetect(raw: string): void {
  showScanner.value = false
  const url = normalizeRemoteUrl(raw)
  if (!url) {
    urlError.value = '识别到的二维码不是 ZCode 远程控制链接'
    return
  }
  urlInput.value = url
  urlError.value = ''
}

const instanceCount = computed(() => instances.value.length)
</script>

<template>
  <div class="page-container zcode-page">
    <AppNavBar title="ZCode 实例" :show-back="true" />

    <div class="zcode-page__intro">扫码或粘贴官方远程控制链接，一键回到电脑工作区。</div>

    <div v-if="instanceCount === 0" class="zcode-page__empty card">
      <span>还没有实例。点击下方按钮，扫码或粘贴 ZCode「移动端远程控制」链接创建。</span>
    </div>

    <div
      v-for="(item, index) in instances"
      :key="item.url"
      class="zcode-card card"
      @click="openInstance(item.url)"
    >
      <div class="zcode-card__body">
        <span class="zcode-card__alias">{{ item.alias }}</span>
        <span class="zcode-card__meta">
          {{ item.remoteId ? `ID ${item.remoteId}` : '远程控制链接' }}
        </span>
      </div>
      <div class="zcode-card__open">打开</div>
      <div class="zcode-card__remove" @click.stop="removeInstance(index)">✕</div>
    </div>

    <div class="zcode-page__add" @click="showAddPanel = !showAddPanel">
      {{ showAddPanel ? '收起添加面板' : '添加实例' }}
    </div>

    <div v-if="showAddPanel" class="zcode-add card">
      <span class="zcode-add__label">别名（可选）</span>
      <input v-model="aliasInput" class="zcode-add__input" placeholder="例如：公司电脑" />

      <span class="zcode-add__label">远程控制链接</span>
      <textarea
        v-model="urlInput"
        class="zcode-add__textarea"
        placeholder="https://zcode.z.ai/remote/v4?..."
      />
      <span v-if="urlError" class="zcode-add__error">{{ urlError }}</span>

      <div class="zcode-add__actions">
        <div class="zcode-add__action" @click="pasteFromClipboard">粘贴链接</div>
        <div class="zcode-add__action" @click="showScanner = true">扫码二维码</div>
        <div class="zcode-add__action zcode-add__action--primary" @click="submitUrlInput">
          创建实例
        </div>
      </div>
    </div>

    <ZcodeScannerOverlay
      v-if="showScanner"
      @detect="handleScanDetect"
      @close="showScanner = false"
    />
  </div>
</template>

<style scoped lang="scss">
.zcode-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.zcode-page__intro {
  padding: 0 30rpx 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
  line-height: 1.5;
}

.zcode-page__empty {
  margin-top: 24rpx;
  padding: 32rpx;
  font-size: 26rpx;
  color: #8c8c8c;
  line-height: 1.6;
}

.zcode-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
  padding: 28rpx 24rpx;
  cursor: pointer;
}

.zcode-card__body {
  flex: 1;
  min-width: 0;
}

.zcode-card__alias {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.zcode-card__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8c8c8c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zcode-card__open {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(0, 117, 74, 0.12);
  color: #00754a;
  font-size: 26rpx;
  font-weight: 600;
}

.zcode-card__remove {
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b0b0b0;
  font-size: 26rpx;
}

.zcode-page__add {
  margin: 32rpx 30rpx 0;
  padding: 22rpx 0;
  border-radius: 999rpx;
  background: #00754a;
  color: #ffffff;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
}

.zcode-add {
  margin-top: 24rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}

.zcode-add__label {
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.zcode-add__input,
.zcode-add__textarea {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 20rpx;
  padding: 20rpx 24rpx;
  background: #f5f6f7;
  border: 2rpx solid transparent;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #1a1a1a;
  resize: none;
  outline: none;
}

.zcode-add__input:focus,
.zcode-add__textarea:focus {
  background: #ffffff;
  border-color: rgba(0, 117, 74, 0.55);
}

.zcode-add__error {
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #ff4d4f;
  line-height: 1.5;
}

.zcode-add__actions {
  display: flex;
  gap: 16rpx;
}

.zcode-add__action {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 999rpx;
  background: #f0f0f0;
  color: #00754a;
  font-size: 26rpx;
  text-align: center;
}

.zcode-add__action--primary {
  background: #00754a;
  color: #ffffff;
  font-weight: 600;
}
</style>
