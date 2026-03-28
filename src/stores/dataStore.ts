import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  LootTable,
  NavigationData,
  ButtonRegistryEntry,
  TableRegisterEntry,
  TooltipData,
  SpellDatabase,
  CraftSpellData,
  EnchantData,
  SpellInfo,
} from '@/types'

async function fetchJson<T>(path: string): Promise<T> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const res = await fetch(base + path)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.statusText}`)
  return res.json()
}

export const useDataStore = defineStore('data', () => {
  // Cached data
  const navigation = ref<NavigationData | null>(null)
  const buttonRegistry = ref<Record<string, ButtonRegistryEntry> | null>(null)
  const tableRegister = ref<Record<string, TableRegisterEntry> | null>(null)
  const tooltipSources = ref<Record<string, string> | null>(null)

  // Item data caches (lazy-loaded per category)
  const itemData = ref<Record<string, LootTable>>({})

  // Tooltip data (lazy-loaded by chunk)
  const tooltipIndex = ref<Record<string, number> | null>(null)
  const tooltipChunks = ref<Record<number, Record<string, TooltipData>>>({})
  const tooltipIndexLoading = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Spell/enchant data from Spells.lua
  const spellData = ref<SpellDatabase | null>(null)
  const spellDataLoading = ref(false)

  // Quality overrides from tooltip dump (more accurate than addon data)
  const qualityMap = ref<Record<string, number> | null>(null)

  // UI state: expanded groups per category (persists across navigation)
  const expandedGroups = ref<Record<string, string[]>>({})

  function getExpandedGroups(category: string): string[] {
    return expandedGroups.value[category] ?? []
  }

  function setExpandedGroups(category: string, expanded: string[]) {
    expandedGroups.value[category] = expanded
  }

  async function loadNavigation() {
    if (navigation.value) return navigation.value
    navigation.value = await fetchJson<NavigationData>('/data/navigation.json')
    return navigation.value
  }

  async function loadQualityMap() {
    if (qualityMap.value) return qualityMap.value
    try {
      qualityMap.value = await fetchJson<Record<string, number>>('/data/tooltips/quality-map.json')
    } catch {
      qualityMap.value = {}
    }
    return qualityMap.value
  }

  function resolveQuality(itemId: number | undefined, fallback: number): number {
    if (!itemId || !qualityMap.value) return fallback
    return qualityMap.value[String(itemId)] ?? fallback
  }

  async function loadButtonRegistry() {
    if (buttonRegistry.value) return buttonRegistry.value
    buttonRegistry.value = await fetchJson<Record<string, ButtonRegistryEntry>>('/data/button-registry.json')
    return buttonRegistry.value
  }

  async function loadTableRegister() {
    if (tableRegister.value) return tableRegister.value
    tableRegister.value = await fetchJson<Record<string, TableRegisterEntry>>('/data/table-register.json')
    return tableRegister.value
  }

  async function loadTooltipSources() {
    if (tooltipSources.value) return tooltipSources.value
    tooltipSources.value = await fetchJson<Record<string, string>>('/data/tooltip-sources.json')
    return tooltipSources.value
  }

  async function loadItemData(dataFile: string): Promise<LootTable> {
    if (itemData.value[dataFile]) return itemData.value[dataFile]
    loading.value = true
    error.value = null
    try {
      const data = await fetchJson<LootTable>(`/data/items/${dataFile}.json`)
      itemData.value[dataFile] = data
      return data
    } catch (e: any) {
      error.value = e.message
      return {}
    } finally {
      loading.value = false
    }
  }

  /** Load all item data files (for search) */
  async function loadAllItemData(): Promise<Record<string, LootTable>> {
    const files = ['instances', 'sets', 'crafting', 'factions', 'pvp', 'world-bosses', 'world-events']
    await Promise.all(files.map(f => loadItemData(f)))
    return itemData.value
  }

  /** Look up a loot page across all loaded data files */
  function findLootPage(pageKey: string): { dataFile: string; items: any[] } | null {
    for (const [dataFile, tables] of Object.entries(itemData.value)) {
      if (tables[pageKey]) {
        return { dataFile, items: tables[pageKey] }
      }
    }
    return null
  }

  /** Load the tooltip index (maps itemId -> chunk number) */
  async function loadTooltipIndex() {
    if (tooltipIndex.value || tooltipIndexLoading.value) return tooltipIndex.value
    tooltipIndexLoading.value = true
    try {
      tooltipIndex.value = await fetchJson<Record<string, number>>('/data/tooltips/tooltips-index.json')
    } catch {
      // Tooltip data not available yet — not an error
      tooltipIndex.value = {}
    } finally {
      tooltipIndexLoading.value = false
    }
    return tooltipIndex.value
  }

  /** Load a specific tooltip chunk */
  async function loadTooltipChunk(chunkNum: number) {
    if (tooltipChunks.value[chunkNum]) return tooltipChunks.value[chunkNum]
    try {
      const data = await fetchJson<Record<string, TooltipData>>(`/data/tooltips/tooltips-chunk-${chunkNum}.json`)
      tooltipChunks.value[chunkNum] = data
      return data
    } catch {
      return null
    }
  }

  /** Get tooltip data for a specific item, loading chunk on demand */
  async function getTooltip(itemId: number): Promise<TooltipData | null> {
    const index = await loadTooltipIndex()
    if (!index) return null
    const chunkNum = index[String(itemId)]
    if (chunkNum === undefined) return null
    const chunk = await loadTooltipChunk(chunkNum)
    return chunk?.[String(itemId)] ?? null
  }

  /** Load spell/enchant database */
  async function loadSpellData(): Promise<SpellDatabase | null> {
    if (spellData.value || spellDataLoading.value) return spellData.value
    spellDataLoading.value = true
    try {
      spellData.value = await fetchJson<SpellDatabase>('/data/spell-data.json')
    } catch {
      spellData.value = { enchants: {}, craftspells: {} }
    } finally {
      spellDataLoading.value = false
    }
    return spellData.value
  }

  /** Get craftspell data by spell ID */
  async function getCraftSpell(spellId: number): Promise<CraftSpellData | null> {
    const db = await loadSpellData()
    return db?.craftspells[String(spellId)] ?? null
  }

  /** Get enchant data by spell ID */
  async function getEnchant(spellId: number): Promise<EnchantData | null> {
    const db = await loadSpellData()
    return db?.enchants[String(spellId)] ?? null
  }

  /** Build a TooltipData for a spell/enchant from spell-data.json */
  async function getSpellTooltip(itemId: number, itemType: string): Promise<TooltipData | null> {
    if (itemType === 'spell') {
      const spell = await getCraftSpell(itemId)
      if (!spell) return null

      // Build spell info for the recipe header
      const spellInfo: SpellInfo = {
        name: spell.name,
        spellId: itemId,
      }

      if (spell.castTime !== undefined) {
        spellInfo.castTime = spell.castTime >= 60
          ? `${Math.round(spell.castTime / 60)} min cast`
          : `${spell.castTime} sec cast`
      }
      if (spell.cooldown) {
        const cd = spell.cooldown
        if (cd >= 86400) spellInfo.cooldown = `${Math.round(cd / 86400)} day cooldown`
        else if (cd >= 3600) spellInfo.cooldown = `${Math.round(cd / 3600)} hr cooldown`
        else if (cd >= 60) spellInfo.cooldown = `${Math.round(cd / 60)} min cooldown`
        else spellInfo.cooldown = `${cd} sec cooldown`
      }

      // Resolve tool names
      if (spell.tools && spell.tools.length > 0) {
        const toolNames: string[] = []
        for (const toolId of spell.tools) {
          const toolTooltip = await getTooltip(toolId)
          toolNames.push(toolTooltip?.name ?? `Item #${toolId}`)
        }
        spellInfo.tools = toolNames
      }

      // Resolve reagent names
      if (spell.reagents && spell.reagents.length > 0) {
        const reagents: { name: string; quantity: number }[] = []
        for (const r of spell.reagents) {
          const reagentTooltip = await getTooltip(r[0])
          reagents.push({
            name: reagentTooltip?.name ?? `Item #${r[0]}`,
            quantity: r[1],
          })
        }
        spellInfo.reagents = reagents
      }

      if (spell.craftQuantityMin && spell.craftQuantityMin > 1) {
        if (spell.craftQuantityMax && spell.craftQuantityMax > spell.craftQuantityMin) {
          spellInfo.creates = `${spell.craftQuantityMin}-${spell.craftQuantityMax}`
        } else {
          spellInfo.creates = `${spell.craftQuantityMin}`
        }
      }

      // Try to get the crafted item's full tooltip
      if (spell.craftItem) {
        const craftTooltip = await getTooltip(spell.craftItem)
        if (craftTooltip) {
          return { ...craftTooltip, spellInfo }
        }
      }

      // Fallback: spell-only tooltip (no crafted item tooltip available)
      const lines: { left: string; leftColor: string }[] = []
      lines.push({ left: spell.name, leftColor: '#ffffff' })
      if (spell.text) {
        lines.push({ left: spell.text, leftColor: '#1eff00' })
      }
      return {
        id: itemId,
        name: spell.name,
        quality: 1,
        icon: '',
        itemLevel: 0,
        reqLevel: 0,
        itemType: 'spell',
        itemSubType: '',
        equipLoc: '',
        lines,
        spellInfo,
      }
    }

    if (itemType === 'enchant') {
      // First check if there's a dumped enchant tooltip (e-prefixed key)
      const index = await loadTooltipIndex()
      if (index) {
        const eKey = `e${itemId}`
        const chunkNum = index[eKey]
        if (chunkNum !== undefined) {
          const chunk = await loadTooltipChunk(chunkNum)
          const data = chunk?.[eKey]
          if (data) return data
        }
      }

      const enchant = await getEnchant(itemId)
      if (!enchant) return null
      const lines: { left: string; leftColor: string }[] = []
      lines.push({ left: enchant.name, leftColor: '#ffffff' })
      if (enchant.item) {
        const itemTooltip = await getTooltip(enchant.item)
        if (itemTooltip) {
          return itemTooltip
        }
      }
      return {
        id: itemId,
        name: enchant.name,
        quality: 1,
        icon: enchant.icon,
        itemLevel: 0,
        reqLevel: 0,
        itemType: 'enchant',
        itemSubType: '',
        equipLoc: '',
        lines,
      }
    }

    return null
  }

  /** Initialize core data on app startup */
  async function init() {
    await Promise.all([
      loadNavigation(),
      loadButtonRegistry(),
      loadTableRegister(),
      loadQualityMap(),
    ])
  }

  return {
    navigation,
    buttonRegistry,
    tableRegister,
    tooltipSources,
    itemData,
    loading,
    error,
    loadNavigation,
    loadButtonRegistry,
    loadTableRegister,
    loadTooltipSources,
    loadItemData,
    loadAllItemData,
    findLootPage,
    getTooltip,
    getSpellTooltip,
    resolveQuality,
    getExpandedGroups,
    setExpandedGroups,
    init,
  }
})
