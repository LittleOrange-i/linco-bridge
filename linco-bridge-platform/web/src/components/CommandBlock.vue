<script setup lang="ts">
import { computed, ref } from 'vue'
import { copyToClipboard, showToast } from '@/utils/format'

const props = defineProps<{
  commands: string
}>()

const emit = defineEmits<{
  copied: []
}>()

// 完整命令默认折叠：长命令对新手用户不友好，只保留引导文案与大按钮
const showRaw = ref(false)

// 统计非空命令行数，用于折叠态的简述文案
const commandCount = computed(
  () => props.commands.split('\n').filter(line => line.trim()).length,
)

async function handleCopy() {
  try {
    await copyToClipboard(props.commands)
    showToast('已复制全部命令', 'success')
    emit('copied')
  } catch {
    showToast('复制失败')
  }
}
</script>

<template>
  <div class="command-block card">
    <div class="command-block__header">
      <span class="command-block__label">在电脑上运行命令</span>
      <div v-if="showRaw" class="command-block__copy" @click="handleCopy">
        <span>复制</span>
      </div>
    </div>
    <span class="command-block__guide">
      看不懂命令没关系：点下方按钮复制全部（共 {{ commandCount }} 条），
      到电脑终端粘贴并回车即可，无需手动输入。
    </span>
    <div class="command-block__copy-all" @click="handleCopy">复制全部命令</div>
    <div class="command-block__toggle" @click="showRaw = !showRaw">
      {{ showRaw ? '收起完整命令 ▴' : '查看完整命令 ▾' }}
    </div>
    <span v-if="showRaw" class="command-block__content" selectable>{{ commands }}</span>
  </div>
</template>

<style scoped lang="scss">
.command-block {
  padding: 24rpx;
}

.command-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.command-block__label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.command-block__copy {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #f0f0f0;
  font-size: 24rpx;
  color: #00754a;
}

.command-block__guide {
  display: block;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: #8c8c8c;
  line-height: 1.5;
}

.command-block__copy-all {
  padding: 22rpx 0;
  border-radius: 999rpx;
  background: #00754a;
  color: #ffffff;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
}

.command-block__toggle {
  margin-top: 20rpx;
  text-align: center;
  font-size: 24rpx;
  color: #00754a;
}

.command-block__content {
  display: block;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #ebedf0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 24rpx;
  line-height: 1.6;
  color: #434343;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
