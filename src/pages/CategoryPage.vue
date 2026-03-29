<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { getCategoryByKey, type NavMenuItem, type CategoryInfo } from '@/types'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'

const props = defineProps<{ category: string }>()
const route = useRoute()
const router = useRouter()
const store = useDataStore()
const ready = ref(false)

const categoryInfo = computed<CategoryInfo | undefined>(() => getCategoryByKey(props.category))

const menuItems = computed<NavMenuItem[]>(() => {
  if (!store.navigation) return []
  const key = props.category as keyof typeof store.navigation
  return (store.navigation[key] as NavMenuItem[]) ?? []
})

interface MenuGroup {
  header?: NavMenuItem
  items: NavMenuItem[]
}

const menuGroups = computed<MenuGroup[]>(() => {
  const items = menuItems.value
  if (!items.length) return []

  // If no headers exist, return one flat group
  if (!items.some(i => i.isHeader)) {
    return [{ items }]
  }

  const groups: MenuGroup[] = []
  let current: MenuGroup | null = null

  for (const item of items) {
    if (item.isHeader) {
      current = { header: item, items: [] }
      groups.push(current)
    } else if (current) {
      current.items.push(item)
    } else {
      // Items before any header go into a headerless group
      if (!groups.length || groups[0].header) {
        groups.unshift({ items: [] })
      }
      groups[0].items.push(item)
    }
  }

  return groups
})

// Track which groups are collapsed — all collapsed by default
const collapsedGroups = ref<Set<string>>(new Set())

watch(menuGroups, (groups) => {
  if (!groups.length) return
  // Check if we have saved expanded state for this category
  const saved = store.getExpandedGroups(props.category)
  if (saved.length > 0) {
    // Collapse all except saved expanded ones
    const collapsed = new Set<string>()
    for (const g of groups) {
      if (g.header) {
        const key = g.header.name || g.header.lootpage
        if (!saved.includes(key)) collapsed.add(key)
      }
    }
    collapsedGroups.value = collapsed
  } else {
    // First visit: collapse all
    const collapsed = new Set<string>()
    for (const g of groups) {
      if (g.header) {
        collapsed.add(g.header.name || g.header.lootpage)
      }
    }
    collapsedGroups.value = collapsed
  }
}, { immediate: true })

function syncExpandedToStore() {
  const allHeaders = menuGroups.value
    .filter(g => g.header)
    .map(g => g.header!.name || g.header!.lootpage)
  const expanded = allHeaders.filter(h => !collapsedGroups.value.has(h))
  store.setExpandedGroups(props.category, expanded)
}

function toggleGroup(headerName: string) {
  if (collapsedGroups.value.has(headerName)) {
    collapsedGroups.value.delete(headerName)
  } else {
    collapsedGroups.value.add(headerName)
  }
  syncExpandedToStore()
}

onMounted(async () => {
  await store.loadNavigation()
  if (categoryInfo.value) {
    await store.loadItemData(categoryInfo.value.dataFile)
  }
  ready.value = true
})

watch(() => props.category, async () => {
  ready.value = false
  if (categoryInfo.value) {
    await store.loadItemData(categoryInfo.value.dataFile)
  }
  ready.value = true
})

function navigateTo(item: NavMenuItem) {
  router.push(`/${props.category}/${item.lootpage}`)
}
</script>

<template>
  <div v-if="categoryInfo">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
      <router-link to="/" class="hover:text-[var(--accent)]">Home</router-link>
      <span>/</span>
      <span class="text-[var(--text-primary)]">{{ categoryInfo.label }}</span>
    </div>

    <h1 class="text-2xl font-bold text-[var(--accent)] mb-6 flex items-center gap-2">
      <CategoryIcon :category="categoryInfo.key" class="w-7 h-7" />
      {{ categoryInfo.label }}
    </h1>

    <div v-if="!ready" class="text-[var(--text-secondary)]">Loading...</div>

    <div v-else class="space-y-6">
      <div v-for="(group, gi) in menuGroups" :key="gi">
        <!-- Group header (collapsible) -->
        <button
          v-if="group.header"
          @click="toggleGroup(group.header!.name || group.header!.lootpage)"
          class="w-full flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)] cursor-pointer select-none group/hdr"
        >
          <svg
            class="w-4 h-4 text-[var(--text-secondary)] transition-transform"
            :class="{ '-rotate-90': collapsedGroups.has(group.header!.name || group.header!.lootpage) }"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          <span class="text-lg font-semibold text-[var(--accent)] group-hover/hdr:text-[var(--text-primary)] transition-colors">
            {{ group.header!.name || group.header!.lootpage }}
          </span>
          <span class="text-xs text-[var(--text-secondary)] ml-1">({{ group.items.length }})</span>
        </button>

        <!-- Group items grid -->
        <div
          v-show="!group.header || !collapsedGroups.has(group.header!.name || group.header!.lootpage)"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <button
            v-for="item in group.items"
            :key="item.lootpage"
            @click="navigateTo(item)"
            class="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-left hover:border-[var(--accent)] transition-colors group"
          >
            <div class="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
              {{ item.name || item.lootpage }}
            </div>
            <div v-if="item.extra" class="text-xs text-[var(--text-secondary)] mt-1">
              {{ item.extra }}
            </div>
          </button>
        </div>
      </div>
    </div>

    <div v-if="ready && menuItems.length === 0" class="text-[var(--text-secondary)]">
      No entries found for this category.
    </div>
  </div>

  <div v-else class="text-[var(--text-secondary)]">
    Category not found: {{ category }}
  </div>
</template>
