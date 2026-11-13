const types = { piso:'flat', apartamento:'flat', atico:'flat', loft:'flat', duplex:'flat', studio:'flat', casa:'house', villa:'house_villa' }
export function feedProperty(row, images) {
  const p = row.portal_data || {}
  const binding = row.portal_publications.find(item => item.portalId === 'idealista' && item.feedEnabled)
  const operation = {comprar:'sale',alquilar:'rent'}[row.operation]
  const type = types[row.type]
  const area = Number(p.builtSurface || row.surface)
  if (!binding?.feedCode || !operation || !type || row.currency !== 'EUR' || !(row.price_value > 0) ||
      !(area > 0) || !images.length || !p.municipality?.trim() || !/^\d{5}$/.test(p.postalCode)) throw Error('incomplete_property')
  const descriptions = Object.entries({es:'spanish',pt:'portuguese',en:'english'}).flatMap(([key,language]) => {
    const text = p.translations?.[key]?.description?.trim()
    return text ? [{descriptionLanguage:language,descriptionText:text}] : []
  })
  return {propertyCode:binding.feedCode,propertyReference:row.reference,propertyVisibility:'idealista',
    propertyOperation:{operationType:operation,operationPrice:Number(row.price_value)},
    propertyAddress:{addressCountry:'Spain',addressVisibility:'hidden',addressPostalCode:p.postalCode,addressTown:p.municipality},
    propertyFeatures:{featuresType:type,featuresAreaConstructed:area,featuresBathroomNumber:row.bathrooms,featuresBedroomNumber:row.rooms},
    propertyDescriptions:descriptions,propertyImages:images}
}
