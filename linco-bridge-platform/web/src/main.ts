import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from '@/router'
import { vFocus } from '@/directives/v-focus'
import { installUniCompat } from '@/utils/uni-compat'
import { mountAppOverlayHost } from '@/utils/mount-app-overlay'
import './styles/global.scss'
import 'highlight.js/styles/github.css'

installUniCompat()

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)
app.directive('focus', vFocus)
app.mount('#app')
mountAppOverlayHost(pinia)
