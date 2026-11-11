// Persist only human-readable photo metadata, never image data or signed URLs.
function keys(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []
}

export function recordChanges(record, patch) {
  const changes = []
  function visit(field, before, after) {
    const children = [...new Set([...keys(before), ...keys(after)])]
    if (children.length) {
      for (const child of children) visit(field + '.' + child, before?.[child], after?.[child])
      return
    }
    const display = value => Array.isArray(value) ? value.join(' · ') : String(value ?? '')
    if (display(before) !== display(after)) changes.push({field, before:display(before), after:display(after)})
  }
  for (const [field, value] of Object.entries(patch)) {
    if (field === 'priceLabel' || field === 'history') continue
    if (field === 'photos') {
      const names = photos => (photos || []).map((p,i) => [p.name || p.id || String(i+1),p.caption].filter(Boolean).join(': '))
      visit(field,names(record.photos),names(value))
    } else if (field === 'portalPublications') {
      const portals = rows => Object.fromEntries((rows || []).map(({portalId,...fields})=>[portalId,fields]))
      visit(field,portals(record[field]),portals(value))
    } else visit(field,record[field],value)
  }
  return changes
}
