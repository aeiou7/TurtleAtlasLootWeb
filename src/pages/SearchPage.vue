<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import type { LootItem } from '@/types'
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

const SLOT_OPTIONS = [
  'Head', 'Shoulder', 'Chest', 'Back', 'Wrist', 'Hands', 'Waist', 'Legs', 'Feet',
  'Neck', 'Finger', 'Trinket',
  'Main Hand', 'Off Hand', 'One-Hand', 'Two-Hand', 'Ranged', 'Held In Off-hand',
  'Shirt', 'Tabard', 'Relic',
]

// Dynamic type options based on what's available for the selected slot
const availableTypes = ref<string[]>([])

// Whether any filter (text or dropdowns) is active
const hasActiveFilter = computed(() => {
  return (query.value && query.value.length >= 2) || slotFilter.value || typeFilter.value
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
  const slot = slotFilter.value
  const type = typeFilter.value

  if (!q && !slot && !type) {
    results.value = []
    return
  }
  if (q && q.length < 2 && !slot && !type) {
    results.value = []
    return
  }

  searching.value = true
  results.value = []

  const [allData, register, filterMap] = await Promise.all([
    store.loadAllItemData(),
    store.loadTableRegister(),
    store.loadFilterData(),
  ])

  const lowerQ = q ? q.toLowerCase() : ''
  const found: typeof results.value = []

  for (const [, tables] of Object.entries(allData)) {
    for (const [tableKey, items] of Object.entries(tables)) {
      for (const item of items) {
        if (item.quality === 6) continue // skip headers

        // Text filter
        if (lowerQ && !item.name.toLowerCase().includes(lowerQ)) continue

        // Equipment slot/type filter
        if (slot || type) {
          const meta = filterMap[String(item.id)]
          if (!meta) continue
          if (slot && meta[0] !== slot) continue
          if (type && meta[1] !== type) continue
        }

        const title = register?.[tableKey]?.title ?? tableKey
        found.push({ ...item, tableKey, tableTitle: title })
      }
    }
  }

  // Sort: exact matches first, then by quality desc, then alphabetically
  found.sort((a, b) => {
    if (lowerQ) {
      const aExact = a.name.toLowerCase() === lowerQ ? 0 : 1
      const bExact = b.name.toLowerCase() === lowerQ ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
    }
    const qA = store.resolveQuality(a.id, a.quality)
    const qB = store.resolveQuality(b.id, b.quality)
    if (qB !== qA) return qB - qA
    return a.name.localeCompare(b.name)
  })

  results.value = found.slice(0, 200)
  searching.value = false
}

async function updateAvailableTypes() {
  if (!slotFilter.value) {
    availableTypes.value = []
    return
  }
  const filterMap = await store.loadFilterData()
  const types = new Set<string>()
  for (const [, meta] of Object.entries(filterMap)) {
    if (meta[0] === slotFilter.value && meta[1]) {
      types.add(meta[1])
    }
  }
  availableTypes.value = [...types].sort()
}

function onSlotChange() {
  typeFilter.value = ''
  updateAvailableTypes()
  syncQueryParams()
  doSearch()
}

function onTypeChange() {
  syncQueryParams()
  doSearch()
}

function syncQueryParams() {
  const params: Record<string, string> = {}
  if (query.value) params.q = query.value
  if (slotFilter.value) params.slot = slotFilter.value
  if (typeFilter.value) params.type = typeFilter.value
  router.replace({ path: '/search', query: params })
}

function onQueryInput() {
  syncQueryParams()
  doSearch()
}

onMounted(() => {
  query.value = (route.query.q as string) ?? ''
  slotFilter.value = (route.query.slot as string) ?? ''
  typeFilter.value = (route.query.type as string) ?? ''
  if (slotFilter.value) updateAvailableTypes()
  if (hasActiveFilter.value) doSearch()
})

watch(() => route.query, (newQuery) => {
  const newQ = (newQuery.q as string) ?? ''
  const newSlot = (newQuery.slot as string) ?? ''
  const newType = (newQuery.type as string) ?? ''
  if (newQ !== query.value || newSlot !== slotFilter.value || newType !== typeFilter.value) {
    query.value = newQ
    slotFilter.value = newSlot
    typeFilter.value = newType
    if (slotFilter.value) updateAvailableTypes()
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
      Search &amp; Filter
    </h1>

    <!-- Filter bar -->
    <div class="flex flex-wrap items-end gap-3 mb-6 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
      <!-- Text search -->
      <div class="flex-1 min-w-[180px]">
        <label class="block text-xs text-[var(--text-secondary)] mb-1">Item name</label>
        <input
          v-model="query"
          @input="onQueryInput"
          type="text"
          placeholder="Search items..."
          class="w-full px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <!-- Slot filter -->
      <div class="min-w-[150px]">
        <label class="block text-xs text-[var(--text-secondary)] mb-1">Equipment Slot</label>
        <select
          v-model="slotFilter"
          @change="onSlotChange"
          class="w-full px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Slots</option>
          <option v-for="s in SLOT_OPTIONS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <!-- Type filter -->
      <div class="min-w-[150px]">
        <label class="block text-xs text-[var(--text-secondary)] mb-1">Armor / Weapon Type</label>
        <select
          v-model="typeFilter"
          @change="onTypeChange"
          :disabled="!slotFilter"
          class="w-full px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
        >
          <option value="">All Types</option>
          <option v-for="t in availableTypes" :key="t" :value="t">{{ t }}</option>
        </select>
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
