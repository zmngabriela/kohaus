import { expect, it } from 'vitest'
import { canonicalUrl, pageSeo } from './seo'
it('drops irrelevant filters and tracking from canonical URLs',()=>{
 const url=canonicalUrl({view:'home',language:'pt',operation:'comprar',destination:'barcelona',reference:'x'})
 expect(url).toBe('https://kohausrealestate.com/?lang=pt')
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

it('keeps the brand image on main pages and uses a stable cover URL for listings', async () => {
 const { socialImage } = await import('./seo')
 const property = {id:'home-1',title:'Apartment',photos:[{url:'https://media.example/first.jpg?token=temporary'},{url:'https://media.example/second.jpg'}]}
 expect(socialImage('https://kohausrealestate.com', {view:'contact'}, property).image).toContain('/brand/kohaus-social-monogram.png')
 const image = socialImage('https://kohausrealestate.com', {view:'anuncio',language:'en'}, property)
 expect(image.image).toBe('https://kohausrealestate.com/api/property-image?id=home-1')
 expect(image['image:alt']).toBe('Apartment')
 expect(image).not.toHaveProperty('image:width')
 expect(socialImage('https://kohausrealestate.com', {view:'anuncio'}, {...property,offMarket:true}).image).toContain('/brand/')
 expect(socialImage('https://kohausrealestate.com', {view:'anuncio'}, {...property,photos:[]}).image).toContain('/brand/')
})
