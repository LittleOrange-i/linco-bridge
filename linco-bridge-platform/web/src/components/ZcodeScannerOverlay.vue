<script setup lang="ts">
// 全屏遮罩式扫码层：视频铺满屏幕 + 中央取景框 + 周围压暗，
// getUserMedia 拉高清视频流，jsQR 逐帧解码，识别到 ZCode 链接后向上抛出。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import jsQR from 'jsqr'

const emit = defineEmits<{
  detect: [url: string]
  close: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const errorText = ref('')

let stream: MediaStream | null = null
let frameHandle = 0

/** 高清视频约束：低分辨率流会导致成像模糊、二维码无法解码 */
async function openCamera(): Promise<void> {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
      frameHandle = requestAnimationFrame(scanTick)
    }
  } catch {
    errorText.value = '无法打开相机：请确认已授权相机权限后重试'
  }
}

function scanTick(): void {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas) return

  if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        emit('detect', code.data)
        return
      }
    }
  }
  frameHandle = requestAnimationFrame(scanTick)
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

function stopCamera(): void {
  cancelAnimationFrame(frameHandle)
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

onMounted(() => void openCamera())
onBeforeUnmount(() => stopCamera())
</script>

<template>
  <div class="scan-overlay">
    <video ref="videoRef" class="scan-overlay__video" playsinline muted />
    <canvas ref="canvasRef" hidden />

    <!-- 遮罩：四周压暗 + 中央取景框 -->
    <div class="scan-overlay__mask" />
    <div class="scan-overlay__frame">
      <span class="scan-overlay__corner scan-overlay__corner--tl" />
      <span class="scan-overlay__corner scan-overlay__corner--tr" />
      <span class="scan-overlay__corner scan-overlay__corner--bl" />
      <span class="scan-overlay__corner scan-overlay__corner--br" />
    </div>

    <span class="scan-overlay__hint">对准 ZCode 桌面端的远程控制二维码</span>
    <span v-if="errorText" class="scan-overlay__error">{{ errorText }}</span>

    <div class="scan-overlay__close" @click="emit('close')">✕ 关闭</div>
  </div>
</template>

<style scoped lang="scss">
.scan-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #000000;
}

.scan-overlay__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-overlay__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
}

.scan-overlay__frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 520rpx;
  height: 520rpx;
  transform: translate(-50%, -58%);
  box-shadow: 0 0 0 200vmax rgba(0, 0, 0, 0.55);
  border-radius: 32rpx;
}

.scan-overlay__corner {
  position: absolute;
  width: 56rpx;
  height: 56rpx;
  border: 8rpx solid #00754a;

  &--tl {
    top: 0;
    left: 0;
    border-right: none;
    border-bottom: none;
    border-top-left-radius: 32rpx;
  }

  &--tr {
    top: 0;
    right: 0;
    border-left: none;
    border-bottom: none;
    border-top-right-radius: 32rpx;
  }

  &--bl {
    bottom: 0;
    left: 0;
    border-right: none;
    border-top: none;
    border-bottom-left-radius: 32rpx;
  }

  &--br {
    bottom: 0;
    right: 0;
    border-left: none;
    border-top: none;
    border-bottom-right-radius: 32rpx;
  }
}

.scan-overlay__hint {
  position: absolute;
  top: calc(50% + 280rpx);
  left: 0;
  right: 0;
  text-align: center;
  color: #ffffff;
  font-size: 26rpx;
}

.scan-overlay__error {
  position: absolute;
  top: calc(50% + 320rpx);
  left: 40rpx;
  right: 40rpx;
  text-align: center;
  color: #ff7875;
  font-size: 24rpx;
}

.scan-overlay__close {
  position: absolute;
  top: calc(24rpx + env(safe-area-inset-top));
  right: 32rpx;
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 26rpx;
}
</style>
