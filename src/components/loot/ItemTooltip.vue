<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { TooltipData, LootItem } from '@/types'
import { getIconUrl, qualityClass } from '@/utils/icons'

const OFFSET = 16

const props = defineProps<{
  tooltip: TooltipData | null
  item: LootItem
  x: number
  y: number
}>()

const el = ref<HTMLElement | null>(null)
const posLeft = ref(props.x + OFFSET)
const posTop = ref(props.y + OFFSET)

function reposition() {
  if (!el.value) return
  const rect = el.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let x: number
  let y: number

  // Horizontal: prefer right of cursor; flip left if it overflows
  if (props.x + OFFSET + rect.width > vw) {
    x = props.x - rect.width - OFFSET
  } else {
    x = props.x + OFFSET
  }

  // Vertical: prefer below cursor; flip up if it overflows
  if (props.y + OFFSET + rect.height > vh) {
    y = props.y - rect.height - OFFSET
  } else {
    y = props.y + OFFSET
  }

  posLeft.value = Math.max(0, x)
  posTop.value = Math.max(0, y)
}

// Position once the DOM element exists (before the first browser paint)
onMounted(reposition)

// Reposition whenever cursor coordinates or tooltip content change
watch(
  () => [props.x, props.y, props.tooltip],
  reposition,
  { flush: 'post' }
)

const GREEN_PREFIXES = ['equip:', 'use:', 'chance on hit:']

/** Strip WoW inline color codes: |cAARRGGBB…|r → the plain text inside */
function stripColorCodes(text: string): string {
  return text.replace(/\|c[0-9a-fA-F]{8}/g, '').replace(/\|r/g, '')
}

// Red requirement text from scanning on a specific class (e.g. hunter can't wear plate)
// should be normalized to white since this is a class-neutral database
const RED_COLOR = '#ff2121'
const REQUIREMENT_PREFIXES = ['requires', 'classes:', 'races:', 'unique']

// WoW quality colors — the addon captures fontstring colors which can be wrong
const QUALITY_COLORS: Record<number, string> = {
  0: '#9d9d9d', // Poor (gray)
  1: '#ffffff', // Common (white)
  2: '#1eff00', // Uncommon (green)
  3: '#0070dd', // Rare (blue)
  4: '#a335ee', // Epic (purple)
  5: '#ff8000', // Legendary (orange)
}

function nameColor(quality: number): string {
  return QUALITY_COLORS[quality] ?? '#ffffff'
}

function lineColor(line: { left: string; leftColor: string }): string {
  const lt = line.left.trim().toLowerCase()
  for (const prefix of GREEN_PREFIXES) {
    if (lt.startsWith(prefix)) return '#1eff00'
  }
  // Normalize red requirement text to white
  if (line.leftColor === RED_COLOR) {
    for (const prefix of REQUIREMENT_PREFIXES) {
      if (lt.startsWith(prefix)) return '#ffffff'
    }
  }
  return line.leftColor
}

function rightLineColor(line: { right?: string; rightColor?: string }): string {
  // Normalize red armor/weapon type text to white (dumped on wrong-class character)
  if (line.rightColor === RED_COLOR) return '#ffffff'
  return line.rightColor ?? '#ffffff'
}

function formatReagent(r: { name: string; quantity: number }): string {
  return r.quantity > 1 ? `${r.name} (${r.quantity})` : r.name
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="el"
      class="item-tooltip"
      :style="{ left: posLeft + 'px', top: posTop + 'px' }"
    >
      <!-- Spell/recipe info pane (shown above item tooltip for crafting spells) -->
      <template v-if="tooltip?.spellInfo">
        <div class="spell-pane">
          <div class="tooltip-line">
            <span style="color: #ffffff">{{ tooltip.spellInfo.name }}</span>
          </div>
          <div v-if="tooltip.spellInfo.castTime" class="tooltip-line">
            <span style="color: #ffffff">{{ tooltip.spellInfo.castTime }}</span>
          </div>
          <div v-if="tooltip.spellInfo.cooldown" class="tooltip-line">
            <span style="color: #ffffff">{{ tooltip.spellInfo.cooldown }}</span>
          </div>
          <div v-if="tooltip.spellInfo.tools?.length" class="tooltip-line">
            <span style="color: #ffffff">Tools: </span>
            <span style="color: #ffffff">{{ tooltip.spellInfo.tools.join(', ') }}</span>
          </div>
          <div v-if="tooltip.spellInfo.reagents?.length" class="tooltip-line">
            <span style="color: #ffffff">Reagents: </span>
            <span style="color: #ffffff">{{ tooltip.spellInfo.reagents.map(formatReagent).join(', ') }}</span>
          </div>
          <div v-if="tooltip.spellInfo.creates" class="tooltip-line">
            <span style="color: #ffffff">Creates {{ tooltip.spellInfo.creates }}</span>
          </div>
          <div class="tooltip-line">
            <span style="color: #808080">SpellID: {{ tooltip.spellInfo.spellId }}</span>
          </div>
        </div>
        <div class="tooltip-divider" />
      </template>

      <!-- Full tooltip from dumped data -->
      <template v-if="tooltip">
        <div
          v-for="(line, i) in tooltip.lines"
          :key="i"
          class="tooltip-line"
          :class="{ 'tooltip-line-split': line.right }"
        >
          <span :style="{ color: i === 0 ? nameColor(tooltip.quality) : lineColor(line) }">{{ stripColorCodes(line.left) }}</span>
          <span v-if="line.right" :style="{ color: rightLineColor(line) }">{{ stripColorCodes(line.right) }}</span>
        </div>
      </template>

      <!-- Fallback: basic info from item data -->
      <template v-else>
        <div class="tooltip-line">
          <span :class="qualityClass(item.quality)">{{ item.name }}</span>
        </div>
        <div v-if="item.description" class="tooltip-line">
          <span class="text-tooltip-white">{{ item.description }}</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.item-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  min-width: 180px;
  max-width: 320px;
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  padding: 8px 10px;
  background: linear-gradient(to bottom, #1a0a2e, #0d0416);
  border: 1px solid #6040a0;
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(96, 64, 160, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3);
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  line-height: 1.4;
}

.spell-pane {
  padding-bottom: 4px;
}

.tooltip-divider {
  height: 1px;
  background: #6040a0;
  margin: 4px -10px 6px;
}

.tooltip-line {
  white-space: normal;
  word-wrap: break-word;
}

.tooltip-line-split {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.text-tooltip-white {
  color: #ffd100;
}
</style>
