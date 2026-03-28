<script setup lang="ts">
import { CATEGORIES } from '@/types'
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-[var(--accent)] mb-2">🐢 Turtle WoW AtlasLoot</h1>
      <p class="text-[var(--text-secondary)]">
        Browse loot tables, crafting recipes, faction rewards, and more from Turtle WoW.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <router-link
        v-for="cat in CATEGORIES"
        :key="cat.key"
        :to="`/${cat.key}`"
        class="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-colors group"
      >
        <div class="text-3xl mb-3">{{ cat.icon }}</div>
        <h2 class="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
          {{ cat.label }}
        </h2>
        <p class="text-sm text-[var(--text-secondary)] mt-1">{{ cat.description }}</p>
      </router-link>
    </div>
  </div>
</template>
