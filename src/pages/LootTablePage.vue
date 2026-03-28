<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { getCategoryByKey, type LootItem, type CategoryInfo, CATEGORIES } from '@/types'
import LootTable from '@/components/loot/LootTable.vue'

const props = defineProps<{ category: string; pageKey: string }>()
const router = useRouter()
const store = useDataStore()
const ready = ref(false)
const items = ref<LootItem[]>([])
const bossNavOpen = ref(false)

const categoryInfo = computed<CategoryInfo | undefined>(() => getCategoryByKey(props.category))

const pageTitle = computed(() => {
  const reg = store.tableRegister?.[props.pageKey]
  if (reg) return reg.title
  const btn = store.buttonRegistry?.[props.pageKey]
  if (btn?.title) return btn.title
  return props.pageKey
})

const prevPage = computed(() => store.buttonRegistry?.[props.pageKey]?.prevPage)
const nextPage = computed(() => store.buttonRegistry?.[props.pageKey]?.nextPage)
const backPage = computed(() => store.buttonRegistry?.[props.pageKey]?.backPage)

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
    const title =
      store.tableRegister?.[cur]?.title ??
      reg[cur]?.title ??
      cur
    // Strip the dungeon prefix ("Molten Core - Ragnaros" → "Ragnaros")
    const label = title.includes(' - ') ? title.split(' - ').slice(1).join(' - ') : title
    list.push({ key: cur, label })
    cur = reg[cur]?.nextPage
  }
  return list
})

async function loadItems() {
  ready.value = false
  items.value = []

  // Try to load from the category's data file first
  if (categoryInfo.value) {
    const data = await store.loadItemData(categoryInfo.value.dataFile)
    if (data[props.pageKey]) {
      items.value = data[props.pageKey]
      ready.value = true
      return
    }
  }

  // If not found, search across all data files
  for (const cat of CATEGORIES) {
    const data = await store.loadItemData(cat.dataFile)
    if (data[props.pageKey]) {
      items.value = data[props.pageKey]
      ready.value = true
      return
    }
  }

  ready.value = true
}

onMounted(loadItems)
watch(() => props.pageKey, loadItems)
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

    <!-- Page title + navigation -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-[var(--accent)]">{{ pageTitle }}</h1>
      <div class="flex gap-2">
        <button
          v-if="prevPage"
          @click="router.push(`/${category}/${prevPage}`)"
          class="px-3 py-1.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors"
        >
          ← Prev
        </button>
        <button
          v-if="nextPage"
          @click="router.push(`/${category}/${nextPage}`)"
          class="px-3 py-1.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- Boss sub-nav -->
    <div v-if="bossList.length > 1" class="mb-4">
      <button
        @click="bossNavOpen = !bossNavOpen"
        class="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors w-full sm:w-auto"
      >
        <span class="text-[var(--text-secondary)]">Jump to boss</span>
        <span class="text-xs text-[var(--text-secondary)] ml-auto sm:ml-0">{{ bossNavOpen ? '▲' : '▼' }}</span>
      </button>
      <div
        v-if="bossNavOpen"
        class="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2"
      >
        <button
          v-for="boss in bossList"
          :key="boss.key"
          @click="router.push(`/${category}/${boss.key}`); bossNavOpen = false"
          class="px-2 py-1.5 text-sm text-left rounded transition-colors truncate"
          :class="boss.key === pageKey
            ? 'bg-[var(--accent)] text-white font-semibold'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]'"
        >
          {{ boss.label }}
        </button>
      </div>
    </div>

    <div v-if="!ready" class="text-[var(--text-secondary)]">Loading items...</div>

    <div v-else class="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <LootTable :items="items" />
    </div>

    <!-- Bottom navigation -->
    <div v-if="ready" class="flex justify-between mt-4">
      <button
        v-if="prevPage"
        @click="router.push(`/${category}/${prevPage}`)"
        class="px-4 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors"
      >
        ← Prev
      </button>
      <div v-else />
      <button
        v-if="backPage"
        @click="router.push(`/${category}`)"
        class="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
      >
        ↩ Back to list
      </button>
      <button
        v-if="nextPage"
        @click="router.push(`/${category}/${nextPage}`)"
        class="px-4 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors"
      >
        Next →
      </button>
    </div>
  </div>
</template>
