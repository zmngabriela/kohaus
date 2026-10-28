export const FEATURED_LIMIT = 4
export const featuredSlot = property => Number(property.portalData?.featuredSlot || 0)
export const isFeatured = property => property.status === 'active' && !property.offMarket && [1, 2, 3, 4].includes(featuredSlot(property))
export function availableFeaturedSlots(properties, editingId) {
  const used = new Set(properties.filter(property => property.id !== editingId && isFeatured(property)).map(featuredSlot))
  return [1, 2, 3, 4].filter(slot => !used.has(slot))
}
export function selectFeatured(properties) {
  return properties.filter(isFeatured).sort((a, b) => featuredSlot(a) - featuredSlot(b)).slice(0, FEATURED_LIMIT)
}
