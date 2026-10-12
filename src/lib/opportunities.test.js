import { matchProperties, contactLinks } from './opportunities'
const client = { status: 'qualified', operation: 'comprar', destinations: ['barcelona'], types: ['apartamento'], budgetMax: 400000, minRooms: 2, minBathrooms: 2, requiredExtras: ['balcon', 'terraza'] }
const property = { id: 'p1', status: 'active', operation: 'comprar', destination: 'barcelona', type: 'apartamento', priceValue: 400000, rooms: 2, bathrooms: 2, surface: 90, portalData: { extras: ['balcon', 'terraza'] } }
it('requires all criteria and includes inclusive boundaries', () => {
  expect(matchProperties(client, [property])).toEqual([property])
  for (const patch of [{ bathrooms: 1 }, { bathrooms: undefined }, { rooms: 1 }, { priceValue: null }, { priceValue: 400001 }, { status: 'draft' }, { status: 'closed' }, { operation: 'alquilar' }, { destination: 'portugal' }, { type: 'villa' }, { portalData: { extras: ['balcon'] } }]) {
    expect(matchProperties(client, [{ ...property, ...patch }])).toEqual([])
  }
})
it('excludes closed clients and does not truncate opportunities', () => {
  expect(matchProperties({ ...client, status: 'closed' }, [property])).toEqual([])
  expect(matchProperties(client, Array.from({ length: 5 }, (_, id) => ({ ...property, id })))).toHaveLength(5)
})
it('allows unspecified criteria and supports older records', () => {
  expect(matchProperties({ operation: 'comprar' }, [property])).toHaveLength(1)
  expect(matchProperties({ ...client, minSurface: 91 }, [property])).toHaveLength(0)
  expect(matchProperties({ ...client, budgetMin: 400001 }, [property])).toHaveLength(0)
})
it('builds contact actions without inventing country codes', () => {
  expect(contactLinks({ phone: '+34 612 345 678' }).whatsapp).toBe('https://wa.me/34612345678')
  expect(contactLinks({ phone: '612345678' }).whatsapp).toBeNull()
  expect(contactLinks({})).toEqual({ phone: null, whatsapp: null, email: null })
})
