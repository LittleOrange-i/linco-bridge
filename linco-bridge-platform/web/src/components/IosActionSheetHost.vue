<script setup lang="ts">
import { iosActionSheetState, resolveIosActionSheet } from '@/utils/ios-action-sheet'

function handleSelect(index: number) {
  resolveIosActionSheet(index)
}

function handleCancel() {
  resolveIosActionSheet(null)
}

function handleBackdrop() {
  resolveIosActionSheet(null)
}
</script>

<template>
  <div v-if="iosActionSheetState.visible" class="ios-sheet-root" @touchmove.stop.prevent>
    <div class="ios-sheet-backdrop" @click="handleBackdrop" />

    <div class="ios-sheet-panel">
      <div class="uni-scroll-view ios-sheet-group ios-sheet-group--actions">
        <div
          v-for="(label, index) in iosActionSheetState.items"
          :key="`${label}-${index}`"
          class="ios-sheet-item"
          :class="{ 'ios-sheet-item--last': index === iosActionSheetState.items.length - 1 }"
          @click="handleSelect(index)"
        >
          <span class="ios-sheet-item__text">{{ label }}</span>
        </div>
      </div>

      <div class="ios-sheet-group ios-sheet-group--cancel">
        <div class="ios-sheet-item ios-sheet-item--last" @click="handleCancel">
          <span class="ios-sheet-item__text ios-sheet-item__text--cancel">
            {{ iosActionSheetState.cancelText }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ios-sheet-root {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  pointer-events: auto;
}

.ios-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.ios-sheet-panel {
  position: relative;
  z-index: 1;
  padding: 0 16rpx calc(16rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.ios-sheet-group {
  overflow: hidden;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
}

.ios-sheet-group--actions {
  max-height: 60vh;
  margin-bottom: 16rpx;
}

.ios-sheet-group--cancel {
  margin-bottom: 0;
}

.ios-sheet-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 112rpx;
  padding: 0 32rpx;
  background: #ffffff;
}

.ios-sheet-item:not(.ios-sheet-item--last)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  transform: scaleY(0.5);
  background: rgba(60, 60, 67, 0.29);
}

.ios-sheet-item:active {
  background: rgba(0, 0, 0, 0.04);
}

.ios-sheet-item__text {
  font-size: 34rpx;
  line-height: 1.25;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.88);
  text-align: center;
}

.ios-sheet-item__text--cancel {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
</style>
