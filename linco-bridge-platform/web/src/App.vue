<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onLaunch } from '@/composables/uni-lifecycle'
import { ensureVisitorSession } from '@/api/visitor-api'

onLaunch(() => {
  void ensureVisitorSession().catch(() => undefined)
})
</script>

<style lang="scss">
@use './styles/global';
</style>
