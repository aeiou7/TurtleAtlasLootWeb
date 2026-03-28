<script setup lang="ts">
import { getIconUrl, qualityBorderClass } from '@/utils/icons'

const props = defineProps<{
  icon: string
  quality: number
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClass = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}[props.size ?? 'md']
</script>

<template>
  <div
    :class="[
      'rounded border-2 overflow-hidden shrink-0 bg-[var(--bg-primary)]',
      qualityBorderClass(quality),
      sizeClass,
    ]"
  >
    <img
      :src="getIconUrl(icon)"
      :alt="icon"
      class="w-full h-full object-cover"
      loading="lazy"
      @error="($event.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23333%22 width=%221%22 height=%221%22/></svg>'"
    />
  </div>
</template>
