<script setup lang="ts">
import { useRoute } from 'vue-router'
import { CATEGORIES } from '@/types'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()

function isActive(categoryKey: string): boolean {
  return route.params.category === categoryKey
}
</script>

<template>
  <!-- Overlay for mobile -->
  <div
    v-if="open"
    class="fixed inset-0 bg-black/50 z-30 md:hidden"
    @click="$emit('close')"
  />

  <aside
    :class="[
      'w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] overflow-y-auto shrink-0 z-40',
      'transition-transform duration-200 flex flex-col',
      'fixed md:static inset-y-0 left-0 pt-14 md:pt-0',
      open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
  >
    <nav class="p-3">
      <div class="text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-2 px-3 font-medium">
        Categories
      </div>
      <router-link
        v-for="cat in CATEGORIES"
        :key="cat.key"
        :to="`/${cat.key}`"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          isActive(cat.key)
            ? 'bg-[var(--bg-tertiary)] text-white'
            : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:text-white',
        ]"
        @click="$emit('close')"
      >
        <CategoryIcon :category="cat.key" class="w-5 h-5" />
        <span>{{ cat.label }}</span>
      </router-link>

      <!-- Tools section -->
      <div class="text-xs uppercase tracking-wider text-[var(--text-secondary)] mt-4 mb-2 px-3 font-medium">
        Tools
      </div>
      <router-link
        to="/item-finder"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          route.name === 'itemFinder'
            ? 'bg-[var(--bg-tertiary)] text-white'
            : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:text-white',
        ]"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
        </svg>
        <span>Item Finder</span>
      </router-link>
    </nav>

    <div class="mt-auto p-3 border-t border-[var(--border)]">
      <a
        href="https://github.com/MrDobby92/TurtleAtlasLootWeb/issues"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white transition-colors"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zM9 13a1 1 0 112 0 1 1 0 01-2 0z" clip-rule="evenodd" />
        </svg>
        <span>Feedback</span>
      </a>
    </div>
  </aside>
</template>
