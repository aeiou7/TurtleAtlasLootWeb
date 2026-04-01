<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { getCategoryByKey, type LootItem, type CategoryInfo, CATEGORIES } from '@/types'
import LootTable from '@/components/loot/LootTable.vue'

const props = defineProps<{ category: string; pageKey: string }>()
const router = useRouter()
const store = useDataStore()
const ready = ref(false)

/** Items keyed by boss pageKey for all bosses in the chain */
const allBossItems = ref<Record<string, LootItem[]>>({})

const categoryInfo = computed<CategoryInfo | undefined>(() => getCategoryByKey(props.category))
const isCraftingCategory = computed(() => props.category === 'crafting')

/** The dungeon/instance title derived from the navigation entry that links to this chain. */
const chainTitle = computed(() => {
  if (!store.navigation) return null
  const key = props.category as keyof typeof store.navigation
  const navItems = store.navigation[key] as Array<{ name?: string; lootpage?: string }> | undefined
  if (!navItems) return null
  // The first boss in the chain is the lootpage referenced from navigation
  const firstKey = bossList.value[0]?.key
  if (!firstKey) return null
  const entry = navItems.find(n => n.lootpage === firstKey)
  return entry?.name ?? null
})

const pageTitle = computed(() => {
  if (isCraftingCategory.value) {
    return store.resolveLootTableLabel(props.pageKey, 'crafting')
  }
  if (chainTitle.value) return chainTitle.value
  return store.resolveLootTableLabel(props.pageKey)
})

const backPage = computed(() => store.buttonRegistry?.[props.pageKey]?.backPage)

function formatBossLabel(pageKey: string): string {
  const title = isCraftingCategory.value
    ? store.resolveLootTableLabel(pageKey, 'crafting')
    : store.resolveLootTableLabel(pageKey)

  if (!isCraftingCategory.value && title.includes(' - ')) {
    return title.split(' - ').slice(1).join(' - ')
  }

  return title
}

/** Walk the nextPage chain from the first boss to build an ordered boss list. */
const bossList = computed(() => {
  const reg = store.buttonRegistry
  if (!reg) return []

  // Walk backwards from current page to find the first boss
  let first = props.pageKey
  while (reg[first]?.prevPage) {
    first = reg[first].prevPage!
  }

  // Walk forward collecting all bosses
  const list: { key: string; label: string }[] = []
  let cur: string | undefined = first
  const seen = new Set<string>()
  while (cur && !seen.has(cur)) {
    seen.add(cur)
    const label = formatBossLabel(cur)
    // Strip the dungeon prefix ("Molten Core - Ragnaros" → "Ragnaros")
    list.push({ key: cur, label })
    cur = reg[cur]?.nextPage
  }
  return list
})

// Collapsed state — all collapsed except the target pageKey
const collapsedBosses = ref<Set<string>>(new Set())

function initCollapsedState() {
  const collapsed = new Set<string>()
  for (const boss of bossList.value) {
    if (boss.key !== props.pageKey) {
      collapsed.add(boss.key)
    }
  }
  collapsedBosses.value = collapsed
}

function toggleBoss(key: string) {
  if (collapsedBosses.value.has(key)) {
    collapsedBosses.value.delete(key)
  } else {
    collapsedBosses.value.add(key)
  }
}

function scrollToBoss(key: string) {
  // Expand if collapsed
  if (collapsedBosses.value.has(key)) {
    collapsedBosses.value.delete(key)
  }
  // Update URL without triggering full reload
  router.replace(`/${props.category}/${key}`)
  nextTick(() => {
    const el = document.getElementById(`boss-${key}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function loadAllBossItems() {
  ready.value = false
  allBossItems.value = {}

  const result: Record<string, LootItem[]> = {}

  // Try category data file first
  if (categoryInfo.value) {
    const data = await store.loadItemData(categoryInfo.value.dataFile)
    for (const boss of bossList.value) {
      if (data[boss.key]) {
        result[boss.key] = data[boss.key]
      }
    }
  }

  // For any bosses not found, search across all data files
  const missing = bossList.value.filter(b => !result[b.key])
  if (missing.length > 0) {
    for (const cat of CATEGORIES) {
      const data = await store.loadItemData(cat.dataFile)
      for (const boss of missing) {
        if (!result[boss.key] && data[boss.key]) {
          result[boss.key] = data[boss.key]
        }
      }
    }
  }

  allBossItems.value = result
  initCollapsedState()
  ready.value = true

  // Scroll to the target boss after render
  nextTick(() => {
    const el = document.getElementById(`boss-${props.pageKey}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

onMounted(loadAllBossItems)
watch(() => props.pageKey, () => {
  // When URL changes (e.g. shared link), re-init collapsed state to expand the target
  initCollapsedState()
  nextTick(() => {
    const el = document.getElementById(`boss-${props.pageKey}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
})
</script>

<template>
  <div>
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
      <router-link to="/" class="hover:text-[var(--accent)]">Home</router-link>
      <span>/</span>
      <router-link :to="`/${category}`" class="hover:text-[var(--accent)]">
        {{ categoryInfo?.label ?? category }}
      </router-link>
      <span>/</span>
      <span class="text-[var(--text-primary)]">{{ pageTitle }}</span>
    </div>

    <!-- Page title + back button -->
    <div class="flex items-center gap-2 mb-4">
      <h1 class="text-xl font-bold text-white">{{ pageTitle }}</h1>
      <button
        v-if="backPage"
        @click="router.push(`/${category}`)"
        class="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-white transition-colors ml-auto"
      >
        ↩ Back to list
      </button>
    </div>

    <!-- Quick-nav boss grid -->
    <div v-if="bossList.length > 1" class="mb-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2">
        <button
          v-for="boss in bossList"
          :key="boss.key"
          @click="scrollToBoss(boss.key)"
          class="px-2 py-1.5 text-sm text-left rounded transition-colors truncate"
          :class="!collapsedBosses.has(boss.key)
            ? 'bg-[var(--accent)] text-white font-semibold'
            : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'"
        >
          {{ boss.label }}
        </button>
      </div>
    </div>

    <div v-if="!ready" class="text-[var(--text-secondary)]">Loading items...</div>

    <!-- All bosses as collapsible sections -->
    <div v-else class="space-y-4">
      <div v-for="boss in bossList" :key="boss.key" :id="`boss-${boss.key}`">
        <!-- Boss header (collapsible) -->
        <button
          @click="toggleBoss(boss.key)"
          class="w-full flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border)] cursor-pointer select-none group/hdr"
        >
          <svg
            class="w-4 h-4 text-[var(--text-secondary)] transition-transform"
            :class="{ '-rotate-90': collapsedBosses.has(boss.key) }"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          <span class="text-lg font-semibold text-white group-hover/hdr:text-[var(--accent)] transition-colors">
            {{ boss.label }}
          </span>
          <span v-if="allBossItems[boss.key]" class="text-xs text-[var(--text-secondary)] ml-1">
            ({{ allBossItems[boss.key].filter(i => i.quality !== 6).length }})
          </span>
        </button>

        <!-- Loot table content -->
        <div
          v-show="!collapsedBosses.has(boss.key)"
          class="bg-[var(--bg-card)] border-t border-b border-t-[var(--border-card-top)] border-b-[var(--border-card-bottom)] border-x-0 rounded-lg shadow-[var(--shadow-card)] p-4"
        >
          <LootTable v-if="allBossItems[boss.key]" :items="allBossItems[boss.key]" />
          <div v-else class="text-[var(--text-secondary)] text-sm">No items found.</div>
        </div>
      </div>
    </div>
  </div>
</template>
