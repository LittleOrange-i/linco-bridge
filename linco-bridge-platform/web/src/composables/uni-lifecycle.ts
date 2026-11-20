import { onBeforeUnmount, onActivated, onDeactivated, onMounted } from 'vue'
import { useRoute } from 'vue-router'

type Query = Record<string, string | string[] | undefined>
type QueryCallback = (query: Query) => void
type LifecycleCallback = () => void

function normalizeQuery(query: Query): Query {
  return { ...query }
}

function registerQueryHook(hook: (callback: () => void) => void, callback?: QueryCallback): void {
  if (!callback) return
  const route = useRoute()
  hook(() => callback(normalizeQuery(route.query as Query)))
}

export function onLoad(callback: QueryCallback): void {
  registerQueryHook(onMounted, callback)
}

export function onShow(callback: LifecycleCallback): void {
  onMounted(callback)
  onActivated(callback)
}

export function onHide(callback: LifecycleCallback): void {
  onDeactivated(callback)
  onBeforeUnmount(callback)
}

export function onUnload(callback: LifecycleCallback): void {
  onBeforeUnmount(callback)
}

export function onLaunch(callback: LifecycleCallback): void {
  onMounted(callback)
}

export function onReady(callback: LifecycleCallback): void {
  onMounted(callback)
}
