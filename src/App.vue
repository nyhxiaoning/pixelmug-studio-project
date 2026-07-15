<script setup lang="ts">
/**
 * 应用程序根组件
 * 提供全局布局容器和路由出口
 */
import { Button } from '@/components/ui/button'
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <Button>Click me</Button>

    <router-view />
  </div>
</template>

<style scoped>
#app {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
