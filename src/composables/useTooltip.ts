import { ref, onBeforeUnmount } from 'vue'
import type { TooltipData, LootItem } from '@/types'
import { useDataStore } from '@/stores/dataStore'

const HOVER_DELAY = 150
const TOUCH_MOVE_THRESHOLD = 10

export function useTooltip() {
  const store = useDataStore()
  const visible = ref(false)
  const tooltipData = ref<TooltipData | null>(null)
  const activeItem = ref<LootItem | null>(null)
  const tooltipX = ref(0)
  const tooltipY = ref(0)
  // Once a touch event fires, we permanently enter touch mode.
  // In touch mode: mouse handlers are disabled (they're all synthesized fakes),
  // and a backdrop div handles dismissal instead.
  const isTouch = ref(false)

  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  let currentItemId: number | null = null
  let touchStartX = 0
  let touchStartY = 0

  function hideTooltip() {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
    visible.value = false
    tooltipData.value = null
    activeItem.value = null
    currentItemId = null
  }

  // --- Desktop mouse (disabled in touch mode) ---

  function onItemMouseEnter(item: LootItem, event: MouseEvent) {
    if (isTouch.value) return
    if (item.quality === 6) return

    currentItemId = item.id
    activeItem.value = item

    tooltipX.value = event.clientX
    tooltipY.value = event.clientY

    if (hoverTimer) clearTimeout(hoverTimer)
    hoverTimer = setTimeout(async () => {
      if (currentItemId !== item.id) return
      if (item.type === 'spell' || item.type === 'enchant') {
        tooltipData.value = await store.getSpellTooltip(item.id, item.type)
      } else {
        tooltipData.value = await store.getTooltip(item.id)
      }
      visible.value = true
    }, HOVER_DELAY)
  }

  function onItemMouseMove(event: MouseEvent) {
    if (isTouch.value) return
    if (!visible.value && !hoverTimer) return
    tooltipX.value = event.clientX
    tooltipY.value = event.clientY
  }

  function onItemMouseLeave() {
    if (isTouch.value) return
    hideTooltip()
  }

  // --- Mobile touch ---
  // Opening: touchstart records position, touchend confirms it was a tap (not scroll).
  // Dismissing: a full-screen backdrop (rendered in the template) catches @click.

  function onItemTouchStart(item: LootItem, event: TouchEvent) {
    isTouch.value = true
    if (item.quality === 6) return

    // Record start position for drag detection
    const touch = event.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY

    const target = event.currentTarget as HTMLElement | null

    const onTouchEnd = (e: TouchEvent) => {
      cleanup()
      const endTouch = e.changedTouches[0]
      const dx = Math.abs(endTouch.clientX - touchStartX)
      const dy = Math.abs(endTouch.clientY - touchStartY)
      if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) return

      // It was a tap — show tooltip
      currentItemId = item.id
      activeItem.value = item

      tooltipX.value = endTouch.clientX
      tooltipY.value = endTouch.clientY

      const tooltipPromise = (item.type === 'spell' || item.type === 'enchant')
        ? store.getSpellTooltip(item.id, item.type)
        : store.getTooltip(item.id)
      tooltipPromise.then((data) => {
        if (currentItemId !== item.id) return
        tooltipData.value = data
        visible.value = true
      })
    }

    const onTouchCancel = () => cleanup()

    function cleanup() {
      target?.removeEventListener('touchend', onTouchEnd as EventListener)
      target?.removeEventListener('touchcancel', onTouchCancel)
    }

    target?.addEventListener('touchend', onTouchEnd as EventListener, { once: true })
    target?.addEventListener('touchcancel', onTouchCancel, { once: true })
  }

  function dismissTooltip() {
    hideTooltip()
  }

  onBeforeUnmount(() => {
    if (hoverTimer) clearTimeout(hoverTimer)
  })

  return {
    visible,
    tooltipData,
    activeItem,
    tooltipX,
    tooltipY,
    isTouch,
    onItemMouseEnter,
    onItemMouseMove,
    onItemMouseLeave,
    onItemTouchStart,
    dismissTooltip,
  }
}
