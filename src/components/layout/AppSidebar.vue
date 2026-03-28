<script setup lang="ts">
import { useRoute } from 'vue-router'
import { CATEGORIES } from '@/types'

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
      'transition-transform duration-200',
      'fixed md:static inset-y-0 left-0 pt-14 md:pt-0',
      open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
  >
    <nav class="p-3">
      <div class="text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-2 px-3">
        Categories
      </div>
      <router-link
        v-for="cat in CATEGORIES"
        :key="cat.key"
        :to="`/${cat.key}`"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          isActive(cat.key)
            ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
            : 'text-[var(--text-primary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent)]',
        ]"
        @click="$emit('close')"
      >
        <span class="text-lg">{{ cat.icon }}</span>
        <span>{{ cat.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>
