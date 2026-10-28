import { describe, it, expect } from 'vitest'
import { availableFeaturedSlots, selectFeatured } from './featuredProperties'
const property = (id, slot, extra = {}) => ({ id, status: 'active', offMarket: false, portalData: { featuredSlot: slot }, ...extra })
describe('homepage selection', () => {
 it('shows only manually selected active public properties in slot order', () => {
  expect(selectFeatured([property('b', 3), property('none', null), property('closed', 2, {status:'closed'}), property('private', 4, {offMarket:true}), property('a', 1)]).map(p=>p.id)).toEqual(['a','b'])
 })
 it('counts occupied slots and keeps the current property editable when full', () => {
  const properties = [1,2,3,4].map(n=>property(String(n),n))
  expect(availableFeaturedSlots(properties)).toEqual([])
  expect(availableFeaturedSlots(properties,'2')).toEqual([2])
 })
 it('frees slots for closed and off-market properties', () => {
  expect(availableFeaturedSlots([property('a',1,{status:'closed'}),property('b',2,{offMarket:true})])).toEqual([1,2,3,4])
 })
})
