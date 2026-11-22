<script setup lang="ts">
import AppTabBar from '@/components/AppTabBar.vue'
import BridgeSourceCard from '@/components/BridgeSourceCard.vue'
import { BRIDGE_SOURCE_CARDS } from '@/bridge/constants'
import type { BridgeSourceCard as BridgeSourceCardType } from '@/bridge/types'
import { navigateOnce } from '@/utils/navigate-once'
import { getCustomNavPagePaddingStyle } from '@/utils/page-safe-area'

const pageSafeStyle = getCustomNavPagePaddingStyle()

/** ZCode 入口卡片图标（static 资源用动态绑定，避免静态 src 被构建器当作模块导入） */
const ZCODE_ENTRY_ICON = '/static/icons/bot/zcode.png'

function handleSelect(item: BridgeSourceCardType) {
  navigateOnce(item.route)
}

/** ZCode 实例管理入口：扫码/粘贴官方远程控制链接收藏 */
function handleZcodeEntry() {
  navigateOnce('/pages/zcode/index')
}
</script>

<template>
  <div class="page-container with-tabbar bridge-page" :style="pageSafeStyle">
    <div class="bridge-page__list">
      <BridgeSourceCard
        v-for="item in BRIDGE_SOURCE_CARDS"
        :key="item.type"
        :item="item"
        @select="handleSelect"
      />

      <!-- ZCode 实例入口：扫码/粘贴官方远程控制链接收藏，点击进入实例管理 -->
      <div class="bridge-page__zcode" @click="handleZcodeEntry">
        <div class="bridge-page__zcode-icon">
          <img class="bridge-page__zcode-icon-img" :src="ZCODE_ENTRY_ICON" alt="" />
        </div>
        <div class="bridge-page__zcode-body">
          <span class="bridge-page__zcode-title">ZCode 实例</span>
          <span class="bridge-page__zcode-subtitle">扫码收藏官方远程控制链接</span>
        </div>
        <span class="bridge-page__zcode-chevron">›</span>
      </div>
    </div>
    <AppTabBar />
  </div>
</template>

<style scoped lang="scss">
.bridge-page {
  background: #ffffff;
}

.bridge-page__list {
  padding: 16rpx 30rpx 24rpx;
}

/* ZCode 入口卡片：外观对齐 BridgeSourceCard（复用其卡片观感） */
.bridge-page__zcode {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  border: 1rpx solid #ebedf0;
  border-radius: 16rpx;
  box-sizing: border-box;
  cursor: pointer;
}

.bridge-page__zcode-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.bridge-page__zcode-icon-img {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
}

.bridge-page__zcode-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.bridge-page__zcode-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.bridge-page__zcode-subtitle {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #8c8c8c;
}

.bridge-page__zcode-chevron {
  flex-shrink: 0;
  font-size: 40rpx;
  color: #c0c4cc;
}
</style>
