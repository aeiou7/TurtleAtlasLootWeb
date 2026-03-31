<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'

const store = useDataStore()
const ready = ref(false)
const sidebarOpen = ref(false)

onMounted(async () => {
  await store.init()
  ready.value = true
})
</script>

<template>
  <div class="h-screen flex flex-col">
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
    <div class="flex flex-1 overflow-hidden">
      <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <template v-if="ready">
          <router-view />
        </template>
        <div v-else class="flex items-center justify-center h-64">
          <div class="text-[var(--text-secondary)]">Loading data...</div>
        </div>
      </main>
    </div>
  </div>
</template>
