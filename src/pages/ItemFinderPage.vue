<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import type { LootItem, ItemFilterEntry } from '@/types'
import { qualityClass } from '@/utils/icons'
import ItemIcon from '@/components/loot/ItemIcon.vue'
import ItemTooltip from '@/components/loot/ItemTooltip.vue'
import { useTooltip } from '@/composables/useTooltip'

const route = useRoute()
const router = useRouter()
const store = useDataStore()
const searching = ref(false)
const results = ref<Array<LootItem & { tableKey: string; tableTitle: string }>>([])

// --- Filter state ---
const query = ref('')
const slotFilter = ref('')
const typeFilter = ref('')
const minLevel = ref<string>('')
const maxLevel = ref<string>('')

// Dynamic stat filter rows
interface StatRow {
  key: string
  op: '>' | '>=' | '='
  value: string
}
const statRows = ref<StatRow[]>([])
const matchMode = ref<'all' | 'any'>('all')
const sortBy = ref('quality')
const sortDir = ref<'desc' | 'asc'>('desc')
let cachedFilterMap: Record<string, ItemFilterEntry> = {}

const SLOT_OPTIONS = [
  'Head', 'Shoulder', 'Chest', 'Back', 'Wrist', 'Hands', 'Waist', 'Legs', 'Feet',
  'Neck', 'Finger', 'Trinket',
  'Main Hand', 'Off Hand', 'One-Hand', 'Two-Hand', 'Ranged', 'Held In Off-hand',
  'Shirt', 'Tabard', 'Relic',
]

// All available stat options grouped
const STAT_GROUPS = [
  {
    label: 'Base Stats',
    options: [
      { key: 'str', label: 'Strength' },
      { key: 'agi', label: 'Agility' },
      { key: 'sta', label: 'Stamina' },
      { key: 'int', label: 'Intellect' },
      { key: 'spi', label: 'Spirit' },
    ],
  },
  {
    label: 'Defense',
    options: [
      { key: 'armor', label: 'Armor' },
      { key: 'def', label: 'Defense' },
      { key: 'dodge', label: 'Dodge %' },
      { key: 'parry', label: 'Parry %' },
      { key: 'block', label: 'Block %' },
      { key: 'firRes', label: 'Fire Resistance' },
      { key: 'natRes', label: 'Nature Resistance' },
      { key: 'froRes', label: 'Frost Resistance' },
      { key: 'shaRes', label: 'Shadow Resistance' },
      { key: 'arcRes', label: 'Arcane Resistance' },
    ],
  },
  {
    label: 'Offensive',
    options: [
      { key: 'ap', label: 'Attack Power' },
      { key: 'sp', label: 'Spell Power' },
      { key: 'heal', label: 'Healing Power' },
      { key: 'crit', label: 'Crit %' },
      { key: 'spCrit', label: 'Spell Crit %' },
      { key: 'hit', label: 'Hit %' },
      { key: 'spHit', label: 'Spell Hit %' },
      { key: 'dps', label: 'Weapon DPS' },
    ],
  },
  {
    label: 'Utility',
    options: [
      { key: 'mp5', label: 'Mana per 5' },
      { key: 'hp5', label: 'Health per 5' },
      { key: 'haste', label: 'Haste %' },
    ],
  },
]

// Flat list for lookups
const ALL_STAT_OPTIONS = STAT_GROUPS.flatMap(g => g.options)

// Dynamic type options based on selected slot
const availableTypes = ref<string[]>([])

// Whether any filter is active
const hasActiveFilter = computed(() => {
  return !!(query.value && query.value.length >= 2)
    || !!slotFilter.value
    || !!typeFilter.value
    || !!(minLevel.value || maxLevel.value)
    || statRows.value.some(r => r.key)
})

function itemQuality(item: LootItem): number {
  return store.resolveQuality(item.id, item.quality)
}

const {
  visible, tooltipData, activeItem, tooltipX, tooltipY, isTouch,
  onItemMouseEnter, onItemMouseMove, onItemMouseLeave,
  onItemTouchStart, dismissTooltip,
} = useTooltip()

// --- Stat helpers ---
function getStatValue(entry: ItemFilterEntry, key: string): number | undefined {
  return entry.st?.[key] ?? entry.eq?.[key]
}

function matchesStatRow(entry: ItemFilterEntry, row: StatRow): boolean {
  if (!row.key) return true
  const val = getStatValue(entry, row.key)
  if (val === undefined) return false
  const target = parseFloat(row.value) || 0
  if (row.op === '>') return val > target
  if (row.op === '>=') return val >= target
  return val === target // '='
}

