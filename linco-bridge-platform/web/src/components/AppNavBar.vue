<script setup lang="ts">
import { getCustomNavBarPaddingStyle } from '@/utils/page-safe-area'

defineProps<{
  title?: string
  showBack?: boolean
}>()

const emit = defineEmits<{
  back: []
}>()

const navBarSafeStyle = getCustomNavBarPaddingStyle()

function handleBack() {
  emit('back')
  uni.navigateBack()
}
</script>

<template>
  <div class="nav-bar" :style="navBarSafeStyle">
    <div class="nav-bar__inner">
      <div v-if="showBack" class="nav-bar__back" @click="handleBack">
        <span class="nav-bar__back-icon">‹</span>
      </div>
      <span v-if="title" class="nav-bar__title">{{ title }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.nav-bar {
  background: #f5f5f5;
}

.nav-bar__inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-bar__title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.nav-bar__back {
  position: absolute;
  left: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
}

.nav-bar__back-icon {
  font-size: 48rpx;
  line-height: 1;
  color: #1a1a1a;
}
</style>
