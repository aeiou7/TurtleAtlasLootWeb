<script setup lang="ts">
import { CATEGORIES } from '@/types'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Turtle WoW AtlasLoot</h1>
      <p class="text-[var(--text-secondary)]">
        Browse loot tables, crafting recipes, faction rewards, and more from Turtle WoW.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <router-link
        v-for="cat in CATEGORIES"
        :key="cat.key"
        :to="`/${cat.key}`"
        class="bg-[var(--bg-card)] border-t border-b border-t-[var(--border-card-top)] border-b-[var(--border-card-bottom)] border-x-0 rounded-lg p-5 shadow-[var(--shadow-card)] hover:bg-[var(--bg-hover)] transition-colors group"
      >
        <CategoryIcon :category="cat.key" class="w-8 h-8 text-[var(--accent)]" />
        <h2 class="text-lg font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors">
          {{ cat.label }}
        </h2>
        <p class="text-sm text-[var(--text-secondary)] mt-1">{{ cat.description }}</p>
      </router-link>
    </div>
  </div>
</template>
