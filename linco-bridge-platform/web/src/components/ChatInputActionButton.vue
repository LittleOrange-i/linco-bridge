<script setup lang="ts">
import { computed } from 'vue'
import {
  CHAT_ICON,
  CHAT_INPUT_ICON_SIZE_RPX,
  CHAT_INPUT_SEND_SIZE_RPX,
} from '@/constants/chat-icons'
import { uniCompat } from '@/utils/uni-compat'

// inline style 里的 rpx 不会被 PostCSS 编译（浏览器不识别），需运行时换算成 px，
// 否则按钮容器尺寸声明失效、被图标内容撑爆
const rpxToPx = (value: number) => `${Math.round(uniCompat.upx2px(value))}px`

const props = withDefaults(
  defineProps<{
    canSend?: boolean
    isSendDisabled?: boolean
    isSending?: boolean
    /** 是否启用语音空态图标（依赖 Web SpeechRecognition，Capacitor 原生壳内应关闭） */
    voiceEnabled?: boolean
    voiceIconSizeRpx?: number
  }>(),
  {
    canSend: false,
    isSendDisabled: false,
    isSending: false,
    voiceEnabled: true,
    voiceIconSizeRpx: CHAT_INPUT_ICON_SIZE_RPX,
  },
)

const actionButtonSize = computed(() => ({
  width: rpxToPx(CHAT_INPUT_SEND_SIZE_RPX),
  height: rpxToPx(CHAT_INPUT_SEND_SIZE_RPX),
}))

const voiceIconSize = computed(() => ({
  width: rpxToPx(props.voiceIconSizeRpx),
  height: rpxToPx(props.voiceIconSizeRpx),
}))

const emit = defineEmits<{
  send: []
  stop: []
  voice: []
}>()

const canSubmit = computed(() => props.canSend && !props.isSendDisabled && !props.isSending)

const sendIconSrc = computed(() => (props.isSendDisabled ? CHAT_ICON.sendDisabled : CHAT_ICON.send))

function handleTap() {
  if (props.isSending) {
    emit('stop')
    return
  }
  if (props.canSend && props.isSendDisabled) return
  if (canSubmit.value) {
    emit('send')
    return
  }
  // 语音入口被裁剪（原生壳）时空态点击无操作
  if (!props.voiceEnabled) return
  emit('voice')
}
</script>

<template>
  <div
    class="chat-action-btn"
    :class="{
      'chat-action-btn--stop': isSending,
      'chat-action-btn--asset': !isSending,
    }"
    :style="actionButtonSize"
    @click="handleTap"
  >
    <span v-if="isSending" class="chat-action-btn__stop">■</span>
    <img v-else-if="canSend" class="chat-action-btn__send" :src="sendIconSrc" />
    <img
      v-else-if="!voiceEnabled"
      class="chat-action-btn__send"
      :src="CHAT_ICON.sendDisabled"
    />
    <img v-else class="chat-action-btn__voice" :style="voiceIconSize" :src="CHAT_ICON.voice" />
  </div>
</template>

<style scoped lang="scss">
.chat-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-action-btn--asset {
  background: transparent;
}

.chat-action-btn--stop {
  border-radius: 50%;
  background: #b53333;
  box-shadow: 0 4rpx 16rpx rgba(196, 74, 74, 0.25);
}

.chat-action-btn__send {
  width: 100%;
  height: 100%;
  display: block;
}

.chat-action-btn__stop {
  font-size: 28rpx;
  line-height: 1;
  color: #ffffff;
}

.chat-action-btn__voice {
  display: block;
}
</style>
