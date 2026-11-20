<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { TAB_ITEMS, switchRootTab, type TabKey } from '@/constants/tabbar'

const route = useRoute()

const activeKey = computed<TabKey>(
  () => TAB_ITEMS.find((item) => route.path === item.route)?.key ?? 'messages',
)

function iconFor(item: (typeof TAB_ITEMS)[number]): string {
  return `/static/tabbar/${item.key}${activeKey.value === item.key ? '-active' : ''}.png`
}
</script>

<template>
  <div class="app-tabbar">
    <div
      v-for="item in TAB_ITEMS"
      :key="item.key"
      class="app-tabbar__item"
      :class="{ 'app-tabbar__item--active': activeKey === item.key }"
      @click="switchRootTab(item.key)"
    >
      <img class="app-tabbar__icon" :src="iconFor(item)" alt="" />
      <span class="app-tabbar__label">{{ item.label }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: stretch;
  height: calc(100rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #ffffff;
  border-top: 1px solid #ebedf0;
}

.app-tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  cursor: pointer;
}

.app-tabbar__icon {
  width: 48rpx;
  height: 48rpx;
}

.app-tabbar__label {
  font-size: 20rpx;
  line-height: 1;
  color: #999999;
}

.app-tabbar__item--active .app-tabbar__label {
  color: #00754a;
}
</style>
