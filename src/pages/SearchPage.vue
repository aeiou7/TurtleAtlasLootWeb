<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { CATEGORIES, type LootItem } from '@/types'
import { qualityClass } from '@/utils/icons'
import ItemIcon from '@/components/loot/ItemIcon.vue'
import ItemTooltip from '@/components/loot/ItemTooltip.vue'
import { useTooltip } from '@/composables/useTooltip'

const route = useRoute()
const store = useDataStore()
const searching = ref(false)
const results = ref<Array<LootItem & { tableKey: string; tableTitle: string }>>([])
const query = ref('')

function itemQuality(item: LootItem): number {
  return store.resolveQuality(item.id, item.quality)
}

const {
  visible, tooltipData, activeItem, tooltipX, tooltipY, isTouch,
  onItemMouseEnter, onItemMouseMove, onItemMouseLeave,
  onItemTouchStart, dismissTooltip,
} = useTooltip()

async function doSearch(q: string) {
  if (!q || q.length < 2) {
    results.value = []
    return
  }
  searching.value = true
  results.value = []

  const allData = await store.loadAllItemData()
  const register = await store.loadTableRegister()
  const lowerQ = q.toLowerCase()
  const found: typeof results.value = []

  for (const [, tables] of Object.entries(allData)) {
    for (const [tableKey, items] of Object.entries(tables)) {
      for (const item of items) {
        if (item.quality === 6) continue // skip headers
        if (item.name.toLowerCase().includes(lowerQ)) {
          const title = register?.[tableKey]?.title ?? tableKey
          found.push({ ...item, tableKey, tableTitle: title })
        }
      }
    }
  }

  // Sort: exact matches first, then by quality desc, then alphabetically
  found.sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerQ ? 0 : 1
    const bExact = b.name.toLowerCase() === lowerQ ? 0 : 1
    if (aExact !== bExact) return aExact - bExact
    if (b.quality !== a.quality) return b.quality - a.quality
    return a.name.localeCompare(b.name)
  })

  results.value = found.slice(0, 200) // Limit for performance
  searching.value = false
}

onMounted(() => {
  query.value = (route.query.q as string) ?? ''
  if (query.value) doSearch(query.value)
})

watch(() => route.query.q, (newQ) => {
  query.value = (newQ as string) ?? ''
  if (query.value) doSearch(query.value)
})
</script>

<template>
  <div>
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
      <router-link to="/" class="hover:text-[var(--accent)]">Home</router-link>
      <span>/</span>
      <span class="text-[var(--text-primary)]">Search</span>
    </div>

    <h1 class="text-2xl font-bold text-[var(--accent)] mb-4">
      Search Results
      <span v-if="query" class="text-lg font-normal text-[var(--text-secondary)]">
        for "{{ query }}"
      </span>
    </h1>

    <div v-if="searching" class="text-[var(--text-secondary)]">Searching...</div>

    <div v-else-if="results.length === 0 && query" class="text-[var(--text-secondary)]">
      No items found matching "{{ query }}".
    </div>

    <div v-else class="space-y-1">
      <div class="text-sm text-[var(--text-secondary)] mb-3">
        {{ results.length }} result{{ results.length !== 1 ? 's' : '' }} found
        <span v-if="results.length >= 200">(showing first 200)</span>
      </div>

      <div
        v-for="(item, idx) in results"
        :key="idx"
        class="flex items-center gap-3 py-2 px-3 rounded hover:bg-[var(--bg-tertiary)] transition-colors cursor-default"
        @mouseenter="onItemMouseEnter(item, $event)"
        @mousemove="onItemMouseMove($event)"
        @mouseleave="onItemMouseLeave()"
        @touchstart="onItemTouchStart(item, $event)"
      >
        <ItemIcon :icon="item.icon" :quality="itemQuality(item)" />
        <div class="flex-1 min-w-0">
          <div :class="['font-medium truncate', qualityClass(itemQuality(item))]">
            {{ item.name }}
          </div>
          <div class="text-xs text-[var(--text-secondary)] truncate">
            {{ item.description }}
            <span v-if="item.tableTitle" class="ml-2 opacity-75">— {{ item.tableTitle }}</span>
          </div>
        </div>
        <div v-if="item.dropRate" class="text-xs text-[var(--text-secondary)] shrink-0 mr-1">
          {{ item.dropRate }}
        </div>
        <a
          v-if="item.id"
          :href="`https://database.turtlecraft.gg/?item=${item.id}`"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0 p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="View on database"
          @click.stop
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Touch-mode backdrop -->
    <Teleport to="body">
      <div
        v-if="visible && isTouch"
        class="fixed inset-0 z-[9998]"
        @touchstart="dismissTooltip()"
      />
    </Teleport>

    <ItemTooltip
      v-if="visible && activeItem"
      :tooltip="tooltipData"
      :item="activeItem"
      :x="tooltipX"
      :y="tooltipY"
    />
  </div>
</template>
