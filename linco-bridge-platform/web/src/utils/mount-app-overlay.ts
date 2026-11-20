import { createSSRApp } from 'vue'
import type { Pinia } from 'pinia'

import AppOverlayHost from '@/components/AppOverlayHost.vue'

let overlayMounted = false

/** Vue Web：独立挂载到 body，避免与路由层叠冲突 */
export function mountAppOverlayHost(pinia: Pinia): void {
  if (overlayMounted || typeof document === 'undefined') return
  overlayMounted = true

  const mountEl = document.createElement('div')
  mountEl.id = 'app-overlay-root'
  document.body.appendChild(mountEl)

  const hostApp = createSSRApp(AppOverlayHost)
  hostApp.use(pinia)
  hostApp.mount(mountEl)
}

export function mountAppOverlayHostForH5(pinia: Pinia): void {
  mountAppOverlayHost(pinia)
}

export function resetAppOverlayHostForTests(): void {
  overlayMounted = false
}
