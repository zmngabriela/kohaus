export const isPublishedListing = property => ['active', 'closed'].includes(property.status)
export const belongsInCatalog = (property, offMarket) => isPublishedListing(property) && (offMarket ? property.offMarket : !property.offMarket || property.status === 'closed')
export function listingLabels(property, language) {
  const copy = { pt: ['Vendido', 'Alugado', 'Imagem ilustrativa'], es: ['Vendido', 'Alquilado', 'Imagen ilustrativa'], en: ['Sold', 'Rented', 'Illustrative image'] }[language] || ['Sold', 'Rented', 'Illustrative image']
  return [property.status === 'closed' ? copy[property.operation === 'alquilar' ? 1 : 0] : null, property.offMarket ? copy[2] : null].filter(Boolean)
}

export const closedListingsLast = (left, right) => Number(left.status === 'closed') - Number(right.status === 'closed')
