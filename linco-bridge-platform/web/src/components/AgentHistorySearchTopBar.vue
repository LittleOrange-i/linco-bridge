<script setup lang="ts">
import AppSearchBar from '@/components/AppSearchBar.vue'
import { SEARCH_ICON } from '@/constants/search-icons'

defineProps<{
  isSearchMode: boolean
  isBatchMode: boolean
  allSelected: boolean
  keyword: string
  searchFocused: boolean
}>()

const emit = defineEmits<{
  'update:keyword': [value: string]
  back: []
  batchTap: []
  cancelSearch: []
  cancelBatch: []
  toggleAll: []
  searchFocus: []
  searchConfirm: [value: string]
  searchTap: []
  searchClear: []
}>()
</script>

<template>
  <div v-if="isBatchMode" class="history-top history-top--batch">
    <div class="history-top__select-all" @click="emit('toggleAll')">
      <div class="history-top__circle" :class="{ 'history-top__circle--selected': allSelected }">
        <span v-if="allSelected" class="history-top__checkmark">✓</span>
      </div>
      <span class="history-top__select-all-text">全选</span>
    </div>
    <span class="history-top__text-btn" @click="emit('cancelBatch')">取消</span>
  </div>

  <div v-else class="history-top">
    <div v-if="isSearchMode" class="history-top__leading-spacer" />
    <div v-else class="history-top__icon-btn" @click="emit('back')">
      <span class="history-top__back-icon">‹</span>
    </div>

    <div class="history-top__search">
      <AppSearchBar
        v-focus="searchFocused"
        :model-value="keyword"
        hint-text="搜索历史对话"
        @update:model-value="emit('update:keyword', $event)"
        @focus="emit('searchFocus')"
        @keydown.enter="emit('searchConfirm', $event)"
        @click="emit('searchTap')"
        @clear="emit('searchClear')"
      />
    </div>

    <span v-if="isSearchMode" class="history-top__text-btn" @click="emit('cancelSearch')"
      >取消</span
    >
    <div v-else class="history-top__icon-btn" @click="emit('batchTap')">
      <img class="history-top__more-icon" :src="SEARCH_ICON.more" />
    </div>
    <div v-if="isSearchMode" class="history-top__trailing-spacer" />
  </div>
</template>

<style scoped lang="scss">
.history-top {
  display: flex;
  align-items: center;
  height: 104rpx;
  box-sizing: border-box;
}

.history-top--batch {
  justify-content: space-between;
  padding: 0 32rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.08);
}

.history-top__leading-spacer {
  flex-shrink: 0;
  width: 32rpx;
}

.history-top__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
}

.history-top__back-icon {
  font-size: 40rpx;
  font-weight: 300;
  line-height: 1;
  color: #1a1a1a;
}

.history-top__search {
  flex: 1;
  min-width: 0;
}

.history-top__more-icon {
  width: 40rpx;
  height: 40rpx;
}

.history-top__text-btn {
  flex-shrink: 0;
  padding: 0 8rpx;
  font-size: 28rpx;
  line-height: 96rpx;
  color: #5f5a54;
}

.history-top__trailing-spacer {
  flex-shrink: 0;
  width: 8rpx;
}

.history-top__select-all {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  padding-right: 16rpx;
}

.history-top__select-all-text {
  margin-left: 12rpx;
  font-size: 28rpx;
  color: #5f5a54;
}

.history-top__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  border: 2rpx solid #b8b8b8;
  border-radius: 50%;
}

.history-top__circle--selected {
  border-color: #00754a;
  background: #00754a;
}

.history-top__checkmark {
  font-size: 18rpx;
  line-height: 1;
  color: #ffffff;
}
</style>
