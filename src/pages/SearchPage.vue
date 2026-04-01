<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { CATEGORIES, type LootItem } from '@/types'
import { qualityClass } from '@/utils/icons'
import ItemIcon from '@/components/loot/ItemIcon.vue'
import ItemTooltip from '@/components/loot/ItemTooltip.vue'
import { useTooltip } from '@/composables/useTooltip'

const route = useRoute()
const router = useRouter()
const store = useDataStore()
const searching = ref(false)
const results = ref<Array<LootItem & { tableKey: string; tableTitle: string }>>([])
const query = ref('')
const slotFilter = ref('')
const typeFilter = ref('')
const dataFileToCategoryKey = new Map(CATEGORIES.map(category => [category.dataFile, category.key] as const))

const hasActiveFilter = computed(() => {
  return query.value && query.value.length >= 2
})

function itemQuality(item: LootItem): number {
  return store.resolveQuality(item.id, item.quality)
}

const {
  visible, tooltipData, activeItem, tooltipX, tooltipY, isTouch,
  onItemMouseEnter, onItemMouseMove, onItemMouseLeave,
  onItemTouchStart, dismissTooltip,
} = useTooltip()

async function doSearch() {
  const q = query.value

  if (!q || q.length < 2) {
    results.value = []
    return
  }

  searching.value = true
  results.value = []

  const [allData, filterMap] = await Promise.all([
    store.loadAllItemData(),
    store.loadFilterData(),
    store.loadNavigation(),
    store.loadButtonRegistry(),
    store.loadTableRegister(),
  ])

  const lowerQ = q.toLowerCase()
  const found: typeof results.value = []
  const seenIds = new Set<number>()

  for (const [dataFile, tables] of Object.entries(allData)) {
    const categoryKey = dataFileToCategoryKey.get(dataFile)
    const resolverCategory = categoryKey === 'crafting' ? categoryKey : undefined

    for (const [tableKey, items] of Object.entries(tables)) {
      const tableTitle = store.resolveLootTableLabel(tableKey, resolverCategory)

      for (const item of items) {
        if (item.quality === 6 || !item.name) continue

        if (!item.name.toLowerCase().includes(lowerQ)) continue

        // Validate against name collisions using filter data
        const entry = filterMap[String(item.id)]
        if (entry && entry.n && entry.n !== item.name) continue

        // Deduplicate by item ID
        if (seenIds.has(item.id)) continue
        seenIds.add(item.id)

        found.push({ ...item, tableKey, tableTitle })
      }
    }
  }

  found.sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerQ ? 0 : 1
    const bExact = b.name.toLowerCase() === lowerQ ? 0 : 1
    if (aExact !== bExact) return aExact - bExact
    const qA = store.resolveQuality(a.id, a.quality)
    const qB = store.resolveQuality(b.id, b.quality)
    if (qB !== qA) return qB - qA
    return a.name.localeCompare(b.name)
  })

  results.value = found.slice(0, 200)
  searching.value = false
}

function syncQueryParams() {
  const params: Record<string, string> = {}
  if (query.value) params.q = query.value
  router.replace({ path: '/search', query: params })
}

function onQueryInput() {
  syncQueryParams()
  doSearch()
}

onMounted(() => {
  query.value = (route.query.q as string) ?? ''
  if (hasActiveFilter.value) doSearch()
})

watch(() => route.query, (newQuery) => {
  const newQ = (newQuery.q as string) ?? ''
  if (newQ !== query.value) {
    query.value = newQ
    if (hasActiveFilter.value) doSearch()
    else results.value = []
  }
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

    <h1 class="text-2xl font-bold text-white mb-4">
      Search
    </h1>

    <!-- Search bar -->
    <div class="mb-6 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
      <div class="flex-1">
        <label class="block text-xs text-[var(--text-secondary)] mb-1">Item name</label>
        <input
          v-model="query"
          @input="onQueryInput"
          type="text"
          placeholder="Search items..."
          class="w-full px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div class="mt-2 text-xs text-[var(--text-secondary)]">
        Looking for advanced filters?
        <router-link to="/item-finder" class="text-[var(--accent)] hover:text-white transition-colors">
          Try Item Finder →
        </router-link>
      </div>
    </div>

    <div v-if="searching" class="text-[var(--text-secondary)]">Searching...</div>

    <div v-else-if="!hasActiveFilter" class="text-[var(--text-secondary)]">
      Enter a search term or select filters to browse items.
    </div>

    <div v-else-if="results.length === 0" class="text-[var(--text-secondary)]">
      No items found matching your criteria.
    </div>

    <div v-else class="space-y-1">
      <div class="text-sm text-[var(--text-secondary)] mb-3">
        {{ results.length }} result{{ results.length !== 1 ? 's' : '' }} found
        <span v-if="results.length >= 200">(showing first 200)</span>
      </div>

      <div
        v-for="(item, idx) in results"
        :key="idx"
        class="flex items-center gap-3 py-2 px-3 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-default"
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
