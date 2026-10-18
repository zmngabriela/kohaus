export function propertyTranslations(property, field) {
  const fallback = field === 'title' ? property.title : property.observations || ''
  return Object.fromEntries(['pt', 'es', 'en'].map(language => [language,
    property.portalData?.translations?.[language]?.[field]?.trim() || fallback,
  ]))
}
