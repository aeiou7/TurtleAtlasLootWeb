<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

defineEmits<{ 'toggle-sidebar': [] }>()

const router = useRouter()
const searchQuery = ref('')

function doSearch() {
  const q = searchQuery.value.trim()
  if (q) {
    router.push({ name: 'search', query: { q } })
  }
}
</script>

<template>
  <header class="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 sm:gap-4 shrink-0 z-20">
    <!-- Mobile menu button -->
    <button
      class="md:hidden text-[var(--text-secondary)] hover:text-[var(--accent)] p-1"
      @click="$emit('toggle-sidebar')"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Logo / Title -->
    <router-link to="/" class="flex items-center gap-2 shrink-0">
      <span class="text-xl font-bold text-[var(--accent)]">🐢 AtlasLoot</span>
      <span class="text-sm text-[var(--text-secondary)] hidden sm:inline">Turtle WoW</span>
    </router-link>

    <!-- Search bar -->
    <form @submit.prevent="doSearch" class="flex-1 max-w-md ml-auto">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search items..."
          class="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-4 py-2 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent)]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </form>

    <!-- Ko-fi button -->
    <a
      href="https://ko-fi.com/W7W0U43YC"
      target="_blank"
      rel="noopener noreferrer"
      class="shrink-0"
    >
      <img
        src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
        alt="Buy Me a Coffee at ko-fi.com"
        class="h-9 border-0 hidden sm:block"
      />
      <svg class="w-6 h-6 sm:hidden text-[#ff5e5b]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311z"/>
      </svg>
    </a>
  </header>
</template>
