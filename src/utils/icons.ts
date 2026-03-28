/** Build a WoW icon URL from the icon texture name */
export function getIconUrl(icon: string): string {
  if (!icon) return ''
  // Normalize: remove path prefix if present, lowercase
  const name = icon.replace(/^Interface\\Icons\\/, '').toLowerCase()
  return `https://wow.zamimg.com/images/wow/icons/large/${name}.jpg`
}

/** Get the CSS class for an item quality level */
export function qualityClass(quality: number): string {
  return `quality-${Math.min(quality, 6)}`
}

/** Get the CSS class for an item quality border */
export function qualityBorderClass(quality: number): string {
  return `quality-border-${Math.min(quality, 6)}`
}

/** Quality number to label */
export function qualityLabel(quality: number): string {
  const labels: Record<number, string> = {
    0: 'Poor',
    1: 'Common',
    2: 'Uncommon',
    3: 'Rare',
    4: 'Epic',
    5: 'Legendary',
    6: 'Header',
  }
  return labels[quality] ?? 'Unknown'
}
