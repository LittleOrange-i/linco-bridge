<script setup lang="ts">
defineProps<{
  label: string
  canPreview?: boolean
  showPreview?: boolean
}>()

const emit = defineEmits<{
  copy: []
  togglePreview: [showPreview: boolean]
}>()
</script>

<template>
  <div class="artifact-block-header">
    <span class="artifact-block-header__label">{{ label }}</span>
    <div class="artifact-block-header__actions">
      <div v-if="canPreview" class="artifact-block-header__mode">
        <div
          class="artifact-block-header__mode-btn"
          :class="{ 'artifact-block-header__mode-btn--active': !showPreview }"
          @click="emit('togglePreview', false)"
        >
          <span class="artifact-block-header__mode-text">代码</span>
        </div>
        <div
          class="artifact-block-header__mode-btn"
          :class="{ 'artifact-block-header__mode-btn--active': showPreview }"
          @click="emit('togglePreview', true)"
        >
          <span class="artifact-block-header__mode-text">预览</span>
        </div>
      </div>
      <div class="artifact-block-header__copy" @click="emit('copy')">
        <span class="artifact-block-header__copy-text">复制</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.artifact-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68rpx;
  padding: 0 16rpx;
  background: #f5f5f5;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.artifact-block-header__label {
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.55);
  text-transform: lowercase;
}

.artifact-block-header__actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.artifact-block-header__mode {
  display: flex;
  align-items: center;
  padding: 4rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.05);
}

.artifact-block-header__mode-btn {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}

.artifact-block-header__mode-btn--active {
  background: #ffffff;
}

.artifact-block-header__mode-text {
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.55);
}

.artifact-block-header__mode-btn--active .artifact-block-header__mode-text {
  color: rgba(0, 0, 0, 0.85);
}

.artifact-block-header__copy {
  padding: 6rpx 12rpx;
}

.artifact-block-header__copy-text {
  font-size: 22rpx;
  color: #00754a;
}
</style>
