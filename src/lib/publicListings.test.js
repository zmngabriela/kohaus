import { describe, it, expect } from 'vitest'
import { belongsInCatalog, listingLabels, closedListingsLast } from './publicListings'
describe('public listing visibility and labels', () => {
 it('shows closed normal and off-market listings in buy/rent catalogs, excluding drafts', () => {
  for (const offMarket of [false, true]) {
   expect(belongsInCatalog({status:'closed',offMarket},false)).toBe(true)
   expect(belongsInCatalog({status:'draft',offMarket},false)).toBe(false)
  }
  expect(belongsInCatalog({status:'active',offMarket:true},false)).toBe(false)
  expect(belongsInCatalog({status:'closed',offMarket:true},true)).toBe(true)
  expect(belongsInCatalog({status:'closed',offMarket:false},true)).toBe(false)
 })
 it('labels only closed and off-market properties, retaining both labels when applicable', () => {
  expect(listingLabels({status:'active'},'pt')).toEqual([])
  expect(listingLabels({status:'active',offMarket:true},'pt')).toEqual(['Imagem ilustrativa'])
  expect(listingLabels({status:'closed',operation:'comprar'},'pt')).toEqual(['Vendido'])
  expect(listingLabels({status:'closed',operation:'alquilar',offMarket:true},'pt')).toEqual(['Alugado','Imagem ilustrativa'])
  expect(listingLabels({status:'closed',operation:'alquilar'},'es')).toEqual(['Alquilado'])
  expect(listingLabels({status:'closed',operation:'comprar'},'en')).toEqual(['Sold'])
 })
})

it('keeps closed listings last even when their price is lower', () => {
 const rows = [{status:'closed',price:1},{status:'active',price:30},{status:'closed',price:2},{status:'active',price:10}]
 expect([...rows].sort((a,b)=>closedListingsLast(a,b)||a.price-b.price).map(p=>p.price)).toEqual([10,30,1,2])
})
