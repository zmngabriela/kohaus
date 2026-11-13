export function privateListings(items) {
  const found = new Map()
  for (const item of items) {
    if (item?.contactInfo?.userType !== 'private' || item.contactInfo.professional === true) continue
    const id = String(item.propertyCode ?? '')
    if (!/^\d+$/.test(id)) continue
    found.set(id, {
      id, url: 'https://www.idealista.com/inmueble/' + id + '/',
      title: item.suggestedTexts?.title || item.address || '#' + id,
      location: [item.district, item.municipality].filter(Boolean).join(' · '),
      price: item.price, size: item.size, rooms: item.rooms,
      image: /^https:\/\/([a-z0-9-]+\.)*idealista\.com\//i.test(item.thumbnail || '') ? item.thumbnail : '',
    })
  }
  return [...found.values()]
}
