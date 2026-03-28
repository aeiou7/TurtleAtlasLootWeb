<script setup lang="ts">
import type { LootItem } from '@/types'
import { qualityClass } from '@/utils/icons'
import ItemIcon from './ItemIcon.vue'
import ItemTooltip from './ItemTooltip.vue'
import { useTooltip } from '@/composables/useTooltip'
import { useDataStore } from '@/stores/dataStore'

defineProps<{
  items: LootItem[]
  title?: string
}>()

const store = useDataStore()

function itemQuality(item: LootItem): number {
  return store.resolveQuality(item.id, item.quality)
}

const {
  visible, tooltipData, activeItem, tooltipX, tooltipY, isTouch,
  onItemMouseEnter, onItemMouseMove, onItemMouseLeave,
  onItemTouchStart, dismissTooltip,
} = useTooltip()
</script>

<template>
  <div>
    <h2 v-if="title" class="text-lg font-semibold text-[var(--accent)] mb-4">{{ title }}</h2>
    <div class="space-y-0.5">
      <template v-for="(item, idx) in items" :key="idx">
        <!-- Section header (quality 6) -->
        <div
          v-if="item.quality === 6"
          class="flex items-center gap-2 py-2 px-3 mt-4 first:mt-0 border-b border-[var(--border)]"
        >
          <ItemIcon v-if="item.icon" :icon="item.icon" :quality="item.quality" size="sm" />
          <span class="font-semibold text-[var(--q6)]">{{ item.name }}</span>
        </div>

        <!-- Regular item row -->
        <div
          v-else
          class="flex items-center gap-3 py-1.5 px-3 rounded hover:bg-[var(--bg-tertiary)] transition-colors group cursor-default"
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
            <div v-if="item.description" class="text-xs text-[var(--text-secondary)] truncate">
              {{ item.description }}
            </div>
          </div>
          <div v-if="item.dropRate" class="text-xs text-[var(--text-secondary)] shrink-0 mr-1">
            {{ item.dropRate }}
          </div>
          <a
            v-if="item.type === 'item' && item.id"
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
      </template>

      <div v-if="items.length === 0" class="text-[var(--text-secondary)] text-sm py-4 text-center">
        No items found.
      </div>
    </div>

    <!-- Touch-mode backdrop: covers screen to catch dismiss taps.
         Uses @touchstart without .prevent so system gestures still work. -->
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
