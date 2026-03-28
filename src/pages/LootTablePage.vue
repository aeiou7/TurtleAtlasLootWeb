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
    <div class="flex items-center justify-between mb-6">
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
