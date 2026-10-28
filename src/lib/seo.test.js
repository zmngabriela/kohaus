import { expect, it } from 'vitest'
import { canonicalUrl, pageSeo } from './seo'
it('drops irrelevant filters and tracking from canonical URLs',()=>{
 const url=canonicalUrl({view:'home',language:'pt',operation:'comprar',destination:'barcelona',reference:'x'})
 expect(url).toBe('https://kohaus.pages.dev/?lang=pt')
})
it('keeps language, operation and city for distinct search pages',()=>{
 const seo=pageSeo({view:'catalogo',language:'pt',operation:'alquilar',destination:'itapema'})
 expect(seo.title).toContain('Imóveis para alugar em Itapema')
 expect(seo.canonical).toContain('dest=itapema')
})
it('excludes internal pages and reference searches from indexing',()=>{
 expect(pageSeo({view:'dashboard'}).noindex).toBe(true)
 expect(pageSeo({view:'catalogo',reference:'KH0115'}).noindex).toBe(true)
 expect(pageSeo({view:'home'}).noindex).toBe(false)
})
it('uses localized property copy without private fields',()=>{
 const seo=pageSeo({view:'anuncio',language:'en',propertyId:'123'}, {title:{en:'Apartment in Barcelona'},description:{en:'Two bedrooms.'},privateAddress:'SECRET'})
 expect(seo.title).toContain('Apartment in Barcelona')
 expect(JSON.stringify(seo)).not.toContain('SECRET')
 expect(seo.description).toBe('Two bedrooms.')
})
