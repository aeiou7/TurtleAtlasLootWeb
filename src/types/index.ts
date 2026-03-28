export interface LootItem {
  id: number
  type: 'item' | 'spell' | 'enchant'
  icon: string
  name: string
  quality: number
  description: string
  dropRate?: string
}

export interface LootTable {
  [bossKey: string]: LootItem[]
}

export interface TableRegisterEntry {
  title: string
  source: string
}

export interface ButtonRegistryEntry {
  title?: string
  nextPage?: string
  prevPage?: string
  backPage?: string
}

export interface NavMenuItem {
  name?: string
  extra?: string
  lootpage: string
  icon?: string
  isHeader?: boolean
  container?: string
  dataSource?: string
}

export interface NavigationData {
  dungeons: NavMenuItem[]
  crafting: NavMenuItem[]
  sets: NavMenuItem[]
  factions: NavMenuItem[]
  pvp: NavMenuItem[]
  worldBosses: NavMenuItem[]
  worldEvents: NavMenuItem[]
}

export type CategoryKey = keyof NavigationData

export interface CategoryInfo {
  key: CategoryKey
  label: string
  dataFile: string
  icon: string
  description: string
}

export const CATEGORIES: CategoryInfo[] = [
  { key: 'dungeons', label: 'Dungeons & Raids', dataFile: 'instances', icon: '⚔️', description: 'Boss loot from all dungeons and raids' },
  { key: 'crafting', label: 'Crafting', dataFile: 'crafting', icon: '🔨', description: 'Profession recipes and crafted items' },
  { key: 'sets', label: 'Collections', dataFile: 'sets', icon: '👑', description: 'Armor sets, legendaries, mounts, and more' },
  { key: 'factions', label: 'Factions', dataFile: 'factions', icon: '🏰', description: 'Reputation vendor rewards' },
  { key: 'pvp', label: 'PvP Rewards', dataFile: 'pvp', icon: '🗡️', description: 'Battleground and honor rewards' },
  { key: 'worldBosses', label: 'World Bosses', dataFile: 'world-bosses', icon: '🐉', description: 'World boss and rare spawn loot' },
  { key: 'worldEvents', label: 'World Events', dataFile: 'world-events', icon: '🎉', description: 'Seasonal and world event rewards' },
]

export function getCategoryByKey(key: string): CategoryInfo | undefined {
  return CATEGORIES.find(c => c.key === key)
}

// Tooltip data from the TooltipDumper addon
export interface TooltipLine {
  left: string
  leftColor: string
  right?: string
  rightColor?: string
}

export interface TooltipData {
  id: number
  name: string
  quality: number
  icon: string
  itemLevel: number
  reqLevel: number
  itemType: string
  itemSubType: string
  equipLoc: string
  lines: TooltipLine[]
  /** Attached spell/recipe info shown above the item tooltip for crafting spells */
  spellInfo?: SpellInfo
}

/** Recipe/spell info displayed as a separate pane above the crafted item tooltip */
export interface SpellInfo {
  name: string
  castTime?: string
  cooldown?: string
  tools?: string[]
  reagents?: { name: string; quantity: number }[]
  spellId: number
  creates?: string
}

// Spell data from AtlasLoot's Spells.lua

// Reagent: [itemId, quantity] tuple
export type SpellReagent = [number, number]

export interface CraftSpellData {
  name: string
  craftItem?: number
  castTime?: number
  text?: string
  reagents?: SpellReagent[]
  tools?: number[]
  cooldown?: number
  craftQuantityMin?: number
  craftQuantityMax?: number
}

export interface EnchantData {
  name: string
  icon: string
  item?: number
}

export interface SpellDatabase {
  enchants: Record<string, EnchantData>
  craftspells: Record<string, CraftSpellData>
}