// --- Search ---
async function doSearch() {
  if (!hasActiveFilter.value) {
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
  cachedFilterMap = filterMap

  const lowerQ = query.value ? query.value.toLowerCase() : ''
  const minLvl = minLevel.value ? parseInt(minLevel.value, 10) : 0
  const maxLvl = maxLevel.value ? parseInt(maxLevel.value, 10) : 0
  const activeStatRows = statRows.value.filter(r => r.key)

  const found: typeof results.value = []
  const seenIds = new Set<number>()

  for (const [, tables] of Object.entries(allData)) {
    for (const [tableKey, items] of Object.entries(tables)) {
      for (const item of items) {
        if (item.quality === 6 || !item.name) continue

        // Text filter
        if (lowerQ && !item.name.toLowerCase().includes(lowerQ)) continue

        const entry = filterMap[String(item.id)]

        // Slot/type filter
        if (slotFilter.value || typeFilter.value) {
          if (!entry) continue
          if (entry.n && entry.n !== item.name) continue
          if (slotFilter.value && entry.s !== slotFilter.value) continue
          if (typeFilter.value && entry.t !== typeFilter.value) continue
        }

        // Level filter
        if (minLvl || maxLvl) {
          if (!entry) continue
          if (entry.n && entry.n !== item.name) continue
          const rl = entry.rl ?? 0
          if (minLvl && rl < minLvl) continue
          if (maxLvl && rl > maxLvl) continue
        }

        // Stat filters
        if (activeStatRows.length > 0) {
          if (!entry) continue
          if (entry.n && entry.n !== item.name) continue
          if (matchMode.value === 'all') {
            if (!activeStatRows.every(r => matchesStatRow(entry, r))) continue
          } else {
            if (!activeStatRows.some(r => matchesStatRow(entry, r))) continue
          }
        }

        // Deduplicate
        if (seenIds.has(item.id)) continue
        seenIds.add(item.id)

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
  applySorting()
}

// --- Sorting ---
const sortOptions = computed(() => {
  const opts: Array<{ key: string; label: string }> = [
    { key: 'quality', label: 'Quality' },
    { key: 'name', label: 'Name' },
    { key: 'rl', label: 'Required Level' },
  ]
  for (const row of statRows.value) {
    if (row.key && !opts.some(o => o.key === row.key)) {
      const label = ALL_STAT_OPTIONS.find(o => o.key === row.key)?.label ?? row.key
      opts.push({ key: row.key, label })
    }
  }
  return opts
})

function applySorting() {
  const key = sortBy.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  results.value.sort((a, b) => {
    let cmp = 0
    if (key === 'quality') {
      cmp = store.resolveQuality(a.id, a.quality) - store.resolveQuality(b.id, b.quality)
    } else if (key === 'name') {
      cmp = a.name.localeCompare(b.name)
    } else if (key === 'rl') {
      const aRl = cachedFilterMap[String(a.id)]?.rl ?? 0
      const bRl = cachedFilterMap[String(b.id)]?.rl ?? 0
      cmp = aRl - bRl
    } else {
      // Stat key
      const aEntry = cachedFilterMap[String(a.id)]
      const bEntry = cachedFilterMap[String(b.id)]
      const aVal = (aEntry?.st?.[key] ?? aEntry?.eq?.[key]) ?? 0
      const bVal = (bEntry?.st?.[key] ?? bEntry?.eq?.[key]) ?? 0
      cmp = aVal - bVal
    }
    return cmp * dir || a.name.localeCompare(b.name)
  })
}

function onSortChange() {
  syncQueryParams()
  if (results.value.length) applySorting()
}

// --- Slot/type interaction ---
async function updateAvailableTypes() {
  if (!slotFilter.value) {
    availableTypes.value = []
    return
  }
  const filterMap = await store.loadFilterData()
  const types = new Set<string>()
  for (const [, entry] of Object.entries(filterMap)) {
    if (entry.s === slotFilter.value && entry.t) {
      types.add(entry.t)
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

// --- Stat row management ---
function addStatRow(key: string) {
  if (!key) return
  statRows.value.push({ key, op: '>=', value: '0' })
  syncQueryParams()
  doSearch()
}

function removeStatRow(index: number) {
  statRows.value.splice(index, 1)
  syncQueryParams()
  doSearch()
}

function statLabel(key: string): string {
  return ALL_STAT_OPTIONS.find(o => o.key === key)?.label ?? key
}

// Stats already used (to avoid duplicates in the "add" dropdown)
const usedStatKeys = computed(() => new Set(statRows.value.map(r => r.key)))

// --- URL sync ---
function syncQueryParams() {
  const params: Record<string, string> = {}
  if (query.value) params.q = query.value
  if (slotFilter.value) params.slot = slotFilter.value
  if (typeFilter.value) params.type = typeFilter.value
  if (minLevel.value) params.minLvl = minLevel.value
  if (maxLevel.value) params.maxLvl = maxLevel.value
  if (statRows.value.length > 0) {
    // Encode stat rows as: key,op,value|key,op,value
    params.stats = statRows.value.map(r => `${r.key},${r.op},${r.value}`).join('|')
  }
  if (matchMode.value !== 'all') params.match = matchMode.value
  if (sortBy.value !== 'quality') params.sort = sortBy.value
  if (sortDir.value !== 'desc') params.dir = sortDir.value
  router.replace({ path: '/item-finder', query: params })
}

function parseStatsParam(str: string): StatRow[] {
  return str.split('|').map(part => {
    const [key, op, value] = part.split(',')
    return { key: key || '', op: (op as StatRow['op']) || '>=', value: value || '0' }
  }).filter(r => r.key)
}

function onFilterChange() {
  syncQueryParams()
  doSearch()
}

onMounted(() => {
  query.value = (route.query.q as string) ?? ''
  slotFilter.value = (route.query.slot as string) ?? ''
  typeFilter.value = (route.query.type as string) ?? ''
  minLevel.value = (route.query.minLvl as string) ?? ''
  maxLevel.value = (route.query.maxLvl as string) ?? ''
  if (route.query.stats) statRows.value = parseStatsParam(route.query.stats as string)
  if (route.query.match === 'any') matchMode.value = 'any'
  if (route.query.sort) sortBy.value = route.query.sort as string
  if (route.query.dir === 'asc') sortDir.value = 'asc'
  if (slotFilter.value) updateAvailableTypes()
  if (hasActiveFilter.value) doSearch()
})

watch(() => route.query, (newQuery) => {
  const newQ = (newQuery.q as string) ?? ''
  const newSlot = (newQuery.slot as string) ?? ''
  const newType = (newQuery.type as string) ?? ''
  const newMinLvl = (newQuery.minLvl as string) ?? ''
  const newMaxLvl = (newQuery.maxLvl as string) ?? ''
  const changed = newQ !== query.value || newSlot !== slotFilter.value || newType !== typeFilter.value
    || newMinLvl !== minLevel.value || newMaxLvl !== maxLevel.value
  if (changed) {
    query.value = newQ
    slotFilter.value = newSlot
    typeFilter.value = newType
    minLevel.value = newMinLvl
    maxLevel.value = newMaxLvl
    if (newQuery.stats) statRows.value = parseStatsParam(newQuery.stats as string)
    if (newQuery.match === 'any') matchMode.value = 'any'
    else matchMode.value = 'all'
    if (newQuery.sort) sortBy.value = newQuery.sort as string
    else sortBy.value = 'quality'
    if (newQuery.dir === 'asc') sortDir.value = 'asc'
    else sortDir.value = 'desc'
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
      <span class="text-[var(--text-primary)]">Item Finder</span>
    </div>

    <h1 class="text-2xl font-bold text-white mb-4">Item Finder</h1>

    <!-- Filter panel -->
    <div class="mb-6 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg space-y-3">

      <!-- Row 1: Name -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
        <label class="text-sm text-[var(--text-secondary)] sm:w-24 sm:shrink-0">Name:</label>
        <input
          v-model="query"
          @input="onFilterChange"
          type="text"
          placeholder="Search items..."
          class="flex-1 max-w-md px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <!-- Row 2: Equipment Slot + Armor/Weapon Type -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
        <label class="text-sm text-[var(--text-secondary)] sm:w-24 sm:shrink-0">Equip slot:</label>
        <div class="flex gap-2 sm:gap-3">
          <select
            v-model="slotFilter"
            @change="onSlotChange"
            class="min-w-0 flex-1 sm:flex-none px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] sm:min-w-[160px]"
          >
            <option value="">All Slots</option>
            <option v-for="s in SLOT_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
          <select
            v-model="typeFilter"
            @change="onFilterChange"
            :disabled="!slotFilter"
            class="min-w-0 flex-1 sm:flex-none px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 sm:min-w-[160px]"
          >
            <option value="">All Types</option>
            <option v-for="t in availableTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>

      <!-- Row 3: Required Level -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
        <label class="text-sm text-[var(--text-secondary)] sm:w-24 sm:shrink-0">Req level:</label>
        <div class="flex items-center gap-2">
          <input
            v-model="minLevel"
            @input="onFilterChange"
            type="number"
            min="0" max="60"
            placeholder="min"
            class="w-20 px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <span class="text-[var(--text-secondary)]">–</span>
          <input
            v-model="maxLevel"
            @input="onFilterChange"
            type="number"
            min="0" max="60"
            placeholder="max"
            class="w-20 px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <!-- Stat filter rows -->
      <div v-for="(row, idx) in statRows" :key="idx" class="flex flex-wrap items-center gap-2">
        <div class="hidden sm:block w-24 shrink-0" />
        <select
          v-model="row.key"
          @change="onFilterChange"
          class="min-w-0 flex-1 sm:flex-none px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] sm:min-w-[180px]"
        >
          <optgroup v-for="group in STAT_GROUPS" :key="group.label" :label="group.label">
            <option
              v-for="opt in group.options"
              :key="opt.key"
              :value="opt.key"
              :disabled="usedStatKeys.has(opt.key) && opt.key !== row.key"
            >
              {{ opt.label }}
            </option>
          </optgroup>
        </select>
        <div class="flex items-center gap-2">
          <select
            v-model="row.op"
            @change="onFilterChange"
            class="px-2 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value=">">&gt;</option>
            <option value=">=">&gt;=</option>
            <option value="=">=</option>
          </select>
          <input
            v-model="row.value"
            @input="onFilterChange"
            type="number"
            min="0"
            class="w-20 px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            @click="removeStatRow(idx)"
            class="text-sm text-[var(--accent)] hover:text-white transition-colors cursor-pointer"
          >
            remove
          </button>
        </div>
      </div>

      <!-- Add stat row -->
      <div class="flex items-center gap-2">
        <div class="hidden sm:block w-24 shrink-0" />
        <select
          @change="addStatRow(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
          class="min-w-0 flex-1 sm:flex-none px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] sm:min-w-[180px]"
        >
          <option value="">Additional Filters...</option>
          <optgroup v-for="group in STAT_GROUPS" :key="group.label" :label="group.label">
            <option
              v-for="opt in group.options"
              :key="opt.key"
              :value="opt.key"
              :disabled="usedStatKeys.has(opt.key)"
            >
              {{ opt.label }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- Match mode -->
      <div v-if="statRows.length > 1" class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <div class="hidden sm:block w-24 shrink-0" />
        <span class="text-sm text-[var(--text-secondary)]">Match:</span>
        <label class="flex items-center gap-1.5 text-sm text-[var(--text-primary)] cursor-pointer">
          <input
            type="radio"
            v-model="matchMode"
            value="all"
            @change="onFilterChange"
            class="accent-[var(--accent)]"
          />
          All additional filters
        </label>
        <label class="flex items-center gap-1.5 text-sm text-[var(--text-primary)] cursor-pointer">
          <input
            type="radio"
            v-model="matchMode"
            value="any"
            @change="onFilterChange"
            class="accent-[var(--accent)]"
          />
          At least one
        </label>
      </div>
    </div>

    <!-- Results -->
    <div v-if="searching" class="text-[var(--text-secondary)]">Searching...</div>

    <div v-else-if="!hasActiveFilter" class="text-[var(--text-secondary)]">
      Select filters above to find items.
    </div>

    <div v-else-if="results.length === 0" class="text-[var(--text-secondary)]">
      No items found matching your criteria.
    </div>

    <div v-else class="space-y-1">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)] mb-3">
        <span>
          {{ results.length }} result{{ results.length !== 1 ? 's' : '' }} found
          <span v-if="results.length >= 200">(showing first 200)</span>
        </span>
        <div class="flex items-center gap-2 ml-auto">
          <label class="text-xs">Sort by:</label>
          <select
            v-model="sortBy"
            @change="onSortChange"
            class="px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option v-for="opt in sortOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
          </select>
          <button
            @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'; onSortChange()"
            class="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            :title="sortDir === 'desc' ? 'Descending' : 'Ascending'"
          >
            <svg v-if="sortDir === 'desc'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
          </button>
        </div>
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
